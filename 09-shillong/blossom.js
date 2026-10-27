// Shillong in November: the Himalayan cherry in bloom. Everything here is painted in code, as lit/dark pairs like the
// paintings, so the headlights reveal it the same way:
//   - a hero tree in the foreground, its blossom built from brush dabs, festival bulbs strung along a limb, swaying in the wind
//   - an overlay on the painting: blossom trees down the slopes of the town, fallen petals on the viewpoint
//   - petals falling through the air, near and far; they catch the beam, settle on the ground, drift away from the pointer
// The wind is one number (gust 0..1): the scene raises it when the star crosses and when the wish is banked.
import * as THREE from 'three';
import { clamp, lerp, mkCanvas, tex } from '../shared/kit.js';
import { BLOSSOM as B } from '../shared/style.js';

const rng = seed => () => (seed = seed * 16807 % 2147483647) / 2147483647;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// draw the same shapes into the lit and the dark canvas, each in its own colour, so the pair stays pixel-aligned
function pair(w, h) {
  const cv = [mkCanvas(w, h), mkCanvas(w, h)], cx = cv.map(c => c.getContext('2d'));
  const both = f => cx.forEach((c, k) => f(c, k));
  const dab = (x, y, rx, ry, a, cols, alpha = 1) => both((c, k) => {
    c.globalAlpha = alpha; c.fillStyle = cols[k]; c.beginPath(); c.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
  });
  return { cv, cx, both, dab };
}
const gauss = r => () => { let u = 0; for (let i = 0; i < 3; i++) u += r(); return (u / 3 - .5) * 2; };   // soft, roughly -1..1

// a cluster of blossom: shadow underneath, the body, then the highlights toward the moon; a little of the town's glow underneath
function cluster(P, r, x, y, R, back = 0) {   // back: 1 for a cluster sitting deeper in the crown, in its shade
  const g = gauss(r), pal = i => [B.lit[Math.max(0, i - back)], B.dark[Math.max(0, i - back)]];
  for (let i = 0; i < R * 2.2; i++) P.dab(x + g() * R * 1.1, y + R * .25 + g() * R * .7, 2.5 + r() * 4.5, 1.8 + r() * 3, r() * 3, pal(r() < .5 ? 0 : 1), .9);
  for (let i = 0; i < R * 2.1; i++) P.dab(x + g() * R, y + g() * R * .75, 2 + r() * 4, 1.5 + r() * 2.6, r() * 3, pal(2), .95);
  for (let i = 0; i < R * (back ? .5 : 1.1); i++) P.dab(x - R * .22 + g() * R * .7, y - R * .3 + g() * R * .5, 1.5 + r() * 3, 1.2 + r() * 2, r() * 3, pal(r() < .12 ? 4 : 3));
  for (let i = 0; i < R * .5; i++) P.dab(x + g() * R * .8, y + R * .55 + g() * R * .25, 2 + r() * 3, 1.2 + r() * 1.6, r() * 3, [B.lit[2], B.dark[3]], .35);
}
// a branch: a tapered, slightly painterly stroke along a cubic bezier
function limb(P, r, pts, w0, w1, steps = 40, streaks = true) {
  const at = t => { const u = 1 - t; return pts[0].map((_, k) => u * u * u * pts[0][k] + 3 * u * u * t * pts[1][k] + 3 * u * t * t * pts[2][k] + t * t * t * pts[3][k]); };
  const path = Array.from({ length: steps + 1 }, (_, i) => at(i / steps));
  P.both((c, k) => {
    c.fillStyle = k ? B.bark : B.barkLit; c.beginPath();
    const side = s => path.map((p, i) => { const q = path[Math.min(steps, i + 1)], o = path[Math.max(0, i - 1)], dx = q[0] - o[0], dy = q[1] - o[1], L = Math.hypot(dx, dy) || 1, w = lerp(w0, w1, i / steps) / 2; return [p[0] - dy / L * w * s, p[1] + dx / L * w * s]; });
    const a = side(1), b = side(-1).reverse();
    c.moveTo(...a[0]); for (const p of a.concat(b)) c.lineTo(...p); c.closePath(); c.fill();
  });
  if (streaks) for (let i = 0; i < w0 * .6; i++) {   // bark: a few streaks along the grain
    const t0 = r() * .8, t1 = t0 + .05 + r() * .15, off = (r() - .5) * .6;
    P.both((c, k) => {
      c.strokeStyle = B.barkStreak[k ? 0 : 1]; c.lineWidth = 1 + r() * 1.5; c.beginPath();
      for (let t = t0; t <= t1; t += .02) { const p = at(t), w = lerp(w0, w1, t) * off; c[t === t0 ? 'moveTo' : 'lineTo'](p[0] + w, p[1] + w * .3); }
      c.stroke();
    });
  }
  return { at, path };
}

/* ---------- the hero tree, painted on the pixel grid ---------- */
// The tree is designed in a 1200 x 1000 space (TREE) and painted straight onto the frame's pixel grid: gw x gh texels, one
// texel per frame pixel, so its blossom reads as hand-placed pixel clusters, not a downscaled painting. The scene repaints it
// when the grid changes (resize). Branches are filled shapes thresholded to hard pixels with a moonlit rim; blossom is
// clumps of 4-tone pixels lit from the upper left; the festival bulbs are single bright pixels with a stepped glow, and the
// blossom near each bulb takes its warm light.
export const TREE = { w: 1200, h: 1000, anchorU: 1020 / 1200 };   // design px; the trunk's foot is at (anchorU, bottom)
const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const mixRGB = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
export function paintTree(gw, gh, seed = 5) {
  const P = pair(gw, gh), r = rng(seed), tips = [], f = gw / TREE.w;
  // the structure, in design px
  P.cx.forEach(c => c.setTransform(f, 0, 0, f, 0, 0));
  const limbs = [
    [[[1020, 1000], [1000, 820], [1060, 700], [985, 570]], 74, 46],                 // the trunk
    [[[992, 610], [820, 470], [520, 330], [130, 240]], 42, 7],                       // the long limb, reaching over
    [[[985, 580], [930, 400], [800, 220], [680, 70]], 36, 6],
    [[[990, 590], [1060, 420], [1120, 250], [1170, 110]], 30, 6],
    [[[998, 690], [940, 640], [880, 600], [810, 585]], 22, 6],                       // the low bough, stopping short of the two of us
    [[[1000, 650], [1080, 560], [1150, 520], [1200, 470]], 18, 5],
  ].map(([pts, w0, w1]) => ({ ...limb(P, r, pts, w0, w1, 40, false), w0, w1 }));
  const twig = (x, y, a, len, w, depth) => {
    const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len;
    limb(P, r, [[x, y], [lerp(x, x1, .35) + (r() - .5) * 10, lerp(y, y1, .35) + (r() - .5) * 10], [lerp(x, x1, .7), lerp(y, y1, .7)], [x1, y1]], Math.max(w, 4.5), 4.5, 10, false);
    if (depth > 0) for (let i = 0; i < 2; i++) twig(x1, y1, a + (i ? .5 : -.5) + (r() - .5) * .4, len * .62, w * .55, depth - 1);
    else tips.push([x1, y1, 20 + r() * 26]);
  };
  limbs.slice(1).forEach(L => {
    for (let t = .22; t < 1; t += .06 + r() * .05) {
      const [x, y] = L.at(t), [x2, y2] = L.at(Math.min(1, t + .02)), dir = Math.atan2(y2 - y, x2 - x);
      twig(x, y, lerp(dir, -Math.PI / 2, .45) + (r() - .5) * 1.6, 50 + r() * 70, lerp(L.w0, L.w1, t) * .45, 1 + (r() < .5));
      tips.push([x, y - 8, 14 + r() * 14]);
    }
    tips.push([...L.at(1), 34]);
  });
  P.cx.forEach(c => c.setTransform(1, 0, 0, 1, 0, 0));
  // to hard pixels: the branches' soft edges thresholded; a 1 px moonlit rim on their upper sides in the dark version
  const img = P.cx.map(c => c.getImageData(0, 0, gw, gh)), D = img.map(i => i.data), rim = [hexRGB(B.barkStreak[1]), hexRGB(B.barkStreak[0])];
  for (let i = 0; i < gw * gh; i++) for (const d of D) d[i * 4 + 3] = d[i * 4 + 3] > 90 ? 255 : 0;
  for (let y = gh - 1; y > 0; y--) for (let x = 0; x < gw; x++) {
    const i = (y * gw + x) * 4;
    if (D[1][i + 3] && !D[1][i - gw * 4 + 3]) D.forEach((d, k) => d.set(rim[k], i));
  }
  // the bulbs' positions first: the blossom near them is lit warm
  const L = limbs[1], bulbs = [];
  for (let i = 0; i < 14; i++) { const t = .14 + i / 13 * .74, [x, y] = L.at(t), sag = Math.sin((i % 4) / 4 * Math.PI) * 22; bulbs.push([Math.round(x * f), Math.round((y + 14 + sag) * f)]); }
  const warmth = (x, y) => { let m = 1e9; for (const [bx, by] of bulbs) m = Math.min(m, (bx - x) ** 2 + (by - y) ** 2); return m; };
  const LIT = B.lit.map(hexRGB), DARK = B.dark.map(hexRGB), WARM = hexRGB(B.bulbGlow);
  const put = (x, y, i, glow) => {   // a blossom pixel of ramp step i (0 deep .. 4 palest), in both versions
    if (x < 0 || y < 0 || x >= gw || y >= gh) return;
    const o = (y * gw + x) * 4, w = warmth(x, y), dk = w < 3 ? mixRGB(DARK[Math.min(4, i + 1)], WARM, .3) : w < 9 ? mixRGB(DARK[i], LIT[i], .45) : DARK[i];
    D[0].set([...LIT[i], 255], o); D[1].set([...(glow ? mixRGB(dk, WARM, .2) : dk), 255], o);
  };
  // the blossom: from the back of the crown to the front, each clump a ragged pixel blob, shaded from the upper left
  tips.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const [tx, ty, R] of tips) {
    const X = tx * f, Y = ty * f, rr = Math.max(1.6, R * f * 1.05), back = r() < .38 ? 1 : 0, glow = r() < .1;
    for (let y = Math.floor(Y - rr); y <= Y + rr; y++) for (let x = Math.floor(X - rr * 1.25); x <= X + rr * 1.25; x++) {
      const dx = (x + .5 - X) / (rr * 1.2), dy = (y + .5 - Y) / rr, d = dx * dx + dy * dy;
      if (d > .75 + r() * .5) continue;
      const light = -(dx * .6 + dy) + (r() - .5) * .5;   // toward the moon, upper left
      let i = light > .45 ? 3 : light > -.05 ? 2 : light > -.55 ? 1 : 0;
      if (i === 3 && d < .45 && r() < .35) i = 4;
      put(x, y, Math.max(0, i - back), glow);
    }
  }
  // loose single petals at the crown's edge, so it isn't a hard shape
  for (let i = 0; i < tips.length * 3; i++) { const [x, y] = tips[r() * tips.length | 0]; put(Math.round(x * f + (r() - .5) * 120 * f), Math.round(y * f + (r() - .5) * 90 * f), 2 + (r() < .5), false); }
  // the festival bulbs: the wire, a single bright pixel each, and a stepped glow (4-neighbours, then the diamond beyond)
  const wire = hexRGB(B.bark), bulb = hexRGB(B.bulb);
  const blend = (x, y, c, a) => {   // softer on blossom than on sky
    if (x < 0 || y < 0 || x >= gw || y >= gh) return;
    const o = (y * gw + x) * 4;
    D.forEach((d, k) => { if (d[o + 3] === 255) d.set(mixRGB([d[o], d[o + 1], d[o + 2]], c, (k ? a : a * .5) * .6), o); else if (k) d.set([...c, Math.round(a * 255)], o); });
  };
  for (let i = 1; i < bulbs.length; i++) {
    const [x0, y0] = bulbs[i - 1], [x1, y1] = bulbs[i], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 1; k < n; k++) { const x = Math.round(lerp(x0, x1, k / n)), y = Math.round(lerp(y0, y1, k / n) - 1); D.forEach((d, j) => { const o = (y * gw + x) * 4; if (x >= 0 && y >= 0 && x < gw && y < gh && d[o + 3] < 255) d.set([...wire, 255], o); }); }
  }
  for (const [x, y] of bulbs) {
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const m = Math.abs(i) + Math.abs(j); if (m === 2) blend(x + i, y + j, WARM, .4); }
    for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blend(x + i, y + j, WARM, .8);
    D.forEach(d => { const o = (y * gw + x) * 4; if (x >= 0 && y >= 0 && x < gw && y < gh) d.set([...bulb, 255], o); });
  }
  P.cx.forEach((c, k) => c.putImageData(img[k], 0, 0));
  return P.cv;
}

/* ---------- the overlay: trees down the slopes of the town, fallen petals on the viewpoint ---------- */
// trees: false when the real painting already has them
export function paintOverlay(IW, IH, HORIZON, RAIL, trees = true, seed = 9) {
  const P = pair(IW, IH), r = rng(seed), g = gauss(r), hy = HORIZON * IH, ry = RAIL * IH;
  if (trees) for (let i = 0; i < 150; i++) {
    const y = hy + 60 + Math.pow(r(), .7) * (ry - hy - 100), near = (y - hy) / (ry - hy), x = r() * IW, R = 3 + near * 8 + r() * 3;
    P.both((c, k) => { c.fillStyle = k ? B.bark : B.barkLit; c.fillRect(x - 1, y, 2, R * .9); });
    const lamp = r() < .15;   // some stand by the street lights: those glow pink whatever the headlights do
    for (let j = 0; j < R * 3; j++) {
      const i2 = j < R ? 1 : j < R * 2.3 ? 2 : 3;
      P.dab(x + g() * R, y - R * .4 + g() * R * .6, 1.5 + r() * 2.2, 1 + r() * 1.4, r() * 3, [B.lit[i2], lamp ? B.lit[i2] : B.dark[i2 + 1]], lamp ? .55 : .8);
    }
  }
  // fallen petals: thickest under the hero tree (right) and along the foot of the railing
  for (let i = 0; i < 3200; i++) {
    const right = r() < .6, x = right ? IW * (.62 + Math.pow(r(), .6) * .4) : r() * IW, y = right ? ry + 8 + r() * (IH - ry) : ry + 4 + Math.abs(g()) * 40;
    P.dab(x, y, 1.6 + r() * 2.2, .9 + r() * 1.2, r() * 3, [B.lit[2 + (r() < .4)], B.dark[2 + (r() < .4)]], .55 + r() * .4);
  }
  return P.cv;
}

/* ---------- petals in the air ---------- */
// One Points object per depth band: far petals sit behind the people and the truck, near ones in front of everything.
// light: the scene's GLSL light model (lightAt in painting px, sharing the scene's uniforms U).
export class Petals {
  constructor({ stage, U, light, grid, n, d0, d1, size, IW, IH, HORIZON, RAIL, near }) {
    Object.assign(this, { stage, n, d0, d1, size, IW, IH, near, ry: RAIL * IH });
    const r = this.r = Math.random;
    this.p = Array.from({ length: n }, () => this.spawn({}, true));
    this.geo = new THREE.BufferGeometry();
    const attr = (name, k) => { const a = new THREE.BufferAttribute(new Float32Array(n * k), k); a.setUsage(THREE.DynamicDrawUsage); this.geo.setAttribute(name, a); return a; };
    this.aPos = attr('position', 3); this.aPx = attr('aPx', 2); this.aSize = attr('aSize', 1); this.aAng = attr('aAng', 1); this.aFl = attr('aFl', 1); this.aA = attr('aA', 1);
    const col = h => new THREE.Color(h);
    // Each petal is 1 to 3 frame pixels, centred on the pixel grid (grid: the frame's pixel grid, ctx.ink.size; the scene
    // renders at 2x it), drawn as whole pixels: a single dot far off, a 2 px chip or a little plus shape near, its base a
    // shade deeper. It fades in and out by an ordered dither, never by blending.
    this.mat = new THREE.ShaderMaterial({
      uniforms: { ...U, uScreen: { value: 600 }, uGrid: { value: grid }, cDark: { value: col(B.petalDark) }, cLit: { value: col(B.petalLit) }, cCore: { value: col(B.petalCore) }, cGlow: { value: col(B.petalGlow) } },
      transparent: true, depthWrite: false, depthTest: !near,
      vertexShader: light + /* glsl */`
        uniform float uScreen; uniform vec2 uGrid; attribute vec2 aPx; attribute float aSize, aAng, aFl, aA;
        varying float vL, vAng, vFl, vA, vTown, vSz;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.), cp = projectionMatrix * mv;
          float sz = clamp(floor(aSize * uScreen / -mv.z + .5), 1., 3.);   // in frame pixels
          vec2 g = (cp.xy / cp.w * .5 + .5) * uGrid;
          g = mod(sz, 2.) > .5 ? floor(g) + .5 : floor(g + .5);            // odd sizes on a pixel's centre, even on its corner
          cp.xy = (g / uGrid * 2. - 1.) * cp.w;
          gl_Position = cp; gl_PointSize = sz * 2.; vSz = sz;
          vL = clamp(lightAt(aPx), 0., 1.3); vAng = aAng; vFl = aFl; vA = aA;
          vTown = smoothstep(${(HORIZON * IH).toFixed(1)}, ${(RAIL * IH).toFixed(1)}, aPx.y) * (1. - smoothstep(${(RAIL * IH).toFixed(1)}, ${(RAIL * IH + 70).toFixed(1)}, aPx.y));
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 cDark, cLit, cCore, cGlow; varying float vL, vAng, vFl, vA, vTown, vSz;
        float aAngQ(float a){ return floor(a / 1.5708); }
        void main(){
          vec2 q = (floor(gl_PointCoord * vSz) + .5) / vSz - .5;           // this frame pixel's centre in the petal
          float c = cos(vAng), s = sin(vAng); q = mat2(c, -s, s, c) * q;
          q.x /= max(vFl, .35);                                             // turning edge-on as it tumbles
          if (vSz > 2.5 && length(vec2(q.x * 1.3, q.y)) > .45) discard;    // 3 px: a little plus
          if (vSz > 1.5 && vSz < 2.5) {                                      // 2 px: a chip of three, or two when edge-on
            ivec2 cl = ivec2(gl_PointCoord * 2.); int drop = int(mod(aAngQ(vAng), 4.));
            if (cl.x + cl.y * 2 == drop || (vFl < .5 && cl.y == (drop & 1))) discard;
          }
          ivec2 b = ivec2(gl_FragCoord.xy * .5) & 1;
          if (vA < (float(b.x * 2 + (b.x ^ b.y)) + .5) / 4.) discard;      // fading: a 2x2 ordered dither
          vec3 col = mix(cDark, cLit, step(.5, vL) * .6 + step(.9, vL) * .4);  // stepped, like the people
          col += cGlow * step(.5, vTown) * .14;                              // the town's glow from below
          if (vSz > 1.5 && q.y > .15) col = col * .78 + cCore * .16;          // a deeper pixel at its base
          col *= .85 + .35 * step(.7, vFl) * step(.5, vL);                    // flashing as it turns in the beam
          gl_FragColor = vec4(col, 1.);
        }`,
    });
    this.points = new THREE.Points(this.geo, this.mat); this.points.frustumCulled = false; this.points.renderOrder = near ? 9 : 1;
  }
  // where new petals come from: the crown (near) or anywhere above the view; on start, anywhere in it
  spawn(o, anywhere = false) {
    const r = this.r, v = this.view || { x0: 0, x1: this.IW, y0: 0, y1: this.IH }, crown = this.near && this.crown && r() < .7;
    o.d = lerp(this.d0, this.d1, r());
    if (crown) { const c = this.crown; o.x = lerp(c.x0, c.x1, r()); o.y = lerp(c.y0, c.y1, r()); }
    else { o.x = lerp(v.x0 - 200, v.x1, r()); o.y = anywhere ? lerp(v.y0, v.y1, r()) : v.y0 - 20 - r() * 80; }
    o.vx = 0; o.vy = 0; o.fall = (18 + r() * 22) * (this.near ? 1.4 : 1); o.ph = r() * 6.28; o.sway = 8 + r() * 16;
    o.ang = r() * 6.28; o.spin = (r() - .5) * 3; o.flF = 1.5 + r() * 3; o.sz = this.size[0] + r() * (this.size[1] - this.size[0]);
    o.settled = -1; o.a = anywhere ? 1 : 0; o.ground = this.near ? lerp(this.ry + 30, this.IH + 40, r()) : this.ry + (r() - .3) * 30;
    return o;
  }
  // view: the visible painting rect; crown: where the hero tree's blossom is, in painting px
  setView(view, crown) { this.view = view; this.crown = crown; }
  shower(k) { for (const o of this.p) if (this.r() < k) { this.spawn(o); o.a = .01; } }
  update(dt, t, gust, ptr) {
    const S = this.stage, m = REDUCED ? .5 : 1;
    for (let i = 0; i < this.n; i++) {
      const o = this.p[i];
      if (o.settled >= 0) {   // lying on the ground: fade, then start again
        o.settled += dt; o.a = 1 - clamp((o.settled - 3) / 2, 0, 1);
        if (o.settled > 5) this.spawn(o);
      } else {
        const wind = (14 + gust * 140) * m, lift = gust * 34 * m;
        o.vx = lerp(o.vx, wind + Math.sin(t * .7 + o.ph) * o.sway, 1 - Math.exp(-1.5 * dt));
        o.vy = lerp(o.vy, o.fall * m - lift + Math.cos(t * 1.3 + o.ph * 2) * o.sway * .6, 1 - Math.exp(-1.5 * dt));
        if (ptr) {   // drift away from the pointer
          const dx = o.x - ptr[0], dy = o.y - ptr[1], L = Math.hypot(dx, dy);
          if (L < 130) { o.vx += dx / (L + 1) * (130 - L) * 6 * dt; o.vy += dy / (L + 1) * (130 - L) * 6 * dt; o.spin += (this.r() - .5) * 8 * dt; }
        }
        o.x += o.vx * dt; o.y += o.vy * dt; o.ang += o.spin * (1 + gust * 2) * dt; o.a = Math.min(1, o.a + dt);
        if (o.y > o.ground) { if (this.near) { o.settled = 0; o.y = o.ground; } else this.spawn(o); }
        const v = this.view; if (v && (o.x > v.x1 + 120 || o.y > this.IH + 80)) this.spawn(o);
      }
      const W = S.toWorld(o.x, o.y, o.d);
      this.aPos.setXYZ(i, W.x, W.y, W.z); this.aPx.setXY(i, o.x, o.y); this.aSize.setX(i, o.sz);
      this.aAng.setX(i, o.ang); this.aFl.setX(i, o.settled >= 0 ? .9 : Math.abs(Math.cos(t * o.flF + o.ph))); this.aA.setX(i, o.a);
    }
    for (const a of [this.aPos, this.aPx, this.aSize, this.aAng, this.aFl, this.aA]) a.needsUpdate = true;
  }
}

/* ---------- the hero tree as a mesh: one texel per frame pixel, swaying by whole pixels, lit like the painting ---------- */
// The sway shifts the texture lookup by whole texels (more toward the crown's tips, less at the trunk), the way pixel art
// sways: rows slip a pixel at a time instead of the picture smearing. setTex(lit, dark) swaps in a repainted tree.
export function treeMesh(U, light) {
  const nearest = c => { const t = tex(c); t.magFilter = t.minFilter = THREE.NearestFilter; return t; };
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...U, tL: { value: null }, tD: { value: null }, uTex: { value: new THREE.Vector2(1, 1) }, uAnchor: { value: new THREE.Vector2() }, uSize: { value: new THREE.Vector2(1, 1) }, uSway: { value: 1 } },
    transparent: true, depthTest: false, depthWrite: false,
    vertexShader: /* glsl */`
      uniform vec2 uAnchor, uSize; varying vec2 vUv, vPx;
      void main(){
        vUv = uv;
        vPx = uAnchor + vec2((uv.x - ${TREE.anchorU.toFixed(3)}) * uSize.x, -uv.y * uSize.y);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: light + /* glsl */`
      uniform sampler2D tL, tD; uniform vec2 uTex; uniform float uSway; varying vec2 vUv, vPx;
      void main(){
        vec2 tc = floor(vUv * uTex);
        float bend = pow(vUv.y, 1.5) * (.25 + (1. - vUv.x) * 1.2);   // the trunk holds; the long limb, out and up, moves most
        float w = sin(uTime * .8 + vUv.x * 2.3) + .5 * sin(uTime * 1.9 + vUv.y * 4.1) + .25 * sin(uTime * 3.7 + vUv.x * 9.);
        vec2 off = floor(vec2(.005, .0025) * uTex.x * bend * w * uSway + .5);
        ivec2 q = ivec2(tc - off);
        if (q.x < 0 || q.y < 0 || q.x >= int(uTex.x) || q.y >= int(uTex.y)) discard;
        vec4 l = texelFetch(tL, q, 0), d = texelFetch(tD, q, 0);
        if (d.a < .01) discard;
        float lum = dot(l.rgb, vec3(.333)), th = .25 + .55 * (1. - lum);   // the palest petals catch the light first
        float on = uMode > 1.5 ? 1. : (uMode > .5 ? 0. : step(th, lightAt(vPx)));
        vec3 col = mix(d.rgb, l.rgb, on * .7);                                // caught by the beam, never blown out
        float bulb = step(.86, dot(d.rgb, vec3(.333)));                    // the festival bulbs twinkle, in steps
        col += d.rgb * bulb * .3 * step(.3, sin(uTime * (1.4 + h12(vec2(q)) * 3.) + h12(vec2(q) + 3.) * 6.28));
        gl_FragColor = vec4(col, d.a);
      }`,
  });
  const geo = new THREE.PlaneGeometry(1, 1).translate(.5 - TREE.anchorU, .5, 0);
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 6;
  m.setTex = ([cl, cd]) => {
    for (const k of ['tL', 'tD']) mat.uniforms[k].value?.dispose();
    mat.uniforms.tL.value = nearest(cl); mat.uniforms.tD.value = nearest(cd); mat.uniforms.uTex.value.set(cl.width, cl.height);
  };
  return m;
}
