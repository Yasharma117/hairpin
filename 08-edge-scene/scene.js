// The edge: the last stretch of road into the cloud (hold to brake: it decides how far the nose goes over), the hang,
// the doors, sitting on the lip, the story wiping to the same cliff decades ago, him in ink with the ember, the flick,
// the taxi going over, and the truck that gives you a lift. Tap (or the chip) for each next step.
import * as THREE from 'three';
import { clamp, lerp, damp, sstep, mkCanvas, loadImg, tex, strokeMap, NOISE, makeTaxi, LIVERY, passenger, line, disposeScene } from '../shared/kit.js';

const at = f => new URL(f, import.meta.url).href;
const SPRITES = ['ghost-1', 'ghost-2', 'then-car', 'then-pair', 'truck-lit', 'truck-dark'];
export const assets = ['edge-lit.jpg', 'edge-dark.jpg', 'edge-then.jpg', ...SPRITES.map(n => `sprites/${n}.png`)];

const IW = 1672, IH = 941;              // edge-lit/dark/then.jpg size in px; the whole scene lives in these units

// The cliff's side edge, traced off the painting as fractions: from the plateau's far corner down toward us, to where the rock face takes over.
const EDGE = [[.522, .432], [.5, .55], [.478, .65], [.475, .72]];
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
const [imgs, spr] = await Promise.all([Promise.all(['edge-lit.jpg', 'edge-dark.jpg', 'edge-then.jpg'].map(f => loadImg(at(f)))), Promise.all(SPRITES.map(n => loadImg(at(`sprites/${n}.png`))))]);
if (!imgs.every(Boolean) || !spr.every(Boolean)) throw new Error('edge paintings did not load');
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
const camera = new THREE.OrthographicCamera(0, IW, 0, -IH, -1000, 1000);
camera.position.z = 500;
const bgMat = new THREE.ShaderMaterial({
  uniforms: U,
  vertexShader: 'varying vec2 vPx; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vPx = vec2(w.x, -w.y); gl_Position = projectionMatrix * viewMatrix * w; }',
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
const bg = new THREE.Mesh(new THREE.PlaneGeometry(IW, IH), bgMat);
bg.position.set(IW / 2, -IH / 2, -400);
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
const CAR = lip(.437), CAR_YAW = .25;
jeep.position.set(CAR[0], -CAR[1], 150);
jeep.scale.setScalar(50);
jeep.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), .42).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), CAR_YAW));
scene.add(jeep);

/* ---------- the two of us, him, the ember ---------- */
const cutout = (w, h, draw) => { const c = mkCanvas(w, h); draw(c.getContext('2d')); return tex(c); };
const QUAD = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';
const footGeo = new THREE.PlaneGeometry(1, 1).translate(0, .5, 0);   // origin at the bottom edge, where they sit
// placeholder silhouettes, seen from behind
const back = (fill, extra) => cutout(200, 240, c => {
  const shape = (dx, dy) => {
    c.beginPath(); c.moveTo(18 + dx, 240); c.bezierCurveTo(14 + dx, 150 + dy, 30 + dx, 108 + dy, 100 + dx, 104 + dy); c.bezierCurveTo(170 + dx, 108 + dy, 186 + dx, 150 + dy, 182 + dx, 240); c.fill();
    c.beginPath(); c.ellipse(100 + dx, 62 + dy, 30, 36, 0, 0, Math.PI * 2); c.fill(); if (extra) extra(c, dx, dy);
  };
  c.fillStyle = '#56608c'; shape(4, -3);   // rim: the cloud's glow catching the right shoulder
  c.fillStyle = fill; shape(0, 0);
});
// the passenger you picked: their painted sitting-down sprite if it exists, else the stand-in with their name on its back
const rider = passenger();
const riderSit = rider && await loadImg(at(`../people/${rider.id}-sit.png`));
const passengerTex = riderSit ? tex(riderSit) : back('#191427', (c, dx, dy) => { c.beginPath(); c.ellipse(100 + dx, 28 + dy, 17, 13, 0, 0, Math.PI * 2); c.fill(); });
if (rider && !riderSit) {
  const c = passengerTex.image.getContext('2d');
  c.fillStyle = '#efe6cf'; c.fillRect(48, 150, 104, 30); c.fillStyle = '#141826'; c.font = '600 18px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(rider.first.toUpperCase(), 100, 166); passengerTex.needsUpdate = true;
}
const walkers = [passengerTex, back('#0b0f1e')].map((map, i) => {
  const m = new THREE.Mesh(footGeo, new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }));
  m.visible = false; m.frustumCulled = false; m.renderOrder = 3; scene.add(m);
  // on the lip, spaced so they read side by side: backs to us, bodies over the grass, legs over the drop
  const seat = lip(i ? .615 : .53);
  return { m, from: [0, 0], to: [seat[0] - figH(seat[1]) * .25, seat[1]], t0: 0, k: 0 };
});
// him: two ink-only frames (cigarette down, and the drag), pale, boiling slower than the taxi's line.
// He's in neither painting, so the headlights can't touch him.
const GHOST = [{ tex: tex(SPR['ghost-1']), tip: [.983, .354] }, { tex: tex(SPR['ghost-2']), tip: [.524, .847] }];   // tip: the cigarette's end, uv
const ghostMat = new THREE.ShaderMaterial({
  uniforms: { tG: { value: GHOST[0].tex }, uOp: { value: 0 }, uTime: U.uTime }, transparent: true, depthWrite: false,
  vertexShader: QUAD,
  fragmentShader: NOISE + /* glsl */`
    uniform sampler2D tG; uniform float uOp, uTime; varying vec2 vUv;
    void main(){
      float f = floor(uTime * 3.);
      vec2 w = (vec2(vn2(vUv * 9. + f * 2.3), vn2(vUv * 9. + 31. + f * 1.7)) - .5) * .006;
      gl_FragColor = vec4(.91, .88, .8, texture2D(tG, vUv + w).a * uOp * .85);
    }`,
});
const ghost = new THREE.Mesh(footGeo, ghostMat); ghost.frustumCulled = false; ghost.renderOrder = 4; scene.add(ghost);
// sitting on the edge: his seat (a third of the way across the drawing) on the lip, knees and feet out over the drop
const G = lip(.7), gh = figH(G[1]) * 1.1, gw = gh * SPR['ghost-1'].width / SPR['ghost-1'].height, GX = G[0] + (.5 - .33) * gw;
ghost.position.set(GX, -G[1], 200 + G[1] * .1); ghost.scale.set(gw, gh, 1);
const tipAt = f => [GX + (GHOST[f].tip[0] - .5) * gw, G[1] - GHOST[f].tip[1] * gh];
const handAt = tipAt(0);
// the ember: an additive point that swells on each drag
const emberMat = new THREE.ShaderMaterial({
  uniforms: { uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: QUAD,
  fragmentShader: 'uniform float uI; varying vec2 vUv; void main(){ float d = length(vUv - .5) * 2.; vec3 c = vec3(1., .5, .16) * (exp(-d * d * 18.) + exp(-d * d * 3.) * .25) + vec3(1., .9, .6) * exp(-d * d * 90.); gl_FragColor = vec4(c * uI, 1.); }',
});
const ember = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), emberMat); ember.frustumCulled = false; ember.renderOrder = 5; ember.scale.setScalar(34); scene.add(ember);
const emb = { pos: new THREE.Vector2(...handAt), vel: new THREE.Vector2() };

/* ---------- then: their car went over and the two of them stood here looking down at it. Only in the old painting. ---------- */
const fading = map => new THREE.MeshBasicMaterial({ map: tex(map), transparent: true, depthWrite: false, opacity: 0 });
const thenCar = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), fading(SPR['then-car']));
const TC = lip(.56), tcw = 240;
thenCar.position.set(TC[0] + 95, -(TC[1] + 70), 120); thenCar.scale.set(-tcw, tcw * SPR['then-car'].height / SPR['then-car'].width, 1);   // flipped to face the drop
thenCar.rotation.z = -1.05;   // nose down the cliff face
const thenPair = new THREE.Mesh(footGeo, fading(SPR['then-pair']));
const tph = 170; thenPair.position.set(.41 * IW, -.5 * IH, 190); thenPair.scale.set(tph * SPR['then-pair'].width / SPR['then-pair'].height, tph, 1);
for (const m of [thenCar, thenPair]) { m.frustumCulled = false; m.renderOrder = 2; scene.add(m); }

/* ---------- the truck: comes round the bend after, and takes you on to Shillong ---------- */
const truckMat = new THREE.ShaderMaterial({
  uniforms: { tL: { value: tex(SPR['truck-lit']) }, tD: { value: tex(SPR['truck-dark']) }, uL: { value: .25 }, uMode: U.uMode }, transparent: true, depthWrite: false,
  vertexShader: QUAD,
  fragmentShader: 'uniform sampler2D tL, tD; uniform float uL, uMode; varying vec2 vUv; void main(){ vec4 l = texture2D(tL, vUv), d = texture2D(tD, vUv); float k = uMode > 1.5 ? 1. : (uMode > .5 ? 0. : uL); gl_FragColor = vec4(mix(d.rgb, l.rgb, k), l.a); }',
});
const truck = new THREE.Mesh(footGeo, truckMat); truck.frustumCulled = false; truck.renderOrder = 3; truck.visible = false; scene.add(truck);
const TRUCK = { h: 150, from: -.25 * IW, to: .3 * IW, y: .445 * IH };
const truckW = TRUCK.h * SPR['truck-lit'].width / SPR['truck-lit'].height;
truck.scale.set(truckW, TRUCK.h, 1);

/* ---------- framing: locked, covering the screen ---------- */
let viewW = IW, viewH = IH;
const CAM = [.5 * IW, .5 * IH];
function resize(w, h) {
  const aspect = w / h, Z = aspect < 1 ? 1 : 1.35;
  if (aspect > IW / IH) { viewW = IW; viewH = IW / aspect; } else { viewH = IH; viewW = IH * aspect; }
  viewW /= Z; viewH /= Z;
  const cx = clamp(CAM[0], viewW / 2, IW - viewW / 2), cy = clamp(CAM[1], viewH / 2, IH - viewH / 2);
  camera.left = cx - viewW / 2; camera.right = cx + viewW / 2; camera.top = -(cy - viewH / 2); camera.bottom = -(cy + viewH / 2);
  camera.updateProjectionMatrix();
}

/* ---------- the hang: set by how long you braked; ?hang=0.7 sets it by hand ---------- */
let hangVal = QS.has('hang') ? +QS.get('hang') : .5;
const reset = () => lerp(.12, .3, hangVal);   // the nose's resting angle for this hang

/* ---------- sound: the creak of the chassis on the rock ---------- */
let nextCreak = 0;
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
// when things happen, in the same seconds: the wipe to then and back, the ember, him, when you can flick
const T = { thenIn: [16, 22], thenOut: [33, 36], ember: 37, ghost: [39, 41.5], flick: 46 };
let lineI = 0;
// the drive in: along the road, into the cloud, straight on where the road bends, onto the lip
const DRIVE = new THREE.CatmullRomCurve3([[-.08, .445], [.12, .43], [.28, .425], [.4, .432]].map(([x, y]) => new THREE.Vector3(x * IW, y * IH, 0)).concat(new THREE.Vector3(...CAR, 0)));
const DRIVE_LEN = DRIVE.getLength(), BRAKE_FROM = .55;   // past the bend, the edge shows up: brake window from there to the lip
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
let hangSaid = false;
let phase = 'drive', since = 0, tips = 0, ang = 0, angV = 0, fallT = -1;
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
const say = ctx.say;
function go(next) {
  phase = next; since = 0;
  if (next === 'drive') { Object.assign(drv, { u: 0, v: 180, inWin: 0, heldWin: 0 }); ang = 0; angV = 0; ctx.bed({ engine: 1, wind: .6 }); }
  if (next === 'car') { hangSaid = false; ang = 0; angV = 1.3; creak(1.3); skid(false); ctx.bed({ wind: 1 }); }   // over the lip: the nose drops and seesaws
  if (next === 'drive') { tips = 0; fallT = -1; ang = reset(); angV = 0; jeep.position.set(CAR[0], -CAR[1], 150); lineI = 0; say(null); doors.forEach(d => d.userData.open = 0); walkers.forEach(w => w.m.visible = false); emb.pos.set(...handAt); truck.visible = false; }
  if (next === 'pout' || next === 'yout') {
    const i = next === 'pout' ? 0 : 1, d = doors[i];
    tips++; d.userData.open = 1; creak(1);
    const p = body.localToWorld(v1.set(.3, .1, d.userData.side * 1.05));
    Object.assign(walkers[i], { from: [p.x, -p.y], t0: U.uTime.value, k: 0 }); walkers[i].m.visible = true;
  }
  if (next === 'flick') emb.vel.set(120, -80);
  if (next === 'truck') { if (fallT < 0) fallT = 5; truck.visible = true; horn(.03, 1.1); }   // far off, round the bend
  if (next === 'lift') horn(.09, .45);                                                       // it stops for you
}
const LABEL = { car: 'Open the passenger door', pout: 'Open your door', seated: 'Flick the ember', truck: 'Flag it down', lift: 'Ride to Shillong' };
const NEXT = { car: 'pout', pout: 'yout', seated: 'flick', truck: 'lift' };
const ready = () => phase === 'car' && since > 1.5 || phase === 'pout' && since > 1.2 || phase === 'seated' && since > T.flick || phase === 'truck' && since > 5 || phase === 'lift' && since > 2;
const advance = () => { if (!ready()) return; if (phase === 'lift') ctx.next(); else go(NEXT[phase]); };
// ?auto plays the beat through on its own; ?speed=4 runs it faster (for checking timing)
const AUTO = QS.has('auto'), SPEED = +QS.get('speed') || 1;
// ?at=seated&t=12 jumps straight to a moment (for checking frames)
function jump(at, secs) {
  const order = ['car', 'pout', 'yout', 'seated', 'flick', 'truck', 'lift'];
  go('drive');
  for (const p of order.slice(0, order.indexOf(at) + 1)) { jeep.updateMatrixWorld(true); go(p); for (const w of walkers) w.t0 -= 10; }
  ang = reset(); angV = 0; since = secs; lineI = at === 'seated' ? SCRIPT.filter(l => l[0] < secs).length : 0;
}

/* ---------- loop ---------- */
if (QS.get('at')) jump(QS.get('at'), +QS.get('t') || 0);
if (!QS.get('at')) go('drive');
window.__edge = { phase: () => phase, go, ang: () => ang };
const ptrPx = () => input.ptr && [camera.left + input.ptr[0] / innerWidth * viewW, -camera.top + input.ptr[1] / innerHeight * viewH];
function frame(dt0) {
  const dt = dt0 * SPEED, t = (U.uTime.value += dt);
  const braking = input.hold;   // HOLD: brake (only counts on the drive)
  if (AUTO && ready() && since > 1.5) advance();
  since += dt;
  // the seesaw: a spring toward where the weight says the nose should rest, nudged by the wind
  const H = hangVal;
  if (phase === 'drive') {
    // into the cloud; holding the brake inside the window slows you, and decides how far the nose goes over
    const win = drv.u > BRAKE_FROM;
    if (win) { drv.inWin += dt; if (braking) drv.heldWin += dt; }
    drv.v = braking && win ? Math.max(70, drv.v - 260 * dt) : Math.min(180, drv.v + 40 * dt);
    skid(braking && win);
    drv.u = Math.min(1, drv.u + drv.v * dt / DRIVE_LEN);
    const p = DRIVE.getPointAt(drv.u), q = DRIVE.getTangentAt(drv.u);
    const yaw = lerp(Math.atan2(-q.y * 2.4, q.x), CAR_YAW, sstep(.85, 1, drv.u));
    jeep.position.set(p.x, -p.y, 150);
    jeep.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), .42).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
    body.position.y = -PIVOT.y + Math.sin(t * 13) * .012 * drv.v / 120 + Math.pow(Math.max(0, Math.sin(t * 11.9)), 10) * .03;   // road shake + bass thump
    ang = braking && win ? .035 : 0;   // the nose dips under braking
    U.uFog.value = lerp(.6, .85, sstep(0, .6, drv.u));   // already in the cloud from the scene before
    if (drv.u >= 1) {
      if (!QS.has('hang')) hangVal = clamp(1 - drv.heldWin / Math.max(drv.inWin, .01) * 1.1, .05, 1);
      body.position.y = -PIVOT.y;
      go('car');
    }
  } else U.uFog.value = phase === 'car' ? .85 * (1 - sstep(.5, 4, since)) : 0;
  if (phase === 'flick' && since > 3.5 && fallT < 0) { fallT = 0; creak(1.4); }
  if (phase === 'flick' && since > 8) go('truck');
  if (fallT >= 0) {
    // past the balance point: the nose goes, then the whole car slides off the lip into the cloud
    fallT += dt; angV += (2 + Math.sin(ang) * 6) * dt; ang = Math.min(ang + angV * dt, 1.45);
    const f = Math.max(0, fallT - .8);
    jeep.position.set(CAR[0] + 260 * f, -CAR[1] - 450 * f * f, 150);   // out, clear of the lip, and down
  } else if (phase !== 'drive') {
    const target = reset() + tips * lerp(.04, .1, H) + Math.sin(t * .8) * .012 + Math.sin(t * 1.9 + 1) * .005;
    angV += ((target - ang) * 26 - angV * 2.2) * dt; ang += angV * dt;
  }
  hang.rotation.z = -ang;
  for (const d of doors) d.rotation.y = lerp(d.rotation.y, d.userData.side * 1.1 * d.userData.open, damp(4, dt));
  if (ctx.ac && t > nextCreak) { creak(.35 + Math.random() * .35); nextCreak = t + 6 + Math.random() * 6; }
  jeep.updateMatrixWorld(true);
  // headlights: from the nose, wherever the nose now points
  const a = body.localToWorld(v1.set(1.72, .62, 0)), b = body.localToWorld(v2.set(2.72, .62, 0));
  U.uHead.value.set(a.x, -a.y); U.uDir.value.set(b.x - a.x, a.y - b.y).normalize();
  if (truck.visible) {   // the truck rolls in round the bend and stops; now its headlights are the light
    const k = phase === 'truck' ? 1 - Math.pow(1 - clamp(since / 5, 0, 1), 2.2) : 1, x = lerp(TRUCK.from, TRUCK.to, k);
    truck.position.set(x, -TRUCK.y + (k < 1 ? Math.sin(t * 9) * .8 : 0), 140);
    U.uHead.value.set(x + truckW * .48, TRUCK.y - TRUCK.h * .2); U.uDir.value.set(1, .04).normalize();
  }
  // then: the old car and the two of them, only while the story's in the old painting
  thenCar.material.opacity = thenPair.material.opacity = sstep(.55, .95, U.uThen.value);
  const now = 1 - sstep(.05, .35, U.uThen.value);   // the present steps out of the way of the story
  jeep.visible = now > .5;
  for (const w of walkers) w.m.material.opacity = now;
  U.uSpill.value = phase === 'drive' || truck.visible ? 1 : 0;
  // getting out and sitting down
  for (const w of walkers) {
    if (!w.m.visible) continue;
    w.k = clamp((t - w.t0) / 2.4, 0, 1);
    const e = w.k * w.k * (3 - 2 * w.k), x = lerp(w.from[0], w.to[0], e), y = lerp(w.from[1], w.to[1], e), h = figH(y);
    w.m.position.set(x, -y + Math.abs(Math.sin(w.k * Math.PI * 5)) * 4 * (1 - w.k), 200 + y * .1);
    w.m.scale.set(h * 200 / 240, h, 1);
  }
  if (phase === 'car' && since > 2.2 && !hangSaid) { hangSaid = true; const l = line('hang'); if (l) say(l.who, l.text, 3.4, l.expr); }
  if (phase === 'yout' && walkers[1].k >= 1) go('seated');
  if (phase === 'seated' && lineI < SCRIPT.length && since > SCRIPT[lineI][0]) { const [, who, text] = SCRIPT[lineI++]; say(who, text, 4); }
  U.uThen.value = phase === 'seated' ? sstep(...T.thenIn, since) * (1 - sstep(...T.thenOut, since)) : 0;
  // him and the ember
  const seated = phase === 'seated', flick = phase === 'flick';
  const appear = seated ? sstep(...T.ghost, since) : flick ? 1 - sstep(0, 1.5, since) : 0;
  const ptr = ptrPx();
  const near = ptr ? sstep(gh * .5, gh * 2.2, Math.hypot(ptr[0] - GX, ptr[1] - (G[1] - gh * .5))) : 1;
  ghostMat.uniforms.uOp.value = appear * near;
  let glow = 0;
  if (seated) {
    const k = (Math.max(0, since - T.ember) / 7) % 1, drag = k < .12 ? sstep(0, .12, k) : Math.exp(-(k - .12) * 9);
    const f = since > T.ghost[0] && k < .3 ? 1 : 0;   // the drag: cigarette at his lips
    ghostMat.uniforms.tG.value = GHOST[f].tex; emb.pos.set(...tipAt(f));
    glow = sstep(T.ember, T.ember + 1, since) * (.45 + .75 * drag + Math.sin(t * 23) * .05);
  } else if (flick) {
    emb.vel.y += 38 * dt; emb.vel.x *= 1 - .4 * dt; emb.pos.addScaledVector(emb.vel, dt);   // falls slowly into the cloud
    glow = (1 - sstep(0, 5, since)) * (.8 + .2 * Math.sin(t * 30));
  }
  ember.visible = glow > 0;
  emberMat.uniforms.uI.value = glow;
  ember.position.set(emb.pos.x, -emb.pos.y, 300);
  U.uEmb.value.set(emb.pos.x, emb.pos.y, (seated ? sstep(T.ember, T.ember + 2, since) : 0) + (flick ? 1 - sstep(0, 2, since) : 0));
  $('#brake').hidden = !(phase === 'drive' && drv.u > BRAKE_FROM);
  ctx.prompt(ready() && LABEL[phase] || null);
  // render: colour, then the ink and paper rim around the taxi
  ctx.ink.uniforms.uTime.value = t; ctx.ink.uniforms.uJeepScale.value = .7;
  ctx.ink.render(scene, camera, jeep);
}
return {
  frame, resize,
  onTap: advance,
  onHorn() { if (phase === 'truck' && ready()) { go('lift'); return true; } return false; },   // flag the truck down with the horn
  dispose() { skid(false); disposeScene(scene); delete window.__edge; },
};
}
