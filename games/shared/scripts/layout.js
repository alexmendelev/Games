window.GAMES_V2_LAYOUT = (function (utils) {
  "use strict";

  const DEFAULTS = {
    breakpoints: {
      landscapeAspectThreshold: 1.12,
      tabletPortraitMinWidth: 700,
      desktopLandscapeMinWidth: 1180
    },
    frame: {
      paddingRatio: 0.018,
      paddingMin: 8,
      paddingMax: 16,
      gapRatio: 0.014,
      gapMin: 8,
      gapMax: 14
    },
    panel: {
      landscapeRatio: 0.3,
      landscapeMin: 320,
      landscapeMax: 440,
      portraitRatio: 0.42,
      portraitMin: 260,
      portraitMax: 430,
      sectionGapRatio: 0.012,
      sectionGapMin: 6,
      sectionGapMax: 12
    },
    game: {
      landscapeMinWidth: 320,
      portraitMinHeight: 240,
      portraitMaxHeight: 520,
      mascotWidthRatioLandscape: 0.32,
      mascotWidthRatioPortrait: 0.38,
      mascotHeightRatio: 0.28,
      fallLaneRightPadding: 24
    },
    hud: {
      preferredRatio: 0.25,
      min: 138,
      max: 220,
      portraitPreferredRatio: 0.11,
      portraitMin: 56,
      portraitMax: 82,
      nearSquarePortraitMax: 74
    },
    controls: {
      preferredRatio: 0.11,
      min: 70,
      max: 96,
      portraitPreferredRatio: 0.08,
      portraitMin: 52,
      portraitMax: 72,
      nearSquarePortraitMax: 64
    },
    answers: {
      type: "FourAnswerGrid",
      count: 4,
      activeCount: 4,
      content: "empty",
      itemClass: "",
      preferredCols: 2,
      preferredRows: 2,
      minCols: 2,
      maxCols: 4,
      aspectRatio: 1,
      minButtonSize: 84,
      maxButtonSize: 190,
      gapRatio: 0.04,
      gapMin: 4,
      gapMax: 12,
      paddingRatio: 0.035,
      paddingMin: 0,
      paddingMax: 10,
      fontScale: 0.42,
      fontMin: 22,
      fontMax: 44,
      radiusScale: 0.24,
      minHeight: 120
    },
    overlay: {
      widthRatioLandscape: 0.78,
      widthRatioPortrait: 0.96,
      minWidth: 320,
      maxWidth: 1120,
      heightRatio: 0.92,
      paddingRatio: 0.028,
      paddingMin: 12,
      paddingMax: 22,
      titleRatio: 0.045,
      titleMin: 24,
      titleMax: 40,
      badgeRatio: 0.02,
      badgeMin: 12,
      badgeMax: 16,
      rowRatio: 0.085,
      rowMin: 52,
      rowMax: 78,
      rankRatio: 0.033,
      rankMin: 18,
      rankMax: 24,
      avatarRatio: 0.08,
      avatarMin: 52,
      avatarMax: 74,
      coinsRatio: 0.038,
      coinsMin: 20,
      coinsMax: 28,
      buttonRatio: 0.07,
      buttonMin: 52,
      buttonMax: 68,
      stackActionsBelow: 540
    }
  };

  const ANSWER_PRESETS = {
    FourAnswerGrid: {
      preferredCols: 2,
      preferredRows: 2,
      minCols: 2,
      maxCols: 2,
      aspectRatio: 1.22,
      minButtonSize: 82,
      maxButtonSize: 190,
      fontScale: 0.46,
      fontMin: 24,
      fontMax: 46
    },
    FourLargeCards: {
      preferredCols: 2,
      preferredRows: 2,
      minCols: 2,
      maxCols: 2,
      aspectRatio: 1,
      minButtonSize: 96,
      maxButtonSize: 220,
      fontScale: 0.38,
      fontMin: 22,
      fontMax: 38
    },
    DenseOptionGrid: {
      preferredCols: 4,
      preferredRows: 4,
      minCols: 2,
      maxCols: 4,
      aspectRatio: 1,
      minButtonSize: 44,
      maxButtonSize: 100,
      fontScale: 0.28,
      fontMin: 14,
      fontMax: 24
    },
    Custom: {}
  };

  // Local alias with NaN guard (utils.clamp doesn't protect against non-finite input)
  function clamp(value, min, max) {
    return utils.clamp(Number.isFinite(value) ? value : min, min, max);
  }

  function round(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function px(value) {
    return `${round(value)}px`;
  }

  function isPlainObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
  }

  function clone(value) {
    if (Array.isArray(value)) {
      return value.map(clone);
    }
    if (isPlainObject(value)) {
      const next = {};
      Object.keys(value).forEach((key) => {
        next[key] = clone(value[key]);
      });
      return next;
    }
    return value;
  }

  function mergeDeep(base, extra) {
    const next = clone(base);
    if (!isPlainObject(extra)) {
      return next;
    }
    Object.keys(extra).forEach((key) => {
      const incoming = extra[key];
      if (isPlainObject(incoming) && isPlainObject(next[key])) {
        next[key] = mergeDeep(next[key], incoming);
        return;
      }
      next[key] = clone(incoming);
    });
    return next;
  }

  function getViewport() {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  function measureHeight(el, fallback) {
    if (!el) return Math.max(0, Number(fallback) || 0);
    const rectHeight = el.getBoundingClientRect ? el.getBoundingClientRect().height : 0;
    const offsetHeight = Number(el.offsetHeight) || 0;
    const scrollHeight = Number(el.scrollHeight) || 0;
    return Math.max(Number(fallback) || 0, rectHeight || 0, offsetHeight, scrollHeight);
  }

  function normalizeAnswerConfig(config) {
    const type = String(config && config.type || DEFAULTS.answers.type);
    const preset = ANSWER_PRESETS[type] || ANSWER_PRESETS.FourAnswerGrid;
    const answer = mergeDeep(mergeDeep(DEFAULTS.answers, preset), config || {});
    answer.type = type;
    answer.count = Math.max(1, Number(answer.count) || 1);
    answer.activeCount = clamp(Number(answer.activeCount) || answer.count, 1, answer.count);
    answer.minCols = clamp(Number(answer.minCols) || 1, 1, answer.count);
    answer.maxCols = clamp(Number(answer.maxCols) || answer.minCols, answer.minCols, answer.count);
    answer.preferredCols = clamp(Number(answer.preferredCols) || answer.minCols, answer.minCols, answer.maxCols);
    answer.preferredRows = Math.max(1, Number(answer.preferredRows) || Math.ceil(answer.activeCount / answer.preferredCols));
    answer.aspectRatio = Math.max(0.55, Number(answer.aspectRatio) || 1);
    answer.minButtonSize = Math.max(36, Number(answer.minButtonSize) || 84);
    answer.maxButtonSize = Math.max(answer.minButtonSize, Number(answer.maxButtonSize) || answer.minButtonSize);
    answer.gapMin = Math.max(0, Number(answer.gapMin) || 0);
    answer.gapMax = Math.max(answer.gapMin, Number(answer.gapMax) || answer.gapMin);
    answer.paddingMin = Math.max(0, Number(answer.paddingMin) || 0);
    answer.paddingMax = Math.max(answer.paddingMin, Number(answer.paddingMax) || answer.paddingMin);
    answer.minHeight = Math.max(80, Number(answer.minHeight) || 120);
    return answer;
  }

  function normalizeConfig(config) {
    const merged = mergeDeep(DEFAULTS, config || {});
    merged.answers = normalizeAnswerConfig(merged.answers);
    return merged;
  }

  function buildDenseCandidates(answerConfig) {
    const visibleCount = Math.max(1, answerConfig.activeCount);
    const candidates = [];
    for (let cols = answerConfig.minCols; cols <= answerConfig.maxCols; cols += 1) {
      candidates.push({
        cols,
        rows: Math.ceil(visibleCount / cols)
      });
    }
    return candidates;
  }

  function buildCandidates(answerConfig, orientation) {
    if (Array.isArray(answerConfig.candidates) && answerConfig.candidates.length) {
      return answerConfig.candidates.map((candidate) => ({
        cols: Math.max(1, Number(candidate.cols) || answerConfig.preferredCols),
        rows: Math.max(1, Number(candidate.rows) || answerConfig.preferredRows)
      }));
    }
    if (answerConfig.type === "DenseOptionGrid") {
      return buildDenseCandidates(answerConfig);
    }
    const candidates = [{
      cols: answerConfig.preferredCols,
      rows: answerConfig.preferredRows
    }];
    if (orientation === "landscape" && answerConfig.type === "Custom" && answerConfig.count <= 4) {
      candidates.push({ cols: answerConfig.count, rows: 1 });
    }
    return candidates;
  }

  function fitAnswerGrid(bounds, answerConfig, orientation, viewportAspect) {
    const safeWidth = Math.max(0, Number(bounds && bounds.width) || 0);
    const safeHeight = Math.max(0, Number(bounds && bounds.height) || 0);
    const candidates = buildCandidates(answerConfig, orientation);
    const adjustedMaxButtonSize = orientation === "landscape" && viewportAspect < 1.55
      ? Math.min(answerConfig.maxButtonSize, Math.max(answerConfig.minButtonSize, answerConfig.maxButtonSize * 0.74))
      : orientation === "portrait" && viewportAspect > 0.82
        ? Math.min(answerConfig.maxButtonSize, Math.max(answerConfig.minButtonSize, answerConfig.maxButtonSize * 0.84))
        : answerConfig.maxButtonSize;
    let best = null;

    candidates.forEach((candidate, index) => {
      const cols = Math.max(1, candidate.cols);
      const rows = Math.max(1, candidate.rows);
      if ((cols * rows) < answerConfig.activeCount) {
        return;
      }
      const gap = clamp(
        Math.min(safeWidth / Math.max(cols + 1, 1), safeHeight / Math.max(rows + 1, 1)) * answerConfig.gapRatio,
        answerConfig.gapMin,
        answerConfig.gapMax
      );
      const padding = clamp(
        Math.min(safeWidth, safeHeight) * answerConfig.paddingRatio,
        answerConfig.paddingMin,
        answerConfig.paddingMax
      );
      const innerWidth = safeWidth - (padding * 2) - (gap * Math.max(0, cols - 1));
      const innerHeight = safeHeight - (padding * 2) - (gap * Math.max(0, rows - 1));
      if (innerWidth <= 0 || innerHeight <= 0) {
        return;
      }
      const cellWidth = innerWidth / cols;
      const cellHeight = innerHeight / rows;
      const widthDrivenHeight = cellWidth / answerConfig.aspectRatio;
      const heightDrivenWidth = cellHeight * answerConfig.aspectRatio;
      let buttonWidth = cellWidth;
      let buttonHeight = widthDrivenHeight;
      if (widthDrivenHeight > cellHeight) {
        buttonHeight = cellHeight;
        buttonWidth = heightDrivenWidth;
      }
      let shortestSide = Math.min(buttonWidth, buttonHeight);
      if (shortestSide > adjustedMaxButtonSize) {
        const shrinkScale = adjustedMaxButtonSize / shortestSide;
        buttonWidth *= shrinkScale;
        buttonHeight *= shrinkScale;
        shortestSide = Math.min(buttonWidth, buttonHeight);
      }
      const sizeScore = clamp(shortestSide, answerConfig.minButtonSize, adjustedMaxButtonSize);
      const underMinPenalty = Math.max(0, answerConfig.minButtonSize - shortestSide) * 5;
      const overMaxPenalty = Math.max(0, shortestSide - adjustedMaxButtonSize) * 0.3;
      const emptySlotsPenalty = Math.max(0, (rows * cols) - answerConfig.activeCount) * 4;
      const columnPenalty = Math.abs(cols - answerConfig.preferredCols) * 6;
      const rowPenalty = Math.abs(rows - answerConfig.preferredRows) * 4;
      const indexPenalty = index * 0.5;
      const score = sizeScore - underMinPenalty - overMaxPenalty - emptySlotsPenalty - columnPenalty - rowPenalty - indexPenalty;
      if (!best || score > best.score) {
        best = {
          cols,
          rows,
          gap,
          padding,
          buttonWidth,
          buttonHeight,
          fontSize: clamp(shortestSide * answerConfig.fontScale, answerConfig.fontMin, answerConfig.fontMax),
          radius: clamp(shortestSide * answerConfig.radiusScale, 14, 24),
          score
        };
      }
    });

    if (best) {
      return best;
    }

    return {
      cols: Math.max(1, answerConfig.preferredCols),
      rows: Math.max(1, answerConfig.preferredRows),
      gap: answerConfig.gapMin,
      padding: answerConfig.paddingMin,
      buttonWidth: answerConfig.minButtonSize * answerConfig.aspectRatio,
      buttonHeight: answerConfig.minButtonSize,
      fontSize: clamp(answerConfig.minButtonSize * answerConfig.fontScale, answerConfig.fontMin, answerConfig.fontMax),
      radius: clamp(answerConfig.minButtonSize * answerConfig.radiusScale, 14, 24),
      score: -Infinity
    };
  }

  function estimateMinimumAnswersHeight(panelWidth, answerConfig) {
    const candidates = buildCandidates(answerConfig, "portrait");
    let minimumHeight = Infinity;
    candidates.forEach((candidate) => {
      const cols = Math.max(1, candidate.cols);
      const rows = Math.max(1, candidate.rows);
      const gap = answerConfig.gapMin;
      const padding = answerConfig.paddingMin;
      const availableWidth = Math.max(0, panelWidth - (padding * 2) - (gap * Math.max(0, cols - 1)));
      const cellWidth = availableWidth / cols;
      const buttonWidth = Math.min(cellWidth, answerConfig.minButtonSize * answerConfig.aspectRatio);
      const buttonHeight = Math.max(answerConfig.minButtonSize / answerConfig.aspectRatio, Math.min(answerConfig.minButtonSize, buttonWidth / answerConfig.aspectRatio));
      const totalHeight = (buttonHeight * rows) + (gap * Math.max(0, rows - 1)) + (padding * 2);
      if (totalHeight > 0) {
        minimumHeight = Math.min(minimumHeight, totalHeight);
      }
    });
    return Number.isFinite(minimumHeight)
      ? Math.max(answerConfig.minHeight, minimumHeight)
      : answerConfig.minHeight;
  }

  function computeOverlayMetrics(viewport, config, orientation) {
    const shortSide = Math.min(viewport.width, viewport.height);
    const overlayWidthRatio = orientation === "portrait"
      ? config.overlay.widthRatioPortrait
      : config.overlay.widthRatioLandscape;
    return {
      maxWidth: clamp(viewport.width * overlayWidthRatio, config.overlay.minWidth, config.overlay.maxWidth),
      maxHeight: Math.min(viewport.height * config.overlay.heightRatio, 1040),
      padding: clamp(shortSide * config.overlay.paddingRatio, config.overlay.paddingMin, config.overlay.paddingMax),
      titleSize: clamp(shortSide * config.overlay.titleRatio, config.overlay.titleMin, config.overlay.titleMax),
      badgeSize: clamp(shortSide * config.overlay.badgeRatio, config.overlay.badgeMin, config.overlay.badgeMax),
      rowMinHeight: clamp(shortSide * config.overlay.rowRatio, config.overlay.rowMin, config.overlay.rowMax),
      rankSize: clamp(shortSide * config.overlay.rankRatio, config.overlay.rankMin, config.overlay.rankMax),
      avatarSize: clamp(shortSide * config.overlay.avatarRatio, config.overlay.avatarMin, config.overlay.avatarMax),
      coinsSize: clamp(shortSide * config.overlay.coinsRatio, config.overlay.coinsMin, config.overlay.coinsMax),
      buttonMinHeight: clamp(shortSide * config.overlay.buttonRatio, config.overlay.buttonMin, config.overlay.buttonMax),
      stackActions: viewport.width <= config.overlay.stackActionsBelow
    };
  }

  function classifyLayoutMode(viewport, orientation, config) {
    const width = Math.max(0, Number(viewport && viewport.width) || 0);
    if (orientation === "portrait") {
      return width >= config.breakpoints.tabletPortraitMinWidth
        ? "tablet-portrait"
        : "phone-portrait";
    }
    return width >= config.breakpoints.desktopLandscapeMinWidth
      ? "desktop-landscape"
      : "tablet-landscape";
  }

  function classifyAspectBand(screenOrientation, aspectRatio) {
    if (screenOrientation === "portrait") {
      return aspectRatio >= 0.84
        ? "portrait-wide"
        : "portrait-narrow";
    }
    return aspectRatio <= 1.34
      ? "landscape-shallow"
      : "landscape-wide";
  }

  function computeLayout(config, context) {
    const safeConfig = normalizeConfig(config);
    const viewport = context && context.viewport ? context.viewport : getViewport();
    const aspectRatio = viewport.height > 0 ? (viewport.width / viewport.height) : 1;
    const screenOrientation = viewport.width > viewport.height
      ? "landscape"
      : "portrait";
    const orientation = screenOrientation === "landscape" && (
      viewport.width >= safeConfig.breakpoints.desktopLandscapeMinWidth ||
      aspectRatio >= safeConfig.breakpoints.landscapeAspectThreshold
    )
      ? "landscape"
      : "portrait";
    const mode = classifyLayoutMode(viewport, screenOrientation, safeConfig);
    const aspectBand = classifyAspectBand(screenOrientation, aspectRatio);
    const shortSide = Math.min(viewport.width, viewport.height);
    const longSide = Math.max(viewport.width, viewport.height);
    const framePadding = clamp(shortSide * safeConfig.frame.paddingRatio, safeConfig.frame.paddingMin, safeConfig.frame.paddingMax);
    const frameGap = clamp(shortSide * safeConfig.frame.gapRatio, safeConfig.frame.gapMin, safeConfig.frame.gapMax);
    const sectionGap = clamp(shortSide * safeConfig.panel.sectionGapRatio, safeConfig.panel.sectionGapMin, safeConfig.panel.sectionGapMax);
    const innerWidth = Math.max(0, viewport.width - (framePadding * 2));
    const innerHeight = Math.max(0, viewport.height - (framePadding * 2));
    let panelWidth = innerWidth;
    let panelHeight = innerHeight;
    let gameWidth = innerWidth;
    let gameHeight = innerHeight;

    if (orientation === "landscape") {
      const requestedPanelWidth = clamp(viewport.width * safeConfig.panel.landscapeRatio, safeConfig.panel.landscapeMin, safeConfig.panel.landscapeMax);
      const maxPanelWidth = Math.max(safeConfig.panel.landscapeMin, innerWidth - frameGap - safeConfig.game.landscapeMinWidth);
      panelWidth = clamp(Math.min(requestedPanelWidth, maxPanelWidth), safeConfig.panel.landscapeMin, Math.max(safeConfig.panel.landscapeMin, maxPanelWidth));
      gameWidth = Math.max(safeConfig.game.landscapeMinWidth, innerWidth - frameGap - panelWidth);
      panelHeight = innerHeight;
      gameHeight = innerHeight;
    } else {
      const isNearSquarePortrait = aspectRatio > 0.92;
      const portraitPanelRatio = isNearSquarePortrait
        ? 0.42
        : aspectRatio > 0.82
          ? 0.4
          : safeConfig.panel.portraitRatio;
      const cappedPortraitMaxGameHeight = isNearSquarePortrait
        ? safeConfig.game.portraitMaxHeight
        : aspectRatio > 0.82
          ? safeConfig.game.portraitMaxHeight
          : safeConfig.game.portraitMaxHeight;
      const requestedPanelHeight = clamp(viewport.height * portraitPanelRatio, safeConfig.panel.portraitMin, safeConfig.panel.portraitMax);
      const maxPanelHeight = Math.max(safeConfig.panel.portraitMin, innerHeight - frameGap - safeConfig.game.portraitMinHeight);
      panelHeight = clamp(Math.min(requestedPanelHeight, maxPanelHeight), safeConfig.panel.portraitMin, Math.max(safeConfig.panel.portraitMin, maxPanelHeight));
      gameHeight = Math.max(safeConfig.game.portraitMinHeight, innerHeight - frameGap - panelHeight);
      if (gameHeight > cappedPortraitMaxGameHeight) {
        const overflow = gameHeight - cappedPortraitMaxGameHeight;
        const expandablePanel = Math.max(0, maxPanelHeight - panelHeight);
        const shift = Math.min(overflow, expandablePanel);
        panelHeight += shift;
        gameHeight -= shift;
      }
    }

    const isPortrait = orientation === "portrait";
    const isNearSquarePortrait = isPortrait && aspectRatio > 0.92;
    let hudHeight = clamp(
      panelHeight * (isPortrait ? safeConfig.hud.portraitPreferredRatio : safeConfig.hud.preferredRatio),
      isPortrait ? safeConfig.hud.portraitMin : safeConfig.hud.min,
      isNearSquarePortrait ? safeConfig.hud.nearSquarePortraitMax : (isPortrait ? safeConfig.hud.portraitMax : safeConfig.hud.max)
    );
    let controlsHeight = clamp(
      panelHeight * (isPortrait ? safeConfig.controls.portraitPreferredRatio : safeConfig.controls.preferredRatio),
      isPortrait ? safeConfig.controls.portraitMin : safeConfig.controls.min,
      isNearSquarePortrait ? safeConfig.controls.nearSquarePortraitMax : (isPortrait ? safeConfig.controls.portraitMax : safeConfig.controls.max)
    );

    const minimumAnswersHeight = estimateMinimumAnswersHeight(panelWidth, safeConfig.answers);
    let answersHeight = Math.max(0, panelHeight - hudHeight - controlsHeight - (sectionGap * 2));
    if (answersHeight < minimumAnswersHeight) {
      let deficit = minimumAnswersHeight - answersHeight;
      const hudReducible = Math.max(0, hudHeight - safeConfig.hud.min);
      const controlsReducible = Math.max(0, controlsHeight - safeConfig.controls.min);
      const reduceHud = Math.min(hudReducible, deficit * 0.65);
      hudHeight -= reduceHud;
      deficit -= reduceHud;
      const reduceControls = Math.min(controlsReducible, deficit);
      controlsHeight -= reduceControls;
      deficit -= reduceControls;
      answersHeight = Math.max(0, panelHeight - hudHeight - controlsHeight - (sectionGap * 2));
      if (deficit > 0 && orientation === "portrait") {
        const reducibleGameHeight = Math.max(0, gameHeight - safeConfig.game.portraitMinHeight);
        const shift = Math.min(deficit, reducibleGameHeight);
        gameHeight -= shift;
        panelHeight += shift;
        answersHeight = Math.max(0, panelHeight - hudHeight - controlsHeight - (sectionGap * 2));
      }
    }

    const answerGrid = fitAnswerGrid({
      width: panelWidth,
      height: answersHeight
    }, safeConfig.answers, orientation, aspectRatio);
    const mascotWidthRatio = orientation === "landscape"
      ? safeConfig.game.mascotWidthRatioLandscape
      : safeConfig.game.mascotWidthRatioPortrait;
    const mascotSafeZone = {
      width: gameWidth * mascotWidthRatio,
      height: gameHeight * safeConfig.game.mascotHeightRatio
    };
    const fallLane = {
      leftPadding: Math.max(12, mascotSafeZone.width * 0.6),
      rightPadding: Math.max(12, safeConfig.game.fallLaneRightPadding),
      topPadding: Math.max(12, gameHeight * 0.05)
    };

    return {
      viewport,
      screenOrientation,
      orientation,
      mode,
      aspectBand,
      screen: {
        shortSide,
        longSide,
        aspectRatio
      },
      frame: {
        padding: framePadding,
        gap: frameGap
      },
      game: {
        width: gameWidth,
        height: gameHeight
      },
      panel: {
        width: panelWidth,
        height: panelHeight,
        sectionGap
      },
      hud: {
        height: hudHeight
      },
      controls: {
        height: controlsHeight
      },
      answers: {
        height: answersHeight,
        config: safeConfig.answers,
        grid: answerGrid
      },
      mascotSafeZone,
      fallLane,
      overlay: computeOverlayMetrics(viewport, safeConfig, orientation)
    };
  }

  function setVars(target, vars) {
    if (!target || !target.style) return;
    Object.keys(vars).forEach((key) => {
      target.style.setProperty(key, vars[key]);
    });
  }

  function ensureAnswerButtons(container, config) {
    if (!container || !container.appendChild) {
      return [];
    }
    const answerConfig = normalizeAnswerConfig(config);
    const targetCount = answerConfig.count;
    const existing = Array.from(container.querySelectorAll("button.ans"));
    const buttons = [];

    for (let index = 0; index < targetCount; index += 1) {
      let button = existing[index];
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        container.appendChild(button);
      }
      button.className = `ans ${String(answerConfig.itemClass || "").trim()}`.trim();
      button.dataset.idx = String(index);
      if (answerConfig.content === "image") {
        let img = button.querySelector("img");
        if (!img) {
          img = document.createElement("img");
          img.alt = "";
          button.replaceChildren(img);
        }
      } else if (!existing[index]) {
        button.textContent = "";
      }
      buttons.push(button);
    }

    for (let index = existing.length - 1; index >= targetCount; index -= 1) {
      const button = existing[index];
      if (button && button.parentNode === container) {
        container.removeChild(button);
      }
    }

    container.dataset.answerType = answerConfig.type;
    return buttons;
  }

  function applyLayout(layout, refs) {
    const wrapEl = refs && refs.wrapEl;
    const sideEl = refs && refs.sideEl;
    const gameEl = refs && refs.gameEl;
    const hudEl = refs && refs.hudEl;
    const answersPanelEl = refs && refs.answersPanelEl;
    const answersEl = refs && refs.answersEl;
    const controlsEl = refs && refs.controlsEl;
    const rootStyleTarget = document.documentElement;

    if (wrapEl) {
      wrapEl.setAttribute("data-layout-orientation", layout.orientation);
      wrapEl.setAttribute("data-layout-mode", layout.mode);
      wrapEl.setAttribute("data-layout-aspect-band", layout.aspectBand);
      setVars(wrapEl, {
        "--g2-root-padding": px(layout.frame.padding),
        "--g2-frame-gap": px(layout.frame.gap),
        "--g2-game-height": px(layout.game.height),
        "--g2-panel-width": px(layout.panel.width),
        "--g2-panel-height": px(layout.panel.height),
        "--g2-side-gap": px(layout.panel.sectionGap),
        "--g2-hud-height": px(layout.hud.height),
        "--g2-controls-height": px(layout.controls.height),
        "--g2-answers-height": px(layout.answers.height)
      });
    }

    if (gameEl) {
      setVars(gameEl, {
        "--g2-mascot-safe-width": px(layout.mascotSafeZone.width),
        "--g2-mascot-safe-height": px(layout.mascotSafeZone.height)
      });
    }

    if (sideEl) {
      sideEl.setAttribute("data-layout-orientation", layout.orientation);
      sideEl.setAttribute("data-layout-mode", layout.mode);
      sideEl.setAttribute("data-layout-aspect-band", layout.aspectBand);
    }
    if (hudEl) {
      hudEl.style.minHeight = px(layout.hud.height);
    }
    if (answersPanelEl) {
      answersPanelEl.style.minHeight = "0px";
      answersPanelEl.style.height = "";
    }
    if (controlsEl) {
      controlsEl.style.minHeight = px(layout.controls.height);
    }
    if (answersEl) {
      answersEl.dataset.answerType = layout.answers.config.type;
      setVars(answersEl, {
        "--g2-answer-cols": String(layout.answers.grid.cols),
        "--g2-answer-rows": String(layout.answers.grid.rows),
        "--g2-answer-gap": px(layout.answers.grid.gap),
        "--g2-answer-panel-padding": px(layout.answers.grid.padding),
        "--g2-answer-padding": px(Math.max(3, Math.min(10, layout.answers.grid.padding))),
        "--g2-answer-width": px(layout.answers.grid.buttonWidth),
        "--g2-answer-height": px(layout.answers.grid.buttonHeight),
        "--g2-answer-font-size": px(layout.answers.grid.fontSize),
        "--g2-answer-min-height": px(layout.answers.grid.buttonHeight),
        "--g2-answer-radius": px(layout.answers.grid.radius)
      });
    }

    rootStyleTarget.setAttribute("data-layout-orientation", layout.orientation);
    rootStyleTarget.setAttribute("data-layout-mode", layout.mode);
    rootStyleTarget.setAttribute("data-layout-aspect-band", layout.aspectBand);
    rootStyleTarget.setAttribute("data-overlay-actions", layout.overlay.stackActions ? "stack" : "row");
    setVars(rootStyleTarget, {
      "--games-overlay-max-width": px(layout.overlay.maxWidth),
      "--games-overlay-max-height": px(layout.overlay.maxHeight),
      "--games-overlay-padding": px(layout.overlay.padding),
      "--games-overlay-title-size": px(layout.overlay.titleSize),
      "--games-overlay-badge-size": px(layout.overlay.badgeSize),
      "--games-overlay-row-min-height": px(layout.overlay.rowMinHeight),
      "--games-overlay-rank-size": px(layout.overlay.rankSize),
      "--games-overlay-avatar-size": px(layout.overlay.avatarSize),
      "--games-overlay-coins-size": px(layout.overlay.coinsSize),
      "--games-overlay-button-height": px(layout.overlay.buttonMinHeight)
    });
  }

  function createLayoutEngine(config) {
    let activeConfig = normalizeConfig(config);
    let latestLayout = null;

    return {
      getConfig() {
        return activeConfig;
      },
      updateConfig(partialConfig) {
        activeConfig = normalizeConfig(mergeDeep(activeConfig, partialConfig || {}));
        return activeConfig;
      },
      compute(context) {
        latestLayout = computeLayout(activeConfig, context || {});
        return latestLayout;
      },
      getLayout() {
        return latestLayout;
      }
    };
  }

  return {
    getViewport,
    normalizeConfig,
    normalizeAnswerConfig,
    computeLayout,
    applyLayout,
    ensureAnswerButtons,
    createLayoutEngine
  };
})(window.GAMES_V2_UTILS || {});
