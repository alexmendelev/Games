window.GAME_V3_MATH_CONFIG = {
  menuUrl: "../index.html",
  waterYRatio: 0.9,
  splashOffsetBasePx: 150,
  splashOffsetBaselineHeight: 650,
  splashOffsetExponent: 0.5,
  answerFeedbackMs: 220,
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
    easy: { label: "קל", speedMul: 0.24, startStage: 0 },
    medium: { label: "בינוני", speedMul: 0.27, startStage: 1 },
    hard: { label: "קשה", speedMul: 0.3, startStage: 2 },
    super: { label: "סופר", speedMul: 0.34, startStage: 4 }
  },
  progression: [
    {
      label: "חיבור עד 5",
      noNegOptions: true,
      wrongNear: 3,
      wrongFar: 6,
      ops: ["+"],
      addRange: [0, 5]
    },
    {
      label: "חיבור וחיסור עד 10",
      allowNegResult: false,
      noNegOptions: true,
      wrongNear: 4,
      wrongFar: 8,
      ops: ["+", "-"],
      addRange: [0, 10],
      subRange: [0, 10]
    },
    {
      label: "חיבור וחיסור עד 20",
      allowNegResult: false,
      noNegOptions: true,
      wrongNear: 5,
      wrongFar: 10,
      ops: ["+", "-"],
      addRange: [0, 20],
      subRange: [0, 20]
    },
    {
      label: "חיסור עם תוצאות שליליות",
      allowNegResult: true,
      noNegOptions: false,
      wrongNear: 6,
      wrongFar: 12,
      ops: ["+", "-"],
      addRange: [0, 25],
      subRange: [0, 25]
    },
    {
      label: "כפל עד 5",
      allowNegResult: false,
      noNegOptions: true,
      wrongNear: 6,
      wrongFar: 12,
      ops: ["+", "-", "*"],
      addRange: [0, 20],
      subRange: [0, 20],
      mulRange: [1, 5]
    },
    {
      label: "כפל וחילוק עד 10",
      allowNegResult: true,
      noNegOptions: false,
      wrongNear: 7,
      wrongFar: 14,
      ops: ["+", "-", "*", "/"],
      addRange: [0, 30],
      subRange: [0, 30],
      mulRange: [1, 10],
      divAnswerRange: [1, 10],
      divDivisorRange: [1, 10]
    },
    {
      label: "סופר",
      allowNegResult: true,
      noNegOptions: false,
      wrongNear: 8,
      wrongFar: 18,
      ops: ["+", "-", "*", "/"],
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
    specialChance: 1 / 6,
    specialSilverWeight: 70,
    specialGoldWeight: 25,
    specialDiamondWeight: 5,
    specialSilverCoins: 1,
    specialGoldCoins: 5,
    specialDiamondCoins: 20,
    baseSpeed: 80,
    speedIncPerLevel: 6,
    stageLevelStep: 2,
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
