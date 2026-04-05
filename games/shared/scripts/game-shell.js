window.GAMES_V2_SHELL = (function (utils) {
  const DIFFICULTY_REWARD_ALIASES = {
    difficult: "hard",
    upTo5: "hard",
    upTo10: "super"
  };
  const DIFFICULTY_REWARD_PROFILES = {
    easy: {
      completionBonus: 1,
      specialChanceMul: 0.65,
      weightMultipliers: {
        silver: 1,
        gold: 0.7,
        diamond: 0.35
      }
    },
    medium: {
      completionBonus: 2,
      specialChanceMul: 1,
      weightMultipliers: {
        silver: 1,
        gold: 1,
        diamond: 1
      }
    },
    hard: {
      completionBonus: 4,
      specialChanceMul: 1.25,
      weightMultipliers: {
        silver: 1,
        gold: 1.35,
        diamond: 1.9
      }
    },
    super: {
      completionBonus: 8,
      specialChanceMul: 1.55,
      weightMultipliers: {
        silver: 1,
        gold: 1.7,
        diamond: 2.8
      }
    }
  };

  function normalizeDifficultyRewardKey(diffKey) {
    const rawKey = String(diffKey || "").trim();
    const normalizedKey = DIFFICULTY_REWARD_ALIASES[rawKey] || rawKey;
    return Object.prototype.hasOwnProperty.call(DIFFICULTY_REWARD_PROFILES, normalizedKey)
      ? normalizedKey
      : "medium";
  }

  function getDifficultyRewardProfile(diffKey) {
    return DIFFICULTY_REWARD_PROFILES[normalizeDifficultyRewardKey(diffKey)];
  }

  function getCompletionBonus(diffKey, options) {
    const profile = getDifficultyRewardProfile(diffKey);
    const gameKey = options && options.gameKey;
    if (gameKey === "shapes") {
      return Math.max(1, Math.floor(profile.completionBonus / 2));
    }
    if (gameKey === "equations") {
      return Math.max(2, Math.ceil(profile.completionBonus * 1.5));
    }
    return profile.completionBonus;
  }

  function buildTabletRewardSettings(baseRules, diffKey, options) {
    const safeRules = baseRules && typeof baseRules === "object" ? baseRules : {};
    const profile = getDifficultyRewardProfile(diffKey);
    const gameKey = options && options.gameKey;
    const consecutiveGameCount = Math.max(0, Number(options && options.consecutiveGameCount) || 0);
    let chanceMultiplier = profile.specialChanceMul;
    let rewardMultiplier = 1;
    if (gameKey === "shapes") {
      const streakPenalty = Math.max(0, 1 - (Math.min(10, consecutiveGameCount) / 10));
      chanceMultiplier *= 0.55 * streakPenalty;
      rewardMultiplier = 0.4;
    }
    return {
      specialChance: utils.clamp((Number(safeRules.specialChance) || 0) * chanceMultiplier, 0, 1),
      specialTablets: (Array.isArray(safeRules.specialTablets) ? safeRules.specialTablets : []).map((tablet) => {
        const tabletType = String(tablet && tablet.tabletType || "simple");
        const weightMultiplier = profile.weightMultipliers[tabletType] || 1;
        return {
          tabletType,
          rewardCoins: Math.max(1, Math.round(Math.max(0, Number(tablet && tablet.rewardCoins) || 0) * rewardMultiplier)),
          weight: Math.max(0, Number(tablet && tablet.weight) || 0) * weightMultiplier
        };
      }).filter((tablet) => tablet.weight > 0 && tablet.rewardCoins > 0)
    };
  }

  function rollSpecialTablet(baseRules, diffKey, options) {
    const rewardSettings = buildTabletRewardSettings(baseRules, diffKey, options);
    if (!rewardSettings.specialTablets.length || Math.random() >= rewardSettings.specialChance) {
      return { tabletType: "simple", rewardCoins: 0 };
    }
    const totalWeight = rewardSettings.specialTablets.reduce((sum, tablet) => sum + tablet.weight, 0);
    if (totalWeight <= 0) {
      return { tabletType: "simple", rewardCoins: 0 };
    }
    let roll = Math.random() * totalWeight;
    for (const tablet of rewardSettings.specialTablets) {
      roll -= tablet.weight;
      if (roll <= 0) {
        return tablet;
      }
    }
    return rewardSettings.specialTablets[0];
  }

  function createFallingShell(options) {
    const layoutApi = window.GAMES_V2_LAYOUT;
    const settings = Object.assign({
      gameEl: null,
      wrapEl: null,
      sideEl: null,
      hudEl: null,
      answersPanelEl: null,
      answersEl: null,
      controlsEl: null,
      menuUrl: "../index.html",
      waterYRatio: 0.8,
      uiBaseWidth: 900,
      uiBaseHeight: 650,
      uiPortraitMul: 0.92,
      uiMin: 0.58,
      uiMax: 1,
      layout: null
    }, options || {});

    let cachedRect = null;
    let cachedWaterY = 0;
    let waterShadowEl = null;
    let waterReflectionEl = null;
    let reflectionMarkup = "";
    let reflectionClassName = "";
    let layoutDebugBadgeEl = null;
    const baseDocumentTitle = document.title;
    const layoutEngine = layoutApi && typeof layoutApi.createLayoutEngine === "function"
      ? layoutApi.createLayoutEngine(settings.layout || {})
      : null;
    let currentLayout = null;

    function isScreenIndicatorEnabled() {
      try {
        const params = new window.URLSearchParams((window.location && window.location.search) || "");
        const value = String(params.get("screenindicator") || "").trim().toLowerCase();
        return value === "1" || value === "true";
      } catch (_) {
        return false;
      }
    }

    function measureLayoutContext() {
      return {
        viewport: layoutApi && typeof layoutApi.getViewport === "function"
          ? layoutApi.getViewport()
          : {
              width: window.innerWidth,
              height: window.innerHeight
            },
        hudEl: settings.hudEl,
        controlsEl: settings.controlsEl
      };
    }

    function computeUi() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.min(vw / settings.uiBaseWidth, vh / settings.uiBaseHeight);
      const portrait = vh > vw;
      return utils.clamp(scale * (portrait ? settings.uiPortraitMul : 1), settings.uiMin, settings.uiMax);
    }

    function applyUi() {
      document.documentElement.style.setProperty("--ui", computeUi().toFixed(3));
    }

    function captureRect() {
      if (!settings.gameEl || !settings.gameEl.getBoundingClientRect) {
        return cachedRect;
      }
      const next = settings.gameEl.getBoundingClientRect();
      cachedRect = {
        x: next.x,
        y: next.y,
        top: next.top,
        right: next.right,
        bottom: next.bottom,
        left: next.left,
        width: next.width,
        height: next.height
      };
      cachedWaterY = cachedRect.height * settings.waterYRatio;
      return cachedRect;
    }

    function ensureLayoutDebugBadge() {
      if (!isScreenIndicatorEnabled()) {
        if (layoutDebugBadgeEl && layoutDebugBadgeEl.parentNode) {
          layoutDebugBadgeEl.parentNode.removeChild(layoutDebugBadgeEl);
        }
        layoutDebugBadgeEl = null;
        return null;
      }
      if (layoutDebugBadgeEl && layoutDebugBadgeEl.isConnected) {
        return layoutDebugBadgeEl;
      }
      const controlsHost = settings.controlsEl && settings.controlsEl.querySelector
        ? (settings.controlsEl.querySelector(".actions") || settings.controlsEl.querySelector(".row"))
        : null;
      if (!controlsHost) {
        return null;
      }
      layoutDebugBadgeEl = controlsHost.querySelector(".layoutDebugBadge");
      if (!layoutDebugBadgeEl) {
        layoutDebugBadgeEl = document.createElement("div");
        layoutDebugBadgeEl.className = "layoutDebugBadge";
        layoutDebugBadgeEl.setAttribute("aria-live", "polite");

        const modeEl = document.createElement("div");
        modeEl.className = "layoutDebugBadgeMode";
        layoutDebugBadgeEl.appendChild(modeEl);

        const ratioEl = document.createElement("div");
        ratioEl.className = "layoutDebugBadgeRatio";
        layoutDebugBadgeEl.appendChild(ratioEl);

        controlsHost.appendChild(layoutDebugBadgeEl);
      }
      return layoutDebugBadgeEl;
    }

    function updateLayoutDebugBadge(layout) {
      const badge = ensureLayoutDebugBadge();
      if (!badge || !layout || !layout.viewport) {
        return;
      }
      const width = Math.max(0, Math.round(Number(layout.viewport.width) || 0));
      const height = Math.max(0, Math.round(Number(layout.viewport.height) || 0));
      const aspectRatio = Number(layout.screen && layout.screen.aspectRatio);
      const ratioText = Number.isFinite(aspectRatio) ? aspectRatio.toFixed(2) : "0.00";
      const modeText = String(layout.mode || layout.orientation || "");
      const layoutText = layout.orientation === "landscape" ? "split" : "stack";
      const modeEl = badge.querySelector(".layoutDebugBadgeMode");
      const ratioEl = badge.querySelector(".layoutDebugBadgeRatio");
      badge.dataset.layoutMode = modeText;
      badge.setAttribute("aria-label", `Layout ${modeText} ${layoutText}. Screen ${width} by ${height}. Ratio ${ratioText}.`);
      if (modeEl) {
        modeEl.textContent = `${modeText} / ${layoutText}`;
      }
      if (ratioEl) {
        ratioEl.textContent = `${width}x${height} · ${ratioText}`;
      }
    }

    function updateLayoutDebugTitle(layout) {
      if (!layout || !layout.viewport) {
        document.title = baseDocumentTitle;
        return;
      }
      const width = Math.max(0, Math.round(Number(layout.viewport.width) || 0));
      const height = Math.max(0, Math.round(Number(layout.viewport.height) || 0));
      const aspectRatio = Number(layout.screen && layout.screen.aspectRatio);
      const ratioText = Number.isFinite(aspectRatio) ? aspectRatio.toFixed(2) : "0.00";
      const modeText = String(layout.mode || layout.orientation || "");
      const layoutText = layout.orientation === "landscape" ? "split" : "stack";
      document.title = `${baseDocumentTitle} [${modeText}/${layoutText} ${width}x${height} / ${ratioText}]`;
    }

    function refreshLayout() {
      applyUi();
      if (layoutEngine && layoutApi && typeof layoutApi.applyLayout === "function") {
        currentLayout = layoutEngine.compute(measureLayoutContext());
        layoutApi.applyLayout(currentLayout, {
          wrapEl: settings.wrapEl,
          sideEl: settings.sideEl,
          gameEl: settings.gameEl,
          hudEl: settings.hudEl,
          answersPanelEl: settings.answersPanelEl,
          answersEl: settings.answersEl,
          controlsEl: settings.controlsEl
        });
        updateLayoutDebugBadge(currentLayout);
        updateLayoutDebugTitle(currentLayout);
      }
      captureRect();
      window.requestAnimationFrame(captureRect);
    }

    function ensureAnswerButtons() {
      if (!settings.answersEl) {
        return [];
      }
      if (!layoutApi || typeof layoutApi.ensureAnswerButtons !== "function") {
        return Array.from(settings.answersEl.querySelectorAll(".ans"));
      }
      const layoutConfig = layoutEngine ? layoutEngine.getConfig() : (settings.layout || {});
      return layoutApi.ensureAnswerButtons(settings.answersEl, layoutConfig.answers || {});
    }

    function setAnswerLayout(nextAnswerConfig) {
      if (layoutEngine) {
        layoutEngine.updateConfig({
          answers: nextAnswerConfig || {}
        });
      }
      const buttons = ensureAnswerButtons();
      refreshLayout();
      return buttons;
    }

    function ensureWaterShadow() {
      if (waterShadowEl || !settings.gameEl || !settings.gameEl.appendChild) {
        return waterShadowEl;
      }
      waterShadowEl = document.createElement("div");
      waterShadowEl.className = "waterShadow";
      waterShadowEl.setAttribute("aria-hidden", "true");
      settings.gameEl.appendChild(waterShadowEl);
      return waterShadowEl;
    }

    function hideWaterShadow() {
      const shadow = ensureWaterShadow();
      if (!shadow) return;
      shadow.style.opacity = "0";
      shadow.style.transform = "translate(-50%, -50%) scale(0.65)";
    }

    function updateWaterShadow(tileBox, rectArg) {
      const shadow = ensureWaterShadow();
      if (!shadow || !tileBox) {
        hideWaterShadow();
        return;
      }
      const tileX = Number(tileBox.x);
      const tileY = Number(tileBox.y);
      const tileWidth = Number(tileBox.width);
      const tileHeight = Number(tileBox.height);
      if (![tileX, tileY, tileWidth, tileHeight].every(Number.isFinite) || tileWidth <= 0 || tileHeight <= 0) {
        hideWaterShadow();
        return;
      }

      const r = rectArg || rect();
      if (!r) {
        hideWaterShadow();
        return;
      }

      const waterLineY = waterY(r);
      const tileBottom = tileY + tileHeight;
      const distanceToWater = waterLineY - tileBottom;
      const fadeRange = Math.max(tileHeight * 3.8, r.height * 0.52);
      const closeness = utils.clamp(1 - (distanceToWater / fadeRange), 0, 1);
      if (closeness <= 0) {
        hideWaterShadow();
        return;
      }

      const centerX = tileX + (tileWidth / 2);
      const shadowY = waterLineY + Math.max(12, tileHeight * 0.12);
      const width = tileWidth * (0.52 + closeness * 0.34);
      const height = tileHeight * (0.18 + closeness * 0.11);
      const scaleX = 0.9 + closeness * 0.18;
      const scaleY = 0.68 + closeness * 0.2;

      shadow.style.left = `${centerX}px`;
      shadow.style.top = `${shadowY}px`;
      shadow.style.width = `${width}px`;
      shadow.style.height = `${height}px`;
      shadow.style.opacity = `${0.12 + closeness * 0.38}`;
      shadow.style.transform = `translate(-50%, -50%) scale(${scaleX}, ${scaleY})`;
    }

    function ensureWaterReflection() {
      if (waterReflectionEl || !settings.gameEl || !settings.gameEl.appendChild) {
        return waterReflectionEl;
      }
      waterReflectionEl = document.createElement("div");
      waterReflectionEl.className = "waterReflection";
      waterReflectionEl.setAttribute("aria-hidden", "true");
      settings.gameEl.appendChild(waterReflectionEl);
      return waterReflectionEl;
    }

    function syncWaterReflectionMarkup(sourceEl) {
      const reflection = ensureWaterReflection();
      if (!reflection || !sourceEl) {
        return reflection;
      }
      const nextClass = `${sourceEl.className} waterReflection`;
      const nextMarkup = sourceEl.innerHTML;
      if (nextClass === reflectionClassName && nextMarkup === reflectionMarkup) {
        return reflection;
      }
      reflectionClassName = nextClass;
      reflectionMarkup = nextMarkup;
      reflection.className = nextClass;
      reflection.innerHTML = nextMarkup;
      reflection.removeAttribute("id");
      reflection.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      return reflection;
    }

    function hideWaterReflection() {
      const reflection = ensureWaterReflection();
      if (!reflection) return;
      reflection.style.opacity = "0";
      reflection.style.transform = "scale(1.02, -0.72)";
    }

    function updateWaterReflection(sourceEl, tileBox, rectArg) {
      const reflection = syncWaterReflectionMarkup(sourceEl);
      if (!reflection || !tileBox) {
        hideWaterReflection();
        return;
      }
      const tileX = Number(tileBox.x);
      const tileY = Number(tileBox.y);
      const tileWidth = Number(tileBox.width);
      const tileHeight = Number(tileBox.height);
      if (![tileX, tileY, tileWidth, tileHeight].every(Number.isFinite) || tileWidth <= 0 || tileHeight <= 0) {
        hideWaterReflection();
        return;
      }

      const r = rectArg || rect();
      if (!r) {
        hideWaterReflection();
        return;
      }

      const waterLineY = waterY(r);
      const tileBottom = tileY + tileHeight;
      const distanceToWater = waterLineY - tileBottom;
      const fadeRange = Math.max(tileHeight * 2.8, r.height * 0.42);
      const closeness = utils.clamp(1 - (distanceToWater / fadeRange), 0, 1);
      if (closeness <= 0) {
        hideWaterReflection();
        return;
      }

      const reflectionTop = (waterLineY * 2) - tileBottom + Math.max(4, tileHeight * 0.05);
      const scaleX = 1 + closeness * 0.04;
      const scaleY = -(0.58 + closeness * 0.18);

      reflection.style.left = `${tileX}px`;
      reflection.style.top = `${reflectionTop}px`;
      reflection.style.width = `${tileWidth}px`;
      reflection.style.height = `${tileHeight}px`;
      reflection.style.opacity = `${0.16 + closeness * 0.34}`;
      reflection.style.transform = `scale(${scaleX}, ${scaleY})`;
    }

    function rect() {
      return cachedRect || captureRect();
    }

    function waterY(r) {
      if (r && typeof r.height === "number") {
        return r.height * settings.waterYRatio;
      }
      return cachedWaterY;
    }

    function fallLane(tileWidth, margin, rectArg) {
      const r = rectArg || rect();
      if (!r) {
        const edge = Math.max(0, Math.round(margin || 0));
        return { minX: edge, maxX: edge };
      }
      const ui = getUi();
      const fallbackRockWidth = Math.min(360 * ui, r.width * 0.54);
      const fallbackLeftSafeBand = Math.min(fallbackRockWidth * 0.58, r.width * 0.34);
      const leftClear = currentLayout && currentLayout.fallLane
        ? Math.max(margin, Math.round(currentLayout.fallLane.leftPadding))
        : Math.max(margin, Math.round(fallbackLeftSafeBand + Math.max(12, 20 * ui)));
      const rightClear = currentLayout && currentLayout.fallLane
        ? Math.max(margin, Math.round(currentLayout.fallLane.rightPadding))
        : Math.max(margin, Math.round(24 * ui));
      const rawMaxX = Math.max(0, Math.floor(r.width - tileWidth - rightClear));
      const minX = Math.max(0, Math.min(leftClear, rawMaxX));
      return {
        minX,
        maxX: Math.max(minX, rawMaxX)
      };
    }

    function splashContactY(tileHeight, rectArg) {
      const r = rectArg || rect();
      const baseWaterY = waterY(r);
      const shadowTouchOffset = Math.max(12, Number(tileHeight || 0) * 0.16);
      return baseWaterY + shadowTouchOffset;
    }

    function responsiveTabletMetrics(options, rectArg) {
      const r = rectArg || rect();
      const ui = getUi();
      const baseWidth = Math.max(1, Number(options && options.baseWidth) || 240);
      const baseHeight = Math.max(1, Number(options && options.baseHeight) || 78);
      const widthRatio = utils.clamp(Number(options && options.widthRatio) || 0.5, 0.2, 0.95);
      const maxWidth = Math.max(1, Number(options && options.maxWidth) || (baseWidth * ui));
      const minWidth = Math.min(maxWidth, Math.max(1, Number(options && options.minWidth) || (maxWidth * 0.72)));
      const width = utils.clamp((Number(r && r.width) || 0) * widthRatio, minWidth, maxWidth);
      const aspectRatio = baseWidth / baseHeight;
      const height = width / aspectRatio;
      const fontScale = Math.max(0.05, Number(options && options.fontScale) || 0.18);
      const maxFontSize = Math.max(1, Number(options && options.fontMax) || (42 * ui));
      const minFontSize = Math.min(maxFontSize, Math.max(1, Number(options && options.fontMin) || (maxFontSize * 0.72)));
      const fontSize = utils.clamp(width * fontScale, minFontSize, maxFontSize);
      const maxPaddingX = Math.max(0, Number(options && options.paddingMax) || (24 * ui));
      const minPaddingX = Math.min(maxPaddingX, Math.max(0, Number(options && options.paddingMin) || (12 * ui)));
      const paddingX = utils.clamp(width * (Number(options && options.paddingScale) || 0.07), minPaddingX, maxPaddingX);
      return {
        width,
        height,
        fontSize,
        paddingX
      };
    }

    function speedForFallDuration(item, durationSeconds, rectArg) {
      if (!item) return 0;
      const duration = Math.max(0.001, Number(durationSeconds) || 0);
      if (!Number.isFinite(item.__fallSpeedPxPerSec)) {
        const startY = Number.isFinite(item.y) ? item.y : 0;
        const itemHeight = Math.max(0, Number(item.height) || 0);
        const targetY = splashContactY(itemHeight, rectArg) - itemHeight;
        const distance = Math.max(0, targetY - startY);
        item.__fallSpeedPxPerSec = distance / duration;
      }
      return item.__fallSpeedPxPerSec;
    }

    function createFallingRunner(options) {
      const runnerSettings = Object.assign({
        createItem: null,
        renderItem: null,
        getSpeed: null,
        isMissed: null,
        onMiss: null,
        onClear: null
      }, options || {});

      let currentItem = null;
      let running = false;
      let paused = false;
      let rafId = null;
      let lastTs = 0;

      function cancelLoop() {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }

      function clear(reason) {
        currentItem = null;
        if (typeof runnerSettings.onClear === "function") {
          runnerSettings.onClear(reason || "clear");
        }
      }

      function renderCurrent(phase, rectArg) {
        if (!currentItem || typeof runnerSettings.renderItem !== "function") {
          return currentItem;
        }
        const r = rectArg || rect();
        runnerSettings.renderItem(currentItem, r, phase || "frame");
        return currentItem;
      }

      function setItem(item, phase) {
        currentItem = item || null;
        if (!currentItem) {
          clear(phase || "clear");
          return null;
        }
        renderCurrent(phase || "spawn");
        return currentItem;
      }

      function spawn() {
        if (typeof runnerSettings.createItem !== "function") {
          clear("spawn-empty");
          return null;
        }
        return setItem(runnerSettings.createItem(), "spawn");
      }

      function tick(ts) {
        if (!running || paused) {
          rafId = null;
          return;
        }
        if (!currentItem) {
          rafId = requestAnimationFrame(tick);
          return;
        }
        if (!lastTs) {
          lastTs = ts;
        }
        const dt = Math.min(0.05, (ts - lastTs) / 1000);
        lastTs = ts;

        const speed = typeof runnerSettings.getSpeed === "function" ? Number(runnerSettings.getSpeed(currentItem)) : 0;
        currentItem.y += Math.max(0, Number.isFinite(speed) ? speed : 0) * dt;

        const r = rect();
        renderCurrent("frame", r);

        const missed = typeof runnerSettings.isMissed === "function"
          ? runnerSettings.isMissed(currentItem, r)
          : false;
        if (missed) {
          const missedItem = currentItem;
          clear("miss");
          if (typeof runnerSettings.onMiss === "function") {
            runnerSettings.onMiss(missedItem, r);
          }
        }

        if (running && !paused) {
          rafId = requestAnimationFrame(tick);
        } else {
          rafId = null;
        }
      }

      function start(initialItem) {
        running = true;
        paused = false;
        lastTs = 0;
        cancelLoop();
        if (initialItem) {
          setItem(initialItem, "spawn");
        } else {
          spawn();
        }
        rafId = requestAnimationFrame(tick);
        return currentItem;
      }

      function stop(reason) {
        running = false;
        paused = false;
        lastTs = 0;
        cancelLoop();
        clear(reason || "stop");
      }

      function pause() {
        if (!running) {
          return;
        }
        paused = true;
        lastTs = 0;
        cancelLoop();
      }

      function resume() {
        if (!running) {
          return;
        }
        paused = false;
        lastTs = 0;
        cancelLoop();
        rafId = requestAnimationFrame(tick);
      }

      function getItem() {
        return currentItem;
      }

      return {
        start,
        stop,
        pause,
        resume,
        spawn,
        clear,
        setItem,
        getItem,
        renderCurrent,
        isRunning: () => running,
        isPaused: () => paused
      };
    }

    function getUi() {
      return utils.getUi();
    }

    function exitGame() {
      if (window.parent && window.parent !== window) {
        try {
          if (typeof window.parent.__gamesCloseEmbeddedStage === "function") {
            const closed = window.parent.__gamesCloseEmbeddedStage();
            if (closed === true) {
              return;
            }
          }
        } catch (_) {}
        try {
          window.parent.postMessage({ type: "games:exit-embedded" }, "*");
        } catch (_) {}
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = new URL(settings.menuUrl, window.location.href).href;
            return;
          }
        } catch (_) {}
      }
      window.location.href = settings.menuUrl;
    }

    ensureAnswerButtons();
    window.addEventListener("resize", refreshLayout);
    window.addEventListener("orientationchange", refreshLayout);
    window.addEventListener("games:meta-overlay-change", refreshLayout);
    if (window.ResizeObserver && settings.gameEl) {
      const observer = new ResizeObserver((entries) => {
        const shouldRefresh = entries.some((entry) => entry.target !== settings.gameEl);
        if (shouldRefresh) {
          refreshLayout();
        }
        captureRect();
      });
      observer.observe(settings.gameEl);
      if (settings.hudEl) observer.observe(settings.hudEl);
      if (settings.controlsEl) observer.observe(settings.controlsEl);
      if (settings.answersPanelEl) observer.observe(settings.answersPanelEl);
    }
    refreshLayout();

    return {
      applyUi,
      refreshLayout,
      setAnswerLayout,
      getAnswerButtons: ensureAnswerButtons,
      getLayout: () => currentLayout,
      rect,
      waterY,
      fallLane,
      splashContactY,
      responsiveTabletMetrics,
      speedForFallDuration,
      createFallingRunner,
      updateWaterShadow,
      hideWaterShadow,
      updateWaterReflection,
      hideWaterReflection,
      getUi,
      exitGame
    };
  }

  return {
    createFallingShell,
    normalizeDifficultyRewardKey,
    getDifficultyRewardProfile,
    getCompletionBonus,
    buildTabletRewardSettings,
    rollSpecialTablet
  };
})(window.GAMES_V2_UTILS);
