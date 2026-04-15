const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const difficultyApi = require(path.join(__dirname, "..", "shared", "scripts", "difficulty-manager.js"));
const { createSeededRandom, randInt, choice, shuffleInPlace } = require(path.join(__dirname, "test-helpers.js"));

function loadClocksConfig() {
  const filePath = path.join(__dirname, "..", "clocks", "config.js");
  const source = fs.readFileSync(filePath, "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.window.GAME_V3_CLOCKS_CONFIG;
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

function timeKey(time) {
  return `${time.hour}:${time.minute}`;
}

function randomTime(profile, rng) {
  return {
    hour: randInt(rng, 1, 12),
    minute: choice(rng, profile.minuteValues)
  };
}

function buildDistractors(correct, profile, rng) {
  const distractors = profile.distractors || {};
  const correctTotal = toTotalMinutes(correct.hour, correct.minute);
  const options = [correct];
  const used = new Set([timeKey(correct)]);
  const hourOffsets = shuffleInPlace((distractors.hourOffsets || []).slice(), rng);
  const minuteOffsets = shuffleInPlace((distractors.minuteOffsets || []).slice(), rng);

  function pushTime(candidate) {
    const key = timeKey(candidate);
    if (used.has(key)) {
      return false;
    }
    if (!profile.minuteValues.includes(candidate.minute)) {
      return false;
    }
    options.push(candidate);
    used.add(key);
    return true;
  }

  for (const offset of minuteOffsets) {
    if (options.length >= 4) {
      break;
    }
    pushTime(fromTotalMinutes(correctTotal + offset));
    if (options.length >= 4) {
      break;
    }
    pushTime(fromTotalMinutes(correctTotal - offset));
  }

  for (const hourOffset of hourOffsets) {
    if (options.length >= 4) {
      break;
    }
    pushTime(fromTotalMinutes(correctTotal + (hourOffset * 60)));
    if (options.length >= 4) {
      break;
    }
    pushTime(fromTotalMinutes(correctTotal - (hourOffset * 60)));
  }

  for (const hourOffset of hourOffsets) {
    for (const minuteOffset of minuteOffsets) {
      if (options.length >= 4) {
        break;
      }
      pushTime(fromTotalMinutes(correctTotal + (hourOffset * 60) + minuteOffset));
      if (options.length >= 4) {
        break;
      }
      pushTime(fromTotalMinutes(correctTotal - (hourOffset * 60) + minuteOffset));
    }
  }

  while (options.length < 4) {
    pushTime(randomTime(profile, rng));
  }

  shuffleInPlace(options, rng);
  return options;
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

function assertTaskMatchesProfile(correct, options, profileKey, profile) {
  assert.strictEqual(options.length, 4, `${profileKey}: clocks should always have 4 answers`);
  assert(profile.minuteValues.includes(correct.minute), `${profileKey}: correct minute outside allowed values`);

  const seen = new Set();
  for (const option of options) {
    const key = timeKey(option);
    assert(!seen.has(key), `${profileKey}: duplicate option ${key}`);
    seen.add(key);
    assert(profile.minuteValues.includes(option.minute), `${profileKey}: option minute outside allowed values`);
    assert(matchesDistractorRule(correct, option, profile), `${profileKey}: option ${key} should follow distractor rules`);
  }

  if (profileKey === "easy") {
    assert.deepStrictEqual(Array.from(profile.minuteValues), [0, 30]);
    assert.strictEqual(profile.faceMode, "numbered");
  }
  if (profileKey === "medium") {
    assert.strictEqual(profile.faceMode, "numbered");
    assert.deepStrictEqual(Array.from(profile.distractors.minuteOffsets), [5, 10, 15, 30]);
  }
  if (profileKey === "hard") {
    assert.strictEqual(profile.faceMode, "no-numbers");
    assert.deepStrictEqual(Array.from(profile.distractors.minuteOffsets), [5, 10, 15]);
  }
  if (profileKey === "super") {
    assert.strictEqual(profile.faceMode, "plain");
    assert.deepStrictEqual(Array.from(profile.distractors.minuteOffsets), [5, 10]);
  }
}

function runClocksDifficultyChecks() {
  const cfg = loadClocksConfig();
  assert.deepStrictEqual(Object.keys(cfg.difficulties || {}), ["easy", "medium", "hard", "super"]);
  assert.strictEqual(cfg.diffs, undefined, "Clocks config should not define legacy diffs");

  assert.deepStrictEqual(Array.from(cfg.difficulties.easy.minuteValues), [0, 30]);
  assert.deepStrictEqual(Array.from(cfg.difficulties.medium.minuteValues), [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
  assert.strictEqual(cfg.difficulties.easy.faceMode, "numbered");
  assert.strictEqual(cfg.difficulties.medium.faceMode, "numbered");
  assert.strictEqual(cfg.difficulties.hard.faceMode, "no-numbers");
  assert.strictEqual(cfg.difficulties.super.faceMode, "plain");

  const rng = createSeededRandom(29);
  for (const [profileKey, profile] of Object.entries(cfg.difficulties)) {
    for (let index = 0; index < 200; index += 1) {
      const correct = randomTime(profile, rng);
      const options = buildDistractors(correct, profile, rng);
      assertTaskMatchesProfile(correct, options, profileKey, profile);
    }
  }

  const gameSource = fs.readFileSync(path.join(__dirname, "..", "clocks", "game.js"), "utf8");
  assert(gameSource.includes("function currentDifficultyProfile()"), "Clocks game should resolve an explicit difficulty profile");
  assert(gameSource.includes("const profile = currentDifficultyProfile();"), "Clocks game should generate times from the active difficulty profile");
  assert(gameSource.includes("const distractors = profile.distractors || {};"), "Clocks game should build distractors from explicit profile rules");
}

function runDifficultyManagerChecks() {
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
  assert.strictEqual(outcome.classification.label, "comfortable");
  assert.strictEqual(outcome.state.currentDifficulty, "medium");
  assert.strictEqual(outcome.state.comfortableStreak, 1);

  state = outcome.state;
  outcome = difficultyApi.completeLevel(config, state, comfortable);
  assert.strictEqual(outcome.state.currentDifficulty, "hard");
  assert.strictEqual(outcome.state.comfortableStreak, 0);

  state = outcome.state;
  outcome = difficultyApi.completeLevel(config, state, balanced);
  assert.strictEqual(outcome.classification.label, "balanced");
  assert.strictEqual(outcome.state.comfortableStreak, 0);
  assert.strictEqual(outcome.state.strugglingStreak, 0);

  state = outcome.state;
  outcome = difficultyApi.completeLevel(config, state, struggling);
  assert.strictEqual(outcome.classification.label, "struggling");
  assert.strictEqual(outcome.state.currentDifficulty, "hard");
  assert.strictEqual(outcome.state.pendingRecoveryLevel, "medium");
  assert.strictEqual(outcome.nextDifficulty, "medium");

  state = outcome.state;
  outcome = difficultyApi.completeLevel(config, state, struggling);
  assert.strictEqual(outcome.state.currentDifficulty, "medium");
  assert.strictEqual(outcome.state.pendingRecoveryLevel, null);
  assert.strictEqual(outcome.state.strugglingStreak, 0);
}

function main() {
  runClocksDifficultyChecks();
  runDifficultyManagerChecks();
  console.log("Logic tests passed: clocks difficulty profiles and difficulty manager.");
}

main();
