const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { test, expect } = require("@playwright/test");
const difficultyApi = require("../../shared/scripts/difficulty-manager.js");

const META_STORAGE_KEY = "games_v3_meta_state_v1";

test.describe.configure({ mode: "serial" });

function loadWordsConfig() {
  const filePath = path.join(__dirname, "..", "..", "words", "config.js");
  const source = fs.readFileSync(filePath, "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.window.GAME_V2_WORDS_CONFIG;
}

function loadWordsManifest() {
  const filePath = path.join(__dirname, "..", "..", "words", "data", "emojis-new", "icon-pack-manifest.tsv");
  const lines = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/);
  lines.shift();
  return lines.map((line) => {
    const parts = line.split("\t");
    const filename = String(parts[0] || "").trim();
    return {
      id: filename.replace(/\.png$/i, ""),
      category: String(parts[1] || "").trim(),
      en: String(parts[2] || "").trim(),
      he: String(parts[3] || "").trim()
    };
  });
}

function normalizeWord(word) {
  return String(word || "").replace(/[\s"'`׳״\-־]/g, "").toLowerCase();
}

function wordLetterCount(word) {
  return normalizeWord(word).length;
}

function commonPrefixLength(left, right) {
  const maxLength = Math.min(left.length, right.length);
  let index = 0;
  while (index < maxLength && left[index] === right[index]) {
    index += 1;
  }
  return index;
}

function commonSuffixLength(left, right) {
  return commonPrefixLength(left.split("").reverse().join(""), right.split("").reverse().join(""));
}

function analyzeSimilarity(correctWord, candidateWord) {
  const correct = normalizeWord(correctWord);
  const candidate = normalizeWord(candidateWord);
  const lengthDiff = Math.abs(correct.length - candidate.length);
  const sameLength = correct.length === candidate.length;
  const sameFirstLetter = !!correct && !!candidate && correct[0] === candidate[0];
  const sameLastLetter = !!correct && !!candidate && correct[correct.length - 1] === candidate[candidate.length - 1];
  const sharedPrefixLength = commonPrefixLength(correct, candidate);
  const sharedSuffixLength = commonSuffixLength(correct, candidate);
  const similarityScore = (sameLength ? 2 : (lengthDiff <= 1 ? 1 : 0))
    + (sameFirstLetter ? 1 : 0)
    + (sameLastLetter ? 1 : 0)
    + Math.min(2, sharedPrefixLength)
    + Math.min(2, sharedSuffixLength);

  return {
    lengthDiff,
    sameLength,
    sameFirstLetter,
    sameLastLetter,
    sharedPrefixLength,
    sharedSuffixLength,
    similarityScore
  };
}

function distractorMatchesRules(analysis, rules) {
  if (!rules.allowSameFirstLetter && analysis.sameFirstLetter) {
    return false;
  }
  if (!rules.allowSameLastLetter && analysis.sameLastLetter) {
    return false;
  }
  if (Number.isFinite(rules.minSimilarityScore) && analysis.similarityScore < rules.minSimilarityScore) {
    return false;
  }
  if (Number.isFinite(rules.maxSimilarityScore) && analysis.similarityScore > rules.maxSimilarityScore) {
    return false;
  }
  if (Number.isFinite(rules.minLengthDelta) && analysis.lengthDiff < rules.minLengthDelta) {
    return false;
  }
  if (Number.isFinite(rules.maxLengthDelta) && analysis.lengthDiff > rules.maxLengthDelta) {
    return false;
  }
  return true;
}

function buildPreferredPool(config, manifest, diffKey, languageId) {
  const profile = config.difficulties[diffKey];
  const rules = profile.wordPool || {};
  const preferredIds = new Set((rules.preferredIds || []).map((value) => String(value || "")));
  return manifest.filter((item) => preferredIds.has(item.id) && wordLetterCount(item[languageId]) >= (profile.minWordLength || 1)
    && (!Number.isFinite(profile.maxWordLength) || wordLetterCount(item[languageId]) <= profile.maxWordLength));
}

function buildLabelMap(manifest, languageId) {
  const map = new Map();
  for (const item of manifest) {
    const normalized = normalizeWord(item[languageId]);
    if (!normalized) {
      continue;
    }
    if (!map.has(normalized)) {
      map.set(normalized, []);
    }
    map.get(normalized).push(item);
  }
  return map;
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
      language: "en",
      coins: 0,
      highestCompletedLevel: 0,
      progressByGame: {
        words: {
          highestCompletedLevel: 0
        }
      },
      currentRank: 1
    },
    settings: {
      preferredDiff: currentDifficulty,
      preferredDiffByGame: {
        words: currentDifficulty
      },
      soundEnabled: false,
      mysteryEnabled: false,
      diffBoundsByGame: {
        words: {
          min: minDifficulty,
          max: maxDifficulty
        }
      },
      adaptiveDifficultyByGame: {
        words: {
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

async function pinWordsDifficulty(page, currentDifficulty, options) {
  const state = buildPinnedMetaState(Object.assign({}, options, { currentDifficulty }));
  await page.addInitScript(() => {
    document.documentElement.lang = "en";
    let capturedConfig = null;
    Object.defineProperty(window, "GAME_V2_WORDS_CONFIG", {
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

async function applyWordsTestOverrides(page) {
  await page.evaluate(() => {
    const cfg = window.GAME_V2_WORDS_CONFIG;
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

async function startWordsLevel(page) {
  await page.goto("/words/");
  await applyWordsTestOverrides(page);
  await page.locator('[data-action="start-level"]').click();
  await page.waitForFunction(() => {
    const overlay = document.querySelector("#overlay");
    return overlay && getComputedStyle(overlay).display === "none";
  }, null, { timeout: 15000 });
}

async function readCurrentWord(page) {
  return page.evaluate(() => {
    const tile = document.getElementById("tile");
    return tile ? String(tile.textContent || "").trim() : "";
  });
}

async function readVisibleOptionIds(page) {
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

function isLoadingWord(word) {
  const normalized = normalizeWord(word);
  return !normalized || normalized === "טוען" || normalized === "loading";
}

function resolveCorrectOptionId(word, optionIds, labelMap) {
  const candidates = labelMap.get(normalizeWord(word)) || [];
  const matchIds = candidates.map((item) => item.id).filter((id) => optionIds.includes(id));
  if (matchIds.length !== 1) {
    throw new Error(`Expected one correct option for word=${word}, got ${matchIds.join(",")}`);
  }
  return matchIds[0];
}

async function isResultsVisible(page) {
  const continueButton = page.locator('[data-action="continue-level"]');
  return continueButton.isVisible().catch(() => false);
}

async function waitForQuestionOrResults(page, expectedOptionId) {
  const timeoutMs = 15000;
  const deadline = Date.now() + timeoutMs;
  const expectedValue = expectedOptionId == null ? null : String(expectedOptionId);

  while (Date.now() < deadline) {
    if (await isResultsVisible(page)) {
      return "results";
    }
    const optionIds = await readVisibleOptionIds(page);
    if (expectedValue == null ? optionIds.length > 0 : optionIds.includes(expectedValue)) {
      return "question";
    }
    await page.waitForTimeout(100);
  }

  const word = await readCurrentWord(page);
  const optionIds = await readVisibleOptionIds(page);
  throw new Error(`Timed out waiting for word/results. expected=${expectedValue || "*"} word=${word} options=${optionIds.join(",")}`);
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

async function answerPreferredOrCurrentWordsTask(page, labelMap, manifestById, preferredCorrectId) {
  const state = await waitForQuestionOrResults(page, null);
  if (state === "results") {
    return null;
  }

  const optionIds = await readVisibleOptionIds(page);
  const preferredValue = String(preferredCorrectId);
  if (optionIds.includes(preferredValue)) {
    await page.locator(`#answers .ans[data-value="${preferredValue}"]`).click({ timeout: 5000 });
    await page.waitForTimeout(180);
    return {
      correctId: preferredValue,
      signature: null
    };
  }

  const currentTask = await readCurrentWordsTask(page, labelMap, manifestById);
  if (!currentTask) {
    return null;
  }
  await page.locator(`#answers .ans[data-value="${currentTask.correctId}"]`).click({ timeout: 5000 });
  await page.waitForTimeout(180);
  return {
    correctId: currentTask.correctId,
    signature: wordsTaskSignature(currentTask)
  };
}

async function clickWrongAnswer(page, correctAnswerId) {
  const state = await waitForQuestionOrResults(page, null);
  if (state === "results") {
    return false;
  }
  const optionIds = await readVisibleOptionIds(page);
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

async function readAdaptiveWordsState(page) {
  return page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && parsed.settings && parsed.settings.adaptiveDifficultyByGame
      ? parsed.settings.adaptiveDifficultyByGame.words
      : null;
  }, META_STORAGE_KEY);
}

async function waitForPlayableWordsTask(page, labelMap) {
  const timeoutMs = 15000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isResultsVisible(page)) {
      return null;
    }

    const word = await readCurrentWord(page);
    const optionIds = await readVisibleOptionIds(page);
    if (isLoadingWord(word) || !optionIds.length) {
      await page.waitForTimeout(100);
      continue;
    }

    const candidates = labelMap.get(normalizeWord(word)) || [];
    const matchIds = candidates.map((item) => item.id).filter((id) => optionIds.includes(id));
    if (matchIds.length === 1) {
      return {
        word,
        optionIds,
        correctId: matchIds[0]
      };
    }

    await page.waitForTimeout(100);
  }

  const word = await readCurrentWord(page);
  const optionIds = await readVisibleOptionIds(page);
  throw new Error(`Timed out waiting for playable word. word=${word} options=${optionIds.join(",")}`);
}

function wordsTaskSignature(task) {
  return `${normalizeWord(task.word)}::${task.optionIds.join("|")}`;
}

async function waitForNextPlayableWordsTaskOrResults(page, labelMap, previousSignature) {
  const timeoutMs = 15000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isResultsVisible(page)) {
      return null;
    }

    const playableTask = await waitForPlayableWordsTask(page, labelMap).catch(() => null);
    if (playableTask && wordsTaskSignature(playableTask) !== previousSignature) {
      return playableTask;
    }

    await page.waitForTimeout(100);
  }

  const word = await readCurrentWord(page);
  const optionIds = await readVisibleOptionIds(page);
  throw new Error(`Timed out waiting for next playable word. previous=${previousSignature} word=${word} options=${optionIds.join(",")}`);
}

async function readCurrentWordsTask(page, labelMap, manifestById) {
  const playableTask = await waitForPlayableWordsTask(page, labelMap);
  if (!playableTask) {
    return null;
  }
  const word = playableTask.word;
  const optionIds = playableTask.optionIds;
  const correctId = playableTask.correctId;
  return {
    word,
    optionIds,
    correctId,
    distractorIds: optionIds.filter((id) => id !== correctId),
    distractorWords: optionIds.filter((id) => id !== correctId).map((id) => manifestById.get(id).en)
  };
}

async function playCurrentWordsLevel(page, labelMap, manifestById, mode) {
  for (let step = 0; step < 10; step += 1) {
    const stateBefore = await waitForQuestionOrResults(page, null);
    if (stateBefore === "results") {
      return;
    }

    const task = await readCurrentWordsTask(page, labelMap, manifestById);
    if (!task) {
      return;
    }
    const previousSignature = wordsTaskSignature(task);

    if (mode === "comfortable") {
      await page.waitForTimeout(80);
      // Re-read the current task after the wait in case the question changed during the delay
      const currentTask = await readCurrentWordsTask(page, labelMap, manifestById);
      if (!currentTask) {
        return;
      }
      await page.locator(`#answers .ans[data-value="${currentTask.correctId}"]`).click({ timeout: 5000 });
      await page.waitForTimeout(180);
      await waitForNextPlayableWordsTaskOrResults(page, labelMap, wordsTaskSignature(currentTask));
    } else if (mode === "struggling") {
      await page.waitForTimeout(80);
      const clickedWrong = await clickWrongAnswer(page, task.correctId);
      if (!clickedWrong) {
        return;
      }
      const recoveryAnswer = await answerPreferredOrCurrentWordsTask(page, labelMap, manifestById, task.correctId);
      if (!recoveryAnswer) {
        return;
      }
      await waitForNextPlayableWordsTaskOrResults(page, labelMap, recoveryAnswer.signature || previousSignature);
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

function expectRuntimeTaskMatchesDifficulty(config, manifest, profileKey, task) {
  const profile = config.difficulties[profileKey];
  const rules = profile.distractors || {};
  const correctLength = wordLetterCount(task.word);

  expect(correctLength).toBeGreaterThanOrEqual(profile.minWordLength || 1);
  if (Number.isFinite(profile.maxWordLength)) {
    expect(correctLength).toBeLessThanOrEqual(profile.maxWordLength);
  }

  const preferredPool = buildPreferredPool(config, manifest, profileKey, "en");
  if (preferredPool.length >= Math.max(4, Number((profile.wordPool && profile.wordPool.preferredOnlyMinPool) || 0))) {
    const preferredIds = new Set((profile.wordPool && profile.wordPool.preferredIds) || []);
    if (preferredIds.size) {
      expect(preferredIds.has(task.correctId)).toBe(true);
    }
  }

  const seenWords = new Set([normalizeWord(task.word)]);
  expect(task.distractorIds.length).toBe(3);
  for (const distractorWord of task.distractorWords) {
    const normalized = normalizeWord(distractorWord);
    expect(normalized).not.toBe("");
    expect(seenWords.has(normalized)).toBe(false);
    seenWords.add(normalized);
    expect(distractorMatchesRules(analyzeSimilarity(task.word, distractorWord), rules)).toBe(true);
  }
}

test("words config defines four explicit V1 difficulty profiles without hidden progression", async () => {
  const config = loadWordsConfig();
  expect(Object.keys(config.difficulties || {})).toEqual(["easy", "medium", "hard", "super"]);
  expect(config.diffs).toBeUndefined();
  expect(config.gameplay.correctPerDiffStep).toBeUndefined();
});

test("difficulty manager applies V1 comfortable, balanced, struggling, and recovery rules for words", async () => {
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
  test(`words runtime tasks stay within the ${diffKey} difficulty rules`, async ({ page }) => {
    const config = loadWordsConfig();
    const manifest = loadWordsManifest();
    const manifestById = new Map(manifest.map((item) => [item.id, item]));
    const labelMap = buildLabelMap(manifest, "en");

    await pinWordsDifficulty(page, diffKey);
    await startWordsLevel(page);

    for (let index = 0; index < 2; index += 1) {
      const task = await readCurrentWordsTask(page, labelMap, manifestById);
      expect(task).not.toBeNull();
      expectRuntimeTaskMatchesDifficulty(config, manifest, diffKey, task);
      await answerCurrentTask(page, task.correctId);
    }
  });
}

test("words browser run upgrades after two comfortable levels, then recovers and downgrades after two struggling levels", async ({ page }) => {
  test.setTimeout(60000);
  const manifest = loadWordsManifest();
  const manifestById = new Map(manifest.map((item) => [item.id, item]));
  const labelMap = buildLabelMap(manifest, "en");

  await pinWordsDifficulty(page, "medium", { minDifficulty: "easy", maxDifficulty: "super" });
  await startWordsLevel(page);

  await playCurrentWordsLevel(page, labelMap, manifestById, "comfortable");
  await waitForResultsOverlay(page);
  let adaptiveState = await readAdaptiveWordsState(page);
  expect(adaptiveState).toMatchObject({
    currentDifficulty: "medium",
    comfortableStreak: 1,
    strugglingStreak: 0,
    pendingRecoveryLevel: null
  });
  await continueAfterResults(page);

  await playCurrentWordsLevel(page, labelMap, manifestById, "comfortable");
  await waitForResultsOverlay(page);
  adaptiveState = await readAdaptiveWordsState(page);
  expect(adaptiveState).toMatchObject({
    currentDifficulty: "hard",
    comfortableStreak: 0,
    strugglingStreak: 0,
    pendingRecoveryLevel: null
  });
  await continueAfterResults(page);

  await playCurrentWordsLevel(page, labelMap, manifestById, "struggling");
  await waitForResultsOverlay(page);
  adaptiveState = await readAdaptiveWordsState(page);
  expect(adaptiveState).toMatchObject({
    currentDifficulty: "hard",
    comfortableStreak: 0,
    strugglingStreak: 1,
    pendingRecoveryLevel: "medium"
  });
  await continueAfterResults(page);

  await playCurrentWordsLevel(page, labelMap, manifestById, "struggling");
  await waitForResultsOverlay(page);
  adaptiveState = await readAdaptiveWordsState(page);
  expect(adaptiveState).toMatchObject({
    currentDifficulty: "medium",
    comfortableStreak: 0,
    strugglingStreak: 0,
    pendingRecoveryLevel: null
  });
});
