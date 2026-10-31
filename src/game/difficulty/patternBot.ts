/**
 * The search "bot": plays the real game code (physics, jump, duck, collisions) and looks for any
 * timing of taps and swipes that gets past without a hit. A person can't hit an exact frame, so
 * a move only counts if it also works pressed a little early and a little late.
 *
 * Used by src/game/__tests__/patterns.test.ts and the difficulty report.
 *
 * At a pace above 1 (pace.ts) the game speeds up and the bot doesn't: it acts once per real frame,
 * and its look-ahead, its ±3 frames and its double-jump delays stay in real time, so a faster
 * game properly leaves it less room.
 */
import { MAX_ENERGY, PLAYER_SIZE, PLAYER_X } from '../constants';
import { closedUp, PATTERNS, TIGHTEST_SPACING } from '../patterns';
import { gameStep, PaceOption, paceAt } from '../pace';
import { speedAt, STAGES } from '../stages';
import { createInitialState, GameState } from '../state';
import { checkCollisions } from '../systems/collisions';
import { applyPhysics, jump, startDuck } from '../systems/physics';
import { spawnObstacle } from '../systems/spawn';

const DT = 1 / 60;
export type Obstacle = GameState['obstacles'][number];

export interface Sim {
    state: GameState;
    /** Real frames played. */
    frame: number;
    /** The pace away from a stage, for a single pattern. A stage takes it from its option's curve. */
    pace?: number;
    /** For whole-stage runs: which stage is spawning, and the random number generator's position. */
    stageIndex?: number;
    seed?: number;
}

/** Obstacles waiting to appear, by the frame they were spawned on. */
export type Arrivals = Map<number, Obstacle[]>;

const clone = (sim: Sim): Sim => ({ ...sim, state: JSON.parse(JSON.stringify(sim.state)) });

/** How many 60fps frames a stage lasts. Each stage's length is matched to its music. */
export const stageFrames = (stage: (typeof STAGES)[number]) => Math.round(stage.durationSec * 60);

/** Small repeatable random numbers, kept in the sim so every branch of the search replays exactly. */
const nextRandom = (sim: Sim) => {
    sim.seed = ((sim.seed ?? 1) * 1664525 + 1013904223) % 4294967296;
    return sim.seed / 4294967296;
};

/** The pace now: a stage's option curve, or the fixed pace of a single pattern. */
const paceNow = ({ state, stageIndex, pace }: Sim) =>
    stageIndex !== undefined ? paceAt(state.paceOption, STAGES[stageIndex], state.stageProgress) : pace ?? 1;

/** One frame of the game, in the same order as the real game loop. Returns true if the runner was hit. */
export const step = (sim: Sim, arrivals: Arrivals): boolean => {
    const incoming = arrivals.get(sim.frame);
    if (incoming) sim.state.obstacles.push(...incoming.map((o) => ({ ...o })));
    sim.frame++;
    const { steps, stepSec } = gameStep(DT, paceNow(sim));
    let hit = false;
    for (let i = 0; i < steps; i++) {
        applyPhysics(sim.state, stepSec);
        sim.state.gameSec += stepSec;
        if (sim.stageIndex !== undefined) {
            // The real spawner, running live, so it sees the real energy bar and health.
            const stage = STAGES[sim.stageIndex];
            const { state } = sim;
            state.stageProgress = Math.min(sim.frame / stageFrames(stage), 1);
            state.elapsedSecInStage = sim.frame / 60;
            state.distance = state.stageProgress * stage.courseLength;
            state.speed = speedAt(stage, state.stageProgress);
            if (state.distance < stage.courseLength - 1000) {
                spawnObstacle(state, stage, stepSec, () => nextRandom(sim));
            }
        }
        if (checkCollisions(sim.state)) hit = true;
    }
    return hit;
};

const isHazard = (o: Obstacle) => o.role !== 'heart' && !o.passed;

/** What the bot can do when it decides to act. A number = jump, then jump again that many frames later. */
type Action = 'none' | 'jump' | 'duck' | number;
const ACTIONS: Action[] = ['none', 'jump', 'duck', 6, 10, 14, 18, 22, 26, 30];

/** Do the action, then play on until the target obstacle has passed. False if anything hit. */
const tryAction = (sim: Sim, arrivals: Arrivals, action: Action, targetId: number): boolean => {
    if (action === 'jump' || typeof action === 'number') jump(sim.state);
    if (action === 'duck') startDuck(sim.state);
    for (let f = 1; f < 600; f++) {
        if (typeof action === 'number' && f === action) jump(sim.state);
        if (step(sim, arrivals)) return false;
        const target = sim.state.obstacles.find((o) => o.id === targetId);
        if (!target || target.passed) return true;
    }
    return false;
};

/** How far ahead of the runner an obstacle has to be before acting on it is worth trying. */
const LOOK_AHEAD_SEC = 1.1;

/** 3 frames = 0.05 sec either side, so every move has a timing window of at least 0.1 sec. */
const TIMING_SLACK_FRAMES = 3;

let triesLeft = 0;
/** The furthest the search got, to say where it was stuck if it gives up. */
let deepest = { frame: -1, energy: 0, ahead: '' };

/** Start a new search, with this many tries before it gives up. */
export const startSearch = (tries: number) => {
    triesLeft = tries;
    deepest = { frame: -1, energy: 0, ahead: '' };
};

/** True if some sequence of actions clears every obstacle from here on. */
export const solve = (start: Sim, arrivals: Arrivals, lastFrame: number): boolean => {
    const sim = clone(start);
    // Play on idle until the next obstacle is close enough to need a decision.
    for (;;) {
        const next = sim.state.obstacles.filter(isHazard).sort((a, b) => a.x - b.x)[0];
        if (!next && sim.frame > lastFrame) return true;
        if (next && next.x - (PLAYER_X + PLAYER_SIZE) <= LOOK_AHEAD_SEC * sim.state.speed * paceNow(sim)) break;
        if (step(sim, arrivals)) return false;
    }
    const target = sim.state.obstacles.filter(isHazard).sort((a, b) => a.x - b.x)[0];
    if (sim.frame > deepest.frame) {
        deepest = {
            frame: sim.frame,
            energy: Math.round(sim.state.energy),
            ahead: sim.state.obstacles
                .filter(isHazard)
                .sort((a, b) => a.x - b.x)
                .map((o) => `${o.role}@${Math.round(o.x)}`)
                .join(' '),
        };
    }

    // A person can't hit an exact frame, so a move only counts if it also works pressed a
    // little early and a little late. This keeps out solutions that need perfect timing.
    const clearsWithSlack = (action: Action, centre: Sim, earlier: Sim | undefined) => {
        if (action === 'none') return true;
        if (earlier && !tryAction(clone(earlier), arrivals, action, target.id)) return false;
        const later = clone(centre);
        for (let f = 0; f < TIMING_SLACK_FRAMES; f++) {
            if (step(later, arrivals)) return false;
        }
        return tryAction(later, arrivals, action, target.id);
    };

    // Try acting now, or a couple of frames later, and so on until it arrives.
    const history: Sim[] = [];
    for (;;) {
        const earlier = history.length >= TIMING_SLACK_FRAMES ? history[history.length - TIMING_SLACK_FRAMES] : undefined;
        for (const action of ACTIONS) {
            if (--triesLeft < 0) {
                throw new Error(`Search gave up. Stuck at ${(deepest.frame / 60).toFixed(1)}s, energy ${deepest.energy}, ahead: ${deepest.ahead}`);
            }
            const attempt = clone(sim);
            if (
                tryAction(attempt, arrivals, action, target.id) &&
                clearsWithSlack(action, sim, earlier) &&
                solve(attempt, arrivals, lastFrame)
            ) {
                return true;
            }
        }
        for (let f = 0; f < 2; f++) {
            history.push(clone(sim));
            if (step(sim, arrivals)) return false;
        }
        const now = sim.state.obstacles.find((o) => o.id === target.id);
        if (!now || now.passed) return false; // already covered by 'none' above
    }
};

export const freshSim = (speed = STAGES[0].speed[0]): Sim => {
    const state = createInitialState();
    state.gameStarted = true;
    state.speed = speed;
    state.energy = MAX_ENERGY;
    return { state, frame: 0 };
};

export const patternArrivals = (steps: { role: Obstacle['role']; at: number }[], speed: number, phase = 0): Arrivals =>
    new Map([[0, steps.map((s, i) => ({
        x: 500 + s.at * speed,
        id: i,
        role: s.role,
        phase: s.role === 'mover' ? phase : undefined,
    }))]]);

/** Every speed and pace an option's stages start or end at. */
const speedsAndPaces = (option: PaceOption) => {
    const found = new Map<string, { speed: number; pace: number }>();
    STAGES.forEach((stage, i) => {
        [0, 1].forEach((end) => {
            const speed = stage.speed[end];
            const pace = option.stages[i][end];
            found.set(`${speed}@${pace}`, { speed, pace });
        });
    });
    return [...found.values()];
};

/**
 * Every pattern at every speed and pace an option's stages reach, as designed and closed up.
 * How many checks that was, and any the bot couldn't clear.
 */
export const checkPatterns = (option: PaceOption) => {
    const failed: string[] = [];
    let checks = 0;
    for (const pattern of PATTERNS) {
        const phases = pattern.steps.some((s) => s.role === 'mover') ? [0, 0.8, 1.6, 2.4, 3.1] : [0];
        for (const spacing of [1, TIGHTEST_SPACING]) {
            for (const { speed, pace } of speedsAndPaces(option)) {
                for (const phase of phases) {
                    checks++;
                    startSearch(200000);
                    const sim = { ...freshSim(speed), pace };
                    if (!solve(sim, patternArrivals(closedUp(pattern, spacing), speed, phase), 0)) {
                        failed.push(`${pattern.id}${spacing < 1 ? ' closed up' : ''} at ${speed} px/sec, pace ${pace}${phases.length > 1 ? `, sphere phase ${phase}` : ''}`);
                    }
                }
            }
        }
    }
    return { checks, failed };
};

/** A whole stage of live-spawned obstacles at an option's pace. True if the bot clears it. */
export const clearsStage = (option: PaceOption, stageIndex: number, seed: number) => {
    const stage = STAGES[stageIndex];
    const sim: Sim = { ...freshSim(stage.speed[0]), stageIndex, seed };
    sim.state.stageId = stage.id;
    sim.state.paceOption = option.id;
    // A little hurt, so hearts get placed too.
    sim.state.player.health = 5;
    // Voids give the search many double-jump timings to try, so it needs more room.
    startSearch(4000000);
    return solve(sim, new Map(), stageFrames(stage));
};
