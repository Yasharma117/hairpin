# Pixel rebuild review, 2026-10-28 (phase 3)

Three critics: pixel art direction, play-through feel, UI/type/code health. Frames in the session scratchpad
(phase3-art, phase3-feel, phase3-ui). This is the fix list for phase 3.

## UI, type and code health

1. High: hints (POINT TO LOOK AROUND, HOLD TO WISH) look like buttons (same cream/border/shadow) and pass clicks through,
   so tapping one advances. Hints: no shadow, dashed or 1 px border (or ink text on a translucent strip). Hard shadow
   only on pressables. (index.html:65-68, 08-edge-scene/scene.js:420-421)
2. High: the stand's selected-option ▼ (13-the-stand/scene.js:56, top:-12px) collides with group labels; on phones it
   touches the row above. Put it inside the frame or raise the group gap to 14 px.
3. High: signal red #fd1500 on cream ≈ 3.8:1 for small VT323 labels/tabs/.btn.on: fails AA. Use --ui-rust (≈5.7:1) for
   small text; keep signal red for glyphs and 24 px+.
4. High: Play → the stand is a hard cut (go() skips sheetDown when sceneName is null, index.html:479). Cover the title
   with the sheet on the first call too.
5. Med: three different selected states (red fill, red border + ▼, cream/red ring). One: 2 px red ring + ▼ everywhere.
6. Med: VT323 at 10/12/15/16/17/18/19/20/22/24/28/32 px: three steps (16/20/24, 32 for the cue) as CSS variables.
7. Med: nothing scales at 1920 (sheet 344 px, tag 20 px): a --u multiplier, clamp(1, 100vw/1280, 1.5).
8. Med: Shillong quote = four stacked panels with alternating indents (reads as chat), padding differs from dialogue,
   a one-word last line. One box whose line replaces the last, or serif lines on the night with no panels.
9. Med: the transition sheet's teeth (~53 px wide, 12/24 px deep) are off the frame grid: steps in multiples of
   ink.scale, 32 to 48 columns.
10. Low: title card shadow uses --black (others ink); the kicker "A night drive" repeats the paragraph; no disabled or
    focus visual on .btn (disabled: 60% opacity, no shadow).
11. Low: index.html loads Archivo + IBM Plex Mono (unused), --body/--mono, .avatar, .label.on-night, stale comment.
12. Low: B key toggles uBoil; kit.js uBoil/uJeepScale/uTime unread, still set in 01:537, 08:550, 11:182, 12:114. Remove.
13. Low: stale comments kit.js:342, style.js:49 (look.js); PALETTE paper/ink/red/mist used only by the folk tag.
14. Med: STYLE.md (paper grain, torn labels, Archivo/Plex, old palette) and README (B boil, people row, the stand row,
    torn sheet) are wrong. STYLE.md → point to PIXEL.md §3 for UI; README: folk.js + tools/folk-sheet.html.

Safe to delete: shared/look.js; people/ (26 PNGs, 7.3 MB); tools/prepare_people.py;
01-cloud-line-scene/sprites/walker-{1,2}-{lit,dark}.png, basket-{lit,dark}.png; 08-edge-scene/sprites/then-pair.png.
Keep source-art/p-*.png (Yash's originals) and ghost-1/2.png (still used).

## Pixel art direction

1. CRITICAL: people are re-graded and palette-snapped like paintings (kit.js:282-298): black hair → maroon, skin orange,
   lit figures render as dark lozenges. Give folk meshes a coverage bit (move edge's COVER_LAYER hack into Ink); where
   set, skip Kuwahara, grade, palette and dither: output sprite colour as is.
2. HIGH: back views unreadable at night (blobs of black hair). folk.js FRAG rim (~1284): add a 1 px rim on the LIT side
   (ramp[4] warm or #6c85a9 cool); back-view hair floor ≥ step 2; Shillong setLight .9 → 1.1.
3. HIGH: the edge pair sits far from the lip at far size: use size 'near' for the seated beat, anchor on the lip ~x 620.
4. HIGH: the taxi is noisy: drop the brush streak (kit.js:66) in pixel mode; band shading to 3 hard steps
   (floor(l*3)/3); outer ink → #546788 where the background is darker than the body.
5. HIGH: dither reads as a dot grid (truck cab, cream dots in the edge beam): kit.js:277 smoothstep(.0008,.004) →
   (.003,.01); never dither layer-1 pixels (s *= 1.-c.a); skip dither when ΔL(i1,i2) > .12.
6. MED: UI #ff7f29 in every palette → hot-orange spots on the cows: drop it from climb/stand/edge in fit_palette.py.
7. MED: the cloud-line beam is an airbrushed flame: quantize beam intensity to 3 hard pools (.33/.66/1), dither only at
   band edges (like Shillong's trapezoid).
8. MED: Jorabat dashboard objects are mush (Kuwahara): lower the detail threshold kit.js:272 .07 → .035, or put them on
   layer 1.
9. MED: the ghost is ~43 px (folk far is 26) with doubled-pixel jaggies and a soft-glow ember: draw it as a near-size
   folk line-only variant (outline slots in cream, rest empty); ember 1-2 px #f2c230 then #ff7f29, no halo.
10. MED: flashback: violet-navy hair lights in a sepia world, faces smudge: when uThen, hair ramp #3a2618/#5a3c22/#7b4e43,
    a cream catch-light pixel in the eyes.
11. LOW: UI borders 2 px / shadows 4 px vs a 3 px world pixel: --px = ink scale from Ink.resize; borders var(--px),
    shadows calc(var(--px)*2).
12. LOW: phone framing: the climb's taxi clipped left with its beam off-screen; Shillong t30 cuts the pair: on portrait
    target x = taxi, bias y +8%.

Already better than pocket.design: Nongpoh (wet road, stepped reflections), the edge flashback (one sepia palette),
Shillong's arrival (hard trapezoid beam, blossom clusters, dithered city).

## Play-through feel

1. High: edge seated: the dialogue box (index.html .sub, top 80 px) covers the two of you for the 46 s talk. A scene
   API to put the box at the bottom (ctx.subAt('bottom')), or frame the lip below ~30%.
2. High: Jorabat: every object answers with an empty box (lines are Yash's, empty); hover replaces "Easier to show
   you…" at once. Empty line → the object's name as a .hint chip near it, not say(); no hover answers until the YOU
   line has finished.
3. High: phone edge: HORN shows the whole scene but only works in the truck phase, and collides with the 291 px
   "Open the passenger door". Show HORN only while onHorn would accept; advance button gets a right inset with HORN up.
4. Med-high: drive scenes: nothing says hold to go faster; taps do nothing; holding only costs time (Nongpoh's taxi
   leaves frame and you watch empty stalls; the climb parks at the top). A one-time "HOLD TO GO FASTER" hint, tap
   feedback (lurch/puff), and pace so the road never runs out before the last line.
5. Med: edge seated: taps do nothing for 46 s: a tap skips to the next line, or at least a tick + a visible "wait".
6. Med: BRAKE cue says BRAKE, not hold; phones tap it: "HOLD TO BRAKE", filling as heldWin grows.
7. Med: ending: Again drops straight into the stand; no credits, no title; the camera rise pushes the pair off and
   Again sits on them; 23.6 s of quote unskippable. End on a cream card (credits, Again, Title); a tap reveals the next
   quote early.
8. Med: stand walk: the passenger passes behind Yash (stacked heads); vanishes at a door that never opens. Route round
   the rear bumper; swing a door open 0.3 s with sfx.door().
9. Med: phone framing: edge pair top-left, passenger half off; Shillong end pushes the pair off with Again on their
   heads; the climb's taxi half off bottom-left. Frame people/taxi on aspect < 1.
10. Low-med: Shillong: the sign-off (2-7 s) overlaps HOLD TO WISH (5 s) and the star (6 s): sign-off at since > .8 or
    T.star 8.
11. Low: title: phones see "H: the horn"; the card hides the stand on a flat checker; says four minutes (it's ~5).
12. Low: console 404s: favicon.ico, jorabat-lit.jpg, shillong-lit/dark.jpg (not painted yet): <link rel=icon
    href="data:,">, and don't fetch art that doesn't exist yet.

Fixed since the first review: rpm, crickets, Shillong engine off, the fall's silence + impact, tear sound, ticks,
limiter, reverb, remembered mute, thenIn, spring camera, frames during the tear, seesaw, door springs, no reflow,
HORN on phones, Jorabat taps, a patient wish, lines queue. Better than pocket.design: the wish hold loop, the truck beat,
the customiser.
