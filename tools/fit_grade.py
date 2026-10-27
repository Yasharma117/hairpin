"""Fit one colour grade per scene, so each scene's paintings sit close to the edge painting, the house style.

    python3 tools/fit_grade.py            # writes shared/grade.js

For each scene, a grade per channel (lift, gamma, gain) plus a saturation is fitted so that the quantiles of the
scene's lit AND dark paintings, after the grade, land near those of edge-lit and edge-dark. One grade covers both,
because the frame is always a mix of the two. The fit is then pulled part of the way back toward no grade at all
(STRENGTH): the aim is for the scenes to belong together, not to make every place the same colour.

The grade is the same function as the final pass in shared/kit.js:
    c = lift + (gain - lift) * c ** gamma;  then saturation around luminance.
"""
import json, os
import numpy as np
from PIL import Image
from scipy.optimize import minimize

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = ('08-edge-scene/edge-lit.jpg', '08-edge-scene/edge-dark.jpg')
# scene name in index.html -> its painting pair (lit, dark). None: no pair on disk (graded as-is).
SCENES = {
    'stand': (None, '13-the-stand/jorabat-dark.jpg'),   # the lit painting is still a warm lift of the dark one, in code
    'jorabat': ('10-jorabat-intro/dashboard-lit.jpg', '10-jorabat-intro/dashboard-dark.jpg'),
    'climb': ('01-cloud-line-scene/lit.jpg', '01-cloud-line-scene/dark.jpg'),
    'nongpoh': ('11-nongpoh/nongpoh-lit.jpg', '11-nongpoh/nongpoh-dark.jpg'),
    'cloud': ('12-cloud-line/cloudline-lit.jpg', '12-cloud-line/cloudline-dark.jpg'),
    'edge': REF,
    'shillong': (None, None),   # placeholder painting drawn in code; grade it once the real pair exists
}
STRENGTH = .65
# scenes further from the house style get a fuller fit (the climb until its repainted pair arrives)
STRENGTH_FOR = {'climb': .45, 'jorabat': .9}   # the climb gently: forcing a daytime painting into night looks worse, not closer
Q = np.array([5, 25, 50, 75, 95])
LUM = np.array([.299, .587, .114])


def load(path, n=20_000, keep=None):
    a = np.asarray(Image.open(os.path.join(ROOT, path)).convert('RGB'), np.float32).reshape(-1, 3) / 255
    if keep is not None: a = a[keep]
    return a[np.random.default_rng(0).choice(len(a), min(n, len(a)), replace=False)]


def revealable(lit, dark):
    """Pixels the headlights can actually reveal: not sky. Same rule as the climb's shader (bright in lit, near black in dark)."""
    if not lit or not dark: return None
    L = np.asarray(Image.open(os.path.join(ROOT, lit)).convert('RGB'), np.float32).reshape(-1, 3) / 255
    D = np.asarray(Image.open(os.path.join(ROOT, dark)).convert('RGB'), np.float32).reshape(-1, 3) / 255
    return ~((L.mean(1) > .86) & (D.mean(1) < .14))


def grade(c, p):
    lift, gamma, gain, sat = p[0:3], p[3:6], p[6:9], p[9]
    c = lift + (gain - lift) * np.clip(c, 1e-4, 1) ** gamma
    l = (c * LUM).sum(-1, keepdims=True)
    return np.clip(l + (c - l) * sat, 0, 1)


def stats(c):
    """What we match: per-channel quantiles, plus the mean saturation."""
    l = (c * LUM).sum(-1, keepdims=True)
    return np.concatenate([np.percentile(c, Q, 0).ravel(), [np.abs(c - l).mean() * 4]])


IDENTITY = np.array([0, 0, 0, 1, 1, 1, 1, 1, 1, 1], float)


def fit(pairs, refs, strength=STRENGTH):
    targets = [stats(r) for r in refs]
    def loss(p):
        return sum(((stats(grade(c, p)) - t) ** 2).sum() for c, t in zip(pairs, targets)) + .02 * ((p - IDENTITY) ** 2).sum()
    bounds = [(-.1, .15)] * 3 + [(.5, 1.8)] * 3 + [(.65, 1.3)] * 3 + [(.5, 1.3)]
    r = minimize(loss, IDENTITY, bounds=bounds, method='L-BFGS-B')
    return IDENTITY + (r.x - IDENTITY) * strength


if __name__ == '__main__':
    ref = [load(p) for p in REF]
    out = {}
    for name, (lit, dark) in SCENES.items():
        if name == 'edge' or (lit is None and dark is None):
            out[name] = IDENTITY.tolist(); continue
        pairs, refs = [], []
        if lit: pairs.append(load(lit, keep=revealable(lit, dark))); refs.append(ref[0])
        if dark: pairs.append(load(dark)); refs.append(ref[1])
        p = fit(pairs, refs, STRENGTH_FOR.get(name, STRENGTH))
        out[name] = [round(float(x), 4) for x in p]
        print(f'{name:9s} lift {p[0:3].round(3)} gamma {p[3:6].round(3)} gain {p[6:9].round(3)} sat {p[9]:.3f}')
    js = ('// Written by tools/fit_grade.py: do not edit by hand. Per scene: [lift r,g,b, gamma r,g,b, gain r,g,b, saturation].\n'
          '// The final pass in shared/kit.js applies it, so every scene sits close to the edge painting. See STYLE.md.\n'
          f'export const GRADES = {json.dumps(out, indent=2)};\n')
    open(os.path.join(ROOT, 'shared/grade.js'), 'w').write(js)
    print('wrote shared/grade.js')
