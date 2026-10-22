/**
 * Proves every obstacle sequence can be cleared.
 *
 * A search "bot" plays the real game code (physics, jump, duck, collisions) and looks for
 * any timing of taps and swipes that gets past without a hit. If it finds none, the
 * pattern or spacing is impossible and the test fails.
 */
import { MAX_ENERGY, PLAYER_SIZE, PLAYER_X, STAGE_DURATION_SECONDS } from '../constants';
import { PATTERNS } from '../patterns';
import { remainingScroll, speedAt, STAGES } from '../stages';
import { createInitialState, GameState } from '../state';
import { checkCollisions } from '../systems/collisions';
import { applyPhysics, jump, startDuck } from '../systems/physics';
import { spawnObstacle } from '../systems/spawn';

const DT = 1 / 60;
type Obstacle = GameState['obstacles'][number];

interface Sim {
    state: GameState;
    frame: number;
    /** For whole-stage runs: which stage is spawning, and the random number generator's position. */
    stageIndex?: number;
    seed?: number;
}

/** Obstacles waiting to appear, by the frame they were spawned on. */
type Arrivals = Map<number, Obstacle[]>;

const clone = (sim: Sim): Sim => ({ ...sim, state: JSON.parse(JSON.stringify(sim.state)) });

const STAGE_FRAMES = STAGE_DURATION_SECONDS * 60;

/** Small repeatable random numbers, kept in the sim so every branch of the search replays exactly. */
const nextRandom = (sim: Sim) => {
    sim.seed = ((sim.seed ?? 1) * 1664525 + 1013904223) % 4294967296;
    return sim.seed / 4294967296;
};

/** One frame of the game, in the same order as the real game loop. Returns true if the runner was hit. */
const step = (sim: Sim, arrivals: Arrivals): boolean => {
    const incoming = arrivals.get(sim.frame);
    if (incoming) sim.state.obstacles.push(...incoming.map((o) => ({ ...o })));
    sim.frame++;
    applyPhysics(sim.state, DT);
    if (sim.stageIndex !== undefined) {
        // The real spawner, running live, so it sees the real energy bar and health.
        const stage = STAGES[sim.stageIndex];
        const { state } = sim;
        state.stageProgress = Math.min(sim.frame / STAGE_FRAMES, 1);
        state.elapsedSecInStage = sim.frame / 60;
        state.distance = state.stageProgress * stage.courseLength;
        state.speed = speedAt(stage, state.stageProgress);
        if (state.distance < stage.courseLength - 1000) {
            spawnObstacle(state, stage, DT, () => nextRandom(sim));
        }
    }
    return checkCollisions(sim.state);
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

/** True if some sequence of actions clears every obstacle from here on. */
const solve = (start: Sim, arrivals: Arrivals, lastFrame: number): boolean => {
    const sim = clone(start);
    // Play on idle until the next obstacle is close enough to need a decision.
    for (;;) {
        const next = sim.state.obstacles.filter(isHazard).sort((a, b) => a.x - b.x)[0];
        if (!next && sim.frame > lastFrame) return true;
        if (next && next.x - (PLAYER_X + PLAYER_SIZE) <= LOOK_AHEAD_SEC * sim.state.speed) break;
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

const freshSim = (speed = STAGES[0].speed[0]): Sim => {
    const state = createInitialState();
    state.gameStarted = true;
    state.speed = speed;
    state.energy = MAX_ENERGY;
    return { state, frame: 0 };
};

const patternArrivals = (steps: { role: Obstacle['role']; at: number }[], speed: number, phase = 0): Arrivals =>
    new Map([[0, steps.map((s, i) => ({
        x: 500 + s.at * speed,
        id: i,
        role: s.role,
        phase: s.role === 'mover' ? phase : undefined,
    }))]]);

describe('the bot itself', () => {
    it('reports an impossible sequence as impossible', () => {
        // A bar straight after a block: you're still in the air when it arrives.
        triesLeft = 200000;
        const arrivals = patternArrivals([{ role: 'large', at: 0 }, { role: 'overhead', at: 0.3 }], 300);
        const sim = freshSim(300);
        sim.state.energy = 0;
        expect(solve(sim, arrivals, 0)).toBe(false);
    });
});

/** The slowest, a middle, and the fastest the world ever moves. */
const SPEEDS = [STAGES[0].speed[0], 300, STAGES[STAGES.length - 1].speed[1]];

describe('every pattern can be cleared', () => {
    for (const pattern of PATTERNS) {
        const phases = pattern.steps.some((s) => s.role === 'mover') ? [0, 0.8, 1.6, 2.4, 3.1] : [0];
        for (const speed of SPEEDS) {
            for (const phase of phases) {
                it(`${pattern.id} at ${speed} px/sec${phases.length > 1 ? ` (sphere phase ${phase})` : ''}`, () => {
                    triesLeft = 200000;
                    expect(solve(freshSim(speed), patternArrivals(pattern.steps, speed, phase), 0)).toBe(true);
                });
            }
        }
    }
});

describe('a whole stage of spawned obstacles can be cleared', () => {
    STAGES.forEach((stage, stageIndex) => {
        for (const seed of [1, 2, 3]) {
            it(`${stage.name} (seed ${seed})`, () => {
                const sim: Sim = { ...freshSim(stage.speed[0]), stageIndex, seed };
                sim.state.stageId = stage.id;
                // A little hurt, so hearts get placed too.
                sim.state.player.health = 5;
                triesLeft = 300000;
                deepest = { frame: -1, energy: 0, ahead: '' };
                expect(solve(sim, new Map(), STAGE_FRAMES)).toBe(true);
            });
        }
    });
});

describe('the finish line', () => {
    it('is exactly as far away as the world will move before the stage ends', () => {
        for (const stage of STAGES) {
            // Move the world frame by frame, the way the game loop does, from a few points in.
            for (const startFrame of [0, 3000, 9000]) {
                let travelled = 0;
                for (let frame = startFrame; frame < STAGE_FRAMES; frame++) {
                    travelled += speedAt(stage, frame / STAGE_FRAMES) / 60;
                }
                const predicted = remainingScroll(stage, startFrame / STAGE_FRAMES);
                // Within half a frame's movement.
                expect(Math.abs(travelled - predicted)).toBeLessThan(stage.speed[1] / 120);
            }
        }
    });
});
