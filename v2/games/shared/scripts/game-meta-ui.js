window.GAMES_V2_META_UI = (function (utils, s) {
  const {
    escapeHtml, getCopy, getLanguage, getAvatar, labelForAvatar, diffLabel,
    defaultPlayerName, getDifficultyBounds, getStatusSnapshot,
    AVATARS, LANGUAGES, MAX_VISIBLE_RESULT_ROWS
  } = s;

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

  function buildGameBadgeMarkup(gameKey, languageId) {
    const badge = s.getGameBadge(gameKey, languageId);
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

  function buildMysteryButton(state) {
    const languageId = state.player.language;
    const copy = getCopy(languageId);
    const mysteryEnabled = state.settings.mysteryEnabled !== false;
    const mysteryLabel = mysteryEnabled ? copy.mysteryOn : copy.mysteryOff;
    const mysteryClass = mysteryEnabled ? " metaMysteryButton--on" : " metaMysteryButton--off";
    return "<button class=\"metaChoiceButton metaMysteryButton is-selected" + mysteryClass + "\" type=\"button\" data-action=\"pick-mystery\">" +
      "<span class=\"metaChoiceVisual\" aria-hidden=\"true\" style=\"font-size:1.5em\">" + (mysteryEnabled ? "🌈" : "🚫") + "</span>" +
      "<span class=\"metaChoiceLabel\">" + escapeHtml(mysteryLabel) + "</span>" +
    "</button>";
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
      const flagInner = language.flagImg
        ? "<img class=\"metaFlagImage\" src=\"" + escapeHtml(language.flagImg) + "\" alt=\"\" aria-hidden=\"true\">"
        : escapeHtml(language.flag || "");
      return "<button class=\"metaChoiceButton metaLanguageButton" + selectedClass + "\" type=\"button\" data-action=\"pick-language\" data-language=\"" + escapeHtml(languageId) + "\">" +
        "<span class=\"metaChoiceVisual metaFlagVisual\" aria-hidden=\"true\">" + flagInner + "</span>" +
        "<span class=\"metaChoiceLabel\">" + escapeHtml(language.label) + "</span>" +
      "</button>";
    }).join("");
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

  function buildStatusPillsWrapper(snapshot, languageId, resultContext) {
    return buildStatusPills(snapshot, languageId, resultContext);
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
    const statusPills = buildStatusPillsWrapper(snapshot, languageId, resultContext);
    const profileHint = difficultyText;
    const primaryAction = isResults ? "continue-level" : "start-level";
    const primaryLabel = isResults
      ? copy.continueLevel(snapshot.nextLevel, difficultyText)
      : copy.startLevel(snapshot.nextLevel, difficultyText);
    var _lvhImgIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 24'%3E%3Crect width='28' height='24' rx='3' fill='%234895ef'/%3E%3Ccircle cx='8' cy='8' r='3' fill='%23FFE566'/%3E%3Cpath d='M0 18 L8 11 L14 16 L20 10 L28 17 L28 24 L0 24Z' fill='%23fff' opacity='.88'/%3E%3C/svg%3E";
    var _lvhAbcIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 24'%3E%3Crect width='28' height='24' rx='3' fill='%23e8edf8'/%3E%3Ctext x='14' y='18' font-family='Georgia%2Cserif' font-size='14' font-weight='bold' text-anchor='middle' fill='%231a2a5e'%3EAa%3C/text%3E%3C/svg%3E";
    var _lvhIcon = safeOptions.levelVariant === "image-to-word" ? _lvhImgIcon : _lvhAbcIcon;
    const levelVariantHint = safeOptions.levelVariant
      ? " <img class=\"levelVariantHint\" src=\"" + _lvhIcon + "\" alt=\"\" aria-hidden=\"true\">"
      : "";
    const leaderboardSource = resultContext && Array.isArray(resultContext.afterRanks) && resultContext.afterRanks.length
      ? resultContext.afterRanks
      : snapshot.participants;
    const leaderboardRows = isResults
      ? leaderboardSource
      : getStartLeaderboardRows(leaderboardSource, "me", snapshot.player);
    const leaderboardSection = buildLeaderboardSectionMarkup(leaderboardRows, languageId, copy, "all", "me");
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
        "<button class=\"metaPrimaryButton metaResultsContinueButton\" type=\"button\" data-action=\"" + primaryAction + "\">" + escapeHtml(primaryLabel) + levelVariantHint + "</button>" +
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
            "<div class=\"metaChoiceGrid metaChoiceGrid--threeCols\">" + buildLanguageButtons(state) + "</div>" +
          "</section>" +
          "<section class=\"metaSettingPanel metaSettingPanel--sound\">" +
            buildSettingsPanelHeader("🔊", copy.sound) +
            "<div class=\"metaChoiceGrid metaChoiceGrid--single\">" + buildSoundButtons(state) + "</div>" +
          "</section>" +
          "<section class=\"metaSettingPanel metaSettingPanel--mystery\">" +
            buildSettingsPanelHeader("🌈", copy.mystery) +
            "<div class=\"metaChoiceGrid metaChoiceGrid--single\">" + buildMysteryButton(state) + "</div>" +
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

  function buildStartMarkup(state, selectedDiff, options) {
    return buildDashboardMarkup(state, selectedDiff, options);
  }

  function buildResultsMarkup(resultContext, state, selectedDiff, gameKey, expandedRows) {
    return buildDashboardMarkup(state, selectedDiff, {
      gameKey,
      expandedRows,
      resultContext,
      levelVariant: (resultContext && resultContext.nextLevelVariant) || null
    });
  }

  return {
    buildDashboardMarkup,
    buildStartMarkup,
    buildResultsMarkup,
    buildSettingsMarkup,
    buildProfileMarkup
  };
})(window.GAMES_V2_UTILS, window.GAMES_V2_META_STATE);
