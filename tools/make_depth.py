"""Make each painting's depth map, shared by its lit and dark versions: <scene>/depth.png (near = white).

    python3 tools/make_depth.py                 # every scene
    python3 tools/make_depth.py 08-edge-scene   # one

Uses Depth Anything V2 small (ONNX, about 100 MB, downloaded once to tools/.models/) on the lit painting, through
onnxruntime. If the model can't be had, it falls back to hand-made layers: sky, far, mid and near bands blended with a
depth gradient down the frame, which is what the old flat scenes assumed.

The result is smoothed (edge-aware, so a ridge doesn't bleed into the sky) and normalised: 0 = the farthest thing in the
frame, 1 = the nearest. The scenes displace a subdivided plane by it, so keep it smooth; sharp steps stretch.
"""
import os, sys, urllib.request
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, median_filter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_URL = 'https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx'
MODEL = os.path.join(ROOT, 'tools', '.models', 'depth-anything-v2-small.onnx')
# scene -> the painting the depth comes from (the lit one: it has the clearest shapes)
SCENES = {
    '08-edge-scene': 'edge-lit.jpg',
    '13-the-stand': 'jorabat-dark.jpg',
    '01-cloud-line-scene': 'lit.jpg',
    '11-nongpoh': 'nongpoh-lit.jpg',
    '12-cloud-line': 'cloudline-lit.jpg',
    '10-jorabat-intro': 'dashboard-lit.jpg',
}
SIZE = 518   # the model's input size (a multiple of 14)


def model_depth(img):
    import onnxruntime as ort
    if not os.path.exists(MODEL):
        os.makedirs(os.path.dirname(MODEL), exist_ok=True)
        print('downloading', MODEL_URL)
        urllib.request.urlretrieve(MODEL_URL, MODEL)
    sess = ort.InferenceSession(MODEL, providers=['CPUExecutionProvider'])
    W, H = img.size
    w = SIZE * 2 if W > H * 1.5 else SIZE   # wide paintings keep more width
    w = (round(w * 1) // 14) * 14; h = (round(w * H / W) // 14) * 14
    x = np.asarray(img.convert('RGB').resize((w, h), Image.BICUBIC), np.float32) / 255
    x = (x - [.485, .456, .406]) / [.229, .224, .225]
    x = x.transpose(2, 0, 1)[None].astype(np.float32)
    out = sess.run(None, {sess.get_inputs()[0].name: x})[0][0]   # relative inverse depth: bigger = nearer
    return np.asarray(Image.fromarray(out.astype(np.float32)).resize((W, H), Image.BICUBIC))


def layered_depth(img):
    """Fallback: sky far, then a gradient down the frame (the old flat scenes' depthN), lifted where it's busy."""
    a = np.asarray(img.convert('L'), np.float32) / 255
    H, W = a.shape
    y = np.linspace(0, 1, H)[:, None].repeat(W, 1)
    sky = gaussian_filter((a > .8).astype(np.float32) * (y < .5), 8)
    return np.clip((y - .3) / .7, 0, 1) * (1 - sky)


def smooth(d, img):
    d = (d - np.percentile(d, 1)) / (np.percentile(d, 99) - np.percentile(d, 1) + 1e-6)
    d = median_filter(np.clip(d, 0, 1), 5)
    return gaussian_filter(d, 3)   # soft: a displaced mesh stretches at sharp steps


if __name__ == '__main__':
    names = sys.argv[1:] or list(SCENES)
    for scene in names:
        src = os.path.join(ROOT, scene, SCENES[scene])
        img = Image.open(src)
        try:
            d = model_depth(img); how = 'Depth Anything V2 small'
        except Exception as e:
            print('  model unavailable (%s): using layers' % e); d = layered_depth(img); how = 'layers'
        d = smooth(d, img)
        Image.fromarray((d * 255).astype(np.uint8)).save(os.path.join(ROOT, scene, 'depth.png'), optimize=True)
        print(f'{scene}/depth.png  from {SCENES[scene]}  ({how})')
