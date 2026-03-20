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

    function rect() {
      return cachedRect || captureRect();
    }

    function waterY(r) {
      if (r && typeof r.height === "number") {
        return r.height * settings.waterYRatio;
      }
      return cachedWaterY;
    }

    function getUi() {
      return utils.getUi();
    }

    function exitGame() {
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
      getUi,
      exitGame
    };
  }

  return {
    createFallingShell
  };
})(window.GAMES_V2_UTILS);
