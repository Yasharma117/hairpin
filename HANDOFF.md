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
| 1 | B: pixel people | `shared/folk.js` (new), `tools/folk-sheet.html` (new), ramps appended to `shared/style.js` | running |
| 1 | C: UI in pocket.design's idiom | `index.html` `<style>`, markup, `say()`/`prompt()`, the title card; CSS vars in `shared/style.js` | **done** (see UI classes below) |
| 1 | D: sound | `index.html` audio block (bed, horn, levels, mute logic, voice duck, rpm API) | **done** (see Sound API below) |
| 2 | scene agents | the stand (customiser), the edge, Shillong, the climb/Nongpoh/cloud/Jorabat: people become `folk.js` sprites; the scene-level fixes in reviews/feel-review-2026-10-27.md | after phase 1 |
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
