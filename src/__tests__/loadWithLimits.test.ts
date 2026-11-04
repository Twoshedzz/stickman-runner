/** The limits on loading (loadWithLimits.ts): nothing can hang for ever, slow is left to finish. */
import { fetchWithStallLimit, firstWasm, isWasm, joinChunks, retry, withTimeout } from '../loadWithLimits';

const never = <T,>() => new Promise<T>(() => {});
const headers = (values: Record<string, string> = {}) => ({ get: (name: string) => values[name] ?? null });

/** A pretend response whose body hands out `reads` one at a time. */
const streaming = (reads: (() => Promise<{ done: boolean; value?: Uint8Array }>)[], size?: number) => ({
    ok: true,
    headers: headers(size ? { 'content-length': String(size) } : {}),
    body: { getReader: () => ({ read: () => reads.shift()!() }) },
});
const piece = (length: number) => () => Promise.resolve({ done: false, value: new Uint8Array(length) });
const end = () => Promise.resolve({ done: true });
/** A piece that takes `ms` to arrive. */
const slowPiece = (length: number, ms: number) => () =>
    new Promise<{ done: boolean; value: Uint8Array }>((r) => setTimeout(() => r({ done: false, value: new Uint8Array(length) }), ms));

describe('fetchWithStallLimit', () => {
    const realFetch = global.fetch;
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
        jest.useRealTimers();
        global.fetch = realFetch;
    });
    const fetchGives = (response: unknown) => {
        global.fetch = jest.fn(() => (response === 'never' ? never() : Promise.resolve(response))) as unknown as typeof fetch;
    };
    /** Whether the download has failed, once `ms` has gone by. */
    const failure = async (ms: number) => {
        let error: Error | null = null;
        const done = fetchWithStallLimit('/track.mp3', { stallMs: 1000 }).catch((e) => { error = e; });
        await jest.advanceTimersByTimeAsync(ms);
        return { failed: () => error, done };
    };

    it('collects the pieces and reports progress when the size is known', async () => {
        fetchGives(streaming([piece(25), piece(75), end], 100));
        const progress: number[] = [];
        const { chunks } = await fetchWithStallLimit('/track.mp3', { onProgress: (f) => progress.push(f) });
        expect(chunks.map((c) => c.length)).toEqual([25, 75]);
        expect(progress).toEqual([0.25, 0.99]);
    });

    it('fails on a bad status', async () => {
        fetchGives({ ok: false, status: 404, headers: headers() });
        await expect(fetchWithStallLimit('/track.mp3')).rejects.toThrow('404');
    });

    it('gives up when the server never answers', async () => {
        fetchGives('never');
        const { failed } = await failure(999);
        expect(failed()).toBeNull();
        await jest.advanceTimersByTimeAsync(1);
        expect(failed()).toEqual(expect.objectContaining({ message: expect.stringContaining('No data') }));
    });

    it('gives up when the data stops part-way', async () => {
        fetchGives(streaming([piece(10), never]));
        const { failed } = await failure(1000);
        expect(failed()).not.toBeNull();
    });

    it('leaves a slow download alone while data keeps coming, however long it takes', async () => {
        const reads = Array.from({ length: 20 }, () => slowPiece(1, 900));
        fetchGives(streaming([...reads, end]));
        const download = fetchWithStallLimit('/track.mp3', { stallMs: 1000 });
        await jest.advanceTimersByTimeAsync(20 * 900);
        expect((await download).chunks).toHaveLength(20);
    });

    it('also limits a response with no readable body', async () => {
        fetchGives({ ok: true, headers: headers(), body: null, arrayBuffer: never });
        const { failed } = await failure(1000);
        expect(failed()).not.toBeNull();
    });

    it('leaves no timer running once finished', async () => {
        fetchGives(streaming([piece(1), end]));
        await fetchWithStallLimit('/track.mp3');
        expect(jest.getTimerCount()).toBe(0);
    });
});

describe('withTimeout', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('passes on an answer that comes in time', async () => {
        await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok');
        expect(jest.getTimerCount()).toBe(0);
    });

    it('fails when the answer is late', async () => {
        const result = withTimeout(never(), 1000).catch((e: Error) => e.message);
        await jest.advanceTimersByTimeAsync(1000);
        expect(await result).toContain('longer than');
    });
});

describe('retry', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('tries again after each delay, and stops at the first success', async () => {
        const attempt = jest.fn()
            .mockRejectedValueOnce(new Error('one'))
            .mockResolvedValueOnce('two');
        const result = retry(attempt, [1000, 3000]);
        await jest.advanceTimersByTimeAsync(1000);
        expect(await result).toBe('two');
        expect(attempt).toHaveBeenCalledTimes(2);
    });

    it('passes on the last failure once the tries run out', async () => {
        const attempt = jest.fn().mockRejectedValue(new Error('down'));
        const result = retry(attempt, [1000, 3000]).catch((e: Error) => e.message);
        await jest.advanceTimersByTimeAsync(4000);
        expect(await result).toBe('down');
        expect(attempt).toHaveBeenCalledTimes(3);
    });
});

describe('picking the wasm source', () => {
    const wasm = Uint8Array.from([0x00, 0x61, 0x73, 0x6d, 1, 0, 0, 0]);
    const homePage = new TextEncoder().encode('<!DOCTYPE html><html></html>');

    beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
    afterEach(() => jest.restoreAllMocks());

    it('knows a wasm file from a web page', () => {
        expect(isWasm(wasm)).toBe(true);
        expect(isWasm(homePage)).toBe(false);
        expect(isWasm(new Uint8Array())).toBe(false);
    });

    it("uses the game's own site when that works, and asks nowhere else", async () => {
        const download = jest.fn(async () => wasm);
        await expect(firstWasm(['/own', 'https://cdn'], download)).resolves.toBe(wasm);
        expect(download.mock.calls).toEqual([['/own']]);
    });

    it('moves on when the site answers with its home page (the rewrite in vercel.json)', async () => {
        const download = jest.fn(async (source: string) => (source === '/own' ? homePage : wasm));
        await expect(firstWasm(['/own', 'https://cdn'], download)).resolves.toBe(wasm);
    });

    it('moves on when a source fails or stalls', async () => {
        const download = jest.fn(async (source: string) => {
            if (source === '/own') throw new Error('No data');
            return wasm;
        });
        await expect(firstWasm(['/own', 'https://cdn'], download)).resolves.toBe(wasm);
    });

    it('fails, rather than waiting, when no source gives the file', async () => {
        await expect(firstWasm(['/own', 'https://cdn'], async () => homePage)).rejects.toThrow('could not be downloaded');
    });

    it('joins the pieces of a download back together', () => {
        const pieces = [wasm.slice(0, 3), wasm.slice(3)];
        expect(joinChunks(pieces)).toEqual(wasm);
    });
});
