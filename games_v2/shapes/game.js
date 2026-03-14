(function () {
  "use strict";

  const utils = window.GAMES_V2_UTILS;
  const shellApi = window.GAMES_V2_SHELL;
  const audioApi = window.GAMES_V2_AUDIO;
  const fxApi = window.GAMES_V2_FX;
  const cfg = window.GAME_V2_SHAPES_CONFIG;

  const gameEl = document.getElementById("game");
  const tileEl = document.getElementById("tile");
  const tileShapeEl = document.getElementById("tileShape");
  const tileColorEl = document.getElementById("tileColor");
  const tileLabelEl = document.getElementById("tileLabel");
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
  let selected = "medium";
  let activeAnswerCount = cfg.diffs.medium.answerCount;
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
  const spawnYOffsetRatio = 0.35;

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
    mascotEl.src = state === "happy"
      ? cfg.assets.mascotHappy
      : state === "shame"
        ? cfg.assets.mascotShame
        : cfg.assets.mascotIdle;
  }

  function pointsForCorrect(reactionSec) {
    const t = utils.clamp(reactionSec, 0, cfg.gameplay.correctTimeCapSec);
    const frac = 1 - (t / cfg.gameplay.correctTimeCapSec);
    return Math.round(cfg.gameplay.correctMin + (cfg.gameplay.correctMax - cfg.gameplay.correctMin) * frac);
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
    const maxX = Math.max(cfg.gameplay.tileMargin, rect.width - cfg.gameplay.tileWidth - cfg.gameplay.tileMargin);
    return {
      correct,
      options,
      x: utils.randInt(cfg.gameplay.tileMargin, Math.floor(maxX)),
      y: -(cfg.gameplay.tileHeight * spawnYOffsetRatio),
      spawnedAt: performance.now()
    };
  }

  function renderTask() {
    tileShapeEl.innerHTML = shapeSvg(task.correct.shapeId, "#f8fafc", "#1e293b");
    tileColorEl.innerHTML = colorBadge(task.correct.colorId);
    tileLabelEl.textContent = task.correct.label;
    tileEl.style.transform = `translate(${task.x}px, ${task.y}px)`;
    for (let i = 0; i < activeAnswerCount; i += 1) {
      const option = task.options[i];
      ansBtns[i].dataset.value = option.id;
      ansBtns[i].innerHTML = shapeSvg(option.shapeId, option.colorHex, "#1e293b");
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
    const currentTask = task;
    if (!currentTask) return;
    const drownX = currentTask.x + cfg.gameplay.tileWidth / 2;
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
      task = null;
      overlayEl.style.display = "grid";
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
    const value = String(btn.dataset.value || "");
    if (value === task.correct.id) {
      const currentTask = task;
      task = null;
      const burstX = currentTask.x + cfg.gameplay.tileWidth / 2;
      const burstY = currentTask.y + cfg.gameplay.tileHeight / 2;
      const rtSec = (now - currentTask.spawnedAt) / 1000;
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
      lockInputUntil = now + cfg.answerLockMs;
      if (running) {
        spawnTask();
      }
      return;
    }

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
    task = null;
    lockInputUntil = 0;
    setHUD();
  }

  function startGame() {
    syncGameplayMetrics();
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
    if (task.y + cfg.gameplay.tileHeight * 0.4 >= shell.waterY(shell.rect())) {
      miss();
    }
    rafId = requestAnimationFrame(loop);
  }

  diffsEl.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-diff]");
    if (!btn || running) return;
    selected = btn.dataset.diff;
    applyAnswerCount(currentDiff().answerCount);
    audio.ensureAudio();
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
  applyAnswerCount(cfg.diffs.medium.answerCount);
  setMascot("idle");
  setHUD();
})();
