import React from 'react';

// On Native, Skia is already available globally or via the normal package.
// We don't need to load WASM.
export const SkiaWrapper = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
};
