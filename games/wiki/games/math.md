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
- small numbers, mainly up to `5`
- results up to `10`
- no negatives
- no multiplication or division
- distractors are friendlier and more separated

### Medium

- addition and subtraction
- operands/results up to `10`
- no negative results
- no multiplication or division
- this is the first mixed-arithmetic level
- distractors stay fairly friendly

### Hard

- addition and subtraction
- operands/results up to `20`
- allows carry / borrow style cases
- no negative results
- no multiplication or division
- distractors can sit closer to the right answer

### Super

- addition, subtraction, multiplication, and division
- multiplication/division stay small and child-friendly
- division uses clean integer results only
- no negatives in V1
- distractors are tighter than the lower levels

## Generation Notes

- addition and subtraction avoid `+0` and `-0`
- subtraction never produces a negative answer in V1
- multiplication and division appear only on `super`
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
