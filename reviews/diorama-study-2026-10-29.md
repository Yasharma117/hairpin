# Diorama study, 2026-10-29

Reference: github.com/sloemo01/diorama (SKILL.md v3.8, templates/, qa/). Files: `/Volumes/HOARDE/hairpin-work/archive/diorama-ref/`,
`/Volumes/HOARDE/hairpin-work/captures/diorama-study/` (`side.jpg`: our stand, our edge pair, pocket's Divya, same scale).

## 1. What the kit is

A 160 KB playbook plus copy-in three.js modules for **tiny isometric scenes on a slab against white paper**.

- **Locked camera, solved not typed.** Az 45, elev 33, fov 20.5. Distance bisected until the fit points (slab corners,
  landmark tops) sit inside `fillX/fillY`. No orbiting.
- **Post pass (post.js):** render at **1 buffer px per CSS px** (1.25–2x for small subjects or faces), then gamma,
  grade (sat 1.07, contrast 1.028) *before* the palette snap, a luminance-edge ink line, Bayer dither **gated by edge contrast**,
  and a 64-colour snap with near-ties broken toward the lighter colour (no speckle on flat floors). Their rule: the pixel look comes from the snap and the ink, not a low buffer.
- **Toy-scale 3D cast (peopleModel.js, poses.js):** a primitive-built rig (lathes, capsules, joint fillers,
  skull/jaw head, clothing as geometry). Absolute pose tables. The walk phase is driven by distance, so feet don't skate.
- **Bars, not moods.** Detail Bar: silhouette, construction (5+ assemblies), one story detail, a contact shadow,
  nothing under 1.5 px. Animation Bar: idle, locomotion, action, reaction and exit, plus lagged secondary motion. Night:
  three distinct dark values, practicals are modelled fixtures with pools.
- **Everything is a pure function of `t`**, so `freeze(t)` is exact. `qa/frames.mjs` isolates each actor, records a frame
  series and gives it a verdict (FROZEN/TELEPORT/EMPTY/OFFSCREEN) with a contact sheet.
- **Workflow:** research from video frames, a design sheet, a grey blockout, then palette → light → post → props → cast
  → detail → animation → FX → QA.

**Licence:** MIT, © 2026 Nehal Kanak. Copying code is allowed if we keep the copyright and permission notice in each copied
file. It targets three.js r170 (we're on 0.160): expect small porting edits. Reimplementing ideas needs no notice.
Don't use their media.

**The caveat:** this kit is not pocket.design's look. It makes daylight iso miniatures with 30–45 px people. Take its
method, not its look.

## 2. Hairpin vs pocket.design, concretely

| | pocket.design | Hairpin (hires2 sheet) | Why ours reads lower |
|---|---|---|---|
| **People** | ~135 px tall at 1280, art pixel ≈ 1–2 screen px: strands, buttons, rings, a readable face | near 64 grid px (x2 = 128 screen px). Heads boxy; seated pair = two hair-blobs; far 39 px muddy | Up to 4x fewer pixels per person; back views carry no features; small in frame |
| **Camera** | Close interior; people are the subject | Wide landscapes; people ~1/10 of frame height, the climb walker a speck | No minimum-size rule; framing hand-tuned |
| **Light/value** | Daylight, high key, warm | Navy night; people and taxi in the darkest third | Under three readable dark values; only the rim lifts people |
| **Palette** | Many colours, warm | ~32 per scene | Starves people and props. Kuwahara flattens painting detail |
| **Detail density** | An object every ~40 px: plants, rugs, plates, a pet | Paintings rich; taxi and truck are blockouts | 3D heroes fail the Detail Bar |
| **Motion** | Idle bob, pet reacts, characters wander | 2-frame idle; 0.75 s walk-outs; walker jumps; umbrella hovers | No secondary motion or glances; defects found only by eye |
| **UI** | Name tags on characters | Good RPG box and buttons | Comparable. Add name tags over people |

Our strengths stay: Nongpoh's wet road, the sepia flashback, Shillong's beam and blossoms, the customiser.

## 3. Techniques worth adopting (ranked by impact / effort)

1. **Make people read: a framing rule plus bigger near figures** (high impact, low–medium effort). Borrow the solved
   camera: each talking beat lists fit points (the people's boxes) and `Stage.view` solves the zoom so the speaker is at
   least ~18% of frame height. Push the near sprite to ~96 grid px for dialogue beats (a "close" size in folk.js, same
   slots and API). Replaces the hand-tuned `ppx`/`view` numbers in 08, 09 and 13.
2. **Deterministic time plus per-entity frame QA** (high, medium). Add `window.__hairpin.freeze(t)`: scenes drive
   motion from beat tables read at `t`, not from `dt` integration. 19 `Math.random` calls need a seeded hash. Then write a ~100-line `tools/frames.mjs` on top of shot.mjs's CDP (Browser.close, JPEG) that crops each person and
   vehicle over a window and reports frozen/teleport/offscreen. It would have caught the short walk-outs, the walker's jump
   and the floating umbrella. Reimplement it rather than copy, because theirs needs playwright.
3. **Detail Bar on the 3D hero objects** (medium-high, medium). `makeTaxi`/`makeTruck` in kit.js: chamfered body, door
   seams, mirrors, number plate, hub caps, lens plus cone plus floor ellipse for each headlight, a TAXI roof sign, and one
   story detail (a dent, a garland, the dashboard idol). Their `detail.js` helpers can be copied under MIT.
4. **Night rig rules** (medium, low). Three dark values per palette (`fit_palette.py` asserts it). People get a cool
   key from the scene, not just the rim. Every practical (stall bulb, streetlamp, town) is a fixture with a pool.
   `setLight` levels for people at night are about 1.1–1.3.
5. **Palette tie-break and grade before the snap** (low–medium, low). In Ink's FRAG: when `d2-d1` is tiny, take the
   lighter entry, so flat surfaces don't flicker. Apply sat/contrast before the Oklab match, which we already mostly do.
6. **Secondary motion and glances for folk** (medium, medium). Muffler/shawl/hair 1–2 px alternates on a lagged sine,
   per-person phase hash, a head-turn frame toward the speaker. 
7. **3D toy-scale cast rendered into the grid** (uncertain, high). Render peopleModel-style rigs into a small offscreen
   target per figure, snap them to a people palette, and pass them to Ink as layer 3. Gains: free turns, sits, car exits and
   scene lighting. Risks: at 64–96 px, primitive faces read as figurines, not chibi drawings, and it adds a second art
   style. Use it only for **far figures and complex actions** (the
   climb walker, getting out of the taxi). Keep folk.js for faces, the customiser and avatars. Spike first.
8. **Design sheet per scene** (low, low). Their cast table (locomotion, action, reaction, exit, prop) in each scene's
   header.

Don't adopt: the 45/33 iso camera, the white-paper slab, "empty paper" (no HUD), their 64-colour palette.

## 4. Plan

**Phase A, the read (1 session).** Items 1, 4 and 5. Framing solve per dialogue beat. Folk "close" size for the
edge-seated, Shillong and stand beats. Night value rules plus a palette refit. Tie-break in Ink. Contact sheet against
pocket.design at the same crop (`side.jpg` method).

**Phase B, proof and life (1–2 sessions).** Item 2 (`freeze(t)`, seeded randomness, `tools/frames.mjs`), then use it to
fix every flagged entity. Item 6 (secondary motion, glances). Item 3 (taxi/truck detail pass).

**Phase C, the 3D cast spike (go/no-go).** Item 7 for the climb walker and the edge's door exit, A/B against folk.
Adopt it only if Yash prefers it.
