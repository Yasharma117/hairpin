// Shillong: the truck that gave you a lift parks at the viewpoint above the city. It's November, and the cherry is in bloom:
// a tree over the railing, blossom down the slopes, petals in the air (blossom.js). The engine goes off and ticks as it cools;
// the passenger signs off; a shooting star crosses on a gust and the two of you look up (hold while it's up to bank the
// wish, and the tree lets go of a shower of petals); the quote sets itself on the night, a line at a time (a tap brings
// the next); then the end card: Hairpin, by Yash Sharma, Again or Title.
import * as THREE from 'three';
import { clamp, lerp, sstep, mkCanvas, loadImg, tex, strokeMap, NOISE, line, passenger, disposeScene, Stage, makeTruck, keyLight } from '../shared/kit.js';
import { SHILLONG_PLACEHOLDER } from '../shared/style.js';
import * as folk from '../shared/folk.js';
import { paintTree, paintOverlay, treeMesh, Petals, TREE } from './blossom.js';

const at = f => new URL(f, import.meta.url).href;
export const assets = [];

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
/* the quote: serif lines straight on the night, no panels; each comes in as the one before settles */
.quote { position: fixed; left: 50%; top: calc(var(--top) + 64px * var(--u)); transform: translateX(-50%); width: min(calc(640px * var(--u)), calc(100% - 2 * var(--gutter))); margin: 0;
  display: flex; flex-direction: column; align-items: center; gap: calc(10px * var(--u)); pointer-events: none; z-index: 9; transition: opacity 400ms ease; }
.quote p { margin: 0; text-align: center; text-wrap: balance; color: var(--ui-cream); font: 400 clamp(19px, 2.4vw, calc(26px * var(--u)))/1.34 var(--serif); font-optical-sizing: auto;
  text-shadow: 0 var(--line) 0 var(--night), var(--line) 0 0 var(--night), calc(-1 * var(--line)) 0 0 var(--night), 0 calc(-1 * var(--line)) 0 var(--night);   /* a 1-pixel night edge: legible over petals and lights */
  opacity: 0; transform: translateY(6px); transition: opacity 360ms cubic-bezier(.23, 1, .32, 1), transform 360ms cubic-bezier(.23, 1, .32, 1); }
.quote p.on { opacity: 1; transform: none; }
.quote p:last-child { margin-top: calc(10px * var(--u)); font-style: italic; font-size: clamp(22px, 2.9vw, calc(31px * var(--u))); }   /* the turn: the one being kept */
.quote .star { color: var(--ui-signal); font-style: normal; margin-left: .3em; }
.quote.gone { opacity: 0; }
.wish { top: 46%; }
.wish .fill { position: absolute; inset: 0; padding: inherit; background: var(--ui-signal); color: var(--ui-cream); clip-path: inset(0 100% 0 0); }
/* the end card: a cream sheet, the title as on the title card, the credit, the way out */
.end { position: fixed; left: 50%; top: calc(var(--top) + 64px * var(--u)); z-index: 12; transform: translateX(-50%); width: max-content; max-width: calc(100% - 2 * var(--gutter)); box-sizing: border-box;
  display: flex; flex-direction: column; align-items: center; gap: calc(6px * var(--u)); padding: calc(26px * var(--u)) calc(36px * var(--u)) calc(24px * var(--u)); text-align: center;
  animation: endin 280ms steps(4) both; }
.end h2 { margin: 0; font: 400 calc(64px * var(--u))/.9 var(--display); letter-spacing: -.02em; color: var(--ui-ink); }
.end .by { margin: 0; font: italic 400 calc(21px * var(--u))/1.3 var(--serif); color: var(--ui-ink); }
.end .for { font-size: var(--t1); }
.end .row { display: flex; gap: calc(12px * var(--u)); margin-top: calc(14px * var(--u)); padding-top: calc(18px * var(--u)); border-top: 2px dashed var(--ui-wood); }
.end .again::after { content: "▶"; color: var(--ui-signal); font-size: .8em; }
@keyframes endin { from { opacity: 0; transform: translate(-50%, 8px); } }
@media (prefers-reduced-motion: reduce) { .quote p, .quote { transition: opacity 200ms; transform: none; } .end { animation: none; } }
</style>
<div class="tag">HAIRPIN · SHILLONG</div>
<div class="quote" id="quote" aria-live="polite"></div>
<div class="hint wish" id="wish" aria-hidden="true">Hold to wish<span class="fill" id="fill">Hold to wish</span></div>
<section class="panel end" id="end" aria-labelledby="end-t" hidden>
  <h2 id="end-t">Hairpin</h2>
  <p class="by">by Yash Sharma</p>
  <span class="label for">Made for Pocket FM Design</span>
  <span class="label for">Music: Blue Dot Sessions · CC BY-NC 4.0</span>
  <div class="row"><button class="btn again" id="again" type="button">Again</button><button class="btn" id="title" type="button">Title</button></div>
</section>`;
const $ = s => layer.querySelector(s);
ctx.bed({ engine: 1, crickets: 1, wind: .4 }); ctx.rpm(0);   // the truck idling at the railing
// shillong-lit.jpg + shillong-dark.jpg aren't painted yet: not fetched (two 404s a visit); load them here once they exist
const iLit = null, iDark = null;
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

/* ---------- the cherry blossom: trees down the slopes and petals on the ground, then the tree over the railing ---------- */
const [oL, oD] = paintOverlay(IW, IH, HORIZON, RAIL, !(iLit && iDark)).map(tex);   // the real painting brings its own trees
const overlay = stage.mesh(new THREE.ShaderMaterial({
  uniforms: { ...U, tOL: { value: oL }, tOD: { value: oD } }, transparent: true,
  fragmentShader: LIGHT + /* glsl */`
    uniform sampler2D tOL, tOD; varying vec2 vPx;
    void main(){
      vec2 uv = uvOf(vPx); vec4 l = texture2D(tOL, uv), d = texture2D(tOD, uv);
      if (d.a < .01) discard;
      gl_FragColor = vec4(mix(d.rgb, l.rgb, reveal(vPx, lightAt(vPx))), d.a);
    }`,
}));
overlay.renderOrder = -9; scene.add(overlay);
const tree = treeMesh(U, LIGHT); scene.add(tree);   // painted in resize, on the frame's pixel grid
const TREE_D = .97;   // right at the front: it moves most when the camera rises
const touch = ctx.isTouch;
const petals = [
  new Petals({ stage, U, light: LIGHT, grid: ctx.ink.size, n: touch ? 140 : 340, d0: .25, d1: .75, size: [2.6, 5.5], IW, IH, HORIZON, RAIL, near: false }),
  new Petals({ stage, U, light: LIGHT, grid: ctx.ink.size, n: touch ? 70 : 160, d0: .86, d1: .97, size: [4, 8.5], IW, IH, HORIZON, RAIL, near: true }),
];
for (const p of petals) scene.add(p.points);
let gust = 0, gustTo = 0, windy = false;

/* ---------- the two of us at the railing, sitting, seen from behind (shared/folk.js) ---------- */
// you on the left, the passenger on the right as dressed at the stand (folk's default look if nobody was). One sprite pixel
// is one frame pixel: placed at g painting px per sprite px (set in resize), and snapped to the grid every frame.
const rider = passenger();
const pair = [folk.person('you'), folk.person(rider || {})];
const PAIR = { x: .585 * IW, y: RAIL * IH + 26, gap: 30 };   // gap: sprite px between the two
for (const p of pair) { p.face('back'); p.play('sit'); p.obj.renderOrder = 3; p.mesh.renderOrder = 3; p.obj.traverse(o => { o.frustumCulled = false; }); scene.add(p.obj); }
pair[1].update(.7);   // out of step with you: two heads don't sway as one
let g = 3;            // painting px per frame pixel, at the rest framing
// snap obj so its local point (lx, ly) lands on a frame-pixel corner, through the moving camera
const _p = new THREE.Vector3();
function snap(obj, lx, ly) {
  const base = obj.userData.base || (obj.userData.base = obj.position.clone());
  obj.position.copy(base);
  const G = ctx.ink.size, sx = obj.scale.x, per = sx / (obj.userData.unit || 1);   // world units per frame pixel
  _p.set(base.x + lx * sx, base.y + ly * obj.scale.y, base.z).project(camera);
  const gx = (_p.x * .5 + .5) * G.x, gy = (_p.y * .5 + .5) * G.y;
  obj.position.x += (Math.round(gx) - gx) * per; obj.position.y += (Math.round(gy) - gy) * per;
}
function placePair() {
  pair.forEach((p, i) => {
    stage.place(p.obj, PAIR.x + (i - .5) * PAIR.gap * g, PAIR.y, g); p.obj.userData.base = p.obj.position.clone();
  });
}

/* ---------- the truck that gave you a lift, parked nose to the railing ---------- */
const { truck, mat: truckMat } = makeTruck(U.uMode);   // built in 3D like the taxi (shared/kit.js)
truck.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), .2).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -.25));
const TRUCK = { x: .2 * IW, y: .93 * IH, size: 66 }, truckW = TRUCK.size * 7.6 * Math.cos(.25), truckH = TRUCK.size * 3.3;
stage.place(truck, TRUCK.x, TRUCK.y, TRUCK.size); scene.add(truck);
U.uHead.value.set(TRUCK.x + truckW * .5, TRUCK.y - truckH * .38); U.uDir.value.set(1, -.12).normalize(); U.uScale.value = 1.2;

/* ---------- the shooting star, drawn in frame pixels ---------- */
// A bright head pixel with a stepped glow, a 1 px tail fading in three steps, and dust that flickers off it. The mesh only
// covers the star; the shader draws it on the frame's pixel grid from the head's projected position (uHead, uDir in frame px).
let STAR = { from: [.16 * IW, .2 * IH], to: [.78 * IW, .36 * IH] };   // set from the framing in resize
const starMat = new THREE.ShaderMaterial({
  uniforms: { uI: { value: 0 }, uT: { value: 0 }, uHead: { value: new THREE.Vector2() }, uDir: { value: new THREE.Vector2(1, 0) }, uLen: { value: 40 }, cStar: { value: new THREE.Color(SHILLONG_PLACEHOLDER.star) } },
  transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  vertexShader: 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: /* glsl */`
    uniform float uI, uT, uLen; uniform vec2 uHead, uDir; uniform vec3 cStar;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 p = floor(gl_FragCoord.xy * .5) + .5, v = p - uHead;   // this frame pixel (the scene renders at 2x the grid)
      float along = -dot(v, uDir), perp = abs(v.x * uDir.y - v.y * uDir.x), m = abs(v.x) + abs(v.y), a = 0.;
      if (along > 0. && along < uLen && perp < .55) a = along < uLen * .3 ? .8 : along < uLen * .65 ? .45 : .2;
      if (m < .5) a = 1.4; else if (m < 1.5) a = max(a, .8); else if (m < 2.5) a = max(a, .3);
      if (along > 3. && along < uLen * .7 && perp > .9 && perp < 2.6 && h(p + floor(uT * 10.)) > .94) a = max(a, .35);
      if (a == 0.) discard;
      gl_FragColor = vec4(cStar * a * uI, 1.);
    }`,
});
const star = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), starMat); star.frustumCulled = false; star.renderOrder = 8;   // over the tree: it must be seen
star.visible = false; scene.add(star);
const _h = new THREE.Vector3(), _t = new THREE.Vector3();
const toGrid = v => { v.project(camera); return [(v.x * .5 + .5) * ctx.ink.size.x, (v.y * .5 + .5) * ctx.ink.size.y]; };

/* ---------- framing: locked, covering the screen ---------- */
let viewW = IW, viewH = IH;
function resize(w, h) {
  const aspect = w / h, Z = 1.25;   // in a little, so there's room to rise
  if (aspect > IW / IH) { viewW = IW; viewH = IW / aspect; } else { viewH = IH; viewW = IH * aspect; }
  viewW /= Z; viewH /= Z;
  // portrait: centre on the two of us (landscape keeps the truck in, on the left)
  const cx = clamp(aspect < 1 ? PAIR.x + 10 : .45 * IW, viewW / 2, IW - viewW / 2), cy = clamp(.5 * IH, viewH / 2, IH - viewH / 2 - .13 * IH);   // room below for the low start (dy .1 IH, plus the near ground's parallax)
  stage.view(cx, cy, viewH, aspect);
  // the tree: its trunk at the right edge of the frame (just past it in portrait, so only the crown reaches in) and its foot
  // well below it (the camera rises later), the crown overhead
  g = viewH / ctx.ink.size.y;
  const gh = Math.round((viewH + 100) / g), gw = Math.round(gh * TREE.w / TREE.h), H = gh * g, W = gw * g;   // whole frame pixels
  const ax = cx + viewW / 2 + (aspect < 1 ? 200 : -30), ay = cy + viewH / 2 + 160;
  if (tree.material.uniforms.uTex.value.x !== gw) tree.setTex(paintTree(gw, gh));
  stage.place(tree, ax, ay, [W, H], TREE_D); tree.userData.base = tree.position.clone(); tree.userData.unit = gw;   // its local unit is the whole tree
  tree.material.uniforms.uAnchor.value.set(ax, ay); tree.material.uniforms.uSize.value.set(W, H);
  const view = { x0: cx - viewW / 2, x1: cx + viewW / 2, y0: cy - viewH / 2 - 100, y1: cy + viewH / 2 };
  const crown = { x0: ax - W * TREE.anchorU * .9, x1: ax + W * (1 - TREE.anchorU), y0: ay - H * .95, y1: ay - H * .45 };
  for (const p of petals) p.setView(view, crown);
  placePair();
  // the star: across the upper sky of the opening framing (the camera sits .1 IH low until it rises)
  const top = cy + .1 * IH - viewH / 2;
  STAR = { from: [cx - viewW * .4, top + viewH * .23], to: [cx + viewW * .3, top + viewH * .37] };   // below the dialogue box
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
// cut B, a line at a time
const QUOTE = [
  'Years ago I saw one of these and didn’t wish.',
  'I just smiled, and kept it in the bank for when I’d need it.',
  'I think I spent it tonight, at the cloud line.',
  'Maybe he spent his on this road too.',
  'This one, I’m keeping.',
];
// ponytail: timeline in seconds; retime to the recorded narration. star: after the engine goes off. The star waits for
// the viewer: unbanked it crawls (SLOW s to cross), banked it streaks off (FAST). The quote counts from when it's gone.
// bye: their sign-off, once the lights have died; the star after its box has gone (a breath of ticks between); card: the
// end card, after the last line has sat a while
const T = { firstTick: 1.7, bye: 1, hint: 1, star: 8, quote: [1.6, 5.6, 10.1, 14.6, 19.6], card: 24.6 };
const SLOW = 9, FAST = 1.4;
const HOLD_TO_BANK = .6;   // seconds of holding while the star is up
const KEY = 'hairpin.wish';
let phase = 'arrive', since = 0, heldFor = 0, banked = false, shown = 0, starK = 0, starEnd = Infinity, skip = 0;   // skip: s the quote was brought forward by taps
const bye = line('shillong');   // the passenger's sign-off, before the star: never about the wish
let byeSaid = false;
function bankWish() {
  banked = true; chime();
  gustTo = 1; petals[1].shower(.4);   // the tree lets go
  try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}   // read by the dashboard: a paper star on your next visit
}
function go(next) {
  phase = next; since = 0;
  if (next === 'stop') {
    ctx.engineOff();   // the revs sag, the key clicks; then near silence until the metal starts to tick
    heldFor = 0; banked = false; shown = 0; byeSaid = false; starK = 0; starEnd = Infinity; skip = 0;
    ctx.say(null); tickGap = .25; nextTick = T.firstTick;
    $('#quote').innerHTML = QUOTE.map(l => `<p>${l}</p>`).join('');
  }
}
// the quote's own clock: from the star's end, plus whatever taps brought forward
const qt = () => since - starEnd + skip;
// a tap: turns the engine off; during the quote, brings the next line (after the last, the card) now
function advance() {
  if (phase === 'arrive') go('stop');
  else if (phase === 'stop' && shown > 0) skip += Math.max(0, (shown < QUOTE.length ? T.quote[shown] : T.card) - qt());
}
// the end card: Again goes back to the stand (the star you banked is already on the dashboard); Title reloads to the title
// card (index.html has no call that brings it back, and a reload leaves the piece as a first visit would find it)
const endEl = $('#end');
function showEnd() {
  phase = 'done'; $('#quote').classList.add('gone');
  endEl.hidden = false; $('#again').focus({ preventScroll: true });
}
ctx.on($('#again'), 'click', () => ctx.go('stand'));
ctx.on($('#title'), 'click', () => { location.href = location.pathname; });
// ?t=8 jumps straight to that moment after the engine goes off (for checking frames), the star unbanked
if (ctx.params.has('t')) {
  go('stop'); since = +ctx.params.get('t'); nextTick = since + .2; byeSaid = since > T.bye + 1;
  starK = clamp((since - T.star) / SLOW, 0, 1); if (starK >= 1) starEnd = T.star + SLOW;
}

/* ---------- loop ---------- */
const wishEl = $('#wish'), fillEl = $('#fill');
let fillShown = -1;
function frame(dt) {
  const t = (U.uTime.value += dt), held = input.hold;   // HOLD: wish, while the star is up
  since += dt;
  let starUp = false;
  if (phase === 'stop') {
    // their sign-off: the expression first, then the words
    if (bye && !byeSaid && since > T.bye) { byeSaid = true; ctx.say(bye.who, bye.text, 3.6, bye.expr); }
    // engine ticks, further and further apart
    if (ctx.ac && since > nextTick) { tick(); tickGap *= 1.18; nextTick = since + tickGap * (.7 + Math.random() * .6); }
    // the star comes in on a gust; the hint a second before it
    if (since > T.star - .9 && since < T.star) gustTo = Math.max(gustTo, .75);
    if (since > T.star - .9) ctx.score?.('bloom');   // the star: the theme blooms and comes home (the wish chime is in its key)
    const asking = !banked && starEnd === Infinity && since > T.star - T.hint;
    if (since > T.star && starK < 1) {
      starUp = true;
      starK = Math.min(1, starK + dt / (banked ? FAST : SLOW));
      if (starK >= 1) starEnd = since;
    }
    // holding fills the hint (it drains twice as fast when let go); it banks once the star is up
    if (!banked) heldFor = asking && held ? heldFor + dt : Math.max(0, heldFor - dt * 2);
    if (!banked && starUp && heldFor >= HOLD_TO_BANK) bankWish();
    wishEl.classList.toggle('on', asking || (banked && since < starEnd + .2));
    const f = banked ? 1 : Math.round(clamp(heldFor / HOLD_TO_BANK, 0, 1) * 8) / 8;   // in eight steps, like a pixel bar
    if (f !== fillShown) { fillShown = f; fillEl.style.clipPath = `inset(0 ${100 - f * 100}% 0 0)`; }
    // the quote sets itself, a line at a time; a star after the last if you wished
    while (shown < QUOTE.length && qt() > T.quote[shown]) {
      const p = $('#quote').children[shown++]; p.classList.add('on');
      if (shown === QUOTE.length && banked) p.insertAdjacentHTML('beforeend', '<span class="star" aria-label="wish banked">★</span>');
    }
    if (shown === QUOTE.length && qt() > T.card) showEnd();
  }
  ctx.prompt(phase === 'arrive' ? 'Turn the engine off' : null);
  // engine off: the headlights die back to a faint parking light
  U.uHeadI.value = phase === 'arrive' ? 1 : .12 + .88 * (1 - Math.min(1, since / 1.4));
  truckMat.uniforms.uLamp.value = U.uHeadI.value;
  keyLight(truckMat, camera, truck.position, stage.toWorld(.6 * IW, .55 * IH, 0), .2);   // the city's glow below
  // the camera: low on the road at first, then a slow rise to the city while the quote sets
  const rise = phase === 'arrive' || starEnd === Infinity ? 0 : sstep(T.quote[0] - 1, T.quote[T.quote.length - 1] + 2, qt());
  Object.assign(stage.target, { dy: lerp(.1, .01, rise) * IH, pitch: lerp(-.01, .025, rise) });   // not so far that the two of you leave the frame
  stage.update(dt, phase === 'arrive' ? 4 : 1);
  // the two of us: the city's glow on our backs (folk's own lit rim, 'auto'), the beam's spill while it's on; snapped to the pixel grid
  // the star: you look up, they follow a beat later; both back down once it's gone
  pair.forEach((p, i) => {
    const look = phase === 'stop' && since > T.star + .2 + i * .3 && since < starEnd + .6 + i * .3;
    if (look !== (p.anim === 'lookup')) p.play(look ? 'lookup' : 'sit');
  });
  for (const p of pair) { p.update(dt); p.setLight(1.1, -1, 'auto'); snap(p.obj, p.mesh.position.x - p.w / 2, 0); }
  snap(tree, -TREE.anchorU, 0);
  // the star, in frame pixels
  star.visible = starUp;
  if (starUp) {
    const e = 1 - Math.pow(1 - starK, 1.3), len = (banked ? 93 : 56) * g;   // painting px (93, 56 frame px)
    const hx = lerp(STAR.from[0], STAR.to[0], e), hy = lerp(STAR.from[1], STAR.to[1], e), dx = STAR.to[0] - STAR.from[0], dy = STAR.to[1] - STAR.from[1], L = Math.hypot(dx, dy);
    const [gx, gy] = toGrid(stage.toWorld(hx, hy, 0, _h)), [tx, ty] = toGrid(stage.toWorld(hx - dx / L * len, hy - dy / L * len, 0, _t));
    starMat.uniforms.uHead.value.set(Math.floor(gx) + .5, Math.floor(gy) + .5);
    starMat.uniforms.uDir.value.set(gx - tx, gy - ty).normalize(); starMat.uniforms.uLen.value = Math.hypot(gx - tx, gy - ty);
    stage.place(star, hx - dx / L * len / 2, hy - dy / L * len / 2, [len + 12 * g, 14 * g], 0); star.rotation.z = Math.atan2(-dy, dx);
    starMat.uniforms.uI.value = (sstep(0, .03, starK) * (1 - sstep(.9, 1, starK)) > .5 ? 1 : .55) * (banked ? 1.25 : 1);
    starMat.uniforms.uT.value = t;
  }
  // the wind: a slow breathing, raised by the star and the wish; the petals and the tree go with it, and so does the sound
  gustTo = Math.max(0, gustTo - dt * .3);
  gust = lerp(gust, Math.max(gustTo, .28 * Math.max(0, Math.sin(t * .21) * Math.sin(t * .13 + 1))), 1 - Math.exp(-2 * dt));
  if (windy !== gust > .45) { windy = !windy; ctx.bed({ engine: phase === 'arrive' ? 1 : 0, crickets: 1, wind: windy ? 1 : .4 }); }   // never restarts the engine after the stop
  tree.material.uniforms.uSway.value = 1 + gust * 3;
  const ptr = input.ptr && stage.screenToPaint(...input.ptr);
  // petal sizes in frame pixels (the shader doubles them: the scene renders at ctx.ink.size.y * 2)
  const screen = ctx.ink.size.y / (2 * Math.tan(stage.fov * Math.PI / 360));
  for (const p of petals) { p.mat.uniforms.uScreen.value = screen; p.update(dt, t, gust, ptr); }
  ctx.ink.render(scene, camera, truck);
}
return { frame, resize, onTap: advance, dispose() { disposeScene(scene); } };
}
