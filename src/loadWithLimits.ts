/**
 * Limits on how long the game waits for something to load, so a dead connection can't leave it
 * on a loading screen for ever. The downloads are only given up on when nothing has arrived for
 * a while: a slow download on mobile data that's still coming is left to finish.
 */

/** How long a download can go with no new data before it counts as stalled. */
export const STALL_LIMIT_MS = 30000;

interface FetchOptions {
    stallMs?: number;
    init?: RequestInit;
    /** How much has arrived, 0 to just under 1, when the file's size is known. */
    onProgress?: (fraction: number) => void;
}

/** Downloads a file in pieces. Fails on a bad status, or when no data comes for `stallMs`. */
export const fetchWithStallLimit = async (uri: string, { stallMs = STALL_LIMIT_MS, init, onProgress }: FetchOptions = {}) => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let giveUp: (reason: Error) => void = () => {};
    const stalled = new Promise<never>((_, reject) => { giveUp = reject; });
    const restartClock = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            giveUp(new Error(`No data for ${stallMs}ms: ${uri}`));
            controller.abort();
        }, stallMs);
    };
    // Aborting should fail the wait by itself; the race covers a browser where a read ignores it.
    const orStall = <T,>(wait: Promise<T>) => Promise.race([wait, stalled]);

    restartClock();
    try {
        const response = await orStall(fetch(uri, { ...init, signal: controller.signal }));
        if (!response.ok) throw new Error(`Download failed: ${response.status}`);
        const type = response.headers.get('content-type');
        const chunks: Uint8Array<ArrayBuffer>[] = [];
        if (!response.body) {
            chunks.push(new Uint8Array(await orStall(response.arrayBuffer())));
            return { chunks, type };
        }
        const total = Number(response.headers.get('content-length')) || 0;
        const reader = response.body.getReader();
        let received = 0;
        for (;;) {
            const { done, value } = await orStall(reader.read());
            if (done) return { chunks, type };
            restartClock();
            chunks.push(value);
            received += value.length;
            if (total) onProgress?.(Math.min(0.99, received / total));
        }
    } finally {
        clearTimeout(timer);
    }
};

/** Fails if `wait` hasn't finished in time. For things that can't report how far along they are. */
export const withTimeout = async <T,>(wait: Promise<T>, ms: number): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const late = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Took longer than ${ms}ms`)), ms);
    });
    try {
        return await Promise.race([wait, late]);
    } finally {
        clearTimeout(timer);
    }
};

/** Tries `attempt`, and again after each delay in turn; the last failure is passed on. */
export const retry = async <T,>(attempt: () => Promise<T>, delaysMs: number[]): Promise<T> => {
    for (const delay of delaysMs) {
        try {
            return await attempt();
        } catch {
            await new Promise((r) => setTimeout(r, delay));
        }
    }
    return attempt();
};

/** The four bytes every .wasm file starts with: `\0asm`. */
export const isWasm = (bytes: Uint8Array) =>
    bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d;

/**
 * The first source that gives a real .wasm file. The check matters because the live site answers
 * an address it doesn't know with its home page and a 200 (see vercel.json), so "it downloaded"
 * doesn't mean "it's the file". Fails if none of them do.
 */
export const firstWasm = async (sources: string[], download: (source: string) => Promise<Uint8Array>) => {
    for (const source of sources) {
        try {
            const bytes = await download(source);
            if (isWasm(bytes)) return bytes;
            console.warn(`Not a wasm file: ${source}`);
        } catch (error) {
            console.warn(`Couldn't download ${source}:`, error);
        }
    }
    throw new Error('CanvasKit could not be downloaded');
};

/** The pieces of a download as one block of bytes. */
export const joinChunks = (chunks: Uint8Array[]) => {
    const joined = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0));
    let at = 0;
    for (const chunk of chunks) {
        joined.set(chunk, at);
        at += chunk.length;
    }
    return joined;
};
