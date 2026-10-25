(() => {
  if (window.__fk) return 'already';
  const T0 = 1800000000000;
  let t = Date.now(), perf = performance.now(), s = 1;
  const q = [];
  Date.now = () => t;
  performance.now = () => perf;
  let id = 0;
  window.requestAnimationFrame = (cb) => { cb.__id = ++id; q.push(cb); return id; };
  window.cancelAnimationFrame = (x) => { const i = q.findIndex(c => c.__id === x); if (i >= 0) q.splice(i, 1); };
  // A hidden pane counts as "app in the background", which pauses the run. Keep it "visible".
  Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
  Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
  for (const ev of ['visibilitychange', 'blur', 'focus', 'pagehide', 'freeze']) { document.addEventListener(ev, e => e.stopImmediatePropagation(), true); window.addEventListener(ev, e => e.stopImmediatePropagation(), true); }
  HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  // The music clock reads currentTime; a reading far off makes the game ignore it.
  Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', { get() { return 1e6; }, set(v) {}, configurable: true });
  Math.random = () => { s = (s + 0x6D2B79F5) | 0; let r = Math.imul(s ^ (s >>> 15), 1 | s); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  // Since Skia 2.14 the picture is drawn straight after each update, and WebGL clears the canvas
  // once the browser has shown it, so reading it later comes back blank. While `grabbing`, keep
  // a copy made the moment Skia finishes drawing (Surface.flush). Older Skia drew on the next
  // frame, which this catches too.
  let grabbing = false, grabbed = null;
  const surface = window.CanvasKit?.Surface?.prototype;
  if (surface && !surface.__checksGrab) {
    const flush = surface.flush;
    surface.flush = function (...args) {
      const r = flush.apply(this, args);
      const c = grabbing && document.querySelector('canvas');
      if (c) { const d = c.toDataURL(); if (d.length > 50000) grabbed = d; }
      return r;
    };
    surface.__checksGrab = true;
  }
  const grab = { start: () => { grabbing = true; grabbed = null; }, stop: () => { grabbing = false; return grabbed; } };
  const runAll = () => { const cbs = q.splice(0); for (const cb of cbs) { try { cb(perf); } catch (e) { console.error(e); } } };
  const runDraws = () => { const cbs = q.splice(0); for (const cb of cbs) { if (cb.name === 'loop') q.push(cb); else { try { cb(perf); } catch (e) { console.error(e); } } } };
  const step = (n, dt = 1000 / 60) => { for (let i = 0; i < n; i++) { t += dt; perf += dt; runAll(); } };
  const info = () => (document.body.innerText.match(/Distance: \d+|Stage time: \d+s|Status: \w+/g) || []).join(' | ');
  const jump = (n) => {
    const el = [...document.querySelectorAll('div')].find(d => d.innerText?.trim() === String(n) && d.children.length <= 1);
    let f = el[Object.keys(el).find(k => k.startsWith('__reactFiber'))];
    while (f && !(f.memoizedProps && typeof f.memoizedProps.onPress === 'function')) f = f.return;
    f.memoizedProps.onPress();
  };
  const gs = () => { const c = document.querySelector('canvas'); let f = c[Object.keys(c).find(k => k.startsWith('__reactFiber'))]; while (f && !(f.memoizedProps && f.memoizedProps.gameState)) f = f.return; return f.memoizedProps.gameState; };
  // Every run starts from the same clock reading, so rounding is the same each time.
  const start = async (n) => {
    t = T0; perf = Math.ceil(perf / 1e6) * 1e6 + 1e6;
    jump(n); await sleep(200); step(1, 5000); await sleep(200); jump(n); s = 1;
    const g = gs();
    Object.assign(g.player, { y: 278, dy: 0, isGrounded: true, jumpCount: 0, isDucking: false, duckTimer: 0, duckHeld: false, jumpBuffer: 0, hurtTimer: 0, landGlow: 0, falling: 0, fallHoleId: -1, fallDrift: 0, health: 10, maxHealth: 10 });
    g.score = 0; g.streak = 0; g.energy = 100; g.shield = 0; g.particles = []; g.paused = false;
    await sleep(200);
  };
  // Where receiver.js listens; set window.__checksBase first if it runs on another port.
  const base = window.__checksBase || 'http://127.0.0.1:8099/';
  const save = async (name, data) => (await fetch(base + name, { method: 'POST', body: data })).text();
  // A burst of frames, then a few ordinary ones so the canvas catches up, then save its pixels.
  const shot = async (frames, name) => {
    step(frames);
    // Frames of zero length: the game stands still while the picture catches up.
    grab.start();
    for (let i = 0; i < 6; i++) { await sleep(120); runAll(); }
    await sleep(150); runDraws();
    const d = grab.stop() ?? document.querySelector('canvas').toDataURL();
    await save(name + '.png', d);
    let h = 0; for (let i = 0; i < d.length; i++) h = (h * 31 + d.charCodeAt(i)) | 0;
    return name + ' | ' + info() + ' | #' + d.length + ':' + h;
  };
  const set = async (prefix) => {
    const plan = [[1, [[600, 's1_010'], [4800, 's1_090'], [4800, 's1_170'], [720, 's1_clear']]], [2, [[600, 's2_010'], [8400, 's2_150']]], [3, [[600, 's3_010'], [8400, 's3_150']]], [4, [[600, 's4_010'], [8400, 's4_150']]]];
    const r = [];
    for (const [n, shots] of plan) {
      await start(n);
      for (const [frames, name] of shots) r.push(await shot(frames, prefix + '_' + name));
    }
    return r;
  };
  window.__fk = { grab, reset: () => { t = T0; perf = 1e7; s = 1; }, set, step, runAll, runDraws, info, jump, start, shot, sleep, gs, save, qnames: () => q.map(c => c.name || 'anon') };
  return 'installed';
})()
