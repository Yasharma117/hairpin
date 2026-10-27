# Hairpin

A night drive on the Guwahati–Shillong road, built in WebGL (three.js 0.160). About four minutes.

## How it fits together

Hairpin is one page: `index.html` holds the title card, one canvas, one renderer, one AudioContext (unlocked by the Play tap) and the torn sheet between scenes. Each scene is a module, `<folder>/scene.js`, exporting `assets` (its paintings, prefetched while the scene before it plays) and `load(ctx)`, which returns `{ frame, resize, onTap, onHorn, dispose }`. The page swaps scenes in place, so the engine/wind/crickets/rain bed runs unbroken.

`shared/kit.js` has what scenes share: the taxi, its ink outline (the full line work only runs inside the taxi's box on screen), the stroke map, small helpers, and the passenger. Each folder's old `index.html` now forwards to `/?scene=<name>`.

Controls, the same everywhere and shown once on the title card: **hold** (mouse, screen or Space) is whatever the taxi does in that scene, drive faster or brake; **tap** or Enter is the next thing; **H** is the horn. With `?debug`, keys 1/2/3 show the lights / the dark painting / the lit painting, and B toggles the line boil. `?fps` shows the frame rate.

## What's here

| Folder | What it is | Live version |
|---|---|---|
| 01-cloud-line-scene | The climb (`?scene=climb`): painted hills, headlight reveal, wind, grass, the taxi, cows, dog, walker, basket woman | The older standalone version: https://claude.ai/artifact/4i7QCJoCBFiWA9HFmh4XDF |
| 02-story-board | The Design canvas boards: three looks, world bible, cast (v1), storyboard (v1), route, Story v2 | https://claude.ai/artifact/L3Z7uhAancbjy9MemYkD55 |
| 03-image-briefs | ChatGPT prompts for every image the next scenes need | https://claude.ai/artifact/XcPptBtprHzD5D6Hr2sfqD |
| 04-headlight-test | The first two-painting headlight reveal test, on a generated hill | https://claude.ai/artifact/W653Fq6n8VKSErjYMVY6C6 |
| 05-framing-guide | The 3D framing guide for the hairpin painting, and its four renders | |
| 06-dak-prototype | The first tiny-planet proof of concept (before Hairpin) | |
| 07-webgl-oddities | The research gallery of niche WebGL projects | |
| 08-edge-scene | Beats 05–09 on the real edge paintings: the last stretch of road and hold-to-brake (sets HANG), the hang, the doors, sitting on the edge, the wipe to *then* (the Ambassador on the cliff face, the two men), him in ink with the ember, the flick, the taxi falling, the truck that gives you a lift | |
| 09-shillong | Beat 10: engine ticking, the shooting star, hold to bank a wish, the quote on torn labels. Still a placeholder painting | |
| 10-jorabat-intro | Beat 01 on the dashboard paintings (mirrored to right-hand drive): dome light as the passenger gets in, the five objects light up as you point; the paper star if a wish was banked | |
| 11-nongpoh | Beat 03: the taxi crosses the rainy pineapple stalls; lanterns flicker and streak the wet road; the grandfather line | |
| 12-cloud-line | Beat 04: seen from behind, the taxi drives up into the wall of cloud until it whites out | |
| 13-the-stand | Beat 00, before the dashboard: the team waits at the Jorabat stall, staged (bench with chai, the counter, the lamp post, one crouched, one on a phone, the rest in depth rows), laid out to fit any screen down to 375 px; hover or Tab shows their tagline and quip; click gives them the lift. Uses jorabat-dark with a warm lift standing in for jorabat-lit | |
| shared/roster.js | The 18 passengers (`on` switches each one on at the stand), their DRAFT line at Jorabat, the hang and Shillong, and the brief for each beat: goal, tone, allowed expressions | |
| people | Drop `<id>-stand.png` (standing, facing left, a hand half up) and `<id>-sit.png` (at the edge, from behind) here; until then they're silhouettes, and the name shows only on hover or focus | |
| source-art | Every painting and cut-out as you sent it | |
| shared/kit.js | The taxi, the ink pass, helpers, and the passenger, shared by every scene | |
| index.html | The whole piece: title card, scene swapping, sound, controls | |
| tools | prepare_sprites.py: trims, flips and makes the night version of a figure | |

## Running locally

The scenes read their paintings into a canvas, which browsers block from `file://`. Serve the whole folder:

    python3 -m http.server 8000

then open http://localhost:8000. Play runs the whole piece; `?scene=edge` (or stand, jorabat, climb, nongpoh, cloud, shillong) opens one scene.

## Paintings

Every scene has its real lit/dark pair except Shillong, which still draws a placeholder in code until `shillong-lit.jpg` and `shillong-dark.jpg` exist (sky above `HORIZON` 40%, railing along `RAIL` 74%). Stroke maps are computed in the browser from the lit painting, so the new scenes need no `strokes.jpg`.

Sprites for the edge scene live in `08-edge-scene/sprites/`. The ghost frames are the line drawings reduced to their ink; the truck's night version comes from `tools/prepare_sprites.py` run against the edge pair.

Not used yet: `source-art/rope-puller.png` (the rope rescue was dropped when the taxi started falling). The stand uses `jorabat-dark` with a warm lift in code until `13-the-stand/jorabat-lit.jpg` exists.

## Checking a moment without playing through

- `?scene=edge&at=seated&t=20` jumps to 20 s after you both sit (`at` = car, pout, yout, seated, flick, truck, lift). `?hang=0.8` sets the hang. `?auto` plays the steps on its own; `?speed=3` runs faster.
- `?scene=shillong&t=7` jumps to 7 s after the engine goes off.
- `?scene=nongpoh&u=0.5` (or cloud) starts halfway along.

## Dialogue

The passenger is whoever you pick at the stand; it's kept in `localStorage` as `hairpin.passenger`, next to `hairpin.wish`. Every PASSENGER label shows their first name, and their own line plays at Jorabat, the hang and Shillong, the expression first, then the words. The Shillong quote stays cut B.


Every passenger line carries a `'DRAFT'` status in `shared/roster.js` until approved. The scripted lines are drafts too, kept in one list per scene: `SCRIPT` in 08 and 10, `QUOTE` in 09, `LINES` in 01, 11 and 12. The timings next to them (`T` in 08 and 09) are what to retime once there's recorded narration.

## Scene files

- `lit.jpg`, `dark.jpg`: the two hill paintings, 1774×887, pixel-aligned.
- `strokes.jpg`: a high-pass of the lit painting's brightness; it decides which strokes the headlights reveal first.
- `sprites/<name>-lit.png` and `<name>-dark.png`: figures facing right, trimmed. Names the scene looks for:
  cow-graze, cow-look, dog-sit, dog-run-1, dog-run-2, walker-1, walker-2, basket.
- `source-paintings/`: the paintings as you sent them.

## Adding a new figure

    cd tools
    python3 prepare_sprites.py ~/Downloads/new-cow.png cow-graze

## Board files

The `.dc.html` boards render inside the Design canvas, which supplies their `support.js`. Opened on their own they show unstyled. Use the live link to view them; keep these as the source.
