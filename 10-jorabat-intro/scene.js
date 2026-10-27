// Jorabat, inside the taxi: the passenger gets in and asks what I do; the dashboard answers.
// Pointing lights the dash; each object is a project. Tap (or the chip) and we drive.
import * as THREE from 'three';
import { clamp, lerp, damp, sstep, loadImg, tex, strokeMap, line, disposeScene, Stage } from '../shared/kit.js';

const at = f => new URL(f, import.meta.url).href;
const OBJ_FILES = ['teleprompter', 'pill-strip', 'test-sheet', 'billing-receipt', 'markon-card', 'star'];
export const assets = ['dashboard-lit.jpg', 'dashboard-dark.jpg', 'depth.png', ...OBJ_FILES.map(n => `objects/${n}.png`)];

const IW = 1672, IH = 941;   // dashboard-lit/dark.jpg in px (mirrored to right-hand drive)
const DASH = .64, SHELF = .74;   // the dash top, as fractions of the height: windscreen base to front edge
// The names are current guesses. Each line stays empty, so only the name shows, until you write it.
// x: across the painting; h: height in painting px; rot: a little askew, as if tossed there
const OBJECTS = [
  { file: 'teleprompter', name: 'TELEPROMPTER', line: '', x: .14, h: 130, rot: .06 },
  { file: 'pill-strip', name: '1MG BANNER TOOL', line: '', x: .28, h: 112, rot: -.08 },
  { file: 'test-sheet', name: 'WARDEN', line: '', x: .42, h: 146, rot: .1 },
  { file: 'billing-receipt', name: 'DODO BILLINGSDK', line: '', x: .55, h: 134, rot: -.05 },
  { file: 'markon-card', name: 'MARKON', line: '', x: .68, h: 98, rot: .07 },
];
// DRAFT lines. [seconds, who, line, expression]
const DRIVE_AT = 40;   // the drive starts on its own after this, as in the story

export async function load(ctx) {
  const { layer, on, input, U: { uMode } } = ctx;
  layer.innerHTML = `<div class="tag">HAIRPIN · JORABAT</div>`;
  ctx.bed({ engine: .5, crickets: 1 });   // idling at the stand

  const [iLit, iDark, depthImg, ...objImgs] = await Promise.all(assets.map(a => loadImg(at(a))));
  if (!iLit || !iDark || !depthImg || !objImgs.every(Boolean)) throw new Error('dashboard paintings did not load');
  const stage = new Stage({ W: IW, H: IH, depth: depthImg, k: .35 });
  const OBJ_IMG = Object.fromEntries(OBJ_FILES.map((n, i) => [n, objImgs[i]]));

  /* ---------- light: the dome light while the door's open, then a warm pool where you point ---------- */
  const U = {
    tLit: { value: tex(iLit) }, tDark: { value: tex(iDark) }, tStroke: { value: tex(strokeMap(iLit, IW, IH)) },
    uImg: { value: new THREE.Vector2(IW, IH) }, uLight: { value: new THREE.Vector2(-999, -999) }, uR: { value: 260 }, uDome: { value: 1 }, uMode,
  };
  const scene = new THREE.Scene();
  const camera = stage.cam;
  const bg = stage.mesh(new THREE.ShaderMaterial({
    uniforms: U,
    fragmentShader: /* glsl */`
      uniform sampler2D tLit, tDark, tStroke; uniform vec2 uImg, uLight; uniform float uR, uDome, uMode;
      varying vec2 vPx;
      void main(){
        vec2 uv = vec2(vPx.x / uImg.x, 1. - vPx.y / uImg.y);
        float pool = (1. - smoothstep(uR * .15, uR, length((vPx - uLight) * vec2(1., 1.6)))) * smoothstep(.6 * uImg.y, .645 * uImg.y, vPx.y);   // the dash only, not the road outside
        float L = max(pool, uDome);
        float t = .22 + .6 * (1. - texture2D(tStroke, uv).r);       // bright strokes catch the light first
        float on = uMode > 1.5 ? 1. : (uMode > .5 ? 0. : smoothstep(t - .05, t + .05, L * 1.1));
        gl_FragColor = vec4(mix(texture2D(tDark, uv).rgb, texture2D(tLit, uv).rgb * vec3(1.05, .97, .86), on), 1.);
      }`,
  }));
  scene.add(bg);

  /* ---------- what's on the dashboard: one object per project; the wish from Shillong, if you banked one ---------- */
  const objects = OBJECTS.map(o => ({ ...o }));
  let banked = null; try { banked = localStorage.getItem('hairpin.wish'); } catch (e) {}
  if (banked) objects.push({ file: 'star', name: 'A WISH', line: 'Still in the bank.', x: .8, h: 90, rot: -.15 });
  const objGeo = new THREE.PlaneGeometry(1, 1);
  const objMat = map => new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, uL: { value: 0 }, uMode }, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform sampler2D map; uniform float uL, uMode; varying vec2 vUv; void main(){ vec4 c = texture2D(map, vUv); float l = uMode > 1.5 ? 1. : (uMode > .5 ? 0. : uL); vec3 night = c.rgb * vec3(.16, .19, .3); gl_FragColor = vec4(mix(night, c.rgb * vec3(1.05, .97, .86), l), c.a); }',
  });
  for (const [i, o] of objects.entries()) {
    const img = OBJ_IMG[o.file];
    o.w = o.h * img.width / img.height; o.mat = objMat(tex(img)); o.m = new THREE.Mesh(objGeo, o.mat);
    o.px = o.x * IW; o.py = (DASH + SHELF) / 2 * IH - o.h * .15 + (i % 2) * 6;
    o.d = stage.depthAt(o.px, o.py + o.h * .3); stage.place(o.m, o.px, o.py, [o.w, o.h], o.d); o.m.rotation.z = o.rot; o.m.renderOrder = 2;
    scene.add(o.m); o.lit = 0;
  }

  /* ---------- framing, and the keyboard stepping through the objects ---------- */
  let viewW = IW, viewH = IH, kbd = -1, picked = -1;
  function resize(w, h) {
    const aspect = w / h;
    if (aspect > IW / IH) { viewW = IW; viewH = IW / aspect; } else { viewH = IH; viewW = IH * aspect; }
    const cx = clamp(.5 * IW, viewW / 2, IW - viewW / 2), cy = clamp(.55 * IH, viewH / 2, IH - viewH / 2);
    stage.view(cx, cy, viewH * .95, aspect);
  }
  const step = d => { kbd = (Math.max(kbd, picked) + d + objects.length) % objects.length; };
  on(window, 'keydown', e => { if (e.code === 'ArrowRight') step(1); if (e.code === 'ArrowLeft') step(-1); });
  on(ctx.canvas, 'pointermove', () => { kbd = -1; });

  /* ---------- the beat: the passenger gets in, asks, and the dashboard answers ---------- */
  const own = line('jorabat');   // the passenger picked at the stand: their own line first
  const SCRIPT = [
    own ? [1.5, own.who, own.text, own.expr] : [1.5, 'PASSENGER', 'Shillong? Great. Mind if I sit in front?'],
    [5, 'PASSENGER', 'So what do you do?'],
    [8.5, 'YOU', 'Easier to show you. It’s all on the dashboard.'],
  ];
  let since = 0, lineI = 0, shownObj = -1, gone = false;
  const leave = () => { if (!gone) { gone = true; ctx.prompt(null); ctx.next(); } };
  const light = new THREE.Vector2();

  return {
    resize,
    onTap() { if (since > 8.5) leave(); },
    frame(dt) {
      since += dt;
      U.uDome.value = 1 - sstep(3, 5.5, since);   // the passenger shuts the door; the dome light goes out
      if (lineI < SCRIPT.length && since > SCRIPT[lineI][0]) { const [, who, text, expr] = SCRIPT[lineI++]; ctx.say(who, text, 3.2, expr); }
      if (since > 8.5) ctx.prompt('Drive');
      // which object: the keyboard's choice, else the one under the pointer
      const ptr = input.ptr && stage.screenToPaint(...input.ptr);
      // the engine idling: the dash and the road outside shift against each other, just
      Object.assign(stage.target, { dx: Math.sin(since * 1.7) * 3 + Math.sin(since * 23) * .6, dy: Math.sin(since * 2.3) * 1.5 }); stage.update(dt, 6);
      picked = kbd;
      if (picked < 0 && ptr) {
        let best = -1, bd = 1e9;
        objects.forEach((o, i) => { const d = Math.hypot((ptr[0] - o.px) / (o.w / 2 + 20), (ptr[1] - o.py) / (o.h / 2 + 20)); if (d < 1 && d < bd) { bd = d; best = i; } });
        picked = best;
      }
      // the light: follows the pointer, or sits on the chosen object
      if (picked >= 0) light.set(objects[picked].px, objects[picked].py); else if (ptr) light.set(...ptr); else light.set(-999, -999);
      U.uLight.value.lerp(light, damp(10, dt));
      for (const [i, o] of objects.entries()) {
        const near = Math.max(1 - sstep(40, 260, Math.hypot(o.px - U.uLight.value.x, (o.py - U.uLight.value.y) * 1.6)), U.uDome.value);
        o.lit = lerp(o.lit, Math.max(near * .7, i === picked ? 1 : 0), damp(8, dt));
        o.mat.uniforms.uL.value = o.lit;
        stage.place(o.m, o.px, o.py - (i === picked ? 3 : 0), [o.w, o.h], o.d);   // lifts a touch, like tape giving
      }
      if (picked !== shownObj && picked >= 0 && since > 8) { const o = objects[picked]; ctx.say(o.name, o.line, 4); }
      shownObj = picked;
      if (since > DRIVE_AT) leave();
      ctx.ink.render(scene, camera, null);   // no taxi in this shot: just the grain and vignette
    },
    dispose() { disposeScene(scene); },
  };
}
