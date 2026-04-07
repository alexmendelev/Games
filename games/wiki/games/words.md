---
title: Words
---

# Words

`words` is the word-recognition game built on the same falling-question shell.

## Shared Shell

- uses the common screen structure described in [[systems/layout-manager]]
- keeps the same game area, mascot, HUD, and controls as the other games
- answers area: `FourLargeCards` with image content

## Scoring

- uses the shared session metrics and post-level bonus flow from [[overview]]
- special tablet rewards are `1 / 5 / 20` coins for silver / gold / diamond
- completion bonus follows the standard profile: `+1 / +2 / +4 / +8`

## Difficulty

- presets: `easy`, `medium`, `hard`, `super`
- level goals:
  - `8 / 10 / 12 / 14` correct
  - `60s / 75s / 90s / 90s`
- difficulty mainly changes allowed word length:
  - `easy`: up to `4` letters
  - `medium`: up to `5`
  - `hard`: up to `6`
  - `super`: no max
- the game also steps upward internally every `6` correct answers via `correctPerDiffStep`

## Falling Speed

- active runtime behavior currently uses the shared `~12s` fall duration noted in [[overview]]
- config still defines `baseSpeed: 96`, `speedIncPerLevel: 8`, and diff multipliers `0.36 / 0.42 / 0.48 / 0.56`

## Useful Dev Notes

- words has an internal difficulty ladder on top of the selected preset
- emoji data and fallback handling are important maintenance points
- answer-content work here is more data-driven than the arithmetic games

Back to [[overview]].
