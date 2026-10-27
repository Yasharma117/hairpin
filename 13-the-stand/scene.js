// The stand at Jorabat: the last taxi to Shillong, idling by the roadside tea stall. You (Yash) wait by its nose; the
// passenger stands in its headlights, and the viewer makes them: a name, then who they are, as pixel people
// (shared/folk.js) on the frame's own pixel grid. "Get in" and they turn, walk round to the passenger door on the far
// side, and are gone as it shuts. The pointer (or a drag) swings the headlights.
import * as THREE from 'three';
import { clamp, sstep, mkCanvas, loadImg, tex, strokeMap, makeTaxi, passenger, pick, disposeScene } from '../shared/kit.js';
import { Stage, keyLight, Steer } from '../shared/kit.js';
import { FOLK } from '../shared/style.js';
import * as folk from '../shared/folk.js';

const at = f => new URL(f, import.meta.url).href;
export const assets = ['jorabat-dark.jpg', 'depth.png'];

const IW = 1774, IH = 887;   // jorabat-dark.jpg in px; the painting lives in these units
const TAXI = [.2 * IW, .775 * IH];   // the taxi's foot on the road, painting px
// Everything else is laid out in frame px (1 sprite px = 1 frame px), from the taxi's foot, so the taxi and the people
// keep their sizes to each other on any screen. TAXI_K: frame px per taxi unit (the taxi is 3.4 long, 1.45 tall).
const TAXI_K = 22;
const SPOT = { you: [52, 5], rider: [98, 7], far: [56, -9], door: [10, -9] };   // [right, down] of the taxi's foot, frame px
const LABEL = { build: 'Who', hair: 'Hair', top: 'Top', extra: 'Extra' };

export async function load(ctx) {
  const { layer, on, U: { uMode } } = ctx;
  const saved = passenger(), norm = folk.normalise(saved || { build: Math.random() < .5 ? 'f' : 'm', skin: 2 });
  const look = { build: norm.build, skin: norm.skin, hair: norm.hair, top: norm.top, extra: norm.extra };
  let name = saved?.name || '';

  const grp = g => `<fieldset class="grp"><legend class="label" id="k-${g}">${LABEL[g]}</legend><div class="opts" data-g="${g}" role="group" aria-labelledby="k-${g}">${folk.OPTIONS[g].map(([id, text]) => `<button type="button" class="av" value="${id}" aria-label="${text}"><canvas width="52" height="52"></canvas><span>${text}</span></button>`).join('')}</div></fieldset>`;
  const skinGrp = `<fieldset class="grp"><legend class="label" id="k-skin">Skin</legend><div class="opts" data-g="skin" role="group" aria-labelledby="k-skin">${folk.OPTIONS.skin.map(([i, text]) => `<button type="button" class="sw" value="${i}" aria-label="${text} skin" style="--c:${FOLK.skin[i][1]};--d:${FOLK.skin[i][0]}"></button>`).join('')}</div></fieldset>`;
  layer.innerHTML = `
    <style>
      .dress { position: fixed; right: calc(env(safe-area-inset-right, 0px) + var(--gutter)); top: calc(var(--top) + 56px); width: 344px; box-sizing: border-box;
        padding: 18px 18px 20px; display: flex; flex-direction: column; gap: 14px; transition: transform 200ms steps(4), opacity 200ms steps(4); }
      .dress.gone { transform: translateX(calc(100% + 40px)); opacity: 0; pointer-events: none; }
      .dress h2 { margin: 2px 0 0; font: 400 26px/1.05 var(--display); color: var(--ui-ink); }
      .dress .kick { display: block; margin-bottom: 6px; font-size: 16px; }
      /* the name, typed into an RPG box: a tab above its corner, the serif inside, a red ▼ once there's a name */
      .namebox { position: relative; display: block; margin-top: 14px; border: var(--edge); background: var(--ui-cream); box-shadow: inset 0 -3px 0 var(--ui-cream-deep); }
      .namebox .label { position: absolute; left: 10px; bottom: calc(100% - 2px); background: var(--ui-cream); border: var(--edge); border-bottom: 0; padding: 3px 8px 0; font-size: 17px; }
      .namebox input { display: block; width: 100%; box-sizing: border-box; border: 0; border-radius: 0; background: transparent; padding: 9px 34px 8px 12px;
        font: 500 22px/1.2 var(--serif); color: var(--ui-ink); }
      .namebox input:focus { outline: none; }
      .namebox:focus-within { box-shadow: inset 0 -3px 0 var(--ui-cream-deep), 0 0 0 2px var(--ui-cream), 0 0 0 4px var(--ui-signal); }
      .namebox input::placeholder { color: var(--ui-ink-soft); opacity: .7; }
      .namebox::after { content: "▼"; position: absolute; right: 11px; bottom: 11px; font: 400 15px/1 var(--pixel); color: var(--ui-signal); opacity: 0; }
      .namebox.ready::after { animation: blink 1s steps(1) infinite; }
      .grp { display: grid; gap: 6px; border: 0; margin: 0; padding: 0; min-width: 0; }
      .grp > .label { padding: 0; font-size: 17px; }
      .opts { display: flex; gap: 8px; }
      .pair { display: flex; gap: 20px; } .pair .opts[data-g="skin"] { gap: 6px; padding-top: 8px; }
      /* an avatar option: the head and shoulders in a frame; the chosen one framed in red, a red ▼ above it */
      .av { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 0; border: 0; background: none; cursor: pointer;
        font: 400 15px/1 var(--pixel); letter-spacing: .06em; text-transform: uppercase; color: var(--ui-ink-soft); -webkit-tap-highlight-color: transparent; }
      .av canvas { display: block; width: 52px; height: 52px; image-rendering: pixelated; background: var(--ui-cream-deep); border: var(--edge); box-shadow: 2px 2px 0 var(--ui-ink);
        transition: transform 90ms steps(2), box-shadow 90ms steps(2); }
      .av[aria-pressed="true"] { color: var(--ui-ink); }
      .av[aria-pressed="true"] canvas { border-color: var(--ui-signal); box-shadow: 0 0 0 2px var(--ui-signal), 2px 2px 0 2px var(--ui-ink); }
      .av[aria-pressed="true"]::before { content: "▼"; position: absolute; top: -12px; font: 400 12px/1 var(--pixel); color: var(--ui-signal); }
      .av:active canvas { transform: translate(2px, 2px); box-shadow: 0 0 0 var(--ui-ink); }
      .av:focus-visible { outline: none; } .av:focus-visible canvas { outline: 3px solid var(--ui-signal); outline-offset: 3px; }
      @media (hover: hover) and (pointer: fine) { .av:hover:not([aria-pressed="true"]) canvas { background: var(--ui-cream); } }
      /* skin: five pixel swatches, base over its shadow */
      .sw { width: 30px; height: 30px; padding: 0; border: var(--edge); border-radius: 0; cursor: pointer; background: var(--c); box-shadow: inset 0 -7px 0 var(--d), 2px 2px 0 var(--ui-ink); }
      .sw[aria-pressed="true"] { box-shadow: inset 0 -7px 0 var(--d), 0 0 0 2px var(--ui-cream), 0 0 0 4px var(--ui-signal); }
      .sw:active { transform: translate(2px, 2px); }
      /* phones: across the top, compact, labels beside the rows; the two of them in the light below it */
      @media (max-width: 700px), (max-aspect-ratio: 1/1) {
        .pair { display: contents; } .pair .opts[data-g="skin"] { padding-top: 0; }
        .dress { left: calc(env(safe-area-inset-left, 0px) + 12px); right: calc(env(safe-area-inset-right, 0px) + 12px); top: calc(var(--top) + 50px); width: auto; padding: 10px 12px 12px; gap: 8px; }
        .dress.gone { transform: translateY(calc(-100% - 80px)); }
        .dress .kick { display: none; }
        .dress h2 { font-size: 20px; }
        .namebox { margin-top: 12px; } .namebox input { font-size: 20px; padding: 6px 30px 5px 10px; }
        .grp { grid-template-columns: 44px 1fr; align-items: center; gap: 0 4px; }
        .grp > .label { font-size: 16px; }
        .opts { gap: 6px; }
        .av { padding-top: 5px; } .av span { display: none; } .av[aria-pressed="true"]::before { top: -7px; font-size: 10px; }
        .av canvas { width: 46px; height: 46px; }
        .sw { width: 32px; height: 26px; }
      }
      @media (prefers-reduced-motion: reduce) { .dress { transition: opacity 200ms; } .dress.gone { transform: none; } .namebox.ready::after { animation: none; opacity: 1; } }
    </style>
    <div class="tag">HAIRPIN · THE STAND</div>
    <form class="dress panel" autocomplete="off" aria-label="Who's riding with me?">
      <h2><span class="label kick">Last taxi to Shillong</span>Who's riding with me?</h2>
      <label class="namebox"><span class="label">Name</span><input id="name" maxlength="16" placeholder="Your name" enterkeyhint="go" autocapitalize="words" spellcheck="false"></label>
      <div class="pair">${grp('build')}${skinGrp}</div>
      ${['hair', 'top', 'extra'].map(grp).join('')}
    </form>`;
  // a fieldset's legend won't sit in a grid cell: lift it into the grid as a plain span
  for (const lg of layer.querySelectorAll('.grp > legend')) { const s = document.createElement('span'); s.className = lg.className; s.id = lg.id; s.textContent = lg.textContent; lg.replaceWith(s); }
  const $ = s => layer.querySelector(s), sheet = $('.dress'), nameIn = $('#name');
  ctx.bed({ engine: 1, crickets: 1 }); ctx.rpm(0);   // the taxi idling by the stall

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
  scene.add(stage.mesh(new THREE.ShaderMaterial({
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
  })));

  /* ---------- the taxi, on the road, nose along it ---------- */
  const taxi = makeTaxi(uMode);
  scene.add(taxi.jeep);
  taxi.jeep.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), .42).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), .06));

  /* ---------- the two of you: pixel people, 1 sprite px = 1 frame px ---------- */
  const me = folk.person('you', { size: 'near' });
  me.mesh.renderOrder = 5; me.mesh.material.depthTest = false;   // in front of the taxi's nose: always over it
  me.face('right'); me.play('idle'); scene.add(me.obj);
  let rider = null, behind = false;
  function dressRider() {   // a new atlas for every choice: instant, a few ms
    const was = rider;
    rider = folk.person({ ...look }, { size: 'near' });
    rider.mesh.renderOrder = 4; rider.mesh.material.depthTest = false;
    // walking behind the taxi it's drawn first and the depth cleared after it, so the taxi covers it
    rider.mesh.onAfterRender = r => { if (behind) r.clearDepth(); };
    rider.face('left'); rider.play('idle');
    if (was) { rider.obj.position.copy(was.obj.position); rider.obj.scale.copy(was.obj.scale); scene.remove(was.obj); was.dispose(); }
    scene.add(rider.obj);
  }
  dressRider();

  // a frame-px offset from the taxi's foot to painting px, at the resting framing
  let ppf = 3;   // painting px per frame px
  const P = ([dx, dy]) => [TAXI[0] + dx * ppf, TAXI[1] + dy * ppf];
  const walker = { x: 0, y: 0 };   // the rider's foot, painting px
  // put a person's foot on a painting point, snapped to the frame's pixel grid, at exactly 1 sprite px per frame px
  const V = new THREE.Vector3(), tanH = () => Math.tan(stage.fov * Math.PI / 360);
  function pin(p, x, y) {
    const grid = ctx.ink.size, d = stage.depthAt(x, y);
    stage.toWorld(x, y, d, V).project(camera);
    V.x = (Math.floor((V.x * .5 + .5) * grid.x) + .5) / grid.x * 2 - 1;   // the foot is the middle of a sprite column
    V.y = Math.round((V.y * .5 + .5) * grid.y) / grid.y * 2 - 1;          // the sole sits on a row's edge
    V.unproject(camera); p.obj.position.copy(V);
    const dist = camera.position.z - V.z, u = 2 * dist * tanH() / grid.y;   // world units per frame px, at that depth
    p.obj.scale.set(u * camera.aspect * grid.y / grid.x, u, 1);
  }

  /* ---------- the sheet: avatars of the passenger with each option tried on ---------- */
  nameIn.value = name;
  const groups = [...layer.querySelectorAll('.opts')];
  function refresh() {
    for (const g of groups) for (const b of g.children) {
      const k = g.dataset.g, v = k === 'skin' ? +b.value : b.value;
      b.setAttribute('aria-pressed', String(look[k] === v));
      const cv = b.querySelector('canvas');
      if (!cv) continue;
      const x = cv.getContext('2d'), L = { ...look, [k]: v }; x.clearRect(0, 0, 52, 52);
      if (k === 'build') x.drawImage(folk.preview(L), 10, 4, 32, 48);   // the build shows in the body: the whole figure, 1:1
      else x.drawImage(folk.avatar(L, 52), 0, 0);
    }
    $('.namebox').classList.toggle('ready', !!name.trim());
  }
  refresh();
  let chosen = false, waveT = 0;
  const wave = secs => { me.play('wave', { restart: me.anim !== 'wave' }); waveT = secs; };
  on(sheet, 'click', e => {
    const b = e.target.closest('.opts button'); if (!b || chosen) return;
    const g = b.parentElement.dataset.g, v = g === 'skin' ? +b.value : b.value;
    if (look[g] === v) return;
    look[g] = v; dressRider(); refresh();
  });
  on(sheet, 'submit', e => { e.preventDefault(); go(); });
  on(nameIn, 'input', () => {
    const had = !!name.trim();
    name = nameIn.value.replace(/\s+/g, ' ').trimStart();
    if (!had && name.trim()) wave(1.5);   // named: you wave them over
    refresh();
  });
  on(nameIn, 'keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });

  /* ---------- framing: the taxi and the two of you beside the sheet (desktop) or below it (phone) ---------- */
  let narrow = false;
  function resize(w, h) {
    const aspect = w / h; narrow = w <= 700 || aspect <= 1;
    const viewH = Math.min(IH, IW / aspect), viewW = viewH * aspect;   // the whole painting's height: the people read at their size
    ppf = viewH / ctx.ink.size.y;
    stage.place(taxi.jeep, TAXI[0], TAXI[1], TAXI_K * ppf, stage.depthAt(TAXI[0], TAXI[1] + 14));
    U.uHead.value.set(TAXI[0] + 1.69 * TAXI_K * ppf, TAXI[1] - 14 * ppf);
    // the group: the taxi's tail to the rider; put its middle where there's room, its feet clear of the sheet and the button
    const r = sheet.getBoundingClientRect(), left = TAXI[0] - (narrow ? 20 : 42) * ppf, right = P(SPOT.rider)[0] + 16 * ppf, feet = TAXI[1] + 8 * ppf;
    const figH = 44 * h / ctx.ink.size.y, sx = narrow ? w / 2 : r.left / 2, sy = narrow ? (r.bottom + h - 84) / 2 + figH / 2 : h * .68;
    const cx = clamp((left + right) / 2 - (sx / w - .5) * viewW, viewW / 2, IW - viewW / 2);
    const cy = clamp(feet - (sy / h - .5) * viewH, viewH / 2, IH - viewH / 2);
    stage.view(cx, cy, viewH, aspect);
    keyLight(taxi.jeepMat, camera, taxi.jeep.position, stage.toWorld(.165 * IW, .6 * IH, stage.depthAt(.165 * IW, .66 * IH), new THREE.Vector3()), .55);   // the stall's bulb
    if (!chosen) [walker.x, walker.y] = P(SPOT.rider);
  }

  /* ---------- get in: they turn, walk round the nose to the far door, and are gone as it shuts ---------- */
  let leg = 0, doneAt = 0, since = 0;
  function go() {
    if (chosen) return;
    if (!name.trim()) { nameIn.focus(); return; }
    name = name.trim(); pick({ name, ...look });
    chosen = true; nameIn.blur(); sheet.classList.add('gone'); sheet.inert = true;
    rider.face('back'); rider.play('walk'); leg = 1; wave(2.4);
  }
  const steer = new Steer(.3), AIM = U.uDir.value.clone();   // the scripted aim: straight along the road
  const lightAt = (x, y) => clamp(.3 + lightCPU(x, y) * .8, .3, 1);   // capped at "lit": the warm step quantizes skin to the palette's orange
  window.__stand = { look: () => ({ ...look, name }), get rider() { return rider; }, me, go, get leg() { return leg; } };   // for checking

  return {
    resize,
    onTap() { if (document.activeElement === nameIn) nameIn.blur(); else if (name.trim()) go(); },   // a tap on the scene first puts the keyboard away
    frame(dt, now) {
      ctx.prompt(!chosen && name.trim() ? `Get in, ${name.trim()}` : null);
      ctx.rpm(0);
      // the walk: by exactly the px the feet take (frame px -> painting px), up past the nose, then left to the door
      const step = rider.update(dt) * ppf;
      if (leg === 1) { walker.y -= step; if (walker.y <= P(SPOT.far)[1]) { walker.y = P(SPOT.far)[1]; rider.face('left'); leg = 2; behind = true; rider.shadow.visible = false; rider.mesh.renderOrder = -1; } }
      else if (leg === 2) { walker.x -= step; if (walker.x <= P(SPOT.door)[0]) { ctx.sfx.door(); rider.obj.visible = false; leg = 3; doneAt = now; } }
      else if (leg === 3 && now - doneAt > 1.1) { leg = 4; ctx.next(); }
      me.update(dt);
      if (waveT > 0 && (waveT -= dt) <= 0) me.play('idle');
      taxi.body.position.y = -taxi.PIVOT.y + Math.sin(now * 13) * .004;   // idling
      // the viewer steers the headlights: the reveal, and how lit the two of you are, follow the beam
      U.uDir.value.copy(steer.update(dt, U.uHead.value, AIM, ctx.input.ptr && stage.screenToPaint(...ctx.input.ptr), ctx.isTouch, ctx.input.hold));
      stage.target.dolly = .04 * sstep(0, 8, since += dt);   // a slow push-in
      stage.update(dt, 4);
      const [yx, yy] = P(SPOT.you);
      pin(me, yx, yy); pin(rider, walker.x, walker.y);
      me.setLight(lightAt(yx, yy - 20 * ppf) * .9, -1);
      rider.setLight(lightAt(walker.x, walker.y - 20 * ppf) * (behind ? .7 : 1), -1);
      ctx.ink.render(scene, camera, taxi.jeep);
    },
    dispose() { me.dispose(); rider.dispose(); disposeScene(scene); delete window.__stand; },
  };
}
