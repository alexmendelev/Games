(function (root, factory) {
  const api = factory(
    typeof performance !== "undefined" ? performance : { now: () => Date.now() }
  );
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.GAMES_V2_SESSION = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (perf) {
  function createPauseableTimer(onFire) {
    let handle = null;
    let remainingMs = null;
    let startedAt = 0;

    function clearHandle() {
      if (handle !== null) {
        clearTimeout(handle);
        handle = null;
      }
    }

    function fire() {
      clearHandle();
      remainingMs = 0;
      if (typeof onFire === "function") {
        onFire();
      }
    }

    function start(durationMs) {
      clear();
      if (!Number.isFinite(durationMs) || durationMs <= 0) {
        fire();
        return;
      }
      remainingMs = durationMs;
      resume();
    }

    function pause() {
      if (handle === null || !Number.isFinite(remainingMs)) {
        return;
      }
      remainingMs = Math.max(0, remainingMs - (perf.now() - startedAt));
      clearHandle();
    }

    function resume() {
      if (!Number.isFinite(remainingMs) || remainingMs <= 0 || handle !== null) {
        return;
      }
      startedAt = perf.now();
      handle = setTimeout(fire, remainingMs);
    }

    function clear() {
      clearHandle();
      remainingMs = null;
    }

    function getRemainingMs() {
      if (!Number.isFinite(remainingMs)) {
        return null;
      }
      if (handle === null) {
        return remainingMs;
      }
      return Math.max(0, remainingMs - (perf.now() - startedAt));
    }

    return {
      start,
      pause,
      resume,
      clear,
      getRemainingMs
    };
  }

  function createArcadeSession(options) {
    const settings = Object.assign({
      getLevelRules: null,
      onStateChange: null,
      onLevelExpired: null
    }, options || {});

    let checkpointSnapshot = null;
    let activeDiffKey = "";
    let levelNumber = 1;
    let levelRules = {
      correctTarget: 10,
      timeLimitMs: null
    };
    let coins = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let missCount = 0;
    let consecutiveCorrect = 0;
    let bestStreak = 0;
    let coinsEarned = 0;
    let levelTimeExpired = false;
    let levelClockStarted = false;
    let levelClockRunning = false;
    let levelClockAccumulatedMs = 0;
    let levelClockStartedAt = 0;
    let questionStartedAt = 0;
    let correctAnswerLatencyTotalMs = 0;
    let correctAnswerSamples = 0;
    let wrongClicks = 0;

    const levelTimer = createPauseableTimer(() => {
      levelTimeExpired = true;
      notifyStateChange();
      if (typeof settings.onLevelExpired === "function") {
        settings.onLevelExpired(getState());
      }
    });

    function notifyStateChange() {
      if (typeof settings.onStateChange === "function") {
        settings.onStateChange(getState());
      }
    }

    function normalizeLevelRules(rawRules) {
      const rules = rawRules && typeof rawRules === "object" ? rawRules : {};
      const correctTarget = Math.max(1, Number(rules.correctTarget) || 10);
      const rawTimeLimitMs = Number(rules.timeLimitMs);
      return {
        correctTarget,
        timeLimitMs: Number.isFinite(rawTimeLimitMs) && rawTimeLimitMs > 0 ? rawTimeLimitMs : null
      };
    }

    function resolveLevelRules() {
      if (typeof settings.getLevelRules !== "function") {
        return normalizeLevelRules();
      }
      return normalizeLevelRules(settings.getLevelRules({
        diffKey: activeDiffKey,
        levelNumber,
        snapshot: checkpointSnapshot,
        state: getState()
      }));
    }

    function clearRunCounts() {
      correctCount = 0;
      wrongCount = 0;
      missCount = 0;
      consecutiveCorrect = 0;
      bestStreak = 0;
      coinsEarned = 0;
      levelTimeExpired = false;
      levelClockStarted = false;
      levelClockRunning = false;
      levelClockAccumulatedMs = 0;
      levelClockStartedAt = 0;
      questionStartedAt = 0;
      correctAnswerLatencyTotalMs = 0;
      correctAnswerSamples = 0;
      wrongClicks = 0;
      levelTimer.clear();
    }

    function loadCheckpoint(snapshot, diffKey) {
      checkpointSnapshot = snapshot || checkpointSnapshot || {
        nextLevel: 1,
        player: {
          coins: 0
        }
      };
      activeDiffKey = String(diffKey || activeDiffKey || "");
      levelNumber = Math.max(1, Number(checkpointSnapshot.nextLevel) || 1);
      coins = Math.max(0, Number(checkpointSnapshot.player && checkpointSnapshot.player.coins) || 0);
      clearRunCounts();
      levelRules = resolveLevelRules();
      notifyStateChange();
    }

    function beginLevel() {
      levelRules = resolveLevelRules();
      levelTimeExpired = false;
      levelClockStarted = true;
      levelClockRunning = true;
      levelClockAccumulatedMs = 0;
      levelClockStartedAt = perf.now();
      levelTimer.clear();
      if (levelRules.timeLimitMs) {
        levelTimer.start(levelRules.timeLimitMs);
      }
      notifyStateChange();
    }

    function pause() {
      if (levelClockRunning) {
        levelClockAccumulatedMs += perf.now() - levelClockStartedAt;
        levelClockRunning = false;
      }
      levelTimer.pause();
    }

    function resume() {
      if (levelClockStarted && !levelClockRunning) {
        levelClockStartedAt = perf.now();
        levelClockRunning = true;
      }
      levelTimer.resume();
    }

    function finishLevel() {
      pause();
      levelTimer.clear();
      questionStartedAt = 0;
      notifyStateChange();
    }

    function noteQuestionPresented() {
      questionStartedAt = perf.now();
      notifyStateChange();
    }

    function handleCorrect() {
      if (questionStartedAt > 0) {
        correctAnswerLatencyTotalMs += Math.max(0, perf.now() - questionStartedAt);
        correctAnswerSamples += 1;
        questionStartedAt = 0;
      }
      correctCount += 1;
      consecutiveCorrect += 1;
      bestStreak = Math.max(bestStreak, consecutiveCorrect);

      notifyStateChange();
      return {
        levelComplete: shouldCompleteLevel()
      };
    }

    function handleWrong() {
      wrongClicks += 1;
      wrongCount += 1;
      consecutiveCorrect = 0;
      notifyStateChange();
      return {
        levelComplete: shouldCompleteLevel()
      };
    }

    function handleSink() {
      questionStartedAt = 0;
      consecutiveCorrect = 0;
      notifyStateChange();
      return {
        levelComplete: shouldCompleteLevel()
      };
    }

    function handleMiss() {
      questionStartedAt = 0;
      missCount += 1;
      consecutiveCorrect = 0;
      notifyStateChange();
      return {
        levelComplete: shouldCompleteLevel()
      };
    }

    function addCoins(delta) {
      const gain = Math.max(0, Number(delta) || 0);
      coins += gain;
      coinsEarned += gain;
      notifyStateChange();
    }

    function getElapsedMs() {
      const runningElapsed = levelClockRunning ? (perf.now() - levelClockStartedAt) : 0;
      return Math.max(0, levelClockAccumulatedMs + runningElapsed);
    }

    function getAccuracy() {
      const attempts = correctCount + wrongCount + missCount;
      if (!attempts) {
        return 0;
      }
      return correctCount / attempts;
    }

    function getAverageAnswerMs() {
      if (!correctAnswerSamples) {
        return 0;
      }
      return correctAnswerLatencyTotalMs / correctAnswerSamples;
    }

    function shouldCompleteLevel() {
      return correctCount >= levelRules.correctTarget || levelTimeExpired;
    }

    function getState() {
      const timeRemainingMs = levelRules.timeLimitMs ? levelTimer.getRemainingMs() : null;
      return {
        levelNumber,
        diffKey: activeDiffKey,
        coins,
        correctCount,
        wrongCount,
        missCount,
        consecutiveCorrect,
        bestStreak,
        coinsEarned,
        accuracy: getAccuracy(),
        levelProgress: {
          current: correctCount,
          target: levelRules.correctTarget,
          ratio: Math.max(0, Math.min(1, correctCount / Math.max(1, levelRules.correctTarget)))
        },
        levelRules: Object.assign({}, levelRules),
        levelTimeExpired,
        timeRemainingMs,
        elapsedMs: getElapsedMs(),
        avgAnswerMs: getAverageAnswerMs(),
        wrongClicks
      };
    }

    function buildResultsPayload() {
      const attempts = correctCount + wrongCount + missCount;
      return {
        completedLevel: levelNumber,
        diffKey: activeDiffKey,
        coins,
        metrics: {
          passed: correctCount >= levelRules.correctTarget,
          correct: correctCount,
          wrong: wrongCount,
          wrongClicks,
          missed: missCount,
          attempts,
          accuracy: getAccuracy(),
          bestStreak,
          coinsEarned,
          avgAnswerMs: getAverageAnswerMs(),
          elapsedMs: getElapsedMs(),
          correctTarget: levelRules.correctTarget,
          questionTimeLimitMs: 12000,
          timeLimitMs: levelRules.timeLimitMs,
          endedBy: levelTimeExpired && correctCount < levelRules.correctTarget ? "time" : "target"
        }
      };
    }

    return {
      loadCheckpoint,
      beginLevel,
      pause,
      resume,
      finishLevel,
      noteQuestionPresented,
      handleCorrect,
      handleWrong,
      handleSink,
      handleMiss,
      addCoins,
      shouldCompleteLevel,
      buildResultsPayload,
      getState
    };
  }

  return {
    createArcadeSession
  };
});
