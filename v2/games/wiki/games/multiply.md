---
title: Multiply
---

# Multiply

`multiply` is the multiplication-focused game built on the shared falling-question shell.

## Shared Shell

- uses the common screen structure described in [[systems/layout-manager]]
- keeps the shared HUD, mascot area, and control layout
- answers area: `FourAnswerGrid`

## Scoring

- uses the shared session metrics and post-level bonus flow from [[overview]]
- special tablet rewards are `1 / 5 / 20` coins for silver / gold / diamond
- completion bonus now follows the standard shared profile directly:
  - `easy`: `+1`
  - `medium`: `+2`
  - `hard`: `+4`
  - `super`: `+8`

## Difficulty

- Multiply now uses `easy`, `medium`, `hard`, `super`
- there is no hidden stage system
- generated tasks depend only on the active difficulty
- the game stays multiplication-only in V1

### Easy

- factor range `1..4`
- wide and friendlier distractors

### Medium

- factor range `2..7`
- moderate distractors
- no `1×n` or `n×1`

### Hard

- factor range `2..10`
- tighter, more plausible distractors
- no `1×n` or `n×1`

### Super

- factor range `2..12`
- tight distractors
- generation can bias toward harder factors such as `6`, `7`, `8`, `9`, and `12`
- no `1×n` or `n×1`

## Level Goals

- `easy`: `8` correct in `60s`
- `medium`: `10` correct in `75s`
- `hard`: `12` correct in `90s`
- `super`: `14` correct in `90s`

## Useful Dev Notes

- difficulty profiles live in `multiply/config.js`
- task generation and distractor generation live in `multiply/game.js`
- a small legacy-key normalizer still maps old saved `upTo5` / `upTo10` values into the new model so existing local state does not break
- fast logic test: `npm run test:logic:multiply`
- focused browser test: `npm run test:e2e:multiply-difficulty`

Back to [[overview]].
