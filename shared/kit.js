// Shared by every scene: small helpers, the stroke map, the taxi, its ink outline, and the passenger.
import * as THREE from 'three';
import { LIVERY, TAXI, TRUCK, UTIL, GLSL_PALETTE, PIXEL_PALETTES } from './style.js';

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
export function paintMat(uMode) {
  // Pixel-art shading (PIXEL.md 1): three hard tones (shadow, mid, lit) from a warm key toward the nearest real light (uKey:
  // its direction in view space; uL: how strong), cool navy ambient, a hard moonlit rim along the top edges. No texture
  // and no smooth falloff: those turn into dither noise in the final pass.
  return new THREE.ShaderMaterial({
    uniforms: { uL: { value: .3 }, uKey: { value: new THREE.Vector3(-.4, .7, .6).normalize() }, uMode, uLamp: { value: 1 }, uExposure: { value: 1 } },
    vertexShader: /* glsl */`
      attribute vec3 color; attribute float emit; varying vec3 vC; varying vec3 vN; varying float vE; varying vec3 vP;
      void main(){ vC = color; vE = emit; vP = position; vN = normalize(mat3(modelViewMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: GLSL_PALETTE + /* glsl */`
      uniform float uL, uMode, uLamp, uExposure; uniform vec3 uKey; varying vec3 vC; varying vec3 vN; varying float vE; varying vec3 vP;
      void main(){
        vec3 n = normalize(vN);
        if (vE > .5 && vE < 1.5) { gl_FragColor = vec4(vC * mix(.22, 1.08, uLamp), 1.); return; }   // its own lamps (uLamp: 0 = off)
        float k = dot(n, normalize(uKey)), key = clamp(uL, .2, 1.2);
        // three hard tones: shadow, mid, lit
        float mid = step(-.08, k), lit = step(.42, k) * step(.3, key);
        if (uMode > 1.5) { mid = 1.; lit = step(-.05, k); } else if (uMode > .5) { lit = 0.; }
        vec3 shade = vC * COOL_AMBIENT + C_NIGHT * .5;
        vec3 midC = mix(vC * COOL_AMBIENT * 1.35 + C_RIDGE * .18, vC * WARM_KEY * .72 + C_AMBER * .05, clamp(key * .6, 0., 1.));
        vec3 litC = vC * WARM_KEY * (.5 + key * .3) + C_AMBER * .035 * key;
        vec3 col = mix(mix(shade, midC, mid), litC, lit);
        // the moon on the top edges
        col += C_CLOUD * .35 * step(.75, 1. - abs(n.z)) * step(.2, n.y) * (1. - lit * .6);
        if (vE > 1.5) {   // glass: dark, with a hard streak of reflected sky
          float streak = step(.76, fract((vP.x * 1.3 + vP.y * 2.4) * 1.2));
          col = mix(C_NIGHT * 1.2, C_CLOUD * .85, streak * .5 + step(.55, n.y) * .2 + lit * .1);
        }
        gl_FragColor = vec4(col * uExposure, 1.);   // uExposure: how much of the night it sits in
      }`,
  });
}
// a vehicle's parts: geometry coloured per vertex, all on one painted material, all on layer 1 for the ink pass
function builder(mat, root) {
  const parts = [];
  const put = (geo, hex, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, emit = 0 } = {}, parent = root) => {
    geo.rotateX(rx); geo.rotateY(ry); geo.rotateZ(rz); geo.translate(x, y, z);
    const m = new THREE.Mesh(colorize(geo, hex, emit), mat); parent.add(m); parts.push(m); return m;
  };
  const extrude = (pts, depth, bevel) => {
    const sh = new THREE.Shape(); sh.moveTo(...pts[0]); for (const p of pts.slice(1)) sh.lineTo(...p); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 6 });
    g.translate(0, 0, -depth / 2); return g;
  };
  return { parts, put, extrude };
}
export function makeTaxi(uMode) {
  const jeepMat = paintMat(uMode);
  // jeep -> hang (the seesaw pivot, on the lip just behind the front axle) -> body
  const PIVOT = new THREE.Vector3(.55, .2, 0);
  const jeep = new THREE.Group(), hang = new THREE.Group(), body = new THREE.Group();
  jeep.add(hang); hang.add(body); hang.position.copy(PIVOT); body.position.copy(PIVOT).negate();
  const { parts, put, extrude } = builder(jeepMat, body);
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

// The truck, built like the taxi so the two belong together: same painted material, same line. Nose toward +x, wheels on
// y = 0, about 7.6 long and 3.3 tall (the taxi is 3.4 long). The truck-art bands, posts, eyes and flowers are painted shapes.
export function makeTruck(uMode) {
  const mat = paintMat(uMode), truck = new THREE.Group();
  mat.uniforms.uExposure.value = .72;   // its colours are loud; at night they sit back
  const { parts, put, extrude } = builder(mat, truck);
  const T = TRUCK;
  // chassis, tank, the cab: short rounded bonnet, upright windscreen, a painted crown board over the visor
  put(new THREE.BoxGeometry(7.2, .22, 1.1), T.chassis, { x: -.1, y: .82 });
  put(new THREE.BoxGeometry(1.1, .42, .5), T.tank, { x: .4, y: .7, z: .85 });
  put(extrude([[1.85, .95], [1.85, 3.0], [2.72, 3.0], [2.98, 2.12], [3.6, 2.0], [3.86, 1.75], [3.86, 1.02], [3.74, .92]], 2.16, .08), T.cab);
  put(new THREE.BoxGeometry(1.0, .34, 2.3), T.crown, { x: 2.3, y: 3.22 });
  put(new THREE.BoxGeometry(.95, .08, 2.34), T.band, { x: 2.3, y: 3.05 });
  put(new THREE.BoxGeometry(.42, .08, 2.36), T.crown, { x: 2.86, y: 3.06, rz: -.18 });   // the visor
  put(new THREE.BoxGeometry(.02, .78, 1.9), T.glass, { x: 2.86, y: 2.56, rz: .27, emit: 2 });
  put(new THREE.BoxGeometry(.04, .66, .86), T.green, { x: 3.9, y: 1.42 });            // the painted grille
  for (let i = -3; i <= 3; i++) put(new THREE.BoxGeometry(.05, .6, .025), T.crown, { x: 3.92, y: 1.42, z: i * .11 });
  put(new THREE.BoxGeometry(.2, .3, 2.3), T.band, { x: 3.92, y: .8 });                // bumper, with tassels under it
  T.tassels.forEach((c, i) => [-1, 1].forEach(sgn => put(new THREE.ConeGeometry(.055, .3, 6), c, { x: 3.95, y: .5, z: sgn * (.15 + i * .2) })));
  for (const sgn of [-1, 1]) {
    put(new THREE.CylinderGeometry(.15, .15, .06, 16), T.lamp, { x: 3.88, y: 1.28, z: sgn * .72, rz: Math.PI / 2, emit: 1 });
    put(new THREE.CylinderGeometry(.06, .06, .05, 10), T.crown, { x: 3.86, y: 1.62, z: sgn * .9, rz: Math.PI / 2, emit: 1 });
    put(new THREE.BoxGeometry(.62, .56, .02), T.glass, { x: 2.32, y: 2.5, z: sgn * 1.12, emit: 2 });
    put(new THREE.BoxGeometry(.05, .5, .05), T.mirror, { x: 3.1, y: 2.35, z: sgn * 1.22 });
    put(new THREE.BoxGeometry(.06, .34, .16), T.mirror, { x: 3.1, y: 2.5, z: sgn * 1.3 });
    put(new THREE.TorusGeometry(.66, .09, 6, 18, Math.PI), T.green, { x: 2.65, y: .62, z: sgn * 1.06 });   // front arch
    // an eye on each door
    const eye = (x, y, z) => {
      put(new THREE.CylinderGeometry(.17, .17, .02, 18).scale(1.7, 1, 1), T.eye, { x, y, z, rx: Math.PI / 2 });
      put(new THREE.CylinderGeometry(.09, .09, .02, 14), T.iris, { x, y, z: z + sgn * .01, rx: Math.PI / 2 });
      put(new THREE.CylinderGeometry(.04, .04, .02, 10), T.pupil, { x, y, z: z + sgn * .02, rx: Math.PI / 2 });
    };
    eye(2.32, 1.6, sgn * 1.13);
    // the cargo body's side: painted bands, red posts, a flower or an eye in each yellow panel, the top rail
    const z = sgn * 1.2;
    for (const [y0, y1, c] of [[1.1, 1.45, T.band], [1.45, 1.58, T.post], [1.58, 2.36, T.panel], [2.36, 2.48, T.post], [2.48, 2.8, T.green], [2.8, 2.92, T.post]])
      put(new THREE.BoxGeometry(5.5, y1 - y0, .05), c, { x: -.98, y: (y0 + y1) / 2, z });
    for (let i = 0; i <= 7; i++) put(new THREE.BoxGeometry(.1, 1.86, .08), T.post, { x: -3.7 + i * .78, y: 2.0, z: z + sgn * .02 });
    for (let i = 0; i < 7; i++) {
      const x = -3.31 + i * .78;
      if (i === 0 || i === 6) eye(x, 1.97, z + sgn * .03);
      else {
        put(new THREE.CylinderGeometry(.2, .2, .02, 6), T.flower, { x, y: 1.97, z: z + sgn * .03, rx: Math.PI / 2 });
        put(new THREE.CylinderGeometry(.07, .07, .02, 8), T.crown, { x, y: 1.97, z: z + sgn * .045, rx: Math.PI / 2 });
      }
      put(new THREE.CylinderGeometry(.08, .08, .02, 5), T.flower, { x, y: 1.27, z: z + sgn * .03, rx: Math.PI / 2 });
    }
    // the tarp's ropes, down from the top to the rail
    for (let i = 0; i <= 7; i++) put(new THREE.CylinderGeometry(.018, .018, .5, 4), T.rope, { x: -3.7 + i * .78, y: 2.95, z: z + sgn * .06 });
    put(new THREE.BoxGeometry(.06, .6, .5), T.chassis, { x: -2.95, y: .7, z: sgn * 1.0 });   // mud flap
    put(new THREE.BoxGeometry(.04, .14, .16), T.tail, { x: -3.78, y: 1.0, z: sgn * .95, emit: 1 });
  }
  put(new THREE.BoxGeometry(5.5, .15, 2.45), T.post, { x: -.98, y: 1.03 });   // the bed
  for (const [x, c] of [[-3.73, T.band], [1.76, T.cab]]) put(new THREE.BoxGeometry(.06, 1.82, 2.36), c, { x, y: 2.0 });
  // the tarp: a slack, rounded hump over the load
  put(extrude([[-1.25, 0], [-1.2, .2], [-.9, .34], [0, .38], [.9, .34], [1.2, .2], [1.25, 0]], 5.6, .06), T.tarp, { x: -.98, y: 2.9, ry: Math.PI / 2 });
  // wheels: single at the front, doubled at the back
  for (const [x, zs] of [[2.65, [1.0]], [-2.2, [1.0, .62]]]) for (const sgn of [-1, 1]) for (const zz of zs) {
    put(new THREE.CylinderGeometry(.55, .55, .34, 20), T.tyre, { x, y: .55, z: sgn * zz, rx: Math.PI / 2 });
    if (zz === zs[0]) {
      put(new THREE.CylinderGeometry(.3, .3, .02, 16), T.rim, { x, y: .55, z: sgn * (zz + .18), rx: Math.PI / 2 });
      put(new THREE.CylinderGeometry(.1, .1, .03, 8), T.hub, { x, y: .55, z: sgn * (zz + .19), rx: Math.PI / 2 });
    }
  }
  for (const m of parts) m.layers.enable(1);
  return { truck, mat, parts };
}

/* ---------- the final pass: one pixel grid for the whole frame (PIXEL.md 1) ---------- */
// The scene renders at a low internal resolution (an integer pixel scale, about 270 px tall in landscape, 300 in portrait),
// at 2x that grid and box-filtered down so the paintings don't shimmer. The pixel pass then draws a 1 px line round the
// vehicles (from a normals pass of layer 1), grades, quantizes to the scene's palette (Oklab, shared/style.js
// PIXEL_PALETTES) with a light 4x4 ordered dither only in smooth gradients, and the upscale blows it up with nearest
// filtering, shifted by the camera's sub-pixel remainder (Stage.apply snaps the camera to the grid).
// Pixel art (folk sprites, anything already drawn on the grid) opts out of all of it: put its meshes on
// Ink.PIXEL_ART_LAYER (mesh.layers.enable(Ink.PIXEL_ART_LAYER)) and they're drawn again, at the grid, with their own
// material (so discard gives the silhouette, not the quad), and those pixels come out exactly as the sprite drew them:
// no smoothing, grade, palette, dither or Ink line (a sprite brings its own). Only vehicles (layer 1) hide them there.
export const PIX = { scale: 0, w: 0, h: 0 };   // the current pixel grid, for Stage's snapping
const SS = 2;   // scene supersampling over the pixel grid
const pixelGrid = (pw, ph) => { const s = Math.max(2, Math.round(ph / (ph > pw ? 300 : 270))); return [s, Math.ceil(pw / s), Math.ceil(ph / s)]; };
const DITHER = .45;   // how far from a palette colour the dither reaches (1 = full ordered dither, 0 = none)
const CHROMA = 2;   // Oklab a, b weighed double in the nearest-colour match, as in tools/fit_palette.py: keeps hues apart
const okLab = hex => {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  const [l, m, s] = [[.4122214708, .5363325363, .0514459929], [.2119034982, .6806995451, .1073969566], [.0883024619, .2817188376, .6299787005]].map(r => Math.cbrt(r[0] * c[0] + r[1] * c[1] + r[2] * c[2]));
  return new THREE.Vector3(.2104542553 * l + .7936177850 * m - .0040720468 * s, (1.9779984951 * l - 2.4285922050 * m + .4505937099 * s) * CHROMA, (.0259040371 * l + .7827717662 * m - .8086757660 * s) * CHROMA);
};
const OKLAB_GLSL = /* glsl */`
  vec3 oklab(vec3 c){
    c = mix(c / 12.92, pow((c + .055) / 1.055, vec3(2.4)), step(.04045, c));
    vec3 lms = pow(mat3(.4122214708, .2119034982, .0883024619, .5363325363, .6806995451, .2817188376, .0514459929, .1073969566, .6299787005) * c, vec3(1. / 3.));
    return mat3(.2104542553, 1.9779984951, .0259040371, .7936177850, -2.4285922050, .7827717662, -.0040720468, .4505937099, -.8086757660) * lms;
  }`;
const infoMat = new THREE.ShaderMaterial({ vertexShader: 'varying vec3 vN; void main(){ vN = normalize(mat3(modelViewMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }', fragmentShader: 'varying vec3 vN; void main(){ gl_FragColor = vec4(normalize(vN) * .5 + .5, 1.); }' });
const quad = mat => { const s = new THREE.Scene(); s.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)); return s; };
const VERT = 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }';
const depthMat = new THREE.MeshBasicMaterial({ colorWrite: false });
const noop = () => {};
export class Ink {
  static PIXEL_ART_LAYER = 3;   // 1 is the vehicles
  constructor(renderer) {
    this.renderer = renderer;
    const nearest = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
    this.rtColor = new THREE.WebGLRenderTarget(1, 1);                       // the scene, at SS x the grid (linear: one tap is a 2x2 box)
    this.rtInfo = new THREE.WebGLRenderTarget(1, 1, nearest);              // layer 1's normals and coverage, at the grid
    this.rtArt = new THREE.WebGLRenderTarget(1, 1, nearest);               // the pixel-art layer as drawn, alpha = coverage, at the grid
    this.rtPix = new THREE.WebGLRenderTarget(1, 1, { ...nearest, depthBuffer: false });   // the finished pixel frame
    this.size = new THREE.Vector2(1, 1);   // the pixel grid, in pixels (the scene itself renders at SS x this)
    this.uniforms = {
      tColor: { value: this.rtColor.texture }, tInfo: { value: this.rtInfo.texture }, tArt: { value: this.rtArt.texture }, uLow: { value: this.size }, uAnchor: { value: new THREE.Vector2() },
      uLift: { value: new THREE.Vector3(0, 0, 0) }, uGamma: { value: new THREE.Vector3(1, 1, 1) }, uGain: { value: new THREE.Vector3(1, 1, 1) }, uSat: { value: 1 },
      uPal: { value: Array.from({ length: 32 }, () => new THREE.Vector3()) }, uLab: { value: Array.from({ length: 32 }, () => new THREE.Vector3()) }, uN: { value: 0 }, uDither: { value: DITHER },
    };
    this.post = quad(new THREE.ShaderMaterial({
      uniforms: this.uniforms, depthTest: false, depthWrite: false, vertexShader: VERT,
      fragmentShader: GLSL_PALETTE + OKLAB_GLSL + `const float CHROMA = ${CHROMA.toFixed(1)};` + /* glsl */`
        uniform sampler2D tColor, tInfo, tArt; uniform vec2 uLow, uAnchor; uniform vec3 uLift, uGamma, uGain, uPal[32], uLab[32]; uniform float uSat, uDither; uniform int uN;
        const vec3 LUM = vec3(.299, .587, .114);
        const float BAYER[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
        vec4 info(ivec2 p){ return texelFetch(tInfo, clamp(p, ivec2(0), ivec2(uLow) - 1), 0); }
        vec3 at(ivec2 p){ return texture2D(tColor, (vec2(p) + .5) / uLow).rgb; }
        void main(){
          ivec2 p = ivec2(gl_FragCoord.xy);
          // pixel art is already pixel art: out as drawn
          vec4 art = texelFetch(tArt, p, 0);
          if (art.a > .5) { gl_FragColor = vec4(art.rgb, 1.); return; }
          // a 3x3 Kuwahara: the flattest 2x2 quadrant's mean, so the painting's brush texture settles into clean pixel
          // clusters instead of speckle, while edges stay sharp. Its numbers also tell gradients (dithered) from detail.
          vec3 n[9]; float y[9];
          for (int j = 0; j < 3; j++) for (int i = 0; i < 3; i++) { n[j * 3 + i] = at(p + ivec2(i - 1, j - 1)); y[j * 3 + i] = dot(n[j * 3 + i], LUM); }
          vec3 col = n[4]; float best = 1e9;
          for (int q = 0; q < 4; q++) {
            int o = (q & 1) + (q >> 1) * 3;   // the quadrant's lower-left sample
            vec3 m = (n[o] + n[o + 1] + n[o + 3] + n[o + 4]) * .25;
            float v = dot(abs(n[o] - m) + abs(n[o + 1] - m) + abs(n[o + 3] - m) + abs(n[o + 4] - m), vec3(1));
            if (v < best) { best = v; col = m; }
          }
          // but keep what must stay crisp: the vehicles (layer 1, drawn in their own pixels) and small things that stand
          // out from their surroundings (rain, wires, lamps, Jorabat's dashboard)
          vec4 c = info(p);
          if (c.a > .5 || abs(y[4] - dot(col, LUM)) > .035) col = n[4];
          vec2 g = vec2(y[5] - y[3], y[7] - y[1]) * .5;   // the slope, and how far the 3x3 strays from that plane: the detail
          float detail = 0.;
          for (int j = 0; j < 3; j++) for (int i = 0; i < 3; i++) detail = max(detail, abs(y[j * 3 + i] - y[4] - dot(g, vec2(i - 1, j - 1))));
          float smooth_ = smoothstep(.003, .01, length(g)) * (1. - smoothstep(.012, .035, detail));
          // the line, 1 px: just outside the silhouette, ink, or a light line where the ground is darker than the body (so a
          // black taxi on black rock still reads); a darker local colour on creases inside it (one side only, so 1 px)
          ivec2 o4[4] = ivec2[4](ivec2(-1, 0), ivec2(1, 0), ivec2(0, -1), ivec2(0, 1));
          vec3 body = vec3(0); float nb = 0.;
          for (int i = 0; i < 4; i++) if (info(p + o4[i]).a > .5) { body += at(p + o4[i]); nb++; }
          bool outer = c.a < .5 && nb > 0.;
          vec4 l = info(p - ivec2(1, 0)), d = info(p - ivec2(0, 1));
          if (c.a > .5 && ((l.a > .5 && length(l.rgb - c.rgb) > .45) || (d.a > .5 && length(d.rgb - c.rgb) > .45))) col *= .5;
          vec3 line = dot(col, LUM) < dot(body, LUM) / max(nb, 1.) ? C_CLOUD : C_INK;
          // the scene's grade (fitted to the edge painting: see STYLE.md and shared/grade.js), and a very soft vignette
          col = uLift + (uGain - uLift) * pow(clamp(col, 0., 1.), uGamma);
          col = mix(vec3(dot(col, LUM)), col, uSat);
          vec2 q = gl_FragCoord.xy / uLow - .5; col *= 1. - dot(q, q) * .2;
          if (outer) col = line;
          // the palette: the nearest two colours in Oklab, and a Bayer threshold between them, anchored to the painting
          vec3 L = oklab(clamp(col, 0., 1.)) * vec3(1, CHROMA, CHROMA); float d1 = 1e9, d2 = 1e9; int i1 = 0, i2 = 0;
          for (int i = 0; i < 32; i++) {
            if (i >= uN) break;
            vec3 e = uLab[i] - L; float dd = dot(e, e);
            if (dd < d1) { d2 = d1; i2 = i1; d1 = dd; i1 = i; } else if (dd < d2) { d2 = dd; i2 = i; }
          }
          vec3 ab = uLab[i2] - uLab[i1];
          float t = clamp(dot(L - uLab[i1], ab) / max(dot(ab, ab), 1e-6), 0., 1.);
          ivec2 b = (p + ivec2(uAnchor)) & 3;
          // dither only in gradients, never on the vehicles or their line, never between far-apart colours (ΔL > .12, or
          // far in hue, like cream and amber): those read as a dot grid
          float s = uDither * smooth_ * (1. - c.a) * float(!outer) * step(abs(ab.x), .12) * step(length(ab), .15);
          gl_FragColor = vec4(uPal[(t - .5) + ((BAYER[b.y * 4 + b.x] + .5) / 16. - .5) * s > 0. ? i2 : i1], 1.);
        }`,
    }));
    this.upU = { tPix: { value: this.rtPix.texture }, uLow: { value: this.size }, uPad: { value: new THREE.Vector2() }, uShift: { value: new THREE.Vector2() }, uScale: { value: 1 } };
    this.up = quad(new THREE.ShaderMaterial({
      uniforms: this.upU, depthTest: false, depthWrite: false, vertexShader: VERT,
      fragmentShader: /* glsl */`
        uniform sampler2D tPix; uniform vec2 uLow, uPad, uShift; uniform float uScale;
        void main(){ gl_FragColor = texelFetch(tPix, clamp(ivec2(floor((gl_FragCoord.xy + uPad) / uScale + uShift)), ivec2(0), ivec2(uLow) - 1), 0); }`,
    }));
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.setGrade();
  }
  // [lift r,g,b, gamma r,g,b, gain r,g,b, saturation] from shared/grade.js, and the scene's palette (by its name in index.html)
  setGrade(p = [0, 0, 0, 1, 1, 1, 1, 1, 1, 1], name = 'edge') {
    const u = this.uniforms; u.uLift.value.fromArray(p, 0); u.uGamma.value.fromArray(p, 3); u.uGain.value.fromArray(p, 6); u.uSat.value = p[9];
    const pal = (PIXEL_PALETTES[name] || PIXEL_PALETTES.edge).slice(0, 32);
    pal.forEach((h, i) => { const n = parseInt(h.slice(1), 16); u.uPal.value[i].set((n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); u.uLab.value[i].copy(okLab(h)); });
    u.uN.value = pal.length;
  }
  // pw, ph: the canvas in device px (it fills the window). --px: one frame pixel in CSS px, for the UI's borders and shadows
  resize(pw, ph) {
    const [s, w, h] = pixelGrid(pw, ph);
    Object.assign(PIX, { scale: s, w, h }); this.size.set(w, h);
    this.rtColor.setSize(w * SS, h * SS); this.rtInfo.setSize(w, h); this.rtArt.setSize(w, h); this.rtPix.setSize(w, h);
    this.upU.uScale.value = s; this.upU.uPad.value.set((w * s - pw) / 2, (h * s - ph) / 2);
    document.documentElement.style.setProperty('--px', s * innerWidth / pw + 'px');
  }
  // vehicles: the taxi's group, a list of vehicles (the taxi and the truck), or null when there's none in the shot
  render(scene, camera, vehicles, clear = UTIL.clear) {
    const r = this.renderer, px = camera.userData.pix || [0, 0, 0, 0], cars = [].concat(vehicles || []).some(v => v.visible);
    const auto = r.autoClear; r.autoClear = false;   // every pass clears its own target; autoClear would wipe the vehicles' depth before the art layer
    r.setRenderTarget(this.rtInfo); r.setClearColor(UTIL.infoClear, 0); r.clear();
    if (cars) {   // info pass: layer 1 only, normals in rgb, coverage in alpha
      scene.overrideMaterial = infoMat; camera.layers.set(1); r.render(scene, camera);
      scene.overrideMaterial = null; camera.layers.set(0);
    }
    // the pixel-art pass: the vehicles' depth (so they hide what's behind them), then the art layer with its own materials
    const hook = scene.onAfterRender; scene.onAfterRender = noop;   // scene hooks are for the passes above
    r.setRenderTarget(this.rtArt); r.setClearColor(UTIL.black, 0); r.clear();
    if (cars) { scene.overrideMaterial = depthMat; camera.layers.set(1); r.render(scene, camera); scene.overrideMaterial = null; }
    camera.layers.set(Ink.PIXEL_ART_LAYER); r.render(scene, camera); camera.layers.set(0);
    scene.onAfterRender = hook;
    r.setRenderTarget(this.rtColor); r.setClearColor(clear, 1); r.clear(); r.render(scene, camera);
    this.uniforms.uAnchor.value.set(px[2], px[3]); this.upU.uShift.value.set(px[0], px[1]);
    r.setRenderTarget(this.rtPix); r.render(this.post, this.postCam);
    r.setRenderTarget(null); r.render(this.up, this.postCam);
    r.autoClear = auto;
  }
}

/* ---------- the passenger: picked at the stand, remembered next to the banked wish ---------- */
const ROSTER = window.HAIRPIN_ROSTER || { beats: {}, lines: {} };   // shared/roster.js
// { name, build, skin, hair, top, extra }, as dressed at the stand (shared/folk.js); an old saved pick (a teammate's id) reads as none
export function passenger() { let p = null; try { p = JSON.parse(localStorage.getItem('hairpin.passenger')); } catch (e) {} return p && typeof p.name === 'string' && p.name.trim() ? { ...p, first: p.name.trim(), lines: ROSTER.lines } : null; }
export function pick(look) { try { localStorage.setItem('hairpin.passenger', JSON.stringify(look)); } catch (e) {} }
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
    this.vel = { ...this.move };   // the spring's velocity per axis
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
  // for other shaders that live in painting px (a road, grass): where a painting point sits in the world
  static GLSL = /* glsl */`
    uniform sampler2D tDepth; uniform vec3 uRest; uniform float uK;
    float stageDepth(vec2 px, vec2 img){ return texture2D(tDepth, vec2(px.x / img.x, 1. - px.y / img.y)).r; }
    vec3 stageAt(vec2 px, float d){ return uRest + (vec3(px.x, -px.y, 0.) - uRest) * (1. - uK * d); }`;
  // the painting mesh: drawn first, behind everything (its depth would only clip feet)
  // 128 x 64 on phones, 192 x 96 elsewhere: the depth is smooth, so this is plenty, and it keeps the frame budget
  mesh(material, segs = matchMedia('(pointer: coarse)').matches ? [128, 64] : [192, 96]) {
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
  // ease the camera toward its target move: dx, dy in painting px, dolly a fraction of the distance, yaw/pitch radians.
  // A critically damped spring per axis (exact step, so any dt is stable): moves start from rest and settle without
  // overshoot. rate: as before, higher is snappier (the spring's mean lag is about 1 / rate seconds).
  update(dt, rate = .9) {
    const w = 2 * rate, e = Math.exp(-w * dt), m = REDUCED ? .35 : 1;
    for (const key in this.move) {
      const T = this.target[key] * m, x0 = this.move[key] - T, c2 = this.vel[key] + w * x0;
      this.move[key] = T + (x0 + c2 * dt) * e;
      this.vel[key] = (c2 - w * (x0 + c2 * dt)) * e;
    }
    this.apply();
  }
  apply() {
    const R = this.rest, m = this.move, c = this.cam;
    c.position.set(R.x + m.dx, R.y - m.dy, R.z * (1 - m.dolly));
    // snap to the pixel grid on the painting plane (z = 0), so the paintings don't shimmer; the remainder (in pixels)
    // goes to the upscale (Ink), so slow moves stay smooth. userData.pix: [shift x, shift y, grid x, grid y]
    const px = PIX.h && 2 * c.position.z * Math.tan(this.fov * Math.PI / 360) / PIX.h;
    if (px > 0) {
      const ix = Math.round(c.position.x / px), iy = Math.round(c.position.y / px);
      c.userData.pix = [c.position.x / px - ix, c.position.y / px - iy, ix, iy];
      c.position.x = ix * px; c.position.y = iy * px;
    }
    c.rotation.set(m.pitch, m.yaw, 0);
    c.updateMatrixWorld();
  }
}

// point the taxi's warm key at a real light: from (the taxi) and to (the light) in world space; strength 0..1.2
const _k = new THREE.Vector3();
export function keyLight(jeepMat, camera, from, to, strength) {
  _k.copy(to).sub(from).normalize().transformDirection(camera.matrixWorldInverse);
  jeepMat.uniforms.uKey.value.copy(_k); jeepMat.uniforms.uL.value = strength;
}

/* ---------- the viewer steers the light: the pointer (a finger drag on phones) swings a beam within a fixed arc ---------- */
// When nobody's steering (no drag, or the mouse still for a few seconds) it drifts back to the scripted aim.
const _dir = new THREE.Vector2();
export class Steer {
  constructor(arc = .35) { this.arc = arc; this.angle = 0; this.still = 99; this.last = null; }
  // head: the beam's origin in painting px; base: its scripted direction (a unit Vector2, painting px); ptr: the pointer in painting px, or null
  update(dt, head, base, ptr, touch, holding) {
    if (ptr && (!this.last || Math.hypot(ptr[0] - this.last[0], ptr[1] - this.last[1]) > .5)) this.still = 0; else this.still += dt;
    this.last = ptr;
    const active = ptr && (touch ? holding : this.still < 2.5);
    let target = 0;
    if (active) {
      const a = Math.atan2(ptr[1] - head.y, ptr[0] - head.x) - Math.atan2(base.y, base.x);
      target = clamp(Math.atan2(Math.sin(a), Math.cos(a)), -this.arc, this.arc);
    }
    this.angle = lerp(this.angle, target, damp(active ? 5 : 1.1, dt));
    const c = Math.cos(this.angle), s = Math.sin(this.angle);
    return _dir.set(base.x * c - base.y * s, base.x * s + base.y * c);
  }
}
