/**
 * Web-only: do not render children until the download of __SKIA_WASM_BINARY__ has finished.
 * Ensures no worklets or lazy chunks can run before the main thread has the binary,
 * reducing the chance of "both async and sync fetching of the wasm failed" in late chunks.
 * If it failed, the children are shown anyway: SkiaWrapper shows what went wrong.
 */
import React from 'react';

const SKIA_BINARY = '__SKIA_WASM_BINARY__';
const SKIA_PROMISE = '__SKIA_WASM_PROMISE__';

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
    // The download has its own limits (skiaWasmPreload.web.ts), so this always ends.
    if (p) p.catch(() => {}).then(() => setReady(true));
    else setReady(true);
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
