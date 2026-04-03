window.GAMES_V2_SHELL = (function (utils) {
  function createFallingShell(options) {
    const settings = Object.assign({
      gameEl: null,
      menuUrl: "../index.html",
      waterYRatio: 0.8,
      uiBaseWidth: 900,
      uiBaseHeight: 650,
      uiPortraitMul: 0.92,
      uiMin: 0.58,
      uiMax: 1
    }, options || {});

    let cachedRect = null;
    let cachedWaterY = 0;
    let waterShadowEl = null;
    let waterReflectionEl = null;
    let reflectionMarkup = "";
    let reflectionClassName = "";

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

    function refreshLayout() {
      applyUi();
      captureRect();
      window.requestAnimationFrame(captureRect);
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
      const rockWidth = Math.min(360 * ui, r.width * 0.54);
      // Keep tablets away from the mascot/rock cluster without forcing them too far right.
      const leftSafeBand = Math.min(rockWidth * 0.58, r.width * 0.34);
      const leftClear = Math.max(margin, Math.round(leftSafeBand + Math.max(12, 20 * ui)));
      const rightClear = Math.max(margin, Math.round(24 * ui));
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

    window.addEventListener("resize", refreshLayout);
    window.addEventListener("orientationchange", refreshLayout);
    if (window.ResizeObserver && settings.gameEl) {
      const observer = new ResizeObserver(() => {
        captureRect();
      });
      observer.observe(settings.gameEl);
    }
    refreshLayout();

    return {
      applyUi,
      refreshLayout,
      rect,
      waterY,
      fallLane,
      splashContactY,
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
    createFallingShell
  };
})(window.GAMES_V2_UTILS);
