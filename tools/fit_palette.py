"""Fit one pixel-art palette per scene (PIXEL.md section 1), in Oklab (chroma weighed double), and write it into shared/style.js.

    python3 tools/fit_palette.py            # rewrites only the PIXEL_PALETTES block at the end of shared/style.js

Per scene: k-means in Oklab over the scene's lit and dark paintings AFTER its grade (the final pass grades, then
quantizes), plus the half-way blend of the two (the headlight pools mix them), plus the shared people ramps (skin tones
in light, mid and shadow). The UI's key colours (ink, paper, amber, the taxi's roof) are always in; the ember orange only
where something burns or glows that hot (not climb, stand, edge: there it lands as hot spots on cows and rock). Folk sprites
skip the palette (shared/kit.js Ink.PIXEL_ART_LAYER), so their ramps don't need slots here.
Shillong has no painting yet: its samples are the code-drawn placeholder and blossom swatches in style.js.
"""
import json, os, re
import numpy as np
from PIL import Image
from fit_grade import ROOT, SCENES, load, grade

N = 32                      # colours per scene
CHROMA = 2.                 # Oklab a, b weighed this much more than lightness (fit and shader alike): keeps hues apart
W = np.array([1, CHROMA, CHROMA])
STYLE = os.path.join(ROOT, 'shared/style.js')
BEGIN, END = '// ---- PIXEL_PALETTES: written by tools/fit_palette.py, do not edit by hand ----', '// ---- end PIXEL_PALETTES ----'
EXTRA = {'edge': ['08-edge-scene/edge-then.jpg']}   # other paintings a scene shows
src = open(STYLE).read()
HEX = lambda s: re.findall(r"'(#[0-9a-fA-F]{6})'", s)
rgb = lambda hs: np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in hs], np.float32) / 255


def block(name):   # the source text of `export const NAME = {...};` in style.js
    i = src.index(f'export const {name} ='); return src[i:src.index('};', i)]


def pal(key): return rgb([re.search(rf"\b{key}: '(#\w{{6}})'", block('PALETTE')).group(1)])[0]


FIXED = np.array([pal('ink'), pal('paper'), pal('amber'), rgb([re.search(r"roof: '(#\w{6})'", block('LIVERY')).group(1)])[0], pal('ember')])
NO_EMBER = {'climb', 'stand', 'edge'}   # FIXED minus its last entry
SKIN = rgb(HEX(block('SKIN_TONES')))
PEOPLE = np.concatenate([SKIN, SKIN * .62, SKIN * .38])   # each skin tone in light, mid and shadow


def to_lab(c):
    c = np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
    lms = c @ np.array([[.4122214708, .5363325363, .0514459929], [.2119034982, .6806995451, .1073969566], [.0883024619, .2817188376, .6299787005]]).T
    return np.cbrt(lms) @ np.array([[.2104542553, .7936177850, -.0040720468], [1.9779984951, -2.4285922050, .4505937099], [.0259040371, .7827717662, -.8086757660]]).T


def from_lab(L):
    lms = (L @ np.array([[1, .3963377774, .2158037573], [1, -.1055613458, -.0638541728], [1, -.0894841775, -1.2914855480]]).T) ** 3
    c = np.clip(lms @ np.array([[4.0767416621, -3.3077115913, .2309699292], [-1.2684380046, 2.6097574011, -.3413193965], [-.0041960863, -.7034186147, 1.7076147010]]).T, 0, 1)
    return np.where(c <= .0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - .055)


def kmeans(x, fixed, k, iters=30):
    """k-means in Oklab with some centres pinned (assigned to, never moved). k-means++ seeding, deterministic."""
    rng = np.random.default_rng(0)
    c = list(fixed)
    while len(c) < k:
        d = ((x[:, None] - np.array(c)[None]) ** 2).sum(-1).min(1)
        c.append(x[rng.choice(len(x), p=d / d.sum())])
    c = np.array(c)
    for _ in range(iters):
        a = ((x[:, None] - c[None]) ** 2).sum(-1).argmin(1)
        for j in range(len(fixed), k):
            if (a == j).any(): c[j] = x[a == j].mean(0)
    return c


def warm_lift(d):   # 13-the-stand's stand-in for the lit painting, as its scene.js makes it
    l = d.mean(1, keepdims=True)
    return np.clip(d * [1.5, 1.6, .9] + l * [1.3, .9, .2], 0, 1)


def samples(name, lit, dark):
    if name == 'shillong':   # the placeholder painting and the blossom, lit and dark, and their blends
        sh, bl = block('SHILLONG_PLACEHOLDER'), block('BLOSSOM')
        pairs = [(rgb(HEX(m[0])), rgb(HEX(m[1]))) for m in re.findall(r"\[\[([^\]]*)\], \[([^\]]*)\]\]", sh)]
        pairs.append((rgb(HEX(re.search(r'lit: \[([^\]]*)', bl).group(1))), rgb(HEX(re.search(r'dark: \[([^\]]*)', bl).group(1)))))
        s = [rgb(HEX(sh + bl))] + [a * t + b * (1 - t) for a, b in pairs for t in (.25, .5, .75)]
        return np.repeat(np.concatenate(s), 200, 0)
    g = np.array(json.loads(re.search(rf'"{name}": (\[[^\]]*\])', open(os.path.join(ROOT, 'shared/grade.js')).read()).group(1)))
    D = load(dark)
    L = load(lit) if lit else warm_lift(D)    # same seed and size: load() picks the same pixels, so L and D line up
    s = [grade(L, g), grade(D, g), grade((L + D) / 2, g)] + [grade(load(p), g) for p in EXTRA.get(name, [])]
    return np.concatenate(s)


if __name__ == '__main__':
    out = {}
    for name, (lit, dark) in SCENES.items():
        x = samples(name, lit, dark)
        x = np.concatenate([x, np.repeat(PEOPLE, max(1, len(x) // 400), 0)])   # the people ramps: about 4% of the weight
        fixed = FIXED[:-1] if name in NO_EMBER else FIXED
        c = from_lab(kmeans(to_lab(x) * W, to_lab(fixed) * W, N) / W)
        c = c[np.argsort(to_lab(c)[:, 0])]   # dark to light
        out[name] = ['#%02x%02x%02x' % tuple(v) for v in np.round(c * 255).astype(int)]
        print(f'{name:9s}', ' '.join(out[name]))
    js = BEGIN + '\n// Per scene, dark to light, fitted in Oklab to its graded paintings (PIXEL.md 1). The final pass in shared/kit.js\n' \
        '// quantizes every frame to its scene\'s set, with a light 4x4 ordered dither in gradients.\n' \
        'export const PIXEL_PALETTES = {\n' + ''.join(f"  {k}: [{', '.join(repr(h) for h in v)}],\n" for k, v in out.items()) + '};\n' + END + '\n'
    src = open(STYLE).read()   # re-read: other hands edit this file too
    src = src[:src.index(BEGIN)] + js + src[src.index(END) + len(END) + 1:] if BEGIN in src else src.rstrip('\n') + '\n\n' + js
    open(STYLE, 'w').write(src)
    print('wrote the PIXEL_PALETTES block in shared/style.js')
