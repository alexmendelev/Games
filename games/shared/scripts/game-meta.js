window.GAMES_V2_META = (function (utils) {
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
    { id: "lion", image: "../shared/assets/avatars/lion.png", accent: "#f59e0b", labelHe: "אריה", labelEn: "Lion", legacyIds: ["avatar1"] },
    { id: "tiger", image: "../shared/assets/avatars/tiger.png", accent: "#f97316", labelHe: "טיגריס", labelEn: "Tiger", legacyIds: ["avatar2"] },
    { id: "penguin", image: "../shared/assets/avatars/penguin.png", accent: "#60a5fa", labelHe: "פינגווין", labelEn: "Penguin", legacyIds: ["avatar3"] },
    { id: "frog", image: "../shared/assets/avatars/frog.png", accent: "#34d399", labelHe: "צפרדע", labelEn: "Frog", legacyIds: ["avatar4"] },
    { id: "cat", image: "../shared/assets/avatars/cat.png", accent: "#f97316", labelHe: "חתול", labelEn: "Cat" },
    { id: "dog", image: "../shared/assets/avatars/dog.png", accent: "#f59e0b", labelHe: "כלב", labelEn: "Dog" },
    { id: "dolphin", image: "../shared/assets/avatars/dolphin.png", accent: "#38bdf8", labelHe: "דולפין", labelEn: "Dolphin" },
    { id: "bunny", image: "../shared/assets/avatars/bunny.png", accent: "#f9a8d4", labelHe: "ארנבון", labelEn: "Bunny" },
    { id: "rabbit", image: "../shared/assets/avatars/rabbit.png", accent: "#d8b4fe", labelHe: "ארנבת", labelEn: "Rabbit" },
    { id: "shark", image: "../shared/assets/avatars/shark.png", accent: "#67e8f9", labelHe: "כריש", labelEn: "Shark" },
    { id: "squirrel", image: "../shared/assets/avatars/squirrel.png", accent: "#fb923c", labelHe: "סנאי", labelEn: "Squirrel" },
    { id: "whale", image: "../shared/assets/avatars/whale.png", accent: "#818cf8", labelHe: "לווייתן", labelEn: "Whale" }
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

  function isTestModeEnabled() {
    try {
      const params = new window.URLSearchParams((window.location && window.location.search) || "");
      if (params.has("testMode")) {
        return isTruthyFlag(params.get("testMode"));
      }
      if (params.has("test")) {
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
      version: 2,
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
        diffBoundsByGame: {}
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

  function nextMessage(state) {
    const index = state.messageCursor % MESSAGES_HE.length;
    const message = MESSAGES_HE[index];
    state.messageCursor = (index + 1) % MESSAGES_HE.length;
    return message;
  }

  function buildPerformanceProfile(context, beforeRanks) {
    const shellApi = window.GAMES_V2_SHELL || {};
    const metrics = context && context.metrics ? context.metrics : {};
    const accuracy = utils.clamp(Number(metrics.accuracy) || 0, 0, 1);
    const coinsEarned = Math.max(0, Number(metrics.coinsEarned) || 0);
    const bestStreak = Math.max(0, Number(metrics.bestStreak) || 0);
    const playerBefore = Array.isArray(beforeRanks)
      ? beforeRanks.find((participant) => participant.id === "me")
      : null;
    const playerRank = Math.max(1, Number(playerBefore && playerBefore.rank) || 1);
    let score = 0;
    score += accuracy * 0.55;
    score += utils.clamp(coinsEarned / 3, 0, 1) * 0.2;
    score += utils.clamp(bestStreak / 10, 0, 1) * 0.15;
    if ((metrics.endedBy || "target") !== "time") {
      score += 0.1;
    }
    score = utils.clamp(score, 0, 1);
    const playerBonus = shellApi && typeof shellApi.getCompletionBonus === "function"
      ? shellApi.getCompletionBonus(context && context.diffKey, {
        gameKey: context && context.gameKey
      })
      : 1;

    return {
      metrics,
      accuracy,
      coinsEarned,
      bestStreak,
      playerRank,
      score,
      playerBonus: Math.max(1, Number(playerBonus) || 1)
    };
  }

  function competitorGapRange(context, direction) {
    const performanceScore = utils.clamp(Number(context.performanceScore) || 0, 0, 1);
    const coinsEarned = Math.max(0, Number(context.coinsEarned) || 0);
    const hotRun = performanceScore >= 0.9 || coinsEarned >= 5;
    const strongRun = performanceScore >= 0.76 || coinsEarned >= 3;
    if (direction === "ahead") {
      if (hotRun) {
        return { min: 1, max: 4 };
      }
      if (strongRun) {
        return { min: 2, max: 6 };
      }
      return { min: 3, max: 9 };
    }
    if (hotRun) {
      return { min: 1, max: 5 };
    }
    if (strongRun) {
      return { min: 2, max: 7 };
    }
    return { min: 3, max: 10 };
  }

  function getLeaderboardPressure(context) {
    const playerBonus = Math.max(1, Number(context && context.playerBonus) || 1);
    const coinsEarned = Math.max(0, Number(context && context.coinsEarned) || 0);
    const normalizedBonus = utils.clamp((playerBonus - 1) / 7, 0, 1);
    let pressure = 0.35 + (normalizedBonus * 0.65);

    if (coinsEarned >= 8) {
      pressure = Math.max(pressure, 0.92);
    } else if (coinsEarned >= 5) {
      pressure = Math.max(pressure, 0.75);
    } else if (coinsEarned >= 3) {
      pressure = Math.max(pressure, 0.58);
    }

    if (context && context.gameKey === "shapes") {
      const shapesRunStreak = Math.max(0, Number(context.shapesRunStreak) || 0);
      const streakPenalty = Math.max(0, 1 - (Math.min(10, shapesRunStreak) / 10));
      pressure *= 0.45 * streakPenalty;
    }

    return utils.clamp(pressure, 0, 1);
  }

  function applyPressureToRange(range, pressure) {
    const safeRange = range && typeof range === "object" ? range : { min: 0, max: 0 };
    const scaledMin = Math.max(0, Math.floor((Number(safeRange.min) || 0) * pressure));
    const scaledMax = Math.max(scaledMin, Math.round((Number(safeRange.max) || 0) * pressure));
    return {
      min: scaledMin,
      max: scaledMax
    };
  }

  function tightenCompetitionAroundPlayer(participants, context) {
    const ranked = rankParticipants(participants);
    const playerIndex = ranked.findIndex((participant) => participant.id === "me");
    if (playerIndex < 0) {
      return ranked;
    }

    const adjusted = ranked.map((participant) => Object.assign({}, participant));
    const player = adjusted[playerIndex];
    const pressure = getLeaderboardPressure(context);

    function seededGap(participantId, direction, minGap, maxGap) {
      const rng = seededRandom(hashString([
        context.gameKey,
        context.completedLevel,
        participantId,
        direction,
        player.coins,
        context.coinsEarned,
        context.performanceScore
      ].join("|")));
      return randomInt(rng, minGap, maxGap);
    }

    const ahead = adjusted[playerIndex - 1];
    if (ahead) {
      const range = applyPressureToRange(competitorGapRange(context, "ahead"), pressure);
      const targetGap = seededGap(ahead.id, "ahead", range.min, range.max);
      let desiredCoins = player.coins + targetGap;
      const hardCeiling = playerIndex >= 2 ? adjusted[playerIndex - 2].coins - 1 : desiredCoins;
      desiredCoins = Math.min(desiredCoins, hardCeiling);
      if (desiredCoins > player.coins) {
        ahead.coins = desiredCoins;
      }
    }

    const behind = adjusted[playerIndex + 1];
    if (behind) {
      const range = applyPressureToRange(competitorGapRange(context, "behind"), pressure);
      const targetGap = seededGap(behind.id, "behind", range.min, range.max);
      let desiredCoins = Math.max(0, player.coins - targetGap);
      const floor = playerIndex + 2 < adjusted.length ? adjusted[playerIndex + 2].coins + 1 : 0;
      desiredCoins = Math.max(desiredCoins, floor);
      if (desiredCoins < player.coins) {
        behind.coins = desiredCoins;
      }
    }

    return adjusted;
  }

  function simulateCompetitorProgress(participants, context) {
    const pressure = getLeaderboardPressure(context);
    const progressed = participants.map((participant, index) => {
      if (participant.id === "me") {
        return Object.assign({}, participant);
      }
      const seed = hashString([
        context.gameKey,
        context.completedLevel,
        participant.id,
        participant.coins,
        context.playerCoins,
        index
      ].join("|"));
      const rng = seededRandom(seed);
      const gapToPlayer = participant.coins - context.playerCoins;
      const aheadOfPlayer = gapToPlayer >= 0;
      let minGain = 1;
      let maxGain = 3;

      if (context.performanceScore >= 0.92) {
        minGain = aheadOfPlayer ? 0 : 1;
        maxGain = aheadOfPlayer ? 1 : 2;
      } else if (context.performanceScore >= 0.78) {
        minGain = aheadOfPlayer ? 0 : 1;
        maxGain = aheadOfPlayer ? 2 : 2;
      } else if (context.performanceScore >= 0.6) {
        minGain = aheadOfPlayer ? 1 : 1;
        maxGain = aheadOfPlayer ? 2 : 3;
      } else {
        minGain = aheadOfPlayer ? 2 : 1;
        maxGain = aheadOfPlayer ? 4 : 3;
      }

      if (context.playerRank >= 4 && aheadOfPlayer) {
        maxGain = Math.max(0, maxGain - 1);
        minGain = Math.min(minGain, maxGain);
      }
      if (gapToPlayer > 120) {
        maxGain = Math.min(maxGain, context.performanceScore >= 0.78 ? 0 : 1);
        minGain = Math.min(minGain, maxGain);
      } else if (gapToPlayer > 45 && context.performanceScore >= 0.78) {
        maxGain = Math.min(maxGain, 1);
        minGain = Math.min(minGain, maxGain);
      }

      minGain = Math.max(0, Math.floor(minGain * pressure));
      maxGain = Math.max(minGain, Math.round(maxGain * pressure));

      const delta = randomInt(rng, minGain, maxGain);
      return Object.assign({}, participant, {
        coins: participant.coins + delta
      });
    });
    return tightenCompetitionAroundPlayer(progressed, context);
  }

  function applyRoundResult(state, context) {
    const beforeRanks = rankParticipants(state.participants);
    const nextState = deepClone(state);
    const performance = buildPerformanceProfile(context, beforeRanks);
    const totalPlayerCoins = Math.max(0, Number(context.playerCoins) || nextState.player.coins) + performance.playerBonus;
    nextState.player.coins = totalPlayerCoins;
    setGameCompletedLevel(nextState, context.gameKey, context.completedLevel);
    setRewardProgress(nextState, context.gameKey);
    syncLegacyProgressFields(nextState);
    nextState.participants = nextState.participants.map((participant) => {
      if (participant.id !== "me") {
        return participant;
      }
      return Object.assign({}, participant, {
        name: nextState.player.name,
        avatar: nextState.player.avatar,
        coins: totalPlayerCoins
      });
    });
    nextState.participants = simulateCompetitorProgress(nextState.participants, {
      gameKey: context.gameKey,
      completedLevel: getGameProgress(nextState, context.gameKey).highestCompletedLevel,
      playerCoins: totalPlayerCoins,
      playerRank: performance.playerRank,
      performanceScore: performance.score,
      coinsEarned: performance.coinsEarned,
      playerBonus: performance.playerBonus,
      shapesRunStreak: getShapesRunStreak(nextState)
    });

    const afterRanks = rankParticipants(nextState.participants);
    const meAfter = afterRanks.find((participant) => participant.id === "me");
    nextState.player.currentRank = meAfter ? meAfter.rank : nextState.player.currentRank;
    nextState.participants = afterRanks.map((participant) => ({
      id: participant.id,
      name: participant.name,
      avatar: participant.avatar,
      coins: participant.coins
    }));

    return {
      state: nextState,
      beforeRanks,
      afterRanks,
      message: nextMessage(nextState),
      playerBonus: performance.playerBonus
    };
  }

  function iconMarkup(path, alt, className) {
    return "<img class=\"" + className + "\" src=\"" + path + "\" alt=\"" + escapeHtml(alt) + "\">";
  }

  function choiceImageMarkup(path, className) {
    return "<span class=\"metaChoiceVisual " + (className || "") + "\" aria-hidden=\"true\">" +
      "<img class=\"metaChoiceVisualImage\" src=\"" + escapeHtml(path) + "\" alt=\"\">" +
    "</span>";
  }

  function choiceFlagMarkup(flag, className) {
    return "<span class=\"metaChoiceVisual " + (className || "") + "\" aria-hidden=\"true\">" + escapeHtml(flag) + "</span>";
  }

  function heartIconMarkup(alt, className) {
    return "<svg class=\"" + className + "\" viewBox=\"0 0 24 24\" aria-label=\"" + escapeHtml(alt) + "\" role=\"img\">" +
      "<path fill=\"currentColor\" d=\"M12 21.35 10.55 20C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54Z\"/>" +
    "</svg>";
  }

  function settingsIconMarkup() {
    return "<svg class=\"metaIconGlyph\" viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\">" +
      "<path fill=\"currentColor\" d=\"M19.44 12.99c.04-.32.06-.65.06-.99s-.02-.67-.06-.99l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.18 7.18 0 0 0-1.71-.99l-.36-2.54a.5.5 0 0 0-.49-.42h-3.84a.5.5 0 0 0-.49.42l-.36 2.54c-.61.24-1.18.57-1.71.99l-2.39-.96a.5.5 0 0 0-.6.22L2.3 8.79a.5.5 0 0 0 .12.64l2.03 1.58c-.04.32-.06.65-.06.99s.02.67.06.99L2.42 14.57a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.53.42 1.1.75 1.71.99l.36 2.54a.5.5 0 0 0 .49.42h3.84a.5.5 0 0 0 .49-.42l.36-2.54c.61-.24 1.18-.57 1.71-.99l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z\"/>" +
    "</svg>";
  }

  function autoDifficultyForState(diffOptions, state, extra) {
    if (!diffOptions.length) {
      return "medium";
    }
    const bounds = getDifficultyBounds(state, extra && extra.gameKey, diffOptions);
    const index = randomInt(Math.random, bounds.minIndex, bounds.maxIndex);
    return diffOptions[index] ? diffOptions[index].key : "medium";
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

  function avatarImageMarkup(avatar, className) {
    return "<img class=\"" + escapeHtml(className || "metaAvatarImage") + "\" src=\"" + escapeHtml(avatar.image || "") + "\" alt=\"\">";
  }

  function avatarTokenMarkup(avatarId, languageId, extraClassName) {
    const avatar = getAvatar(avatarId);
    const label = labelForAvatar(avatar.id, languageId);
    return "<span class=\"metaAvatarToken " + (extraClassName || "") + "\" style=\"--avatar-accent: " + escapeHtml(avatar.accent) + "\" aria-label=\"" + escapeHtml(label) + "\">" +
      avatarImageMarkup(avatar, "metaAvatarImage metaAvatarImage--token") +
    "</span>";
  }

  function buildStatusPills(snapshot, languageId, resultContext) {
    const copy = getCopy(languageId);
    const metrics = resultContext && resultContext.metrics ? resultContext.metrics : null;
    const coinsLabel = metrics ? copy.coinsEarned : copy.coins;
    const coinsValue = metrics
      ? "+" + Math.max(0, Number(metrics.coinsEarned) || 0)
      : snapshot.player.coins;
    const levelLabel = metrics ? copy.levelPassed : copy.bestLevel;
    const levelValue = Math.max(0, Number(snapshot.bestLevel) || 0);
    const items = [
      "<div class=\"metaStatusChip\">" +
        iconMarkup("../shared/assets/ui/coin.svg", coinsLabel, "metaStatusIcon") +
        "<div class=\"metaStatusValueWrap\"><span class=\"metaStatusLabel\">" + escapeHtml(coinsLabel) + "</span><strong class=\"metaStatusValue\">" + escapeHtml(coinsValue) + "</strong></div>" +
      "</div>",
      "<div class=\"metaStatusChip\">" +
        iconMarkup("../shared/assets/ui/star.svg", levelLabel, "metaStatusIcon") +
        "<div class=\"metaStatusValueWrap\"><span class=\"metaStatusLabel\">" + escapeHtml(levelLabel) + "</span><strong class=\"metaStatusValue\">" + escapeHtml(levelValue) + "</strong></div>" +
      "</div>"
    ];
    return {
      count: items.length,
      markup: items.join("")
    };
  }

  function buildLeaderboardSectionMarkup(rows, languageId, copy, expandedRows, pinnedId) {
    const listDirClass = getLanguage(languageId).dir === "rtl" ? " is-rtl" : " is-ltr";
    const rowDirClass = getLanguage(languageId).dir === "rtl" ? " is-rtl" : " is-ltr";
    const showAllRows = expandedRows === "all";
    const visibleRows = showAllRows
      ? { rows: Array.isArray(rows) ? rows.slice() : [] }
      : getVisibleResultRows(rows, expandedRows, pinnedId);
    const canToggleRows = !showAllRows && Array.isArray(rows) && rows.length > visibleRows.rows.length;
    const rowsMarkup = visibleRows.rows.map((participant) => {
      const avatar = getAvatar(participant.avatar);
      const isCurrent = participant.id === pinnedId;
      return "<div class=\"metaLeaderboardRow" + rowDirClass + (isCurrent ? " is-current" : "") + "\" data-participant-id=\"" + escapeHtml(participant.id) + "\" data-after-rank=\"" + escapeHtml(participant.rank) + "\">" +
        "<div class=\"metaLeaderboardRank\">#" + escapeHtml(participant.rank) + "</div>" +
        "<div class=\"metaLeaderboardAvatarCell\">" + avatarTokenMarkup(avatar.id, languageId, "metaLeaderboardAvatar") + "</div>" +
        "<div class=\"metaLeaderboardNameCell\"><strong class=\"metaLeaderboardName\">" + escapeHtml(participant.name) + "</strong></div>" +
        "<div class=\"metaLeaderboardCoins\"><strong>" + escapeHtml(participant.coins) + "</strong></div>" +
        "<div class=\"metaLeaderboardCoinIcon\">" + iconMarkup("../shared/assets/ui/coin.svg", copy.coins, "metaInlineIcon") + "</div>" +
      "</div>";
    }).join("");
    return {
      markup: "<section class=\"metaDashboardSection metaDashboardSection--leaderboard\" aria-label=\"" + escapeHtml(copy.leaderboard) + "\">" +
        "<div class=\"metaLeaderboardList" + listDirClass + "\" data-row-count=\"" + escapeHtml(visibleRows.rows.length) + "\">" + rowsMarkup + "</div>" +
        (canToggleRows
          ? "<button class=\"metaGhostButton metaLeaderboardMoreButton\" type=\"button\" data-action=\"toggle-results-rows\">" + escapeHtml(expandedRows ? copy.showLess : copy.showMore) + "</button>"
          : "") +
      "</section>",
      visibleCount: visibleRows.rows.length
    };
  }

  function getStartLeaderboardRows(rows, pinnedId, currentPlayer) {
    const rankedRows = Array.isArray(rows) ? rows.slice() : [];
    if (pinnedId && currentPlayer && !rankedRows.some((participant) => participant && participant.id === pinnedId)) {
      rankedRows.push({
        id: pinnedId,
        name: String(currentPlayer.name || defaultPlayerName(currentPlayer.language || "he")),
        avatar: currentPlayer.avatar || "lion",
        coins: Math.max(0, Number(currentPlayer.coins) || 0),
        rank: Math.max(1, Number(currentPlayer.currentRank) || (rankedRows.length + 1))
      });
      rankedRows.sort((left, right) => {
        const leftRank = Math.max(0, Number(left && left.rank) || 0);
        const rightRank = Math.max(0, Number(right && right.rank) || 0);
        return leftRank - rightRank;
      });
    }
    while (rankedRows.length < MAX_VISIBLE_RESULT_ROWS) {
      const fallbackIndex = rankedRows.length + 1;
      rankedRows.push({
        id: "start-fallback-" + fallbackIndex,
        name: "Player " + fallbackIndex,
        avatar: AVATARS[fallbackIndex % AVATARS.length].id,
        coins: 0,
        rank: fallbackIndex
      });
    }
    if (rankedRows.length <= MAX_VISIBLE_RESULT_ROWS) {
      return rankedRows;
    }
    const cappedRows = rankedRows.slice(0, MAX_VISIBLE_RESULT_ROWS);
    const pinnedIndex = rankedRows.findIndex((participant) => participant.id === pinnedId);
    if (pinnedIndex === -1 || pinnedIndex < MAX_VISIBLE_RESULT_ROWS) {
      return cappedRows;
    }
    cappedRows[MAX_VISIBLE_RESULT_ROWS - 1] = rankedRows[pinnedIndex];
    return cappedRows;
  }

  function buildStartLeaderboardTableMarkup(rows, languageId, copy, pinnedId) {
    const isRtl = getLanguage(languageId).dir === "rtl";
    const rowsMarkup = (Array.isArray(rows) ? rows : []).map((participant) => {
      const avatar = getAvatar(participant.avatar);
      const isCurrent = participant.id === pinnedId;
      const rankCell = "<div class=\"metaStartLeaderboardCell metaStartLeaderboardCell--rank\">#" + escapeHtml(participant.rank) + "</div>";
      const avatarCell = "<div class=\"metaStartLeaderboardCell metaStartLeaderboardCell--avatar\">" + avatarTokenMarkup(avatar.id, languageId, "metaLeaderboardAvatar") + "</div>";
      const nameCell = "<div class=\"metaStartLeaderboardCell metaStartLeaderboardCell--name\"><strong class=\"metaLeaderboardName\">" + escapeHtml(participant.name) + "</strong></div>";
      const coinsCell = "<div class=\"metaStartLeaderboardCell metaStartLeaderboardCell--coins\"><strong>" + escapeHtml(participant.coins) + "</strong></div>";
      const coinIconCell = "<div class=\"metaStartLeaderboardCell metaStartLeaderboardCell--coin-icon\">" + iconMarkup("../shared/assets/ui/coin.svg", copy.coins, "metaInlineIcon") + "</div>";
      const cells = isRtl
        ? [coinIconCell, coinsCell, nameCell, avatarCell, rankCell]
        : [rankCell, avatarCell, nameCell, coinsCell, coinIconCell];
      return "<div class=\"metaStartLeaderboardRow" + (isCurrent ? " is-current" : "") + (isRtl ? " is-rtl" : " is-ltr") + "\" data-participant-id=\"" + escapeHtml(participant.id) + "\">" +
        cells.join("") +
      "</div>";
    }).join("");
    return "<section class=\"metaDashboardSection metaDashboardSection--leaderboard\" aria-label=\"" + escapeHtml(copy.leaderboard) + "\">" +
      "<div class=\"metaStartLeaderboardList" + (isRtl ? " is-rtl" : " is-ltr") + "\" dir=\"" + escapeHtml(isRtl ? "rtl" : "ltr") + "\">" +
        rowsMarkup +
      "</div>" +
    "</section>";
  }

  function buildDashboardMarkup(state, selectedDiff, options) {
    const safeOptions = options || {};
    const languageId = state.player.language;
    const copy = getCopy(languageId);
    const language = getLanguage(languageId);
    const snapshot = getStatusSnapshot(state, safeOptions.gameKey);
    const playerName = String(state.player.name || "").replace(/\s+/g, " ").trim() || defaultPlayerName(languageId);
    const difficultyText = diffLabel(selectedDiff, languageId);
    const resultContext = safeOptions.resultContext || null;
    const isResults = !!resultContext;
    const statusPills = buildStatusPills(snapshot, languageId, resultContext);
    const profileHint = difficultyText;
    const primaryAction = isResults ? "continue-level" : "start-level";
    const primaryLabel = isResults
      ? copy.continueLevel(snapshot.nextLevel, difficultyText)
      : copy.startLevel(snapshot.nextLevel, difficultyText);
    const leaderboardSource = resultContext && Array.isArray(resultContext.afterRanks) && resultContext.afterRanks.length
      ? resultContext.afterRanks
      : snapshot.participants;
    const leaderboardRows = isResults
      ? leaderboardSource
      : getStartLeaderboardRows(leaderboardSource, "me", snapshot.player);
    const leaderboardSection = isResults
      ? buildLeaderboardSectionMarkup(leaderboardRows, languageId, copy, "all", "me")
      : { markup: buildStartLeaderboardTableMarkup(leaderboardRows, languageId, copy, "me") };
    const previewButton = safeOptions.testMode && !isResults
      ? "<button class=\"metaGhostButton metaDashboardPreviewButton\" type=\"button\" data-action=\"preview-results\">" + escapeHtml(copy.previewResults) + "</button>"
      : "";
    const cardClassName = isResults
      ? "metaCard metaCard--results metaCard--dashboard metaCard--dashboard-results"
      : "metaCard metaCard--dashboard metaCard--dashboard-start";

    return "<div class=\"" + cardClassName + "\" dir=\"" + escapeHtml(language.dir) + "\">" +
      "<div class=\"metaDashboardBoard\">" +
        "<section class=\"metaDashboardPanel metaDashboardPanel--logo\">" +
          buildGameBadgeMarkup(safeOptions.gameKey, languageId) +
        "</section>" +
        "<section class=\"metaDashboardPanel metaDashboardPanel--summary\">" +
          "<button class=\"metaProfileButton metaProfileButton--dashboard metaDashboardIdentityCard\" type=\"button\" data-action=\"open-profile\">" +
            avatarTokenMarkup(state.player.avatar, languageId, "metaHeroAvatar") +
            "<span class=\"metaProfileButtonText\">" +
              "<strong class=\"metaProfileName\">" + escapeHtml(playerName) + "</strong>" +
              "<span class=\"metaProfileHint\">" + escapeHtml(profileHint) + "</span>" +
            "</span>" +
          "</button>" +
          "<div class=\"metaStatusGrid metaStatusGrid--" + escapeHtml(statusPills.count) + "\">" + statusPills.markup + "</div>" +
          "<button class=\"metaGhostButton metaDashboardSettingsCard\" type=\"button\" data-action=\"open-settings\" aria-label=\"" + escapeHtml(copy.settings) + "\" title=\"" + escapeHtml(copy.settings) + "\">" +
            "<span class=\"metaDashboardToolIcon\" aria-hidden=\"true\">" + settingsIconMarkup() + "</span>" +
            "<span class=\"metaDashboardSettingsLabel\">" + escapeHtml(copy.settings) + "</span>" +
          "</button>" +
          previewButton +
        "</section>" +
        leaderboardSection.markup +
      "</div>" +
      "<div class=\"metaResultsActions metaDashboardActions\">" +
        "<button class=\"metaGhostButton metaResultsExitButton\" type=\"button\" data-action=\"exit-game\">" + escapeHtml(copy.exit) + "</button>" +
        "<button class=\"metaPrimaryButton metaResultsContinueButton\" type=\"button\" data-action=\"" + primaryAction + "\">" + escapeHtml(primaryLabel) + "</button>" +
      "</div>" +
    "</div>";
  }

  function buildAvatarButtons(state, languageId, actionName, avatarOptions) {
    const nextAction = actionName || "pick-avatar";
    const source = Array.isArray(avatarOptions) && avatarOptions.length ? avatarOptions : AVATARS;
    return source.map((avatar) => {
      const selectedClass = avatar.id === state.player.avatar ? " is-selected" : "";
      const label = languageId === "en" ? avatar.labelEn : avatar.labelHe;
      return "<button class=\"metaChoiceButton metaAvatarButton" + selectedClass + "\" type=\"button\" data-action=\"" + escapeHtml(nextAction) + "\" data-avatar=\"" + escapeHtml(avatar.id) + "\" style=\"--avatar-accent: " + escapeHtml(avatar.accent) + "\" aria-label=\"" + escapeHtml(label) + "\" title=\"" + escapeHtml(label) + "\">" +
        "<span class=\"metaAvatarButtonIcon\" aria-hidden=\"true\">" + avatarImageMarkup(avatar, "metaAvatarImage metaAvatarImage--button") + "</span>" +
      "</button>";
    }).join("");
  }

  function buildLanguageButtons(state) {
    return Object.keys(LANGUAGES).map((languageId) => {
      const selectedClass = state.player.language === languageId ? " is-selected" : "";
      const language = getLanguage(languageId);
      return "<button class=\"metaChoiceButton metaLanguageButton" + selectedClass + "\" type=\"button\" data-action=\"pick-language\" data-language=\"" + escapeHtml(languageId) + "\">" +
        choiceFlagMarkup(language.flag || "", "metaFlagVisual") +
        "<span class=\"metaChoiceLabel\">" + escapeHtml(language.label) + "</span>" +
      "</button>";
    }).join("");
  }

  function buildDifficultyBoundControl(state, gameKey, diffOptions, boundType) {
    const languageId = state.player.language;
    const bounds = getDifficultyBounds(state, gameKey, diffOptions);
    const selectedKey = boundType === "min" ? bounds.minKey : bounds.maxKey;
    const selectedIndex = boundType === "min" ? bounds.minIndex : bounds.maxIndex;
    const maxIndex = Math.max(0, diffOptions.length - 1);
    const upDisabled = selectedIndex >= maxIndex ? " disabled" : "";
    const downDisabled = selectedIndex <= 0 ? " disabled" : "";
    return "<div class=\"metaDiffStepper metaDiffStepper--" + escapeHtml(boundType) + "\">" +
      "<div class=\"metaDiffValue\">" + escapeHtml(diffLabel(selectedKey, languageId)) + "</div>" +
      "<div class=\"metaDiffStepperButtons\">" +
        "<button class=\"metaStepperButton\" type=\"button\" data-action=\"shift-diff-bound\" data-bound=\"" + escapeHtml(boundType) + "\" data-dir=\"up\" aria-label=\"Increase difficulty\"" + upDisabled + ">&#9650;</button>" +
        "<button class=\"metaStepperButton\" type=\"button\" data-action=\"shift-diff-bound\" data-bound=\"" + escapeHtml(boundType) + "\" data-dir=\"down\" aria-label=\"Decrease difficulty\"" + downDisabled + ">&#9660;</button>" +
      "</div>" +
    "</div>";
  }

  function buildSoundButtons(state) {
    const languageId = state.player.language;
    const copy = getCopy(languageId);
    const soundEnabled = !!state.settings.soundEnabled;
    const iconPath = soundEnabled ? "../shared/assets/ui/unmute.png" : "../shared/assets/ui/mute.png";
    const soundLabel = soundEnabled ? copy.soundOn : copy.soundOff;
    const soundClass = soundEnabled ? " metaSoundButton--on" : " metaSoundButton--off";
    return "<button class=\"metaChoiceButton metaSoundButton is-selected" + soundClass + "\" type=\"button\" data-action=\"pick-sound\" data-sound=\"toggle\">" +
      choiceImageMarkup(iconPath, "metaSoundVisual") +
      "<span class=\"metaChoiceLabel\">" + escapeHtml(soundLabel) + "</span>" +
    "</button>";
  }

  function buildGameBadgeMarkup(gameKey, languageId) {
    const badge = getGameBadge(gameKey, languageId);
    return "<div class=\"metaGameBadge metaGameBadge--art\" aria-label=\"" + escapeHtml(badge.label) + "\">" +
      "<img class=\"metaGameBadgeArt\" src=\"" + escapeHtml(badge.menuIcon || "") + "\" alt=\"" + escapeHtml(badge.label) + "\">" +
    "</div>";
  }

  function buildSettingsPanelHeader(icon, label) {
    return "<div class=\"metaSettingPanelHead\">" +
      "<span class=\"metaSettingPanelIcon\" aria-hidden=\"true\">" + escapeHtml(icon) + "</span>" +
      "<h3 class=\"metaSettingPanelTitle\">" + escapeHtml(label) + "</h3>" +
    "</div>";
  }

  function buildStartMarkup(state, selectedDiff, options) {
    return buildDashboardMarkup(state, selectedDiff, options);
  }

  function buildSettingsMarkup(state, gameKey, diffOptions) {
    const languageId = state.player.language;
    const copy = getCopy(languageId);
    const language = getLanguage(languageId);
    const difficultyTitle = languageId === "he" ? "קושי" : "Difficulty";

    return "<div class=\"metaCard metaCard--settings\" dir=\"" + escapeHtml(language.dir) + "\">" +
      "<div class=\"metaCardHead metaCardHead--settings\">" +
        "<button class=\"metaGhostButton\" type=\"button\" data-action=\"close-settings\">" + escapeHtml(copy.settingsBack) + "</button>" +
        "<h2 class=\"metaTitle\">" + escapeHtml(copy.settingsTitle) + "</h2>" +
        "<div class=\"metaSettingsMascot\" aria-hidden=\"true\">🦉</div>" +
      "</div>" +
      "<div class=\"metaSettingsStack metaSettingsBoard\">" +
        "<div class=\"metaSettingsTop\">" +
          "<section class=\"metaSettingPanel metaSettingPanel--language\">" +
            buildSettingsPanelHeader("🌍", copy.language) +
            "<div class=\"metaChoiceGrid metaChoiceGrid--twoCols\">" + buildLanguageButtons(state) + "</div>" +
          "</section>" +
          "<section class=\"metaSettingPanel metaSettingPanel--sound\">" +
            buildSettingsPanelHeader("🔊", copy.sound) +
            "<div class=\"metaChoiceGrid metaChoiceGrid--single\">" + buildSoundButtons(state) + "</div>" +
          "</section>" +
        "</div>" +
        "<section class=\"metaSettingPanel metaSettingPanel--difficulty\">" +
          buildSettingsPanelHeader("⚙", difficultyTitle) +
          "<div class=\"metaDifficultyColumns\">" +
            "<div class=\"metaDifficultyColumn metaDifficultyColumn--min\">" +
              "<div class=\"metaSectionTitle metaSectionTitle--difficulty\">" + escapeHtml(copy.minDifficulty) + "</div>" +
              "<div class=\"metaChoiceGrid metaChoiceGrid--single\">" + buildDifficultyBoundControl(state, gameKey, diffOptions, "min") + "</div>" +
            "</div>" +
            "<div class=\"metaDifficultyColumn metaDifficultyColumn--max\">" +
              "<div class=\"metaSectionTitle metaSectionTitle--difficulty\">" + escapeHtml(copy.maxDifficulty) + "</div>" +
              "<div class=\"metaChoiceGrid metaChoiceGrid--single\">" + buildDifficultyBoundControl(state, gameKey, diffOptions, "max") + "</div>" +
            "</div>" +
          "</div>" +
        "</section>" +
      "</div>" +
    "</div>";
  }

  function buildProfileMarkup(state, draftProfile) {
    const languageId = state.player.language;
    const copy = getCopy(languageId);
    const language = getLanguage(languageId);
    const nameValue = draftProfile && typeof draftProfile.name === "string" ? draftProfile.name : state.player.name;
    const avatarValue = draftProfile && draftProfile.avatar ? draftProfile.avatar : state.player.avatar;

    return "<div class=\"metaCard metaCard--profile\" dir=\"" + escapeHtml(language.dir) + "\">" +
      "<div class=\"metaCardHead metaCardHead--profile\">" +
        "<button class=\"metaGhostButton\" type=\"button\" data-action=\"close-profile\">" + escapeHtml(copy.profileBack) + "</button>" +
      "</div>" +
      "<div class=\"metaSettingsStack metaSettingsStack--profile\">" +
        "<div class=\"metaProfilePreview\">" +
          avatarTokenMarkup(avatarValue, languageId, "metaProfileAvatar") +
        "</div>" +
        "<input id=\"metaPlayerName\" class=\"metaTextInput\" type=\"text\" maxlength=\"18\" value=\"" + escapeHtml(nameValue || "") + "\" placeholder=\"" + escapeHtml(copy.playerNamePlaceholder) + "\" data-role=\"player-name\">" +
        "<section class=\"metaSettingGroup metaSettingGroup--avatars\">" +
          "<div class=\"metaChoiceGrid metaChoiceGrid--avatars\">" + buildAvatarButtons({
            player: Object.assign({}, state.player, { avatar: avatarValue })
          }, languageId, "pick-profile-avatar", AVATARS) + "</div>" +
        "</section>" +
      "</div>" +
      "<button class=\"metaPrimaryButton\" type=\"button\" data-action=\"save-profile\">" + escapeHtml(copy.profileSave) + "</button>" +
    "</div>";
  }

  function buildRankDelta(copy, beforeRank, afterRank) {
    if (afterRank < beforeRank) {
      return { text: copy.rankUp(afterRank), kind: "up" };
    }
    if (afterRank > beforeRank) {
      return { text: copy.rankDown(afterRank), kind: "down" };
    }
    return { text: copy.holdingRank(afterRank), kind: "flat" };
  }

  function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.round((Number(ms) || 0) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + ":" + String(seconds).padStart(2, "0");
  }

  function formatPercent(value) {
    return Math.round(Math.max(0, Number(value) || 0) * 100) + "%";
  }

  function buildResultsSummaryMarkup(resultContext, copy) {
    const metrics = resultContext && resultContext.metrics;
    if (!metrics) {
      return "";
    }
    const outcomeLabel = metrics.endedBy === "time" ? copy.timeUp : copy.targetReached;
    const summaryBadges = [
      outcomeLabel,
      copy.accuracy + " " + formatPercent(metrics.accuracy),
      copy.coinsEarned + " +" + Math.max(0, Number(metrics.coinsEarned) || 0),
      copy.time + " " + formatDuration(metrics.elapsedMs)
    ].map((label) => {
      return "<span class=\"metaResultBadge\">" + escapeHtml(label) + "</span>";
    }).join("");
    return "<div class=\"metaResultsSummary\">" +
      "<div class=\"metaResultMetaRow\">" + summaryBadges + "</div>" +
    "</div>";
  }

  function getMaxVisibleResultRows(expanded) {
    if (expanded) {
      return MAX_VISIBLE_RESULT_ROWS;
    }
    const viewportWidth = Math.max(
      0,
      Number(window.innerWidth) ||
      Number(document && document.documentElement && document.documentElement.clientWidth) ||
      0
    );
    const viewportHeight = Math.max(
      0,
      Number(window.innerHeight) ||
      Number(document && document.documentElement && document.documentElement.clientHeight) ||
      0
    );
    const isLandscape = viewportWidth > viewportHeight;
    if (viewportHeight && viewportHeight <= 640) {
      return 2;
    }
    if (isLandscape && viewportHeight && viewportHeight <= 760) {
      return 2;
    }
    if (isLandscape && viewportHeight && viewportHeight <= 920) {
      return 3;
    }
    if (viewportHeight && viewportHeight <= 760) {
      return 2;
    }
    if (viewportHeight && viewportHeight <= 920) {
      return 3;
    }
    return MAX_VISIBLE_RESULT_ROWS;
  }

  function getVisibleResultRows(rows, expanded, pinnedId) {
    const rankedRows = Array.isArray(rows) ? rows.slice() : [];
    const maxVisibleRows = getMaxVisibleResultRows(expanded);
    if (expanded || rankedRows.length <= maxVisibleRows) {
      return {
        rows: rankedRows,
        hasHiddenRows: false,
        hiddenCount: 0
      };
    }
    const pinnedIndex = rankedRows.findIndex((participant) => participant.id === pinnedId);
    if (pinnedIndex >= maxVisibleRows) {
      const focusIndexes = new Set([0, pinnedIndex - 1, pinnedIndex, pinnedIndex + 1].filter((index) => index >= 0 && index < rankedRows.length));
      let backfillOffset = 2;
      while (focusIndexes.size < Math.min(maxVisibleRows, rankedRows.length)) {
        const beforeCandidate = pinnedIndex - backfillOffset;
        const afterCandidate = pinnedIndex + backfillOffset;
        if (beforeCandidate >= 0) {
          focusIndexes.add(beforeCandidate);
        }
        if (focusIndexes.size < Math.min(maxVisibleRows, rankedRows.length) && afterCandidate < rankedRows.length) {
          focusIndexes.add(afterCandidate);
        }
        backfillOffset += 1;
        if (beforeCandidate < 0 && afterCandidate >= rankedRows.length) {
          break;
        }
      }
      const sortedIndexes = Array.from(focusIndexes).sort((left, right) => left - right);
      const windowSize = Math.min(maxVisibleRows, rankedRows.length);
      let start = Math.max(0, sortedIndexes.indexOf(pinnedIndex) - Math.floor((windowSize - 1) / 2));
      let end = Math.min(sortedIndexes.length, start + windowSize);
      start = Math.max(0, end - windowSize);
      const uniqueIndexes = sortedIndexes.slice(start, end);
      return {
        rows: uniqueIndexes.map((index) => rankedRows[index]),
        hasHiddenRows: true,
        hiddenCount: rankedRows.length - uniqueIndexes.length
      };
    }
    return {
      rows: rankedRows.slice(0, maxVisibleRows),
      hasHiddenRows: true,
      hiddenCount: rankedRows.length - maxVisibleRows
    };
  }

  function buildResultsMarkup(resultContext, state, selectedDiff, gameKey, expandedRows) {
    return buildDashboardMarkup(state, selectedDiff, {
      gameKey,
      expandedRows,
      resultContext
    });
  }

  function createGameMeta(options) {
    const rawOptions = options || {};
    const settings = Object.assign({
      overlayEl: null,
      diffOptions: [],
      defaultLives: 5,
      initialLanguage: "he",
      initialSoundEnabled: true,
      testMode: isTestModeEnabled(),
      onStartRequested: null,
      onExitRequested: null,
      audio: null,
      fx: null,
      gameKey: window.location && window.location.pathname ? window.location.pathname : "game"
    }, rawOptions);
    if (!Object.prototype.hasOwnProperty.call(rawOptions, "initialSoundEnabled") && settings.audio && settings.audio.bgm && typeof settings.audio.bgm.isMuted === "function") {
      settings.initialSoundEnabled = !settings.audio.bgm.isMuted();
    }
    const overlayEl = settings.overlayEl;
    const diffOptions = (settings.diffOptions || []).map((option) => ({
      key: option.key,
      label: option.label || option.key
    }));

    let state = loadState({
      defaultLives: settings.defaultLives,
      initialLanguage: settings.initialLanguage,
      initialSoundEnabled: settings.initialSoundEnabled
    });
    let selectedDiff = getPreferredDiffForGame(state, settings.gameKey);
    if (!diffOptions.find((option) => option.key === selectedDiff)) {
      selectedDiff = diffOptions.length ? diffOptions[0].key : "medium";
    }
    let currentScreen = "start";
    let currentStartOptions = {};
    let resultContext = null;
    let resultRowsExpanded = false;
    let animateResultsOnRender = false;
    let continueResolver = null;
    let pendingStart = false;
    let draftProfile = null;
    let resultsPreviewState = null;

    function isSelectedDiffWithinBounds(extra) {
      if (!diffOptions.length) {
        return false;
      }
      const bounds = getDifficultyBounds(state, settings.gameKey, diffOptions);
      const selectedIndex = diffOptions.findIndex((option) => option.key === selectedDiff);
      return selectedIndex >= bounds.minIndex && selectedIndex <= bounds.maxIndex;
    }

    function rerollSelectedDiff(extra) {
      selectedDiff = autoDifficultyForState(diffOptions, state, Object.assign({
        gameKey: settings.gameKey
      }, currentStartOptions, extra || {}));
      return selectedDiff;
    }

    function resolveSelectedDiff(extra) {
      if (!isSelectedDiffWithinBounds(extra)) {
        return rerollSelectedDiff(extra);
      }
      return selectedDiff;
    }

    function persistDifficultyBounds(minKey, maxKey) {
      state.settings.diffBoundsByGame = Object.assign({}, state.settings.diffBoundsByGame, {
        [settings.gameKey]: {
          min: minKey,
          max: maxKey
        }
      });
    }

    function shiftDifficultyBound(boundType, direction) {
      if (!diffOptions.length) {
        return;
      }
      const delta = direction === "down" ? -1 : 1;
      const currentBounds = getDifficultyBounds(state, settings.gameKey, diffOptions);
      let minIndex = currentBounds.minIndex;
      let maxIndex = currentBounds.maxIndex;
      const limitIndex = diffOptions.length - 1;
      function clampIndex(index) {
        return Math.max(0, Math.min(limitIndex, index));
      }
      if (boundType === "min") {
        minIndex = clampIndex(minIndex + delta);
        if (minIndex > maxIndex) {
          maxIndex = minIndex;
        }
      } else {
        maxIndex = clampIndex(maxIndex + delta);
        if (maxIndex < minIndex) {
          minIndex = maxIndex;
        }
      }
      persistDifficultyBounds(diffOptions[minIndex].key, diffOptions[maxIndex].key);
      rerollSelectedDiff();
    }

    function syncAudioSetting() {
      if (!settings.audio || !settings.audio.bgm || typeof settings.audio.bgm.setMuted !== "function") {
        return;
      }
      settings.audio.bgm.setMuted(!state.settings.soundEnabled);
    }

    function persist() {
      setPreferredDiffForGame(state, settings.gameKey, selectedDiff);
      state.settings.preferredDiff = selectedDiff;
      syncLegacyProgressFields(state);
      saveState(state);
    }

    function syncOverlayUiState(isVisible) {
      if (!document || !document.documentElement) {
        return;
      }
      document.documentElement.setAttribute("data-meta-screen", currentScreen || "start");
      document.documentElement.setAttribute("data-meta-overlay", isVisible ? "open" : "closed");
    }

    function hideOverlay() {
      if (overlayEl) {
        overlayEl.style.display = "none";
      }
      syncOverlayUiState(false);
      if (window && typeof window.dispatchEvent === "function" && typeof window.CustomEvent === "function") {
        window.dispatchEvent(new window.CustomEvent("games:meta-overlay-change", {
          detail: { open: false }
        }));
      }
    }

    function showOverlay() {
      if (overlayEl) {
        overlayEl.style.display = "grid";
      }
      syncOverlayUiState(true);
      if (window && typeof window.dispatchEvent === "function" && typeof window.CustomEvent === "function") {
        window.dispatchEvent(new window.CustomEvent("games:meta-overlay-change", {
          detail: { open: true }
        }));
      }
    }

    function syncDocumentLanguage() {
      if (!document || !document.documentElement) {
        return;
      }
      document.documentElement.setAttribute("lang", state.player.language);
      document.documentElement.setAttribute("dir", getLanguage(state.player.language).dir);
      document.documentElement.setAttribute("data-game-meta-lang", state.player.language);
    }

  function animateResults() {
      const listEl = overlayEl.querySelector(".metaLeaderboardList");
      if (!listEl || !resultContext) {
        return;
      }
      const rows = Array.from(listEl.querySelectorAll(".metaLeaderboardRow"));
      if (!rows.length) {
        return;
      }
      const beforeRankById = {};
      resultContext.beforeRanks.forEach((participant) => {
        beforeRankById[participant.id] = participant.rank;
      });
      const rowGap = 10;
      const rowHeight = rows[0].getBoundingClientRect().height + rowGap;
      rows.forEach((row) => {
        const id = row.getAttribute("data-participant-id");
        const afterRank = Number(row.getAttribute("data-after-rank")) || 1;
        const beforeRank = beforeRankById[id] || afterRank;
        const shift = (beforeRank - afterRank) * rowHeight;
        if (!shift) {
          return;
        }
        row.style.transform = "translateY(" + shift + "px)";
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          rows.forEach((row) => {
            row.classList.add("is-animating");
            row.style.transform = "translateY(0)";
          });
        });
      });

      const reachedFirstPlace = (beforeRankById.me || state.player.currentRank) !== 1 && state.player.currentRank === 1;
      if (reachedFirstPlace) {
        const cardEl = overlayEl.querySelector(".metaCard--results");
        if (settings.audio && settings.audio.sfx && typeof settings.audio.sfx.victory === "function") {
          settings.audio.sfx.victory();
        }
        if (settings.fx && typeof settings.fx.playVictoryCelebration === "function") {
          settings.fx.playVictoryCelebration(cardEl || overlayEl);
        }
      }
    }

    function ensureCurrentPlayerRowVisible() {
      const listEl = overlayEl.querySelector(".metaLeaderboardList");
      if (!listEl || typeof listEl.querySelector !== "function") {
        return;
      }
      const currentRow = listEl.querySelector(".metaLeaderboardRow.is-current");
      if (!currentRow || !currentRow.getBoundingClientRect || !listEl.getBoundingClientRect) {
        return;
      }
      const listRect = listEl.getBoundingClientRect();
      const rowRect = currentRow.getBoundingClientRect();
      if (rowRect.top >= listRect.top && rowRect.bottom <= listRect.bottom) {
        return;
      }
      listEl.scrollTop = Math.max(
        0,
        currentRow.offsetTop - Math.max(0, Math.round((listEl.clientHeight - currentRow.offsetHeight) / 2))
      );
    }

    function render() {
      if (!overlayEl) {
        return;
      }
      syncDocumentLanguage();
      selectedDiff = resolveSelectedDiff(currentStartOptions);
      if (currentScreen === "profile") {
        overlayEl.innerHTML = buildProfileMarkup(state, draftProfile);
        showOverlay();
        return;
      }
      if (currentScreen === "settings") {
        overlayEl.innerHTML = buildSettingsMarkup(state, settings.gameKey, diffOptions);
        showOverlay();
        return;
      }
      if (currentScreen === "results" && resultContext) {
        overlayEl.innerHTML = buildResultsMarkup(resultContext, resultsPreviewState || state, selectedDiff, settings.gameKey, resultRowsExpanded);
        showOverlay();
        requestAnimationFrame(ensureCurrentPlayerRowVisible);
        if (animateResultsOnRender) {
          animateResultsOnRender = false;
          animateResults();
        }
        return;
      }
      overlayEl.innerHTML = buildStartMarkup(state, selectedDiff, Object.assign({
        gameKey: settings.gameKey,
        testMode: settings.testMode
      }, currentStartOptions));
      showOverlay();
    }

    async function handleStartRequest() {
      if (pendingStart || typeof settings.onStartRequested !== "function") {
        return;
      }
      pendingStart = true;
      const startButton = overlayEl.querySelector("[data-action=\"start-level\"]");
      let shouldHide = false;
      if (startButton) {
        startButton.disabled = true;
      }
      try {
        selectedDiff = resolveSelectedDiff(currentStartOptions);
        persist();
        const result = await settings.onStartRequested({
          diffKey: selectedDiff,
          nextLevel: getStatusSnapshot(state, settings.gameKey).nextLevel,
          snapshot: getStatusSnapshot(state, settings.gameKey)
        });
        shouldHide = result !== false;
      } finally {
        pendingStart = false;
        if (shouldHide) {
          hideOverlay();
        } else {
          render();
        }
      }
    }

    function showStart(extra) {
      currentScreen = "start";
      currentStartOptions = Object.assign({}, extra || {});
      resultContext = null;
      resultsPreviewState = null;
      resultRowsExpanded = false;
      animateResultsOnRender = false;
      continueResolver = null;
      draftProfile = null;
      render();
    }

    function showResults(context) {
      const round = applyRoundResult(state, {
        gameKey: settings.gameKey,
        completedLevel: context.completedLevel,
        diffKey: context && context.diffKey ? context.diffKey : selectedDiff,
        playerCoins: context.coins,
        metrics: context && context.metrics ? deepClone(context.metrics) : null
      });
      state = round.state;
      selectedDiff = rerollSelectedDiff();
      persist();
      currentScreen = "results";
      currentStartOptions = {};
      resultsPreviewState = null;
      resultRowsExpanded = false;
      animateResultsOnRender = true;
      resultContext = {
        beforeRanks: round.beforeRanks,
        afterRanks: round.afterRanks,
        message: round.message,
        metrics: context && context.metrics ? Object.assign({}, deepClone(context.metrics), {
          coinsEarned: Math.max(0, Number(context.metrics.coinsEarned) || 0) + Math.max(0, Number(round.playerBonus) || 0)
        }) : null
      };
      render();
      return new Promise((resolve) => {
        continueResolver = resolve;
      });
    }

    overlayEl.addEventListener("click", (event) => {
      const actionEl = event.target.closest("[data-action]");
      if (!actionEl) {
        return;
      }
      const action = actionEl.getAttribute("data-action");
      if (action === "open-profile") {
        draftProfile = {
          name: state.player.name,
          avatar: state.player.avatar
        };
        currentScreen = "profile";
        render();
        return;
      }
      if (action === "close-profile") {
        draftProfile = null;
        currentScreen = "start";
        render();
        return;
      }
      if (action === "save-profile") {
        const nextName = String((draftProfile && draftProfile.name) || "").replace(/\s+/g, " ").trim() || defaultPlayerName(state.player.language);
        const nextAvatar = draftProfile && draftProfile.avatar ? draftProfile.avatar : state.player.avatar;
        state.player.name = nextName;
        state.player.avatar = nextAvatar;
        state.participants = state.participants.map((participant) => {
          if (participant.id !== "me") {
            return participant;
          }
          return Object.assign({}, participant, {
            name: nextName,
            avatar: nextAvatar
          });
        });
        draftProfile = null;
        persist();
        currentScreen = "start";
        render();
        return;
      }
      if (action === "preview-results" && settings.testMode) {
        const preview = buildTestResultsPreview(state, settings.gameKey);
        currentScreen = "results";
        currentStartOptions = {};
        resultRowsExpanded = false;
        animateResultsOnRender = false;
        continueResolver = null;
        draftProfile = null;
        resultsPreviewState = preview.state;
        resultContext = preview.resultContext;
        render();
        return;
      }
      if (action === "open-settings") {
        currentScreen = "settings";
        render();
        return;
      }
      if (action === "exit-game") {
        if (typeof settings.onExitRequested === "function") {
          settings.onExitRequested();
          return;
        }
        if (window.history.length > 1) {
          window.history.back();
          return;
        }
        window.location.href = "../index.html";
        return;
      }
      if (action === "close-settings") {
        currentScreen = "start";
        render();
        return;
      }
      if (action === "pick-language") {
        state.player.language = getLanguage(actionEl.getAttribute("data-language")).id;
        persist();
        render();
        return;
      }
      if (action === "shift-diff-bound") {
        shiftDifficultyBound(actionEl.getAttribute("data-bound"), actionEl.getAttribute("data-dir"));
        selectedDiff = resolveSelectedDiff();
        persist();
        render();
        return;
      }
      if (action === "toggle-results-rows") {
        resultRowsExpanded = !resultRowsExpanded;
        render();
        return;
      }
      if (action === "pick-profile-avatar") {
        if (!draftProfile) {
          draftProfile = {
            name: state.player.name,
            avatar: state.player.avatar
          };
        }
        draftProfile.avatar = getAvatar(actionEl.getAttribute("data-avatar")).id;
        render();
        return;
      }
      if (action === "pick-sound") {
        const soundAction = actionEl.getAttribute("data-sound");
        state.settings.soundEnabled = soundAction === "toggle" ? !state.settings.soundEnabled : soundAction !== "off";
        syncAudioSetting();
        persist();
        render();
        return;
      }
      if (action === "start-level") {
        handleStartRequest();
        return;
      }
      if (action === "continue-level") {
        if (resultContext && resultContext.previewOnly && typeof continueResolver !== "function") {
          showStart();
          return;
        }
        const resolver = continueResolver;
        continueResolver = null;
        hideOverlay();
        if (typeof resolver === "function") {
          resolver(getStatusSnapshot(state, settings.gameKey));
        }
      }
    });
    overlayEl.addEventListener("input", (event) => {
      const inputEl = event.target.closest("[data-role=\"player-name\"]");
      if (!inputEl || currentScreen !== "profile") {
        return;
      }
      if (!draftProfile) {
        draftProfile = {
          name: state.player.name,
          avatar: state.player.avatar
        };
      }
      draftProfile.name = String(inputEl.value || "").slice(0, 18);
    });

    if (diffOptions.length) {
      const currentBounds = getDifficultyBounds(state, settings.gameKey, diffOptions);
      persistDifficultyBounds(currentBounds.minKey, currentBounds.maxKey);
      rerollSelectedDiff();
    }
    syncAudioSetting();
    if (settings.audio && typeof settings.audio.onMuteChange === "function") {
      settings.audio.onMuteChange((muted) => {
        const nextSoundEnabled = !muted;
        if (state.settings.soundEnabled === nextSoundEnabled) {
          return;
        }
        state.settings.soundEnabled = nextSoundEnabled;
        persist();
        if (currentScreen === "settings") {
          render();
        }
      });
    }
    render();

    return {
      showStart,
      showResults,
      getSnapshot() {
        return getStatusSnapshot(state, settings.gameKey);
      },
      getSelectedDiff() {
        return resolveSelectedDiff(currentStartOptions);
      },
      setSelectedDiff(diffKey) {
        if (diffOptions.find((option) => option.key === diffKey)) {
          selectedDiff = diffKey;
          persist();
          render();
        }
      },
      hideOverlay,
      refresh: render
    };
  }

  return {
    createGameMeta,
    simulateCompetitorProgress,
    diffLabel,
    applyHudDifficulty
  };
})(window.GAMES_V2_UTILS);
