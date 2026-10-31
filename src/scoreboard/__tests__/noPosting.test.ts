/**
 * The pace test build (step 12) must never send a score to the world board: previews share the
 * real one. Nothing gets past these guards, even a score already held back from before.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { flushPending, loadBoard, WORLD_SCORES_OPEN } from '../worldBoard';

jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: { getItem: jest.fn(async () => JSON.stringify([{ initials: 'AAA', score: 500, completed: false }])), setItem: jest.fn(async () => {}) },
}));

describe('scores on the test build', () => {
    const fetchMock = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ entries: [] }) }));
    beforeEach(() => {
        fetchMock.mockClear();
        (global as unknown as { fetch: unknown }).fetch = fetchMock;
    });

    it('are switched off', () => {
        expect(WORLD_SCORES_OPEN).toBe(false);
    });

    it('a score held back from before is not sent', async () => {
        expect(await flushPending()).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('the board can still be looked at, and that is only ever a plain read', async () => {
        await loadBoard();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(init.method).toBeUndefined();
    });
});
