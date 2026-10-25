// Music check: iPhone Safari only lets music start inside a tap. Presses START GAME, RESUME,
// CONTINUE and PLAY AGAIN the way a tap does and logs whether the game music's play() and the
// menu music's fade ran inside the press. Run in a fresh page after frozen-clock.js and
// capture-screens.js; compare the log before and after a change.
(() => {
  const fk = window.__fk, a5 = window.__a5, gs = fk.gs, sleep = fk.sleep;
  const fiberOf = (el) => el[Object.keys(el).find(k => k.startsWith('__reactFiber'))];
  const findProp = (el, prop) => { let f = fiberOf(el); while (f && !(f.memoizedProps && typeof f.memoizedProps[prop] === 'function')) f = f.return; return f && f.memoizedProps[prop]; };
  const byText = (text) => [...document.querySelectorAll('div')].filter(d => d.innerText?.trim() === text && d.children.length === 0);
  let inTap = null;
  const log = [];
  const muted = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    // Blob addresses change every load, so name the kind of source rather than the address.
    const src = String(this.src);
    const what = !src ? '(no source yet)' : src.startsWith('blob:') ? '(downloaded track)' : src.split('/').pop().split('?')[0];
    log.push('  play ' + what + (inTap ? ' INSIDE ' + inTap : ' outside a tap'));
    return muted.call(this);
  };
  const ramp = AudioParam.prototype.linearRampToValueAtTime;
  AudioParam.prototype.linearRampToValueAtTime = function (v, t) {
    log.push('  menu fade to ' + v + (inTap ? ' INSIDE ' + inTap : ' outside a tap'));
    return ramp.call(this, v, t);
  };
  const tap = async (text) => {
    const fn = byText(text).map(el => findProp(el, 'onPress')).find(Boolean);
    if (!fn) throw new Error('no button ' + text);
    log.push('tap ' + text);
    inTap = text; try { fn(); } finally { inTap = null; }
    await a5.settle();
  };
  const run = async () => {
    log.length = 0;
    await tap('START GAME'); fk.step(60); await a5.settle();
    await a5.key('KeyP', 'keydown', 'p'); log.push('paused');
    await tap('RESUME'); fk.step(200); await a5.settle();
    await a5.toggleDebug();
    await a5.press('1'); await a5.runOn(181); await a5.waitFor('CONTINUE');
    await tap('CONTINUE'); fk.step(30); await a5.settle();
    await a5.press('4'); await a5.runOn(181); await a5.waitFor('PLAY AGAIN');
    await tap('PLAY AGAIN'); fk.step(30); await a5.settle();
    gs().score = 0; gs().gameOver = true; await a5.settle();
    await tap('PLAY AGAIN'); fk.step(30); await a5.settle();
    return log.join('\n');
  };
  window.__music = { run, log };
  return 'music check installed';
})()
