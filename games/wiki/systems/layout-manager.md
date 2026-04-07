---
title: Layout Manager
---

# Layout Manager

The games share one layout concept:

- game area on the left in landscape, or on top in portrait
- side panel on the right in landscape, or on bottom in portrait
- side panel contains the HUD, answers area, and control buttons

This shared layout keeps each game consistent across orientations and screen sizes.

## Main Exception

The answers area is the main pluggable part of the system.

- the overall frame stays the same
- each game can swap in a different answers layout
- this is the main gameplay-facing variation between titles

## Shared Structure

- game area: falling question plus mascot
- side panel: HUD, answers area, control buttons
- portrait mode keeps the same parts but stacks game area above side panel

## Active Timing Note

- The current games all use the shared shell's `speedForFallDuration(item, 12)` path.
- In practice this means fall timing is currently standardized across games.
- Per-game config speed knobs still exist, so if a future refactor reactivates them this page should be updated.

## Why This Matters

- layout work should usually stay shared
- answers-area work is the main place where per-game customization belongs
- gameplay tuning should be checked against both config files and live runtime behavior

Related pages:

- [[overview]]
- [[games/math]]
- [[games/multiply]]
- [[games/words]]
- [[games/shapes]]
- [[games/clocks]]
- [[games/equations]]
