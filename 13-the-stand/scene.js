// The stand at Jorabat: the last taxi to Shillong, idling by the roadside tea stall. You (Yash) wait by its nose; the
// passenger stands in its headlights, and the viewer makes them: a name, then who they are, as pixel people
// (shared/folk.js) on the frame's own pixel grid. You wait at its tail, by the stall. "Get in" and they turn, walk round
// the nose to the passenger door on the far side (never past you), the door swings open, they're in, it shuts. The
// pointer (or a drag) swings the headlights.
import * as THREE from 'three';
import { clamp, sstep, mkCanvas, loadImg, tex, strokeMap, makeTaxi, passenger, pick, disposeScene, LIVERY } from '../shared/kit.js';
import { Stage, keyLight, Steer } from '../shared/kit.js';
import { FOLK, TAXI as TAXI_COL } from '../shared/style.js';
import * as folk from '../shared/folk.js';

const at = f => new URL(f, import.meta.url).href;
export const assets = ['jorabat-dark.jpg', 'depth.png'];

const IW = 1774, IH = 887;   // jorabat-dark.jpg in px; the painting lives in these units
const TAXI = [.2 * IW, .775 * IH];   // the taxi's foot on the road, painting px
// Everything else is laid out in frame px (1 sprite px = 1 frame px), from the taxi's foot, so the taxi and the people
// keep their sizes to each other on any screen. TAXI_K: frame px per taxi unit (the taxi is 3.4 long, 1.45 tall).
const TAXI_K = 32;
// [right, down] of the taxi's foot, frame px: you at the tail by the stall; the rider in the beam, then up past the nose
// to the far side and left to the door (opened OPEN_AT px before it). Phones: closer in, so all three fit the frame's width
const SPOTS = { wide: { you: [-76, 9], rider: [116, 10], far: [116, -13], door: [9, -13] }, narrow: { you: [-68, 9], rider: [81, 12], far: [81, -13], door: [9, -13] } }, OPEN_AT = 20;
let SPOT = SPOTS.wide;
const LABEL = { build: 'Who', hair: 'Hair', top: 'Top', extra: 'Extra' };

export async function load(ctx) {
  const { layer, on, U: { uMode } } = ctx;
  const saved = passenger(), norm = folk.normalise(saved || { build: Math.random() < .5 ? 'f' : 'm', skin: 2 });
  const look = { build: norm.build, skin: norm.skin, hair: norm.hair, top: norm.top, extra: norm.extra };
  let name = saved?.name || '';

  const grp = g => `<fieldset class="grp"><legend class="label" id="k-${g}">${LABEL[g]}</legend><div class="opts" data-g="${g}" role="group" aria-labelledby="k-${g}">${folk.OPTIONS[g].map(([id, text]) => `<button type="button" class="btn pick av" value="${id}" aria-label="${text}"><canvas></canvas><span aria-hidden="true">${text}</span></button>`).join('')}</div></fieldset>`;
  const skinGrp = `<fieldset class="grp"><legend class="label" id="k-skin">Skin</legend><div class="opts" data-g="skin" role="group" aria-labelledby="k-skin">${folk.OPTIONS.skin.map(([i, text]) => `<button type="button" class="btn pick sw" value="${i}" aria-label="${text} skin" style="--c:${FOLK.skin[i][1]};--d:${FOLK.skin[i][0]}"></button>`).join('')}</div></fieldset>`;
  layer.innerHTML = `
    <style>
      .dress { position: fixed; right: calc(env(safe-area-inset-right, 0px) + var(--gutter)); top: calc(var(--top) + 48px * var(--u)); width: calc(404px * var(--u)); box-sizing: border-box;
        padding: calc(18px * var(--u)) calc(18px * var(--u)) calc(16px * var(--u)); display: flex; flex-direction: column; gap: calc(10px * var(--u)); transition: transform 200ms steps(4), opacity 200ms steps(4); }
      .dress.gone { transform: translateX(calc(100% + 40px)); opacity: 0; pointer-events: none; }
      .dress h2 { margin: 2px 0 0; font: 400 calc(26px * var(--u))/1.05 var(--display); color: var(--ui-ink); text-wrap: balance; }
      .dress .kick { display: block; margin-bottom: 6px; font-size: var(--t1); }
      /* the name, typed into an RPG box: a tab above its corner, the serif inside, a red ▼ once there's a name */
      .namebox { position: relative; display: block; margin-top: calc(14px * var(--u)); border: var(--edge); background: var(--ui-cream); box-shadow: inset 0 -3px 0 var(--ui-cream-deep); }
      .namebox .label { position: absolute; left: 10px; bottom: calc(100% - var(--line)); background: var(--ui-cream); border: var(--edge); border-bottom: 0; padding: 3px 8px 0; font-size: var(--t1); }
      .namebox input { display: block; width: 100%; box-sizing: border-box; border: 0; border-radius: 0; background: transparent; padding: 9px 34px 8px 12px;
        font: 500 calc(22px * var(--u))/1.2 var(--serif); color: var(--ui-ink); }
      .namebox input:focus { outline: none; }
      .namebox:focus-within { box-shadow: inset 0 -3px 0 var(--ui-cream-deep), 0 0 0 2px var(--ui-cream), 0 0 0 4px var(--ui-signal); }
      .namebox input::placeholder { color: var(--ui-ink-soft); opacity: .7; }
      .namebox::after { content: "▼"; position: absolute; right: 11px; bottom: 11px; font: 400 var(--t1)/1 var(--pixel); color: var(--ui-signal); opacity: 0; }
      .namebox.ready::after { animation: blink 1s steps(1) infinite; }
      .grp { display: grid; gap: calc(6px * var(--u)); border: 0; margin: 0; padding: 0; min-width: 0; }
      .grp > .label { padding: 0; font-size: var(--t1); }
      .opts { display: flex; gap: calc(8px * var(--u)); padding-bottom: calc(var(--t1) + 4px); }   /* room for the names under the frames */
      .pair { display: flex; gap: calc(18px * var(--u)); } .pair .opts[data-g="skin"] { gap: calc(6px * var(--u)); padding-bottom: 0; }
      /* options are shared .btn.pick frames (index.html): the chosen one gets the 2px red ring and the ▼ in its corner */
      .av, .sw { padding: 0; min-height: 0; flex: none; }
      .av { width: var(--av); height: var(--av); box-sizing: content-box; }
      .av canvas { display: block; width: var(--av); height: var(--av); image-rendering: pixelated; }
      .av span { position: absolute; top: calc(100% + var(--line) + 4px); left: 50%; transform: translateX(-50%); font: 400 var(--t1)/1 var(--pixel); letter-spacing: .02em; color: var(--ui-ink-soft); }
      .av[aria-pressed="true"] span { color: var(--ui-rust); }
      /* skin: five pixel swatches, base over its shadow */
      .sw { width: calc(30px * var(--u)); height: calc(30px * var(--u)); background: linear-gradient(var(--c) 0 72%, var(--d) 0); }
      .sw.pick[aria-pressed="true"]::after { top: 1px; right: 2px; }
      @media (hover: hover) and (pointer: fine) { .sw:hover:not([aria-pressed="true"]) { background: linear-gradient(var(--c) 0 60%, var(--d) 0); } }
      /* phones: across the top, compact, labels beside the rows; the two of them in the light below it */
      @media (max-width: 700px), (max-aspect-ratio: 1/1) {
        .pair { display: contents; }
        .dress { left: calc(env(safe-area-inset-left, 0px) + 12px); right: calc(env(safe-area-inset-right, 0px) + 12px); top: calc(var(--top) + 50px); width: auto; padding: 10px 12px 12px; gap: 10px; }
        .dress.gone { transform: translateY(calc(-100% - 80px)); }
        .dress .kick { display: none; }
        .dress h2 { font-size: 20px; }
        .namebox { margin-top: 12px; } .namebox input { font-size: 20px; padding: 6px 30px 5px 10px; }
        .grp { grid-template-columns: 48px 1fr; align-items: center; gap: 0 4px; }
        .opts, .pair .opts[data-g="skin"] { gap: 6px; padding-bottom: 0; }
        .av span { display: none; }
        .sw { width: 34px; height: 28px; }
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
  // jorabat-lit.jpg isn't painted yet: not fetched (a 404 every visit); once it exists, load it here and use it for iLit
  const [iDark, depthImg] = await Promise.all([loadImg(at('jorabat-dark.jpg')), loadImg(at('depth.png'))]), iLit = null;
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
  // the passenger's door (right-hand drive: the far side, -z), hinged at the A-pillar like 08-edge-scene's; a spring swings it
  const door = new THREE.Group(); door.position.set(.9, 0, -.7); taxi.body.add(door);
  taxi.put(new THREE.BoxGeometry(1.24, .6, .03), LIVERY.body, { x: -.62, y: .56, z: -.02 }, door).layers.enable(1);
  taxi.put(new THREE.BoxGeometry(1.1, .05, .03), LIVERY.body, { x: -.6, y: 1.3, z: -.02 }, door).layers.enable(1);   // the window frame's top: it shows over the roof
  taxi.put(new THREE.BoxGeometry(.05, .44, .03), LIVERY.body, { x: -1.12, y: 1.08, z: -.02 }, door).layers.enable(1);
  taxi.put(new THREE.BoxGeometry(1.02, .4, .01), TAXI_COL.glass, { x: -.6, y: 1.08, z: -.03, emit: 2 }, door).layers.enable(1);
  Object.assign(door.userData, { open: 0, v: 0 });
  taxi.jeep.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), .42).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), .06));

  /* ---------- the two of you: pixel people, 1 sprite px = 1 frame px ---------- */
  const me = folk.person('you', { size: 'near' });
  me.mesh.renderOrder = 5; me.mesh.material.depthTest = false;   // by the tail, on the near side: always over it
  me.face('right'); me.play('idle'); scene.add(me.obj);
  let rider = null, behind = false;
  function dressRider() {   // a new atlas for every choice: instant, a few ms
    const was = rider;
    rider = folk.person({ ...look }, { size: 'near' });
    rider.mesh.renderOrder = 4; rider.mesh.material.depthTest = false;   // walking behind the taxi, the depth test is on (go()): it covers them
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
  function pin(p, x, y, back = 1) {   // back > 1: pushed away along the sight line (same size on screen), behind the taxi's depth
    const grid = ctx.ink.size, d = stage.depthAt(x, y);
    stage.toWorld(x, y, d, V).project(camera);
    V.x = (Math.floor((V.x * .5 + .5) * grid.x) + .5) / grid.x * 2 - 1;   // the foot is the middle of a sprite column
    V.y = Math.round((V.y * .5 + .5) * grid.y) / grid.y * 2 - 1;          // the sole sits on a row's edge
    V.unproject(camera).sub(camera.position).multiplyScalar(back).add(camera.position); p.obj.position.copy(V);
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
      if (cv.width !== avPx) cv.width = cv.height = avPx;
      const x = cv.getContext('2d'), L = { ...look, [k]: v }; x.clearRect(0, 0, avPx, avPx); x.imageSmoothingEnabled = false;
      // the build shows in the body: the 48x72 figure, whole-pixel scale, centred (cut at the shins, or the hips, when it doesn't fit)
      if (k === 'build') { const z = Math.max(1, Math.round(avPx / 60)); x.drawImage(folk.preview(L), Math.round(avPx / 2 - 24 * z), Math.round((avPx - 72 * z) / 2), 48 * z, 72 * z); }
      else {   // the rest: folk's 36 px head-and-shoulders crop, about 32 px of it across the frame, so the heads read big;
        // a tight frame keeps the hair whole (tops: centred, a little more chest for a row of hair)
        const z = Math.max(1, Math.round(avPx / 32)), o = Math.round((avPx - 36 * z) / 2);
        x.drawImage(folk.avatar(L, 36), o, k === 'top' ? o : Math.max(0, o), 36 * z, 36 * z);
      }
    }
    $('.namebox').classList.toggle('ready', !!name.trim());
  }
  // the frames' size: 64 CSS px (x --u) on a desktop, 50 on a phone; drawn at device pixels, so the faces stay whole-pixel
  let avPx = 0;
  function sizeAvatars() {
    const css = narrow ? 50 : Math.round(64 * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u')) || 1));
    const px = Math.round(css * (devicePixelRatio || 1));
    sheet.style.setProperty('--av', `${css}px`);
    if (px !== avPx) { avPx = px; refresh(); }
  }
  let narrow = matchMedia('(max-width: 700px), (max-aspect-ratio: 1/1)').matches;
  sizeAvatars();
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
  function resize(w, h) {
    const aspect = w / h; narrow = w <= 700 || aspect <= 1; SPOT = SPOTS[narrow ? 'narrow' : 'wide']; sizeAvatars();
    const viewH = Math.min(IH, IW / aspect), viewW = viewH * aspect;   // the whole painting's height: the people read at their size
    ppf = viewH / ctx.ink.size.y;
    stage.place(taxi.jeep, TAXI[0], TAXI[1], TAXI_K * ppf, stage.depthAt(TAXI[0], TAXI[1] + 14));
    U.uHead.value.set(TAXI[0] + 1.69 * TAXI_K * ppf, TAXI[1] - 20 * ppf);
    // the group: the taxi's tail to the rider; put its middle where there's room, its feet clear of the sheet and the button
    const r = sheet.getBoundingClientRect(), left = P(SPOT.you)[0] - (narrow ? 15 : 32) * ppf, right = P(SPOT.rider)[0] + (narrow ? 15 : 23) * ppf, feet = TAXI[1] + 12 * ppf;
    const figH = 64 * h / ctx.ink.size.y, sx = narrow ? w / 2 : r.left / 2, sy = narrow ? (r.bottom + h - 84) / 2 + figH / 2 : h * .68;
    const cx = clamp((left + right) / 2 - (sx / w - .5) * viewW, viewW / 2, IW - viewW / 2);
    const cy = clamp(feet - (sy / h - .5) * viewH, viewH / 2, IH - viewH / 2);
    stage.view(cx, cy, viewH, aspect);
    keyLight(taxi.jeepMat, camera, taxi.jeep.position, stage.toWorld(.165 * IW, .6 * IH, stage.depthAt(.165 * IW, .66 * IH), new THREE.Vector3()), .55);   // the stall's bulb
    if (!chosen) [walker.x, walker.y] = P(SPOT.rider);
  }

  /* ---------- get in: they turn, walk round the nose to the far door; it swings open, they're in, it shuts ---------- */
  let leg = 0, doneAt = 0, since = 0;
  function go() {
    if (chosen) return;
    if (!name.trim()) { nameIn.focus(); return; }
    name = name.trim(); pick({ name, ...look });
    chosen = true; nameIn.blur(); sheet.classList.add('gone'); sheet.inert = true;
    rider.face('back'); rider.play('walk'); leg = 1; wave(2.4);
    rider.mesh.material.depthTest = true;
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
      if (leg === 1) { walker.y -= step; if (walker.y <= P(SPOT.far)[1]) { walker.y = P(SPOT.far)[1]; rider.face('left'); leg = 2; behind = true; rider.shadow.visible = false; } }
      else if (leg === 2) {
        walker.x -= step;
        if (walker.x <= P([SPOT.door[0] + OPEN_AT, 0])[0]) door.userData.open = 1;   // the door swings out as they reach it
        if (walker.x <= P(SPOT.door)[0]) { walker.x = P(SPOT.door)[0]; rider.face('back'); rider.play('idle'); leg = 3; doneAt = now; }
      }
      else if (leg === 3 && now - doneAt > .25) { rider.obj.visible = false; leg = 4; doneAt = now; }   // in
      else if (leg === 4 && now - doneAt > .3) { door.userData.open = 0; ctx.sfx.door(); leg = 5; doneAt = now; }   // and it shuts
      else if (leg === 5 && now - doneAt > 1.1) { leg = 6; ctx.next(); }
      { const u = door.userData; u.v += (-49 * (door.rotation.y + 1.1 * u.open) - 7.7 * u.v) * dt; door.rotation.y += u.v * dt; }   // a spring (ω 7, ζ .55), like the edge's
      me.update(dt);
      if (waveT > 0 && (waveT -= dt) <= 0) me.play('idle');
      taxi.body.position.y = -taxi.PIVOT.y + Math.sin(now * 13) * .004;   // idling
      // the viewer steers the headlights: the reveal, and how lit the two of you are, follow the beam
      U.uDir.value.copy(steer.update(dt, U.uHead.value, AIM, ctx.input.ptr && stage.screenToPaint(...ctx.input.ptr), ctx.isTouch, ctx.input.hold));
      stage.target.dolly = .04 * sstep(0, 8, since += dt);   // a slow push-in
      stage.update(dt, 4);
      const [yx, yy] = P(SPOT.you);
      pin(me, yx, yy); pin(rider, walker.x, walker.y, behind ? 3 : 1);
      me.setLight(Math.max(.8, lightAt(yx, yy - 29 * ppf) * .9), 1);   // the stall's bulb, behind you on the right
      rider.setLight(lightAt(walker.x, walker.y - 29 * ppf) * (behind ? .7 : 1), -1);
      ctx.ink.render(scene, camera, taxi.jeep);
    },
    dispose() { me.dispose(); rider.dispose(); disposeScene(scene); delete window.__stand; },
  };
}
