# Diorama revision — research log

Researched 31 October 2026. Reference photographs are for observation, not imported geometry or textures. This is an existing interactive story: its authored script and motion timings remain the narrative specification.

## Location and material references

| Question | Primary source checked | Found / access | Design decision |
| --- | --- | --- | --- |
| What gives a Nongpoh pineapple stall a local, working character? | [Jeemol Unni, firsthand Ri-Bhoi field trip, March 2026](https://jeemolunni.com/2026/03/12/empowering-women-entrepreneurs-in-meghalaya/) | Two original photographs were inspected through the browser after the text reader could not fetch them: [vendor / img_4185.jpg](https://jeemolunni.com/wp-content/uploads/2026/03/img_4185.jpg?w=768), [fruit rows / img_4184.jpg](https://jeemolunni.com/wp-content/uploads/2026/03/img_4184.jpg?w=1024). Rough timber, diagonal braces, a bamboo/slatted roof, covered stepped produce racks, hanging banana bunches and a nearby highway barrier are visible. | Use stepped pineapple rows, a covered preparation counter, hanging produce and a braced shelter. Keep fruit and vendor at human scale. |
| A second original view of the roadside market? | [Nampui, “Roadside Vendors”, photographed 23 November 2010](https://www.flickr.com/photos/50206039@N08/5930437977) | The photographer's indexed page identifies fruit/vegetable vendors at Nongpoh. Full page fetch returned a cache miss. | Corroborates the roadside market subject. Reference identified, not used as a detailed geometry specification or asset. |
| What landscape cues belong to the Khasi stretch? | [Meghalaya Tourism, Landscapes and Scenic Routes](https://www.meghalayatourism.in/wp-content/uploads/2020/09/Landscapes-and-Scenic-Routes.pdf) and [current official site](https://www.meghalayatourism.in/) | The indexed official itinerary describes highland meadows and pine groves. The legacy PDF now resolves to the current site, whose Khasi Hills image remains available through its district section. | Mix pines, meadow contours, exposed stone and winding roads; avoid a uniform conifer plantation. The miniature is a narrative route compression. |
| What supports Shillong's blossom ending? | [Incredible India / Ministry of Tourism, Ward's Lake](https://www.incredibleindia.gov.in/en/meghalaya/shillong/wards-lake) | The [official photograph](https://s7ap1.scene7.com/is/image/incredibleindia/wards-lake-shillong-meghalaya-attr-about?qlt=82&ts=1742167411117) was inspected in the browser: mature pines, whitewashed trunk bases, curved pale paths, a low curb and layered flower beds. This photograph is green-season, not a blossom photograph; autumn cherry bloom is supported by the accompanying official text. | Use branched trees and grounded stone/rail details with human-scale town edges. Pink blossom follows the authored autumn ending and official text. The scene is a city viewpoint, not a model of Ward's Lake. |
| Is the Nongpoh fruit association independently supported? | [Meghalaya Basin Management Agency, In Conversation with People of Meghalaya, Vol. 7](https://www.mbma.org.in/static/f4548ecd26665abb5584dabcd367f3fc/InConversation-vol-7-MLAMP.pdf) | A firsthand farmer account identifies Nongpoh as a pineapple market. | Retain the authored pineapple stop instead of substituting a generic cafe. |

Three primary photographs were visually inspected: the field-trip vendor, the field-trip fruit rows and the official Ward's Lake image. Nampui's separate market photograph remains an additional identified lead whose full page could not be read. Photographs are linked rather than downloaded into application assets. These are material/staging observations, not a measured frame-by-frame motion study.

## Asset sourcing ladder

| Asset | Search / inventory | Found | Decision |
| --- | --- | --- | --- |
| Taxi and rescue truck | Repository `shared/kit.js`, chapter assets and `source-art/`; searched for GLB/glTF/FBX/OBJ files | Native vehicle assemblies already include livery, wheels, glass, lamps, trim and truck artwork. No external hero model file found. | Retain and ground the authored vehicles; improve their presentation, contact and staging. |
| Personalised cast | `shared/folk.js`, `tools/folk-sheet.html`, original sprite source art | Existing looks, faces, clothing, walk, sit, flag, driver and remembered-person poses. | Retain the personalised sprite cast; changing to a generic external rig would break continuity. |
| Trees and rock scenery | [Kenney Nature Kit](https://kenney.nl/assets/nature-kit) | Creator's page lists a 3D pack of 330 assets under CC0. | Checked, not imported. Extend the existing native scenery and keep one palette/material language. |
| Richer nature options | [Quaternius Stylized Nature MegaKit](https://quaternius.com/packs/stylizednaturemegakit.html) | Creator's page lists CC0 models, including trees, plants and rocks; free and paid source tiers differ. | Checked, not imported. No downloaded model is claimed or credited as bundled. |
| Lighting/detail/presentation | [sloemo01/diorama](https://github.com/sloemo01/diorama), installed local `SKILL.md` and templates | MIT playbook and copy-in lighting, geometry, camera and post templates. | Apply the detail/shadow/contact/verification principles within the existing renderer and requested chapter camera system. |

## Motion and capture specification

This revision does not replace narrative choreography or introduce a new loop. Existing authored code is the primary motion source: approach → board; drive → brake → exit → sit; ember → drop → flag → lift; engine-off → star → held wish → ending.

Known local story beats: edge memory transition 25–36 s, ember 37 s, ghost 39–41.5 s, flick readiness 46 s; truck flag hold 1.2 s. Shillong star begins at 8 s after engine-off; bank hold 0.6 s. No new external motion clip was imported or measured.

The parent implementation supplies a `still` capture query. The five shot URLs and pass criteria are in `DESIGN.md`; `qa/report.json` starts pending until actual browser captures and console checks are recorded. Repeatable frames must be inspected at 1:1 before accepting the revised finish.


## Opening, controls and festival context — 1 November 2026

- User-supplied UI reference: https://8bityash.vercel.app/ and the inspected case study https://8bityash.vercel.app/projects/search. Observed glossy black pill buttons with silver edging, a narrow numbered section rail, an inset active item and fine-bordered cards. The local implementation adapts those cues; no image or page asset from the reference was imported.
- Ministry of Tourism, Government of India: https://utsav.gov.in/public/view-event/cherry-blossom-festival-1 describes the festival during Shillong's autumn flowering.
- Meghalaya Tourism's official event listing https://www.meghalayatourism.in/mobilepage/ places the 2026 Cherry Blossom Festival in November. The story uses seasonal context rather than current ticketing or event dates.
- City photography and architecture sources are recorded separately in SHILLONG-CITY.md.
