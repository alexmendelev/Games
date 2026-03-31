(function () {
  "use strict";

  const utils = window.GAMES_V2_UTILS;
  const shellApi = window.GAMES_V2_SHELL;
  const audioApi = window.GAMES_V2_AUDIO;
  const fxApi = window.GAMES_V2_FX;
  const metaApi = window.GAMES_V2_META;
  const sessionApi = window.GAMES_V2_SESSION;
  const cfg = window.GAME_V3_MULTIPLY_CONFIG;

  const gameEl = document.getElementById("game");
  const tileEl = document.getElementById("tile");
  const overlayEl = document.getElementById("overlay");
  const diffsEl = document.getElementById("diffs");
  const pauseBtn = document.getElementById("pauseBtn");
  const muteBtn = document.getElementById("muteBtn");
  const exitBtn = document.getElementById("exitBtn");
  const coinEl = document.getElementById("coins");
  const coinIconEl = document.getElementById("coinIcon");
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
    initialLanguage: document.documentElement.lang || "he",
    onStartRequested: handleStartRequested,
    onExitRequested: () => shell.exitGame(),
    audio,
    fx,
    gameKey: "multiply"
  });
  const initialSnapshot = meta.getSnapshot();
  const gameplayRules = {
    normalAttempts: Math.max(1, Number(cfg.gameplay.normalAttempts) || 2),
    specialAttempts: Math.max(1, Number(cfg.gameplay.specialAttempts) || 1),
    specialChance: Math.max(0, Math.min(1, Number(cfg.gameplay.specialChance) || (1 / 6))),
    specialTablets: [
      { tabletType: "silver", rewardCoins: Math.max(1, Number(cfg.gameplay.specialSilverCoins) || 1), weight: Math.max(0, Number(cfg.gameplay.specialSilverWeight) || 70) },
      { tabletType: "gold", rewardCoins: Math.max(1, Number(cfg.gameplay.specialGoldCoins) || 5), weight: Math.max(0, Number(cfg.gameplay.specialGoldWeight) || 25) },
      { tabletType: "diamond", rewardCoins: Math.max(1, Number(cfg.gameplay.specialDiamondCoins) || 20), weight: Math.max(0, Number(cfg.gameplay.specialDiamondWeight) || 5) }
    ]
  };

  function syncMuteButton() {
    if (!muteBtn) return;
    const muted = audio.bgm.isMuted();
    muteBtn.classList.toggle("muted", muted);
    muteBtn.setAttribute("aria-label", muted ? "הפעלת קול" : "השתקת קול");
  }

  audio.onMuteChange(syncMuteButton);
  syncMuteButton();

  let selected = meta.getSelectedDiff();
  const session = sessionApi.createArcadeSession({
    getLevelRules: () => {
      const goals = cfg.gameplay.levelGoals || {};
      return goals[selected] || goals.upTo5 || { correctTarget: 10, timeLimitMs: 60000 };
    },
    onStateChange: syncSessionUi
  });
  let running = false;
  let paused = false;
  let coins = initialSnapshot.player.coins;
  let levelProgressCurrent = 0;
  let levelProgressTarget = 1;
  let prevCorrectIdx = -1;
  let task = null;
  const spawnYOffsetRatio = 0.35;
  let mascotAnimToken = 0;
  let assetsReadyPromise = null;
  let levelPausePending = false;
  let coinAwardPending = false;
  session.loadCheckpoint(initialSnapshot, selected);

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
      tileEl.classList.remove("tile--special", "tile--silver", "tile--gold", "tile--diamond");
      tileEl.removeAttribute("data-reward");
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
    return session.getState().levelNumber;
  }

  function speedPxPerSec() {
    const base = cfg.gameplay.baseSpeed + (level() - 1) * cfg.gameplay.speedIncPerLevel;
    const rect = shell.rect();
    const heightMul = Math.max(0.72, Math.min(1.15, rect.height / 650));
    return base * cfg.diffs[selected].speedMul * heightMul;
  }

  function setHUD() {
    coinEl.textContent = String(coins);
  }

  function syncSessionUi(state) {
    coins = state.coins;
    levelProgressCurrent = state.levelProgress ? state.levelProgress.current : state.correctCount;
    levelProgressTarget = state.levelProgress ? state.levelProgress.target : ((state.levelRules && state.levelRules.correctTarget) || 1);
    setHUD();
    updateStreakMeter();
  }

  function syncCheckpointState() {
    selected = meta.getSelectedDiff() || selected;
    session.loadCheckpoint(meta.getSnapshot(), selected);
  }

  async function showLevelResults() {
    if (levelPausePending) {
      return;
    }
    levelPausePending = true;
    running = false;
    paused = false;
    pauseBtn.classList.remove("paused");
    session.finishLevel();
    await meta.showResults(session.buildResultsPayload());
    syncCheckpointState();
    session.beginLevel();
    running = true;
    paused = false;
    levelPausePending = false;
    if (!falling.getItem()) {
      falling.spawn();
    }
  }

  function updateStreakMeter() {
    const ratio = Math.max(0, Math.min(1, levelProgressCurrent / Math.max(1, levelProgressTarget)));
    if (streakFillEl) {
      streakFillEl.style.width = `${ratio * 100}%`;
    }
    if (streakMeterEl) {
      streakMeterEl.style.setProperty("--segments", String(Math.max(1, levelProgressTarget)));
      streakMeterEl.classList.toggle("is-warm", ratio >= 0.6 && ratio < 1);
      streakMeterEl.classList.toggle("is-imminent", ratio >= 0.85 && ratio < 1);
      streakMeterEl.classList.toggle("is-full", ratio >= 1);
    }
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
      btn.disabled = false;
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

  function rollSpecialTablet() {
    if (Math.random() >= gameplayRules.specialChance) {
      return { tabletType: "simple", rewardCoins: 0 };
    }
    const totalWeight = gameplayRules.specialTablets.reduce((sum, tabletType) => sum + tabletType.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const tabletType of gameplayRules.specialTablets) {
      roll -= tabletType.weight;
      if (roll <= 0) {
        return tabletType;
      }
    }
    return gameplayRules.specialTablets[0];
  }

  function awardTabletBonus(burstX, burstY, rewardCoins) {
    if (rewardCoins <= 0) {
      return;
    }
    coinAwardPending = true;
    fx.awardCoinFromBurst(burstX, burstY).then(() => {
      const pulseDurationMs = 220;
      const stepDelayMs = rewardCoins >= 10 ? 60 : 110;
      let awarded = 0;
      audio.sfx.coin();
      playMascotDance();
      return new Promise((resolve) => {
        function addNextCoin() {
          awarded += 1;
          session.addCoins(1);
          animateStarGained();
          coinEl.classList.remove("pulse");
          void coinEl.offsetWidth;
          coinEl.classList.add("pulse");
          setTimeout(() => coinEl.classList.remove("pulse"), pulseDurationMs);
          if (awarded >= rewardCoins) {
            resolve();
            return;
          }
          setTimeout(addNextCoin, stepDelayMs);
        }
        addNextCoin();
      });
    }).finally(() => {
      coinAwardPending = false;
    });
  }

  function sinkCurrentTask(currentTask, rectArg) {
    if (!currentTask) {
      return;
    }
    const rect = rectArg || shell.rect();
    const sinkOutcome = session.handleSink();
    falling.clear("attempt-limit");
    audio.sfx.splash();
    playSplashAtTile(rect, currentTask);
    playMascotShame();
    if (sinkOutcome.levelComplete) {
      showLevelResults();
      return;
    }
    falling.spawn();
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
    const diff = cfg.diffs[selected];
    let a;
    let b;
    a = utils.randInt(diff.minFactor, diff.maxFactor);
    b = utils.randInt(diff.minFactor, diff.maxFactor);
    const answer = a * b;
    const text = `${a}×${b}`;

    return { answer, text };
  }

  function uniqueWrongs(correct) {
    const diff = cfg.diffs[selected];
    const set = new Set([correct]);

    function ok(value) {
      return !(diff.noNegOptions && value < 0);
    }

    let guard = 0;
    while (set.size < 4 && guard < 200) {
      guard += 1;
      const delta = utils.randInt(-diff.wrongNear, diff.wrongNear) || 1;
      let wrong = correct + delta;
      if (Math.random() < 0.25) {
        wrong = correct + utils.randInt(-diff.wrongFar, diff.wrongFar);
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
    const tabletReward = rollSpecialTablet();
    return Object.assign(makeTask(), {
      width: cfg.gameplay.tileWBase * ui,
      height: cfg.gameplay.tileHBase * ui,
      x: randomTileX(),
      y: spawnStartY(),
      tabletType: tabletReward.tabletType,
      rewardCoins: tabletReward.rewardCoins,
      attemptsRemaining: tabletReward.rewardCoins > 0 ? gameplayRules.specialAttempts : gameplayRules.normalAttempts
    });
  }

  function renderTask(nextTask, rectArg, phase) {
    task = nextTask;
    if (!task) {
      return;
    }
    if (phase !== "frame") {
      tileEl.textContent = task.text;
      tileEl.classList.remove("tile--special", "tile--silver", "tile--gold", "tile--diamond");
      if (task.rewardCoins > 0) {
        tileEl.classList.add("tile--special", `tile--${task.tabletType}`);
        tileEl.setAttribute("data-reward", String(task.rewardCoins));
      } else {
        tileEl.removeAttribute("data-reward");
      }
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
    const missOutcome = session.handleMiss();
    playMascotShame();

    audio.sfx.splash();
    playSplashAtTile(rect, currentTask);
    if (missOutcome.levelComplete) {
      showLevelResults();
      return;
    }
    falling.spawn();
  }

  function correct(clickedBtn) {
    const currentTask = task;
    session.handleCorrect();
    falling.clear("correct");
    setMascot("idle");
    showAnswerMark(clickedBtn, true, cfg.answerFeedbackMs);
    audio.sfx.correct();

    const burstCenter = currentTileCenter();
    const burstX = burstCenter.x;
    const burstY = burstCenter.y;

    if (currentTask && currentTask.rewardCoins > 0) {
      awardTabletBonus(burstX, burstY, currentTask.rewardCoins);
    }

    fx.playEnhancedBurst(cfg.assets.burstSheet, burstX, burstY);

    setTimeout(() => {
      if (!running || falling.getItem() || levelPausePending) {
        return;
      }
      const proceedAfterReward = () => {
        if (!running || falling.getItem() || levelPausePending) {
          return;
        }
        if (coinAwardPending) {
          setTimeout(proceedAfterReward, 80);
          return;
        }
        if (session.shouldCompleteLevel()) {
          showLevelResults();
          return;
        }
        falling.spawn();
      };
      proceedAfterReward();
    }, cfg.answerFeedbackMs);
  }

  function wrong(clickedBtn) {
    if (!task || clickedBtn.disabled) {
      return;
    }
    const currentTask = task;
    currentTask.attemptsRemaining = Math.max(0, Number(currentTask.attemptsRemaining) - 1);
    clickedBtn.disabled = true;
    session.handleWrong();
    audio.sfx.wrong();
    if (currentTask.attemptsRemaining <= 0) {
      sinkCurrentTask(currentTask, shell.rect());
      return;
    }
    showAnswerMark(clickedBtn, false, 260);
  }

  async function start(diffKey) {
    selected = diffKey;
    await ensureAssetsReady();
    meta.hideOverlay();
    paused = false;
    levelPausePending = false;
    coinAwardPending = false;
    pauseBtn.classList.remove("paused");
    syncCheckpointState();
    session.beginLevel();
    prevCorrectIdx = -1;
    setMascot("idle");
    falling.stop("start-reset");
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
      session.pause();
      audio.bgm.pause();
      falling.pause();
    }
    if (!paused) {
      session.resume();
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
      if (!running || !task || btn.disabled) {
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
  syncSessionUi(session.getState());
})();
