(function () {
  const cfg = window.GAME_V2_CONFIG || {};

  const titleEl = document.getElementById("gameTitle");
  const summaryEl = document.getElementById("gameSummary");
  const legacyLinkEl = document.getElementById("legacyLink");
  const statusEl = document.getElementById("gameStatus");
  const idEl = document.getElementById("metaId");
  const stateEl = document.getElementById("metaState");
  const targetEl = document.getElementById("metaTarget");

  document.title = cfg.title ? cfg.title + " - Games" : "Games";

  titleEl.textContent = cfg.title || "Game";
  summaryEl.textContent = cfg.summary || "Migration scaffold page.";
  statusEl.textContent = cfg.status || "Scaffold only";
  idEl.textContent = cfg.id || "unknown";
  stateEl.textContent = cfg.migrated ? "migrated" : "legacy gameplay";
  targetEl.textContent = cfg.target || "shared shell + game module";

  if (cfg.legacyUrl) {
    legacyLinkEl.href = cfg.legacyUrl;
  } else {
    legacyLinkEl.removeAttribute("href");
    legacyLinkEl.setAttribute("aria-disabled", "true");
  }
})();