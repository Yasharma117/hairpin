"""Every scene's key frames, in landscape and in 9:16, beside edge-lit: the house style. Look at it before pushing.

    python3 tools/contact_sheet.py            # writes reviews/style-<date>.png

Serves the repo on a spare port, screenshots each key frame with tools/shot.mjs (headless Chrome), and lays them out:
one row per frame, landscape then portrait, with edge-lit at the head of the sheet for comparison.
"""
import datetime, http.server, json, os, socketserver, subprocess, sys, tempfile, threading
from functools import partial
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRAMES = [   # (label, query): the key frame of each scene
    ('stand', 'scene=stand'),
    ('jorabat', 'scene=jorabat'),
    ('climb', 'scene=climb'),
    ('nongpoh', 'scene=nongpoh&u=.35'),
    ('cloud line', 'scene=cloud&u=.4'),
    ('edge: the hang', 'scene=edge&at=car&t=3'),
    ('edge: then', 'scene=edge&at=seated&t=26'),
    ('edge: him', 'scene=edge&at=seated&t=44'),
    ('shillong: the star', 'scene=shillong&t=7.5'),
]
LAND, PORT = (1280, 720), (405, 720)
TH = 300   # thumbnail height on the sheet

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
handler = partial(Quiet, directory=ROOT)
srv = socketserver.TCPServer(('127.0.0.1', 0), handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{srv.server_address[1]}/'

tmp = tempfile.mkdtemp()
shots = []
for i, (label, q) in enumerate(FRAMES):
    for tag, (w, h) in (('l', LAND), ('p', PORT)):
        shots.append({'url': f'{base}?{q}', 'w': w, 'h': h, 'out': os.path.join(tmp, f'{i}{tag}.png'), 'wait': 3500})
json.dump(shots, open(os.path.join(tmp, 'list.json'), 'w'))
r = subprocess.run(['node', os.path.join(ROOT, 'tools/shot.mjs'), os.path.join(tmp, 'list.json')], capture_output=True, text=True)
print(r.stdout.strip().splitlines()[-1] if r.stdout else r.stderr)
srv.shutdown()

lw, pw = int(TH * LAND[0] / LAND[1]), int(TH * PORT[0] / PORT[1])
pad, label_h = 16, 26
rows = len(FRAMES) + 1
sheet = Image.new('RGB', (pad * 3 + lw + pw, rows * (TH + label_h + pad) + pad), (7, 23, 45))
d = ImageDraw.Draw(sheet)
y = pad
d.text((pad, y), 'HOUSE STYLE: 08-edge-scene/edge-lit.jpg', fill=(239, 230, 207))
sheet.paste(Image.open(os.path.join(ROOT, '08-edge-scene/edge-lit.jpg')).convert('RGB').resize((lw, TH)), (pad, y + label_h))
y += TH + label_h + pad
for i, (label, q) in enumerate(FRAMES):
    d.text((pad, y), f'{label.upper()}   ?{q}', fill=(239, 230, 207))
    for tag, x, size in (('l', pad, (lw, TH)), ('p', pad * 2 + lw, (pw, TH))):
        f = os.path.join(tmp, f'{i}{tag}.png')
        if os.path.exists(f): sheet.paste(Image.open(f).convert('RGB').resize(size), (x, y + label_h))
    y += TH + label_h + pad
os.makedirs(os.path.join(ROOT, 'reviews'), exist_ok=True)
out = os.path.join(ROOT, 'reviews', f'style-{datetime.date.today().isoformat()}.png')
sheet.save(out, optimize=True)
print('wrote', os.path.relpath(out, ROOT))
sys.exit(r.returncode)
