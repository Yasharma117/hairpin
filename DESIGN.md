# Hairpin — connected road diorama

Visual revision: 31 October 2026. This design applies the [Diorama skill](https://github.com/sloemo01/diorama), version 3.8.0, to an existing interactive story.

## Premise and scope

Drive with Yash from Jorabat to Shillong, discover his work, encounter the memory at the cliff, accept a stranger's lift, and keep a wish for another day. The complete route appears before the journey starts. Each chapter occupies a different part of the same landscape; the camera pulls back and approaches the next stop. “The whole road” pauses the chapter and lets the visitor explore or resume.

The story targets roughly six minutes, with variable time for appearance choices, portfolio browsing, held actions and reading. It is an interactive journey, not a fixed 46-second loop.

## Art direction

- One connected miniature with a fixed three-quarter camera direction. Camera position and framing change only for the requested overview/chapter transitions and responsive fit.
- Cream paper, forest greens, weathered timber, warm plaster and terracotta. A 64-entry presentation palette supplies enough intermediate values for construction, skin, shadows, painted vehicles and blossom.
- A warm key, cool fill, cast shadows and local contact patches establish depth. Evening chapters retain distinct dark values and visible practical lights rather than simply lowering exposure.
- Construction lives on the camera-facing surfaces: roof seams, posts and joints, framed windows, counter contents, roadside barriers, wheel and body details. Details must survive a normal-size screenshot; subpixel clutter does not count.
- Flat ground should read as quiet ground. Dither belongs in tonal transitions; ink explains silhouettes and assemblies without turning the landscape into scribble.
- Every hero prop is grounded by a base, wheel/foot contact and shadow. Camera-facing cutaways expose the workshop and stall contents.
- The taxi, decorated goods truck and personalised sprite cast remain the visual continuity anchors. New scenery supports their scale and acting.

The skill's blank-white-page/no-DOM-copy and stationary-camera defaults are adapted to the user's explicit requirements: cream interface, accessible portfolio, appearance controls, route labels, all-scenes overview and chapter zooms. Its standalone `file://` default is also adapted to this repository's existing HTTP-served ES modules and canvas asset loading. The main story and its input-driven timings are preserved; repeatable QA stills are separate from live playback.

## Seven chapters and visible consequence

| Chapter | Place and detail anchor | Visible action and changed place |
| --- | --- | --- |
| 01 · The stand | Timber chai counter, kettle, cups, stools, road sign and shelter | A named passenger chooses a look, approaches the taxi and boards; the waiting space empties. |
| 02 · Jorabat | Open portfolio workshop/cabinet with five recognisable project objects | The visitor opens project cards and then chooses to drive; the taxi leaves the stop. |
| 03 · The climb | Layered hill, pine branches, stone path and road edge | The taxi follows the bend; holding changes its pace. |
| 04 · Nongpoh | Working fruit counter, pineapple rows and baskets, cloth awning | The taxi passes a roadside livelihood; the conversation turns towards family. |
| 05 · The cloud line | Mountain pass, low cloud and guardrail | The road is swallowed by mist as the drive continues. |
| 06 · The edge | Broken barrier, layered ravine, seated ledge and remembered passenger | Brake, exit, sit, memory, ember, falling taxi, wave and truck boarding form the interruption and rescue. |
| 07 · Shillong | Varied roofs and windows, cherry branches, railing and wish star | The engine stops, the visitor can bank a wish, the ending appears, and a return visit remembers the wish. |

## Cast and motion contract

Yash and the custom passenger are the two hero roles. The vendor, friend, walker and truck driver supply supporting activity; the grandfather is a remembered presence. The custom look and name must survive camera changes.

Idle, walk, wave/flag, sit and boarding/exit poses already exist in the authored sprite system. Grounded travel and readable contact take priority over adding roles. Keep the road in front of each landmark clear; the camera and roof cutaway must leave the actors visible. The ghost should appear with the story's timing, not at the start of the scene.

The edge script's preserved local beats include memory transition at 25–36 seconds, ember at 37 seconds, ghost at 39–41.5 seconds and “Flick the ember” readiness at 46 seconds. Flagging requires 1.2 seconds of holding. In the connected Shillong ending, the star starts fourteen seconds after engine-off; an intentional 0.9-second hold keeps the wish. The action remains available after the star passes, until the end card. These are existing narrative timings, not newly researched mocap measurements.

## Asset and reference decisions

The source inventory contains native Three.js taxi/truck construction, personalised sprite code, paintings and cutouts; no GLB, glTF, FBX or OBJ hero model was found. Kenney Nature Kit and Quaternius Stylized Nature MegaKit were checked as CC0 alternatives. This revision retains the existing authored heroes and extends the native miniature scenery to preserve their silhouettes and palette; no external pack is imported. See [credits](CREDITS.md) and the [research log](refs/SOURCES.md).

The location is an illustrative compression of the route, not a geographic reconstruction. The cliff and portfolio workshop are story staging. Photographic references inform roadside materials, produce display, vegetation and blossom rather than serving as textures.

## Repeatable proof frames

The `still` query is the planned capture mode for this revision. It must finish chapter setup and camera focus, then hold narrative/render clocks still. The paths below are the intended capture contract; their status belongs in `qa/report.json` after browser verification.

| Shot | URL | What must read |
| --- | --- | --- |
| Stand | `/?scene=stand&still` | Construction, faces, grounded taxi, exposed counter and unclipped controls. |
| Projects | `/?scene=jorabat&still` | Cabinet/workbench contents and accessible project controls; roof does not conceal the purpose. |
| Market | `/?scene=nongpoh&still` | Pineapple rows, working stall, awning construction and a readable roadway. |
| Memory | `/?scene=edge&at=seated&t=43&still` | A clear ledge/drop, two seated people and the remembered figure. |
| Wish | `/?scene=shillong&t=10&still` | Varied town silhouette, warm windows, blossom and a visible star. |

Also capture the full overview. Check desktop, tablet landscape and phone framing; inspect 1:1 crops for speckle and halos. Browser console errors, broken assets, geometry validity, shadow contact and native keyboard controls are separate checks. Do not mark a shot passed merely because its chapter imported.

## Findings from verification

- Side-facing walking uses eight frames while front/back walking uses four. A turn must transfer elapsed cycle time instead of retaining the old frame index. The boarding check exposed this crash; 8,000 near/far turning updates now pass.
- Palette grading must leave empty paper unchanged. Removing the world vignette and preserving the clear colour removed visible bands outside the landscape; desktop and phone overview shots verify the result.
- The shooting star needs to fit the focused camera. Its foreground arc and emissive core are visible in the Shillong still at ten seconds; a high world-space position had put it above the frame.


## Motion and Shillong revision — 1 November 2026

The earlier still-led visual pass missed spatial defects. The cliff is now an actual nine-metre opening in the terrain, with a shared lip, fall axis and safe projecting seat ledge. The taxi approaches and falls at that exact lip without resetting heading or rolling sideways. Solid scenery occludes sprites and vehicle outlines correctly. The climb and market sets sit back from the road; 123 sampled taxi poses clear their actual triangles.

All six chapter changes carry the same vehicle along the connecting road. The camera pulls back for 0.95 seconds, follows a visible car or truck for roughly 4.4–6.8 seconds depending on the distance, then approaches the destination for 0.95 seconds. Position and shortest-angle heading stay continuous at both boundaries. Doors close before departure. The original opening overview and visitor-controlled whole-road view remain.

Shillong now has a separate supported bench clear of the truck. After engine-off, the two travellers exit and walk to it. At six seconds, the miniature dissolves over 2.5 seconds into a full-screen Three.js night overlook. Branching cherry blossom and fluttering, petal-shaped foreground particles frame a valley of roofs, warm windows, roads and mountain silhouettes. Static construction is batched by material. The camera settles by ten seconds, holds the view until fourteen, then a luminous star crosses the open right-hand sky. Holding still banks the wish; the quote follows the star. The full-screen reveal and its camera are explicit adaptations of the diorama skill to the user's request for a more expansive ending.

The skyline uses the same personalised cast and native geometry rather than a separate stock painting. Phone composition shifts the camera to retain both complete travellers; the star arc is composed in camera space so that its size, framing and clear sightline survive portrait screens. The whole-road control returns to the miniature and resumes the overlook when closed.

`qa/report.json` distinguishes browser recordings, actual-world geometry tests and visual checks. Recordings and contact sheets live in `../outputs/motion-audit/`. No still is treated as proof of a complete moving sequence.


## Interaction and interface revision — 1 November 2026

The user's latest review narrowed the remaining work to the truck signal, the blossom/wish interaction, a more recognisable Shillong view, and UI cues from [8bityash.vercel.app](https://8bityash.vercel.app/). The opening now invites Pocket FM into a personal story from the hills of Northeast India. Glossy dark primary pills, silver secondary controls, fine-bordered cards and a numbered chapter rail take their cues from the reference homepage and its Search case-study sidebar. The phone rail is an explicit toggle with all seven stops, rather than an always-open contents panel.

The truck beat keeps both people on the same safe verge. A short wave builds visible progress and drains if released. A full wave, or the explicit Wave to the driver button, produces a horn/headlight acknowledgement and a continuous 2.4-second brake. Driver dialogue and the invitation to board follow the stop. The phase bridge exposes the acknowledgement and braking progress instead of teleporting from an approach pose to a stopped pose.

`shared/overlook.js` owns the connected ending's actual UI, input and narrative clock; the old painted Shillong implementation remains available to its standalone page. It passes normalised pointer and breeze state to the skyline. Brushing the canvas curls nearby petals and gently sways the tree, without banking a wish. Keeping a wish requires the dedicated hold control or Space for 0.9 seconds, with a visible ring, one confirmation and one short petal release. The hold remains available after the star crosses so that exploration and reading cannot silently miss the action. The quiet reveal and sequential ending quote remain.

A November caption identifies Cherry Blossom Festival season and its autumn bloom. The city is an irregular hillside composition with gabled corrugated roofs, timber details, verandahs, side glazing, winding roads and the blue cathedral as a recognisable accent. Five-petal blossom clusters replace the old pink balls. Falling petals are slender curved blades, never hearts or symbols. See `refs/SHILLONG-CITY.md` for the photograph and architectural sources actually consulted.

The latest browser checks exercised the wave button, a held wave, braking, boarding, canvas brushing, a late wish hold, the phone wish hold at normal playback speed, and expansion/collapse of all seven phone chapter links. Machine checks cover continuous truck motion, the safe verge, real pointer-driven instance changes, deterministic frozen frames, a single wish pulse, intentional versus accidental input, current skyline bounds and clear star sightlines. These checks describe their scope; they are not a claim of exhaustive collision detection or a general device-performance benchmark.


## Home landscape revision — 1 November 2026

The home page now has one main action, Begin the drive; its Chapters drawer is removed. Numbered map markers and the in-story chapter rail remain. The landscape fits a measured rectangle below the introduction on narrow screens and to its right on wide screens. Its camera rotates horizontally and vertically on drag, eases to a stop after release, and has a Reset view control. Story cameras keep their authored direction. The overview's free camera is an explicit adaptation to the user's request.

A continuous stratified earth volume extends from the grass cap to −13.3 m. Its upper rings preserve the canyon opening; a separate lower foundation supports the river below −9.11 m. The soft page shadow sits underneath the earth instead of intersecting it. Gorge walls are backed wedges with embedded rock plates, fracture seams and low talus. Wet stone anchors a small cascade at the open western end.

The river is a teal physical surface with actual wave deformation, drifting ripple ribbons, falling streaks and droplets. Four native modelled birds follow deterministic flight paths with banking and wing beats. The overview's opening angle exposes the gorge and water; dragging reveals the earth's other faces.

Current proof images are in `../outputs/home-diorama/`, separate from the earlier chapter recordings. Automated checks cover actual earth/cliff projection into the reserved home rectangle at 36 camera angles per layout, three viewport layouts, continuous orbit and chapter entry, closed earth volume, clear canyon opening, moving water and bird trajectories. Native browser checks cover drag, reset, Begin the drive, a phone map marker and the 390 × 844 / 1280 × 720 layouts. These are scoped checks, not a claim of exhaustive visual or collision coverage.


## River finish revision — 1 November 2026

The river now follows a winding, variable-width channel inside the existing nine-metre gorge. Sloping gravel shoulders, half-buried stones and seven exposed stream boulders replace the flat full-floor water polygon. The western canyon mouth opens more broadly without moving the cliff fall line or the service road. A lighter gravel bed avoids the previous near-black ditch.

Physical water receives a procedural sky reflection, shallow-to-deep turquoise vertex colours and two intersecting wave trains. Thirty tapered foam/reflection lines travel downstream; small eddies stay around boulders. The waterfall joins the actual outlet, curves outward under gravity, narrows slightly, and breaks into translucent striations and falling droplets near the bottom of the earth cutout. All geometry and effects are functions of absolute time. The world palette contains dedicated teal values so water retains its colour through the finish pass.

`qa/river-report.json` checks the channel against the ravine footprint, variable width and winding, the surface-to-fall join, downstream foam, falling streaks and repeatable geometry. Existing earth, orbit framing, vehicle travel and actual scene-clearance checks also pass. Current native browser proof images are in `../outputs/river-finish/`.
