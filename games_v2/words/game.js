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
  const exitBtn = document.getElementById("exitBtn");
  const mascotEl = document.getElementById("mascot");
  const scoreEl = document.getElementById("score");
  const coinEl = document.getElementById("coins");
  const coinIconEl = document.getElementById("coinIcon");
  const livesEl = document.getElementById("lives");
  const livesIconEl = document.getElementById("livesIcon");
  const answersEl = document.getElementById("answers");
  const ansBtns = Array.from(answersEl.querySelectorAll(".ans"));
  const ansImgs = ansBtns.map((btn) => btn.querySelector("img"));

  const shell = shellApi.createFallingShell({ gameEl, menuUrl: cfg.menuUrl, waterYRatio: cfg.waterYRatio });
  const audio = audioApi.createArcadeAudio({ sfxGain: cfg.gameplay.sfxGain, splashUrl: cfg.assets.splashAudio, coinUrl: cfg.assets.coinAudio });
  const fx = fxApi.createFxToolkit({ gameEl, coinIconEl });

  let emojis = [];
  let correctDeck = [];
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
  let consecutiveCorrect = 0;
  let task = null;
  let lockInputUntil = 0;
  const recentCorrectLimit = 8;
  const warmedEmojiUrls = new Set();

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

  function fallbackEmojiList() {
    return cfg.fallbackEmojis.map((item) => ({ id: item.id, en: "", he: item.he, src: `${cfg.assets.emojiDir}/${item.id}.png` }));
  }

  function refillCorrectDeck() {
    correctDeck = emojis.slice();
    utils.shuffleInPlace(correctDeck);
    deckPos = 0;
  }

  function nextCorrectEmoji() {
    if (!emojis.length) return null;
    if (!correctDeck.length || deckPos >= correctDeck.length) refillCorrectDeck();
    let candidate = null;
    let tries = 0;
    while (tries < correctDeck.length) {
      if (deckPos >= correctDeck.length) refillCorrectDeck();
      candidate = correctDeck[deckPos++];
      if (!recentCorrectIds.includes(candidate.id)) break;
      tries += 1;
    }
    if (!candidate) candidate = utils.choice(emojis);
    recentCorrectIds.push(candidate.id);
    if (recentCorrectIds.length > recentCorrectLimit) recentCorrectIds.shift();
    return candidate;
  }

  function currentDiff() {
    return cfg.diffs[selected] || cfg.diffs.medium;
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

  function animateLifeSpent() {
    livesIconEl.classList.remove("life-hit");
    void livesIconEl.offsetWidth;
    livesIconEl.classList.add("life-hit");
  }

  function setMascot(state) {
    mascotEl.src = state === "happy" ? cfg.assets.mascotHappy : state === "shame" ? cfg.assets.mascotShame : cfg.assets.mascotIdle;
  }

  function pointsForCorrect(reactionSec) {
    const t = utils.clamp(reactionSec, 0, cfg.gameplay.correctTimeCapSec);
    const frac = 1 - (t / cfg.gameplay.correctTimeCapSec);
    return Math.round(cfg.gameplay.correctMin + (cfg.gameplay.correctMax - cfg.gameplay.correctMin) * frac);
  }

  function generateTask() {
    const correct = nextCorrectEmoji();
    const pool = emojis.filter((item) => item.id !== correct.id);
    utils.shuffleInPlace(pool);
    const options = [correct, pool[0], pool[1], pool[2]];
    utils.shuffleInPlace(options);
    const tileMetrics = currentTileMetrics();
    const rect = shell.rect();
    const maxX = Math.max(tileMetrics.margin, rect.width - tileMetrics.width - tileMetrics.margin);
    return {
      wordHe: correct.he,
      correctId: correct.id,
      options,
      width: tileMetrics.width,
      height: tileMetrics.height,
      x: utils.randInt(tileMetrics.margin, Math.floor(maxX)),
      y: -tileMetrics.height,
      spawnedAt: performance.now()
    };
  }

  function renderTask() {
    tileEl.textContent = task.wordHe;
    tileEl.style.transform = `translate(${task.x}px, ${task.y}px)`;
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
    renderTask();
  }

  function playSplash(x) {
    const rect = shell.rect();
    fx.playSheetFx(cfg.assets.splashSheet, x, shell.waterY(rect) + cfg.splashYOffset, "bottom");
  }

  function miss() {
    const drownX = task.x + task.width / 2;
    score += cfg.gameplay.scoreMiss;
    lives -= 1;
    consecutiveCorrect = 0;
    setHUD();
    animateLifeSpent();
    setMascot("shame");
    setTimeout(() => setMascot("idle"), 700);
    audio.sfx.splash();
    playSplash(drownX);
    if (lives <= 0) {
      audio.sfx.death();
      running = false;
      overlayEl.style.display = "grid";
      task = null;
      return;
    }
    spawnTask();
  }

  function correct() {
    const currentTask = task;
    task = null;
    const burstCenter = currentTileCenter();
    const burstX = burstCenter.x;
    const burstY = burstCenter.y;
    const rtSec = (performance.now() - currentTask.spawnedAt) / 1000;
    score += pointsForCorrect(rtSec);
    consecutiveCorrect += 1;
    setHUD();
    audio.sfx.correct();
    scoreEl.classList.add("pulse");
    setTimeout(() => scoreEl.classList.remove("pulse"), 350);
    if (consecutiveCorrect >= 4) {
      consecutiveCorrect = 0;
      fx.awardCoinFromBurst(burstX, burstY, () => {
        coins += 1;
        setHUD();
        coinEl.classList.add("pulse");
        setTimeout(() => coinEl.classList.remove("pulse"), 450);
        audio.sfx.coin();
      });
    }
    fx.playEnhancedBurst(cfg.assets.burstSheet, burstX, burstY);
    setMascot("happy");
    setTimeout(() => setMascot("idle"), 350);
    setTimeout(() => {
      if (running) spawnTask();
    }, cfg.answerLockMs);
  }

  function wrong() {
    score += cfg.gameplay.scoreWrong;
    consecutiveCorrect = 0;
    setHUD();
    audio.sfx.wrong();
  }

  function resetState() {
    score = 0;
    coins = 0;
    lives = cfg.gameplay.livesStart;
    consecutiveCorrect = 0;
    paused = false;
    pauseBtn.classList.remove("paused");
    correctDeck = [];
    deckPos = 0;
    recentCorrectIds = [];
    lockInputUntil = 0;
    setHUD();
  }

  function startGame() {
    running = true;
    paused = false;
    pauseBtn.classList.remove("paused");
    overlayEl.style.display = "none";
    lastTs = 0;
    resetState();
    spawnTask();
    rafId = requestAnimationFrame(loop);
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    pauseBtn.classList.toggle("paused", paused);
    if (!paused) {
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
      emojis = fallbackEmojiList();
    }
    if (emojis.length < 8) {
      tileEl.textContent = "אין מספיק אימוג'ים";
      overlayEl.style.display = "grid";
      return false;
    }
    await Promise.all([
      preloadImage(cfg.assets.mascotIdle),
      preloadImage(cfg.assets.mascotHappy),
      preloadImage(cfg.assets.mascotShame)
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
    if (task.y + task.height * 0.4 >= shell.waterY(shell.rect())) {
      miss();
    }
    rafId = requestAnimationFrame(loop);
  }

  diffsEl.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-diff]");
    if (!btn || running) return;
    selected = btn.dataset.diff;
    audio.ensureAudio();
    const ok = await ensureEmojiListLoaded();
    if (!ok) return;
    startGame();
  });

  pauseBtn.addEventListener("click", () => {
    audio.ensureAudio();
    togglePause();
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
})();
