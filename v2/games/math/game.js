(function () {
  "use strict";

  const utils = window.GAMES_V2_UTILS;
  const shellApi = window.GAMES_V2_SHELL;
  const audioApi = window.GAMES_V2_AUDIO;
  const fxApi = window.GAMES_V2_FX;
  const metaApi = window.GAMES_V2_META;
  const sessionApi = window.GAMES_V2_SESSION;
  const gameBehaviors = window.GAMES_V2_BEHAVIORS;
  const cfg = window.GAME_V3_MATH_CONFIG;
  const mysteryApi = window.GAMES_V2_MYSTERY;

  const gameEl = document.getElementById("game");
  const wrapEl = document.querySelector(".wrap");
  const sideEl = document.querySelector(".side");
  const hudEl = document.querySelector(".hudPanel");
  const answersPanelEl = document.querySelector(".answersPanel");
  const answersEl = document.getElementById("answers");
  const controlsEl = document.querySelector(".controlsPanel");
  const tileEl = document.getElementById("tile");
  const overlayEl = document.getElementById("overlay");
  const diffsEl = document.getElementById("diffs");
  const pauseBtn = document.getElementById("pauseBtn");
  const muteBtn = document.getElementById("muteBtn");
  const exitBtn = document.getElementById("exitBtn");
  const coinEl = document.getElementById("coins");
  const coinIconEl = document.getElementById("coinIcon");
  const difficultyLabelEl = document.getElementById("difficultyLabel");
  const difficultyValueEl = document.getElementById("difficultyValue");
  const mascotEl = document.getElementById("mascot");
  const streakMeterEl = document.getElementById("streakMeter");
  const streakFillEl = document.getElementById("streakFill");

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
    onStartRequested: handleStartRequested,
    onExitRequested: () => shell.exitGame(),
    audio,
    fx,
    gameKey: "math"
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
      return goals[selected] || goals.easy || { correctTarget: 10, timeLimitMs: 75000 };
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
  let questionCount = 0;
  const spawnYOffsetRatio = 0.35;
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

  function currentTileMetrics(rectArg) {
    const ui = shell.getUi();
    return shell.responsiveTabletMetrics({
      baseWidth: cfg.gameplay.tileWBase,
      baseHeight: cfg.gameplay.tileHBase,
      widthRatio: 0.48,
      minWidth: 170 * ui,
      maxWidth: cfg.gameplay.tileWBase * ui,
      fontScale: 0.18,
      fontMin: 28 * ui,
      fontMax: 42 * ui,
      paddingScale: 0.075,
      paddingMin: 10 * ui,
      paddingMax: 18 * ui
    }, rectArg);
  }

  function applyTileMetrics(metrics) {
    tileEl.style.width = `${metrics.width}px`;
    tileEl.style.height = `${metrics.height}px`;
    tileEl.style.fontSize = `${metrics.fontSize}px`;
    tileEl.style.paddingInline = `${metrics.paddingX}px`;
  }

  function resolveHudDiffKey(diffKey) {
    const metaDiff = meta && typeof meta.getSelectedDiff === "function" ? meta.getSelectedDiff() : "";
    const sessionDiff = session && typeof session.getState === "function" ? session.getState().diffKey : "";
    return String(diffKey || metaDiff || sessionDiff || "medium");
  }

  function waitForNextFrame() {
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }

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
      tileEl.classList.remove("tile--special", "tile--silver", "tile--gold", "tile--diamond", "tile--mystery");
      tileEl.removeAttribute("data-reward");
      tileEl.style.transform = "";
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

  function ensureAssetsReady() {
    if (!assetsReadyPromise) {
      assetsReadyPromise = Promise.all([
        bh.preloadImage(cfg.assets.mascotSheet.url),
        bh.preloadImage(cfg.assets.mascotSadSheet && cfg.assets.mascotSadSheet.url)
      ]);
    }
    return assetsReadyPromise;
  }

  function currentDifficultyProfile() {
    return cfg.difficulties[selected] || cfg.difficulties.easy;
  }

  function speedPxPerSec(item) {
    return shell.speedForFallDuration(item, 12);
  }

  function setHUD() {
    coinEl.textContent = String(coins);
    const languageId = meta.getLanguage();
    if (metaApi && typeof metaApi.applyHudDifficulty === "function") {
      metaApi.applyHudDifficulty(difficultyLabelEl, difficultyValueEl, resolveHudDiffKey(selected), languageId);
    }
  }

  function syncSessionUi(state) {
    selected = state.diffKey || selected;
    coins = state.coins;
    levelProgressCurrent = state.levelProgress ? state.levelProgress.current : state.correctCount;
    levelProgressTarget = state.levelProgress ? state.levelProgress.target : ((state.levelRules && state.levelRules.correctTarget) || 1);
    setHUD();
    bh.updateStreakMeter(levelProgressCurrent, levelProgressTarget);
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

  function rollSpecialTablet() {
    return shellApi.rollSpecialTablet(gameplayRules, selected, {
      gameKey: "math"
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
    bh.playMascotShame();
    if (sinkOutcome.levelComplete) {
      showLevelResults();
      return;
    }
    falling.spawn();
  }

  function randomTileX() {
    const rect = shell.rect();
    const ui = shell.getUi();
    const tileWidth = currentTileMetrics(rect).width;
    const margin = cfg.gameplay.marginBase * ui;
    const lane = shell.fallLane(tileWidth, margin, rect);
    return utils.randInt(Math.round(lane.minX), Math.round(lane.maxX));
  }

  function spawnStartY() {
    return -(currentTileMetrics().height * spawnYOffsetRatio);
  }

  function randomInRange(range, fallbackMin, fallbackMax) {
    const safeRange = Array.isArray(range) && range.length >= 2 ? range : [fallbackMin, fallbackMax];
    return utils.randInt(safeRange[0], safeRange[1]);
  }

  function buildAdditionTask(profile) {
    const rules = profile.addition || {};
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const a = randomInRange(rules.left, 0, 10);
      const b = randomInRange(rules.right, 0, 10);
      if (b === 0) {
        continue;
      }
      const answer = a + b;
      if (Number.isFinite(rules.resultMax) && answer > rules.resultMax) {
        continue;
      }
      return {
        answer,
        text: `${a}+${b}`
      };
    }
    return {
      answer: 2,
      text: "1+1"
    };
  }

  function buildSubtractionTask(profile) {
    const rules = profile.subtraction || {};
    for (let attempt = 0; attempt < 120; attempt += 1) {
      let a = randomInRange(rules.left, 0, 10);
      let b = randomInRange(rules.right, 0, 10);
      if (!profile.allowNegativeResults && b > a) {
        [a, b] = [b, a];
      }
      if (b === 0) {
        continue;
      }
      const answer = a - b;
      if (!profile.allowNegativeResults && answer < 0) {
        continue;
      }
      if (Number.isFinite(rules.resultMax) && answer > rules.resultMax) {
        continue;
      }
      return {
        answer,
        text: `${a}-${b}`
      };
    }
    return {
      answer: 1,
      text: "2-1"
    };
  }

  function buildMultiplicationTask(profile) {
    const rules = profile.multiplication || {};
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const a = randomInRange(rules.left, 1, 5);
      const b = randomInRange(rules.right, 1, 5);
      const answer = a * b;
      if (Number.isFinite(rules.resultMax) && answer > rules.resultMax) {
        continue;
      }
      return {
        answer,
        text: `${a}\u00d7${b}`
      };
    }
    return {
      answer: 4,
      text: "2\u00d72"
    };
  }

  function buildDivisionTask(profile) {
    const rules = profile.division || {};
    const divisor = randomInRange(rules.divisor, 1, 5);
    const quotient = randomInRange(rules.quotient, 1, 5);
    const dividend = divisor * quotient;
    return {
      answer: quotient,
      text: `${dividend}\u00f7${divisor}`
    };
  }

  function buildDifficultyTask() {
    const profile = currentDifficultyProfile();
    const op = utils.choice(profile.operations || ["+"]);
    if (op === "+") {
      return buildAdditionTask(profile);
    }
    if (op === "-") {
      return buildSubtractionTask(profile);
    }
    if (op === "*" && profile.allowMultiplication) {
      return buildMultiplicationTask(profile);
    }
    if (op === "/" && profile.allowDivision) {
      return buildDivisionTask(profile);
    }
    return buildAdditionTask(profile);
  }

  function buildDifficultyWrongs(correct) {
    const profile = currentDifficultyProfile();
    const distractors = profile.distractors || {};
    const set = new Set([correct]);
    const allowNegativeOptions = distractors.allowNegativeOptions === true;
    const near = Math.max(2, Number(distractors.near) || 6);
    const far = Math.max(near + 1, Number(distractors.far) || 12);
    const minOffset = Math.max(1, Number(distractors.minOffset) || 1);
    const farChance = Math.max(0, Math.min(1, Number(distractors.farChance) || 0));

    function normalizeDelta(delta) {
      if (Math.abs(delta) >= minOffset) {
        return delta;
      }
      return delta < 0 ? -minOffset : minOffset;
    }

    function isAllowed(value) {
      return allowNegativeOptions || value >= 0;
    }

    let guard = 0;
    while (set.size < 4 && guard < 200) {
      guard += 1;
      let delta = normalizeDelta(utils.randInt(-near, near));
      let wrong = correct + delta;
      if (Math.random() < farChance) {
        delta = normalizeDelta(utils.randInt(-far, far));
        wrong = correct + delta;
      }
      if (!isAllowed(wrong)) {
        continue;
      }
      set.add(wrong);
    }

    while (set.size < 4) {
      const fallback = Math.max(0, correct + set.size);
      set.add(isAllowed(fallback) ? fallback : (correct + set.size));
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
    questionCount += 1;
    const tileMetrics = currentTileMetrics();
    const tabletReward = rollSpecialTablet();
    if (mysteryApi && meta.isMysteryEnabled() && mysteryApi.shouldTrigger(questionCount)) {
      const mystery = mysteryApi.generate("math", meta.getLanguage());
      return Object.assign(mystery, {
        width: tileMetrics.width,
        height: tileMetrics.height,
        fontSize: tileMetrics.fontSize,
        paddingX: tileMetrics.paddingX,
        x: randomTileX(),
        y: spawnStartY(),
        tabletType: "simple",
        rewardCoins: 0,
        attemptsRemaining: gameplayRules.normalAttempts
      });
    }
    return Object.assign(buildDifficultyTask(), {
      width: tileMetrics.width,
      height: tileMetrics.height,
      fontSize: tileMetrics.fontSize,
      paddingX: tileMetrics.paddingX,
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
      session.noteQuestionPresented();
      tileEl.textContent = task.text;
      applyTileMetrics(task);
      tileEl.classList.remove("tile--special", "tile--silver", "tile--gold", "tile--diamond", "tile--mystery");
      if (task.mystery) {
        tileEl.classList.add("tile--mystery");
        tileEl.removeAttribute("data-reward");
        answersEl.classList.add("mystery-mode");
      } else {
        answersEl.classList.remove("mystery-mode");
        if (task.rewardCoins > 0) {
          tileEl.classList.add("tile--special", `tile--${task.tabletType}`);
          tileEl.setAttribute("data-reward", String(task.rewardCoins));
        } else {
          tileEl.removeAttribute("data-reward");
        }
      }
      bh.clearAnswerMarks();

      const answers = task.mystery ? task.mysteryAnswers : buildDifficultyWrongs(task.answer);
      for (let i = 0; i < ansBtns.length; i += 1) {
        ansBtns[i].textContent = task.mysteryType === "word" ? answers[i] : utils.formatSignedNumber(answers[i]);
        ansBtns[i].dataset.val = String(answers[i]);
        ansBtns[i].classList.remove("ans--rtl");
      }
    }

    tileEl.style.transform = `translate(${task.x}px, ${task.y}px)`;
    syncWaterReflection(task, rectArg);
  }

  const initialTileMetrics = currentTileMetrics();
  applyTileMetrics(initialTileMetrics);
  window.addEventListener("resize", () => {
    const resizedMetrics = currentTileMetrics();
    if (task) {
      task.width = resizedMetrics.width;
      task.height = resizedMetrics.height;
      task.fontSize = resizedMetrics.fontSize;
      task.paddingX = resizedMetrics.paddingX;
    }
    applyTileMetrics(resizedMetrics);
  });

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
    bh.playMascotShame();

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
    const burstCenter = currentTileCenter();
    const burstX = burstCenter.x;
    const burstY = burstCenter.y;
    session.handleCorrect();
    falling.clear("correct");
    bh.setMascot("idle");
    bh.showAnswerMark(clickedBtn, true, cfg.answerFeedbackMs);
    audio.sfx.correct();

    if (currentTask && currentTask.mystery) {
      bh.awardTabletBonus(burstX, burstY, mysteryApi.COIN_MULTIPLIER);
    } else if (currentTask && currentTask.rewardCoins > 0) {
      bh.awardTabletBonus(burstX, burstY, currentTask.rewardCoins);
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
        if (bh.isCoinAwardPending()) {
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
    bh.showAnswerMark(clickedBtn, false, 260);
  }

  async function start(diffKey) {
    selected = resolveHudDiffKey(diffKey);
    await ensureAssetsReady();
    meta.hideOverlay();
    shell.refreshLayout();
    await waitForNextFrame();
    paused = false;
    levelPausePending = false;
    pauseBtn.classList.remove("paused");
    setHUD();
    syncCheckpointState();
    session.beginLevel();
    prevCorrectIdx = -1;
    questionCount = 0;
    bh.setMascot("idle");
    falling.stop("start-reset");
    running = true;
    falling.start();
  }

  async function handleStartRequested(payload) {
    audio.ensureAudio();
    return start((payload && payload.diffKey) || resolveHudDiffKey(selected));
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
    } else {
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
      const isCorrect = task.mysteryType === "word"
        ? btn.dataset.val === task.answer
        : Number(btn.dataset.val) === task.answer;
      if (isCorrect) {
        correct(btn);
      } else {
        wrong(btn);
      }
    });
  });

  bh.setMascot("idle");
  ensureAssetsReady();
  syncSessionUi(session.getState());
})();
