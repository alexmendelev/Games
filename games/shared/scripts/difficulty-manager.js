(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.GAMES_V2_DIFFICULTY = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_QUESTION_TIME_LIMIT_MS = 12000;
  const SIMULATION_PROFILES = {
    strong: {
      passChanceByIndex: [0.98, 0.94, 0.86, 0.72, 0.58],
      avgTimeRatioByIndex: [0.23, 0.31, 0.4, 0.53, 0.66],
      misclicksPerCorrectByIndex: [0.04, 0.08, 0.15, 0.24, 0.34]
    },
    average: {
      passChanceByIndex: [0.9, 0.76, 0.59, 0.41, 0.29],
      avgTimeRatioByIndex: [0.35, 0.47, 0.61, 0.76, 0.9],
      misclicksPerCorrectByIndex: [0.14, 0.28, 0.46, 0.72, 0.94]
    },
    struggling: {
      passChanceByIndex: [0.7, 0.5, 0.31, 0.18, 0.08],
      avgTimeRatioByIndex: [0.56, 0.7, 0.83, 0.96, 1.05],
      misclicksPerCorrectByIndex: [0.42, 0.68, 0.96, 1.18, 1.34]
    }
  };

  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function toFiniteNumber(value, fallback) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
  }

  function normalizeDifficultyOrder(difficultyOrder) {
    const unique = [];
    (Array.isArray(difficultyOrder) ? difficultyOrder : []).forEach((item) => {
      const key = String(item || "").trim();
      if (key && !unique.includes(key)) {
        unique.push(key);
      }
    });
    return unique;
  }

  function indexForDifficulty(difficultyOrder, difficultyKey, fallbackIndex) {
    const safeOrder = normalizeDifficultyOrder(difficultyOrder);
    if (!safeOrder.length) {
      return 0;
    }
    const index = safeOrder.indexOf(String(difficultyKey || "").trim());
    if (index >= 0) {
      return index;
    }
    return clampNumber(Math.round(toFiniteNumber(fallbackIndex, 0)), 0, safeOrder.length - 1);
  }

  function clampDifficultyKey(difficultyOrder, difficultyKey, minDifficulty, maxDifficulty, fallbackKey) {
    const safeOrder = normalizeDifficultyOrder(difficultyOrder);
    if (!safeOrder.length) {
      return String(fallbackKey || difficultyKey || "medium");
    }
    const minIndex = indexForDifficulty(safeOrder, minDifficulty, 0);
    const maxIndex = Math.max(minIndex, indexForDifficulty(safeOrder, maxDifficulty, safeOrder.length - 1));
    const preferredIndex = indexForDifficulty(safeOrder, difficultyKey, minIndex);
    return safeOrder[clampNumber(preferredIndex, minIndex, maxIndex)] || safeOrder[minIndex];
  }

  function normalizeState(state, config) {
    const safeConfig = config || {};
    const difficultyOrder = normalizeDifficultyOrder(safeConfig.difficultyOrder);
    const fallbackDifficulty = difficultyOrder[0] || "medium";
    const minDifficulty = clampDifficultyKey(
      difficultyOrder,
      safeConfig.minDifficulty || fallbackDifficulty,
      difficultyOrder[0],
      difficultyOrder[difficultyOrder.length - 1] || fallbackDifficulty,
      fallbackDifficulty
    );
    const maxDifficulty = clampDifficultyKey(
      difficultyOrder,
      safeConfig.maxDifficulty || difficultyOrder[difficultyOrder.length - 1] || minDifficulty,
      minDifficulty,
      difficultyOrder[difficultyOrder.length - 1] || minDifficulty,
      minDifficulty
    );
    const currentDifficulty = clampDifficultyKey(
      difficultyOrder,
      state && state.currentDifficulty,
      minDifficulty,
      maxDifficulty,
      minDifficulty
    );
    const pendingRecoveryLevel = state && state.pendingRecoveryLevel != null
      ? clampDifficultyKey(difficultyOrder, state.pendingRecoveryLevel, minDifficulty, maxDifficulty, minDifficulty)
      : null;

    return {
      currentDifficulty,
      comfortableStreak: Math.max(0, Math.floor(toFiniteNumber(state && state.comfortableStreak, 0))),
      strugglingStreak: Math.max(0, Math.floor(toFiniteNumber(state && state.strugglingStreak, 0))),
      pendingRecoveryLevel
    };
  }

  function cloneState(state) {
    return {
      currentDifficulty: state.currentDifficulty,
      comfortableStreak: state.comfortableStreak,
      strugglingStreak: state.strugglingStreak,
      pendingRecoveryLevel: state.pendingRecoveryLevel
    };
  }

  function getEffectiveDifficulty(config, state) {
    const normalizedState = normalizeState(state, config);
    return normalizedState.pendingRecoveryLevel == null
      ? normalizedState.currentDifficulty
      : normalizedState.pendingRecoveryLevel;
  }

  function stepDifficulty(config, fromDifficulty, direction) {
    const difficultyOrder = normalizeDifficultyOrder(config && config.difficultyOrder);
    if (!difficultyOrder.length) {
      return String(fromDifficulty || "medium");
    }
    const normalizedState = normalizeState({ currentDifficulty: fromDifficulty }, config);
    const minIndex = indexForDifficulty(difficultyOrder, config && config.minDifficulty, 0);
    const maxIndex = Math.max(minIndex, indexForDifficulty(difficultyOrder, config && config.maxDifficulty, difficultyOrder.length - 1));
    const currentIndex = indexForDifficulty(difficultyOrder, normalizedState.currentDifficulty, minIndex);
    const delta = direction === "down" ? -1 : 1;
    const nextIndex = clampNumber(currentIndex + delta, minIndex, maxIndex);
    return difficultyOrder[nextIndex] || normalizedState.currentDifficulty;
  }

  function classifyLevelResult(result) {
    const safeResult = result || {};
    const passed = !!safeResult.passed;
    const questionTimeLimitMs = Math.max(1, toFiniteNumber(safeResult.questionTimeLimitMs, DEFAULT_QUESTION_TIME_LIMIT_MS));
    const avgAnswerMs = Math.max(0, toFiniteNumber(safeResult.avgAnswerMs, 0));
    const wrongClicks = Math.max(0, Math.round(toFiniteNumber(safeResult.wrongClicks, 0)));
    const correctCount = Math.max(0, Math.round(toFiniteNumber(safeResult.correctCount, 0)));
    const avgTimeRatio = avgAnswerMs / questionTimeLimitMs;
    const misclicksPerCorrect = wrongClicks / Math.max(correctCount, 1);

    // "comfortable": passed, answered within 45% of the time limit, and ≤0.25 wrong clicks per correct answer
    // "struggling":  failed the level, OR used ≥75% of time per question, OR ≥0.75 wrong clicks per correct answer
    // anything else is "balanced" (no difficulty change)
    let label = "balanced";
    if (passed && avgTimeRatio <= 0.45 && misclicksPerCorrect <= 0.25) {
      label = "comfortable";
    } else if (!passed || avgTimeRatio >= 0.75 || misclicksPerCorrect >= 0.75) {
      label = "struggling";
    }

    return {
      label,
      passed,
      avgAnswerMs,
      wrongClicks,
      correctCount,
      questionTimeLimitMs,
      avgTimeRatio,
      misclicksPerCorrect
    };
  }

  function completeLevel(config, state, result) {
    const normalizedState = normalizeState(state, config);
    const beforeState = cloneState(normalizedState);
    const classification = classifyLevelResult(result);
    const nextState = cloneState(normalizedState);
    const recoveryWasActive = nextState.pendingRecoveryLevel != null;
    nextState.pendingRecoveryLevel = null;

    if (classification.label === "comfortable") {
      nextState.comfortableStreak += 1;
      nextState.strugglingStreak = 0;
      if (nextState.comfortableStreak >= 2) {
        nextState.currentDifficulty = stepDifficulty(config, nextState.currentDifficulty, "up");
        nextState.comfortableStreak = 0;
      }
    } else if (classification.label === "balanced") {
      nextState.comfortableStreak = 0;
      nextState.strugglingStreak = 0;
    } else {
      nextState.strugglingStreak += 1;
      nextState.comfortableStreak = 0;
      if (nextState.strugglingStreak === 1) {
        nextState.pendingRecoveryLevel = stepDifficulty(config, nextState.currentDifficulty, "down");
      } else if (nextState.strugglingStreak >= 2) {
        nextState.currentDifficulty = stepDifficulty(config, nextState.currentDifficulty, "down");
        nextState.strugglingStreak = 0;
        nextState.pendingRecoveryLevel = null;
      }
    }

    const normalizedNextState = normalizeState(nextState, config);
    return {
      beforeState,
      state: normalizedNextState,
      classification,
      nextDifficulty: getEffectiveDifficulty(config, normalizedNextState),
      recoveryWasActive
    };
  }

  function createManager(config, initialState) {
    const safeConfig = config || {};
    let currentState = normalizeState(initialState, safeConfig);

    return {
      getState() {
        return cloneState(currentState);
      },
      getNextDifficulty() {
        return getEffectiveDifficulty(safeConfig, currentState);
      },
      classifyLevelResult,
      completeLevel(result) {
        const outcome = completeLevel(safeConfig, currentState, result);
        currentState = outcome.state;
        return outcome;
      },
      reset(nextState) {
        currentState = normalizeState(nextState, safeConfig);
        return this.getState();
      }
    };
  }

  function createSeededRandom(seed) {
    let state = (Math.floor(toFiniteNumber(seed, 1)) || 1) >>> 0;
    return function nextRandom() {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function readSeriesValue(series, index) {
    const safeSeries = Array.isArray(series) && series.length ? series : [0];
    return safeSeries[Math.min(index, safeSeries.length - 1)];
  }

  function randomBetween(rng, min, max) {
    return min + ((max - min) * rng());
  }

  function resolveSimulationProfile(profile) {
    if (profile && typeof profile === "object" && !Array.isArray(profile)) {
      return profile;
    }
    return SIMULATION_PROFILES[String(profile || "average")] || SIMULATION_PROFILES.average;
  }

  function simulateLevelResult(options) {
    const safeOptions = options || {};
    const difficultyOrder = normalizeDifficultyOrder(safeOptions.difficultyOrder);
    const rng = typeof safeOptions.rng === "function" ? safeOptions.rng : Math.random;
    const questionTimeLimitMs = Math.max(1, toFiniteNumber(safeOptions.questionTimeLimitMs, DEFAULT_QUESTION_TIME_LIMIT_MS));
    const profile = resolveSimulationProfile(safeOptions.profile);
    const difficultyIndex = indexForDifficulty(difficultyOrder, safeOptions.difficulty, 0);
    const passChance = clampNumber(readSeriesValue(profile.passChanceByIndex, difficultyIndex) + randomBetween(rng, -0.06, 0.06), 0.02, 0.99);
    const passed = rng() <= passChance;
    const correctCount = passed
      ? Math.max(4, Math.round(randomBetween(rng, 8, 14)))
      : Math.max(0, Math.round(randomBetween(rng, 1, 7)));
    const avgTimeRatio = clampNumber(readSeriesValue(profile.avgTimeRatioByIndex, difficultyIndex) + randomBetween(rng, -0.08, 0.08), 0.12, 1.15);
    const misclicksPerCorrect = clampNumber(readSeriesValue(profile.misclicksPerCorrectByIndex, difficultyIndex) + randomBetween(rng, -0.12, 0.12), 0, 1.5);

    return {
      passed,
      avgAnswerMs: Math.round(avgTimeRatio * questionTimeLimitMs),
      wrongClicks: Math.max(0, Math.round(misclicksPerCorrect * Math.max(correctCount, 1))),
      correctCount,
      questionTimeLimitMs
    };
  }

  function runSimulation(options) {
    const safeOptions = options || {};
    const difficultyOrder = normalizeDifficultyOrder(safeOptions.difficultyOrder || ["easy", "medium", "hard", "super"]);
    const minDifficulty = clampDifficultyKey(
      difficultyOrder,
      safeOptions.minDifficulty || difficultyOrder[0],
      difficultyOrder[0],
      difficultyOrder[difficultyOrder.length - 1] || difficultyOrder[0],
      difficultyOrder[0]
    );
    const maxDifficulty = clampDifficultyKey(
      difficultyOrder,
      safeOptions.maxDifficulty || difficultyOrder[difficultyOrder.length - 1] || minDifficulty,
      minDifficulty,
      difficultyOrder[difficultyOrder.length - 1] || minDifficulty,
      minDifficulty
    );
    const questionTimeLimitMs = Math.max(1, toFiniteNumber(safeOptions.questionTimeLimitMs, DEFAULT_QUESTION_TIME_LIMIT_MS));
    const profileName = String(safeOptions.profileName || safeOptions.profile || "average");
    const seed = Math.floor(toFiniteNumber(safeOptions.seed, 1));
    const levelCount = Math.max(1, Math.floor(toFiniteNumber(safeOptions.levels, 24)));
    const rng = createSeededRandom(seed);
    const managerConfig = {
      difficultyOrder,
      minDifficulty,
      maxDifficulty
    };
    const initialDifficulty = clampDifficultyKey(
      difficultyOrder,
      safeOptions.initialDifficulty || minDifficulty,
      minDifficulty,
      maxDifficulty,
      minDifficulty
    );
    const manager = createManager(managerConfig, {
      currentDifficulty: initialDifficulty,
      comfortableStreak: 0,
      strugglingStreak: 0,
      pendingRecoveryLevel: null
    });
    const entries = [];
    const classificationCounts = {
      comfortable: 0,
      balanced: 0,
      struggling: 0
    };

    for (let levelNumber = 1; levelNumber <= levelCount; levelNumber += 1) {
      const playedDifficulty = manager.getNextDifficulty();
      const result = simulateLevelResult({
        profile: profileName,
        difficulty: playedDifficulty,
        difficultyOrder,
        questionTimeLimitMs,
        rng
      });
      const outcome = manager.completeLevel(result);
      classificationCounts[outcome.classification.label] += 1;
      entries.push({
        levelNumber,
        playedDifficulty,
        classification: outcome.classification.label,
        nextDifficulty: outcome.nextDifficulty,
        state: cloneState(outcome.state),
        metrics: outcome.classification
      });
    }

    return {
      profileName,
      seed,
      levels: levelCount,
      questionTimeLimitMs,
      bounds: {
        minDifficulty,
        maxDifficulty
      },
      difficultyOrder: difficultyOrder.slice(),
      classificationCounts,
      finalState: cloneState(manager.getState()),
      entries
    };
  }

  function parseBrowserDebugOptions(search) {
    try {
      const params = new URLSearchParams(String(search || ""));
      const value = String(params.get("difficultyDebug") || "").trim().toLowerCase();
      return {
        overlayMode: value === "1" || value === "true" || value === "overlay" || value === "all",
        consoleMode: value === "console" || value === "all"
      };
    } catch (_) {
      return {
        overlayMode: false,
        consoleMode: false
      };
    }
  }

  function createDebugOverlay(options) {
    if (typeof document === "undefined" || !document.body) {
      return null;
    }
    const settings = Object.assign({
      title: "Difficulty Debug"
    }, options || {});
    const rootEl = document.createElement("section");
    rootEl.className = "difficultyDebugOverlay";
    rootEl.setAttribute("aria-live", "polite");
    rootEl.style.position = "fixed";
    rootEl.style.left = "12px";
    rootEl.style.bottom = "12px";
    rootEl.style.zIndex = "9999";
    rootEl.style.width = "min(420px, calc(100vw - 24px))";
    rootEl.style.maxHeight = "45vh";
    rootEl.style.overflow = "auto";
    rootEl.style.padding = "10px 12px";
    rootEl.style.borderRadius = "12px";
    rootEl.style.background = "rgba(15, 23, 42, 0.92)";
    rootEl.style.color = "#e2e8f0";
    rootEl.style.boxShadow = "0 10px 30px rgba(15, 23, 42, 0.35)";
    rootEl.style.font = "12px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace";

    const titleEl = document.createElement("div");
    titleEl.textContent = settings.title;
    titleEl.style.fontWeight = "700";
    titleEl.style.marginBottom = "8px";
    rootEl.appendChild(titleEl);

    const preEl = document.createElement("pre");
    preEl.style.margin = "0";
    preEl.style.whiteSpace = "pre-wrap";
    preEl.style.wordBreak = "break-word";
    rootEl.appendChild(preEl);

    document.body.appendChild(rootEl);

    return {
      update(payload) {
        preEl.textContent = JSON.stringify(payload, null, 2);
      },
      remove() {
        if (rootEl.parentNode) {
          rootEl.parentNode.removeChild(rootEl);
        }
      }
    };
  }

  function buildLevelDebugEvent(options) {
    const safeOptions = options || {};
    return {
      type: "adaptive-difficulty.v1",
      timestamp: new Date().toISOString(),
      gameKey: String(safeOptions.gameKey || ""),
      completedLevel: Math.max(1, Math.floor(toFiniteNumber(safeOptions.completedLevel, 1))),
      playedDifficulty: String(safeOptions.playedDifficulty || ""),
      nextDifficulty: String(safeOptions.nextDifficulty || ""),
      bounds: Object.assign({}, safeOptions.bounds || {}),
      before: Object.assign({
        effectiveDifficulty: safeOptions.beforeState && safeOptions.beforeState.pendingRecoveryLevel != null
          ? safeOptions.beforeState.pendingRecoveryLevel
          : safeOptions.beforeState && safeOptions.beforeState.currentDifficulty
      }, safeOptions.beforeState || {}),
      after: Object.assign({
        effectiveDifficulty: safeOptions.afterState && safeOptions.afterState.pendingRecoveryLevel != null
          ? safeOptions.afterState.pendingRecoveryLevel
          : safeOptions.afterState && safeOptions.afterState.currentDifficulty
      }, safeOptions.afterState || {}),
      classification: Object.assign({}, safeOptions.classification || {})
    };
  }

  function logDebugEvent(event, options) {
    const json = JSON.stringify(event);
    if (typeof console !== "undefined" && console && typeof console.log === "function") {
      console.log(json);
      if (options && options.consoleMode && typeof console.info === "function") {
        console.info("[difficulty]", event);
      }
    }
    if (options && options.overlay && typeof options.overlay.update === "function") {
      options.overlay.update(event);
    }
    return json;
  }

  return {
    DEFAULT_QUESTION_TIME_LIMIT_MS,
    SIMULATION_PROFILES,
    normalizeState,
    classifyLevelResult,
    getNextDifficulty: getEffectiveDifficulty,
    completeLevel,
    createManager,
    createSeededRandom,
    simulateLevelResult,
    runSimulation,
    parseBrowserDebugOptions,
    createDebugOverlay,
    buildLevelDebugEvent,
    logDebugEvent
  };
});
