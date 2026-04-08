const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { test, expect } = require("@playwright/test");
const difficultyApi = require("../../shared/scripts/difficulty-manager.js");

const META_STORAGE_KEY = "games_v3_meta_state_v1";
const MULTIPLY_SYMBOL = "\u00d7";
const DIVIDE_SYMBOL = "\u00f7";

test.describe.configure({ mode: "serial" });

function loadEquationsConfig() {
  const filePath = path.join(__dirname, "..", "..", "equations", "config.js");
  const source = fs.readFileSync(filePath, "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.window.GAME_V3_EQUATIONS_CONFIG;
}

function parseEquationSide(value) {
  const normalized = String(value || "").trim();
  if (normalized === "?") {
    return null;
  }
  return Number(normalized);
}

function parseEquationTaskText(text) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  const regex = new RegExp(`^(\\?|\\d+) ([+\\-${MULTIPLY_SYMBOL}${DIVIDE_SYMBOL}]) (\\?|\\d+) = (\\?|\\d+)$`);
  const match = normalized.match(regex);
  if (!match) {
    throw new Error(`Unrecognized equations task: ${normalized}`);
  }

  const left = parseEquationSide(match[1]);
  const opSymbol = match[2];
  const right = parseEquationSide(match[3]);
  const result = parseEquationSide(match[4]);
  const op = opSymbol === MULTIPLY_SYMBOL ? "*" : (opSymbol === DIVIDE_SYMBOL ? "/" : opSymbol);

  let missingSlot = "result";
  if (left == null) {
    missingSlot = "left";
  } else if (right == null) {
    missingSlot = "right";
  }

  let answer;
  if (missingSlot === "left") {
    if (op === "+") answer = result - right;
    if (op === "-") answer = result + right;
    if (op === "*") answer = result / right;
    if (op === "/") answer = result * right;
  } else if (missingSlot === "right") {
    if (op === "+") answer = result - left;
    if (op === "-") answer = left - result;
    if (op === "*") answer = result / left;
    if (op === "/") answer = left / result;
  } else {
    if (op === "+") answer = left + right;
    if (op === "-") answer = left - right;
    if (op === "*") answer = left * right;
    if (op === "/") answer = left / right;
  }

  return {
    op,
    left,
    right,
    result,
    missingSlot,
    answer
  };
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
        equations: {
          highestCompletedLevel: 0
        }
      },
      currentRank: 1
    },
    settings: {
      preferredDiff: currentDifficulty,
      preferredDiffByGame: {
        equations: currentDifficulty
      },
      soundEnabled: false,
      diffBoundsByGame: {
        equations: {
          min: minDifficulty,
          max: maxDifficulty
        }
      },
      adaptiveDifficultyByGame: {
        equations: {
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

async function pinEquationsDifficulty(page, currentDifficulty, options) {
  const state = buildPinnedMetaState(Object.assign({}, options, { currentDifficulty }));
  await page.addInitScript(() => {
    let capturedConfig = null;
    Object.defineProperty(window, "GAME_V3_EQUATIONS_CONFIG", {
      configurable: true,
      enumerable: true,
      get() {
        return capturedConfig;
      },
      set(value) {
        if (value && typeof value === "object") {
          value.answerFeedbackMs = 60;
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

async function startEquationsLevel(page) {
  await page.goto("/equations/");
  await page.locator('[data-action="start-level"]').click();
  await page.waitForFunction(() => {
    const overlay = document.querySelector("#overlay");
    return overlay && getComputedStyle(overlay).display === "none";
  }, null, { timeout: 15000 });
}

async function readCurrentTask(page) {
  return page.evaluate(() => {
    const tile = document.getElementById("tile");
    return tile ? String(tile.textContent || "").trim() : "";
  });
}

async function readParsedCurrentTask(page) {
  return parseEquationTaskText(await readCurrentTask(page));
}

async function isResultsVisible(page) {
  const continueButton = page.locator('[data-action="continue-level"]');
  return continueButton.isVisible().catch(() => false);
}

async function getVisibleEnabledAnswerValues(page) {
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
      .map((button) => String(button.dataset.val));
  });
}

async function waitForQuestionOrResults(page, expectedAnswer) {
  const timeoutMs = 15000;
  const deadline = Date.now() + timeoutMs;
  const expectedValue = expectedAnswer == null ? null : String(expectedAnswer);

  while (Date.now() < deadline) {
    if (await isResultsVisible(page)) {
      return "results";
    }
    const visibleValues = await getVisibleEnabledAnswerValues(page);
    if (expectedValue == null ? visibleValues.length > 0 : visibleValues.includes(expectedValue)) {
      return "question";
    }
    await page.waitForTimeout(100);
  }

  const taskText = await readCurrentTask(page);
  const visibleValues = await getVisibleEnabledAnswerValues(page);
  throw new Error(`Timed out waiting for question/results. expected=${expectedValue || "*"} task=${taskText} answers=${visibleValues.join(",")}`);
}

async function answerCurrentTask(page, answer) {
  const state = await waitForQuestionOrResults(page, answer);
  if (state === "results") {
    return false;
  }
  await page.locator(`#answers .ans[data-val="${answer}"]`).click({ timeout: 5000 });
  await page.waitForTimeout(180);
  return true;
}

async function clickWrongAnswer(page, correctAnswer) {
  const state = await waitForQuestionOrResults(page, null);
  if (state === "results") {
    return false;
  }
  const visibleValues = await getVisibleEnabledAnswerValues(page);
  const wrongValue = visibleValues.find((value) => value !== String(correctAnswer));
  if (wrongValue == null) {
    throw new Error(`No visible wrong answer found for correct=${correctAnswer}`);
  }
  await page.locator(`#answers .ans[data-val="${wrongValue}"]`).click({ timeout: 5000 });
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

async function readAdaptiveEquationsState(page) {
  return page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && parsed.settings && parsed.settings.adaptiveDifficultyByGame
      ? parsed.settings.adaptiveDifficultyByGame.equations
      : null;
  }, META_STORAGE_KEY);
}

async function playCurrentEquationsLevel(page, mode) {
  for (let step = 0; step < 10; step += 1) {
    const stateBefore = await waitForQuestionOrResults(page, null);
    if (stateBefore === "results") {
      return;
    }

    const task = await readParsedCurrentTask(page);

    if (mode === "comfortable") {
      await page.waitForTimeout(80);
      const answered = await answerCurrentTask(page, task.answer);
      if (!answered) {
        return;
      }
    } else if (mode === "struggling") {
      await page.waitForTimeout(80);
      const clickedWrong = await clickWrongAnswer(page, task.answer);
      if (!clickedWrong) {
        return;
      }
      const stateAfterWrong = await waitForQuestionOrResults(page, null);
      if (stateAfterWrong === "results") {
        return;
      }
      const currentTask = await readParsedCurrentTask(page);
      const answered = await answerCurrentTask(page, currentTask.answer);
      if (!answered) {
        return;
      }
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

function expectTaskToMatchDifficulty(task, profileKey, profile) {
  expect(profile.operations).toContain(task.op);
  expect(profile.missingSlots).toContain(task.missingSlot);
  expect(task.answer).toBeGreaterThanOrEqual(0);

  if (task.left != null) {
    expect(task.left).toBeGreaterThan(0);
  }
  if (task.right != null) {
    expect(task.right).toBeGreaterThan(0);
  }
  if (task.result != null) {
    expect(task.result).toBeGreaterThanOrEqual(0);
  }

  if (profileKey === "easy") {
    expect(task.op).toBe("+");
    expect(task.missingSlot).toBe("result");
  }

  if (task.op === "+") {
    if (task.left != null) {
      expect(task.left).toBeGreaterThanOrEqual(profile.addition.left[0]);
      expect(task.left).toBeLessThanOrEqual(profile.addition.left[1]);
    }
    if (task.right != null) {
      expect(task.right).toBeGreaterThanOrEqual(profile.addition.right[0]);
      expect(task.right).toBeLessThanOrEqual(profile.addition.right[1]);
    }
    if (task.result != null) {
      expect(task.result).toBeLessThanOrEqual(profile.addition.resultMax);
    }
  }

  if (task.op === "-") {
    if (task.left != null) {
      expect(task.left).toBeGreaterThanOrEqual(profile.subtraction.left[0]);
      expect(task.left).toBeLessThanOrEqual(profile.subtraction.left[1]);
    }
    if (task.right != null) {
      expect(task.right).toBeGreaterThanOrEqual(profile.subtraction.right[0]);
      expect(task.right).toBeLessThanOrEqual(profile.subtraction.right[1]);
    }
    if (task.result != null) {
      expect(task.result).toBeGreaterThanOrEqual(0);
      expect(task.result).toBeLessThanOrEqual(profile.subtraction.resultMax);
    }
  }

  if (task.op === "*") {
    expect(profileKey).toBe("super");
    if (task.left != null) {
      expect(task.left).toBeGreaterThanOrEqual(profile.multiplication.left[0]);
      expect(task.left).toBeLessThanOrEqual(profile.multiplication.left[1]);
    }
    if (task.right != null) {
      expect(task.right).toBeGreaterThanOrEqual(profile.multiplication.right[0]);
      expect(task.right).toBeLessThanOrEqual(profile.multiplication.right[1]);
    }
    if (task.result != null) {
      expect(task.result).toBeLessThanOrEqual(profile.multiplication.resultMax);
    }
  }

  if (task.op === "/") {
    expect(profileKey).toBe("super");
    if (task.right != null) {
      expect(task.right).toBeGreaterThanOrEqual(profile.division.divisor[0]);
      expect(task.right).toBeLessThanOrEqual(profile.division.divisor[1]);
    }
    if (task.result != null) {
      expect(task.result).toBeGreaterThanOrEqual(profile.division.quotient[0]);
      expect(task.result).toBeLessThanOrEqual(profile.division.quotient[1]);
      expect(Number.isInteger(task.result)).toBe(true);
    }
    if (task.left != null && task.right != null && task.result != null) {
      expect(task.left).toBe(task.right * task.result);
      expect(task.left).toBeLessThanOrEqual(profile.division.dividendMax);
    }
  }
}

test("equations config defines four explicit V1 difficulty profiles without hidden progression", async () => {
  const cfg = loadEquationsConfig();
  expect(Object.keys(cfg.difficulties || {})).toEqual(["easy", "medium", "hard", "super"]);
  expect(cfg.presets).toBeUndefined();
  expect(cfg.progression).toBeUndefined();
  expect(cfg.gameplay.stageLevelStep).toBeUndefined();

  expect(cfg.difficulties.easy.operations).toEqual(["+"]);
  expect(cfg.difficulties.easy.missingSlots).toEqual(["result"]);
  expect(cfg.difficulties.medium.operations).toEqual(["+", "-"]);
  expect(cfg.difficulties.hard.operations).toEqual(["+", "-"]);
  expect(cfg.difficulties.super.operations).toEqual(["+", "-", "*", "/"]);
});

test("difficulty manager applies V1 comfortable, balanced, struggling, and recovery rules for equations", async () => {
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
  expect(outcome.nextDifficulty).toBe("medium");

  state = outcome.state;
  outcome = difficultyApi.completeLevel(config, state, comfortable);
  expect(outcome.state.currentDifficulty).toBe("hard");
  expect(outcome.state.comfortableStreak).toBe(0);
  expect(outcome.nextDifficulty).toBe("hard");

  state = outcome.state;
  outcome = difficultyApi.completeLevel(config, state, balanced);
  expect(outcome.classification.label).toBe("balanced");
  expect(outcome.state.comfortableStreak).toBe(0);
  expect(outcome.state.strugglingStreak).toBe(0);
  expect(outcome.state.currentDifficulty).toBe("hard");

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
  expect(outcome.nextDifficulty).toBe("medium");
});

for (const diffKey of ["easy", "medium", "hard", "super"]) {
  test(`equations runtime tasks stay within the ${diffKey} difficulty rules`, async ({ page }) => {
    const cfg = loadEquationsConfig();
    const profile = cfg.difficulties[diffKey];
    await pinEquationsDifficulty(page, diffKey);
    await startEquationsLevel(page);

    for (let index = 0; index < 2; index += 1) {
      const task = await readParsedCurrentTask(page);
      expectTaskToMatchDifficulty(task, diffKey, profile);
      await answerCurrentTask(page, task.answer);
    }
  });
}

test("equations browser run upgrades after two comfortable levels, then recovers and downgrades after two struggling levels", async ({ page }) => {
  test.setTimeout(60000);
  await pinEquationsDifficulty(page, "medium", { minDifficulty: "easy", maxDifficulty: "super" });
  await startEquationsLevel(page);

  await playCurrentEquationsLevel(page, "comfortable");
  await waitForResultsOverlay(page);
  let adaptiveState = await readAdaptiveEquationsState(page);
  expect(adaptiveState).toMatchObject({
    currentDifficulty: "medium",
    comfortableStreak: 1,
    strugglingStreak: 0,
    pendingRecoveryLevel: null
  });
  await continueAfterResults(page);

  await playCurrentEquationsLevel(page, "comfortable");
  await waitForResultsOverlay(page);
  adaptiveState = await readAdaptiveEquationsState(page);
  expect(adaptiveState).toMatchObject({
    currentDifficulty: "hard",
    comfortableStreak: 0,
    strugglingStreak: 0,
    pendingRecoveryLevel: null
  });
  await continueAfterResults(page);

  await playCurrentEquationsLevel(page, "struggling");
  await waitForResultsOverlay(page);
  adaptiveState = await readAdaptiveEquationsState(page);
  expect(adaptiveState).toMatchObject({
    currentDifficulty: "hard",
    comfortableStreak: 0,
    strugglingStreak: 1,
    pendingRecoveryLevel: "medium"
  });
  await continueAfterResults(page);

  await playCurrentEquationsLevel(page, "struggling");
  await waitForResultsOverlay(page);
  adaptiveState = await readAdaptiveEquationsState(page);
  expect(adaptiveState).toMatchObject({
    currentDifficulty: "medium",
    comfortableStreak: 0,
    strugglingStreak: 0,
    pendingRecoveryLevel: null
  });
});
