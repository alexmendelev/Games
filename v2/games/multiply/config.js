window.GAME_V3_MULTIPLY_CONFIG = {
  menuUrl: "../index.html",
  waterYRatio: 0.9,
  splashOffsetBasePx: 150,
  splashOffsetBaselineHeight: 650,
  splashOffsetExponent: 0.5,
  answerFeedbackMs: 220,
  layout: {
    answers: {
      type: "FourAnswerGrid",
      count: 4,
      activeCount: 4,
      minButtonSize: 84,
      maxButtonSize: 190,
      aspectRatio: 1.24
    }
  },
  assets: {
    splashSheet: {
      url: "../shared/assets/fx/splash_sheet.png",
      sheetW: 1024,
      sheetH: 1024,
      cols: 4,
      rows: 4,
      frames: 16,
      fps: 30,
      scale: 0.75
    },
    burstSheet: {
      url: "../shared/assets/fx/burst_sheet.png",
      sheetW: 1024,
      sheetH: 1024,
      cols: 4,
      rows: 4,
      frames: 16,
      fps: 30,
      scale: 0.65
    },
    mascotSheet: { url: "../shared/assets/mascot/kittydance.png", cols: 4, rows: 2, frames: 8, fps: 6 },
    mascotSadSheet: { url: "../shared/assets/mascot/kittysad.png", cols: 4, rows: 2, frames: 8, fps: 6 },
    splashAudio: "../shared/assets/audio/splash.mp3",
    coinAudio: "../shared/assets/audio/coin_drop.mp3"
  },
  difficulties: {
    easy: {
      label: "Easy",
      factorRange: [1, 4],
      distractors: {
        minOffset: 2,
        near: 6,
        far: 12,
        farChance: 0.35
      }
    },
    medium: {
      label: "Medium",
      factorRange: [2, 7],
      distractors: {
        minOffset: 2,
        near: 5,
        far: 10,
        farChance: 0.28
      }
    },
    hard: {
      label: "Hard",
      factorRange: [2, 10],
      distractors: {
        minOffset: 1,
        near: 4,
        far: 8,
        farChance: 0.22
      }
    },
    super: {
      label: "Super",
      factorRange: [2, 12],
      preferredFactors: [6, 7, 8, 9, 12],
      preferredFactorBias: 0.55,
      distractors: {
        minOffset: 1,
        near: 3,
        far: 6,
        farChance: 0.18
      }
    }
  },
  gameplay: {
    normalAttempts: 2,
    specialAttempts: 1,
    specialChance: 1 / 6,
    specialSilverWeight: 70,
    specialGoldWeight: 25,
    specialDiamondWeight: 5,
    specialSilverCoins: 1,
    specialGoldCoins: 5,
    specialDiamondCoins: 20,
    baseSpeed: 80,
    speedIncPerLevel: 6,
    levelGoals: {
      easy: { correctTarget: 8, timeLimitMs: 60000 },
      medium: { correctTarget: 10, timeLimitMs: 75000 },
      hard: { correctTarget: 12, timeLimitMs: 90000 },
      super: { correctTarget: 14, timeLimitMs: 90000 }
    },
    tileWBase: 240,
    tileHBase: 78,
    marginBase: 10,
    sfxGain: 0.1
  }
};
