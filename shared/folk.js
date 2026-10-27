// Folk: Hairpin's pixel people. Every frame is hand-authored pixel data in this file (PIXEL.md section 2), in the spirit
// of pocket.design's chibi people, drawn by us.
//
// Sprites are indexed: each pixel is a palette slot (a letter in the maps below). A figure is layered on one grid from
// parts (legs, body, arms, head) and overlays (hair, the top's details, extras, props), so every look is correct by
// construction. A person's colours are ramps from FOLK in style.js; the night ramp is derived from the lit one, and the
// shader picks each slot's colour from one of five light steps (quantized, never blended), plus a 1 px darker rim on the
// side away from the light, plus a pixel ellipse shadow.
//
//   const p = folk.person(look | 'you' | 'grandpa' | 'friend' | 'walker' | 'basket', { size: 'near' | 'far' })
//   scene.add(p.obj); stage.place(p.obj, x, y, paintPxPerSpritePx)   // p.obj's origin is the foot anchor; 1 unit = 1 sprite px
//   p.face('left' | 'right' | 'front' | 'back'); p.play('walk');
//   every frame: x += p.update(dt) * (facing left ? -1 : 1)          // update returns the sprite px walked: feet never slide
//   p.setLight(0..1.2, side = -1)                                    // side: where the light comes from, -1 = screen left
import * as THREE from 'three';
import { FOLK } from './style.js';

// ---------- slots ----------
// . clear  o outline  S s l r skin (shadow, base, light, blush)  H h j hair  T t u top  V v w the top's second colour
// D d E sleeve  F f g forearm (skin under short sleeves)  P p q trousers  B b n shoes (n: sole)  e eye  W eye glint
// m mouth  A a c extra  X x y extra's second ramp, or a prop  K k z cap, or a prop's second ramp.   _ in an overlay erases.
const CH = '.oSslrHhjTtuVvwDdEFfgPpqBbneWmAacXxyKkz';
const SLOT = Object.fromEntries([...CH].map((c, i) => [c, i]));
const NS = CH.length;

// a head seen from behind: the same skull with the face taken off
const faceless = (map, nose) => map.map((r, j) => [...r].map((c, i) => 'HeWmr'.includes(c) || (nose && j === nose[0] && i === nose[1]) ? 's' : c).join(''));
const L = (on, x, y, layer, map) => ({ on, x, y, layer, map });   // an overlay layer, riding on a part

/* ======================================================================================================================
   NEAR: about 44 px standing. Cell 32 x 48, figure centred on column 15, feet on the bottom row. Parts are 17 wide at x 7.
   ==================================================================================================================== */
const N_HEAD_M = [
  '.....ooooooo.....',
  '...oosssssssoo...',
  '..ossssssssssso..',
  '.ossssssssssssso.',
  '.ossssssssssssso.',
  '.ossssssssssssso.',
  '.ossssssssssssso.',
  '.osssssssssssSSo.',
  '.ossssssssssssSo.',
  '.ossHHsssssHHsSo.',
  'oSssWesssssWesSSo',
  'oSsseessssseesSSo',
  'oSsrsssssSsssrSSo',
  '.ossssSsssSsssSo.',
  '..ossssmmmsssSo..',
  '...osssssssSSo...',
  '....ooossSooo....',
  '......oSSSo......'];
const N_HEAD_F = N_HEAD_M.map((r, j) => j === 10 ? 'oSseWesssssWeeSSo' : r);
const N_HEAD_L = [
  '.....ooooooo.....',
  '...oosssssssoo...',
  '..ossssssssssso..',
  '.ossssssssssssso.',
  '.ossssssssssssso.',
  '.ossssssssssssso.',
  '.ossssssssssssso.',
  '.ossssssssssssSo.',
  '.ossssssssssSsSo.',
  '.osHsssHHssssSSo.',
  '.osesssWessSSsSo.',
  '.osesssesssSosSo.',
  'osssssssrssSSsSo.',
  '.ossssssSssssSo..',
  '..osssmmmsssSo...',
  '...osssssssSo....',
  '....oooosSSoo....',
  '......oSSSo......'];
const N_HEAD_LF = N_HEAD_L.map((r, j) => j === 10 ? '.osesssWeesSSsSo.' : r);
const N_BODY_M = [
  '....ooooooooo....',
  '...outTSSSTtTo...',
  '...outtTSTttTo...',
  '...outtttttTTo...',
  '...outtttttTTo...',
  '...outtttttTTo...',
  '...outtttttTTo...',
  '...outtttttTTo...',
  '...outtttttTTo...',
  '...outtttttTTo...',
  '...outtttttTTo...',
  '...oTTTTTTTTTo...'];
const N_BODY_F = [
  '....ooooooooo....',
  '...outSSSSStTo...',
  '...outtSSSttTo...',
  '...outtttttTTo...',
  '...outtttttTTo...',
  '...outtttttTTo...',
  '....ottttttTo....',
  '....ottttttTo....',
  '...outtttttTTo...',
  '...outtttttTTo...',
  '...outtttttTTo...',
  '...oTTTTTTTTTo...'];
const N_BODY_L = [
  '.....ooooooo.....',
  '....ouTSSSTto....',
  '....outTSTtTo....',
  '....outtttTTo....',
  '....outtttTTo....',
  '....outtttTTo....',
  '....outtttTTo....',
  '....outtttTTo....',
  '....outtttTTo....',
  '....outtttTTo....',
  '....outtttTTo....',
  '....oTTTTTTTo....'];
const N_BODY_LF = N_BODY_L.map((r, j) => j === 1 ? '....ouSSSSSto....' : j === 2 ? '....outSSStTo....' : j === 6 || j === 7 ? '.....ottttTo.....' : r);
const N_BODY_B = [
  '....ooooooooo....',
  '...outtSSSttTo...',
  '...outttttttTo...',
  '...outtttttTTo...',
  '...outtttttTTo...',
  '...outtttttTTo...',
  '...outtttttTTo...',
  '...outtttttTTo...',
  '...outtttttTTo...',
  '...outtttttTTo...',
  '...outtttttTTo...',
  '...oTTTTTTTTTo...'];
const N_BODY_BF = N_BODY_B.map((r, j) => j === 6 || j === 7 ? '....ottttttTo....' : r);

const N_ARMS_DOWN = [
  '.................',
  '.oo...........oo.',
  'oEdo.........odDo',
  'oEdo.........odDo',
  'oEdo.........odDo',
  'ogfo.........ofFo',
  'ogfo.........ofFo',
  'ogfo.........ofFo',
  'ogfo.........ofFo',
  'ogfo.........ofFo',
  'ogfo.........ofFo',
  'olso.........osSo',
  'osso.........osSo',
  '.oo...........oo.'];
// waving: the arm on the viewer's left goes up beside the head (20 wide at x 1; 8 rows above the body)
const N_WAVE = hand => [
  ...(hand ? [
    '..oo................',
    '.olso...............',
    '.osSo...............',
    '.ogfo...............',
    'ogfo................',
    'ogfo................'] : [
    '...oo...............',
    '..olso..............',
    '..osSo..............',
    '..ogfo..............',
    '..ogfo..............',
    '..ogfo..............']),
  hand ? 'ogfo................' : '..ogfo..............',
  hand ? '.ogfoooo............' : '..ogfoooo...........',
  '..ogEEEdo...........',
  '..oDDDDDDo..........',
  '...ooooodo..........',
  '........odo.......oo',
  '........o.o......odD',
  '..................od'];
const N_ARMS_L = {
  down: [
    '.................',
    '..oo.......oo....',
    '.odDo.....oEdo...',
    '.odDo.....oEdo...',
    '.odDo.....oEdo...',
    '.ofFo.....ogfo...',
    '.ofFo.....ogfo...',
    '.ofFo.....ogfo...',
    '.ofFo.....ogfo...',
    '.ofFo.....ogfo...',
    '.ofFo.....ogfo...',
    '.osSo.....olso...',
    '.osSo.....osSo...',
    '..oo.......oo....'],
  fwd: [
    '.................',
    '...........oo....',
    '..........oEdo...',
    '..........oEdo...',
    '.........oEdo....',
    '.........ogfo....',
    '........ogfo.....',
    '........ogfo.....',
    '.......ogfo......',
    '.......ogfo......',
    '......olso.......',
    '......osSo.......',
    '.......oo........'],
  bwd: [
    '.................',
    '..oo.......oo....',
    '.odDo.....oEdo...',
    '.odDo.....oEdo...',
    'odDo.......oEdo..',
    'ofFo.......ogfo..',
    'ofFo........ogfo.',
    'ofFo........ogfo.',
    'osSo........olso.',
    'osSo........osSo.',
    '.oo..........oo..'],
};
// waving at the taxi: the near arm up past the back of the head (21 wide at x 7, 8 rows above the body)
const N_WAVE_L = hand => [
  hand ? '.................oo..' : '..................oo.',
  hand ? '................olso.' : '.................olso',
  hand ? '................osSo.' : '.................osSo',
  hand ? '................ogfo.' : '.................ogfo',
  hand ? '.................ogfo' : '.................ogfo',
  '.................ogfo',
  '.................ogfo',
  '............ooooogfo.',
  '..oo.......oEEEEdgo..',
  '.odDo.....oEddDDDo...',
  '.odDo.....oDDooooo...',
  '.odDo.....ooo........',
  '.ofFo................',
  '.ofFo................',
  '.ofFo................',
  '.ofFo................',
  '.ofFo................',
  '.ofFo................',
  '.osSo................',
  '.osSo................',
  '..oo.................'];

const N_LEGS = {
  stand: [
    '...oqpppppppPo...',
    '...oqpppPpppPo...',
    '...oqppPopppPo...',
    '...oqppPopppPo...',
    '...oqppPopppPo...',
    '...oqppPopppPo...',
    '...oqppPopppPo...',
    '...oqppPopppPo...',
    '...oPPPPoPPPPo...',
    '..obbbbbobbbbBo..',
    '..onnnnnonnnnno..',
    '...ooooo.ooooo...'],
  liftL: [
    '...oqpppppppPo...',
    '...oqpppPpppPo...',
    '...oqppPopppPo...',
    '...oqppPopppPo...',
    '...oqppPopppPo...',
    '...oqppPopppPo...',
    '...oqppPopppPo...',
    '...oPPPPopppPo...',
    '..obbbbboPPPPo...',
    '..onnnnnobbbbBo..',
    '...oooooonnnnno..',
    '.........ooooo...'],
  liftR: [
    '...oqpppppppPo...',
    '...oqpppPpppPo...',
    '...oqppPopppPo...',
    '...oqppPopppPo...',
    '...oqppPopppPo...',
    '...oqppPopppPo...',
    '...oqppPopppPo...',
    '...oqppPoPPPPo...',
    '...oPPPPobbbbBo..',
    '..obbbbbonnnnno..',
    '..onnnnnoooooo...',
    '...ooooo.........'],
  // sitting down at a ledge, from behind: knees bend, then the seat lands on the ledge (legs over the edge, out of sight)
  crouch: [
    '...oqpppppppPo...',
    '..oqppppPppppPo..',
    '..oqpppo.opppPo..',
    '..oqpppo.opppPo..',
    '..oqpppo.opppPo..',
    '..oPPPPo.oPPPPo..',
    '.obbbbbo.obbbbBo.',
    '.onnnnno.onnnnno.',
    '..ooooo...ooooo..'],
  squat: [
    '..oqppppppppPPo..',
    '..oqppppPppppPo..',
    '.oqpppo...opppPo.',
    '.obbbbo...obbbbo.',
    '.onnnno...onnnno.',
    '..oooo.....oooo..'],
  seat: [
    '..oqppppppppPPo..',
    '..oqpppppppppPo..',
    '..oPPPPPPPPPPPo..',
    '...ooooooooooo...'],
};
// three-quarter, facing left: 19 wide at x 6. Contact frames are a row shorter, so the body dips.
const N_LEGS_L = {
  stand: [
    '....oqpppppppPo....',
    '....oqpppPpppPo....',
    '....oqppPopppPo....',
    '....oqppPopppPo....',
    '....oqppPopppPo....',
    '....oqppPopppPo....',
    '....oqppPopppPo....',
    '....oqppPopppPo....',
    '....oPPPPoPPPPo....',
    '..obbbbbobbbbBo....',
    '..onnnnnonnnnno....',
    '...ooooo.ooooo.....'],
  w0: [
    '....oqpppppppPo....',
    '....oqpppppppPo....',
    '....oqpppoppPPo....',
    '...oqpppo.oppPPo...',
    '...oqpppo.oppPPo...',
    '..oqpppo...oppPPo..',
    '.oqpppo.....oppPPo.',
    '.oPPPPo.....oPPPPo.',
    'obbbbbo....oBbbbo..',
    'onnnnno....onnnno..',
    '.ooooo......oooo...'],
  w1: [
    '....oqpppppppPo....',
    '....oqpppppppPo....',
    '....oqpppoppPPo....',
    '....oqpppoppPPo....',
    '....oqpppoppPPo....',
    '....oqpppo.oPPPo...',
    '....oqpppo..oPPPo..',
    '....oqpppo..oPPPo..',
    '....oPPPPo..oBbbo..',
    '...obbbbbo...ooo...',
    '...onnnnno.........',
    '....ooooo..........'],
  w2: [
    '....oqpppppppPo....',
    '....oqpppppppPo....',
    '....oppPPoqpppo....',
    '...oppPPo.oqpppo...',
    '...oppPPo.oqpppo...',
    '..oppPPo...oqpppo..',
    '.oppPPo.....oqpppo.',
    '.oPPPPo.....oPPPPo.',
    'oBbbbbo....obbbbo..',
    'onnnnno....onnnno..',
    '.ooooo......oooo...'],
  w3: [
    '....oqpppppppPo....',
    '....oqpppppppPo....',
    '....oppPPoqpppo....',
    '....oppPPoqpppo....',
    '....oppPPoqpppo....',
    '....oppPPo.oqppo...',
    '....oppPPo..oqppo..',
    '....oppPPo..oqppo..',
    '....oPPPPo..obbbo..',
    '...oBbbbbo...ooo...',
    '...onnnnno.........',
    '....ooooo..........'],
};

// ---- near overlays ----
const N_HAIR = {
  short: {
    front: [L('head', 0, -1, 'hair', [
      '....ooooooooo....',
      '..oohhhhhhhhhoo..',
      '.ohhjjjjhhhhhhHo.',
      'ohjjhhhhhhhhhhHHo',
      'ohjhhhhhhhhhhhHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohH...oHhhhhHHHHo',
      'oHo.....oHHHo.HHo',
      'oH.............Ho'])],
    left: [L('head', 0, -1, 'hair', [
      '....ooooooooo....',
      '..oohhhhhhhhhoo..',
      '.ohhjjjjhhhhhhHo.',
      'ohjjhhhhhhhhhhHHo',
      'ohjhhhhhhhhhhhHHo',
      'ohhhhhhhhhhhHHHHo',
      'ohhhhhhhhhhhHHHHo',
      'ohhhhhhhhhhhhHHHo',
      'oHHo..oHhhhhhHHHo',
      '.oo.....oHhhhHHHo',
      '..........oHhHHo.',
      '.............HHo.',
      '.............HHo.',
      '............oHo..'])],
    back: [L('head', 0, -1, 'hair', [
      '....ooooooooo....',
      '..oohhhhhhhhhoo..',
      '.ohhjjjjhhhhhhHo.',
      'ohjjhhhhhhhhhhHHo',
      'ohjhhhhhhhhhhhHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhhHHHo',
      '..hhhhhhhhhhhHH..',
      '..hhhhhhhhhhhHH..',
      '..HhhhhhhhhhHHH..',
      '..oHHhhhhhHHHHo..',
      '...ooooooooooo...'])],
  },
  long: {
    front: [L('head', 0, 15, 'back', [
      '.HHHHHHHHHHHHHHH.',
      '.HHHHHHHHHHHHHHH.',
      '.HHHHHHHHHHHHHHH.',
      '.HHHHHHHHHHHHHHH.',
      '.HHHHHHHHHHHHHHH.']),
    L('head', 0, -1, 'hair', [
      '....ooooooooo....',
      '..oohhhhhhhhhoo..',
      '.ohhjjjjhhhhhhHo.',
      'ohjjhhhhhhhhhhHHo',
      'ohjhhhhhhhhhhhHHo',
      'ohhhhhhhhhhhhhHHo',
      'ohhhhhhhoHhhhhHHo',
      'ohhhhhhoHHhhhhHHo',
      'ohhhhhoHHHhhhhHHo',
      'ohhhHo..oHHhhhHHo',
      'ohHo.......oHHHHo',
      'ohH..........HHho',
      'ojH..........HHho',
      'ojH..........HHho',
      'ojH..........HHho',
      'ojhH........HHHho',
      'ojhH........HHhho',
      'ojhho......oHhhho',
      'ojhho......oHhhho',
      'ohhho......oHhhHo',
      'ohhHo......oHHHHo',
      'ohHHo......oHHHHo',
      '.oooo......ooooo.'])],
    left: [L('head', 0, -1, 'hair', [
      '....ooooooooo....',
      '..oohhhhhhhhhoo..',
      '.ohhjjjjhhhhhhHo.',
      'ohjjhhhhhhhhhhHHo',
      'ohjhhhhhhhhhhhHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhHHHHo',
      'ohhhhhhhhhhhhHHHo',
      'oHHo..oHhhhhhHHHo',
      'oHo.....oHhhhHHHo',
      'oHo.......ohhHHHo',
      'oHo.......ohhHHHo',
      '.o........ohhHHHo',
      '..........ohhHHHo',
      '..........ohhhHHo',
      '..........ohhhHHo',
      '...........ohhHHo',
      '...........ohhHHo',
      '...........ohhHHo',
      '...........ohhHHo',
      '...........ohhHHo',
      '...........ohHHHo',
      '............oooo.'])],
    back: [L('head', 0, -1, 'hair', [
      '....ooooooooo....',
      '..oohhhhhhhhhoo..',
      '.ohhjjjjhhhhhhHo.',
      'ohjjhhhhhhhhhhHHo',
      'ohjhhhhhhhhhhhHHo',
      'ohhhhhhhhhhhhhHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ojhhhhhhhhhhhHHHo',
      'ojhhhhhhhhhhhHHHo',
      'ojhhhhhhhhhhhHHHo',
      'ojhhhhhhhhhhhHHHo',
      'ojhhhhhhhhhhhHHHo',
      'ojhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhHHHHo',
      'ohhhhhhhhhhhHHHHo',
      'ohhhHhhhhhHhHHHHo',
      'ohHHhHhhhHHhHHHHo',
      '.oooHoHHHoHHoooo.',
      '.....o.ooo.o.....'])],
  },
  bun: {
    front: [L('head', 0, -5, 'hair', [
      '......ooooo......',
      '.....ojjhhHo.....',
      '.....ojhhhHo.....',
      '.....oHhhHHo.....',
      '....ooooooooo....',
      '..oohhjhhhhhhoo..',
      '.ohjjjhhhhhhhhHo.',
      'ohjhhhhhhhhhhhHHo',
      'ohhhhhhhhhhhhhHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhHhhhhhHHHo',
      'ohhhhhH...HhhHHHo',
      'ohhhHH.....HHHHHo',
      'ohHH.........HHHo',
      'oHH...........HHo'])],
    left: [L('head', 0, -4, 'hair', [
      '...........oooo..',
      '..........ohhjHo.',
      '..........ojhhHo.',
      '....ooooooooHHHo.',
      '..oohhjhhhhhhoo..',
      '.ohjjjhhhhhhhhHo.',
      'ohjhhhhhhhhhhhHHo',
      'ohhhhhhhhhhhhhHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohH....HHhhhhHHHo',
      'oH......oHhhHHHHo',
      '.o.......oHhHHHo.',
      '.............HHo.',
      '.............oo..'])],
    back: [L('head', 0, -5, 'hair', [
      '......ooooo......',
      '.....ojjhhHo.....',
      '.....ojhhhHo.....',
      '.....oHhhHHo.....',
      '....ooHHHHHoo....',
      '..oohhjhhhhhhoo..',
      '.ohjjjhhhhhhhhHo.',
      'ohjhhhhhhhhhhhHHo',
      'ohhhhhhhhhhhhhHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhhhhhhhhhhhHHHo',
      '..hhhhhhhhhhhHH..',
      '..hhhhhhhhhhhHH..',
      '..oHhhhhhhhhHHo..',
      '...oHHHHHHHHHo...',
      '....ooooooooo....'])],
  },
  curly: {
    front: [L('head', 0, -2, 'hair', [
      '...oo.ooo.oo.....',
      '..ojjojhhojhoo...',
      '.ojhhhjhhhjhhhHo.',
      'ojhhjhhhjhhhjhHHo',
      'ohhjhhhjhhhjhhHHo',
      'ojhhhjhhhjhhhHHHo',
      'ohhjhhhjhhhjhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohHhhHhhHhhHhHHHo',
      'oHoHHoHHoHHoHHHHo',
      'oHo.o.oo.oo.o.HHo',
      'oHH...........HHo',
      '.oo...........oo.'])],
    left: [L('head', 0, -2, 'hair', [
      '....oo.ooo.oo....',
      '..oojhojhhojhoo..',
      '.ojhhhjhhhjhhhHo.',
      'ojhhjhhhjhhhjhHHo',
      'ohhjhhhjhhhjhhHHo',
      'ojhhhjhhhjhhhHHHo',
      'ohhjhhhjhhhjhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohHhhHhhHhhhhHHHo',
      'oHoHHoHHohhjhHHHo',
      '.o.oo.oo.oHhHHHHo',
      '..........oHhHHHo',
      '...........oHHHHo',
      '............oHHo.',
      '.............oo..'])],
    back: [L('head', 0, -2, 'hair', [
      '...oo.ooo.oo.....',
      '..ojjojhhojhoo...',
      '.ojhhhjhhhjhhhHo.',
      'ojhhjhhhjhhhjhHHo',
      'ohhjhhhjhhhjhhHHo',
      'ojhhhjhhhjhhhHHHo',
      'ohhjhhhjhhhjhHHHo',
      'ojhhhjhhhjhhhHHHo',
      'ohhjhhhjhhhjhHHHo',
      'ohhhhhhhhhhhhHHHo',
      'ohhjhhhjhhhjhHHHo',
      'ohhhhhhhhhhhhHHHo',
      '.ohHhhHhhHhhHHHo.',
      '..hHhhHhhHhhHHH..',
      '..oHoHHoHHoHHHo..',
      '...o.oo.oo.ooo...'])],
  },
  cap: {
    front: [L('head', 0, -1, 'hair', [
      '....ooooooooo....',
      '..oozzzkkkkkkoo..',
      '.ozzkkkkkkkkkkKo.',
      'ozkkkkkkkkkkkkKKo',
      'okkkkkkkzkkkkkKKo',
      'okkkkkkkkkkkkkKKo',
      'okkkkkkkkkkkkKKKo',
      'oKKKKKKKKKKKKKKKo',
      'ozzzzzzzzzzzkkkKo',
      'ooooooooooooooooo',
      'oHh...........hHo',
      'oH.............Ho'])],
    left: [L('head', -4, -1, 'hair', [
      '........ooooooooo....',
      '......oozzzkkkkkkoo..',
      '.....ozzkkkkkkkkkkKo.',
      '....ozkkkkkkkkkkkkKKo',
      '....okkkkkkkkkkkkkKKo',
      '....okkkkkkkkkkkkKKKo',
      '....okkkkkkkkkkkKKKKo',
      '....oKKKKKKKKKKKKKKKo',
      'oooozzzzzzzzzoHhhHHHo',
      'ozzzzzzzzzzzo.oHhHHo.',
      '.oooooooooooo...oHHo.',
      '.................HHo.',
      '.................oo..'])],
    back: [L('head', 0, -1, 'hair', [
      '....ooooooooo....',
      '..oozzzkkkkkkoo..',
      '.ozzkkkkkkkkkkKo.',
      'ozkkkkkkkkkkkkKKo',
      'okkkkkkkkkkkkkKKo',
      'okkkkkkkkkkkkkKKo',
      'okkkkkkkkkkkkKKKo',
      'okkkkkkkkkkkkKKKo',
      'oKKKKKooooKKKKKKo',
      'ohhhhHo..oHhhHHHo',
      'ohhhhhHooHhhhHHHo',
      '..hhhhhhhhhhhHH..',
      '..HhhhhhhhhhHHH..',
      '..oHHhhhhhHHHHo..',
      '...ooooooooooo...'])],
  },
};

// the top's details, on the body (the colour of a top is its palette, so these only add what a palette can't)
const N_KURTA_HEM = ['...outtttttTTo...', '...outtttttTTo...', '...outtttttTTo...', '...outttttTTTo...', '...outttttTTTo...', '..ouuttttttTTTo..', '..oTTTTTTTTTTTo..', '...ooooooooooo...'];
const N_KURTA_HEM_L = ['....outtttTTo....', '....outtttTTo....', '....outtttTTo....', '....outttTTTo....', '....outttTTTo....', '...ouuttttTTTo...', '...oTTTTTTTTTo...', '....ooooooooo....'];
const hem = (mid, edge, end, n) => [...Array(n)].map((_, j) => j === n - 1 ? end : j === n - 2 ? edge : mid);
const N_JAINSEM_HEM = hem('...outtttttTTo...', '...oTTTTTTTTTo...', '...ooooooooooo...', 10);
const N_JAINSEM_HEM_L = hem('....outtttTTo....', '....oTTTTTTTo....', '....oooooooo.....', 10);
const N_TOPS = {
  hoodie: {
    front: [L('body', 0, -1, 'cloth', [
      '...ooo.....ooo...',
      '...oTTo...oTTo...',
      '....uTTTTTTTT....',
      '.......w.w.......',
      '.......w.w.......',
      '.......v.v.......',
      '.................',
      '.................',
      '....TTTTTTTTT....',
      '.....T.....T.....',
      '.....T.....T.....',
      '....tTtTtTtTt....'])],
    left: [L('body', 0, -1, 'cloth', [
      '..........ooo....',
      '.........oTTTo...',
      '.....uTTTTTTT....',
      '.......w.........',
      '.......w.........',
      '.......v.........',
      '.................',
      '.................',
      '.....TTTTT.......',
      '.....T...........',
      '.....T...........',
      '.....tTtTtTt.....'])],
    back: [L('body', 0, -1, 'cloth', [
      '.....ooooooo.....',
      '....oTtttttTo....',
      '....outtttTTo....',
      '....oTutttTTo....',
      '.....oTTTTTo.....',
      '......ooooo......',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '....tTtTtTtTt....'])],
  },
  kurta: {
    front: [L('body', 0, 1, 'cloth', ['........T........', '........V........', '........w........', '........V........', '........w........']), L('body', 0, 11, 'cloth', N_KURTA_HEM)],
    left: [L('body', 0, 1, 'cloth', ['.......T.........', '.......V.........', '.......w.........', '.......V.........', '.......w.........']), L('body', 0, 11, 'cloth', N_KURTA_HEM_L)],
    back: [L('body', 0, 11, 'cloth', N_KURTA_HEM)],
  },
  denim: {
    front: [L('body', 0, 1, 'cloth', [
      '....uuvvvvvuu....',
      '....Tuuvvvuu.....',
      '.....T.vvv.T.....',
      '....TT.vvv.TT....',
      '....T..vvv..T....',
      '.......vvv.......',
      '.......vvv.......',
      '.......vvv.......',
      '.......vvv.......',
      '.......vVv.......',
      '....tTtVVVtTt....'])],
    left: [L('body', 0, 1, 'cloth', [
      '.....uvvvvuu.....',
      '.....uuvvuu......',
      '......vvv.T......',
      '......vvvTT......',
      '......vvv........',
      '......vvv........',
      '......vvv........',
      '......vvv........',
      '......vvv........',
      '......vVv........',
      '.....TVVVtTt.....'])],
    back: [L('body', 0, 1, 'cloth', ['....uuuuuuuuu....', '.................', '....TTTTTTTTT....', '.................', '.................', '.................', '.................', '.................', '.....T.....T.....', '.....T.....T.....', '....tTtTtTtTt....'])],
  },
  shawl: {
    front: [L('body', 0, 1, 'cloth', ['....uttSSSttT....', '....uttTSTttT....']), L('body', 0, 10, 'cloth', ['....wTwTwTwTw....', '....w.w.w.w.w....'])],
    left: [L('body', 0, 10, 'cloth', ['.....wTwTwTw.....', '.....w.w.w.w.....'])],
    back: [L('body', 0, 10, 'cloth', ['....wTwTwTwTw....', '....w.w.w.w.w....'])],
  },
  jacket: {
    front: [L('body', 0, 0, 'cloth', [
      '....otto.otto....',
      '....uttvvvtTT....',
      '....utTvvvTtT....',
      '........T........',
      '........T........',
      '.....TT.T.TT.....',
      '........T........',
      '........T........',
      '........T........',
      '........T........',
      '........T........',
      '....uuuuTuuuu....'])],
    left: [L('body', 0, 0, 'cloth', [
      '.....ottto.......',
      '.....uvvvtT......',
      '.....uTvTtT......',
      '.......T.........',
      '.......T.........',
      '.......T.TT......',
      '.......T.........',
      '.......T.........',
      '.......T.........',
      '.......T.........',
      '.......T.........',
      '.....uuTuuuu.....'])],
    back: [L('body', 0, 0, 'cloth', ['....ottttttto....', '....uTTTTTTTT....', '.................', '.................', '.................', '.................', '.................', '.................', '.................', '.................', '.................', '....uuuuuuuuu....'])],
  },
  shirt: {
    front: [L('body', 0, 1, 'cloth', ['.....wwSSSww.....', '......wwSww......', '........T........', '........v........', '....TT..T........', '....TT..v........', '........T........', '........v........', '........T........'])],
    left: [L('body', 0, 1, 'cloth', ['.....wwSSww......', '......wSw........', '.......T.........', '.......v.........', '.......T..TT.....', '.......v..TT.....', '.......T.........', '.......v.........'])],
    back: [L('body', 0, 1, 'cloth', ['....uwwwwwwwT....'])],
  },
  vest: {
    front: [L('body', 0, 1, 'cloth', ['....uwwvSvwwT....', '....uTwvSvwTT....', '....utTwvwTTT....', '....uttTwTtTT....', '....tttTTTttt....']), L('body', 0, 10, 'cloth', ['....TtTtTtTtT....'])],
    left: [L('body', 0, 1, 'cloth', ['.....wwvSvw......', '.....TwvSvT......', '.....tTwvwT......', '.....ttTwTt......']), L('body', 0, 10, 'cloth', ['.....TtTtTtT.....'])],
    back: [L('body', 0, 1, 'cloth', ['....uwwwwwwwT....']), L('body', 0, 10, 'cloth', ['....TtTtTtTtT....'])],
  },
  jainsem: {
    front: [L('body', 0, 1, 'cloth', ['....oTo...oTo....', '....oTo...oTo....']), L('body', 0, 11, 'cloth', N_JAINSEM_HEM)],
    left: [L('body', 0, 11, 'cloth', N_JAINSEM_HEM_L)],
    back: [L('body', 0, 11, 'cloth', N_JAINSEM_HEM)],
  },
};
N_TOPS.work = N_TOPS.shirt;

const N_EXTRAS = {
  headphones: {
    front: [L('head', 0, -2, 'ears', [
      '.....ooooooo.....',
      '...ooaaacaaaoo...',
      '..oao.......oAo..',
      '.oao.........oAo.',
      '.oa...........Ao.',
      '.oa...........Ao.',
      '.oa...........Ao.',
      '.oa...........Ao.',
      '.oa...........Ao.',
      '.oa...........Ao.',
      'oaao.........oAAo',
      'ocaao.......oaAAo',
      'oaaao.......oaAAo',
      'oaaao.......oaAAo',
      '.ooo.........ooo.'])],
    left: [L('head', 0, -2, 'ears', [
      '......ooooooo....',
      '....ooaaacaaaoo..',
      '...oao.......oAo.',
      '..oao.........oAo',
      '..oa...........Ao',
      '...............oo',
      '.................',
      '.................',
      '.................',
      '..........ooo....',
      '.........oaaao...',
      '.........ocaAo...',
      '.........oaaAo...',
      '.........oaAAo...',
      '..........ooo....'])],
    back: [L('head', 0, -2, 'ears', [
      '.....ooooooo.....',
      '...ooaaacaaaoo...',
      '..oao.......oAo..',
      '.oao.........oAo.',
      '.oa...........Ao.',
      '.oa...........Ao.',
      '.oa...........Ao.',
      '.oa...........Ao.',
      '.oa...........Ao.',
      '.oa...........Ao.',
      'oaao.........oAAo',
      'oaaao.......oaAAo',
      'oaaao.......oaAAo',
      'oaaao.......oaAAo',
      '.ooo.........ooo.'])],
  },
  glasses: {
    front: [L('head', 0, 9, 'ears', ['...AAAA...AAAA...', '.AAA..AAAAA..AAA.', '...A..A...A..A...', '...AAAA...AAAA...'])],
    left: [L('head', 0, 9, 'ears', ['..AAA.AAAA.......', '..A.AAA..AAA.....', '..A.A.A..A.......', '..AAA.AAAA.......'])],
    back: [L('head', 0, 10, 'ears', ['.A.............A.'])],
  },
  muffler: {
    front: [L('body', 0, -1, 'neck', [
      '.....ooooooo.....',
      '....oacccaaAo....',
      '....oaaaaaAAo....',
      '.....oAAaaAoo....',
      '........oaAo.....',
      '........oaAo.....',
      '........oaAo.....',
      '........oaAo.....',
      '........ocyo.....',
      '.........o.......'])],
    left: [L('body', 0, -1, 'neck', [
      '.....oooooooo....',
      '....oaccaaaAAo...',
      '....oaaaaaAAAo...',
      '.....oaaAAAoo....',
      '.....oaAo........',
      '.....oaAo........',
      '.....oaAo........',
      '.....oaAo........',
      '.....ocyo........',
      '......o..........'])],
    back: [L('body', 0, -1, 'neck', [
      '.....ooooooo.....',
      '....oacccaaAo....',
      '....oaaaaaAAo....',
      '.....ooooooo.....'])],
  },
};
const N_FACE = {
  beard: {
    front: [L('head', 0, 13, 'face', [
      '..h....hhh....H..',
      '...hhh.....hHH...',
      '....hhhhhhhHH....',
      '.......hhH.......'])],
    left: [L('head', 0, 13, 'face', [
      '......hhh..H.....',
      '...hh....hHH.....',
      '....hhhhhHHH.....',
      '........HHH......'])],
  },
  tache: {
    front: [L('head', 0, 13, 'face', ['......HHHHH......'])],
    left: [L('head', 0, 13, 'face', ['.....HHHH........'])],
  },
};
// props, near: the walker's umbrella and the basket are drawn at far size only (PIXEL.md); near shows the person without

const NEAR = {
  W: 32, H: 48, cx: 15, x: 7, stride: 3,
  front: {
    head: { m: N_HEAD_M, f: N_HEAD_F }, body: { m: N_BODY_M, f: N_BODY_F },
    arms: { down: N_ARMS_DOWN, wave0: N_WAVE(0), wave1: N_WAVE(1) }, legs: N_LEGS,
    off: { wave0: [-6, -8], wave1: [-6, -8] }, over: { wave0: 1, wave1: 1 },
  },
  left: {
    head: { m: N_HEAD_L, f: N_HEAD_LF }, body: { m: N_BODY_L, f: N_BODY_LF },
    arms: { ...N_ARMS_L, wave0: N_WAVE_L(0), wave1: N_WAVE_L(1) }, legs: N_LEGS_L,
    off: { stand: [-1, 0], w0: [-1, 0], w1: [-1, 0], w2: [-1, 0], w3: [-1, 0], wave0: [0, -8], wave1: [0, -8] }, over: { wave0: 1, wave1: 1 },
  },
  back: {
    head: { m: faceless(N_HEAD_M, [12, 9]), f: faceless(N_HEAD_M, [12, 9]) }, body: { m: N_BODY_B, f: N_BODY_BF },
    arms: { down: N_ARMS_DOWN }, legs: N_LEGS, off: {},
  },
  hair: N_HAIR, tops: N_TOPS, extras: N_EXTRAS, face: N_FACE, props: {},
};

/* ======================================================================================================================
   FAR: about 26 px standing. Cell 24 x 34, figure centred on column 11, parts 11 wide at x 6.
   ==================================================================================================================== */
const F_HEAD = [
  '...ooooo...',
  '.oosssssoo.',
  'ossssssssSo',
  'ossssssssSo',
  'ossssssssSo',
  'ossesssesSo',
  'osrssmssrSo',
  '.osssssSSo.',
  '..ooosSoo..',
  '....oSo....'];
const F_HEAD_L = [
  '...ooooo...',
  '.oosssssoo.',
  'ossssssssSo',
  'ossssssssSo',
  'ossssssssSo',
  'osessesSsSo',
  'ossmsrsSsSo',
  '.ossssSSSo.',
  '..oooSSoo..',
  '....oSo....'];
const F_BODY = ['..ooooooo..', '..ouTSTto..', '..outttTo..', '..outttTo..', '..outttTo..', '..outttTo..', '..outttTo..', '..oTTTTTo..'];
const F_BODY_L = ['..ooooooo..', '..oTSStTo..', '..outttTo..', '..outttTo..', '..outttTo..', '..outttTo..', '..outttTo..', '..oTTTTTo..'];
const F_BODY_B = ['..ooooooo..', '..outSttTo.', '..outttTo..', '..outttTo..', '..outttTo..', '..outttTo..', '..outttTo..', '..oTTTTTo..'];
const F_ARMS = { down: ['...........', '.o.......o.', 'oEo.....oDo', 'oEo.....oDo', 'ogo.....oFo', 'ogo.....oFo', 'ogo.....oFo', 'oso.....oSo', '.o.......o.'] };
const F_ARMS_L = {
  down: ['...........', '.o.....o...', 'odo...oEo..', 'odo...oEo..', 'oFo...ogo..', 'oFo...ogo..', 'oFo...ogo..', 'oSo...oso..', '.o.....o...'],
  fwd: ['...........', '.......o...', '......oEo..', '......oEo..', '.....ogo...', '.....ogo...', '....ogo....', '....oso....', '.....o.....'],
  bwd: ['...........', '.o.....o...', 'odo...oEo..', 'odo...oEo..', 'oFo....ogo.', 'oFo....ogo.', 'oFo.....ogo', 'oSo.....oso', '.o.......o.'],
  hold: ['...........', '.o.....o...', 'odo...oEo..', 'odo...oEoo.', 'oFo...oEso.', 'oFo...ogoo.', 'oFo...oo...', 'oSo........', '.o.........'],
  wave0: ['.........oo', '........oso', '........ogo', '........ogo', '.o.....oEo.', 'odo...oEo..', 'odo...oo...', 'oFo........', 'oFo........', 'oFo........', 'oSo........', '.o.........'],
  wave1: ['..........o', '.........os', '........ogo', '........ogo', '.o.....oEo.', 'odo...oEo..', 'odo...oo...', 'oFo........', 'oFo........', 'oFo........', 'oSo........', '.o.........'],
};
const F_HOLD = ['...........', '.o.......o.', 'oEo.....oDo', 'oEo.....oDo', 'ogo....osFo', 'ogo.....oo.', 'ogo........', 'oso........', '.o.........'];
const F_WAVE = hand => [hand ? 'oo.........' : '.oo........', hand ? 'oso........' : 'oso........', 'ogo........', 'ogo........', '.oEo.....o.', '..oEo...oDo', '...oo...oDo', '........oFo', '........oFo', '........oFo', '........oSo', '.........o.'];
const F_LEGS = {
  stand: ['..oqpppPo..', '..oqpopPo..', '..oqpopPo..', '..oqpopPo..', '..oqpopPo..', '..oPPoPPo..', '.obbbobbBo.', '..ooo.ooo..'],
  liftL: ['..oqpppPo..', '..oqpopPo..', '..oqpopPo..', '..oqpopPo..', '..oPPopPo..', '.obbboPPo..', '..oooobbBo.', '......ooo..'],
  liftR: ['..oqpppPo..', '..oqpopPo..', '..oqpopPo..', '..oqpopPo..', '..oqpoPPo..', '..oPPobbBo.', '.obbbooooo.', '..ooo......'],
  crouch: ['..oqpppPo..', '.oqpo.oPPo.', '.oqpo.oPPo.', '.oPPo.oPPo.', '.obbo.obbo.', '..oo...oo..'],
  squat: ['.oqppppPPo.', '.oPPo.oPPo.', 'obbbo.obbbo', '.ooo...ooo.'],
  seat: ['.oqppppPPo.', '.oPPPPPPPo.', '..ooooooo..'],
};
const F_LEGS_L = {
  stand: ['..oqpppPo..', '..oqpopPo..', '..oqpopPo..', '..oqpopPo..', '..oqpopPo..', '..oPPoPPo..', '.obbbobbBo.', '..ooo.ooo..'].map(r => r.slice(1) + '.'),
  w0: ['..oqpppPo..', '..oqpoPPo..', '.oqpo.oPPo.', '.oqpo.oPPo.', '.opPo.oPPo.', 'obbbo.oBbo.', '.ooo...oo..'],
  w1: ['..oqpppPo..', '..oqpoPPo..', '..oqpoPPo..', '..oqpoPPo..', '..oqpooPPo.', '..opPo.oBbo', '.obbbo..oo.', '..ooo......'],
  w2: ['..oqpppPo..', '..opPoqpo..', '.opPo.oqpo.', '.opPo.oqpo.', '.oPPo.opPo.', 'oBbbo.obbo.', '.ooo...oo..'],
  w3: ['..oqpppPo..', '..opPoqpo..', '..opPoqpo..', '..opPoqpo..', '..opPooqpo.', '..oPPo.obbo', '.oBbbo..oo.', '..ooo......'],
};
const F_HAIR = {
  short: {
    front: [L('head', 0, -1, 'hair', ['..ooooooo..', '.ohjjhhhHo.', 'ohjhhhhhHHo', 'ohhhhhhhHHo', 'ohhhhhhHHHo', 'oHhHo.oHHHo', 'oH.......Ho'])],
    left: [L('head', 0, -1, 'hair', ['..ooooooo..', '.ohjjhhhHo.', 'ohjhhhhhHHo', 'ohhhhhhhHHo', 'ohhhhhhHHHo', 'oHo..oHhHHo', '.o.....oHHo', '........Ho.'])],
    back: [L('head', 0, -1, 'hair', ['..ooooooo..', '.ohjjhhhHo.', 'ohjhhhhhHHo', 'ohhhhhhhHHo', 'ohhhhhhHHHo', 'ohhhhhhHHHo', 'ohhhhhhHHHo', '.ohhhhhHHo.', '..oooooo...'])],
  },
  long: {
    front: [L('head', 0, 7, 'back', ['.HHHHHHHHH.', '.HHHHHHHHH.', '.HHHHHHHHH.', '.HHHHHHHHH.']),
      L('head', 0, -1, 'hair', ['..ooooooo..', '.ohjjhhhHo.', 'ohjhhhhhHHo', 'ohhhhhhhHHo', 'ohhhhoHHHHo', 'ohHo...oHHo', 'ojH.....HHo', 'ojH.....HHo', 'ojh.....Hho', 'ojho...oHho', 'ohho...oHho', 'ohHo...oHHo', '.oo.....oo.'])],
    left: [L('head', 0, -1, 'hair', ['..ooooooo..', '.ohjjhhhHo.', 'ohjhhhhhHHo', 'ohhhhhhhHHo', 'ohhhhhhHHHo', 'oHo..ohhHHo', 'oH...ohhHHo', '.o...ohhHHo', '.....ohhHHo', '......ohHHo', '......ohHHo', '......ohHHo', '.......ooo.'])],
    back: [L('head', 0, -1, 'hair', ['..ooooooo..', '.ohjjhhhHo.', 'ohjhhhhhHHo', 'ohhhhhhhHHo', 'ohhhhhhHHHo', 'ohhhhhhHHHo', 'ojhhhhhHHHo', 'ojhhhhhHHHo', 'ojhhhhhHHHo', 'ohhhhhhHHHo', 'ohhhhhHHHHo', 'ohHhhHhHHHo', '.ooHoHoooo.'])],
  },
  bun: {
    front: [L('head', 0, -3, 'hair', ['....ooo....', '...ojhHo...', '...oHHHo...', '..ooooooo..', '.ohhjhhhHo.', 'ohjhhhhhHHo', 'ohhhhHhhHHo', 'ohhho.oHHHo', 'oHo.....HHo'])],
    left: [L('head', 0, -2, 'hair', ['.......ooo.', '......ojhHo', '..oooooHHHo', '.ohjjhhhHo.', 'ohjhhhhhHHo', 'ohhhhhhhHHo', 'oHHhhhhHHHo', '.oooHhhHHHo', '......oHHo.', '.......oo..'])],
    back: [L('head', 0, -3, 'hair', ['....ooo....', '...ojhHo...', '...oHHHo...', '..ooHHHoo..', '.ohjjhhhHo.', 'ohjhhhhhHHo', 'ohhhhhhhHHo', 'ohhhhhhHHHo', 'ohhhhhhHHHo', 'ohhhhhhHHHo', '.oHhhhHHo..', '..oooooo...'])],
  },
  curly: {
    front: [L('head', 0, -2, 'hair', ['..oo.oo.o..', '.ojhojhojo.', 'ojhhjhhjhHo', 'ohjhhjhhjHo', 'ojhhjhhjHHo', 'ohhhhhhHHHo', 'oHoHoHoHHHo', 'oHo.....oHo', '.o.......o.'])],
    left: [L('head', 0, -2, 'hair', ['..oo.oo.o..', '.ojhojhojo.', 'ojhhjhhjhHo', 'ohjhhjhhjHo', 'ojhhjhhjHHo', 'ohhhhhhHHHo', 'oHoHoohjHHo', '.o.o.oHhHHo', '......oHHo.', '.......oo..'])],
    back: [L('head', 0, -2, 'hair', ['..oo.oo.o..', '.ojhojhojo.', 'ojhhjhhjhHo', 'ohjhhjhhjHo', 'ojhhjhhjHHo', 'ohjhhjhhHHo', 'ojhhjhhjHHo', 'ohhhhhhHHHo', 'oHhHhHhHHHo', '.oHoHoHoHo.', '..o.o.o.o..'])],
  },
  cap: {
    front: [L('head', 0, -1, 'hair', ['..ooooooo..', '.ozzkkkkKo.', 'ozkkkzkkKKo', 'okkkkkkKKKo', 'oKKKKKKKKKo', 'ozzzzzzkkko', 'ooooooooooo', 'oH.......Ho'])],
    left: [L('head', -3, -1, 'hair', ['.....ooooooo..', '....ozzkkkkKo.', '...ozkkkkkkKKo', '...okkkkkkKKKo', '...oKKKKKKKKKo', 'ooozzzzzoHhHHo', 'ozzzzzzo.oHHo.', '.ooooooo...oo.'])],
    back: [L('head', 0, -1, 'hair', ['..ooooooo..', '.ozzkkkkKo.', 'ozkkkkkkKKo', 'okkkkkkKKKo', 'oKKKooKKKKo', 'ohhHo.oHHHo', 'ohhhhhHHHHo', '.ohhhhHHHo.', '..oooooo...'])],
  },
};
const F_KURTA = ['..outttTo..', '..outttTo..', '..outtTTo..', '.ouuttTTTo.', '.oTTTTTTTo.', '..ooooooo..'];
const F_JAINSEM = ['..outttTo..', '..outttTo..', '..outttTo..', '..outttTo..', '.ouutttTTo.', '.oTTTTTTTo.', '..ooooooo..'];
const F_TOPS = {
  hoodie: { front: [L('body', 0, 0, 'cloth', ['..ooo.ooo..', '...TTTTT...', '....w.w....', '...........', '....TTT....', '...tTtTt...'])], left: [L('body', 0, 0, 'cloth', ['.....oooo..', '....TTTTT..', '....w......'])], back: [L('body', 0, 0, 'cloth', ['...ooooo...', '..oTtttTo..', '...oTTTo...', '....ooo....'])] },
  kurta: { front: [L('body', 0, 2, 'cloth', ['.....V.....', '.....w.....']), L('body', 0, 8, 'cloth', F_KURTA)], left: [L('body', 0, 2, 'cloth', ['....V......', '....w......']), L('body', 0, 8, 'cloth', F_KURTA)], back: [L('body', 0, 8, 'cloth', F_KURTA)] },
  denim: { front: [L('body', 0, 1, 'cloth', ['...uvvvu...', '....vvv....', '...TvvvT...', '....vvv....', '....vvv....', '....vvv....', '...tVVVt...'])], left: [L('body', 0, 1, 'cloth', ['...uvvu....', '...vvv.....', '...vvvT....', '...vvv.....', '...vvv.....', '...vvv.....', '...VVVtT...'])], back: [L('body', 0, 1, 'cloth', ['...uuuuu...', '...........', '...TTTTT...'])] },
  shawl: { front: [L('body', 0, 7, 'cloth', ['...wTwTw...', '...w.w.w...'])], left: [L('body', 0, 7, 'cloth', ['...wTwTw...', '...w.w.w...'])], back: [L('body', 0, 7, 'cloth', ['...wTwTw...', '...w.w.w...'])] },
  jacket: { front: [L('body', 0, 0, 'cloth', ['...ot.to...', '...uvvvT...', '.....T.....', '.....T.....', '.....T.....', '.....T.....', '.....T.....', '...uuTuu...'])], left: [L('body', 0, 0, 'cloth', ['...ott.....', '...uvvT....', '....T......', '....T......', '....T......', '....T......', '....T......', '...uTuuu...'])], back: [L('body', 0, 0, 'cloth', ['..ottttto..', '...TTTTT...'])] },
  shirt: { front: [L('body', 0, 1, 'cloth', ['...wwSww...', '.....T.....', '.....v.....', '.....T.....', '.....v.....'])], left: [L('body', 0, 1, 'cloth', ['...wSww....', '....T......', '....v......', '....T......', '....v......'])], back: [L('body', 0, 1, 'cloth', ['...uwwwT...'])] },
  vest: { front: [L('body', 0, 1, 'cloth', ['...wvSvw...', '...Twvwt...', '....TwT....']), L('body', 0, 7, 'cloth', ['...TtTtT...'])], left: [L('body', 0, 1, 'cloth', ['...wvSw....', '...TwvT....', '....Tw.....']), L('body', 0, 7, 'cloth', ['...TtTtT...'])], back: [L('body', 0, 7, 'cloth', ['...TtTtT...'])] },
  jainsem: { front: [L('body', 0, 1, 'cloth', ['...o...o...']), L('body', 0, 8, 'cloth', F_JAINSEM)], left: [L('body', 0, 8, 'cloth', F_JAINSEM)], back: [L('body', 0, 8, 'cloth', F_JAINSEM)] },
};
F_TOPS.work = F_TOPS.shirt;
const F_EXTRAS = {
  headphones: {
    front: [L('head', 0, -2, 'ears', ['..ooooooo..', '.oaacaaaAo.', 'oao.....oAo', 'oa.......Ao', 'oa.......Ao', 'oa.......Ao', 'oao.....oAo', 'oaao...oAAo', 'ocao...oaAo', '.oo.....oo.'])],
    left: [L('head', 0, -2, 'ears', ['..ooooooo..', '.oaacaaaAo.', 'oao.....oAo', '.........oo', '...........', '...........', '......ooo..', '.....oaaAo.', '.....ocaAo.', '......ooo..'])],
    back: [L('head', 0, -2, 'ears', ['..ooooooo..', '.oaacaaaAo.', 'oao.....oAo', 'oa.......Ao', 'oa.......Ao', 'oa.......Ao', 'oao.....oAo', 'oaao...oAAo', 'oaao...oaAo', '.oo.....oo.'])],
  },
  glasses: {
    front: [L('head', 0, 4, 'ears', ['..AAA.AAA..', '..A.AAA.A..', '..AAA.AAA..'])],
    left: [L('head', 0, 4, 'ears', ['.AAAAAA....', '.A.AA.AA...', '.AAAAAA....'])],
    back: [L('head', 0, 5, 'ears', ['A.........A'])],
  },
  muffler: {
    front: [L('body', 0, -1, 'neck', ['...ooooo...', '..oacaaAo..', '..oaaaAAo..', '...ooaAo...', '....oaAo...', '....ocyo...', '.....o.....'])],
    left: [L('body', 0, -1, 'neck', ['...ooooo...', '..oacaaAo..', '..oaaaAAo..', '..oaAoooo..', '..oaAo.....', '..ocyo.....', '...o.......'])],
    back: [L('body', 0, -1, 'neck', ['...ooooo...', '..oacaaAo..', '..oaaaAAo..', '...ooooo...'])],
  },
};
const F_FACE = {
  beard: { front: [L('head', 0, 6, 'face', ['.oH.....Ho.', '..oHhhhHo..', '...ooHoo...'])], left: [L('head', 0, 6, 'face', ['.o.H...Ho..', '..oHhhHHo..', '...ooHHo...'])] },
  tache: { front: [L('head', 0, 6, 'face', ['....HHH....'])], left: [L('head', 0, 6, 'face', ['..HHH......'])] },
};
// the walker's black umbrella, held up by the near hand; the basket woman's conical khoh, its strap across her forehead
const F_CANOPY = [
  '.......ooooo.......',
  '.....ooyyxxxoo.....',
  '...ooyyxxxxxxxoo...',
  '..oyyxxxxxxxxxxXo..',
  '.oyxxxxxxxxxxxxXXo.',
  'oXXXxxxxxxxxxxXXXXo',
  'oXoooXXXXXXXXXoooXo',
  '.o...ooooooooo...o.'];
const F_SHAFT = [...Array(15)].map((_, j) => j === 14 ? '.okoo' : j === 13 ? '.oko.' : '.oKo.').concat(['..oo.']);
const F_UMBRELLA = {
  left: [L('body', 6, -11, 'cloth', F_SHAFT), L('body', -1, -18, 'over', F_CANOPY)],
  front: [L('body', 6, -11, 'cloth', F_SHAFT), L('body', -1, -18, 'over', F_CANOPY)],
  back: [L('body', 6, -11, 'back', F_SHAFT), L('body', -1, -18, 'over', F_CANOPY)],
};
const F_BASKET = {
  left: [
    L('body', 2, -6, 'back', [
      'oooooooooooo',
      'oyxxxxxxxxXo',
      'oXXXXXXXXXXo',
      '.oxyxXxyxXo.',
      '.oXxXxXxXXo.',
      '.oxyxXxyxXo.',
      '..oXxXxXXo..',
      '..oxyxXxXo..',
      '..oXxXxXXo..',
      '...oxyxXo...',
      '...oXxXXo...',
      '....oxXo....',
      '....oXXo....',
      '.....oo.....']),
    L('head', 0, 3, 'ears', ['.kkkkkkkkkk', '.........k.', '.........k.'])],
  front: [
    L('body', -2, -6, 'back', ['ooooooooooooooo', 'oyxxxxxxxxxxxXo', 'oXXXXXXXXXXXXXo', '.oxyxXxyxXxyxo.', '.oXxXxXxXxXxXo.', '..oxyxXxyxXxo..', '..oXxXxXxXxXo..', '...oxyxXxyxo...', '...oXxXxXxXo...', '....oxyxXxo....']),
    L('head', 0, 3, 'ears', ['okkkkkkkkko', 'k.........k', 'k.........k', 'k.........k'])],
  back: [L('body', -3, -7, 'over', [
    'ooooooooooooooooo',
    'oyxxxxxxxxxxxxxXo',
    'oXXXXXXXXXXXXXXXo',
    '.oxyxXxyxXxyxXxo.',
    '.oXxXxXxXxXxXxXo.',
    '..oxyxXxyxXxyXo..',
    '..oXxXxXxXxXxXo..',
    '...oxyxXxyxXxo...',
    '...oXxXxXxXxXo...',
    '....oxyxXxyxo....',
    '....oXxXxXxXo....',
    '.....oxyxXxo.....',
    '.....oXxXxXo.....',
    '......oxyxo......',
    '......oXxXo......',
    '.......oxo.......',
    '........o........'])],
};

const FAR = {
  W: 24, H: 34, cx: 11, x: 6, stride: 2,
  front: {
    head: { m: F_HEAD, f: F_HEAD }, body: { m: F_BODY, f: F_BODY }, arms: { ...F_ARMS, hold: F_HOLD, wave0: F_WAVE(0), wave1: F_WAVE(1) }, legs: F_LEGS,
    off: { wave0: [-3, -4], wave1: [-3, -4] }, over: { wave0: 1, wave1: 1 },
  },
  left: { head: { m: F_HEAD_L, f: F_HEAD_L }, body: { m: F_BODY_L, f: F_BODY_L }, arms: F_ARMS_L, legs: F_LEGS_L, off: { wave0: [0, -4], wave1: [0, -4] }, over: { wave0: 1, wave1: 1 } },
  back: { head: { m: faceless(F_HEAD), f: faceless(F_HEAD) }, body: { m: F_BODY_B, f: F_BODY_B }, arms: { ...F_ARMS, hold: F_ARMS.down }, legs: F_LEGS, off: {} },
  hair: F_HAIR, tops: F_TOPS, extras: F_EXTRAS, face: F_FACE, props: { umbrella: F_UMBRELLA, basket: F_BASKET },
};

const SIZES = { near: NEAR, far: FAR };

/* ======================================================================================================================
   Animation: frames are part choices; durations in ms (idle breathes over 1.2 s, walk is 8 fps)
   ==================================================================================================================== */
const WALK_SIDE = [{ legs: 'w0', arms: 'bwd' }, { legs: 'w1', arms: 'down' }, { legs: 'w2', arms: 'fwd' }, { legs: 'w3', arms: 'down' }];
const WALK_FRONT = [{ legs: 'stand', breath: 1 }, { legs: 'liftL' }, { legs: 'stand', breath: 1 }, { legs: 'liftR' }];
export const ANIMS = {
  idle: { views: ['front', 'left', 'back'], loop: true, frames: { all: [{ ms: 600 }, { breath: 1, ms: 600 }] } },
  walk: { views: ['left', 'front', 'back'], loop: true, walk: true, frames: { left: WALK_SIDE.map(f => ({ ...f, ms: 125 })), all: WALK_FRONT.map(f => ({ ...f, ms: 125 })) } },
  wave: { views: ['front', 'left'], loop: true, frames: { all: [{ arms: 'wave0', ms: 240 }, { arms: 'wave1', ms: 240 }] } },
  sitdown: { views: ['back'], loop: false, frames: { all: [{ legs: 'crouch', ms: 160 }, { legs: 'squat', ms: 140 }, { legs: 'seat', ms: 260 }] } },
  sit: { views: ['back'], loop: true, frames: { all: [{ legs: 'seat', ms: 1100 }, { legs: 'seat', headDx: 1, ms: 1100 }] } },
};
const framesOf = (anim, view) => ANIMS[anim].frames[view] || ANIMS[anim].frames.all;

/* ======================================================================================================================
   Looks
   ==================================================================================================================== */
export const OPTIONS = {
  build: [['f', 'Woman'], ['m', 'Man']],
  skin: [[0, 'Light'], [1, 'Fair'], [2, 'Wheat'], [3, 'Brown'], [4, 'Deep']],
  hair: [['short', 'Short'], ['long', 'Long'], ['bun', 'Bun'], ['curly', 'Curly'], ['cap', 'Cap']],
  top: [['tee', 'Tee'], ['hoodie', 'Hoodie'], ['kurta', 'Kurta'], ['denim', 'Denim'], ['shawl', 'Shawl']],
  extra: [['none', 'None'], ['headphones', 'Headphones'], ['glasses', 'Glasses'], ['muffler', 'Muffler']],
};
// how each top dresses the arms: short sleeves show the forearm's skin; 'alt' sleeves are the second colour (a shirt under a sweater)
const TOPS = {
  tee: { sleeve: 'short', legs: 'jeans' }, hoodie: { sleeve: 'long', legs: 'dark' }, kurta: { sleeve: 'long', legs: 'khaki' },
  denim: { sleeve: 'long', legs: 'dark' }, shawl: { sleeve: 'long', legs: 'jeans', check: true }, jacket: { sleeve: 'long', legs: 'jeans' },
  shirt: { sleeve: 'short', legs: 'grey' }, vest: { sleeve: 'alt', legs: 'khaki' }, work: { sleeve: 'long', legs: 'dark' },
  jainsem: { sleeve: 'alt', legs: 'cloth', check: true },
};
export const CHARACTERS = {
  you: { name: 'Yash', build: 'm', skin: 2, hair: 'short', top: 'jacket', extra: 'muffler', beard: true, muffler: 'mufflerYou', legs: 'jeans', shoes: 'sneaker' },
  grandpa: { name: 'Grandfather', build: 'm', skin: 2, hair: 'short', top: 'shirt', tache: true, legs: 'grey', shoes: 'dark' },
  friend: { name: 'Friend', build: 'm', skin: 3, hair: 'curly', top: 'vest', legs: 'khaki', shoes: 'dark' },
  walker: { name: 'Walker', build: 'm', skin: 3, hair: 'short', top: 'work', legs: 'dark', shoes: 'dark', prop: 'umbrella' },
  basket: { name: 'Basket', build: 'f', skin: 2, hair: 'bun', top: 'jainsem', legs: 'cloth', shoes: 'sandal', prop: 'basket' },
};
export function normalise(look) {
  if (typeof look === 'string') look = CHARACTERS[look];
  look = { ...(look || {}) };
  look.build = look.build === 'm' ? 'm' : 'f';
  look.skin = Math.max(0, Math.min(FOLK.skin.length - 1, look.skin | 0));
  if (look.top === 'jacket' && !look.muffler) look.top = 'denim';   // the old customiser's id for denim
  if (!TOPS[look.top]) look.top = 'tee';
  if (!OPTIONS.hair.some(([k]) => k === look.hair)) look.hair = look.build === 'm' ? 'short' : 'long';
  look.extra = look.extra ?? look.acc ?? 'none';
  if (!OPTIONS.extra.some(([k]) => k === look.extra)) look.extra = 'none';
  look.legs = FOLK.legs[look.legs] ? look.legs : TOPS[look.top].legs;
  look.shoes = FOLK.shoes[look.shoes] ? look.shoes : look.build === 'm' ? 'sneaker' : 'white';
  return look;
}

// the lit colour of every slot for a look
function litColours(look) {
  const c = new Array(NS).fill(FOLK.outline), set = (chars, ramp) => [...chars].forEach((ch, i) => { c[SLOT[ch]] = ramp[i]; });
  const [main, alt] = FOLK.top[look.top], top = TOPS[look.top];
  set('Sslr', FOLK.skin[look.skin]);
  set('Hhj', FOLK.hair[look.hairTone] || FOLK.hair.black);
  set('Ttu', main); set('Vvw', alt);
  const sleeve = top.sleeve === 'alt' ? alt : main;
  set('DdE', sleeve); set('Ffg', top.sleeve === 'short' ? FOLK.skin[look.skin] : sleeve);
  set('Ppq', FOLK.legs[look.legs]); set('Bbn', FOLK.shoes[look.shoes]);
  c[SLOT.e] = FOLK.eye; c[SLOT.W] = FOLK.eyeHi; c[SLOT.m] = FOLK.mouth;
  set('Kkz', FOLK.cap);
  const ex = look.extra === 'muffler' ? FOLK[look.muffler || 'muffler'] : look.extra !== 'none' ? FOLK[look.extra] : null;
  if (ex) { set('Aac', ex[0]); if (ex[1]) set('Xxy', ex[1]); }
  if (look.prop) { set('Xxy', FOLK[look.prop][0]); set('Kkz', FOLK[look.prop][1]); }
  return c;
}

/* ======================================================================================================================
   Light: five steps from night to warm-lit, quantized (never a smooth blend)
   ==================================================================================================================== */
export const STEPS = [0.15, 0.5, 0.85, 1.05];   // light level thresholds between the steps
export const step = L => STEPS.filter(t => L >= t).length;   // 0 = night .. 3 = lit .. 4 = warm
const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
function ramp(hex) {
  const lit = hexRGB(hex), N = FOLK.night, sky = hexRGB(N.sky), am = hexRGB(N.amber);
  const night = lit.map((v, i) => v * N.mul[i] + sky[i] * N.add), warm = lit.map((v, i) => Math.min(255, v * N.warm[i] + am[i] * .04));
  const mix = t => night.map((v, i) => Math.round(v + (lit[i] - v) * t));
  return [mix(0), mix(.4), mix(.75), lit, warm.map(Math.round)];
}
const palette = look => litColours(look).map(ramp);

/* ======================================================================================================================
   Composing a frame: parts and overlays, layer by layer, on one grid
   ==================================================================================================================== */
const ORDER = ['back', 'legs', 'body', 'cloth', 'arms', 'head', 'face', 'neck', 'hair', 'ears', 'over'];
function stamp(buf, W, H, map, x0, y0) {
  for (let j = 0; j < map.length; j++) {
    const y = y0 + j; if (y < 0 || y >= H) continue;
    const row = map[j];
    for (let i = 0; i < row.length; i++) {
      const ch = row[i], x = x0 + i; if (ch === '.' || x < 0 || x >= W) continue;
      buf[y * W + x] = ch === '_' ? 0 : SLOT[ch] ?? 0;
    }
  }
}
function blink(map) {   // the eyes' top row becomes skin, the row below a closed line
  return map.map((row, j) => [...row].map((ch, i) => ch === 'e' || ch === 'W' ? (map[j + 1]?.[i] === 'e' ? 's' : 'e') : ch).join(''));
}
// a check (Khasi shawl, jainsem, the muffler): light lines across the cloth, fixed to the body so they move with it
const ACROSS = { T: 'V', t: 'v', u: 'w', A: 'X', a: 'x', c: 'y' }, DOWN = { T: 'V', t: 'V', u: 'V', A: 'X', a: 'X', c: 'X' };
function check(buf, W, H, x0, y0, slots) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, ch = CH[buf[k]];
    if (!slots.includes(ch)) continue;
    const u = x - x0, v = y - y0;
    const across = (v % 4 + 4) % 4 === 3, down = (u % 4 + 4) % 4 === 1;
    if (across) buf[k] = SLOT[ACROSS[ch]];
    else if (down) buf[k] = SLOT[DOWN[ch]];
  }
}
export function compose(size, lookIn, view, f = {}) {
  const look = normalise(lookIn), S = SIZES[size], V = S[view], W = S.W, H = S.H, buf = new Uint8Array(W * H);
  const legsKey = f.legs || 'stand', legs = V.legs[legsKey] || V.legs.stand;
  let armsKey = f.arms || 'down';
  if (look.prop === 'umbrella' && !f.arms?.startsWith('wave') && V.arms.hold) armsKey = 'hold';
  const arms = V.arms[armsKey] || V.arms.down;
  const body = V.body[look.build], head = V.head[look.build], off = k => V.off[k] || [0, 0];
  const legsTop = H - legs.length, bodyY = legsTop - body.length + (f.breath || 0), headY = bodyY - head.length + 1;
  const hx = S.x + (f.headDx || 0), at = { head: [hx, headY], body: [S.x, bodyY] };
  const layers = { back: [], cloth: [], face: [], neck: [], hair: [], ears: [], over: [] };
  const add = list => list && list.forEach(o => layers[o.layer].push(o));
  add(S.hair[look.hair]?.[view]);
  add(S.tops[look.top]?.[view]);
  if (look.extra !== 'none') add(S.extras[look.extra]?.[view]);
  if (look.beard) add(S.face.beard[view]); if (look.tache) add(S.face.tache[view]);
  if (look.prop) add(S.props[look.prop]?.[view]);
  const put = o => stamp(buf, W, H, o.map, at[o.on][0] + o.x, at[o.on][1] + o.y);
  const armsOver = V.over?.[armsKey];
  for (const layer of ORDER) {
    if (layer === 'legs') stamp(buf, W, H, legs, S.x + off(legsKey)[0], legsTop);
    else if (layer === 'body') stamp(buf, W, H, body, S.x, bodyY);
    else if (layer === 'arms') {
      if (TOPS[look.top].check) check(buf, W, H, S.x, bodyY, 'Ttu');
      if (!armsOver) stamp(buf, W, H, arms, S.x + off(armsKey)[0], bodyY + off(armsKey)[1]);
    } else if (layer === 'head') stamp(buf, W, H, f.blink ? blink(head) : head, hx, headY);
    else layers[layer].forEach(put);
    if (layer === 'neck' && look.muffler === 'mufflerYou') check(buf, W, H, S.x + 1, bodyY, 'Aac');
  }
  if (armsOver) stamp(buf, W, H, arms, S.x + off(armsKey)[0], bodyY + off(armsKey)[1]);
  return buf;
}

/* ======================================================================================================================
   CPU render: previews, avatars, the sheet
   ==================================================================================================================== */
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export function render(buf, W, H, cols, st = 3, { flip = false, side = -1, rim = false } = {}) {
  const c = canvas(W, H), x = c.getContext('2d'), img = x.createImageData(W, H), d = img.data;
  const at = (i, j) => (i < 0 || i >= W || j < 0 || j >= H) ? 0 : buf[j * W + (flip ? W - 1 - i : i)];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const s = at(i, j); if (!s) continue;
    let k = st, dim = 1;
    if (rim && s !== 1 && at(i - side, j) <= 1) { if (k) k--; else dim = .8; }
    const col = cols[s][k], p = (j * W + i) * 4;
    d[p] = col[0] * dim; d[p + 1] = col[1] * dim; d[p + 2] = col[2] * dim; d[p + 3] = 255;
  }
  x.putImageData(img, 0, 0); return c;
}
// one frame as a canvas: who, size, view ('front' | 'left' | 'right' | 'back'), anim, frame index, blink, light 0..1.2
export function frameCanvas(who, { size = 'near', view = 'front', anim = 'idle', i = 0, blink = false, light = 1, rim = false, side = -1 } = {}) {
  const S = SIZES[size], v = view === 'right' ? 'left' : view, fr = framesOf(anim, v);
  return render(compose(size, who, v, { ...fr[i % fr.length], blink }), S.W, S.H, palette(normalise(who)), step(light), { flip: view === 'right', rim, side });
}
export const preview = look => frameCanvas(look, { size: 'near', view: 'front' });
// the head and shoulders, for UI: a px x px canvas (whole-pixel scale, transparent around)
export function avatar(look, px = 48) {
  const S = NEAR, buf = compose('near', look, 'front', {}), cols = palette(normalise(look));
  let top = S.H; for (let k = 0; k < buf.length; k++) if (buf[k]) { top = Math.floor(k / S.W); break; }
  const cw = 26, ch = 26, src = render(buf, S.W, S.H, cols, 3), out = canvas(px, px), x = out.getContext('2d');
  const z = Math.max(1, Math.floor(px / cw));
  x.imageSmoothingEnabled = false;
  x.drawImage(src, S.cx - 12, Math.max(0, top - 1), cw, ch, Math.round((px - cw * z) / 2), Math.round((px - ch * z) / 2), cw * z, ch * z);
  return out;
}
export const sizes = Object.fromEntries(Object.entries(SIZES).map(([k, s]) => [k, { w: s.W, h: s.H, foot: [s.cx + .5, s.H], stride: s.stride }]));

/* ======================================================================================================================
   three.js: an indexed sprite on the pixel grid
   ==================================================================================================================== */
const VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const FRAG = /* glsl */`
  precision highp float; precision highp int;
  uniform sampler2D tIdx, tPal; uniform vec2 uCell, uOff; uniform float uFlip, uStep, uSide; varying vec2 vUv;
  int slotAt(ivec2 p){
    if (p.x < 0 || p.y < 0 || p.x >= int(uCell.x) || p.y >= int(uCell.y)) return 0;
    if (uFlip > .5) p.x = int(uCell.x) - 1 - p.x;
    return int(texelFetch(tIdx, ivec2(uOff) + p, 0).r * 255. + .5);
  }
  void main(){
    ivec2 p = ivec2(floor(vUv.x * uCell.x), floor((1. - vUv.y) * uCell.y));
    int s = slotAt(p); if (s == 0) discard;
    int k = int(uStep); float dim = 1.;
    if (s != 1 && slotAt(p - ivec2(int(uSide), 0)) <= 1) { if (k > 0) k--; else dim = .8; }   // the rim, away from the light
    gl_FragColor = vec4(texelFetch(tPal, ivec2(s, k), 0).rgb * dim, 1.);
  }`;
function shadowTex(w, h) {
  const c = canvas(w, h), x = c.getContext('2d'); x.fillStyle = FOLK.shadow;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (((i + .5 - w / 2) / (w / 2)) ** 2 + ((j + .5 - h / 2) / (h / 2)) ** 2 <= 1) x.fillRect(i, j, 1, 1);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t;
}

export function person(who, { size = 'near' } = {}) {
  const look = normalise(who), S = SIZES[size], W = S.W, H = S.H;
  // the atlas: every frame of every animation in every view this person can show, plus a blink of each idle frame
  const cells = [];
  for (const [anim, A] of Object.entries(ANIMS)) for (const v of A.views) framesOf(anim, v).forEach((f, i) => {
    cells.push({ key: `${anim}:${v}:${i}`, f });
    if (anim === 'idle' && v !== 'back') cells.push({ key: `${anim}:${v}:${i}:b`, f: { ...f, blink: true } });
  });
  const cols = Math.ceil(Math.sqrt(cells.length)), rows = Math.ceil(cells.length / cols), AW = cols * W, AH = rows * H;
  const data = new Uint8Array(AW * AH * 4), where = {};
  cells.forEach(({ key, f }, n) => {
    const [anim, v] = key.split(':'), buf = compose(size, look, v, f), ox = (n % cols) * W, oy = Math.floor(n / cols) * H;
    where[key] = [ox, oy];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) data[((oy + j) * AW + ox + i) * 4] = buf[j * W + i];
  });
  const tIdx = new THREE.DataTexture(data, AW, AH, THREE.RGBAFormat);
  const pal = palette(look), pd = new Uint8Array(NS * 5 * 4);
  pal.forEach((r, s) => r.forEach((c, k) => pd.set([...c, 255], (k * NS + s) * 4)));
  const tPal = new THREE.DataTexture(pd, NS, 5, THREE.RGBAFormat);
  for (const t of [tIdx, tPal]) { t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; }
  const mat = new THREE.ShaderMaterial({
    uniforms: { tIdx: { value: tIdx }, tPal: { value: tPal }, uCell: { value: new THREE.Vector2(W, H) }, uOff: { value: new THREE.Vector2() }, uFlip: { value: 0 }, uStep: { value: 3 }, uSide: { value: -1 } },
    vertexShader: VERT, fragmentShader: FRAG,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat);
  const sw = size === 'near' ? 17 : 11, sh = size === 'near' ? 5 : 3;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: shadowTex(sw, sh), transparent: true, opacity: .45, depthWrite: false }));
  shadow.position.set(0, 1, -.5); shadow.renderOrder = -1;
  const obj = new THREE.Group(); obj.add(shadow, mesh);

  let anim = 'idle', view = 'front', facing = 'front', frame = 0, t = 0, loop = true, onEnd = null, turnT = 0, blinkT = 2 + Math.random() * 3, blinking = 0;
  const p = {
    obj, mesh, shadow, look, size, w: W, h: H, foot: [S.cx + .5, H], stride: S.stride, done: false,
    get anim() { return anim; }, get facing() { return facing; },
    play(name, opts = {}) {
      if (!ANIMS[name]) return p;
      if (name !== anim || opts.restart) { frame = 0; t = 0; }
      anim = name; loop = opts.loop ?? ANIMS[name].loop; onEnd = opts.onEnd || null; p.done = false;
      return p.face(facing, true);
    },
    // which way they look: front, back, left or right (right is left, mirrored). A change of view shows one
    // three-quarter frame between, like turning.
    face(dir, quiet) {
      const views = ANIMS[anim].views, base = dir === 'right' ? 'left' : dir;
      const v = views.includes(base) ? base : views[0];
      if (!quiet && dir !== facing && v !== 'left' && view !== 'left') turnT = .1;
      facing = views.includes(base) ? dir : v; view = v; return show();
    },
    // advance the clock; returns the sprite px walked in this step (stride per walk frame), so callers move in sync
    update(dt) {
      let walked = 0; const fr = framesOf(anim, view);
      t += dt * 1000;
      while (t >= fr[frame].ms) {
        t -= fr[frame].ms;
        if (frame + 1 < fr.length) frame++;
        else if (loop) frame = 0;
        else { t = 0; if (!p.done) { p.done = true; onEnd?.(p); } break; }
        if (ANIMS[anim].walk) walked += S.stride;
      }
      if (turnT > 0) turnT -= dt;
      blinkT -= dt; if (blinkT < 0) { blinking = .12; blinkT = 2.5 + Math.random() * 3.5; }
      if (blinking > 0) blinking -= dt;
      show(); return walked;
    },
    setLight(level, side = -1) { mat.uniforms.uStep.value = step(level); mat.uniforms.uSide.value = side < 0 ? -1 : 1; return p; },
    dispose() { mesh.geometry.dispose(); mat.dispose(); tIdx.dispose(); tPal.dispose(); shadow.geometry.dispose(); shadow.material.map.dispose(); shadow.material.dispose(); },
  };
  function show() {
    let key = `${anim}:${view}:${Math.min(frame, framesOf(anim, view).length - 1)}`;
    if (turnT > 0) key = 'idle:left:0';
    else if (anim === 'idle' && view !== 'back' && blinking > 0) key += ':b';
    const [ox, oy] = where[key], flip = (turnT > 0 ? facing === 'left' : facing === 'right') ? 1 : 0;
    mat.uniforms.uOff.value.set(ox, oy); mat.uniforms.uFlip.value = flip;
    const dx = W / 2 - (S.cx + .5);
    mesh.position.set(flip ? -dx : dx, H / 2, 0);
    return p;
  }
  show();
  return p;
}

// the self-check (tools/folk-sheet.html runs it): every map is a rectangle of known slots. Returns the problems.
export function lint() {
  const bad = [], walk = (v, path) => {
    if (Array.isArray(v) && typeof v[0] === 'string') {
      if (v.some(r => r.length !== v[0].length)) bad.push(`${path}: rows of ${[...new Set(v.map(r => r.length))].join('/')}`);
      if (v.some(r => [...r].some(c => c !== '_' && !(c in SLOT)))) bad.push(`${path}: unknown slot`);
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  };
  walk(SIZES, 'folk'); return bad;
}
