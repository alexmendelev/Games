window.GAMES_V2_MYSTERY = (function () {
  "use strict";

  var MYSTERY_CHANCE = 1 / 9;
  var COIN_MULTIPLIER = 3;
  var MIN_QUESTIONS_BEFORE_FIRST = 2;
  var prevWasMystery = false;

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffleInPlace(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function choice(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  // --- Arithmetic question generators ---

  function additionQuestion() {
    var a = randInt(1, 15);
    var b = randInt(1, 15);
    return { text: a + "+" + b, answer: a + b, source: "math", type: "number" };
  }

  function subtractionQuestion() {
    var a = randInt(3, 20);
    var b = randInt(1, a);
    return { text: a + "-" + b, answer: a - b, source: "math", type: "number" };
  }

  function multiplyQuestion() {
    var a = randInt(2, 9);
    var b = randInt(2, 9);
    return { text: a + "\u00d7" + b, answer: a * b, source: "multiply", type: "number" };
  }

  function divisionQuestion() {
    var divisor = randInt(2, 8);
    var quotient = randInt(1, 8);
    var dividend = divisor * quotient;
    return { text: dividend + "\u00f7" + divisor, answer: quotient, source: "equations", type: "number" };
  }

  function missingNumberQuestion() {
    var a = randInt(1, 12);
    var b = randInt(1, 12);
    var sum = a + b;
    if (Math.random() < 0.5) {
      return { text: "?+" + b + "=" + sum, answer: a, source: "equations", type: "number" };
    }
    return { text: a + "+?=" + sum, answer: b, source: "equations", type: "number" };
  }

  // --- Arithmetic generators map ---

  var GENERATORS = {
    math: [additionQuestion, subtractionQuestion],
    multiply: [multiplyQuestion],
    equations: [divisionQuestion, missingNumberQuestion]
  };

  function pickGenerators(excludeGameKey) {
    var available = [];
    Object.keys(GENERATORS).forEach(function (key) {
      if (key !== excludeGameKey) {
        GENERATORS[key].forEach(function (gen) {
          available.push(gen);
        });
      }
    });
    return available.length ? available : [additionQuestion, multiplyQuestion];
  }

  // --- Numeric distractor generation ---

  function buildWrongs(correct) {
    var set = {};
    set[correct] = true;
    var near = Math.max(3, Math.ceil(correct * 0.25));
    var guard = 0;
    while (Object.keys(set).length < 4 && guard < 200) {
      guard++;
      var delta = randInt(-near, near);
      if (delta === 0) delta = 1;
      var wrong = correct + delta;
      if (wrong < 0) continue;
      set[wrong] = true;
    }
    while (Object.keys(set).length < 4) {
      set[correct + Object.keys(set).length] = true;
    }
    var arr = Object.keys(set).map(Number);
    shuffleInPlace(arr);
    return arr;
  }

  // --- Public API ---

  function shouldTrigger(questionCount) {
    if (questionCount < MIN_QUESTIONS_BEFORE_FIRST) {
      prevWasMystery = false;
      return false;
    }
    if (prevWasMystery) {
      prevWasMystery = false;
      return false;
    }
    var result = Math.random() < MYSTERY_CHANCE;
    prevWasMystery = result;
    return result;
  }

  function generate(currentGameKey) {
    var gens = pickGenerators(currentGameKey);
    var gen = choice(gens);
    var q = gen();
    var answers = buildWrongs(q.answer);
    return {
      mystery: true,
      mysterySource: q.source,
      mysteryType: q.type,
      text: q.text,
      answer: q.answer,
      mysteryAnswers: answers,
      mysteryBonusMultiplier: COIN_MULTIPLIER
    };
  }

  function isMystery(task) {
    return !!(task && task.mystery);
  }

  return {
    shouldTrigger: shouldTrigger,
    generate: generate,
    isMystery: isMystery,
    COIN_MULTIPLIER: COIN_MULTIPLIER
  };
})();
