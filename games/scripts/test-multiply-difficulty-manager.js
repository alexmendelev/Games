const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const difficultyApi = require(path.join(__dirname, "..", "shared", "scripts", "difficulty-manager.js"));
const { createSeededRandom, randInt } = require(path.join(__dirname, "test-helpers.js"));

function loadMultiplyConfig() {
  const filePath = path.join(__dirname, "..", "multiply", "config.js");
  const source = fs.readFileSync(filePath, "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.window.GAME_V3_MULTIPLY_CONFIG;
}

function pickFactor(profileKey, profile, rng) {
  const range = Array.isArray(profile.factorRange) && profile.factorRange.length >= 2
    ? profile.factorRange
    : [1, 10];
  const minFactor = Number(range[0]) || 1;
  const maxFactor = Number(range[1]) || 10;
  const preferredFactors = Array.isArray(profile.preferredFactors)
    ? profile.preferredFactors.filter((value) => value >= minFactor && value <= maxFactor)
    : [];
  const preferredFactorBias = Math.max(0, Math.min(1, Number(profile.preferredFactorBias) || 0));

  if (profileKey === "super" && preferredFactors.length && rng() < preferredFactorBias) {
    return preferredFactors[randInt(rng, 0, preferredFactors.length - 1)];
  }

  return randInt(rng, minFactor, maxFactor);
}

function generateTask(profileKey, profile, rng) {
  let left = pickFactor(profileKey, profile, rng);
  let right = pickFactor(profileKey, profile, rng);
  if (profileKey !== "easy") {
    left = Math.max(2, left);
    right = Math.max(2, right);
  }
  return {
    left,
    right,
    answer: left * right
  };
}

function assertTaskMatchesProfile(task, profileKey, profile) {
  const range = profile.factorRange;
  assert(Array.isArray(range) && range.length >= 2, `${profileKey}: missing factor range`);
  assert(task.left >= range[0] && task.left <= range[1], `${profileKey}: left factor out of range`);
  assert(task.right >= range[0] && task.right <= range[1], `${profileKey}: right factor out of range`);
  assert.strictEqual(task.answer, task.left * task.right, `${profileKey}: wrong product`);
  assert(task.left > 0 && task.right > 0, `${profileKey}: zero factor should not appear`);
  if (profileKey !== "easy") {
    assert(task.left >= 2 && task.right >= 2, `${profileKey}: factor 1 should not appear`);
  }
}

function runMultiplyDifficultyChecks() {
  const cfg = loadMultiplyConfig();
  assert.deepStrictEqual(Object.keys(cfg.difficulties || {}), ["easy", "medium", "hard", "super"]);
  assert.strictEqual(cfg.diffs, undefined, "Multiply config should not define legacy diffs");

  assert.deepStrictEqual(Array.from(cfg.difficulties.easy.factorRange), [1, 4]);
  assert.deepStrictEqual(Array.from(cfg.difficulties.medium.factorRange), [2, 7]);
  assert.deepStrictEqual(Array.from(cfg.difficulties.hard.factorRange), [2, 10]);
  assert.deepStrictEqual(Array.from(cfg.difficulties.super.factorRange), [2, 12]);

  const rng = createSeededRandom(23);
  for (const [profileKey, profile] of Object.entries(cfg.difficulties)) {
    for (let index = 0; index < 200; index += 1) {
      const task = generateTask(profileKey, profile, rng);
      assertTaskMatchesProfile(task, profileKey, profile);
    }
  }

  const gameSource = fs.readFileSync(path.join(__dirname, "..", "multiply", "game.js"), "utf8");
  assert(gameSource.includes("function currentDifficultyProfile()"), "Multiply game should resolve an explicit difficulty profile");
  assert(gameSource.includes("return Object.assign(buildMultiplyTask(),"), "Multiply game should create tasks from the explicit difficulty generator");
  assert(gameSource.includes("const answers = buildDifficultyWrongs(task.answer);"), "Multiply game should build distractors from the explicit difficulty generator");
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
  runMultiplyDifficultyChecks();
  runDifficultyManagerChecks();
  console.log("Logic tests passed: multiply difficulty profiles and difficulty manager.");
}

main();
