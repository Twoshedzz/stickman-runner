/**
 * Load CanvasKit WASM and initialize it once on the main thread (web only).
 * Try same-origin sync XHR first so __SKIA_WASM_BINARY__ is set before any
 * segment/chunk runs (avoids "Aborted()" in segment 5 when canvaskit loads before async fetch completes).
 */
const CANVASKIT_VERSION = '0.40.0';
const WASM_URL = `https://unpkg.com/canvaskit-wasm@${CANVASKIT_VERSION}/bin/full/canvaskit.wasm`;

const g = globalThis as unknown as {
  __SKIA_WASM_BINARY__?: Uint8Array;
  __SKIA_WASM_PROMISE__?: Promise<Uint8Array>;
  __SKIA_CANVASKIT_READY__?: Promise<unknown>;
};

function trySyncSameOriginWasm(): Uint8Array | null {
  if (typeof XMLHttpRequest === 'undefined' || typeof location === 'undefined') return null;
  const origin = location.origin || '';
  const paths = ['/static/js/canvaskit.wasm', '/canvaskit.wasm', '/static/canvaskit.wasm'];
  for (const p of paths) {
    try {
      const url = origin + p;
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.responseType = 'arraybuffer';
      xhr.send(null);
      if ((xhr.status === 200 || xhr.status === 0) && xhr.response) {
        return new Uint8Array(xhr.response);
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

// Set binary synchronously from same-origin if possible so any chunk (e.g. segment 5) sees it before ob() runs.
let bin = trySyncSameOriginWasm();
if (bin) {
  g.__SKIA_WASM_BINARY__ = bin;
  if (typeof (globalThis as unknown as { window?: unknown }).window !== 'undefined') {
    (globalThis as unknown as { window: { __SKIA_WASM_BINARY__?: Uint8Array } }).window.__SKIA_WASM_BINARY__ = bin;
  }
}

const wasmPromise = bin
  ? Promise.resolve(bin)
  : fetch(WASM_URL, { credentials: 'omit' })
      .then((r) => {
        if (!r.ok) throw new Error(`WASM fetch failed: ${r.status}`);
        return r.arrayBuffer();
      })
      .then((ab) => {
        const b = new Uint8Array(ab);
        g.__SKIA_WASM_BINARY__ = b;
        if (typeof (globalThis as unknown as { window?: unknown }).window !== 'undefined') {
          (globalThis as unknown as { window: { __SKIA_WASM_BINARY__?: Uint8Array } }).window.__SKIA_WASM_BINARY__ = b;
        }
        return b;
      });

g.__SKIA_WASM_PROMISE__ = wasmPromise;

// Load the CanvasKit module only AFTER we have the binary, so when the chunk runs ob() finds __SKIA_WASM_BINARY__.
// (Loading it here before the binary was set caused the chunk to run and throw "Aborted()" in segment 4/5.)
const canvaskitReady = wasmPromise.then(async (bin) => {
  const { default: init } = await import('canvaskit-wasm/bin/full/canvaskit');
  const CanvasKit = await init({ wasmBinary: bin });
  (globalThis as unknown as { CanvasKit?: unknown }).CanvasKit = CanvasKit;
  return CanvasKit;
});

g.__SKIA_CANVASKIT_READY__ = canvaskitReady;
