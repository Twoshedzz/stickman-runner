/**
 * The pretend player: plays whole stages of the real game the way a person would, so we can
 * measure how hard each stage is instead of guessing.
 *
 * It runs the real game code (physics, collisions, the live spawner, hearts, the energy bar)
 * frame by frame, in the same order as the game loop. For each obstacle (or tight group, like
 * two blocks one jump clears) it:
 *   1. works out the window of moments it could jump, duck or double jump and get past, by
 *      trying every one of them on a copy of the game;
 *   2. aims for the middle of that window, then misses by a random, human-sized amount;
 *   3. now and then doesn't react at all (looking away, a fumbled tap).
 * How big those mistakes are is its skill level. Nothing here changes the game.
 *
 * Run the full report with `npm run difficulty` (see difficulty.report.test.ts).
 */
import { PLAYER_X } from '../constants';
import { ObstacleRole, shapeFor } from '../obstacleCatalogue';
import { collectPickups } from '../pickups';
import { speedAt, StageConfig } from '../stages';
import { createInitialState, GameState } from '../state';
import { checkCollisions } from '../systems/collisions';
import { applyPhysics, jump, releaseDuck, startDuck } from '../systems/physics';
import { resetSpawner, spawnObstacle } from '../systems/spawn';

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
    score: number;
}

const DT = 1 / 60;
/** How far ahead an obstacle is noticed and its move planned, in seconds. */
const LOOK_AHEAD_SEC = 1.1;
/** Obstacles arriving this close behind the first are taken in the same move. */
const GROUP_SEC = 0.3;
/** Second-tap delays (in frames) tried for a double jump. */
const DOUBLE_DELAYS = [8, 12, 16, 20, 24];

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

/** One frame, in the game loop's order. True if the runner was hit. */
const step = (sim: Sim): boolean => {
    const { state, stage } = sim;
    sim.frame++;
    state.elapsedSecInStage = sim.frame / 60;
    state.stageProgress = Math.min(sim.frame / stageFrames(stage), 1);
    state.distance = state.stageProgress * stage.courseLength;
    state.speed = speedAt(stage, state.stageProgress);
    state.scroll += state.speed / 60;
    applyPhysics(state, DT);
    if (state.distance < stage.courseLength - 1000) spawnObstacle(state, stage, DT, spawnerRandom(sim));
    // Sparks don't change anything, and copying them every frame is slow.
    state.particles = [];
    const hit = checkCollisions(state);
    collectPickups(state);
    return hit;
};

const isHazard = (o: GameState['obstacles'][number]) =>
    o.role !== 'heart' && !o.passed && o.x + shapeFor(o.role).width > PLAYER_X;

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

const kindFor = (role: ObstacleRole | undefined): Move['kind'] =>
    role === 'overhead' ? 'duck' : role === 'huge' ? 'double' : 'jump';

/** Choose a move for the group ahead: the middle of its window, missed by a human amount. */
const plan = (
    sim: Sim, ids: number[], skill: Skill, random: () => number, windows: RunResult['windows']
): Move | 'none' | 'no way' => {
    const slipped = random() < skill.slipChance;
    const role = sim.state.obstacles.find((o) => o.id === ids[0])?.role ?? 'small';
    const kind = kindFor(role);
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
        seconds: 0, survived: true, hits: 0, damage: 0, healed: 0, hitsBy: {}, noWayThrough: 0, windows: {}, obstacles: 0, score: 0,
    };
    const seen = new Set<number>();
    let current: { ids: number[]; move: Move | null } | null = null;

    for (let f = 0; f < stageFrames(stage); f++) {
        const s = sim.state;
        for (const o of s.obstacles) {
            if (o.role !== 'heart' && !seen.has(o.id)) { seen.add(o.id); result.obstacles++; }
        }

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
    return result;
};
