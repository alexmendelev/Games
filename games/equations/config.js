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
  presets: {
    easy: { label: "easy", speedMul: 0.24, startStage: 0, maxVisibleNumber: 10 },
    medium: { label: "medium", speedMul: 0.27, startStage: 1 },
    hard: { label: "hard", speedMul: 0.3, startStage: 2 },
    super: { label: "super", speedMul: 0.34, startStage: 4 }
  },
  progression: [
    {
      label: "addition up to 5",
      noNegOptions: true,
      wrongNear: 3,
      wrongFar: 6,
      ops: ["+"],
      missingSlots: ["left", "right", "result"],
      addRange: [0, 5]
    },
    {
      label: "addition and subtraction up to 10",
      allowNegativeAnswer: false,
      noNegOptions: true,
      wrongNear: 4,
      wrongFar: 8,
      ops: ["+", "-"],
      missingSlots: ["left", "right", "result"],
      addRange: [0, 10],
      subRange: [0, 10]
    },
    {
      label: "addition and subtraction up to 20",
      allowNegativeAnswer: false,
      noNegOptions: true,
      wrongNear: 5,
      wrongFar: 10,
      ops: ["+", "-"],
      missingSlots: ["left", "right", "result"],
      addRange: [0, 20],
      subRange: [0, 20]
    },
    {
      label: "subtraction with negative answers",
      allowNegativeAnswer: true,
      noNegOptions: false,
      wrongNear: 6,
      wrongFar: 12,
      ops: ["+", "-"],
      missingSlots: ["left", "right", "result"],
      addRange: [0, 25],
      subRange: [0, 25]
    },
    {
      label: "multiplication up to 5",
      allowNegativeAnswer: false,
      noNegOptions: true,
      wrongNear: 6,
      wrongFar: 12,
      ops: ["+", "-", "*"],
      missingSlots: ["left", "right", "result"],
      addRange: [0, 20],
      subRange: [0, 20],
      mulRange: [1, 5]
    },
    {
      label: "multiply and divide up to 10",
      allowNegativeAnswer: true,
      noNegOptions: false,
      wrongNear: 7,
      wrongFar: 14,
      ops: ["+", "-", "*", "/"],
      missingSlots: ["left", "right", "result"],
      addRange: [0, 30],
      subRange: [0, 30],
      mulRange: [1, 10],
      divAnswerRange: [1, 10],
      divDivisorRange: [1, 10]
    },
    {
      label: "super",
      allowNegativeAnswer: true,
      noNegOptions: false,
      wrongNear: 8,
      wrongFar: 18,
      ops: ["+", "-", "*", "/"],
      missingSlots: ["left", "right", "result"],
      addRange: [0, 40],
      subRange: [0, 40],
      mulRange: [1, 12],
      divAnswerRange: [1, 12],
      divDivisorRange: [1, 12]
    }
  ],
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
    stageLevelStep: 2,
    levelGoals: {
      easy: { correctTarget: 8, timeLimitMs: 60000 },
      medium: { correctTarget: 10, timeLimitMs: 75000 },
      hard: { correctTarget: 12, timeLimitMs: 90000 },
      super: { correctTarget: 14, timeLimitMs: 90000 }
    },
    tileWBase: 330,
    tileHBase: 98,
    marginBase: 10,
    sfxGain: 0.1
  }
};
