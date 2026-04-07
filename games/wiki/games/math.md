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
- difficulty preset selects a starting progression stage with `startStage`
- stage progression advances every `2` levels via `stageLevelStep`
- content progression expands from addition to subtraction, multiplication, and division

## Falling Speed

- active runtime behavior currently uses the shared `~12s` fall duration noted in [[overview]]
- config still defines `baseSpeed: 80`, `speedIncPerLevel: 6`, and preset `speedMul` values `0.24 / 0.27 / 0.30 / 0.34`

## Useful Dev Notes

- progression is stage-based, not just difficulty-label based
- wrong-answer spread increases by stage via `wrongNear` and `wrongFar`
- this page should be updated if stage stepping or operator unlock rules change

Back to [[overview]].
