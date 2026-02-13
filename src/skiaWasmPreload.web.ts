/**
 * Load CanvasKit WASM and initialize it once on the main thread (web only).
 * This runs before any worklet can load the CanvasKit chunk, so the module is
 * cached and global.CanvasKit is set — avoiding "both async and sync fetching failed"
 * when worklets trigger dynamic imports.
 */
const CANVASKIT_VERSION = '0.40.0';
const WASM_URL = `https://unpkg.com/canvaskit-wasm@${CANVASKIT_VERSION}/bin/full/canvaskit.wasm`;

const g = globalThis as unknown as {
  __SKIA_WASM_BINARY__?: Uint8Array;
  __SKIA_WASM_PROMISE__?: Promise<Uint8Array>;
  __SKIA_CANVASKIT_READY__?: Promise<unknown>;
};

const wasmPromise = fetch(WASM_URL, { credentials: 'omit' })
  .then((r) => {
    if (!r.ok) throw new Error(`WASM fetch failed: ${r.status}`);
    return r.arrayBuffer();
  })
  .then((ab) => {
    const bin = new Uint8Array(ab);
    g.__SKIA_WASM_BINARY__ = bin;
    return bin;
  });

g.__SKIA_WASM_PROMISE__ = wasmPromise;

// Initialize CanvasKit on the main thread so the module is cached and never loaded in a worklet context.
const canvaskitReady = wasmPromise.then(async (bin) => {
  const init = (await import('canvaskit-wasm/bin/full/canvaskit')).default;
  const CanvasKit = await init({ wasmBinary: bin });
  (globalThis as unknown as { CanvasKit?: unknown }).CanvasKit = CanvasKit;
  return CanvasKit;
});

g.__SKIA_CANVASKIT_READY__ = canvaskitReady;
