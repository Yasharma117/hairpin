"""Take the photographic micro-detail out of a painting, so it sits with the edge painting's soft matte look.

    python3 tools/matte.py <scene folder> <lit.jpg> <dark.jpg> [--radius 4] [--passes 2] [--toward-edge 0.7]

A Kuwahara filter with round, Gaussian-weighted windows: every pixel takes the mean of whichever of the four windows
around it is flattest. That smooths
texture inside shapes but keeps the edges between them, which is roughly what a matte painter does. The lit and dark
paintings get the same treatment, so they stay aligned. The originals are kept in <scene>/source/ the first time;
later runs always start from those, so running it twice doesn't compound. If the scene has a strokes.jpg, it's rebuilt
from the new lit painting.
"""
import argparse, os, shutil
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter


def kuwahara(img, r):
    img = img.astype(np.float32)
    lum = img[..., 0] * .299 + img[..., 1] * .587 + img[..., 2] * .114
    sig = r / 2
    # mean and variance over round, Gaussian-weighted windows (square ones leave blocky facets), read at the four corners around each pixel
    m = np.stack([gaussian_filter(img[..., c], sig, mode='reflect') for c in range(3)], -1)
    lm = gaussian_filter(lum, sig, mode='reflect')
    var = gaussian_filter(lum * lum, sig, mode='reflect') - lm * lm
    h = r // 2
    shifts = [(-h, -h), (-h, h), (h, -h), (h, h)]
    best_var = np.full(lum.shape, np.inf, np.float32)
    out = np.zeros_like(img)
    for dy, dx in shifts:
        v = np.roll(var, (dy, dx), (0, 1))
        mm = np.roll(m, (dy, dx), (0, 1))
        pick = v < best_var
        best_var = np.where(pick, v, best_var)
        out[pick] = mm[pick]
    return out


def matte(path, r, passes):
    a = np.asarray(Image.open(path).convert('RGB'))
    for _ in range(passes):
        a = kuwahara(a, r)
    a = np.stack([gaussian_filter(a[..., c], .7) for c in range(3)], -1)   # soften the seams between windows
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def toward(img, ref_path, k):
    """Move a painting's colours part of the way (k) toward a reference painting: per-channel mean and spread."""
    a = np.asarray(img, np.float32); r = np.asarray(Image.open(ref_path).convert('RGB'), np.float32)
    m, sd, rm, rsd = a.mean((0, 1)), a.std((0, 1)) + 1e-3, r.mean((0, 1)), r.std((0, 1))
    t = (a - m) / sd * rsd + rm
    return Image.fromarray(np.clip(a + (t - a) * k, 0, 255).astype(np.uint8))


def stroke_map(lit):
    """The same high-pass as shared/kit.js strokeMap: brightness minus a heavily blurred copy, around mid-grey."""
    W, H = lit.size
    s = np.asarray(lit.convert('RGB'), np.float32).sum(-1)
    small = lit.resize((W >> 2, H >> 2), Image.BILINEAR).resize((W >> 4, H >> 4), Image.BILINEAR).resize((W, H), Image.BILINEAR)
    b = np.asarray(small.convert('RGB'), np.float32).sum(-1)
    v = np.clip(128 + (s - b), 0, 255).astype(np.uint8)
    return Image.fromarray(v).convert('RGB')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('scene'); ap.add_argument('lit'); ap.add_argument('dark')
    ap.add_argument('--radius', type=int, default=4); ap.add_argument('--passes', type=int, default=2)
    ap.add_argument('--toward-edge', type=float, default=0, help='0..1: also move the colours toward edge-lit / edge-dark (for stand-in paintings)')
    a = ap.parse_args()
    src = os.path.join(a.scene, 'source')
    os.makedirs(src, exist_ok=True)
    edge = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '08-edge-scene')
    for name, ref in ((a.lit, 'edge-lit.jpg'), (a.dark, 'edge-dark.jpg')):
        orig = os.path.join(src, name)
        if not os.path.exists(orig):
            shutil.copy2(os.path.join(a.scene, name), orig)   # keep the original the first time
        img = matte(orig, a.radius, a.passes)
        if a.toward_edge: img = toward(img, os.path.join(edge, ref), a.toward_edge)
        img.save(os.path.join(a.scene, name), quality=90)
        print('matte', os.path.join(a.scene, name), '<-', orig)
    if os.path.exists(os.path.join(a.scene, 'strokes.jpg')):
        stroke_map(Image.open(os.path.join(a.scene, a.lit))).save(os.path.join(a.scene, 'strokes.jpg'), quality=90)
        print('rebuilt', os.path.join(a.scene, 'strokes.jpg'))
