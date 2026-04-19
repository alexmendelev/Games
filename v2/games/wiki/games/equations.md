---
title: Equations
---

# Equations

`equations` is the equation-solving game that reuses the shared shell and orientation behavior.

## Shared Shell

- uses the common screen structure described in [[systems/layout-manager]]
- keeps the same shared split between game area and side panel
- answers area: `FourAnswerGrid`

## Scoring

- uses the shared session metrics and post-level bonus flow from [[overview]]
- special tablet rewards are higher than the standard set:
  - silver: `2`
  - gold: `8`
  - diamond: `24`
- completion bonus is also boosted compared with the standard profile

## Difficulty

- levels: `easy`, `medium`, `hard`, `super`
- level goals:
  - `8 / 10 / 12 / 14` correct
  - `60s / 75s / 90s / 90s`
- Equations now uses explicit config-based difficulty profiles only
- there is no hidden stage system and no level-number-based content growth
- active difficulty alone determines operations, ranges, missing slots, and distractor spread

### V1 Profiles

- `easy`
  - addition only
  - operands up to `5`
  - no zero operands
  - missing slot: result only
  - no subtraction, multiplication, division, or negatives
- `medium`
  - addition and subtraction
  - numbers and results up to `10`
  - no zero operands
  - missing slot: left, right, or result
  - no multiplication, division, or negatives
- `hard`
  - addition and subtraction
  - numbers and results up to `20`
  - no zero operands
  - missing slot: left, right, or result
  - includes normal carry / borrow style cases
  - no multiplication, division, or negatives
- `super`
  - addition, subtraction, simple multiplication, and simple division
  - division uses clean integer answers only
  - no zero operands
  - missing slot: left, right, or result
  - no negatives in V1

## Falling Speed

- active runtime behavior currently uses the shared `~12s` fall duration noted in [[overview]]
- config still defines `baseSpeed: 78` and `speedIncPerLevel: 6`, but those are not the active runtime path right now

## Useful Dev Notes

- Equations is now profile-driven like Math and Multiply
- missing-slot rules are defined directly in config per difficulty
- reward tuning here is intentionally more generous than the standard games

## Test Commands

- fast logic check: `npm run test:logic:equations`
- focused browser check: `npm run test:e2e:equations-difficulty`

Back to [[overview]].
