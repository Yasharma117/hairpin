// Screenshots of Hairpin in headless Chrome, one browser for the whole list.
//   node tools/shot.mjs <list.json>      list: [{ url, w, h, out, wait }]
// Prints page errors. Used by tools/contact_sheet.py.
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { isAbsolute, join, dirname } from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// Work files go on the external SSD when it's plugged in (the internal disk is nearly full): HAIRPIN_WORK, else
// /Volumes/HOARDE/hairpin-work, else /tmp. Chrome's profile lives there, and relative `out` paths land in its captures/.
const WORK = [process.env.HAIRPIN_WORK, '/Volumes/HOARDE/hairpin-work'].find(d => d && existsSync(d)) || '/tmp';
const list = JSON.parse(readFileSync(process.argv[2], 'utf8')).map(s => ({ ...s, out: isAbsolute(s.out) ? s.out : join(WORK, 'captures', s.out) }));
const port = 9300 + (process.pid % 500), profile = join(WORK, WORK === '/tmp' ? '' : 'chrome-profiles', `hairpin-shot-${process.pid}`);
const ch = spawn(CHROME, ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs;
for (let i = 0; i < 60 && !tabs; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await sleep(200); } }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}, errors = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(m.params.exceptionDetails).slice(0, 300));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.description || a.value).join(' ').slice(0, 300));   // a scene that fails to load logs here
  pend[m.id]?.(m);
};
const send = (method, params = {}) => new Promise(r => { pend[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
await send('Runtime.enable');
try {
  for (const s of list) {
    await send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 1, mobile: s.w < s.h });
    await send('Page.navigate', { url: 'about:blank' }); await sleep(200);
    await send('Page.navigate', { url: s.url });
    // wait until the scene is loaded and the sheet has lifted (up to 30 s), then let it run a moment
    for (let t = 0; t < 150; t++) {
      const r = await send('Runtime.evaluate', { expression: "!!(window.__hairpin && __hairpin.current && document.querySelector('#tear').classList.contains('up'))", returnByValue: true });
      if (r.result?.result?.value) break;
      await sleep(200);
    }
    await sleep(s.wait || 3000);
    // .jpg outputs are JPEG (q 85, about a tenth of the PNG): the disk is tight, use them for anything but pixel-exact crops
    const jpg = /\.jpe?g$/i.test(s.out), r = await send('Page.captureScreenshot', jpg ? { format: 'jpeg', quality: 85 } : { format: 'png' });
    mkdirSync(dirname(s.out), { recursive: true }); writeFileSync(s.out, Buffer.from(r.result.data, 'base64'));
    console.log('shot', s.out);
  }
} finally {
  console.log(errors.length ? errors.map(e => 'ERROR ' + e).join('\n') : 'no page errors');
  // Quit Chrome cleanly, never kill it: on macOS each launch copies the app into /var/folders/…/X/com.google.Chrome.code_sign_clone
  // and only a clean exit removes that copy (killed runs left 300+ behind and filled the disk). Kill only as a last resort.
  const exited = new Promise(r => ch.once('exit', r));
  try { ws.send(JSON.stringify({ id: ++id, method: 'Browser.close' })); } catch (e) {}   // no await: Chrome may close the socket first
  if (!await Promise.race([exited.then(() => true), sleep(5000).then(() => false)])) { ch.kill(); await exited; }
  rmSync(profile, { recursive: true, force: true });   // leave no profile behind
}
process.exit(errors.length ? 1 : 0);
