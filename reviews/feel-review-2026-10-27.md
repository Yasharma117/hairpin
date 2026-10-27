# Feel review, 2026-10-27

Six critics (story, art direction, interaction, motion, type and UI, sound) reviewed the live piece from 46 captured frames
and the code. The items marked ✔ were checked against the code or a frame. This is the working list for the rebuild.

## Tier 1

- Sound: ✔ the bed is near-inaudible on phones (46 Hz engine under a 170 Hz lowpass; wind and rain 15 to 20 dB under it).
  ✔ The crickets' gate and chirp swing -1..1, so they never close: a constant 4.7 kHz whine (index.html).
  ✔ Shillong loads with no engine, so "Turn the engine off" turns nothing off. The fall gets one creak: no silence, no
  distant impact. Hold (faster, brake) changes nothing you hear.
- Phones: the dashboard: a tap on an object after 8.5 s leaves the scene. The horn is H only. The wish prompt is 13 px
  over the city lights and the window is 3.4 s; missing it makes the last line ("This one, I'm keeping") false.
- ✔ The flashback picture is in at 22 s; "The car went over" is at 26 s (`T.thenIn` in 08-edge-scene).
- Light and figures: ✔ the beam has no falloff and a ruler-straight top edge; the taxi has no contact shadow anywhere.
- Motion: ✔ the outgoing scene freezes for the 780 ms tear (`busy` gates `frame()`); every camera move starts at peak
  speed (`Stage.update` is a first-order chase: make it a critically damped spring).
- Type: the dialogue label resizes while typing; the Shillong quote is smaller than ordinary dialogue.

## Tier 2

- Story (Yash's call): the title card gives away the wish idea; the first half is an interview, the second an elegy;
  ✔ the edge repeats Nongpoh's "every weekend... court".
- Hold is unrewarded: braking only changes the tilt a few degrees; holding to drive faster skips lines; the 46 s seated
  stretch swallows taps.
- Phone framing: the climb's taxi half off the left; Shillong's pair cropped; a flat navy strip under the edge's button.
- UI: four label systems; the action chip wraps on phones.
- Motion: the seesaw rocks like a toy (k 26, c 2.2: try k 12, c 2.6); the doors snap open; subtitles leave 1.6 s to read.
- Sound: no reverb or panning, no limiter, no mute, no narration bus; iOS's silent switch mutes it.

## Protect

Him in ink with the ember; the cooling ticks and the slow rise in Shillong; the torn sheet and the one advance button;
steering the light with its slow return; the horn as a story verb; "Again" changing the dashboard; the stand's push-in;
the truck's light on the lip.
