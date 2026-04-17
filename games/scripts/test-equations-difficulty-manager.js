const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const difficultyApi = require(path.join(__dirname, "..", "shared", "scripts", "difficulty-manager.js"));
const { createSeededRandom, randInt, choice, randomInRange } = require(path.join(__dirname, "test-helpers.js"));

const MULTIPLY_SYMBOL = "\u00d7";
const DIVIDE_SYMBOL = "\u00f7";

function loadEquationsConfig() {
  const filePath = path.join(__dirname, "..", "equations", "config.js");
  const source = fs.readFileSync(filePath, "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.window.GAME_V3_EQUATIONS_CONFIG;
}

function generateAdditionTask(profile, rng) {
  const rules = profile.addition || {};
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const left = randomInRange(rng, rules.left, 1, 10);
    const right = randomInRange(rng, rules.right, 1, 10);
    if (left === 0 || right === 0) {
      continue;
    }
    const result = left + right;
    if (Number.isFinite(rules.resultMax) && result > rules.resultMax) {
      continue;
    }
    return { op: "+", left, right, result };
  }
  return { op: "+", left: 1, right: 1, result: 2 };
}

function generateSubtractionTask(profile, rng) {
  const rules = profile.subtraction || {};
  for (let attempt = 0; attempt < 160; attempt += 1) {
    let left = randomInRange(rng, rules.left, 1, 10);
    let right = randomInRange(rng, rules.right, 1, 10);
    if (left === 0 || right === 0) {
      continue;
    }
    if (!profile.allowNegativeResults && right > left) {
      [left, right] = [right, left];
    }
    const result = left - right;
    if (!profile.allowNegativeResults && result < 0) {
      continue;
    }
    if (Number.isFinite(rules.resultMax) && result > rules.resultMax) {
      continue;
    }
    return { op: "-", left, right, result };
  }
  return { op: "-", left: 2, right: 1, result: 1 };
}

function generateMultiplicationTask(profile, rng) {
  const rules = profile.multiplication || {};
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const left = randomInRange(rng, rules.left, 2, 9);
    const right = randomInRange(rng, rules.right, 2, 9);
    if (left === 0 || right === 0) {
      continue;
    }
    const result = left * right;
    if (Number.isFinite(rules.resultMax) && result > rules.resultMax) {
      continue;
    }
    return { op: "*", left, right, result };
  }
  return { op: "*", left: 2, right: 2, result: 4 };
}

function generateDivisionTask(profile, rng) {
  const rules = profile.division || {};
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const right = randomInRange(rng, rules.divisor, 2, 9);
    const result = randomInRange(rng, rules.quotient, 1, 9);
    const left = right * result;
    if (Number.isFinite(rules.dividendMax) && left > rules.dividendMax) {
      continue;
    }
    return { op: "/", left, right, result };
  }
  return { op: "/", left: 6, right: 3, result: 2 };
}

function generateTask(profile, rng) {
  const op = choice(rng, profile.operations || ["+"]);
  const missingSlot = choice(rng, profile.missingSlots || ["result"]);

  let values;
  if (op === "+") {
    values = generateAdditionTask(profile, rng);
  } else if (op === "-") {
    values = generateSubtractionTask(profile, rng);
  } else if (op === "*") {
    values = generateMultiplicationTask(profile, rng);
  } else if (op === "/") {
    values = generateDivisionTask(profile, rng);
  } else {
    throw new Error(`Unsupported op: ${op}`);
  }

  return Object.assign(values, {
    missingSlot,
    answer: missingSlot === "left" ? values.left : (missingSlot === "right" ? values.right : values.result)
  });
}

function assertTaskMatchesProfile(task, profileKey, profile) {
  assert(profile.operations.includes(task.op), `${profileKey}: unexpected op ${task.op}`);
  assert(profile.missingSlots.includes(task.missingSlot), `${profileKey}: unexpected missing slot ${task.missingSlot}`);
  assert(task.left > 0, `${profileKey}: left operand should be positive`);
  assert(task.right > 0, `${profileKey}: right operand should be positive`);
  assert(task.answer >= 0, `${profileKey}: answer should be non-negative`);

  if (profileKey === "easy") {
    assert.strictEqual(task.missingSlot, "result", "easy: only result may be missing");
    assert.strictEqual(task.op, "+", "easy: only addition allowed");
  }

  if (task.op === "+") {
    assert(task.left >= profile.addition.left[0] && task.left <= profile.addition.left[1], `${profileKey}: addition left out of range`);
    assert(task.right >= profile.addition.right[0] && task.right <= profile.addition.right[1], `${profileKey}: addition right out of range`);
    assert(task.result <= profile.addition.resultMax, `${profileKey}: addition result too large`);
  }

  if (task.op === "-") {
    assert(task.left >= profile.subtraction.left[0] && task.left <= profile.subtraction.left[1], `${profileKey}: subtraction left out of range`);
    assert(task.right >= profile.subtraction.right[0] && task.right <= profile.subtraction.right[1], `${profileKey}: subtraction right out of range`);
    assert(task.result >= 0, `${profileKey}: subtraction should not go negative`);
    assert(task.result <= profile.subtraction.resultMax, `${profileKey}: subtraction result too large`);
  }

  if (task.op === "*") {
    assert.strictEqual(profileKey, "super", "multiplication should only appear in super");
    assert(task.left >= profile.multiplication.left[0] && task.left <= profile.multiplication.left[1], `${profileKey}: multiplication left out of range`);
    assert(task.right >= profile.multiplication.right[0] && task.right <= profile.multiplication.right[1], `${profileKey}: multiplication right out of range`);
    assert(task.result <= profile.multiplication.resultMax, `${profileKey}: multiplication result too large`);
  }

  if (task.op === "/") {
    assert.strictEqual(profileKey, "super", "division should only appear in super");
    assert(task.right >= profile.division.divisor[0] && task.right <= profile.division.divisor[1], `${profileKey}: divisor out of range`);
    assert(task.result >= profile.division.quotient[0] && task.result <= profile.division.quotient[1], `${profileKey}: quotient out of range`);
    assert(Number.isInteger(task.result), `${profileKey}: quotient should be integer`);
    assert.strictEqual(task.left, task.right * task.result, `${profileKey}: division should be clean`);
    assert(task.left <= profile.division.dividendMax, `${profileKey}: dividend too large`);
  }
}

function runEquationsDifficultyChecks() {
  const cfg = loadEquationsConfig();
  assert.deepStrictEqual(Object.keys(cfg.difficulties || {}), ["easy", "medium", "hard", "super"]);
  assert.strictEqual(cfg.presets, undefined, "Equations config should not define presets");
  assert.strictEqual(cfg.progression, undefined, "Equations config should not define progression");
  assert.strictEqual(cfg.gameplay.stageLevelStep, undefined, "Equations config should not define stageLevelStep");

  const rng = createSeededRandom(29);
  for (const [profileKey, profile] of Object.entries(cfg.difficulties)) {
    for (let index = 0; index < 200; index += 1) {
      const task = generateTask(profile, rng);
      assertTaskMatchesProfile(task, profileKey, profile);
    }
  }

  const gameSource = fs.readFileSync(path.join(__dirname, "..", "equations", "game.js"), "utf8");
  assert(gameSource.includes("function currentDifficultyProfile()"), "Equations game should resolve an explicit difficulty profile");
  assert(gameSource.includes("return Object.assign(buildEquationTask(),"), "Equations game should create tasks from the explicit difficulty generator");
  assert(gameSource.includes("const answers = buildDifficultyWrongs(task.answer);"), "Equations game should build distractors from the explicit difficulty generator");
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
  runEquationsDifficultyChecks();
  runDifficultyManagerChecks();
  console.log("Logic tests passed: equations difficulty profiles and difficulty manager.");
}

main();
