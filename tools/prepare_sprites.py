"""Turn a painted figure (transparent PNG, facing left) into the lit/dark pair the scene loads.

    python3 prepare_sprites.py <input.png> <name> [--lit ../01-cloud-line-scene/lit.jpg --dark ../01-cloud-line-scene/dark.jpg --out ../01-cloud-line-scene/sprites]

It trims to the figure, flips it to face right (the scene flips it back when needed),
scales to 420 px tall, and makes the night version by learning how the lit hill painting
maps to the dark one, colour for colour, then applying the same change to the figure.
"""
import argparse
import numpy as np
from PIL import Image, ImageOps

ap = argparse.ArgumentParser()
ap.add_argument('input'); ap.add_argument('name')
ap.add_argument('--lit', default='../01-cloud-line-scene/lit.jpg')
ap.add_argument('--dark', default='../01-cloud-line-scene/dark.jpg')
ap.add_argument('--out', default='../01-cloud-line-scene/sprites')
ap.add_argument('--no-flip', action='store_true')
a = ap.parse_args()

L = np.asarray(Image.open(a.lit).convert('RGB').resize((443, 222)), float) / 255
D = np.asarray(Image.open(a.dark).convert('RGB').resize((443, 222)), float) / 255
X, Y = L.reshape(-1, 3), D.reshape(-1, 3)
def F(X):
    r, g, b = X.T
    return np.stack([r, g, b, r*r, g*g, b*b, r*g, g*b, r*b, np.ones_like(r)], 1)
A, *_ = np.linalg.lstsq(F(X), Y, rcond=None)           # quadratic colour map, lit -> dark
lum = lambda c: c @ [.3, .59, .11]
bins = np.linspace(0, 1, 33); c = (bins[:-1] + bins[1:]) / 2
idx = np.clip(np.digitize(lum(X), bins) - 1, 0, 31)
ramp = np.array([Y[idx == i].mean(0) if (idx == i).sum() > 20 else [np.nan] * 3 for i in range(32)])
ok = ~np.isnan(ramp[:, 0])
ramp = np.stack([np.interp(c, c[ok], ramp[ok, k]) for k in range(3)], 1)   # night palette by brightness

im = Image.open(a.input).convert('RGBA')
arr = np.array(im); arr[..., 3] = np.where(arr[..., 3] < 8, 0, arr[..., 3])
im = Image.fromarray(arr); im = im.crop(im.getbbox())
if not a.no_flip: im = ImageOps.mirror(im)
s = min(1, 420 / im.height); im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
im.save(f'{a.out}/{a.name}-lit.png', optimize=True)

x = np.asarray(im, float) / 255; rgb = x[..., :3].reshape(-1, 3)
q = np.clip(F(rgb) @ A, 0, 1)
r = np.stack([np.interp(lum(rgb), c, ramp[:, k]) for k in range(3)], 1)
d = (.4 * q + .6 * r).reshape(x.shape[0], x.shape[1], 3)
Image.fromarray((np.dstack([d, x[..., 3]]) * 255 + .5).astype(np.uint8)).save(f'{a.out}/{a.name}-dark.png', optimize=True)
print('wrote', f'{a.out}/{a.name}-lit.png', 'and -dark.png')
