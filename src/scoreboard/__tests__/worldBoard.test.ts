/**
 * The game's side of the world board, one board per difficulty: what it asks for, where the
 * last board seen is kept, and scores held back for lack of signal going to the right board.
 * Nothing here reaches a real server: fetch and the phone's storage are pretend ones.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scoreKeys } from '../../game/loop/useScoreTable';
import { BOARD_SIZE, WorldEntry } from '../rules';
import { Board, cacheKey, canEnterBoard, flushPending, isAvailable, loadBoard } from '../worldBoard';

const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: {
        getItem: jest.fn(async (key: string) => mockStore.get(key) ?? null),
        setItem: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
    },
}));

const PENDING = 'WORLD_PENDING_SEASON_1';
const entry = (initials: string, score = 100): WorldEntry => ({ initials, score, date: '', completed: false });

type Answer = { status?: number; body?: unknown } | Error;
const fetchMock = jest.fn<Promise<unknown>, [string, RequestInit?]>();
/** Every request gets this answer. */
const answer = (make: (url: string, init?: RequestInit) => Answer) => {
    fetchMock.mockImplementation(async (url, init) => {
        const a = make(url, init);
        if (a instanceof Error) throw a;
        const status = a.status ?? 200;
        return { ok: status < 400, status, json: async () => a.body };
    });
};
/** What each POST carried. */
const posted = () => fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'POST')
    .map(([, init]) => JSON.parse(String(init?.body)));

beforeEach(() => {
    mockStore.clear();
    fetchMock.mockReset();
    (AsyncStorage.setItem as jest.Mock).mockClear();
    (global as unknown as { fetch: unknown }).fetch = fetchMock;
});

describe('loading a board', () => {
    it('asks for that difficulty, and keeps it under that difficulty', async () => {
        answer(() => ({ body: { difficulty: 'hard', entries: [entry('HHH')] } }));
        const board = await loadBoard('hard');
        expect(fetchMock.mock.calls[0][0]).toContain('?difficulty=hard');
        expect(board).toEqual({ status: 'ok', entries: [entry('HHH')] });
        expect(JSON.parse(mockStore.get(cacheKey('hard'))!)).toEqual([entry('HHH')]);
        expect(mockStore.has(cacheKey('easy'))).toBe(false);
    });

    it('with no signal, each difficulty falls back on its own last board', async () => {
        mockStore.set(cacheKey('easy'), JSON.stringify([entry('EEE')]));
        mockStore.set(cacheKey('medium'), JSON.stringify([entry('MMM')]));
        answer(() => new Error('no signal'));
        expect(await loadBoard('easy')).toEqual({ status: 'offline', entries: [entry('EEE')] });
        expect(await loadBoard('medium')).toEqual({ status: 'offline', entries: [entry('MMM')] });
        expect(await loadBoard('hard')).toEqual({ status: 'offline', entries: [] });
    });

    it("Easy's last board stays where it has always been kept", () => {
        expect(cacheKey('easy')).toBe('WORLD_BOARD_SEASON_1');
        expect(new Set([cacheKey('easy'), cacheKey('medium'), cacheKey('hard')]).size).toBe(3);
    });

    it('a server from before difficulties only has an Easy board', async () => {
        answer(() => ({ body: { season: 1, entries: [entry('OLD')] } }));
        expect((await loadBoard('easy')).status).toBe('ok');
        expect(await loadBoard('hard')).toEqual({ status: 'off', entries: [] });
        expect(mockStore.has(cacheKey('hard'))).toBe(false);
    });

    it('no server, or a dev server handing back a page: no board', async () => {
        answer(() => ({ status: 503, body: { error: 'not set up' } }));
        expect((await loadBoard('medium')).status).toBe('off');
        answer(() => ({ body: null }));
        expect((await loadBoard('medium')).status).toBe('off');
    });
});

describe('scores held back for lack of signal', () => {
    const held = (initials: string, difficulty?: string) => ({ initials, score: 500, completed: false, difficulty });

    it('each goes to the board it was played on, and the boards come back separately', async () => {
        mockStore.set(PENDING, JSON.stringify([held('EEE', 'easy'), held('HHH', 'hard'), held('MMM', 'medium')]));
        answer((_url, init) => {
            const { initials, difficulty } = JSON.parse(String(init?.body));
            return { body: { rank: 0, difficulty, entries: [entry(initials)] } };
        });
        const boards = await flushPending();
        expect(posted().map((p) => [p.initials, p.difficulty])).toEqual([['EEE', 'easy'], ['HHH', 'hard'], ['MMM', 'medium']]);
        expect(boards).toEqual({ easy: [entry('EEE')], hard: [entry('HHH')], medium: [entry('MMM')] });
        expect(JSON.parse(mockStore.get(PENDING)!)).toEqual([]);
    });

    it('one held back from before there were difficulties is Easy', async () => {
        mockStore.set(PENDING, JSON.stringify([{ initials: 'OLD', score: 500, completed: false }]));
        answer(() => ({ body: { rank: 0, difficulty: 'easy', entries: [entry('OLD')] } }));
        expect(await flushPending()).toEqual({ easy: [entry('OLD')] });
        expect(posted()[0].difficulty).toBe('easy');
    });

    it('still no signal: they stay, still knowing their difficulty', async () => {
        mockStore.set(PENDING, JSON.stringify([held('HHH', 'hard'), held('OLD')]));
        answer(() => new Error('no signal'));
        expect(await flushPending()).toEqual({});
        expect(JSON.parse(mockStore.get(PENDING)!).map((p: { initials: string; difficulty: string }) => [p.initials, p.difficulty]))
            .toEqual([['HHH', 'hard'], ['OLD', 'easy']]);
    });

    it('nothing held back: nothing sent', async () => {
        expect(await flushPending()).toEqual({});
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe('being asked for initials', () => {
    const full = (score: number): Board => ({ status: 'ok', entries: Array.from({ length: BOARD_SIZE }, () => entry('AAA', score)) });
    const empty: Board = { status: 'ok', entries: [] };

    it("goes by that difficulty's board", () => {
        const boards = { easy: full(5000), hard: empty };
        expect(canEnterBoard(1000, boards.easy)).toBe(false);
        expect(canEnterBoard(1000, boards.hard)).toBe(true);
        expect(canEnterBoard(5001, boards.easy)).toBe(true);
    });

    it('not when that board is not there', () => {
        expect(canEnterBoard(1000, { status: 'off', entries: [] })).toBe(false);
        expect(canEnterBoard(1000, { status: 'loading', entries: [] })).toBe(false);
        expect(canEnterBoard(1000, { status: 'offline', entries: [] })).toBe(false);
        expect(isAvailable({ status: 'offline', entries: [entry('AAA')] })).toBe(true);
    });
});

describe('scores on the phone', () => {
    it('Easy keeps the keys from before there were difficulties; the others have their own', () => {
        expect(scoreKeys('easy')).toEqual({ highScore: 'HIGH_SCORE', table: 'SCORE_TABLE' });
        const all = (['easy', 'medium', 'hard'] as const).flatMap((d) => Object.values(scoreKeys(d)));
        expect(new Set(all).size).toBe(6);
    });
});
