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
};

// Shillong in November: the Himalayan cherry in bloom (09-shillong/blossom.js). Deep to pale; lit = in warm light, dark = under the moon.
export const BLOSSOM = {
  lit: ['#a8455f', '#d77a95', '#efa7bb', '#fbd6df', '#fff4ee'],
  dark: ['#1e1530', '#3a2349', '#5a3464', '#80527e', '#aa82a2'],
  bark: '#16101c', barkLit: '#4a2e22', barkStreak: ['#2a1d2b', '#6b4632'],
  bulb: '#ffe2a8', bulbGlow: '#ff9dbb',
  petalDark: '#9c82ad', petalLit: '#ffd6e4', petalCore: '#d8628f', petalGlow: '#ff9a6b',
};

// the customiser's skin tones, light to deep (shared/look.js recolours the base figure's skin, keeping its shading);
// the base images are painted at BASE_SKIN
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
