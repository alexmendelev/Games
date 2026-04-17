const path = require("path");
const assert = require("assert");
const sessionApi = require(path.join(__dirname, "..", "shared", "scripts", "game-session.js"));

const { createArcadeSession } = sessionApi;

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (err) {
    failed += 1;
    console.error("FAIL: " + name);
    console.error("  " + (err && err.message ? err.message : err));
  }
}

function eq(actual, expected, label) {
  assert.strictEqual(actual, expected, (label || "") + " expected " + JSON.stringify(expected) + " got " + JSON.stringify(actual));
}

function approxEq(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) <= tolerance, (label || "") + " expected ~" + expected + " got " + actual);
}

// --- createArcadeSession: initial state ---

test("initial state has level 1 and zero counts", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 5 }) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 0 } }, "easy");
  const state = session.getState();
  eq(state.levelNumber, 1, "levelNumber");
  eq(state.correctCount, 0, "correctCount");
  eq(state.wrongCount, 0, "wrongCount");
  eq(state.missCount, 0, "missCount");
  eq(state.coins, 0, "coins");
  eq(state.coinsEarned, 0, "coinsEarned");
  eq(state.bestStreak, 0, "bestStreak");
  eq(state.consecutiveCorrect, 0, "consecutiveCorrect");
});

test("loadCheckpoint sets levelNumber from snapshot.nextLevel", () => {
  const session = createArcadeSession();
  session.loadCheckpoint({ nextLevel: 7, player: { coins: 42 } }, "hard");
  const state = session.getState();
  eq(state.levelNumber, 7, "levelNumber");
  eq(state.coins, 42, "coins");
  eq(state.diffKey, "hard", "diffKey");
});

test("loadCheckpoint defaults to level 1 when nextLevel is missing", () => {
  const session = createArcadeSession();
  session.loadCheckpoint({}, "medium");
  eq(session.getState().levelNumber, 1, "levelNumber");
});

// --- handleCorrect ---

test("handleCorrect increments correctCount and consecutiveCorrect", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 10 }) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 0 } }, "easy");
  session.handleCorrect();
  session.handleCorrect();
  const state = session.getState();
  eq(state.correctCount, 2, "correctCount");
  eq(state.consecutiveCorrect, 2, "consecutiveCorrect");
  eq(state.bestStreak, 2, "bestStreak");
});

test("handleCorrect returns levelComplete=true when target is reached", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 3 }) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 0 } }, "easy");
  session.handleCorrect();
  session.handleCorrect();
  const result = session.handleCorrect();
  eq(result.levelComplete, true, "levelComplete on 3rd correct");
});

test("handleCorrect returns levelComplete=false before target", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 5 }) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 0 } }, "easy");
  const result = session.handleCorrect();
  eq(result.levelComplete, false, "levelComplete before target");
});

// --- handleWrong ---

test("handleWrong increments wrongCount and resets consecutiveCorrect", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 10 }) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 0 } }, "easy");
  session.handleCorrect();
  session.handleCorrect();
  session.handleWrong();
  const state = session.getState();
  eq(state.wrongCount, 1, "wrongCount");
  eq(state.consecutiveCorrect, 0, "consecutiveCorrect reset");
  eq(state.bestStreak, 2, "bestStreak preserved");
});

test("handleWrong increments wrongClicks", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 10 }) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 0 } }, "easy");
  session.handleWrong();
  session.handleWrong();
  eq(session.getState().wrongClicks, 2, "wrongClicks");
});

// --- handleSink ---

test("handleSink resets consecutiveCorrect but does not increment missCount", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 10 }) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 0 } }, "easy");
  session.handleCorrect();
  session.handleSink();
  const state = session.getState();
  eq(state.consecutiveCorrect, 0, "consecutiveCorrect reset");
  eq(state.missCount, 0, "missCount unchanged by sink");
});

// --- handleMiss ---

test("handleMiss increments missCount and resets consecutiveCorrect", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 10 }) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 0 } }, "easy");
  session.handleCorrect();
  session.handleMiss();
  const state = session.getState();
  eq(state.missCount, 1, "missCount");
  eq(state.consecutiveCorrect, 0, "consecutiveCorrect reset");
});

// --- addCoins ---

test("addCoins adds to both coins and coinsEarned", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 10 }) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 100 } }, "easy");
  session.addCoins(5);
  session.addCoins(3);
  const state = session.getState();
  eq(state.coins, 108, "coins total");
  eq(state.coinsEarned, 8, "coinsEarned this level");
});

test("addCoins ignores negative values", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 10 }) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 50 } }, "easy");
  session.addCoins(-10);
  eq(session.getState().coins, 50, "coins unchanged for negative delta");
});

// --- bestStreak tracking ---

test("bestStreak tracks the longest consecutive correct streak", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 20 }) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 0 } }, "easy");
  session.handleCorrect();
  session.handleCorrect();
  session.handleCorrect(); // streak: 3
  session.handleWrong();   // reset
  session.handleCorrect();
  session.handleCorrect(); // streak: 2
  const state = session.getState();
  eq(state.bestStreak, 3, "bestStreak");
  eq(state.consecutiveCorrect, 2, "current streak");
});

// --- accuracy ---

test("accuracy is correct / (correct + wrong + miss)", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 20 }) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 0 } }, "easy");
  session.handleCorrect(); // 1 correct
  session.handleWrong();   // 1 wrong
  session.handleMiss();    // 1 miss
  approxEq(session.getState().accuracy, 1 / 3, 0.001, "accuracy");
});

test("accuracy is 0 when no attempts", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 10 }) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 0 } }, "easy");
  eq(session.getState().accuracy, 0, "accuracy with no attempts");
});

// --- levelProgress ---

test("levelProgress.ratio reflects correctCount/correctTarget", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 4 }) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 0 } }, "easy");
  session.handleCorrect();
  session.handleCorrect();
  const state = session.getState();
  approxEq(state.levelProgress.ratio, 0.5, 0.001, "ratio");
  eq(state.levelProgress.current, 2, "current");
  eq(state.levelProgress.target, 4, "target");
});

// --- shouldCompleteLevel ---

test("shouldCompleteLevel returns false before target", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 5 }) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 0 } }, "easy");
  session.handleCorrect();
  session.handleCorrect();
  eq(session.shouldCompleteLevel(), false, "not complete yet");
});

test("shouldCompleteLevel returns true after reaching target", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 2 }) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 0 } }, "easy");
  session.handleCorrect();
  session.handleCorrect();
  eq(session.shouldCompleteLevel(), true, "complete after target");
});

// --- buildResultsPayload ---

test("buildResultsPayload returns correct structure", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 3 }) });
  session.loadCheckpoint({ nextLevel: 2, player: { coins: 10 } }, "medium");
  session.handleCorrect();
  session.handleCorrect();
  session.handleWrong();
  session.handleCorrect();
  const payload = session.buildResultsPayload();
  eq(payload.completedLevel, 2, "completedLevel");
  eq(payload.diffKey, "medium", "diffKey");
  eq(payload.metrics.correct, 3, "metrics.correct");
  eq(payload.metrics.wrong, 1, "metrics.wrong");
  eq(payload.metrics.passed, true, "metrics.passed");
  eq(payload.metrics.wrongClicks, 1, "metrics.wrongClicks");
  approxEq(payload.metrics.accuracy, 3 / 4, 0.001, "metrics.accuracy");
});

test("buildResultsPayload passed=false when target not reached", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 10 }) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 0 } }, "easy");
  session.handleCorrect();
  const payload = session.buildResultsPayload();
  eq(payload.metrics.passed, false, "not passed");
});

// --- getLevelRules callback ---

test("getLevelRules receives current diffKey and levelNumber", () => {
  const calls = [];
  const session = createArcadeSession({
    getLevelRules: (ctx) => {
      calls.push({ diffKey: ctx.diffKey, levelNumber: ctx.levelNumber });
      return { correctTarget: 5 };
    }
  });
  session.loadCheckpoint({ nextLevel: 3, player: { coins: 0 } }, "hard");
  assert.ok(calls.length >= 1, "getLevelRules was called");
  eq(calls[calls.length - 1].diffKey, "hard", "diffKey passed");
  eq(calls[calls.length - 1].levelNumber, 3, "levelNumber passed");
});

// --- onStateChange callback ---

test("onStateChange is called on handleCorrect, handleWrong, handleMiss", () => {
  let changeCount = 0;
  const session = createArcadeSession({
    getLevelRules: () => ({ correctTarget: 10 }),
    onStateChange: () => { changeCount += 1; }
  });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 0 } }, "easy");
  const before = changeCount;
  session.handleCorrect();
  session.handleWrong();
  session.handleMiss();
  assert.ok(changeCount >= before + 3, "onStateChange called at least 3 times");
});

// --- clearRunCounts via loadCheckpoint ---

test("loadCheckpoint resets run counts", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 10 }) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 0 } }, "easy");
  session.handleCorrect();
  session.handleCorrect();
  session.handleWrong();
  session.addCoins(5);
  // Re-load checkpoint — should reset run counts
  session.loadCheckpoint({ nextLevel: 2, player: { coins: 100 } }, "medium");
  const state = session.getState();
  eq(state.correctCount, 0, "correctCount reset");
  eq(state.wrongCount, 0, "wrongCount reset");
  eq(state.coinsEarned, 0, "coinsEarned reset");
  eq(state.bestStreak, 0, "bestStreak reset");
  eq(state.coins, 100, "coins from new snapshot");
});

// --- normalizeLevelRules edge cases ---

test("getLevelRules defaults to correctTarget=10 when no rules returned", () => {
  const session = createArcadeSession({ getLevelRules: () => ({}) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 0 } }, "easy");
  eq(session.getState().levelRules.correctTarget, 10, "default correctTarget");
});

test("getLevelRules with timeLimitMs=null means no time limit", () => {
  const session = createArcadeSession({ getLevelRules: () => ({ correctTarget: 5, timeLimitMs: null }) });
  session.loadCheckpoint({ nextLevel: 1, player: { coins: 0 } }, "easy");
  eq(session.getState().levelRules.timeLimitMs, null, "no time limit");
  eq(session.getState().timeRemainingMs, null, "timeRemainingMs null");
});

// --- Summary ---

const total = passed + failed;
if (failed > 0) {
  console.error(failed + "/" + total + " tests FAILED.");
  process.exit(1);
} else {
  console.log("Logic tests passed: game-session (" + passed + "/" + total + " tests).");
}
