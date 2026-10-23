/**
 * The world scoreboard's server logic, against a pretend Redis that keeps everything in
 * memory and understands just the commands the server uses.
 */
import { BOARD_SIZE, MAX_SCORE } from '../../../src/scoreboard/rules';
import { BOARD_KEY, readBoard, Redis, senderAddress, submitScore } from '../scoreboardServer';

/** Just enough of Redis: sorted sets and counters. */
const fakeRedis = () => {
    const sets = new Map<string, Map<string, number>>();
    const counters = new Map<string, number>();
    /** Lowest first, ties by member, as Redis orders them. */
    const ordered = (key: string) =>
        [...(sets.get(key) ?? new Map()).entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
    /** Redis ranges: inclusive, negative counts from the end, and nothing if it ends before it starts. */
    const slice = <T,>(list: T[], start: number, stop: number) => {
        const from = Math.max(0, start < 0 ? list.length + start : start);
        const to = stop < 0 ? list.length + stop : stop;
        return to < from ? [] : list.slice(from, to + 1);
    };

    const redis: Redis = async (commands) =>
        commands.map(([name, key, ...args]) => {
            const k = String(key);
            switch (name) {
                case 'INCR': {
                    const n = (counters.get(k) ?? 0) + 1;
                    counters.set(k, n);
                    return n;
                }
                case 'EXPIRE':
                    return 1;
                case 'ZADD': {
                    if (!sets.has(k)) sets.set(k, new Map());
                    sets.get(k)!.set(String(args[1]), Number(args[0]));
                    return 1;
                }
                case 'ZREMRANGEBYRANK': {
                    const gone = slice(ordered(k), Number(args[0]), Number(args[1]));
                    gone.forEach(([member]) => sets.get(k)!.delete(member));
                    return gone.length;
                }
                case 'ZREVRANK': {
                    const index = ordered(k).reverse().findIndex(([member]) => member === String(args[0]));
                    return index < 0 ? null : index;
                }
                case 'ZRANGE': {
                    // Only the form the server uses: start stop REV WITHSCORES
                    const list = slice(ordered(k).reverse(), Number(args[0]), Number(args[1]));
                    return list.flatMap(([member, score]) => [member, String(score)]);
                }
                default:
                    throw new Error(`fake Redis doesn't know ${name}`);
            }
        });
    return { redis, sets, counters };
};

const send = (redis: Redis, body: unknown, address = '1.2.3.4') =>
    submitScore(redis, body, address, new Date('2026-10-24T12:00:00Z'));

describe('sending a score', () => {
    it('goes on the board, best first, and says where it came', async () => {
        const { redis } = fakeRedis();
        await send(redis, { initials: 'AAA', score: 500 });
        await send(redis, { initials: 'BBB', score: 900, completed: true });
        const reply = await send(redis, { initials: 'CCC', score: 700 });
        expect(reply.status).toBe(200);
        expect(reply.body.rank).toBe(1);
        const board = await readBoard(redis);
        expect(board.map((e) => [e.initials, e.score, e.completed])).toEqual([
            ['BBB', 900, true],
            ['CCC', 700, false],
            ['AAA', 500, false],
        ]);
        expect(board[0].date).toBe('2026-10-24T12:00:00.000Z');
    });

    it('the same initials and score twice are two entries', async () => {
        const { redis } = fakeRedis();
        await send(redis, { initials: 'AAA', score: 500 });
        await send(redis, { initials: 'AAA', score: 500 });
        expect(await readBoard(redis)).toHaveLength(2);
    });

    it('turns away bad initials and impossible scores', async () => {
        const { redis, sets } = fakeRedis();
        for (const body of [
            { initials: 'AB', score: 100 },
            { initials: 'abc', score: 100 },
            { initials: 'ASS', score: 100 },
            { initials: 'ABC', score: 0 },
            { initials: 'ABC', score: MAX_SCORE + 1 },
            { initials: 'ABC', score: '100' },
            null,
            'nonsense',
        ]) {
            expect((await send(redis, body)).status).toBe(400);
        }
        expect(sets.size).toBe(0);
    });

    it('turns away a flood from one address, but not from others', async () => {
        const { redis } = fakeRedis();
        const statuses = [];
        for (let i = 0; i < 12; i++) statuses.push((await send(redis, { initials: 'AAA', score: 10 + i })).status);
        expect(statuses.filter((s) => s === 200)).toHaveLength(10);
        expect(statuses.slice(-2)).toEqual([429, 429]);
        expect((await send(redis, { initials: 'BBB', score: 5 }, '5.6.7.8')).status).toBe(200);
    });

    it('keeps the best hundred, and the board shows the top ten', async () => {
        const { redis, sets } = fakeRedis();
        for (let i = 1; i <= 105; i++) {
            await send(redis, { initials: 'AAA', score: i }, `address ${i}`);
        }
        expect(sets.get(BOARD_KEY)!.size).toBe(100);
        const board = await readBoard(redis);
        expect(board).toHaveLength(BOARD_SIZE);
        expect(board[0].score).toBe(105);
        // A score below everything kept is trimmed straight off: no place to report.
        const low = await send(redis, { initials: 'ZZZ', score: 1 }, 'late');
        expect(low.body.rank).toBeNull();
    });
});

describe('who sent it', () => {
    it('the first address Vercel passes along', () => {
        expect(senderAddress('9.9.9.9, 10.0.0.1')).toBe('9.9.9.9');
        expect(senderAddress(null)).toBe('unknown');
    });
});
