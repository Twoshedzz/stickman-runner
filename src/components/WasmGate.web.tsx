/**
 * Web-only: do not render children until __SKIA_WASM_BINARY__ is set.
 * Ensures no worklets or lazy chunks can run before the main thread has the binary,
 * reducing the chance of "both async and sync fetching of the wasm failed" in late chunks.
 */
import React from 'react';

const SKIA_BINARY = '__SKIA_WASM_BINARY__';
const SKIA_PROMISE = '__SKIA_WASM_PROMISE__';
const LOAD_TIMEOUT_MS = 15000;

type GlobalWithSkia = typeof globalThis & {
  [SKIA_BINARY]?: Uint8Array;
  [SKIA_PROMISE]?: Promise<Uint8Array>;
};

function useWasmBinaryReady(): boolean {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const g = globalThis as GlobalWithSkia;
    if (g[SKIA_BINARY]) {
      setReady(true);
      return;
    }
    const p = g[SKIA_PROMISE];
    if (p) {
      p.then(() => setReady(true)).catch(() => setReady(false));
    } else {
      setReady(false);
    }
    const t = setTimeout(() => setReady(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);
  return ready;
}

const Loading = () => (
  <div style={{ padding: 20, color: '#fff', background: '#222', minHeight: '100vh', fontFamily: 'system-ui' }}>
    Loading…
  </div>
);

export function WasmGate({ children }: { children: React.ReactNode }) {
  const ready = useWasmBinaryReady();
  if (!ready) return <Loading />;
  return <>{children}</>;
}
