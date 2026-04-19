window.GAMES_V2_META_LEADERBOARD = (function (utils, s) {
  const {
    rankParticipants, deepClone,
    setGameCompletedLevel, setRewardProgress, syncLegacyProgressFields,
    getShapesRunStreak, nextMessage, getGameProgress,
    hashString, seededRandom, randomInt
  } = s;

  function buildPerformanceProfile(context, beforeRanks) {
    const shellApi = window.GAMES_V2_SHELL || {};
    const metrics = context && context.metrics ? context.metrics : {};
    const accuracy = utils.clamp(Number(metrics.accuracy) || 0, 0, 1);
    const coinsEarned = Math.max(0, Number(metrics.coinsEarned) || 0);
    const bestStreak = Math.max(0, Number(metrics.bestStreak) || 0);
    const playerBefore = Array.isArray(beforeRanks)
      ? beforeRanks.find((participant) => participant.id === "me")
      : null;
    const playerRank = Math.max(1, Number(playerBefore && playerBefore.rank) || 1);
    let score = 0;
    score += accuracy * 0.55;
    score += utils.clamp(coinsEarned / 3, 0, 1) * 0.2;
    score += utils.clamp(bestStreak / 10, 0, 1) * 0.15;
    if ((metrics.endedBy || "target") !== "time") {
      score += 0.1;
    }
    score = utils.clamp(score, 0, 1);
    const playerBonus = shellApi && typeof shellApi.getCompletionBonus === "function"
      ? shellApi.getCompletionBonus(context && context.diffKey, {
        gameKey: context && context.gameKey
      })
      : 1;

    return {
      metrics,
      accuracy,
      coinsEarned,
      bestStreak,
      playerRank,
      score,
      playerBonus: Math.max(1, Number(playerBonus) || 1)
    };
  }

  function competitorGapRange(context, direction) {
    const performanceScore = utils.clamp(Number(context.performanceScore) || 0, 0, 1);
    const coinsEarned = Math.max(0, Number(context.coinsEarned) || 0);
    const hotRun = performanceScore >= 0.9 || coinsEarned >= 5;
    const strongRun = performanceScore >= 0.76 || coinsEarned >= 3;
    if (direction === "ahead") {
      if (hotRun) {
        return { min: 1, max: 4 };
      }
      if (strongRun) {
        return { min: 2, max: 6 };
      }
      return { min: 3, max: 9 };
    }
    if (hotRun) {
      return { min: 1, max: 5 };
    }
    if (strongRun) {
      return { min: 2, max: 7 };
    }
    return { min: 3, max: 10 };
  }

  function getLeaderboardPressure(context) {
    const playerBonus = Math.max(1, Number(context && context.playerBonus) || 1);
    const coinsEarned = Math.max(0, Number(context && context.coinsEarned) || 0);
    const normalizedBonus = utils.clamp((playerBonus - 1) / 7, 0, 1);
    let pressure = 0.35 + (normalizedBonus * 0.65);

    if (coinsEarned >= 8) {
      pressure = Math.max(pressure, 0.92);
    } else if (coinsEarned >= 5) {
      pressure = Math.max(pressure, 0.75);
    } else if (coinsEarned >= 3) {
      pressure = Math.max(pressure, 0.58);
    }

    if (context && context.gameKey === "shapes") {
      const shapesRunStreak = Math.max(0, Number(context.shapesRunStreak) || 0);
      const streakPenalty = Math.max(0, 1 - (Math.min(10, shapesRunStreak) / 10));
      pressure *= 0.45 * streakPenalty;
    }

    return utils.clamp(pressure, 0, 1);
  }

  function applyPressureToRange(range, pressure) {
    const safeRange = range && typeof range === "object" ? range : { min: 0, max: 0 };
    const scaledMin = Math.max(0, Math.floor((Number(safeRange.min) || 0) * pressure));
    const scaledMax = Math.max(scaledMin, Math.round((Number(safeRange.max) || 0) * pressure));
    return {
      min: scaledMin,
      max: scaledMax
    };
  }

  function tightenCompetitionAroundPlayer(participants, context) {
    const ranked = rankParticipants(participants);
    const playerIndex = ranked.findIndex((participant) => participant.id === "me");
    if (playerIndex < 0) {
      return ranked;
    }

    const adjusted = ranked.map((participant) => Object.assign({}, participant));
    const player = adjusted[playerIndex];
    const pressure = getLeaderboardPressure(context);

    function seededGap(participantId, direction, minGap, maxGap) {
      const rng = seededRandom(hashString([
        context.gameKey,
        context.completedLevel,
        participantId,
        direction,
        player.coins,
        context.coinsEarned,
        context.performanceScore
      ].join("|")));
      return randomInt(rng, minGap, maxGap);
    }

    const ahead = adjusted[playerIndex - 1];
    if (ahead) {
      const range = applyPressureToRange(competitorGapRange(context, "ahead"), pressure);
      const targetGap = seededGap(ahead.id, "ahead", range.min, range.max);
      let desiredCoins = player.coins + targetGap;
      const hardCeiling = playerIndex >= 2 ? adjusted[playerIndex - 2].coins - 1 : desiredCoins;
      desiredCoins = Math.min(desiredCoins, hardCeiling);
      if (desiredCoins > player.coins) {
        ahead.coins = desiredCoins;
      }
    }

    const behind = adjusted[playerIndex + 1];
    if (behind) {
      const range = applyPressureToRange(competitorGapRange(context, "behind"), pressure);
      const targetGap = seededGap(behind.id, "behind", range.min, range.max);
      let desiredCoins = Math.max(0, player.coins - targetGap);
      const floor = playerIndex + 2 < adjusted.length ? adjusted[playerIndex + 2].coins + 1 : 0;
      desiredCoins = Math.max(desiredCoins, floor);
      if (desiredCoins < player.coins) {
        behind.coins = desiredCoins;
      }
    }

    return adjusted;
  }

  function simulateCompetitorProgress(participants, context) {
    const pressure = getLeaderboardPressure(context);
    const progressed = participants.map((participant, index) => {
      if (participant.id === "me") {
        return Object.assign({}, participant);
      }
      const seed = hashString([
        context.gameKey,
        context.completedLevel,
        participant.id,
        participant.coins,
        context.playerCoins,
        index
      ].join("|"));
      const rng = seededRandom(seed);
      const gapToPlayer = participant.coins - context.playerCoins;
      const aheadOfPlayer = gapToPlayer >= 0;
      let minGain = 1;
      let maxGain = 3;

      if (context.performanceScore >= 0.92) {
        minGain = aheadOfPlayer ? 0 : 1;
        maxGain = aheadOfPlayer ? 1 : 2;
      } else if (context.performanceScore >= 0.78) {
        minGain = aheadOfPlayer ? 0 : 1;
        maxGain = aheadOfPlayer ? 2 : 2;
      } else if (context.performanceScore >= 0.6) {
        minGain = aheadOfPlayer ? 1 : 1;
        maxGain = aheadOfPlayer ? 2 : 3;
      } else {
        minGain = aheadOfPlayer ? 2 : 1;
        maxGain = aheadOfPlayer ? 4 : 3;
      }

      if (context.playerRank >= 4 && aheadOfPlayer) {
        maxGain = Math.max(0, maxGain - 1);
        minGain = Math.min(minGain, maxGain);
      }
      if (gapToPlayer > 120) {
        maxGain = Math.min(maxGain, context.performanceScore >= 0.78 ? 0 : 1);
        minGain = Math.min(minGain, maxGain);
      } else if (gapToPlayer > 45 && context.performanceScore >= 0.78) {
        maxGain = Math.min(maxGain, 1);
        minGain = Math.min(minGain, maxGain);
      }

      minGain = Math.max(0, Math.floor(minGain * pressure));
      maxGain = Math.max(minGain, Math.round(maxGain * pressure));

      const delta = randomInt(rng, minGain, maxGain);
      return Object.assign({}, participant, {
        coins: participant.coins + delta
      });
    });
    return tightenCompetitionAroundPlayer(progressed, context);
  }

  function applyRoundResult(state, context) {
    const beforeRanks = rankParticipants(state.participants);
    const nextState = deepClone(state);
    const performance = buildPerformanceProfile(context, beforeRanks);
    const totalPlayerCoins = Math.max(0, Number(context.playerCoins) || nextState.player.coins) + performance.playerBonus;
    nextState.player.coins = totalPlayerCoins;
    setGameCompletedLevel(nextState, context.gameKey, context.completedLevel);
    setRewardProgress(nextState, context.gameKey);
    syncLegacyProgressFields(nextState);
    nextState.participants = nextState.participants.map((participant) => {
      if (participant.id !== "me") {
        return participant;
      }
      return Object.assign({}, participant, {
        name: nextState.player.name,
        avatar: nextState.player.avatar,
        coins: totalPlayerCoins
      });
    });
    nextState.participants = simulateCompetitorProgress(nextState.participants, {
      gameKey: context.gameKey,
      completedLevel: getGameProgress(nextState, context.gameKey).highestCompletedLevel,
      playerCoins: totalPlayerCoins,
      playerRank: performance.playerRank,
      performanceScore: performance.score,
      coinsEarned: performance.coinsEarned,
      playerBonus: performance.playerBonus,
      shapesRunStreak: getShapesRunStreak(nextState)
    });

    const afterRanks = rankParticipants(nextState.participants);
    const meAfter = afterRanks.find((participant) => participant.id === "me");
    nextState.player.currentRank = meAfter ? meAfter.rank : nextState.player.currentRank;
    nextState.participants = afterRanks.map((participant) => ({
      id: participant.id,
      name: participant.name,
      avatar: participant.avatar,
      coins: participant.coins
    }));

    return {
      state: nextState,
      beforeRanks,
      afterRanks,
      message: nextMessage(nextState),
      playerBonus: performance.playerBonus
    };
  }

  return {
    simulateCompetitorProgress,
    applyRoundResult
  };
})(window.GAMES_V2_UTILS, window.GAMES_V2_META_STATE);
