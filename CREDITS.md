# Credits and provenance

## Existing Hairpin material

Story, portfolio content, characters and original project assets come from [Yasharma117/hairpin](https://github.com/Yasharma117/hairpin), developed here from the `pixel` branch. `shared/kit.js` contains the authored taxi and decorated goods truck; `shared/folk.js` contains the personalised sprite cast. `source-art/` and the chapter folders retain the original paintings and cutouts. This document does not assign a new licence to the user's original material.

The local connected-world revision adds native Three.js scenery in `shared/landmarks.js` and the shared world in `shared/world.js`. Photographs listed in `refs/SOURCES.md` are research references only; no source photograph is used as an application texture or bundled into the scene.

`09-shillong/shillong-view.png` was generated during the preceding local finishing pass as an original night-view painting. The connected-world presentation uses geometric scenery; the image remains an asset of the older chapter implementation.

## Diorama skill

[Diorama](https://github.com/sloemo01/diorama), by Nehal Kanak / sloemo, version 3.8.0, MIT licence. The installed skill and templates inform the detail, camera, contact-shadow, lighting, palette and verification work. The post-processing, construction and lighting recipes are adapted to the existing Hairpin renderer. The accompanying MIT notice is included in [shared/vendor/DIORAMA-LICENSE.txt](shared/vendor/DIORAMA-LICENSE.txt).

## Runtime and fonts

Three.js 0.160.0 is MIT licensed. Young Serif, Newsreader and VT323 are distributed under the SIL Open Font License. Original licence files, download provenance and checksums are included under `shared/vendor/`; see [vendor README](shared/vendor/README.md).

## Music

Existing music is by Blue Dot Sessions, CC BY-NC 4.0, with track sources and processing details in [audio/CREDITS.md](audio/CREDITS.md). This visual revision does not import additional music or change those credits.

## Asset packs checked, not imported

- [Kenney Nature Kit](https://kenney.nl/assets/nature-kit), CC0: checked as a foliage/rock source.
- [Quaternius Stylized Nature MegaKit](https://quaternius.com/packs/stylizednaturemegakit.html), CC0: checked as a nature source.

No model or texture from either pack is bundled in this revision. Their general-purpose nature silhouettes did not justify replacing the existing custom world and cast during this finishing pass.
