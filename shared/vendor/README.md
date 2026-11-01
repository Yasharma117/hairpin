# Bundled runtime assets

These files are served locally so the experience does not require Three.js or font CDNs at startup.

- `three.module.js`: Three.js **0.160.0**, unchanged ES module from the official npm package, downloaded through jsDelivr: https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js. MIT license in `THREE-LICENSE.txt` (from the same package).
- `fonts/YoungSerif-Regular.ttf`: original Google Fonts file, https://github.com/google/fonts/tree/main/ofl/youngserif. SIL Open Font License in `fonts/YoungSerif-OFL.txt`.
- `fonts/Newsreader-Variable.ttf` and `fonts/Newsreader-Italic-Variable.ttf`: original files from https://github.com/google/fonts/tree/main/ofl/newsreader, renamed locally for simple paths. Axes: optical size 6–72, weight 200–800. SIL Open Font License in `fonts/Newsreader-OFL.txt`.
- `fonts/VT323-Regular.ttf`: original Google Fonts file, https://github.com/google/fonts/tree/main/ofl/vt323. SIL Open Font License in `fonts/VT323-OFL.txt`.

Downloaded October 30, 2026. `checksums.sha256` records the exact bundled bytes. No font outlines or library source were modified.

Application entry points should use `./shared/fonts.css` and map the `three` import to `./shared/vendor/three.module.js`.
