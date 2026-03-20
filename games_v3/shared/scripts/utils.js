window.GAMES_V2_UTILS = (function () {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randFloat(min, max) {
    return Math.random() * (max - min) + min;
  }

  function choice(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function shuffleInPlace(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function getUi() {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ui")) || 1;
  }

  function formatSignedNumber(value) {
    return value < 0 ? "\u200E\u2212" + Math.abs(value) : "\u200E" + value;
  }

  return {
    clamp,
    randInt,
    randFloat,
    choice,
    shuffleInPlace,
    getUi,
    formatSignedNumber
  };
})();
