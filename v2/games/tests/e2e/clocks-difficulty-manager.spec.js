const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { test, expect } = require("@playwright/test");
const difficultyApi = require("../../shared/scripts/difficulty-manager.js");

const META_STORAGE_KEY = "games_v3_meta_state_v1";

test.describe.configure({ mode: "serial" });

function loadClocksConfig() {
  const filePath = path.join(__dirname, "..", "..", "clocks", "config.js");
  const source = fs.readFileSync(filePath, "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.window.GAME_V3_CLOCKS_CONFIG;
}

function parseTimeLabel(label) {
  const match = String(label || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Unrecognized clock label: ${label}`);
  }
  return {
    hour: Number(match[1]),
    minute: Number(match[2])
  };
}

function parseTimeKey(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) {
    throw new Error(`Unrecognized clock key: ${value}`);
  }
  return {
    hour: Number(match[1]),
    minute: Number(match[2])
  };
}

function timeKey(time) {
  return `${time.hour}:${time.minute}`;
}

function toClockHour(hour24) {
  const value = hour24 % 12;
  return value === 0 ? 12 : value;
}

function toTotalMinutes(hour, minute) {
  return ((hour % 12) * 60) + minute;
}

function fromTotalMinutes(totalMinutes) {
  const normalized = ((totalMinutes % 720) + 720) % 720;
  const hour = toClockHour(Math.floor(normalized / 60));
  const minute = normalized % 60;
  return { hour, minute };
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
        clocks: {
          highestCompletedLevel: 0
        }
      },
      currentRank: 1
    },
    settings: {
      preferredDiff: currentDifficulty,
      preferredDiffByGame: {
        clocks: currentDifficulty
      },
      soundEnabled: false,
      mysteryEnabled: false,
      diffBoundsByGame: {
        clocks: {
          min: minDifficulty,
          max: maxDifficulty
        }
      },
      adaptiveDifficultyByGame: {
        clocks: {
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

async function pinClocksDifficulty(page, currentDifficulty, options) {
  const state = buildPinnedMetaState(Object.assign({}, options, { currentDifficulty }));
  await page.addInitScript(() => {
    let capturedConfig = null;
    Object.defineProperty(window, "GAME_V3_CLOCKS_CONFIG", {
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

async function applyClocksTestOverrides(page) {
  await page.evaluate(() => {
    const cfg = window.GAME_V3_CLOCKS_CONFIG;
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

async function startClocksLevel(page) {
  await page.goto("/clocks/");
  await applyClocksTestOverrides(page);
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

async function getVisibleOptionValues(page) {
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

async function readCurrentDialSrc(page) {
  return page.evaluate(() => {
    const dial = document.querySelector("#answers .ans .clockDialImg");
    return dial ? String(dial.getAttribute("src") || "") : "";
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
    const optionValues = await getVisibleOptionValues(page);
    if (expectedValue == null ? optionValues.length > 0 : optionValues.includes(expectedValue)) {
      return "question";
    }
    await page.waitForTimeout(100);
  }

  const label = await readCurrentLabel(page);
  const optionValues = await getVisibleOptionValues(page);
  throw new Error(`Timed out waiting for clock/results. expected=${expectedValue || "*"} label=${label} options=${optionValues.join(",")}`);
}

async function answerCurrentTask(page, answerValue) {
  const state = await waitForQuestionOrResults(page, answerValue);
  if (state === "results") {
    return false;
  }
  await page.locator(`#answers .ans[data-value="${answerValue}"]`).click({ timeout: 5000 });
  await page.waitForTimeout(180);
  return true;
}

async function clickWrongAnswer(page, correctAnswerValue) {
  const state = await waitForQuestionOrResults(page, null);
  if (state === "results") {
    return false;
  }
  const optionValues = await getVisibleOptionValues(page);
  const wrongValue = optionValues.find((value) => value !== String(correctAnswerValue));
  if (wrongValue == null) {
    throw new Error(`No visible wrong option found for correct=${correctAnswerValue}`);
  }
  await page.locator(`#answers .ans[data-value="${wrongValue}"]`).click({ timeout: 5000 });
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

async function readAdaptiveClocksState(page) {
  return page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && parsed.settings && parsed.settings.adaptiveDifficultyByGame
      ? parsed.settings.adaptiveDifficultyByGame.clocks
      : null;
  }, META_STORAGE_KEY);
}

async function playCurrentClocksLevel(page, mode) {
  for (let step = 0; step < 10; step += 1) {
    const stateBefore = await waitForQuestionOrResults(page, null);
    if (stateBefore === "results") {
      return;
    }

    const label = await readCurrentLabel(page);
    const correct = parseTimeLabel(label);
    const answerValue = timeKey(correct);

    if (mode === "comfortable") {
      await page.waitForTimeout(80);
      const answered = await answerCurrentTask(page, answerValue);
      if (!answered) {
        return;
      }
    } else if (mode === "struggling") {
      await page.waitForTimeout(80);
      const clickedWrong = await clickWrongAnswer(page, answerValue);
      if (!clickedWrong) {
        return;
      }
      const stateAfterWrong = await waitForQuestionOrResults(page, null);
      if (stateAfterWrong === "results") {
        return;
      }
      const currentLabel = await readCurrentLabel(page);
      const currentAnswer = timeKey(parseTimeLabel(currentLabel));
      const answered = await answerCurrentTask(page, currentAnswer);
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

function matchesDistractorRule(correct, candidate, profile) {
  if (candidate.hour === correct.hour && candidate.minute === correct.minute) {
    return true;
  }

  const correctTotal = toTotalMinutes(correct.hour, correct.minute);
  const candidateKey = timeKey(candidate);
  const distractors = profile.distractors || {};
  const minuteOffsets = distractors.minuteOffsets || [];
  const hourOffsets = distractors.hourOffsets || [];

  for (const minuteOffset of minuteOffsets) {
    if (timeKey(fromTotalMinutes(correctTotal + minuteOffset)) === candidateKey) {
      return true;
    }
    if (timeKey(fromTotalMinutes(correctTotal - minuteOffset)) === candidateKey) {
      return true;
    }
  }

  for (const hourOffset of hourOffsets) {
    if (timeKey(fromTotalMinutes(correctTotal + (hourOffset * 60))) === candidateKey) {
      return true;
    }
    if (timeKey(fromTotalMinutes(correctTotal - (hourOffset * 60))) === candidateKey) {
      return true;
    }
  }

  for (const hourOffset of hourOffsets) {
    for (const minuteOffset of minuteOffsets) {
      if (timeKey(fromTotalMinutes(correctTotal + (hourOffset * 60) + minuteOffset)) === candidateKey) {
        return true;
      }
      if (timeKey(fromTotalMinutes(correctTotal - (hourOffset * 60) + minuteOffset)) === candidateKey) {
        return true;
      }
    }
  }

  return false;
}

function expectRuntimeTaskMatchesDifficulty(profile, task, dialSrc) {
  expect(profile.minuteValues.includes(task.correct.minute)).toBe(true);
  expect(dialSrc.includes(profile.dialUrl.split("/").pop())).toBe(true);
  expect(task.optionValues.length).toBe(4);

  const seen = new Set();
  for (const value of task.optionValues) {
    expect(seen.has(value)).toBe(false);
    seen.add(value);
    const option = parseTimeKey(value);
    expect(profile.minuteValues.includes(option.minute)).toBe(true);
    expect(matchesDistractorRule(task.correct, option, profile)).toBe(true);
  }
}

test("clocks config defines four explicit V1 difficulty profiles without hidden progression", async () => {
  const cfg = loadClocksConfig();
  expect(Object.keys(cfg.difficulties || {})).toEqual(["easy", "medium", "hard", "super"]);
  expect(cfg.diffs).toBeUndefined();
  expect(cfg.difficulties.easy.minuteValues).toEqual([0, 30]);
  expect(cfg.difficulties.medium.minuteValues).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
  expect(cfg.difficulties.easy.faceMode).toBe("numbered");
  expect(cfg.difficulties.medium.faceMode).toBe("numbered");
  expect(cfg.difficulties.hard.faceMode).toBe("no-numbers");
  expect(cfg.difficulties.super.faceMode).toBe("plain");
});

test("difficulty manager applies V1 comfortable, balanced, struggling, and recovery rules for clocks", async () => {
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
  test(`clocks runtime tasks stay within the ${diffKey} difficulty rules`, async ({ page }) => {
    const cfg = loadClocksConfig();
    const profile = cfg.difficulties[diffKey];

    await pinClocksDifficulty(page, diffKey);
    await startClocksLevel(page);

    for (let index = 0; index < 2; index += 1) {
      const label = await readCurrentLabel(page);
      const optionValues = await getVisibleOptionValues(page);
      const dialSrc = await readCurrentDialSrc(page);
      const correct = parseTimeLabel(label);
      const task = {
        correct,
        optionValues
      };
      expectRuntimeTaskMatchesDifficulty(profile, task, dialSrc);
      await answerCurrentTask(page, timeKey(correct));
    }
  });
}

test("clocks browser run upgrades after two comfortable levels, then recovers and downgrades after two struggling levels", async ({ page }) => {
  test.setTimeout(60000);
  await pinClocksDifficulty(page, "medium", { minDifficulty: "easy", maxDifficulty: "super" });
  await startClocksLevel(page);

  let adaptiveState = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await playCurrentClocksLevel(page, "comfortable");
    await waitForResultsOverlay(page);
    adaptiveState = await readAdaptiveClocksState(page);

    expect(adaptiveState).toMatchObject({
      strugglingStreak: 0,
      pendingRecoveryLevel: null
    });

    if (adaptiveState.currentDifficulty === "hard") {
      expect(adaptiveState.comfortableStreak).toBe(0);
      break;
    }

    expect(adaptiveState.currentDifficulty).toBe("medium");
    await continueAfterResults(page);
  }

  expect(adaptiveState).toMatchObject({
    currentDifficulty: "hard",
    comfortableStreak: 0,
    strugglingStreak: 0,
    pendingRecoveryLevel: null
  });
  await continueAfterResults(page);

  await playCurrentClocksLevel(page, "struggling");
  await waitForResultsOverlay(page);
  adaptiveState = await readAdaptiveClocksState(page);
  expect(adaptiveState).toMatchObject({
    currentDifficulty: "hard",
    comfortableStreak: 0,
    strugglingStreak: 1,
    pendingRecoveryLevel: "medium"
  });
  await continueAfterResults(page);

  await playCurrentClocksLevel(page, "struggling");
  await waitForResultsOverlay(page);
  adaptiveState = await readAdaptiveClocksState(page);
  expect(adaptiveState).toMatchObject({
    currentDifficulty: "medium",
    comfortableStreak: 0,
    strugglingStreak: 0,
    pendingRecoveryLevel: null
  });
});
