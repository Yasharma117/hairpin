// The cloud line: seen from behind, the taxi drives up into the wall of cloud until it whites out. Hold to drive faster.
import * as THREE from 'three';
import { clamp, lerp, damp, loadImg, tex, strokeMap, NOISE, makeTaxi, disposeScene } from '../shared/kit.js';

const at = f => new URL(f, import.meta.url).href;
export const assets = ['cloudline-lit.jpg', 'cloudline-dark.jpg'];

const IW = 1536, IH = 1024;             // cloudline-lit/dark.jpg size in px; the whole scene lives in these units

// the left lane, from below the frame up to where the road bends into the cloud, as fractions of the painting
const LANE = [[.55, 1.1], [.6, .9], [.625, .75], [.625, .64], [.6, .565], [.585, .535]];
const sizeAt = y => 16 + 134 * Math.pow(clamp((y / IH - .52) / .48, 0, 1), 1.6);   // the taxi's scale with distance up the road

export async function load(ctx) {
const { input, layer } = ctx;
layer.innerHTML = '<div class="tag">HAIRPIN · THE CLOUD LINE</div>';
const [iLit, iDark] = await Promise.all(assets.map(a => loadImg(at(a))));
if (!iLit || !iDark) throw new Error('cloud line paintings did not load');
const tLit = tex(iLit), tDark = tex(iDark), tStroke = tex(strokeMap(iLit, IW, IH));

/* ---------- light: headlights only ---------- */
const U = {
  tLit: { value: tLit }, tDark: { value: tDark }, tStroke: { value: tStroke },
  uImg: { value: new THREE.Vector2(IW, IH) },
  uHead: { value: new THREE.Vector2(-999, -999) }, uDir: { value: new THREE.Vector2(1, 0) }, uScale: { value: 1.2 },
  uFog: { value: 0 },
  uMode: ctx.U.uMode, uTime: { value: 0 },
};
const LIGHT = NOISE + /* glsl */`
uniform vec2 uImg, uHead, uDir; uniform float uScale, uMode, uTime, uFog;
uniform sampler2D tLit, tDark, tStroke;
float lightAt(vec2 p){
  vec2 v = p - uHead; float along = dot(v, uDir); float perp = length(v - uDir * along);
  float range = 560. * uScale;
  float cone = step(0., along) * (1. - smoothstep(along * .16, along * .5 + 6., perp))   /* soft: a beam into cloud, not a spotlight */ * (1. - smoothstep(range * .45, range, along));
  float spill = 1. - smoothstep(26. * uScale, 120. * uScale, length(v * vec2(1., 2.2)));
  return cone * 1.5 + spill * 1.1;
}
vec2 uvOf(vec2 p){ return vec2(p.x / uImg.x, 1. - p.y / uImg.y); }
float reveal(vec2 p, float L){
  float s = texture2D(tStroke, uvOf(p)).r;
  float t = .22 + .6 * (1. - s);          // bright strokes catch the light first
  float on = smoothstep(t - .05, t + .05, L);
  return uMode > 1.5 ? 1. : (uMode > .5 ? 0. : on);
}`;

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(0, IW, 0, -IH, -1000, 1000);
camera.position.z = 500;
const bg = new THREE.Mesh(new THREE.PlaneGeometry(IW, IH), new THREE.ShaderMaterial({
  uniforms: U,
  vertexShader: 'varying vec2 vPx; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vPx = vec2(w.x, -w.y); gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: LIGHT + /* glsl */`
    varying vec2 vPx;
    void main(){
      vec2 p = vPx, uv = uvOf(p);
      vec3 lit = texture2D(tLit, uv).rgb, dark = texture2D(tDark, uv).rgb;
      float L = lightAt(p);
      vec3 col = mix(dark, lit * vec3(1.05, .97, .86), reveal(p, L));
      // the cloud comes down over the road; the beams hit a wall of white
      float m = smoothstep(.35, .85, vn2(vec2(p.x * .004 + uTime * .03, p.y * .009)) * .7 + vn2(vec2(p.x * .012 - uTime * .05, p.y * .025)) * .3);
      col = mix(col, mix(vec3(.3, .34, .45), vec3(1., .95, .82), clamp(L * .7, 0., 1.)), uFog * (.55 + .45 * m));
      gl_FragColor = vec4(col, 1.);
    }`,
}));
bg.position.set(IW / 2, -IH / 2, -400);
scene.add(bg);

const { jeep, body, PIVOT } = makeTaxi(U.uMode);
scene.add(jeep);
ctx.bed({ engine: 1, wind: .6 });

/* ---------- framing: locked, covering the screen ---------- */
let viewW = IW, viewH = IH;
function resize(w, h) {
  const aspect = w / h;
  if (aspect > IW / IH) { viewW = IW; viewH = IW / aspect; } else { viewH = IH; viewW = IH * aspect; }
  const cx = clamp(.58 * IW, viewW / 2, IW - viewW / 2), cy = clamp(.62 * IH, viewH / 2, IH - viewH / 2);
  camera.left = cx - viewW / 2; camera.right = cx + viewW / 2; camera.top = -(cy - viewH / 2); camera.bottom = -(cy + viewH / 2);
  camera.updateProjectionMatrix();
}

/* ---------- the lines, by how far along the road you are ---------- */
// DRAFT lines.
const LINES = [
  [.12, 'PASSENGER', 'Can you even see the road?'],
  [.5, 'YOU', 'I know this road.'],
];
let lineIdx = 0, done = false;

/* ---------- loop: the taxi drives away up the road; the cloud closes in; then the edge ---------- */
const PATH = new THREE.CatmullRomCurve3(LANE.map(([x, y]) => new THREE.Vector3(x * IW, y * IH, 0)));
let u = 0, speed = 1;
const U0 = +ctx.params.get('u');   // ?u=0.5 starts halfway up (for checking frames)
if (U0) u = U0;
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), .42), yawQ = new THREE.Quaternion();
function frame(dt) {
  const t = (U.uTime.value += dt);
  speed = lerp(speed, input.hold ? 2.2 : 1, damp(2, dt));   // HOLD: drive faster
  u += speed * dt / 10;   // about ten seconds up the road
  if (u >= 1) { u = 1; if (!done) { done = true; ctx.next(); } }   // whited out: the edge
  const p = PATH.getPointAt(u), q = PATH.getTangentAt(u), sc = sizeAt(p.y);
  jeep.position.set(p.x, -p.y, 150);
  jeep.scale.setScalar(sc);
  jeep.quaternion.copy(tilt).multiply(yawQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-q.y * 2.4, q.x)));   // seen from behind
  body.position.y = -PIVOT.y + Math.sin(t * 13) * .012 * speed + Math.pow(Math.max(0, Math.sin(t * 11.9)), 10) * .03;   // road shake + bass thump
  jeep.updateMatrixWorld(true);
  const a = body.localToWorld(v1.set(1.72, .62, 0)), b = body.localToWorld(v2.set(2.72, .62, 0));
  U.uHead.value.set(a.x, -a.y); U.uDir.value.set(b.x - a.x, a.y - b.y).normalize();
  U.uScale.value = .3 + sc / 260;   // the beam's reach shrinks with distance too
  ctx.ink.uniforms.uJeepScale.value = clamp(sc / 190, .2, 1); ctx.ink.uniforms.uTime.value = t;
  U.uFog.value = Math.pow(clamp((u - .25) / .7, 0, 1), 1.3) * .95;
  if (lineIdx < LINES.length && u >= LINES[lineIdx][0]) { const [, who, text] = LINES[lineIdx++]; ctx.say(who, text, 3.5); }
  ctx.ink.render(scene, camera, jeep);
}
return { frame, resize, dispose() { disposeScene(scene); } };
}
