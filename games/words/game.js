(function () {
  "use strict";

  const utils = window.GAMES_V2_UTILS;
  const shellApi = window.GAMES_V2_SHELL;
  const audioApi = window.GAMES_V2_AUDIO;
  const fxApi = window.GAMES_V2_FX;
  const cfg = window.GAME_V2_WORDS_CONFIG;

  const gameEl = document.getElementById("game");
  const tileEl = document.getElementById("tile");
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
  const ansImgs = ansBtns.map((btn) => btn.querySelector("img"));

  const shell = shellApi.createFallingShell({ gameEl, menuUrl: cfg.menuUrl, waterYRatio: cfg.waterYRatio });
  const audio = audioApi.createArcadeAudio({ sfxGain: cfg.gameplay.sfxGain, splashUrl: cfg.assets.splashAudio, coinUrl: cfg.assets.coinAudio });
  const fx = fxApi.createFxToolkit({ gameEl, coinIconEl });

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
  let deckPos = 0;
  let recentCorrectIds = [];
  let selected = "medium";
  let running = false;
  let paused = false;
  let rafId = null;
  let lastTs = 0;
  let score = 0;
  let coins = 0;
  let lives = cfg.gameplay.livesStart;
  let correctAnswers = 0;
  let consecutiveCorrect = 0;
  let streakCount = 0;
  let task = null;
  let lockInputUntil = 0;
  const recentCorrectLimit = 8;
  const warmedEmojiUrls = new Set();
  const spawnYOffsetRatio = 0.35;
  const diffOrder = ["easy", "medium", "hard", "super"];
  let mascotAnimToken = 0;
  const streakGoal = 10;
  const streakRewardDelayMs = 650;
  let streakRewardTimer = null;
  let streakRewardPending = false;
  let startPending = false;

  function syncWaterReflection(rectArg) {
    if (!task) {
      shell.hideWaterReflection();
      return;
    }
    shell.updateWaterReflection(tileEl, {
      x: task.x,
      y: task.y,
      width: task.width,
      height: task.height
    }, rectArg);
  }

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

  async function loadEmojiTsv() {
    const response = await fetch(cfg.assets.emojiTsv, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load emoji TSV");
    const text = await response.text();
    return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const [id, en, he] = line.split("\t");
      const code = (id || "").trim().toUpperCase();
      return { id: code, en: (en || "").trim(), he: (he || "").trim(), src: `${cfg.assets.emojiDir}/${code}.png` };
    }).filter((item) => item.id && item.he);
  }

  function embeddedEmojiList() {
    const embedded = Array.isArray(window.GAME_V2_WORDS_EMOJI_DATA) ? window.GAME_V2_WORDS_EMOJI_DATA : [];
    return embedded.map((item) => {
      const code = String(item.id || "").trim().toUpperCase();
      return {
        id: code,
        en: String(item.en || "").trim(),
        he: String(item.he || "").trim(),
        src: `${cfg.assets.emojiDir}/${code}.png`
      };
    }).filter((item) => item.id && item.he);
  }

  function fallbackEmojiList() {
    return cfg.fallbackEmojis.map((item) => ({ id: item.id, en: "", he: item.he, src: `${cfg.assets.emojiDir}/${item.id}.png` }));
  }

  function normalizeWordForLevel(word) {
    return String(word || "").replace(/[\s"'`׳״\-־]/g, "");
  }

  function wordLetterCount(word) {
    return normalizeWordForLevel(word).length;
  }

  function rebuildEmojiPools() {
    emojiPools = {};
    for (const diffKey of diffOrder) {
      const diff = cfg.diffs[diffKey];
      if (!diff) continue;
      if (!Number.isFinite(diff.maxLetters)) {
        emojiPools[diffKey] = emojis.slice();
        continue;
      }
      emojiPools[diffKey] = emojis.filter((item) => wordLetterCount(item.he) <= diff.maxLetters);
    }
  }

  function currentDiffKey() {
    const startIndex = Math.max(0, diffOrder.indexOf(selected));
    const stepSize = Math.max(1, cfg.gameplay.correctPerDiffStep || 1);
    const unlockedSteps = Math.floor(correctAnswers / stepSize);
    const diffIndex = Math.min(diffOrder.length - 1, startIndex + unlockedSteps);
    return diffOrder[diffIndex] || "medium";
  }

  function activeEmojiPool(diffKey) {
    const pool = emojiPools[diffKey] || [];
    return pool.length >= 4 ? pool : emojis;
  }

  function refillCorrectDeck(diffKey) {
    correctDeck = activeEmojiPool(diffKey).slice();
    utils.shuffleInPlace(correctDeck);
    deckPos = 0;
    correctDeckDiffKey = diffKey;
  }

  function nextCorrectEmoji() {
    if (!emojis.length) return null;
    const diffKey = currentDiffKey();
    const pool = activeEmojiPool(diffKey);
    if (!correctDeck.length || deckPos >= correctDeck.length || correctDeckDiffKey !== diffKey) refillCorrectDeck(diffKey);
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
    return Math.max(1, Math.floor(score / cfg.gameplay.pointsPerLevel) + 1);
  }

  function getSpeed() {
    const base = cfg.gameplay.baseSpeed + (level() - 1) * cfg.gameplay.speedIncPerLevel;
    const rect = shell.rect();
    const heightMul = Math.max(0.72, Math.min(1.15, rect.height / 650));
    return base * currentDiff().speedMul * heightMul;
  }

  function setHUD() {
    scoreEl.textContent = String(score);
    coinEl.textContent = String(coins);
    livesEl.textContent = String(lives);
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

  function pointsForCorrect(reactionSec) {
    const t = utils.clamp(reactionSec, 0, cfg.gameplay.correctTimeCapSec);
    const frac = 1 - (t / cfg.gameplay.correctTimeCapSec);
    return Math.round(cfg.gameplay.correctMin + (cfg.gameplay.correctMax - cfg.gameplay.correctMin) * frac);
  }

  function generateTask() {
    const correct = nextCorrectEmoji();
    if (!correct) return null;
    const pool = emojis.filter((item) => item.id !== correct.id);
    utils.shuffleInPlace(pool);
    const options = [correct, pool[0], pool[1], pool[2]];
    utils.shuffleInPlace(options);
    const tileMetrics = currentTileMetrics();
    const rect = shell.rect();
    const lane = shell.fallLane(tileMetrics.width, tileMetrics.margin, rect);
    return {
      wordHe: correct.he,
      correctId: correct.id,
      options,
      width: tileMetrics.width,
      height: tileMetrics.height,
      x: utils.randInt(Math.round(lane.minX), Math.round(lane.maxX)),
      y: -(tileMetrics.height * spawnYOffsetRatio),
      spawnedAt: performance.now()
    };
  }

  function renderTask() {
    tileEl.textContent = task.wordHe;
    tileEl.style.transform = `translate(${task.x}px, ${task.y}px)`;
    syncWaterReflection();
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

  function spawnTask() {
    task = generateTask();
    if (!task) return;
    renderTask();
  }

  function playSplash(x) {
    const rect = shell.rect();
    fx.playSheetFx(cfg.assets.splashSheet, x, shell.waterY(rect), "center");
  }

  function miss() {
    const drownX = task.x + task.width / 2;
    score += cfg.gameplay.scoreMiss;
    lives -= 1;
    resetCorrectProgress();
    setHUD();
    animateLifeSpent();
    playMascotShame();
    audio.sfx.splash();
    playSplash(drownX);
    if (lives <= 0) {
      audio.sfx.death();
      running = false;
      overlayEl.style.display = "grid";
      task = null;
      shell.hideWaterReflection();
      return;
    }
    spawnTask();
  }

  function correct() {
    const currentTask = task;
    task = null;
    shell.hideWaterReflection();
    setMascot("idle");
    const burstCenter = currentTileCenter();
    const burstX = burstCenter.x;
    const burstY = burstCenter.y;
    const rtSec = (performance.now() - currentTask.spawnedAt) / 1000;
    score += pointsForCorrect(rtSec);
    correctAnswers += 1;
    registerCorrectProgress();
    setHUD();
    audio.sfx.correct();
    scoreEl.classList.add("pulse");
    setTimeout(() => scoreEl.classList.remove("pulse"), 350);
    if (consecutiveCorrect >= 4) {
      consecutiveCorrect = 0;
      fx.awardCoinFromBurst(burstX, burstY, () => {
        coins += 1;
        setHUD();
        animateStarGained();
        coinEl.classList.add("pulse");
        setTimeout(() => coinEl.classList.remove("pulse"), 450);
        audio.sfx.coin();
        playMascotDance();
      });
    }
    fx.playEnhancedBurst(cfg.assets.burstSheet, burstX, burstY);
    setTimeout(() => {
      if (running) spawnTask();
    }, cfg.answerLockMs);
  }

  function wrong() {
    score += cfg.gameplay.scoreWrong;
    resetCorrectProgress();
    setHUD();
    audio.sfx.wrong();
  }

  function resetState() {
    score = 0;
    coins = 0;
    lives = cfg.gameplay.livesStart;
    correctAnswers = 0;
    consecutiveCorrect = 0;
    streakCount = 0;
    paused = false;
    pauseBtn.classList.remove("paused");
    correctDeck = [];
    correctDeckDiffKey = "";
    deckPos = 0;
    recentCorrectIds = [];
    lockInputUntil = 0;
    shell.hideWaterReflection();
    setHUD();
    updateStreakMeter();
  }

  async function startGame() {
    clearPendingStreakReward();
    resetState();
    task = generateTask();
    if (!task) return;
    await preloadImages(task.options.map((item) => item.src));
    running = true;
    paused = false;
    pauseBtn.classList.remove("paused");
    overlayEl.style.display = "none";
    lastTs = 0;
    renderTask();
    rafId = requestAnimationFrame(loop);
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    pauseBtn.classList.toggle("paused", paused);
    if (paused) {
      audio.bgm.pause();
    }
    if (!paused) {
      audio.bgm.resume();
      lastTs = 0;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(loop);
    }
  }

  async function ensureEmojiListLoaded() {
    if (emojis.length) return true;
    tileEl.textContent = "טוען...";
    try {
      emojis = await loadEmojiTsv();
    } catch (_) {
      emojis = embeddedEmojiList();
    }
    if (emojis.length < 8) {
      emojis = fallbackEmojiList();
    }
    if (emojis.length < 8) {
      tileEl.textContent = "אין מספיק אימוג'ים";
      overlayEl.style.display = "grid";
      return false;
    }
    rebuildEmojiPools();
    await Promise.all([
      preloadImage(cfg.assets.mascotSheet.url),
      preloadImage(cfg.assets.mascotSadSheet && cfg.assets.mascotSadSheet.url)
    ]);
    return true;
  }

  function loop(ts) {
    if (!running || paused) return;
    if (!task) {
      rafId = requestAnimationFrame(loop);
      return;
    }
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    task.y += getSpeed() * dt;
    tileEl.style.transform = `translate(${task.x}px, ${task.y}px)`;
    const rect = shell.rect();
    syncWaterReflection(rect);
    if (task.y + task.height >= shell.splashContactY(task.height, rect)) {
      miss();
    }
    rafId = requestAnimationFrame(loop);
  }

  diffsEl.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-diff]");
    if (!btn || running || startPending) return;
    startPending = true;
    selected = btn.dataset.diff;
    audio.ensureAudio();
    try {
      const ok = await ensureEmojiListLoaded();
      if (!ok) return;
      await startGame();
    } finally {
      startPending = false;
    }
  });

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
    audio.ensureAudio();
    if (performance.now() < lockInputUntil) return;
    if (String(btn.dataset.value || "") === task.correctId) {
      lockInputUntil = performance.now() + cfg.answerLockMs;
      correct();
    } else {
      wrong();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (!running || paused || !task) return;
    if (performance.now() < lockInputUntil) return;
    if (event.key >= "1" && event.key <= "4") {
      const idx = Number(event.key) - 1;
      const btn = ansBtns[idx];
      if (!btn) return;
      if (String(btn.dataset.value || "") === task.correctId) {
        lockInputUntil = performance.now() + cfg.answerLockMs;
        correct();
      } else {
        wrong();
      }
    }
  });

  setMascot("idle");
  setHUD();
  updateStreakMeter();
})();
