(function () {
  "use strict";

  const utils = window.GAMES_V2_UTILS;
  const shellApi = window.GAMES_V2_SHELL;
  const audioApi = window.GAMES_V2_AUDIO;
  const fxApi = window.GAMES_V2_FX;
  const metaApi = window.GAMES_V2_META;
  const sessionApi = window.GAMES_V2_SESSION;
  const gameBehaviors = window.GAMES_V2_BEHAVIORS;
  const cfg = window.GAME_V2_WORDS_CONFIG;
  const mysteryApi = window.GAMES_V2_MYSTERY;

  const gameEl = document.getElementById("game");
  const wrapEl = document.querySelector(".wrap");
  const sideEl = document.querySelector(".side");
  const hudEl = document.querySelector(".hudPanel");
  const answersPanelEl = document.querySelector(".answersPanel");
  const controlsEl = document.querySelector(".controlsPanel");
  const tileEl = document.getElementById("tile");
  const tileTextEl = tileEl.querySelector(".tile-text");
  const tileImg = tileEl.querySelector(".tile-image");
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
  let levelUsedIds = new Set();
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
  let levelProgressCurrent = 0;
  let levelProgressTarget = 1;
  let task = null;
  let questionCount = 0;
  let levelDirection = "image-to-word";
  meta.showStart({ levelVariant: levelDirection });
  let preparedTasks = [];
  let backgroundEmojiQueue = [];
  let backgroundEmojiTimer = 0;
  let lockInputUntil = 0;
  let spawnRequestToken = 0;
  let renderedTaskUi = null;
  let emojiLoadPromise = null;
  let startupPreparedTask = null;
  let startupPreparedKey = "";
  let startupWarmupToken = 0;
  const recentCorrectLimit = 8;
  const preparedTaskTarget = 3;
  const backgroundEmojiBatchSize = 6;
  const backgroundEmojiDelayMs = 180;
  const backgroundEmojiHiddenDelayMs = 700;
  const warmedEmojiUrls = new Set();
  const spawnYOffsetRatio = 0.35;
  let levelPausePending = false;
  const bh = gameBehaviors.create({
    cfg,
    audio,
    fx,
    session,
    elements: { mascotEl, coinIconEl, coinEl, ansBtns }
  });
  session.loadCheckpoint(initialSnapshot, selected);

  function currentDifficultyKey() {
    return cfg.difficulties && cfg.difficulties[selected] ? selected : "medium";
  }

  function currentDifficultyProfile() {
    return cfg.difficulties[currentDifficultyKey()] || cfg.difficulties.medium;
  }

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
      renderedTaskUi = null;
      tileEl.classList.remove("tile--special", "tile--silver", "tile--gold", "tile--diamond", "tile--mystery", "tile--image-mode");
      tileEl.removeAttribute("data-reward");
      tileEl.style.width = "";
      tileEl.style.height = "";
      tileEl.style.transform = "";
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

  function imageTileSize() {
    const ui = shell.getUi();
    const size = Math.round(240 * ui);
    const margin = Math.max(6, Math.round(cfg.gameplay.tileMargin * ui));
    return { width: size, height: size, margin };
  }

  function currentTileCenter() {
    const gameRect = shell.rect();
    const tileRect = tileEl.getBoundingClientRect();
    return {
      x: (tileRect.left - gameRect.left) + (tileRect.width * 0.49),
      y: (tileRect.top - gameRect.top) + (tileRect.height / 2)
    };
  }

  function preloadImages(urls) {
    const uniqueUrls = Array.from(new Set((urls || []).filter(Boolean)));
    uniqueUrls.forEach((url) => {
      warmedEmojiUrls.add(url);
    });
    return Promise.all(uniqueUrls.map((url) => bh.preloadImage(url)));
  }

  function taskOptionUrls(nextTask) {
    if (!nextTask) return [];
    if (nextTask.direction === "image-to-word") {
      return nextTask.tileImageSrc ? [nextTask.tileImageSrc] : [];
    }
    if (!Array.isArray(nextTask.options)) {
      return [];
    }
    return nextTask.options.map((item) => item && item.src).filter(Boolean);
  }

  function warm(url) {
    if (!url || warmedEmojiUrls.has(url)) return;
    warmedEmojiUrls.add(url);
    const img = new Image();
    img.decoding = "sync";
    img.loading = "eager";
    img.src = url;
  }

  function bindAnswerImage(img, src) {
    return new Promise((resolve) => {
      if (!img) {
        resolve();
        return;
      }
      const token = (Number(img._loadToken) || 0) + 1;
      img._loadToken = token;
      img.decoding = "sync";
      img.loading = "eager";
      img.classList.remove("is-ready");

      function finish(ready) {
        if (img._loadToken !== token) {
          resolve();
          return;
        }
        if (ready) {
          img.classList.add("is-ready");
        } else {
          img.classList.remove("is-ready");
        }
        resolve();
      }

      function finalizeReady() {
        if (typeof img.decode === "function") {
          img.decode().catch(() => {}).finally(() => finish(true));
          return;
        }
        finish(true);
      }

      img.onload = finalizeReady;
      img.onerror = () => finish(false);

      if (img.getAttribute("src") !== src) {
        img.src = src;
      }

      if (img.complete) {
        if (img.naturalWidth > 0) {
          finalizeReady();
        } else {
          finish(false);
        }
      }
    });
  }

  function clearMysteryMode() {
    answersEl.classList.remove("mystery-mode");
    for (let i = 0; i < ansBtns.length; i += 1) {
      const label = ansBtns[i].querySelector(".mystery-label");
      if (label) label.remove();
    }
  }

  function clearImageWordMode() {
    answersEl.classList.remove("image-word-mode");
    for (let i = 0; i < ansBtns.length; i += 1) {
      const label = ansBtns[i].querySelector(".word-label");
      if (label) label.remove();
      ansBtns[i].classList.remove("ans--rtl");
    }
  }

  function applyTaskUi(nextTask) {
    if (!nextTask) {
      return Promise.resolve();
    }
    task = nextTask;
    renderedTaskUi = nextTask;
    bh.clearAnswerMarks();
    tileEl.classList.remove("tile--special", "tile--silver", "tile--gold", "tile--diamond", "tile--mystery", "tile--image-mode");
    tileEl.style.width = "";
    tileEl.style.height = "";

    if (nextTask.mystery) {
      clearMysteryMode();
      clearImageWordMode();
      tileTextEl.textContent = nextTask.word;
      tileEl.setAttribute("lang", nextTask.wordLang || "he");
      tileEl.setAttribute("dir", nextTask.wordDir || "ltr");
      tileEl.setAttribute("data-word-dir", nextTask.wordDir || "ltr");
      tileEl.classList.add("tile--mystery");
      tileEl.removeAttribute("data-reward");
      answersEl.classList.add("mystery-mode");
      for (let i = 0; i < ansBtns.length; i += 1) {
        const img = ansImgs[i];
        if (img) img.style.display = "none";
        let label = ansBtns[i].querySelector(".mystery-label");
        if (!label) {
          label = document.createElement("span");
          label.className = "mystery-label";
          ansBtns[i].appendChild(label);
        }
        label.textContent = String(nextTask.mysteryAnswers[i]);
        ansBtns[i].dataset.value = String(nextTask.mysteryAnswers[i]);
      }
      return Promise.resolve();
    }

    if (nextTask.direction === "image-to-word") {
      clearMysteryMode();
      tileTextEl.textContent = "";
      tileEl.removeAttribute("lang");
      tileEl.removeAttribute("dir");
      tileEl.removeAttribute("data-word-dir");
      tileEl.classList.add("tile--image-mode");
      tileEl.style.width = nextTask.width + "px";
      tileEl.style.height = nextTask.height + "px";
      tileEl.style.transform = `translate(${nextTask.x}px, ${nextTask.y}px)`;
      answersEl.classList.add("image-word-mode");
      if (nextTask.rewardCoins > 0) {
        tileEl.classList.add("tile--special", `tile--${nextTask.tabletType}`);
        tileEl.setAttribute("data-reward", String(nextTask.rewardCoins));
      } else {
        tileEl.removeAttribute("data-reward");
      }
      const isRtl = nextTask.wordDir === "rtl";
      for (let i = 0; i < ansBtns.length; i += 1) {
        const img = ansImgs[i];
        if (img) img.style.display = "none";
        let label = ansBtns[i].querySelector(".word-label");
        if (!label) {
          label = document.createElement("span");
          label.className = "word-label";
          ansBtns[i].appendChild(label);
        }
        label.textContent = nextTask.answerWords[i];
        ansBtns[i].dataset.value = nextTask.answerWords[i];
        ansBtns[i].classList.toggle("ans--rtl", isRtl);
      }
      return bindAnswerImage(tileImg, nextTask.tileImageSrc);
    }

    // word-to-image (default)
    clearMysteryMode();
    clearImageWordMode();
    tileTextEl.textContent = nextTask.word;
    tileEl.setAttribute("lang", nextTask.wordLang || "he");
    tileEl.setAttribute("dir", nextTask.wordDir || "rtl");
    tileEl.setAttribute("data-word-dir", nextTask.wordDir || "rtl");
    if (nextTask.rewardCoins > 0) {
      tileEl.classList.add("tile--special", `tile--${nextTask.tabletType}`);
      tileEl.setAttribute("data-reward", String(nextTask.rewardCoins));
    } else {
      tileEl.removeAttribute("data-reward");
    }
    const imagePromises = [];
    for (let i = 0; i < ansImgs.length; i += 1) {
      const emoji = nextTask.options[i];
      const img = ansImgs[i];
      if (img) img.style.display = "";
      ansBtns[i].dataset.value = emoji.id;
      imagePromises.push(bindAnswerImage(img, emoji.src));
      warm(emoji.src);
    }
    return Promise.all(imagePromises);
  }

  function currentLanguageId() {
    const rawLanguageId = String(document.documentElement.getAttribute("lang") || "").trim().toLowerCase();
    return rawLanguageId || "he";
  }

  function startupTaskKey() {
    return `${currentDifficultyKey()}|${currentLanguageId()}`;
  }

  function normalizeEmojiLabelKey(key) {
    const normalized = String(key || "").trim().toLowerCase();
    if (!normalized) return "";
    if (normalized === "english") return "en";
    if (normalized === "hebrew") return "he";
    if (normalized === "russian") return "ru";
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
          category: String(parts[1] || "").trim(),
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
      return { id: code, category: "", en: (en || "").trim(), he: (he || "").trim(), labels, src: `${cfg.assets.emojiDir}/${code}.png` };
    }).filter((item) => item.id && emojiWord(item, "he"));
  }

  function fallbackEmojiList() {
    return cfg.fallbackEmojis.map((item) => ({
      id: item.id,
      category: String(item.id || "").split("-")[0] || "",
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
    return String(word || "").replace(/[\s"'`׳״\-־]/g, "").toLowerCase();
  }

  function wordLetterCount(word) {
    return normalizeWordForLevel(word).length;
  }

  function commonPrefixLength(left, right) {
    const maxLength = Math.min(left.length, right.length);
    let index = 0;
    while (index < maxLength && left[index] === right[index]) {
      index += 1;
    }
    return index;
  }

  function commonSuffixLength(left, right) {
    return commonPrefixLength(left.split("").reverse().join(""), right.split("").reverse().join(""));
  }

  function analyzeDistractorSimilarity(correctWord, candidateWord) {
    const correct = normalizeWordForLevel(correctWord);
    const candidate = normalizeWordForLevel(candidateWord);
    const lengthDiff = Math.abs(correct.length - candidate.length);
    const sameLength = correct.length === candidate.length;
    const sameFirstLetter = !!correct && !!candidate && correct[0] === candidate[0];
    const sameLastLetter = !!correct && !!candidate && correct[correct.length - 1] === candidate[candidate.length - 1];
    const sharedPrefixLength = commonPrefixLength(correct, candidate);
    const sharedSuffixLength = commonSuffixLength(correct, candidate);
    const similarityScore = (sameLength ? 2 : (lengthDiff <= 1 ? 1 : 0))
      + (sameFirstLetter ? 1 : 0)
      + (sameLastLetter ? 1 : 0)
      + Math.min(2, sharedPrefixLength)
      + Math.min(2, sharedSuffixLength);

    return {
      normalizedCorrect: correct,
      normalizedCandidate: candidate,
      lengthDiff,
      sameLength,
      sameFirstLetter,
      sameLastLetter,
      sharedPrefixLength,
      sharedSuffixLength,
      similarityScore
    };
  }

  function buildPoolForProfile(diffKey, options) {
    const profile = cfg.difficulties[diffKey] || cfg.difficulties.medium;
    const poolRules = profile.wordPool || {};
    const distractorRules = profile.distractors || {};
    const languageId = currentLanguageId();
    const maxFrequency = Number.isFinite(profile.maxFrequency) ? profile.maxFrequency : Infinity;
    const excludedCategories = new Set((poolRules.excludedCategories || []).map((value) => String(value || "")));
    const allowedCategories = Array.isArray(poolRules.allowedCategories) && poolRules.allowedCategories.length
      ? new Set(poolRules.allowedCategories.map((value) => String(value || "")))
      : null;
    const preferredIds = new Set((poolRules.preferredIds || []).map((value) => String(value || "")));
    const ignorePreferredOnly = !!(options && options.ignorePreferredOnly);

    const filtered = emojis.filter((item) => {
      const word = emojiWord(item, languageId);
      const letterCount = wordLetterCount(word);
      if (letterCount < (profile.minWordLength || 1)) {
        return false;
      }
      if (Number.isFinite(profile.maxWordLength) && letterCount > profile.maxWordLength) {
        return false;
      }
      if (excludedCategories.has(String(item.category || ""))) {
        return false;
      }
      if (allowedCategories && !allowedCategories.has(String(item.category || ""))) {
        return false;
      }
      // Frequency filter: only rated items (frequency > 0) are restricted; unrated legacy items always pass
      if (maxFrequency < Infinity) {
        const itemFrequency = Number(item.labels && item.labels.frequency);
        if (itemFrequency > 0 && itemFrequency > maxFrequency) return false;
      }
      return true;
    });

    if (!preferredIds.size || ignorePreferredOnly) {
      if (!distractorRules.requireStrictDistractors) {
        return filtered;
      }
      return filtered.filter((correctItem) => {
        const correctWord = emojiWord(correctItem, languageId);
        let strictCount = 0;
        const usedWords = new Set([normalizeWordForLevel(correctWord)]);
        for (const candidate of filtered) {
          if (!candidate || candidate.id === correctItem.id) {
            continue;
          }
          const candidateWord = emojiWord(candidate, languageId);
          const normalizedCandidate = normalizeWordForLevel(candidateWord);
          if (!normalizedCandidate || usedWords.has(normalizedCandidate)) {
            continue;
          }
          if (!distractorMatchesRules(analyzeDistractorSimilarity(correctWord, candidateWord), distractorRules)) {
            continue;
          }
          usedWords.add(normalizedCandidate);
          strictCount += 1;
          if (strictCount >= 3) {
            return true;
          }
        }
        return false;
      });
    }

    const preferred = filtered.filter((item) => preferredIds.has(item.id));
    if (preferred.length >= Math.max(4, Number(poolRules.preferredOnlyMinPool) || 0)) {
      return preferred;
    }

    return preferred.concat(filtered.filter((item) => !preferredIds.has(item.id)));
  }

  function rebuildEmojiPools() {
    const languageId = currentLanguageId();
    emojiPools = {};
    for (const diffKey of Object.keys(cfg.difficulties || {})) {
      const filtered = buildPoolForProfile(diffKey);
      emojiPools[diffKey] = filtered.length >= 4 ? filtered : emojis.slice();
    }
    emojiPoolsLanguageId = languageId;
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
    const diffKey = currentDifficultyKey();
    const pool = activeEmojiPool(diffKey);
    if (!correctDeck.length || deckPos >= correctDeck.length || correctDeckDiffKey !== diffKey || correctDeckLanguageId !== languageId) refillCorrectDeck(diffKey);
    let candidate = null;
    let tries = 0;
    while (tries < Math.max(1, correctDeck.length)) {
      if (deckPos >= correctDeck.length) refillCorrectDeck(diffKey);
      candidate = correctDeck[deckPos++];
      if (!recentCorrectIds.includes(candidate.id) && !levelUsedIds.has(candidate.id)) break;
      candidate = null;
      tries += 1;
    }
    if (!candidate) {
      // All pool items used this level — reset and pick freely
      levelUsedIds.clear();
      candidate = utils.choice(pool);
    }
    recentCorrectIds.push(candidate.id);
    if (recentCorrectIds.length > recentCorrectLimit) recentCorrectIds.shift();
    levelUsedIds.add(candidate.id);
    return candidate;
  }

  function getSpeed(item) {
    return shell.speedForFallDuration(item, 12);
  }

  function setHUD() {
    coinEl.textContent = String(coins);
    const languageId = meta.getLanguage();
    if (metaApi && typeof metaApi.applyHudDifficulty === "function") {
      metaApi.applyHudDifficulty(difficultyLabelEl, difficultyValueEl, selected, languageId);
    }
  }

  function syncSessionUi(state) {
    selected = currentDifficultyKey();
    coins = state.coins;
    levelProgressCurrent = state.levelProgress ? state.levelProgress.current : state.correctCount;
    levelProgressTarget = state.levelProgress ? state.levelProgress.target : ((state.levelRules && state.levelRules.correctTarget) || 1);
    setHUD();
    bh.updateStreakMeter(levelProgressCurrent, levelProgressTarget);
  }

  function syncCheckpointState() {
    selected = meta.getSelectedDiff() || selected;
    selected = currentDifficultyKey();
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
    levelDirection = levelDirection === "word-to-image" ? "image-to-word" : "word-to-image";
    await meta.showResults(Object.assign(session.buildResultsPayload(), { nextLevelVariant: levelDirection }));
    syncCheckpointState();
    preparedTasks = [];
    stopBackgroundEmojiWarmup();
    session.beginLevel();
    running = true;
    paused = false;
    levelPausePending = false;
    if (!falling.getItem()) {
      spawnTask();
    }
  }

  function rollSpecialTablet() {
    return shellApi.rollSpecialTablet(gameplayRules, selected, {
      gameKey: "words"
    });
  }

  function sinkCurrentTask(currentTask) {
    if (!currentTask) return;
    const drownX = currentTask.x + currentTask.width / 2;
    const sinkOutcome = session.handleSink();
    falling.clear("attempt-limit");
    audio.sfx.splash();
    playSplash(drownX);
    bh.playMascotShame();
    if (sinkOutcome.levelComplete) {
      showLevelResults();
      return;
    }
    spawnTask();
  }

  function distractorMatchesRules(analysis, rules) {
    if (!rules.allowSameFirstLetter && analysis.sameFirstLetter) {
      return false;
    }
    if (!rules.allowSameLastLetter && analysis.sameLastLetter) {
      return false;
    }
    if (Number.isFinite(rules.minSimilarityScore) && analysis.similarityScore < rules.minSimilarityScore) {
      return false;
    }
    if (Number.isFinite(rules.maxSimilarityScore) && analysis.similarityScore > rules.maxSimilarityScore) {
      return false;
    }
    if (Number.isFinite(rules.minLengthDelta) && analysis.lengthDiff < rules.minLengthDelta) {
      return false;
    }
    if (Number.isFinite(rules.maxLengthDelta) && analysis.lengthDiff > rules.maxLengthDelta) {
      return false;
    }
    return true;
  }

  function distractorRank(analysis, rules) {
    const targetSimilarity = Number.isFinite(rules.maxSimilarityScore)
      ? ((Math.max(0, Number(rules.minSimilarityScore) || 0) + Number(rules.maxSimilarityScore)) / 2)
      : (Number(rules.minSimilarityScore) || 0);
    let rank = 100 - Math.abs(analysis.similarityScore - targetSimilarity);
    if (rules.preferSameLength && analysis.sameLength) {
      rank += 12;
    }
    if (Number.isFinite(rules.preferSharedPrefixLength) && analysis.sharedPrefixLength >= rules.preferSharedPrefixLength) {
      rank += 10;
    }
    if (Number.isFinite(rules.preferSharedSuffixLength) && analysis.sharedSuffixLength >= rules.preferSharedSuffixLength) {
      rank += 10;
    }
    if (rules.allowSameFirstLetter && analysis.sameFirstLetter) {
      rank += 3;
    }
    if (rules.allowSameLastLetter && analysis.sameLastLetter) {
      rank += 3;
    }
    rank -= analysis.lengthDiff;
    return rank;
  }

  function selectDistractors(correct, languageId) {
    const profile = currentDifficultyProfile();
    const rules = profile.distractors || {};
    const exactPool = activeEmojiPool(selected);
    const broadPool = buildPoolForProfile(selected, { ignorePreferredOnly: true });
    const pools = [exactPool, broadPool, emojis];
    const correctWord = emojiWord(correct, languageId);
    const usedIds = new Set([correct.id]);
    const usedWords = new Set([normalizeWordForLevel(correctWord)]);
    const distractors = [];

    function addFromPool(pool, strictMode) {
      const shuffledPool = pool.slice();
      utils.shuffleInPlace(shuffledPool);
      const candidates = shuffledPool
        .filter((item) => item && !usedIds.has(item.id))
        .map((item, index) => {
          const candidateWord = emojiWord(item, languageId);
          return {
            item,
            candidateWord,
            normalizedWord: normalizeWordForLevel(candidateWord),
            analysis: analyzeDistractorSimilarity(correctWord, candidateWord),
            index
          };
        })
        .filter((entry) => entry.normalizedWord && !usedWords.has(entry.normalizedWord))
        .filter((entry) => !strictMode || distractorMatchesRules(entry.analysis, rules))
        .sort((left, right) => {
          const rankDiff = distractorRank(right.analysis, rules) - distractorRank(left.analysis, rules);
          if (rankDiff !== 0) {
            return rankDiff;
          }
          return left.index - right.index;
        });

      for (const entry of candidates) {
        if (distractors.length >= 3) {
          return;
        }
        if (usedIds.has(entry.item.id) || usedWords.has(entry.normalizedWord)) {
          continue;
        }
        distractors.push(entry.item);
        usedIds.add(entry.item.id);
        usedWords.add(entry.normalizedWord);
      }
    }

    for (const pool of pools) {
      addFromPool(pool, true);
      if (distractors.length >= 3) {
        break;
      }
    }
    if (distractors.length < 3) {
      for (const pool of pools) {
        addFromPool(pool, false);
        if (distractors.length >= 3) {
          break;
        }
      }
    }

    return distractors.slice(0, 3);
  }

  function generateTask() {
    questionCount += 1;
    if (mysteryApi && meta.isMysteryEnabled() && mysteryApi.shouldTrigger(questionCount)) {
      const mystery = mysteryApi.generate("words");
      const tileMetrics = currentTileMetrics();
      const rect = shell.rect();
      const lane = shell.fallLane(tileMetrics.width, tileMetrics.margin, rect);
      return Object.assign(mystery, {
        word: mystery.text,
        wordLang: "en",
        wordDir: "ltr",
        correctId: "__mystery__",
        options: [],
        width: tileMetrics.width,
        height: tileMetrics.height,
        x: utils.randInt(Math.round(lane.minX), Math.round(lane.maxX)),
        y: -(tileMetrics.height * spawnYOffsetRatio),
        spawnedAt: performance.now(),
        tabletType: "simple",
        rewardCoins: 0,
        attemptsRemaining: gameplayRules.normalAttempts
      });
    }
    const correct = nextCorrectEmoji();
    if (!correct) return null;
    const languageId = currentLanguageId();
    const distractors = selectDistractors(correct, languageId);
    const options = [correct].concat(distractors);
    if (options.length < 4) {
      return null;
    }
    utils.shuffleInPlace(options);
    const tileMetrics = currentTileMetrics();
    const rect = shell.rect();
    const lane = shell.fallLane(tileMetrics.width, tileMetrics.margin, rect);
    const tabletReward = rollSpecialTablet();
    const wordDir = languageDirection(languageId);
    const base = {
      wordLang: languageId,
      wordDir,
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

    if (levelDirection === "image-to-word") {
      const correctWord = emojiWord(correct, languageId);
      const imgSize = imageTileSize();
      const imgRect = shell.rect();
      const imgLane = shell.fallLane(imgSize.width, imgSize.margin, imgRect);
      return Object.assign(base, {
        direction: "image-to-word",
        word: "",
        tileImageSrc: correct.src,
        correctId: correctWord,
        answerWords: options.map((e) => emojiWord(e, languageId)),
        options: [],
        width: imgSize.width,
        height: imgSize.height,
        x: utils.randInt(Math.round(imgLane.minX), Math.round(imgLane.maxX)),
        y: -(imgSize.height * spawnYOffsetRatio)
      });
    }

    return Object.assign(base, {
      direction: "word-to-image",
      word: emojiWord(correct, languageId),
      correctId: correct.id
    });
  }

  function placeTaskForCurrentLayout(nextTask) {
    if (!nextTask) return null;
    const tileMetrics = nextTask.direction === "image-to-word" ? imageTileSize() : currentTileMetrics();
    const rect = gameEl.getBoundingClientRect();
    const lane = shell.fallLane(tileMetrics.width, tileMetrics.margin, rect);
    nextTask.width = tileMetrics.width;
    nextTask.height = tileMetrics.height;
    nextTask.x = utils.randInt(Math.round(lane.minX), Math.round(lane.maxX));
    nextTask.y = -(tileMetrics.height * spawnYOffsetRatio);
    nextTask.spawnedAt = performance.now();
    delete nextTask.__fallSpeedPxPerSec;
    return nextTask;
  }

  function clampTaskInsideGame(nextTask) {
    if (!nextTask) return nextTask;
    const rect = gameEl.getBoundingClientRect();
    const width = Math.max(1, Number(nextTask.width) || currentTileMetrics().width || cfg.gameplay.tileWidth);
    const maxX = Math.max(0, Math.floor(rect.width - width));
    nextTask.x = utils.clamp(Math.round(Number(nextTask.x) || 0), 0, maxX);
    return nextTask;
  }

  function createPreparedTask() {
    const nextTask = generateTask();
    if (!nextTask) return null;
    const prepared = {
      task: nextTask,
      ready: false,
      readyPromise: Promise.resolve()
    };
    prepared.readyPromise = preloadImages(taskOptionUrls(nextTask))
      .catch(() => {})
      .finally(() => {
        prepared.ready = true;
      });
    return prepared;
  }

  function fillPreparedTasks(minCount) {
    const targetCount = Math.max(0, Number(minCount) || 0);
    while (preparedTasks.length < targetCount) {
      const prepared = createPreparedTask();
      if (!prepared) {
        break;
      }
      preparedTasks.push(prepared);
    }
  }

  function shiftPreparedTask() {
    fillPreparedTasks(1);
    const prepared = preparedTasks.shift() || null;
    fillPreparedTasks(preparedTaskTarget);
    return prepared;
  }

  function takeStartupPreparedTask() {
    const key = startupTaskKey();
    if (!startupPreparedTask || startupPreparedKey !== key) {
      return null;
    }
    const prepared = startupPreparedTask;
    startupPreparedTask = null;
    startupPreparedKey = "";
    return prepared;
  }

  function scheduleStartupTaskWarmup() {
    const token = ++startupWarmupToken;
    ensureEmojiListLoaded({ silent: true }).then((ok) => {
      if (!ok || token !== startupWarmupToken) {
        return;
      }
      const key = startupTaskKey();
      if (startupPreparedTask && startupPreparedKey === key) {
        return;
      }
      const prepared = createPreparedTask();
      if (!prepared) {
        return;
      }
      startupPreparedTask = prepared;
      startupPreparedKey = key;
      prepared.readyPromise.catch(() => {});
    }).catch(() => {});
  }

  function cancelPendingSpawns() {
    spawnRequestToken += 1;
  }

  function stopBackgroundEmojiWarmup() {
    backgroundEmojiQueue = [];
    if (backgroundEmojiTimer) {
      clearTimeout(backgroundEmojiTimer);
      backgroundEmojiTimer = 0;
    }
  }

  function buildBackgroundEmojiQueue() {
    const orderedUrls = [];
    const seen = new Set();

    function addUrl(url) {
      const value = String(url || "").trim();
      if (!value || seen.has(value) || warmedEmojiUrls.has(value)) {
        return;
      }
      seen.add(value);
      orderedUrls.push(value);
    }

    function addTaskUrls(nextTask) {
      taskOptionUrls(nextTask).forEach(addUrl);
    }

    addTaskUrls(task);
    preparedTasks.forEach((prepared) => {
      addTaskUrls(prepared && prepared.task);
    });
    activeEmojiPool(currentDifficultyKey()).forEach((item) => addUrl(item && item.src));
    emojis.forEach((item) => addUrl(item && item.src));

    return orderedUrls;
  }

  function pumpBackgroundEmojiWarmup() {
    backgroundEmojiTimer = 0;
    if (!running || paused) {
      return;
    }
    const batch = backgroundEmojiQueue.splice(0, backgroundEmojiBatchSize);
    batch.forEach((url) => warm(url));
    if (backgroundEmojiQueue.length) {
      scheduleBackgroundEmojiWarmup();
    }
  }

  function scheduleBackgroundEmojiWarmup() {
    if (backgroundEmojiTimer || !running || paused || !backgroundEmojiQueue.length) {
      return;
    }
    const delayMs = document.hidden ? backgroundEmojiHiddenDelayMs : backgroundEmojiDelayMs;
    backgroundEmojiTimer = window.setTimeout(pumpBackgroundEmojiWarmup, delayMs);
  }

  function refreshBackgroundEmojiWarmup() {
    if (!emojis.length) {
      stopBackgroundEmojiWarmup();
      return;
    }
    backgroundEmojiQueue = buildBackgroundEmojiQueue();
    scheduleBackgroundEmojiWarmup();
  }

  function renderTask(nextTask, rectArg, phase) {
    task = clampTaskInsideGame(nextTask);
    if (!task) return;
    if (phase !== "frame") {
      session.noteQuestionPresented();
      if (renderedTaskUi !== task) {
        applyTaskUi(task);
      }
    }
    tileEl.style.transform = `translate3d(${Math.round(task.x)}px, ${Math.round(task.y)}px, 0)`;
    syncWaterReflection(task, rectArg);
  }

  function trySetItem(prepared, token) {
    if (token !== spawnRequestToken || !running || falling.getItem()) {
      return null;
    }
    task = falling.setItem(prepared.task, "spawn");
    refreshBackgroundEmojiWarmup();
    return task;
  }

  function recoverSpawn(token) {
    if (token !== spawnRequestToken || !running || falling.getItem()) {
      return;
    }
    task = falling.spawn();
    refreshBackgroundEmojiWarmup();
  }

  function spawnPreparedTask(prepared, token) {
    if (!prepared) {
      task = falling.spawn();
      refreshBackgroundEmojiWarmup();
      return Promise.resolve(task);
    }
    if (prepared.ready) {
      return applyTaskUi(prepared.task).then(() => {
        return trySetItem(prepared, token);
      }).catch(() => recoverSpawn(token));
    }
    task = null;
    refreshBackgroundEmojiWarmup();
    return prepared.readyPromise.then(() => {
      return applyTaskUi(prepared.task);
    }).then(() => {
      return trySetItem(prepared, token);
    }).catch(() => recoverSpawn(token));
  }

  function spawnTask() {
    cancelPendingSpawns();
    const token = spawnRequestToken;
    const prepared = shiftPreparedTask();
    return spawnPreparedTask(prepared, token);
  }

  function playSplash(x) {
    const rect = shell.rect();
    fx.playSheetFx(cfg.assets.splashSheet, x, shell.waterY(rect), "center");
  }

  function miss(currentTask) {
    if (!currentTask) return;
    const drownX = currentTask.x + currentTask.width / 2;
    const missOutcome = session.handleMiss();
    bh.playMascotShame();
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
    const burstCenter = currentTileCenter();
    const burstX = burstCenter.x;
    const burstY = burstCenter.y;
    falling.clear("correct");
    bh.setMascot("idle");
    bh.showAnswerMark(btn, true, cfg.answerLockMs + 80);
    session.handleCorrect();
    audio.sfx.correct();
    if (currentTask && currentTask.mystery) {
      bh.awardTabletBonus(burstX, burstY, mysteryApi.COIN_MULTIPLIER);
    } else if (currentTask.rewardCoins > 0) {
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
    bh.showAnswerMark(btn, false, 260);
  }

  function resetState() {
    cancelPendingSpawns();
    startupWarmupToken += 1;
    syncCheckpointState();
    paused = false;
    levelPausePending = false;
    pauseBtn.classList.remove("paused");
    questionCount = 0;
    correctDeck = [];
    correctDeckDiffKey = "";
    correctDeckLanguageId = "";
    deckPos = 0;
    recentCorrectIds = [];
    levelUsedIds = new Set();
    preparedTasks = [];
    renderedTaskUi = null;
    stopBackgroundEmojiWarmup();
    lockInputUntil = 0;
    falling.stop("reset");
    bh.clearAnswerMarks();
  }

  async function startGame() {
    resetState();
    let firstPrepared = takeStartupPreparedTask();
    if (firstPrepared && firstPrepared.task && (
      firstPrepared.task.mystery ||
      firstPrepared.task.direction !== levelDirection
    )) {
      firstPrepared = null;
    }
    if (!firstPrepared) {
      shell.refreshLayout();
      await new Promise((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
      fillPreparedTasks(1);
      firstPrepared = shiftPreparedTask();
    }
    if (!firstPrepared) return;
    await firstPrepared.readyPromise;
    meta.hideOverlay();
    shell.refreshLayout();
    await new Promise((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
    const firstTask = placeTaskForCurrentLayout(firstPrepared.task);
    task = firstTask;
    if (!task) return;
    recentCorrectIds = firstTask.correctId ? [firstTask.correctId] : [];
    fillPreparedTasks(preparedTaskTarget);
    await applyTaskUi(task);
    session.beginLevel();
    running = true;
    paused = false;
    pauseBtn.classList.remove("paused");
    refreshBackgroundEmojiWarmup();
    falling.start(firstTask);
  }

  async function handleStartRequested(payload) {
    selected = (payload && payload.diffKey) || selected;
    selected = currentDifficultyKey();
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
      stopBackgroundEmojiWarmup();
    } else {
      session.resume();
      audio.bgm.resume();
      falling.resume();
      refreshBackgroundEmojiWarmup();
    }
  }

  async function ensureEmojiListLoaded(options) {
    if (emojis.length) return true;
    if (emojiLoadPromise) {
      return emojiLoadPromise;
    }
    const silent = !!(options && options.silent);
    if (!silent) {
      tileTextEl.textContent = "\u05d8\u05d5\u05e2\u05df...";
    }
    emojiLoadPromise = (async () => {
      try {
        emojis = await loadEmojiTsv();
      } catch (_) {
        emojis = [];
      }
      if (emojis.length < 8) {
        emojis = fallbackEmojiList();
      }
      if (emojis.length < 8) {
        if (!silent) {
          tileTextEl.textContent = "\u05d0\u05d9\u05df \u05de\u05e1\u05e4\u05d9\u05e7 \u05d0\u05d9\u05de\u05d5\u05d2'\u05d9\u05dd";
          overlayEl.style.display = "grid";
        }
        return false;
      }
      emojiPoolsLanguageId = "";
      rebuildEmojiPools();
      await Promise.all([
        bh.preloadImage(cfg.assets.mascotSheet.url),
        bh.preloadImage(cfg.assets.mascotSadSheet && cfg.assets.mascotSadSheet.url)
      ]);
      return true;
    })().finally(() => {
      emojiLoadPromise = null;
    });
    return emojiLoadPromise;
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
    if (task.mystery) {
      if (Number(btn.dataset.value) === task.answer) {
        lockInputUntil = performance.now() + cfg.answerLockMs;
        correct(btn);
      } else {
        wrong(btn);
      }
    } else if (String(btn.dataset.value || "") === task.correctId) {
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
      const isCorrect = task.mystery
        ? Number(btn.dataset.value) === task.answer
        : String(btn.dataset.value || "") === task.correctId;
      if (isCorrect) {
        lockInputUntil = performance.now() + cfg.answerLockMs;
        correct(btn);
      } else {
        wrong(btn);
      }
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!running) {
      stopBackgroundEmojiWarmup();
      return;
    }
    if (paused || document.hidden) {
      stopBackgroundEmojiWarmup();
      return;
    }
    refreshBackgroundEmojiWarmup();
  });

  if (diffsEl) {
    diffsEl.addEventListener("click", () => {
      window.setTimeout(() => {
        scheduleStartupTaskWarmup();
      }, 0);
    });
  }

  bh.setMascot("idle");
  syncSessionUi(session.getState());
  window.setTimeout(() => {
    scheduleStartupTaskWarmup();
  }, 0);
})();
