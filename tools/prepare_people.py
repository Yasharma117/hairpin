"""The driver and the customiser's passenger, from source-art/ to people/, at web size.

    python3 tools/prepare_people.py

Takes every source-art/you-*.png and source-art/p-*.png (see 03-image-briefs/customiser-prompts.md for the names) and writes
it to people/ at 512 x 768. The canvas is kept whole, not trimmed: the option edits are compared with their base pixel by
pixel in the browser (shared/look.js), so every file of one build and pose must stay aligned.
"""
import glob, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIZE = (512, 768)

for src in sorted(glob.glob(os.path.join(ROOT, 'source-art', 'you-*.png')) + glob.glob(os.path.join(ROOT, 'source-art', 'p-*.png'))):
    im = Image.open(src).convert('RGBA')
    if im.size != (1024, 1536):
        print('skipped (not 1024x1536):', os.path.basename(src)); continue
    out = os.path.join(ROOT, 'people', os.path.basename(src))
    im.resize(SIZE, Image.LANCZOS).save(out, optimize=True)
    print('wrote', os.path.relpath(out, ROOT), os.path.getsize(out) // 1024, 'KB')
