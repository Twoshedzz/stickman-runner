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
    componentDidMount() {
        window.addEventListener('unhandledrejection', this._rejectionHandler);
    }
    componentWillUnmount() {
        window.removeEventListener('unhandledrejection', this._rejectionHandler);
    }
    render() {
        if (this.state.hasError) return <SkiaFallback />;
        return this.props.children;
    }
}

export const SkiaWrapper = ({ children }: { children: React.ReactNode }) => {
    const [wasmBinary, setWasmBinary] = React.useState<ArrayBuffer | null>(null);
    const [loadError, setLoadError] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        fetch(WASM_URL, { credentials: 'omit' })
            .then((r) => {
                if (!r.ok) throw new Error(`WASM fetch failed: ${r.status}`);
                return r.arrayBuffer();
            })
            .then((buf) => {
                if (!cancelled) setWasmBinary(buf);
            })
            .catch((err) => {
                if (!cancelled) setLoadError(true);
                console.warn('Skia WASM preload failed:', err);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (typeof window === 'undefined') {
        return <>{children}</>;
    }

    if (loadError) {
        return <SkiaFallback />;
    }

    if (wasmBinary === null) {
        return <LoadingFallback />;
    }

    try {
        // @ts-ignore - CanvasKit accepts wasmBinary at runtime
        const { WithSkiaWeb } = require('@shopify/react-native-skia/lib/module/web');
        const opts = React.useMemo(
            () => ({
                locateFile: getWasmUrl,
                wasmBinary: new Uint8Array(wasmBinary),
            }),
            [wasmBinary]
        );
        return (
            <SkiaErrorBoundary>
                <WithSkiaWeb
                    opts={opts}
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
