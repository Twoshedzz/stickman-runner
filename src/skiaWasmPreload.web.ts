/**
 * Load CanvasKit WASM and initialize it once on the main thread (web only).
 * Eagerly start loading the CanvasKit module so it is in the main-thread cache before
 * any worklet can trigger a dynamic import (avoids "both async and sync fetching failed" at ~2 min).
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
    // Also set on window so any code path (e.g. late-loaded chunks) sees it
    if (typeof (globalThis as unknown as { window?: unknown }).window !== 'undefined') {
      (globalThis as unknown as { window: { __SKIA_WASM_BINARY__?: Uint8Array } }).window.__SKIA_WASM_BINARY__ = bin;
    }
    return bin;
  });

g.__SKIA_WASM_PROMISE__ = wasmPromise;

// Start loading the CanvasKit module immediately so it runs on main thread and is cached before any late code path.
const canvaskitModulePromise = import('canvaskit-wasm/bin/full/canvaskit');

const canvaskitReady = wasmPromise.then(async (bin) => {
  const { default: init } = await canvaskitModulePromise;
  const CanvasKit = await init({ wasmBinary: bin });
  (globalThis as unknown as { CanvasKit?: unknown }).CanvasKit = CanvasKit;
  return CanvasKit;
});

g.__SKIA_CANVASKIT_READY__ = canvaskitReady;
