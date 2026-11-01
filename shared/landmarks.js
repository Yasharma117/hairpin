// The seven places on one road. These are physical miniature sets, so the wide view and
// the close view share the same buildings, trees, signs and small human details.
import { PALETTE, UI, BLOSSOM } from './style.js';
import { buildCliff } from './cliff.js';

export function buildLandmark(kind, THREE, palette = {}) {
  const P = {
    cream: UI.cream, ink: UI.ink, wood: UI.wood, amber: PALETTE.amber,
    night: PALETTE.ridge, grass: PALETTE.tealLight, leaf: UI.olive,
    roof: PALETTE.red, red: UI.signal, pink: BLOSSOM.lit[2],
    road: PALETTE.mist, rock: PALETTE.cloud, water: PALETTE.teal, ...palette,
  };
  const group = new THREE.Group();
  group.name = `landmark-${kind}`;
  group.userData.animations = [];
  const materials = new Map();
  const tint = (color, amount) => new THREE.Color(color).lerp(new THREE.Color(amount > 0 ? P.cream : P.ink), Math.abs(amount));
  const mat = (color, glow = 0) => {
    const key = `${color?.isColor ? color.getHexString() : color}/${glow}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({
      color, roughness: .86, metalness: 0, flatShading: true,
      emissive: glow ? color : P.ink, emissiveIntensity: glow,
    }));
    return materials.get(key);
  };
  const mesh = (geo, color, x = 0, y = 0, z = 0, parent = group, glow = 0) => {
    const m = new THREE.Mesh(geo, mat(color, glow));
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const box = (w, h, d, color, x = 0, y = 0, z = 0, parent = group) => mesh(new THREE.BoxGeometry(w, h, d), color, x, y, z, parent);
  const cyl = (rt, rb, h, color, x = 0, y = 0, z = 0, n = 10, parent = group) => mesh(new THREE.CylinderGeometry(rt, rb, h, n), color, x, y, z, parent);
  const ball = (r, color, x, y, z, parent = group, detail = 1) => mesh(new THREE.IcosahedronGeometry(r, detail), color, x, y, z, parent);
  const beam = (a, b, radius, color, parent = group) => {
    const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b), delta = bv.clone().sub(av);
    const m = cyl(radius, radius, delta.length(), color, ...av.clone().add(bv).multiplyScalar(.5).toArray(), 7, parent);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return m;
  };
  const seed = [...kind].reduce((n, c) => n + c.charCodeAt(0), 13);
  let randomState = seed;
  const random = () => { randomState = (randomState * 1664525 + 1013904223) >>> 0; return randomState / 4294967296; };
  const rock = (x, y, z, size = 1, color = P.rock) => {
    const r = ball(size, color, x, y, z, group, 0); r.scale.set(1.15, .65 + random() * .6, .8); r.rotation.set(random(), random() * 3, random() * .3); return r;
  };
  const hill = (x, z, width, height, depth, color = P.grass) => {
    // Broad contour shelves explain the hillside's construction at miniature scale.
    const rings = [1, .88, .69, .47, .22, 0], levels = [0, .12, .43, .70, .92, 1];
    const n = 13, rotation = random() * .35;
    const outline = Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2 + rotation; const warp = .93 + random() * .12; return [Math.cos(a) * width * warp, Math.sin(a) * depth * warp]; });
    for (let k = 0; k < rings.length - 1; k++) {
      const pts = [], normals = [];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, a = outline[i], b = outline[j];
        const va = [x + a[0] * rings[k], height * levels[k], z + a[1] * rings[k]], vb = [x + b[0] * rings[k], height * levels[k], z + b[1] * rings[k]];
        const vc = [x + a[0] * rings[k + 1], height * levels[k + 1], z + a[1] * rings[k + 1]], vd = [x + b[0] * rings[k + 1], height * levels[k + 1], z + b[1] * rings[k + 1]];
        pts.push(...va, ...vc, ...vb, ...vb, ...vc, ...vd);
      }
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pts.length / 3 * 2), 2)); geometry.computeVertexNormals();
      mesh(geometry, tint(color, k % 2 ? .045 : -.025));
      if (height > 1.2 && k < 3) {
        // A broken band of exposed earth separates the contour steps.
        for (let i = 0; i < n; i += 2) {
          const a = outline[i], b = outline[(i + 1) % n];
          beam([x + a[0] * rings[k + 1], height * levels[k + 1] - .05, z + a[1] * rings[k + 1]], [x + b[0] * rings[k + 1], height * levels[k + 1] - .05, z + b[1] * rings[k + 1]], .055, tint(P.rock, -.09));
        }
      }
    }
  };
  const pine = (x, z, height = 3.4, y = 0) => {
    const tree = new THREE.Group(); tree.position.set(x, y, z); group.add(tree);
    cyl(.075, .15, height * .78, tint(P.wood, -.25), 0, height * .39, 0, 7, tree);
    // Offset boughs preserve the conifer silhouette without reading as stacked cones.
    for (let j = 0; j < 7; j++) {
      const k = j / 7, yy = height * (.29 + k * .64), radius = height * .25 * (1 - k * .8), angle = j * 2.38;
      const branch = cyl(.035, radius, height * .32, tint(P.leaf, j % 3 * .06), Math.sin(angle) * radius * .14, yy, Math.cos(angle) * radius * .14, 6, tree);
      branch.rotation.y = angle;
      if (j < 5) for (const side of [-1, 1]) {
        const a = angle + side * 1.2, reach = radius * .55;
        const bough = cyl(.025, radius * .56, height * .20, tint(P.leaf, j % 2 ? .10 : -.055), Math.sin(a) * reach, yy - height * .02, Math.cos(a) * reach, 5, tree);
        bough.rotation.y = a;
      }
    }
    rock(x + .10, y + .08, z + .08, .20, tint(P.rock, -.1));
    return tree;
  };
  const shrub = (x, z, s = .6, y = 0, color = P.leaf) => {
    const b = ball(s, color, x, y + s * .5, z); b.scale.y = .7; return b;
  };
  const flowers = (x, z, count = 8, spread = 1, color = P.pink, y = 0) => {
    for (let i = 0; i < count; i++) {
      const xx = x + (random() - .5) * spread, zz = z + (random() - .5) * spread;
      const yy = y + .15 + random() * .1;
      beam([xx, y, zz], [xx, yy, zz], .015, P.leaf);
      ball(.065, color, xx, yy, zz, group, 0);
    }
  };
  const label = (text, w, h, x, y, z, { background = P.cream, color = P.ink, size = 70, parent = group, rotation = 0 } = {}) => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = Math.max(128, Math.round(1024 * h / w));
    const ctx = canvas.getContext('2d'); ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);
    ctx.fillStyle = color; ctx.font = `600 ${size}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lines = text.split('\n'); lines.forEach((line, i) => ctx.fillText(line, 512, canvas.height / 2 + (i - (lines.length - 1) / 2) * size * 1.15, 930));
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.y = Math.PI + rotation; parent.add(m); return m;
  };
  const sign = (text, x, z, w = 2.8, y = 1.7, h = .65) => {
    box(w + .12, h + .12, .14, P.wood, x, y, z);
    label(text, w, h, x, y, z - .076);
    for (const dx of [-w * .35, w * .35]) box(.08, y, .08, P.wood, x + dx, y * .5, z + .04);
  };
  const roof = (w, d, x, y, z, color = P.roof, parent = group, slope = .32, cutaway = false) => {
    const originalDepth = d, originalZ = z;
    if (cutaway) { d *= .48; z += originalDepth * .28; }
    const rise = w * .5 * Math.tan(slope);
    for (const s of [-1, 1]) {
      const m = box(w * .5 / Math.cos(slope) + .16, .13, d + .35, color, x + s * w * .25, y + rise * .5, z, parent);
      m.rotation.z = -s * slope;
      for (let i = 0; i < 8; i++) {
        const seam = box(w * .5 / Math.cos(slope) + .16, .025, .025, tint(color, -.15), x + s * w * .25, y + rise * .5 + .075, z - d * .5 + i * d / 7, parent);
        seam.rotation.z = -s * slope;
      }
    }
    box(.10, .12, d + .4, tint(color, -.18), x, y + rise + .04, z, parent);
    if (cutaway) for (const dx of [-w * .43, 0, w * .43]) {
      box(.075, .10, originalDepth, tint(P.wood, -.24), x + dx, y - .02, originalZ, parent);
      beam([x + dx, y - .02, originalZ - originalDepth * .45], [x + dx, y - .48, originalZ - originalDepth * .30], .035, P.wood, parent);
    }
    return rise;
  };
  const window = (x, y, z, w = .52, h = .72, warm = true, parent = group) => {
    box(w + .12, h + .12, .08, P.wood, x, y, z, parent);
    mesh(new THREE.BoxGeometry(w, h, .035), warm ? P.amber : P.water, x, y, z - .055, parent, warm ? .2 : 0);
    box(.045, h, .05, tint(P.wood, -.3), x, y, z - .08, parent);
    box(w, .045, .05, tint(P.wood, -.3), x, y, z - .08, parent);
    box(w + .22, .08, .22, P.cream, x, y - h * .5 - .04, z - .07, parent);
  };
  const house = (x, z, w = 1.9, h = 1.7, d = 1.6, color = P.cream, roofColor = P.roof, base = 0, variant = 0) => {
    const home = new THREE.Group(); home.position.set(x, base, z); group.add(home);
    box(w, h, d, color, 0, h / 2, 0, home);
    box(w + .08, .14, d + .08, P.rock, 0, .07, 0, home);
    const rise = roof(w + .2, d, 0, h, 0, roofColor, home);
    const gable = new THREE.Shape(); gable.moveTo(-w / 2, h); gable.lineTo(0, h + rise); gable.lineTo(w / 2, h); gable.closePath();
    const gableGeo = new THREE.ExtrudeGeometry(gable, { depth: d, bevelEnabled: false }); gableGeo.translate(0, 0, -d / 2);
    mesh(gableGeo, color, 0, 0, 0, home);
    const n = w > 2 ? 3 : 2;
    for (let i = 0; i < n; i++) window((i - (n - 1) / 2) * w / (n + .2), h * .58, -d / 2 - .02, w * .20, h * .35, true, home);
    box(.4, h * .62, .055, P.wood, 0, h * .31, -d / 2 - .035, home);
    ball(.035, P.amber, .13, h * .31, -d / 2 - .08, home, 0);
    box(w + .3, .1, .33, P.rock, 0, .06, -d * .5 - .17, home);
    box(.20, .48, .24, tint(P.rock, -.1), w * .30, h + .24, .25, home);
    // Corner pilasters, gutter and downpipe give every facade a construction layer.
    for (const side of [-1, 1]) box(.09, h, .08, tint(P.wood, .10), side * (w * .5 - .035), h * .5, -d * .5 - .055, home);
    box(w + .20, .07, .08, tint(P.ink, .2), 0, h - .08, -d * .5 - .14, home);
    cyl(.026, .026, h - .13, tint(P.ink, .2), w * .5 + .07, (h - .13) * .5, -d * .5 - .10, 6, home);
    // Camera-right glazing is framed rather than a flat rectangle.
    box(.04, h * .35 + .10, d * .38 + .10, P.wood, w * .5 + .025, h * .60, .12, home);
    mesh(new THREE.BoxGeometry(.025, h * .35, d * .38), P.amber, w * .5 + .05, h * .60, .12, home, .25);
    box(.045, h * .35, .04, P.wood, w * .5 + .075, h * .60, .12, home);
    box(.045, .04, d * .38, P.wood, w * .5 + .075, h * .60, .12, home);
    if (variant % 3 === 0) {
      box(w * .7, .10, .55, P.wood, 0, h * .25, -d * .5 - .35, home);
      for (const side of [-1, 1]) box(.06, h * .25, .06, P.wood, side * w * .31, h * .125, -d * .5 - .5, home);
      for (let j = 0; j < 5; j++) box(.035, .35, .035, P.cream, -w * .3 + j * w * .15, h * .25 + .20, -d * .5 - .55, home);
      box(w * .68, .045, .04, P.cream, 0, h * .25 + .38, -d * .5 - .55, home);
    }
    if (variant % 4 === 1) {
      const tankY = h + rise * .65 + .20;
      box(.48, .12, .48, tint(P.rock, -.1), -w * .24, tankY - .22, .10, home);
      const tank = cyl(.20, .20, .38, tint(P.water, -.18), -w * .24, tankY, .10, 12, home);
      for (const yy of [-.11, 0, .11]) cyl(.208, .208, .025, tint(P.water, .15), tank.position.x, tank.position.y + yy, .10, 12, home);
      beam([-w * .24, tankY + .17, .10], [-w * .24, tankY + .17, .5], .025, P.ink, home);
    }
    return home;
  };
  const stool = (x, z, y = 0) => {
    cyl(.32, .32, .11, P.wood, x, y + .54, z, 12);
    for (const dx of [-.19, .19]) for (const dz of [-.17, .17]) beam([x + dx, y, z + dz], [x + dx * .85, y + .5, z + dz * .85], .035, P.wood);
  };
  const cup = (x, y, z, r = .09) => {
    cyl(r, r * .75, r * 1.7, P.cream, x, y + r * .85, z, 10);
    cyl(r * .86, r * .86, .012, P.wood, x, y + r * 1.72, z, 10);
  };
  const lamp = (x, z, height = 3.2, y = 0) => {
    const g = new THREE.Group(); group.add(g); g.position.set(x, y, z);
    cyl(.06, .10, height, P.ink, 0, height * .5, 0, 8, g);
    beam([0, height, 0], [0, height, -.45], .045, P.ink, g);
    cyl(.27, .10, .12, P.ink, 0, height - .04, -.45, 10, g);
    mesh(new THREE.SphereGeometry(.11, 8, 6), P.amber, 0, height - .14, -.45, g, .6);
    return g;
  };
  const railing = (x1, x2, z, y = 0, height = .85) => {
    const n = Math.ceil((x2 - x1) / .7);
    for (let i = 0; i <= n; i++) box(.09, height, .09, P.cream, x1 + (x2 - x1) * i / n, y + height / 2, z);
    box(x2 - x1 + .12, .09, .09, P.cream, (x1 + x2) / 2, y + height, z);
    box(x2 - x1 + .12, .055, .055, P.cream, (x1 + x2) / 2, y + height * .42, z);
  };
  const crate = (x, z, w = .8, y = 0) => {
    box(w, .46, w * .7, tint(P.wood, -.12), x, y + .23, z);
    for (let j = 0; j < 3; j++) {
      box(w + .03, .10, .055, P.wood, x, y + .09 + j * .15, z - w * .35);
      box(.055, .10, w * .7, P.wood, x - w * .5, y + .09 + j * .15, z);
    }
    for (const s of [-1, 1]) box(.065, .48, .06, tint(P.wood, -.23), x + s * (w * .5 - .05), y + .24, z - w * .35 - .02);
  };
  const pineapple = (x, y, z, size = .18) => {
    const fruit = ball(size, P.amber, x, y + size, z); fruit.scale.set(.82, 1.24, .82);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * .4, l = box(.045, size * 1.5, .025, P.leaf, x + Math.sin(a) * size * .25, y + size * 2.4, z + Math.cos(a) * size * .25);
      l.rotation.set(Math.cos(a) * .5, a, Math.sin(a) * .5);
    }
  };

  const stoneWall = (x, z, length, angle = 0, h = .55) => {
    const wall = new THREE.Group(); wall.position.set(x, 0, z); wall.rotation.y = angle; group.add(wall);
    for (let row = 0; row < 3; row++) for (let j = 0; j < Math.ceil(length / .6); j++) {
      const xx = -length * .5 + .3 + j * .6 + (row % 2 ? .13 : 0);
      if (xx > length * .5) continue;
      box(.55, h / 3 - .025, .38, tint(P.rock, ((j + row) % 3) * .075 - .08), xx, h / 6 + row * h / 3, 0, wall);
    }
    box(length + .12, .09, .46, tint(P.rock, .23), 0, h + .025, 0, wall);
    return wall;
  };
  const paving = (x, z, w, d) => {
    for (let j = 0; j < Math.floor(d / .46); j++) for (let i = 0; i < Math.floor(w / .51); i++) {
      const xx = x - w * .5 + .255 + i * .51, zz = z - d * .5 + .23 + j * .46;
      box(.47, .055, .42, tint(P.rock, (i + j) % 3 * .07 + .10), xx, .028, zz);
    }
  };
  const barrel = (x, z, r = .30, y = 0) => {
    cyl(r * .88, r * .84, r * 2.1, tint(P.wood, -.08), x, y + r * 1.05, z, 12);
    for (const yy of [.28, 1.05, 1.8]) cyl(r * .92, r * .92, .045, tint(P.ink, .2), x, y + r * yy, z, 12);
    cyl(r * .85, r * .85, .055, P.wood, x, y + r * 2.13, z, 12);
    for (const dx of [-.4, .2]) box(.025, .02, r * 1.45, tint(P.wood, -.35), x + r * dx, y + r * 2.17, z);
  };
  const sack = (x, z, r = .26, y = 0) => {
    const body = ball(r, tint(P.cream, -.18), x, y + r * .9, z); body.scale.set(.9, 1.25, .8);
    cyl(r * .25, r * .35, r * .35, tint(P.cream, -.26), x, y + r * 2.1, z, 7);
    cyl(r * .36, r * .36, .035, P.wood, x, y + r * 2, z, 7);
  };
  const bunting = (x1, z1, x2, z2, y) => {
    beam([x1, y, z1], [x2, y, z2], .012, P.ink);
    for (let j = 1; j < 8; j++) {
      const t = j / 8, x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t;
      const flag = new THREE.Shape(); flag.moveTo(-.12, 0); flag.lineTo(.12, 0); flag.lineTo(0, -.28); flag.closePath();
      const m = mesh(new THREE.ShapeGeometry(flag), j % 2 ? P.roof : P.amber, x, y, z); m.rotation.y = Math.PI;
      const pivot = new THREE.Group(); pivot.position.copy(m.position); m.position.set(0, 0, 0); group.add(pivot); pivot.add(m);
      group.userData.animations.push({ object: pivot, type: 'sway', phase: j * .8, speed: .8, amount: .06 });
    }
  };

  if (kind === 'stand') {
    hill(-1, 2, 6, .6, 3.3);
    const x = -1.2, z = .85;
    box(4.4, .20, 2.5, P.rock, x, .10, z);
    box(4.1, 2.15, .16, P.wood, x, 1.25, z + 1.05);
    box(.15, 2.15, 2.2, tint(P.wood, -.15), x - 2, 1.25, z);
    for (const dx of [-2, 2]) box(.12, 2.5, .12, P.wood, x + dx, 1.25, z - 1.05);
    roof(4.7, 2.8, x, 2.4, z, P.roof, group, .32, true);
    box(4, .85, .56, tint(P.wood, -.1), x, .66, z - .65);
    for (let i = 0; i < 11; i++) box(.018, .82, .018, tint(P.wood, -.3), x - 1.83 + i * .36, .66, z - .94);
    box(4.3, .12, .78, P.cream, x, 1.12, z - .7);
    label('JORABAT · TAXI & CHAI', 3.6, .55, x, 2.12, z - 1.075, { background: P.leaf, color: P.cream, size: 65 });
    for (let j = 0; j < 2; j++) {
      box(2.9, .09, .32, P.wood, x - .15, 1.42 + j * .38, z + .85);
      for (let i = 0; i < 9; i++) cyl(.075, .075, .19, i % 3 ? P.cream : P.amber, x - 1.25 + i * .27, 1.55 + j * .38, z + .83, 8);
    }
    for (let i = 0; i < 4; i++) cup(x - 1.1 + i * .38, 1.19, z - .7);
    const kettle = ball(.24, tint(P.rock, .4), x + 1.4, 1.41, z - .7); kettle.scale.y = .8;
    cyl(.11, .15, .06, P.ink, x + 1.4, 1.60, z - .7);
    beam([x + 1.22, 1.4, z - .7], [x + 1.05, 1.6, z - .7], .055, P.rock);
    for (const sx of [-3.8, 1.5]) stool(sx, -.7);
    cyl(.57, .6, .10, P.wood, -3.8, .85, -1.2, 14); cyl(.055, .07, .8, P.ink, -3.8, .4, -1.2, 8);
    cup(-3.65, .91, -1.2); cup(-4, .91, -1.25);
    sign('SHILLONG  90 KM →', 3.1, 1.1, 2.8, 2.1, .6);
    lamp(2.1, -.3, 3.2);
    pine(-5, 2.8, 4.5); pine(4.5, 2.7, 3.7); shrub(4.7, .2, .8);
    crate(1.4, 1.8, .7); crate(2.2, 1.9, .65);
    flowers(-4.6, -.8, 12, 1.3);
  } else if (kind === 'jorabat') {
    hill(1.7, 2, 5.5, .7, 2.8);
    // A roadside workshop becomes a little open cabinet of the driver's work.
    box(5.7, .12, 3.3, P.cream, .4, .06, .7);
    box(5.4, 2.3, .16, tint(P.wood, .15), .4, 1.25, 2.2);
    for (const x of [-2.2, 3]) box(.14, 2.7, .14, P.wood, x, 1.35, -.75);
    roof(5.9, 3.6, .4, 2.65, .7, P.water, group, .24, true);
    label('A FEW THINGS I’VE MADE', 4.5, .55, .4, 2.25, 2.09, { size: 61 });
    box(4.4, .12, .95, P.wood, .4, .97, 1.1);
    for (const x of [-1.5, 2.3]) box(.12, .92, .75, P.wood, x, .48, 1.1);
    const projects = ['TopNotch', '1mg', 'Warden', 'Dodo', 'Markon'];
    projects.forEach((name, i) => {
      const x = -1.45 + i * .92;
      box(.73, .63, .13, i % 2 ? P.roof : P.leaf, x, 1.42, 1.2);
      label(name, .65, .30, x, 1.45, 1.12, { size: 120, background: i % 2 ? P.roof : P.leaf, color: P.cream });
      box(.62, .05, .3, P.cream, x, 1.04, .96);
    });
    const notice = box(1.35, 1.8, .10, P.leaf, -3.6, 1.3, .1); notice.rotation.y = -.15;
    label('DESIGN\nIS A\nJOURNEY', 1.15, 1.55, -3.59, 1.3, .035, { size: 150, background: P.leaf, color: P.cream, rotation: -.15 });
    for (const x of [-4.12, -3.15]) box(.09, .65, .09, P.wood, x, .32, .2);
    stool(3.8, .1); cup(3.8, .61, .1);
    pine(-4.8, 2.3, 3.7); pine(4.6, 2.8, 4.1); shrub(4.4, .6, .7);
    lamp(-2.8, -1.3, 3.25);
    // A pair of spare wheels and an oil tin make the stop read as a working place.
    for (let i = 0; i < 2; i++) {
      const tyre = mesh(new THREE.TorusGeometry(.35, .12, 7, 15), P.ink, 3.7 + i * .43, .39, 1.8); tyre.rotation.y = .3;
      box(.26, .38, .21, P.red, 4.65, .19, 1.9);
    }
    sign('NEXT: THE HILLS ↑', 2.2, -.6, 2.4, .65, .40);
  } else if (kind === 'climb') {
    hill(.7, 1.7, 5.8, 3.3, 3.7, P.grass);
    hill(-3.4, 1.4, 2.8, 2.1, 2.3, tint(P.grass, .12));
    for (let j = 0; j < 9; j++) rock(-4 + j * 1.0, .35 + Math.sin(j * .34) * .35, .1 + Math.sin(j) * .35, .42 + random() * .3);
    pine(-4.1, 2.0, 4, .9); pine(-1.9, 2.9, 4.4, 1.9); pine(.3, 2.4, 4.7, 2.7); pine(2.3, 2.9, 3.8, 2.4); pine(4.2, 1.7, 4.2, 1.4);
    // A narrow footpath is laid in individual stones, curling uphill behind the road.
    for (let i = 0; i < 18; i++) {
      const t = i / 17, x = -4.8 + t * 8.1, z = .25 + Math.sin(t * Math.PI * 1.4) * 1.3, y = .1 + Math.sin(t * Math.PI) * 1.85;
      const step = box(.52, .10, .42, tint(P.rock, .3), x, y, z); step.rotation.y = t * 1.5;
    }
    for (let i = 0; i < 7; i++) {
      const x = -3.7 + i * 1.18;
      box(.18, .62, .20, P.cream, x, .31, .15);
      box(.18, .16, .21, P.ink, x, .42, .15);
    }
    sign('SLOW · HAIRPIN AHEAD', -3.8, -.9, 2.25, 1.75, .55);
    const warning = mesh(new THREE.ConeGeometry(.48, .07, 3), P.amber, 4.3, 1.8, -.6); warning.rotation.x = Math.PI / 2; warning.rotation.z = Math.PI;
    box(.08, 1.5, .08, P.ink, 4.3, .75, -.55);
    flowers(-3, -.3, 18, 1.7, P.cream); flowers(2.6, -.3, 15, 1.7);
    shrub(-5.2, -.1, .8); shrub(4.9, -.2, .9);
  } else if (kind === 'nongpoh') {
    hill(0, 2.6, 5.8, .65, 2.6);
    const x = -.4;
    box(4.6, .14, 2.65, P.rock, x, .07, 1);
    box(4.2, 2.2, .13, P.wood, x, 1.2, 2.15);
    for (const dx of [-2, 2]) box(.11, 2.8, .11, P.wood, x + dx, 1.4, -.3);
    // Alternating stitched canvas bands over a sloping market awning.
    for (let i = 0; i < 10; i++) {
      const strip = box(.49, .08, 1.65, i % 2 ? P.cream : P.roof, x - 2.2 + i * .49, 2.65, 1.30);
      strip.rotation.x = -.10;
      box(.49, .30, .07, i % 2 ? P.cream : P.roof, x - 2.2 + i * .49, 2.43, .48);
    }
    label('NONGPOH · FRESH PINEAPPLES', 3.85, .45, x, 2.02, 2.06, { size: 55, background: P.leaf, color: P.cream });
    box(4.0, .75, .75, P.wood, x, .52, .18);
    box(4.15, .10, .87, tint(P.wood, .15), x, .95, .18);
    for (let i = 0; i < 12; i++) pineapple(x - 1.72 + i * .31, 1.01, .12 + (i % 2) * .23, .14);
    for (let j = 0; j < 3; j++) {
      crate(-3.65 + (j % 2) * .88, .4 + Math.floor(j / 2) * .7, .82);
      for (let i = 0; i < 4; i++) pineapple(-3.85 + (j % 2) * .88 + (i % 2) * .31, .43, .23 + Math.floor(j / 2) * .7 + Math.floor(i / 2) * .28, .13);
    }
    crate(2.45, .3, 1.0); crate(2.55, 1.15, .8); crate(2.55, 1.15, .75, .46);
    label('₹ 30', .75, .38, .5, 1.3, -.28, { size: 190 });
    stool(-2.4, -.3); stool(3.5, -.6);
    sign('TEA · FRUIT · A BREATHER', 3.4, 1.8, 2.65, 2.2, .55);
    pine(-5.2, 2.4, 4.3); pine(4.8, 2.8, 4.9);
    lamp(3.3, -1.2, 3.4);
    // Flat polished puddles catch the warm market colors.
    for (const [xx, zz, rr] of [[-3.9, -1.1, .55], [2.3, -1.3, .75]]) {
      const water = cyl(rr, rr, .015, tint(P.water, .3), xx, .025, zz, 15); water.scale.z = .43;
    }
    flowers(4.8, -.4, 12, 1.1, P.amber);
  } else if (kind === 'cloud') {
    hill(-2.2, 2.0, 3.8, 3.8, 2.7, P.rock); hill(3, 2.0, 3.5, 2.9, 2.7, tint(P.rock, .15));
    pine(-3.4, 1.4, 3.4, 2.0); pine(3.7, 1.9, 3.7, 1.8);
    for (let j = 0; j < 9; j++) {
      const xx = -4.8 + j * 1.15, zz = 1.1 + Math.sin(j * .7) * .55, yy = 2.1 + Math.sin(j * .65) * .65;
      const cloud = new THREE.Group(); cloud.position.set(xx, yy, zz); group.add(cloud);
      for (let i = 0; i < 4; i++) {
        const c = ball(.62 + random() * .37, tint(P.cream, -.045), (i - 1.5) * .5, Math.sin(i) * .22, (random() - .5) * .35, cloud, 1);
        c.scale.y = .56;
      }
      group.userData.animations.push({ object: cloud, type: 'float', phase: j * .7, speed: .22, amount: .11 });
    }
    railing(-3.1, 3.9, -.7, 0, .75);
    sign('THE CLOUD LINE · 1,450 M', -.4, .15, 3.5, 1.8, .6);
    for (let i = 0; i < 5; i++) rock(-4.4 + i * 2.2, .22, -.5, .3);
    const bench = box(2.2, .12, .65, P.wood, 2.25, .65, .8);
    for (const xx of [1.5, 3]) box(.13, .6, .45, P.ink, xx, .3, .8);
    box(2.2, .55, .10, P.wood, 2.25, .95, 1.05);
    flowers(-4.8, -.4, 15, 1.0, P.cream);
  } else if (kind === 'edge') {
    // Exposed vertical rock is kept behind the travelled road; the taxi can sit at its lip.
    hill(.9, 2.2, 5.1, 2.2, 2.5, tint(P.grass, -.12));
    for (let i = 0; i < 12; i++) {
      const x = -4.7 + i * .85, z = .05 + Math.sin(i * 1.7) * .4;
      const r = rock(x, -.3, z, .65 + random() * .55, tint(P.rock, (i % 3) * .065)); r.scale.y = 2.6 + random();
    }
    for (let j = 0; j < 3; j++) {
      const x = -3.8 + j * 3.2;
      pine(x, 2.0 + (j % 2) * .8, 4.2 - j * .3, .9);
      rock(x + .7, .55, 1, .6);
    }
    for (let i = 0; i < 6; i++) {
      const x = -4.5 + i * 1.7;
      box(.22, .85, .24, P.cream, x, .42, -1.1);
      box(.23, .23, .25, P.ink, x, .53, -1.1);
    }
    sign('TAKE IT SLOW', -4.1, -.3, 2, 2.05, .6);
    // The broken guard rail and its two scattered pieces are deliberate story landmarks.
    box(2.65, .15, .12, P.wood, -2.8, .8, -1.12);
    const rail = box(2.4, .15, .12, P.wood, 2.1, .65, -1.1); rail.rotation.z = -.17;
    const fallen = box(1.25, .13, .13, P.wood, .2, -.05, -.5); fallen.rotation.y = .6;
    shrub(4.9, .6, .8); shrub(-5.1, .8, .7);
    flowers(3.8, .9, 12, 1.1, P.cream, .35);
    lamp(-2.7, .2, 3.8);
    group.add(buildCliff(THREE,P));
  } else if (kind === 'shillong') {
    hill(.2, 2.1, 5.9, 1.4, 3.6, tint(P.grass, -.06));
    // Rooftops climb the hill in three overlapping rows, with a foot stair between them.
    const homes = [
      [-4.3, 2.9, 1.5, 1.5, 1.4, .65], [-2.35, 3.2, 1.7, 1.7, 1.5, 1.05], [-.2, 3.15, 1.7, 1.65, 1.4, 1.3], [2, 3.2, 1.8, 1.55, 1.6, 1], [4.15, 2.75, 1.5, 1.8, 1.4, .6],
      [-3.7, 1.2, 1.65, 1.45, 1.45, .4], [-1.5, 1.35, 1.6, 1.6, 1.4, .72], [1.65, 1.25, 1.75, 1.45, 1.5, .65], [3.85, 1.0, 1.6, 1.5, 1.45, .35],
    ];
    homes.forEach(([x, z, w, h, d, base], i) => house(x, z, w, h, d, tint(P.cream, i % 3 ? -.07 : -.2), i % 3 ? P.roof : P.water, base, i));
    for (let i = 0; i < 12; i++) box(.55, .12, .28, tint(P.rock, .35), .1, .06 + i * .105, -.05 + i * .27);
    railing(-5.5, 5.3, -1.2, 0, .82);
    // A branch-built cherry tree is the arrival marker, visible from the whole road.
    const cherry = new THREE.Group(); cherry.position.set(-4.4, 0, -.1); group.add(cherry);
    beam([0, 0, 0], [.15, 2.4, .05], .14, P.wood, cherry);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4, x = Math.sin(a) * (1 + (i % 2) * .4), z = Math.cos(a) * .85, y = 2.8 + (i % 3) * .35;
      beam([.1, 1.7, 0], [x * .85, y, z], .075, tint(P.wood, -.25), cherry);
      for (let tuft = 0; tuft < 3; tuft++) {
        const ta = tuft * 2.2 + i * .7, crown = ball(.43 + (tuft % 2) * .13, i % 3 ? tint(P.pink, tuft * .10) : tint(P.pink, .38), x + Math.sin(ta) * .38, y + .18 + (tuft % 2) * .22, z + Math.cos(ta) * .30, cherry, 1);
        crown.scale.set(1.10, .78, .95);
      }
      for (let j = 0; j < 4; j++) ball(.23, tint(P.pink, j * .12), x + (random() - .5) * 1.1, y + .4 + random() * .35, z + (random() - .5), cherry, 0);
    }
    group.userData.animations.push({ object: cherry, type: 'sway', phase: 0, speed: .45, amount: .012 });
    for (let i = 0; i < 22; i++) {
      const petal = box(.08, .014, .05, P.pink, -4.4 + (random() - .5) * 3.4, .025, -.6 + (random() - .5) * 1.8); petal.rotation.y = random() * 6;
    }
    lamp(3.6, -.2, 3.7); lamp(-1.9, -.3, 3.4);
    sign('SHILLONG · YOU MADE IT', 1.15, -.05, 3.3, 1.7, .55);
    // A five-point brass star on the lookout fence carries the wish-bank motif.
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + Math.PI / 2, r = i % 2 ? .17 : .38; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (!i) shape.moveTo(x, y); else shape.lineTo(x, y); }
    shape.closePath();
    const star = mesh(new THREE.ExtrudeGeometry(shape, { depth: .035, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 1 }), P.amber, 4.6, 1.45, -1.24); star.rotation.y = Math.PI;
    group.userData.star = star;
  }

  // Final construction/story pass, placed on camera-facing surfaces.
  if (kind === 'stand') {
    paving(-1.4, -1.20, 5.0, 1.8);
    stoneWall(-4.95, 1.2, 2.5, Math.PI / 2, .48);
    barrel(1.35, 1.7, .27); sack(1.95, 1.45, .29);
    // A stove, soot hood and repaired kettle show the last cups of the day.
    box(.65, .58, .52, tint(P.ink, .15), .1, .37, 1.15);
    cyl(.21, .21, .07, P.ink, .1, .70, 1.15, 12);
    const pot = cyl(.22, .27, .32, tint(P.rock, .35), .1, .88, 1.15, 14);
    cyl(.24, .24, .04, P.ink, .1, 1.06, 1.15, 12);
    beam([-.12, .92, 1.15], [-.29, 1.06, 1.15], .055, P.rock);
    box(.85, .09, .70, P.ink, .1, 1.9, 1.24);
    box(.14, .7, .14, tint(P.ink, .15), .1, 2.25, 1.40);
    label('CHAI  ₹ 10\nONE LAST CUP', .95, .75, -2.5, 1.65, 1.77, { size: 150, background: P.leaf, color: P.cream });
    // A folded cloth and a chipped counter corner are deliberate asymmetries.
    box(.55, .035, .32, P.roof, -.45, 1.205, -.05);
    box(.45, .04, .25, tint(P.roof, .18), -.5, 1.23, -.07);
    bunting(-3.18, -.2, .75, -.2, 2.15);
  } else if (kind === 'jorabat') {
    paving(.4, -.9, 5.8, 2.0);
    stoneWall(4.55, 1.45, 2.7, Math.PI / 2, .42);
    // An open laptop, headphones and a marked-up notebook put a person at the workbench.
    const screen = box(.82, .54, .055, P.ink, -.45, 1.55, .3); screen.rotation.x = -.12;
    box(.70, .42, .035, P.water, -.45, 1.55, .255);
    box(.85, .045, .57, tint(P.rock, .3), -.45, 1.28, -.01);
    for (let row = 0; row < 3; row++) box(.63, .012, .045, P.ink, -.45, 1.31, -.18 + row * .1);
    box(.55, .045, .65, P.cream, .75, 1.31, -.04);
    for (let j = 0; j < 4; j++) box(.36, .012, .025, tint(P.ink, .35), .75, 1.34, -.23 + j * .11);
    beam([.48, 1.37, -.14], [1.02, 1.37, .16], .025, P.roof);
    const phones = mesh(new THREE.TorusGeometry(.20, .045, 6, 12, Math.PI * 1.4), P.ink, 1.65, 1.45, .1); phones.rotation.x = Math.PI / 2;
    for (const xx of [1.47, 1.83]) box(.12, .13, .19, P.ink, xx, 1.35, .06);
    box(4.4, .12, .80, P.wood, .4, 1.20, .13);
    for (const xx of [-1.5, 2.3]) box(.10, 1.15, .10, tint(P.wood, -.2), xx, .575, .13);
    barrel(3.6, 1.6, .30); sack(-3.7, .9, .25);
  } else if (kind === 'climb') {
    stoneWall(-3.9, -1.15, 3.3, -.14, .48); stoneWall(3.5, -.5, 2.6, .15, .42);
    // A road repair and a cairn make the climb a travelled place.
    for (let j = 0; j < 6; j++) {
      const rr = .31 - j * .037, cairn = rock(4.7 + (j % 2) * .04, .11 + j * .16, -.45, rr, tint(P.rock, .15)); cairn.scale.y = .35;
    }
    box(1.15, .045, .75, tint(P.road, -.13), -1.3, .04, -1.6);
    for (let j = 0; j < 3; j++) box(.10, .055, .68, P.amber, -1.65 + j * .28, .065, -1.6);
    sign('KHASI HILLS\nKEEP LEFT', 2.6, 1.1, 1.8, 1.5, .75);
  } else if (kind === 'nongpoh') {
    paving(-.4, -.70, 5.2, 1.45);
    stoneWall(-4.7, 1.1, 2.4, Math.PI / 2, .48);
    for (const xx of [-2.0, 1.3]) sack(xx, 1.6, .30);
    barrel(3.5, 1.45, .30);
    for (let j = 0; j < 6; j++) {
      pineapple(-1.7 + j * .49, 1.02, -.24, .20);
      if (j % 2) pineapple(-1.7 + j * .49, 1.40, -.18, .17);
    }
    const basket = cyl(.40, .32, .40, tint(P.wood, -.17), 2.4, .24, -1.0, 12);
    for (let j = 0; j < 4; j++) cyl(.41, .41, .025, P.wood, 2.4, .10 + j * .10, -1.0, 12);
    for (let j = 0; j < 5; j++) pineapple(2.4 + Math.sin(j * 2.4) * .23, .38, -1 + Math.cos(j * 2.4) * .20, .14);
    // The vendor has a weighing pan and an old cash tin, not a generic empty counter.
    cyl(.12, .16, .12, P.ink, -.65, 1.08, -.16, 10);
    box(.52, .05, .39, tint(P.rock, .35), -.65, 1.17, -.16);
    box(.44, .26, .31, tint(P.leaf, .1), .25, 1.15, -.2);
    box(.46, .04, .33, tint(P.leaf, -.2), .25, 1.30, -.2);
    bunting(-2.5, .46, 1.65, .46, 2.34);
  } else if (kind === 'cloud') {
    stoneWall(-.1, -1.2, 5.4, 0, .50);
    // Worn planks and brackets give the otherwise quiet lookout a human-scale anchor.
    for (let j = 0; j < 4; j++) box(2.3, .065, .13, tint(P.wood, j % 2 ? .07 : -.13), 2.25, .75, .55 + j * .16);
    for (const xx of [1.4, 3.1]) beam([xx, .13, .7], [xx, .75, .9], .045, P.ink);
    sign('CLOUD LINE\nLOOKOUT', -3.65, -.30, 1.9, 1.3, .80);
    const pennant = box(.5, .26, .035, P.roof, 4.6, 2.15, .25); pennant.rotation.y = -.2;
    box(.06, 2.35, .06, P.wood, 4.9, 1.175, .25);
    const flagPivot = new THREE.Group(); flagPivot.position.copy(pennant.position); pennant.position.set(0, 0, 0); group.add(flagPivot); flagPivot.add(pennant);
    group.userData.animations.push({ object: flagPivot, type: 'sway', phase: .8, speed: .65, amount: .12 });
  } else if (kind === 'edge') {
    // Strata plates and a displaced stone rail explain the cliff's fracture.
    for (let j = 0; j < 7; j++) {
      const xx = -4.4 + j * 1.3, zz = -.05 + Math.sin(j) * .25;
      const slab = box(.95, .26, .85, tint(P.rock, j % 2 ? .06 : -.12), xx, .70 + (j % 3) * .45, zz);
      slab.rotation.set(.08, -.2 + j * .1, -.12 + (j % 2) * .25);
    }
    const wire = beam([-.55, .50, -1.28], [1.1, .16, -1.3], .025, P.ink); wire.rotation.y = .03;
    sign('SHARP DROP\nNO OVERTAKING', 4.0, -.15, 1.7, 1.35, .70);
    box(.60, .06, .35, P.roof, -2.8, .18, -4.2);
  } else if (kind === 'shillong') {
    // The quiet lookout is separate from the truck's parking space and the roadway.
    paving(-5,-5.25,3.8,1.4);
    box(3.4,.35,.58,P.rock,-5,.175,-5.3);
    for(let j=0;j<3;j++)box(3.5,.07,.14,P.wood,-5,.48,-5.5+j*.17);
    for(const xx of [-6.8,-3.2])box(.24,.65,.52,P.rock,xx,.325,-5.3);
    lamp(-6.7,-4.4,2.8);
    // Stone retaining walls and stair landings tie the roofs into a believable hillside.
    stoneWall(-1.4, -.62, 5.5, 0, .48);
    for (let j = 0; j < 5; j++) box(.84, .09, .55, tint(P.rock, .25), .1, .1 + j * .17, -.6 + j * .45);
    paving(2.9, -.55, 2.0, 1.0);
    const washing = new THREE.Group(); group.add(washing);
    beam([1.7, 2.4, 2.8], [3.5, 2.4, 2.4], .014, P.wood, washing);
    for (let j = 0; j < 3; j++) {
      const cloth = box(.35, .48, .025, j === 1 ? P.roof : P.cream, 2 + j * .53, 2.16, 2.73 - j * .11, washing);
      cloth.rotation.y = -.21;
    }
    group.userData.animations.push({ object: washing, type: 'sway', phase: 1.5, speed: .6, amount: .025 });
    // A warm cafe threshold and two flower boxes make arrival feel inhabited.
    box(1.25, .08, .55, P.wood, 3.65, .12, -.15);
    for (const xx of [-3.9, 1.65]) {
      box(.64, .22, .30, P.wood, xx, .25, -.02);
      flowers(xx, -.02, 7, .45, P.pink, .32);
    }
  }
  const practical = {
    stand: { x: 2.1, y: 3.06, z: -.75 }, jorabat: { x: -2.8, y: 3.11, z: -1.75 },
    nongpoh: { x: 3.3, y: 3.26, z: -1.65 }, edge: { x: -2.7, y: 3.66, z: -.25 },
    shillong: { x: 3.6, y: 3.56, z: -.65 },
  };
  if (practical[kind]) group.userData.practical = practical[kind];
  // Hundreds of tiny fittings should cost a handful of draws, rather than a draw each.
  // Keep movable subtrees intact; merge only static geometry sharing the same material.
  const moving = new Set();
  for (const entry of group.userData.animations) entry.object.traverse(o => moving.add(o));
  if (group.userData.star) moving.add(group.userData.star);
  group.updateMatrixWorld(true);
  const batches = new Map();
  group.traverse(o => {
    if (!o.isMesh || moving.has(o) || Array.isArray(o.material)) return;
    if (!batches.has(o.material)) batches.set(o.material, []);
    batches.get(o.material).push(o);
  });
  for (const [material, pieces] of batches) {
    if (pieces.length < 2) continue;
    const geometries = pieces.map(o => {
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(o.matrixWorld); return g;
    });
    const geometry = new THREE.BufferGeometry();
    for (const [attribute, components] of [['position', 3], ['normal', 3], ['uv', 2]]) {
      const length = geometries.reduce((n, g) => n + g.getAttribute(attribute).array.length, 0);
      const data = new Float32Array(length); let offset = 0;
      for (const g of geometries) { const a = g.getAttribute(attribute).array; data.set(a, offset); offset += a.length; }
      geometry.setAttribute(attribute, new THREE.BufferAttribute(data, components));
    }
    const batch = new THREE.Mesh(geometry, material); batch.name = `${kind}-details`;
    batch.castShadow = batch.receiveShadow = true; group.add(batch);
    for (const piece of pieces) { piece.removeFromParent(); piece.geometry.dispose(); }
    for (const g of geometries) g.dispose();
  }
  return group;
}
