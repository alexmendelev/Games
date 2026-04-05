window.GAME_V3_CLOCKS_CONFIG = {
  menuUrl: "../index.html",
  waterYRatio: 0.9,
  splashYOffset: 120,
  answerLockMs: 160,
  layout: {
    answers: {
      type: "FourLargeCards",
      itemClass: "clockAns",
      count: 4,
      activeCount: 4,
      minButtonSize: 94,
      maxButtonSize: 210,
      aspectRatio: 1
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
    coinAudio: "../shared/assets/audio/coin_drop.mp3",
    dialUrl: "assets/ui/dial.png",
    dialNoNumbersUrl: "assets/ui/dial_no_numbers.png",
    dialPlainUrl: "assets/ui/dial_plain.png"
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
    baseSpeed: 92,
    speedIncPerLevel: 8,
    levelGoals: {
      easy: { correctTarget: 8, timeLimitMs: 60000 },
      medium: { correctTarget: 10, timeLimitMs: 75000 },
      hard: { correctTarget: 12, timeLimitMs: 90000 },
      super: { correctTarget: 14, timeLimitMs: 90000 }
    },
    tileWidth: 320,
    tileHeight: 112,
    tileMargin: 10,
    sfxGain: 0.1
  },
  diffs: {
    easy: {
      label: "Easy",
      speedMul: 0.24,
      dialUrl: "assets/ui/dial.png",
      minuteValues: [0, 30],
      minuteOffsets: [30],
      hourOffsets: [1, 2]
    },
    medium: {
      label: "Medium",
      speedMul: 0.36,
      dialUrl: "assets/ui/dial.png",
      minuteValues: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
      minuteOffsets: [5, 10, 15, 30],
      hourOffsets: [1, 2]
    },
    hard: {
      label: "Hard",
      speedMul: 0.48,
      dialUrl: "assets/ui/dial_no_numbers.png",
      minuteValues: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
      minuteOffsets: [5, 10, 15],
      hourOffsets: [1, 2, 3]
    },
    super: {
      label: "Super",
      speedMul: 0.6,
      dialUrl: "assets/ui/dial_plain.png",
      minuteValues: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
      minuteOffsets: [5, 10],
      hourOffsets: [1, 2, 11]
    }
  }
};
