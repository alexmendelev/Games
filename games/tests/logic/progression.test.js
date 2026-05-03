// Tests for the visible level-ups progression detection logic.
// Copies the 8-line detection block from game-meta.js showResults() so that
// this pure-logic test can run without a browser DOM.
// To run (from games/ directory): node tests/logic/progression.test.js

var path = require("path");
var assert = require("assert");
var difficultyApi = require(path.join(__dirname,"..","..","shared","scripts","difficulty-manager.js"));

// ---------------------------------------------------------------------------
// Helper: detects a progression change from an adaptiveOutcome + diffOptions,
// exactly mirroring the 8-line block in game-meta.js showResults().
// ---------------------------------------------------------------------------
function detectProgression(adaptiveOutcome, diffOptions) {
  if (!adaptiveOutcome) { return null; }
  var orderKeys = diffOptions.map(function(o) { return o.key; });
  var beforeIdx = orderKeys.indexOf(adaptiveOutcome.beforeState.currentDifficulty);
  var afterIdx  = orderKeys.indexOf(adaptiveOutcome.state.currentDifficulty);
  if (beforeIdx >= 0 && afterIdx >= 0 && beforeIdx !== afterIdx) {
    return {
      type: afterIdx > beforeIdx ? "promoted" : "demoted",
      fromKey: adaptiveOutcome.beforeState.currentDifficulty,
      toKey: adaptiveOutcome.state.currentDifficulty
    };
  }
  return null;
}
// Shared config/fixtures
var DIFF_OPTIONS = [{ key: "easy" }, { key: "medium" }, { key: "hard" }, { key: "super" }];
var CONFIG = {
  difficultyOrder: ["easy", "medium", "hard", "super"],
  minDifficulty: "easy",
  maxDifficulty: "super"
};

// COMFORTABLE: passed, 25% of time limit, 0 wrong clicks -> classifies as comfortable
var COMFORTABLE = { passed: true,  avgAnswerMs: 3000, wrongClicks: 0, correctCount: 10, questionTimeLimitMs: 12000 };
// BALANCED: passed, 55% of time limit, 0.375 wrong/correct -> classifies as balanced
var BALANCED    = { passed: true,  avgAnswerMs: 6600, wrongClicks: 3, correctCount: 8,  questionTimeLimitMs: 12000 };
// STRUGGLING: failed, 80% of time limit -> classifies as struggling
var STRUGGLING  = { passed: false, avgAnswerMs: 9600, wrongClicks: 8, correctCount: 4,  questionTimeLimitMs: 12000 };
// ---------------------------------------------------------------------------
// Test 1: No progression when difficulty unchanged after a balanced round
// ---------------------------------------------------------------------------
function testNoProgressionOnBalancedRound() {
  var state = { currentDifficulty: "medium", comfortableStreak: 0, strugglingStreak: 0, pendingRecoveryLevel: null };
  var outcome = difficultyApi.completeLevel(CONFIG, state, BALANCED);
  assert.strictEqual(
    outcome.beforeState.currentDifficulty,
    outcome.state.currentDifficulty,
    "Balanced round must not change currentDifficulty"
  );
  var progression = detectProgression(outcome, DIFF_OPTIONS);
  assert.strictEqual(progression, null, "progression must be null when difficulty unchanged");
  console.log("  PASS: no progression on balanced round");
}
// ---------------------------------------------------------------------------
// Test 2: Promotion detected after two comfortable rounds
// ---------------------------------------------------------------------------
function testPromotionAfterTwoComfortableRounds() {
  var state = { currentDifficulty: "easy", comfortableStreak: 0, strugglingStreak: 0, pendingRecoveryLevel: null };
  // First comfortable round: streak becomes 1, no difficulty change yet
  var outcome = difficultyApi.completeLevel(CONFIG, state, COMFORTABLE);
  assert.strictEqual(outcome.state.currentDifficulty, "easy", "No promotion on first comfortable round");
  assert.strictEqual(detectProgression(outcome, DIFF_OPTIONS), null, "No progression after first comfortable round");
  // Second comfortable round: streak hits 2 -> promoted to medium
  state = outcome.state;
  outcome = difficultyApi.completeLevel(CONFIG, state, COMFORTABLE);
  assert.strictEqual(outcome.state.currentDifficulty, "medium", "Should promote to medium after two comfortable rounds");
  var progression = detectProgression(outcome, DIFF_OPTIONS);
  assert.notStrictEqual(progression, null, "progression must not be null after promotion");
  assert.strictEqual(progression.type,    "promoted", "type must be promoted");
  assert.strictEqual(progression.fromKey, "easy",    "fromKey must be easy");
  assert.strictEqual(progression.toKey,   "medium",  "toKey must be medium");
  console.log("  PASS: promotion detected after two comfortable rounds");
}
// ---------------------------------------------------------------------------
// Test 3: Demotion detected after two consecutive struggling rounds
// ---------------------------------------------------------------------------
function testDemotionAfterTwoStrugglingRounds() {
  var state = { currentDifficulty: "hard", comfortableStreak: 0, strugglingStreak: 0, pendingRecoveryLevel: null };
  // First struggling round: pendingRecoveryLevel set, currentDifficulty unchanged
  var outcome = difficultyApi.completeLevel(CONFIG, state, STRUGGLING);
  assert.strictEqual(outcome.state.currentDifficulty, "hard", "currentDifficulty unchanged after first struggle");
  assert.strictEqual(detectProgression(outcome, DIFF_OPTIONS), null, "No progression after first struggling round");
  // Second consecutive struggling round: currentDifficulty drops
  state = outcome.state;
  outcome = difficultyApi.completeLevel(CONFIG, state, STRUGGLING);
  assert.strictEqual(outcome.state.currentDifficulty, "medium", "Should demote to medium after two struggling rounds");
  var progression = detectProgression(outcome, DIFF_OPTIONS);
  assert.notStrictEqual(progression, null, "progression must not be null after demotion");
  assert.strictEqual(progression.type,    "demoted",  "type must be demoted");
  assert.strictEqual(progression.fromKey, "hard",    "fromKey must be hard");
  assert.strictEqual(progression.toKey,   "medium",  "toKey must be medium");
  console.log("  PASS: demotion detected after two struggling rounds");
}
// ---------------------------------------------------------------------------
// Test 4: Promotion direction - index 0 (easy) to index 1 (medium), not reversed
// ---------------------------------------------------------------------------
function testPromotionIndexDirection() {
  var orderKeys = DIFF_OPTIONS.map(function(o) { return o.key; });
  // before=easy (idx 0), after=medium (idx 1) -> type must be promoted
  var fakePromotion = { beforeState: { currentDifficulty: "easy" }, state: { currentDifficulty: "medium" } };
  var promotion = detectProgression(fakePromotion, DIFF_OPTIONS);
  assert.notStrictEqual(promotion, null, "promotion must be detected");
  var beforeIdx = orderKeys.indexOf("easy");
  var afterIdx  = orderKeys.indexOf("medium");
  assert.ok(afterIdx > beforeIdx, "easy must come before medium in order");
  assert.strictEqual(promotion.type,    "promoted", "index 0 to 1 is a promotion");
  assert.strictEqual(promotion.fromKey, "easy",     "fromKey is easy (index 0)");
  assert.strictEqual(promotion.toKey,   "medium",   "toKey is medium (index 1)");
  // Reverse: before=medium (idx 1), after=easy (idx 0) -> demoted
  var fakeDemotion = { beforeState: { currentDifficulty: "medium" }, state: { currentDifficulty: "easy" } };
  var demotion = detectProgression(fakeDemotion, DIFF_OPTIONS);
  assert.notStrictEqual(demotion, null, "reverse must also be detected");
  assert.strictEqual(demotion.type, "demoted", "index 1 to 0 is a demotion");
  console.log("  PASS: promotion/demotion index direction is correct");
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------
function main() {
  console.log("Running progression detection tests...");
  testNoProgressionOnBalancedRound();
  testPromotionAfterTwoComfortableRounds();
  testDemotionAfterTwoStrugglingRounds();
  testPromotionIndexDirection();
  console.log("All progression tests passed.");
}

main();