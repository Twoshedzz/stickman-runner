import React from 'react';
import { AppErrorBoundary } from './AppErrorBoundary';
import { CrashScreen, reloadPage } from './CrashScreen';

// Must match @shopify/react-native-skia's canvaskit-wasm dependency
const CANVASKIT_VERSION = '0.41.0';

function getWasmUrl(file: string): string {
    if (typeof window === 'undefined') return file;
    return `https://unpkg.com/canvaskit-wasm@${CANVASKIT_VERSION}/bin/full/${file}`;
}

/** The drawing engine never arrived, so there's no game to show. */
const LoadFailed = () => (
    <CrashScreen
        title="THE GAME COULDN'T LOAD"
        message="PART OF IT DIDN'T DOWNLOAD. CHECK YOUR CONNECTION, THEN TRY AGAIN."
        buttonLabel="RELOAD"
        onPress={reloadPage}
    />
);

const LoadingFallback = () => (
    <div style={{ padding: 20, color: '#fff', background: '#222' }}>Loading Skia…</div>
);

/** As well as React errors, catches CanvasKit aborting outside React's reach. */
class SkiaErrorBoundary extends AppErrorBoundary {
    _rejectionHandler = (e: PromiseRejectionEvent) => {
        const msg = e?.reason?.message ?? String(e?.reason ?? '');
        if (msg.includes('Aborted') || msg.includes('wasm')) {
            this.trip();
            e.preventDefault?.();
        }
    };
    _errorHandler = (event: ErrorEvent) => {
        const msg = event.message ?? String(event.error ?? '');
        if (msg.includes('Aborted') || msg.includes('wasm')) {
            this.trip();
            event.preventDefault?.();
            return true;
        }
        return false;
    };
    _boundErrorHandler = (e: ErrorEvent) => this._errorHandler(e);
    componentDidMount() {
        window.addEventListener('unhandledrejection', this._rejectionHandler);
        window.addEventListener('error', this._boundErrorHandler);
    }
    componentWillUnmount() {
        window.removeEventListener('unhandledrejection', this._rejectionHandler);
        window.removeEventListener('error', this._boundErrorHandler);
    }
}

type SkiaPreloadGlobal = {
    __SKIA_WASM_PROMISE__?: Promise<Uint8Array>;
    __SKIA_CANVASKIT_READY__?: Promise<unknown>;
};

export const SkiaWrapper = ({ children }: { children: React.ReactNode }) => {
    const [canvaskitReady, setCanvaskitReady] = React.useState(false);
    const [loadError, setLoadError] = React.useState(false);

    // Wait for preload to fetch WASM and init CanvasKit on the main thread so the module
    // is cached before any worklet can load it (avoids "both async and sync fetching failed").
    React.useEffect(() => {
        let cancelled = false;
        // The preload is the first thing the app imports, so in a browser it has always run.
        const ready = (globalThis as SkiaPreloadGlobal).__SKIA_CANVASKIT_READY__ ?? Promise.reject(new Error('The preload never ran'));
        ready
            .then(() => { if (!cancelled) setCanvaskitReady(true); })
            .catch((err) => {
                if (!cancelled) setLoadError(true);
                console.warn('Skia CanvasKit preload failed:', err);
            });
        return () => { cancelled = true; };
    }, []);

    if (typeof window === 'undefined') {
        return <>{children}</>;
    }

    if (loadError) {
        return <LoadFailed />;
    }

    if (!canvaskitReady) {
        return <LoadingFallback />;
    }

    try {
        // global.CanvasKit already set by preload; WithSkiaWeb/LoadSkiaWeb will use it
        const { WithSkiaWeb } = require('@shopify/react-native-skia/lib/module/web');
        return (
            <SkiaErrorBoundary>
                <WithSkiaWeb
                    opts={{ locateFile: getWasmUrl }}
                    getComponent={() => Promise.resolve({ default: () => <>{children}</> })}
                    fallback={<LoadingFallback />}
                />
            </SkiaErrorBoundary>
        );
    } catch {
        return <LoadFailed />;
    }
};
