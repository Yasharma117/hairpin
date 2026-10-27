// The climb: painted hills, the headlight reveal, wind in the grass, cows, a dog that chases, a walker, the woman with the basket.
// Hold to drive faster; the horn makes them look up.
import * as THREE from 'three';
import { disposeScene, makeTaxi, colorize, Stage, loadImg as loadImage, keyLight } from '../shared/kit.js';
import { CLIMB_STANDINS as C } from '../shared/style.js';

const at = f => new URL(f, import.meta.url).href;
const SPRITES = ['cow-graze', 'cow-look', 'dog-sit', 'dog-bark-1', 'dog-bark-2', 'dog-bark-3', 'dog-run-1', 'dog-run-2', 'walker-1', 'walker-2', 'basket'];
export const assets = ['lit.jpg', 'dark.jpg', 'strokes.jpg', 'depth.png', ...SPRITES.flatMap(n => [`sprites/${n}-lit.png`, `sprites/${n}-dark.png`])];

export async function load(ctx) {
const { renderer, canvas, layer, input } = ctx;
layer.innerHTML = '<div class="tag">HAIRPIN · THE CLIMB</div>';
ctx.bed({ engine: 1, crickets: .6 });
const IW = 1774, IH = 887;              // painting size in px; the whole scene lives in these units
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const depthN = y => clamp((y - 300) / 587, 0, 1);   // 0 at the ridgeline, 1 at the bottom edge

const loader = new THREE.TextureLoader();
const load = url => new Promise((res, rej) => loader.load(url, t => { t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; res(t); }, undefined, rej));
let tLit, tDark, tStroke;
[tLit, tDark, tStroke] = await Promise.all(['lit.jpg', 'dark.jpg', 'strokes.jpg'].map(f => load(at(f))));
const stage = new Stage({ W: IW, H: IH, depth: await loadImage(at('depth.png')), k: .2 });   // gentle: the camera travels a long way here

/* ---------- shared light model, in painting pixels ---------- */
const LAMPS = [new THREE.Vector2(560, 600), new THREE.Vector2(1180, 520)];
const U = {
  tLit: { value: tLit }, tDark: { value: tDark }, tStroke: { value: tStroke },
  uImg: { value: new THREE.Vector2(IW, IH) }, uPar: { value: new THREE.Vector2() },
  uHead: { value: new THREE.Vector2(-999, -999) }, uDir: { value: new THREE.Vector2(1, 0) }, uScale: { value: 1 },
  uLamp: { value: LAMPS }, uMode: { value: 0 }, uTime: { value: 0 },
};
const LIGHT = /* glsl */`
uniform vec2 uImg, uPar, uHead, uDir, uLamp[2]; uniform float uScale, uMode, uTime;
uniform sampler2D tLit, tDark, tStroke;
float depthN(float y){ return clamp((y - 300.) / 587., 0., 1.); }
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h12(i), h12(i+vec2(1,0)), f.x), mix(h12(i+vec2(0,1)), h12(i+vec2(1,1)), f.x), f.y); }
float lightAt(vec2 p){
  vec2 v = p - uHead; float along = dot(v, uDir); float perp = length(v - uDir * along);
  float range = 560. * uScale;
  float cone = step(0., along) * (1. - smoothstep(along * .30, along * .42 + 6., perp)) * (1. - smoothstep(range * .45, range, along));
  float spill = 1. - smoothstep(26. * uScale, 120. * uScale, length(v * vec2(1., 2.2)));
  float lamps = 0.;
  for (int i = 0; i < 2; i++) { vec2 lv = (p - uLamp[i]) * vec2(1., 2.4); lamps += 1. - smoothstep(30., 165., length(lv)); }
  return cone * 1.5 + spill * 1.1 + lamps * .95;
}
vec2 uvOf(vec2 p){ return vec2(p.x / uImg.x, 1. - p.y / uImg.y); }
float reveal(vec2 p, float L){
  float s = texture2D(tStroke, uvOf(p)).r;
  float t = .22 + .6 * (1. - s);          // bright strokes catch the light first
  float on = smoothstep(t - .05, t + .05, L);
  return uMode > 1.5 ? 1. : (uMode > .5 ? 0. : on);
}`;

/* ---------- the painting ---------- */
const scene = new THREE.Scene();
const camera = stage.cam;
const bgMat = new THREE.ShaderMaterial({
  uniforms: U,
  fragmentShader: LIGHT + /* glsl */`
    varying vec2 vPx;
    void main(){
      vec2 p0 = vPx + uPar * (1. - depthN(vPx.y));
      vec3 lit0 = texture2D(tLit, uvOf(p0)).rgb, dark0 = texture2D(tDark, uvOf(p0)).rgb;
      float sky = step(.86, dot(lit0, vec3(.333))) * step(dot(dark0, vec3(.333)), .14);
      // wind: gust fronts roll left to right through the grass, stronger up close; earth banks stay put
      float grass = (1. - sky) * smoothstep(.02, .12, lit0.g - lit0.b) * (1. - smoothstep(.15, .3, lit0.r - lit0.g));
      float gust = sin(p0.x * .013 - uTime * 1.7 + vn2(p0 * .006) * 5.) * .5 + .5;
      float w = (vn2(vec2(p0.x * .02 - uTime * 1.3, p0.y * .05)) - .5) * .8 + gust * .9;
      vec2 p = p0 + vec2(1., .22) * w * mix(2.5, 10., depthN(p0.y)) * grass;
      vec2 uv = uvOf(p);
      vec3 lit = texture2D(tLit, uv).rgb, dark = texture2D(tDark, uv).rgb;
      float L = lightAt(p0);
      float on = reveal(p, L);
      vec3 col = mix(dark, lit * vec3(1.05, .97, .86), on);
      col += mix(vec3(.025, .035, .05), vec3(.08, .075, .03), on) * smoothstep(.72, 1., gust) * grass;
      col = mix(col, dark, sky);
      // drifting cloud band across the middle of the hill, lit where the beams pass through it
      float band = smoothstep(330., 430., p.y) * (1. - smoothstep(560., 700., p.y));
      float m = smoothstep(.45, .85, vn2(vec2(p.x * .0035 + uTime * .025, p.y * .011)) * .7 + vn2(vec2(p.x * .011 - uTime * .04, p.y * .03)) * .3);
      vec3 mist = mix(vec3(.30, .35, .46), vec3(.98, .9, .72), clamp(L * .55, 0., 1.));
      col = mix(col, mist, m * band * (.38 + .25 * clamp(L, 0., 1.)) * (1. - sky) * step(uMode, .5));
      gl_FragColor = vec4(col, 1.);
    }`,
});
const bg = stage.mesh(bgMat);   // the painting, 2.5D
scene.add(bg);

/* ---------- the road: a switchback laid over the slopes ---------- */
const PATH = [[1950, 830], [1500, 772], [1050, 734], [700, 706], [470, 676], [430, 650], [520, 622], [880, 596], [1180, 566], [1262, 548], [1205, 528], [960, 510], [740, 484], [690, 458], [760, 428], [830, 396], [870, 360]];
const curve = new THREE.CatmullRomCurve3(PATH.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal');
const RN = 420;
const pts = curve.getSpacedPoints(RN);
const roadW = y => lerp(12, 64, depthN(y));
{
  const P = [], A = [], I = [];
  let dist = 0;
  for (let i = 0; i <= RN; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(RN, i + 1)], p = pts[i];
    if (i) dist += p.distanceTo(pts[i - 1]) / Math.max(.25, roadW(p.y) / 86);
    const t = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
    const n = new THREE.Vector2(-t.y, t.x).multiply(new THREE.Vector2(1, .55)).normalize();
    const w = roadW(p.y) / 2;
    for (const s of [-1, 1]) { P.push(p.x + n.x * w * s, p.y + n.y * w * s, 0); A.push(s, dist); }
    if (i) { const k = (i - 1) * 2; I.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('road', new THREE.Float32BufferAttribute(A, 2));
  g.setIndex(I);
  const m = new THREE.ShaderMaterial({
    uniforms: { ...U, ...stage.uniforms }, transparent: false, side: THREE.DoubleSide, depthTest: false, depthWrite: false,
    vertexShader: Stage.GLSL + /* glsl */`
      uniform vec2 uImg; attribute vec2 road; varying vec2 vPx; varying vec2 vRoad;
      void main(){ vPx = position.xy; vRoad = road; gl_Position = projectionMatrix * viewMatrix * vec4(stageAt(vPx, stageDepth(vPx, uImg)), 1.); }`,
    fragmentShader: LIGHT + /* glsl */`
      varying vec2 vPx; varying vec2 vRoad;
      void main(){
        float edge = abs(vRoad.x);
        if (edge > .97 - .16 * vn2(vPx * .09)) discard;
        float L = lightAt(vPx);
        float on = reveal(vPx, L);
        float dash = step(abs(vRoad.x), .05) * step(.5, fract(vRoad.y / 40.));
        vec3 litC = mix(vec3(.72, .69, .63), vec3(.95, .8, .35), dash);
        vec3 darkC = mix(vec3(.13, .19, .24), vec3(.26, .29, .25), dash);
        float shoulder = smoothstep(.72, .9, edge);
        litC = mix(litC, vec3(.62, .42, .27), shoulder); darkC = mix(darkC, vec3(.2, .15, .19), shoulder);
        float grain = (texture2D(tStroke, uvOf(vPx)).r - .5) * .12;
        vec3 col = mix(darkC, litC * vec3(1.05, .97, .86), on) + grain;
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const road = new THREE.Mesh(g, m); road.frustumCulled = false; road.renderOrder = -9; scene.add(road);
}


/* ---------- grass strokes: thousands of painted blades, coloured from the painting, moving in the wind ---------- */
{
  const read = img => { const cv = document.createElement('canvas'); cv.width = IW; cv.height = IH; const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, IW, IH); return cx.getImageData(0, 0, IW, IH).data; };
  const L = read(tLit.image), D = read(tDark.image);
  const roadPts = curve.getSpacedPoints(300);
  const nearRoad = (x, y) => { for (const q of roadPts) { const dx = x - q.x, dy = (y - q.y) * 1.6; if (dx * dx + dy * dy < (roadW(q.y) / 2 + 10) ** 2) return true; } return false; };
  const base = [], lit = [], dark = [], shape = [];
  let tries = 0;
  // tufts of 3-5 blades, coloured from the painting right where they grow
  while (base.length / 2 < 4200 && tries++ < 30000) {
    const cy = 455 + (IH - 455) * Math.sqrt(Math.random()), cxp = Math.random() * IW;
    const i0 = ((cy | 0) * IW + (cxp | 0)) * 4;
    const r0 = L[i0] / 255, g0 = L[i0 + 1] / 255, b0 = L[i0 + 2] / 255;
    if ((r0 + g0 + b0) / 3 > .86) continue;              // sky
    if (g0 - b0 < .03 || r0 - g0 > .14) continue;      // earth banks
    if (nearRoad(cxp, cy)) continue;
    const lean = (Math.random() - .5) * .6, n = 3 + (Math.random() * 3 | 0), sc0 = lerp(.4, 1, depthN(cy));
    for (let k = 0; k < n; k++) {
      const x = cxp + (Math.random() - .5) * 12 * sc0, y = cy + (Math.random() - .5) * 3 * sc0;
      const i = ((Math.min(IH - 1, y) | 0) * IW + (clamp(x, 0, IW - 1) | 0)) * 4;
      const kk = .96 + Math.random() * .1;
      base.push(x, y);
      lit.push(Math.min(1, L[i] / 255 * kk), Math.min(1, L[i + 1] / 255 * kk), Math.min(1, L[i + 2] / 255 * kk));
      dark.push(D[i] / 255 * kk * 1.06, D[i + 1] / 255 * kk * 1.06, D[i + 2] / 255 * kk * 1.06);
      shape.push(7 + Math.random() * 13, 3.5 + Math.random() * 3.5, lean + (Math.random() - .5) * .5);
    }
  }
  const g = new THREE.InstancedBufferGeometry();
  { const P = [], I = [], SEG = 5;
    for (let j = 0; j <= SEG; j++) { const v = j / SEG; P.push(-.5, v, 0, .5, v, 0); if (j) { const a = (j - 1) * 2; I.push(a, a + 1, a + 3, a, a + 3, a + 2); } }
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); }
  g.setAttribute('aBase', new THREE.InstancedBufferAttribute(new Float32Array(base), 2));
  g.setAttribute('aLit', new THREE.InstancedBufferAttribute(new Float32Array(lit), 3));
  g.setAttribute('aDark', new THREE.InstancedBufferAttribute(new Float32Array(dark), 3));
  g.setAttribute('aShape', new THREE.InstancedBufferAttribute(new Float32Array(shape), 3));
  g.instanceCount = base.length / 2;
  const m = new THREE.ShaderMaterial({
    uniforms: { ...U, ...stage.uniforms }, side: THREE.DoubleSide,
    vertexShader: Stage.GLSL + /* glsl */`
      uniform vec2 uImg; uniform float uTime;
      attribute vec2 aBase; attribute vec3 aLit, aDark, aShape;
      varying vec2 vB; varying vec3 vLit, vDark; varying float vV, vU;
      float depthN(float y){ return clamp((y - 300.) / 587., 0., 1.); }
      float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      float vn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h12(i), h12(i+vec2(1,0)), f.x), mix(h12(i+vec2(0,1)), h12(i+vec2(1,1)), f.x), f.y); }
      void main(){
        float n = depthN(aBase.y), sc = mix(.35, 1.1, n);
        float len = aShape.x * sc, wid = aShape.y * sc;
        float v = position.y;
        float gust = sin(aBase.x * .013 - uTime * 1.7 + vn2(aBase * .006) * 5.) * .5 + .5;
        float w = (vn2(vec2(aBase.x * .02 - uTime * 1.3, aBase.y * .05)) - .5) * .8 + gust * .9;
        float lean = aShape.z + w * 1.1;
        vec2 p = aBase + vec2(position.x * wid * (1. - v * .9) * (1. - .3 * v * v) + lean * len * v * v, -v * len * (1. - .15 * abs(lean)));
        vB = aBase; vLit = aLit; vDark = aDark; vV = v; vU = position.x;
        float d = stageDepth(aBase, uImg);   // the whole blade at its root's depth, so it doesn't bend across a step
        gl_Position = projectionMatrix * viewMatrix * vec4(stageAt(p, d) + vec3(0., 0., v * .5), 1.);
      }`,
    fragmentShader: LIGHT + /* glsl */`
      varying vec2 vB; varying vec3 vLit, vDark; varying float vV, vU;
      void main(){
        float on = reveal(vB, lightAt(vB));
        vec3 col = mix(vDark, vLit * vec3(1.05, .97, .86), on) * (.97 + .12 * vV * (.4 + on));
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const blades = new THREE.Mesh(g, m); blades.frustumCulled = false; scene.add(blades);
}

/* ---------- lamp posts ---------- */
const lampGroup = new THREE.Group(); scene.add(lampGroup);
const flatMat = hex => new THREE.MeshBasicMaterial({ color: hex });
for (const L of LAMPS) {
  const s = lerp(.35, 1, depthN(L.y)) * 1.15;
  const pole = new THREE.Mesh(new THREE.BoxGeometry(5 * s, 150 * s, 2), flatMat(C.lampPole));
  pole.position.set(L.x + 40 * s, -(L.y - 75 * s - 12 * s), -200); lampGroup.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(44 * s, 4 * s, 2), flatMat(C.lampPole));
  arm.position.set(L.x + 20 * s, -(L.y - 150 * s - 12 * s), -200); lampGroup.add(arm);
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(14 * s, 8 * s, 2), flatMat(C.bulb));
  bulb.position.set(L.x + 2 * s, -(L.y - 146 * s - 12 * s), -199); lampGroup.add(bulb);
  for (const o of [pole, arm, bulb]) { const px = o.position.x, py = -o.position.y; stage.place(o, px, py, 1, stage.depthAt(L.x + 40 * s, L.y)); o.renderOrder = -8; }
  pole.userData.y = arm.userData.y = bulb.userData.y = L.y;
}

/* ---------- the taxi: the shared one ---------- */
const { jeep, body, parts, jeepMat, PIVOT } = makeTaxi(U.uMode);
scene.add(jeep);


/* ---------- framing: cover the screen, follow the jeep ---------- */
let viewW = IW, viewH = IH, ZOOM = 1.5, baseW = IW, baseH = IH, zoomK = 1;
function resize(w, h) {
  const aspect = w / h;
  const Z = ZOOM;
  if (aspect > IW / IH) { baseW = IW; baseH = IW / aspect; } else { baseH = IH; baseW = IH * aspect; }
  viewW = baseW / (Z * zoomK); viewH = baseH / (Z * zoomK);
  stage.view(IW / 2, IH / 2, baseH / Z, aspect);   // the rest pose; following the taxi moves the camera from here
}

/* ---------- the lines along the climb ---------- */
// DRAFT lines: how you got here, in pieces between bends
const LINES = [
  [.1, 'PASSENGER', 'So you were always a designer?'],
  [.4, 'YOU', 'No. Robotics, in Chennai. Design came after.'],
  [.7, 'YOU', 'Now I mostly build my own tools.'],
];
let lineIdx = -1;


/* ---------- life on the hill: cows, a dog, people, all reacting to the taxi ---------- */
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function lightCPU(x, y) {
  const h = U.uHead.value, d = U.uDir.value, sc = U.uScale.value;
  const vx = x - h.x, vy = y - h.y, along = vx * d.x + vy * d.y, perp = Math.hypot(vx - d.x * along, vy - d.y * along), range = 560 * sc;
  const cone = (along > 0 ? 1 : 0) * (1 - sstep(along * .3, along * .42 + 6, perp)) * (1 - sstep(range * .45, range, along));
  const spill = 1 - sstep(26 * sc, 120 * sc, Math.hypot(vx, vy * 2.2));
  let lamps = 0; for (const L of LAMPS) lamps += 1 - sstep(30, 165, Math.hypot(x - L.x, (y - L.y) * 2.4));
  return { L: cone * 1.5 + spill * 1.1 + lamps * .95, cone };
}
const sizeAt = y => 34 * lerp(.32, 1, depthN(y));
function mesh(group, mat, geo, hex, o = {}) {
  geo.rotateX(o.rx || 0); geo.rotateY(o.ry || 0); geo.rotateZ(o.rz || 0); geo.translate(o.x || 0, o.y || 0, o.z || 0);
  const m = new THREE.Mesh(colorize(geo, hex, o.emit || 0), mat); m.userData.mat = mat; group.add(m); parts.push(m); return m;
}
function creature() { const R = new THREE.Group(), B = new THREE.Group(); R.add(B); scene.add(R); const mat = jeepMat.clone(); return { R, B, mat, M: (g, geo, hex, o) => mesh(g, mat, geo, hex, o) }; }
const Box = (a, b, c) => new THREE.BoxGeometry(a, b, c);
function legs(c, hex, xs, zs, len, w, y0) {
  const out = [];
  for (const x of xs) for (const z of zs) { const L = new THREE.Group(); L.position.set(x, y0, z); c.B.add(L); c.M(L, Box(w, len, w), hex, { y: -len / 2 }); c.M(L, Box(w * 1.1, .07, w * 1.1), C.hoof, { y: -len + .03 }); out.push(L); }
  return out;
}
function makeCow(hex, patch) {
  const c = creature();
  c.M(c.B, Box(1.5, .62, .58), hex, { y: .98 });
  c.M(c.B, Box(.52, .5, .6), patch, { x: -.3, y: 1.02 });
  c.M(c.B, Box(.3, .22, .42), hex, { x: .5, y: 1.36 });
  c.M(c.B, new THREE.CylinderGeometry(.02, .02, .6, 4), hex, { x: -.8, y: .86, rz: .25 });
  c.legs = legs(c, hex, [-.55, .55], [-.2, .2], .7, .14, .7);
  c.H = new THREE.Group(); c.H.position.set(.72, 1.12, 0); c.B.add(c.H);
  c.M(c.H, Box(.42, .3, .28), hex, { x: .2, y: -.05 });
  c.M(c.H, Box(.16, .2, .26), C.cowMuzzle, { x: .45, y: -.1 });
  for (const z of [-.1, .1]) { c.M(c.H, new THREE.CylinderGeometry(.018, .03, .18, 5), C.horn, { x: .12, y: .15, z, rx: z * 5 }); c.M(c.H, Box(.06, .06, .16), hex, { x: .1, y: .04, z: z * 1.9 }); }
  c.eyes = [-.12, .12].map(z => c.M(c.H, Box(.04, .05, .04), C.eye, { x: .33, y: 0, z, emit: 1 }));
  c.kind = 'cow'; c.phase = Math.random() * 6; return c;
}
function makeDog() {
  const c = creature(), hex = C.dog;
  c.M(c.B, Box(.66, .24, .22), hex, { y: .46 });
  c.legs = legs(c, hex, [-.24, .24], [-.07, .07], .34, .07, .36);
  c.H = new THREE.Group(); c.H.position.set(.36, .6, 0); c.B.add(c.H);
  c.M(c.H, Box(.24, .2, .18), hex, { x: .08 });
  c.M(c.H, Box(.12, .1, .12), C.dogMuzzle, { x: .24, y: -.04 });
  for (const z of [-.06, .06]) c.M(c.H, Box(.05, .1, .04), C.dogEar, { x: .02, y: .14, z });
  c.eyes = [-.06, .06].map(z => c.M(c.H, Box(.03, .03, .03), C.eye, { x: .2, y: .03, z, emit: 1 }));
  c.tail = new THREE.Group(); c.tail.position.set(-.33, .54, 0); c.B.add(c.tail); c.M(c.tail, new THREE.CylinderGeometry(.02, .025, .26, 4), hex, { y: .12, rz: .6 });
  c.kind = 'dog'; c.phase = 0; return c;
}
function makePerson(top, bottom, extra) {
  const c = creature();
  c.legs = [-.08, .08].map(z => { const L = new THREE.Group(); L.position.set(0, .6, z); c.B.add(L); c.M(L, Box(.12, .58, .12), bottom, { y: -.29 }); return L; });
  c.M(c.B, Box(.3, .55, .26), top, { y: .9 });
  c.M(c.B, new THREE.SphereGeometry(.12, 10, 8), C.skin, { y: 1.32 });
  c.M(c.B, new THREE.SphereGeometry(.125, 10, 6, 0, Math.PI * 2, 0, 1.4), C.hair, { y: 1.35, x: -.02 });
  extra(c); c.phase = Math.random() * 6; return c;
}
const cows = [makeCow(C.cowBrown, C.cowWhite), makeCow(C.cowPale, C.cowDark)];
cows[0].home = new THREE.Vector2(985, 666); cows[0].face = new THREE.Vector2(1, .15);
cows[1].home = new THREE.Vector2(1095, 642); cows[1].face = new THREE.Vector2(-1, .1);
const dog = makeDog(); dog.home = new THREE.Vector2(1560, 818); dog.state = 'sit'; dog.pos = dog.home.clone(); dog.face = new THREE.Vector2(-1, .2);
const walker = makePerson(C.walkerShirt, C.walkerLegs, c => {
  c.M(c.B, new THREE.CylinderGeometry(.012, .012, .85, 4), C.pole, { x: .14, y: 1.48 });
  c.M(c.B, new THREE.ConeGeometry(.55, .26, 10), C.umbrella, { x: .14, y: 1.98 });
});
walker.u = .6; walker.kind = 'walker';
const basket = makePerson(C.basketShirt, C.basketSkirt, c => {
  c.M(c.B, new THREE.ConeGeometry(.3, .7, 10), C.basket, { x: -.26, y: 1.08, rz: Math.PI });
  c.M(c.B, Box(.04, .04, .3), C.dogEar, { x: -.08, y: 1.42 });
  c.M(c.B, new THREE.ConeGeometry(.26, .5, 10), C.basketShirt, { y: .38 });
});
basket.home = new THREE.Vector2(640, 578); basket.face = new THREE.Vector2(0, 1); basket.kind = 'basket';
const beings = [...cows, dog, walker, basket];
for (const b of beings) b.R.visible = false;  // placeholders: replaced by painted cut-outs
let honkT = 0, lapDogDone = false, barkT = 0, dogBarked = false;
const ZERO = new THREE.Vector2(), KEY_TO = new THREE.Vector3();
const tiltQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), .42), yawQ = new THREE.Quaternion();
function place(c, x, y, f, par) {
  const o = par(y), sz = sizeAt(y);
  c.R.position.set(x - o.x, -(y - o.y), y * .2 + 1);
  c.R.scale.setScalar(sz);
  yawQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-f.y * 2.4, f.x));
  c.R.quaternion.copy(tiltQ).multiply(yawQ);
  const l = lightCPU(x, y);
  c.mat.uniforms.uL.value = clamp(.2 + l.L * .8, .2, 1.25);
  if (c.eyes) for (const e of c.eyes) e.visible = l.cone > .25 || honkT > 0 && l.L > .3;
}
function walkLegs(c, t, amt) { if (!c.legs) return; c.legs.forEach((L, i) => { L.rotation.z = Math.sin(t + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * .5 * amt; }); }
function roadSide(u, side, inset = -10) {
  const q = curve.getPointAt(clamp(u, 0, 1)), q2 = curve.getPointAt(clamp(u + .004, 0, 1));
  const d = new THREE.Vector2(q2.x - q.x, q2.y - q.y).normalize(), n = new THREE.Vector2(-d.y, d.x * .55).normalize();
  const off = roadW(q.y) / 2 - inset;
  if (side === 0) side = n.y > 0 ? 1 : -1;   // 0 = the shoulder nearest the camera
  return { x: q.x + n.x * off * side, y: q.y + n.y * off * side, d };
}
function updateLife(dt, car, dir, sCar, par) {
  const t = U.uTime.value;
  honkT = Math.max(0, honkT - dt);
  for (const c of cows) {
    const dist = Math.hypot(c.home.x - car.x, (c.home.y - car.y) * 1.8);
    const alert = dist < 260 || honkT > 0;
    const pitch = alert ? .15 : -.55 + Math.sin(t * 1.3 + c.phase) * .08;
    c.H.rotation.z = lerp(c.H.rotation.z, pitch, damp(4, dt));
    c.H.rotation.y = lerp(c.H.rotation.y, alert ? clamp(Math.atan2(-(car.y - c.home.y) * 2.4, car.x - c.home.x) - Math.atan2(-c.face.y * 2.4, c.face.x), -.8, .8) : 0, damp(3, dt));
    place(c, c.home.x, c.home.y, c.face, par);
  }
  // the dog: sits under the lamp, chases the taxi once per lap, gives up, trots home
  if (sCar < 5) { lapDogDone = false; dogBarked = false; }
  const dd = Math.hypot(dog.pos.x - car.x, (dog.pos.y - car.y) * 1.8);
  // the dog sits up and barks at the taxi as it comes (and at the horn), then gives chase
  barkT = Math.max(0, barkT - dt);
  if (dog.state === 'sit' && !lapDogDone && !dogBarked && dd < 560) { dogBarked = true; barkT = 1.4; bark(); }
  if (dog.state === 'sit' && !lapDogDone && barkT <= 0 && (dd < 330 || honkT > 0 && dd < 900)) { dog.state = 'chase'; dog.until = t + 5.5; bark(); }
  if (dog.state === 'chase') {
    const side = roadSide((sCar + (88 + Math.sin(t * 2.3) * 18) * sizeAt(car.y) / 34) / total, 0, 12 * sizeAt(car.y) / 34);   // on the tarmac, just ahead of the bumper, inside the beam
    dog.pos.lerp(new THREE.Vector2(side.x, side.y), damp(4, dt)); dog.face.copy(side.d);
    walkLegs(dog, t * 16, 1); dog.tail.rotation.z = Math.sin(t * 20) * .5;
    dog.B.position.y = Math.abs(Math.sin(t * 16)) * .06;
    if (t > dog.until) { dog.state = 'home'; lapDogDone = true; }
  } else if (dog.state === 'home') {
    const v = new THREE.Vector2().subVectors(dog.home, dog.pos); const L = v.length();
    if (L < 4) { dog.state = 'sit'; dog.face.set(-1, .2); } else { dog.pos.addScaledVector(v.normalize(), Math.min(L, dt * 90)); dog.face.copy(v); walkLegs(dog, t * 9, .7); }
    dog.B.position.y = 0;
  } else { walkLegs(dog, 0, 0); dog.tail.rotation.z = Math.sin(t * 3) * .2; dog.B.position.y = 0; }
  dog.H.rotation.z = lerp(dog.H.rotation.z, dog.state === 'sit' ? .1 + Math.sin(t * .7) * .05 : .25, damp(4, dt));
  place(dog, dog.pos.x, dog.pos.y, dog.face, par);
  // the walker: heads downhill on the far shoulder; stops and turns when you honk
  const stop = honkT > 0;
  if (!stop) walker.u -= dt * .0065;
  if (walker.u < .28) walker.u = .62;
  const ws = roadSide(walker.u, -1);
  walkLegs(walker, t * 6, stop ? 0 : 1);
  const wf = stop ? new THREE.Vector2(car.x - ws.x, car.y - ws.y).normalize() : ws.d.clone().negate();
  place(walker, ws.x, ws.y, wf, par);
  // the woman with the basket watches you go by
  const bd = Math.hypot(basket.home.x - car.x, basket.home.y - car.y);
  const bf = bd < 420 ? new THREE.Vector2(car.x - basket.home.x, car.y - basket.home.y).normalize() : basket.face;
  place(basket, basket.home.x, basket.home.y, bf, par);
}

/* ---------- painted cut-outs: people and animals as lit/dark sprite pairs ---------- */
// Each frame lives at sprites/<name>-lit.png and sprites/<name>-dark.png (transparent PNG). Missing files are skipped.
const SPRITE_H = { 'cow-graze': 1.75, 'cow-look': 1.9, 'dog-sit': 1.1, 'dog-bark-1': 1.4, 'dog-bark-2': 1.4, 'dog-bark-3': 1.4, 'dog-run-1': 1.15, 'dog-run-2': 1.15, 'walker-1': 2.4, 'walker-2': 2.4, 'basket': 2.05 };
// where the eyes are in each frame (uv, figure facing right), so they can catch the headlights
const EYES = { 'cow-graze': [[.889, .28]], 'cow-look': [[.898, .8], [.788, .791]], 'dog-sit': [[.837, .826]], 'dog-bark-1': [[.83, .866]], 'dog-bark-2': [[.837, .866]], 'dog-bark-3': [[.83, .862]], 'dog-run-1': [[.85, .779]], 'dog-run-2': [[.872, .775]] };
function trimmed(img) {
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
  const d = cx.getImageData(0, 0, cv.width, cv.height).data;
  let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
  for (let y = 0; y < cv.height; y += 2) for (let x = 0; x < cv.width; x += 2) if (d[(y * cv.width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 <= x0) return null;
  const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  const t = new THREE.CanvasTexture(out); t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4;
  return { tex: t, aspect: out.width / out.height };
}
const loadImg = url => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
const FRAMES = {};
await Promise.all(Object.keys(SPRITE_H).map(async name => {
  const [li, di] = await Promise.all([loadImg(at(`sprites/${name}-lit.png`)), loadImg(at(`sprites/${name}-dark.png`))]);
  if (!li) return;
  const lit = trimmed(li), dark = di ? trimmed(di) : lit;
  if (lit) FRAMES[name] = { lit: lit.tex, dark: dark.tex, aspect: lit.aspect, h: SPRITE_H[name] };
}));
const spriteGeo = new THREE.PlaneGeometry(1, 1).translate(0, .5, 0);
const FLIPUV = 'vec2 fuv(vec2 uv){ return vec2(uFlip > 0. ? uv.x : 1. - uv.x, uv.y); }';
function spriteActor() {
  // the figure: lit/dark pair, soft edges, eyes that catch the headlights
  const mat = new THREE.ShaderMaterial({
    uniforms: { tLitS: { value: null }, tDarkS: { value: null }, uL: { value: .2 }, uCone: { value: 0 }, uMode: U.uMode, uFlip: { value: 1 },
      uEye0: { value: new THREE.Vector2(-9, -9) }, uEye1: { value: new THREE.Vector2(-9, -9) }, uAsp: { value: 1 }, uEyeR: { value: .02 } },
    transparent: true, depthWrite: false,
    vertexShader: 'uniform float uFlip; varying vec2 vUv; ' + FLIPUV + ' void main(){ vUv = fuv(uv); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: /* glsl */`
      uniform sampler2D tLitS, tDarkS; uniform float uL, uCone, uMode, uAsp, uEyeR; uniform vec2 uEye0, uEye1; varying vec2 vUv;
      float eye(vec2 e){ vec2 d = (vUv - e) * vec2(uAsp, 1.); return exp(-dot(d, d) / (uEyeR * uEyeR)); }
      void main(){
        vec4 l = texture2D(tLitS, vUv), d = texture2D(tDarkS, vUv);
        float a = smoothstep(.15, .7, l.a);
        float lum = dot(l.rgb, vec3(.333));
        float t = .22 + .6 * (1. - lum);
        float on = smoothstep(t - .06, t + .06, uL);
        if (uMode > 1.5) on = 1.; else if (uMode > .5) on = 0.;
        vec3 c = mix(d.rgb, l.rgb * vec3(1.06, .98, .86), on);
        // bottom of the figure darkens into the grass so it stands in it, not on it
        c *= mix(.62, 1., smoothstep(.0, .16, vUv.y));
        float g = (eye(uEye0) + eye(uEye1)) * uCone * (uMode < .5 ? 1. : 0.);
        c += vec3(1., .93, .62) * g * 1.4;
        gl_FragColor = vec4(c, max(a, min(g, 1.) * .9));
      }`,
  });
  const m = new THREE.Mesh(spriteGeo, mat); m.frustumCulled = false; m.visible = false; m.renderOrder = 3; scene.add(m);
  // its shadow: the same silhouette laid down on the grass, thrown away from the headlights
  const shMat = new THREE.ShaderMaterial({
    uniforms: { tLitS: { value: null }, uFlip: { value: 1 }, uShear: { value: new THREE.Vector2() }, uW: { value: 1 }, uOp: { value: 0 } },
    transparent: true, depthWrite: false,
    vertexShader: 'uniform float uFlip, uW; uniform vec2 uShear; varying vec2 vUv; ' + FLIPUV + ' void main(){ vUv = fuv(uv); vec3 p = vec3(position.x * uW, 0., 0.) + vec3(uShear * position.y, 0.); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }',
    fragmentShader: 'uniform sampler2D tLitS; uniform float uOp; varying vec2 vUv; void main(){ float a = smoothstep(.2, .7, texture2D(tLitS, vUv).a) * uOp * (1. - vUv.y * .55); gl_FragColor = vec4(.02, .03, .06, a); }',
  });
  const sh = new THREE.Mesh(spriteGeo, shMat); sh.frustumCulled = false; sh.visible = false; sh.renderOrder = 1; scene.add(sh);
  // a soft contact pool under the feet
  const blMat = new THREE.ShaderMaterial({
    uniforms: { uOp: { value: .45 } }, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform float uOp; varying vec2 vUv; void main(){ vec2 d = (vUv - .5) * 2.; float a = (1. - smoothstep(.25, 1., length(d))) * uOp; gl_FragColor = vec4(.02, .03, .05, a); }',
  });
  const bl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), blMat); bl.frustumCulled = false; bl.visible = false; bl.renderOrder = 2; scene.add(bl);
  return { m, mat, sh, shMat, bl, blMat, frame: null };
}
let carY = null;
function showFrame(a, name, x, y, faceX, par, bob = 0) {
  const f = FRAMES[name]; if (!f) { a.m.visible = a.sh.visible = a.bl.visible = false; return false; }
  a.m.visible = a.sh.visible = a.bl.visible = true;
  const u = a.mat.uniforms;
  if (a.frame !== name) {
    u.tLitS.value = f.lit; u.tDarkS.value = f.dark; a.shMat.uniforms.tLitS.value = f.lit; a.frame = name;
    const e = EYES[name] || []; u.uEye0.value.set(...(e[0] || [-9, -9])); u.uEye1.value.set(...(e[1] || [-9, -9])); u.uAsp.value = f.aspect;
  }
  const o = par(y), sz = sizeAt(y), W = f.h * f.aspect * sz, H = f.h * sz;
  const bx = x - o.x, by = -(y - o.y), z = y * .2 + 1 + (carY !== null && y > carY + 4 ? 80 : 0);   // in front of the taxi when nearer the camera
  const dd = stage.depthAt(x, y), ss = stage.place(a.m, x, y - bob * sz + H * .03, [W, H], dd);
  const flip = faceX >= 0 ? 1 : -1;
  u.uFlip.value = flip; a.shMat.uniforms.uFlip.value = flip;
  const lc = lightCPU(x, y);
  u.uL.value = clamp(.15 + lc.L * .85, .15, 1.3);
  u.uCone.value = clamp(lc.cone * 1.4, 0, 1);
  u.uEyeR.value = .022 / Math.max(.4, f.h);
  // headlight shadow: from the lamp position through the feet, stretched along the ground
  const h = U.uHead.value, dx = x - h.x, dy = y - h.y, dl = Math.hypot(dx, dy) || 1;
  const len = H * clamp(260 / dl, .7, 2.2);
  stage.place(a.sh, x, y + H * .02, 1, dd);
  a.shMat.uniforms.uW.value = W;
  a.shMat.uniforms.uShear.value.set(dx / dl * len, -dy / dl * len * .42);
  a.shMat.uniforms.uOp.value = U.uMode.value < .5 ? clamp(lc.cone * 1.2, 0, .62) : 0;
  stage.place(a.bl, x, y, [W * .95, W * .2], dd);
  a.blMat.uniforms.uOp.value = U.uMode.value > 1.5 ? .35 : .5;
  return true;
}
const sCows = cows.map(() => spriteActor()), sDog = spriteActor(), sWalker = spriteActor(), sBasket = spriteActor();
function updateSprites(car, par) {
  const t = U.uTime.value; carY = car.y;
  cows.forEach((c, i) => {
    const alert = Math.hypot(c.home.x - car.x, (c.home.y - car.y) * 1.8) < 260 || honkT > 0;
    showFrame(sCows[i], alert && FRAMES['cow-look'] ? 'cow-look' : 'cow-graze', c.home.x, c.home.y, i ? -1 : 1, par);
  });
  const running = dog.state === 'chase' || dog.state === 'home';
  const dogFrame = running ? (Math.floor(t * 8) % 2 ? 'dog-run-1' : 'dog-run-2') : barkT > 0 ? `dog-bark-${[1, 2, 3, 2][Math.floor(t * 9) % 4]}` : 'dog-sit';
  showFrame(sDog, FRAMES[dogFrame] ? dogFrame : 'dog-sit', dog.pos.x, dog.pos.y, dog.face.x, par, running ? Math.abs(Math.sin(t * 16)) * .05 : 0);
  const ws = roadSide(walker.u, -1), stopped = honkT > 0;
  showFrame(sWalker, stopped ? 'walker-1' : (Math.floor(t * 3) % 2 ? 'walker-1' : 'walker-2'), ws.x, ws.y, stopped ? car.x - ws.x : -ws.d.x, par, stopped ? 0 : Math.abs(Math.sin(t * 3 * Math.PI)) * .02);
  showFrame(sBasket, 'basket', basket.home.x, basket.home.y, car.x - basket.home.x, par, Math.sin(t * 1.4) * .006);
}

function bark() {
  try {
    const ac = ctx.ac; if (!ac) return;
    const t0 = ac.currentTime;
    for (const at of [0, .32, .5]) {
      const o = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(520, t0 + at); o.frequency.exponentialRampToValueAtTime(260, t0 + at + .11);
      fl.type = 'bandpass'; fl.frequency.value = 900; fl.Q.value = 1.2;
      g.gain.setValueAtTime(.0001, t0 + at); g.gain.exponentialRampToValueAtTime(.12, t0 + at + .015); g.gain.exponentialRampToValueAtTime(.0001, t0 + at + .14);
      o.connect(fl).connect(g).connect(ctx.out); o.start(t0 + at); o.stop(t0 + at + .16);
    }
  } catch (e) {}
}

/* ---------- loop ---------- */
const total = curve.getLength();
let s = 0, speed = 1, camX = IW / 2, camY = IH / 2;
let done = false;
const tmp = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion();
window.__cl = { dog: () => ({ st: dog.state, x: dog.pos.x|0, y: dog.pos.y|0, vis: sDog.m.visible, fr: sDog.frame, sc: sDog.m.scale.x|0, frames: Object.keys(FRAMES), car: curve.getPointAt(s / total) }), s: () => s / total, zoom: z => { ZOOM = z; resize(); } };
function frame(dt) {
  U.uTime.value += dt;
  const fast = input.hold;   // HOLD: drive faster
  speed = lerp(speed, fast ? 3 : 1, damp(2, dt));
  const p0 = curve.getPointAt(s / total);
  s += speed * dt * lerp(26, 120, depthN(p0.y));
  if (s >= total) { s = 0; lineIdx = -1; if (!done) { done = true; ctx.next(); } }   // one lap, then Nongpoh
  const u = s / total;
  const p = curve.getPointAt(u), pa = curve.getPointAt(Math.min(1, u + .006));
  const dir = new THREE.Vector2(pa.x - p.x, pa.y - p.y).normalize();
  const n = depthN(p.y), sc = lerp(.32, 1, n);
  // camera follows, then parallax shifts nearer things more
  const dogMoment = dog.state === 'chase';
  zoomK = lerp(zoomK, dogMoment ? 1.55 : 1, damp(dogMoment ? 1.6 : .9, dt));
  viewW = baseW / (ZOOM * zoomK); viewH = baseH / (ZOOM * zoomK);
  const fx = dogMoment ? (p.x + dog.pos.x) / 2 : p.x, fy = dogMoment ? (p.y + dog.pos.y) / 2 - 20 : p.y - 30;
  const mW = viewW * .08, mH = viewH * .1;   // keep clear of the edges: the near ground moves further than the frame
  camX = lerp(camX, clamp(fx, viewW / 2 + mW, IW - viewW / 2 - mW), damp(1.4, dt));
  camY = lerp(camY, clamp(fy, viewH / 2 + mH, IH - viewH / 2 - mH), damp(1.4, dt));
  // the camera follows the taxi: a translation from the rest pose, so the hills slide past each other (real parallax), and a dolly for the dog
  Object.assign(stage.move, { dx: camX - IW / 2, dy: camY - IH / 2, dolly: 1 - 1 / zoomK });
  stage.apply();
  const par = () => ZERO;   // the old fake parallax: the depth does it now
  // jeep pose: size by depth, yaw from the road's direction on the ground
  const off = par(p.y);
  const size = 34 * sc;
  stage.place(jeep, p.x, p.y - 4 * sc, size, stage.depthAt(p.x, p.y));
  const yaw = Math.atan2(-dir.y * 2.4, dir.x);
  q1.setFromAxisAngle(new THREE.Vector3(1, 0, 0), .42); q2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  jeep.quaternion.copy(q1).multiply(q2);
  body.position.y = -PIVOT.y + Math.sin(U.uTime.value * 13) * .012 * speed + Math.pow(Math.max(0, Math.sin(U.uTime.value * 11.9)), 10) * .03;  // road shake + bass thump
  // headlights start at the jeep's nose, along the road
  U.uHead.value.set(p.x + dir.x * 58 * sc, p.y + dir.y * 58 * sc - 8 * sc);
  U.uDir.value.copy(dir);
  U.uScale.value = sc;
  let Lj = .25; for (const L of LAMPS) Lj += Math.max(0, 1 - Math.hypot(p.x - L.x, (p.y - L.y) * 2.4) / 170) * 1.1;
  // the warm key: the nearest street lamp's bulb
  const lamp = LAMPS.reduce((a, b) => Math.hypot(a.x - p.x, a.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y) ? a : b);
  keyLight(jeepMat, camera, jeep.position, stage.toWorld(lamp.x, lamp.y - 150, stage.depthAt(lamp.x, lamp.y), KEY_TO), clamp(Lj, .25, 1.2));
  ctx.ink.uniforms.uJeepScale.value = sc; ctx.ink.uniforms.uTime.value = U.uTime.value;
  // subtitles
  const next = LINES.findIndex(([at], i) => i > lineIdx && u >= at);
  if (next >= 0 && next !== lineIdx) { lineIdx = next; ctx.say(LINES[next][1], LINES[next][2], 4); }
  updateLife(dt, p, dir, s, par);
  updateSprites(p, par);
  // render: colour, then the ink and paper rim around the taxi
  ctx.ink.render(scene, camera, jeep);
}
return {
  frame, resize,
  onHorn() { honkT = 2.2; if (dog.state === 'sit') { barkT = 1.4; bark(); } return false; },   // they look up; the page plays the horn itself
  dispose() { disposeScene(scene); delete window.__cl; },
};
}
