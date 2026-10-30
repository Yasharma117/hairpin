// The score: eight recorded tracks by Blue Dot Sessions (CC BY-NC 4.0, see audio/CREDITS.md), one per mood.
//   const s = makeScore(ac, dest); s.set('drive'); s.set('silence', { now: true }); s.rpm(k); s.duck(on); s.prefetch('tender')
// Each track streams through an <audio> element into Web Audio (a decoded 4-minute track would cost ~90 MB on a phone).
// A mood change crossfades in ~3 s (now: ~0.3 s); a mood on the same track only moves its level and lid, so the music
// never restarts (edge → edge-story, shillong → bloom). A track loops by crossfading into itself 3 s before its end.
// The files are -18 LUFS with a 1 s fade in and 3 s fade out baked in (tools: ffmpeg loudnorm, see audio/CREDITS.md).
// Four elements, primed with a silent clip inside the unlocking tap, so iOS lets them play later without one.
const XF = 3, TRACK = t => `audio/${t}.m4a`;
// mood: [track, dB, lowpass Hz]
const MOODS = {
  silence: [null],
  hopeful: ['roundpine', 0], stand: ['roundpine', 0],
  warm: ['tiptoe-treadline', 0], jorabat: ['tiptoe-treadline', 0],
  drive: ['flashing-runner', 0], 'drive-hold': ['flashing-runner', 2], climb: ['flashing-runner', 0],
  tender: ['greyleaf-willow', 0], nongpoh: ['greyleaf-willow', 0],
  suspended: ['paper-crane', -1], cloud: ['paper-crane', -1],
  edge: ['dense-reflections', -2], 'edge-story': ['dense-reflections', -6, 1500],
  relief: ['even-dreams-of-beaches', 0],
  shillong: ['bright-edges', 0], bloom: ['bright-edges', 2],
};
function silentWav(n = 400) {   // 50 ms of 8-bit silence: something to play inside the tap
  const b = new DataView(new ArrayBuffer(44 + n)), s = (o, str) => [...str].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
  s(0, 'RIFF'); b.setUint32(4, 36 + n, true); s(8, 'WAVEfmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
  b.setUint32(24, 8000, true); b.setUint32(28, 8000, true); b.setUint16(32, 1, true); b.setUint16(34, 8, true); s(36, 'data'); b.setUint32(40, n, true);
  for (let i = 0; i < n; i++) b.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}

export function makeScore(ac, dest, { level = .45 } = {}) {   // level: the one knob for music vs bed (-7 dB: the tracks sit ~-25 LUFS)
  const gain = (v, to) => { const g = ac.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };
  const glide = (p, v, tau) => { const t = ac.currentTime; p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.setTargetAtTime(v, t, tau); };
  const out = gain(level, dest), duckG = gain(1, out), silent = silentWav();
  const pool = [0, 1, 2, 3].map(() => {
    const el = new Audio(), lp = ac.createBiquadFilter(), g = gain(0, duckG), v = { el, lp, g, track: null, on: false };
    lp.frequency.value = 20000; ac.createMediaElementSource(el).connect(lp).connect(g);
    el.preload = 'auto'; el.src = silent; el.play().then(() => { if (!v.track) el.pause(); }, () => {});
    el.addEventListener('error', () => { if (v.track) console.warn('music: could not load', TRACK(v.track)); });
    return v;
  });
  let mood = 'silence', cur = null, lift = 0, paused = false;
  const want = () => { const [, db = 0, hz = 20000] = MOODS[mood]; return { g: 10 ** ((db + 2 * lift) / 20), hz }; };
  function load(v, track) { if (v.track !== track) { v.track = track; v.el.src = TRACK(track); } return v; }
  function apply(v, tau) { const w = want(); glide(v.g.gain, w.g, tau); glide(v.lp.frequency, w.hz, tau); }
  function start(track, tau) {   // a free element, the one already holding this track if any
    const free = pool.filter(v => !v.on && v !== cur);
    const v = load(free.find(v => v.track === track) || free.find(v => !v.track) || free[0], track);
    v.on = true; v.el.currentTime = 0; if (!paused) v.el.play().catch(e => console.warn('music', e));
    v.g.gain.cancelScheduledValues(ac.currentTime); v.g.gain.setValueAtTime(0, ac.currentTime); v.lp.frequency.value = want().hz;
    apply(v, tau); return v;
  }
  function stop(v, tau) {   // fade, then free the element once the fade is all but done
    glide(v.g.gain, 0, tau);
    setTimeout(() => { if (v !== cur) { v.el.pause(); v.on = false; } }, tau * 6000 + 100);
  }
  setInterval(() => {   // the loop: 3 s before the end, crossfade into the top of the same track
    const el = cur?.el;
    if (!paused && el && el.duration && el.currentTime > el.duration - XF) { const old = cur; cur = start(old.track, XF / 3); stop(old, XF / 3); }
  }, 250);
  return {
    set(name, { now = false } = {}) {
      if (!(name in MOODS) || name === mood) return;
      mood = name; const track = MOODS[name][0], tau = now ? .1 : XF / 3;
      if (cur && cur.track === track) return apply(cur, tau);
      if (cur) stop(cur, tau);
      cur = track ? start(track, tau) : null;
    },
    prefetch(name) {   // the next scene's track into an idle element, so its crossfade starts without a wait
      const track = MOODS[name]?.[0];
      if (!track || pool.some(v => v.track === track)) return;
      const v = pool.find(v => !v.on && v !== cur); if (v) load(v, track);
    },
    rpm(k) {   // the hold lifts the music up to +2 dB
      const l = Math.min(1, Math.max(0, (k - 1.15) / 1.6));
      if (Math.abs(l - lift) < .03) return; lift = l; if (cur) apply(cur, .4);
    },
    duck(on) { glide(duckG.gain, on ? .5 : 1, on ? .03 : .2); },   // -6 dB under a line
    suspend(on) { paused = on; pool.forEach(v => v.on && (on ? v.el.pause() : v.el.play().catch(() => {}))); },   // the tab hidden
    get mood() { return mood; },
    get state() { return { mood, playing: cur?.track || null, voices: pool.map(v => ({ track: v.track, on: v.on, t: +v.el.currentTime.toFixed(1), gain: +v.g.gain.value.toFixed(3), hz: Math.round(v.lp.frequency.value), paused: v.el.paused })) }; },
    out,
  };
}
export const MOOD_NAMES = Object.keys(MOODS);
