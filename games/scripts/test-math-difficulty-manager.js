const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const difficultyApi = require(path.join(__dirname, "..", "shared", "scripts", "difficulty-manager.js"));
const { createSeededRandom, randInt, choice, randomInRange } = require(path.join(__dirname, "test-helpers.js"));

function loadMathConfig() {
  const filePath = path.join(__dirname, "..", "math", "config.js");
  const source = fs.readFileSync(filePath, "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.window.GAME_V3_MATH_CONFIG;
}

function generateTask(profile, rng) {
  const op = choice(rng, profile.operations || ["+"]);

  if (op === "+") {
    const rules = profile.addition || {};
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const left = randomInRange(rng, rules.left, 0, 10);
      const right = randomInRange(rng, rules.right, 0, 10);
      if (right === 0) {
        continue;
      }
      const answer = left + right;
      if (Number.isFinite(rules.resultMax) && answer > rules.resultMax) {
        continue;
      }
      return { op, left, right, answer };
    }
  }

  if (op === "-") {
    const rules = profile.subtraction || {};
    for (let attempt = 0; attempt < 120; attempt += 1) {
      let left = randomInRange(rng, rules.left, 0, 10);
      let right = randomInRange(rng, rules.right, 0, 10);
      if (!profile.allowNegativeResults && right > left) {
        [left, right] = [right, left];
      }
      if (right === 0) {
        continue;
      }
      const answer = left - right;
      if (!profile.allowNegativeResults && answer < 0) {
        continue;
      }
      if (Number.isFinite(rules.resultMax) && answer > rules.resultMax) {
        continue;
      }
      return { op, left, right, answer };
    }
  }

  if (op === "*") {
    const rules = profile.multiplication || {};
    return {
      op,
      left: randomInRange(rng, rules.left, 1, 5),
      right: randomInRange(rng, rules.right, 1, 5),
      answer: 0
    };
  }

  if (op === "/") {
    const rules = profile.division || {};
    const divisor = randomInRange(rng, rules.divisor, 1, 5);
    const quotient = randomInRange(rng, rules.quotient, 1, 5);
    return {
      op,
      left: divisor * quotient,
      right: divisor,
      answer: quotient
    };
  }

  throw new Error(`Unsupported op: ${op}`);
}

function finalizeTask(task) {
  if (task.op === "*") {
    return Object.assign(task, {
      answer: task.left * task.right
    });
  }
  return task;
}

function assertTaskMatchesProfile(task, profileKey, profile) {
  assert(profile.operations.includes(task.op), `${profileKey}: unexpected op ${task.op}`);
  assert(task.right !== 0, `${profileKey}: generated ${task.op}0 task`);
  assert(task.answer >= 0, `${profileKey}: generated negative answer`);

  if (task.op === "+") {
    assert(task.left >= profile.addition.left[0] && task.left <= profile.addition.left[1], `${profileKey}: addition left out of range`);
    assert(task.right >= profile.addition.right[0] && task.right <= profile.addition.right[1], `${profileKey}: addition right out of range`);
    assert(task.answer <= profile.addition.resultMax, `${profileKey}: addition result too large`);
  }

  if (task.op === "-") {
    assert(task.left >= profile.subtraction.left[0] && task.left <= profile.subtraction.left[1], `${profileKey}: subtraction left out of range`);
    assert(task.right >= profile.subtraction.right[0] && task.right <= profile.subtraction.right[1], `${profileKey}: subtraction right out of range`);
    assert(task.answer <= profile.subtraction.resultMax, `${profileKey}: subtraction result too large`);
  }

  if (task.op === "*") {
    assert(profileKey === "super", "multiplication should only appear in super");
    assert(task.left >= profile.multiplication.left[0] && task.left <= profile.multiplication.left[1], `${profileKey}: multiplication left out of range`);
    assert(task.right >= profile.multiplication.right[0] && task.right <= profile.multiplication.right[1], `${profileKey}: multiplication right out of range`);
    assert(task.answer <= profile.multiplication.resultMax, `${profileKey}: multiplication result too large`);
  }

  if (task.op === "/") {
    assert(profileKey === "super", "division should only appear in super");
    assert(task.right >= profile.division.divisor[0] && task.right <= profile.division.divisor[1], `${profileKey}: divisor out of range`);
    assert(task.answer >= profile.division.quotient[0] && task.answer <= profile.division.quotient[1], `${profileKey}: quotient out of range`);
    assert(Number.isInteger(task.answer), `${profileKey}: division answer should be integer`);
    assert(task.left === task.right * task.answer, `${profileKey}: division task not clean`);
  }
}

function runMathDifficultyChecks() {
  const cfg = loadMathConfig();
  assert.deepStrictEqual(Object.keys(cfg.difficulties || {}), ["easy", "medium", "hard", "super"]);
  assert.strictEqual(cfg.presets, undefined, "Math config should not define presets");
  assert.strictEqual(cfg.progression, undefined, "Math config should not define progression");
  assert.strictEqual(cfg.gameplay.stageLevelStep, undefined, "Math config should not define stageLevelStep");

  const rng = createSeededRandom(17);
  for (const [profileKey, profile] of Object.entries(cfg.difficulties)) {
    for (let index = 0; index < 200; index += 1) {
      const task = finalizeTask(generateTask(profile, rng));
      assertTaskMatchesProfile(task, profileKey, profile);
    }
  }

  const gameSource = fs.readFileSync(path.join(__dirname, "..", "math", "game.js"), "utf8");
  assert(gameSource.includes("function currentDifficultyProfile()"), "Math game should resolve an explicit difficulty profile");
  assert(gameSource.includes("return Object.assign(buildDifficultyTask(),"), "Math game should create tasks from the explicit difficulty generator");
  assert(gameSource.includes("const answers = buildDifficultyWrongs(task.answer);"), "Math game should build distractors from the explicit difficulty generator");
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
  assert.strictEqual(outcome.state.comfortableStreak, 1);
  assert.strictEqual(outcome.state.currentDifficulty, "medium");

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

  outcome = difficultyApi.completeLevel({
    difficultyOrder: ["easy", "medium"],
    minDifficulty: "easy",
    maxDifficulty: "medium"
  }, {
    currentDifficulty: "easy",
    comfortableStreak: 1,
    strugglingStreak: 0,
    pendingRecoveryLevel: null
  }, comfortable);
  assert.strictEqual(outcome.state.currentDifficulty, "medium");

  outcome = difficultyApi.completeLevel({
    difficultyOrder: ["easy", "medium"],
    minDifficulty: "easy",
    maxDifficulty: "easy"
  }, {
    currentDifficulty: "easy",
    comfortableStreak: 1,
    strugglingStreak: 0,
    pendingRecoveryLevel: null
  }, comfortable);
  assert.strictEqual(outcome.state.currentDifficulty, "easy");
  assert.strictEqual(outcome.nextDifficulty, "easy");
}

function main() {
  runMathDifficultyChecks();
  runDifficultyManagerChecks();
  console.log("Logic tests passed: math difficulty profiles and difficulty manager.");
}

main();
