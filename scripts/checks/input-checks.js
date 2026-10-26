// A5 input checks: real TouchEvents on the input layer, and keyboard events, with the clock frozen.
(() => {
  const fk = window.__fk, a5 = window.__a5, gs = fk.gs, sleep = fk.sleep;
  const fiberOf = (el) => el[Object.keys(el).find(k => k.startsWith('__reactFiber'))];
  const layer = () => [...document.querySelectorAll('div')].find(d => { const f = fiberOf(d); return f && f.memoizedProps && typeof f.memoizedProps.onTouchStart === 'function'; });
  const touch = async (type, x, y, target = layer()) => {
    const t = new Touch({ identifier: 7, target, clientX: x, clientY: y, pageX: x, pageY: y });
    const ev = new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], targetTouches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true });
    target.dispatchEvent(ev);
    await sleep(30);
  };
  const p = () => { const pl = gs().player; return { y: Math.round(pl.y), grounded: pl.isGrounded, jumps: pl.jumpCount, duck: pl.isDucking, held: pl.duckHeld }; };
  const ground = async () => { for (let i = 0; i < 300 && !(gs().player.isGrounded && !gs().player.isDucking); i++) fk.step(1); await a5.settle(); };
  const out = [];
  const check = (name, ok, detail) => out.push((ok ? 'PASS ' : 'FAIL ') + name + ' ' + JSON.stringify(detail));
  const run = async () => {
    out.length = 0;
    const g0 = gs(); g0.debugMode = true; // no damage while testing
    if (!g0.gameStarted) await a5.press('START GAME');
    fk.step(30); await ground();
    // Tap: jump, and a second tap in the air is the double jump.
    await touch('touchstart', 300, 200); await touch('touchend', 300, 200); fk.step(2);
    let s = p(); check('tap jumps', !s.grounded && s.jumps === 1, s);
    fk.step(8); await touch('touchstart', 300, 200); await touch('touchend', 300, 200); fk.step(2);
    s = p(); check('second tap double-jumps', s.jumps === 2, s);
    await ground();
    // Swipe down and hold: ducks, and stays down while the finger stays.
    await touch('touchstart', 300, 150); await touch('touchmove', 300, 190); fk.step(2);
    s = p(); check('swipe down ducks', s.duck && s.held, s);
    fk.step(120); s = p(); check('held finger stays ducked (2s)', s.duck && s.held, s);
    await touch('touchend', 300, 190); fk.step(30); s = p(); check('lifting the finger stands up', !s.duck && !s.held, s);
    await ground();
    // Swipe back up from a held duck: jumps.
    await touch('touchstart', 300, 150); await touch('touchmove', 300, 190); fk.step(2);
    await touch('touchmove', 300, 150); fk.step(2);
    s = p(); check('swipe up from a duck jumps', !s.grounded && !s.duck && s.jumps === 1, s);
    await touch('touchend', 300, 150); await ground();
    // Keyboard.
    await a5.key('Space', 'keydown', ' '); await a5.key('Space', 'keyup', ' '); fk.step(2);
    s = p(); check('Space jumps', !s.grounded && s.jumps === 1, s);
    fk.step(8); await a5.key('ArrowUp'); await a5.key('ArrowUp', 'keyup'); fk.step(2);
    s = p(); check('ArrowUp double-jumps', s.jumps === 2, s);
    await ground();
    await a5.key('ArrowDown'); fk.step(90); s = p(); check('ArrowDown held ducks (1.5s)', s.duck && s.held, s);
    await a5.key('ArrowDown', 'keyup'); fk.step(30); s = p(); check('ArrowDown up stands', !s.duck, s);
    await ground();
    await a5.key('KeyS', 'keydown', 's'); fk.step(90); s = p(); check('S held ducks', s.duck && s.held, s);
    await a5.key('KeyS', 'keyup', 's'); fk.step(30); s = p(); check('S up stands', !s.duck, s);
    await ground();
    // Pausing: P pauses; taps, swipes and keys do nothing while paused; Esc resumes.
    await a5.key('KeyP', 'keydown', 'p'); s = p(); check('P pauses', gs().paused, s);
    const before = p();
    await touch('touchstart', 300, 200); await touch('touchend', 300, 200);
    await a5.key('Space', 'keydown', ' '); await a5.key('ArrowDown'); fk.step(5);
    s = p(); check('nothing jumps or ducks while paused', JSON.stringify(s) === JSON.stringify(before) && gs().paused, s);
    await a5.key('ArrowDown', 'keyup');
    await a5.key('Escape'); check('Esc starts the 3-2-1', gs().resumeAt > 0, gs().resumeAt);
    fk.step(200); await a5.settle(); check('play carries on after the 3-2-1', !gs().paused, gs().paused);
    await ground();
    // The pause button: pressing it pauses without a jump.
    const btn = document.querySelector('[aria-label="Pause"]');
    let f = fiberOf(btn); while (f && !(f.memoizedProps && typeof f.memoizedProps.onPress === 'function')) f = f.return;
    f.memoizedProps.onPress(); fk.step(3); await a5.settle();
    s = p(); check('pause button pauses, no jump', gs().paused && s.grounded && s.jumps === 0, s);
    await a5.key('Escape'); fk.step(200); await a5.settle(); await ground();
    // A real touch on the pause button never reaches the jump layer.
    const b2 = document.querySelector('[aria-label="Pause"]'); const r = b2.getBoundingClientRect();
    await touch('touchstart', r.x + r.width / 2, r.y + r.height / 2, b2); await touch('touchend', r.x + r.width / 2, r.y + r.height / 2, b2); fk.step(3);
    s = p(); check('touch on the pause button does not jump', s.grounded && s.jumps === 0, s);
    if (gs().paused) { await a5.key('Escape'); fk.step(200); await a5.settle(); }
    return out.join('\n');
  };
  window.__a5in = { run, touch, p, ground, layer };
  return 'a5input installed';
})()
