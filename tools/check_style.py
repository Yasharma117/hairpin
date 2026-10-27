"""Run before every push. Fails (exit 1) if Hairpin drifts from STYLE.md.

    python3 tools/check_style.py

1. Colour literals: none anywhere in the code except shared/style.js (and the generated shared/grade.js).
2. Each scene's paintings, after its grade, against the edge pair: per-channel mean and spread, and saturation.
   A scene whose lit or dark painting sits too far from edge-lit / edge-dark is an outlier.
"""
import glob, json, os, re, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fit_grade import ROOT, REF, SCENES, load, grade, LUM, revealable

LIMIT = .16   # distance from the edge painting a graded scene may sit (the edge itself is 0)
# outliers we know about and are waiting on: reported on every run, but they don't fail it. Remove the entry when fixed.
KNOWN = {'climb': 'a daytime painting graded toward night; waiting on the repainted lit/dark pair'}
fail = False

# 1. colour literals
code = [os.path.join(ROOT, 'index.html'), os.path.join(ROOT, 'shared/kit.js')] + glob.glob(os.path.join(ROOT, '*/scene.js'))
lit_re = re.compile(r"(?<![\w&])(#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b(?![\w-])|0x[0-9a-fA-F]{6}\b)")
for f in code:
    for n, line in enumerate(open(f), 1):
        for m in lit_re.finditer(line):
            print(f'colour literal  {os.path.relpath(f, ROOT)}:{n}  {m.group(0)}  (move it to shared/style.js)'); fail = True

# 2. statistics against the edge pair
src = open(os.path.join(ROOT, 'shared/grade.js')).read()
GRADES = json.loads(src[src.index('{'):src.rindex('}') + 1])


def describe(c):
    l = (c * LUM).sum(-1, keepdims=True)
    return np.concatenate([c.mean(0), c.std(0), [np.abs(c - l).mean() * 2]])


ref = [describe(load(p)) for p in REF]
print(f'\n{"scene":10s} {"lit":>6s} {"dark":>6s}   (distance from edge-lit / edge-dark after the grade; limit {LIMIT})')
for name, (lit, dark) in SCENES.items():
    row = []
    for i, path in enumerate((lit, dark)):
        if path is None: row.append(None); continue
        keep = revealable(lit, dark) if i == 0 else None   # the lit painting only where light can reach (no sky)
        d = np.abs(describe(grade(load(path, keep=keep), np.array(GRADES[name]))) - ref[i]).mean() * 3
        row.append(d)
        if d > LIMIT and name not in KNOWN: fail = True
    cells = ' '.join(f'{"-":>6s}' if d is None else f'{d:6.3f}{"!" if d > LIMIT else " "}' for d in row)
    known = f'   KNOWN OUTLIER: {KNOWN[name]}' if name in KNOWN and any(d and d > LIMIT for d in row) else ''
    print(f'{name:10s} {cells}{known}')
print('\n' + ('FAIL: fix the outliers above before pushing.' if fail else 'OK: every scene is within the house style.'))
sys.exit(1 if fail else 0)
