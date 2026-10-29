// Jorabat, inside the taxi: the passenger gets in and asks what I do; the dashboard answers.
// Pointing lights the dash; each object is a project. Tap (or the chip) and we drive.
import * as THREE from 'three';
import { clamp, lerp, damp, sstep, loadImg, tex, strokeMap, line, disposeScene, Stage } from '../shared/kit.js';

const at = f => new URL(f, import.meta.url).href;
const OBJ_FILES = ['teleprompter', 'pill-strip', 'test-sheet', 'billing-receipt', 'markon-card', 'star'];
export const assets = ['dashboard-lit.jpg', 'dashboard-dark.jpg', 'depth.png', ...OBJ_FILES.map(n => `objects/${n}.png`)];

const IW = 1672, IH = 941;   // dashboard-lit/dark.jpg in px (mirrored to right-hand drive)
const DASH = .64, SHELF = .74;   // the dash top, as fractions of the height: windscreen base to front edge
// The five projects on the dash, and what each one's window says. Every piece of copy is [text, status]:
//   'PORTFOLIO' = Yash's own words or facts, from ~/Portfolio-Site (the file is noted beside it);
//   'DRAFT'     = Claude wrote it (or it's a guess from the story board); Yash to approve, line by line, before it changes.
// Links only where the portfolio has them. Dodo billingSDK and Markon aren't in the portfolio at all: everything about them is a guess.
// x: across the painting; h: height in painting px; rot: a little askew, as if tossed there
const PROJECTS = [
  { file: 'teleprompter', x: .14, h: 130, rot: .06,
    name: ['TopNotch', 'PORTFOLIO'],                                         // app/components/StuffIveBuilt.tsx
    role: ['macOS app · personal project', 'PORTFOLIO'],                     // MobileBuilt.tsx headerText; "my personal projects", StuffIveBuilt.tsx
    year: ['2026', 'DRAFT'],
    tagline: ['A teleprompter that lives in your Mac’s notch.', 'PORTFOLIO'],   // StuffIveBuilt.tsx, its first bullet
    about: ['It follows your voice as you read, 100% on-device. And it stays hidden from screen shares, so the call only ever sees you.', 'DRAFT'],   // from its other two bullets
    links: [['Visit website', 'https://topnotch-website-tau.vercel.app/']],   // StuffIveBuilt.tsx cta
  },
  { file: 'pill-strip', x: .28, h: 112, rot: -.08,
    name: ['1mg banner tool', 'DRAFT'],                                      // the story board's guess; the portfolio calls it a pipeline
    role: ['Internal AI tooling · Tata 1mg', 'PORTFOLIO'],                   // AboutMe.tsx: "I build internal AI tooling at Tata 1mg"
    year: ['2026', 'DRAFT'],
    tagline: ['An image-generation pipeline for banners.', 'PORTFOLIO'],      // MobileWork.tsx
    about: ['Part of the internal AI tooling I build at Tata 1mg, next to the design system I look after. It lives inside 1mg, so there’s nothing to link here: ask me and I’ll show you.', 'DRAFT'],
    links: [],
  },
  { file: 'test-sheet', x: .42, h: 146, rot: .1,
    name: ['Warden', 'PORTFOLIO'],                                           // StuffIveBuilt.tsx, MobileBuilt.tsx
    role: ['Agent payments + security · personal project', 'PORTFOLIO'],     // MobileBuilt.tsx headerText
    year: ['2026', 'DRAFT'],
    tagline: ['An authorization layer between an autonomous buying agent and your money.', 'PORTFOLIO'],   // StuffIveBuilt.tsx (from the Warden README)
    about: ['The agent proposes; it cannot authorize itself. 314 generated attacks, 0 authorised, with live price comparison through Swiggy’s Instamart MCP and every verdict on a hash-chained ledger. A native SwiftUI app, with Razorpay as the payment rail.', 'DRAFT'],   // the portfolio's own facts, put together
    links: [['GitHub repo', 'https://github.com/Yasharma117/warden'], ['5-min walkthrough', 'https://cap.so/s/js1hn1mfjsrptfb']],   // StuffIveBuilt.tsx
  },
  { file: 'billing-receipt', x: .55, h: 134, rot: -.05,
    name: ['Dodo billingSDK', 'DRAFT'],                                      // a guess (story board); not in the portfolio
    role: ['Open source · billing', 'DRAFT'],
    year: ['2026', 'DRAFT'],
    tagline: ['Billing screens, ready to drop in.', 'DRAFT'],
    about: ['My part of billingSDK, Dodo’s kit of ready-made billing components. The receipt on the dash is for every line of it.', 'DRAFT'],
    links: [],
  },
  { file: 'markon-card', x: .68, h: 98, rot: .07,
    name: ['Markon', 'DRAFT'],                                               // a guess (story board); not in the portfolio
    role: ['Personal project', 'DRAFT'],
    year: ['2026', 'DRAFT'],
    tagline: ['The black card with the gold edge.', 'DRAFT'],
    about: ['The one I’d rather show you than describe. Ask me about it on the way up.', 'DRAFT'],
    links: [],
  },
];
// DRAFT lines. [seconds, who, line, expression]
const DRIVE_AT = 40;   // the drive starts on its own after this, as in the story

export async function load(ctx) {
  const { layer, on, input, U: { uMode } } = ctx;
  layer.innerHTML = `
    <style>
      /* the project window: a card on the right (desktop); on phones a bottom sheet, its words stopping above the story box and Drive (--foot, set in frame) */
      .proj { position: fixed; z-index: 12; right: calc(env(safe-area-inset-right, 0px) + var(--gutter)); top: calc(var(--top) + 60px * var(--u)); width: calc(372px * var(--u));
        max-height: calc(100% - var(--top) - 60px * var(--u) - var(--gutter)); overflow: auto; box-sizing: border-box; padding: calc(12px * var(--u)) calc(18px * var(--u)) calc(20px * var(--u));
        display: flex; flex-direction: column; gap: calc(12px * var(--u)); --k: 2; transition: transform 200ms steps(4), opacity 200ms steps(4), visibility 0s; }
      .proj.gone { transform: translateX(calc(100% + 40px)); opacity: 0; visibility: hidden; pointer-events: none; transition: transform 200ms steps(4), opacity 200ms steps(4), visibility 0s 200ms; }
      .proj:focus { outline: none; }
      .proj .bar { display: flex; align-items: center; gap: calc(8px * var(--u)); }
      .proj .count { margin-right: auto; font-size: var(--t1); }
      .proj .bar .btn { width: calc(44px * var(--u)); padding: 0; }
      .proj .bar .btn span { color: var(--ui-signal); }
      .proj .pic { display: flex; justify-content: center; background: var(--ui-cream-deep); border: var(--edge); padding: calc(10px * var(--u)); }
      .proj canvas { display: block; height: calc(40px * var(--k)); image-rendering: pixelated; }
      .proj h2 { margin: 0; font: 400 calc(30px * var(--u))/1.05 var(--display); text-wrap: balance; }
      .proj .role { margin: calc(6px * var(--u)) 0 0; font: 400 var(--t2)/1.1 var(--pixel); letter-spacing: .06em; text-transform: uppercase; color: var(--ui-ink-soft); }
      .proj .tagline { margin: 0; font: italic 500 calc(20px * var(--u))/1.3 var(--serif); text-wrap: pretty; }
      .proj .about { margin: 0; font: 400 calc(17px * var(--u))/1.5 var(--serif); text-wrap: pretty; }
      .proj .links { display: flex; flex-wrap: wrap; gap: calc(10px * var(--u)); padding-top: 2px; }
      .proj .links:empty { display: none; }
      @media (max-width: 700px), (max-aspect-ratio: 1/1) {
        .proj { left: 0; right: 0; top: auto; bottom: 0; width: auto; max-height: calc(100% - var(--top) - 56px); border-width: var(--line) 0 0; box-shadow: none;
          padding: 10px calc(env(safe-area-inset-right, 0px) + 16px) calc(var(--foot, 90px) + 12px) calc(env(safe-area-inset-left, 0px) + 16px); gap: 10px; }
        .proj.gone { transform: translateY(calc(100% + 20px)); }
        .proj .head { display: flex; gap: 14px; align-items: center; }
        .proj .pic { flex: none; padding: 6px; }
        .proj h2 { font-size: 24px; } .proj .role { font-size: var(--t1); }
        .proj .tagline { font-size: 18px; } .proj .about { font-size: 16px; line-height: 1.45; }
      }
      @media (prefers-reduced-motion: reduce) { .proj, .proj.gone { transform: none; } }
    </style>
    <div class="tag">HAIRPIN · JORABAT</div><div class="hint" aria-hidden="true"></div>
    <section class="panel proj gone" role="dialog" aria-labelledby="proj-t" aria-describedby="proj-d" tabindex="-1">
      <div class="bar"><span class="label count"></span>
        <button type="button" class="btn sm" data-d="-1" aria-label="Previous project"><span aria-hidden="true">◀</span></button>
        <button type="button" class="btn sm" data-d="1" aria-label="Next project"><span aria-hidden="true">▶</span></button>
        <button type="button" class="btn sm x" aria-label="Close">×</button></div>
      <div class="head"><div class="pic"><canvas aria-hidden="true"></canvas></div>
        <div aria-live="polite"><h2 id="proj-t"></h2><p class="role"></p></div></div>
      <p class="tagline" id="proj-d"></p>
      <p class="about"></p>
      <div class="links"></div>
    </section>`;
  const chip = layer.querySelector('.hint');   // hovering an object shows its name here, by it
  const panel = layer.querySelector('.proj'), $p = sel => panel.querySelector(sel), thumb = $p('canvas');
  ctx.bed({ engine: 1, crickets: 1 }); ctx.rpm(0);   // idling at the stand

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
  const objects = PROJECTS.map(p => ({ file: p.file, x: p.x, h: p.h, rot: p.rot, name: p.name[0].toUpperCase(), line: '', proj: p }));   // no line: a name chip on hover, the window on a pick
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
  let viewW = IW, viewH = IH, kbd = -1, picked = -1, cx0 = IW / 2, pan = 0;
  function resize(w, h) {
    const aspect = w / h;
    if (aspect > IW / IH) { viewW = IW; viewH = IW / aspect; } else { viewH = IH; viewW = IH * aspect; }
    const cx = cx0 = clamp(.5 * IW, viewW / 2, IW - viewW / 2), cy = clamp(.55 * IH, viewH / 2, IH - viewH / 2);
    stage.view(cx, cy, viewH * .95, aspect);
  }
  /* ---------- the project window: opens on a pick (once the dashboard answers), steps through the five ---------- */
  let win = -1;
  function show(i) {
    const o = objects[i], p = o.proj, was = win; win = kbd = i;
    $p('.count').textContent = `${i + 1} / ${PROJECTS.length}`;
    $p('h2').textContent = p.name[0]; $p('.role').textContent = `${p.role[0]} · ${p.year[0]}`;
    $p('.tagline').textContent = p.tagline[0]; $p('.about').textContent = p.about[0];
    $p('.links').replaceChildren(...p.links.map(([text, href]) => {
      const a = Object.assign(document.createElement('a'), { className: 'btn sm', href, target: '_blank', rel: 'noopener noreferrer', textContent: `${text} ↗` });
      a.setAttribute('aria-label', `${text} (opens in a new tab)`); return a;
    }));
    // its sprite, 40 px tall with hard edges, scaled up whole-pixel by CSS
    const img = OBJ_IMG[o.file], h = 40, w = Math.round(h * img.width / img.height), g = thumb.getContext('2d', { willReadFrequently: true });
    thumb.width = w; thumb.height = h; thumb.style.width = `calc(${w}px * var(--k))`; g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h); for (let k = 3; k < d.data.length; k += 4) d.data[k] = d.data[k] > 110 ? 255 : 0; g.putImageData(d, 0, 0);
    panel.classList.remove('gone');
    if (was < 0) panel.focus({ preventScroll: true });   // a screen reader lands on it; Esc, the arrows and Tab work from here
  }
  function close() {
    if (win < 0) return; win = -1;
    if (panel.contains(document.activeElement)) document.activeElement.blur();
    panel.classList.add('gone');
  }
  const choose = i => { kbd = i; if (since > READY) objects[i].proj ? show(i) : close(); };   // before the YOU line it only lights
  const step = d => choose((Math.max(kbd, picked) + d + objects.length) % objects.length);
  on(window, 'keydown', e => {
    if (e.code === 'ArrowRight') step(1); if (e.code === 'ArrowLeft') step(-1);
    if (e.code === 'Escape' && win >= 0) { close(); kbd = -1; }
  });
  on(panel, 'click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.d) show((win + +b.dataset.d + PROJECTS.length) % PROJECTS.length); else { close(); kbd = -1; }
  });
  on(panel, 'keydown', e => { if (e.code === 'Space' && e.target.closest('button')) e.stopPropagation(); });   // Space presses a button here, not the page's hold
  on(ctx.canvas, 'pointermove', () => { kbd = -1; });
  // a tap on the canvas picks the nearest object (and says what it is); only the advance button (or Enter) drives off
  let canvasDown = -1e9;
  on(ctx.canvas, 'pointerdown', () => { canvasDown = performance.now(); });
  const pickAt = (sx, sy) => {
    // on a phone the dash is wider than the screen: a tap near either side steps to the next object that way
    if (innerWidth < innerHeight && (sx < innerWidth * .22 || sx > innerWidth * .78)) { step(sx < innerWidth / 2 ? -1 : 1); return; }
    const p = stage.screenToPaint(sx, sy); if (!p) return;
    let best = 0, bd = 1e9;
    objects.forEach((o, i) => { const d = Math.hypot((p[0] - o.px) / (o.w / 2 + 20), (p[1] - o.py) / (o.h / 2 + 20)); if (d < bd) { bd = d; best = i; } });
    if (bd > 2.5) { kbd = -1; close(); return; }   // a tap well away from them all puts the window away
    choose(best);
  };
  let lastUp = null; on(window, 'pointerup', e => { lastUp = [e.clientX, e.clientY]; }, { capture: true });

  /* ---------- the beat: the passenger gets in, asks, and the dashboard answers ---------- */
  const own = line('jorabat');   // the passenger picked at the stand: their own line first
  const SCRIPT = [
    own ? [1.5, own.who, own.text, own.expr] : [1.5, 'PASSENGER', 'Shillong? Great. Mind if I sit in front?'],
    [5, 'PASSENGER', 'So what do you do?'],
    [8.5, 'YOU', 'Easier to show you. It’s all on the dashboard.'],
  ];
  let since = 0, lineI = 0, shownObj = -1, gone = false;
  // the dashboard answers only once "Easier to show you…" has been said (as long as say() keeps it up)
  const lineSecs = (text, secs) => Math.max(secs, text.length / 32 + Math.max(1.6, .28 * text.split(/\s+/).length)) + .4;
  const READY = SCRIPT[2][0] + lineSecs(SCRIPT[2][2], 3.2);
  const v = new THREE.Vector3();
  const leave = () => { if (!gone) { gone = true; close(); ctx.prompt(null); ctx.next(); } };
  const light = new THREE.Vector2();

  return {
    resize,
    onTap() {
      if (performance.now() - canvasDown < 600) { if (lastUp) pickAt(...lastUp); return; }   // a tap on the dashboard
      if (since > 8.5) leave();   // the button, or Enter
    },
    frame(dt) {
      since += dt;
      U.uDome.value = 1 - sstep(3, 5.5, since);   // the passenger shuts the door; the dome light goes out
      if (lineI < SCRIPT.length && since > SCRIPT[lineI][0]) { const [, who, text, expr] = SCRIPT[lineI++]; ctx.say(who, text, 3.2, expr); }
      if (since > 8.5) ctx.prompt('Drive');
      // which object: the keyboard's choice, else the one under the pointer
      const ptr = input.ptr && stage.screenToPaint(...input.ptr);
      // the engine idling: the dash and the road outside shift against each other, just
      if (kbd >= 0) pan = clamp(objects[kbd].px - cx0, (viewW / 2 - cx0) * .72, (IW - viewW / 2 - cx0) * .72);   // a narrow screen turns to the chosen one (short of the painting's edge: the near dash moves more)
      Object.assign(stage.target, { dx: pan + Math.sin(since * 1.7) * 3 + Math.sin(since * 23) * .6, dy: Math.sin(since * 2.3) * 1.5 }); stage.update(dt, 6);
      picked = kbd;
      if (picked < 0 && ptr) {
        let best = -1, bd = 1e9;
        objects.forEach((o, i) => { const d = Math.hypot((ptr[0] - o.px) / (o.w / 2 + 20), (ptr[1] - o.py) / (o.h / 2 + 20)); if (d < 1 && d < bd) { bd = d; best = i; } });
        picked = best;
      }
      if (picked < 0) picked = win;   // nothing pointed at: the light rests on the open project
      // the light: follows the pointer, or sits on the chosen object
      if (picked >= 0) light.set(objects[picked].px, objects[picked].py); else if (ptr) light.set(...ptr); else light.set(-999, -999);
      U.uLight.value.lerp(light, damp(10, dt));
      for (const [i, o] of objects.entries()) {
        const near = Math.max(1 - sstep(40, 260, Math.hypot(o.px - U.uLight.value.x, (o.py - U.uLight.value.y) * 1.6)), U.uDome.value);
        o.lit = lerp(o.lit, Math.max(near * .7, i === picked ? 1 : 0), damp(8, dt));
        o.mat.uniforms.uL.value = o.lit;
        stage.place(o.m, o.px, o.py - (i === picked ? 3 : 0), [o.w, o.h], o.d);   // lifts a touch, like tape giving
      }
      const ready = since > READY, o = objects[picked];
      if (ready && picked !== shownObj) { shownObj = picked; if (o?.line) ctx.say(o.name, o.line, 4); }
      const named = ready && o && !o.line && picked !== win;   // a project you point at: its name, as a chip just above it (not the one already open)
      chip.classList.toggle('on', named);
      if (named) {
        v.setFromMatrixPosition(o.m.matrixWorld).project(camera);
        if (chip.textContent !== o.name) chip.textContent = o.name;
        Object.assign(chip.style, { left: `${clamp((v.x * .5 + .5) * innerWidth, 130, innerWidth - 130)}px`, top: `${(-v.y * .5 + .5) * innerHeight - (o.h / 2 / viewH) * innerHeight - 44}px` });
      }
      if (win >= 0) {   // the sheet's foot: up to the highest of the page's story box and Drive button (index.html's ids)
        let top = innerHeight;
        for (const el of [document.getElementById('story'), document.getElementById('chip')]) if (el?.getClientRects().length) top = Math.min(top, el.getBoundingClientRect().top);
        panel.style.setProperty('--foot', `${innerHeight - top}px`);
      }
      if (since > DRIVE_AT && win < 0) leave();   // not while you're reading a window
      ctx.ink.render(scene, camera, null);   // no taxi in this shot: just the grain and vignette
    },
    dispose() { disposeScene(scene); },
  };
}
