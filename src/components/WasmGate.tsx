import React from 'react';

/** No-op on native; see WasmGate.web.tsx for web. */
export function WasmGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
