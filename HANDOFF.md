# Handoff: the pixel rebuild (for the next Claude session)

Yash asked (2026-10-27) to rebuild all of Hairpin in pocket.design's pixel-art style, with subagents, to a higher finish
than pocket.design itself, and to leave this note if the session runs out. Read PIXEL.md (the art direction contract)
first, then this.

## Where things are

- Branch **`pixel`** (local, not pushed). `main` = what's live on hairpin-two.vercel.app. Checkpoint commit `c28091d` on
  `pixel` holds everything before the rebuild (3D truck, dog only barks, Shillong cherry blossom, the paper-doll customiser).
- **Do not push or merge to main** until Yash has tried it locally (`python3 -m http.server 8000` in the repo) and says so.

## The plan

| Phase | Agent | Owns | Status |
|---|---|---|---|
| 1 | A: pixel pipeline | `shared/kit.js` (Ink post pass, Stage spring and pixel snap), the renderer block and the `busy` gating in `index.html`, palettes appended to `shared/style.js`, `tools/fit_palette.py` | **done** (see Pipeline below) |
| 1 | B: pixel people | `shared/folk.js` (new), `tools/folk-sheet.html` (new), ramps appended to `shared/style.js` | **done** (see Folk API below) |
| 1 | C: UI in pocket.design's idiom | `index.html` `<style>`, markup, `say()`/`prompt()`, the title card; CSS vars in `shared/style.js` | **done** (see UI classes below) |
| 1 | D: sound | `index.html` audio block (bed, horn, levels, mute logic, voice duck, rpm API) | **done** (see Sound API below) |
| 2 | scene agents (S1 stand, S2 edge, S3 Shillong, S4 climb/Nongpoh/cloud/Jorabat) | the stand (customiser), the edge, Shillong, the climb/Nongpoh/cloud/Jorabat: people become `folk.js` sprites; the scene-level fixes in reviews/feel-review-2026-10-27.md | running (phase 1 committed on `pixel`) |
| 3 | critics, then fixes | review the whole piece again against pocket.design; fix what they find | after phase 2 |

## Notes

- Memory: the passenger lines in `shared/roster.js` are DRAFT placeholders; Yash writes dialogue. Paintings are Yash's;
  don't regenerate them, don't push fal.
- The paper-doll customiser (`shared/look.js`, `people/p-*.png`) is superseded by `folk.js`; keep the files until the new
  one works, then remove them in one commit.

## Sound API (phase 1D, done)

- `ctx.rpm(k)` 0 idle..1 normal..3 hold (every frame is fine). `ctx.engineOff()`: pitch sag, off, key click; `bed({engine})` restarts.
- `ctx.duck(on)`, `ctx.duckFor(secs)` (-8 dB bed). `say()` currently ducks under every line (no recorded voice yet): may pump; remove the `duck(!!label)` line in `say()` if it does.
- `ctx.sfx.tear()`, `.tick()` (60 ms limit), `.door()`, `.impact(dist 0..1)`; `ctx.verb` (reverb send), `ctx.voice`; `honk(secs)` returns `release()`.
- `window.__hairpin.toggleMute()`, `.muted`. Hooks still to wire in the UI: `sfx.tear()` in `sheetDown()`, `sfx.tick()` in the typewriter, `#mute` initial `aria-pressed`.
- Per scene: **Shillong** load `bed({engine:1, crickets:1, wind:.4})` + `rpm(0)`; on stop `engineOff()`, ticks start 1.2 s later; the blossom gust's `bed()` must leave engine out after the stop. **Edge** at the fall `bed({})`, 2.5 s silence, `sfx.impact(.85)`; `sfx.door()` on doors; truck diesel not built (scene saw ~30 Hz, LP 300 Hz). **Climb/Nongpoh/cloud** `rpm(hold ? 3 : 1)` or from speed. **Stand/Jorabat** `bed({engine:1,...})` + `rpm(0)`.

## UI classes (phase 1C, done)

Shared in index.html (documented atop its `<style>`): `.panel`, `.btn` (`.btn.on` / `[aria-pressed=true]`, `.btn.sm`), `.tag`,
`.label` (`.on-night`), `.box` (`.who`, `.line`, `.done`), `.hint` (`.on`), `.avatar` (`.on`), `.cue`. Fonts: Young Serif
(display), Newsreader (dialogue, `var(--serif)`), VT323 (labels). Colours `--ui-*` from `applyUICSS()` in style.js.
Scenes to adopt: **stand** `.dress` → `panel dress`, `.k` → `.label`, options → `btn sm` (swatches keep `--sw`), input font
`var(--serif)`. **Shillong** quote `p` → `.box` with `.line` (quote = dialogue size), `.wish` → `.hint`. Others: nothing.
`go()` calls `sheetDown(name)` (keep it).

## Pipeline (phase 1A, done)

Frame = low-res grid (`ctx.ink.size`; 1280x720 → 427x240 at scale 3; scenes render at 2x the grid, box-filtered down),
1 px outlines for layer-1 objects, edge-keeping smoothing, grade, per-scene ~32-colour palette (`PIXEL_PALETTES` block in
style.js, refit with `tools/fit_palette.py`), Bayer dither .45 only in gradients, nearest upscale with the camera's
sub-pixel remainder. `setGrade(params, sceneName)` picks the palette. `Stage.update` is a critically damped spring;
`Stage.apply` snaps to the grid. index.html always calls `current.frame` (busy gates input only). To do in phase 2:
Shillong petals use `getDrawingBufferSize` → use `ctx.ink.size.y * 2`; the black taxi's outline is weak on dark rock;
edge foreground grass is busy; STYLE.md (paper grain) and README ("B toggles boil") are stale; consider
`image-rendering: pixelated` on the canvas.

## Folk API (phase 1B, done)

`folk.person(look | 'you'|'grandpa'|'friend'|'walker'|'basket', { size: 'near'|'far' })` → `{ obj, mesh, shadow, w, h,
foot, stride, play(name, {loop, onEnd, restart}), face('front'|'back'|'left'|'right'), update(dt) → px walked,
setLight(0..1.2, side), dispose }`. Place: `stage.place(p.obj, x, y, paintPxPerSpritePx)`. Walk: `face; play('walk')`, each
frame `x += p.update(dt) * dir`. Sit: `face('back'); play('sitdown', { onEnd: () => play('sit') })`, anchor on the ledge.
Near 44 px (32x48 cell), far 26 px (24x34). Look = `{ build, skin 0-4, hair, top, extra }` (`acc` alias). Also
`folk.avatar(look, px)`, `folk.preview(look)`, `folk.OPTIONS`. Sheet: `tools/folk-sheet.html`. Gaps: umbrella/basket far
only; wave has no back view; no line-only ghost style.

## Status log

- 2026-10-28 ~01:30: the session limit stopped all four phase 2 agents. Only S4 (drive scenes) had edits on disk
  (01, 10, 11, 12, the horn button in index.html, uncommitted). All four were resumed from their transcripts after the
  reset. If they're lost: re-run phase 2 from the briefs above (stand, edge, Shillong, drive scenes), each owning only its
  own folder; check with tools/shot.mjs; then commit phase 2 on `pixel` and start phase 3 (critics vs pocket.design).
- Phase 2 S1 (stand) **done**: folk customiser in 13-the-stand/scene.js (no look.js), walk to the far door, 1 sprite px =
  1 frame px. Needs (phase 3): refit `PIXEL_PALETTES.stand` with the FOLK ramps (black hair dithers brown, faces muddy) and
  don't dither layer-0 sprites; an `Ink.render` opt-in so a person can stand in front of the taxi (Yash is at the nose
  for now); figures read small on desktop. Disk is nearly full (~1 GB): delete headless Chrome profiles after captures.
- Phase 2 S2 (edge) **done**: folk people walk out and sit, grandpa + friend in the flashback, the ghost as a 1 px line,
  thenIn [25,28], doors/fall silence/impact/diesel/air brake, seesaw k12 c2.6, door springs, a one-time look-around hint.
  Needs (phase 3): Ink smears non-layer-1 sprites and its info pass draws whole quads (the scene works around it with a
  layer-2 coverage copy: move this into Ink for all scenes); the black taxi vanishes on dark trees (ink should go light
  where the background is darker); seated figures at night are small dark shapes; the passenger's walk is only ~1.5 s.
- Phase 2 S4 (drive scenes) **done**: folk walker/basket on the climb (walker turns on the horn), lines queue (hold never
  skips), rpm follows hold, Jorabat tap picks objects (only Drive/Enter leaves; phones pan between objects), touch HORN
  button in index.html. Open: Jorabat object lines are empty (Yash's); phone left-tap wraps from first to last object;
  far people murky in the dark; the walker still jumps back up the road at the end of his stretch.
- Phase 2 S3 (Shillong) **done**: pixel tree/petals/star on the frame grid, seated pair with a warm town rim, quote boxes,
  hint with a hold fill, 9 s star window, engine off. Needs: folk heads-up frame for the star, a built-in back-view rim;
  Ink smoothing blurs low-contrast pixel art (skip "already pixel art"); a pale patch where the beam hits the tree;
  "Again" sits between the truck and the pair.
- **Phase 2 committed** on `pixel`. Phase 3 (critics vs pocket.design, then fixes) next.
