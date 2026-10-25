// Memory check for the web game: plays minutes of game time on the frozen clock, every frame
// drawn, going on through each Stage Clear, and logs CanvasKit's memory (its WASM heap) as it
// goes. Run on the built game (npm run build:web), in a fresh page after frozen-clock.js and
// capture-screens.js: __soak.start(10), then poll __soak.done. The heap should level off, not
// climb: before the Skia leak was fixed it grew about 5MB a second and hit Aborted() at 2GB.
(() => {
  const fk = window.__fk, a5 = window.__a5, gs = fk.gs;
  const CanvasKit = window.CanvasKit;
  const mb = () => Math.round(CanvasKit.HEAPU8.byteLength / 1048576);
  // Count the pictures Skia records, to show every frame really is drawn.
  let pictures = 0;
  const recorder = CanvasKit.PictureRecorder.prototype;
  const finish = recorder.finishRecordingAsPicture;
  recorder.finishRecordingAsPicture = function (...args) { pictures++; return finish.apply(this, args); };
  // Let React render and Skia draw between frames, without setTimeout's 4ms floor.
  const channel = new MessageChannel();
  const waiting = [];
  channel.port1.onmessage = () => waiting.shift()?.();
  const yieldNow = () => new Promise((r) => { waiting.push(r); channel.port2.postMessage(0); });
  const log = [];
  const note = (what) => log.push(`${what} | heap ${mb()}MB | pictures ${pictures} | stage ${gs().stageId} at ${Math.round(gs().elapsedSecInStage)}s`);
  const run = async (minutes) => {
    log.length = 0;
    note('page loaded');
    if (!gs().gameStarted) await a5.press('START GAME');
    note('stage 1 start');
    // The built game has no debug panel: set its "can't be hurt" flag directly, so it keeps
    // playing, and go on through each Stage Clear as a player would.
    for (let frame = 1; frame <= minutes * 3600; frame++) {
      gs().debugMode = true;
      fk.step(1);
      await yieldNow();
      if (frame % 3600 === 0) note(`${frame / 3600} min`);
      if (frame % 60 === 0 && document.body.innerText.includes('CONTINUE')) {
        note('stage clear');
        await a5.press('CONTINUE');
        note('next stage start');
      }
    }
    note('end');
    return log.join('\n');
  };
  window.__soak = {
    start: (minutes = 10) => { window.__soak.done = null; run(minutes).then((r) => { window.__soak.done = r; }, (e) => { window.__soak.done = 'ERR ' + e.message + '\n' + log.join('\n'); }); },
    log, mb,
  };
  return 'soak installed';
})()
