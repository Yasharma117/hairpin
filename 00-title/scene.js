// The title: the night before the story starts, at the same Jorabat stall the stand opens on (13-the-stand's painting,
// so the title costs no extra download and Play hands off to the same place under the sheet). The last taxi idles with
// its lights on, you wait by its tail under the stall's bulb, the stars twinkle, fireflies blink in the grass, and now
// and then a star falls (the wish, foreshadowed). The camera drifts slowly and leans toward the pointer; the depth map
// gives the drift real parallax. Everything lands on the frame's pixel grid (Ink). No input of its own: the card is on top.
import * as THREE from 'three';
import { clamp, sstep, mkCanvas, loadImg, tex, strokeMap, makeTaxi, disposeScene, Stage, keyLight } from '../shared/kit.js';
import { Ink } from '../shared/kit.js';
import { PALETTE, UI } from '../shared/style.js';
import * as folk from '../shared/folk.js';

const at = f => new URL(f, import.meta.url).href;
export const assets = ['../13-the-stand/jorabat-dark.jpg', '../13-the-stand/depth.png'];   // the stand's: already prefetched

const IW = 1774, IH = 887;
const TAXI = [.2 * IW, .775 * IH], TAXI_K = 32, YOU = [-76, 9];   // as at the stand (13-the-stand/scene.js)
const BULB = [.165 * IW, .524 * IH], LAMP = [.277 * IW, .289 * IH];   // the stall's bulb, the street lamp's head
// where the sky is: above this ridge line (fractions of the painting), so stars never sit on the trees or the hills
const RIDGE = [[0, -1], [.24, -1], [.27, .13], [.31, .17], [.46, .16], [.53, .21], [.59, .28], [.67, .3], [.8, .31], [1, .31]];
const ridgeAt = x => { for (let i = 1; i < RIDGE.length; i++) if (x <= RIDGE[i][0]) { const [a, b] = [RIDGE[i - 1], RIDGE[i]]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return .31; };
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function load(ctx) {
  const { U: { uMode } } = ctx;
  const [iDark, depthImg] = await Promise.all(assets.map(a => loadImg(at(a))));
  if (!iDark || !depthImg) throw new Error('the title painting did not load');
  const stage = new Stage({ W: IW, H: IH, depth: depthImg, k: .3 });
  // the stand's stand-in for the lit painting: the dark one, lifted warm (13-the-stand/scene.js warmLift)
  const lift = mkCanvas(IW, IH), lx = lift.getContext('2d'); lx.drawImage(iDark, 0, 0, IW, IH);
  { const A = lx.getImageData(0, 0, IW, IH), d = A.data;
    for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; d[i] = Math.min(255, d[i] * 1.5 + l * 1.3); d[i + 1] = Math.min(255, d[i + 1] * 1.6 + l * .9); d[i + 2] = Math.min(255, d[i + 2] * .9 + l * .2); }
    lx.putImageData(A, 0, 0); }
  const U = {
    tLit: { value: tex(lift) }, tDark: { value: tex(iDark) }, tStroke: { value: tex(strokeMap(lift, IW, IH)) },
    uImg: { value: new THREE.Vector2(IW, IH) }, uHead: { value: new THREE.Vector2() }, uDir: { value: new THREE.Vector2(1, -.07).normalize() },
    uLamp: { value: [new THREE.Vector2(.165 * IW, .6 * IH), new THREE.Vector2(.27 * IW, .64 * IH)] }, uBulb: { value: 1 }, uMode,
  };
  const scene = new THREE.Scene(), camera = stage.cam;
  scene.add(stage.mesh(new THREE.ShaderMaterial({
    uniforms: U,
    fragmentShader: /* glsl */`
      uniform sampler2D tLit, tDark, tStroke; uniform vec2 uImg, uHead, uDir, uLamp[2]; uniform float uMode, uBulb;
      varying vec2 vPx;
      float coneAt(vec2 p){
        vec2 v = p - uHead; float along = dot(v, uDir); float perp = length(v - uDir * along);
        return step(0., along) * (1. - smoothstep(along * .08, along * .4 + 30., perp)) * (1. - smoothstep(150., 1100., along)) * smoothstep(.63 * uImg.y, .7 * uImg.y, p.y);   // on the road and the verge, not up the bushes (the type sits there)
      }
      void main(){
        vec2 uv = vec2(vPx.x / uImg.x, 1. - vPx.y / uImg.y);
        float L = coneAt(vPx) * 1.4;
        for (int i = 0; i < 2; i++) L += (1. - smoothstep(30., 190., length((vPx - uLamp[i]) * vec2(1., 2.2)))) * .9 * (i == 0 ? uBulb : 1.);
        float t = .22 + .6 * (1. - texture2D(tStroke, uv).r);
        float on = uMode > 1.5 ? 1. : (uMode > .5 ? 0. : smoothstep(t - .3, t + .3, L));
        gl_FragColor = vec4(mix(texture2D(tDark, uv).rgb, texture2D(tLit, uv).rgb * vec3(1.05, .97, .86), on), 1.);
      }`,
  })));

  /* ---------- the taxi, idling, and you by its tail ---------- */
  const taxi = makeTaxi(uMode);
  taxi.jeep.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), .42).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), .06));
  scene.add(taxi.jeep);
  const me = folk.person('you', { size: 'near' });
  me.mesh.renderOrder = 5; me.mesh.material.depthTest = false;
  me.face('right'); me.play('idle'); scene.add(me.obj);

  /* ---------- the little lights: stars, fireflies, the bulb and the lamp, a falling star. Pixel art, 1 or a 3 px plus ---------- */
  // kind 0 star (twinkles, sometimes flares), 1 firefly (blinks, drifts), 2 falling star (set from here), 3 a lamp (always lit)
  const col = h => new THREE.Color(h);
  const stars = [], flies = [], METEOR = 6;
  { // stars only where the painting is sky, a little below the top, never on the ridge
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let n = 0; stars.length < 46 && n < 2000; n++) {
      const x = rnd(), y = .015 + rnd() * .3;
      if (y < ridgeAt(x) - .025) stars.push([x * IW, y * IH, rnd()]);
    }
    for (let i = 0; i < 16; i++) {   // the roadside bushes, and the grass in front
      const near = i % 3 === 0;
      flies.push({ x: (.3 + rnd() * .68) * IW, y: (near ? .86 + rnd() * .08 : .55 + rnd() * .07) * IH, p: rnd(), r: 8 + rnd() * 18 });
    }
  }
  const lamps = [BULB, LAMP];
  const N = stars.length + flies.length + METEOR + lamps.length;
  const pos = new Float32Array(N * 3), kind = new Float32Array(N), phase = new Float32Array(N), cols = new Float32Array(N * 3), on = new Float32Array(N).fill(1);
  let k = 0;
  const add = (kd, ph, c) => { kind[k] = kd; phase[k] = ph; c.toArray(cols, k * 3); return k++; };
  const starAt = stars.map(([, , r]) => add(0, r, col(r > .7 ? PALETTE.amber : r > .3 ? PALETTE.paper : PALETTE.mist)));
  const flyAt = flies.map(f => add(1, f.p, col(PALETTE.amber)));
  const tail = [UI.cream, PALETTE.paper, PALETTE.amber, PALETTE.gold, PALETTE.cloud, PALETTE.ridge];
  const meteorAt = tail.map(h => add(2, 0, col(h)));
  const lampAt = lamps.map(() => add(3, 0, col(UI.cream)));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1)); geo.setAttribute('aCol', new THREE.BufferAttribute(cols, 3)); geo.setAttribute('aOn', new THREE.BufferAttribute(on, 1));
  const PU = { uTime: { value: 0 }, uTwinkle: { value: REDUCED ? 0 : 1 }, uDim: { value: col(PALETTE.cloud) }, uArm: { value: col(PALETTE.gold) }, uLampArm: { value: col(PALETTE.amber) } };
  const dots = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: PU, depthWrite: false,
    vertexShader: /* glsl */`
      attribute float aKind, aPhase, aOn; attribute vec3 aCol; uniform float uTime, uTwinkle; varying vec3 vC; varying float vK, vB;
      void main(){
        float b = aOn;
        if (aKind < .5) {          // a star: dim, on, or a flare, in steps (never a smooth fade: pixel art)
          float s = sin(uTime * (.5 + fract(aPhase * 7.) * 1.3) + aPhase * 6.283) * uTwinkle;
          b = s > .93 ? 2. : s > -.55 ? 1. : .5;
        } else if (aKind < 1.5) {  // a firefly: off most of the time, then a slow blink with a flare at its peak
          float s = sin(uTime * (.7 + fract(aPhase * 3.) * .9) + aPhase * 6.283);
          b = uTwinkle < .5 ? 1. : s > .8 ? 2. : s > .35 ? 1. : 0.;
        } else if (aKind > 2.5) b = 2.;
        vC = aCol; vK = aKind; vB = b;
        gl_PointSize = b > 1.5 ? 3. : 1.;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uDim, uArm, uLampArm; varying vec3 vC; varying float vK, vB;
      void main(){
        if (vB < .25) discard;
        vec3 c = vB < .75 ? uDim : vC;
        if (vB > 1.5) {   // a 3 px plus: the bright core, arms a step down
          vec2 q = floor(gl_PointCoord * 3.);
          bool core = q.x == 1. && q.y == 1., arm = q.x == 1. || q.y == 1.;
          if (!arm) discard;
          if (!core) c = vK > 2.5 ? uLampArm : vK < .5 ? vC * .8 + uDim * .2 : uArm;
        }
        gl_FragColor = vec4(c, 1.);
      }`,
  }));
  dots.frustumCulled = false; dots.layers.set(Ink.PIXEL_ART_LAYER);
  scene.add(dots);
  const V = new THREE.Vector3();
  const setPos = (i, x, y, d = stage.depthAt(x, y)) => { stage.toWorld(x, y, d, V); pos[i * 3] = V.x; pos[i * 3 + 1] = V.y; pos[i * 3 + 2] = V.z + 1; };
  starAt.forEach((i, j) => setPos(i, stars[j][0], stars[j][1], 0));
  lampAt.forEach((i, j) => setPos(i, lamps[j][0], lamps[j][1]));

  /* ---------- framing: the diorama low and left, the type's room up and right (phones: the type on top, it below) ---------- */
  let ppf = 3, narrow = false;
  const P = ([dx, dy]) => [TAXI[0] + dx * ppf, TAXI[1] + dy * ppf];
  function resize(w, h) {
    const aspect = w / h; narrow = aspect < 1;
    const viewH = narrow ? IH : Math.min(IH * .9, IW / aspect), viewW = viewH * aspect;
    ppf = viewH / ctx.ink.size.y;
    stage.place(taxi.jeep, TAXI[0], TAXI[1], TAXI_K * ppf, stage.depthAt(TAXI[0], TAXI[1] + 14));
    U.uHead.value.set(TAXI[0] + 1.69 * TAXI_K * ppf, TAXI[1] - 20 * ppf);
    // phones: the stall, you and the taxi across the middle; wide screens: they sit in the left third, the road runs right
    const mid = narrow ? (P(YOU)[0] + TAXI[0] + 1.8 * TAXI_K * ppf) / 2 : 0;
    const cx = narrow ? clamp(mid, viewW / 2, IW - viewW / 2) : clamp(viewW / 2 + .02 * IW, viewW / 2, IW - viewW / 2);
    const cy = IH - viewH / 2;
    stage.view(cx, cy, viewH, aspect);
    keyLight(taxi.jeepMat, camera, taxi.jeep.position, stage.toWorld(BULB[0], BULB[1], stage.depthAt(BULB[0], .66 * IH), new THREE.Vector3()), .55);
    lampAt.forEach((i, j) => setPos(i, lamps[j][0], lamps[j][1]));
    starAt.forEach((i, j) => setPos(i, stars[j][0], stars[j][1], 0));
  }

  /* ---------- pin a person to the frame's grid, 1 sprite px = 1 frame px (as the stand does) ---------- */
  const tanH = () => Math.tan(stage.fov * Math.PI / 360);
  function pin(p, x, y) {
    const grid = ctx.ink.size; stage.toWorld(x, y, stage.depthAt(x, y), V).project(camera);
    V.x = (Math.floor((V.x * .5 + .5) * grid.x) + .5) / grid.x * 2 - 1;
    V.y = Math.round((V.y * .5 + .5) * grid.y) / grid.y * 2 - 1;
    V.unproject(camera); p.obj.position.copy(V);
    const u = 2 * (camera.position.z - V.z) * tanH() / grid.y;
    p.obj.scale.set(u * camera.aspect * grid.y / grid.x, u, 1);
  }

  /* ---------- the pointer leans the camera (the card covers the canvas, so listen on the window) ---------- */
  const lean = [0, 0];
  ctx.on(window, 'pointermove', e => { lean[0] = e.clientX / innerWidth - .5; lean[1] = e.clientY / innerHeight - .5; });
  ctx.on(document.documentElement, 'pointerleave', () => { lean[0] = lean[1] = 0; });

  let t = 0, waveT = 0, nextWave = 3.5, meteorT = REDUCED ? Infinity : 4, meteor = null;
  const greet = () => { if (waveT <= 0) { me.play('wave', { restart: true }); waveT = 1.6; } };
  window.__title = { greet, get t() { return t; } };   // for checking
  ctx.bed({ engine: 1, crickets: 1 }); ctx.rpm(0);   // heard only once Play unlocks the sound

  return {
    resize, greet,
    frame(dt) {
      t += dt; PU.uTime.value = t;
      // you wave now and then (and when Play is pointed at)
      if (waveT > 0 && (waveT -= dt) <= 0) { me.play('idle'); nextWave = t + 7 + Math.random() * 5; }
      if (!REDUCED && waveT <= 0 && t > nextWave) greet();
      me.update(dt);
      // the bulb hums: a slow wobble, and a rare dip
      U.uBulb.value = .92 + .08 * Math.sin(t * 2.3) - (Math.sin(t * 7.1) > .985 ? .35 : 0);
      taxi.body.position.y = -taxi.PIVOT.y + Math.sin(t * 13) * .004;
      // fireflies wander a few painting px, each on its own slow loop
      flies.forEach((f, j) => {
        const a = REDUCED ? 0 : t * (.25 + f.p * .2) + f.p * 9;
        setPos(flyAt[j], f.x + Math.sin(a) * f.r, f.y + Math.sin(a * 1.7 + f.p * 4) * f.r * .45);
      });
      // a falling star, every 9 to 15 s: a head and five tail pixels, one frame px apart, across the open sky
      if (!meteor && t > meteorT) {
        const x = (.45 + Math.random() * .4) * IW, y = (.03 + Math.random() * .08) * IH;
        meteor = { x, y, t: 0, dx: -(.55 + Math.random() * .3), dy: .45 };
      }
      if (meteor) {
        meteor.t += dt;
        const go = meteor.t * 260, life = meteor.t < .7;
        meteorAt.forEach((i, j) => {
          const back = j * 2.2 * ppf, sx = meteor.x + meteor.dx * (go - back), sy = meteor.y + meteor.dy * (go - back);
          on[i] = life && go > back && sy < ridgeAt(sx / IW) * IH ? 1 : 0;
          setPos(i, sx, sy, 0);
        });
        if (!life) { meteor = null; meteorT = t + 9 + Math.random() * 6; }
        geo.attributes.aOn.needsUpdate = true;
      }
      geo.attributes.position.needsUpdate = true;
      // the camera: a slow drift along the road, and a lean toward the pointer (both small; reduced motion: neither)
      const m = REDUCED ? 0 : 1;
      stage.target.dx = m * (narrow ? .3 : 1) * (Math.sin(t * .09) * .018 * IW + lean[0] * .03 * IW);   // phones: the taxi fills the width
      stage.target.dy = m * lean[1] * .015 * IH;
      stage.target.yaw = m * -lean[0] * .012;
      stage.target.dolly = m * (.03 + .015 * Math.sin(t * .05));
      stage.update(dt, .7);
      const [yx, yy] = P(YOU);
      pin(me, yx, yy);
      me.setLight(.9, 1);
      ctx.ink.render(scene, camera, taxi.jeep);
    },
    dispose() { me.dispose(); disposeScene(scene); delete window.__title; },
  };
}
