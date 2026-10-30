// Every colour in Hairpin lives here. The house palette is sampled from the edge painting (08-edge-scene/edge-lit.jpg
// and edge-dark.jpg); see STYLE.md. Scenes, shaders and the UI read from this file; tools/check_style.py fails on any
// colour literal anywhere else.

// the house palette
export const PALETTE = {
  night: '#07172d',      // the deep sky at the top of edge-dark
  sky: '#091c37',        // night sky
  ridge: '#193056',      // far ridges at night
  cloud: '#5a7398',      // the cloud sea, moonlit blue-grey
  rock: '#131f32',       // rock in shadow
  teal: '#223a43',       // night grass, teal-green
  tealLight: '#2f4b56',  // night grass highlights
  amber: '#f7c46b',      // headlight on cloud: the warm key
  gold: '#d89a30',       // headlight on grass
  warmRock: '#bc7a38',   // headlight on rock
  ember: '#ff7f29',      // the cigarette, the tail-lights' warmth
  paper: '#efe6cf',      // UI paper
  ink: '#141826',        // UI ink, and the line on things that move
  red: '#c8402f',        // UI accent
  mist: '#aab0cc',       // quiet UI text on navy
};

// the taxi: a black body and a yellow roof (a guess at Shillong's livery), and its parts
export const LIVERY = { body: '#1c1e23', roof: '#f2c230' };
export const TAXI = {
  glass: '#000000', speaker: '#2a2b30', speakerCone: '#6a6d75', headlamp: '#fff6d6', indicator: '#ffb347', taillamp: '#c8352a',
  grille: '#0d0e10', bumper: '#141518', plate: '#f4cf3a', pillar: '#5a5e68', handle: '#8b8f96', aerial: '#111215',
  tyre: '#0b0c0e', arch: '#0d0e10', wheel: '#121316', alloy: '#4d5158', alloyLip: '#c9ccd1', hub: '#24262a',
};

// the truck that gives you a lift: a Tata-style goods truck in hand-painted truck art (source-art/truck.png)
export const TRUCK = {
  cab: '#e3702b', crown: '#f0b23a', panel: '#efb03a', band: '#2c5aa8', green: '#2f8a4c', post: '#d24f2a', flower: '#d8342c',
  eye: '#f1ead8', iris: '#2b56b8', pupil: '#0b0b0d', tarp: '#5a4632', rope: '#a8875a', chassis: '#1a1918', tank: '#2b2a28',
  tyre: '#121212', rim: '#bf452f', hub: '#262626', glass: '#000000', lamp: '#fff2c8', tail: '#c8352a', mirror: '#202022',
  tassels: ['#d8342c', '#f0b23a', '#2f8a4c', '#2c5aa8', '#e3702b'],
  chrome: '#c9ccd1', seat: '#7a2a24', interior: '#1c1714', indicator: '#ffb347', doll: '#0b0b0d', dollEye: '#f4eedc', dollTongue: '#d8342c',
  chain: '#8b8f96',
  // the painted art (canvas textures, kit.js truckArt): sprite keys k ink, w white, y yellow, o orange, r red, p pink, b blue,
  // B deep blue, g green, G deep green, R post red, P plate yellow
  art: {
    k: '#1a1410', w: '#f4eedc', y: '#efb03a', o: '#e3702b', r: '#d8342c', p: '#f08a8a', b: '#2c5aa8', B: '#1b3a78',
    g: '#2f8a4c', G: '#1d5a32', R: '#d24f2a', P: '#f4cf3a',
  },
};

// Shillong in November: the Himalayan cherry in bloom (09-shillong/blossom.js). Deep to pale; lit = in warm light, dark = under the moon.
export const BLOSSOM = {
  lit: ['#a8455f', '#d77a95', '#efa7bb', '#fbd6df', '#fff4ee'],
  dark: ['#1e1530', '#3a2349', '#5a3464', '#80527e', '#aa82a2'],
  bark: '#16101c', barkLit: '#4a2e22', barkStreak: ['#2a1d2b', '#6b4632'],
  bulb: '#ffe2a8', bulbGlow: '#ff9dbb',
  petalDark: '#9c82ad', petalLit: '#ffd6e4', petalCore: '#d8628f', petalGlow: '#ff9a6b',
};

// skin tones, light to deep: tools/fit_palette.py reads them into the palettes (the people's own ramps are FOLK.skin)
export const SKIN_TONES = ['#efcdb2', '#d8a983', '#b98059', '#8c593a', '#5a3824'];
export const BASE_SKIN = 2;

// placeholder people: tinted from the palette, until the painted figures arrive
export const FIGURE = {
  shirts: ['#3b5068', '#6e3a4c', '#2f5a52', '#7a5434', '#4c4470', '#2b5578', '#6b5e34', '#5e3636'],
  skin: '#b88a68', hair: '#1a1520', legs: '#161a26', chai: '#e8d4a8', tea: '#b5692c', phone: '#b8d8ff',
  backFill: ['#191427', '#0b0f1e'], rim: '#56608c', bun: '#191427', tag: PALETTE.paper, tagText: PALETTE.ink,
};

// the climb's 3D stand-ins (hidden; the painted cut-outs are what you see)
export const CLIMB_STANDINS = {
  cowBrown: '#8a5a3c', cowWhite: '#e6dccb', cowPale: '#d9d2c4', cowDark: '#5a4a40', cowMuzzle: '#cdbda8', horn: '#e8e0cc',
  hoof: '#2b2522', eye: '#ffe9a0', dog: '#c49a5c', dogMuzzle: '#a07a45', dogEar: '#8a6438', walkerShirt: '#4b5d78', walkerLegs: '#2a2a2e',
  skin: '#c99772', hair: '#1c1714', umbrella: '#141518', pole: '#111215', basketShirt: '#7a3b52', basketSkirt: '#5a2c3c', basket: '#b88a4a', lampPole: PALETTE.ink, bulb: '#ffe9a8',
};

// Shillong's placeholder painting, drawn in code until shillong-lit/dark.jpg exist: [lit swatches, dark swatches]
export const SHILLONG_PLACEHOLDER = {
  sky: [['#1a2150', '#222a5c', '#151b44'], ['#121735', '#171d40', '#0f132c']],
  hill: [['#2c3a52', '#34445e', '#263248'], ['#161d30', '#1b2338', '#121828']],
  town: [['#5a5068', '#6a5d72', '#4a4258'], ['#1d1c2c', '#232234', '#181726']],
  ground: [['#8a7a5a', '#9c8a66', '#776a4e'], ['#1f2230', '#262938', '#1a1c28']],
  star: '#e8e4d0', lights: ['#ffd27a', '#ffe9b0', '#ffb860', '#f4f1e6'], rail: ['#c9c2ae', '#2b2e3c'], rimTown: '#7a6a58',
};

// shadows, clears and the ink pass's own buffers
export const UTIL = { shadow: '#05070d', clear: '#10142a', infoClear: '#8080ff', white: '#ffffff', black: '#000000' };

// the same palette for shaders: vec3 constants, plus the warm tint the headlights put on a lit painting
const v3 = hex => { const n = parseInt(hex.slice(1), 16); return `vec3(${((n >> 16) & 255) / 255}, ${((n >> 8) & 255) / 255}, ${(n & 255) / 255})`; };
export const GLSL_PALETTE = Object.entries(PALETTE).map(([k, v]) => `const vec3 C_${k.toUpperCase()} = ${v3(v)};`).join('\n') + `
const vec3 WARM_KEY = vec3(1.05, .97, .86);   // what the warm key does to a lit painting
const vec3 COOL_AMBIENT = vec3(.30, .34, .52); // what night does to a painted object`;

// the UI reads the palette as CSS variables
export function applyCSS(root = document.documentElement) {
  for (const [k, v] of Object.entries(PALETTE)) root.style.setProperty(`--${k}`, v);
  root.style.setProperty('--black', UTIL.black); root.style.setProperty('--white', UTIL.white);
  root.classList.add('styled');
}

// the pixel UI (PIXEL.md section 3): pocket.design's cream-paper idiom, warm ink, signal red. CSS vars --ui-<name>,
// set by applyUICSS() (index.html calls it right after applyCSS)
export const UI = {
  cream: '#fff9e5',      // panels, the dialogue box, buttons
  creamDeep: '#f4e8c4',  // hover and pressed fills, the speaker tab, inset rows
  ink: '#3a2a1c',        // warm ink: borders, text, hard shadows
  inkSoft: '#7a6248',    // quiet text on cream (hints, small print)
  inkLift: '#5c4632',    // a step up from ink: the chapters still ahead on the story window's progress bar
  signal: '#fd1500',     // the red accent: the next arrow, the speaker's name, focus
  wood: '#dfac76',       // the wood trim, the title card's frame
  olive: '#3d422b',      // the chalkboard green
  rust: '#a84323',       // deep red: pressed signal, the wordmark's shadow
};
export function applyUICSS(root = document.documentElement) {
  for (const [k, v] of Object.entries(UI)) root.style.setProperty(`--ui-${k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}`, v);
}

// ---- PIXEL_PALETTES: written by tools/fit_palette.py, do not edit by hand ----
// Per scene, dark to light, fitted in Oklab to its graded paintings (PIXEL.md 1). The final pass in shared/kit.js
// quantizes every frame to its scene's set, with a light 4x4 ordered dither in gradients.
export const PIXEL_PALETTES = {
  stand: ['#0b070c', '#030d18', '#141826', '#1f1a12', '#031a39', '#0e2429', '#25301b', '#0b2b60', '#1e383b', '#462f22', '#303756', '#344a2a', '#613941', '#354f55', '#3d5767', '#704d2f', '#3d625a', '#466634', '#616151', '#6b6234', '#60795a', '#8d6a4d', '#64759a', '#658c45', '#8c8951', '#be8759', '#a0a55f', '#8bba56', '#f2c230', '#f7c46b', '#ccef6f', '#efe6cf'],
  jorabat: ['#000000', '#00000a', '#090206', '#020c22', '#0f0c13', '#141826', '#371408', '#052043', '#2b201d', '#152634', '#0b325b', '#27374c', '#2f3939', '#443327', '#5b331d', '#163f73', '#264d80', '#5a4a42', '#465343', '#46546b', '#7b4a27', '#766344', '#ad692e', '#748493', '#9b8357', '#cb9c4f', '#ff7f29', '#f2c230', '#f7c46b', '#efe6cf', '#ffea5a', '#faedaa'],
  climb: ['#0b0a12', '#0d122c', '#141826', '#0f1f3c', '#2c1d16', '#232a36', '#142b4b', '#3c272a', '#2a3934', '#1b365c', '#473322', '#3a4a38', '#5c3d31', '#374964', '#6e3a4c', '#4e5539', '#305c80', '#7b5336', '#566835', '#656345', '#4e747f', '#6b698e', '#75782d', '#b16c3a', '#968a2d', '#9f856b', '#b58e2c', '#d3a144', '#f2c230', '#f7c46b', '#efe6cf', '#f2e4e5'],
  nongpoh: ['#000003', '#060b13', '#23100b', '#03172e', '#141826', '#15231e', '#14273b', '#0c254c', '#41281b', '#32313c', '#1f3654', '#383b1c', '#22413d', '#0a3282', '#384661', '#663d24', '#584442', '#415a7f', '#645d2a', '#89502a', '#1e5ebf', '#637899', '#8d7562', '#b76225', '#ad8227', '#b5825a', '#ff7f29', '#c9a97a', '#f19936', '#f2c230', '#f7c46b', '#efe6cf'],
  cloud: ['#000208', '#050c05', '#060f19', '#001435', '#141826', '#1d1912', '#0b2034', '#212925', '#342516', '#203450', '#4a3721', '#324663', '#3b4a4a', '#674319', '#644a3e', '#465267', '#435a7a', '#5e6371', '#805d37', '#5f7493', '#767478', '#ac6c28', '#938479', '#b09276', '#ff7f29', '#e49635', '#d3a779', '#f2c230', '#f7c46b', '#b8d8ff', '#ffe276', '#efe6cf'],
  edge: ['#010204', '#070b11', '#1a170f', '#141826', '#091b36', '#332213', '#1c2b3e', '#2c2f2c', '#1a2f50', '#50311c', '#473b22', '#4e3738', '#36495d', '#664240', '#70411d', '#605040', '#485d82', '#81533e', '#755c2d', '#9b5a2f', '#716f75', '#967051', '#6982a6', '#b57133', '#968877', '#be8963', '#d9904e', '#b2a78b', '#e7aa69', '#f2c230', '#f7c46b', '#efe6cf'],
  shillong: ['#100d14', '#141826', '#14193c', '#221e2f', '#1c2350', '#212c41', '#3e2240', '#2e2d3c', '#402b1d', '#3c3a44', '#30405a', '#613457', '#4f475e', '#565044', '#6c4731', '#844b6e', '#6a5d72', '#786a52', '#647395', '#c05377', '#938262', '#a57598', '#b87c51', '#d77a95', '#c294ae', '#ff7f29', '#f7a2bb', '#f2c230', '#f7c46b', '#e4cea8', '#e8cbd8', '#efe6cf'],
};
// ---- end PIXEL_PALETTES ----

// ---- FOLK: the pixel people (shared/folk.js). Ramps are [shadow, base, light]; skin adds a blush. These are the lit
// colours (in warm light); folk.js derives the night ramp with FOLK.night, the same cool ambient paintMat uses. ----
export const FOLK = {
  outline: '#1d1620',   // the 1 px line on people: a warm ink
  eye: '#1a1420', eyeHi: '#fff8ec', mouth: '#6e2a2a',
  skin: [   // light to deep: [shadow, base, light, blush]
    ['#d9a183', '#f2c8a6', '#fde3cb', '#ee9f8e'],
    ['#c4875f', '#e0ab80', '#f2c79e', '#df8b72'],
    ['#a3653c', '#c88a5a', '#e0a878', '#c9705a'],
    ['#764628', '#9a633e', '#b98056', '#a55744'],
    ['#4b2a19', '#6a3e25', '#8a5a3a', '#7d3d32'],
  ],
  hair: { black: ['#1c1724', '#322a3e', '#5a4e6c'], brown: ['#2a1a14', '#45291d', '#6e4530'], grey: ['#5c5a62', '#8a8890', '#bdbcc2'] },
  // tops: [main ramp, second ramp (the tee under a jacket, a check's light stripe, a shirt under a sweater)]
  top: {
    tee: [['#a86f18', '#d69a2e', '#f2c35a'], ['#cbbf9f', '#ece2c6', '#fff7e2']],
    hoodie: [['#28433a', '#3c6253', '#5a8572'], ['#cbbf9f', '#ece2c6', '#fff7e2']],
    kurta: [['#b3a382', '#ddd0b2', '#f8eed4'], ['#9c6a30', '#c08c46', '#dcae68']],
    denim: [['#2a466c', '#3c6292', '#5a84b4'], ['#cbbf9f', '#ece2c6', '#fff7e2']],
    shawl: [['#561c25', '#7a2832', '#9e3c44'], ['#b9a37c', '#e0cda6', '#f4e6c4']],
    jacket: [['#2b2f1f', '#40472d', '#5a6340'], ['#cbbf9f', '#ece2c6', '#fff7e2']],   // you: dark olive zip jacket, cream tee
    shirt: [['#b4b1a8', '#e2dfd6', '#fbf9f2'], ['#8a8780', '#b4b1a8', '#e2dfd6']],      // the grandfather: white half-sleeve
    vest: [['#3e2f22', '#5e4630', '#7e6244'], ['#a9b5c2', '#d0d9e2', '#eef2f6']],       // the friend: sleeveless sweater, pale shirt
    work: [['#2c3648', '#435470', '#5f7492'], ['#cbbf9f', '#ece2c6', '#fff7e2']],       // the walker's shirt
    jainsem: [['#561c25', '#7a2832', '#9e3c44'], ['#b9a37c', '#e0cda6', '#f4e6c4']],    // the basket woman: Khasi jainsem, maroon and cream
  },
  legs: { jeans: ['#20304a', '#31476b', '#48618c'], grey: ['#4a4c52', '#6b6d74', '#8c8e94'], dark: ['#1c1d24', '#2c2e37', '#42444f'], khaki: ['#5e4f34', '#806c48', '#a08a62'], cloth: ['#3a1820', '#561c25', '#7a2832'] },
  shoes: { sneaker: ['#5e6066', '#90939a', '#e6e3dc'], white: ['#9c9a94', '#d6d3cb', '#fbfaf5'], dark: ['#181316', '#2c2227', '#4a3c40'], sandal: ['#4a3220', '#6b4a2c', '#8a6440'] },
  // extras and props: [shadow, base, light] (+ a second ramp where a check or a handle needs one)
  headphones: [['#9a917c', '#e6dfcc', '#d04a38']],
  glasses: [['#120e14', '#2a2430', '#cfe6f5']],
  muffler: [['#8a5a1c', '#c08a2e', '#e8b852'], ['#6e2420', '#9a3428', '#c04a36']],
  mufflerYou: [['#4e2116', '#733220', '#94462a'], ['#2e1510', '#3e1d14', '#b0683e']],   // red-brown check
  cap: ['#6e1c18', '#a02c26', '#cc463a'],
  umbrella: [['#0c0d10', '#1a1b20', '#3a3c46'], ['#3a2a1c', '#6b4a2c', '#8c6640']],
  basket: [['#6e4a22', '#a07236', '#c99a56'], ['#3e2a1a', '#5e4228', '#82613e']],
  // night: lit colour x mul + the night sky x add (paintMat's cool ambient); the warm key brightens a lit sprite
  night: { mul: [0.30, 0.34, 0.52], add: 0.5, sky: PALETTE.night, warm: [1.06, 0.98, 0.88], amber: PALETTE.amber },
  rimCool: '#6c85a9',   // the 1 px rim on the lit side under a cool light (sky, moon); a warm light rims in the slot's warm step
  // him in ink (the edge): the grandfather as a 1 px paper line; the ember [glowing, drawing on it], no halo
  ghost: { line: '#fff9e5', ember: ['#ff7f29', '#f2c230'] },
  // then (the flashback, setThen): hair goes sepia, cool colours go most of the way to the sepia tone, warm ones part way;
  // dark steps fall toward a brown, not the navy night
  then: {
    hair: ['#3a2618', '#5a3c22', '#7b4e43'], tone: ['#2a1a10', '#7b4e43', '#ecd6aa'], cool: 0.8, warm: 0.4,
    night: { mul: [0.52, 0.44, 0.36], add: 0.5, sky: '#2a1a10', warm: [1.06, 0.98, 0.88], amber: PALETTE.amber },
  },
  shadow: UTIL.shadow,
  sheet: { cream: '#fff9e5', night: PALETTE.night, ink: '#3a2a1c', red: '#fd1500', grid: '#e8dcbc' },   // tools/folk-sheet.html
};
