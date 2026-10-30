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
- Phase 3 started: three read-only critics (pixel art direction, play-through feel, UI/type/code health), frames in
  scratchpad/phase3-{art,feel,ui}. Next: merge their findings with the "Needs" above into fix agents by file ownership
  (kit.js Ink + palettes; folk.js; index.html UI; each scene), then remove shared/look.js + people/p-*.png, update
  README/STYLE.md, commit, and ask Yash to test locally before any push.
- Phase 3 critics done → reviews/pixel-review-2026-10-28.md (the fix list). Fix round running: F1 pipeline+palettes
  (kit.js, fit_palette.py, palette block), F2 folk.js (lit rim, ghost line variant, then-mode, lookup), F3 index.html UI +
  docs + delete dead files, F5 drive scenes (01, 10, 11, 12). **Still to launch after F2+F3 report: F4 = the stand,
  the edge, Shillong** (stand ▼ collision/one selected state/walk route + door; edge: pair near-size on the lip ~x620,
  subAt('bottom') while seated, hornable only in the truck phase, HOLD TO BRAKE fill, tap feedback while seated, folk
  ghost + then-mode, drop the COVER_LAYER hack once Ink has the pixel-art path; Shillong: one quote box, an ending card
  (credits by Yash Sharma, Again, Title), sign-off before the star, setLight 1.1, phone framing, lookup on the star).
- 2026-10-28 ~04:20: limit stopped F1, F2, F5 mid-work (edits on disk, uncommitted); F3 (UI/docs/cleanup) **done**:
  new ctx APIs `ctx.hornable(bool)` (HORN hidden by default, reset per scene), `ctx.subAt('top'|'bottom')`, `.pick`
  selected state, type vars `--t1/--t2/--t3/--t-cue`, `--u` scale; dead files deleted (staged). F1, F2, F5 resumed.
  If lost: re-run them from the briefs in this log, then F4 (stand/edge/Shillong), then commit.
- F1 (pipeline) **done**: pixel-art path = `mesh.layers.enable(Ink.PIXEL_ART_LAYER)` (3): drawn with its own material,
  no smoothing/grade/palette/dither; vehicles 3 hard tones, light outer line on dark; dither guards; ember out of
  climb/stand/edge palettes; smoothing .035; `--px` set on <html>. For F4: remove the edge's cover()/COVER_LAYER/
  onAfterRender/ALWAYS hack; scenes 01/08/11/12 stop setting ink.uniforms uTime/uJeepScale/uBoil (then delete the shims
  in kit.js); fix the stale look.js comment at style.js:49.
- F5 (drive scenes) **done**: Jorabat name chips + quiet until the YOU line ends; climb hold hint, tap lurch + rpm
  blip, hornable(true); pacing slows instead of parking; cloud beam in 3 hard pools; phone framing. Waiting on F2 (folk)
  before F4.
- F2 (folk) **done**: setLight(level, side, rim 'auto'|'warm'|'cool'|'none'), setThen(on), 'ghost' (near, line-only,
  play('drag'), setEmber(k)), play('lookup'); every folk mesh on layer 3. Last fixes running: F4a = the edge, F4b = the
  stand + Shillong (+ uniform calls in 01/11/12, style.js:49 comment). After both: delete the uTime/uJeepScale/uBoil
  shims in kit.js, run check_style + a full shot pass, commit phase 3 on `pixel`, tell Yash to test locally.
- F4a (edge) **done**: near-size pair on the side lip (lip(.58)), subAt bottom while seated, hornable only in the
  truck phase, tap skips to the next line, HOLD TO BRAKE fill, folk ghost with drag + ember (its fade patches the folk
  shader with slot numbers 39/40: fragile if folk.js changes), sepia flashback, COVER hack gone. ghost-1/2.png deleted
  (unreferenced). Waiting on F4b, then the final pass.
- F4b (stand + Shillong) **done**. Final pass (2026-10-28): fixed Ink.render autoClear (it wiped the vehicles' depth
  before the art layer; the stand's workaround removed), deleted the uTime/uBoil/uJeepScale shims, 12 desktop + 3 phone
  frames with zero page errors, check_style OK. **Phase 3 committed on `pixel`.**

## Known follow-ups (after Yash tests)

- The ghost at the edge (`folk.person('ghost')`, near, line-only, back view) reads as an abstract outline, not a man:
  give it the seated side/¾ silhouette with the cigarette hand, or keep it front-¾ like the old drawing.
- The cloud line's beam, seen from behind, still reads as a column rising over the roof: start it lower/wider on the road.
- The ghost's fade patches folk's shader by slot numbers 39/40 (fragile); `SHILLONG_PLACEHOLDER.rimTown`, `SKIN_TONES`,
  `BASE_SKIN` in style.js may be unused.
- TITLE on the end card reloads the page (index.html has no "show title" API).
- Not yet heard on a real phone; not yet pushed. Merge `pixel` → `main` only when Yash says so.
- 2026-10-28: the disk filled up. Our killed headless Chrome runs had left 335 code-sign clones (deleted; only ~2.3 GB
  real, they share blocks). tools/shot.mjs now quits Chrome with Browser.close (tested: no clone left); PIXEL.md §5 says
  every CDP script must. The rest of the disk is Yash's: iOS simulators ~50 GB, Claude vm_bundles 11 GB, caches 12 GB.

## Study: the resolution (2026-10-28, not started; Yash to decide)

**Problem.** Yash: "still looks pretty low resolution". The grid targets ~270 rows (`pixelGrid` in shared/kit.js:
`Math.round(ph / (ph > pw ? 300 : 270))`), so 1280x720 renders at 427x240 (each pixel 3 screen px). The paintings are
887 px tall, so they lose ~3.7x detail; pocket.design can be chunky because it's a close interior, Hairpin is wide
landscapes.

**What a finer grid does.** Integer scales only: at 1280x720 the choices are 240 rows (x3) or 360 rows (x2): 360 and 480
render the same. At 1920x1080: 270 (x4) or 360 (x3). On a retina 1440-px-tall canvas: 288 (x5) or 360 (x4). Tested
with a temporary `?rows=` switch (since removed): 360 rows keeps much more of the paintings (Nongpoh's stall, the
bananas, the rocks read clearly). Comparison frames: session scratchpad `rows/compare.png`, `rows/crop-*.png`.

**The catch: people.** folk.js sprites are hand-authored at fixed sizes (near 44 px in a 32x48 cell, far 26 px in
24x34) and always drawn 1 sprite px = 1 frame px. On a 360-row grid they appear ~2/3 their current size; the seated
pair at the edge become hard to read (already a critic complaint).

**Options.**
1. **Finer grid + bigger people (recommended):** target ~360 rows, and redraw the folk sprites at a larger size (near
   ~64 px tall, far ~38 px) so they keep their on-screen size with more detail in faces, hair and clothes. One agent
   owning shared/folk.js (+ the sheet), then re-check each scene's placement (they use `p.w/p.h/p.foot`, so mostly
   automatic) and the stand's avatars. ~1 h of agent work.
2. Finer grid, people as drawn (smaller): change the 270/300 targets to ~360/400. Instant; people harder to read.
3. Finer grid, people at 2x: sprite pixels twice the world's; same size as now; mixed pixel sizes (breaks PIXEL.md §1).
4. Keep 270: chunkier, closer to pocket.design.

**Also to re-check if the grid changes:** palettes/dither are per pixel (fine); the UI's `--px` follows the scale
automatically; Shillong's tree is repainted onto the grid on resize (fine); performance cost ~2.2x more pixels in the
post pass at 360 rows (still small); STYLE.md/PIXEL.md §1 numbers (270/300) need updating.
- 2026-10-28: Yash chose option 1 ("make it highpoly"): grid ~360 rows landscape / ~400 portrait + folk sprites redrawn
  bigger (near ~64 px, far ~38 px) with more detail; API unchanged. Agent H1 (folk.js, pixelGrid, sheet, PIXEL.md
  numbers) running. Next: agent H2 re-fits each scene's placement/framing for the new sprite sizes (stand, edge incl.
  the ghost's shader slots 39/40, Shillong, climb), shot pass, commit. Disk ~500 MB free: keep captures tiny.
- 2026-10-28: external SSD **HOARDE** (exFAT, ~880 GB free) attached. Work dir `/Volumes/HOARDE/hairpin-work/`:
  `captures/` (tools/shot.mjs puts relative outputs here), `chrome-profiles/`, `archive/` (old session scratch frames
  moved there, nothing deleted). shot.mjs falls back to /tmp when the SSD isn't mounted. Internal disk ~750 MB free.
- H1 (hi-res) **done** (uncommitted): pixelGrid 360/400 rows; near redrawn 48x72 (~64 px, foot [23.5,72], stride 4);
  far 32x48 (~39 px, built from the old near art, stride 3); API unchanged, ghost slots 39/40 kept. Frames on the SSD
  captures/hires/. H2 (re-fit every scene: stand preview/avatars, edge ppx/gppx + seats + ghost, Shillong pair, climb
  walker/basket, STYLE.md numbers) running. Follow-ups: heads a bit boxy; far not fully redrawn; ghost back view reads
  as an outline; far basket from the front looks like a funnel.
- H2 (re-fit) **done**: stand (×64/44 layout, 48x72 previews, 2x avatars, wider sheet), edge (ppx/gppx 1.95 measured
  by pin(), seats spaced, ghost reach), Shillong (pair gap 30), STYLE.md 360/400. **Hi-res committed.** Follow-ups:
  the climb's umbrella hovers 1-2 px over the walker with no handle (folk.js); both edge walks out of the doors are very
  short (passenger seated by ~0.75 s); ghost back view reads as an outline; heads a bit boxy; far not fully redrawn.
- 2026-10-29: Yash asked for (1) story dialogue in a corner/side window with a progress bar, (2) a project window when
  you pick a dashboard object, with the blanks filled (real info from ~/Portfolio-Site where it exists, else DRAFT),
  (3) a look at the GitHub "diorama" skill (sloemo01/diorama: pixel-art diorama playbook + three.js kit, toy-scale 3D
  cast, palette snap, dither, inked contour, frame QA) because quality is "still not at par" with pocket.design.
  Running: story window + progress (index.html), project window (10-jorabat-intro), diorama study (read-only →
  reviews/diorama-study-2026-10-29.md). Then: decide the quality plan from the study.
- Story window **done** (uncommitted): bottom-left corner card, ink title bar = chapter + n/7 + 7 pixel segments
  (current fills red), up to 3 earlier lines; phone = full-width strip above the advance/HORN buttons. `ctx.progress(k)`
  0..1 (time guess per scene from `EST` if never called); `ctx.subAt` is a no-op; scene `.tag` hidden. Scenes to adjust:
  01/11/12 call ctx.progress(u); 08 progress by phase + drop subAt (~337); 09 progress by phase; 11 phone framing (taxi
  under the window: lift ~230 px); 01/08 phone hints at bottom:32px sit behind the window; README still documents subAt.
- Diorama study **done** → reviews/diorama-study-2026-10-29.md. Plan A (bigger "close" folk size for dialogue + framing
  built around people + night rules), B (deterministic freeze(t) + per-entity frame QA, vehicle detail, secondary
  motion), C (3D toy-cast spike for far figures, go/no-go). Waiting on Yash to approve A.
- Project window **done**: 10-jorabat-intro `PROJECTS` (each copy `[text, 'PORTFOLIO'|'DRAFT']` + source). Real from
  ~/Portfolio-Site: TopNotch (the teleprompter, link), Warden (facts, GitHub + walkthrough), the 1mg banner pipeline
  (internal, no link). Dodo billingSDK and Markon are NOT in the portfolio: all their copy is DRAFT guesses; Rookie (iOS)
  and Dopamine 2.0 (1mg design system) are real candidates to swap in. Years are DRAFT guesses. Ask Yash.
  Committed with the story window.
- 2026-10-29: Yash: "make the bg music better and the first splash page too, looks pretty bad". Running: a generative
  score in Web Audio (shared/score.js + index.html audio hooks, `ctx.score(mood)`, per-scene moods, one returning theme,
  WAV renders on the SSD captures/score/), and a living splash (a pixel title scene behind the card, e.g. 00-title/,
  compact chapters, Play first). Phase A of the quality plan still waits on Yash's go.
- Splash **done** (uncommitted): 00-title/scene.js (the Jorabat stall at night through the pixel pipeline: idling taxi,
  Yash waving, stars, fireflies, falling star, pointer parallax), Young Serif wordmark, PLAY + a CHAPTERS <details>
  drawer (go(name), no reload), keycaps, "by Yash Sharma"; showTitle() in index.html; Play lifts onto the same place.
  Waiting on the score agent before committing.
- Score **done**: shared/score.js (A, 72 BPM, pentatonic theme that comes home in Shillong; nylon KS pluck, felt piano,
  bells, pad, sub, tape), `ctx.score(mood, {now})`, default mood per scene in go(), cues in 08 (edge / edge-story /
  silence at the fall / relief) and 09 (bloom), ducks under dialogue, hold lifts it. Level knob: `level` in makeScore
  (.042). WAVs for Yash: /Volumes/HOARDE/hairpin-work/captures/score/ (journey.wav = the whole drive). Committed with
  the splash.
- 2026-10-29: Yash: the synth score is "still not good at all". Chose **curated real tracks** (royalty-free / CC) with a
  **Northeast folk colour** (duitara-like plucks, bamboo flute, ambient bed). A search-only agent is building
  reviews/music-shortlist-2026-10-29.md (2-3 candidates per chapter, licence verified, listening links, CC0 ambience).
  Nothing downloaded until Yash picks; then download to the repo (small, compressed), wire per chapter with crossfades +
  dialogue duck, and keep shared/score.js only as a fallback (or remove it).
- 2026-10-29: Yash approved the music shortlist ("use them"): the 8 Blue Dot Sessions tracks (CC BY-NC 4.0) → agent
  downloading to the SSD (music-src/), transcoding to audio/*.m4a (~-18 LUFS, small), replacing the synth behind the
  same ctx.score(mood) API, attribution in README + audio/CREDITS.md + title card. Licence note for Yash: BY-NC is free
  only for non-monetized personal work; a paid Pocket FM assignment would need Blue Dot's paid licence.
  Also running: a full truck rebuild (kit.js makeTruck: painted truck-art textures, HORN OK PLEASE, cab interior,
  `driver` anchor, `cabDoor`) and the flag-down beat (08: hold to flag it down by waving in its lights — the horn was a
  plot hole after the fall; a new folk 'driver' leans out, DRAFT exchange, you climb in, the truck pulls away).
- Flag-down beat **done** (uncommitted): 08 truck phase = approach → HOLD TO FLAG IT DOWN (wave, fill) → air brake →
  folk 'driver' leans out (maroon cap, moustache, gamosa) → 4 DRAFT lines → "Climb in" → round the nose to the far
  door (sfx.door, cab rocks) → pulls away into the cloud (score 'relief') → Shillong. ~21 s. folk.js: driver + flag,
  standup, bustRow(). The driver isn't in Shillong yet (needs a sprite in 09). Waiting on the truck rebuild + music.
- 2026-10-30: truck rebuild **done** (painted truck-art texture, HORN OK PLEASE tailgate, cab interior, grille,
  chrome, tassels, nazar doll; `driver` + `cabDoor`; paintMat takes a texture, NoColorSpace). Real music **done**
  (shared/score.js = track player behind ctx.score; audio/*.m4a 16 MB; Roundpine from the first tap on the title;
  credits on title, end card, README, audio/CREDITS.md). Licence flag: the end card says "Made for Pocket FM Design";
  Blue Dot's free BY-NC terms exclude work done as part of a job. Committed and pushed as branch `pixel` (main/live
  untouched).
