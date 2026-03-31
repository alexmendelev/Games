window.GAME_V2_SHAPES_CONFIG = {
  menuUrl: "../index.html",
  waterYRatio: 0.82,
  splashYOffset: 120,
  answerLockMs: 120,
  assets: {
    splashSheet: { url: "../shared/assets/fx/splash_sheet.png", sheetW: 1024, sheetH: 1024, cols: 4, rows: 4, frames: 16, fps: 30, scale: 0.75 },
    burstSheet: { url: "../shared/assets/fx/burst_sheet.png", sheetW: 1024, sheetH: 1024, cols: 4, rows: 4, frames: 16, fps: 30, scale: 0.65 },
    mascotSheet: { url: "../shared/assets/mascot/kittydance.png", cols: 4, rows: 2, frames: 8, fps: 6 },
    mascotSadSheet: { url: "../shared/assets/mascot/kittysad.png", cols: 4, rows: 2, frames: 8, fps: 6 },
    splashAudio: "../shared/assets/audio/splash.mp3",
    coinAudio: "../shared/assets/audio/coin_drop.mp3",
    sprayUrl: "assets/spray.png",
    sprayByColor: {
      red: "assets/spray_red.png",
      blue: "assets/spray_blue.png",
      green: "assets/spray_green.png",
      yellow: "assets/spray_yellow.png",
      purple: "assets/spray_purple.png",
      orange: "assets/spray_orange.png"
    }
  },
  shapes: [
    { id: "circle", he: "עיגול" },
    { id: "square", he: "ריבוע" },
    { id: "triangle", he: "משולש" },
    { id: "diamond", he: "מעוין" },
    { id: "star", he: "כוכב" },
    { id: "heart", he: "לב" }
  ],
  colors: [
    { id: "red", he: "אדום", hex: "#ef4444" },
    { id: "blue", he: "כחול", hex: "#3b82f6" },
    { id: "green", he: "ירוק", hex: "#22c55e" },
    { id: "yellow", he: "צהוב", hex: "#facc15" },
    { id: "purple", he: "סגול", hex: "#a855f7" },
    { id: "orange", he: "כתום", hex: "#f97316" }
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
    baseSpeed: 90,
    speedIncPerLevel: 7,
    levelGoals: {
      easy: { correctTarget: 8, timeLimitMs: 60000 },
      medium: { correctTarget: 10, timeLimitMs: 75000 },
      hard: { correctTarget: 12, timeLimitMs: 90000 },
      super: { correctTarget: 14, timeLimitMs: 90000 }
    },
    tileWidth: 300,
    tileHeight: 124,
    tileMargin: 10,
    sfxGain: 0.1
  },
  diffs: {
    easy: { label: "קל", speedMul: 0.22, answerCount: 4 },
    medium: { label: "בינוני", speedMul: 0.38, answerCount: 8 },
    hard: { label: "קשה", speedMul: 0.48, answerCount: 12 },
    super: { label: "סופר", speedMul: 0.6, answerCount: 16 }
  }
};
