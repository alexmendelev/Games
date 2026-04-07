const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { test, expect } = require("@playwright/test");
const difficultyApi = require("../../shared/scripts/difficulty-manager.js");

const META_STORAGE_KEY = "games_v3_meta_state_v1";

test.describe.configure({ mode: "serial" });

function loadShapesConfig() {
  const filePath = path.join(__dirname, "..", "..", "shapes", "config.js");
  const source = fs.readFileSync(filePath, "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.window.GAME_V2_SHAPES_CONFIG;
}

function buildPairs(cfg) {
  const pairs = [];
  for (const shape of cfg.shapes || []) {
    for (const color of cfg.colors || []) {
      pairs.push({
        id: `${shape.id}__${color.id}`,
        shapeId: shape.id,
        shapeHe: shape.he,
        colorId: color.id,
        colorHe: color.he,
        colorHex: color.hex,
        label: `${shape.he} ${color.he}`
      });
    }
  }
  return pairs;
}

function buildLabelMap(pairs) {
  const map = new Map();
  for (const item of pairs) {
    if (!map.has(item.label)) {
      map.set(item.label, []);
    }
    map.get(item.label).push(item);
  }
  return map;
}

function buildPoolForProfile(pairs, profile) {
  const allowedShapes = new Set(profile.shapePool || []);
  const allowedColors = new Set(profile.colorPool || []);
  return pairs.filter((item) => allowedShapes.has(item.shapeId) && allowedColors.has(item.colorId));
}

function hasNeighbor(map, sourceId, candidateId) {
  const neighbors = map && map[sourceId];
  return Array.isArray(neighbors) ? neighbors.includes(candidateId) : false;
}

function classifySimilarity(cfg, correct, candidate) {
  const sameShape = candidate.shapeId === correct.shapeId;
  const sameColor = candidate.colorId === correct.colorId;
  const relatedShape = !sameShape && hasNeighbor(cfg.similarity && cfg.similarity.shapeNeighbors, correct.shapeId, candidate.shapeId);
  const relatedColor = !sameColor && hasNeighbor(cfg.similarity && cfg.similarity.colorNeighbors, correct.colorId, candidate.colorId);

  if (sameShape && relatedColor) {
    return "same-shape-related-color";
  }
  if (relatedShape && sameColor) {
    return "related-shape-same-color";
  }
  if (sameShape) {
    return "same-shape";
  }
  if (sameColor) {
    return "same-color";
  }
  if (relatedShape && relatedColor) {
    return "related-shape-related-color";
  }
  if (relatedShape) {
    return "related-shape";
  }
  if (relatedColor) {
    return "related-color";
  }
  return "distinct";
}

function buildPinnedMetaState(options) {
  const settings = Object.assign({
    currentDifficulty: "medium",
    minDifficulty: null,
    maxDifficulty: null
  }, options || {});
  const currentDifficulty = settings.currentDifficulty;
  const minDifficulty = settings.minDifficulty || currentDifficulty;
  const maxDifficulty = settings.maxDifficulty || currentDifficulty;

  return {
    version: 3,
    player: {
      id: "me",
      name: "Tester",
      avatar: "lion",
      language: "he",
      coins: 0,
      highestCompletedLevel: 0,
      progressByGame: {
        shapes: {
          highestCompletedLevel: 0
        }
      },
      currentRank: 1
    },
    settings: {
      preferredDiff: currentDifficulty,
      preferredDiffByGame: {
        shapes: currentDifficulty
      },
      soundEnabled: false,
      diffBoundsByGame: {
        shapes: {
          min: minDifficulty,
          max: maxDifficulty
        }
      },
      adaptiveDifficultyByGame: {
        shapes: {
          currentDifficulty,
          comfortableStreak: 0,
          strugglingStreak: 0,
          pendingRecoveryLevel: null
        }
      }
    },
    participants: [
      { id: "me", name: "Tester", avatar: "lion", coins: 0 }
    ],
    rewardProgress: {
      consecutiveGameKey: "",
      consecutiveGameCount: 0
    }
  };
}

async function pinShapesDifficulty(page, currentDifficulty, options) {
  const state = buildPinnedMetaState(Object.assign({}, options, { currentDifficulty }));
  await page.addInitScript(() => {
    let capturedConfig = null;
    Object.defineProperty(window, "GAME_V2_SHAPES_CONFIG", {
      configurable: true,
      enumerable: true,
      get() {
        return capturedConfig;
      },
      set(value) {
        if (value && typeof value === "object") {
          value.answerLockMs = 60;
          if (value.gameplay && typeof value.gameplay === "object") {
            value.gameplay.specialChance = 0;
            value.gameplay.levelGoals = {
              easy: { correctTarget: 3, timeLimitMs: 60000 },
              medium: { correctTarget: 3, timeLimitMs: 60000 },
              hard: { correctTarget: 3, timeLimitMs: 60000 },
              super: { correctTarget: 3, timeLimitMs: 60000 }
            };
          }
        }
        capturedConfig = value;
      }
    });
  });
  await page.addInitScript((payload) => {
    window.localStorage.clear();
    window.localStorage.setItem(payload.storageKey, JSON.stringify(payload.state));
  }, {
    storageKey: META_STORAGE_KEY,
    state
  });
}

async function applyShapesTestOverrides(page) {
  await page.evaluate(() => {
    const cfg = window.GAME_V2_SHAPES_CONFIG;
    if (!cfg || typeof cfg !== "object") {
      return;
    }
    cfg.answerLockMs = 60;
    if (cfg.gameplay && typeof cfg.gameplay === "object") {
      cfg.gameplay.specialChance = 0;
      cfg.gameplay.levelGoals = {
        easy: { correctTarget: 3, timeLimitMs: 60000 },
        medium: { correctTarget: 3, timeLimitMs: 60000 },
        hard: { correctTarget: 3, timeLimitMs: 60000 },
        super: { correctTarget: 3, timeLimitMs: 60000 }
      };
    }
  });
}

async function startShapesLevel(page) {
  await page.goto("/shapes/");
  await applyShapesTestOverrides(page);
  await page.locator('[data-action="start-level"]').click();
  await page.waitForFunction(() => {
    const overlay = document.querySelector("#overlay");
    return overlay && getComputedStyle(overlay).display === "none";
  }, null, { timeout: 15000 });
}

async function readCurrentLabel(page) {
  return page.evaluate(() => {
    const label = document.getElementById("tileLabel");
    return label ? String(label.textContent || "").trim() : "";
  });
}

async function isResultsVisible(page) {
  const continueButton = page.locator('[data-action="continue-level"]');
  return continueButton.isVisible().catch(() => false);
}

async function getVisibleOptionIds(page) {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll("#answers .ans"))
      .filter((button) => {
        const style = getComputedStyle(button);
        const rect = button.getBoundingClientRect();
        return style.display !== "none"
          && style.visibility !== "hidden"
          && rect.width > 0
          && rect.height > 0
          && !button.disabled;
      })
      .map((button) => String(button.dataset.value || ""));
  });
}

async function waitForQuestionOrResults(page, expectedOptionId) {
  const timeoutMs = 15000;
  const deadline = Date.now() + timeoutMs;
  const expectedValue = expectedOptionId == null ? null : String(expectedOptionId);

  while (Date.now() < deadline) {
    if (await isResultsVisible(page)) {
      return "results";
    }
    const optionIds = await getVisibleOptionIds(page);
    if (expectedValue == null ? optionIds.length > 0 : optionIds.includes(expectedValue)) {
      return "question";
    }
    await page.waitForTimeout(100);
  }

  const label = await readCurrentLabel(page);
  const optionIds = await getVisibleOptionIds(page);
  throw new Error(`Timed out waiting for shape/results. expected=${expectedValue || "*"} label=${label} options=${optionIds.join(",")}`);
}

async function answerCurrentTask(page, answerId) {
  const state = await waitForQuestionOrResults(page, answerId);
  if (state === "results") {
    return false;
  }
  await page.locator(`#answers .ans[data-value="${answerId}"]`).click({ timeout: 5000 });
  await page.waitForTimeout(180);
  return true;
}

async function answerPreferredOrCurrentShapesTask(page, labelMap, preferredCorrectId) {
  const state = await waitForQuestionOrResults(page, null);
  if (state === "results") {
    return null;
  }

  const optionIds = await getVisibleOptionIds(page);
  const preferredValue = String(preferredCorrectId);
  if (optionIds.includes(preferredValue)) {
    await page.locator(`#answers .ans[data-value="${preferredValue}"]`).click({ timeout: 5000 });
    await page.waitForTimeout(180);
    return {
      correctId: preferredValue,
      signature: null
    };
  }

  const currentTask = await readCurrentShapesTask(page, labelMap);
  if (!currentTask) {
    return null;
  }
  await page.locator(`#answers .ans[data-value="${currentTask.correctId}"]`).click({ timeout: 5000 });
  await page.waitForTimeout(180);
  return {
    correctId: currentTask.correctId,
    signature: shapesTaskSignature(currentTask)
  };
}

async function clickWrongAnswer(page, correctAnswerId) {
  const state = await waitForQuestionOrResults(page, null);
  if (state === "results") {
    return false;
  }
  const optionIds = await getVisibleOptionIds(page);
  const wrongId = optionIds.find((value) => value !== String(correctAnswerId));
  if (wrongId == null) {
    throw new Error(`No visible wrong option found for correct=${correctAnswerId}`);
  }
  await page.locator(`#answers .ans[data-value="${wrongId}"]`).click({ timeout: 5000 });
  await page.waitForTimeout(120);
  return true;
}

async function waitForResultsOverlay(page) {
  await page.waitForFunction(() => {
    const overlay = document.querySelector("#overlay");
    const continueButton = document.querySelector('[data-action="continue-level"]');
    return overlay && continueButton && getComputedStyle(overlay).display !== "none";
  }, null, { timeout: 15000 });
}

async function continueAfterResults(page) {
  await page.locator('[data-action="continue-level"]').click();
  await page.waitForFunction(() => {
    const overlay = document.querySelector("#overlay");
    return overlay && getComputedStyle(overlay).display === "none";
  }, null, { timeout: 15000 });
}

async function readAdaptiveShapesState(page) {
  return page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && parsed.settings && parsed.settings.adaptiveDifficultyByGame
      ? parsed.settings.adaptiveDifficultyByGame.shapes
      : null;
  }, META_STORAGE_KEY);
}

async function waitForPlayableShapesTask(page, labelMap) {
  const timeoutMs = 15000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isResultsVisible(page)) {
      return null;
    }

    const label = await readCurrentLabel(page);
    const optionIds = await getVisibleOptionIds(page);
    if (!label || !optionIds.length) {
      await page.waitForTimeout(100);
      continue;
    }

    const candidates = labelMap.get(label) || [];
    const matchIds = candidates.map((item) => item.id).filter((id) => optionIds.includes(id));
    if (matchIds.length === 1) {
      return {
        label,
        optionIds,
        correctId: matchIds[0]
      };
    }

    await page.waitForTimeout(100);
  }

  const label = await readCurrentLabel(page);
  const optionIds = await getVisibleOptionIds(page);
  throw new Error(`Timed out waiting for playable shape task. label=${label} options=${optionIds.join(",")}`);
}

function shapesTaskSignature(task) {
  return `${task.label}::${task.optionIds.join("|")}`;
}

async function waitForNextPlayableShapesTaskOrResults(page, labelMap, previousSignature) {
  const timeoutMs = 15000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isResultsVisible(page)) {
      return null;
    }

    const playableTask = await waitForPlayableShapesTask(page, labelMap).catch(() => null);
    if (playableTask && shapesTaskSignature(playableTask) !== previousSignature) {
      return playableTask;
    }

    await page.waitForTimeout(100);
  }

  const label = await readCurrentLabel(page);
  const optionIds = await getVisibleOptionIds(page);
  throw new Error(`Timed out waiting for next playable shape task. previous=${previousSignature} label=${label} options=${optionIds.join(",")}`);
}

async function readCurrentShapesTask(page, labelMap) {
  const playableTask = await waitForPlayableShapesTask(page, labelMap);
  if (!playableTask) {
    return null;
  }
  return {
    label: playableTask.label,
    optionIds: playableTask.optionIds,
    correctId: playableTask.correctId,
    distractorIds: playableTask.optionIds.filter((id) => id !== playableTask.correctId)
  };
}

async function playCurrentShapesLevel(page, labelMap, mode) {
  for (let step = 0; step < 10; step += 1) {
    const stateBefore = await waitForQuestionOrResults(page, null);
    if (stateBefore === "results") {
      return;
    }

    const task = await readCurrentShapesTask(page, labelMap);
    if (!task) {
      return;
    }
    const previousSignature = shapesTaskSignature(task);

    if (mode === "comfortable") {
      await page.waitForTimeout(80);
      const answered = await answerCurrentTask(page, task.correctId);
      if (!answered) {
        return;
      }
      await waitForNextPlayableShapesTaskOrResults(page, labelMap, previousSignature);
    } else if (mode === "struggling") {
      await page.waitForTimeout(80);
      const clickedWrong = await clickWrongAnswer(page, task.correctId);
      if (!clickedWrong) {
        return;
      }
      const recoveryAnswer = await answerPreferredOrCurrentShapesTask(page, labelMap, task.correctId);
      if (!recoveryAnswer) {
        return;
      }
      await waitForNextPlayableShapesTaskOrResults(page, labelMap, recoveryAnswer.signature || previousSignature);
    } else {
      throw new Error(`Unsupported play mode: ${mode}`);
    }

    const overlayVisibleAfter = await page.evaluate(() => {
      const overlay = document.querySelector("#overlay");
      return !!overlay && getComputedStyle(overlay).display !== "none";
    });
    if (overlayVisibleAfter) {
      return;
    }
  }

  throw new Error(`Level did not finish in mode ${mode}`);
}

function expectRuntimeTaskMatchesDifficulty(cfg, pairsById, profileKey, task) {
  const profile = cfg.difficulties[profileKey];
  const pool = buildPoolForProfile(Array.from(pairsById.values()), profile);
  const poolIds = new Set(pool.map((item) => item.id));
  const allowedTiers = new Set((profile.distractorPlan || []).concat(profile.fallbackTiers || []));
  const correct = pairsById.get(task.correctId);

  expect(task.optionIds.length).toBe(profile.answerCount);
  expect(correct).toBeTruthy();

  const classifications = [];
  const actualCounts = Object.create(null);

  for (const optionId of task.optionIds) {
    expect(poolIds.has(optionId)).toBe(true);
    if (optionId === task.correctId) {
      continue;
    }
    const candidate = pairsById.get(optionId);
    const similarityKey = classifySimilarity(cfg, correct, candidate);
    classifications.push(similarityKey);
    actualCounts[similarityKey] = (actualCounts[similarityKey] || 0) + 1;
    expect(allowedTiers.has(similarityKey)).toBe(true);
  }

  if (profileKey === "easy") {
    expect(actualCounts.distinct || 0).toBeGreaterThanOrEqual(1);
    expect(actualCounts["related-shape"] || 0).toBe(0);
    expect(actualCounts["related-color"] || 0).toBe(0);
    expect(actualCounts["related-shape-related-color"] || 0).toBe(0);
    expect(actualCounts["same-shape-related-color"] || 0).toBe(0);
    expect(actualCounts["related-shape-same-color"] || 0).toBe(0);
  }

  if (profileKey === "medium") {
    const simpleSharedFeatureCount = (actualCounts["same-shape"] || 0) + (actualCounts["same-color"] || 0);
    expect(simpleSharedFeatureCount).toBeGreaterThanOrEqual(2);
    expect(actualCounts["same-shape-related-color"] || 0).toBe(0);
    expect(actualCounts["related-shape-same-color"] || 0).toBe(0);
    expect(actualCounts["related-shape-related-color"] || 0).toBe(0);
  }

  if (profileKey === "hard") {
    const compoundCount = (actualCounts["same-shape-related-color"] || 0)
      + (actualCounts["related-shape-same-color"] || 0)
      + (actualCounts["related-shape-related-color"] || 0);
    const nonDistinctCount = classifications.filter((item) => item !== "distinct").length;
    expect(compoundCount).toBeGreaterThanOrEqual(2);
    expect(nonDistinctCount).toBeGreaterThanOrEqual(8);
  }

  if (profileKey === "super") {
    const compoundCount = (actualCounts["same-shape-related-color"] || 0)
      + (actualCounts["related-shape-same-color"] || 0)
      + (actualCounts["related-shape-related-color"] || 0);
    const nonDistinctCount = classifications.filter((item) => item !== "distinct").length;
    expect(compoundCount).toBeGreaterThanOrEqual(4);
    expect(nonDistinctCount).toBeGreaterThanOrEqual(13);
    expect(actualCounts.distinct || 0).toBeLessThanOrEqual(2);
  }
}

test("shapes config defines four explicit V1 difficulty profiles without hidden progression", async () => {
  const cfg = loadShapesConfig();
  expect(Object.keys(cfg.difficulties || {})).toEqual(["easy", "medium", "hard", "super"]);
  expect(cfg.diffs).toBeUndefined();
  expect(cfg.difficulties.easy.answerCount).toBe(4);
  expect(cfg.difficulties.medium.answerCount).toBe(8);
  expect(cfg.difficulties.hard.answerCount).toBe(12);
  expect(cfg.difficulties.super.answerCount).toBe(16);
});

test("difficulty manager applies V1 comfortable, balanced, struggling, and recovery rules for shapes", async () => {
  const config = {
    difficultyOrder: ["easy", "medium", "hard", "super"],
    minDifficulty: "easy",
    maxDifficulty: "super"
  };

  const comfortable = {
    passed: true,
    avgAnswerMs: 4000,
    wrongClicks: 1,
    correctCount: 8,
    questionTimeLimitMs: 12000
  };
  const balanced = {
    passed: true,
    avgAnswerMs: 6500,
    wrongClicks: 2,
    correctCount: 8,
    questionTimeLimitMs: 12000
  };
  const struggling = {
    passed: false,
    avgAnswerMs: 9000,
    wrongClicks: 6,
    correctCount: 4,
    questionTimeLimitMs: 12000
  };

  let state = {
    currentDifficulty: "medium",
    comfortableStreak: 0,
    strugglingStreak: 0,
    pendingRecoveryLevel: null
  };

  let outcome = difficultyApi.completeLevel(config, state, comfortable);
  expect(outcome.classification.label).toBe("comfortable");
  expect(outcome.state.currentDifficulty).toBe("medium");
  expect(outcome.state.comfortableStreak).toBe(1);

  state = outcome.state;
  outcome = difficultyApi.completeLevel(config, state, comfortable);
  expect(outcome.state.currentDifficulty).toBe("hard");
  expect(outcome.state.comfortableStreak).toBe(0);

  state = outcome.state;
  outcome = difficultyApi.completeLevel(config, state, balanced);
  expect(outcome.classification.label).toBe("balanced");
  expect(outcome.state.comfortableStreak).toBe(0);
  expect(outcome.state.strugglingStreak).toBe(0);

  state = outcome.state;
  outcome = difficultyApi.completeLevel(config, state, struggling);
  expect(outcome.classification.label).toBe("struggling");
  expect(outcome.state.currentDifficulty).toBe("hard");
  expect(outcome.state.pendingRecoveryLevel).toBe("medium");
  expect(outcome.nextDifficulty).toBe("medium");

  state = outcome.state;
  outcome = difficultyApi.completeLevel(config, state, struggling);
  expect(outcome.state.currentDifficulty).toBe("medium");
  expect(outcome.state.pendingRecoveryLevel).toBeNull();
  expect(outcome.state.strugglingStreak).toBe(0);
});

for (const diffKey of ["easy", "medium", "hard", "super"]) {
  test(`shapes runtime tasks stay within the ${diffKey} difficulty rules`, async ({ page }) => {
    const cfg = loadShapesConfig();
    const pairs = buildPairs(cfg);
    const pairsById = new Map(pairs.map((item) => [item.id, item]));
    const labelMap = buildLabelMap(pairs);

    await pinShapesDifficulty(page, diffKey);
    await startShapesLevel(page);

    for (let index = 0; index < 2; index += 1) {
      const task = await readCurrentShapesTask(page, labelMap);
      expect(task).not.toBeNull();
      expectRuntimeTaskMatchesDifficulty(cfg, pairsById, diffKey, task);
      await answerCurrentTask(page, task.correctId);
    }
  });
}

test("shapes browser run upgrades after two comfortable levels, then recovers and downgrades after two struggling levels", async ({ page }) => {
  test.setTimeout(60000);
  const cfg = loadShapesConfig();
  const pairs = buildPairs(cfg);
  const labelMap = buildLabelMap(pairs);

  await pinShapesDifficulty(page, "medium", { minDifficulty: "easy", maxDifficulty: "super" });
  await startShapesLevel(page);

  await playCurrentShapesLevel(page, labelMap, "comfortable");
  await waitForResultsOverlay(page);
  let adaptiveState = await readAdaptiveShapesState(page);
  expect(adaptiveState).toMatchObject({
    currentDifficulty: "medium",
    comfortableStreak: 1,
    strugglingStreak: 0,
    pendingRecoveryLevel: null
  });
  await continueAfterResults(page);

  await playCurrentShapesLevel(page, labelMap, "comfortable");
  await waitForResultsOverlay(page);
  adaptiveState = await readAdaptiveShapesState(page);
  expect(adaptiveState).toMatchObject({
    currentDifficulty: "hard",
    comfortableStreak: 0,
    strugglingStreak: 0,
    pendingRecoveryLevel: null
  });
  await continueAfterResults(page);

  await playCurrentShapesLevel(page, labelMap, "struggling");
  await waitForResultsOverlay(page);
  adaptiveState = await readAdaptiveShapesState(page);
  expect(adaptiveState).toMatchObject({
    currentDifficulty: "hard",
    comfortableStreak: 0,
    strugglingStreak: 1,
    pendingRecoveryLevel: "medium"
  });
  await continueAfterResults(page);

  await playCurrentShapesLevel(page, labelMap, "struggling");
  await waitForResultsOverlay(page);
  adaptiveState = await readAdaptiveShapesState(page);
  expect(adaptiveState).toMatchObject({
    currentDifficulty: "medium",
    comfortableStreak: 0,
    strugglingStreak: 0,
    pendingRecoveryLevel: null
  });
});
