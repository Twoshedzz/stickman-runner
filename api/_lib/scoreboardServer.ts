/**
 * The world scoreboard, server side: reading the top scores and adding a new one.
 *
 * Scores live in a Redis "sorted set", which keeps entries in score order for us. The
 * database is Upstash, added to the Vercel project from its Marketplace; it's reached over
 * plain HTTPS, so there's no extra package to install. The functions here take the database
 * as an argument so the tests can hand them a pretend one.
 *
 * (Folders starting with _ inside api/ are helpers, not web addresses of their own.)
 */
import { BOARD_SIZE, isValidInitials, isValidScore, SEASON, WorldEntry } from '../../src/scoreboard/rules';

/** Runs a batch of Redis commands and returns each one's result, in order. */
export type Redis = (commands: (string | number)[][]) => Promise<unknown[]>;

export const BOARD_KEY = `stickman:scores:season${SEASON}`;
/** Entries kept beyond the board, so a run that doesn't make the top 10 still learns its place. */
const KEEP = 100;
/** No one device (well, one internet address) sends more than this many scores in the window. */
const RATE_LIMIT = 10;
const RATE_WINDOW_SEC = 10 * 60;

/** What's stored per entry. Short keys, since every entry is a JSON string in the set. */
interface Stored {
    i: string;
    d: string;
    c: boolean;
    /** A random tag, so two identical entries are still two entries. */
    n: string;
}

/** Talk to Upstash over HTTPS: one request per batch of commands. */
export const upstash = (url: string, token: string): Redis => async (commands) => {
    const response = await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(commands),
    });
    if (!response.ok) throw new Error(`Database replied ${response.status}`);
    const results = (await response.json()) as { result?: unknown; error?: string }[];
    const failed = results.find((r) => r.error);
    if (failed) throw new Error(failed.error);
    return results.map((r) => r.result);
};

const toEntry = (member: string, score: string | number): WorldEntry | null => {
    try {
        const stored = JSON.parse(member) as Stored;
        return { initials: stored.i, score: Number(score), date: stored.d, completed: stored.c === true };
    } catch {
        return null;
    }
};

/** The top of the board, best first. */
export const readBoard = async (redis: Redis): Promise<WorldEntry[]> => {
    const [flat] = (await redis([['ZRANGE', BOARD_KEY, 0, BOARD_SIZE - 1, 'REV', 'WITHSCORES']])) as [string[]];
    const entries: WorldEntry[] = [];
    // Comes back as one flat list: member, score, member, score...
    for (let i = 0; i + 1 < (flat ?? []).length; i += 2) {
        const entry = toEntry(flat[i], flat[i + 1]);
        if (entry) entries.push(entry);
    }
    return entries;
};

export interface Reply {
    status: number;
    body: Record<string, unknown>;
}

/**
 * Add a score sent by the game. Turns away anything that isn't three letters and a possible
 * score, and anyone sending a great many. Replies with where it came (0 = top) and the board.
 */
export const submitScore = async (
    redis: Redis,
    body: unknown,
    address: string,
    now = new Date(),
    random: () => number = Math.random
): Promise<Reply> => {
    const { initials, score, completed } = (body ?? {}) as Record<string, unknown>;
    if (!isValidInitials(initials)) return { status: 400, body: { error: 'initials' } };
    if (!isValidScore(score)) return { status: 400, body: { error: 'score' } };

    const rateKey = `stickman:rate:${address}`;
    const [count] = (await redis([['INCR', rateKey]])) as [number];
    if (count === 1) await redis([['EXPIRE', rateKey, RATE_WINDOW_SEC]]);
    if (count > RATE_LIMIT) return { status: 429, body: { error: 'too many' } };

    const stored: Stored = {
        i: initials,
        d: now.toISOString(),
        c: completed === true,
        n: random().toString(36).slice(2, 8),
    };
    const member = JSON.stringify(stored);
    const [, , rank] = await redis([
        ['ZADD', BOARD_KEY, score, member],
        ['ZREMRANGEBYRANK', BOARD_KEY, 0, -(KEEP + 1)],
        ['ZREVRANK', BOARD_KEY, member],
    ]);
    return {
        status: 200,
        body: { rank: typeof rank === 'number' ? rank : null, entries: await readBoard(redis) },
    };
};

/** Who's sending, as far as we can tell: the address Vercel passes along. */
export const senderAddress = (forwardedFor: string | null) =>
    forwardedFor?.split(',')[0]?.trim() || 'unknown';
