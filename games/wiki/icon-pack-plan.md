---
title: Unified Icon Pack Plan
---

# Unified Icon Pack Plan

## Goal

Replace the mixed emoji/custom pack in `words` with one unified custom PNG icon set.

- one icon per PNG
- transparent background
- `512x512`
- clean 2D cartoon style for children
- bold outline
- soft shading
- consistent padding, perspective, line weight
- no text
- no background
- no glow

Production note:

- current OpenAI image generation supports square output at `1024x1024`, so final assets should be normalized down to `512x512` after cleanup/export

## Canonical Files

- plan: `wiki/icon-pack-plan.md`
- manifest: `wiki/icon-pack-manifest.csv`
- target output folder: `words/data/emojis-new`

## Category Inventory

| category | existing | new | legacy | notes |
| --- | ---: | ---: | ---: | --- |
| animal | 45 | 0 | 0 | current pack |
| bird | 14 | 0 | 0 | current pack |
| reptile_amphibian_sea_insect | 27 | 0 | 0 | current pack |
| food_plant_kitchen | 46 | 0 | 0 | current pack |
| transport | 20 | 0 | 0 | current pack |
| legacy | 0 | 0 | 2 | `F8FF`, `E0C7` |
| nature_weather | 0 | 13 | 0 | new |
| clothing | 0 | 11 | 0 | new |
| home_furniture_bathroom | 0 | 15 | 0 | new |
| school_play | 0 | 15 | 0 | new |
| kitchen_household | 0 | 15 | 0 | new |
| places_city_objects | 0 | 19 | 0 | new |
| additional_animals | 0 | 3 | 0 | new |

## Naming Rules

- Preserve all current filenames exactly for existing assets.
- Preserve `F8FF.png` and `E0C7.png` as legacy markers until they are replaced or retired.
- For new assets, use the English slug plus `.png`.
- Keep English names as the canonical internal identifier.
- Keep Hebrew labels in the manifest as the display/source label.

Examples:

- existing: `1F412.png` -> `monkey`
- legacy: `F8FF.png` -> `apple`
- new: `traffic_light.png` -> `traffic_light`

## Pilot Batch For Style Lock

Recommended style-lock batch: `16` icons with mixed silhouettes and materials.

- monkey
- dog
- lion
- owl
- turtle
- fish
- butterfly
- mushroom
- banana
- pizza
- teapot
- train
- airplane
- tree
- shirt
- chair

Current first generation request:

- monkey
- gorilla
- orangutan
- dog
- poodle
- wolf
- fox
- cat
- lion
- tiger

## Batch Generation Order

1. Style-lock pilot batch
2. Existing core pack: `animal`
3. Existing core pack: `bird`
4. Existing core pack: `reptile_amphibian_sea_insect`
5. Existing core pack: `food_plant_kitchen`
6. Existing core pack: `transport`
7. Legacy review: `apple`, `cake`
8. New expansion: `nature_weather`
9. New expansion: `school_play`
10. New expansion: `home_furniture_bathroom`
11. New expansion: `clothing`
12. New expansion: `kitchen_household`
13. New expansion: `places_city_objects`
14. New expansion: `additional_animals`

Rationale:

- replace the currently used pack first
- lock style on living creatures, food, vehicles, and simple objects before broad expansion
- leave legacy custom entries visible as a cleanup checkpoint

## QA Checklist

- `512x512` PNG
- transparent background only
- one centered object only
- no text, badges, frames, or extra props
- no glow
- no drop shadow outside the silhouette
- bold outline matches pack line weight
- soft shading matches pack lighting direction
- object fills a similar visual area across icons
- padding is consistent and not too tight
- edges are clean with no white fringe or matte halo
- icon remains readable at small UI sizes such as `64px` and `96px`
- category and Hebrew label match the manifest
- filename exactly matches the manifest

## Normalization Rules

- Standard visible padding target: about `40-56px`
- Standard object coverage target: about `72-82%` of canvas height or width
- Default perspective: simple front, side, or slight three-quarter view only
- Default outline: bold dark outline with rounded joins and no sketch texture
- Default shading: `2-3` value steps, soft and simple, same light direction across the pack
- Default color handling: bright but controlled saturation, avoid neon
- Default export: transparent RGBA PNG, no embedded background, no extra metadata needs
- If the generator outputs `1024x1024`, resize to `512x512` only after alpha cleanup and silhouette review
- No icon should rely on a floor, platform, label, or glow to read clearly
- Keep eyes/faces friendly when the object naturally has a face
- Keep proportions slightly simplified for children, but not babyish or chibi unless the whole pack adopts it

## Master Prompt Template

> Create a single isolated cartoon icon for a children's educational game. Style: clean 2D vector-like cartoon, bold dark outline, soft shading, bright but controlled colors, friendly and simple, no text, no background, transparent background, centered object, consistent proportions, consistent lighting, no glow, no shadow outside the object, no extra decorations. Canvas: square 512x512. The icon must match a unified icon pack for a game UI. Object: [OBJECT NAME].

## Notes

- The canonical manifest is in `wiki/icon-pack-manifest.csv`.
- Existing rows keep the current codepoint filenames from `words/data/emoji-easy-oneword-he.js`.
- `F8FF` and `E0C7` are intentionally flagged as legacy custom entries.
