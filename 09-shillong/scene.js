// Shillong: the truck that gave you a lift parks at the viewpoint above the city. The engine goes off and ticks as it cools;
// the passenger signs off; a shooting star crosses (hold while it's up to bank the wish); the quote sets itself on torn paper.
import * as THREE from 'three';
import { clamp, lerp, sstep, mkCanvas, loadImg, tex, strokeMap, NOISE, line, disposeScene, Stage, paintFigure } from '../shared/kit.js';
import { SHILLONG_PLACEHOLDER, FIGURE, PALETTE } from '../shared/style.js';

const at = f => new URL(f, import.meta.url).href;
export const assets = ['../08-edge-scene/sprites/truck-lit.png', '../08-edge-scene/sprites/truck-dark.png'];

const IW = 1774, IH = 887;              // painting size in px; the whole scene lives in these units

// The layout the real shillong-lit/dark pair must keep: sky above HORIZON, city in the bowl, the viewpoint's railing along RAIL.
const HORIZON = .4, RAIL = .74;

/* ---------- the paintings: shillong-lit.jpg + shillong-dark.jpg if they exist, else a placeholder drawn here ---------- */
const canvasIW = (w = IW, h = IH) => mkCanvas(w, h);
const rng = seed => () => (seed = seed * 16807 % 2147483647) / 2147483647;
function placeholder() {
  const cl = canvasIW(), cd = canvasIW(), ctx = [cl.getContext('2d'), cd.getContext('2d')], r = rng(11);
  const both = f => ctx.forEach(f);
  const P = SHILLONG_PLACEHOLDER;   // [lit swatches, dark swatches]
  const dab = (pal, x, y, w, h, a) => { const i = r() * pal[0].length | 0; both((c, k) => { c.fillStyle = pal[k][i]; c.beginPath(); c.ellipse(x, y, w, h, a, 0, Math.PI * 2); c.fill(); }); };
  const hy = HORIZON * IH, ry = RAIL * IH;
  both((c, k) => { c.fillStyle = P.sky[k][0]; c.fillRect(0, 0, IW, IH); });
  for (let i = 0; i < 1400; i++) dab(P.sky, r() * IW, r() * hy, 40 + r() * 90, 8 + r() * 16, (r() - .5) * .2);
  for (let i = 0; i < 260; i++) { const x = r() * IW, y = r() * hy * .9, s = .6 + r() * 1.4; both(c => { c.fillStyle = P.star; c.fillRect(x, y, s, s); }); }
  // far ridges, then the bowl of the town
  const ridge = (y0, amp, f, ph) => x => y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.7 + ph * 3) * amp * .4;
  for (const [y0, pal] of [[hy, P.hill], [hy + 40, P.town]]) {
    const f = ridge(y0, 22, .004, y0);
    both((c, k) => { c.fillStyle = pal[k][0]; c.beginPath(); c.moveTo(0, IH); for (let x = 0; x <= IW; x += 20) c.lineTo(x, f(x)); c.lineTo(IW, IH); c.fill(); });
    for (let i = 0; i < 1800; i++) { const x = r() * IW, y = f(x) + 6 + r() * (IH - f(x)); dab(pal, x, y, 10 + r() * 22, 3 + r() * 6, (r() - .5) * .4); }
  }
  // the lights: thick along the bowl, thinning up the slopes; the same in both, because they are lit either way
  const towns = Array.from({ length: 36 }, () => [r() * IW, hy + 60 + Math.pow(r(), .6) * (ry - hy - 80), 30 + r() * 110]);
  for (let i = 0; i < 4200; i++) {
    const c0 = towns[r() * towns.length | 0], a = r() * 6.283, d = Math.sqrt(-2 * Math.log(r() + 1e-6)) * c0[2] * .4;   // clustered: neighbourhoods
    const x = i % 5 ? c0[0] + Math.cos(a) * d * 1.8 : r() * IW, y = i % 5 ? c0[1] + Math.sin(a) * d * .5 : hy + 50 + r() * (ry - hy - 60), s = 1 + r() * 2.2;
    if (y < hy + 40 || y > ry - 30) continue;
    const col = P.lights[r() * 4 | 0];
    both(c => { c.fillStyle = col; c.fillRect(x, y, s, s); });
  }
  // the viewpoint: a paved lip and a low railing, the drop to the town beyond it
  both((c, k) => { c.fillStyle = P.ground[k][2]; c.fillRect(0, ry, IW, IH - ry); });
  for (let i = 0; i < 2500; i++) dab(P.ground, r() * IW, ry + r() * (IH - ry), 12 + r() * 20, 3 + r() * 5, (r() - .5) * .3);
  both((c, k) => {
    c.fillStyle = P.rail[k]; c.fillRect(0, ry - 26, IW, 5); c.fillRect(0, ry - 8, IW, 4);
    for (let x = 20; x < IW; x += 70) c.fillRect(x, ry - 30, 6, 30);
  });
  return [cl, cd];
}
export async function load(ctx) {
const { input, layer } = ctx;
layer.innerHTML = `<style>
.quote { position: fixed; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 60px); transform: translateX(-50%); width: min(560px, calc(100% - 32px)); display: flex; flex-direction: column; align-items: flex-start; gap: 8px; pointer-events: none; }
.quote p { margin: 0; background: var(--paper); color: var(--ink); padding: 8px 16px 10px; box-shadow: 4px 4px 0 var(--black); font-size: clamp(15px, 2.2vw, 19px); font-weight: 600; line-height: 1.3; clip-path: polygon(0% 10%, 6% 0%, 18% 6%, 30% 1%, 44% 7%, 58% 0%, 72% 6%, 86% 1%, 100% 5%, 99% 50%, 100% 92%, 88% 100%, 74% 94%, 60% 100%, 46% 95%, 32% 100%, 18% 94%, 4% 100%, 1% 50%); opacity: 0; transition: opacity .5s, transform .5s; }
.quote p.on { opacity: 1; }
.quote p:nth-child(odd) { transform: rotate(-1.2deg); }
.quote p:nth-child(even) { transform: rotate(.9deg); margin-left: 18px; }
.quote .star { display: inline-block; margin-left: 8px; color: var(--red); }
.wish { position: fixed; left: 50%; top: 42%; transform: translate(-50%, -50%); font-family: var(--mono); font-size: 13px; letter-spacing: .1em; color: var(--paper); opacity: 0; transition: opacity .6s; pointer-events: none; text-shadow: 0 1px 6px var(--black); }
.wish.on { opacity: .9; }
</style>
<div class="tag">HAIRPIN · SHILLONG</div>
<div class="quote" id="quote" aria-live="polite"></div>
<div class="wish" id="wish">HOLD TO WISH</div>`;
const $ = s => layer.querySelector(s);
ctx.bed({ crickets: 1, wind: .4 });
const [iLit, iDark] = await Promise.all([loadImg(at('shillong-lit.jpg')), loadImg(at('shillong-dark.jpg'))]);
const [srcLit, srcDark] = iLit && iDark ? [iLit, iDark] : placeholder();
// depth: depth.png once the real pair exists (tools/make_depth.py); until then built from the placeholder's own layout
function layoutDepth() {
  const c = mkCanvas(IW, IH), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, IH), f = v => `rgb(${v * 255 | 0},${v * 255 | 0},${v * 255 | 0})`;
  g.addColorStop(0, f(0)); g.addColorStop(HORIZON - .02, f(0)); g.addColorStop(HORIZON + .03, f(.18));   // sky, then the far ridge
  g.addColorStop(RAIL - .04, f(.62)); g.addColorStop(RAIL + .02, f(.8)); g.addColorStop(1, f(1));        // the town falling away below us, then the viewpoint
  x.fillStyle = g; x.fillRect(0, 0, IW, IH); return c;
}
const stage = new Stage({ W: IW, H: IH, depth: (iLit && await loadImg(at('depth.png'))) || layoutDepth(), k: .3 });
const tLit = tex(srcLit), tDark = tex(srcDark), tStroke = tex(strokeMap(srcLit, IW, IH));

/* ---------- light model, in painting pixels ---------- */
const U = {
  tLit: { value: tLit }, tDark: { value: tDark }, tStroke: { value: tStroke },
  uImg: { value: new THREE.Vector2(IW, IH) },
  uHead: { value: new THREE.Vector2(-999, -999) }, uDir: { value: new THREE.Vector2(1, 0) }, uScale: { value: 1 }, uHeadI: { value: 1 },
  uMode: ctx.U.uMode, uTime: { value: 0 },
};
const LIGHT = NOISE + /* glsl */`
uniform vec2 uImg, uHead, uDir; uniform float uScale, uMode, uTime, uHeadI;
uniform sampler2D tLit, tDark, tStroke;
float lightAt(vec2 p){
  vec2 v = p - uHead; float along = dot(v, uDir); float perp = length(v - uDir * along);
  float range = 560. * uScale;
  float cone = step(0., along) * (1. - smoothstep(along * .30, along * .42 + 6., perp)) * (1. - smoothstep(range * .45, range, along));
  float spill = 1. - smoothstep(26. * uScale, 120. * uScale, length(v * vec2(1., 2.2)));
  return cone * 1.5 * uHeadI + spill * 1.1 * max(uHeadI, .15);   // engine off: just the parking light
}
vec2 uvOf(vec2 p){ return vec2(p.x / uImg.x, 1. - p.y / uImg.y); }
float reveal(vec2 p, float L){
  float s = texture2D(tStroke, uvOf(p)).r;
  float t = .22 + .6 * (1. - s);          // bright strokes catch the light first
  float on = smoothstep(t - .05, t + .05, L);
  return uMode > 1.5 ? 1. : (uMode > .5 ? 0. : on);
}`;

/* ---------- the painting, the city twinkling ---------- */
const scene = new THREE.Scene();
const camera = stage.cam;
const bg = stage.mesh(new THREE.ShaderMaterial({
  uniforms: U,
  fragmentShader: LIGHT + /* glsl */`
    varying vec2 vPx;
    void main(){
      vec2 p = vPx, uv = uvOf(p);
      vec3 lit = texture2D(tLit, uv).rgb, dark = texture2D(tDark, uv).rgb;
      vec3 col = mix(dark, lit * vec3(1.05, .97, .86), reveal(p, lightAt(p)));
      // the town's lights: anything bright in the night painting twinkles through the air
      float glow = smoothstep(.5, .8, dot(dark, vec3(.333)));
      col += dark * glow * (.25 * sin(uTime * (2. + h12(floor(p / 3.)) * 4.) + h12(floor(p / 3.) + 7.) * 6.28) + .15);
      gl_FragColor = vec4(col, 1.);
    }`,
}));
scene.add(bg);

/* ---------- the two of us at the railing, seen from behind ---------- */
const cutout = (w, h, draw) => { const c = mkCanvas(w, h); draw(c.getContext('2d')); return tex(paintFigure(c, PALETTE.ink, 3)); };   // painted to match, with the thin line
const back = (fill, extra) => cutout(200, 240, c => {
  const shape = (dx, dy) => {
    c.beginPath(); c.moveTo(18 + dx, 240); c.bezierCurveTo(14 + dx, 150 + dy, 30 + dx, 108 + dy, 100 + dx, 104 + dy); c.bezierCurveTo(170 + dx, 108 + dy, 186 + dx, 150 + dy, 182 + dx, 240); c.fill();
    c.beginPath(); c.ellipse(100 + dx, 62 + dy, 30, 36, 0, 0, Math.PI * 2); c.fill(); if (extra) extra(c, dx, dy);
  };
  c.fillStyle = SHILLONG_PLACEHOLDER.rimTown; shape(3, -3);   // rim: the town's glow catching the shoulders
  c.fillStyle = fill; shape(0, 0);
});
const footGeo = new THREE.PlaneGeometry(1, 1).translate(0, .5, 0);
[[back(FIGURE.backFill[0], (c, dx, dy) => { c.beginPath(); c.ellipse(100 + dx, 28 + dy, 17, 13, 0, 0, Math.PI * 2); c.fill(); }), .55], [back(FIGURE.backFill[1]), .61]].forEach(([map, x]) => {
  const m = new THREE.Mesh(footGeo, new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }));
  const y = RAIL * IH + 30, h = 150;
  stage.place(m, x * IW, y, [h * 200 / 240, h]); m.renderOrder = 3; m.frustumCulled = false; scene.add(m);
});

/* ---------- the truck that gave you a lift, parked nose to the railing ---------- */
const [tkL, tkD] = await Promise.all(['truck-lit', 'truck-dark'].map(n => loadImg(at(`../08-edge-scene/sprites/${n}.png`))));
const truckMat = new THREE.ShaderMaterial({
  uniforms: { tL: { value: tex(tkL) }, tD: { value: tex(tkD) }, uL: { value: .2 }, uMode: U.uMode }, transparent: true, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: 'uniform sampler2D tL, tD; uniform float uL, uMode; varying vec2 vUv; void main(){ vec4 l = texture2D(tL, vUv), d = texture2D(tD, vUv); float k = uMode > 1.5 ? 1. : (uMode > .5 ? 0. : uL); gl_FragColor = vec4(mix(d.rgb, l.rgb, k), l.a); }',
});
const TRUCK = { x: .2 * IW, y: .93 * IH, h: 230 }, truckW = TRUCK.h * tkL.width / tkL.height;
const truck = new THREE.Mesh(footGeo, truckMat); truck.frustumCulled = false; truck.renderOrder = 2;
stage.place(truck, TRUCK.x, TRUCK.y, [truckW, TRUCK.h]); scene.add(truck);
U.uHead.value.set(TRUCK.x + truckW * .47, TRUCK.y - TRUCK.h * .2); U.uDir.value.set(1, -.12).normalize(); U.uScale.value = 1.2;

/* ---------- the shooting star ---------- */
const STAR = { from: [.16 * IW, .2 * IH], to: [.78 * IW, .36 * IH] };   // low enough to cross the frame before the camera rises
const starMat = new THREE.ShaderMaterial({
  uniforms: { uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  // vUv.x: 0 at the tail, 1 at the head
  fragmentShader: 'uniform float uI; varying vec2 vUv; void main(){ float w = 1. - abs(vUv.y - .5) * 2.; float a = pow(vUv.x, 2.5) * w * w + exp(-pow((1. - vUv.x) * 26., 2.)) * w * 1.5; gl_FragColor = vec4(vec3(1., .96, .85) * a * uI, 1.); }',
});
const star = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), starMat); star.frustumCulled = false; star.renderOrder = 5; star.visible = false; scene.add(star);
const starDir = new THREE.Vector2(STAR.to[0] - STAR.from[0], STAR.to[1] - STAR.from[1]), starLen = starDir.length(); starDir.normalize();
star.rotation.z = Math.atan2(-starDir.y, starDir.x);

/* ---------- framing: locked, covering the screen ---------- */
let viewW = IW, viewH = IH;
function resize(w, h) {
  const aspect = w / h, Z = 1.25;   // in a little, so there's room to rise
  if (aspect > IW / IH) { viewW = IW; viewH = IW / aspect; } else { viewH = IH; viewW = IH * aspect; }
  viewW /= Z; viewH /= Z;
  const cx = clamp(.45 * IW, viewW / 2, IW - viewW / 2), cy = clamp(.5 * IH, viewH / 2, IH - viewH / 2);
  stage.view(cx, cy, viewH, aspect);
}

/* ---------- sound: the engine ticking as it cools ---------- */
let nextTick = 0, tickGap = .25;
function tick() {
  try {
    const ac = ctx.ac; if (!ac) return;
    const t0 = ac.currentTime, n = ac.createBufferSource(), b = ac.createBuffer(1, 600, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / 60);
    const f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = 'bandpass'; f.frequency.value = 2400 + Math.random() * 1600; f.Q.value = 8; g.gain.value = .5;
    n.buffer = b; n.connect(f).connect(g).connect(ctx.out); n.start(t0);
  } catch (e) {}
}
function chime() {   // the wish taking: two soft bells
  try {
    const ac = ctx.ac; if (!ac) return;
    const t0 = ac.currentTime;
    for (const [f, at] of [[1320, 0], [1760, .12]]) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t0 + at); g.gain.exponentialRampToValueAtTime(.06, t0 + at + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + at + 1.6);
      o.connect(g).connect(ctx.out); o.start(t0 + at); o.stop(t0 + at + 1.7);
    }
  } catch (e) {}
}

/* ---------- the beat: engine off, the star, the quote ---------- */
// cut B, one torn label per line
const QUOTE = [
  'Years ago I saw one of these and didn’t wish.',
  'I just smiled, and kept it in the bank for when I’d need it.',
  'I think I spent it tonight, at the cloud line.',
  'Maybe he spent his on this road too.',
  'This one, I’m keeping.',
];
// ponytail: timeline in seconds after the engine goes off; retime to the recorded narration
const T = { star: 6, starDur: 3.4, quote: [11, 15, 19.5, 24, 29], end: 33 };
const HOLD_TO_BANK = .6;   // seconds of holding while the star is up
const KEY = 'hairpin.wish';
let phase = 'arrive', since = 0, heldFor = 0, banked = false, shown = 0;
const bye = line('shillong');   // the passenger's sign-off, before the star: never about the wish
let byeSaid = false;
function bankWish() {
  banked = true; chime();
  try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}   // read by the dashboard: a paper star on your next visit
}
function go(next) {
  phase = next; since = 0;
  if (next === 'stop') {
    heldFor = 0; banked = false; shown = 0; byeSaid = false; ctx.say(null); tickGap = .25; nextTick = .4;
    $('#quote').innerHTML = QUOTE.map(l => `<p>${l}</p>`).join('');
  }
}
const LABEL = { arrive: 'Turn the engine off', done: 'Again' };
const ready = () => phase === 'arrive' || phase === 'done';
// Again: back to the stand; the star you banked is already on the dashboard
const advance = () => { if (phase === 'arrive') go('stop'); else if (phase === 'done') ctx.go('stand'); };
// ?t=8 jumps straight to that moment after the engine goes off (for checking frames)
if (ctx.params.has('t')) { go('stop'); since = +ctx.params.get('t'); }

/* ---------- loop ---------- */
function frame(dt) {
  const t = (U.uTime.value += dt), held = input.hold;   // HOLD: wish, while the star is up
  since += dt;
  if (phase === 'stop') {
    // their sign-off: the expression first, then the words
    if (bye && !byeSaid && since > 2) { byeSaid = true; ctx.say(bye.who, bye.text, 3.6, bye.expr); }
    // engine ticks, further and further apart
    if (ctx.ac && since > nextTick) { tick(); tickGap *= 1.18; nextTick = since + tickGap * (.7 + Math.random() * .6); }
    // the star: up for starDur seconds; holding while it's up banks the wish
    const k = (since - T.star) / T.starDur, up = k > 0 && k < 1;
    star.visible = up;
    if (up) {
      if (held && !banked) { heldFor += dt; if (heldFor > HOLD_TO_BANK) bankWish(); }
      const e = 1 - Math.pow(1 - k, 1.6), len = 160 + (held || banked ? 120 : 0);
      const hx = STAR.from[0] + starDir.x * starLen * e, hy = STAR.from[1] + starDir.y * starLen * e;
      stage.place(star, hx - starDir.x * len / 2, hy - starDir.y * len / 2, [len, banked ? 9 : 6], 0);
      starMat.uniforms.uI.value = sstep(0, .08, k) * (1 - sstep(.8, 1, k)) * (banked ? 1.6 : 1);
    }
    $('#wish').classList.toggle('on', up && !banked);
    // the quote sets itself, one torn label at a time; a paper star on the last if you wished
    while (shown < QUOTE.length && since > T.quote[shown]) {
      const p = $('#quote').children[shown++]; p.classList.add('on');
      if (shown === QUOTE.length && banked) p.insertAdjacentHTML('beforeend', '<span class="star" aria-label="wish banked">★</span>');
    }
    if (since > T.end) phase = 'done';
  }
  ctx.prompt(ready() ? LABEL[phase] : null);
  // engine off: the headlights die back to a faint parking light
  U.uHeadI.value = phase === 'arrive' ? 1 : .12 + .88 * (1 - Math.min(1, since / 1.4));
  // the camera: low on the road at first, then a slow rise to the city while the quote sets
  const rise = phase === 'arrive' ? 0 : sstep(T.quote[0] - 1, T.quote[T.quote.length - 1] + 2, since);
  Object.assign(stage.target, { dy: lerp(.1, -.08, rise) * IH, pitch: lerp(-.01, .025, rise) });
  stage.update(dt, phase === 'arrive' ? 4 : 1);
  ctx.ink.render(scene, camera, null);   // no taxi here: just the grain and vignette
}
return { frame, resize, onTap: advance, dispose() { disposeScene(scene); } };
}
