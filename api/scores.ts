/**
 * The world scoreboard's web address: /api/scores on the game's site.
 *
 *   GET  -> { season, entries }   the top 10, best first
 *   POST { initials, score, completed } -> { rank, entries }
 *
 * Vercel runs this as a small server function next to the static site. It needs the
 * Upstash database connected to the Vercel project (docs/PROJECT_PLAN.md §6, "World
 * scoreboard"); until then it answers 503 and the game quietly leaves the world board out.
 */
import { SEASON } from '../src/scoreboard/rules';
import { readBoard, senderAddress, submitScore, upstash } from './_lib/scoreboardServer';

const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });

/**
 * A database setting by name. Connecting Upstash on Vercel can add a prefix of your choosing
 * (STICKMAN_KV_REST_API_URL, say), so any prefix is accepted; the plain name comes first.
 */
const setting = (...names: string[]) => {
    for (const name of names) {
        const key = name in process.env
            ? name
            : Object.keys(process.env).find((k) => k.endsWith(`_${name}`));
        if (key && process.env[key]) return process.env[key];
    }
    return undefined;
};

/** The database, if it's been connected. Upstash's Vercel integration sets one of these pairs. */
const connect = () => {
    const url = setting('KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL');
    const token = setting('KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN');
    return url && token ? upstash(url, token) : null;
};

export async function GET() {
    const redis = connect();
    if (!redis) return reply(503, { error: 'not set up' });
    try {
        return reply(200, { season: SEASON, entries: await readBoard(redis) });
    } catch (error) {
        console.error(error);
        return reply(502, { error: 'database' });
    }
}

export async function POST(request: Request) {
    const redis = connect();
    if (!redis) return reply(503, { error: 'not set up' });
    const body = await request.json().catch(() => null);
    try {
        const result = await submitScore(redis, body, senderAddress(request.headers.get('x-forwarded-for')));
        return reply(result.status, result.body);
    } catch (error) {
        console.error(error);
        return reply(502, { error: 'database' });
    }
}
