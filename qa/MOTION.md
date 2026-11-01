# Motion and ending verification

Run from this folder's parent with Node 24 or later:

```sh
node tools/check-motion.mjs
node tools/check-world-motion.mjs
node tools/check-scene-clearance.mjs
node tools/check-skyline.mjs
node tools/check-truck-flag.mjs
node tools/check-petals.mjs
node tools/check-overlook.mjs
```

The world checks load the actual Three.js geometry and use a lightweight canvas fixture for sprite construction. Skyline checks also load the actual Shillong chapter to verify its state bridge. These do not replace browser visual review.

The local browser pass completed stand → projects → climb → Nongpoh → cloud → edge → rescue → Shillong, with zero parked movement, unintended fall yaw, or roll in the visible audit. It separately exercised the normal-speed boarding and road journey, the normal-speed fall, the night reveal, native hold-to-wish, and the final Again/Title controls. Desktop 1280×720 and phone 390×844 compositions were inspected. See report.json and the adjacent machine-readable reports for scope and limits.

Actual playback evidence is in ../../outputs/motion-audit/: continuous-road.gif, cliff-fall.gif, shillong-reveal.gif, full-journey-trace.json, and the three contact sheets. The Shillong recording starts at engine-off time 5.9 seconds, just before the reveal; screenshot capture can affect cadence. Appearance and motion were inspected from those recorded frames, not inferred solely from import success.


The interaction revision adds source-level and native browser evidence for a deliberate wave, acknowledgement and 2.4-second brake; safe verge positions; actual per-instance petal displacement under pointer gestures; no wish from canvas brushing; a cancelled wish hold; one committed wish from button or keyboard; and a wish after the star has passed. The phone test uses the live control at normal playback speed and confirms “Your wish is kept.” The phone rail expands to seven stops and collapses to its 48px toggle. See `truck-flag-browser.json`, `petal-interaction-report.json`, `overlook-interactions-report.json` and `../../outputs/interaction-polish/`.

The current interaction/city revision is recorded in `../../outputs/interaction-polish/shillong-petals.gif` and `browser-checks.json`, with the complete latest-route audit in `full-journey-e.json`. Earlier GIFs in `motion-audit/` remain historical evidence and show the superseded skyline and petal design.
