const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const difficultyApi = require(path.join(__dirname, "..", "shared", "scripts", "difficulty-manager.js"));

function loadShapesConfig() {
  const filePath = path.join(__dirname, "..", "shapes", "config.js");
  const source = fs.readFileSync(filePath, "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.window.GAME_V2_SHAPES_CONFIG;
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace(array, rng) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const tmp = array[index];
    array[index] = array[swapIndex];
    array[swapIndex] = tmp;
  }
  return array;
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

function buildPoolForProfile(pairs, profile) {
  const allowedShapes = new Set(profile.shapePool || []);
  const allowedColors = new Set(profile.colorPool || []);
  return pairs.filter((item) => allowedShapes.has(item.shapeId) && allowedColors.has(item.colorId));
}

function selectDistractors(cfg, pool, correct, profile, rng) {
  const plan = Array.isArray(profile.distractorPlan) ? profile.distractorPlan : [];
  const fallbackTiers = Array.isArray(profile.fallbackTiers) ? profile.fallbackTiers : [];
  const bucketOrder = Array.from(new Set(plan.concat(fallbackTiers).concat([
    "same-shape-related-color",
    "related-shape-same-color",
    "same-shape",
    "same-color",
    "related-shape-related-color",
    "related-shape",
    "related-color",
    "distinct"
  ])));
  const buckets = new Map(bucketOrder.map((key) => [key, []]));

  for (const candidate of pool) {
    if (!candidate || candidate.id === correct.id) {
      continue;
    }
    const similarityKey = classifySimilarity(cfg, correct, candidate);
    if (!buckets.has(similarityKey)) {
      buckets.set(similarityKey, []);
    }
    buckets.get(similarityKey).push(candidate);
  }
  buckets.forEach((list) => shuffleInPlace(list, rng));

  const distractors = [];
  const usedIds = new Set([correct.id]);
  function takeFromBucket(bucketKey) {
    const list = buckets.get(bucketKey) || [];
    while (list.length) {
      const candidate = list.shift();
      if (!candidate || usedIds.has(candidate.id)) {
        continue;
      }
      distractors.push(candidate);
      usedIds.add(candidate.id);
      return true;
    }
    return false;
  }

  for (const bucketKey of plan) {
    if (distractors.length >= profile.answerCount - 1) {
      break;
    }
    takeFromBucket(bucketKey);
  }
  for (const bucketKey of bucketOrder) {
    while (distractors.length < profile.answerCount - 1 && takeFromBucket(bucketKey)) {
      // keep filling until the target answer count is reached
    }
    if (distractors.length >= profile.answerCount - 1) {
      break;
    }
  }

  return distractors;
}

function buildTask(cfg, pairs, profileKey, rng) {
  const profile = cfg.difficulties[profileKey];
  const pool = buildPoolForProfile(pairs, profile);
  const correct = pool[Math.floor(rng() * pool.length)];
  const distractors = selectDistractors(cfg, pool, correct, profile, rng);
  const options = [correct].concat(distractors).slice(0, profile.answerCount);
  return {
    correct,
    options
  };
}

function countBy(items) {
  const counts = Object.create(null);
  for (const item of items) {
    counts[item] = (counts[item] || 0) + 1;
  }
  return counts;
}

function assertTaskMatchesProfile(cfg, task, profileKey, profile) {
  const pool = buildPoolForProfile(buildPairs(cfg), profile);
  const poolIds = new Set(pool.map((item) => item.id));
  assert.strictEqual(task.options.length, profile.answerCount, `${profileKey}: wrong answer count`);

  const seenIds = new Set();
  const classifications = [];
  for (const option of task.options) {
    assert(poolIds.has(option.id), `${profileKey}: option outside allowed pool`);
    assert(!seenIds.has(option.id), `${profileKey}: duplicate option ${option.id}`);
    seenIds.add(option.id);
    if (option.id !== task.correct.id) {
      classifications.push(classifySimilarity(cfg, task.correct, option));
    }
  }

  const allowedTiers = new Set((profile.distractorPlan || []).concat(profile.fallbackTiers || []));
  for (const similarityKey of classifications) {
    assert(allowedTiers.has(similarityKey), `${profileKey}: disallowed distractor tier ${similarityKey}`);
  }
  const actualCounts = countBy(classifications);

  if (profileKey === "easy") {
    assert((actualCounts.distinct || 0) >= 1, "easy: should include at least one clearly distinct distractor");
    assert((actualCounts["related-shape"] || 0) === 0, "easy: should avoid related-shape distractors");
    assert((actualCounts["related-color"] || 0) === 0, "easy: should avoid related-color distractors");
    assert((actualCounts["related-shape-related-color"] || 0) === 0, "easy: should avoid compound related distractors");
    assert((actualCounts["same-shape-related-color"] || 0) === 0, "easy: should avoid same-shape related-color distractors");
    assert((actualCounts["related-shape-same-color"] || 0) === 0, "easy: should avoid related-shape same-color distractors");
  }

  if (profileKey === "medium") {
    const simpleSharedFeatureCount = (actualCounts["same-shape"] || 0) + (actualCounts["same-color"] || 0);
    assert(simpleSharedFeatureCount >= 2, "medium: should include simple shared-feature distractors");
    assert((actualCounts["same-shape-related-color"] || 0) === 0, "medium: should avoid compound close distractors");
    assert((actualCounts["related-shape-same-color"] || 0) === 0, "medium: should avoid compound close distractors");
    assert((actualCounts["related-shape-related-color"] || 0) === 0, "medium: should avoid double-related distractors");
  }

  if (profileKey === "hard") {
    const compoundCount = (actualCounts["same-shape-related-color"] || 0)
      + (actualCounts["related-shape-same-color"] || 0)
      + (actualCounts["related-shape-related-color"] || 0);
    const nonDistinctCount = classifications.filter((item) => item !== "distinct").length;
    assert(compoundCount >= 2, "hard: should include clearly close distractors");
    assert(nonDistinctCount >= 8, "hard: most distractors should be visually close");
  }

  if (profileKey === "super") {
    const compoundCount = (actualCounts["same-shape-related-color"] || 0)
      + (actualCounts["related-shape-same-color"] || 0)
      + (actualCounts["related-shape-related-color"] || 0);
    const nonDistinctCount = classifications.filter((item) => item !== "distinct").length;
    assert(compoundCount >= 4, "super: should include several very close distractors");
    assert(nonDistinctCount >= 13, "super: nearly all distractors should be visually close");
    assert((actualCounts.distinct || 0) <= 2, "super: should keep clearly distinct distractors rare");
  }
}

function runShapesDifficultyChecks() {
  const cfg = loadShapesConfig();
  const pairs = buildPairs(cfg);
  assert.deepStrictEqual(Object.keys(cfg.difficulties || {}), ["easy", "medium", "hard", "super"]);
  assert.strictEqual(cfg.diffs, undefined, "Shapes config should not define legacy diffs");

  assert.strictEqual(cfg.difficulties.easy.answerCount, 4);
  assert.strictEqual(cfg.difficulties.medium.answerCount, 8);
  assert.strictEqual(cfg.difficulties.hard.answerCount, 12);
  assert.strictEqual(cfg.difficulties.super.answerCount, 16);

  assert.deepStrictEqual(Array.from(cfg.difficulties.easy.shapePool), ["circle", "square", "triangle", "diamond"]);
  assert.deepStrictEqual(Array.from(cfg.difficulties.easy.colorPool), ["red", "blue", "green", "yellow"]);
  assert.deepStrictEqual(Array.from(cfg.difficulties.hard.shapePool), ["circle", "square", "triangle", "diamond", "star", "heart"]);

  const rng = createSeededRandom(41);
  for (const [profileKey, profile] of Object.entries(cfg.difficulties)) {
    const pool = buildPoolForProfile(pairs, profile);
    assert(pool.length >= profile.answerCount, `${profileKey}: pool too small for answer count`);
    for (let index = 0; index < 120; index += 1) {
      const task = buildTask(cfg, pairs, profileKey, rng);
      assertTaskMatchesProfile(cfg, task, profileKey, profile);
    }
  }

  const gameSource = fs.readFileSync(path.join(__dirname, "..", "shapes", "game.js"), "utf8");
  assert(gameSource.includes("function currentDifficultyProfile()"), "Shapes game should resolve an explicit difficulty profile");
  assert(gameSource.includes("function selectDistractors(correct, profile)"), "Shapes game should build distractors from explicit profile rules");
  assert(gameSource.includes("const profile = currentDifficultyProfile();"), "Shapes game should generate tasks from the active difficulty profile");
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
  runShapesDifficultyChecks();
  runDifficultyManagerChecks();
  console.log("Logic tests passed: shapes difficulty profiles and difficulty manager.");
}

main();
