(function () {
  "use strict";

  const utils = window.GAMES_V2_UTILS;
  const shellApi = window.GAMES_V2_SHELL;
  const audioApi = window.GAMES_V2_AUDIO;
  const fxApi = window.GAMES_V2_FX;
  const metaApi = window.GAMES_V2_META;
  const cfg = window.GAME_V3_CLOCKS_CONFIG;

  const gameEl = document.getElementById("game");
  const tileEl = document.getElementById("tile");
  const tileLabelEl = document.getElementById("tileLabel");
  const overlayEl = document.getElementById("overlay");
  const diffsEl = document.getElementById("diffs");
  const pauseBtn = document.getElementById("pauseBtn");
  const muteBtn = document.getElementById("muteBtn");
  const exitBtn = document.getElementById("exitBtn");
  const mascotEl = document.getElementById("mascot");
  const scoreEl = document.getElementById("score");
  const coinEl = document.getElementById("coins");
  const coinIconEl = document.getElementById("coinIcon");
  const livesEl = document.getElementById("lives");
  const livesIconEl = document.getElementById("livesIcon");
  const streakMeterEl = document.getElementById("streakMeter");
  const streakFillEl = document.getElementById("streakFill");
  const answersEl = document.getElementById("answers");
  const ansBtns = Array.from(answersEl.querySelectorAll(".ans"));

  const shell = shellApi.createFallingShell({ gameEl, menuUrl: cfg.menuUrl, waterYRatio: cfg.waterYRatio });
  const audio = audioApi.createArcadeAudio({ sfxGain: cfg.gameplay.sfxGain, splashUrl: cfg.assets.splashAudio, coinUrl: cfg.assets.coinAudio });
  const fx = fxApi.createFxToolkit({ gameEl, coinIconEl });
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
    gameKey: "clocks"
  });
  const initialSnapshot = meta.getSnapshot();

  const baseGameplay = {
    tileWidth: cfg.gameplay.tileWidth,
    tileHeight: cfg.gameplay.tileHeight,
    tileMargin: cfg.gameplay.tileMargin
  };
  const spawnYOffsetRatio = 0.35;
const streakGoal = 20;
  const streakRewardDelayMs = 650;

  let selected = meta.getSelectedDiff();
  let running = false;
  let paused = false;
  let score = 0;
  let coins = initialSnapshot.player.coins;
  let lives = initialSnapshot.player.lives;
  let consecutiveCorrect = 0;
  let streakCount = 0;
  let task = null;
  let lockInputUntil = 0;
  let assetsReadyPromise = null;
  let mascotAnimToken = 0;
  let streakRewardTimer = null;
  let streakRewardPending = false;
  let runBaseLevel = initialSnapshot.nextLevel;
  let lastCheckpointLevel = runBaseLevel - 1;
  let levelPausePending = false;
  let coinAwardPending = false;

  function syncWaterEffects(nextTask, rectArg) {
    if (!nextTask) {
      shell.hideWaterShadow();
      shell.hideWaterReflection();
      return;
    }
    shell.updateWaterShadow({
      x: nextTask.x,
      y: nextTask.y,
      width: nextTask.width,
      height: nextTask.height
    }, rectArg);
    shell.updateWaterReflection(tileEl, {
      x: nextTask.x,
      y: nextTask.y,
      width: nextTask.width,
      height: nextTask.height
    }, rectArg);
  }

  const falling = shell.createFallingRunner({
    createItem: generateTask,
    renderItem: renderTask,
    getSpeed,
    isMissed: (item, rect) => item.y + item.height >= shell.splashContactY(item.height, rect),
    onMiss: miss,
    onClear: () => {
      task = null;
      shell.hideWaterShadow();
      shell.hideWaterReflection();
    }
  });

  function syncMuteButton() {
    const muted = audio.bgm.isMuted();
    muteBtn.classList.toggle("muted", muted);
    muteBtn.setAttribute("aria-label", muted ? "Enable sound" : "Mute sound");
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
        preloadImage(cfg.assets.mascotSadSheet && cfg.assets.mascotSadSheet.url),
        preloadImage(cfg.assets.dialUrl),
        preloadImage(cfg.assets.dialNoNumbersUrl),
        preloadImage(cfg.assets.dialPlainUrl)
      ]);
    }
    return assetsReadyPromise;
  }

  function currentDiff() {
    return cfg.diffs[selected] || cfg.diffs.medium;
  }

  function currentDialUrl() {
    return currentDiff().dialUrl || cfg.assets.dialUrl;
  }

  function syncGameplayMetrics() {
    const ui = shell.getUi();
    cfg.gameplay.tileWidth = Math.round(baseGameplay.tileWidth * ui);
    cfg.gameplay.tileHeight = Math.round(baseGameplay.tileHeight * ui);
    cfg.gameplay.tileMargin = Math.max(6, Math.round(baseGameplay.tileMargin * ui));
  }

  function setHUD() {
    scoreEl.textContent = String(score);
    coinEl.textContent = String(coins);
    livesEl.textContent = String(lives);
  }

  function syncCheckpointState(resetScore) {
    const snapshot = meta.getSnapshot();
    selected = meta.getSelectedDiff() || selected;
    runBaseLevel = snapshot.nextLevel;
    lastCheckpointLevel = runBaseLevel - 1;
    coins = snapshot.player.coins;
    lives = snapshot.player.lives;
    if (resetScore) {
      score = 0;
    }
  }

  function updateStreakMeter() {
    const ratio = Math.max(0, Math.min(1, streakCount / streakGoal));
    streakFillEl.style.width = `${ratio * 100}%`;
    streakMeterEl.classList.toggle("is-warm", streakCount >= streakGoal - 2);
    streakMeterEl.classList.toggle("is-imminent", streakCount >= streakGoal - 1 && streakCount < streakGoal);
    streakMeterEl.classList.toggle("is-full", streakCount >= streakGoal);
  }

  function clearPendingStreakReward() {
    if (streakRewardTimer !== null) {
      clearTimeout(streakRewardTimer);
      streakRewardTimer = null;
    }
    streakRewardPending = false;
  }

  function animateLifeSpent() {
    livesIconEl.classList.remove("life-gain", "life-hit");
    void livesIconEl.offsetWidth;
    livesIconEl.classList.add("life-hit");
  }

  function animateLifeGained() {
    livesIconEl.classList.remove("life-hit", "life-gain");
    void livesIconEl.offsetWidth;
    livesIconEl.classList.add("life-gain");
  }

  function animateStarGained() {
    coinIconEl.classList.remove("star-hit", "star-gain");
    void coinIconEl.offsetWidth;
    coinIconEl.classList.add("star-gain");
  }

  function setMascot(state) {
    const sprite = state === "shame"
      ? (cfg.assets.mascotSadSheet || cfg.assets.mascotSheet)
      : cfg.assets.mascotSheet;
    mascotAnimToken += 1;
    mascotEl.classList.remove("is-celebrating");
    mascotEl.style.backgroundImage = `url("${sprite.url}")`;
    mascotEl.style.backgroundSize = `${sprite.cols * 100}% ${sprite.rows * 100}%`;
    mascotEl.style.backgroundPosition = "0% 0%";
  }

  function playMascotDance(repeats, withGlow) {
    const sprite = cfg.assets.mascotSheet;
    const token = ++mascotAnimToken;
    let frame = 0;
    let loopsLeft = Math.max(1, repeats || 1);
    const frameDelay = 1000 / Math.max(1, sprite.fps || 10);

    if (withGlow) {
      mascotEl.classList.add("is-celebrating");
      fx.playStarsAroundElement(mascotEl, { starCount: 12, spreadMul: 1, durationMul: 1 });
    }

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
        setMascot();
      }
    }

    drawFrame();
  }

  function playMascotShame() {
    const sprite = cfg.assets.mascotSadSheet || cfg.assets.mascotSheet;
    const token = ++mascotAnimToken;
    let frame = 0;
    const frameDelay = (1000 / Math.max(1, sprite.fps || 10)) * 2;
    mascotEl.classList.remove("is-celebrating");
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
      } else {
        setMascot("idle");
      }
    }

    drawFrame();
  }

  function rewardLifeFromStreak() {
    clearPendingStreakReward();
    if (!running) return;
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

  function level() {
    return Math.max(runBaseLevel, runBaseLevel + Math.floor(Math.max(0, score) / cfg.gameplay.pointsPerLevel));
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
      spawnTask();
    }
  }

  function getSpeed() {
    const base = cfg.gameplay.baseSpeed + (level() - 1) * cfg.gameplay.speedIncPerLevel;
    const rect = shell.rect();
    const heightMul = Math.max(0.72, Math.min(1.15, rect.height / 650));
    return base * currentDiff().speedMul * heightMul;
  }

  function pointsForCorrect(reactionSec) {
    const capped = utils.clamp(reactionSec, 0, cfg.gameplay.correctTimeCapSec);
    const frac = 1 - (capped / cfg.gameplay.correctTimeCapSec);
    return Math.round(cfg.gameplay.correctMin + (cfg.gameplay.correctMax - cfg.gameplay.correctMin) * frac);
  }

  function timeLabel(hour, minute) {
    return `${hour}:${String(minute).padStart(2, "0")}`;
  }

  function toClockHour(hour24) {
    const value = hour24 % 12;
    return value === 0 ? 12 : value;
  }

  function toTotalMinutes(hour, minute) {
    return ((hour % 12) * 60) + minute;
  }

  function fromTotalMinutes(totalMinutes) {
    const normalized = ((totalMinutes % 720) + 720) % 720;
    const hour = toClockHour(Math.floor(normalized / 60));
    const minute = normalized % 60;
    return { hour, minute };
  }

  function timeKey(time) {
    return `${time.hour}:${time.minute}`;
  }

  function randomTime() {
    return {
      hour: utils.randInt(1, 12),
      minute: utils.choice(currentDiff().minuteValues)
    };
  }

  function buildDistractors(correct) {
    const diff = currentDiff();
    const correctTotal = toTotalMinutes(correct.hour, correct.minute);
    const options = [correct];
    const used = new Set([timeKey(correct)]);
    const hourOffsets = utils.shuffleInPlace(diff.hourOffsets.slice());
    const minuteOffsets = utils.shuffleInPlace(diff.minuteOffsets.slice());

    function pushTime(candidate) {
      const key = timeKey(candidate);
      if (used.has(key)) return false;
      if (!diff.minuteValues.includes(candidate.minute)) return false;
      options.push(candidate);
      used.add(key);
      return true;
    }

    for (const offset of minuteOffsets) {
      if (options.length >= 4) break;
      pushTime(fromTotalMinutes(correctTotal + offset));
      if (options.length >= 4) break;
      pushTime(fromTotalMinutes(correctTotal - offset));
    }

    for (const hourOffset of hourOffsets) {
      if (options.length >= 4) break;
      pushTime(fromTotalMinutes(correctTotal + (hourOffset * 60)));
      if (options.length >= 4) break;
      pushTime(fromTotalMinutes(correctTotal - (hourOffset * 60)));
    }

    for (const hourOffset of hourOffsets) {
      for (const minuteOffset of minuteOffsets) {
        if (options.length >= 4) break;
        pushTime(fromTotalMinutes(correctTotal + (hourOffset * 60) + minuteOffset));
        if (options.length >= 4) break;
        pushTime(fromTotalMinutes(correctTotal - (hourOffset * 60) + minuteOffset));
      }
    }

    while (options.length < 4) {
      pushTime(randomTime());
    }

    utils.shuffleInPlace(options);
    return options;
  }

  function clockSvg(hour, minute) {
    const minuteAngle = (minute * 6) - 90;
    const hourAngle = (((hour % 12) + (minute / 60)) * 30) - 90;
    const minuteX = 50 + (Math.cos((minuteAngle * Math.PI) / 180) * 27);
    const minuteY = 50 + (Math.sin((minuteAngle * Math.PI) / 180) * 27);
    const hourX = 50 + (Math.cos((hourAngle * Math.PI) / 180) * 18);
    const hourY = 50 + (Math.sin((hourAngle * Math.PI) / 180) * 18);

    return `
      <span class="clockOption" aria-label="${timeLabel(hour, minute)}">
        <img class="clockDialImg" src="${currentDialUrl()}" alt="" aria-hidden="true">
        <svg class="clockHands" viewBox="0 0 100 100" aria-hidden="true">
          <line class="clock-hand-hour" x1="50" y1="50" x2="${hourX.toFixed(2)}" y2="${hourY.toFixed(2)}"></line>
          <line class="clock-hand-minute" x1="50" y1="50" x2="${minuteX.toFixed(2)}" y2="${minuteY.toFixed(2)}"></line>
          <circle class="clock-center" cx="50" cy="50" r="5"></circle>
        </svg>
      </span>
    `;
  }

  function currentTileMetrics() {
    const rect = tileEl.getBoundingClientRect();
    return {
      width: rect.width || cfg.gameplay.tileWidth,
      height: rect.height || cfg.gameplay.tileHeight,
      margin: cfg.gameplay.tileMargin
    };
  }

  function currentRockWidth() {
    const pseudo = window.getComputedStyle(gameEl, "::before");
    const width = parseFloat(pseudo.width);
    if (Number.isFinite(width) && width > 0) {
      return width;
    }
    return shell.rect().width * 0.42;
  }

  function randomTileX(tileMetrics) {
    const rect = shell.rect();
    const maxX = Math.max(tileMetrics.margin, rect.width - tileMetrics.width - tileMetrics.margin);
    const rightOfRockX = currentRockWidth() + Math.max(tileMetrics.margin, 12 * shell.getUi());
    const minX = Math.min(maxX, Math.max(tileMetrics.margin, rightOfRockX));
    return utils.randInt(Math.round(minX), Math.round(maxX));
  }

  function currentTileCenter() {
    const gameRect = shell.rect();
    const tileRect = tileEl.getBoundingClientRect();
    return {
      x: (tileRect.left - gameRect.left) + (tileRect.width * 0.49),
      y: (tileRect.top - gameRect.top) + (tileRect.height / 2)
    };
  }

  function generateTask() {
    const correct = randomTime();
    const options = buildDistractors(correct);
    const tileMetrics = currentTileMetrics();
    return {
      correct,
      options,
      width: tileMetrics.width,
      height: tileMetrics.height,
      x: randomTileX(tileMetrics),
      y: -(tileMetrics.height * spawnYOffsetRatio),
      spawnedAt: performance.now()
    };
  }

  function renderTask(nextTask, rectArg, phase) {
    task = nextTask;
    if (!task) {
      return;
    }
    if (phase !== "frame") {
      tileLabelEl.textContent = timeLabel(task.correct.hour, task.correct.minute);
      for (let i = 0; i < ansBtns.length; i += 1) {
        const option = task.options[i];
        ansBtns[i].dataset.value = timeKey(option);
        ansBtns[i].innerHTML = clockSvg(option.hour, option.minute);
        ansBtns[i].classList.remove("mark-correct", "mark-wrong", "is-pressed");
      }
    }
    tileEl.style.transform = `translate(${task.x}px, ${task.y}px)`;
    syncWaterEffects(task, rectArg);
  }

  function spawnTask() {
    task = falling.spawn();
    return task;
  }

  function playSplash(x, currentTask) {
    const rect = shell.rect();
    const tileHeight = currentTask ? currentTask.height : cfg.gameplay.tileHeight;
    const splashY = shell.splashContactY(tileHeight, rect) - Math.max(10, tileHeight * 0.08);
    fx.playSheetFx(cfg.assets.splashSheet, x, splashY, "center");
  }

  function miss(currentTask) {
    if (!currentTask) return;
    const drownX = currentTask.x + currentTask.width / 2;
    score += cfg.gameplay.scoreMiss;
    lives -= 1;
    resetCorrectProgress();
    setHUD();
    animateLifeSpent();
    audio.sfx.splash();
    playSplash(drownX, currentTask);
    playMascotShame();
    if (lives <= 0) {
      audio.sfx.death();
      running = false;
      falling.stop("game-over");
      syncCheckpointState(true);
      setHUD();
      meta.showStart({ gameOver: true });
      return;
    }
    spawnTask();
  }

  function markAnswer(btn, isCorrect, durationMs) {
    btn.classList.remove("mark-correct", "mark-wrong", "is-pressed");
    void btn.offsetWidth;
    btn.classList.add("is-pressed");
    btn.classList.add(isCorrect ? "mark-correct" : "mark-wrong");
    window.setTimeout(() => {
      btn.classList.remove("mark-correct", "mark-wrong", "is-pressed");
    }, durationMs);
  }

  function handleCorrect(btn) {
    const currentTask = task;
    falling.clear("correct");
    setMascot("idle");
    const burstCenter = currentTileCenter();
    const burstX = burstCenter.x;
    const burstY = burstCenter.y;
    const rtSec = (performance.now() - currentTask.spawnedAt) / 1000;
    markAnswer(btn, true, cfg.answerLockMs + 80);
    score += pointsForCorrect(rtSec);
    registerCorrectProgress();
    setHUD();
    audio.sfx.correct();
    scoreEl.classList.add("pulse");
    setTimeout(() => scoreEl.classList.remove("pulse"), 350);

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
    lockInputUntil = performance.now() + cfg.answerLockMs;
    setTimeout(() => {
      if (!running || falling.getItem() || levelPausePending) return;
      const completedLevel = levelCompletedSinceCheckpoint();
      if (completedLevel > lastCheckpointLevel) {
        const proceedToResults = () => {
          if (!running || falling.getItem() || levelPausePending) return;
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
      spawnTask();
    }, cfg.answerLockMs);
  }

  function handleWrong(btn) {
    markAnswer(btn, false, 220);
    score += cfg.gameplay.scoreWrong;
    resetCorrectProgress();
    setHUD();
    audio.sfx.wrong();
  }

  function resetState() {
    syncCheckpointState(true);
    consecutiveCorrect = 0;
    streakCount = 0;
    paused = false;
    levelPausePending = false;
    coinAwardPending = false;
    pauseBtn.classList.remove("paused");
    task = null;
    lockInputUntil = 0;
    falling.stop("reset");
    setHUD();
    updateStreakMeter();
  }

  function startGame() {
    clearPendingStreakReward();
    syncGameplayMetrics();
    running = false;
    paused = false;
    pauseBtn.classList.remove("paused");
    meta.hideOverlay();
    resetState();
    setMascot("idle");
    running = true;
    falling.start();
  }

  async function handleStartRequested(payload) {
    selected = payload.diffKey || selected;
    audio.ensureAudio();
    await ensureAssetsReady();
    startGame();
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    pauseBtn.classList.toggle("paused", paused);
    if (paused) {
      audio.bgm.pause();
      falling.pause();
    } else {
      audio.bgm.resume();
      falling.resume();
    }
  }

  audio.onMuteChange(syncMuteButton);
  syncMuteButton();

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

  answersEl.addEventListener("click", (event) => {
    const btn = event.target.closest("button.ans");
    if (!btn || !running || paused || !task) return;
    const now = performance.now();
    if (now < lockInputUntil) return;
    audio.ensureAudio();
    if (String(btn.dataset.value || "") === timeKey(task.correct)) {
      handleCorrect(btn);
    } else {
      handleWrong(btn);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (!running || paused || !task) return;
    if (performance.now() < lockInputUntil) return;
    if (event.key >= "1" && event.key <= "4") {
      const btn = ansBtns[Number(event.key) - 1];
      if (!btn) return;
      audio.ensureAudio();
      if (String(btn.dataset.value || "") === timeKey(task.correct)) {
        handleCorrect(btn);
      } else {
        handleWrong(btn);
      }
    }
  });

  window.addEventListener("resize", syncGameplayMetrics);
  window.addEventListener("orientationchange", syncGameplayMetrics);

  syncGameplayMetrics();
  ensureAssetsReady();
  setMascot("idle");
  setHUD();
  updateStreakMeter();
})();
