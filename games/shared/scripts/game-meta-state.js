window.GAMES_V2_META_STATE = (function (utils) {
  const STORAGE_KEY = "games_v3_meta_state_v1";
  const TEST_MODE_STORAGE_KEY = "games_v3_test_mode";
  const MESSAGES_HE = [
    "כל הכבוד!",
    "איזה יופי!",
    "את/ה מתקדם/ת נהדר!",
    "עוד קצת ואת/ה שם!",
    "מצוין, ממשיכים לשלב הבא!",
    "הצלחת יפה מאוד!",
    "איזה אלוף/ה!",
    "קדימה, לשלב הבא!"
  ];
  const AVATARS = [
    { id: "lion", image: "../shared/assets/avatars/lion.png", accent: "#f59e0b", labelHe: "אריה", labelEn: "Lion", labelRu: "Лев", legacyIds: ["avatar1"] },
    { id: "tiger", image: "../shared/assets/avatars/tiger.png", accent: "#f97316", labelHe: "טיגריס", labelEn: "Tiger", labelRu: "Тигр", legacyIds: ["avatar2"] },
    { id: "penguin", image: "../shared/assets/avatars/penguin.png", accent: "#60a5fa", labelHe: "פינגווין", labelEn: "Penguin", labelRu: "Пингвин", legacyIds: ["avatar3"] },
    { id: "frog", image: "../shared/assets/avatars/frog.png", accent: "#34d399", labelHe: "צפרדע", labelEn: "Frog", labelRu: "Лягушка", legacyIds: ["avatar4"] },
    { id: "cat", image: "../shared/assets/avatars/cat.png", accent: "#f97316", labelHe: "חתול", labelEn: "Cat", labelRu: "Кот" },
    { id: "dog", image: "../shared/assets/avatars/dog.png", accent: "#f59e0b", labelHe: "כלב", labelEn: "Dog", labelRu: "Пёс" },
    { id: "dolphin", image: "../shared/assets/avatars/dolphin.png", accent: "#38bdf8", labelHe: "דולפין", labelEn: "Dolphin", labelRu: "Дельфин" },
    { id: "bunny", image: "../shared/assets/avatars/bunny.png", accent: "#f9a8d4", labelHe: "ארנבון", labelEn: "Bunny", labelRu: "Зайчик" },
    { id: "rabbit", image: "../shared/assets/avatars/rabbit.png", accent: "#d8b4fe", labelHe: "ארנבת", labelEn: "Rabbit", labelRu: "Кролик" },
    { id: "shark", image: "../shared/assets/avatars/shark.png", accent: "#67e8f9", labelHe: "כריש", labelEn: "Shark", labelRu: "Акула" },
    { id: "squirrel", image: "../shared/assets/avatars/squirrel.png", accent: "#fb923c", labelHe: "סנאי", labelEn: "Squirrel", labelRu: "Белка" },
    { id: "whale", image: "../shared/assets/avatars/whale.png", accent: "#818cf8", labelHe: "לווייתן", labelEn: "Whale", labelRu: "Кит" }
  ];
  const AVATAR_ID_MAP = AVATARS.reduce((acc, avatar) => {
    acc[avatar.id] = avatar.id;
    (avatar.legacyIds || []).forEach((legacyId) => {
      acc[legacyId] = avatar.id;
    });
    return acc;
  }, {});
  const LANGUAGES = {
    he: { id: "he", dir: "rtl", label: "עברית", flag: "🇮🇱" },
    en: { id: "en", dir: "ltr", label: "English", flag: "🇬🇧" }
  };
  const GAME_BADGES = {
    equations: { icon: "?", menuIcon: "../shared/assets/ui/equation.png", labelHe: "משוואות", labelEn: "Equations" },
    clocks: { icon: "🕒", menuIcon: "../shared/assets/ui/clocks.png", labelHe: "שעונים", labelEn: "Clocks" },
    math: { icon: "➕", menuIcon: "../shared/assets/ui/numbers.png", labelHe: "חשבון", labelEn: "Math" },
    multiply: { icon: "✖️", menuIcon: "../shared/assets/ui/multiply.png", labelHe: "כפל", labelEn: "Multiply" },
    shapes: { icon: "🔷", menuIcon: "../shared/assets/ui/shapes.png", labelHe: "צורות", labelEn: "Shapes" },
    words: { icon: "🔤", menuIcon: "../shared/assets/ui/words.png", labelHe: "מילים", labelEn: "Words" }
  };
  const GAME_KEYS = Object.keys(GAME_BADGES);
  const MAX_VISIBLE_RESULT_ROWS = 5;
  const COPY = {
    he: {
      startTitle: "השלב הבא מחכה לך",
      startSubtitle: "ההתקדמות, ההגדרות והטבלה נשמרות אוטומטית בדפדפן.",
      status: "מצב נוכחי",
      points: "נקודות",
      coins: "מטבעות",
      lives: "חיים",
      bestLevel: "שיא שלב",
      settings: "הגדרות",
      exit: "יציאה",
      sound: "צליל",
      soundOn: "פעיל",
      soundOff: "כבוי",
      minDifficulty: "קושי מינימלי",
      maxDifficulty: "קושי מקסימלי",
      settingsTitle: "הגדרות",
      settingsBack: "חזרה",
      profileTitle: "הפרופיל שלך",
      profileSave: "שמירה",
      profileBack: "חזרה",
      playerName: "שם שחקן",
      playerNamePlaceholder: "הקלידו שם",
      editProfile: "שינוי אווטאר ושם",
      levelOnly(levelNumber) { return "שלב " + levelNumber; },
      startLevel(levelNumber, difficultyLabel) { return "שלב " + levelNumber + " • " + difficultyLabel; },
      continueLevel(levelNumber, difficultyLabel) { return "המשך לשלב " + levelNumber + " • " + difficultyLabel; },
      resultsTitle(levelNumber) { return "סיכום שלב " + levelNumber; },
      resultsSummary: "סיכום ביצועים",
      correct: "נכונות",
      wrong: "שגויות",
      missed: "פספוסים",
      accuracy: "דיוק",
      bestStreak: "רצף שיא",
      coinsEarned: "מטבעות שנצברו",
      levelPassed: "שלב שהושלם",
      time: "זמן",
      targetReached: "היעד הושלם",
      timeUp: "הזמן נגמר",
      leaderboard: "טבלת מובילים",
      leaderboardHint: "גם שאר המשתתפים ממשיכים לצבור מטבעות בכל סבב.",
      language: "שפה",
      avatar: "אווטאר",
      gameOverTitle: "ניסיון נוסף",
      gameOverSubtitle: "ההתקדמות האחרונה נשמרה בסוף השלב שהשלמת.",
      holdingRank(rank) { return "שומרים על מקום " + rank; },
      rankUp(rank) { return "עלית למקום " + rank; },
      rankDown(rank) { return "ירדת למקום " + rank; },
      champion: "מקום ראשון!",
      you: "את/ה",
      selected: "נבחר",
      messageTitle: "מסר קטן לפני שממשיכים",
      showMore: "הצג עוד",
      showLess: "הצג פחות",
      testMode: "מצב בדיקה",
      previewResults: "תצוגת מסך תוצאות",
      progressBadge(levelNumber) { return "הישג שיא: שלב " + levelNumber; },
      defaultPlayerName: "את/ה"
    },
    en: {
      startTitle: "Your next level is ready",
      startSubtitle: "Progress, settings, and the leaderboard are saved in this browser.",
      status: "Current status",
      points: "Points",
      coins: "Coins",
      lives: "Lives",
      bestLevel: "Best level",
      settings: "Settings",
      exit: "Exit",
      sound: "Sound",
      soundOn: "On",
      soundOff: "Off",
      minDifficulty: "Minimum difficulty",
      maxDifficulty: "Maximum difficulty",
      settingsTitle: "Settings",
      settingsBack: "Back",
      profileTitle: "Your profile",
      profileSave: "Save",
      profileBack: "Back",
      playerName: "Player name",
      playerNamePlaceholder: "Type your name",
      editProfile: "Change avatar and name",
      levelOnly(levelNumber) { return "Level " + levelNumber; },
      startLevel(levelNumber, difficultyLabel) { return "Level " + levelNumber + " • " + difficultyLabel; },
      continueLevel(levelNumber, difficultyLabel) { return "Continue to Level " + levelNumber + " • " + difficultyLabel; },
      resultsTitle(levelNumber) { return "Level " + levelNumber + " Results"; },
      resultsSummary: "Round summary",
      correct: "Correct",
      wrong: "Wrong",
      missed: "Missed",
      accuracy: "Accuracy",
      bestStreak: "Best streak",
      coinsEarned: "Coins earned",
      levelPassed: "Level passed",
      time: "Time",
      targetReached: "Goal reached",
      timeUp: "Time up",
      leaderboard: "Leaderboard",
      leaderboardHint: "Other players also gain a few coins each round.",
      language: "Language",
      avatar: "Avatar",
      gameOverTitle: "Try again",
      gameOverSubtitle: "Your latest checkpoint was saved after the last completed level.",
      holdingRank(rank) { return "Holding rank " + rank; },
      rankUp(rank) { return "Up to rank " + rank; },
      rankDown(rank) { return "Down to rank " + rank; },
      champion: "First place!",
      you: "You",
      selected: "Selected",
      messageTitle: "A quick boost before the next level",
      showMore: "Show more",
      showLess: "Show less",
      testMode: "Test mode",
      previewResults: "Preview results screen",
      progressBadge(levelNumber) { return "Best checkpoint: Level " + levelNumber; },
      defaultPlayerName: "You"
    }
  };
  const DIFF_LABELS = {
    easy: { he: "קל", en: "Easy" },
    medium: { he: "בינוני", en: "Medium" },
    hard: { he: "קשה", en: "Hard" },
    super: { he: "סופר", en: "Super" },
    upTo5: { he: "כפל 1-5", en: "Times 1-5" },
    upTo10: { he: "כפל 1-10", en: "Times 1-10" }
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isTruthyFlag(value) {
    if (value == null) {
      return false;
    }
    const normalized = String(value).trim().toLowerCase();
    return normalized === "" || normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
  }

  function getSearchParams() {
    try {
      return new window.URLSearchParams((window.location && window.location.search) || "");
    } catch (_) {
      return null;
    }
  }

  function isTestModeEnabled() {
    try {
      const params = getSearchParams();
      if (params && params.has("testMode")) {
        return isTruthyFlag(params.get("testMode"));
      }
      if (params && params.has("test")) {
        return isTruthyFlag(params.get("test"));
      }
    } catch (_) {}
    try {
      if (window.localStorage) {
        const stored = window.localStorage.getItem(TEST_MODE_STORAGE_KEY);
        if (stored != null && String(stored).trim() !== "") {
          return isTruthyFlag(stored);
        }
      }
    } catch (_) {}
    return false;
  }

  function getDashboardLayoutOverride() {
    const params = getSearchParams();
    if (!params) {
      return "portrait";
    }
    const layoutValue = String(params.get("dashboardLayout") || "").trim().toLowerCase();
    if (layoutValue === "portrait") {
      return "portrait";
    }
    if (layoutValue === "auto" || layoutValue === "default") {
      return "";
    }
    if (params.has("dashboardPortrait")) {
      return isTruthyFlag(params.get("dashboardPortrait")) ? "portrait" : "";
    }
    return "portrait";
  }

  function getForcedDashboardAspectBand(layoutOverride) {
    if (layoutOverride !== "portrait") {
      return "";
    }
    const width = Math.max(0, Number(window && window.innerWidth) || 0);
    const height = Math.max(0, Number(window && window.innerHeight) || 0);
    const longSide = Math.max(width, height);
    const shortSide = Math.min(width, height);
    const portraitAspectRatio = longSide > 0 ? (shortSide / longSide) : 1;
    return portraitAspectRatio >= 0.84 ? "portrait-wide" : "portrait-narrow";
  }

  function getCopy(languageId) {
    return COPY[languageId] || COPY.he;
  }

  function getLanguage(languageId) {
    return LANGUAGES[languageId] || LANGUAGES.he;
  }

  function getAvatar(avatarId) {
    const canonicalId = AVATAR_ID_MAP[String(avatarId || "").trim()] || "";
    return AVATARS.find((item) => item.id === canonicalId) || AVATARS[0];
  }

  function hashString(text) {
    let hash = 2166136261;
    const input = String(text || "");
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let state = seed >>> 0;
    return function next() {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomInt(rng, min, max) {
    return Math.floor(rng() * ((max - min) + 1)) + min;
  }

  function labelForAvatar(avatarId, languageId) {
    const avatar = getAvatar(avatarId);
    return languageId === "en" ? avatar.labelEn : avatar.labelHe;
  }

  function diffLabel(diffKey, languageId) {
    const entry = DIFF_LABELS[diffKey];
    if (!entry) {
      return String(diffKey || "").trim();
    }
    return entry[languageId] || entry.he || diffKey;
  }

  function applyHudDifficulty(labelEl, valueEl, diffKey, languageId) {
    const safeLanguageId = languageId === "en" ? "en" : "he";
    const difficultyText = diffLabel(diffKey, safeLanguageId);
    if (labelEl) {
      labelEl.textContent = "";
    }
    if (valueEl) {
      valueEl.textContent = difficultyText;
      valueEl.title = difficultyText;
    }
    return difficultyText;
  }

  function defaultPlayerName(languageId) {
    const copy = getCopy(languageId);
    return copy.defaultPlayerName || COPY.en.defaultPlayerName;
  }

  function getGameBadge(gameKey, languageId) {
    const entry = GAME_BADGES[gameKey] || GAME_BADGES.math;
    return {
      icon: entry.icon,
      menuIcon: entry.menuIcon,
      label: languageId === "en" ? entry.labelEn : entry.labelHe
    };
  }

  function createGameProgressMap(defaultLevel) {
    const safeLevel = Math.max(0, Number(defaultLevel) || 0);
    const progressByGame = {};
    GAME_KEYS.forEach((gameKey) => {
      progressByGame[gameKey] = {
        highestCompletedLevel: safeLevel
      };
    });
    return progressByGame;
  }

  function createPreferredDiffMap(defaultDiff) {
    const safeDiff = String(defaultDiff || "medium");
    const preferredDiffByGame = {};
    GAME_KEYS.forEach((gameKey) => {
      preferredDiffByGame[gameKey] = safeDiff;
    });
    return preferredDiffByGame;
  }

  function getGameProgress(state, gameKey) {
    const fallbackLevel = Math.max(0, Number(state && state.player && state.player.highestCompletedLevel) || 0);
    const raw = state && state.player && state.player.progressByGame && gameKey
      ? state.player.progressByGame[gameKey]
      : null;
    return {
      highestCompletedLevel: Math.max(0, Number(raw && raw.highestCompletedLevel) || fallbackLevel)
    };
  }

  function setGameCompletedLevel(state, gameKey, completedLevel) {
    if (!state || !state.player || !gameKey) {
      return;
    }
    const nextLevel = Math.max(1, Number(completedLevel) || 1);
    const current = getGameProgress(state, gameKey);
    state.player.progressByGame = Object.assign({}, state.player.progressByGame, {
      [gameKey]: {
        highestCompletedLevel: Math.max(current.highestCompletedLevel, nextLevel)
      }
    });
  }

  function getPreferredDiffForGame(state, gameKey) {
    const fallbackDiff = String(state && state.settings && state.settings.preferredDiff || "medium");
    const stored = state && state.settings && state.settings.preferredDiffByGame && gameKey
      ? state.settings.preferredDiffByGame[gameKey]
      : "";
    return String(stored || fallbackDiff);
  }

  function setPreferredDiffForGame(state, gameKey, diffKey) {
    if (!state || !state.settings || !gameKey) {
      return;
    }
    state.settings.preferredDiffByGame = Object.assign({}, state.settings.preferredDiffByGame, {
      [gameKey]: String(diffKey || "medium")
    });
  }

  function syncLegacyProgressFields(state) {
    if (!state || !state.player || !state.settings) {
      return;
    }
    const levels = GAME_KEYS.map((gameKey) => getGameProgress(state, gameKey).highestCompletedLevel);
    state.player.highestCompletedLevel = levels.length ? Math.max.apply(Math, levels) : Math.max(0, Number(state.player.highestCompletedLevel) || 0);
    if (!state.settings.preferredDiff) {
      state.settings.preferredDiff = getPreferredDiffForGame(state, GAME_KEYS[0]);
    }
  }

  function getRewardProgress(state) {
    const raw = state && state.rewardProgress && typeof state.rewardProgress === "object"
      ? state.rewardProgress
      : {};
    const consecutiveGameKey = GAME_BADGES[raw.consecutiveGameKey] ? raw.consecutiveGameKey : "";
    return {
      consecutiveGameKey,
      consecutiveGameCount: Math.max(0, Number(raw.consecutiveGameCount) || 0)
    };
  }

  function setRewardProgress(state, gameKey) {
    if (!state) {
      return;
    }
    const current = getRewardProgress(state);
    const nextGameKey = GAME_BADGES[gameKey] ? gameKey : "";
    state.rewardProgress = {
      consecutiveGameKey: nextGameKey,
      consecutiveGameCount: nextGameKey && current.consecutiveGameKey === nextGameKey
        ? current.consecutiveGameCount + 1
        : (nextGameKey ? 1 : 0)
    };
  }

  function getShapesRunStreak(state) {
    const rewardProgress = getRewardProgress(state);
    return rewardProgress.consecutiveGameKey === "shapes"
      ? rewardProgress.consecutiveGameCount
      : 0;
  }

  function rankParticipants(participants) {
    return participants
      .slice()
      .sort((left, right) => {
        if (right.coins !== left.coins) {
          return right.coins - left.coins;
        }
        return String(left.name || left.id).localeCompare(String(right.name || right.id), "he");
      })
      .map((participant, index) => Object.assign({}, participant, { rank: index + 1 }));
  }

  function defaultState(defaultLives, initialLanguage, initialSoundEnabled) {
    const playerName = defaultPlayerName(initialLanguage);
    const defaultLevel = 0;
    const defaultDiff = "medium";
    return {
      version: 3,
      player: {
        id: "me",
        name: playerName,
        avatar: "lion",
        language: LANGUAGES[initialLanguage] ? initialLanguage : "he",
        coins: 0,
        highestCompletedLevel: defaultLevel,
        progressByGame: createGameProgressMap(defaultLevel),
        currentRank: 5
      },
      settings: {
        preferredDiff: defaultDiff,
        preferredDiffByGame: createPreferredDiffMap(defaultDiff),
        futureOption: "coming-soon",
        soundEnabled: initialSoundEnabled !== false,
        diffBoundsByGame: {},
        adaptiveDifficultyByGame: {}
      },
      participants: [
        { id: "me", name: playerName, avatar: "lion", coins: 0 },
        { id: "p2", name: "Dana", avatar: "tiger", coins: 135 },
        { id: "p3", name: "Noam", avatar: "penguin", coins: 98 },
        { id: "p4", name: "Maya", avatar: "frog", coins: 127 },
        { id: "p5", name: "Lior", avatar: "cat", coins: 112 }
      ],
      rewardProgress: {
        consecutiveGameKey: "",
        consecutiveGameCount: 0
      },
      messageCursor: 0
    };
  }

  function normalizeState(rawState, options) {
    const defaults = defaultState(options.defaultLives, options.initialLanguage, options.initialSoundEnabled);
    const next = deepClone(defaults);
    const source = rawState && typeof rawState === "object" ? rawState : {};
    next.player = Object.assign({}, defaults.player, source.player || {});
    next.settings = Object.assign({}, defaults.settings, source.settings || {});
    next.rewardProgress = Object.assign({}, defaults.rewardProgress, source.rewardProgress || {});
    next.messageCursor = Number.isFinite(source.messageCursor) ? source.messageCursor : defaults.messageCursor;
    delete next.player.lives;

    const rawParticipants = Array.isArray(source.participants) ? source.participants : defaults.participants;
    const mergedParticipants = [];
    const seenIds = new Set();

    defaults.participants.forEach((participant) => {
      const incoming = rawParticipants.find((entry) => entry && entry.id === participant.id) || {};
      mergedParticipants.push(Object.assign({}, participant, incoming));
      seenIds.add(participant.id);
    });

    rawParticipants.forEach((participant) => {
      if (!participant || !participant.id || seenIds.has(participant.id)) {
        return;
      }
      mergedParticipants.push({
        id: String(participant.id),
        name: String(participant.name || participant.id),
        avatar: participant.avatar || defaults.player.avatar,
        coins: Math.max(0, Number(participant.coins) || 0)
      });
    });

    next.player.avatar = getAvatar(next.player.avatar).id;
    next.player.language = getLanguage(next.player.language).id;
    next.player.coins = Math.max(0, Number(next.player.coins) || defaults.player.coins);
    next.player.highestCompletedLevel = Math.max(0, Number(next.player.highestCompletedLevel) || defaults.player.highestCompletedLevel);
    next.player.progressByGame = next.player.progressByGame && typeof next.player.progressByGame === "object"
      ? Object.assign({}, next.player.progressByGame)
      : {};
    GAME_KEYS.forEach((gameKey) => {
      const rawGameProgress = next.player.progressByGame[gameKey];
      next.player.progressByGame[gameKey] = {
        highestCompletedLevel: Math.max(
          0,
          Number(rawGameProgress && rawGameProgress.highestCompletedLevel) || next.player.highestCompletedLevel
        )
      };
    });

    next.participants = mergedParticipants.map((participant) => ({
      id: String(participant.id || ""),
      name: String(participant.name || participant.id || ""),
      avatar: getAvatar(participant.avatar).id,
      coins: Math.max(0, Number(participant.coins) || 0)
    })).filter((participant) => participant.id);

    const meIndex = next.participants.findIndex((participant) => participant.id === "me");
    const meParticipant = {
      id: "me",
      name: next.player.name,
      avatar: next.player.avatar,
      coins: next.player.coins
    };

    if (meIndex === -1) {
      next.participants.push(meParticipant);
    } else {
      next.participants[meIndex] = Object.assign({}, next.participants[meIndex], meParticipant);
    }

    const ranked = rankParticipants(next.participants);
    const meRank = ranked.find((participant) => participant.id === "me");
    next.player.currentRank = meRank ? meRank.rank : defaults.player.currentRank;
    next.participants = ranked.map((participant) => ({
      id: participant.id,
      name: participant.name,
      avatar: participant.avatar,
      coins: participant.coins
    }));
    next.settings.diffBoundsByGame = next.settings.diffBoundsByGame && typeof next.settings.diffBoundsByGame === "object"
      ? Object.assign({}, next.settings.diffBoundsByGame)
      : {};
    next.settings.adaptiveDifficultyByGame = next.settings.adaptiveDifficultyByGame && typeof next.settings.adaptiveDifficultyByGame === "object"
      ? Object.assign({}, next.settings.adaptiveDifficultyByGame)
      : {};
    next.settings.preferredDiffByGame = next.settings.preferredDiffByGame && typeof next.settings.preferredDiffByGame === "object"
      ? Object.assign({}, next.settings.preferredDiffByGame)
      : {};
    GAME_KEYS.forEach((gameKey) => {
      next.settings.preferredDiffByGame[gameKey] = String(next.settings.preferredDiffByGame[gameKey] || next.settings.preferredDiff || defaults.settings.preferredDiff);
    });
    next.rewardProgress = getRewardProgress(next);
    syncLegacyProgressFields(next);

    return next;
  }

  function loadState(options) {
    try {
      const raw = window.localStorage ? window.localStorage.getItem(STORAGE_KEY) : "";
      if (!raw) {
        const created = normalizeState(null, options);
        saveState(created);
        return created;
      }
      return normalizeState(JSON.parse(raw), options);
    } catch (_) {
      const fallback = normalizeState(null, options);
      saveState(fallback);
      return fallback;
    }
  }

  function saveState(state) {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch (_) {}
  }

  function getStatusSnapshot(state, gameKey) {
    const ranked = rankParticipants(state.participants);
    const playerRank = ranked.find((participant) => participant.id === "me");
    const gameProgress = getGameProgress(state, gameKey);
    const bestLevel = Math.max(0, Number(gameProgress.highestCompletedLevel) || 0);
    const rewardProgress = getRewardProgress(state);
    return {
      player: deepClone(Object.assign({}, state.player, {
        currentRank: playerRank ? playerRank.rank : state.player.currentRank,
        highestCompletedLevel: bestLevel
      })),
      participants: ranked,
      economy: {
        consecutiveGameKey: rewardProgress.consecutiveGameKey,
        consecutiveGameCount: rewardProgress.consecutiveGameCount,
        shapesRunStreak: getShapesRunStreak(state)
      },
      nextLevel: bestLevel + 1,
      bestLevel
    };
  }

  function nextMessage(state) {
    const index = state.messageCursor % MESSAGES_HE.length;
    const message = MESSAGES_HE[index];
    state.messageCursor = (index + 1) % MESSAGES_HE.length;
    return message;
  }

  function buildTestResultsPreview(state, gameKey) {
    const snapshot = getStatusSnapshot(state, gameKey);
    const otherParticipants = rankParticipants(
      (state.participants || []).filter((participant) => participant.id !== "me")
    ).slice(0, 4);

    while (otherParticipants.length < 4) {
      const fallbackIndex = otherParticipants.length + 1;
      otherParticipants.push({
        id: "preview-bot-" + fallbackIndex,
        name: "Player " + fallbackIndex,
        avatar: AVATARS[fallbackIndex % AVATARS.length].id,
        coins: 0
      });
    }

    const leaderCoins = Math.max(180, Math.max(0, Number(snapshot.player.coins) || 0) + 40);
    const trailingCoins = [
      Math.max(leaderCoins - 4, 0),
      Math.max(Math.round(leaderCoins * 0.52), 0),
      Math.max(Math.round(leaderCoins * 0.47), 0),
      Math.max(Math.round(leaderCoins * 0.43), 0)
    ];
    const afterParticipants = [
      {
        id: "me",
        name: state.player.name,
        avatar: state.player.avatar,
        coins: leaderCoins
      }
    ].concat(otherParticipants.map((participant, index) => Object.assign({}, participant, {
      coins: trailingCoins[index]
    })));
    const beforeParticipants = [
      {
        id: "me",
        name: state.player.name,
        avatar: state.player.avatar,
        coins: Math.max(leaderCoins - 8, 0)
      },
      Object.assign({}, otherParticipants[0], { coins: Math.max(leaderCoins - 3, 0) }),
      Object.assign({}, otherParticipants[1], { coins: Math.max(trailingCoins[1] + 3, 0) }),
      Object.assign({}, otherParticipants[2], { coins: Math.max(trailingCoins[2] + 2, 0) }),
      Object.assign({}, otherParticipants[3], { coins: trailingCoins[3] })
    ];
    const afterRanks = rankParticipants(afterParticipants);
    const beforeRanks = rankParticipants(beforeParticipants);
    const previewState = deepClone(state);
    previewState.player.coins = leaderCoins;
    previewState.player.currentRank = 1;
    previewState.player.progressByGame = Object.assign({}, previewState.player.progressByGame, {
      [gameKey]: {
        highestCompletedLevel: snapshot.nextLevel
      }
    });
    previewState.participants = afterRanks.map((participant) => ({
      id: participant.id,
      name: participant.name,
      avatar: participant.avatar,
      coins: participant.coins
    }));
    syncLegacyProgressFields(previewState);

    const previewMessageState = deepClone(state);

    return {
      state: previewState,
      resultContext: {
        beforeRanks,
        afterRanks,
        message: nextMessage(previewMessageState),
        previewOnly: true,
        metrics: {
          accuracy: 1,
          bestStreak: Math.max(7, snapshot.nextLevel + 3),
          coinsEarned: 17,
          elapsedMs: 38000,
          endedBy: "target"
        }
      }
    };
  }

  function getDifficultyBounds(state, gameKey, diffOptions) {
    const fallbackKey = diffOptions.length ? diffOptions[0].key : "medium";
    const lastKey = diffOptions.length ? diffOptions[diffOptions.length - 1].key : fallbackKey;
    const raw = state && state.settings && state.settings.diffBoundsByGame && gameKey
      ? state.settings.diffBoundsByGame[gameKey]
      : null;
    let minIndex = diffOptions.findIndex((option) => option.key === (raw && raw.min));
    let maxIndex = diffOptions.findIndex((option) => option.key === (raw && raw.max));
    if (minIndex < 0) {
      minIndex = 0;
    }
    if (maxIndex < 0) {
      maxIndex = diffOptions.length - 1;
    }
    if (maxIndex < minIndex) {
      maxIndex = minIndex;
    }
    return {
      minIndex,
      maxIndex,
      minKey: diffOptions[minIndex] ? diffOptions[minIndex].key : fallbackKey,
      maxKey: diffOptions[maxIndex] ? diffOptions[maxIndex].key : lastKey
    };
  }

  function autoDifficultyForState(diffOptions, state, extra) {
    if (!diffOptions.length) {
      return "medium";
    }
    const difficultyApi = window.GAMES_V2_DIFFICULTY;
    if (!difficultyApi || typeof difficultyApi.getNextDifficulty !== "function") {
      const bounds = getDifficultyBounds(state, extra && extra.gameKey, diffOptions);
      const index = randomInt(Math.random, bounds.minIndex, bounds.maxIndex);
      return diffOptions[index] ? diffOptions[index].key : "medium";
    }
    const gameKey = extra && extra.gameKey;
    const adaptiveState = getAdaptiveDifficultyState(state, gameKey, diffOptions);
    const bounds = getDifficultyBounds(state, gameKey, diffOptions);
    return difficultyApi.getNextDifficulty({
      difficultyOrder: diffOptions.map((option) => option.key),
      minDifficulty: bounds.minKey,
      maxDifficulty: bounds.maxKey
    }, adaptiveState);
  }

  function getAdaptiveDifficultyState(state, gameKey, diffOptions) {
    const difficultyApi = window.GAMES_V2_DIFFICULTY;
    if (!difficultyApi || typeof difficultyApi.normalizeState !== "function" || !diffOptions.length || !gameKey) {
      return null;
    }
    const bounds = getDifficultyBounds(state, gameKey, diffOptions);
    const preferredDiff = getPreferredDiffForGame(state, gameKey) || bounds.minKey;
    const rawState = state && state.settings && state.settings.adaptiveDifficultyByGame
      ? state.settings.adaptiveDifficultyByGame[gameKey]
      : null;
    return difficultyApi.normalizeState(Object.assign({
      currentDifficulty: preferredDiff,
      comfortableStreak: 0,
      strugglingStreak: 0,
      pendingRecoveryLevel: null
    }, rawState || {}), {
      difficultyOrder: diffOptions.map((option) => option.key),
      minDifficulty: bounds.minKey,
      maxDifficulty: bounds.maxKey
    });
  }

  function setAdaptiveDifficultyState(state, gameKey, nextAdaptiveState) {
    if (!state || !state.settings || !gameKey) {
      return;
    }
    state.settings.adaptiveDifficultyByGame = Object.assign({}, state.settings.adaptiveDifficultyByGame, {
      [gameKey]: deepClone(nextAdaptiveState || null)
    });
  }

  return {
    STORAGE_KEY,
    AVATARS,
    LANGUAGES,
    GAME_KEYS,
    MAX_VISIBLE_RESULT_ROWS,
    escapeHtml,
    deepClone,
    isTruthyFlag,
    getSearchParams,
    isTestModeEnabled,
    getDashboardLayoutOverride,
    getForcedDashboardAspectBand,
    hashString,
    seededRandom,
    randomInt,
    getCopy,
    getLanguage,
    getAvatar,
    labelForAvatar,
    diffLabel,
    applyHudDifficulty,
    defaultPlayerName,
    getGameBadge,
    createGameProgressMap,
    createPreferredDiffMap,
    getGameProgress,
    setGameCompletedLevel,
    getPreferredDiffForGame,
    setPreferredDiffForGame,
    syncLegacyProgressFields,
    getRewardProgress,
    setRewardProgress,
    getShapesRunStreak,
    rankParticipants,
    defaultState,
    normalizeState,
    loadState,
    saveState,
    getStatusSnapshot,
    nextMessage,
    buildTestResultsPreview,
    getDifficultyBounds,
    autoDifficultyForState,
    getAdaptiveDifficultyState,
    setAdaptiveDifficultyState
  };
})(window.GAMES_V2_UTILS);
