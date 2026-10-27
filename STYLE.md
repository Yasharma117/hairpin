# Hairpin style

The source of truth for how Hairpin looks. When something here and something in the code disagree, the code is wrong.

## The rule

**The edge painting is the house style**: `08-edge-scene/edge-lit.jpg` and `edge-dark.jpg`. It's hand-painted anime matte background art: soft, clean painterly shading, fine brushwork, simplified readable shapes, and atmospheric haze for depth.

- Never photographic texture.
- Never thick impasto or gouache blocks.

Every painting, figure and UI element is judged against that pair.

## Palette

Every colour lives in `shared/style.js`; nothing else in the code may contain a colour literal (`tools/check_style.py` fails on one). The house tokens, sampled from the edge pair:

| Token | Hex | Where it comes from |
|---|---|---|
| night | `#07172d` | the deep sky at the top of edge-dark |
| sky | `#091c37` | night sky |
| ridge | `#193056` | far ridges at night |
| cloud | `#5a7398` | the cloud sea, moonlit blue-grey |
| rock | `#131f32` | rock in shadow |
| teal | `#223a43` | night grass |
| tealLight | `#2f4b56` | night grass highlights |
| amber | `#f7c46b` | headlight on cloud: the warm key |
| gold | `#d89a30` | headlight on grass |
| warmRock | `#bc7a38` | headlight on rock |
| ember | `#ff7f29` | the cigarette |
| paper | `#efe6cf` | UI paper |
| ink | `#141826` | UI ink, and the line on things that move |
| red | `#c8402f` | UI accent |
| mist | `#aab0cc` | quiet UI text on navy |

Object colours (the taxi's parts, placeholder figures, the Shillong placeholder) also live in `style.js`, as named sets. Shaders get the palette as `GLSL_PALETTE` (`C_NIGHT`, `C_AMBER` and so on). The UI gets it as CSS variables (`--night`, `--paper` and so on), set by `applyCSS()`.

## Light

- **Ambient** is cool navy.
- **The key light** is warm amber, and only ever comes from a real source: headlights, street lamps, the stall bulb, the lanterns, the ember, the city.
- **Nothing glows without a source.**
- **The reveal** of the lit painting follows those sources along the brush strokes (the stroke map).

## Line

- A thin, clean dark line (`ink`) goes on things that move: the taxi, people, animals, the truck.
- Never on backgrounds.
- **The ghost is the one exception:** line only, no fill.

## Texture

One shared paper grain goes on the final frame, at the same strength in every scene. It lives in the final pass in `shared/kit.js` (`Ink`).

## Grade

Every scene goes through one final pass. It applies a per-scene grade (lift, gamma and gain per channel, plus saturation) fitted so the scene's lit and dark paintings sit close to edge-lit and edge-dark, then adds the paper grain.

- The fitted values live in `shared/grade.js`, written by `tools/fit_grade.py`.
- `tools/check_style.py` compares every painting's statistics to the edge pair, after the grade, and fails on outliers.

## Depth and camera

Every painting is 2.5D, which is what shows this is real-time 3D and not an illustration with effects.

- **Depth maps:** each scene has a depth map, `<scene>/depth.png` (near = white), from `tools/make_depth.py`, which uses Depth Anything V2 small and falls back to hand layers.
- **The mesh:** the painting is a subdivided mesh, pushed toward the camera along each pixel's own sight line. From the rest pose it is pixel-identical to the flat painting. Moving the camera makes the depth show.
- **Grounding:** everything that moves is placed by the depth at its feet, so it stays planted.
- **Moves are eased and slow, and gentler with reduced motion:**

| Scene | Move |
|---|---|
| The stand | A slow push-in over the first 8 s. |
| The dashboard | The engine's idle shifts the dash against the road, just. |
| The climb | A lateral drift that follows the taxi. |
| Nongpoh | A lateral drift that follows the taxi. |
| The cloud line | A creep up the road behind the taxi. |
| The edge | As the taxi tips, it leans in toward the drop. When the doors open, it pulls back to show the cloud below. It holds still for the story, then tilts down after the fall. |
| Shillong | A slow rise from the road to the city while the quote sets. |

- **Limits:** keep camera moves small enough that no edge visibly stretches. If a scene needs more, split it into masked layers.
- **The viewer steers the light** at the stand and the edge: the pointer (a finger drag on phones) swings the headlights within a fixed arc. Left alone, the beam drifts back to its scripted aim.

## UI

- Torn-paper labels.
- Archivo for words, IBM Plex Mono for labels.
- Cream (`paper`) on navy (`night`).
- Nothing else.

## Framing

The trailer is vertical, so every key frame has to work in portrait 9:16 as well. Each scene marks a portrait safe area, a band across the painting, and keeps its subject inside it.

| Scene | Subject | Portrait safe band (fraction of the painting's width) |
|---|---|---|
| The stand | the stall, the bench, the lamp post, the crowd | 0.08 – 0.39 |
| Jorabat (dashboard) | the dash objects, the road ahead | 0.34 – 0.66 |
| The climb | the taxi (the camera follows it) | the taxi ± 0.16 |
| Nongpoh | the taxi (the camera follows it) | the taxi ± 0.16 |
| The cloud line | the road into the cloud | 0.42 – 0.74 |
| The edge | the hanging taxi, the lip, the figures | 0.34 – 0.66 |
| Shillong | the pair at the railing, the star | 0.38 – 0.72 (the truck sits outside it in portrait, as a known gap) |

## Asset rules

- The lit painting comes first. The dark version is a repaint of it: same framing, same brush strokes, pixel-aligned.
- Frame 2 of anything is an edit of frame 1, never a fresh generation.
- Every image is generated with `edge-lit.jpg` attached as the style reference.
- Originals go in `source-art/` (or a scene's `source/`). Processed versions sit next to the scene.

## Checks before every push

1. `tools/check_style.py`: colour statistics against the edge pair, and the colour-literal lint.
2. `tools/contact_sheet.py`: every scene's key frames in landscape and 9:16, beside edge-lit, saved to `reviews/style-<date>.png`. Look at it.
3. The frame rate on phones must not get worse.
