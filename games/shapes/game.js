(function () {
  "use strict";

  const utils = window.GAMES_V2_UTILS;
  const shellApi = window.GAMES_V2_SHELL;
  const audioApi = window.GAMES_V2_AUDIO;
  const fxApi = window.GAMES_V2_FX;
  const metaApi = window.GAMES_V2_META;
  const sessionApi = window.GAMES_V2_SESSION;
  const cfg = window.GAME_V2_SHAPES_CONFIG;

  const gameEl = document.getElementById("game");
  const tileEl = document.getElementById("tile");
  const tileShapeEl = document.getElementById("tileShape");
  const tileColorEl = document.getElementById("tileColor");
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
  const ansBtns = Array.from(answersEl.querySelectorAll(".ans"));

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
    gameKey: "shapes"
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

  const pairs = [];
  for (const shape of cfg.shapes) {
    for (const color of cfg.colors) {
      pairs.push({
        id: `${shape.id}__${color.id}`,
        shapeId: shape.id,
        shapeHe: shape.he,
        colorId: color.id,
        colorHe: color.he,
        colorHex: color.hex,
        label: `${shape.he} ${color.he}`
      });
    }
  }

  const baseGameplay = {
    tileWidth: cfg.gameplay.tileWidth,
    tileHeight: cfg.gameplay.tileHeight,
    tileMargin: cfg.gameplay.tileMargin
  };
  let correctDeck = [];
  let deckPos = 0;
  let recentCorrectIds = [];
  let selected = meta.getSelectedDiff();
  const session = sessionApi.createArcadeSession({
    getLevelRules: () => {
      const goals = cfg.gameplay.levelGoals || {};
      return goals[selected] || goals.easy || { correctTarget: 10, timeLimitMs: 75000 };
    },
    onStateChange: syncSessionUi
  });
  let activeAnswerCount = cfg.diffs.medium.answerCount;
  let running = false;
  let paused = false;
  let coins = initialSnapshot.player.coins;
  let shapesRunStreak = Math.max(0, Number(initialSnapshot.economy && initialSnapshot.economy.shapesRunStreak) || 0);
  let levelProgressCurrent = 0;
  let levelProgressTarget = 1;
  let task = null;
  let lockInputUntil = 0;
  const recentCorrectLimit = 8;
  const spawnYOffsetRatio = 0.35;
  let assetsReadyPromise = null;
  let mascotAnimToken = 0;
  let levelPausePending = false;
  let coinAwardPending = false;
  session.loadCheckpoint(initialSnapshot, selected);

  function syncWaterReflection(nextTask, rectArg) {
    if (!nextTask) {
      shell.hideWaterReflection();
      return;
    }
    shell.updateWaterReflection(tileEl, {
      x: nextTask.x,
      y: nextTask.y,
      width: cfg.gameplay.tileWidth,
      height: cfg.gameplay.tileHeight
    }, rectArg);
  }

  const falling = shell.createFallingRunner({
    createItem: generateTask,
    renderItem: renderTask,
    getSpeed,
    isMissed: (item, rect) => item.y + cfg.gameplay.tileHeight >= shell.splashContactY(cfg.gameplay.tileHeight, rect),
    onMiss: miss,
    onClear: () => {
      task = null;
      tileEl.classList.remove("tile--special", "tile--silver", "tile--gold", "tile--diamond");
      tileEl.removeAttribute("data-reward");
      shell.hideWaterReflection();
    }
  });

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
      const sprayUrls = Object.values(cfg.assets.sprayByColor || {});
      assetsReadyPromise = Promise.all([
        preloadImage(cfg.assets.mascotSheet.url),
        preloadImage(cfg.assets.mascotSadSheet && cfg.assets.mascotSadSheet.url),
        ...sprayUrls.map((url) => preloadImage(url))
      ]);
    }
    return assetsReadyPromise;
  }

  function currentDiff() {
    return cfg.diffs[selected] || cfg.diffs.medium;
  }

  function syncGameplayMetrics() {
    const ui = shell.getUi();
    cfg.gameplay.tileWidth = Math.round(baseGameplay.tileWidth * ui);
    cfg.gameplay.tileHeight = Math.round(baseGameplay.tileHeight * ui);
    cfg.gameplay.tileMargin = Math.max(6, Math.round(baseGameplay.tileMargin * ui));
  }

  function applyAnswerCount(count) {
    activeAnswerCount = Math.max(4, Math.min(ansBtns.length, Number(count) || 4));
    ansBtns.forEach((btn, idx) => {
      const enabled = idx < activeAnswerCount;
      btn.style.display = enabled ? "grid" : "none";
      btn.disabled = !enabled;
      if (!enabled) {
        delete btn.dataset.value;
        btn.innerHTML = "";
      }
    });
  }

  function clearAnswerMarks() {
    ansBtns.forEach((btn, idx) => {
      if (btn._markTimer) {
        clearTimeout(btn._markTimer);
        btn._markTimer = null;
      }
      if (btn._pressTimer) {
        clearTimeout(btn._pressTimer);
        btn._pressTimer = null;
      }
      btn.classList.remove("mark-correct", "mark-wrong", "is-pressed");
      if (idx < activeAnswerCount) {
        btn.disabled = false;
      }
    });
  }

  function showAnswerMark(btn, isCorrect, duration) {
    const markDuration = duration || cfg.answerLockMs;
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
    return shellApi.rollSpecialTablet(gameplayRules, selected, {
      gameKey: "shapes",
      consecutiveGameCount: shapesRunStreak
    });
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

  function sinkCurrentTask(currentTask) {
    if (!currentTask) return;
    const drownX = currentTask.x + cfg.gameplay.tileWidth / 2;
    const sinkOutcome = session.handleSink();
    falling.clear("attempt-limit");
    audio.sfx.splash();
    playSplash(drownX);
    playMascotShame();
    if (sinkOutcome.levelComplete) {
      showLevelResults();
      return;
    }
    spawnTask();
  }

  function refillCorrectDeck() {
    correctDeck = pairs.slice();
    utils.shuffleInPlace(correctDeck);
    deckPos = 0;
  }

  function nextCorrectPair() {
    if (!correctDeck.length || deckPos >= correctDeck.length) {
      refillCorrectDeck();
    }
    let candidate = null;
    let tries = 0;
    while (tries < correctDeck.length) {
      if (deckPos >= correctDeck.length) {
        refillCorrectDeck();
      }
      candidate = correctDeck[deckPos++];
      if (!recentCorrectIds.includes(candidate.id)) {
        break;
      }
      tries += 1;
    }
    if (!candidate) {
      candidate = utils.choice(pairs);
    }
    recentCorrectIds.push(candidate.id);
    if (recentCorrectIds.length > recentCorrectLimit) {
      recentCorrectIds.shift();
    }
    return candidate;
  }

  function level() {
    return session.getState().levelNumber;
  }

  function getSpeed() {
    const base = cfg.gameplay.baseSpeed + (level() - 1) * cfg.gameplay.speedIncPerLevel;
    const rect = shell.rect();
    const heightMul = Math.max(0.72, Math.min(1.15, rect.height / 650));
    return base * currentDiff().speedMul * heightMul;
  }

  function setHUD() {
    coinEl.textContent = String(coins);
    const languageId = document.documentElement.lang === "en" ? "en" : "he";
    if (metaApi && typeof metaApi.applyHudDifficulty === "function") {
      metaApi.applyHudDifficulty(difficultyLabelEl, difficultyValueEl, selected, languageId);
    }
  }

  function syncSessionUi(state) {
    selected = state.diffKey || selected;
    coins = state.coins;
    levelProgressCurrent = state.levelProgress ? state.levelProgress.current : state.correctCount;
    levelProgressTarget = state.levelProgress ? state.levelProgress.target : ((state.levelRules && state.levelRules.correctTarget) || 1);
    setHUD();
    updateStreakMeter();
  }

  function syncCheckpointState() {
    selected = meta.getSelectedDiff() || selected;
    const snapshot = meta.getSnapshot();
    shapesRunStreak = Math.max(0, Number(snapshot.economy && snapshot.economy.shapesRunStreak) || 0);
    session.loadCheckpoint(snapshot, selected);
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

  function shapeSvg(shapeId, colorHex, strokeHex) {
    const fill = colorHex || "#ffffff";
    const stroke = strokeHex || "#172554";
    if (shapeId === "circle") return `<svg class="shapeSvg" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="34" fill="${fill}" stroke="${stroke}" stroke-width="8"/></svg>`;
    if (shapeId === "square") return `<svg class="shapeSvg" viewBox="0 0 100 100" aria-hidden="true"><rect x="18" y="18" width="64" height="64" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="8"/></svg>`;
    if (shapeId === "triangle") return `<svg class="shapeSvg" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 14 L84 82 L16 82 Z" fill="${fill}" stroke="${stroke}" stroke-width="8" stroke-linejoin="round"/></svg>`;
    if (shapeId === "diamond") return `<svg class="shapeSvg" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 10 L86 50 L50 90 L14 50 Z" fill="${fill}" stroke="${stroke}" stroke-width="8" stroke-linejoin="round"/></svg>`;
    if (shapeId === "star") return `<svg class="shapeSvg" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 10 L60 38 L90 38 L66 56 L75 84 L50 66 L25 84 L34 56 L10 38 L40 38 Z" fill="${fill}" stroke="${stroke}" stroke-width="7" stroke-linejoin="round"/></svg>`;
    return `<svg class="shapeSvg" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 86 C20 62 10 46 10 30 C10 18 20 10 32 10 C40 10 47 14 50 20 C53 14 60 10 68 10 C80 10 90 18 90 30 C90 46 80 62 50 86 Z" fill="${fill}" stroke="${stroke}" stroke-width="7" stroke-linejoin="round"/></svg>`;
  }

  function colorBadge(colorId) {
    const sprayMap = cfg.assets.sprayByColor || {};
    const sprayUrl = String(sprayMap[colorId] || cfg.assets.sprayUrl).replace(/"/g, "&quot;");
    return `
      <span class="colorSprayBadge" aria-hidden="true">
        <img class="colorSprayImg" src="${sprayUrl}" alt="" aria-hidden="true">
      </span>
    `;
  }

  function generateTask() {
    const correct = nextCorrectPair();
    const targetCount = activeAnswerCount;
    const sameShapeDiffColor = pairs.filter((item) => item.shapeId === correct.shapeId && item.colorId !== correct.colorId);
    const diffShapeSameColor = pairs.filter((item) => item.colorId === correct.colorId && item.shapeId !== correct.shapeId);
    const others = pairs.filter((item) => item.id !== correct.id && item.shapeId !== correct.shapeId && item.colorId !== correct.colorId);
    utils.shuffleInPlace(sameShapeDiffColor);
    utils.shuffleInPlace(diffShapeSameColor);
    utils.shuffleInPlace(others);

    const options = [correct];
    const usedIds = new Set([correct.id]);
    function pushIfNew(list, maxToTake) {
      let taken = 0;
      for (const item of list) {
        if (taken >= maxToTake || options.length >= targetCount) break;
        if (usedIds.has(item.id)) continue;
        options.push(item);
        usedIds.add(item.id);
        taken += 1;
      }
    }

    pushIfNew(sameShapeDiffColor, Math.min(3, targetCount - 1));
    pushIfNew(diffShapeSameColor, 2);
    pushIfNew(others, others.length);
    pushIfNew(sameShapeDiffColor, sameShapeDiffColor.length);
    pushIfNew(diffShapeSameColor, diffShapeSameColor.length);
    utils.shuffleInPlace(options);

    const rect = shell.rect();
    const lane = shell.fallLane(cfg.gameplay.tileWidth, cfg.gameplay.tileMargin, rect);
    const tabletReward = rollSpecialTablet();
    return {
      correct,
      options,
      x: utils.randInt(Math.round(lane.minX), Math.round(lane.maxX)),
      y: -(cfg.gameplay.tileHeight * spawnYOffsetRatio),
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
      clearAnswerMarks();
      tileEl.classList.remove("tile--special", "tile--silver", "tile--gold", "tile--diamond");
      if (task.rewardCoins > 0) {
        tileEl.classList.add("tile--special", `tile--${task.tabletType}`);
        tileEl.setAttribute("data-reward", String(task.rewardCoins));
      } else {
        tileEl.removeAttribute("data-reward");
      }
      tileShapeEl.innerHTML = shapeSvg(task.correct.shapeId, "#f8fafc", "#1e293b");
      tileColorEl.innerHTML = colorBadge(task.correct.colorId);
      tileLabelEl.textContent = task.correct.label;
      for (let i = 0; i < activeAnswerCount; i += 1) {
        const option = task.options[i];
        ansBtns[i].dataset.value = option.id;
        ansBtns[i].innerHTML = shapeSvg(option.shapeId, option.colorHex, "#1e293b");
      }
    }
    tileEl.style.transform = `translate(${task.x}px, ${task.y}px)`;
    syncWaterReflection(task, rectArg);
  }

  function spawnTask() {
    task = falling.spawn();
    return task;
  }

  function playSplash(x) {
    const rect = shell.rect();
    fx.playSheetFx(cfg.assets.splashSheet, x, shell.waterY(rect), "center");
  }

  function miss(currentTask) {
    if (!currentTask) return;
    const drownX = currentTask.x + cfg.gameplay.tileWidth / 2;
    const missOutcome = session.handleMiss();
    playMascotShame();
    audio.sfx.splash();
    playSplash(drownX);
    if (missOutcome.levelComplete) {
      showLevelResults();
      return;
    }
    spawnTask();
  }

  function handleAnswer(idx) {
    if (!running || paused || !task) return;
    if (idx < 0 || idx >= activeAnswerCount) return;
    const now = performance.now();
    if (now < lockInputUntil) return;
    const btn = ansBtns[idx];
    if (!btn || btn.disabled) return;
    const value = String(btn.dataset.value || "");
    if (value === task.correct.id) {
      const currentTask = task;
      session.handleCorrect();
      falling.clear("correct");
      setMascot("idle");
      showAnswerMark(btn, true, cfg.answerLockMs + 80);
      const burstX = currentTask.x + cfg.gameplay.tileWidth / 2;
      const burstY = currentTask.y + cfg.gameplay.tileHeight / 2;
      audio.sfx.correct();
      if (currentTask.rewardCoins > 0) {
        awardTabletBonus(burstX, burstY, currentTask.rewardCoins);
      }
      fx.playEnhancedBurst(cfg.assets.burstSheet, burstX, burstY);
      lockInputUntil = now + cfg.answerLockMs;
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
          spawnTask();
        };
        proceedAfterReward();
      }, cfg.answerLockMs);
      return;
    }

    task.attemptsRemaining = Math.max(0, Number(task.attemptsRemaining) - 1);
    btn.disabled = true;
    session.handleWrong();
    audio.sfx.wrong();
    if (task.attemptsRemaining <= 0) {
      sinkCurrentTask(task);
      return;
    }
    showAnswerMark(btn, false, 260);
  }

  function resetState() {
    syncCheckpointState();
    paused = false;
    levelPausePending = false;
    coinAwardPending = false;
    pauseBtn.classList.remove("paused");
    correctDeck = [];
    deckPos = 0;
    recentCorrectIds = [];
    task = null;
    lockInputUntil = 0;
    falling.stop("reset");
    clearAnswerMarks();
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
    running = true;
    falling.start();
  }

  async function handleStartRequested(payload) {
    selected = payload.diffKey || selected;
    applyAnswerCount(currentDiff().answerCount);
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

  answersEl.addEventListener("click", (event) => {
    const btn = event.target.closest("button.ans");
    if (!btn) return;
    audio.ensureAudio();
    handleAnswer(Number(btn.dataset.idx));
  });

  window.addEventListener("keydown", (event) => {
    if (!running || paused) return;
    const keyNum = Number(event.key);
    if (Number.isInteger(keyNum) && keyNum >= 1 && keyNum <= Math.min(activeAnswerCount, 9)) {
      audio.ensureAudio();
      handleAnswer(keyNum - 1);
    }
  });

  window.addEventListener("resize", syncGameplayMetrics);
  window.addEventListener("orientationchange", syncGameplayMetrics);

  syncGameplayMetrics();
  applyAnswerCount(currentDiff().answerCount);
  ensureAssetsReady();
  setMascot("idle");
  syncSessionUi(session.getState());
})();
