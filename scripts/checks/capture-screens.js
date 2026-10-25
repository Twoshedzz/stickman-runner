// A5 capture: drives the game through every screen with the clock frozen, saving the
// overlay's HTML (canvas removed) and the canvas pixels at each one.
(() => {
  if (window.__a5) return 'already';
  const fk = window.__fk;
  // Blinking menu arrows and the loading flicker run on intervals: hold them still.
  window.setInterval = () => 0;
  const m = window.__stickmanMenuMusic;
  if (m) { try { m.gain.disconnect(); } catch {} m.ctx.suspend(); m.ctx.resume = () => Promise.resolve(); }
  const sleep = fk.sleep;
  const fiberOf = (el) => el[Object.keys(el).find(k => k.startsWith('__reactFiber'))];
  const findProp = (el, prop) => { let f = fiberOf(el); while (f && !(f.memoizedProps && typeof f.memoizedProps[prop] === 'function')) f = f.return; return f && f.memoizedProps[prop]; };
  const byText = (text) => [...document.querySelectorAll('div')].filter(d => d.innerText?.trim() === text && d.children.length === 0);
  const press = async (text) => {
    const fn = byText(text).map(el => findProp(el, 'onPress')).find(Boolean);
    if (!fn) throw new Error('no button ' + text);
    fn();
    await settle();
  };
  const key = async (code, type = 'keydown', k) => {
    window.dispatchEvent(new KeyboardEvent(type, { code, key: k ?? code, bubbles: true, cancelable: true }));
    await settle();
  };
  const gs = fk.gs;
  // Zero-length frames so React and the canvas catch up without the game moving.
  const settle = async () => { for (let i = 0; i < 4; i++) { await sleep(60); fk.runAll(); } };
  const dom = () => {
    const c = document.body.cloneNode(true);
    c.querySelectorAll('canvas,script').forEach(x => x.remove());
    return c.innerHTML.replace(/tick: \d+/g, 'tick: N');
  };
  let prefix = 'B';
  const log = [];
  let stops = new Set(), go = null;
  const snap = async (name) => {
    fk.grab.start();
    await settle();
    if (stops.has(name)) { window.__a5.at = name; await new Promise(r => { go = r; }); go = null; }
    await sleep(150); fk.runDraws();
    const html = dom();
    // The canvas is sometimes caught blank, between pictures: try again.
    let png = fk.grab.stop() ?? document.querySelector('canvas')?.toDataURL() ?? '';
    for (let i = 0; i < 8 && png && png.length < 50000; i++) { await sleep(150); fk.runDraws(); png = document.querySelector('canvas').toDataURL(); }
    await fk.save(prefix + '_' + name + '.html', html);
    if (png) await fk.save(prefix + '_' + name + '.png', png);
    const g = gs();
    const pick = { stageId: g.stageId, distance: g.distance, elapsed: g.elapsedSecInStage, start: g.stageStartTime, score: g.score, energy: g.energy, paused: g.paused, resumeAt: g.resumeAt, player: g.player, obstacles: g.obstacles.map(o => [o.type, Math.round(o.x * 1000) / 1000]), now: Date.now(), perf: performance.now() };
    await fk.save(prefix + '_' + name + '.json', JSON.stringify(pick, null, 1));
    log.push(name + ' | ' + (document.body.innerText.replace(/\s+/g, ' ').slice(0, 120)) + ' | started=' + g.gameStarted + ' over=' + g.gameOver + ' paused=' + g.paused);
  };
  const waitFor = async (text, ms = 15000) => {
    for (let i = 0; i < ms / 100; i++) { if (document.body.innerText.includes(text)) return true; await sleep(100); fk.runAll(); }
    throw new Error('never saw ' + text);
  };
  const toggleDebug = async () => {
    const sw = document.querySelector('input[role="switch"], [role="switch"]');
    findProp(sw, 'onValueChange')(!gs().debugMode);
    await settle();
  };
  // Run the stage clock on by `sec` in 3-second frames.
  const runOn = async (sec) => { fk.step(Math.round(sec / 3), 3000); await settle(); };
  const worldMock = () => {
    const entries = [
      { initials: 'ZED', score: 900, date: '2026-10-01T00:00:00Z', completed: true },
      { initials: 'MAX', score: 400, date: '2026-10-02T00:00:00Z', completed: false },
      { initials: 'JOE', score: 50, date: '2026-10-03T00:00:00Z', completed: false },
    ];
    const real = window.fetch;
    window.fetch = (url, init) => {
      if (String(url).includes('/api/scores')) {
        if (init && init.method === 'POST') {
          const body = JSON.parse(init.body);
          const all = [...entries, { ...body, date: '2026-10-25T00:00:00Z' }].sort((a, b) => b.score - a.score);
          return Promise.resolve(new Response(JSON.stringify({ rank: all.findIndex(e => e.initials === body.initials), entries: all }), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify({ entries }), { status: 200 }));
      }
      return real(url, init);
    };
  };

  const run = async (p, stopAt = []) => {
    stops = new Set(stopAt);
    prefix = p; log.length = 0;
    await press('HOW TO PLAY'); await press('BACK'); fk.reset(); await snap('01_title');
    await press('HOW TO PLAY'); await snap('02_howto_p1');
    await key('ArrowRight', 'keydown', 'ArrowRight'); await snap('03_howto_p2');
    await key('ArrowLeft', 'keydown', 'ArrowLeft'); await snap('04_howto_back_p1');
    await press('BACK'); await snap('05_title_again');
    await press('START GAME'); fk.step(60); await snap('06_banner_hud');
    fk.step(270); await snap('07_banner_fading');
    fk.step(60); await snap('08_banner_gone');
    await key('KeyP', 'keydown', 'p'); await snap('09_paused');
    // Nothing moves or jumps while paused.
    const yBefore = gs().player.y; await key('Space', 'keydown', ' '); await key('ArrowDown'); await key('ArrowDown', 'keyup');
    log.push('paused: jump/duck ignored = ' + (gs().player.y === yBefore && !gs().player.isDucking));
    await press('HOW TO PLAY'); await snap('10_paused_howto');
    await key('Escape'); log.push('Esc on how-to-play while paused does not resume: ' + (gs().resumeAt === 0));
    await press('BACK'); await snap('11_paused_again');
    await key('Escape'); await snap('12_countdown_3');
    fk.step(61); await snap('13_countdown_2');
    fk.step(60); await snap('14_countdown_1');
    fk.step(70); await snap('15_resumed');
    await key('KeyP', 'keydown', 'p'); await press('QUIT'); await snap('16_quit_to_title');
    await press('START GAME'); fk.step(10);
    await toggleDebug(); await snap('17_debug_panel');
    await press('1'); await runOn(181); await waitFor('CONTINUE'); await snap('18_stage_clear');
    await press('CONTINUE'); fk.step(30); await snap('19_stage2_banner');
    await press('4'); await runOn(181); await snap('20_finished');
    await press('PLAY AGAIN'); fk.step(30); await snap('21_play_again');
    gs().score = 123; gs().gameOver = true; await settle(); await snap('22_game_over');
    worldMock();
    await press('PLAY AGAIN'); await sleep(500); fk.step(30); await snap('23_play_again_board');
    gs().score = 456; gs().gameOver = true; await settle(); await sleep(1000); await settle(); await snap('24_initials');
    const submit = findProp(byText('ENTER')[0], 'onPress'); // the initials screen's own ENTER
    submit(); await sleep(1000); await settle(); await snap('25_world_entered');
    await press('CONTINUE'); await snap('26_game_over_world');
    await press('WORLD SCORES'); await snap('27_world_browse');
    await press('BACK'); await press('HOW TO PLAY'); await snap('28_gameover_howto');
    await press('BACK');
    await key('Enter'); fk.step(20); await snap('29_enter_plays_again');
    await key('KeyP', 'keydown', 'p'); await press('QUIT'); await snap('30_title_with_world');
    await press('WORLD SCORES'); await snap('31_world_from_title');
    await press('BACK'); await snap('32_title_back');
    await sleep(7300); await snap('33_attract_world');
    await sleep(5300); await snap('34_attract_best');
    await sleep(5300); await snap('35_attract_logo');
    return log.join('\n');
  };
  window.__a5 = { start: (p, stopAt) => { window.__a5.done = null; run(p, stopAt).then(r => { window.__a5.done = r; }, e => { window.__a5.done = 'ERR ' + e.message; }); }, next: async () => { if (go) go(); await sleep(50); for (let i = 0; i < 600 && !go && window.__a5.done == null; i++) await sleep(50); return window.__a5.done ?? window.__a5.at; }, run, press, key, snap, settle, dom, worldMock, toggleDebug, runOn, waitFor, log };
  return 'a5 installed';
})()
