window.GAME_V2_WORDS_CONFIG = {
  menuUrl: "../index.html",
  waterYRatio: 0.72,
  splashYOffset: 120,
  answerLockMs: 120,
  assets: {
    splashSheet: { url: "../shared/assets/fx/splash_sheet.png", sheetW: 1024, sheetH: 1024, cols: 4, rows: 4, frames: 16, fps: 30, scale: 0.75 },
    burstSheet: { url: "../shared/assets/fx/burst_sheet.png", sheetW: 1024, sheetH: 1024, cols: 4, rows: 4, frames: 16, fps: 30, scale: 0.65 },
    mascotSheet: { url: "../shared/assets/mascot/kittydance.png", cols: 4, rows: 2, frames: 8, fps: 6 },
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
    livesStart: 10,
    scoreWrong: -5,
    scoreMiss: -10,
    baseSpeed: 96,
    speedIncPerLevel: 8,
    pointsPerLevel: 180,
    tileWidth: 360,
    tileHeight: 116,
    tileMargin: 10,
    correctMin: 10,
    correctMax: 20,
    correctTimeCapSec: 2,
    sfxGain: 0.1
  },
  diffs: {
    easy: { label: "קל", speedMul: 0.24 },
    medium: { label: "בינוני", speedMul: 0.42 },
    hard: { label: "קשה", speedMul: 0.52 },
    super: { label: "סופר", speedMul: 0.64 }
  }
};
