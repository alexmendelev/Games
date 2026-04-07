---
title: Clocks
---

# Clocks

`clocks` is the time-reading game built on the shared falling-question and side-panel layout.

## Shared Shell

- uses the common screen structure described in [[systems/layout-manager]]
- keeps the shared split between game area and side panel
- answers area: `FourLargeCards` with clock answer cards

## Scoring

- uses the shared session metrics and post-level bonus flow from [[overview]]
- special tablet rewards are `1 / 5 / 20` coins for silver / gold / diamond
- completion bonus follows the standard profile: `+1 / +2 / +4 / +8`

## Difficulty

- presets: `easy`, `medium`, `hard`, `super`
- level goals:
  - `8 / 10 / 12 / 14` correct
  - `60s / 75s / 90s / 90s`
- difficulty changes both the valid times and the clock face art:
  - `easy`: half-hours on numbered dial
  - `medium`: 5-minute steps on numbered dial
  - `hard`: 5-minute steps on dial without numbers
  - `super`: 5-minute steps on plain dial

## Falling Speed

- active runtime behavior currently uses the shared `~12s` fall duration noted in [[overview]]
- config still defines `baseSpeed: 92`, `speedIncPerLevel: 8`, and diff multipliers `0.24 / 0.36 / 0.48 / 0.60`

## Useful Dev Notes

- clocks difficulty is strongly tied to `minuteValues`, `minuteOffsets`, `hourOffsets`, and dial art
- visual readability matters here more than in the arithmetic games

Back to [[overview]].
