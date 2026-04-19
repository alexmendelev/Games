window.GAME_V2_SHAPES_CONFIG = {
  menuUrl: "../index.html",
  waterYRatio: 0.82,
  splashYOffset: 120,
  answerLockMs: 120,
  layout: {
    answers: {
      type: "DenseOptionGrid",
      count: 16,
      activeCount: 8,
      minCols: 2,
      maxCols: 4,
      preferredCols: 4,
      preferredRows: 4,
      minButtonSize: 46,
      maxButtonSize: 98,
      aspectRatio: 1,
      minHeight: 140
    }
  },
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
    { id: "circle", he: "\u05e2\u05d9\u05d2\u05d5\u05dc" },
    { id: "square", he: "\u05e8\u05d9\u05d1\u05d5\u05e2" },
    { id: "triangle", he: "\u05de\u05e9\u05d5\u05dc\u05e9" },
    { id: "diamond", he: "\u05de\u05e2\u05d5\u05d9\u05df" },
    { id: "star", he: "\u05db\u05d5\u05db\u05d1" },
    { id: "heart", he: "\u05dc\u05d1" }
  ],
  colors: [
    { id: "red", he: "\u05d0\u05d3\u05d5\u05dd", hex: "#ef4444" },
    { id: "blue", he: "\u05db\u05d7\u05d5\u05dc", hex: "#3b82f6" },
    { id: "green", he: "\u05d9\u05e8\u05d5\u05e7", hex: "#22c55e" },
    { id: "yellow", he: "\u05e6\u05d4\u05d5\u05d1", hex: "#facc15" },
    { id: "purple", he: "\u05e1\u05d2\u05d5\u05dc", hex: "#a855f7" },
    { id: "orange", he: "\u05db\u05ea\u05d5\u05dd", hex: "#f97316" }
  ],
  similarity: {
    shapeNeighbors: {
      circle: ["square", "heart"],
      square: ["circle", "diamond"],
      triangle: ["diamond", "star"],
      diamond: ["square", "triangle"],
      star: ["triangle", "heart"],
      heart: ["circle", "star"]
    },
    colorNeighbors: {
      red: ["orange", "purple"],
      blue: ["green", "purple"],
      green: ["blue", "yellow"],
      yellow: ["green", "orange"],
      purple: ["blue", "red"],
      orange: ["red", "yellow"]
    }
  },
  difficulties: {
    easy: {
      label: "\u05e7\u05dc",
      answerCount: 4,
      shapePool: ["circle", "square", "triangle", "diamond"],
      colorPool: ["red", "blue", "green", "yellow"],
      distractorPlan: ["distinct", "distinct", "distinct"],
      fallbackTiers: ["distinct", "same-shape", "same-color"]
    },
    medium: {
      label: "\u05d1\u05d9\u05e0\u05d5\u05e0\u05d9",
      answerCount: 8,
      shapePool: ["circle", "square", "triangle", "diamond"],
      colorPool: ["red", "blue", "green", "yellow", "purple", "orange"],
      distractorPlan: [
        "same-shape",
        "same-color",
        "distinct",
        "distinct",
        "same-shape",
        "same-color",
        "distinct"
      ],
      fallbackTiers: ["same-shape", "same-color", "distinct", "related-color", "related-shape"]
    },
    hard: {
      label: "\u05e7\u05e9\u05d4",
      answerCount: 12,
      shapePool: ["circle", "square", "triangle", "diamond", "star", "heart"],
      colorPool: ["red", "blue", "green", "yellow", "purple", "orange"],
      distractorPlan: [
        "same-shape-related-color",
        "related-shape-same-color",
        "same-shape",
        "same-color",
        "related-shape",
        "related-color",
        "same-shape-related-color",
        "related-shape-same-color",
        "same-shape",
        "same-color",
        "distinct"
      ],
      fallbackTiers: [
        "same-shape-related-color",
        "related-shape-same-color",
        "same-shape",
        "same-color",
        "related-shape-related-color",
        "related-shape",
        "related-color",
        "distinct"
      ]
    },
    super: {
      label: "\u05e1\u05d5\u05e4\u05e8",
      answerCount: 16,
      shapePool: ["circle", "square", "triangle", "diamond", "star", "heart"],
      colorPool: ["red", "blue", "green", "yellow", "purple", "orange"],
      distractorPlan: [
        "same-shape-related-color",
        "related-shape-same-color",
        "same-shape-related-color",
        "related-shape-same-color",
        "same-shape",
        "same-color",
        "related-shape-related-color",
        "related-shape",
        "related-color",
        "same-shape",
        "same-color",
        "related-shape-related-color",
        "same-shape-related-color",
        "related-shape-same-color",
        "related-shape"
      ],
      fallbackTiers: [
        "same-shape-related-color",
        "related-shape-same-color",
        "related-shape-related-color",
        "same-shape",
        "same-color",
        "related-shape",
        "related-color",
        "distinct"
      ]
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
  }
};
