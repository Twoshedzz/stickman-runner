/**
 * The pretend player: plays whole stages of the real game the way a person would, so we can
 * measure how hard each stage is instead of guessing.
 *
 * It runs the real game code (physics, collisions, the live spawner, hearts, the energy bar)
 * frame by frame, through the game loop's own step (step.ts). For each obstacle (or tight group, like
 * two blocks one jump clears) it:
 *   1. works out the window of moments it could jump, duck or double jump and get past, by
 *      trying every one of them on a copy of the game;
 *   2. aims for the middle of that window, then misses by a random, human-sized amount;
 *   3. now and then doesn't react at all (looking away, a fumbled tap).
 * How big those mistakes are is its skill level. Nothing here changes the game.
 *
 * Run the full report with `npm run difficulty` (see difficulty.report.test.ts).
 */
import { DUCK_DURATION_SEC, PLAYER_SIZE, PLAYER_X } from '../constants';
import { moveFor, ObstacleRole, shapeFor } from '../obstacleCatalogue';
import { speedAt, StageConfig } from '../stages';
import { createInitialState, GameState } from '../state';
import { stepWorld } from '../step';
import { jump, releaseDuck, startDuck } from '../systems/physics';
import { resetSpawner } from '../systems/spawn';

export interface Skill {
    name: string;
    /** How far off a press lands, as a standard deviation in seconds. */
    timingSdSec: number;
    /** The chance of not reacting to an obstacle at all. */
    slipChance: number;
}

export const SKILLS: Skill[] = [
    { name: 'steady', timingSdSec: 0.04, slipChance: 0.01 },
    { name: 'average', timingSdSec: 0.07, slipChance: 0.03 },
    { name: 'beginner', timingSdSec: 0.11, slipChance: 0.06 },
];

export interface RunResult {
    /** Seconds played: the whole stage, unless the run ended early. */
    seconds: number;
    survived: boolean;
    hits: number;
    damage: number;
    healed: number;
    /** What hit the runner, by role. */
    hitsBy: Partial<Record<ObstacleRole, number>>;
    /** Obstacles with no way past at all from where the player was (energy, say). */
    noWayThrough: number;
    /** How long the timing window was for each move, in seconds, by the role it was for. */
    windows: Partial<Record<ObstacleRole, number[]>>;
    obstacles: number;
    /** Obstacles met, by kind. */
    obstaclesBy: Partial<Record<ObstacleRole, number>>;
    score: number;
    /**
     * The breathers: seconds between one moment the player has to act and the next, from
     * the obstacles as they were placed (see restsBetween). Only within the time played.
     */
    rests: number[];
    /** Share of the time played spent jumping or ducking for something. */
    busyShare: number;
    /** Voids met (the gap across the floor). */
    voids: number;
    /** Diamonds that reached the runner while playing, and how many of them were collected. */
    pickupsPlaced: number;
    pickupsCollected: number;
    /** The longest stretch, in seconds, with no diamond coming past. */
    longestWithoutPickupSec: number;
}

const DT = 1 / 60;
/** How far ahead an obstacle is noticed and its move planned, in seconds. */
const LOOK_AHEAD_SEC = 1.1;
/** Obstacles arriving this close behind the first are taken in the same move. */
const GROUP_SEC = 0.3;
/** Second-tap delays (in frames) tried for a double jump. */
const DOUBLE_DELAYS = [8, 12, 16, 20, 24];
/** Where the runner's middle is: obstacles and diamonds "arrive" when they reach it. */
const RUNNER_MID_X = PLAYER_X + PLAYER_SIZE / 2;
/**
 * Half of how long each move keeps the player busy, centred on the obstacle: a jump is in the
 * air 0.67 sec, a duck lasts 0.55 sec, and a double jump about 1.2 sec.
 */
const BUSY_HALF_SEC: Record<'jump' | 'duck' | 'double', number> = {
    jump: 40 / 60 / 2,
    duck: DUCK_DURATION_SEC / 2,
    double: 0.6,
};

/** An obstacle as the player meets it: when its middle reaches the runner, and what it asks. */
interface Arrival { sec: number; role: ObstacleRole; speed: number }

/**
 * The gaps between one moment the player must act and the next. Each obstacle keeps the
 * player busy for the time its move takes (or while it passes, if that's longer), centred
 * on it; overlapping moves run together. What's left in between are the rests.
 */
export const restsBetween = (arrivals: Arrival[], untilSec: number) => {
    const spans = arrivals
        .filter((a) => a.sec <= untilSec && moveFor(a.role) !== 'collect')
        .map((a) => {
            const move = moveFor(a.role) as keyof typeof BUSY_HALF_SEC;
            const half = Math.max(BUSY_HALF_SEC[move], (shapeFor(a.role).width + PLAYER_SIZE) / (2 * a.speed));
            return { start: a.sec - half, end: a.sec + half };
        })
        .sort((a, b) => a.start - b.start);
    const rests: number[] = [];
    let busy = 0;
    let current: { start: number; end: number } | null = null;
    for (const span of spans) {
        if (current && span.start <= current.end) {
            current.end = Math.max(current.end, span.end);
            continue;
        }
        if (current) {
            busy += current.end - current.start;
            rests.push(span.start - current.end);
        }
        current = { ...span };
    }
    if (current) busy += current.end - current.start;
    return { rests, busySec: busy };
};

/** The longest gap between one diamond reaching the runner and the next. */
const longestGap = (secs: number[]) => {
    const sorted = [...secs].sort((a, b) => a - b);
    let longest = 0;
    for (let i = 1; i < sorted.length; i++) longest = Math.max(longest, sorted[i] - sorted[i - 1]);
    return longest;
};

interface Sim {
    state: GameState;
    stage: StageConfig;
    frame: number;
    /** The spawner's random numbers: kept in the sim, so a copy replays the same future. */
    seed: number;
}

type Move = { kind: 'jump' | 'duck' | 'double'; at: number; delay?: number };

const stageFrames = (stage: StageConfig) => Math.round(stage.durationSec * 60);

const spawnerRandom = (sim: Sim) => () => {
    sim.seed = (sim.seed * 1664525 + 1013904223) % 4294967296;
    return sim.seed / 4294967296;
};

const copy = (sim: Sim): Sim => ({ ...sim, state: JSON.parse(JSON.stringify(sim.state)) });

/** One frame, the game loop's own step (step.ts) on a frame-counted clock. True if the runner was hit. */
const step = (sim: Sim): boolean => {
    const { state, stage } = sim;
    sim.frame++;
    state.elapsedSecInStage = sim.frame / 60;
    state.stageProgress = Math.min(sim.frame / stageFrames(stage), 1);
    state.distance = state.stageProgress * stage.courseLength;
    state.speed = speedAt(stage, state.stageProgress);
    return stepWorld(state, stage, DT, { random: spawnerRandom(sim), sparks: false });
};

const isHazard = (o: GameState['obstacles'][number]) =>
    !shapeFor(o.role).heals && !o.passed && o.x + shapeFor(o.role).width > PLAYER_X;

/** The next thing to get past: the nearest hazard and anything arriving right behind it. */
const nextGroup = (state: GameState) => {
    const ahead = state.obstacles.filter(isHazard).sort((a, b) => a.x - b.x);
    if (ahead.length === 0) return null;
    const first = ahead[0];
    const group = ahead.filter((o) => (o.x - first.x) / state.speed <= GROUP_SEC);
    return { first, ids: group.map((o) => o.id) };
};

const groupPassed = (state: GameState, ids: number[]) =>
    ids.every((id) => {
        const o = state.obstacles.find((x) => x.id === id);
        return !o || o.passed;
    });

/** Play a move from here until the group has gone by. False if anything hit. */
const tryMove = (sim: Sim, move: Move, ids: number[]): boolean => {
    for (let f = 0; f < 400; f++) {
        if (sim.frame === move.at) {
            if (move.kind === 'duck') startDuck(sim.state, true);
            else jump(sim.state);
        }
        if (move.kind === 'double' && sim.frame === move.at + (move.delay ?? 0)) jump(sim.state);
        if (move.kind === 'duck' && sim.frame > move.at && groupPassed(sim.state, ids)) releaseDuck(sim.state);
        if (step(sim)) return false;
        if (sim.frame > move.at + (move.delay ?? 0) && groupPassed(sim.state, ids)) return true;
    }
    return false;
};

/** The widest run of moments this move gets past the group from here, or null if none does. */
const findWindow = (sim: Sim, kind: Move['kind'], ids: number[], delay?: number) => {
    const first = sim.state.obstacles.find((o) => o.id === ids[0])!;
    const framesToArrive = Math.ceil(((first.x - PLAYER_X) / sim.state.speed) * 60);
    const last = Math.max(1, Math.min(90, framesToArrive + 12));
    let best: { start: number; end: number } | null = null;
    let runStart = -1;
    for (let k = 0; k <= last + 1; k++) {
        const ok = k <= last && tryMove(copy(sim), { kind, at: sim.frame + k, delay }, ids);
        if (ok && runStart < 0) runStart = k;
        if (!ok && runStart >= 0) {
            if (!best || k - 1 - runStart > best.end - best.start) best = { start: runStart, end: k - 1 };
            runStart = -1;
        }
    }
    return best && { start: sim.frame + best.start, end: sim.frame + best.end };
};

/** Normal-shaped random numbers, from the player's own dice (not the spawner's). */
const gaussian = (random: () => number) => {
    const u = Math.max(1e-9, random());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
};

/** Choose a move for the group ahead: the middle of its window, missed by a human amount. */
const plan = (
    sim: Sim, ids: number[], skill: Skill, random: () => number, windows: RunResult['windows']
): Move | 'none' | 'no way' => {
    const slipped = random() < skill.slipChance;
    const role = sim.state.obstacles.find((o) => o.id === ids[0])?.role ?? 'small';
    const clearBy = moveFor(role);
    // Only hazards are planned for, never a heart; a plain jump keeps the types happy.
    const kind = clearBy === 'collect' ? 'jump' : clearBy;
    let window: { start: number; end: number } | null = null;
    let delay: number | undefined;
    for (const d of kind === 'double' ? DOUBLE_DELAYS : [undefined]) {
        const w = findWindow(sim, kind, ids, d);
        if (w && (!window || w.end - w.start > window.end - window.start)) {
            window = w;
            delay = d;
        }
    }
    if (!window) return 'no way';
    (windows[role] ??= []).push((window.end - window.start + 1) / 60);
    if (slipped) return 'none';
    const aim = (window.start + window.end) / 2 + gaussian(random) * skill.timingSdSec * 60;
    return { kind, at: Math.max(sim.frame, Math.round(aim)), delay };
};

/** Play one stage from full health. `seed` sets both the obstacles and the player's mistakes. */
export const playStage = (stage: StageConfig, skill: Skill, seed: number): RunResult => {
    const state = createInitialState();
    state.gameStarted = true;
    state.stageId = stage.id;
    resetSpawner(state);
    const sim: Sim = { state, stage, frame: 0, seed };
    let dice = seed * 7919 + 17;
    const random = () => {
        dice = (dice * 1664525 + 1013904223) % 4294967296;
        return dice / 4294967296;
    };

    const result: RunResult = {
        seconds: 0, survived: true, hits: 0, damage: 0, healed: 0, hitsBy: {}, noWayThrough: 0, windows: {}, obstacles: 0, obstaclesBy: {}, score: 0,
        rests: [], busyShare: 0, voids: 0, pickupsPlaced: 0, pickupsCollected: 0, longestWithoutPickupSec: 0,
    };
    const seen = new Set<number>();
    const arrivals: Arrival[] = [];
    const seenPickups = new Set<number>();
    const pickupSecs: number[] = [];
    let collected = 0;
    let current: { ids: number[]; move: Move | null } | null = null;

    for (let f = 0; f < stageFrames(stage); f++) {
        const s = sim.state;
        const nowSec = sim.frame / 60;
        for (const o of s.obstacles) {
            if (seen.has(o.id)) continue;
            seen.add(o.id);
            const role = o.role ?? 'small';
            arrivals.push({ sec: nowSec + (o.x + shapeFor(role).width / 2 - RUNNER_MID_X) / s.speed, role, speed: s.speed });
            if (shapeFor(role).heals) continue;
            result.obstacles++;
            result.obstaclesBy[role] = (result.obstaclesBy[role] ?? 0) + 1;
            if (role === 'void') result.voids++;
        }
        for (const p of s.pickups) {
            if (seenPickups.has(p.id)) continue;
            seenPickups.add(p.id);
            pickupSecs.push(nowSec + (p.x - RUNNER_MID_X) / s.speed);
        }
        // Where each diamond is before the frame: one gone from near the runner was collected.
        const pickupX = new Map(s.pickups.map((p) => [p.id, p.x]));

        if (current && groupPassed(s, current.ids)) {
            if (current.move?.kind === 'duck') releaseDuck(s);
            current = null;
        }
        if (!current && s.player.falling <= 0) {
            const group = nextGroup(s);
            if (group && group.first.x - PLAYER_X <= LOOK_AHEAD_SEC * s.speed) {
                const move = plan(sim, group.ids, skill, random, result.windows);
                if (move === 'no way') result.noWayThrough++;
                current = { ids: group.ids, move: typeof move === 'object' ? move : null };
            }
        }
        const move = current?.move;
        if (move) {
            if (sim.frame === move.at) {
                if (move.kind === 'duck') startDuck(s, true);
                else jump(s);
            }
            if (move.kind === 'double' && sim.frame === move.at + (move.delay ?? 0)) jump(s);
        }

        const nearest = s.obstacles.filter(isHazard).sort((a, b) => a.x - b.x)[0]?.role;
        const before = s.player.health;
        const hit = step(sim);
        const left = new Set(sim.state.pickups.map((p) => p.id));
        for (const [id, x] of pickupX) if (!left.has(id) && x > 0) collected++;
        const after = sim.state.player.health;
        if (after > before) result.healed += after - before;
        if (hit) {
            result.hits++;
            result.damage += Math.max(0, before - after);
            const role = nearest ?? 'small';
            result.hitsBy[role] = (result.hitsBy[role] ?? 0) + 1;
            // Recover and plan afresh from wherever things are now.
            if (current?.move?.kind === 'duck') releaseDuck(sim.state);
            current = null;
        }
        if (sim.state.gameOver) {
            result.survived = false;
            break;
        }
    }
    result.seconds = sim.frame / 60;
    result.score = sim.state.score;
    const { rests, busySec } = restsBetween(arrivals, result.seconds);
    result.rests = rests;
    result.busyShare = busySec / result.seconds;
    const reached = pickupSecs.filter((sec) => sec <= result.seconds);
    result.pickupsPlaced = reached.length;
    result.pickupsCollected = collected;
    result.longestWithoutPickupSec = longestGap(reached);
    return result;
};
