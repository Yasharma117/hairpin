// Shared by every scene: the paper tear between scenes, ?play chaining, and the audio bed.
// A classic script so each scene still works opened on its own; scenes reach it as window.hairpin.
(() => {
  const play = new URLSearchParams(location.search).has('play');

  /* ---------- the paper tear: a torn sheet wipes up off the screen on arrival, and back over it on leaving ---------- */
  const style = document.createElement('style');
  style.textContent = `
.hp-tear { position: fixed; inset: -4% 0; z-index: 50; background: #efe6cf; pointer-events: none; transform: translateY(0); transition: transform .75s cubic-bezier(.7, 0, .3, 1);
  clip-path: polygon(0% 3%, 5% 1%, 11% 3.5%, 18% .5%, 26% 3%, 33% 1%, 41% 4%, 49% .8%, 57% 3.2%, 64% 1%, 72% 3.8%, 80% .6%, 87% 3%, 94% 1.2%, 100% 3.4%, 100% 97%, 94% 99.2%, 87% 96.8%, 80% 99.4%, 72% 96.6%, 64% 99%, 57% 96.8%, 49% 99.2%, 41% 96%, 33% 99%, 26% 97%, 18% 99.5%, 11% 96.5%, 5% 99%, 0% 97%); }
.hp-tear.up { transform: translateY(-110%); }
.hp-tear.down { transform: translateY(110%); transition: none; }
@media (prefers-reduced-motion: reduce) { .hp-tear { transition-duration: .01s; } }`;
  document.head.appendChild(style);
  const sheet = document.createElement('div');
  sheet.className = 'hp-tear' + (play ? '' : ' up');
  sheet.setAttribute('aria-hidden', 'true');
  const mount = () => {
    document.body.appendChild(sheet);
    if (play) requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('up')));
  };
  document.body ? mount() : addEventListener('DOMContentLoaded', mount);

  let leaving = false;
  function tearTo(url) {
    if (leaving) return; leaving = true;
    if (play) url += (url.includes('?') ? '&' : '?') + 'play';
    sheet.classList.remove('up'); sheet.classList.add('down');
    requestAnimationFrame(() => requestAnimationFrame(() => { sheet.classList.remove('down'); }));   // comes up from below
    setTimeout(() => { location.href = url; }, 800);
  }

  /* ---------- the audio bed: engine, wind, crickets; starts on the first key or touch ---------- */
  // ponytail: synthesised placeholders; swap for recorded loops when there's a sound pass
  function bed(parts) {
    const start = () => {
      removeEventListener('pointerup', start); removeEventListener('keydown', start);
      try {
        const ac = new (window.AudioContext || window.webkitAudioContext)(), out = ac.createGain();
        out.gain.value = .6; out.connect(ac.destination);
        const noise = () => {
          const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
          const n = ac.createBufferSource(); n.buffer = b; n.loop = true; n.start(); return n;
        };
        const lfo = (hz, amount, param, type = 'sine') => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = hz; g.gain.value = amount; o.connect(g).connect(param); o.start(); };
        if (parts.engine) {   // an 800cc three-cylinder at a steady climb: two detuned saws under a low lid
          const f = ac.createBiquadFilter(), g = ac.createGain();
          f.type = 'lowpass'; f.frequency.value = 170; g.gain.value = .07 * parts.engine;
          for (const hz of [46, 46.7]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz; o.connect(f); o.start(); }
          lfo(.3, 12, f.frequency);
          f.connect(g).connect(out);
        }
        if (parts.wind) {     // gusts: low noise breathing in and out
          const f = ac.createBiquadFilter(), g = ac.createGain();
          f.type = 'lowpass'; f.frequency.value = 480; g.gain.value = .05 * parts.wind;
          lfo(.13, .035 * parts.wind, g.gain); lfo(.21, 160, f.frequency);
          noise().connect(f).connect(g).connect(out);
        }
        if (parts.crickets) { // a high tone, chirped fast and gated slow
          const o = ac.createOscillator(), chirp = ac.createGain(), gate = ac.createGain(), g = ac.createGain();
          o.frequency.value = 4700; chirp.gain.value = 0; gate.gain.value = 0; g.gain.value = .012 * parts.crickets;
          lfo(31, 1, chirp.gain); lfo(.9, 1, gate.gain, 'square');
          o.connect(chirp).connect(gate).connect(g).connect(out); o.start();
        }
      } catch (e) {}
    };
    addEventListener('pointerup', start); addEventListener('keydown', start);   // pointerup: a touch only counts as a gesture there
  }

  /* ---------- ?fps: a frame-rate readout in the corner, for checking phones ---------- */
  if (new URLSearchParams(location.search).has('fps')) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:60;font:600 12px ui-monospace,Menlo,monospace;color:#f6c744;background:#000a;padding:4px 6px;pointer-events:none';
    (document.body || document.documentElement).appendChild(el);
    let n = 0, t0 = performance.now(), worst = 0, last = t0;
    const tick = now => {
      n++; worst = Math.max(worst, now - last); last = now;
      if (now - t0 > 1000) { el.textContent = `${Math.round(n * 1000 / (now - t0))} fps · worst ${Math.round(worst)} ms · dpr ${devicePixelRatio}`; n = 0; t0 = now; worst = 0; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  window.hairpin = { play, tearTo, bed };
})();
