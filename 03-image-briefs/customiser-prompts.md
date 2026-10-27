# Hairpin · the passenger customiser: image prompts

The opening scene is no longer a crowd of 18 teammates. It is the Jorabat stop with two people: **you** (the driver, fixed), leaning on the taxi, and **the passenger**, whom the viewer builds: build (female or male), hair, top and accessory. Skin tone is a slider in code, so it is not generated.

The passenger appears twice in the piece:

- **standing** at Jorabat (the customiser itself)
- **sitting from behind** at the edge and in Shillong

So every passenger image comes in two poses: `-stand` and `-sit`.

## How it works (read once)

- **Paper doll.** Each build has one plain **base** figure. Every option is an **edit of that base** that changes one thing only. I compare each edit with its base and cut out just the changed pixels as a layer. That only works if the pose, framing and canvas stay identical, so **if an edit moves the body or changes the face, regenerate it.**
- **Attach to every generation:** `source-art/edge-lit.png` (the house style) and `source-art/then-pair.png` (the figure style). For your own figures, also attach 2–3 photos of yourself.
- **Lit versions only.** I make the night versions from the Jorabat and edge paintings, as I did for the dog.
- **Canvas:** portrait 1024×1536, transparent PNG.
- **Send them back** in the chat, named as listed, in any order. Originals go to `source-art/` and processed ones to `people/`.

## Checklist

★ = the minimum set to get the customiser working. Do these first.

| # | File | Attach | |
|---|---|---|---|
| 1 | `you-stand.png` | style refs + your photos | ★ |
| 2 | `you-sit.png` | style refs + #1 | ★ |
| 3 | `p-f-base-stand.png` | style refs + #1 | ★ |
| 4 | `p-f-base-sit.png` | style refs + #2 + #3 | ★ |
| 5 | `p-m-base-stand.png` | style refs + #1 + #3 | ★ |
| 6 | `p-m-base-sit.png` | style refs + #2 + #5 | ★ |
| 7+ | option edits (section 5) | the matching base only | 11 options × 2 builds × 2 poses = 44 edits (★ subset = 20) |

---

## 0 · Style block

Paste this once at the start of a fresh ChatGPT conversation. Every prompt below starts with `[style block]`; paste this text in its place if you're working in a new chat.

```
STYLE FOR THIS WHOLE SESSION (figures): One single full-body human figure on a fully transparent background (PNG with alpha). Nothing else in the image: no ground, no cast shadow, no glow, no halo, no rim light, no border, no text. Painted to match the attached references exactly: hand-painted gouache/oil look, visible directional brush strokes and bristle texture, simplified chunky shapes, strong readable silhouette, warm colours as if caught in yellow-white headlights at night, and a thin, slightly broken black ink outline around the silhouette and the main inner shapes. Realistic adult proportions, not cartoon, not chibi, not anime, not 3D. Portrait canvas 1024×1536. Whole figure inside the frame with a small margin, nothing cropped. Feet (or seat) resting on the same baseline at 94% of the image height.
```

---

## 1 · You, standing at the taxi → `you-stand.png` ★

Attach: edge-lit, then-pair, your photos.

```
[style block]
FIGURE: The man in the attached photos: same face, hair, beard, glasses (if any) and build, as the taxi driver for a night drive in Meghalaya. Late 20s. Standing, side view facing LEFT, weight on the back leg, one hand resting on something at hip height to his left (he is leaning on a car roof, which is not drawn), the other hand in his jacket pocket. Relaxed, a slight half-smile, looking left toward someone arriving. Clothes: a dark olive or charcoal zip jacket over a plain tee, dark jeans, worn sneakers, a thin wool muffler loosely around the neck (it is cold in the hills). Figure fills about 85% of the image height.
```

## 2 · You, sitting at the edge, from behind → `you-sit.png` ★

Attach: edge-lit, then-pair, result of #1.

```
[style block]
FIGURE: The SAME man as the attached standing figure (same hair, jacket, muffler and build), now seen from directly BEHIND, sitting on the ground at the edge of a cliff with his legs hanging over the drop (the legs go down out of view; the cliff is not drawn). Shoulders slightly hunched against the cold, elbows resting on his knees, head turned a little to his RIGHT as if listening to someone beside him. We see the back of his head, the jacket and the muffler. Cut the figure cleanly along a straight horizontal line at the hips; that line is the bottom of the figure. Figure fills about 70% of the image height.
```

---

## 3 · Passenger base, female, standing → `p-f-base-stand.png` ★

Attach: edge-lit, then-pair, result of #1 (for scale).

```
[style block]
FIGURE: A plain "base" woman for a character customiser. She will be dressed later by edits, so keep everything simple and neutral. About 25 years old, Indian, slim average build. Standing in a relaxed neutral pose: side view facing LEFT, turned three-quarters toward the viewer, arms down at the sides, hands open and relaxed, both feet flat, feet slightly apart. Neutral, friendly expression, looking left. Hair: black, pulled back tightly and flat against the head (no volume, no loose strands), so other hairstyles can be painted over it. Clothes: a plain fitted mid-grey crew-neck t-shirt, plain dark navy straight trousers, plain dark flat shoes. No accessories, no jewellery, no bindi, no logos, no bag. Medium skin tone, evenly lit, so it can be recoloured. Same scale as the attached man: standing on the same baseline, the top of her head about 7% of the image height lower than his.
```

## 4 · Passenger base, female, sitting from behind → `p-f-base-sit.png` ★

Attach: edge-lit, then-pair, result of #2, result of #3.

```
[style block]
FIGURE: The SAME woman as the attached base figure (same tied-back hair, same grey t-shirt, same build), now seen from directly BEHIND, sitting on the ground at a cliff edge exactly like the attached sitting man: same scale, same seat line, same camera angle, legs hanging over the drop out of view. Hands resting beside her on the ground. Head turned slightly to her LEFT, toward the man beside her. Cut the figure cleanly along a straight horizontal line at the hips.
```

## 5a · Passenger base, male, standing → `p-m-base-stand.png` ★

Attach: edge-lit, then-pair, result of #1, result of #3 (so the two bases match in pose and style).

```
[style block]
FIGURE: A plain "base" man for a character customiser, the male counterpart of the attached base woman. He will be dressed later by edits, so keep everything simple and neutral. About 25 years old, Indian, slim average build. EXACTLY the same pose, angle, framing and position in the image as the attached base woman: side view facing LEFT, turned three-quarters toward the viewer, arms down at the sides, hands open, both feet flat. Neutral, friendly expression, looking left. Hair: black, buzzed very short and close to the head, so other hairstyles can be painted over it. Clean-shaven. Clothes: the same plain fitted mid-grey crew-neck t-shirt, plain dark navy straight trousers and plain dark shoes as the woman. No accessories, no jewellery, no logos, no bag. Medium skin tone, evenly lit. Same scale as the attached driver: standing on the same baseline, the top of his head about 2% of the image height lower than the driver's.
```

## 6 · Passenger base, male, sitting from behind → `p-m-base-sit.png` ★

Attach: edge-lit, then-pair, result of #2, result of #5a.

```
[style block]
FIGURE: The SAME man as the attached base figure (same buzzed hair, same grey t-shirt, same build), now seen from directly BEHIND, sitting on the ground at a cliff edge exactly like the attached sitting driver: same scale, same seat line, same camera angle, legs hanging over the drop out of view. Hands resting beside him on the ground. Head turned slightly to his LEFT, toward the man beside him. Cut the figure cleanly along a straight horizontal line at the hips.
```

---

## 5 · Option edits

Run every option on **all four bases**, attaching **only that one base** each time:

- `p-f-base-stand`
- `p-f-base-sit`
- `p-m-base-stand`
- `p-m-base-sit`

Name each result `p-<f|m>-<group>-<option>-<stand|sit>.png`, for example `p-f-hair-long-sit.png`.

### Edit template (fill in the CHANGE line)

```
Attached is a character-customiser base figure. Make ONE edit and nothing else. Keep the person, pose, face, body, framing, canvas size, position in the image, painting style, ink outline and transparent background IDENTICAL, pixel-aligned with the original. Every pixel that is not part of the change must stay exactly as it is.
CHANGE: <option text>
Paint the change in the same gouache style, the same warm headlight colours and the same thin, slightly broken black ink outline. Do not add a background, a shadow or anything else.
```

On the **sit** (from behind) bases, the edit only needs to show what you would see from behind: the back of the hair, the back of the top, the strap of the headphones and so on.

### Hair · group `hair`

| Option | CHANGE text | |
|---|---|---|
| `short` | Give them a short, textured, slightly messy black haircut. | ★ |
| `long` | Give them long, straight black hair falling past the shoulders. | ★ |
| `bun` | Give them black hair pulled up into a loose bun on top of the head, with a few loose strands. | |
| `curly` | Give them shoulder-length dark-brown curly hair with volume. | |

### Top · group `top`

| Option | CHANGE text | |
|---|---|---|
| `hoodie` | Replace the t-shirt with an oversized dusty-red hoodie, hood down. | ★ |
| `kurta` | Replace the t-shirt with a plain off-white cotton kurta reaching mid-thigh. | ★ |
| `jacket` | Replace the t-shirt with a dark denim jacket worn open over a white tee. | |
| `shawl` | Keep the t-shirt and add a traditional Khasi-style checked shawl in maroon and cream, wrapped over the shoulders. | |

### Accessory · group `acc`

| Option | CHANGE text | |
|---|---|---|
| `headphones` | Add a pair of over-ear headphones resting around the neck, dark grey with an amber accent. | ★ |
| `glasses` | Add thin, round, metal-framed glasses. | |
| `muffler` | Add a thick knitted mustard muffler wrapped once around the neck. | |

**Counts:**

- **Minimum set (★):** 6 base images + 5 options × 4 bases = **26 images**.
- **Full set:** 6 + 11 × 4 = **50 images**.

---

## Common problems

- **The edit changed the face or the pose:** regenerate it. Don't try to fix it with another edit.
- **The background came back white:** ask "same image, transparent background, PNG".
- **The hair edit also changed the t-shirt colour:** regenerate. Each edit must touch one thing only.
- **The two bases don't line up:** regenerate #5a with #3 attached and stress "exactly the same pose, angle and framing".
