(function () {
  "use strict";

  const utils = window.GAMES_V2_UTILS;
  const shellApi = window.GAMES_V2_SHELL;
  const audioApi = window.GAMES_V2_AUDIO;
  const fxApi = window.GAMES_V2_FX;
  const metaApi = window.GAMES_V2_META;
  const sessionApi = window.GAMES_V2_SESSION;
  const gameBehaviors = window.GAMES_V2_BEHAVIORS;
  const cfg = window.GAME_V3_CLOCKS_CONFIG;

  const gameEl = document.getElementById("game");
  const wrapEl = document.querySelector(".wrap");
  const sideEl = document.querySelector(".side");
  const hudEl = document.querySelector(".hudPanel");
  const answersPanelEl = document.querySelector(".answersPanel");
  const controlsEl = document.querySelector(".controlsPanel");
  const tileEl = document.getElementById("tile");
  const tileLabelEl = document.getElementById("tileLabel");
  const overlayEl = document.getElementById("overlay");
  const diffsEl = document.getElementById("diffs");
  const pauseBtn = document.getElementById("pauseBtn");
  const muteBtn = document.getElementById("muteBtn");
  const exitBtn = document.getElementById("exitBtn");
  const mascotEl = document.getElementById("mascot");
  const coinEl = document.getElementById("coins");
  const coinIconEl = document.getElementById("coinIcon");
  const difficultyLabelEl = document.getElementById("difficultyLabel");
  const difficultyValueEl = document.getElementById("difficultyValue");
  const streakMeterEl = document.getElementById("streakMeter");
  const streakFillEl = document.getElementById("streakFill");
  const answersEl = document.getElementById("answers");
  const shell = shellApi.createFallingShell({
    gameEl,
    wrapEl,
    sideEl,
    hudEl,
    answersPanelEl,
    answersEl,
    controlsEl,
    menuUrl: cfg.menuUrl,
    waterYRatio: cfg.waterYRatio,
    layout: cfg.layout
  });
  const ansBtns = shell.getAnswerButtons();

  const audio = audioApi.createArcadeAudio({ sfxGain: cfg.gameplay.sfxGain, splashUrl: cfg.assets.splashAudio, coinUrl: cfg.assets.coinAudio });
  const fx = fxApi.createFxToolkit({ gameEl, coinIconEl });
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
    gameKey: "clocks"
  });
  const initialSnapshot = meta.getSnapshot();

  const baseGameplay = {
    tileWidth: cfg.gameplay.tileWidth,
    tileHeight: cfg.gameplay.tileHeight,
    tileMargin: cfg.gameplay.tileMargin
  };
  const spawnYOffsetRatio = 0.35;
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

  let selected = meta.getSelectedDiff();
  const session = sessionApi.createArcadeSession({
    getLevelRules: () => {
      const goals = cfg.gameplay.levelGoals || {};
      return goals[currentDifficultyKey()] || goals.easy || { correctTarget: 10, timeLimitMs: 75000 };
    },
    onStateChange: syncSessionUi
  });
  let running = false;
  let paused = false;
  let coins = initialSnapshot.player.coins;
  let levelProgressCurrent = 0;
  let levelProgressTarget = 1;
  let task = null;
  let lockInputUntil = 0;
  let assetsReadyPromise = null;
  let levelPausePending = false;
  const bh = gameBehaviors.create({
    cfg,
    audio,
    fx,
    session,
    elements: { mascotEl, coinIconEl, coinEl, ansBtns }
  });
  session.loadCheckpoint(initialSnapshot, selected);

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
      tileEl.classList.remove("tile--special", "tile--silver", "tile--gold", "tile--diamond");
      tileEl.removeAttribute("data-reward");
      shell.hideWaterShadow();
      shell.hideWaterReflection();
    }
  });

  function syncMuteButton() {
    const muted = audio.bgm.isMuted();
    muteBtn.classList.toggle("muted", muted);
    muteBtn.setAttribute("aria-label", muted ? "Enable sound" : "Mute sound");
  }

  function ensureAssetsReady() {
    if (!assetsReadyPromise) {
      assetsReadyPromise = Promise.all([
        bh.preloadImage(cfg.assets.mascotSheet.url),
        bh.preloadImage(cfg.assets.mascotSadSheet && cfg.assets.mascotSadSheet.url),
        bh.preloadImage(cfg.assets.dialUrl),
        bh.preloadImage(cfg.assets.dialNoNumbersUrl),
        bh.preloadImage(cfg.assets.dialPlainUrl)
      ]);
    }
    return assetsReadyPromise;
  }

  function currentDifficultyKey() {
    return cfg.difficulties && cfg.difficulties[selected] ? selected : "medium";
  }

  function currentDifficultyProfile() {
    return cfg.difficulties[currentDifficultyKey()] || cfg.difficulties.medium;
  }

  function currentDialUrl() {
    return currentDifficultyProfile().dialUrl || cfg.assets.dialUrl;
  }

  function syncGameplayMetrics() {
    const ui = shell.getUi();
    cfg.gameplay.tileWidth = Math.round(baseGameplay.tileWidth * ui);
    cfg.gameplay.tileHeight = Math.round(baseGameplay.tileHeight * ui);
    cfg.gameplay.tileMargin = Math.max(6, Math.round(baseGameplay.tileMargin * ui));
  }

  function setHUD() {
    coinEl.textContent = String(coins);
    const languageId = document.documentElement.lang || "he";
    if (metaApi && typeof metaApi.applyHudDifficulty === "function") {
      metaApi.applyHudDifficulty(difficultyLabelEl, difficultyValueEl, selected, languageId);
    }
  }

  function syncCheckpointState() {
    selected = meta.getSelectedDiff() || selected;
    selected = currentDifficultyKey();
    session.loadCheckpoint(meta.getSnapshot(), selected);
  }

  function syncSessionUi(state) {
    selected = state.diffKey || selected;
    selected = currentDifficultyKey();
    coins = state.coins;
    levelProgressCurrent = state.levelProgress ? state.levelProgress.current : state.correctCount;
    levelProgressTarget = state.levelProgress ? state.levelProgress.target : ((state.levelRules && state.levelRules.correctTarget) || 1);
    setHUD();
    bh.updateStreakMeter(levelProgressCurrent, levelProgressTarget);
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
      spawnTask();
    }
  }

  function getSpeed(item) {
    return shell.speedForFallDuration(item, 12);
  }

  function rollSpecialTablet() {
    return shellApi.rollSpecialTablet(gameplayRules, selected, {
      gameKey: "clocks"
    });
  }

  function sinkCurrentTask(currentTask) {
    if (!currentTask) return;
    const drownX = currentTask.x + currentTask.width / 2;
    const sinkOutcome = session.handleSink();
    falling.clear("attempt-limit");
    audio.sfx.splash();
    playSplash(drownX, currentTask);
    bh.playMascotShame();
    if (sinkOutcome.levelComplete) {
      showLevelResults();
      return;
    }
    spawnTask();
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
    const profile = currentDifficultyProfile();
    return {
      hour: utils.randInt(1, 12),
      minute: utils.choice(profile.minuteValues)
    };
  }

  function buildDistractors(correct) {
    const profile = currentDifficultyProfile();
    const distractors = profile.distractors || {};
    const correctTotal = toTotalMinutes(correct.hour, correct.minute);
    const options = [correct];
    const used = new Set([timeKey(correct)]);
    const hourOffsets = utils.shuffleInPlace((distractors.hourOffsets || []).slice());
    const minuteOffsets = utils.shuffleInPlace((distractors.minuteOffsets || []).slice());

    function pushTime(candidate) {
      const key = timeKey(candidate);
      if (used.has(key)) return false;
      if (!profile.minuteValues.includes(candidate.minute)) return false;
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
    const tabletReward = rollSpecialTablet();
    return {
      correct,
      options,
      width: tileMetrics.width,
      height: tileMetrics.height,
      x: randomTileX(tileMetrics),
      y: -(tileMetrics.height * spawnYOffsetRatio),
      spawnedAt: performance.now(),
      tabletType: tabletReward.tabletType,
      rewardCoins: tabletReward.rewardCoins,
      attemptsRemaining: tabletReward.rewardCoins > 0 ? gameplayRules.specialAttempts : gameplayRules.normalAttempts
    };
  }

  function renderTask(nextTask, rectArg, phase) {
    task = nextTask;
    if (!task) {
      return;
    }
    if (phase !== "frame") {
      session.noteQuestionPresented();
      tileLabelEl.textContent = timeLabel(task.correct.hour, task.correct.minute);
      tileEl.classList.remove("tile--special", "tile--silver", "tile--gold", "tile--diamond");
      if (task.rewardCoins > 0) {
        tileEl.classList.add("tile--special", `tile--${task.tabletType}`);
        tileEl.setAttribute("data-reward", String(task.rewardCoins));
      } else {
        tileEl.removeAttribute("data-reward");
      }
      for (let i = 0; i < ansBtns.length; i += 1) {
        const option = task.options[i];
        ansBtns[i].dataset.value = timeKey(option);
        ansBtns[i].innerHTML = clockSvg(option.hour, option.minute);
        ansBtns[i].disabled = false;
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
    const missOutcome = session.handleMiss();
    audio.sfx.splash();
    playSplash(drownX, currentTask);
    bh.playMascotShame();
    if (missOutcome.levelComplete) {
      showLevelResults();
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
    bh.setMascot("idle");
    const burstCenter = currentTileCenter();
    const burstX = burstCenter.x;
    const burstY = burstCenter.y;
    markAnswer(btn, true, cfg.answerLockMs + 80);
    session.handleCorrect();
    audio.sfx.correct();

    if (currentTask.rewardCoins > 0) {
      bh.awardTabletBonus(burstX, burstY, currentTask.rewardCoins);
    }

    fx.playEnhancedBurst(cfg.assets.burstSheet, burstX, burstY);
    lockInputUntil = performance.now() + cfg.answerLockMs;
    setTimeout(() => {
      if (!running || falling.getItem() || levelPausePending) return;
      const proceedAfterReward = () => {
        if (!running || falling.getItem() || levelPausePending) return;
        if (bh.isCoinAwardPending()) {
          setTimeout(proceedAfterReward, 80);
          return;
        }
        if (session.shouldCompleteLevel()) {
          showLevelResults();
          return;
        }
        spawnTask();
      };
      proceedAfterReward();
    }, cfg.answerLockMs);
  }

  function handleWrong(btn) {
    if (!task || btn.disabled) return;
    task.attemptsRemaining = Math.max(0, Number(task.attemptsRemaining) - 1);
    btn.disabled = true;
    session.handleWrong();
    audio.sfx.wrong();
    if (task.attemptsRemaining <= 0) {
      sinkCurrentTask(task);
      return;
    }
    markAnswer(btn, false, 220);
  }

  function resetState() {
    syncCheckpointState();
    paused = false;
    levelPausePending = false;
    pauseBtn.classList.remove("paused");
    task = null;
    lockInputUntil = 0;
    falling.stop("reset");
  }

  async function startGame() {
    syncGameplayMetrics();
    running = false;
    paused = false;
    pauseBtn.classList.remove("paused");
    meta.hideOverlay();
    shell.refreshLayout();
    await new Promise((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
    resetState();
    session.beginLevel();
    bh.setMascot("idle");
    running = true;
    falling.start();
  }

  async function handleStartRequested(payload) {
    selected = payload.diffKey || selected;
    selected = currentDifficultyKey();
    audio.ensureAudio();
    await ensureAssetsReady();
    await startGame();
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    pauseBtn.classList.toggle("paused", paused);
    if (paused) {
      session.pause();
      audio.bgm.pause();
      falling.pause();
    } else {
      session.resume();
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
    if (!btn || !running || paused || !task || btn.disabled) return;
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
      if (!btn || btn.disabled) return;
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
  bh.setMascot("idle");
  syncSessionUi(session.getState());
})();
