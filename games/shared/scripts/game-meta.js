window.GAMES_V2_META = (function (utils, s, lb, ui) {
  const {
    loadState, saveState,
    getPreferredDiffForGame, setPreferredDiffForGame,
    getDifficultyBounds, autoDifficultyForState,
    getStatusSnapshot, getAdaptiveDifficultyState, setAdaptiveDifficultyState,
    deepClone, syncLegacyProgressFields,
    getForcedDashboardAspectBand, getLanguage, getAvatar,
    isTestModeEnabled, getDashboardLayoutOverride,
    diffLabel, applyHudDifficulty,
    buildTestResultsPreview, defaultPlayerName
  } = s;
  const { applyRoundResult } = lb;
  const { buildDashboardMarkup, buildStartMarkup, buildResultsMarkup, buildSettingsMarkup, buildProfileMarkup } = ui;

  function detectBrowserLanguage() {
    try {
      const langs = (navigator.languages && navigator.languages.length)
        ? Array.from(navigator.languages)
        : [navigator.language || ""];
      for (let i = 0; i < langs.length; i++) {
        const prefix = langs[i].split("-")[0].toLowerCase();
        if (prefix === "he") return "he";
        if (prefix === "en") return "en";
        if (prefix === "ru") return "ru";
      }
    } catch (_) {}
    return "he";
  }

  function createGameMeta(options) {
    const rawOptions = options || {};
    const settings = Object.assign({
      overlayEl: null,
      diffOptions: [],
      defaultLives: 5,
      initialLanguage: detectBrowserLanguage(),
      initialSoundEnabled: true,
      testMode: isTestModeEnabled(),
      onStartRequested: null,
      onExitRequested: null,
      audio: null,
      fx: null,
      gameKey: window.location && window.location.pathname ? window.location.pathname : "game"
    }, rawOptions);
    if (!Object.prototype.hasOwnProperty.call(rawOptions, "initialSoundEnabled") && settings.audio && settings.audio.bgm && typeof settings.audio.bgm.isMuted === "function") {
      settings.initialSoundEnabled = !settings.audio.bgm.isMuted();
    }
    const dashboardLayoutOverride = getDashboardLayoutOverride();
    const overlayEl = settings.overlayEl;
    const diffOptions = (settings.diffOptions || []).map((option) => ({
      key: option.key,
      label: option.label || option.key
    }));
    const difficultyApi = window.GAMES_V2_DIFFICULTY;
    const difficultyDebugOptions = difficultyApi && typeof difficultyApi.parseBrowserDebugOptions === "function"
      ? difficultyApi.parseBrowserDebugOptions(window.location && window.location.search)
      : { overlayMode: false, consoleMode: false };
    const difficultyDebugOverlay = difficultyApi && difficultyDebugOptions.overlayMode && typeof difficultyApi.createDebugOverlay === "function"
      ? difficultyApi.createDebugOverlay({
          title: "Adaptive Difficulty"
        })
      : null;

    let state = loadState({
      defaultLives: settings.defaultLives,
      initialLanguage: settings.initialLanguage,
      initialSoundEnabled: settings.initialSoundEnabled
    });
    let selectedDiff = getPreferredDiffForGame(state, settings.gameKey);
    if (!diffOptions.find((option) => option.key === selectedDiff)) {
      selectedDiff = diffOptions.length ? diffOptions[0].key : "medium";
    }
    let currentScreen = "start";
    let currentStartOptions = {};
    let resultContext = null;
    let resultRowsExpanded = false;
    let animateResultsOnRender = false;
    let continueResolver = null;
    let pendingStart = false;
    let draftProfile = null;
    let resultsPreviewState = null;

    function isSelectedDiffWithinBounds(extra) {
      if (!diffOptions.length) {
        return false;
      }
      const bounds = getDifficultyBounds(state, settings.gameKey, diffOptions);
      const selectedIndex = diffOptions.findIndex((option) => option.key === selectedDiff);
      return selectedIndex >= bounds.minIndex && selectedIndex <= bounds.maxIndex;
    }

    function rerollSelectedDiff(extra) {
      selectedDiff = autoDifficultyForState(diffOptions, state, Object.assign({
        gameKey: settings.gameKey
      }, currentStartOptions, extra || {}));
      return selectedDiff;
    }

    function resolveSelectedDiff(extra) {
      if (!isSelectedDiffWithinBounds(extra)) {
        return rerollSelectedDiff(extra);
      }
      return selectedDiff;
    }

    function persistDifficultyBounds(minKey, maxKey) {
      state.settings.diffBoundsByGame = Object.assign({}, state.settings.diffBoundsByGame, {
        [settings.gameKey]: {
          min: minKey,
          max: maxKey
        }
      });
    }

    function shiftDifficultyBound(boundType, direction) {
      if (!diffOptions.length) {
        return;
      }
      const delta = direction === "down" ? -1 : 1;
      const currentBounds = getDifficultyBounds(state, settings.gameKey, diffOptions);
      let minIndex = currentBounds.minIndex;
      let maxIndex = currentBounds.maxIndex;
      const limitIndex = diffOptions.length - 1;
      function clampIndex(index) {
        return Math.max(0, Math.min(limitIndex, index));
      }
      if (boundType === "min") {
        minIndex = clampIndex(minIndex + delta);
        if (minIndex > maxIndex) {
          maxIndex = minIndex;
        }
      } else {
        maxIndex = clampIndex(maxIndex + delta);
        if (maxIndex < minIndex) {
          minIndex = maxIndex;
        }
      }
      persistDifficultyBounds(diffOptions[minIndex].key, diffOptions[maxIndex].key);
      rerollSelectedDiff();
    }

    function syncAudioSetting() {
      if (!settings.audio || !settings.audio.bgm || typeof settings.audio.bgm.setMuted !== "function") {
        return;
      }
      settings.audio.bgm.setMuted(!state.settings.soundEnabled);
    }

    function persist() {
      setPreferredDiffForGame(state, settings.gameKey, selectedDiff);
      state.settings.preferredDiff = selectedDiff;
      syncLegacyProgressFields(state);
      saveState(state);
    }

    function logAdaptiveDifficultyEvent(event) {
      if (!difficultyApi || typeof difficultyApi.logDebugEvent !== "function") {
        return;
      }
      difficultyApi.logDebugEvent(event, {
        consoleMode: difficultyDebugOptions.consoleMode,
        overlay: difficultyDebugOverlay
      });
    }

    function syncOverlayUiState(isVisible) {
      if (!document || !document.documentElement) {
        return;
      }
      document.documentElement.setAttribute("data-meta-screen", currentScreen || "start");
      document.documentElement.setAttribute("data-meta-overlay", isVisible ? "open" : "closed");
      if (!isVisible || dashboardLayoutOverride !== "portrait") {
        document.documentElement.removeAttribute("data-dashboard-layout");
        document.documentElement.removeAttribute("data-dashboard-aspect-band");
        return;
      }
      document.documentElement.setAttribute("data-dashboard-layout", dashboardLayoutOverride);
      document.documentElement.setAttribute("data-dashboard-aspect-band", getForcedDashboardAspectBand(dashboardLayoutOverride));
    }

    function hideOverlay() {
      if (overlayEl) {
        overlayEl.style.display = "none";
      }
      syncOverlayUiState(false);
      if (window && typeof window.dispatchEvent === "function" && typeof window.CustomEvent === "function") {
        window.dispatchEvent(new window.CustomEvent("games:meta-overlay-change", {
          detail: { open: false }
        }));
      }
    }

    function showOverlay() {
      if (overlayEl) {
        overlayEl.style.display = "grid";
      }
      syncOverlayUiState(true);
      if (window && typeof window.dispatchEvent === "function" && typeof window.CustomEvent === "function") {
        window.dispatchEvent(new window.CustomEvent("games:meta-overlay-change", {
          detail: { open: true }
        }));
      }
    }

    function syncDocumentLanguage() {
      if (!document || !document.documentElement) {
        return;
      }
      document.documentElement.setAttribute("lang", state.player.language);
      document.documentElement.setAttribute("dir", getLanguage(state.player.language).dir);
      document.documentElement.setAttribute("data-game-meta-lang", state.player.language);
    }

    function animateResults() {
      const listEl = overlayEl.querySelector(".metaLeaderboardList");
      if (!listEl || !resultContext) {
        return;
      }
      const rows = Array.from(listEl.querySelectorAll(".metaLeaderboardRow"));
      if (!rows.length) {
        return;
      }
      const beforeRankById = {};
      resultContext.beforeRanks.forEach((participant) => {
        beforeRankById[participant.id] = participant.rank;
      });
      const rowGap = 10;
      const rowHeight = rows[0].getBoundingClientRect().height + rowGap;
      rows.forEach((row) => {
        const id = row.getAttribute("data-participant-id");
        const afterRank = Number(row.getAttribute("data-after-rank")) || 1;
        const beforeRank = beforeRankById[id] || afterRank;
        const shift = (beforeRank - afterRank) * rowHeight;
        if (!shift) {
          return;
        }
        row.style.transform = "translateY(" + shift + "px)";
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          rows.forEach((row) => {
            row.classList.add("is-animating");
            row.style.transform = "translateY(0)";
          });
        });
      });

      const reachedFirstPlace = (beforeRankById.me || state.player.currentRank) !== 1 && state.player.currentRank === 1;
      if (reachedFirstPlace) {
        const cardEl = overlayEl.querySelector(".metaCard--results");
        if (settings.audio && settings.audio.sfx && typeof settings.audio.sfx.victory === "function") {
          settings.audio.sfx.victory();
        }
        if (settings.fx && typeof settings.fx.playVictoryCelebration === "function") {
          settings.fx.playVictoryCelebration(cardEl || overlayEl);
        }
      }
    }

    function ensureCurrentPlayerRowVisible() {
      const listEl = overlayEl.querySelector(".metaLeaderboardList");
      if (!listEl || typeof listEl.querySelector !== "function") {
        return;
      }
      const currentRow = listEl.querySelector(".metaLeaderboardRow.is-current");
      if (!currentRow || !currentRow.getBoundingClientRect || !listEl.getBoundingClientRect) {
        return;
      }
      const listRect = listEl.getBoundingClientRect();
      const rowRect = currentRow.getBoundingClientRect();
      if (rowRect.top >= listRect.top && rowRect.bottom <= listRect.bottom) {
        return;
      }
      listEl.scrollTop = Math.max(
        0,
        currentRow.offsetTop - Math.max(0, Math.round((listEl.clientHeight - currentRow.offsetHeight) / 2))
      );
    }

    function render() {
      if (!overlayEl) {
        return;
      }
      syncDocumentLanguage();
      selectedDiff = resolveSelectedDiff(currentStartOptions);
      if (currentScreen === "profile") {
        overlayEl.innerHTML = buildProfileMarkup(state, draftProfile);
        showOverlay();
        return;
      }
      if (currentScreen === "settings") {
        overlayEl.innerHTML = buildSettingsMarkup(state, settings.gameKey, diffOptions);
        showOverlay();
        return;
      }
      if (currentScreen === "results" && resultContext) {
        overlayEl.innerHTML = buildResultsMarkup(resultContext, resultsPreviewState || state, selectedDiff, settings.gameKey, resultRowsExpanded);
        showOverlay();
        requestAnimationFrame(ensureCurrentPlayerRowVisible);
        if (animateResultsOnRender) {
          animateResultsOnRender = false;
          animateResults();
        }
        return;
      }
      overlayEl.innerHTML = buildStartMarkup(state, selectedDiff, Object.assign({
        gameKey: settings.gameKey,
        testMode: settings.testMode
      }, currentStartOptions));
      showOverlay();
    }

    async function handleStartRequest() {
      if (pendingStart || typeof settings.onStartRequested !== "function") {
        return;
      }
      pendingStart = true;
      const startButton = overlayEl.querySelector("[data-action=\"start-level\"]");
      let shouldHide = false;
      if (startButton) {
        startButton.disabled = true;
      }
      try {
        selectedDiff = resolveSelectedDiff(currentStartOptions);
        persist();
        const result = await settings.onStartRequested({
          diffKey: selectedDiff,
          nextLevel: getStatusSnapshot(state, settings.gameKey).nextLevel,
          snapshot: getStatusSnapshot(state, settings.gameKey)
        });
        shouldHide = result !== false;
      } finally {
        pendingStart = false;
        if (shouldHide) {
          hideOverlay();
        } else {
          render();
        }
      }
    }

    function showStart(extra) {
      currentScreen = "start";
      currentStartOptions = Object.assign({}, extra || {});
      resultContext = null;
      resultsPreviewState = null;
      resultRowsExpanded = false;
      animateResultsOnRender = false;
      continueResolver = null;
      draftProfile = null;
      render();
    }

    function showResults(context) {
      const playedDifficulty = context && context.diffKey ? context.diffKey : selectedDiff;
      const previousAdaptiveState = getAdaptiveDifficultyState(state, settings.gameKey, diffOptions);
      const round = applyRoundResult(state, {
        gameKey: settings.gameKey,
        completedLevel: context.completedLevel,
        diffKey: playedDifficulty,
        playerCoins: context.coins,
        metrics: context && context.metrics ? deepClone(context.metrics) : null
      });
      state = round.state;
      if (difficultyApi && typeof difficultyApi.completeLevel === "function" && diffOptions.length) {
        const bounds = getDifficultyBounds(state, settings.gameKey, diffOptions);
        const adaptiveOutcome = difficultyApi.completeLevel({
          difficultyOrder: diffOptions.map((option) => option.key),
          minDifficulty: bounds.minKey,
          maxDifficulty: bounds.maxKey
        }, previousAdaptiveState, {
          passed: context && context.metrics ? context.metrics.passed : false,
          avgAnswerMs: context && context.metrics ? context.metrics.avgAnswerMs : 0,
          wrongClicks: context && context.metrics ? context.metrics.wrongClicks : 0,
          correctCount: context && context.metrics ? context.metrics.correct : 0,
          questionTimeLimitMs: context && context.metrics ? context.metrics.questionTimeLimitMs : 12000
        });
        setAdaptiveDifficultyState(state, settings.gameKey, adaptiveOutcome.state);
        selectedDiff = adaptiveOutcome.nextDifficulty;
        if (typeof difficultyApi.buildLevelDebugEvent === "function") {
          logAdaptiveDifficultyEvent(difficultyApi.buildLevelDebugEvent({
            gameKey: settings.gameKey,
            completedLevel: context && context.completedLevel,
            playedDifficulty,
            nextDifficulty: adaptiveOutcome.nextDifficulty,
            bounds,
            beforeState: adaptiveOutcome.beforeState,
            afterState: adaptiveOutcome.state,
            classification: adaptiveOutcome.classification
          }));
        }
      } else {
        selectedDiff = rerollSelectedDiff();
      }
      persist();
      currentScreen = "results";
      currentStartOptions = {};
      resultsPreviewState = null;
      resultRowsExpanded = false;
      animateResultsOnRender = true;
      resultContext = {
        beforeRanks: round.beforeRanks,
        afterRanks: round.afterRanks,
        message: round.message,
        metrics: context && context.metrics ? Object.assign({}, deepClone(context.metrics), {
          coinsEarned: Math.max(0, Number(context.metrics.coinsEarned) || 0) + Math.max(0, Number(round.playerBonus) || 0)
        }) : null
      };
      render();
      return new Promise((resolve) => {
        continueResolver = resolve;
      });
    }

    overlayEl.addEventListener("click", (event) => {
      const actionEl = event.target.closest("[data-action]");
      if (!actionEl) {
        return;
      }
      const action = actionEl.getAttribute("data-action");
      if (action === "open-profile") {
        draftProfile = {
          name: state.player.name,
          avatar: state.player.avatar
        };
        currentScreen = "profile";
        render();
        return;
      }
      if (action === "close-profile") {
        draftProfile = null;
        currentScreen = "start";
        render();
        return;
      }
      if (action === "save-profile") {
        const nextName = String((draftProfile && draftProfile.name) || "").replace(/\s+/g, " ").trim() || defaultPlayerName(state.player.language);
        const nextAvatar = draftProfile && draftProfile.avatar ? draftProfile.avatar : state.player.avatar;
        state.player.name = nextName;
        state.player.avatar = nextAvatar;
        state.participants = state.participants.map((participant) => {
          if (participant.id !== "me") {
            return participant;
          }
          return Object.assign({}, participant, {
            name: nextName,
            avatar: nextAvatar
          });
        });
        draftProfile = null;
        persist();
        currentScreen = "start";
        render();
        return;
      }
      if (action === "preview-results" && settings.testMode) {
        const preview = buildTestResultsPreview(state, settings.gameKey);
        currentScreen = "results";
        currentStartOptions = {};
        resultRowsExpanded = false;
        animateResultsOnRender = false;
        continueResolver = null;
        draftProfile = null;
        resultsPreviewState = preview.state;
        resultContext = preview.resultContext;
        render();
        return;
      }
      if (action === "open-settings") {
        currentScreen = "settings";
        render();
        return;
      }
      if (action === "exit-game") {
        if (typeof settings.onExitRequested === "function") {
          settings.onExitRequested();
          return;
        }
        if (window.history.length > 1) {
          window.history.back();
          return;
        }
        window.location.href = "../index.html";
        return;
      }
      if (action === "close-settings") {
        currentScreen = "start";
        render();
        return;
      }
      if (action === "pick-language") {
        state.player.language = getLanguage(actionEl.getAttribute("data-language")).id;
        persist();
        render();
        return;
      }
      if (action === "shift-diff-bound") {
        shiftDifficultyBound(actionEl.getAttribute("data-bound"), actionEl.getAttribute("data-dir"));
        selectedDiff = resolveSelectedDiff();
        persist();
        render();
        return;
      }
      if (action === "toggle-results-rows") {
        resultRowsExpanded = !resultRowsExpanded;
        render();
        return;
      }
      if (action === "pick-profile-avatar") {
        if (!draftProfile) {
          draftProfile = {
            name: state.player.name,
            avatar: state.player.avatar
          };
        }
        draftProfile.avatar = getAvatar(actionEl.getAttribute("data-avatar")).id;
        render();
        return;
      }
      if (action === "pick-sound") {
        const soundAction = actionEl.getAttribute("data-sound");
        state.settings.soundEnabled = soundAction === "toggle" ? !state.settings.soundEnabled : soundAction !== "off";
        syncAudioSetting();
        persist();
        render();
        return;
      }
      if (action === "start-level") {
        handleStartRequest();
        return;
      }
      if (action === "continue-level") {
        if (resultContext && resultContext.previewOnly && typeof continueResolver !== "function") {
          showStart();
          return;
        }
        const resolver = continueResolver;
        continueResolver = null;
        hideOverlay();
        if (typeof resolver === "function") {
          resolver(getStatusSnapshot(state, settings.gameKey));
        }
      }
    });
    overlayEl.addEventListener("input", (event) => {
      const inputEl = event.target.closest("[data-role=\"player-name\"]");
      if (!inputEl || currentScreen !== "profile") {
        return;
      }
      if (!draftProfile) {
        draftProfile = {
          name: state.player.name,
          avatar: state.player.avatar
        };
      }
      draftProfile.name = String(inputEl.value || "").slice(0, 18);
    });

    if (window && typeof window.addEventListener === "function") {
      const syncDashboardLayoutOverrideState = () => {
        const isVisible = document && document.documentElement
          ? document.documentElement.getAttribute("data-meta-overlay") === "open"
          : false;
        syncOverlayUiState(isVisible);
      };
      window.addEventListener("resize", syncDashboardLayoutOverrideState);
      window.addEventListener("orientationchange", syncDashboardLayoutOverrideState);
    }

    if (diffOptions.length) {
      const currentBounds = getDifficultyBounds(state, settings.gameKey, diffOptions);
      persistDifficultyBounds(currentBounds.minKey, currentBounds.maxKey);
      rerollSelectedDiff();
    }
    syncAudioSetting();
    if (settings.audio && typeof settings.audio.onMuteChange === "function") {
      settings.audio.onMuteChange((muted) => {
        const nextSoundEnabled = !muted;
        if (state.settings.soundEnabled === nextSoundEnabled) {
          return;
        }
        state.settings.soundEnabled = nextSoundEnabled;
        persist();
        if (currentScreen === "settings") {
          render();
        }
      });
    }
    render();

    return {
      showStart,
      showResults,
      getSnapshot() {
        return getStatusSnapshot(state, settings.gameKey);
      },
      getSelectedDiff() {
        return resolveSelectedDiff(currentStartOptions);
      },
      setSelectedDiff(diffKey) {
        if (diffOptions.find((option) => option.key === diffKey)) {
          selectedDiff = diffKey;
          persist();
          render();
        }
      },
      hideOverlay,
      refresh: render
    };
  }

  return {
    createGameMeta,
    simulateCompetitorProgress: lb.simulateCompetitorProgress,
    diffLabel: s.diffLabel,
    applyHudDifficulty: s.applyHudDifficulty
  };
})(window.GAMES_V2_UTILS, window.GAMES_V2_META_STATE, window.GAMES_V2_META_LEADERBOARD, window.GAMES_V2_META_UI);
