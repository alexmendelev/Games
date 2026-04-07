---
title: Shapes
---

# Shapes

`shapes` is the shape-recognition game that reuses the same shared shell and orientation behavior.

## Shared Shell

- uses the common screen structure described in [[systems/layout-manager]]
- keeps the same game area, HUD, mascot, and controls as the other games
- answers area: `DenseOptionGrid`

## Scoring

- uses the shared session metrics and post-level bonus flow from [[overview]]
- special tablet rewards start at `1 / 5 / 20` coins for silver / gold / diamond
- shapes has shared reward exceptions:
  - completion bonus is reduced compared with the standard profile
  - special reward chance and payout are reduced further during long shapes streaks

## Difficulty

- presets: `easy`, `medium`, `hard`, `super`
- level goals:
  - `8 / 10 / 12 / 14` correct
  - `60s / 75s / 90s / 90s`
- answer density changes heavily by difficulty:
  - `4 / 8 / 12 / 16` active answers

## Falling Speed

- active runtime behavior currently uses the shared `~12s` fall duration noted in [[overview]]
- config still defines `baseSpeed: 90`, `speedIncPerLevel: 7`, and diff multipliers `0.22 / 0.38 / 0.48 / 0.60`

## Useful Dev Notes

- this is the most answer-dense game in the set
- shapes also carries extra visual assets such as spray overlays by color
- reward balancing for repeated shapes sessions is intentionally conservative

Back to [[overview]].
