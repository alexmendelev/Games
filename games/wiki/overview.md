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
  - `multiply upTo5` maps to `hard`
  - `multiply upTo10` maps to `super`
  - `shapes` halves the completion bonus
  - `equations` increases the completion bonus by about `1.5x` with a minimum of `2`

### Difficulty

- Most games use `easy`, `medium`, `hard`, `super`.
- `multiply` uses `upTo5` and `upTo10`.
- Difficulty usually controls some mix of:
  - level target and timer
  - allowed content range
  - wrong-answer spread
  - answer count or answer layout density
  - special tablet odds and reward weighting

### Falling Speed

- Current runtime behavior: all six games call the shared shell with `speedForFallDuration(item, 12)`, so the active fall duration is effectively about `12s`.
- Important note for future work: config files still contain `baseSpeed`, `speedMul`, and `speedIncPerLevel` values, but those do not appear to be the active runtime path right now.

### Useful Dev Notes

- Shared session rules live in `shared/scripts/game-session.js`.
- Shared completion bonus and special tablet scaling live in `shared/scripts/game-shell.js`.
- Shared leaderboard / post-level coin bonus behavior lives in `shared/scripts/game-meta.js`.
- Answer area layout is the main per-game plug point.

## Game Notes

- [[games/math]]
- [[games/multiply]]
- [[games/words]]
- [[games/shapes]]
- [[games/clocks]]
- [[games/equations]]
