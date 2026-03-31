window.GAMES_V2_META = (function (utils) {
  const STORAGE_KEY = "games_v3_meta_state_v1";
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
    clocks: { icon: "🕒", menuIcon: "../shared/assets/ui/clocks.png", labelHe: "שעונים", labelEn: "Clocks" },
    math: { icon: "➕", menuIcon: "../shared/assets/ui/numbers.png", labelHe: "חשבון", labelEn: "Math" },
    multiply: { icon: "✖️", menuIcon: "../shared/assets/ui/multiply.png", labelHe: "כפל", labelEn: "Multiply" },
    shapes: { icon: "🔷", menuIcon: "../shared/assets/ui/shapes.png", labelHe: "צורות", labelEn: "Shapes" },
    words: { icon: "🔤", menuIcon: "../shared/assets/ui/words.png", labelHe: "מילים", labelEn: "Words" }
  };
  const GAME_KEYS = Object.keys(GAME_BADGES);
  const MAX_VISIBLE_RESULT_ROWS = 4;
  const COPY = {
    he: {
      startTitle: "השלב הבא מחכה לך",
      startSubtitle: "ההתקדמות, ההגדרות והטבלה נשמרות אוטומטית בדפדפן.",
      status: "מצב נוכחי",
      points: "נקודות",
      coins: "מטבעות",
      lives: "חיים",
      stars: "כוכבים",
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
      stars: "Stars",
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
    const safeLevel = Math.max(1, Number(defaultLevel) || 1);
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
    const fallbackLevel = Math.max(1, Number(state && state.player && state.player.highestCompletedLevel) || 1);
    const raw = state && state.player && state.player.progressByGame && gameKey
      ? state.player.progressByGame[gameKey]
      : null;
    return {
      highestCompletedLevel: Math.max(1, Number(raw && raw.highestCompletedLevel) || fallbackLevel)
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
    state.player.highestCompletedLevel = levels.length ? Math.max.apply(Math, levels) : Math.max(1, Number(state.player.highestCompletedLevel) || 1);
    if (!state.settings.preferredDiff) {
      state.settings.preferredDiff = getPreferredDiffForGame(state, GAME_KEYS[0]);
    }
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
    const safeLives = Math.max(3, Number(defaultLives) || 5);
    const playerName = defaultPlayerName(initialLanguage);
    const defaultLevel = 3;
    const defaultDiff = "medium";
    return {
      version: 1,
      player: {
        id: "me",
        name: playerName,
        avatar: "lion",
        language: LANGUAGES[initialLanguage] ? initialLanguage : "he",
        coins: 120,
        lives: safeLives,
        highestCompletedLevel: defaultLevel,
        progressByGame: createGameProgressMap(defaultLevel),
        currentRank: 3
      },
      settings: {
        preferredDiff: defaultDiff,
        preferredDiffByGame: createPreferredDiffMap(defaultDiff),
        futureOption: "coming-soon",
        soundEnabled: initialSoundEnabled !== false,
        diffBoundsByGame: {}
      },
      participants: [
        { id: "me", name: playerName, avatar: "lion", coins: 120 },
        { id: "p2", name: "Dana", avatar: "tiger", coins: 135 },
        { id: "p3", name: "Noam", avatar: "penguin", coins: 98 },
        { id: "p4", name: "Maya", avatar: "frog", coins: 127 },
        { id: "p5", name: "Lior", avatar: "cat", coins: 112 }
      ],
      messageCursor: 0
    };
  }

  function normalizeState(rawState, options) {
    const defaults = defaultState(options.defaultLives, options.initialLanguage, options.initialSoundEnabled);
    const next = deepClone(defaults);
    const source = rawState && typeof rawState === "object" ? rawState : {};
    next.player = Object.assign({}, defaults.player, source.player || {});
    next.settings = Object.assign({}, defaults.settings, source.settings || {});
    next.messageCursor = Number.isFinite(source.messageCursor) ? source.messageCursor : defaults.messageCursor;

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
    next.player.lives = Math.max(1, Number(next.player.lives) || defaults.player.lives);
    next.player.highestCompletedLevel = Math.max(1, Number(next.player.highestCompletedLevel) || defaults.player.highestCompletedLevel);
    next.player.progressByGame = next.player.progressByGame && typeof next.player.progressByGame === "object"
      ? Object.assign({}, next.player.progressByGame)
      : {};
    GAME_KEYS.forEach((gameKey) => {
      const rawGameProgress = next.player.progressByGame[gameKey];
      next.player.progressByGame[gameKey] = {
        highestCompletedLevel: Math.max(
          1,
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
    return {
      player: deepClone(Object.assign({}, state.player, {
        currentRank: playerRank ? playerRank.rank : state.player.currentRank,
        highestCompletedLevel: gameProgress.highestCompletedLevel
      })),
      participants: ranked,
      nextLevel: Math.max(1, Number(gameProgress.highestCompletedLevel) + 1),
      stars: Math.max(0, Number(gameProgress.highestCompletedLevel) || 0)
    };
  }

  function nextMessage(state) {
    const index = state.messageCursor % MESSAGES_HE.length;
    const message = MESSAGES_HE[index];
    state.messageCursor = (index + 1) % MESSAGES_HE.length;
    return message;
  }

  function simulateCompetitorProgress(participants, context) {
    return participants.map((participant, index) => {
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
      const baseGain = 3 + Math.floor(context.completedLevel / 3);
      const smallSwing = randomInt(rng, -1, 4);
      const momentum = randomInt(rng, 0, 3);
      const closeRaceBonus = Math.abs(participant.coins - context.playerCoins) <= 18 ? 2 : 0;
      const delta = utils.clamp(baseGain + smallSwing + momentum + closeRaceBonus, 1, 12);
      return Object.assign({}, participant, {
        coins: participant.coins + delta
      });
    });
  }

  function applyRoundResult(state, context) {
    const beforeRanks = rankParticipants(state.participants);
    const nextState = deepClone(state);
    nextState.player.coins = Math.max(0, Number(context.playerCoins) || nextState.player.coins);
    nextState.player.lives = Math.max(1, Number(context.playerLives) || nextState.player.lives);
    setGameCompletedLevel(nextState, context.gameKey, context.completedLevel);
    syncLegacyProgressFields(nextState);
    nextState.participants = nextState.participants.map((participant) => {
      if (participant.id !== "me") {
        return participant;
      }
      return Object.assign({}, participant, {
        name: nextState.player.name,
        avatar: nextState.player.avatar,
        coins: nextState.player.coins
      });
    });
    nextState.participants = simulateCompetitorProgress(nextState.participants, {
      gameKey: context.gameKey,
      completedLevel: getGameProgress(nextState, context.gameKey).highestCompletedLevel,
      playerCoins: nextState.player.coins
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
      message: nextMessage(nextState)
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
    const snapshot = getStatusSnapshot(state, extra && extra.gameKey);
    const nextLevel = snapshot.nextLevel;
    let score = Math.max(0, nextLevel - 1);
    if (snapshot.player.currentRank <= 2) {
      score += 2;
    } else if (snapshot.player.currentRank === 3) {
      score += 1;
    }
    if (snapshot.player.lives >= 6) {
      score += 1;
    } else if (snapshot.player.lives <= 2) {
      score -= 2;
    } else if (snapshot.player.lives <= 4) {
      score -= 1;
    }
    if ((extra && extra.gameOver) || snapshot.player.lives <= 1) {
      score -= 2;
    }
    if (snapshot.player.coins >= 180) {
      score += 1;
    }
    const divisor = diffOptions.length === 2 ? 4 : 3;
    const index = utils.clamp(Math.floor(Math.max(0, score) / divisor), 0, diffOptions.length - 1);
    const bounds = getDifficultyBounds(state, extra && extra.gameKey, diffOptions);
    return diffOptions[utils.clamp(index, bounds.minIndex, bounds.maxIndex)].key;
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

  function buildStatusPills(snapshot, languageId) {
    const copy = getCopy(languageId);
    const stars = Math.max(0, Number(snapshot.stars) || 0);
    return [
      "<div class=\"metaStatusChip\">" +
        iconMarkup("../shared/assets/ui/coin.svg", copy.points, "metaStatusIcon") +
        "<div class=\"metaStatusValueWrap\"><strong class=\"metaStatusValue\">" + escapeHtml(snapshot.player.coins) + "</strong></div>" +
      "</div>",
      "<div class=\"metaStatusChip\">" +
        heartIconMarkup(copy.lives, "metaStatusIcon metaStatusIcon--heart") +
        "<div class=\"metaStatusValueWrap\"><strong class=\"metaStatusValue\">" + escapeHtml(snapshot.player.lives) + "</strong></div>" +
      "</div>",
      "<div class=\"metaStatusChip\">" +
        iconMarkup("../shared/assets/ui/star.svg", copy.stars, "metaStatusIcon") +
        "<div class=\"metaStatusValueWrap\"><strong class=\"metaStatusValue\">" + escapeHtml(stars) + "</strong></div>" +
      "</div>"
    ].join("");
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
    const languageId = state.player.language;
    const copy = getCopy(languageId);
    const language = getLanguage(languageId);
    const snapshot = getStatusSnapshot(state, options.gameKey);
    const difficultyText = diffLabel(selectedDiff, languageId);
    const playerName = String(state.player.name || "").replace(/\s+/g, " ").trim() || defaultPlayerName(languageId);

    return "<div class=\"metaCard metaCard--start\" dir=\"" + escapeHtml(language.dir) + "\">" +
      "<div class=\"metaStartBrand metaStartBrand--top\">" +
        buildGameBadgeMarkup(options.gameKey, languageId) +
      "</div>" +
      "<div class=\"metaStartHero metaStartHero--compact\">" +
        "<button class=\"metaProfileButton metaProfileButton--start\" type=\"button\" data-action=\"open-profile\">" +
            avatarTokenMarkup(state.player.avatar, languageId, "metaHeroAvatar") +
            "<span class=\"metaProfileButtonText\">" +
              "<strong class=\"metaProfileName\">" + escapeHtml(playerName) + "</strong>" +
            "</span>" +
          "</button>" +
      "</div>" +
      "<div class=\"metaSection metaSection--start\">" +
        "<div class=\"metaStatusGrid metaStatusGrid--three\">" + buildStatusPills(snapshot, languageId) + "</div>" +
      "</div>" +
      "<div class=\"metaStartFooter\">" +
        "<div class=\"metaStartToolbar\">" +
          "<div class=\"metaStartActions\">" +
            "<button class=\"metaGhostButton metaStartSecondaryButton metaStartSettingsButton\" type=\"button\" data-action=\"open-settings\" aria-label=\"" + escapeHtml(copy.settings) + "\" title=\"" + escapeHtml(copy.settings) + "\">" +
              "<span class=\"metaStartSecondaryIcon\" aria-hidden=\"true\">" + settingsIconMarkup() + "</span>" +
            "</button>" +
            "<button class=\"metaGhostButton metaStartSecondaryButton metaStartExitButton\" type=\"button\" data-action=\"exit-game\" aria-label=\"" + escapeHtml(copy.exit) + "\" title=\"" + escapeHtml(copy.exit) + "\">" +
              "<span class=\"metaStartSecondaryIcon\" aria-hidden=\"true\"><img class=\"metaStartSecondaryIconImage\" src=\"../shared/assets/ui/exit.png\" alt=\"\"></span>" +
            "</button>" +
          "</div>" +
        "</div>" +
        "<button class=\"metaPrimaryButton metaPrimaryButton--level\" type=\"button\" data-action=\"start-level\">" +
          "<span class=\"metaPrimaryKicker\">" + escapeHtml(copy.levelOnly(snapshot.nextLevel)) + "</span>" +
          "<strong class=\"metaPrimaryMain\">" + escapeHtml(difficultyText) + "</strong>" +
        "</button>" +
      "</div>" +
    "</div>";
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

  function getVisibleResultRows(rows, expanded, pinnedId) {
    const rankedRows = Array.isArray(rows) ? rows.slice() : [];
    if (expanded || rankedRows.length <= MAX_VISIBLE_RESULT_ROWS) {
      return {
        rows: rankedRows,
        hasHiddenRows: false,
        hiddenCount: 0
      };
    }
    const pinnedIndex = rankedRows.findIndex((participant) => participant.id === pinnedId);
    if (pinnedIndex >= MAX_VISIBLE_RESULT_ROWS) {
      return {
        rows: rankedRows.slice(0, MAX_VISIBLE_RESULT_ROWS - 1).concat(rankedRows[pinnedIndex]),
        hasHiddenRows: true,
        hiddenCount: rankedRows.length - MAX_VISIBLE_RESULT_ROWS
      };
    }
    return {
      rows: rankedRows.slice(0, MAX_VISIBLE_RESULT_ROWS),
      hasHiddenRows: true,
      hiddenCount: rankedRows.length - MAX_VISIBLE_RESULT_ROWS
    };
  }

  function buildResultsMarkup(resultContext, state, selectedDiff, gameKey, expandedRows) {
    const languageId = state.player.language;
    const copy = getCopy(languageId);
    const language = getLanguage(languageId);
    const snapshot = getStatusSnapshot(state, gameKey);
    const afterRankMap = {};
    const beforeRankMap = {};
    const beforeCoinMap = {};
    resultContext.afterRanks.forEach((participant) => {
      afterRankMap[participant.id] = participant.rank;
    });
    resultContext.beforeRanks.forEach((participant) => {
      beforeRankMap[participant.id] = participant.rank;
      beforeCoinMap[participant.id] = participant.coins;
    });
    const playerRank = afterRankMap.me || state.player.currentRank;
    const rankDelta = buildRankDelta(copy, beforeRankMap.me || playerRank, playerRank);
    const nextLevel = snapshot.nextLevel;
    const difficultyText = diffLabel(selectedDiff, languageId);
    const visibleRows = getVisibleResultRows(resultContext.afterRanks, expandedRows, "me");
    const rowsMarkup = visibleRows.rows.map((participant) => {
      const avatar = getAvatar(participant.avatar);
      const beforeCoins = beforeCoinMap[participant.id] || participant.coins;
      const coinDelta = participant.coins - beforeCoins;
      const isCurrent = participant.id === "me";
      return "<div class=\"metaLeaderboardRow" + (isCurrent ? " is-current" : "") + "\" data-participant-id=\"" + escapeHtml(participant.id) + "\" data-after-rank=\"" + escapeHtml(participant.rank) + "\">" +
        "<div class=\"metaLeaderboardRank\">#" + escapeHtml(participant.rank) + "</div>" +
        "<div class=\"metaLeaderboardPlayer\">" +
          avatarTokenMarkup(avatar.id, languageId, "metaLeaderboardAvatar") +
          "<div class=\"metaLeaderboardIdentity\">" +
            "<strong class=\"metaLeaderboardName\">" + escapeHtml(participant.name) + "</strong>" +
          "</div>" +
        "</div>" +
        "<div class=\"metaLeaderboardScore\">" +
          "<span class=\"metaLeaderboardCoins\">" + iconMarkup("../shared/assets/ui/coin.svg", copy.coins, "metaInlineIcon") + "<strong>" + escapeHtml(participant.coins) + "</strong></span>" +
          "<span class=\"metaLeaderboardDelta" + (coinDelta > 0 ? " is-positive" : "") + "\">" + (coinDelta > 0 ? "+" : "") + escapeHtml(coinDelta) + "</span>" +
        "</div>" +
      "</div>";
    }).join("");

    return "<div class=\"metaCard metaCard--results\" dir=\"" + escapeHtml(language.dir) + "\">" +
      "<div class=\"metaCardHead\">" +
        "<div>" +
          "<h2 class=\"metaTitle\">" + escapeHtml(copy.resultsTitle(snapshot.player.highestCompletedLevel)) + "</h2>" +
          "<p class=\"metaSubtitle metaSubtitle--tight\">" + escapeHtml(rankDelta.text) + "</p>" +
        "</div>" +
        "<span class=\"metaRankBadge metaRankBadge--" + escapeHtml(rankDelta.kind) + "\">#" + escapeHtml(playerRank) + "</span>" +
      "</div>" +
      "<div class=\"metaMessageCard\" dir=\"rtl\">" +
        "<span class=\"metaMessageLabel\">" + escapeHtml(copy.messageTitle) + "</span>" +
        "<strong class=\"metaMessageText\">" + escapeHtml(resultContext.message) + "</strong>" +
      "</div>" +
      "<div class=\"metaLeaderboardWrap\">" +
        "<div class=\"metaSectionTitle\">" + escapeHtml(copy.leaderboard) + "</div>" +
        "<p class=\"metaLeaderboardHint\">" + escapeHtml(copy.leaderboardHint) + "</p>" +
        "<div class=\"metaLeaderboardList\">" + rowsMarkup + "</div>" +
        (!expandedRows && resultContext.afterRanks.length > visibleRows.rows.length
          ? "<button class=\"metaGhostButton metaLeaderboardMoreButton\" type=\"button\" data-action=\"toggle-results-rows\">" + escapeHtml(copy.showMore) + "</button>"
          : "") +
      "</div>" +
      (playerRank === 1 ? "<div class=\"metaChampionBanner\">" + escapeHtml(copy.champion) + "</div>" : "") +
      "<button class=\"metaPrimaryButton\" type=\"button\" data-action=\"continue-level\">" + escapeHtml(copy.continueLevel(nextLevel, difficultyText)) + "</button>" +
    "</div>";
  }

  function createGameMeta(options) {
    const rawOptions = options || {};
    const settings = Object.assign({
      overlayEl: null,
      diffOptions: [],
      defaultLives: 5,
      initialLanguage: "he",
      initialSoundEnabled: true,
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

    function resolveSelectedDiff(extra) {
      return autoDifficultyForState(diffOptions, state, Object.assign({
        gameKey: settings.gameKey
      }, currentStartOptions, extra || {}));
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
    }

    function showOverlay() {
      if (overlayEl) {
        overlayEl.style.display = "grid";
      }
      syncOverlayUiState(true);
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
        overlayEl.innerHTML = buildResultsMarkup(resultContext, state, selectedDiff, settings.gameKey, resultRowsExpanded);
        showOverlay();
        if (animateResultsOnRender) {
          animateResultsOnRender = false;
          animateResults();
        }
        return;
      }
      overlayEl.innerHTML = buildStartMarkup(state, selectedDiff, Object.assign({
        gameKey: settings.gameKey
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
        playerCoins: context.coins,
        playerLives: context.lives
      });
      state = round.state;
      selectedDiff = resolveSelectedDiff();
      persist();
      currentScreen = "results";
      currentStartOptions = {};
      resultRowsExpanded = false;
      animateResultsOnRender = true;
      resultContext = {
        beforeRanks: round.beforeRanks,
        afterRanks: round.afterRanks,
        message: round.message
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
    simulateCompetitorProgress
  };
})(window.GAMES_V2_UTILS);
