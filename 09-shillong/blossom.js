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
function limb(P, r, pts, w0, w1, steps = 40) {
  const at = t => { const u = 1 - t; return pts[0].map((_, k) => u * u * u * pts[0][k] + 3 * u * u * t * pts[1][k] + 3 * u * t * t * pts[2][k] + t * t * t * pts[3][k]); };
  const path = Array.from({ length: steps + 1 }, (_, i) => at(i / steps));
  P.both((c, k) => {
    c.fillStyle = k ? B.bark : B.barkLit; c.beginPath();
    const side = s => path.map((p, i) => { const q = path[Math.min(steps, i + 1)], o = path[Math.max(0, i - 1)], dx = q[0] - o[0], dy = q[1] - o[1], L = Math.hypot(dx, dy) || 1, w = lerp(w0, w1, i / steps) / 2; return [p[0] - dy / L * w * s, p[1] + dx / L * w * s]; });
    const a = side(1), b = side(-1).reverse();
    c.moveTo(...a[0]); for (const p of a.concat(b)) c.lineTo(...p); c.closePath(); c.fill();
  });
  for (let i = 0; i < w0 * .6; i++) {   // bark: a few streaks along the grain
    const t0 = r() * .8, t1 = t0 + .05 + r() * .15, off = (r() - .5) * .6;
    P.both((c, k) => {
      c.strokeStyle = B.barkStreak[k ? 0 : 1]; c.lineWidth = 1 + r() * 1.5; c.beginPath();
      for (let t = t0; t <= t1; t += .02) { const p = at(t), w = lerp(w0, w1, t) * off; c[t === t0 ? 'moveTo' : 'lineTo'](p[0] + w, p[1] + w * .3); }
      c.stroke();
    });
  }
  return { at, path };
}

/* ---------- the hero tree ---------- */
export const TREE = { w: 1200, h: 1000, anchorU: 1020 / 1200 };   // canvas px; the trunk's foot is at (anchorU, bottom)
export function paintTree(seed = 5) {
  const P = pair(TREE.w, TREE.h), r = rng(seed), tips = [];
  const limbs = [
    [[[1020, 1000], [1000, 820], [1060, 700], [985, 570]], 74, 46],                 // the trunk
    [[[992, 610], [820, 470], [520, 330], [130, 240]], 42, 7],                       // the long limb, reaching over
    [[[985, 580], [930, 400], [800, 220], [680, 70]], 36, 6],
    [[[990, 590], [1060, 420], [1120, 250], [1170, 110]], 30, 6],
    [[[998, 690], [940, 640], [880, 600], [810, 585]], 22, 6],                       // the low bough, stopping short of the two of us
    [[[1000, 650], [1080, 560], [1150, 520], [1200, 470]], 18, 5],
  ].map(([pts, w0, w1]) => ({ ...limb(P, r, pts, w0, w1), w0, w1 }));
  // twigs off every limb, and blossom where they end and along the limbs' upper sides
  const twig = (x, y, a, len, w, depth) => {
    const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len;
    limb(P, r, [[x, y], [lerp(x, x1, .35) + (r() - .5) * 10, lerp(y, y1, .35) + (r() - .5) * 10], [lerp(x, x1, .7), lerp(y, y1, .7)], [x1, y1]], w, Math.max(1, w * .4), 10);
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
  // paint the blossom from the back of the crown to the front, so nearer clusters sit over farther ones
  tips.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const [x, y, R] of tips) cluster(P, r, x, y, R, r() < .38 ? 1 : 0);
  // a few loose petals at the edges, so the crown isn't a hard shape
  for (let i = 0; i < 900; i++) { const [x, y] = tips[r() * tips.length | 0]; P.dab(x + (r() - .5) * 120, y + (r() - .5) * 90, 1.5 + r() * 1.5, 1 + r(), r() * 3, [B.lit[3], B.dark[3]], .8); }
  // festival bulbs, strung in a sag along the long limb
  const L = limbs[1];
  for (let i = 0; i < 24; i++) {
    const t = .12 + i / 23 * .76, [x, y] = L.at(t), sag = Math.sin((i % 6) / 6 * Math.PI) * 16;
    P.both((c, k) => {
      c.fillStyle = B.bulbGlow; for (let j = 9; j > 0; j--) { c.globalAlpha = .035; c.beginPath(); c.arc(x, y + 14 + sag, j * 2.2, 0, Math.PI * 2); c.fill(); }
      c.globalAlpha = 1; c.fillStyle = B.bulb; c.beginPath(); c.arc(x, y + 14 + sag, 2.6, 0, Math.PI * 2); c.fill();
    });
  }
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
  constructor({ stage, U, light, n, d0, d1, size, IW, IH, HORIZON, RAIL, near }) {
    Object.assign(this, { stage, n, d0, d1, size, IW, IH, near, ry: RAIL * IH });
    const r = this.r = Math.random;
    this.p = Array.from({ length: n }, () => this.spawn({}, true));
    this.geo = new THREE.BufferGeometry();
    const attr = (name, k) => { const a = new THREE.BufferAttribute(new Float32Array(n * k), k); a.setUsage(THREE.DynamicDrawUsage); this.geo.setAttribute(name, a); return a; };
    this.aPos = attr('position', 3); this.aPx = attr('aPx', 2); this.aSize = attr('aSize', 1); this.aAng = attr('aAng', 1); this.aFl = attr('aFl', 1); this.aA = attr('aA', 1);
    const col = h => new THREE.Color(h);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { ...U, uScreen: { value: 600 }, cDark: { value: col(B.petalDark) }, cLit: { value: col(B.petalLit) }, cCore: { value: col(B.petalCore) }, cGlow: { value: col(B.petalGlow) } },
      transparent: true, depthWrite: false, depthTest: !near,
      vertexShader: light + /* glsl */`
        uniform float uScreen; attribute vec2 aPx; attribute float aSize, aAng, aFl, aA;
        varying float vL, vAng, vFl, vA, vTown;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uScreen / -mv.z;
          vL = clamp(lightAt(aPx), 0., 1.3); vAng = aAng; vFl = aFl; vA = aA;
          vTown = smoothstep(${(HORIZON * IH).toFixed(1)}, ${(RAIL * IH).toFixed(1)}, aPx.y) * (1. - smoothstep(${(RAIL * IH).toFixed(1)}, ${(RAIL * IH + 70).toFixed(1)}, aPx.y));
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 cDark, cLit, cCore, cGlow; varying float vL, vAng, vFl, vA, vTown;
        void main(){
          vec2 q = gl_PointCoord - .5; float c = cos(vAng), s = sin(vAng); q = mat2(c, -s, s, c) * q;
          q.x /= max(vFl, .16);                                         // turning edge-on as it tumbles
          float a = 1. - smoothstep(.34, .44, length(vec2(q.x * 1.75, q.y)));
          if (q.y < -.24) a *= smoothstep(0., .05, abs(q.x) * 1.75 - (-.24 - q.y) * .85);   // the notch at its tip
          if (a < .02) discard;
          vec3 col = mix(cDark, cLit, clamp(vL, 0., 1.));
          col += cGlow * vTown * .18;                                   // the town's glow from below
          col = mix(col, col * .78 + cCore * .14, smoothstep(-.1, .4, q.y)); // deeper at the base
          col *= .78 + .5 * vFl * smoothstep(.15, 1., vL);              // flashing as it turns in the beam
          gl_FragColor = vec4(col, a * vA);
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

/* ---------- the hero tree as a mesh: sways with the wind, lit like the painting ---------- */
export function treeMesh(U, light, [tL, tD]) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...U, tL: { value: tex(tL) }, tD: { value: tex(tD) }, uAnchor: { value: new THREE.Vector2() }, uSize: { value: new THREE.Vector2(1, 1) }, uSway: { value: 1 } },
    transparent: true, depthTest: false, depthWrite: false,
    vertexShader: /* glsl */`
      uniform float uTime, uSway; uniform vec2 uAnchor, uSize; varying vec2 vUv, vPx;
      void main(){
        vUv = uv; vec3 p = position;
        float bend = pow(uv.y, 1.5) * (.25 + (1. - uv.x) * 1.2);   // the trunk holds; the long limb, out and up, moves most
        float w = sin(uTime * .8 + uv.x * 2.3) + .5 * sin(uTime * 1.9 + uv.y * 4.1) + .25 * sin(uTime * 3.7 + uv.x * 9.);
        p.x += bend * w * .005 * uSway; p.y += bend * w * .0025 * uSway;
        vPx = uAnchor + vec2((uv.x - ${TREE.anchorU.toFixed(3)}) * uSize.x, -uv.y * uSize.y);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
      }`,
    fragmentShader: light + /* glsl */`
      uniform sampler2D tL, tD; varying vec2 vUv, vPx;
      void main(){
        vec4 l = texture2D(tL, vUv), d = texture2D(tD, vUv);
        if (d.a < .01) discard;
        float lum = dot(l.rgb, vec3(.333)), th = .25 + .55 * (1. - lum);   // the palest petals catch the light first
        float on = uMode > 1.5 ? 1. : (uMode > .5 ? 0. : smoothstep(th - .06, th + .06, lightAt(vPx)));
        vec3 col = mix(d.rgb, l.rgb, on);
        vec2 cell = floor(vUv * 260.);
        float bulb = smoothstep(.78, .92, dot(d.rgb, vec3(.333)));           // the festival bulbs twinkle
        col += d.rgb * bulb * (.3 * sin(uTime * (1.4 + h12(cell) * 3.) + h12(cell + 3.) * 6.28) + .15);
        gl_FragColor = vec4(col, d.a);
      }`,
  });
  const geo = new THREE.PlaneGeometry(1, 1, 32, 32).translate(.5 - TREE.anchorU, .5, 0);
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 6;
  return m;
}
