---
title: Shapes
---

# Shapes

`shapes` is the visual shape-and-color recognition game that reuses the shared shell, HUD, and orientation behavior.

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

- Shapes now uses explicit config-based V1 difficulty profiles only
- there is no hidden stage system and no level-number-based content growth
- the active difficulty alone determines:
  - answer count
  - allowed shape pool
  - allowed color pool
  - distractor similarity mix

- level goals:
  - `8 / 10 / 12 / 14` correct
  - `60s / 75s / 90s / 90s`

- `easy`
  - `4` answer choices
  - only the most basic shapes: `circle`, `square`, `triangle`, `diamond`
  - only basic colors: `red`, `blue`, `green`, `yellow`
  - distractors are pushed toward clearly distinct shape-color pairs

- `medium`
  - `8` answer choices
  - still uses the basic shape set
  - opens the full color set
  - distractors can share one feature with the target:
    - same shape, different color
    - same color, different shape

- `hard`
  - `12` answer choices
  - opens the full shape and color set, including `star` and `heart`
  - distractors can be clearly closer:
    - same shape with a nearby color
    - related shape with the same color
    - related shape or related color competitors

- `super`
  - `16` answer choices
  - uses the full shape and color set
  - packs the densest grid with the closest visual competitors
  - favors multiple near-match distractor tiers before falling back to distinct items

## Falling Speed

- active runtime behavior still uses the shared `~12s` fall duration noted in [[overview]]
- config still defines `baseSpeed: 90` and `speedIncPerLevel: 7`, but Shapes currently uses the shared fall-duration helper at runtime

## Useful Dev Notes

- the difficulty profiles live in `shapes/config.js`
- target pairs and distractors are generated from explicit shape and color pools in `shapes/game.js`
- similarity tiers use config-defined shape-neighbor and color-neighbor maps
- focused logic check: `npm run test:logic:shapes`
- focused browser check: `npm run test:e2e:shapes-difficulty`
- this is still the most answer-dense game in the set
- shapes also carries extra visual assets such as spray overlays by color
- reward balancing for repeated shapes sessions is intentionally conservative

Back to [[overview]].
