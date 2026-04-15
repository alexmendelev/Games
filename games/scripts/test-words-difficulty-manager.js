const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const difficultyApi = require(path.join(__dirname, "..", "shared", "scripts", "difficulty-manager.js"));
const { createSeededRandom, choice, shuffle } = require(path.join(__dirname, "test-helpers.js"));

function loadWordsConfig() {
  const filePath = path.join(__dirname, "..", "words", "config.js");
  const source = fs.readFileSync(filePath, "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.window.GAME_V2_WORDS_CONFIG;
}

function loadWordsManifest() {
  const filePath = path.join(__dirname, "..", "words", "data", "emojis-new", "icon-pack-manifest.tsv");
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

function buildPoolForProfile(config, manifest, diffKey, languageId, options) {
  const profile = config.difficulties[diffKey];
  const rules = profile.wordPool || {};
  const distractorRules = profile.distractors || {};
  const excludedCategories = new Set((rules.excludedCategories || []).map((value) => String(value || "")));
  const allowedCategories = Array.isArray(rules.allowedCategories) && rules.allowedCategories.length
    ? new Set(rules.allowedCategories.map((value) => String(value || "")))
    : null;
  const preferredIds = new Set((rules.preferredIds || []).map((value) => String(value || "")));
  const ignorePreferredOnly = !!(options && options.ignorePreferredOnly);

  const filtered = manifest.filter((item) => {
    const word = item[languageId];
    const length = wordLetterCount(word);
    if (length < (profile.minWordLength || 1)) {
      return false;
    }
    if (Number.isFinite(profile.maxWordLength) && length > profile.maxWordLength) {
      return false;
    }
    if (excludedCategories.has(String(item.category || ""))) {
      return false;
    }
    if (allowedCategories && !allowedCategories.has(String(item.category || ""))) {
      return false;
    }
    return !!normalizeWord(word);
  });

  if (!preferredIds.size || ignorePreferredOnly) {
    if (!distractorRules.requireStrictDistractors) {
      return filtered;
    }
    return filtered.filter((correctItem) => {
      const correctWord = correctItem[languageId];
      let strictCount = 0;
      const usedWords = new Set([normalizeWord(correctWord)]);
      for (const candidate of filtered) {
        if (!candidate || candidate.id === correctItem.id) {
          continue;
        }
        const candidateWord = candidate[languageId];
        const normalizedCandidate = normalizeWord(candidateWord);
        if (!normalizedCandidate || usedWords.has(normalizedCandidate)) {
          continue;
        }
        if (!distractorMatchesRules(analyzeSimilarity(correctWord, candidateWord), distractorRules)) {
          continue;
        }
        usedWords.add(normalizedCandidate);
        strictCount += 1;
        if (strictCount >= 3) {
          return true;
        }
      }
      return false;
    });
  }

  const preferred = filtered.filter((item) => preferredIds.has(item.id));
  if (preferred.length >= Math.max(4, Number(rules.preferredOnlyMinPool) || 0)) {
    return preferred;
  }

  return preferred.concat(filtered.filter((item) => !preferredIds.has(item.id)));
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

function distractorRank(analysis, rules) {
  const targetSimilarity = Number.isFinite(rules.maxSimilarityScore)
    ? ((Math.max(0, Number(rules.minSimilarityScore) || 0) + Number(rules.maxSimilarityScore)) / 2)
    : (Number(rules.minSimilarityScore) || 0);
  let rank = 100 - Math.abs(analysis.similarityScore - targetSimilarity);
  if (rules.preferSameLength && analysis.sameLength) {
    rank += 12;
  }
  if (Number.isFinite(rules.preferSharedPrefixLength) && analysis.sharedPrefixLength >= rules.preferSharedPrefixLength) {
    rank += 10;
  }
  if (Number.isFinite(rules.preferSharedSuffixLength) && analysis.sharedSuffixLength >= rules.preferSharedSuffixLength) {
    rank += 10;
  }
  if (rules.allowSameFirstLetter && analysis.sameFirstLetter) {
    rank += 3;
  }
  if (rules.allowSameLastLetter && analysis.sameLastLetter) {
    rank += 3;
  }
  rank -= analysis.lengthDiff;
  return rank;
}

function selectDistractors(config, manifest, profileKey, correctItem, languageId, rng) {
  const profile = config.difficulties[profileKey];
  const rules = profile.distractors || {};
  const exactPool = buildPoolForProfile(config, manifest, profileKey, languageId);
  const broadPool = buildPoolForProfile(config, manifest, profileKey, languageId, { ignorePreferredOnly: true });
  const pools = [exactPool, broadPool, manifest];
  const correctWord = correctItem[languageId];
  const usedIds = new Set([correctItem.id]);
  const usedWords = new Set([normalizeWord(correctWord)]);
  const distractors = [];

  function addFromPool(pool, strictMode) {
    const candidates = shuffle(rng, pool)
      .filter((item) => item && !usedIds.has(item.id))
      .map((item, index) => ({
        item,
        normalizedWord: normalizeWord(item[languageId]),
        analysis: analyzeSimilarity(correctWord, item[languageId]),
        index
      }))
      .filter((entry) => entry.normalizedWord && !usedWords.has(entry.normalizedWord))
      .filter((entry) => !strictMode || distractorMatchesRules(entry.analysis, rules))
      .sort((left, right) => {
        const rankDiff = distractorRank(right.analysis, rules) - distractorRank(left.analysis, rules);
        return rankDiff !== 0 ? rankDiff : (left.index - right.index);
      });

    for (const entry of candidates) {
      if (distractors.length >= 3) {
        return;
      }
      if (usedIds.has(entry.item.id) || usedWords.has(entry.normalizedWord)) {
        continue;
      }
      distractors.push(entry.item);
      usedIds.add(entry.item.id);
      usedWords.add(entry.normalizedWord);
    }
  }

  for (const pool of pools) {
    addFromPool(pool, true);
    if (distractors.length >= 3) {
      break;
    }
  }
  if (distractors.length < 3) {
    for (const pool of pools) {
      addFromPool(pool, false);
      if (distractors.length >= 3) {
        break;
      }
    }
  }

  return distractors.slice(0, 3);
}

function generateTask(config, manifest, profileKey, languageId, rng) {
  const pool = buildPoolForProfile(config, manifest, profileKey, languageId);
  const correct = choice(rng, pool);
  const distractors = selectDistractors(config, manifest, profileKey, correct, languageId, rng);
  return {
    correct,
    correctWord: correct[languageId],
    distractors
  };
}

function assertTaskMatchesProfile(config, manifest, profileKey, languageId, task) {
  const profile = config.difficulties[profileKey];
  const rules = profile.distractors || {};
  const correctWord = task.correctWord;
  const correctLength = wordLetterCount(correctWord);

  assert(correctLength >= (profile.minWordLength || 1), `${profileKey}/${languageId}: correct word too short`);
  if (Number.isFinite(profile.maxWordLength)) {
    assert(correctLength <= profile.maxWordLength, `${profileKey}/${languageId}: correct word too long`);
  }

  const poolRules = profile.wordPool || {};
  if (poolRules.preferredIds && poolRules.preferredIds.length) {
    const preferredSet = new Set(poolRules.preferredIds);
    const preferredPool = buildPoolForProfile(config, manifest, profileKey, languageId)
      .filter((item) => preferredSet.has(item.id));
    if (preferredPool.length >= Math.max(4, Number(poolRules.preferredOnlyMinPool) || 0)) {
      assert(preferredSet.has(task.correct.id), `${profileKey}/${languageId}: expected correct word from preferred pool`);
    }
  }

  assert.strictEqual(task.distractors.length, 3, `${profileKey}/${languageId}: expected 3 distractors`);
  const seenWords = new Set([normalizeWord(correctWord)]);
  for (const distractor of task.distractors) {
    const distractorWord = distractor[languageId];
    const normalized = normalizeWord(distractorWord);
    assert(normalized && !seenWords.has(normalized), `${profileKey}/${languageId}: duplicate distractor word`);
    seenWords.add(normalized);
    const analysis = analyzeSimilarity(correctWord, distractorWord);
    assert(distractorMatchesRules(analysis, rules), `${profileKey}/${languageId}: distractor ${distractorWord} violates similarity rules`);
  }
}

function runWordsDifficultyChecks() {
  const config = loadWordsConfig();
  const manifest = loadWordsManifest();
  assert.deepStrictEqual(Object.keys(config.difficulties || {}), ["easy", "medium", "hard", "super"]);
  assert.strictEqual(config.diffs, undefined, "Words config should not define legacy diffs");
  assert.strictEqual(config.gameplay.correctPerDiffStep, undefined, "Words config should not define correctPerDiffStep");

  const rng = createSeededRandom(31);
  for (const languageId of ["en", "he"]) {
    for (const profileKey of Object.keys(config.difficulties)) {
      const pool = buildPoolForProfile(config, manifest, profileKey, languageId);
      assert(pool.length >= 4, `${profileKey}/${languageId}: expected at least 4 words in pool`);
      for (let index = 0; index < 50; index += 1) {
        const task = generateTask(config, manifest, profileKey, languageId, rng);
        assertTaskMatchesProfile(config, manifest, profileKey, languageId, task);
      }
    }
  }

  const gameSource = fs.readFileSync(path.join(__dirname, "..", "words", "game.js"), "utf8");
  assert(gameSource.includes("function currentDifficultyProfile()"), "Words game should resolve an explicit difficulty profile");
  assert(gameSource.includes("function selectDistractors(correct, languageId)"), "Words game should build distractors from explicit similarity rules");
  assert(gameSource.includes("const diffKey = currentDifficultyKey();"), "Words game should choose the correct pool from the active difficulty only");
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
  runWordsDifficultyChecks();
  runDifficultyManagerChecks();
  console.log("Logic tests passed: words difficulty profiles and difficulty manager.");
}

main();
