import React from 'react';

// Must match @shopify/react-native-skia's canvaskit-wasm dependency
const CANVASKIT_VERSION = '0.40.0';

const WASM_URL = `https://unpkg.com/canvaskit-wasm@${CANVASKIT_VERSION}/bin/full/canvaskit.wasm`;

function getWasmUrl(file: string): string {
    if (typeof window === 'undefined') return file;
    return `https://unpkg.com/canvaskit-wasm@${CANVASKIT_VERSION}/bin/full/${file}`;
}

function SkiaFallback() {
    return (
        <div style={{ padding: 24, color: '#fff', background: '#111', minHeight: '100vh', fontFamily: 'system-ui' }}>
            <p style={{ marginBottom: 8 }}>Skia failed to load (CanvasKit WASM).</p>
            <p style={{ opacity: 0.8, fontSize: 14 }}>Use Expo Go on a device for the best experience, or refresh the page.</p>
        </div>
    );
}

const LoadingFallback = () => (
    <div style={{ padding: 20, color: '#fff', background: '#222' }}>Loading Skia…</div>
);

class SkiaErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    state = { hasError: false };
    static getDerivedStateFromError = () => ({ hasError: true });
    _rejectionHandler = (e: PromiseRejectionEvent) => {
        const msg = e?.reason?.message ?? String(e?.reason ?? '');
        if (msg.includes('Aborted') || msg.includes('wasm')) {
            this.setState({ hasError: true });
            e.preventDefault?.();
        }
    };
    _errorHandler = (event: ErrorEvent) => {
        const msg = event.message ?? String(event.error ?? '');
        if (msg.includes('Aborted') || msg.includes('wasm')) {
            this.setState({ hasError: true });
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
    render() {
        if (this.state.hasError) return <SkiaFallback />;
        return this.props.children;
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
        const ready = typeof globalThis !== 'undefined' && (globalThis as SkiaPreloadGlobal).__SKIA_CANVASKIT_READY__;
        if (!ready) {
            // Preload not run (e.g. SSR); fetch and init ourselves
            fetch(WASM_URL, { credentials: 'omit' })
                .then((r) => {
                    if (!r.ok) throw new Error(`WASM fetch failed: ${r.status}`);
                    return r.arrayBuffer();
                })
                .then((ab) => import('canvaskit-wasm/bin/full/canvaskit').then((m) => m.default({ wasmBinary: new Uint8Array(ab) })))
                .then((ck) => {
                    if (!cancelled) {
                        (globalThis as unknown as { CanvasKit?: unknown }).CanvasKit = ck;
                        setCanvaskitReady(true);
                    }
                })
                .catch((err) => {
                    if (!cancelled) setLoadError(true);
                    console.warn('Skia WASM fetch/init failed:', err);
                });
            return () => { cancelled = true; };
        }
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
        return <SkiaFallback />;
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
    } catch (e) {
        return (
            <div style={{ padding: 24, color: '#fff', background: '#111' }}>
                Skia failed to load. Use Expo Go on a device or refresh.
            </div>
        );
    }
};
