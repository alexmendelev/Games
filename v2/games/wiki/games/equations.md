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
  - operands `[1–5] + [1–5]`, results up to `10`
  - no zero operands
  - missing slot: left, right, or result — all equally likely
  - no subtraction, multiplication, division, or negatives
- `medium`
  - addition and subtraction
  - addition: `[1–10] + [1–10]`, results up to `20`
  - subtraction: `[2–20] − [1–10]`, results up to `20`
  - no zero operands
  - missing slot: left, right, or result — all equally likely
  - no multiplication, division, or negatives
- `hard`
  - addition and subtraction, two-digit arithmetic
  - addition: `[10–49] + [10–49]`, results up to `98`
  - subtraction: `[20–79] − [10–49]`
  - no zero operands
  - missing slot: left or right (80%), result (20%) — weighted via `["left","right","left","right","result"]`
  - carrying and borrowing are common at this range
  - no multiplication, division, or negatives
- `super`
  - addition, subtraction, multiplication, and division
  - addition: `[25–75] + [15–75]`, results up to `99`
  - subtraction: `[30–99] − [11–79]`
  - multiplication: `[2–9] × [2–9]`, results up to `81`
  - division: divisor `[2–9]`, quotient `[1–9]` (always clean integer)
  - missing slot: always left or right — never result
  - no negatives

## Falling Speed

- active runtime behavior currently uses the shared `~12s` fall duration noted in [[overview]]
- config still defines `baseSpeed: 78` and `speedIncPerLevel: 6`, but those are not the active runtime path right now

## Tile Sizing

- tile width is wider than other games (`tileWBase: 430`, `widthRatio: 0.72`) to accommodate two-digit equations such as `? + 30 = 51`
- font is capped at `46px` with a `0.14` scale factor to keep three-token expressions readable

## Useful Dev Notes

- Equations is now profile-driven like Math and Multiply
- missing-slot rules are defined directly in config per difficulty as a weighted array — repeating a slot name increases its probability
- reward tuning here is intentionally more generous than the standard games

## Test Commands

- fast logic check: `npm run test:logic:equations`
- focused browser check: `npm run test:e2e:equations-difficulty`

Back to [[overview]].
