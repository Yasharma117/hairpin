// The score: a generative piece in A, all synthesized here (no files). One 4-bar theme returns in every scene, varied by
// mood. Instruments: a nylon pluck (Karplus-Strong), a felt piano and bells (additive), rendered once per pitch into
// cached buffers, so a note costs one buffer source; a persistent 4-voice pad and a sub that glide from chord to chord.
// All of it runs through a tape: wow and flutter, a soft saturation, a lid at 6.5 kHz, a little hiss and crackle.
//   const s = makeScore(ac, dest, verb); s.set('drive'); s.rpm(k); s.duck(on)
// Realtime, a 50 ms timer schedules whole bars ahead (lookahead clock). Offline, call s.pump(seconds) before rendering.
// A mood change lands on the next unscheduled bar line (the old mood's tails fade, the pad crossfades over ~3 s);
// set(mood, { now: true }) cuts in at once (the fall's silence).
export const BPM = 72, BAR = 240 / BPM, STEP = BAR / 8;   // 4/4 at 72: a bar is 3.33 s, the grid is eighth notes
const hz = m => 440 * 2 ** ((m - 69) / 12);

// the theme, in A (A4 = 0): [eighth, semitones, eighths long]. Bar 4 hangs on B; resolved, it falls C# B A
const THEME = [
  [[0, 7, 3], [3, 4, 1], [4, 2, 2], [6, 4, 2]],
  [[0, 0, 5], [5, -3, 1], [6, 2, 1], [7, 4, 1]],
  [[0, 7, 2], [2, 9, 2], [4, 7, 1], [5, 4, 3]],
  [[0, 2, 8]],
];
const HOME = [[0, 4, 2], [2, 2, 2], [4, 0, 4]];
// chords: [bass midi, pad voicing (4 notes, close, around A3-B4)]
const CH = {
  A: [45, [57, 61, 64, 71]], Asus: [45, [57, 59, 64, 69]], Fsm: [42, [54, 57, 61, 64]], D: [38, [54, 57, 62, 64]],
  E: [40, [56, 59, 64, 66]], Esus: [40, [57, 59, 64, 66]], EG: [44, [56, 59, 64, 68]], Csm: [37, [56, 59, 64, 68]],
  Dm: [38, [53, 57, 62, 65]], Bm: [47, [54, 57, 62, 66]], G: [43, [55, 59, 62, 67]], Dlyd: [38, [54, 57, 62, 68]],
  F: [41, [53, 57, 60, 64]],
};
// moods. prog: a chord a bar (stretch 2: a chord and a theme bar per two bars). lead: who plays the theme, from which
// cycle (`from`), every `every` cycles; drop: the chance a theme note goes missing. arp: eighths, an index into the
// voicing (-1 rest). Levels 0..1. cut: the pad's lid. vol: dB, so every mood sits ~4 dB under the bed. home: the theme resolves on its last bar
const MOODS = {
  silence: {},
  hopeful: { vol: 0, prog: ['A', 'Fsm', 'D', 'E'], lead: 'pluck', from: 1, every: 1, oct: 0, arp: [0, -1, 2, 1, 3, -1, 2, 1], arpI: 'pluck', arpV: .45, pad: .5, sub: .35, noise: 1, cut: 900 },
  warm: { vol: -0.9, prog: ['A', 'Bm', 'D', 'E'], lead: 'piano', from: 0, every: 1, oct: 0, arp: [0, -1, -1, 2, -1, -1, 3, -1], arpI: 'pluck', arpV: .4, pad: .55, sub: .35, noise: 1, cut: 1000 },
  drive: { vol: 2.2, prog: ['A', 'G', 'D', 'A'], lead: 'piano', from: 1, every: 1, oct: 12, arp: [0, 2, 1, 2, 3, 2, 1, 2], arpI: 'pluck', arpV: .5, pad: .4, sub: .5, pulse: 1, noise: .8, cut: 1300 },
  tender: { vol: -1, prog: ['D', 'Dm', 'A', 'Esus'], lead: 'piano', from: 0, every: 1, oct: 0, swing: .04, arp: [0, -1, -1, -1, 2, -1, -1, -1], arpI: 'pluck', arpV: .3, pad: .6, sub: .3, noise: 1, cut: 800 },
  suspended: { vol: -2.6, prog: ['Asus', 'Dlyd', 'Asus', 'Dlyd'], stretch: 2, lead: 'piano', from: 0, every: 1, oct: 0, drop: .25, pad: .75, sub: .4, noise: .6, cut: 650, air: 1 },
  edge: { vol: -2.9, prog: ['Asus', 'Dm', 'Asus', 'Esus'], stretch: 2, lead: 'piano', from: 0, every: 1, oct: -12, drop: .55, detune: 1, pad: .35, sub: .45, noise: .5, cut: 500 },
  'edge-story': { vol: -1, prog: ['D', 'Csm', 'Bm', 'Esus'], stretch: 2, lead: 'piano', from: 0, every: 1, oct: 0, drop: .1, arp: [0, -1, -1, -1, -1, -1, -1, -1], arpI: 'pluck', arpV: .25, pad: .5, sub: .3, noise: .8, cut: 700 },
  relief: { vol: -1.2, prog: ['A', 'EG', 'Fsm', 'D'], lead: 'piano', from: 0, every: 1, oct: 0, arp: [0, -1, 2, -1, 3, -1, 2, -1], arpI: 'pluck', arpV: .4, pad: .7, sub: .4, noise: 1, cut: 1100 },
  shillong: { vol: -0.3, prog: ['A', 'D', 'A', 'E'], lead: 'piano', from: 0, every: 2, oct: 0, home: 1, bells: .5, arp: [0, -1, -1, -1, 3, -1, -1, -1], arpI: 'pluck', arpV: .3, pad: .55, sub: .3, noise: 1, cut: 900 },
  bloom: { vol: 0, prog: ['D', 'E', 'Fsm', 'A'], lead: 'piano', from: 0, every: 1, oct: 0, home: 1, bells: 1, arp: [0, 2, 1, 3, 2, 1, 3, 2], arpI: 'pluck', arpV: .35, pad: .7, sub: .4, noise: 1, cut: 1500 },
};
const LEAD = { pluck: .55, piano: .6, bell: .3 };

export function makeScore(ac, dest, verb, { level = .042 } = {}) {   // level: the one knob for music vs bed
  const sr = ac.sampleRate, t0 = ac.currentTime, live = !(typeof OfflineAudioContext !== 'undefined' && ac instanceof OfflineAudioContext);
  const gain = (v, to) => { const g = ac.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };
  const filt = (type, f, q = .7) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const lfo = (f, amt, param) => { const o = ac.createOscillator(), g = gain(amt); o.frequency.value = f; o.connect(g).connect(param); o.start(t0); };
  const glide = (p, v, at, tau) => { p.cancelScheduledValues(at); p.setTargetAtTime(v, at, tau); };

  // the tape: in → wow/flutter → saturation → lid → duck → level → dest (+ a reverb send before the tape)
  const out = gain(level, dest), duckG = gain(1, out), lid = filt('lowpass', 6500); lid.connect(duckG);
  const sat = ac.createWaveShaper(); sat.curve = new Float32Array(1024).map((_, i) => { const x = i / 511.5 - 1; return Math.tanh(1.6 * x) / Math.tanh(1.6); });
  sat.connect(lid);
  const wow = ac.createDelay(.05); wow.delayTime.value = .012; wow.connect(sat);
  lfo(.55, .0011, wow.delayTime); lfo(6.8, .000014, wow.delayTime);   // ±7 cents of wow, a hair of flutter
  const bus = gain(1, wow); if (verb) bus.connect(gain(.35, verb));
  // hiss and crackle, after the tape so they don't wobble
  const noiseG = gain(0, duckG);
  { const b = ac.createBuffer(1, sr * 3, sr), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * .02 + (Math.random() < 3 / sr ? (Math.random() - .5) * 1.2 : 0);
    const n = ac.createBufferSource(); n.buffer = b; n.loop = true; n.connect(filt('bandpass', 3000, .5)).connect(noiseG); n.start(t0); }
  // the pad: 4 voices of a saw and a triangle, slightly apart, under one breathing lid; and the sub
  const padLid = filt('lowpass', 900, .9), padG = gain(0, bus); padLid.connect(padG); lfo(.09, 220, padLid.frequency);
  const pad = [0, 1, 2, 3].map(() => ['sawtooth', 'triangle'].map((type, j) => {
    const o = ac.createOscillator(); o.type = type; o.detune.value = j ? 6 : -6; o.frequency.value = 220;
    o.connect(gain(j ? .5 : .22, padLid)); o.start(t0); return o; }));
  const sub = ac.createOscillator(), subG = gain(0, bus), subPulse = gain(1, subG); sub.frequency.value = 55; sub.connect(subPulse); sub.start(t0);

  // one-shot instruments, rendered once per pitch into a buffer
  const cache = new Map();
  function render(kind, m) {
    const key = kind + m; if (cache.has(key)) return cache.get(key);
    const f = hz(m), len = kind === 'pluck' ? 2.2 : kind === 'bell' ? 3 : 3.2, n = Math.floor(sr * len);
    const b = ac.createBuffer(1, n, sr), d = b.getChannelData(0); let rate = 1;
    if (kind === 'pluck') {   // Karplus-Strong: a soft burst in a loop that averages itself darker; the period's half sample fixed by rate
      const N = Math.max(2, Math.round(sr / f - .5)); rate = (sr / f) / (N + .5);
      let lp = 0; for (let i = 0; i < N; i++) { lp += .5 * ((Math.random() * 2 - 1) - lp); d[i] = lp; }
      const loss = Math.exp(-Math.log(1000) / (1.6 * f) * 1);   // ~ -60 dB in 1.6 s
      for (let i = N; i < n; i++) d[i] = loss * .5 * (d[i - N] + (d[i - N - 1] || 0));
      for (let i = 0; i < 48; i++) d[i] *= i / 48;   // the nail rounded off: nylon, not steel
    } else {   // additive: felt piano (slightly stretched partials, soft hammer) or bell (inharmonic, long)
      const P = kind === 'bell' ? [[1, 1, 2.6], [2.01, .35, 1.4], [2.76, .22, .9], [5.4, .08, .4]]
        : [1, 2, 3, 4, 5, 6].map(k => [k * Math.sqrt(1 + .0004 * k * k), k === 1 ? 1 : .6 / k ** 1.4, 2.4 * (220 / f) ** .3 / (1 + .7 * (k - 1))]);
      const atk = kind === 'bell' ? .003 : .012;
      for (const [r, a, tau] of P) {
        const w = 2 * Math.PI * f * r / sr; if (f * r > sr / 2.2) continue;
        let s = 0, c = 1; const cw = Math.cos(w), sw = Math.sin(w), k = Math.exp(-1 / (tau * sr));
        for (let i = 0, e = a; i < n; i++, e *= k) { d[i] += e * s; const s2 = s * cw + c * sw; c = c * cw - s * sw; s = s2; }
      }
      const A = atk * sr; for (let i = 0; i < A; i++) d[i] *= i / A;
      if (kind === 'piano') { let lp = 0; for (let i = 0; i < n; i++) { lp += .25 * (d[i] - lp); d[i] = lp * 1.2; } }   // the felt
    }
    let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(d[i])); for (let i = 0; i < n; i++) d[i] /= pk || 1;
    const r = { b, rate }; cache.set(key, r); return r;
  }
  let sounding = [];   // [start, end] of every one-shot not yet over: the voice cap, counted at the note's own time
  function note(kind, m, t, vel, cap = 12, dest = moodG) {
    if (vel <= 0 || !dest) return;
    sounding = sounding.filter(([, e]) => e > ac.currentTime);
    if (sounding.filter(([s, e]) => s <= t && e > t).length >= cap) return;
    const { b, rate } = render(kind, m), s = ac.createBufferSource(), g = gain(0);
    s.buffer = b; s.playbackRate.value = rate; s.connect(g).connect(dest);
    g.gain.setValueAtTime(vel * .25, t);
    s.start(t); s.stop(t + b.duration); sounding.push([t, t + b.duration]);
  }

  let mood = MOODS.silence, moodName = 'silence', moodG = null, pending = null, n = 0, nextBar = t0 + .05;
  let lift = 0, liftTo = 0;
  function setVoicing(c, at, tau) {
    const [bass, v] = CH[c];
    v.forEach((m, i) => pad[i].forEach(o => glide(o.frequency, hz(m), at, tau)));
    glide(sub.frequency, hz(bass - 12 < 33 ? bass : bass - 12), at, tau);
  }
  function enter(name, at, fast) {   // the new mood's notes go to a fresh gain; the old one fades its tails
    const old = moodG; moodG = gain(1, bus); mood = MOODS[name]; moodName = name; n = 0;
    if (old) { glide(old.gain, 0, at, fast ? .06 : .7); if (live) setTimeout(() => old.disconnect(), 9000 + (at - ac.currentTime) * 1000); }
    glide(subPulse.gain, 1, at, .1);
    const tau = fast ? .12 : 1;   // ~3 s to land, on the bar
    glide(bus.gain, 10 ** ((mood.vol || 0) / 20), at, tau);
    glide(padG.gain, (mood.pad || 0) * .5, at, tau); glide(subG.gain, (mood.sub || 0) * .6, at, tau);
    glide(noiseG.gain, (mood.noise || 0) * .25, at, tau);
    glide(padLid.frequency, mood.cut || 600, at, tau);
  }
  function bar(t) {
    const M = mood; if (!M.prog) { n++; return; }
    const st = M.stretch || 1, cyc = 4 * st, b = n % cyc, cycle = Math.floor(n / cyc), tb = Math.floor(b / st), half = b % st;
    const c = M.prog[tb], [bass, v] = CH[c];
    if (half === 0) setVoicing(c, t, .08);
    const L = lift, hum = () => (Math.random() - .5) * .02;
    // the thumb: the bass string on the one (and the three when driving)
    note('pluck', bass + 12, t + .01, .5 + .2 * L);
    if (M.pulse) {   // driving: the sub pushes on every beat
      for (let k = 0; k < 4; k++) { const tk = t + k * BAR / 4; subPulse.gain.setValueAtTime(.35, tk); subPulse.gain.setTargetAtTime(1, tk, .02); subPulse.gain.setTargetAtTime(.35, tk + .12, .15); }
      note('pluck', bass + 12, t + BAR / 2 + .01, .35 + .2 * L);
    }
    // the arpeggio, and a ghost of sixteenths when the hold pushes
    if (M.arp) M.arp.forEach((i, k) => {
      if (i < 0) return;
      const sw = k % 2 ? (M.swing || .02) * BAR / 8 : 0;
      note(M.arpI, v[i] + 12, t + k * STEP + sw + hum(), M.arpV * (k % 2 ? .75 : 1) * (1 + .3 * L));
      if (L > .35 && k % 2 === 0) note(M.arpI, v[(i + 2) % 4] + 12, t + k * STEP + STEP / 2 + hum(), M.arpV * .45 * L);
    });
    // the theme
    const plays = cycle >= (M.from || 0) && (cycle - (M.from || 0)) % (M.every || 1) === 0;
    if (M.lead && plays) {
      const ev = tb === 3 && M.home ? HOME : THEME[tb], oct = M.oct + (!M.stretch && cycle % 4 === 3 ? 12 : 0);   // every fourth time, an octave up
      for (const [s, semi, dur] of ev) {
        const at = s * st, rel = at - half * 8; if (rel < 0 || rel >= 8) continue;
        if (M.drop && Math.random() < M.drop && s > 0) continue;   // broken: notes go missing (never the first of a bar)
        const m = 69 + semi + oct + (M.detune ? (Math.random() < .3 ? -.15 : 0) : 0);
        note(M.lead, m, t + rel * STEP + hum() + (s % 2 ? (M.swing || 0) * BAR / 8 : 0), LEAD[M.lead] * (s === 0 ? 1 : .8) * (dur > 3 ? 1.05 : 1), 18);
        if (M.bells && Math.random() < M.bells * .6) note('bell', 69 + semi + 12, t + rel * STEP + .01, LEAD.bell * M.bells);   // Shillong: bells an octave up
      }
    } else if (M.bells && b % 2 === 1) note('bell', v[3] + 12, t + 3 * STEP, LEAD.bell * .7);   // between themes, a lone bell
    if (M.air && half === 1) note('bell', v[2] + 24, t + 4 * STEP, .12);   // the cloud: a thin high tone, once in two bars
    n++;
  }
  function pump(until) {
    lift += (liftTo - lift) * .15;
    glide(out.gain, level * (1 + .25 * lift), ac.currentTime, .4);
    while (nextBar < until) {
      if (pending) { enter(pending.name, nextBar, false); pending = null; }
      bar(nextBar); nextBar += BAR;
    }
  }
  let timer = 0;
  if (live) timer = setInterval(() => pump(ac.currentTime + .4), 50);
  return {
    set(name, { now = false } = {}) {
      if (!name || !MOODS[name] || (name === moodName && !pending) || pending?.name === name) return;
      if (now) { pending = null; const t = ac.currentTime + .02; enter(name, t, true); nextBar = t + .1; }
      else pending = { name };
    },
    rpm(k) { liftTo = Math.min(1, Math.max(0, (k - 1.15) / 1.6)); },
    duck(on) { glide(duckG.gain, on ? .5 : 1, ac.currentTime, on ? .03 : .2); },   // -6 dB under a line
    pump,
    get mood() { return pending?.name || moodName; },
    dispose() { clearInterval(timer); out.disconnect(); },
  };
}
export const MOOD_NAMES = Object.keys(MOODS);
