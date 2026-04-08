---
title: Adaptive Difficulty
---

# Adaptive Difficulty

Shared adaptive difficulty lives in `shared/scripts/difficulty-manager.js` and is applied by `shared/scripts/game-meta.js`.

## Scope

- shared across the games that use normal difficulty labels:
  - `math`
  - `words`
  - `shapes`
  - `clocks`
  - `equations`
  - `multiply` uses its own two-level keys but still goes through the shared manager
- adapts only between levels
- never changes difficulty during a level
- always respects parent min/max bounds
- never jumps by more than one difficulty step

## Stored State

- `currentDifficulty`
- `comfortableStreak`
- `strugglingStreak`
- `pendingRecoveryLevel`

## Level Inputs

The shared session/meta flow passes these values after each level:

- `passed`
- `avgAnswerMs`
- `wrongClicks`
- `correctCount`
- `questionTimeLimitMs`

Derived values:

- `avgTimeRatio = avgAnswerMs / questionTimeLimitMs`
- `misclicksPerCorrect = wrongClicks / max(correctCount, 1)`

## Classification

- `comfortable`:
  - `passed`
  - `avgTimeRatio <= 0.45`
  - `misclicksPerCorrect <= 0.25`
- `struggling`:
  - not passed, or `avgTimeRatio >= 0.75`, or `misclicksPerCorrect >= 0.75`
- otherwise `balanced`

## Transition Rules

- `comfortable`
  - `comfortableStreak += 1`
  - `strugglingStreak = 0`
  - when streak reaches `2`, increase `currentDifficulty` by one step and reset `comfortableStreak`
- `balanced`
  - reset both streaks
  - keep current difficulty
- `struggling`
  - `strugglingStreak += 1`
  - `comfortableStreak = 0`
  - first struggling level sets a temporary one-step recovery difficulty if possible
  - second struggling level permanently lowers `currentDifficulty` by one step and resets `strugglingStreak`

## Recovery

- recovery is temporary only
- if already at the minimum difficulty, recovery stays at the minimum
- after a recovery level, the game returns to `currentDifficulty` unless a permanent downgrade happened

## Debug

- every completed level emits a structured JSON debug event
- browser debug modes:
  - `?difficultyDebug=console`
  - `?difficultyDebug=overlay`
  - `?difficultyDebug=all`

## Simulation

- shared simulation runner:
  - `npm run simulate:difficulty`
  - `node scripts/run-difficulty-sim.js --profile average --seed 11 --levels 16`
- built-in seeded profiles:
  - `strong`
  - `average`
  - `struggling`

## Tests

- logic test:
  - `npm run test:logic`
- focused Math browser test:
  - `npm run test:e2e:math-difficulty`

Back to [[overview]].
