// The passenger the viewer dresses at the stand, and you, the driver. Every image lives in people/ (from source-art/ via
// tools/prepare_people.py), 512 x 768, facing left:
//   you-stand.png, you-sit.png                              you
//   p-<f|m>-base-<stand|sit>.png                            the passenger, plain
//   p-<f|m>-<hair|top|acc>-<option>-<stand|sit>.png         one change, made as an edit of that base (so pixel-aligned)
// An option shows at the stand only once its file exists. The edit's changed pixels become a layer over the base; skin
// tone is a recolour of the base's skin that keeps its shading.
import { loadImg, mkCanvas } from './kit.js';
import { SKIN_TONES, BASE_SKIN } from './style.js';

export const OPTIONS = {
  hair: [['short', 'Short'], ['long', 'Long'], ['bun', 'Bun'], ['curly', 'Curly']],
  top: [['hoodie', 'Hoodie'], ['kurta', 'Kurta'], ['jacket', 'Denim'], ['shawl', 'Shawl']],
  acc: [['headphones', 'Headphones'], ['glasses', 'Glasses'], ['muffler', 'Muffler']],
};
const ORDER = ['top', 'hair', 'acc'];   // drawn in this order: long hair over a hoodie, headphones over hair
const W = 512, H = 768;
const url = f => new URL(`../people/${f}.png`, import.meta.url).href;
const memo = new Map(), once = (key, make) => (memo.has(key) || memo.set(key, make()), memo.get(key));
const pixels = img => { const c = mkCanvas(W, H), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, W, H); return x.getImageData(0, 0, W, H); };
const image = f => once(`img:${f}`, () => loadImg(url(f)));

// which options exist for this build and pose
export async function available(build, pose = 'stand') {
  const out = {};
  for (const g of Object.keys(OPTIONS)) out[g] = (await Promise.all(OPTIONS[g].map(async ([id, label]) => (await image(`p-${build}-${g}-${id}-${pose}`)) && [id, label]))).filter(Boolean);
  return out;
}

// the base, its skin recoloured to tone i
const skinned = (build, pose, i) => once(`skin:${build}:${pose}:${i}`, async () => {
  const img = await image(`p-${build}-base-${pose}`); if (!img) return null;
  const P = pixels(img), d = P.data;
  if (i !== BASE_SKIN && SKIN_TONES[i]) {
    const n = parseInt(SKIN_TONES[i].slice(1), 16), T = [n >> 16 & 255, n >> 8 & 255, n & 255];
    // skin: warm (r > g > b), clearly not the grey shirt or the navy trousers. ponytail: a colour heuristic; paint a skin mask if it bleeds.
    const m = new Float32Array(W * H); let sum = 0, cnt = 0;
    for (let p = 0, k = 0; p < d.length; p += 4, k++) {
      const r = d[p], g = d[p + 1], b = d[p + 2];
      if (d[p + 3] < 20 || !(r >= g && g >= b * .85) || r < 40) continue;
      m[k] = Math.min(1, Math.max(0, (r - b - 16) / 24)); if (m[k] > .5) { sum += (r + g + b) / 3; cnt++; }
    }
    // grow the mask a little, then soften it, so the light brush flecks inside the skin take the tone too instead of speckling
    for (const [op, r] of [[Math.max, 2], [null, 2]]) for (const step of [1, W]) {
      const src = m.slice();
      for (let k = 0; k < m.length; k++) {
        let a = op ? 0 : 0; for (let j = -r; j <= r; j++) { const v = src[k + j * step] || 0; a = op ? op(a, v) : a + v; }
        m[k] = op ? a : a / (2 * r + 1);
      }
    }
    const ref = cnt ? sum / cnt : 128, ref0 = parseInt(SKIN_TONES[BASE_SKIN].slice(1), 16), refT = ((ref0 >> 16 & 255) + (ref0 >> 8 & 255) + (ref0 & 255)) / 3;
    for (let p = 0, k = 0; p < d.length; p += 4, k++) {
      if (!m[k]) continue;
      const shade = (d[p] + d[p + 1] + d[p + 2]) / 3 / ref * (refT / ((T[0] + T[1] + T[2]) / 3)) ** .15;
      for (let c = 0; c < 3; c++) d[p + c] += (Math.min(255, T[c] * shade) - d[p + c]) * m[k] * .92;
    }
  }
  return P;
});

// an option: the pixels its edit changed from the base, as a layer. ponytail: a plain threshold; an edit that drifts all over
// (colour shift, a moved arm) leaks into the layer, and the fix is a cleaner edit, not code.
const layerOf = (build, g, id, pose) => once(`layer:${build}:${g}:${id}:${pose}`, async () => {
  const [base, edit] = await Promise.all([image(`p-${build}-base-${pose}`), image(`p-${build}-${g}-${id}-${pose}`)]);
  if (!base || !edit) return null;
  const A = pixels(base).data, E = pixels(edit), d = E.data, X = new ImageData(W, H), x = X.data;
  for (let p = 0; p < d.length; p += 4) {
    if (A[p + 3] > 16 && d[p + 3] < 16) x[p + 3] = 255;   // the edit took this away (a narrower kurta): erase it from the base
    const diff = Math.abs(d[p] - A[p]) + Math.abs(d[p + 1] - A[p + 1]) + Math.abs(d[p + 2] - A[p + 2]) + Math.abs(d[p + 3] - A[p + 3]) * 2;
    d[p + 3] = diff < 48 ? 0 : Math.min(d[p + 3], (diff - 48) * 6);
  }
  const c = mkCanvas(W, H), e = mkCanvas(W, H); c.getContext('2d').putImageData(E, 0, 0); e.getContext('2d').putImageData(X, 0, 0);
  return { add: c, erase: e };
});

// trimmed to the figure, so the bottom edge is where they stand (or sit)
function trim(c) {
  const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < x0) return null;
  const o = mkCanvas(x1 - x0 + 1, y1 - y0 + 1); o.getContext('2d').drawImage(c, -x0, -y0); return o;
}

// look: { build: 'f' | 'm', skin, hair, top, acc } -> a trimmed canvas of them, or null if the base isn't there yet
export async function dress(look, pose = 'stand') {
  const build = look.build === 'm' ? 'm' : 'f', base = await skinned(build, pose, look.skin ?? BASE_SKIN);
  if (!base) return null;
  const c = mkCanvas(W, H), x = c.getContext('2d');
  x.putImageData(base, 0, 0);
  for (const g of ORDER) if (look[g]) {
    const L = await layerOf(build, g, look[g], pose); if (!L) continue;
    x.globalCompositeOperation = 'destination-out'; x.drawImage(L.erase, 0, 0); x.globalCompositeOperation = 'source-over';
    x.drawImage(L.add, 0, 0);
  }
  return trim(c);
}
export async function you(pose = 'stand') { const img = await image(`you-${pose}`); if (!img) return null; const c = mkCanvas(W, H); c.getContext('2d').drawImage(img, 0, 0, W, H); return trim(c); }
