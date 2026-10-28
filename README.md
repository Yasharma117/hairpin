# Hairpin

A night drive on the Guwahati–Shillong road, built in WebGL (three.js 0.160), drawn as pixel art. About five minutes.

**How it looks is set in [PIXEL.md](PIXEL.md)** (the pixel grid, the people, the UI) **and [STYLE.md](STYLE.md)**: the house style (the edge painting), the palette in `shared/style.js`, light, line, the pixel pass, the per-scene grade, framing, asset rules, and the checks to run before every push (`tools/check_style.py`, `tools/contact_sheet.py`).

## How it fits together

Hairpin is one page: `index.html` holds the title card, one canvas, one renderer, one AudioContext (unlocked by the Play tap) and the cream sheet with a stepped pixel edge that covers every change of scene, the first one from the title too. Each scene is a module, `<folder>/scene.js`, exporting `assets` (its paintings, prefetched while the scene before it plays) and `load(ctx)`, which returns `{ frame, resize, onTap, onHorn, dispose }`. The page swaps scenes in place, so the engine/wind/crickets/rain bed runs unbroken.

Every painting is 2.5D: `<scene>/depth.png` (from `tools/make_depth.py`) displaces it as a mesh, seen through a perspective camera; the `Stage` in `shared/kit.js` places everything by the depth at its feet. Camera moves and light steering are listed in STYLE.md.

`shared/kit.js` has what scenes share: the taxi, the pixel pass (`Ink`), the `Stage`, the stroke map, small helpers, and the passenger. `shared/folk.js` draws every person as a pixel sprite (`folk.person(look | 'you' | 'grandpa' | ...)`); `tools/folk-sheet.html` shows every pose and option.

What a scene gets in `ctx`, besides the renderer and `input`: `say(label, text, secs, expr)` for the dialogue box, `subAt('top' | 'bottom')` to move it (top by default, reset on every scene), `prompt(label)` for the advance button, `hornable(on)` to show the HORN button on touch while a honk would be answered (hidden by default, reset on every scene), and the sound API (`bed`, `rpm`, `engineOff`, `duck`, `duckFor`, `sfx`, `honk`). The shared UI classes (`.panel`, `.btn`, `.pick`, `.label`, `.box`, `.hint`, `.cue`) are listed at the top of `index.html`'s `<style>`. Each folder's old `index.html` now forwards to `/?scene=<name>`.

Controls, the same everywhere and shown once on the title card: **hold** (mouse, screen or Space) is whatever the taxi does in that scene, drive faster or brake; **tap** or Enter is the next thing; **H** is the horn. On touch, the horn is a HORN button. With `?debug`, keys 1/2/3 show the lights / the dark painting / the lit painting. `?fps` shows the frame rate.

## What's here

| Folder | What it is | Live version |
|---|---|---|
| 01-cloud-line-scene | The climb (`?scene=climb`): painted hills, headlight reveal, wind, grass, the taxi, cows, a dog that barks at it, the walker and the basket woman (folk sprites) | The older standalone version: https://claude.ai/artifact/4i7QCJoCBFiWA9HFmh4XDF |
| 02-story-board | The Design canvas boards: three looks, world bible, cast (v1), storyboard (v1), route, Story v2 | https://claude.ai/artifact/L3Z7uhAancbjy9MemYkD55 |
| 03-image-briefs | ChatGPT prompts for every image the next scenes need | https://claude.ai/artifact/XcPptBtprHzD5D6Hr2sfqD |
| 04-headlight-test | The first two-painting headlight reveal test, on a generated hill | https://claude.ai/artifact/W653Fq6n8VKSErjYMVY6C6 |
| 05-framing-guide | The 3D framing guide for the hairpin painting, and its four renders | |
| 06-dak-prototype | The first tiny-planet proof of concept (before Hairpin) | |
| 07-webgl-oddities | The research gallery of niche WebGL projects | |
| 08-edge-scene | Beats 05–09 on the real edge paintings: the last stretch of road and hold-to-brake (sets HANG), the hang, the doors, sitting on the edge, the wipe to *then* (the Ambassador on the cliff face, the two men), him in ink with the ember, the flick, the taxi falling, the truck that gives you a lift | |
| 09-shillong | Beat 10, in November with the cherry in bloom (`blossom.js`: a painted tree over the railing with festival bulbs, blossom down the slopes, falling petals that catch the beam and drift from the pointer, a gust with the star and a shower when you wish): engine ticking, the shooting star, hold to bank a wish, the quote in dialogue boxes. Still a placeholder painting | |
| 10-jorabat-intro | Beat 01 on the dashboard paintings (mirrored to right-hand drive): dome light as the passenger gets in, the five objects light up as you point; the paper star if a wish was banked | |
| 11-nongpoh | Beat 03: the taxi crosses the rainy pineapple stalls; lanterns flicker and streak the wet road; the grandfather line | |
| 12-cloud-line | Beat 04: seen from behind, the taxi drives up into the wall of cloud until it whites out | |
| 13-the-stand | Beat 00, the pixel customiser: the last taxi at the Jorabat stall, you by it, the passenger in its lights. The viewer names them and picks build, skin, hair, top and an extra (`folk.OPTIONS`) on a cream panel (right on desktop, top on phones), each option shown as a pixel avatar; "Get in, {name}" and they walk to the taxi. Uses jorabat-dark with a warm lift standing in for jorabat-lit |
| shared/roster.js | The passenger's DRAFT line at Jorabat, the hang and Shillong, and the brief for each beat: goal, tone, allowed expressions. The name on the label is whatever the viewer typed |
| shared/folk.js | Every person as a chibi pixel sprite (near 44 px, far 26 px; idle, walk, sit, wave; lit by the scene), and the customiser's options. `tools/folk-sheet.html` shows them all |
| source-art | Every painting and cut-out as you sent it (the old painted people, `p-*.png`, are kept here) | |
| shared/kit.js | The taxi, the pixel pass, the Stage, helpers, and the passenger, shared by every scene | |
| index.html | The whole piece: title card, scene swapping, sound, controls | |
| tools | prepare_sprites.py: trims, flips and makes the night version of a figure | |

## Running locally

The scenes read their paintings into a canvas, which browsers block from `file://`. Serve the whole folder:

    python3 -m http.server 8000

then open http://localhost:8000. Play runs the whole piece; `?scene=edge` (or stand, jorabat, climb, nongpoh, cloud, shillong) opens one scene.

## Paintings

Every scene has its real lit/dark pair except Shillong, which still draws a placeholder in code until `shillong-lit.jpg` and `shillong-dark.jpg` exist (sky above `HORIZON` 40%, railing along `RAIL` 74%). Stroke maps are computed in the browser from the lit painting, so the new scenes need no `strokes.jpg`.

Sprites for the edge scene live in `08-edge-scene/sprites/`. The ghost frames are the line drawings reduced to their ink; the truck is built in 3D in `shared/kit.js` (`makeTruck`), like the taxi.

Not used yet: `source-art/rope-puller.png` (the rope rescue was dropped when the taxi started falling). The stand uses `jorabat-dark` with a warm lift in code until `13-the-stand/jorabat-lit.jpg` exists.

## Checking a moment without playing through

- `?scene=edge&at=seated&t=20` jumps to 20 s after you both sit (`at` = car, pout, yout, seated, flick, truck, lift). `?hang=0.8` sets the hang. `?auto` plays the steps on its own; `?speed=3` runs faster.
- `?scene=shillong&t=7` jumps to 7 s after the engine goes off.
- `?scene=nongpoh&u=0.5` (or cloud) starts halfway along.

## Dialogue

The passenger is whoever the viewer makes at the stand; it's kept in `localStorage` as `hairpin.passenger` (name and look, as JSON), next to `hairpin.wish`. Every PASSENGER label shows the name they typed, and their line plays at Jorabat, the hang and Shillong, the expression first, then the words. The Shillong quote stays cut B.


Every passenger line carries a `'DRAFT'` status in `shared/roster.js` until approved. The scripted lines are drafts too, kept in one list per scene: `SCRIPT` in 08 and 10, `QUOTE` in 09, `LINES` in 01, 11 and 12. The timings next to them (`T` in 08 and 09) are what to retime once there's recorded narration.

## Scene files

- `lit.jpg`, `dark.jpg`: the two hill paintings, 1774×887, pixel-aligned.
- `strokes.jpg`: a high-pass of the lit painting's brightness; it decides which strokes the headlights reveal first.
- `sprites/<name>-lit.png` and `<name>-dark.png`: figures facing right, trimmed. Names the scene looks for:
  cow-graze, cow-look, dog-sit, dog-bark-1, dog-bark-2, dog-bark-3. People are folk.js sprites, not files.
- `source-paintings/`: the paintings as you sent them.

## Adding a new figure

    cd tools
    python3 prepare_sprites.py ~/Downloads/new-cow.png cow-graze

## Board files

The `.dc.html` boards render inside the Design canvas, which supplies their `support.js`. Opened on their own they show unstyled. Use the live link to view them; keep these as the source.
