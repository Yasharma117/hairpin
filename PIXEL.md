# Hairpin, pixel: the art direction for the rebuild

Hairpin is being rebuilt in the visual language of pocket.design (Pocket FM Design's own site: a cosy top-down pixel-art
studio, chibi pixel people, cream paper UI, a serif for words and VT323 for labels). The audience is that team. The bar is
higher finish than their own site. This file is the contract every part of the rebuild follows; STYLE.md still holds for
anything this file doesn't change.

## 1. One pixel grid for everything

- The whole frame renders at a **low internal resolution** and is scaled up with **nearest-neighbour**. Everything in the
  3D scene (paintings, taxi, truck, blossom, petals, figures) lands on the same pixel grid. The DOM UI does not.
- **Pixel size:** an integer screen-pixel scale chosen so the frame is about **270 px tall** in landscape
  (`scale = max(2, round(canvasHeightInDevicePx / 270))`), about 300 tall in portrait. Never a fractional scale.
- **Palette:** the final pass quantizes to a fixed palette per scene (about 32 colours, from the scene's lit and dark
  paintings plus the shared UI and people ramps), in a perceptual space, with **4x4 ordered (Bayer) dithering at low
  strength** only in gradients (sky, beams, haze). Palettes live in `shared/style.js`, like every colour.
- **No sub-pixel shimmer:** the camera is snapped to the pixel grid on the painting plane; the leftover fraction is applied
  as an offset when upscaling, so slow camera moves stay smooth.
- **Outlines:** things that move (taxi, truck, people, animals) get a 1 px dark outline (`ink`, or a darkened local colour
  for selective outlining). No boiling line: pixel art is stable. No paper grain. A very soft vignette at most.
- **Light still works:** the headlights reveal the lit painting over the dark one exactly as before; it now happens per
  pixel and through the palette, which gives the stepped, dithered light pools pixel games have.

## 2. People: chibi pixel sprites, in pocket.design's spirit, drawn by us

- Their style, our sprites. **Never copy pocket.design's assets.**
- Proportions: about **2.5 heads tall**, big head, small body, 1 px outline, 3-tone ramps (shadow, base, light) for skin,
  hair and each garment, highlight pixels on hair. Two sizes, never scaled:
  - **near**, about 44 px tall standing (the stand, Shillong, the customiser preview)
  - **far**, about 26 px tall standing (the climb's walker and basket woman, the edge)
- Views: front, three-quarter facing left and right (mirrored), and **back** (the edge and Shillong, sitting, from behind).
- **Animation is drawn frames, never sliding:**
  - idle: 2 frames, breathing, about 1.2 s loop, with a blink
  - walk: 4 frames at about 8 fps, feet planted (the sprite moves by its stride per frame)
  - sit down: 3 frames; sitting idle: 2 frames (a slow sway of the head)
  - wave: 2 frames; turn: a 1-frame three-quarter between views
- **Lighting:** sprites are indexed (palette slots), and the shader picks each slot's colour from a lit or a dark ramp by
  how much light reaches them (the beam, the stall bulb, the town), quantized to the ramp's steps. A 1 px darker
  rim on the side away from the light. A pixel ellipse shadow under the feet.
- **Customising** is palette swaps and same-grid overlays: build (woman, man), skin (5 ramps), hair (short, long, bun,
  curly, cap), top (tee, hoodie, kurta, denim, shawl), extra (none, headphones, glasses, muffler). Every combination is
  correct by construction.
- **You (Yash), fixed:** short black hair, short beard, dark olive zip jacket over a cream tee, a red-brown checked
  muffler, blue jeans, grey sneakers.
- **The grandfather and his friend** (the flashback): 1970s, the grandfather in a white half-sleeve shirt and grey
  trousers, the friend in a sleeveless sweater. **Him in ink** (the ghost) stays line only: 1 px cream line, no fill,
  the ember a 1 to 2 px warm pixel that swells.

## 3. UI: pocket.design's idiom, made our own

- **Colours:** cream panel `#fff9e5`, warm ink `#3a2a1c`, signal red `#fd1500` (accents, the "next" arrow), wood
  `#dfac76`, olive `#3d422b`, rust `#a84323`. Night scenes keep the navy world; the UI is the warm cream on top of it.
- **Type:** a serif for dialogue and headings (Google Fonts: `Young Serif` for display, warm and chunky like their headings; `Newsreader` for dialogue),
  **VT323** for every label, tag and button (uppercase, letter-spaced), a plain sans only where body text is long.
- **Dialogue** is an RPG box: cream, 2 px warm-ink border, hard 4 px offset shadow, the speaker on a small tab above the
  left corner (VT323, red), the line in the serif, typed out character by character with a soft tick, and a blinking red
  `▼` when the line is complete. The box is sized once for the full line (no reflow while typing).
- **Buttons** are cream with a 2 px ink border and a hard shadow, VT323 uppercase; pressed = shadow 0 and moved 2 px.
  The main advance button is the same with a red `▶`. No rounded corners anywhere except the avatar heads.
- **Motion:** UI steps in whole pixels and short durations (120 to 200 ms), `steps()` easing where it reads as pixel.

## 4. What else the rebuild fixes (from the feel review of 2026-10-27, reviews/feel-review-2026-10-27.md)

- Sound: the bed inaudible on phones, crickets never gate, "Turn the engine off" silent, the fall has no shape, the engine
  ignores hold.
- Phones: the dashboard tap leaves the scene, no horn on touch, the wish prompt nearly invisible.
- Story timing: the flashback picture lands 4 s before its line (`T.thenIn` 16 to 22 should be about 25 to 28).
- Motion: the outgoing scene freezes during the tear; camera moves start at full speed (`Stage.update` should be a
  critically damped spring).

## 5. Rules for every agent

- Read this file, STYLE.md and README.md first. Colours only in `shared/style.js` (`tools/check_style.py` fails otherwise).
- Edit only the files your brief gives you. If you need a change in someone else's file, say so in your report.
- Check your work by rendering it: `tools/shot.mjs` (headless Chrome) against `python3 -m http.server`. Look at the
  frames you make. Leave no page errors.
- **Headless Chrome must quit cleanly.** Use `tools/shot.mjs`, or end your own CDP scripts with
  `Browser.close` and wait for the process to exit; never just kill it. On macOS every killed Chrome leaves a 1.4 GB
  copy of itself in `/var/folders/…/X/com.google.Chrome.code_sign_clone` (300+ piled up on 2026-10-27/28). Delete your
  `--user-data-dir` profile afterwards.
- Lines of dialogue are Yash's: never rewrite them; DRAFT stays DRAFT.
- Paintings are Yash's: the pixel look comes from the pipeline, never from regenerating his art.
