---
title: Math
---

# Math

`math` is the general arithmetic game with falling questions and a shared mascot/game shell.

## Shared Shell

- uses the common screen structure described in [[systems/layout-manager]]
- follows the shared HUD and control layout
- answers area: `FourAnswerGrid`

## Scoring

- uses the shared session metrics and post-level bonus flow from [[overview]]
- special tablet rewards are `1 / 5 / 20` coins for silver / gold / diamond
- completion bonus follows the standard profile: `+1 / +2 / +4 / +8`

## Difficulty

- presets: `easy`, `medium`, `hard`, `super`
- level goals:
  - `8 / 10 / 12 / 14` correct
  - `60s / 75s / 90s / 90s`
- Math no longer uses a hidden stage system
- Math content now depends only on the active difficulty, not on level number or in-level streaks

### Easy

- addition only
- operands `[1–5] + [1–5]`, results up to `10`
- no negatives, no multiplication or division
- distractors are friendlier and more separated

### Medium

- addition and subtraction
- addition: `[1–10] + [1–10]`, results up to `20`
- subtraction: `[2–20] − [1–10]`, results up to `20`
- no negative results, no multiplication or division
- this is the first mixed-arithmetic level

### Hard

- addition and subtraction, two-digit arithmetic
- addition: `[10–49] + [10–49]`, results up to `98`
- subtraction: `[20–79] − [10–49]`
- carrying and borrowing are common at this range
- no negative results, no multiplication or division
- distractors sit closer to the right answer

### Super

- addition and subtraction only (multiplication and division are the Multiply game's domain)
- addition: `[25–75] + [15–75]`, results up to `99`
- subtraction: `[30–99] − [11–79]`
- hardest two-digit combinations; carrying/borrowing almost always required
- no negatives
- tightest distractors

## Generation Notes

- addition and subtraction avoid `+0` and `-0`
- subtraction swaps operands if needed to prevent negative answers
- no task repeats within a level — seen pairs are tracked per level and reset between levels; `a+b` and `b+a` count as the same task
- wrong answers come from a per-difficulty distractor config instead of stage-based spread

## Adaptive Difficulty

- Math uses the shared adaptive manager described in [[systems/adaptive-difficulty]]
- Parent bounds still control the allowed min/max range
- Shared adaptive state stored for Math:
  - `currentDifficulty`
  - `comfortableStreak`
  - `strugglingStreak`
  - `pendingRecoveryLevel`

## Debug And Testing

- adaptive debug output is available with:
  - `?difficultyDebug=console`
  - `?difficultyDebug=overlay`
  - `?difficultyDebug=all`
- fast logic test:
  - `npm run test:logic`
- focused browser test:
  - `npm run test:e2e:math-difficulty`

Back to [[overview]].
