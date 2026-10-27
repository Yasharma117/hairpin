// The stand at Jorabat: the last taxi to Shillong, idling by the roadside tea stall. You lean on its roof; the passenger
// stands in its headlights, and the viewer makes them: a name, then who they are (shared/look.js). "Get in" and they walk to
// the taxi. The pointer (or a drag) swings the headlights.
import * as THREE from 'three';
import { clamp, lerp, damp, sstep, mkCanvas, loadImg, tex, strokeMap, makeTaxi, passenger, pick, disposeScene } from '../shared/kit.js';
import { Stage, keyLight, Steer } from '../shared/kit.js';
import { UTIL, SKIN_TONES, BASE_SKIN } from '../shared/style.js';
import { OPTIONS, available, dress, you } from '../shared/look.js';

const at = f => new URL(f, import.meta.url).href;
export const assets = ['jorabat-dark.jpg', 'depth.png', '../people/you-stand.png', '../people/p-f-base-stand.png', '../people/p-m-base-stand.png'];

const IW = 1774, IH = 887;   // jorabat-dark.jpg in px; the scene lives in these units
// where things stand, in painting px: the taxi on the road, you behind it (leaning on the roof), the passenger in its lights
const SPOT = { taxi: [.2 * IW, .775 * IH], you: [.2 * IW + 14, .748 * IH], rider: [.2 * IW + 235, .8 * IH] };
const YOU_H = 178, RIDER_H = 186;   // their heights, painting px
const GROUP = [.2 * IW - 110, .2 * IW + 300];   // the stretch of road the shot has to hold

export async function load(ctx) {
  const { renderer, layer, on, U: { uMode } } = ctx;
  layer.innerHTML = `
    <style>
      .dress { position: fixed; right: 24px; top: calc(env(safe-area-inset-top, 0px) + 64px); width: min(330px, calc(100% - 32px)); background: var(--paper); color: var(--ink); padding: 16px 18px 18px; box-shadow: 5px 5px 0 var(--black); display: flex; flex-direction: column; gap: 12px;
        clip-path: polygon(0% 1.5%, 8% 0%, 22% 1.2%, 37% 0%, 52% 1.4%, 66% 0%, 81% 1.1%, 100% 0%, 100% 98.6%, 88% 100%, 73% 98.8%, 58% 100%, 43% 98.7%, 28% 100%, 13% 98.9%, 0% 100%); }
      .dress h2 { margin: 0; font-size: clamp(20px, 2.4vw, 24px); font-weight: 800; font-variation-settings: 'wdth' 110; line-height: 1.1; }
      .dress h2 small { display: block; font-family: var(--mono); font-size: 11px; font-weight: 600; letter-spacing: .1em; color: var(--red); margin-bottom: 4px; }
      .row { display: flex; flex-direction: column; gap: 6px; }
      .row[hidden] { display: none; }
      .k { font-family: var(--mono); font-size: 11px; font-weight: 600; letter-spacing: .1em; color: var(--red); }
      .dress input { font: 700 20px/1.2 var(--body, inherit); font-family: inherit; color: var(--ink); background: transparent; border: 0; border-bottom: 2px solid var(--ink); padding: 4px 0 5px; width: 100%; border-radius: 0; }
      .dress input:focus { outline: none; border-bottom-color: var(--red); }
      .dress input::placeholder { color: var(--ink); opacity: .35; }
      .opts { display: flex; flex-wrap: wrap; gap: 8px; }
      .opts button { font-family: var(--mono); font-size: 12px; font-weight: 600; letter-spacing: .04em; color: var(--ink); background: var(--paper); border: 1.5px solid var(--ink); box-shadow: 2px 2px 0 var(--black); padding: 0 11px; min-height: 36px; cursor: pointer; }
      .opts button[aria-pressed="true"] { background: var(--amber); }
      .opts button:focus-visible { outline: 2px solid var(--red); outline-offset: 2px; }
      .opts.sw button { width: 36px; padding: 0; }
      .opts.sw button[aria-pressed="true"] { outline: 2px solid var(--ink); outline-offset: 3px; background: var(--sw); }
      /* narrow screens: across the top, compact, the two of them below it */
      @media (max-width: 700px), (max-aspect-ratio: 1/1) {
        .dress { left: 12px; right: 12px; width: auto; top: calc(env(safe-area-inset-top, 0px) + 50px); padding: 10px 14px 12px; gap: 7px; }
        .dress h2 { font-size: 18px; }
        .row { flex-direction: row; align-items: center; gap: 10px; }
        .k { flex: 0 0 52px; }
        .opts { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; padding: 2px 3px 4px; }
        .opts::-webkit-scrollbar { display: none; }
        .opts button { flex: 0 0 auto; min-height: 34px; }
        .opts.sw button { width: 32px; }
      }
    </style>
    <div class="tag">HAIRPIN · THE STAND</div>
    <form class="dress" autocomplete="off" aria-label="Who's riding with me?">
      <h2><small>LAST TAXI TO SHILLONG</small>Who's riding with me?</h2>
      <label class="row"><span class="k">NAME</span><input id="name" maxlength="16" placeholder="Your name" enterkeyhint="go" autocapitalize="words" spellcheck="false"></label>
      <div class="row"><span class="k" id="k-build">YOU</span><div class="opts" data-g="build" role="group" aria-labelledby="k-build"><button type="button" value="f">A woman</button><button type="button" value="m">A man</button></div></div>
      <div class="row"><span class="k" id="k-skin">SKIN</span><div class="opts sw" data-g="skin" role="group" aria-labelledby="k-skin"></div></div>
      ${Object.keys(OPTIONS).map(g => `<div class="row" hidden><span class="k" id="k-${g}">${{ hair: 'HAIR', top: 'TOP', acc: 'EXTRA' }[g]}</span><div class="opts" data-g="${g}" role="group" aria-labelledby="k-${g}"></div></div>`).join('')}
    </form>`;
  const $ = s => layer.querySelector(s);
  ctx.bed({ engine: .5, crickets: 1 });   // the taxi idling by the stall

  /* ---------- the painting: jorabat-lit.jpg once it's painted; until then the dark one, lifted warm, stands in ---------- */
  const [iDark, iLit, depthImg] = await Promise.all([loadImg(at('jorabat-dark.jpg')), loadImg(at('jorabat-lit.jpg')), loadImg(at('depth.png'))]);
  if (!iDark || !depthImg) throw new Error('jorabat-dark.jpg did not load');
  const stage = new Stage({ W: IW, H: IH, depth: depthImg, k: .3 });
  function warmLift(src) {   // ponytail: stand-in for the lit painting; drop jorabat-lit.jpg in this folder when it exists
    const a = mkCanvas(IW, IH), ax = a.getContext('2d'); ax.drawImage(src, 0, 0, IW, IH);
    const A = ax.getImageData(0, 0, IW, IH), d = A.data;
    for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; d[i] = Math.min(255, d[i] * 1.5 + l * 1.3); d[i + 1] = Math.min(255, d[i + 1] * 1.6 + l * .9); d[i + 2] = Math.min(255, d[i + 2] * .9 + l * .2); }
    ax.putImageData(A, 0, 0); return a;
  }
  const srcLit = iLit || warmLift(iDark);
  const U = {
    tLit: { value: tex(srcLit) }, tDark: { value: tex(iDark) }, tStroke: { value: tex(strokeMap(srcLit, IW, IH)) },
    uImg: { value: new THREE.Vector2(IW, IH) }, uHead: { value: new THREE.Vector2() }, uDir: { value: new THREE.Vector2(1, -.07).normalize() },
    uLamp: { value: [new THREE.Vector2(.165 * IW, .6 * IH), new THREE.Vector2(.27 * IW, .64 * IH)] }, uMode,
  };
  // the headlights: a soft cone, widening and fading with distance; plus the stall bulb and the street lamp
  const CONE = /* glsl */`
    float coneAt(vec2 p, vec2 head, vec2 dir){
      vec2 v = p - head; float along = dot(v, dir); float perp = length(v - dir * along);
      return step(0., along) * (1. - smoothstep(along * .08, along * .4 + 30., perp)) * (1. - smoothstep(200., 1700., along));
    }`;
  function lightCPU(x, y) {
    const h = U.uHead.value, d = U.uDir.value, vx = x - h.x, vy = y - h.y, along = vx * d.x + vy * d.y, perp = Math.hypot(vx - d.x * along, vy - d.y * along);
    const cone = (along > 0 ? 1 : 0) * (1 - sstep(along * .08, along * .4 + 30, perp)) * (1 - sstep(200, 1700, along));
    let lamps = 0; for (const L of U.uLamp.value) lamps += 1 - sstep(30, 190, Math.hypot(x - L.x, (y - L.y) * 2.2));
    return cone * 1.4 + lamps * .9;
  }
  const scene = new THREE.Scene();
  const camera = stage.cam;
  const bg = stage.mesh(new THREE.ShaderMaterial({
    uniforms: U,
    fragmentShader: CONE + /* glsl */`
      uniform sampler2D tLit, tDark, tStroke; uniform vec2 uImg, uHead, uDir, uLamp[2]; uniform float uMode;
      varying vec2 vPx;
      void main(){
        vec2 uv = vec2(vPx.x / uImg.x, 1. - vPx.y / uImg.y);
        float L = coneAt(vPx, uHead, uDir) * 1.4;
        for (int i = 0; i < 2; i++) L += (1. - smoothstep(30., 190., length((vPx - uLamp[i]) * vec2(1., 2.2)))) * .9;
        float t = .22 + .6 * (1. - texture2D(tStroke, uv).r);       // bright strokes catch the light first
        float on = uMode > 1.5 ? 1. : (uMode > .5 ? 0. : smoothstep(t - .3, t + .3, L)   /* a soft reveal: no hard line where the beam fades */);
        gl_FragColor = vec4(mix(texture2D(tDark, uv).rgb, texture2D(tLit, uv).rgb * vec3(1.05, .97, .86), on), 1.);
      }`,
  }));
  scene.add(bg);

  /* ---------- the taxi, on the road, nose along it ---------- */
  const taxi = makeTaxi(uMode);
  taxi.jeepMat.uniforms.uL.value = .35;
  scene.add(taxi.jeep);
  taxi.jeep.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), .42).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), .06));
  stage.place(taxi.jeep, SPOT.taxi[0], SPOT.taxi[1], 58, stage.depthAt(SPOT.taxi[0], SPOT.taxi[1] + 14));
  U.uHead.value.set(SPOT.taxi[0] + 100, .755 * IH);
  keyLight(taxi.jeepMat, camera, taxi.jeep.position, stage.toWorld(.165 * IW, .6 * IH, stage.depthAt(.165 * IW, .66 * IH), new THREE.Vector3()), .55);   // the stall's bulb

  /* ---------- the two of you: painted, lit by the beam and the stall, a soft pool under the feet ---------- */
  const POOL = (() => { const c = mkCanvas(64, 16), x = c.getContext('2d'), g = x.createRadialGradient(32, 8, 0, 32, 8, 32); g.addColorStop(0, UTIL.white); g.addColorStop(1, `${UTIL.white}00`); x.setTransform(1, 0, 0, .25, 0, 6); x.fillStyle = g; x.fillRect(0, -24, 64, 64); return tex(c); })();
  const pMat = () => new THREE.ShaderMaterial({
    uniforms: { map: { value: null }, uL: { value: .5 }, uOp: { value: 1 } }, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform sampler2D map; uniform float uL, uOp; varying vec2 vUv; void main(){ vec4 c = texture2D(map, vUv); vec3 col = mix(c.rgb * vec3(.2, .24, .38), c.rgb * vec3(1.05, .97, .86), clamp(uL, 0., 1.)); col *= mix(.62, 1., smoothstep(0., .12, vUv.y)); gl_FragColor = vec4(col, c.a * uOp); }',
  });
  const footGeo = new THREE.PlaneGeometry(1, 1).translate(0, .5, 0);
  function figure(spot, h, faceRight) {
    const f = { x: spot[0], y: spot[1], h, w: h * .5, flip: faceRight ? -1 : 1, d: stage.depthAt(spot[0], spot[1]), mat: pMat() };
    f.m = new THREE.Mesh(footGeo, f.mat); f.m.frustumCulled = false; f.m.visible = false; scene.add(f.m);
    f.sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: POOL, color: UTIL.shadow, transparent: true, opacity: .45, depthWrite: false })); scene.add(f.sh);
    f.set = c => { if (!c) return; f.mat.uniforms.map.value?.dispose(); f.mat.uniforms.map.value = tex(c); f.w = h * c.width / c.height; f.m.visible = true; f.put(f.x, f.y); };
    f.put = (x, y) => { stage.place(f.m, x, y, [f.w * f.flip, f.h], f.d); stage.place(f.sh, x, f.y, [Math.abs(f.w) * .8, 10], f.d); };
    return f;
  }
  const me = figure(SPOT.you, YOU_H, true);   // facing the passenger, a hand out
  me.m.renderOrder = 2; me.sh.visible = false;   // behind the taxi: its roof hides the rest of him
  const rider = figure(SPOT.rider, RIDER_H, false); rider.m.renderOrder = 3; rider.sh.renderOrder = 1;
  me.set(await you('stand'));

  /* ---------- dressing the passenger: name first, then who they are; only the options that have painted files show ---------- */
  let chosen = false, leftAt = 0, t = 0, since = 0;
  const saved = passenger();
  const look = { name: saved?.name || '', build: saved?.build || (Math.random() < .5 ? 'f' : 'm'), skin: saved?.skin ?? BASE_SKIN, hair: saved?.hair || '', top: saved?.top || '', acc: saved?.acc || '' };
  const nameIn = $('#name'); nameIn.value = look.name;
  const sw = $('[data-g="skin"]');
  SKIN_TONES.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.value = i; b.style.background = c; b.style.setProperty('--sw', c); b.setAttribute('aria-label', ['Lightest', 'Light', 'Medium', 'Deep', 'Deepest'][i] + ' skin'); sw.appendChild(b); });
  const press = () => {
    for (const g of layer.querySelectorAll('.opts')) for (const b of g.children) b.setAttribute('aria-pressed', String(String(look[g.dataset.g]) === b.value));
  };
  let ask = 0;
  async function redraw() {   // the latest pick wins: an older, slower dress() is dropped
    const n = ++ask, c = await dress(look, 'stand');
    if (n === ask) rider.set(c);
  }
  async function options() {   // the option rows for this build: hidden until at least one of their files exists
    const av = await available(look.build, 'stand');
    for (const g of Object.keys(OPTIONS)) {
      const box = $(`[data-g="${g}"]`), list = av[g];
      box.parentElement.hidden = !list.length;
      if (!list.some(([id]) => id === look[g])) look[g] = '';
      box.innerHTML = list.length ? [['', g === 'acc' ? 'None' : 'As is'], ...list].map(([id, label]) => `<button type="button" value="${id}">${label}</button>`).join('') : '';
    }
    press();
  }
  on($('.dress'), 'click', e => {
    const b = e.target.closest('.opts button'); if (!b || chosen) return;
    const g = b.parentElement.dataset.g; look[g] = g === 'skin' ? +b.value : b.value;
    press(); if (g === 'build') options().then(redraw); else redraw();
  });
  on($('.dress'), 'submit', e => { e.preventDefault(); go(); });
  on(nameIn, 'input', () => { look.name = nameIn.value.replace(/\s+/g, ' ').trimStart(); });
  on(nameIn, 'keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  await options(); await redraw();
  window.__stand = { look: () => ({ ...look }), drawn: () => [rider.w | 0, rider.mat.uniforms.map.value?.image?.width, ask] };   // for checking from the console

  /* ---------- framing: the two of you and the taxi, closer in; the sheet sits beside them (or above, on a phone) ---------- */
  let narrow = false;
  function resize(w, h) {
    const aspect = w / h; narrow = w <= 700 || aspect <= 1;
    const Z = narrow ? 1.25 : 1.6;
    let viewH = IH / Z, viewW = viewH * aspect;
    if (viewW > IW) { viewW = IW; viewH = IW / aspect; }
    // wide: the group in the left part of the frame, clear of the sheet on the right; narrow: centred, below the sheet
    const mid = (GROUP[0] + GROUP[1]) / 2, cx = clamp(narrow ? mid + 40 : mid + viewW * .2, viewW / 2, IW - viewW / 2);
    const cy = clamp(narrow ? .54 * IH : .69 * IH, viewH / 2, IH - viewH / 2);   // narrow: the two of you low, under the sheet
    stage.view(cx, cy, viewH, aspect);
    me.put(me.x, me.y); rider.put(rider.x, rider.y);
  }

  /* ---------- get in: they walk to the taxi and are gone ---------- */
  function go() {
    if (chosen) return;
    if (!look.name.trim()) { nameIn.focus(); return; }
    look.name = look.name.trim(); pick({ ...look });
    chosen = true; leftAt = t; nameIn.blur();
    for (const el of layer.querySelectorAll('.dress button, .dress input')) el.disabled = true;
  }
  const steer = new Steer(.3), AIM = U.uDir.value.clone();   // the scripted aim: straight along the road
  const lit = f => clamp(.3 + lightCPU(f.x, f.y - f.h * .5) * .8, .3, 1.15);

  return {
    resize,
    onTap() { if (document.activeElement === nameIn) nameIn.blur(); else if (look.name.trim()) go(); },   // a tap on the scene first puts the keyboard away
    frame(dt, now) {
      t = now;
      ctx.prompt(!chosen && look.name.trim() ? `Get in, ${look.name.trim()}` : null);
      if (chosen) {   // walks to the passenger door, and is gone
        const k = clamp((now - leftAt - .3) / 2.2, 0, 1), e = k * k * (3 - 2 * k);
        rider.put(lerp(SPOT.rider[0], SPOT.taxi[0] + 70, e), SPOT.rider[1] - Math.abs(Math.sin(k * 14)) * 3 * (k > 0 && k < 1 ? 1 : 0));
        rider.mat.uniforms.uOp.value = 1 - sstep(.7, 1, k); rider.sh.material.opacity = .45 * rider.mat.uniforms.uOp.value;
        $('.dress').style.opacity = String(1 - sstep(0, .4, now - leftAt));
        if (now - leftAt > 3) { chosen = false; ctx.next(); }
      }
      taxi.body.position.y = -taxi.PIVOT.y + Math.sin(now * 13) * .004;   // idling
      // the viewer steers the headlights: the reveal and how lit the two of you are follow the beam
      U.uDir.value.copy(steer.update(dt, U.uHead.value, AIM, ctx.input.ptr && stage.screenToPaint(...ctx.input.ptr), ctx.isTouch, ctx.input.hold));
      rider.mat.uniforms.uL.value = lit(rider); me.mat.uniforms.uL.value = lit(me) * .85;
      // the camera: a slow push-in over the first eight seconds
      stage.target.dolly = .07 * sstep(0, 8, since += dt);
      stage.update(dt, 4);
      ctx.ink.uniforms.uTime.value = now; ctx.ink.uniforms.uJeepScale.value = .6;
      ctx.ink.render(scene, camera, taxi.jeep);
    },
    dispose() { disposeScene(scene); delete window.__stand; },
  };
}
