# Unified Icon Pack Production Plan

Target image directory: `C:\Users\alexm\games\games\words\data\emojis-new`

## Scope

- Total icons: 245
- Output format: one PNG per icon
- Canvas: 512x512
- Background: transparent
- Style: clean 2D cartoon for children, bold outline, soft shading, controlled bright color, no text, no glow, no background
- Naming convention: `category-english.png`
- Runtime manifest: `icon-pack-manifest.tsv`

## Compatibility Note

The current runtime already loads filename-based rows from the TSV:

- `game.js` builds image URLs from the TSV `filename` column.
- Source references:
  - `C:\Users\alexm\games\games\words\game.js:193`
  - `C:\Users\alexm\games\games\words\data\emojis-new\icon-pack-manifest.tsv:1`

Recommended production path:

1. Generate and review the art pack against `icon-pack-manifest.tsv`.
2. Keep filenames aligned with the TSV entries.
3. Update the TSV directly when adding or renaming icons.

## Master Prompt Template

Use this template for every icon:

`Create a single isolated cartoon icon for a children's educational game. Style: clean 2D vector-like cartoon, bold dark outline, soft shading, bright but controlled colors, friendly and simple, no text, no background, transparent background, centered object, consistent proportions, consistent lighting, no glow, no shadow outside the object, no extra decorations. Canvas: square 512x512. The icon must match a unified icon pack for a game UI. Object: [OBJECT NAME].`

Prompt substitution rules:

- Convert underscores to spaces for the object name.
- Use natural phrasing for special names:
  - `apple_red` -> `red apple`
  - `apple_green` -> `green apple`
  - `rain_drop` -> `rain drop`
  - `light_bulb` -> `light bulb`
  - `paint_palette` -> `paint palette`
  - `puzzle_piece` -> `puzzle piece`
  - `school_bag` -> `school bag`

## Pilot Batch For Style Lock

Generate these 16 icons first. They cover fur, feathers, scales, food, objects, vehicles, buildings, tall shapes, wide shapes, faces, and hard silhouettes.

| Filename | Object name | Why it belongs in pilot |
| --- | --- | --- |
| `animal-cat.png` | cat | Baseline mammal face and ear proportions |
| `animal-tiger.png` | tiger | Stripe handling and secondary pattern control |
| `animal-elephant.png` | elephant | Large rounded body and trunk silhouette |
| `animal-giraffe.png` | giraffe | Tall body and long-neck padding rules |
| `bird-owl.png` | owl | Front-facing bird readability |
| `reptile_amphibian_sea_insect-fish.png` | fish | Simple sea silhouette and fin treatment |
| `reptile_amphibian_sea_insect-butterfly.png` | butterfly | Bilateral symmetry and thin outline handling |
| `food_plant_kitchen-banana.png` | banana | Simple fruit curvature and highlight style |
| `food_plant_kitchen-pizza.png` | pizza | Composite food with toppings and edge discipline |
| `transport-automobile.png` | automobile | Baseline vehicle perspective |
| `transport-airplane.png` | airplane | Wing silhouette and center balance |
| `nature_weather-tree.png` | tree | Organic shape massing and foliage texture limits |
| `clothing-hat.png` | hat | Small apparel item with clear contour |
| `home_furniture_bathroom-chair.png` | chair | Furniture angle and leg readability |
| `school_play-pencil.png` | pencil | Thin object normalization and outline control |
| `places_city_objects-house.png` | house | Building language and perspective lock |

Pilot review gates:

- Approve outline thickness before batch 2.
- Approve how much soft shading is allowed before batch 2.
- Approve category-specific view rules before batch 2.
- Approve object occupancy and padding before batch 2.
- Approve how detailed faces can be before batch 2.

## Proposed Batch Generation Order

1. Pilot style lock, 16 icons
2. Core land animals, 24 icons
3. Extended land animals plus `additional_animals`, 24 icons
4. Birds, 14 icons
5. Reptiles, amphibians, sea animals, 16 icons
6. Insects and arthropods, 11 icons
7. Fruits, vegetables, mushrooms, plants, 20 icons
8. Prepared foods and desserts, 26 icons
9. Kitchen utensils and containers, 15 icons
10. Land transport, 12 icons
11. Water and air transport, 8 icons
12. Nature and weather, 13 icons
13. Clothing and wearables, 11 icons
14. Home, furniture, bathroom, 15 icons
15. School and play, 15 icons
16. Places, city objects, household tech, legacy items, 21 icons

Why this order works:

- Early batches maximize visual reuse, so style drift gets caught before expensive categories.
- Animals and food establish the pack personality first.
- Vehicles, furniture, and places come later because perspective conventions are easier to standardize after the pilot.
- Legacy items are late because they are fewer and can be adapted to the locked style.

## Normalization Rules

- Export every icon as a square `512x512` RGBA PNG in sRGB.
- Keep the object centered with optical correction no more than `12 px` on either axis.
- Use a transparent safe margin of `48 px` minimum and `64 px` preferred.
- Default object occupancy should fit inside a `384x384` visual box.
- Tall items may use `352x416`.
- Wide items may use `416x320`.
- Use a consistent outer outline target of about `12 px` at 512 canvas size.
- Internal contour lines should be about half the outer outline weight.
- Keep lighting consistent from upper left.
- Limit shading to one soft shadow family and one small highlight family.
- No cast shadow outside the object.
- No glow, halo, vignette, badge, sticker edge, or decorative sparkles.
- Use one object only per file.
- Avoid floating accessories unless they are structurally attached to the object.
- Keep silhouettes readable at `128x128` and still recognizable at `64x64`.
- Use the same camera logic within a family:
  - animals: mostly 3/4 view, facing right unless symmetry reads better front-on
  - birds: front or slight 3/4, whichever gives the clearest silhouette
  - vehicles: side or 3/4 side, facing right
  - tools and utensils: slight top-down 3/4
  - buildings: straight-on or mild 3/4 only
- Avoid micro-details smaller than about `8 px` at final size.
- Keep color count disciplined: one base palette, one shadow family, one accent family.
- Remove transparent edge noise and semi-transparent dust before final export.

## QA Checklist

- Filename matches the manifest exactly.
- PNG opens correctly and is exactly `512x512`.
- Background is fully transparent.
- There is only one isolated object.
- No text appears anywhere.
- No background shapes, borders, glows, or detached shadows appear.
- Outline weight matches the approved pilot set.
- Lighting direction matches the approved pilot set.
- Padding matches the approved pilot set.
- Perspective matches the category rule.
- Silhouette is readable at `128x128`.
- Icon is still recognizable at `64x64`.
- The object is not clipped.
- The object does not lean unintentionally.
- Fine details do not blur into noise.
- Alpha edges are clean on both light and dark UI backgrounds.
- Similar items remain distinguishable:
  - `cat` vs `tiger` vs `leopard`
  - `wolf` vs `fox`
  - `cup` vs `mug`
  - `apple` vs `apple_red` vs `apple_green`
  - `bus` vs `trolleybus`
  - `ship` vs `ferry` vs `sailboat`
- Each finished batch is reviewed in a contact sheet against the pilot icons before approval.

## Suggested Production Workflow

1. Generate the 16 pilot icons into `emojis-new`.
2. Review them together in a single contact sheet.
3. Freeze style decisions and update prompt wording only once.
4. Generate the remaining batches in the proposed order.
5. Run QA and normalization after each batch, not just at the end.
6. Update `icon-pack-manifest.tsv` alongside any new icons.
