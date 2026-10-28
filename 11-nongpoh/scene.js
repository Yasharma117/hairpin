// Nongpoh: the taxi crosses the rainy roadside of pineapple stalls; lanterns flicker and streak the wet road.
// The grandfather line is said here, once, and dropped. Hold to drive faster.
import * as THREE from 'three';
import { clamp, lerp, damp, loadImg, tex, strokeMap, NOISE, makeTaxi, disposeScene, Stage, keyLight } from '../shared/kit.js';

const at = f => new URL(f, import.meta.url).href;
export const assets = ['nongpoh-lit.jpg', 'nongpoh-dark.jpg', 'depth.png'];

const IW = 1672, IH = 941;              // nongpoh-lit/dark.jpg size in px; the whole scene lives in these units

// the near lane the taxi drives along, and the stalls' lanterns, as fractions of the painting
const LANE = .76;
const LANTERNS = [[.127, .418], [.427, .475], [.684, .52], [.866, .542]];

export async function load(ctx) {
const { input, layer } = ctx;
layer.innerHTML = '<div class="tag">HAIRPIN · NONGPOH</div>';
ctx.bed({ engine: 1, rain: 1 }); ctx.rpm(1);
const [iLit, iDark, depthImg] = await Promise.all(assets.map(a => loadImg(at(a))));
const stage = new Stage({ W: IW, H: IH, depth: depthImg, k: .26 });
if (!iLit || !iDark) throw new Error('Nongpoh paintings did not load');
const tLit = tex(iLit), tDark = tex(iDark), tStroke = tex(strokeMap(iLit, IW, IH));

/* ---------- light: headlights, plus the lanterns, each flickering on its own ---------- */
const U = {
  tLit: { value: tLit }, tDark: { value: tDark }, tStroke: { value: tStroke },
  uImg: { value: new THREE.Vector2(IW, IH) },
  uHead: { value: new THREE.Vector2(-999, -999) }, uDir: { value: new THREE.Vector2(1, 0) }, uScale: { value: 1.2 },
  uLamp: { value: LANTERNS.map(([x, y]) => new THREE.Vector2(x * IW, y * IH)) }, uFl: { value: [1, 1, 1, 1] },
  uMode: ctx.U.uMode, uTime: { value: 0 },
};
const LIGHT = NOISE + /* glsl */`
uniform vec2 uImg, uHead, uDir, uLamp[4]; uniform float uScale, uMode, uTime, uFl[4];
uniform sampler2D tLit, tDark, tStroke;
float coneAt(vec2 p){
  vec2 v = p - uHead; float along = dot(v, uDir); float perp = length(v - uDir * along);
  float range = 560. * uScale;
  return step(0., along) * (1. - smoothstep(along * .30, along * .42 + 6., perp)) * (1. - smoothstep(range * .45, range, along));
}
float lightAt(vec2 p){
  vec2 v = p - uHead;
  float cone = coneAt(p);
  float spill = 1. - smoothstep(26. * uScale, 120. * uScale, length(v * vec2(1., 2.2)));
  float lamps = 0.;
  for (int i = 0; i < 4; i++) {
    float fl = uFl[i];                                                               // a lantern's flame, set per frame
    vec2 lv = (p - uLamp[i]) * vec2(1., 1.5);
    lamps += (1. - smoothstep(20., 190., length(lv))) * fl;
    lamps += (1. - smoothstep(10., 120., abs(p.x - uLamp[i].x))) * smoothstep(.7 * uImg.y, .74 * uImg.y, p.y) * .55 * fl;   // its streak on the wet road
  }
  return cone * 1.5 + spill * 1.1 + lamps;
}
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
      vec2 p = vPx;
      // the wet road shivers under the rain
      if (p.y > .7 * uImg.y) p.x += (vn2(vec2(p.x * .05, p.y * .2 - uTime * 6.)) - .5) * 3.;
      vec2 uv = uvOf(p);
      vec3 lit = texture2D(tLit, uv).rgb, dark = texture2D(tDark, uv).rgb;
      vec3 col = mix(dark, lit * vec3(1.05, .97, .86), reveal(p, lightAt(p)));
      col += vec3(1., .9, .65) * coneAt(vPx) * .09 * step(uMode, .5);   // the beam itself, visible in the rain
      gl_FragColor = vec4(col, 1.);
    }`,
}));
scene.add(bg);

const { jeep, body, parts, jeepMat, PIVOT } = makeTaxi(U.uMode);
scene.add(jeep);
const CAR_SIZE = 62;
jeep.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), .42);   // side on, a touch from above
// its reflection in the wet road: the same taxi flipped under the tyres, dark and broken up by the rain; its lamps still glow
const reflMat = new THREE.ShaderMaterial({
  uniforms: { uTime: U.uTime, uMode: U.uMode }, transparent: true, depthWrite: false,
  vertexShader: 'attribute vec3 color; attribute float emit; varying vec3 vC; varying float vE; varying vec2 vW; void main(){ vC = color; vE = emit; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xy; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: NOISE + `uniform float uTime, uMode; varying vec3 vC; varying float vE; varying vec2 vW;
    void main(){
      float rip = .45 + .55 * smoothstep(.2, .6, vn2(vec2(vW.x * .04, vW.y * .35 - uTime * 5.)));
      float lamp = step(.5, vE) * step(vE, 1.5);
      vec3 c = mix(vC * .55 + vec3(.03, .04, .07), vC * 1.3, lamp);
      gl_FragColor = vec4(c, (.5 + .45 * lamp) * rip * step(uMode, .5));
    }`,
});
const refl = jeep.clone(true); refl.traverse(o => { if (o.isMesh) o.material = reflMat; o.layers.disable(1); }); scene.add(refl);   // no ink on a reflection
const reflBody = refl.children[0].children[0];

/* ---------- rain: streaks in painting space, dim in the dark, glittering where the light catches them ---------- */
{
  const N = ctx.isTouch ? 1200 : 2400, off = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) off.set([Math.random() * (IW + 200) - 100, Math.random() * IH, 700 + Math.random() * 500, 14 + Math.random() * 18], i * 4);
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-.5, 0, 0, .5, 0, 0, .5, 1, 0, -.5, 1, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
  g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4));
  g.instanceCount = N;
  const m = new THREE.ShaderMaterial({
    uniforms: { ...U, ...stage.uniforms }, transparent: true, depthWrite: false, depthTest: false,
    vertexShader: LIGHT + Stage.GLSL + /* glsl */`
      attribute vec4 aOff; varying float vL; varying float vV;
      void main(){
        float y = mod(aOff.y + uTime * aOff.z, ${IH + 120}.) - 60.;
        vec2 p = vec2(aOff.x - y * .12 + position.y * aOff.w * .12, y - position.y * aOff.w);   // slanted by the wind
        p.x += position.x * 1.3;
        vL = clamp(lightAt(p), 0., 1.6); vV = position.y;   // lit once per streak, not per pixel
        gl_Position = projectionMatrix * viewMatrix * vec4(stageAt(p, 1.), 1.);   // the rain is the nearest thing in the shot
      }`,
    fragmentShader: /* glsl */`
      uniform float uMode; varying float vL; varying float vV;
      void main(){
        float L = vL;
        float a = (.16 + .7 * L) * vV * step(uMode, .5);
        gl_FragColor = vec4(mix(vec3(.55, .6, .75), vec3(1., .95, .8), clamp(L, 0., 1.)), a);
      }`,
  });
  const rain = new THREE.Mesh(g, m); rain.frustumCulled = false; rain.renderOrder = 9; scene.add(rain);
}
/* ---------- framing: follows the taxi along the road ---------- */
let viewW = IW, viewH = IH, camX = 0, OUT = .9;   // OUT: how far along the taxi is still whole in frame at the camera's last stop
let cyRest = IH / 2;
function resize(w, h) {
  const aspect = w / h, Z = aspect < 1 ? 1 : 1.3;
  if (aspect > IW / IH) { viewW = IW; viewH = IW / aspect; } else { viewH = IH; viewW = IH * aspect; }
  viewW /= Z; viewH /= Z;
  OUT = (IW - viewW * .28 - FROM) / (TO - FROM);   // with a line still up the taxi eases off before here (wide margin: the near lane slides further than the frame)
  cyRest = clamp(.6 * IH, viewH / 2 + viewH * .08, IH - viewH / 2 - viewH * .08);
  stage.view(IW / 2, cyRest, viewH, aspect);   // the rest pose; following the taxi slides the camera from here
}

/* ---------- the lines, by how far along the road you are ---------- */
// DRAFT lines. The grandfather line is the seed for the edge: said once, dropped, nobody follows it up.
const LINES = [
  [.08, 'PASSENGER', 'Rain. Of course it’s raining.'],
  [.3, 'YOU', 'Nongpoh. Pineapples, then the real climb.'],
  [.52, 'YOU', 'My grandfather drove this every weekend. Court in Shillong.'],
  [.74, 'PASSENGER', 'Can we stop for pineapple?'],
];
// a line waits for the one before it to finish (as long as say() keeps it up), so holding to go faster never skips one
const lineSecs = (text, secs) => Math.max(secs, text.length / 32 + Math.max(1.6, .28 * text.split(/\s+/).length)) + .4;
let lineIdx = 0, lineFree = 0, done = false;

/* ---------- loop: the taxi crosses from left to right, then on to the cloud line ---------- */
const FROM = -.12 * IW, TO = 1.12 * IW;
let x = FROM, speed = 1, kick = 0;
const U0 = +ctx.params.get('u');   // ?u=0.5 starts halfway along (for checking frames)
if (U0) x = lerp(FROM, TO, U0);
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
function frame(dt) {
  const t = (U.uTime.value += dt);
  // HOLD: drive faster; but while a line is still up, ease off before the next line's mark (or the frame's edge), so the road never runs out first
  const u0 = (x - FROM) / (TO - FROM), mark = t < lineFree ? (lineIdx < LINES.length ? LINES[lineIdx][0] : OUT) : 2;
  speed = lerp(speed, (input.hold ? 2.6 : 1) * clamp((mark - u0) / .1, .2, 1), damp(2, dt));
  kick = Math.max(0, kick - dt * 3);
  ctx.rpm(1 + (speed - 1) / 1.6 * 2 + kick * 1.5);   // and the engine with it (a tap blips it)
  for (let i = 0; i < 4; i++) U.uFl.value[i] = .85 + .15 * (Math.sin(t * 7.3 + i * 13.1) * .5 + .5) * (Math.sin(t * 17.9 + i * 3.7) * .5 + .5);
  x = Math.min(TO, x + speed * dt * 95);   // across (then out of frame, until the last line is said), then the cloud line
  if (!done && (x - FROM) / (TO - FROM) >= OUT && lineIdx >= LINES.length && t >= lineFree) { done = true; ctx.next(); }   // at the frame's edge: it drives out under the sheet
  const u = (x - FROM) / (TO - FROM);
  const dLane = stage.depthAt(clamp(x, 0, IW), LANE * IH), s = stage.place(jeep, x, LANE * IH, CAR_SIZE, dLane);
  body.position.y = -PIVOT.y + Math.sin(t * 13) * .012 * speed + Math.pow(Math.max(0, Math.sin(t * 11.9)), 10) * .03;   // road shake + bass thump
  body.rotation.z = Math.sin(kick * Math.PI) * .06;   // a tap: the taxi lurches, nose up
  // the reflection mirrors about the tyres' contact line
  stage.place(refl, x, LANE * IH + .05 * CAR_SIZE, CAR_SIZE, dLane); refl.quaternion.copy(jeep.quaternion); refl.scale.y *= -1;
  reflBody.position.copy(body.position); reflBody.rotation.z = body.rotation.z;
  jeep.updateMatrixWorld(true);
  const a = stage.toPaint(body.localToWorld(v1.set(1.72, .62, 0))), b = stage.toPaint(body.localToWorld(v2.set(2.72, .62, 0)));
  U.uHead.value.set(...a); U.uDir.value.set(b[0] - a[0], b[1] - a[1]).normalize();
  // the warm key: the nearest lantern, and how close it is
  const ln = U.uLamp.value.reduce((p, q) => Math.abs(p.x - x) < Math.abs(q.x - x) ? p : q), near = 1 - clamp(Math.abs(ln.x - x) / 500, 0, 1);
  keyLight(jeepMat, camera, jeep.position, stage.toWorld(ln.x, ln.y, stage.depthAt(ln.x, ln.y), v2), .3 + .7 * near);
  // the camera keeps the taxi a little left of centre, so you see what's coming
  // a translation from the rest pose: the stalls and the forest behind them slide at different speeds
  const mW = viewW * .08;
  camX = clamp(lerp(camX || x, x + viewW * .15, damp(1.5, dt)), viewW / 2 + mW, IW - viewW / 2 - mW);
  Object.assign(stage.move, { dx: camX - IW / 2, dy: 0, dolly: 0 }); stage.apply();
  if (lineIdx < LINES.length && u >= LINES[lineIdx][0] && t >= lineFree) { const [, who, text] = LINES[lineIdx++]; ctx.say(who, text, 4); lineFree = t + lineSecs(text, 4); }
  ctx.ink.render(scene, camera, jeep);
}
return { frame, resize, onTap() { kick = 1; }, dispose() { disposeScene(scene); } };
}
