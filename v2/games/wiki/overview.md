---
title: Project Overview
---

# Overview

This wiki is a lightweight reference for the shared structure of the educational games and the small per-game differences that matter during maintenance.

## Current Games

- `math`
- `multiply`
- `words`
- `shapes`
- `clocks`
- `equations`

## Shared Shape

All games follow the same core screen pattern:

- left side, or top in portrait: game area with falling questions and a mascot
- right side, or bottom in portrait: HUD, answers, and control buttons

The main per-game variation is the answers area. See [[systems/layout-manager]].

## Shared Rules

### Scoring

- During a level, the session tracks `correct`, `wrong`, `missed`, `accuracy`, `bestStreak`, and `coinsEarned`.
- Coin gain during play comes from special tablet rewards; games add those coins one at a time to the session.
- After a level, the meta layer adds a difficulty-based completion bonus to the player coin total.
- Shared completion bonus profile:
  - `easy`: `+1`
  - `medium`: `+2`
  - `hard`: `+4`
  - `super`: `+8`
- Current exceptions:
  - `shapes` halves the completion bonus
  - `equations` increases the completion bonus by about `1.5x` with a minimum of `2`

### Difficulty

- Most games use `easy`, `medium`, `hard`, `super`.
- Difficulty usually controls some mix of:
  - level target and timer
  - allowed content range
  - wrong-answer spread
  - answer count or answer layout density
  - special tablet odds and reward weighting
- Parent bounds now live per game as `minDifficulty` and `maxDifficulty`, and the active game difficulty is clamped inside those bounds.
- Shared adaptive difficulty now lives in `shared/scripts/difficulty-manager.js`. It only adapts between levels, never during a level. See [[systems/adaptive-difficulty]].
- `math`, `multiply`, `equations`, `words`, `shapes`, and `clocks` now use explicit config-based V1 profiles with no hidden stage ladder and no level-number-based content growth.

### Shared Level Metrics

- The shared session now records per-level `passed`, `avgAnswerMs`, `wrongClicks`, `correct`, `correctTarget`, `elapsedMs`, `questionTimeLimitMs`, and `endedBy`.
- The adaptive difficulty manager uses these values after each level:
  - `passed`
  - `avgAnswerMs / questionTimeLimitMs`
  - `wrongClicks / max(correctCount, 1)`
- Shared classification rules:
  - `comfortable`: passed, fast answers, and low misclicks
  - `balanced`: neither clearly comfortable nor clearly struggling
  - `struggling`: failed level, slow answers, or high misclicks

### Debug And Simulation

- Every completed level now emits a structured JSON adaptive-difficulty debug event from the shared meta layer.
- Browser debug modes:
  - `?difficultyDebug=console`
  - `?difficultyDebug=overlay`
  - `?difficultyDebug=all`
- Shared simulation runner:
  - `npm run simulate:difficulty`
  - `node scripts/run-difficulty-sim.js --profile average --seed 11 --levels 16`

### Test Commands

- Fast logic check: `npm run test:logic`
- Clocks logic check: `npm run test:logic:clocks`
- Equations logic check: `npm run test:logic:equations`
- Multiply logic check: `npm run test:logic:multiply`
- Shapes logic check: `npm run test:logic:shapes`
- Words logic check: `npm run test:logic:words`
- Focused Clocks browser check: `npm run test:e2e:clocks-difficulty`
- Focused Equations browser check: `npm run test:e2e:equations-difficulty`
- Focused Math browser check: `npm run test:e2e:math-difficulty`
- Focused Multiply browser check: `npm run test:e2e:multiply-difficulty`
- Focused Shapes browser check: `npm run test:e2e:shapes-difficulty`
- Focused Words browser check: `npm run test:e2e:words-difficulty`

### Falling Speed

- Current runtime behavior: all six games call the shared shell with `speedForFallDuration(item, 12)`, so the active fall duration is effectively about `12s`.
- Important note for future work: config files still contain `baseSpeed`, `speedMul`, and `speedIncPerLevel` values, but those do not appear to be the active runtime path right now.

### Useful Dev Notes

- Shared session rules live in `shared/scripts/game-session.js`.
- Shared completion bonus and special tablet scaling live in `shared/scripts/game-shell.js`.
- Shared leaderboard / post-level coin bonus behavior lives in `shared/scripts/game-meta.js`.
- Shared adaptive transitions, debug logging helpers, and simulation profiles live in `shared/scripts/difficulty-manager.js`.
- Answer area layout is the main per-game plug point.

## Game Notes

- [[games/math]]
- [[games/multiply]]
- [[games/words]]
- [[games/shapes]]
- [[games/clocks]]
- [[games/equations]]
