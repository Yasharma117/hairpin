// The cloud line: seen from behind, the taxi drives up into the wall of cloud until it whites out. Hold to drive faster.
import * as THREE from 'three';
import { clamp, lerp, damp, loadImg, tex, strokeMap, NOISE, makeTaxi, disposeScene, Stage, keyLight } from '../shared/kit.js';

const at = f => new URL(f, import.meta.url).href;
export const assets = ['cloudline-lit.jpg', 'cloudline-dark.jpg', 'depth.png'];

const IW = 1536, IH = 1024;             // cloudline-lit/dark.jpg size in px; the whole scene lives in these units

// the left lane, from below the frame up to where the road bends into the cloud, as fractions of the painting
const LANE = [[.55, 1.1], [.6, .9], [.625, .75], [.625, .64], [.6, .565], [.585, .535]];
const sizeAt = y => 16 + 134 * Math.pow(clamp((y / IH - .52) / .48, 0, 1), 1.6);   // the taxi's scale with distance up the road

export async function load(ctx) {
const { input, layer } = ctx;
layer.innerHTML = '<div class="tag">HAIRPIN · THE CLOUD LINE</div>';
const [iLit, iDark, depthImg] = await Promise.all(assets.map(a => loadImg(at(a))));
const stage = new Stage({ W: IW, H: IH, depth: depthImg, k: .26 });
if (!iLit || !iDark) throw new Error('cloud line paintings did not load');
const tLit = tex(iLit), tDark = tex(iDark), tStroke = tex(strokeMap(iLit, IW, IH));

/* ---------- light: headlights only ---------- */
const U = {
  tLit: { value: tLit }, tDark: { value: tDark }, tStroke: { value: tStroke },
  uImg: { value: new THREE.Vector2(IW, IH) },
  uHead: { value: new THREE.Vector2(-999, -999) }, uDir: { value: new THREE.Vector2(1, 0) }, uScale: { value: 1.2 }, uHalf: { value: 4 },
  uFog: { value: 0 },
  uMode: ctx.U.uMode, uTime: { value: 0 },
};
const LIGHT = NOISE + /* glsl */`
uniform vec2 uImg, uHead, uDir; uniform float uScale, uMode, uTime, uFog, uHalf;
uniform sampler2D tLit, tDark, tStroke;
float lightAt(vec2 p){
  vec2 v = p - uHead; float along = dot(v, uDir); float perp = length(v - uDir * along);
  float range = 560. * uScale;
  // from both lamps (uHalf: half the lamps' spacing), widening into the cloud
  float cone = step(0., along) * (1. - smoothstep(uHalf + along * .14, uHalf + along * .36 + 4., perp)) * (1. - smoothstep(range * .45, range, along));
  float spill = 1. - smoothstep(26. * uScale, 120. * uScale, length(v * vec2(1., 2.2)));
  return cone * 1.5 + spill * 1.1;
}
// three hard pools of light (.33/.66/1), 4x4 Bayer dither only within a sliver of each band's edge; on the frame grid
float b2(vec2 a){ a = floor(a); return fract(dot(a, vec2(.5, a.y * .75))); }
float pools(float c){ vec2 q = floor(gl_FragCoord.xy * .5); float b = b2(q * .5) * .25 + b2(q); return clamp(floor(c * 3. + (b - .5) * .3), 0., 3.) / 3.; }
vec2 uvOf(vec2 p){ return vec2(p.x / uImg.x, 1. - p.y / uImg.y); }
float reveal(vec2 p, float L){
  float s = texture2D(tStroke, uvOf(p)).r;
  float t = .22 + .6 * (1. - s);          // bright strokes catch the light first
  float on = smoothstep(t - .05, t + .05, L);
  return uMode > 1.5 ? 1. : (uMode > .5 ? 0. : on);
}`;

const scene = new THREE.Scene();
const camera = stage.cam;
const bg = stage.mesh(new THREE.ShaderMaterial({
  uniforms: U,
  fragmentShader: LIGHT + /* glsl */`
    varying vec2 vPx;
    void main(){
      vec2 p = vPx, uv = uvOf(p);
      vec3 lit = texture2D(tLit, uv).rgb, dark = texture2D(tDark, uv).rgb;
      float L = lightAt(p);
      vec3 col = mix(dark, lit * vec3(1.05, .97, .86), reveal(p, L));
      // the cloud comes down over the road; the beams hit a wall of white
      float m = smoothstep(.35, .85, vn2(vec2(p.x * .004 + uTime * .03, p.y * .009)) * .7 + vn2(vec2(p.x * .012 - uTime * .05, p.y * .025)) * .3);
      col = mix(col, mix(vec3(.3, .34, .45), vec3(1., .95, .82), pools(clamp(L * .7, 0., 1.))), uFog * (.55 + .45 * m));
      gl_FragColor = vec4(col, 1.);
    }`,
}));
scene.add(bg);

const { jeep, body, PIVOT, jeepMat } = makeTaxi(U.uMode);
scene.add(jeep);
ctx.bed({ engine: 1, wind: .6 }); ctx.rpm(1);

/* ---------- framing: locked, covering the screen ---------- */
let viewW = IW, viewH = IH;
function resize(w, h) {
  const aspect = w / h;
  if (aspect > IW / IH) { viewW = IW; viewH = IW / aspect; } else { viewH = IH; viewW = IH * aspect; }
  const cx = clamp(.58 * IW, viewW / 2, IW - viewW / 2), cy = clamp(.62 * IH, viewH / 2, IH - viewH / 2);
  stage.view(cx, cy, viewH * .94, aspect);
}

/* ---------- the lines, by how far along the road you are ---------- */
// DRAFT lines.
const LINES = [
  [.12, 'PASSENGER', 'Can you even see the road?'],
  [.5, 'YOU', 'I know this road.'],
];
// a line waits for the one before it to finish (as long as say() keeps it up), so holding to go faster never skips one
const lineSecs = (text, secs) => Math.max(secs, text.length / 32 + Math.max(1.6, .28 * text.split(/\s+/).length)) + .4;
let lineIdx = 0, lineFree = 0, done = false;

/* ---------- loop: the taxi drives away up the road; the cloud closes in; then the edge ---------- */
const PATH = new THREE.CatmullRomCurve3(LANE.map(([x, y]) => new THREE.Vector3(x * IW, y * IH, 0)));
let u = 0, speed = 1, kick = 0;
const U0 = +ctx.params.get('u');   // ?u=0.5 starts halfway up (for checking frames)
if (U0) u = U0;
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), .42), yawQ = new THREE.Quaternion();
function frame(dt) {
  const t = (U.uTime.value += dt);
  // HOLD: drive faster; but while a line is still up, ease off before the next line's mark (or the top), so the road never runs out first
  const mark = t < lineFree ? (lineIdx < LINES.length ? LINES[lineIdx][0] : 1) : 2;
  speed = lerp(speed, (input.hold ? 2.2 : 1) * clamp((mark - u) / .12, .25, 1), damp(2, dt));
  kick = Math.max(0, kick - dt * 3);
  ctx.rpm(1 + (speed - 1) / 1.2 * 2 + kick * 1.5);   // and the engine with it (a tap blips it)
  u += speed * dt / 10;   // about ten seconds up the road
  if (u >= 1) u = 1;
  if (!done && u >= 1 && lineIdx >= LINES.length && t >= lineFree) { done = true; ctx.next(); }   // whited out (and the last line said): the edge
  const p = PATH.getPointAt(u), q = PATH.getTangentAt(u), sc = sizeAt(p.y);
  stage.place(jeep, p.x, p.y, sc, stage.depthAt(p.x, clamp(p.y, 0, IH - 1)));
  // the camera creeps up the road behind the taxi, so the cliff and the cloud slide apart
  Object.assign(stage.target, { dolly: .07 * u, dy: -.03 * IH * u, dx: .01 * IW * u }); stage.update(dt, 1.2);
  jeep.quaternion.copy(tilt).multiply(yawQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-q.y * 2.4, q.x)));   // seen from behind
  body.position.y = -PIVOT.y + Math.sin(t * 13) * .012 * speed + Math.pow(Math.max(0, Math.sin(t * 11.9)), 10) * .03;   // road shake + bass thump
  body.rotation.z = Math.sin(kick * Math.PI) * .06;   // a tap: the taxi lurches, nose up
  jeep.updateMatrixWorld(true);
  // the beam starts at the lamps (low on the nose, both sides), not above the roof where the nose's centre projects
  const a = stage.toPaint(body.localToWorld(v1.set(1.72, .5, 0))), b = stage.toPaint(body.localToWorld(v2.set(2.72, .5, 0))), side = stage.toPaint(body.localToWorld(v2.set(1.72, .5, .46)));
  U.uHalf.value = Math.hypot(side[0] - a[0], side[1] - a[1]);
  U.uHead.value.set(...a); U.uDir.value.set(b[0] - a[0], b[1] - a[1]).normalize();
  keyLight(jeepMat, camera, jeep.position, stage.toWorld(b[0], b[1] - 80, 0, v2), .35);   // the fog its beams light up, ahead
  U.uScale.value = .3 + sc / 260;   // the beam's reach shrinks with distance too
  U.uFog.value = Math.pow(clamp((u - .25) / .7, 0, 1), 1.3) * .95;
  if (lineIdx < LINES.length && u >= LINES[lineIdx][0] && t >= lineFree) { const [, who, text] = LINES[lineIdx++]; ctx.say(who, text, 3.5); lineFree = t + lineSecs(text, 3.5); }
  ctx.ink.render(scene, camera, jeep);
}
return { frame, resize, onTap() { kick = 1; }, dispose() { disposeScene(scene); } };
}
