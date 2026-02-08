import React from 'react';

// Must match @shopify/react-native-skia's canvaskit-wasm dependency
const CANVASKIT_VERSION = '0.40.0';

// In dev, Metro may not serve public/ at /. Use unpkg CDN (reliable for WASM). For production export, same-origin works if public/canvaskit.wasm exists.
function getWasmUrl(file: string): string {
    if (typeof window === 'undefined') return file;
    const sameOrigin = `${window.location.origin}/${file}`;
    const cdn = `https://unpkg.com/canvaskit-wasm@${CANVASKIT_VERSION}/bin/full/${file}`;
    return file === 'canvaskit.wasm' ? cdn : sameOrigin;
}

export const SkiaWrapper = ({ children }: { children: React.ReactNode }) => {
    if (typeof window !== 'undefined') {
        // @ts-ignore
        const { WithSkiaWeb } = require('@shopify/react-native-skia/lib/module/web');
        const opts = React.useMemo(
            () => ({ locateFile: getWasmUrl }),
            []
        );
        return (
            <WithSkiaWeb
                opts={opts}
                getComponent={() => Promise.resolve({ default: () => <>{children}</> })}
                fallback={<div style={{ padding: 20, color: '#fff', background: '#222' }}>Loading Skia…</div>}
            />
        );
    }
    return <>{children}</>;
};
