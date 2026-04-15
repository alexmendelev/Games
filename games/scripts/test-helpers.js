// Shared helpers for difficulty-manager test scripts.
// createSeededRandom is re-exported from difficulty-manager so both use the same algorithm.
const path = require("path");
const difficultyApi = require(path.join(__dirname, "..", "shared", "scripts", "difficulty-manager.js"));

const createSeededRandom = difficultyApi.createSeededRandom;

function randInt(rng, min, max) {
  return Math.floor(rng() * ((max - min) + 1)) + min;
}

function choice(rng, items) {
  return items[randInt(rng, 0, items.length - 1)];
}

// Returns a shuffled copy without mutating the original.
function shuffle(rng, items) {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

// Shuffles an array in-place using the provided seeded rng.
function shuffleInPlace(array, rng) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const tmp = array[index];
    array[index] = array[swapIndex];
    array[swapIndex] = tmp;
  }
  return array;
}

function randomInRange(rng, range, fallbackMin, fallbackMax) {
  const safeRange = Array.isArray(range) && range.length >= 2 ? range : [fallbackMin, fallbackMax];
  return randInt(rng, safeRange[0], safeRange[1]);
}

module.exports = { createSeededRandom, randInt, choice, shuffle, shuffleInPlace, randomInRange };
