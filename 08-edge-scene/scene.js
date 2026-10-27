// The edge: the last stretch of road into the cloud (hold to brake: it decides how far the nose goes over), the hang,
// the doors, sitting on the lip, the story wiping to the same cliff decades ago, him in ink with the ember, the flick,
// the taxi going over, and the truck that gives you a lift. Tap (or the chip) for each next step.
import * as THREE from 'three';
import { clamp, lerp, sstep, mkCanvas, loadImg, tex, strokeMap, NOISE, makeTaxi, makeTruck, LIVERY, passenger, line, disposeScene, Stage, keyLight, Steer } from '../shared/kit.js';
import * as folk from '../shared/folk.js';

const at = f => new URL(f, import.meta.url).href;
const SPRITES = ['ghost-1', 'ghost-2', 'then-car'];
export const assets = ['edge-lit.jpg', 'edge-dark.jpg', 'edge-then.jpg', 'depth.png', ...SPRITES.map(n => `sprites/${n}.png`)];

const IW = 1672, IH = 941;              // edge-lit/dark/then.jpg size in px; the whole scene lives in these units

// The cliff's side edge, traced off the painting as fractions: from the plateau's far corner down toward us, to where the rock face takes over.
const EDGE = [[.522, .432], [.5, .55], [.478, .65], [.475, .72]];
const SEATS = [[.445, .418], [.4, .42]];   // where the two of you sit: the passenger, then you, on the far lip
const lip = y => {   // the point on the edge at height y (a fraction of the painting), in painting px
  const i = clamp(EDGE.findIndex(([, ey]) => ey >= y), 1, EDGE.length - 1), [x0, y0] = EDGE[i - 1], [x1, y1] = EDGE[i];
  return [lerp(x0, x1, clamp((y - y0) / (y1 - y0), 0, 1)) * IW, y * IH];
};
// a seated figure's height by depth: about 50 px a metre at the taxi, more as the edge comes toward us
const figH = y => lerp(46, 70, (y / IH - EDGE[0][1]) / (EDGE[EDGE.length - 1][1] - EDGE[0][1]));

export async function load(ctx) {
const { input, layer, params: QS } = ctx;
layer.innerHTML = '<div class="tag">HAIRPIN · THE EDGE</div><div class="cue" id="brake" hidden>BRAKE</div>';
const $ = s => layer.querySelector(s);
ctx.bed({ engine: 1, wind: .6 });
const [imgs, spr, depthImg] = await Promise.all([Promise.all(['edge-lit.jpg', 'edge-dark.jpg', 'edge-then.jpg'].map(f => loadImg(at(f)))), Promise.all(SPRITES.map(n => loadImg(at(`sprites/${n}.png`)))), loadImg(at('depth.png'))]);
if (!imgs.every(Boolean) || !spr.every(Boolean) || !depthImg) throw new Error('edge paintings did not load');
const stage = new Stage({ W: IW, H: IH, depth: depthImg, k: .26 });
const SPR = Object.fromEntries(SPRITES.map((n, i) => [n, spr[i]]));
const [tLit, tDark, tThen] = imgs.map(tex), tStroke = tex(strokeMap(imgs[0], IW, IH));

/* ---------- shared light model, in painting pixels ---------- */
const U = {
  tLit: { value: tLit }, tDark: { value: tDark }, tStroke: { value: tStroke }, tThen: { value: tThen }, uThen: { value: 0 },
  uImg: { value: new THREE.Vector2(IW, IH) },
  uHead: { value: new THREE.Vector2(-999, -999) }, uDir: { value: new THREE.Vector2(1, 0) }, uScale: { value: 1.1 },
  uMode: ctx.U.uMode, uTime: { value: 0 },
  uEdge: { value: new THREE.Vector4(...lip(EDGE[0][1]), ...lip(.72)) }, uEmb: { value: new THREE.Vector3(-999, -999, 0) }, uFog: { value: 0 }, uSpill: { value: 1 },
};
const LIGHT = NOISE + /* glsl */`
uniform vec2 uImg, uHead, uDir; uniform float uScale, uMode, uTime, uSpill;
uniform sampler2D tLit, tDark, tStroke;
float lightAt(vec2 p){
  vec2 v = p - uHead; float along = dot(v, uDir); float perp = length(v - uDir * along);
  float range = 560. * uScale;
  float cone = step(0., along) * (1. - smoothstep(along * .30, along * .42 + 6., perp)) * (1. - smoothstep(range * .45, range, along));
  float spill = 1. - smoothstep(26. * uScale, 120. * uScale, length(v * vec2(1., 2.2)));
  return cone * 1.5 + spill * 1.1 * uSpill;
}
vec2 uvOf(vec2 p){ return vec2(p.x / uImg.x, 1. - p.y / uImg.y); }
float reveal(vec2 p, float L){
  float s = texture2D(tStroke, uvOf(p)).r;
  float t = .22 + .6 * (1. - s);          // bright strokes catch the light first
  float on = smoothstep(t - .05, t + .05, L);
  return uMode > 1.5 ? 1. : (uMode > .5 ? 0. : on);
}`;

/* ---------- the painting, the cloud, the smoke ---------- */
const scene = new THREE.Scene();
const camera = stage.cam;
const bgMat = new THREE.ShaderMaterial({
  uniforms: U,
  fragmentShader: LIGHT + /* glsl */`
    uniform vec4 uEdge; uniform vec3 uEmb; uniform float uFog; uniform sampler2D tThen; uniform float uThen;
    varying vec2 vPx;
    void main(){
      vec2 p = vPx, uv = uvOf(p);
      vec3 lit = texture2D(tLit, uv).rgb, dark = texture2D(tDark, uv).rgb;
      float L = lightAt(p);
      vec3 col = mix(dark, lit * vec3(1.05, .97, .86), reveal(p, L));
      // the cloud sea past the edge drifts, and the beams light it from inside
      float lx = mix(uEdge.x, uEdge.z, (p.y - uEdge.y) / (uEdge.w - uEdge.y));
      float cloudy = smoothstep(lx + 10., lx + 90., p.x) * smoothstep(.28 * uImg.y, .36 * uImg.y, p.y);
      float m = smoothstep(.35, .85, vn2(vec2(p.x * .004 + uTime * .02, p.y * .009)) * .7 + vn2(vec2(p.x * .012 - uTime * .035, p.y * .025)) * .3);
      vec3 mist = mix(vec3(.24, .28, .40), vec3(1., .93, .76), clamp(L * .6, 0., 1.));
      float live = step(uMode, .5);
      col = mix(col, mist, m * cloudy * (.25 + .3 * clamp(L, 0., 1.)) * live);
      // the cloud line: on the drive in, the cloud swallows everything and the beams hit a wall of white
      col = mix(col, mix(vec3(.3, .34, .45), vec3(1., .95, .82), clamp(L * .7, 0., 1.)), uFog * (.55 + .45 * m));
      col += vec3(.9, .8, .55) * clamp(L - .2, 0., 1.) * cloudy * .12 * live;
      // smoke off the ember: a thin curl that widens as it rises and goes back into the mist
      vec2 q = p - uEmb.xy; float h = -q.y;
      float cx = sin(h * .06 - uTime * 1.1) * h * .08 + h * .35;   // curls, and the wind takes it out over the drop
      float wid = max(2.5 + h * .07, .5), dx = (q.x - cx) / wid;
      float sm = exp(-dx * dx) * smoothstep(0., 8., h) * (1. - smoothstep(30., 110., h)) * (.6 + .4 * vn2(vec2(q.x * .05, h * .04 - uTime * .8)));
      col = mix(col, vec3(.62, .64, .72), clamp(sm * uEmb.z * .45, 0., 1.) * live);
      // now -> then: the story wipes the old cliff in, left to right, bright strokes first
      float fld = p.x / uImg.x * .75 + (1. - texture2D(tStroke, uv).r) * .25;
      float th = smoothstep(fld - .04, fld + .04, uThen * 1.1 - .05);
      vec3 thenC = mix(texture2D(tThen, uv).rgb, vec3(.86, .74, .58), m * cloudy * .4);
      col = mix(col, thenC, th);
      gl_FragColor = vec4(col, 1.);
    }`,
});
const bg = stage.mesh(bgMat);   // the painting, 2.5D
scene.add(bg);

const { jeep, hang, body, parts, put, jeepMat, PIVOT } = makeTaxi(U.uMode);
// front doors, hinged at the A-pillar. Right-hand drive: the passenger's is the far side (-z), yours faces the camera (+z).
const doors = [-1, 1].map(side => {
  const g = new THREE.Group(); g.position.set(.9, 0, side * .7); body.add(g);
  put(new THREE.BoxGeometry(1.24, .6, .03), LIVERY.body, { x: -.62, y: .56, z: side * .02 }, g);
  g.userData = { side, open: 0 }; return g;
});
for (const m of parts) m.layers.enable(1);   // the doors too, for the ink
// on the side edge near the far corner, nose out over the drop and turned a little away from us
const CAR = lip(.437), CAR_YAW = .25, CAR_SIZE = 50, CAR_D = stage.depthAt(CAR[0], CAR[1] + 6);
stage.place(jeep, CAR[0], CAR[1], CAR_SIZE, CAR_D);
jeep.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), .42).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), CAR_YAW));
scene.add(jeep);

/* ---------- on the pixel grid: 1 sprite px = 1 frame px, snapped to the frame's pixels ---------- */
const _pp = new THREE.Vector3();
// put o's origin at painting (x, y) at depth d, scaled so one unit is one frame pixel at that distance, and snapped so its
// pixels land on the frame's (oddX: the origin sits mid-pixel across, as a folk sprite's foot anchor does). Returns
// painting px per sprite px there. Call after the camera has moved this frame.
function pin(o, x, y, d, oddX = true) {
  const s = stage.place(o, x, y, null, d), cam = camera, h = ctx.ink.size.y, w = ctx.ink.size.x;
  const u = 2 * (cam.position.z - o.position.z) * Math.tan(cam.fov * Math.PI / 360) / h;
  o.scale.set(u, u, 1);
  _pp.copy(o.position).project(cam);
  const gx = (_pp.x + 1) / 2 * w, gy = (_pp.y + 1) / 2 * h;
  o.position.x += ((oddX ? Math.floor(gx) + .5 : Math.round(gx)) - gx) * u; o.position.y += (Math.round(gy) - gy) * u;
  return u / s;
}

/* ---------- keeping sprites crisp through the pixel pass ---------- */
// Ink keeps only layer 1 (the vehicles) out of its smoothing and draws the 1 px ink line round it, and its info pass draws
// layer 1 as solid geometry. A sprite is a quad, so each one gets a twin on layer 2 that writes coverage only where the
// sprite has a pixel (not its own outline: the ink line lands on exactly those pixels). The twins are drawn into the info
// target right after Ink's info pass. ponytail: a scene-local hook; belongs in Ink (shared/kit.js) for every scene's folk.
const COVER_LAYER = 2;
function cover(p) {
  const m = p.mesh.material, fs = m.fragmentShader.replace('if (s == 0) discard;', 'if (s <= 1) discard; gl_FragColor = vec4(.5, .5, 1., 1.); return;');
  if (fs === m.fragmentShader) return;   // folk changed shape: no twin, the sprite is just softer
  const twin = new THREE.Mesh(p.mesh.geometry, new THREE.ShaderMaterial({ uniforms: m.uniforms, vertexShader: m.vertexShader, fragmentShader: fs, depthWrite: false }));
  twin.layers.set(COVER_LAYER); twin.frustumCulled = false; p.mesh.add(twin);
}
let covering = false;
scene.onAfterRender = (r, sc, cam) => {
  if (!sc.overrideMaterial || covering) return;   // only after the info pass
  covering = true; const ac = r.autoClear, ov = sc.overrideMaterial; r.autoClear = false; sc.overrideMaterial = null; cam.layers.set(COVER_LAYER);
  try { r.render(sc, cam); } finally { cam.layers.set(1); sc.overrideMaterial = ov; r.autoClear = ac; covering = false; }
};
const ALWAYS = { visible: true };   // so Ink runs its info pass even when no vehicle is in the shot (the flashback)

/* ---------- the two of us (shared/folk.js): out of the doors, a walk to the far lip, sit ---------- */
// the passenger as dressed at the stand (a default look if nobody's been dressed), and you; backs to us once seated
const DEFAULT_LOOK = { build: 'f', skin: 2, hair: 'long', top: 'hoodie', extra: 'none' };
const people = [passenger() || DEFAULT_LOOK, 'you'].map((look, i) => {
  const p = folk.person(look, { size: 'far' });
  p.obj.visible = false; p.mesh.renderOrder = 3; scene.add(p.obj); cover(p);
  return { p, state: 'off', t: 0, x: 0, y: 0, from: [0, 0], seat: [SEATS[i][0] * IW, SEATS[i][1] * IH], ppx: 2.6 };
});
const seat = w => { Object.assign(w, { state: 'seated', x: w.seat[0], y: w.seat[1] }); w.p.face('back'); w.p.play('sit'); };
// one step of a person: wait for the door, walk left to the seat by exactly the stride the frames take, turn, sit
function stepPerson(w, dt) {
  if (w.state === 'off') return;
  w.t += dt;
  if (w.state === 'wait' && w.t > .55) { w.state = 'walk'; w.p.play('walk'); w.p.face('left'); }
  if (w.state !== 'walk') { w.p.update(dt); return; }
  const dx = w.p.update(dt) * w.ppx;   // painting px: the sprite px walked, at this depth
  w.x = Math.max(w.seat[0], w.x - dx);
  w.y = lerp(w.from[1], w.seat[1], clamp((w.from[0] - w.x) / (w.from[0] - w.seat[0]), 0, 1));
  if (w.x <= w.seat[0]) {
    w.state = 'sit'; w.p.face('back');
    w.p.play('sitdown', { onEnd: () => { w.p.play('sit'); w.state = 'seated'; } });
  }
}

/* ---------- him: in ink, two frames (cigarette down, and the drag), with the ember ---------- */
// His drawings are fine line art; at this size they'd go to mush, so each is redrawn as a crisp 1 px line on the grid:
// his silhouette's edge, plus the drawing's strong strokes (the hatching is thinner and drops out). He's in neither
// painting, so the headlights can't touch him.
const GHOST_PX = 44;   // his height in frame pixels, seated
function inkLine(img, H) {
  const W0 = img.width, H0 = img.height, c0 = mkCanvas(W0, H0), x0 = c0.getContext('2d'); x0.drawImage(img, 0, 0);
  const a = x0.getImageData(0, 0, W0, H0).data, N = W0 * H0;
  let line = new Uint8Array(N); for (let i = 0; i < N; i++) line[i] = a[i * 4 + 3] > 77;
  const grow = (m, r, v = 1) => {   // r steps of a 4-neighbour max (v = 1) or min (v = 0); past the edge never erodes
    for (let n = 0; n < r; n++) {
      const o = m.slice();
      for (let k = 0; k < N; k++) {
        if (m[k] === v) continue; const i = k % W0;
        if ((i > 0 && m[k - 1] === v) || (i < W0 - 1 && m[k + 1] === v) || (k >= W0 && m[k - W0] === v) || (k < N - W0 && m[k + W0] === v)) o[k] = v;
      }
      m = o;
    }
    return m;
  };
  // the silhouette: close the line up, flood the outside from the border, what's left is him
  const shut = grow(line, 7), out = new Uint8Array(N), st = [];
  for (let i = 0; i < W0; i++) st.push(i, (H0 - 1) * W0 + i); for (let j = 0; j < H0; j++) st.push(j * W0, j * W0 + W0 - 1);
  while (st.length) { const k = st.pop(); if (out[k] || shut[k]) continue; out[k] = 1; const i = k % W0; if (i > 0) st.push(k - 1); if (i < W0 - 1) st.push(k + 1); if (k >= W0) st.push(k - W0); if (k < N - W0) st.push(k + W0); }
  const inside = grow(out.map(v => 1 - v), 6, 0), thick = grow(grow(line, 1, 0), 1);   // thick: only strokes wider than the hatching
  const W = Math.round(H * W0 / H0), down = m => {   // box average to the grid
    const r = new Float32Array(W * H);
    for (let j = 0; j < H0; j++) for (let i = 0; i < W0; i++) r[Math.min(H - 1, j * H / H0 | 0) * W + Math.min(W - 1, i * W / W0 | 0)] += m[j * W0 + i];
    const n = W0 * H0 / (W * H); return r.map(v => v / n);
  };
  const S = down(inside), L = down(thick), c = mkCanvas(W, H), x = c.getContext('2d'), id = x.createImageData(W, H);
  const inS = (i, j) => i < 0 || j < 0 || i >= W || j >= H || S[j * W + i] > .5;   // past the drawing's edge counts as him (no line along the cut)
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (!inS(i, j)) continue;
    const edge = !inS(i - 1, j) || !inS(i + 1, j) || !inS(i, j - 1) || !inS(i, j + 1);
    if (edge || L[j * W + i] > .2) id.data.fill(255, (j * W + i) * 4, (j * W + i) * 4 + 4);
  }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {   // no lone specks
    const k = (j * W + i) * 4; if (!id.data[k + 3]) continue;
    let n = 0; for (let b = -1; b <= 1; b++) for (let d = -1; d <= 1; d++) if ((b || d) && i + d >= 0 && i + d < W && j + b >= 0 && j + b < H && id.data[((j + b) * W + i + d) * 4 + 3]) n++;
    if (!n) id.data[k + 3] = 0;
  }
  x.putImageData(id, 0, 0);
  const t = tex(c); t.magFilter = t.minFilter = THREE.NearestFilter; return t;
}
const QUAD = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';
const footGeo = new THREE.PlaneGeometry(1, 1).translate(0, .5, 0);   // origin at the bottom edge, where he sits
const GHOST = [{ img: SPR['ghost-1'], tip: [.983, .354] }, { img: SPR['ghost-2'], tip: [.524, .847] }];   // tip: the cigarette's end, uv
const ghostMat = new THREE.ShaderMaterial({
  uniforms: { tG: { value: null }, uOp: { value: 0 } }, transparent: true, depthWrite: false, vertexShader: QUAD,
  fragmentShader: 'uniform sampler2D tG; uniform float uOp; varying vec2 vUv; void main(){ gl_FragColor = vec4(.91, .88, .8, texture2D(tG, vUv).a * uOp); }',
});
const ghost = new THREE.Mesh(footGeo, ghostMat); ghost.frustumCulled = false; ghost.renderOrder = 4; scene.add(ghost);
// sitting on the edge: his seat (a third of the way across the drawing) on the lip, knees and feet out over the drop
const G = lip(.7), G_D = stage.depthAt(G[0] - 10, G[1] + 4);   // the lip under him
const gs = { px: 0, w: 0, h: 0, gw: 1, gh: 1, x: G[0] };   // his size on the grid, and in painting px
function regrid(ppx) {   // the grid's size changed: redraw him at GHOST_PX
  if (gs.px === ctx.ink.size.y) return; gs.px = ctx.ink.size.y;
  for (const g of GHOST) { g.tex?.dispose(); g.tex = inkLine(g.img, GHOST_PX); }
  gs.w = GHOST[0].tex.image.width; gs.h = GHOST_PX; gs.gh = gs.h * ppx; gs.gw = gs.w * ppx; gs.x = G[0] + (.5 - .33) * gs.gw;
}
const tipAt = f => [gs.x + (GHOST[f].tip[0] - .5) * gs.gw, G[1] - GHOST[f].tip[1] * gs.gh];
// the ember: an additive point that swells on each drag
const emberMat = new THREE.ShaderMaterial({
  uniforms: { uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: QUAD,
  fragmentShader: 'uniform float uI; varying vec2 vUv; void main(){ float d = length(vUv - .5) * 2.; vec3 c = vec3(1., .5, .16) * (exp(-d * d * 18.) + exp(-d * d * 3.) * .25) + vec3(1., .9, .6) * exp(-d * d * 90.); gl_FragColor = vec4(c * uI, 1.); }',
});
const ember = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), emberMat); ember.frustumCulled = false; ember.renderOrder = 5; scene.add(ember);
const emb = { pos: new THREE.Vector2(), vel: new THREE.Vector2() };

/* ---------- then: their car went over and the two of them stood here looking down at it. Only in the old painting. ---------- */
const thenCar = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex(SPR['then-car']), transparent: true, depthWrite: false, opacity: 0 }));
const TC = lip(.56), tcw = 240;
stage.place(thenCar, TC[0] + 95, TC[1] + 70, [-tcw, tcw * SPR['then-car'].height / SPR['then-car'].width], stage.depthAt(TC[0] - 20, TC[1]));   // flipped to face the drop
thenCar.rotation.z = -1.05;   // nose down the cliff face
thenCar.frustumCulled = false; thenCar.renderOrder = 2; scene.add(thenCar);
// grandfather and his friend, in the 1970s, by daylight, looking down at it
const thenPair = [['grandpa', .395, .505], ['friend', .428, .5]].map(([who, x, y]) => {
  const p = folk.person(who, { size: 'far' }); p.face('right'); p.setLight(1, -1); p.obj.visible = false; p.mesh.renderOrder = 3; scene.add(p.obj); cover(p);
  return { p, x: x * IW, y: y * IH };
});

/* ---------- the truck: comes round the bend after, and takes you on to Shillong ---------- */
// built in 3D like the taxi (shared/kit.js), seen from the same height, turned a little to show its painted nose
const { truck, mat: truckMat } = makeTruck(U.uMode); truck.visible = false; scene.add(truck);
truck.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), .2).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -.3));
const TRUCK = { size: 44, from: -.25 * IW, to: .25 * IW, y: .445 * IH };
const truckW = TRUCK.size * 7.6 * Math.cos(.3), truckH = TRUCK.size * 3.3;   // its footprint on the painting, px


/* ---------- framing: locked, covering the screen ---------- */
let viewW = IW, viewH = IH;
function resize(w, h) {
  const aspect = w / h;
  let cx = .5 * IW, cy = .5 * IH;
  if (aspect < 1) {
    // phones: tighter, and over to the left, so the seats and the hanging taxi share the frame; the margin leaves room for
    // the doors' pull-back (dolly -.05, dy .05) without showing past the painting's bottom edge
    viewH = IH * .8; viewW = viewH * aspect; cx = .48 * IW;
  } else {
    if (aspect > IW / IH) { viewW = IW; viewH = IW / aspect; } else { viewH = IH; viewW = IH * aspect; }
    viewW /= 1.35; viewH /= 1.35;
    viewW *= .9; viewH *= .9;   // a little margin, so the camera moves never show past the painting's edge
  }
  stage.view(clamp(cx, viewW / 2, IW - viewW / 2), clamp(cy, viewH / 2, IH - viewH / 2), viewH, aspect);
}

/* ---------- the hang: set by how long you braked; ?hang=0.7 sets it by hand ---------- */
let hangVal = QS.has('hang') ? +QS.get('hang') : .5;
const reset = () => lerp(.12, .3, hangVal);   // the nose's resting angle for this hang

/* ---------- sound: the creak of the chassis on the rock ---------- */
let nextCreak = 0, quiet = false;   // quiet: after the fall, nothing but the impact
function creak(k = 1) {
  try {
    const ac = ctx.ac; if (!ac) return;
    const t0 = ac.currentTime, d = .5 + Math.random() * .5;
    const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(60 + Math.random() * 30, t0); o.frequency.linearRampToValueAtTime(95 + Math.random() * 40, t0 + d);
    f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 6;
    lfo.frequency.value = 28 + Math.random() * 14; lg.gain.value = .06 * k; lfo.connect(lg).connect(g.gain);   // stick-slip judder, metal on rock
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.12 * k, t0 + .06); g.gain.linearRampToValueAtTime(0, t0 + d);
    o.connect(f).connect(g).connect(ctx.out);
    o.start(t0); lfo.start(t0); o.stop(t0 + d + .05); lfo.stop(t0 + d + .05);
  } catch (e) {}
}

// the truck's air horn: two low tones, far off then near
function horn(gain = .08, len = .7) {
  try {
    const ac = ctx.ac; if (!ac) return;
    const t0 = ac.currentTime;
    for (const f of [233, 311]) {
      const o = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = gain > .05 ? 1400 : 600;
      g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + .05); g.gain.setValueAtTime(gain, t0 + len - .1); g.gain.exponentialRampToValueAtTime(.0001, t0 + len);
      o.connect(fl).connect(g).connect(ctx.out); o.start(t0); o.stop(t0 + len + .05);
    }
  } catch (e) {}
}

// the truck's diesel: two detuned saws at ~30 Hz under a 300 Hz lid, swelling as it rolls in round the bend (ROLL s), then
// the air brakes hiss and it settles to idle. Scene-local: it stops when the scene goes.
const ROLL = 5;
let diesel = null;
function dieselOn() {
  try {
    const ac = ctx.ac; if (!ac || diesel) return;
    const t0 = ac.currentTime, lp = ac.createBiquadFilter(), g = ac.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 300; lp.Q.value = .9; g.connect(ctx.out); lp.connect(g);
    const os = [1, 1.02].map(m => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(24 * m, t0); o.frequency.linearRampToValueAtTime(33 * m, t0 + ROLL * .8); o.frequency.linearRampToValueAtTime(27 * m, t0 + ROLL); o.connect(lp); o.start(t0); return o; });
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.16, t0 + ROLL); g.gain.setTargetAtTime(.08, t0 + ROLL + .3, .6);   // near, then idling
    // the air brakes: a hiss as it stops
    const n = ac.createBufferSource(), b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const hp = ac.createBiquadFilter(), hg = ac.createGain(), ts = t0 + ROLL - .1;
    n.buffer = b; hp.type = 'highpass'; hp.frequency.value = 2500;
    hg.gain.setValueAtTime(.0001, ts); hg.gain.exponentialRampToValueAtTime(.09, ts + .04); hg.gain.exponentialRampToValueAtTime(.0001, ts + .9);
    n.connect(hp).connect(hg).connect(ctx.out); n.start(ts); n.stop(ts + 1);
    diesel = { os, g };
  } catch (e) {}
}
function dieselOff() { if (!diesel) return; try { const t = ctx.ac.currentTime; diesel.g.gain.setTargetAtTime(.0001, t, .15); diesel.os.forEach(o => o.stop(t + 1)); } catch (e) {} diesel = null; }

/* ---------- the beat: doors, out, sit, the line, the ember, him, the flick ---------- */
// ponytail: timeline in seconds; retime SCRIPT and T to the recorded dialogue
// DRAFT lines, to be rewritten in your own voice. [seconds after you both sit, who, line]
const SCRIPT = [
  [4, 'YOU', 'This happened to my grandfather. Same road.'],
  [9, 'PASSENGER', 'The court one?'],
  [12, 'YOU', 'Every weekend, Guwahati to Shillong. Him and a friend.'],
  [17, 'YOU', 'No barrier then. Just the old stones.'],
  [21.5, 'YOU', 'Cloud like tonight. The bend came too late.'],
  [26, 'YOU', 'The car went over. They both walked out of it.'],
  [30.5, 'PASSENGER', 'How?'],
  [32.5, 'YOU', "He never said. I don't think he knew."],
  [37, 'YOU', 'He sat on the edge, just like this, and lit one.'],
  [43, 'YOU', 'Then he went to court in the morning, like any weekend.'],
];
// when things happen, in the same seconds: the wipe to then and back (the old car lands on "The car went over"), the ember,
// him, when you can flick, and the one hint that you can look around
const T = { thenIn: [25, 28], thenOut: [33, 36], ember: 37, ghost: [39, 41.5], flick: 46, look: [6, 12] };
let lineI = 0;
// the drive in: along the road, into the cloud, straight on where the road bends, onto the lip
const DRIVE = new THREE.CatmullRomCurve3([[-.08, .445], [.12, .43], [.28, .425], [.4, .432]].map(([x, y]) => new THREE.Vector3(x * IW, y * IH, 0)).concat(new THREE.Vector3(...CAR, 0)));
const DRIVE_LEN = DRIVE.getLength(), BRAKE_FROM = .55;   // past the bend, the edge shows up: brake window from there to the lip
const DECEL = 220;   // px/s²: it rolls to a stop on the lip, it doesn't hit a wall
const drv = { u: 0, v: 0, inWin: 0, heldWin: 0 };
let skidNode = null;
function skid(on) {   // tyres on gravel: filtered noise while you hold the brake
  try {
    const ac = ctx.ac;
    if (on && !skidNode && ac) {
      const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      n.buffer = b; n.loop = true; f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 2.5; g.gain.value = .06;
      n.connect(f).connect(g).connect(ctx.out); n.start(); skidNode = n;
    } else if (!on && skidNode) { skidNode.stop(); skidNode = null; }
  } catch (e) {}
}
let hangSaid = false, looked = false;
let phase = 'drive', since = 0, tips = 0, ang = 0, angV = 0, fallT = -1;
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), steer = new Steer(.32), aim = new THREE.Vector2();
const say = ctx.say;
function go(next) {
  phase = next; since = 0;
  if (next === 'drive') {
    Object.assign(drv, { u: 0, v: 180, inWin: 0, heldWin: 0 }); ctx.bed({ engine: 1, wind: .6 }); ctx.rpm(1);
    tips = 0; fallT = -1; quiet = false; ang = reset(); angV = 0; stage.place(jeep, CAR[0], CAR[1], CAR_SIZE, CAR_D); lineI = 0; say(null);
    doors.forEach(d => { Object.assign(d.userData, { open: 0, v: 0, delay: 0 }); d.rotation.y = 0; });
    people.forEach(w => { w.state = 'off'; w.p.obj.visible = false; }); truck.visible = false; dieselOff();
  }
  if (next === 'car') { hangSaid = false; ang = 0; angV = 1.3; creak(1.3); skid(false); ctx.bed({ wind: 1 }); }   // over the lip: the nose drops and seesaws
  if (next === 'pout' || next === 'yout') {
    const i = next === 'pout' ? 0 : 1, d = doors[i], w = people[i];
    tips++; creak(1); ctx.sfx.door(); Object.assign(d.userData, { open: 1, delay: .12 });   // the latch and the creak, then the door swings
    // you step out by your door; the passenger comes round the back of the taxi, from behind it
    const p = stage.toPaint(body.localToWorld(i ? v1.set(.3, .1, 1.05) : v1.set(-1.5, .1, -.6)));
    Object.assign(w, { state: 'wait', t: 0, x: p[0], y: p[1], from: p }); w.p.play('idle'); w.p.face('left');
  }
  if (next === 'flick') emb.vel.set(120, -80);
  if (next === 'truck') { if (fallT < 0) fallT = 5; truck.visible = true; horn(.03, 1.1); dieselOn(); ctx.bed({ wind: .5 }); }   // far off, round the bend
  if (next === 'lift') horn(.09, .45);                                                                                    // it stops for you
}
const LABEL = { car: 'Open the passenger door', pout: 'Open your door', seated: 'Flick the ember', truck: 'Flag it down', lift: 'Ride to Shillong' };
const NEXT = { car: 'pout', pout: 'yout', seated: 'flick', truck: 'lift' };
const ready = () => phase === 'car' && since > 1.5 || phase === 'pout' && since > 1.2 || phase === 'seated' && since > T.flick || phase === 'truck' && since > ROLL || phase === 'lift' && since > 2;
const advance = () => { if (!ready()) return; if (phase === 'lift') ctx.next(); else go(NEXT[phase]); };
// ?auto plays the beat through on its own; ?speed=4 runs it faster (for checking timing)
const AUTO = QS.has('auto'), SPEED = +QS.get('speed') || 1;
// ?at=seated&t=12 jumps straight to a moment (for checking frames); at=pout or yout with t: that walk, t seconds in
function jump(at, secs) {
  const order = ['car', 'pout', 'yout', 'seated', 'flick', 'truck', 'lift'];
  go('drive');
  for (const p of order.slice(0, order.indexOf(at) + 1)) { jeep.updateMatrixWorld(true); go(p); }
  for (const d of doors) if (d.userData.open) { d.rotation.y = d.userData.side * 1.1; d.userData.delay = 0; }
  emb.pos.set(...tipAt(0));
  if (at === 'yout') seat(people[0]);
  else if (order.indexOf(at) > 2) people.forEach(seat);
  for (let s = 0; s < secs && (at === 'pout' || at === 'yout'); s += 1 / 60) people.forEach(w => stepPerson(w, 1 / 60));
  if (at === 'yout' && people[1].state === 'seated') { phase = 'seated'; secs = 0; }
  ang = reset(); angV = 0; since = secs; lineI = at === 'seated' ? SCRIPT.filter(l => l[0] < secs).length : 0;
}

/* ---------- loop ---------- */
const hint = Object.assign(document.createElement('div'), { className: 'hint', textContent: ctx.isTouch ? 'Drag to look around' : 'Point to look around' });
hint.style.bottom = '32px'; layer.appendChild(hint);
let started = false;
window.__edge = { phase: () => phase, go, ang: () => ang };
const ptrPx = () => input.ptr && stage.screenToPaint(...input.ptr);
function frame(dt0) {
  regrid(2 * stage.rest.z * Math.tan(stage.fov * Math.PI / 360) / ctx.ink.size.y);   // painting px per frame px, at rest
  if (!started) { started = true; if (QS.get('at')) jump(QS.get('at'), +QS.get('t') || 0); else go('drive'); }
  const dt = dt0 * SPEED, t = (U.uTime.value += dt);
  const braking = input.hold;   // HOLD: brake (only counts on the drive)
  if (AUTO && ready() && since > 1.5) advance();
  since += dt;
  // the seesaw: a spring toward where the weight says the nose should rest, nudged by the wind
  const H = hangVal;
  if (phase === 'drive') {
    // into the cloud; holding the brake inside the window slows you, and decides how far the nose goes over
    const win = drv.u > BRAKE_FROM, rem = (1 - drv.u) * DRIVE_LEN;
    if (win) { drv.inWin += dt; if (braking) drv.heldWin += dt; }
    drv.v = braking && win ? Math.max(70, drv.v - 260 * dt) : Math.min(180, drv.v + 40 * dt);
    drv.v = Math.min(drv.v, Math.sqrt(2 * DECEL * rem) + 4);   // and it rolls to a stop on the lip
    ctx.rpm(braking && win ? .2 : drv.v / 180);   // the engine falls under the brake
    skid(braking && win);
    drv.u = Math.min(1, drv.u + drv.v * dt / DRIVE_LEN);
    const p = DRIVE.getPointAt(drv.u), q = DRIVE.getTangentAt(drv.u);
    const yaw = lerp(Math.atan2(-q.y * 2.4, q.x), CAR_YAW, sstep(.85, 1, drv.u));
    stage.place(jeep, p.x, p.y, CAR_SIZE, stage.depthAt(p.x, p.y + 6));
    jeep.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), .42).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
    body.position.y = -PIVOT.y + Math.sin(t * 13) * .012 * drv.v / 120 + Math.pow(Math.max(0, Math.sin(t * 11.9)), 10) * .03;   // road shake + bass thump
    ang = braking && win ? .035 : 0;   // the nose dips under braking
    U.uFog.value = lerp(.6, .85, sstep(0, .6, drv.u));   // already in the cloud from the scene before
    if (rem < .5) {
      if (!QS.has('hang')) hangVal = clamp(1 - drv.heldWin / Math.max(drv.inWin, .01) * 1.1, .05, 1);
      body.position.y = -PIVOT.y;
      go('car');
    }
  } else U.uFog.value = phase === 'car' ? .85 * (1 - sstep(.5, 4, since)) : 0;
  if (phase === 'flick' && since > 3.5 && fallT < 0) { fallT = 0; creak(1.4); quiet = true; ctx.bed({}); }   // over it goes; then nothing
  if (phase === 'flick' && since > 8) go('truck');
  if (fallT >= 0) {
    // past the balance point: the nose goes, then the whole car slides off the lip into the cloud
    const f0 = fallT; fallT += dt; angV += (2 + Math.sin(ang) * 6) * dt; ang = Math.min(ang + angV * dt, 1.45);
    if (f0 < 2.5 && fallT >= 2.5) ctx.sfx.impact(.85);   // 2.5 s of silence, then far below
    const f = Math.max(0, fallT - .8);
    stage.place(jeep, CAR[0] + 260 * f, CAR[1] + 450 * f * f, CAR_SIZE, CAR_D);   // out, clear of the lip, and down
  } else if (phase !== 'drive') {
    const target = reset() + tips * lerp(.04, .1, H) + Math.sin(t * .8) * .012 + Math.sin(t * 1.9 + 1) * .005;
    angV += ((target - ang) * 12 - angV * 2.6) * dt; ang += angV * dt;   // heavy: a car, not a toy
  }
  hang.rotation.z = -ang;
  for (const d of doors) {   // a spring (ω 7, ζ .55): it swings out, overshoots a little, settles
    const u = d.userData; if (u.delay > 0) { u.delay -= dt; continue; }
    u.v = (u.v || 0) + (-49 * (d.rotation.y - u.side * 1.1 * u.open) - 2 * .55 * 7 * u.v) * dt; d.rotation.y += u.v * dt;
  }
  if (ctx.ac && t > nextCreak && !quiet) { creak(.35 + Math.random() * .35); nextCreak = t + 6 + Math.random() * 6; }
  jeep.updateMatrixWorld(true);
  // headlights: from the nose, wherever the nose now points
  const a = stage.toPaint(body.localToWorld(v1.set(1.72, .62, 0))), b = stage.toPaint(body.localToWorld(v2.set(2.72, .62, 0)));
  U.uHead.value.set(...a); U.uDir.value.set(b[0] - a[0], b[1] - a[1]).normalize();
  // while it hangs, the viewer can swing the beams across the cloud; left alone they settle back to where the nose points
  if (phase !== 'drive' && fallT < 0) U.uDir.value.copy(steer.update(dt, U.uHead.value, aim.copy(U.uDir.value), ptrPx(), ctx.isTouch, input.hold));
  // the warm key: the cloud its own beams light up, ahead and below (the truck's lights, once it comes). Strong enough that
  // the black taxi's lit side and roof separate it from the dark rock behind (its ink line alone is lost there)
  keyLight(jeepMat, camera, jeep.position, truck.visible ? truck.position : stage.toWorld(a[0] + 300, a[1] + 60, 0, v2), truck.visible ? .9 : .8);
  jeepMat.uniforms.uExposure.value = phase === 'drive' ? 1 : 1.2;
  if (truck.visible) keyLight(truckMat, camera, truck.position, stage.toWorld(.8 * IW, .7 * IH, 0, v2), .15);   // the moonlit cloud ahead
  if (truck.visible) {   // the truck rolls in round the bend and stops; now its headlights are the light
    const k = phase === 'truck' ? 1 - Math.pow(1 - clamp(since / ROLL, 0, 1), 2.2) : 1, x = lerp(TRUCK.from, TRUCK.to, k);
    stage.place(truck, x, TRUCK.y - (k < 1 ? Math.sin(t * 9) * .8 : 0), TRUCK.size, stage.depthAt(clamp(x, 0, IW), TRUCK.y));
    U.uHead.value.set(x + truckW * .5, TRUCK.y - truckH * .38); U.uDir.value.set(1, .04).normalize();
  }
  // then: the old car and the two of them, only while the story's in the old painting
  thenCar.material.opacity = sstep(.55, .95, U.uThen.value);
  const now = 1 - sstep(.05, .35, U.uThen.value);   // the present steps out of the way of the story
  jeep.visible = now > .5;
  U.uSpill.value = phase === 'drive' || truck.visible ? 1 : 0;
  // the two of you: getting out, the walk, sitting down
  for (const w of people) stepPerson(w, dt);
  if (phase === 'car' && since > 2.2 && !hangSaid) { hangSaid = true; const l = line('hang'); if (l) say(l.who, l.text, 3.4, l.expr); }
  if (phase === 'yout' && people[1].state === 'seated') go('seated');
  if (phase === 'seated' && lineI < SCRIPT.length && since > SCRIPT[lineI][0]) { const [, who, text] = SCRIPT[lineI++]; say(who, text, 4); }
  U.uThen.value = phase === 'seated' ? sstep(...T.thenIn, since) * (1 - sstep(...T.thenOut, since)) : 0;
  // him and the ember
  const seated = phase === 'seated', flick = phase === 'flick';
  const appear = seated ? sstep(...T.ghost, since) : flick ? 1 - sstep(0, 1.5, since) : 0;
  const ptr = ptrPx();
  const near = ptr ? sstep(gs.gh * .5, gs.gh * 2.2, Math.hypot(ptr[0] - gs.x, ptr[1] - (G[1] - gs.gh * .5))) : 1;
  ghostMat.uniforms.uOp.value = Math.round(appear * near * 4) / 4;   // fades in steps, like everything on the grid
  let glow = 0;
  if (seated) {
    const k = (Math.max(0, since - T.ember) / 7) % 1, drag = k < .12 ? sstep(0, .12, k) : Math.exp(-(k - .12) * 9);
    const f = since > T.ghost[0] && k < .3 ? 1 : 0;   // the drag: cigarette at his lips
    ghostMat.uniforms.tG.value = GHOST[f].tex; emb.pos.set(...tipAt(f));
    glow = sstep(T.ember, T.ember + 1, since) * (.45 + .75 * drag + Math.sin(t * 23) * .05);
  } else if (flick) {
    emb.vel.y += 38 * dt; emb.vel.x *= 1 - .4 * dt; emb.pos.addScaledVector(emb.vel, dt);   // falls slowly into the cloud
    glow = (1 - sstep(0, 5, since)) * (.8 + .2 * Math.sin(t * 30));
  } else emb.pos.set(...tipAt(0));
  ember.visible = glow > 0;
  emberMat.uniforms.uI.value = glow;
  U.uEmb.value.set(emb.pos.x, emb.pos.y, (seated ? sstep(T.ember, T.ember + 2, since) : 0) + (flick ? 1 - sstep(0, 2, since) : 0));
  $('#brake').hidden = !(phase === 'drive' && drv.u > BRAKE_FROM);
  ctx.prompt(ready() && LABEL[phase] || null);
  // the long seated stretch: once, a quiet word that the light can be moved; gone as soon as it is
  if (seated && !looked && since > T.look[1]) looked = true;
  if (Math.abs(steer.angle) > .05) looked = true;
  hint.classList.toggle('on', seated && !looked && since > T.look[0]);
  // the camera (see STYLE.md: eased, slow): the tip leans in toward the drop; the doors pull back to show the cloud below;
  // the story holds still; the fall looks down after it
  const T_ = stage.target, vh = stage.rest.z * Math.tan(stage.fov * Math.PI / 360) * 2;
  const tip = phase === 'car' ? sstep(0, 2.5, since) : 0, out = phase === 'pout' || phase === 'yout' || phase === 'seated' || phase === 'flick';
  Object.assign(T_, { dx: 0, dy: 0, dolly: 0, yaw: 0, pitch: 0 });
  if (tip) Object.assign(T_, { dx: .035 * vh * tip, dolly: .07 * tip, yaw: -.035 * tip });
  if (out) Object.assign(T_, { dx: .02 * vh, dy: .05 * vh, dolly: -.05, pitch: -.025 });
  if (phase === 'flick' && fallT > 0) Object.assign(T_, { dx: .05 * vh, dy: .08 * vh, dolly: -.02, pitch: -.045 });
  stage.update(dt, phase === 'seated' ? .5 : .9);
  // everything drawn in sprite pixels goes on the grid now the camera has moved
  for (const w of people) {
    w.p.obj.visible = w.state !== 'off' && now > .5;
    if (!w.p.obj.visible) continue;
    w.ppx = pin(w.p.obj, w.x, w.y, stage.depthAt(w.x - 8, w.y + 4));
    w.p.mesh.renderOrder = 3 + w.y / IH;   // the nearer one in front
    // you get out on the near side, in front of the taxi (it would hide you in depth); once seated, the truck can pass in front
    if (w === people[1]) w.p.mesh.traverse(m => { m.material.depthTest = w.state === 'seated'; });
    w.p.setLight(truck.visible ? 1.1 : 1.1, truck.visible ? -1 : 1);   // the beam-lit cloud on the right; then the truck's lights on the left
  }
  for (const w of thenPair) { w.p.obj.visible = U.uThen.value > .75; if (w.p.obj.visible) { w.p.update(dt); pin(w.p.obj, w.x, w.y, stage.depthAt(w.x - 8, w.y + 4)); } }
  ghost.visible = ghostMat.uniforms.uOp.value > 0;
  if (ghost.visible || seated) { pin(ghost, gs.x, G[1], G_D, gs.w % 2 === 1); ghost.scale.x *= gs.w; ghost.scale.y *= gs.h; }
  stage.place(ember, emb.pos.x, emb.pos.y, 34, G_D);
  // render: colour, then the ink and paper rim around the taxi
  ctx.ink.uniforms.uTime.value = t; ctx.ink.uniforms.uJeepScale.value = .7;
  ctx.ink.render(scene, camera, [jeep, truck, ALWAYS]);
}
return {
  frame, resize,
  onTap: advance,
  onHorn() { if (phase === 'truck' && ready()) { go('lift'); return true; } return false; },   // flag the truck down with the horn
  dispose() { skid(false); dieselOff(); people.concat(thenPair).forEach(w => w.p.dispose()); GHOST.forEach(g => g.tex?.dispose()); disposeScene(scene); delete window.__edge; },
};
}
