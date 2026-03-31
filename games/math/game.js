(function () {
  "use strict";

  const utils = window.GAMES_V2_UTILS;
  const shellApi = window.GAMES_V2_SHELL;
  const audioApi = window.GAMES_V2_AUDIO;
  const fxApi = window.GAMES_V2_FX;
  const metaApi = window.GAMES_V2_META;
  const cfg = window.GAME_V3_MATH_CONFIG;

  const gameEl = document.getElementById("game");
  const tileEl = document.getElementById("tile");
  const overlayEl = document.getElementById("overlay");
  const diffsEl = document.getElementById("diffs");
  const pauseBtn = document.getElementById("pauseBtn");
  const muteBtn = document.getElementById("muteBtn");
  const exitBtn = document.getElementById("exitBtn");
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const coinEl = document.getElementById("coins");
  const coinIconEl = document.getElementById("coinIcon");
  const livesIconEl = document.getElementById("livesIcon");
  const mascotEl = document.getElementById("mascot");
  const streakMeterEl = document.getElementById("streakMeter");
  const streakFillEl = document.getElementById("streakFill");
  const ansBtns = Array.from(document.querySelectorAll(".ans"));

  const shell = shellApi.createFallingShell({
    gameEl,
    menuUrl: cfg.menuUrl,
    waterYRatio: cfg.waterYRatio
  });
  const audio = audioApi.createArcadeAudio({
    sfxGain: cfg.gameplay.sfxGain,
    splashUrl: cfg.assets.splashAudio,
    coinUrl: cfg.assets.coinAudio
  });
  const fx = fxApi.createFxToolkit({
    gameEl,
    coinIconEl
  });
  const diffOptions = Array.from(diffsEl.querySelectorAll("[data-diff]")).map((btn) => ({
    key: btn.dataset.diff,
    label: String(btn.textContent || "").trim()
  }));
  const meta = metaApi.createGameMeta({
    overlayEl,
    diffOptions,
    defaultLives: cfg.gameplay.livesStart,
    initialLanguage: document.documentElement.lang || "he",
    onStartRequested: handleStartRequested,
    onExitRequested: () => shell.exitGame(),
    audio,
    fx,
    gameKey: "math"
  });
  const initialSnapshot = meta.getSnapshot();

  function syncMuteButton() {
    if (!muteBtn) return;
    const muted = audio.bgm.isMuted();
    muteBtn.classList.toggle("muted", muted);
    muteBtn.setAttribute("aria-label", muted ? "הפעלת קול" : "השתקת קול");
  }

  audio.onMuteChange(syncMuteButton);
  syncMuteButton();

  let selected = meta.getSelectedDiff();
  let running = false;
  let paused = false;
  let score = 0;
  let lives = initialSnapshot.player.lives;
  let coins = initialSnapshot.player.coins;
  let consecutiveCorrect = 0;
  let streakCount = 0;
  let prevCorrectIdx = -1;
  let task = null;
  const spawnYOffsetRatio = 0.35;
  let mascotAnimToken = 0;
  const streakGoal = 10;
  const streakRewardDelayMs = 650;
  let streakRewardTimer = null;
  let streakRewardPending = false;
  let assetsReadyPromise = null;
  let runBaseLevel = initialSnapshot.nextLevel;
  let lastCheckpointLevel = runBaseLevel - 1;
  let levelPausePending = false;
  let coinAwardPending = false;

  function syncWaterReflection(tile, rectArg) {
    if (!tile) {
      shell.hideWaterReflection();
      return;
    }
    shell.updateWaterReflection(tileEl, {
      x: tile.x,
      y: tile.y,
      width: tile.width,
      height: tile.height
    }, rectArg);
  }

  const falling = shell.createFallingRunner({
    createItem: createTask,
    renderItem: renderTask,
    getSpeed: speedPxPerSec,
    isMissed: (item, rect) => item.y + item.height >= shell.splashContactY(item.height, rect),
    onMiss: miss,
    onClear: () => {
      task = null;
      shell.hideWaterReflection();
    }
  });

  function currentTileCenter() {
    const gameRect = shell.rect();
    const tileRect = tileEl.getBoundingClientRect();
    return {
      x: (tileRect.left - gameRect.left) + (tileRect.width * 0.49),
      y: (tileRect.top - gameRect.top) + (tileRect.height / 2)
    };
  }

  function preloadImage(url) {
    return new Promise((resolve) => {
      if (!url) {
        resolve();
        return;
      }
      const img = new Image();
      const finish = () => resolve();
      img.onload = finish;
      img.onerror = finish;
      img.src = url;
      if (img.complete) {
        resolve();
      }
    });
  }

  function ensureAssetsReady() {
    if (!assetsReadyPromise) {
      assetsReadyPromise = Promise.all([
        preloadImage(cfg.assets.mascotSheet.url),
        preloadImage(cfg.assets.mascotSadSheet && cfg.assets.mascotSadSheet.url)
      ]);
    }
    return assetsReadyPromise;
  }

  function splashOffsetFor(rect) {
    return cfg.splashOffsetBasePx * Math.pow(rect.height / cfg.splashOffsetBaselineHeight, cfg.splashOffsetExponent);
  }

  function level() {
    return Math.max(runBaseLevel, runBaseLevel + Math.floor(Math.max(0, score) / cfg.gameplay.pointsPerLevel));
  }

  function currentPreset() {
    return cfg.presets[selected] || cfg.presets.easy;
  }

  function currentStageIndex() {
    const startStage = currentPreset().startStage || 0;
    const scoreStage = Math.floor(Math.max(0, score) / cfg.gameplay.stageScoreStep);
    return Math.min(cfg.progression.length - 1, startStage + scoreStage);
  }

  function currentStage() {
    return cfg.progression[currentStageIndex()] || cfg.progression[0];
  }

  function speedPxPerSec() {
    const base = cfg.gameplay.baseSpeed + (level() - 1) * cfg.gameplay.speedIncPerLevel;
    const rect = shell.rect();
    const heightMul = Math.max(0.72, Math.min(1.15, rect.height / 650));
    return base * currentPreset().speedMul * heightMul;
  }

  function setHUD() {
    scoreEl.textContent = String(score);
    livesEl.textContent = String(lives);
    coinEl.textContent = String(coins);
  }

  function syncCheckpointState(resetScore) {
    const snapshot = meta.getSnapshot();
    selected = meta.getSelectedDiff() || selected;
    runBaseLevel = snapshot.nextLevel;
    lastCheckpointLevel = runBaseLevel - 1;
    lives = snapshot.player.lives;
    coins = snapshot.player.coins;
    if (resetScore) {
      score = 0;
    }
  }

  function levelCompletedSinceCheckpoint() {
    return level() - 1;
  }

  async function showLevelResults(completedLevel) {
    if (levelPausePending) {
      return;
    }
    levelPausePending = true;
    running = false;
    paused = false;
    pauseBtn.classList.remove("paused");
    clearPendingStreakReward();
    await meta.showResults({
      completedLevel,
      coins,
      lives,
      score
    });
    running = true;
    paused = false;
    levelPausePending = false;
    if (!falling.getItem()) {
      falling.spawn();
    }
  }

  function updateStreakMeter() {
    const ratio = Math.max(0, Math.min(1, streakCount / streakGoal));
    if (streakFillEl) {
      streakFillEl.style.width = `${ratio * 100}%`;
    }
    if (streakMeterEl) {
      streakMeterEl.classList.toggle("is-warm", streakCount >= streakGoal - 2);
      streakMeterEl.classList.toggle("is-imminent", streakCount >= streakGoal - 1 && streakCount < streakGoal);
      streakMeterEl.classList.toggle("is-full", streakCount >= streakGoal);
    }
  }

  function clearPendingStreakReward() {
    if (streakRewardTimer !== null) {
      clearTimeout(streakRewardTimer);
      streakRewardTimer = null;
    }
    streakRewardPending = false;
  }

  function animateLifeSpent() {
    livesIconEl.classList.remove("life-gain");
    livesIconEl.classList.remove("life-hit");
    void livesIconEl.offsetWidth;
    livesIconEl.classList.add("life-hit");
  }

  function animateLifeGained() {
    livesIconEl.classList.remove("life-hit");
    livesIconEl.classList.remove("life-gain");
    void livesIconEl.offsetWidth;
    livesIconEl.classList.add("life-gain");
  }

  function animateStarGained() {
    coinIconEl.classList.remove("star-hit");
    coinIconEl.classList.remove("star-gain");
    void coinIconEl.offsetWidth;
    coinIconEl.classList.add("star-gain");
  }

  function clearAnswerMarks() {
    ansBtns.forEach((btn) => {
      if (btn._markTimer) {
        clearTimeout(btn._markTimer);
        btn._markTimer = null;
      }
      if (btn._pressTimer) {
        clearTimeout(btn._pressTimer);
        btn._pressTimer = null;
      }
      btn.classList.remove("mark-correct", "mark-wrong", "is-pressed");
    });
  }

  function showAnswerMark(btn, isCorrect, duration) {
    const markDuration = duration || cfg.answerFeedbackMs;
    if (btn._markTimer) {
      clearTimeout(btn._markTimer);
    }
    if (btn._pressTimer) {
      clearTimeout(btn._pressTimer);
    }
    btn.classList.add("is-pressed");
    btn._pressTimer = setTimeout(() => {
      btn.classList.remove("is-pressed");
      btn._pressTimer = null;
    }, 140);
    btn.classList.remove("mark-correct", "mark-wrong");
    btn.classList.add(isCorrect ? "mark-correct" : "mark-wrong");
    btn._markTimer = setTimeout(() => {
      btn.classList.remove("mark-correct", "mark-wrong");
      btn._markTimer = null;
    }, markDuration);
  }

  function setMascot(_state) {
    const sprite = _state === "shame" ? (cfg.assets.mascotSadSheet || cfg.assets.mascotSheet) : cfg.assets.mascotSheet;
    mascotAnimToken += 1;
    mascotEl.classList.remove("is-celebrating");
    mascotEl.style.backgroundImage = `url("${sprite.url}")`;
    mascotEl.style.backgroundSize = `${sprite.cols * 100}% ${sprite.rows * 100}%`;
    mascotEl.style.backgroundPosition = "0% 0%";
  }

  function playMascotAnimation(sprite, repeats, withGlow, frameDelayMul) {
    const token = ++mascotAnimToken;
    let frame = 0;
    let loopsLeft = Math.max(1, repeats || 1);
    const frameDelay = (1000 / Math.max(1, sprite.fps || 10)) * Math.max(1, frameDelayMul || 1);

    if (withGlow) {
      mascotEl.classList.add("is-celebrating");
      fx.playStarsAroundElement(mascotEl, { starCount: 12, spreadMul: 1, durationMul: 1 });
    } else {
      mascotEl.classList.remove("is-celebrating");
    }

    mascotEl.style.backgroundImage = `url("${sprite.url}")`;
    mascotEl.style.backgroundSize = `${sprite.cols * 100}% ${sprite.rows * 100}%`;

    function drawFrame() {
      if (token !== mascotAnimToken) return;
      const col = frame % sprite.cols;
      const row = Math.floor(frame / sprite.cols);
      const x = sprite.cols > 1 ? (col / (sprite.cols - 1)) * 100 : 0;
      const y = sprite.rows > 1 ? (row / (sprite.rows - 1)) * 100 : 0;
      mascotEl.style.backgroundPosition = `${x}% ${y}%`;
      frame += 1;
      if (frame < sprite.frames) {
        setTimeout(drawFrame, frameDelay);
      } else if (loopsLeft > 1) {
        loopsLeft -= 1;
        frame = 0;
        if (withGlow) {
          fx.playStarsAroundElement(mascotEl, { starCount: 10, spreadMul: 0.92, durationMul: 0.9 });
        }
        setTimeout(drawFrame, Math.max(40, Math.round(frameDelay * 0.65)));
      } else {
        setMascot("idle");
      }
    }

    drawFrame();
  }

  function playMascotDance(repeats, withGlow) {
    playMascotAnimation(cfg.assets.mascotSheet, repeats, withGlow, 1);
  }

  function playMascotShame() {
    playMascotAnimation(cfg.assets.mascotSadSheet || cfg.assets.mascotSheet, 1, false, 2);
  }

  function rewardLifeFromStreak() {
    clearPendingStreakReward();
    if (!running) {
      return;
    }
    streakCount = 0;
    lives += 1;
    setHUD();
    updateStreakMeter();
    animateLifeGained();
    audio.bgm.next();
    playMascotDance(2, true);
  }

  function registerCorrectProgress() {
    consecutiveCorrect += 1;
    const prevStreak = streakCount;
    streakCount = Math.min(streakGoal, streakCount + 1);
    updateStreakMeter();
    if (prevStreak < streakGoal - 1 && streakCount >= streakGoal - 1 && streakCount < streakGoal) {
      audio.sfx.streakReady();
    }
    if (streakCount >= streakGoal && !streakRewardPending) {
      streakRewardPending = true;
      streakRewardTimer = setTimeout(() => {
        streakRewardTimer = null;
        rewardLifeFromStreak();
      }, streakRewardDelayMs);
    }
  }

  function resetCorrectProgress() {
    consecutiveCorrect = 0;
    streakCount = 0;
    updateStreakMeter();
  }

  function randomTileX() {
    const rect = shell.rect();
    const ui = shell.getUi();
    const tileWidth = cfg.gameplay.tileWBase * ui;
    const margin = cfg.gameplay.marginBase * ui;
    const lane = shell.fallLane(tileWidth, margin, rect);
    return utils.randInt(Math.round(lane.minX), Math.round(lane.maxX));
  }

  function spawnStartY() {
    return -(cfg.gameplay.tileHBase * shell.getUi() * spawnYOffsetRatio);
  }

  function makeTask() {
    const stage = currentStage();
    const op = utils.choice(stage.ops);

    let a;
    let b;
    let answer;
    let text;

    if (op === "+") {
      const addRange = stage.addRange || [0, 10];
      a = utils.randInt(addRange[0], addRange[1]);
      b = utils.randInt(addRange[0], addRange[1]);
      answer = a + b;
      text = `${a}+${b}`;
    } else if (op === "-") {
      const subRange = stage.subRange || [0, 10];
      a = utils.randInt(subRange[0], subRange[1]);
      b = utils.randInt(subRange[0], subRange[1]);
      if (!stage.allowNegResult && b > a) {
        [a, b] = [b, a];
      }
      answer = a - b;
      text = `${a}-${b}`;
    } else if (op === "*") {
      const mulRange = stage.mulRange || [1, 10];
      a = utils.randInt(mulRange[0], mulRange[1]);
      b = utils.randInt(mulRange[0], mulRange[1]);
      answer = a * b;
      text = `${a}×${b}`;
    } else {
      const divDivisorRange = stage.divDivisorRange || [1, 10];
      const divAnswerRange = stage.divAnswerRange || [1, 10];
      b = utils.randInt(divDivisorRange[0], divDivisorRange[1]);
      answer = utils.randInt(divAnswerRange[0], divAnswerRange[1]);
      a = answer * b;
      text = `${a}÷${b}`;
    }

    return { answer, text };
  }

  function uniqueWrongs(correct) {
    const stage = currentStage();
    const set = new Set([correct]);

    function ok(value) {
      return !(stage.noNegOptions && value < 0);
    }

    let guard = 0;
    while (set.size < 4 && guard < 200) {
      guard += 1;
      const near = Math.max(2, stage.wrongNear || 6);
      const far = Math.max(near + 2, stage.wrongFar || 12);
      const delta = utils.randInt(-near, near) || 1;
      let wrong = correct + delta;
      if (Math.random() < 0.25) {
        wrong = correct + utils.randInt(-far, far);
      }
      if (!ok(wrong)) {
        continue;
      }
      set.add(wrong);
    }

    while (set.size < 4) {
      const fallback = Math.max(0, correct + set.size);
      if (ok(fallback)) {
        set.add(fallback);
      } else {
        set.add(correct + set.size);
      }
    }

    const arr = Array.from(set);
    utils.shuffleInPlace(arr);
    let idx = arr.indexOf(correct);
    if (idx === prevCorrectIdx) {
      const swapWith = (idx + 1) % 4;
      [arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]];
      idx = swapWith;
    }
    prevCorrectIdx = idx;
    return arr;
  }

  function createTask() {
    const ui = shell.getUi();
    return Object.assign(makeTask(), {
      width: cfg.gameplay.tileWBase * ui,
      height: cfg.gameplay.tileHBase * ui,
      x: randomTileX(),
      y: spawnStartY()
    });
  }

  function renderTask(nextTask, rectArg, phase) {
    task = nextTask;
    if (!task) {
      return;
    }
    if (phase !== "frame") {
      tileEl.textContent = task.text;
      clearAnswerMarks();

      const answers = uniqueWrongs(task.answer);
      for (let i = 0; i < ansBtns.length; i += 1) {
        ansBtns[i].textContent = utils.formatSignedNumber(answers[i]);
        ansBtns[i].dataset.val = String(answers[i]);
      }
    }

    tileEl.style.transform = `translate(${task.x}px, ${task.y}px)`;
    syncWaterReflection(task, rectArg);
  }

  function playSplashAtTile(rect, currentTask) {
    const centerX = currentTask.x + (currentTask.width / 2);
    fx.playSheetFx(
      cfg.assets.splashSheet,
      centerX,
      shell.waterY(rect),
      "center"
    );
  }

  function miss(currentTask, rectArg) {
    const rect = rectArg || shell.rect();
    if (!currentTask) {
      return;
    }
    score += cfg.gameplay.scoreMiss;
    lives -= 1;
    animateLifeSpent();
    resetCorrectProgress();
    setHUD();
    playMascotShame();

    if (lives <= 0) {
      running = false;
      falling.stop("game-over");
      audio.sfx.splash();
      playSplashAtTile(rect, currentTask);
      audio.sfx.death();
      syncCheckpointState(true);
      setHUD();
      meta.showStart({ gameOver: true });
      setMascot("idle");
      return;
    }

    audio.sfx.splash();
    playSplashAtTile(rect, currentTask);
    falling.spawn();
  }

  function correct(clickedBtn) {
    falling.clear("correct");
    setMascot("idle");
    showAnswerMark(clickedBtn, true, cfg.answerFeedbackMs);
    score += currentStage().correct;
    setHUD();
    audio.sfx.correct();

    const burstCenter = currentTileCenter();
    const burstX = burstCenter.x;
    const burstY = burstCenter.y;
    scoreEl.classList.add("pulse");
    setTimeout(() => scoreEl.classList.remove("pulse"), 350);

    registerCorrectProgress();
    if (consecutiveCorrect >= 4) {
      consecutiveCorrect = 0;
      coinAwardPending = true;
      fx.awardCoinFromBurst(burstX, burstY, () => {
        coins += 1;
        setHUD();
        animateStarGained();
        coinEl.classList.add("pulse");
        setTimeout(() => coinEl.classList.remove("pulse"), 450);
        audio.sfx.coin();
        playMascotDance();
      }).finally(() => {
        coinAwardPending = false;
      });
    }

    fx.playEnhancedBurst(cfg.assets.burstSheet, burstX, burstY);

    setTimeout(() => {
      if (!running || falling.getItem() || levelPausePending) {
        return;
      }
      const completedLevel = levelCompletedSinceCheckpoint();
      if (completedLevel > lastCheckpointLevel) {
        const proceedToResults = () => {
          if (!running || falling.getItem() || levelPausePending) {
            return;
          }
          if (coinAwardPending) {
            setTimeout(proceedToResults, 80);
            return;
          }
          lastCheckpointLevel = completedLevel;
          showLevelResults(completedLevel);
        };
        proceedToResults();
        return;
      }
      falling.spawn();
    }, cfg.answerFeedbackMs);
  }

  function wrong(clickedBtn) {
    showAnswerMark(clickedBtn, false, 260);
    score += cfg.gameplay.scoreWrong;
    setHUD();
    audio.sfx.wrong();
    resetCorrectProgress();
  }

  async function start(diffKey) {
    selected = diffKey;
    await ensureAssetsReady();
    meta.hideOverlay();
    clearPendingStreakReward();
    paused = false;
    levelPausePending = false;
    coinAwardPending = false;
    pauseBtn.classList.remove("paused");
    syncCheckpointState(true);
    prevCorrectIdx = -1;
    consecutiveCorrect = 0;
    streakCount = 0;
    setMascot("idle");
    falling.stop("start-reset");
    setHUD();
    updateStreakMeter();
    running = true;
    falling.start();
  }

  async function handleStartRequested(payload) {
    audio.ensureAudio();
    return start(payload.diffKey || selected);
  }

  function togglePause() {
    if (!running) {
      return;
    }
    paused = !paused;
    pauseBtn.classList.toggle("paused", paused);
    if (paused) {
      audio.bgm.pause();
      falling.pause();
    }
    if (!paused) {
      audio.bgm.resume();
      falling.resume();
    }
  }

  pauseBtn.addEventListener("click", () => {
    audio.ensureAudio();
    togglePause();
  });

  muteBtn.addEventListener("click", () => {
    audio.bgm.toggleMute();
  });

  exitBtn.addEventListener("click", () => {
    shell.exitGame();
  });

  ansBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!running || !task) {
        return;
      }
      audio.ensureAudio();
      const value = Number(btn.dataset.val);
      if (value === task.answer) {
        correct(btn);
      } else {
        wrong(btn);
      }
    });
  });

  setMascot("idle");
  ensureAssetsReady();
  setHUD();
  updateStreakMeter();
})();
