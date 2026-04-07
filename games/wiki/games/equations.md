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

- presets: `easy`, `medium`, `hard`, `super`
- level goals:
  - `8 / 10 / 12 / 14` correct
  - `60s / 75s / 90s / 90s`
- difficulty preset selects a starting stage with `startStage`
- stage progression advances every `2` levels via `stageLevelStep`
- progression expands from simple addition to mixed operations with missing slots and division

## Falling Speed

- active runtime behavior currently uses the shared `~12s` fall duration noted in [[overview]]
- config still defines `baseSpeed: 78`, `speedIncPerLevel: 6`, and preset `speedMul` values `0.24 / 0.27 / 0.30 / 0.34`

## Useful Dev Notes

- equations is the richest arithmetic progression in the set
- stage config includes `missingSlots`, so prompt-generation changes can affect difficulty sharply
- reward tuning here is intentionally more generous than the standard games

Back to [[overview]].
