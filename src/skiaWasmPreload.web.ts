/**
 * Start loading CanvasKit WASM as soon as the app runs (web only).
 * Patching canvaskit-wasm reads globalThis.__SKIA_WASM_BINARY__ / __SKIA_WASM_PROMISE__
 * so any CanvasKit init (including from other chunks/worklets) uses this binary.
 */
const CANVASKIT_VERSION = '0.40.0';
const WASM_URL = `https://unpkg.com/canvaskit-wasm@${CANVASKIT_VERSION}/bin/full/canvaskit.wasm`;

const promise = fetch(WASM_URL, { credentials: 'omit' })
  .then((r) => {
    if (!r.ok) throw new Error(`WASM fetch failed: ${r.status}`);
    return r.arrayBuffer();
  })
  .then((ab) => {
    const bin = new Uint8Array(ab);
    (globalThis as unknown as { __SKIA_WASM_BINARY__?: Uint8Array }).__SKIA_WASM_BINARY__ = bin;
    return bin;
  });

(globalThis as unknown as { __SKIA_WASM_PROMISE__?: Promise<Uint8Array> }).__SKIA_WASM_PROMISE__ = promise;
