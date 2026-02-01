import React from 'react';

// On Web, we need to load the Wasm file asynchronously.
export const SkiaWrapper = ({ children }: { children: React.ReactNode }) => {
    if (typeof window !== 'undefined') {
        // @ts-ignore
        const { WithSkiaWeb } = require('@shopify/react-native-skia/lib/module/web');
        return (
            <WithSkiaWeb
                getComponent={() => Promise.resolve({ default: () => <>{children}</> })}
                fallback={<div>Loading Skia...</div>}
            />
        );
    }
    return <>{children}</>;
};
