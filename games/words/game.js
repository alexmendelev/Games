(function () {
  "use strict";

  const utils = window.GAMES_V2_UTILS;
  const shellApi = window.GAMES_V2_SHELL;
  const audioApi = window.GAMES_V2_AUDIO;
  const fxApi = window.GAMES_V2_FX;
  const metaApi = window.GAMES_V2_META;
  const sessionApi = window.GAMES_V2_SESSION;
  const cfg = window.GAME_V2_WORDS_CONFIG;

  const gameEl = document.getElementById("game");
  const wrapEl = document.querySelector(".wrap");
  const sideEl = document.querySelector(".side");
  const hudEl = document.querySelector(".hudPanel");
  const answersPanelEl = document.querySelector(".answersPanel");
  const controlsEl = document.querySelector(".controlsPanel");
  const tileEl = document.getElementById("tile");
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
  const ansImgs = ansBtns.map((btn) => btn.querySelector("img"));
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
    gameKey: "words"
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

  let emojis = [];
  let emojiPools = {};
  let correctDeck = [];
  let correctDeckDiffKey = "";
  let correctDeckLanguageId = "";
  let deckPos = 0;
  let recentCorrectIds = [];
  let emojiPoolsLanguageId = "";
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
  let correctAnswers = 0;
  let levelProgressCurrent = 0;
  let levelProgressTarget = 1;
  let task = null;
  let lockInputUntil = 0;
  const recentCorrectLimit = 8;
  const warmedEmojiUrls = new Set();
  const spawnYOffsetRatio = 0.35;
  const diffOrder = ["easy", "medium", "hard", "super"];
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
      shell.hideWaterReflection();
    }
  });

  function currentTileMetrics() {
    const rect = tileEl.getBoundingClientRect();
    const ui = shell.getUi();
    return {
      width: rect.width || cfg.gameplay.tileWidth,
      height: rect.height || cfg.gameplay.tileHeight,
      margin: Math.max(6, Math.round(cfg.gameplay.tileMargin * ui))
    };
  }

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
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
      if (img.complete) resolve();
    });
  }

  function preloadImages(urls) {
    const uniqueUrls = Array.from(new Set((urls || []).filter(Boolean)));
    return Promise.all(uniqueUrls.map((url) => preloadImage(url)));
  }

  function warm(url) {
    if (!url || warmedEmojiUrls.has(url)) return;
    warmedEmojiUrls.add(url);
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = url;
  }

  function currentLanguageId() {
    const rawLanguageId = String(document.documentElement.getAttribute("lang") || "").trim().toLowerCase();
    return rawLanguageId || "he";
  }

  function normalizeEmojiLabelKey(key) {
    const normalized = String(key || "").trim().toLowerCase();
    if (!normalized) return "";
    if (normalized === "english") return "en";
    if (normalized === "hebrew") return "he";
    return normalized;
  }

  function buildEmojiLabels(headers, parts) {
    const labels = {};
    (headers || []).forEach((header, index) => {
      const labelKey = normalizeEmojiLabelKey(header);
      if (!labelKey || labelKey === "filename" || labelKey === "category" || labelKey === "group") return;
      const labelValue = String(parts[index] || "").trim();
      if (labelValue) {
        labels[labelKey] = labelValue;
      }
    });
    return labels;
  }

  function deriveEnglishLabel(item) {
    const explicitEnglish = String(item && item.en || "").trim();
    if (explicitEnglish) return explicitEnglish;
    const source = String((item && (item.filename || item.id)) || "").replace(/\.png$/i, "");
    const match = source.match(/^[^-]+-(.+)$/);
    return String(match ? match[1] : source).replace(/_/g, " ").trim();
  }

  function emojiWord(item, languageId) {
    if (!item) return "";
    const labels = item.labels && typeof item.labels === "object" ? item.labels : {};
    const requestedLabel = String(labels[languageId] || "").trim();
    if (requestedLabel) return requestedLabel;
    const englishLabel = String(labels.en || item.en || deriveEnglishLabel(item) || "").trim();
    if (englishLabel) return englishLabel;
    const hebrewLabel = String(labels.he || item.he || "").trim();
    if (hebrewLabel) return hebrewLabel;
    const fallbackLabelKey = Object.keys(labels).find((key) => String(labels[key] || "").trim());
    return fallbackLabelKey ? String(labels[fallbackLabelKey] || "").trim() : String(item.id || "").trim();
  }

  function languageDirection(languageId) {
    return String(languageId || "").toLowerCase() === "he" ? "rtl" : "ltr";
  }

  async function loadEmojiTsv() {
    const response = await fetch(cfg.assets.emojiTsv, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load emoji TSV");
    const text = await response.text();
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const headers = lines.length && /^filename\t/i.test(lines[0]) ? lines[0].split("\t").map((part) => String(part || "").trim()) : null;
    const rows = headers ? lines.slice(1) : lines;
    return rows.map((line) => {
      const parts = line.split("\t");
      if (headers && parts.length >= 4 && /\.png$/i.test((parts[0] || "").trim())) {
        const filename = String(parts[0] || "").trim();
        const labels = buildEmojiLabels(headers, parts);
        const file = String(filename || "").trim();
        return {
          id: file.replace(/\.png$/i, ""),
          filename: file,
          en: String(labels.en || "").trim(),
          he: String(labels.he || "").trim(),
          labels,
          src: `${cfg.assets.emojiDir}/${file}`
        };
      }
      const [id, en, he] = parts;
      const code = (id || "").trim().toUpperCase();
      const labels = {};
      if (String(en || "").trim()) labels.en = String(en || "").trim();
      if (String(he || "").trim()) labels.he = String(he || "").trim();
      return { id: code, en: (en || "").trim(), he: (he || "").trim(), labels, src: `${cfg.assets.emojiDir}/${code}.png` };
    }).filter((item) => item.id && emojiWord(item, "he"));
  }

  function fallbackEmojiList() {
    return cfg.fallbackEmojis.map((item) => ({
      id: item.id,
      en: deriveEnglishLabel(item),
      he: item.he,
      labels: {
        en: deriveEnglishLabel(item),
        he: String(item.he || "").trim()
      },
      src: item.filename ? `${cfg.assets.emojiDir}/${item.filename}` : `${cfg.assets.emojiDir}/${item.id}.png`
    }));
  }

  function normalizeWordForLevel(word) {
    return String(word || "").replace(/[\s"'`׳״\-־]/g, "");
  }

  function wordLetterCount(word) {
    return normalizeWordForLevel(word).length;
  }

  function rebuildEmojiPools() {
    const languageId = currentLanguageId();
    emojiPools = {};
    for (const diffKey of diffOrder) {
      const diff = cfg.diffs[diffKey];
      if (!diff) continue;
      if (!Number.isFinite(diff.maxLetters)) {
        emojiPools[diffKey] = emojis.slice();
        continue;
      }
      emojiPools[diffKey] = emojis.filter((item) => wordLetterCount(emojiWord(item, languageId)) <= diff.maxLetters);
    }
    emojiPoolsLanguageId = languageId;
  }

  function currentDiffKey() {
    const startIndex = Math.max(0, diffOrder.indexOf(selected));
    const stepSize = Math.max(1, cfg.gameplay.correctPerDiffStep || 1);
    const unlockedSteps = Math.floor(correctAnswers / stepSize);
    const diffIndex = Math.min(diffOrder.length - 1, startIndex + unlockedSteps);
    return diffOrder[diffIndex] || "medium";
  }

  function activeEmojiPool(diffKey) {
    if (emojiPoolsLanguageId !== currentLanguageId()) {
      rebuildEmojiPools();
    }
    const pool = emojiPools[diffKey] || [];
    return pool.length >= 4 ? pool : emojis;
  }

  function refillCorrectDeck(diffKey) {
    correctDeckLanguageId = currentLanguageId();
    correctDeck = activeEmojiPool(diffKey).slice();
    utils.shuffleInPlace(correctDeck);
    deckPos = 0;
    correctDeckDiffKey = diffKey;
  }

  function nextCorrectEmoji() {
    if (!emojis.length) return null;
    const languageId = currentLanguageId();
    const diffKey = currentDiffKey();
    const pool = activeEmojiPool(diffKey);
    if (!correctDeck.length || deckPos >= correctDeck.length || correctDeckDiffKey !== diffKey || correctDeckLanguageId !== languageId) refillCorrectDeck(diffKey);
    let candidate = null;
    let tries = 0;
    while (tries < Math.max(1, correctDeck.length)) {
      if (deckPos >= correctDeck.length) refillCorrectDeck(diffKey);
      candidate = correctDeck[deckPos++];
      if (!recentCorrectIds.includes(candidate.id)) break;
      tries += 1;
    }
    if (!candidate) candidate = utils.choice(pool);
    recentCorrectIds.push(candidate.id);
    if (recentCorrectIds.length > recentCorrectLimit) recentCorrectIds.shift();
    return candidate;
  }

  function currentDiff() {
    return cfg.diffs[currentDiffKey()] || cfg.diffs.medium;
  }

  function level() {
    return session.getState().levelNumber;
  }

  function getSpeed(item) {
    return shell.speedForFallDuration(item, 12);
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
    correctAnswers = state.correctCount;
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
      gameKey: "words"
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
    const drownX = currentTask.x + currentTask.width / 2;
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

  function generateTask() {
    const correct = nextCorrectEmoji();
    if (!correct) return null;
    const languageId = currentLanguageId();
    const pool = emojis.filter((item) => item.id !== correct.id);
    utils.shuffleInPlace(pool);
    const options = [correct, pool[0], pool[1], pool[2]];
    utils.shuffleInPlace(options);
    const tileMetrics = currentTileMetrics();
    const rect = shell.rect();
    const lane = shell.fallLane(tileMetrics.width, tileMetrics.margin, rect);
    const tabletReward = rollSpecialTablet();
    return {
      word: emojiWord(correct, languageId),
      wordLang: languageId,
      wordDir: languageDirection(languageId),
      correctId: correct.id,
      options,
      width: tileMetrics.width,
      height: tileMetrics.height,
      x: utils.randInt(Math.round(lane.minX), Math.round(lane.maxX)),
      y: -(tileMetrics.height * spawnYOffsetRatio),
      spawnedAt: performance.now(),
      tabletType: tabletReward.tabletType,
      rewardCoins: tabletReward.rewardCoins,
      attemptsRemaining: tabletReward.rewardCoins > 0 ? gameplayRules.specialAttempts : gameplayRules.normalAttempts
    };
  }

  function renderTask(nextTask, rectArg, phase) {
    task = nextTask;
    if (!task) return;
    if (phase !== "frame") {
      clearAnswerMarks();
      tileEl.textContent = task.word;
      tileEl.setAttribute("lang", task.wordLang || "he");
      tileEl.setAttribute("dir", task.wordDir || "rtl");
      tileEl.setAttribute("data-word-dir", task.wordDir || "rtl");
      tileEl.classList.remove("tile--special", "tile--silver", "tile--gold", "tile--diamond");
      if (task.rewardCoins > 0) {
        tileEl.classList.add("tile--special", `tile--${task.tabletType}`);
        tileEl.setAttribute("data-reward", String(task.rewardCoins));
      } else {
        tileEl.removeAttribute("data-reward");
      }
      for (let i = 0; i < ansImgs.length; i += 1) {
        const emoji = task.options[i];
        const img = ansImgs[i];
        ansBtns[i].dataset.value = emoji.id;
        img.classList.remove("is-ready");
        img.onload = () => img.classList.add("is-ready");
        img.onerror = () => img.classList.remove("is-ready");
        img.src = emoji.src;
        if (img.complete && img.naturalWidth > 0) img.classList.add("is-ready");
        warm(emoji.src);
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
    const drownX = currentTask.x + currentTask.width / 2;
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

  function correct(btn) {
    const currentTask = task;
    falling.clear("correct");
    setMascot("idle");
    showAnswerMark(btn, true, cfg.answerLockMs + 80);
    const burstCenter = currentTileCenter();
    const burstX = burstCenter.x;
    const burstY = burstCenter.y;
    session.handleCorrect();
    audio.sfx.correct();
    if (currentTask.rewardCoins > 0) {
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
        spawnTask();
      };
      proceedAfterReward();
    }, cfg.answerLockMs);
  }

  function wrong(btn) {
    if (!task || btn.disabled) return;
    const currentTask = task;
    currentTask.attemptsRemaining = Math.max(0, Number(currentTask.attemptsRemaining) - 1);
    btn.disabled = true;
    session.handleWrong();
    audio.sfx.wrong();
    if (currentTask.attemptsRemaining <= 0) {
      sinkCurrentTask(currentTask);
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
    correctDeckDiffKey = "";
    correctDeckLanguageId = "";
    deckPos = 0;
    recentCorrectIds = [];
    lockInputUntil = 0;
    falling.stop("reset");
    clearAnswerMarks();
  }

  async function startGame() {
    resetState();
    meta.hideOverlay();
    shell.refreshLayout();
    await new Promise((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
    const firstTask = generateTask();
    task = firstTask;
    if (!task) return;
    await preloadImages(task.options.map((item) => item.src));
    session.beginLevel();
    running = true;
    paused = false;
    pauseBtn.classList.remove("paused");
    falling.start(firstTask);
  }

  async function handleStartRequested(payload) {
    selected = payload.diffKey || selected;
    audio.ensureAudio();
    const ok = await ensureEmojiListLoaded();
    if (!ok) {
      return false;
    }
    await startGame();
    return true;
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

  async function ensureEmojiListLoaded() {
    if (emojis.length) return true;
    tileEl.textContent = "טוען...";
    try {
      emojis = await loadEmojiTsv();
    } catch (_) {
      emojis = [];
    }
    if (emojis.length < 8) {
      emojis = fallbackEmojiList();
    }
    if (emojis.length < 8) {
      tileEl.textContent = "אין מספיק אימוג'ים";
      overlayEl.style.display = "grid";
      return false;
    }
    emojiPoolsLanguageId = "";
    rebuildEmojiPools();
    await Promise.all([
      preloadImage(cfg.assets.mascotSheet.url),
      preloadImage(cfg.assets.mascotSadSheet && cfg.assets.mascotSadSheet.url)
    ]);
    return true;
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
    if (!btn || !running || paused || !task || btn.disabled) return;
    audio.ensureAudio();
    if (performance.now() < lockInputUntil) return;
    if (String(btn.dataset.value || "") === task.correctId) {
      lockInputUntil = performance.now() + cfg.answerLockMs;
      correct(btn);
    } else {
      wrong(btn);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (!running || paused || !task) return;
    if (performance.now() < lockInputUntil) return;
    if (event.key >= "1" && event.key <= "4") {
      const idx = Number(event.key) - 1;
      const btn = ansBtns[idx];
      if (!btn || btn.disabled) return;
      if (String(btn.dataset.value || "") === task.correctId) {
        lockInputUntil = performance.now() + cfg.answerLockMs;
        correct(btn);
      } else {
        wrong(btn);
      }
    }
  });

  setMascot("idle");
  syncSessionUi(session.getState());
})();
