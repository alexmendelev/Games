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

    function rect() {
      return settings.gameEl.getBoundingClientRect();
    }

    function waterY(r) {
      return r.height * settings.waterYRatio;
    }

    function getUi() {
      return utils.getUi();
    }

    function exitGame() {
      window.location.href = settings.menuUrl;
    }

    window.addEventListener("resize", applyUi);
    window.addEventListener("orientationchange", applyUi);
    applyUi();

    return {
      applyUi,
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
