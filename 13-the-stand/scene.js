// The stand at Jorabat: the team waits at the roadside tea stall, doing things, in the taxi's headlights.
// Hover or focus shows a person's tagline and quip; a click (or Enter) gives them the lift.
import * as THREE from 'three';
import { clamp, lerp, damp, sstep, mkCanvas, loadImg, tex, strokeMap, makeTaxi, roster, pick, disposeScene } from '../shared/kit.js';
import { Stage, keyLight, paintFigure, Steer } from '../shared/kit.js';
import { PALETTE, FIGURE, UTIL } from '../shared/style.js';

const at = f => new URL(f, import.meta.url).href;
export const assets = ['jorabat-dark.jpg', 'depth.png'];

const IW = 1774, IH = 887;   // jorabat-dark.jpg in px; the scene lives in these units
// where things are in the painting, as fractions
const STALL = { bench: [[.118, .668], [.152, .668]], counter: [[.188, .654], [.212, .656], [.236, .654]], lamp: [.262, .67] };
const ROWS = [   // depth rows, back to front: base height, size, how much the dark holds them
  { y: .646, s: .78, dim: .55 }, { y: .664, s: .88, dim: .75 }, { y: .684, s: 1, dim: 1 }, { y: .704, s: 1.07, dim: 1 }, { y: .724, s: 1.14, dim: 1 },
];
const PERSON_H = 165;

export async function load(ctx) {
  const { renderer, layer, on, U: { uMode } } = ctx;
  layer.innerHTML = `
    <style>
      .ask { position: fixed; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 64px); transform: translateX(-50%) rotate(-1deg); background: var(--paper); color: var(--ink); padding: 10px 20px 12px; box-shadow: 5px 5px 0 var(--black); font-size: clamp(18px, 2.8vw, 26px); font-weight: 800; font-variation-settings: 'wdth' 110; pointer-events: none; white-space: nowrap; }
      .ask small { display: block; font-family: var(--mono); font-size: 11px; font-weight: 600; letter-spacing: .1em; color: var(--red); margin-bottom: 2px; }
      .person { position: fixed; background: none; border: 0; padding: 0; cursor: pointer; border-radius: 6px; }
      .person:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }
      .bubble { position: fixed; z-index: 5; max-width: min(300px, calc(100vw - 32px)); background: var(--paper); color: var(--ink); padding: 10px 14px 12px; border: 2px solid var(--ink); border-radius: 14px; box-shadow: 4px 4px 0 var(--black); pointer-events: none; transform: translate(-50%, -100%); }
      .bubble::after { content: ""; position: absolute; left: var(--tail, 50%); bottom: -12px; width: 16px; height: 12px; background: var(--paper); border: 2px solid var(--ink); border-top: 0; border-left: 0; transform: translateX(-50%) skewX(-30deg); }
      .bubble b { display: block; font-size: 17px; font-weight: 800; line-height: 1.2; }
      .bubble span { display: block; margin-top: 4px; font-size: 14px; line-height: 1.35; }
      /* narrow screens: the crowd overlaps, so a strip of faces does the picking. Tap once to find them, again to pick. */
      .faces { position: fixed; left: 0; right: 0; bottom: calc(env(safe-area-inset-bottom, 0px) + 12px); display: none; gap: 10px; overflow-x: auto; padding: 8px 16px 10px; scroll-snap-type: x proximity; scrollbar-width: none; }
      .faces::-webkit-scrollbar { display: none; }
      @media (max-width: 700px), (max-aspect-ratio: 1/1) { .faces { display: flex; } }
      .face { flex: 0 0 auto; width: 52px; height: 52px; border-radius: 50%; border: 2px solid var(--ink); background: var(--paper) center / cover no-repeat; box-shadow: 3px 3px 0 var(--black); padding: 0; cursor: pointer; scroll-snap-align: center; }
      .face[aria-pressed="true"] { outline: 3px solid var(--amber); outline-offset: 3px; }
      .face:focus-visible { outline: 3px solid var(--paper); outline-offset: 3px; }
      .bubble i { display: block; margin-top: 6px; font-family: var(--mono); font-style: normal; font-size: 11px; font-weight: 600; letter-spacing: .08em; color: var(--red); }
    </style>
    <div class="tag">HAIRPIN · JORABAT</div>
    <div class="ask"><small>LAST TAXI TO SHILLONG</small>Who's riding with me?</div>
    <div class="people" role="group" aria-label="Pick a passenger"></div>
    <div class="bubble" hidden aria-live="polite"></div>
    <div class="faces" role="group" aria-label="The team: tap a face to find them in the crowd, tap it again to give them the lift"></div>`;
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

  /* ---------- the taxi, parked at the left of the shot, nose along the road ---------- */
  const taxi = makeTaxi(uMode);
  taxi.jeepMat.uniforms.uL.value = .35;
  scene.add(taxi.jeep);
  taxi.jeep.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), .42).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), .06));

  /* ---------- the team: their painted stand-up if it exists, else a silhouette doing what their spot is for ---------- */
  const people = roster.people.filter(p => p.on);
  const SHIRTS = FIGURE.shirts;
  // a face for the strip: from their painted stand-up if it exists, else the stand-in's head and shoulders
  function faceOf(p) {
    const c = mkCanvas(104, 104), x = c.getContext('2d'), i = people.indexOf(p);
    x.fillStyle = PALETTE.paper; x.fillRect(0, 0, 104, 104);
    if (p.sprite) { const sw = p.sprite.width, sh = Math.min(p.sprite.height, sw); x.drawImage(p.sprite, 0, 0, sw, sh * .9, 0, 0, 104, 104 * .9); }
    else {
      x.fillStyle = SHIRTS[i % SHIRTS.length]; x.beginPath(); x.ellipse(52, 112, 40, 34, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = FIGURE.skin; x.beginPath(); x.arc(52, 52, 24, 0, Math.PI * 2); x.fill();
      x.fillStyle = FIGURE.hair; x.beginPath(); x.arc(54, 46, 25, Math.PI * .95, Math.PI * 2.1); x.fill();
    }
    return c.toDataURL();
  }
  function standIn(pose, i) {   // facing left; 140 x 300, feet on the bottom edge
    const c = mkCanvas(140, 300), x = c.getContext('2d'), shirt = SHIRTS[i % SHIRTS.length], { skin, hair, legs } = FIGURE;
    const head = (hx, hy) => { x.fillStyle = skin; x.beginPath(); x.arc(hx, hy, 23, 0, Math.PI * 2); x.fill(); x.fillStyle = hair; x.beginPath(); x.arc(hx + 2, hy - 6, 24, Math.PI * .95, Math.PI * 2.1); x.fill(); };
    const arm = (ax, ay, a, len = 60) => { x.save(); x.translate(ax, ay); x.rotate(a); x.fillStyle = shirt; x.fillRect(-7, 0, 14, len); x.restore(); };
    if (pose === 'sit') {   // on the bench, a glass of chai in both hands
      x.fillStyle = legs; x.fillRect(40, 236, 56, 16); x.fillRect(40, 236, 16, 64);
      x.fillStyle = shirt; x.beginPath(); x.roundRect(58, 150, 52, 96, 16); x.fill(); head(84, 124);
      arm(70, 170, .9, 46); x.fillStyle = FIGURE.chai; x.fillRect(34, 196, 14, 18); x.fillStyle = FIGURE.tea; x.fillRect(35, 199, 12, 8);
    } else if (pose === 'crouch') {   // down at the kerb
      x.fillStyle = legs; x.fillRect(46, 250, 52, 22); x.fillRect(46, 262, 14, 38); x.fillRect(84, 262, 14, 38);
      x.fillStyle = shirt; x.beginPath(); x.roundRect(48, 178, 54, 84, 18); x.fill(); head(64, 160); arm(56, 196, .4, 52);
    } else {
      const lean = pose === 'lean' ? -.12 : 0;
      x.save(); x.translate(70, 300); x.rotate(lean); x.translate(-70, -300);
      x.fillStyle = legs; x.fillRect(52, 190, 16, 110); x.fillRect(74, 190, 16, 110);
      x.fillStyle = shirt; x.beginPath(); x.roundRect(44, 92, 54, 104, 16); x.fill(); head(70, 62);
      if (pose === 'flag') arm(50, 104, -2.3);                                   // a hand half up, flagging the taxi
      else if (pose === 'phone') { arm(52, 104, -2.7, 42); x.fillStyle = FIGURE.phone; x.fillRect(36, 60, 12, 20); }   // on the phone, its screen glowing
      else if (pose === 'lean') arm(92, 100, 2.4, 58);                           // a hand up on the lamp post
      else if (pose === 'counter') arm(48, 110, -1.3, 54);                       // elbow on the stall counter
      else { arm(46, 104, .15); arm(94, 104, -.15); }
      x.restore();
    }
    return c;
  }
  // a spot for everyone: the bench, the counter, the lamp post, one crouched at the kerb, one on a phone, the rest flagging or waiting
  const POSES = ['sit', 'sit', 'counter', 'counter', 'counter', 'lean', 'crouch', 'phone'];
  const stands = await Promise.all(people.map(p => loadImg(at(`../people/${p.id}-stand.png`))));
  try { await document.fonts.load('600 15px "IBM Plex Mono"'); } catch (e) {}
  const POOL = (() => { const c = mkCanvas(64, 16), x = c.getContext('2d'), g = x.createRadialGradient(32, 8, 0, 32, 8, 32); g.addColorStop(0, UTIL.white); g.addColorStop(1, `${UTIL.white}00`); x.setTransform(1, 0, 0, .25, 0, 6); x.fillStyle = g; x.fillRect(0, -24, 64, 64); return tex(c); })();
  const pMat = map => new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, uL: { value: .2 }, uHi: { value: 0 }, uOp: { value: 1 }, uGlow: { value: 0 } }, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform sampler2D map; uniform float uL, uHi, uOp, uGlow; varying vec2 vUv; void main(){ vec4 c = texture2D(map, vUv); bool screen = c.b > .9 && c.r < .8; vec3 col = mix(c.rgb * vec3(.2, .24, .38), c.rgb * vec3(1.05, .97, .86), clamp(uL, 0., 1.)); if (screen) col = c.rgb * (.8 + uGlow); col *= mix(.62, 1., smoothstep(0., .12, vUv.y)); col += vec3(1., .85, .5) * uHi * .18; gl_FragColor = vec4(col, c.a * uOp); }',
  });
  const footGeo = new THREE.PlaneGeometry(1, 1).translate(0, .5, 0);
  people.forEach((p, i) => {
    p.pose = POSES[i] || (i % 3 ? 'flag' : 'stand');
    p.sprite = stands[i]; const src = p.sprite || paintFigure(standIn(p.pose, i), PALETTE.ink, 2.5);
    p.aspect = src.width / src.height;
    p.mat = pMat(tex(src)); p.m = new THREE.Mesh(footGeo, p.mat); p.m.frustumCulled = false; scene.add(p.m);
    p.sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: POOL, color: UTIL.shadow, transparent: true, opacity: .45, depthWrite: false })); scene.add(p.sh);
    p.hi = 0;
  });

  /* ---------- the layout: worked out from what's on screen, so nobody is ever clipped ---------- */
  let viewW = IW, viewH = IH, viewL = 0, viewR = IW, taxiX = 0;
  // a painting point (at depth d) to css px, through the camera as it is now: the buttons and the bubble follow the push-in
  const _p = new THREE.Vector3();
  const toScreen = (x, y, d = stage.depthAt(x, y)) => { stage.toWorld(x, y, d, _p).project(camera); return [(_p.x + 1) / 2 * innerWidth, (1 - _p.y) / 2 * innerHeight]; };
  function place(p, x, y, row) {
    const r = ROWS[row], h = PERSON_H * r.s;   // sitting and crouching are drawn lower in the same frame
    Object.assign(p, { px: x, py: y * IH, h, w: h * p.aspect, row, dim: r.dim });
    p.d = stage.depthAt(x, p.py);   // the ground under their feet
    stage.place(p.m, x, p.py, [p.w, p.h], p.d); p.m.renderOrder = p.ro = 2 + row;
    stage.place(p.sh, x, p.py, [p.w * .8, 10], p.d); p.sh.renderOrder = 1;
    p.L = clamp(.12 + lightCPU(x, p.py - p.h * .5) * .85, .12, 1.2) * r.dim;
  }
  function layout() {
    const margin = 26 + viewW * .06, L = viewL + margin, R = viewR - margin, inView = x => x * IW > L && x * IW < R;   // room for the push-in
    const rest = [];
    people.forEach((p, i) => {
      const spot = p.pose === 'sit' ? STALL.bench[i] : p.pose === 'counter' ? STALL.counter[i - 2] : p.pose === 'lean' ? STALL.lamp : null;
      if (spot && inView(spot[0])) place(p, spot[0] * IW, spot[1], p.pose === 'counter' ? 1 : 2);
      else rest.push(p);
    });
    // everyone else in depth rows: right of the lamp post if there's room, else across the whole shot in front of the stall
    const right = Math.max(L, .29 * IW), wide = R - right > 6 * 52;
    const x0 = wide ? right : L, span = R - x0;
    const rows = wide ? [0, 1, 2] : [2, 3, 4], perRow = Math.max(1, Math.floor(span / (wide ? 58 : 44)));
    const n = rest.length, used = Math.min(rows.length, Math.max(wide ? 3 : 1, Math.ceil(n / perRow)));   // never one long line
    rest.forEach((p, k) => {
      const ri = k % used, inRow = Math.ceil((n - ri) / used), j = Math.floor(k / used);
      const x = x0 + span * (inRow > 1 ? (j + (ri % 2 ? .5 : 0)) / (inRow - (ri % 2 ? 0 : 1) || 1) : .5);
      const jitter = (Math.sin(k * 12.9) * .5) * span / Math.max(inRow, 1) * .35;   // loose groups, not a fence
      place(p, clamp(x + jitter, L, R), ROWS[rows[ri]].y + (p.pose === 'crouch' ? .012 : 0), rows[ri]);
    });
    buttons();
  }
  function buttons() {   // the invisible buttons over each person, where the camera puts them now
    for (const p of people) {
      const [x0s, y0s] = toScreen(p.px - p.w / 2, p.py - p.h, p.d), [x1s, y1s] = toScreen(p.px + p.w / 2, p.py, p.d);
      Object.assign(p.btn.style, { left: `${x0s}px`, top: `${y0s}px`, width: `${x1s - x0s}px`, height: `${y1s - y0s}px`, zIndex: 2 + p.row });
    }
  }
  function resize(w, h) {
    const aspect = w / h;
    if (aspect > IW / IH) { viewW = IW; viewH = IW / aspect; } else { viewH = IH; viewW = IH * aspect; }
    // wide: the whole roadside; narrow: the stall, the bench and the lamp post, and the team crowds in front
    const cx = clamp(aspect < 1 ? .2 * IW : .52 * IW, viewW / 2, IW - viewW / 2), cy = clamp(.55 * IH, viewH / 2, IH - viewH / 2);
    viewL = cx - viewW / 2; viewR = cx + viewW / 2;
    stage.view(cx, cy, viewH, aspect);
    taxiX = viewL + 70 + viewW * .05;   // the taxi, nosed into the left of the shot (inside the push-in)
    stage.place(taxi.jeep, taxiX, .775 * IH, 58, stage.depthAt(taxiX, .79 * IH));
    U.uHead.value.set(taxiX + 100, .755 * IH);
    keyLight(taxi.jeepMat, camera, taxi.jeep.position, stage.toWorld(.165 * IW, .6 * IH, stage.depthAt(.165 * IW, .66 * IH), new THREE.Vector3()), .55);   // the stall's bulb
    layout();
  }

  /* ---------- meeting them: hover or focus shows their bubble; a click gives them the lift ---------- */
  let looking = null, chosen = null, leftAt = 0, t = 0, since = 0;
  const steer = new Steer(.3), AIM = U.uDir.value.clone();   // the scripted aim: straight along the road
  const bubble = $('.bubble');
  function show(p) {
    looking = p;
    for (const q of people) q.face.setAttribute('aria-pressed', String(q === p));
    if (!p) { bubble.hidden = true; return; }
    bubble.innerHTML = `<b>${p.tagline}</b><span>${p.quip}</span><i>${p.name.toUpperCase()}</i>`;
    bubble.hidden = false;
    const [x, y] = toScreen(p.px, p.py - p.h - 14, p.d), half = Math.min(150, (innerWidth - 32) / 2), bx = clamp(x, 16 + half, innerWidth - 16 - half);
    Object.assign(bubble.style, { left: `${bx}px`, top: `${Math.max(y, bubble.offsetHeight + 8)}px` });
    bubble.style.setProperty('--tail', `${clamp(50 + (x - bx) / (half * 2) * 100, 12, 88)}%`);   // the tail still points at them when nudged on screen
  }
  function choose(p) {
    if (chosen) return;
    chosen = p; pick(p.id); show(p); leftAt = t;
    for (const b of layer.querySelectorAll('.person, .face')) b.disabled = true;
  }
  for (const p of people) {
    const b = document.createElement('button');
    b.className = 'person'; b.setAttribute('aria-label', `${p.name}: ${p.tagline} ${p.quip}`);
    on(b, 'pointerenter', () => !chosen && show(p));
    on(b, 'pointerleave', () => !chosen && looking === p && show(null));
    on(b, 'focus', () => !chosen && show(p));
    on(b, 'blur', () => !chosen && looking === p && show(null));
    on(b, 'click', e => { e.stopPropagation(); choose(p); });
    $('.people').appendChild(b); p.btn = b;
    // their face, for the strip on narrow screens
    const f = document.createElement('button');
    f.className = 'face'; f.setAttribute('aria-label', `${p.name}: ${p.tagline} ${p.quip}`); f.setAttribute('aria-pressed', 'false');
    f.style.backgroundImage = `url(${faceOf(p)})`;
    on(f, 'click', e => {
      e.stopPropagation();
      if (looking === p) choose(p);   // the second tap picks them
      else { show(p); f.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }
    });
    $('.faces').appendChild(f); p.face = f;
  }

  return {
    resize,
    onTap() { if (looking) choose(looking); },
    frame(dt, now) {
      t = now;
      for (const p of people) {
        p.hi = lerp(p.hi, looking === p ? 1 : 0, damp(10, dt));
        p.m.renderOrder = looking === p ? 30 : p.ro;   // whoever you're looking at steps out of the crowd
        p.mat.uniforms.uL.value = p.L + p.hi * .25;
        p.mat.uniforms.uHi.value = p.hi;
        p.mat.uniforms.uGlow.value = .3 + .2 * Math.sin(now * 2.3 + p.px);
        let x = p.px, op = 1, y = p.py;
        if (chosen) {
          if (chosen === p) {   // walks to the taxi, and is gone
            const k = clamp((now - leftAt - .8) / 2.4, 0, 1);
            x = lerp(p.px, taxiX + 40, k * k); op = 1 - sstep(.75, 1, k);
            y -= Math.abs(Math.sin(k * 18)) * 3 * (k > 0 ? 1 : 0);
            stage.place(p.m, x, y, [p.w, p.h], p.d); stage.place(p.sh, x, p.py, [p.w * .8, 10], p.d);
          } else op = .5;   // the others step back into the dark
        }
        p.mat.uniforms.uOp.value = lerp(p.mat.uniforms.uOp.value, op, damp(6, dt));
        p.sh.material.opacity = .45 * p.mat.uniforms.uOp.value;
      }
      if (chosen && now - leftAt > 1.4) bubble.hidden = true;
      if (chosen && now - leftAt > 3.6) { chosen = null; ctx.next(); }
      taxi.body.position.y = -taxi.PIVOT.y + Math.sin(now * 13) * .004;   // idling
      // the viewer steers the headlights: the reveal and how lit each person is follow the beam
      U.uDir.value.copy(steer.update(dt, U.uHead.value, AIM, ctx.input.ptr && stage.screenToPaint(...ctx.input.ptr), ctx.isTouch, ctx.input.hold));
      for (const p of people) p.L = clamp(.12 + lightCPU(p.px, p.py - p.h * .5) * .85, .12, 1.2) * p.dim;
      // the camera: a slow push-in over the first eight seconds; the buttons and the bubble ride along with it
      stage.target.dolly = .09 * sstep(0, 8, since += dt);
      stage.update(dt, 4);
      if (since < 9) { buttons(); if (looking && !chosen) show(looking); }
      ctx.ink.uniforms.uTime.value = now; ctx.ink.uniforms.uJeepScale.value = .6;
      ctx.ink.render(scene, camera, taxi.jeep);
    },
    dispose() { disposeScene(scene); },
  };
}
