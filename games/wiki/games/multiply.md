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
- completion bonus maps through shared aliases:
  - `upTo5` -> `hard` -> `+4`
  - `upTo10` -> `super` -> `+8`

## Difficulty

- diffs: `upTo5`, `upTo10`
- level goals:
  - `upTo5`: `10` correct in `60s`
  - `upTo10`: `12` correct in `75s`
- factor ranges:
  - `upTo5`: factors `1..5`
  - `upTo10`: factors `1..10`
- wrong-answer spread widens at `upTo10`

## Falling Speed

- active runtime behavior currently uses the shared `~12s` fall duration noted in [[overview]]
- config still defines `baseSpeed: 80`, `speedIncPerLevel: 6`, and diff multipliers `0.24 / 0.28`

## Useful Dev Notes

- this game is simpler than `math`; it uses fixed multiplication ranges instead of stage progression
- if future work adds more multiplication tiers, update alias-based completion bonus notes too

Back to [[overview]].
