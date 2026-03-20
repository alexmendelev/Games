window.GAME_V3_MULTIPLY_CONFIG = {
  menuUrl: "../index.html",
  waterYRatio: 0.8,
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
    splashAudio: "../shared/assets/audio/splash.mp3",
    coinAudio: "../shared/assets/audio/coin_drop.mp3"
  },
  diffs: {
    upTo5: { label: "כפל 1-5", speedMul: 0.24, correct: 15, minFactor: 1, maxFactor: 5, wrongNear: 4, wrongFar: 8 },
    upTo10: { label: "כפל 1-10", speedMul: 0.28, correct: 20, minFactor: 1, maxFactor: 10, wrongNear: 6, wrongFar: 12 }
  },
  gameplay: {
    livesStart: 10,
    scoreWrong: -5,
    scoreMiss: -10,
    baseSpeed: 80,
    speedIncPerLevel: 6,
    pointsPerLevel: 200,
    tileWBase: 240,
    tileHBase: 78,
    marginBase: 10,
    sfxGain: 0.1
  }
};
