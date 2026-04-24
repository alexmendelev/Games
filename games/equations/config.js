window.GAME_V3_EQUATIONS_CONFIG = {
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
      operations: ["+"],
      missingSlots: ["left", "right", "result"],
      allowNegativeResults: false,
      allowMultiplication: false,
      allowDivision: false,
      addition: {
        left: [1, 5],
        right: [1, 5],
        resultMax: 10
      },
      distractors: {
        minOffset: 2,
        near: 4,
        far: 8,
        farChance: 0.12,
        allowNegativeOptions: false
      }
    },
    medium: {
      label: "Medium",
      operations: ["+", "-"],
      missingSlots: ["left", "right", "result"],
      allowNegativeResults: false,
      allowMultiplication: false,
      allowDivision: false,
      addition: {
        left: [1, 10],
        right: [1, 10],
        resultMax: 20
      },
      subtraction: {
        left: [2, 20],
        right: [1, 10],
        resultMax: 20
      },
      distractors: {
        minOffset: 1,
        near: 4,
        far: 8,
        farChance: 0.18,
        allowNegativeOptions: false
      }
    },
    hard: {
      label: "Hard",
      operations: ["+", "-"],
      missingSlots: ["left", "right", "left", "right", "result"],
      allowNegativeResults: false,
      allowMultiplication: false,
      allowDivision: false,
      addition: {
        left: [10, 49],
        right: [10, 49],
        resultMax: 98
      },
      subtraction: {
        left: [20, 79],
        right: [10, 49]
      },
      distractors: {
        minOffset: 1,
        near: 5,
        far: 10,
        farChance: 0.20,
        allowNegativeOptions: false
      }
    },
    super: {
      label: "Super",
      operations: ["+", "-", "*", "/"],
      missingSlots: ["left", "right"],
      allowNegativeResults: false,
      allowMultiplication: true,
      allowDivision: true,
      addition: {
        left: [25, 75],
        right: [15, 75],
        resultMax: 99
      },
      subtraction: {
        left: [30, 99],
        right: [11, 79]
      },
      multiplication: {
        left: [2, 9],
        right: [2, 9],
        resultMax: 81
      },
      division: {
        divisor: [2, 9],
        quotient: [1, 9],
        dividendMax: 81
      },
      distractors: {
        minOffset: 1,
        near: 3,
        far: 7,
        farChance: 0.25,
        allowNegativeOptions: false
      }
    }
  },
  gameplay: {
    normalAttempts: 2,
    specialAttempts: 1,
    specialChance: 1 / 4,
    specialSilverWeight: 120,
    specialGoldWeight: 70,
    specialDiamondWeight: 4,
    specialSilverCoins: 2,
    specialGoldCoins: 8,
    specialDiamondCoins: 24,
    baseSpeed: 78,
    speedIncPerLevel: 6,
    levelGoals: {
      easy: { correctTarget: 8, timeLimitMs: 60000 },
      medium: { correctTarget: 10, timeLimitMs: 75000 },
      hard: { correctTarget: 12, timeLimitMs: 90000 },
      super: { correctTarget: 14, timeLimitMs: 90000 }
    },
    tileWBase: 430,
    tileHBase: 98,
    marginBase: 10,
    sfxGain: 0.1
  }
};
