window.GAME_V2_WORDS_CONFIG = {
  menuUrl: "../index.html",
  waterYRatio: 0.82,
  splashYOffset: 120,
  answerLockMs: 120,
  layout: {
    answers: {
      type: "FourLargeCards",
      content: "image",
      count: 4,
      activeCount: 4,
      minButtonSize: 96,
      maxButtonSize: 210,
      aspectRatio: 1
    }
  },
  assets: {
    splashSheet: { url: "../shared/assets/fx/splash_sheet.png", sheetW: 1024, sheetH: 1024, cols: 4, rows: 4, frames: 16, fps: 30, scale: 0.75 },
    burstSheet: { url: "../shared/assets/fx/burst_sheet.png", sheetW: 1024, sheetH: 1024, cols: 4, rows: 4, frames: 16, fps: 30, scale: 0.65 },
    mascotSheet: { url: "../shared/assets/mascot/kittydance.png", cols: 4, rows: 2, frames: 8, fps: 6 },
    mascotSadSheet: { url: "../shared/assets/mascot/kittysad.png", cols: 4, rows: 2, frames: 8, fps: 6 },
    splashAudio: "../shared/assets/audio/splash.mp3",
    coinAudio: "../shared/assets/audio/coin_drop.mp3",
    emojiTsv: "data/emoji-easy-oneword-he.tsv",
    emojiDir: "data/emojis"
  },
  fallbackEmojis: [
    { id: "1F408", he: "חתול" },
    { id: "1F415", he: "כלב" },
    { id: "1F407", he: "ארנב" },
    { id: "1F40D", he: "נחש" },
    { id: "1F42C", he: "דולפין" },
    { id: "1F427", he: "פינגווין" },
    { id: "1F414", he: "תרנגול" },
    { id: "2708", he: "מטוס" }
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
    baseSpeed: 96,
    speedIncPerLevel: 8,
    correctPerDiffStep: 6,
    tileWidth: 360,
    tileHeight: 116,
    tileMargin: 10,
    sfxGain: 0.1
  },
  diffs: {
    easy: { label: "קל", speedMul: 0.42, maxLetters: 4 },
    medium: { label: "בינוני", speedMul: 0.42, maxLetters: 5 },
    hard: { label: "קשה", speedMul: 0.42, maxLetters: 6 },
    super: { label: "סופר", speedMul: 0.42, maxLetters: Infinity }
  }
};
window.GAME_V2_WORDS_CONFIG.gameplay.levelGoals = {
  easy: { correctTarget: 8, timeLimitMs: 60000 },
  medium: { correctTarget: 10, timeLimitMs: 75000 },
  hard: { correctTarget: 12, timeLimitMs: 90000 },
  super: { correctTarget: 14, timeLimitMs: 90000 }
};
window.GAME_V2_WORDS_CONFIG.diffs.easy.speedMul = 0.36;
window.GAME_V2_WORDS_CONFIG.diffs.medium.speedMul = 0.42;
window.GAME_V2_WORDS_CONFIG.diffs.hard.speedMul = 0.48;
window.GAME_V2_WORDS_CONFIG.diffs.super.speedMul = 0.56;
