// Shared by every scene: small helpers, the stroke map, the taxi, its ink outline, and the passenger.
import * as THREE from 'three';
import { LIVERY, TAXI, UTIL } from './style.js';

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (k, dt) => 1 - Math.exp(-k * dt);
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export const loadImg = url => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
export const tex = src => { const t = new THREE.Texture(src); t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; };

// the stroke map: a high-pass of the lit painting's brightness, so bright strokes catch the light first
export function strokeMap(src, W, H) {
  const a = mkCanvas(W, H), ax = a.getContext('2d'); ax.drawImage(src, 0, 0, W, H);
  const m = mkCanvas(W >> 2, H >> 2); m.getContext('2d').drawImage(a, 0, 0, m.width, m.height);
  const s = mkCanvas(W >> 4, H >> 4); s.getContext('2d').drawImage(m, 0, 0, s.width, s.height);
  const b = mkCanvas(W, H); b.getContext('2d').drawImage(s, 0, 0, W, H);
  const A = ax.getImageData(0, 0, W, H), B = b.getContext('2d').getImageData(0, 0, W, H).data, d = A.data;
  for (let i = 0; i < d.length; i += 4) { const v = clamp(128 + ((d[i] + d[i + 1] + d[i + 2]) - (B[i] + B[i + 1] + B[i + 2])), 0, 255); d[i] = d[i + 1] = d[i + 2] = v; }
  ax.putImageData(A, 0, 0); return a;
}

export const NOISE = /* glsl */`
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h12(i), h12(i+vec2(1,0)), f.x), mix(h12(i+vec2(0,1)), h12(i+vec2(1,1)), f.x), f.y); }`;

/* ---------- the taxi: a modified 80s hatchback, painted two-tone, inked ---------- */
// Livery is a guess: black body, yellow roof. The colours live in style.js.
export { LIVERY };
// jeep -> hang (the seesaw pivot, just behind the front axle) -> body. Every mesh goes in parts and on layer 1 for the ink pass.
export function colorize(g, hex, emit = 0) {
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3), e = new Float32Array(n).fill(emit);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.setAttribute('emit', new THREE.BufferAttribute(e, 1)); return g;
}
export function makeTaxi(uMode) {
  const jeepMat = new THREE.ShaderMaterial({
    uniforms: { uL: { value: .3 }, uMode },
    vertexShader: /* glsl */`
      attribute vec3 color; attribute float emit; varying vec3 vC; varying vec3 vN; varying float vE; varying vec3 vP;
      void main(){ vC = color; vE = emit; vP = position; vN = normalize(mat3(modelViewMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: /* glsl */`
      uniform float uL, uMode; varying vec3 vC; varying vec3 vN; varying float vE; varying vec3 vP;
      void main(){
        vec3 n = normalize(vN);
        if (vE > .5 && vE < 1.5) { gl_FragColor = vec4(vC * 1.08, 1.); return; }
        float k = dot(n, normalize(vec3(-.4, .7, .6)));
        float lit = step(.15, k * (.45 + uL)) * clamp(uL, .25, 1.);
        if (uMode > 1.5) lit = step(-.25, k);       // lit painting: the car in full daylight colour
        else if (uMode > .5) lit = 0.;             // dark painting: the car fully in night tones
        vec3 col = mix(vC * vec3(.30, .34, .52), vC * vec3(1.03, .96, .86), lit);
        col += vec3(.05, .06, .1) * step(.72, n.y);
        col += vec3(.035, .04, .06) + vec3(.09, .11, .18) * smoothstep(.45, .8, 1. - abs(n.z));
        if (vE > 1.5) {
          float streak = step(.8, fract((vP.x * 1.3 + vP.y * 2.4) * 1.2));
          col = mix(vec3(.07, .09, .15), vec3(.36, .43, .56), streak * .55 + step(.55, n.y) * .18 + lit * .12);
        }
        gl_FragColor = vec4(col, 1.);
      }`,
  });

  // jeep -> hang (the seesaw pivot, on the lip just behind the front axle) -> body
  const PIVOT = new THREE.Vector3(.55, .2, 0);
  const jeep = new THREE.Group(), hang = new THREE.Group(), body = new THREE.Group();
  jeep.add(hang); hang.add(body); hang.position.copy(PIVOT); body.position.copy(PIVOT).negate();
  const parts = [];
  const put = (geo, hex, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, emit = 0 } = {}, parent = body) => {
    geo.rotateX(rx); geo.rotateY(ry); geo.rotateZ(rz); geo.translate(x, y, z);
    const m = new THREE.Mesh(colorize(geo, hex, emit), jeepMat); parent.add(m); parts.push(m); return m;
  };
  const extrude = (pts, depth, bevel) => {
    const sh = new THREE.Shape(); sh.moveTo(...pts[0]); for (const p of pts.slice(1)) sh.lineTo(...p); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 6 });
    g.translate(0, 0, -depth / 2); return g;
  };
  // lower body: short sloping bonnet, flat sides, near-vertical hatch
  put(extrude([[-1.62, .24], [-1.66, .52], [-1.62, .84], [.95, .88], [1.56, .74], [1.64, .66], [1.64, .3], [1.58, .24]], 1.36, .06), LIVERY.body);
  // cabin: tall glasshouse, slight tumblehome
  put(extrude([[-1.55, .84], [-1.46, 1.34], [-1.38, 1.39], [.4, 1.39], [.5, 1.33], [.96, .88]], 1.18, .045), LIVERY.body);
  put(new THREE.BoxGeometry(1.66, .03, 1.1), LIVERY.roof, { x: -.49, y: 1.445 });
  // glass
  for (const sgn of [-1, 1]) {
    put(extrude([[-1.38, .93], [-1.32, 1.3], [.37, 1.31], [.84, .93]], .01, .004), TAXI.glass, { z: sgn * .64, emit: 2 });
    put(new THREE.BoxGeometry(.07, .42, .025), LIVERY.body, { x: -.36, y: 1.12, z: sgn * .65 });
    put(new THREE.BoxGeometry(.06, .4, .025), LIVERY.body, { x: -1.0, y: 1.12, z: sgn * .65 });
  }
  put(new THREE.BoxGeometry(.02, .6, 1.08), TAXI.glass, { x: .73, y: 1.12, rz: .82, emit: 2 });
  put(new THREE.BoxGeometry(.02, .41, 1.08), TAXI.glass, { x: -1.53, y: 1.12, rz: -.22, emit: 2 });
  // the sound system, visible through the hatch glass
  for (const zz of [-.3, .3]) {
    put(new THREE.CylinderGeometry(.11, .11, .02, 18), TAXI.speaker, { x: -1.56, y: 1.0, z: zz, rz: Math.PI / 2 });
    put(new THREE.CylinderGeometry(.045, .045, .025, 12), TAXI.speakerCone, { x: -1.565, y: 1.0, z: zz, rz: Math.PI / 2 });
  }
  // lamps, grille, bumpers, yellow commercial plates
  for (const sgn of [-1, 1]) {
    put(new THREE.BoxGeometry(.03, .14, .3), TAXI.headlamp, { x: 1.69, y: .62, z: sgn * .46, emit: 1 });
    put(new THREE.BoxGeometry(.03, .07, .1), TAXI.indicator, { x: 1.68, y: .49, z: sgn * .6 });
    put(new THREE.BoxGeometry(.03, .26, .15), TAXI.taillamp, { x: -1.69, y: .66, z: sgn * .58, emit: 1 });
    put(new THREE.BoxGeometry(.06, .08, .13), LIVERY.body, { x: .86, y: .98, z: sgn * .76 });
    put(new THREE.BoxGeometry(.014, .48, .014), TAXI.pillar, { x: -.36, y: .6, z: sgn * .755 });
    put(new THREE.BoxGeometry(.014, .48, .014), TAXI.pillar, { x: .9, y: .6, z: sgn * .755 });
    put(new THREE.BoxGeometry(.1, .025, .02), TAXI.handle, { x: -.46, y: .78, z: sgn * .76 });
  }
  put(new THREE.BoxGeometry(.02, .08, .6), TAXI.grille, { x: 1.7, y: .6 });
  put(new THREE.BoxGeometry(.12, .14, 1.46), TAXI.bumper, { x: 1.69, y: .32 });
  put(new THREE.BoxGeometry(.12, .14, 1.46), TAXI.bumper, { x: -1.69, y: .32 });
  put(new THREE.BoxGeometry(.02, .12, .42), TAXI.plate, { x: 1.76, y: .42 });
  put(new THREE.BoxGeometry(.02, .12, .42), TAXI.plate, { x: -1.76, y: .5 });
  put(new THREE.CylinderGeometry(.006, .006, .75, 4), TAXI.aerial, { x: .7, y: 1.25, z: .66, rz: .35 });
  // wider aftermarket tyres sticking out of the arches, dark alloys with a chrome lip
  for (const [x, sgn] of [[1.07, 1], [1.07, -1], [-1.07, 1], [-1.07, -1]]) {
    put(new THREE.CylinderGeometry(.33, .33, .02, 20), TAXI.tyre, { x, y: .3, z: sgn * .752, rx: Math.PI / 2 });
    put(new THREE.TorusGeometry(.34, .04, 6, 18, Math.PI), TAXI.grille, { x, y: .3, z: sgn * .76 });
    put(new THREE.CylinderGeometry(.29, .29, .28, 20), TAXI.wheel, { x, y: .29, z: sgn * .72, rx: Math.PI / 2 });
    put(new THREE.CylinderGeometry(.18, .18, .29, 16), TAXI.alloy, { x, y: .29, z: sgn * .72, rx: Math.PI / 2 });
    put(new THREE.TorusGeometry(.18, .016, 6, 20), TAXI.alloyLip, { x, y: .29, z: sgn * .867 });
    put(new THREE.CylinderGeometry(.05, .05, .3, 8), TAXI.hub, { x, y: .29, z: sgn * .72, rx: Math.PI / 2 });
  }
  for (const m of parts) m.layers.enable(1);
  return { jeep, hang, body, parts, put, jeepMat, PIVOT };
}

/* ---------- ink + paper rim around the taxi, plus grain and vignette over the whole frame ---------- */
// One per page. The full ink (edge detection on the taxi's normals) only runs inside the taxi's bounding box on screen.
const infoMat = new THREE.ShaderMaterial({ vertexShader: 'varying vec3 vN; void main(){ vN = normalize(mat3(modelViewMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }', fragmentShader: 'varying vec3 vN; void main(){ gl_FragColor = vec4(normalize(vN) * .5 + .5, 1.); }' });
const box3 = new THREE.Box3(), corner = new THREE.Vector3();
export class Ink {
  constructor(renderer, lowEnd) {
    this.renderer = renderer;
    this.rtColor = new THREE.WebGLRenderTarget(1, 1, { samples: lowEnd ? 0 : 4 });   // phones: no MSAA, the ink hides the edges
    this.rtInfo = new THREE.WebGLRenderTarget(1, 1);
    this.uniforms = { tColor: { value: this.rtColor.texture }, tInfo: { value: this.rtInfo.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uBoil: { value: 1 }, uJeepScale: { value: .7 }, uBox: { value: new THREE.Vector4(2, 2, -1, -1) },
      uLift: { value: new THREE.Vector3(0, 0, 0) }, uGamma: { value: new THREE.Vector3(1, 1, 1) }, uGain: { value: new THREE.Vector3(1, 1, 1) }, uSat: { value: 1 } };
    this.mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: NOISE + /* glsl */`
        uniform sampler2D tColor, tInfo; uniform vec2 uRes; uniform float uTime, uBoil, uJeepScale, uSat; uniform vec4 uBox; uniform vec3 uLift, uGamma, uGain; varying vec2 vUv;
        float maskAt(vec2 uv){ return texture2D(tInfo, uv).a; }
        vec2 PX;
        const vec2 DIRS[8] = vec2[8](vec2(1, 0), vec2(.7071, .7071), vec2(0, 1), vec2(-.7071, .7071), vec2(-1, 0), vec2(-.7071, -.7071), vec2(0, -1), vec2(.7071, -.7071));
        float edgeAt(vec2 uv, float r){
          vec4 c = texture2D(tInfo, uv); float ring = 0., dn = 0.;
          for (int i = 0; i < 8; i++) {
            vec4 s = texture2D(tInfo, uv + DIRS[i] * r * PX);
            ring = max(ring, s.a); if (s.a > .5 && c.a > .5) dn = max(dn, length(s.rgb - c.rgb));
          }
          return max(step(.5, ring) * (1. - step(.5, c.a)), step(.4, dn));
        }
        void main(){
          PX = 1. / uRes;
          vec3 col = texture2D(tColor, vUv).rgb;
          // only near the taxi: the boiling line and the colour printed a touch out of register
          if (all(greaterThan(vUv, uBox.xy)) && all(lessThan(vUv, uBox.zw))) {
            float frame = floor(uTime * 8.) * uBoil;
            float base = max(1.6, uRes.y / 520.) * mix(1., 1.8, uJeepScale);
            vec2 w1 = (vec2(vn2(vUv * 45. + frame * 3.1), vn2(vUv * 45. + 17. + frame * 5.3)) - .5) * 2.2 * PX * (.4 + uBoil);
            float e1 = edgeAt(vUv + w1, base * (.5 + 1.1 * vn2(vUv * 60. + 3.)));
            vec2 w2 = (vec2(vn2(vUv * 11. + 40. + frame * 2.), vn2(vUv * 11. + 90. + frame * 1.7)) - .5) * 10. * PX;
            float e2 = edgeAt(vUv + w2, base * .55) * step(.42, vn2(vUv * 26. + frame * 1.3));
            float ink = max(e1 * step(.14, vn2(vUv * 130. + frame)), e2 * .85);
            vec2 sh = vec2(2.6, -2.1) * PX * mix(.8, 1.7, uJeepScale);
            if (maskAt(vUv - sh) > .5) col = texture2D(tColor, vUv - sh).rgb;
            col = mix(col, vec3(.07, .075, .1), ink);
          }
          // the scene's grade (fitted to the edge painting: see STYLE.md and shared/grade.js)
          col = uLift + (uGain - uLift) * pow(clamp(col, 0., 1.), uGamma);
          col = mix(vec3(dot(col, vec3(.299, .587, .114))), col, uSat);
          // the shared paper grain: a soft fibre at a fixed screen scale plus a fine tooth, the same strength everywhere
          vec2 g = gl_FragCoord.xy / max(1., uRes.y / 900.);
          float fibre = vn2(g * vec2(.09, .5)) * .6 + vn2(g * vec2(.5, .09)) * .4;
          col *= 1. + (fibre - .5) * .05 + (h12(g) - .5) * .035;
          vec2 q = vUv - .5; col *= 1. - dot(q, q) * .4;
          gl_FragColor = vec4(col, 1.);
        }`,
    });
    this.post = new THREE.Scene(); this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.post.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat));
  }
  // [lift r,g,b, gamma r,g,b, gain r,g,b, saturation], from shared/grade.js
  setGrade(p = [0, 0, 0, 1, 1, 1, 1, 1, 1, 1]) { const u = this.uniforms; u.uLift.value.fromArray(p, 0); u.uGamma.value.fromArray(p, 3); u.uGain.value.fromArray(p, 6); u.uSat.value = p[9]; }
  resize(pw, ph) { this.rtColor.setSize(pw, ph); this.rtInfo.setSize(pw, ph); this.uniforms.uRes.value.set(pw, ph); }
  // taxi: the jeep group, or null when there's no taxi in the shot
  render(scene, camera, taxi, clear = UTIL.clear) {
    const r = this.renderer, B = this.uniforms.uBox.value;
    B.set(2, 2, -1, -1);
    if (taxi && taxi.visible) {
      box3.setFromObject(taxi);
      if (!box3.isEmpty()) {
        let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
        for (let i = 0; i < 8; i++) {
          corner.set(i & 1 ? box3.max.x : box3.min.x, i & 2 ? box3.max.y : box3.min.y, i & 4 ? box3.max.z : box3.min.z).project(camera);
          const u = corner.x * .5 + .5, v = corner.y * .5 + .5;
          x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v);
        }
        const m = 24 / this.uniforms.uRes.value.y;   // a little margin for the line and its wobble
        B.set(x0 - m, y0 - m, x1 + m, y1 + m);
        // info pass: just the taxi (layer 1), normals in rgb, coverage in alpha
        scene.overrideMaterial = infoMat; camera.layers.set(1);
        r.setRenderTarget(this.rtInfo); r.setClearColor(UTIL.infoClear, 0); r.clear(); r.render(scene, camera);
        scene.overrideMaterial = null; camera.layers.set(0);
      }
    }
    r.setRenderTarget(this.rtColor); r.setClearColor(clear, 1); r.clear(); r.render(scene, camera);
    r.setRenderTarget(null); r.render(this.post, this.postCam);
  }
}

/* ---------- the passenger: picked at the stand, remembered next to the banked wish ---------- */
const ROSTER = window.HAIRPIN_ROSTER || { beats: {}, people: [] };   // shared/roster.js
export const roster = ROSTER;
export function passenger() { let id = null; try { id = localStorage.getItem('hairpin.passenger'); } catch (e) {} return ROSTER.people.find(p => p.id === id && p.on) || null; }
export function pick(id) { try { localStorage.setItem('hairpin.passenger', id); } catch (e) {} }
// a subtitle's label: PASSENGER becomes their first name once someone's riding
export const who = label => { const p = label === 'PASSENGER' && passenger(); return p ? p.first.toUpperCase() : label; };
// their own line at a beat: { who, expr, text }, or null with nobody picked
export function line(beat) { const p = passenger(), l = p && p.lines[beat]; return l ? { who: p.first.toUpperCase(), expr: l[0], text: l[1] } : null; }

// free a scene's GPU memory when it's swapped out: geometry, materials and their textures
export function disposeScene(scene) {
  scene.traverse(o => {
    o.geometry?.dispose();
    for (const m of [].concat(o.material || [])) { for (const v of Object.values(m.uniforms || {})) v.value?.isTexture && v.value.dispose(); m.map?.dispose(); m.dispose(); }
  });
}

/* ---------- the stage: every painting becomes 2.5D ---------- */
// The painting is a subdivided plane whose vertices are pushed toward the camera along their own sight line, by their depth
// (<scene>/depth.png, near = white). Seen from the rest pose the picture is pixel-identical to the flat painting, so the
// reveal, the stroke map and every placement stay registered; move the camera and the depth shows as real parallax.
// People, the taxi and the truck are placed through the same transform, by the depth at their feet, so they stay planted.
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const _v = new THREE.Vector3(), _r = new THREE.Raycaster(), _pl = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), _n2 = new THREE.Vector2();
export class Stage {
  // k: how far toward the camera the nearest thing comes (a fraction of the distance). Keep it modest: big steps stretch.
  constructor({ W, H, depth, k = .28, fov = 24 }) {
    Object.assign(this, { W, H, k, fov });
    this.cam = new THREE.PerspectiveCamera(fov, 1, 1, 1e5);
    this.rest = new THREE.Vector3(W / 2, -H / 2, 1000);
    this.move = { dx: 0, dy: 0, dolly: 0, yaw: 0, pitch: 0 };   // current camera offset from rest (eased toward target)
    this.target = { ...this.move };
    // the depth, on the GPU for the mesh and on the CPU for placing things (a quarter-size copy is plenty)
    this.tDepth = tex(depth);
    const w = Math.max(1, W >> 2), h = Math.max(1, H >> 2), c = mkCanvas(w, h), x = c.getContext('2d');
    x.drawImage(depth, 0, 0, w, h);
    const px = x.getImageData(0, 0, w, h).data;
    this.dW = w; this.dH = h; this.dep = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) this.dep[i] = px[i * 4] / 255;
    this.uniforms = { tDepth: { value: this.tDepth }, uRest: { value: this.rest }, uK: { value: k } };
  }
  // the vertex shader for a painting mesh: vPx is the painting pixel, whatever the depth does to the position
  static VERT = /* glsl */`
    uniform sampler2D tDepth; uniform vec3 uRest; uniform float uK; uniform vec2 uImg; varying vec2 vPx;
    void main(){
      vPx = vec2(uv.x, 1. - uv.y) * uImg;
      float d = texture2D(tDepth, uv).r;
      vec3 P = uRest + (vec3(vPx.x, -vPx.y, 0.) - uRest) * (1. - uK * d);
      gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.);
    }`;
  // the painting mesh: drawn first, behind everything (its depth would only clip feet)
  mesh(material, segs = [256, 128]) {
    Object.assign(material.uniforms, this.uniforms);
    material.vertexShader = Stage.VERT; material.depthTest = false; material.depthWrite = false;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, ...segs), material);
    m.frustumCulled = false; m.renderOrder = -10; return m;
  }
  depthAt(x, y) {   // bilinear, in painting px
    const fx = clamp(x / this.W * this.dW - .5, 0, this.dW - 1.001), fy = clamp(y / this.H * this.dH - .5, 0, this.dH - 1.001);
    const i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, w = this.dW, d = this.dep;
    return lerp(lerp(d[j * w + i], d[j * w + i + 1], u), lerp(d[(j + 1) * w + i], d[(j + 1) * w + i + 1], u), v);
  }
  shrink(d) { return 1 - this.k * d; }
  // a painting point (px) at depth d, in the world
  toWorld(x, y, d = this.depthAt(x, y), out = _v) {
    const s = this.shrink(d), R = this.rest;
    return out.set(R.x + (x - R.x) * s, R.y + (-y - R.y) * s, R.z * (1 - s));
  }
  // put an object at a painting point, by the depth there (or d), its size (scalar or [w, h]) scaled to match
  place(obj, x, y, size, d = this.depthAt(x, y)) {
    const s = this.shrink(d);
    obj.position.copy(this.toWorld(x, y, d));
    if (Array.isArray(size)) obj.scale.set(size[0] * s, size[1] * s, 1); else if (size != null) obj.scale.setScalar(size * s);
    return s;
  }
  // a world point back to the painting pixel it sits over, seen from the rest pose
  toPaint(P) { const R = this.rest, f = R.z / (R.z - P.z); return [R.x + (P.x - R.x) * f, -(R.y + (P.y - R.y) * f)]; }
  // the screen (css px) to the painting, through the moving camera onto the far plane
  screenToPaint(sx, sy) {
    _n2.set(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1); _r.setFromCamera(_n2, this.cam);
    return _r.ray.intersectPlane(_pl, _v) ? [_v.x, -_v.y] : null;
  }
  // the rest framing: centred on painting px (cx, cy), showing viewH of it on screen
  view(cx, cy, viewH, aspect) {
    const D = viewH / 2 / Math.tan(this.fov * Math.PI / 360);
    this.rest.set(cx, -cy, D); this.cam.aspect = aspect; this.cam.near = D * .05; this.cam.far = D * 4;
    this.cam.updateProjectionMatrix(); this.apply();
  }
  // ease the camera toward its target move: dx, dy in painting px, dolly a fraction of the distance, yaw/pitch radians
  update(dt, rate = .9) {
    const k = damp(rate, dt), m = REDUCED ? .35 : 1;
    for (const key in this.move) this.move[key] = lerp(this.move[key], this.target[key] * m, k);
    this.apply();
  }
  apply() {
    const R = this.rest, m = this.move;
    this.cam.position.set(R.x + m.dx, R.y - m.dy, R.z * (1 - m.dolly));
    this.cam.rotation.set(m.pitch, m.yaw, 0);
    this.cam.updateMatrixWorld();
  }
}
