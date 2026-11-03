/**
 * Load CanvasKit WASM and initialize it once on the main thread (web only). The file comes from
 * the game's own site, or from unpkg if that fails, with a limit on each so a stalled download
 * ends in the crash screen (SkiaWrapper) rather than an endless "Loading…".
 */
import { fetchWithStallLimit, firstWasm, joinChunks, withTimeout } from './loadWithLimits';

const CANVASKIT_VERSION = '0.41.0';
const WASM_SOURCES = ['/canvaskit.wasm', `https://unpkg.com/canvaskit-wasm@${CANVASKIT_VERSION}/bin/full/canvaskit.wasm`];
/** Starting CanvasKit once its file is here: fetching a small script, then setting it up. */
const START_LIMIT_MS = 60000;

const g = globalThis as unknown as {
  __SKIA_WASM_BINARY__?: Uint8Array;
  __SKIA_WASM_PROMISE__?: Promise<Uint8Array>;
  __SKIA_CANVASKIT_READY__?: Promise<unknown>;
};

/** A local address for an already-downloaded .wasm file, for CanvasKit's `locateFile`. */
function wasmObjectUrl(bin: Uint8Array): string {
  return URL.createObjectURL(new Blob([bin as Uint8Array<ArrayBuffer>], { type: 'application/wasm' }));
}

const downloadWasm = async (source: string) => {
  const { chunks } = await fetchWithStallLimit(source, { init: { credentials: 'omit' } });
  return joinChunks(chunks);
};

// The page is also pre-rendered in Node when it's built, where nothing is drawn (the app waits
// for the browser before mounting Skia), so there's nothing to load there.
if (typeof window !== 'undefined') {
  const wasmPromise = firstWasm(WASM_SOURCES, downloadWasm).then((bin) => {
    g.__SKIA_WASM_BINARY__ = bin;
    return bin;
  });
  g.__SKIA_WASM_PROMISE__ = wasmPromise;

  // Load the CanvasKit module only AFTER we have the binary.
  const canvaskitReady = wasmPromise.then(async (bin) => {
    const { default: init } = await withTimeout(import('canvaskit-wasm/bin/full/canvaskit'), START_LIMIT_MS);
    // CanvasKit 0.41 can't be handed the binary itself (the old `wasmBinary` option is gone);
    // it only asks where the file is. Point it at the copy already downloaded, so it isn't
    // fetched a second time.
    const url = wasmObjectUrl(bin);
    const CanvasKit = await withTimeout(init({ locateFile: () => url }), START_LIMIT_MS);
    URL.revokeObjectURL(url);
    (globalThis as unknown as { CanvasKit?: unknown }).CanvasKit = CanvasKit;
    return CanvasKit;
  });
  g.__SKIA_CANVASKIT_READY__ = canvaskitReady;
  // SkiaWrapper reports a failure when it mounts; until then this is expected, not unhandled.
  canvaskitReady.catch(() => {});
}
