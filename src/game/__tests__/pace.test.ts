/**
 * The pace dial (step 12): everything in the world on game time, the stage on real time, a jump
 * the same distance at any pace, a slow frame no way through an obstacle, and pace 1 unchanged.
 */
import { PLAYER_X, RUNNER_GROUND_Y, PLAYER_SIZE, JUMP_BUFFER_SEC, DUCK_DURATION_SEC, ENERGY_REGEN, HIT_GRACE_SEC } from '../constants';
import { frameScale } from '../frame';
import { playStage, SKILLS } from '../difficulty/pretendPlayer';
import { gameStep, PACE_OPTIONS, paceAt, PaceOptionId, remainingPacedScroll } from '../pace';
import { beatGridSec, speedAt, STAGES } from '../stages';
import { createInitialState, GameState } from '../state';
import { stepWorld } from '../step';
import { shapeFor } from '../obstacleCatalogue';
import { updateParticles } from '../particles';
import { collectPickups } from '../pickups';
import { checkCollisions } from '../systems/collisions';
import { FALL_SEC } from '../systems/holes';
import { applyPhysics, jump, startDuck } from '../systems/physics';
import { resetSpawner, spawnObstacle } from '../systems/spawn';

const DT = 1 / 60;
const LAST = STAGES.length - 1;

/** A runner on an empty course (nothing spawns), at a point in a stage. */
const runner = (option: PaceOptionId, stageIndex = 0, progress = 0): GameState => {
    const state = createInitialState();
    const stage = STAGES[stageIndex];
    state.gameStarted = true;
    state.stageId = stage.id;
    state.paceOption = option;
    state.distance = stage.courseLength;
    state.stageProgress = progress;
    state.speed = speedAt(stage, progress);
    return state;
};

/** Every option at the start and end of every stage. */
const EVERY_POINT = PACE_OPTIONS.flatMap((o) =>
    STAGES.flatMap((_, s) => [0, 1].map((progress) => [o.id, s, progress] as const))
);

describe('the options', () => {
    it('are the table in the plan', () => {
        const at = (id: PaceOptionId, s: number) => [paceAt(id, STAGES[s], 0), paceAt(id, STAGES[s], 1)];
        STAGES.forEach((_, s) => {
            expect(at('A', s)).toEqual([1, 1]);
            expect(at('B', s)).toEqual([1.3, 1.3]);
        });
        expect(at('C', 0)).toEqual([1.0, 1.2]);
        expect(at('C', 3)).toEqual([1.3, 1.5]);
        expect(at('D', 0)).toEqual([1.1, 1.4]);
        expect(at('D', 3)).toEqual([1.4, 1.7]);
    });

    it('run in a straight line through the stage', () => {
        expect(paceAt('D', STAGES[LAST], 0.5)).toBeCloseTo(1.55, 10);
    });
});

describe('a jump', () => {
    /** Plays a jump: how far the world moved, how high he got, and how many real frames it took. */
    const flight = (option: PaceOptionId, s: number, progress: number, dt = DT) => {
        const state = runner(option, s, progress);
        jump(state);
        let peak = 0;
        let frames = 0;
        while (!state.player.isGrounded && frames < 400) {
            stepWorld(state, STAGES[s], dt, { sparks: false });
            peak = Math.max(peak, RUNNER_GROUND_Y - PLAYER_SIZE - state.player.y);
            frames++;
        }
        return { px: state.scroll, peak, frames };
    };

    it.each(EVERY_POINT)('option %s, stage %i, progress %d: same distance and height as today', (id, s, progress) => {
        const today = flight('A', s, progress);
        const paced = flight(id, s, progress);
        // Within one 60fps frame's movement (6px at most): the world only moves in whole steps.
        expect(Math.abs(paced.px - today.px)).toBeLessThanOrEqual(speedAt(STAGES[s], progress) / 60 + 1e-6);
        expect(paced.peak).toBeGreaterThanOrEqual(today.peak - 1e-6);
        expect(paced.peak).toBeLessThan(today.peak + 3.5);
    });

    it('takes less real time by the pace', () => {
        const { frames } = flight('D', LAST, 1);
        expect(frames).toBeLessThanOrEqual(Math.ceil(flight('A', LAST, 1).frames / 1.7) + 1);
    });

    /** Whether any take-off clears a void: one jump, or a jump and a double jump at any delay. */
    const clearsVoid = (id: PaceOptionId, s: number, progress: number, double: boolean) => {
        for (const delay of double ? [8, 12, 16, 20, 24, 28] : [Infinity]) {
            for (let takeOff = 1; takeOff < 120; takeOff++) {
                const state = runner(id, s, progress);
                state.obstacles.push({ x: 450, id: 1, role: 'void' });
                let fell = false;
                for (let f = 0; f < 400 && !fell && !state.obstacles[0]?.passed; f++) {
                    if (f === takeOff) jump(state);
                    if (f === takeOff + delay) jump(state);
                    fell = stepWorld(state, STAGES[s], DT, { sparks: false });
                }
                if (!fell) return true;
            }
        }
        return false;
    };

    it.each(EVERY_POINT)('option %s, stage %i, progress %d: a void still needs a double jump', (id, s, progress) => {
        expect(clearsVoid(id, s, progress, false)).toBe(false);
        expect(clearsVoid(id, s, progress, true)).toBe(true);
    });
});

describe('everything in the world runs on game time', () => {
    const PACE = 1.5;
    /** Option D at the end of stage 2 is pace 1.5. */
    const paced = () => runner('D', 1, 1);
    const stage = STAGES[1];
    const framesUntil = (state: GameState, done: () => boolean) => {
        let frames = 0;
        while (!done() && frames < 600) {
            stepWorld(state, stage, DT, { sparks: false });
            frames++;
        }
        return frames;
    };

    it('the scrolling', () => {
        const state = paced();
        for (let f = 0; f < 60; f++) stepWorld(state, stage, DT, { sparks: false });
        expect(state.scroll).toBeCloseTo(stage.speed[1] * PACE, 5);
    });

    it('the duck', () => {
        const state = paced();
        startDuck(state);
        const frames = framesUntil(state, () => !state.player.isDucking);
        expect(frames).toBeGreaterThanOrEqual(Math.floor((DUCK_DURATION_SEC * 60) / PACE));
        expect(frames).toBeLessThanOrEqual(Math.ceil((DUCK_DURATION_SEC * 60) / PACE) + 1);
    });

    it('the hurt time and the jump buffer', () => {
        const state = paced();
        state.player.hurtTimer = HIT_GRACE_SEC;
        state.player.jumpBuffer = JUMP_BUFFER_SEC;
        stepWorld(state, stage, DT, { sparks: false });
        expect(state.player.hurtTimer).toBeCloseTo(HIT_GRACE_SEC - DT * PACE, 10);
        // A buffered tap on the ground jumps at once; held up in the air it just runs down.
        expect(state.player.jumpBuffer).toBe(0);
        const air = paced();
        air.player.isGrounded = false;
        air.player.y = 100;
        air.player.jumpBuffer = JUMP_BUFFER_SEC;
        stepWorld(air, stage, DT, { sparks: false });
        expect(air.player.jumpBuffer).toBeCloseTo(JUMP_BUFFER_SEC - DT * PACE, 10);
    });

    it('energy refill', () => {
        const state = paced();
        state.energy = 0;
        for (let f = 0; f < 60; f++) stepWorld(state, stage, DT, { sparks: false });
        expect(state.energy).toBeCloseTo(60 * ENERGY_REGEN * PACE, 5);
    });

    it('a moving sphere keeps its swing', () => {
        const state = paced();
        state.obstacles.push({ x: 2000, id: 1, role: 'mover', phase: 0 });
        for (let f = 0; f < 60; f++) stepWorld(state, stage, DT, { sparks: false });
        expect(state.obstacles[0].phase).toBeCloseTo(0.1 * 60 * PACE, 5);
    });

    it('the drop into a hole', () => {
        const state = paced();
        state.obstacles.push({ x: PLAYER_X, id: 1, role: 'hole' });
        stepWorld(state, stage, DT, { sparks: false });
        expect(state.player.falling).toBeGreaterThan(0);
        const frames = framesUntil(state, () => state.player.falling <= 0);
        expect(frames).toBeLessThanOrEqual(Math.ceil((FALL_SEC * 60) / PACE) + 1);
    });

    it('the sparks, in the shared step', () => {
        const state = paced();
        state.particles = [{ id: 1, x: 0, y: 0, vx: 10, vy: 0, life: 1, decay: 0, color: 'white', size: 1 }];
        stepWorld(state, stage, DT);
        // Two steps of 0.75 of a frame: each slowed a little by drag.
        expect(state.particles[0].x).toBeGreaterThan(10);
    });

    it('the stage stays on real time: stepping never touches the clock', () => {
        const state = paced();
        state.elapsedSecInStage = 50;
        state.stageProgress = 0.5;
        for (let f = 0; f < 120; f++) stepWorld(state, stage, DT, { sparks: false });
        expect(state.elapsedSecInStage).toBe(50);
        expect(state.stageProgress).toBe(0.5);
        expect(state.gameSec).toBeCloseTo(2 * paceAt('D', stage, 0.5), 5);
    });

    it('the finish line is as far as the world will move before the stage ends', () => {
        for (const option of PACE_OPTIONS) {
            STAGES.forEach((s) => {
                const frames = Math.round(s.durationSec * 60);
                for (const startFrame of [0, 3000, 9000]) {
                    let travelled = 0;
                    for (let f = startFrame; f < frames; f++) {
                        const progress = f / frames;
                        travelled += (speedAt(s, progress) * paceAt(option.id, s, progress)) / 60;
                    }
                    const predicted = remainingPacedScroll(option.id, s, startFrame / frames);
                    expect(Math.abs(travelled - predicted)).toBeLessThan(5);
                }
            });
        }
    });
});

describe('a slow frame', () => {
    /** Slow frames (seconds each) at a pace: is the runner still hit by the narrowest block? */
    const hitBy = (id: PaceOptionId, dt: number, startX: number) => {
        const state = runner(id, LAST, 1);
        state.obstacles.push({ x: startX, id: 1, role: 'small' });
        for (let f = 0; f < 400; f++) {
            if (stepWorld(state, STAGES[LAST], dt, { sparks: false })) return true;
            if (state.obstacles[0]?.passed) return false;
        }
        return false;
    };

    it.each(PACE_OPTIONS.map((o) => o.id))('option %s can not carry the runner through an obstacle', (id) => {
        for (const dt of [1 / 60, 1 / 30, 1 / 20, 1 / 10, 0.5]) {
            // From every starting point across one big step, so no lucky alignment gets through.
            for (let x = 200; x < 230; x += 1) expect(hitBy(id, dt, x)).toBe(true);
        }
    });

    it('never moves more than one frame per step above pace 1', () => {
        for (const pace of [1.01, 1.1, 1.3, 1.5, 1.7]) {
            for (const dt of [1 / 120, 1 / 60, 1 / 30, 0.1, 2]) {
                const { steps, stepSec } = gameStep(dt, pace);
                expect(frameScale(stepSec)).toBeLessThanOrEqual(1 + 1e-9);
                // And no more movement than a slow frame gets at pace 1, times the pace.
                expect(steps * stepSec * 60).toBeCloseTo(frameScale(dt) * pace, 8);
            }
        }
    });

    it('at pace 1 is the one step it has always been, whatever the frame rate', () => {
        for (const dt of [1 / 120, 1 / 60, 1 / 30, 0.1, 2]) {
            expect(gameStep(dt, 1)).toEqual({ steps: 1, stepSec: dt });
        }
    });
});

describe('option A is the game as it was', () => {
    /** The frame as it was before the pace dial: one call of each, with the raw frame time. */
    const oldFrame = (state: GameState, stage: (typeof STAGES)[number], dt: number, random: () => number) => {
        state.events = [];
        state.scroll += (state.speed / 60) * frameScale(dt);
        applyPhysics(state, dt);
        if (state.distance < stage.courseLength - 1000) spawnObstacle(state, stage, dt, random);
        state.particles = updateParticles(state.particles, dt);
        const hit = checkCollisions(state);
        collectPickups(state);
        return hit;
    };
    const dice = (seed: number) => () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };

    it('frame for frame, at an uneven frame rate with slow frames in it', () => {
        const stage = STAGES[LAST];
        const dts = [1 / 60, 1 / 58, 1 / 30, 1 / 120, 1 / 12, 1 / 60];
        /** A long run, frame by frame, with the same dice and taps each time. */
        const play = (frame: (state: GameState, dt: number, random: () => number) => void) => {
            const state = createInitialState();
            state.gameStarted = true;
            state.stageId = stage.id;
            // Enough health that it runs the whole way, so plenty gets hit, fallen into and collected.
            state.player.health = 1000;
            state.player.maxHealth = 1000;
            resetSpawner(state);
            const random = dice(5);
            let sec = 0;
            for (let f = 0; f < 3000; f++) {
                const dt = dts[f % dts.length];
                sec += dt;
                state.elapsedSecInStage = sec;
                state.stageProgress = sec / stage.durationSec;
                state.distance = state.stageProgress * stage.courseLength;
                state.speed = speedAt(stage, state.stageProgress);
                if (f % 47 === 0) jump(state);
                frame(state, dt, random);
                state.particles = [];
            }
            state.gameSec = 0;
            return state;
        };
        const a = play((state, dt, random) => stepWorld(state, stage, dt, { random, sparks: false }));
        const b = play((state, dt, random) => { oldFrame(state, stage, dt, random); });
        expect(a).toEqual(b);
    });
});

describe('the beat grid', () => {
    /** How far off the grid obstacles arrive, for a minute of a stage, in real seconds. */
    const offGrid = (id: PaceOptionId, stage: (typeof STAGES)[number]) => {
        const state = createInitialState();
        state.stageId = stage.id;
        state.paceOption = id;
        const grid = beatGridSec(stage);
        const runnerX = PLAYER_X + PLAYER_SIZE / 2;
        let off = 0;
        for (let frame = 0; frame < 3600; frame++) {
            state.stageProgress = frame / 60 / stage.durationSec;
            state.elapsedSecInStage = frame / 60;
            state.speed = speedAt(stage, state.stageProgress);
            state.gameSec = frame / 60;
            const before = state.obstacles.length;
            spawnObstacle(state, stage, DT, Math.random);
            state.obstacles.slice(before).filter((o) => o.role !== 'heart').slice(0, 1).forEach((o) => {
                const arrival = frame / 60 + (o.x + shapeFor(o.role).width / 2 - runnerX) / state.speed;
                const phase = Math.abs(((arrival - stage.beat.firstSec) / grid) % 1);
                if (Math.min(phase, 1 - phase) * grid >= 0.005) off++;
            });
            state.obstacles.forEach((o) => { o.x -= state.speed / 60; });
        }
        return off;
    };

    it('option A keeps it', () => {
        STAGES.forEach((stage) => expect(offGrid('A', stage)).toBe(0));
    });

    it.each(['B', 'C', 'D'] as const)('option %s leaves it', (id) => {
        STAGES.forEach((stage) => expect(offGrid(id, stage)).toBeGreaterThan(5));
    });
});

describe('the planned voids', () => {
    it.each(PACE_OPTIONS.map((o) => o.id))('option %s places every one, no earlier than its moment in the stage', (id) => {
        STAGES.forEach((stage) => {
            const planned = Object.entries(stage.pacing.planned ?? {});
            const state = createInitialState();
            state.stageId = stage.id;
            state.paceOption = id;
            const frames = Math.round(stage.durationSec * 60);
            let seed = 3;
            const random = () => {
                seed = (seed * 1664525 + 1013904223) % 4294967296;
                return seed / 4294967296;
            };
            const counts: Record<string, number> = {};
            for (let f = 0; f < frames; f++) {
                state.stageProgress = f / frames;
                state.elapsedSecInStage = f / 60;
                state.distance = state.stageProgress * stage.courseLength;
                state.speed = speedAt(stage, state.stageProgress);
                const { steps, stepSec } = gameStep(DT, paceAt(id, stage, state.stageProgress));
                for (let i = 0; i < steps; i++) {
                    state.gameSec += stepSec;
                    if (state.distance < stage.courseLength - 1000) spawnObstacle(state, stage, stepSec, random);
                    state.obstacles.forEach((o) => { o.x -= (state.speed / 60) * stepSec * 60; });
                    state.obstacles = state.obstacles.filter((o) => o.x > -400);
                    state.pickups = [];
                }
                for (const [patternId, at] of planned) {
                    const placed = state.spawner.plannedPlaced[patternId] ?? 0;
                    if (placed > (counts[patternId] ?? 0)) {
                        expect(state.stageProgress).toBeGreaterThanOrEqual((at ?? [])[placed - 1] - 1e-6);
                        counts[patternId] = placed;
                    }
                }
            }
            for (const [patternId, at] of planned) expect(counts[patternId]).toBe(at?.length);
        });
    });
});

describe('the people playing stay on real time', () => {
    it('a faster game gives the pretend player smaller windows, in real seconds', () => {
        const median = (id: PaceOptionId) => {
            const windows = playStage(STAGES[LAST], SKILLS[0], 1, id).windows.small ?? [];
            return [...windows].sort((a, b) => a - b)[Math.floor(windows.length / 2)];
        };
        expect(median('D')).toBeLessThan(median('A') * 0.85);
    });

    it('a faster game gets harder for the same player, not easier', () => {
        const hits = (id: PaceOptionId) => {
            let total = 0;
            for (const seed of [1, 2, 3]) total += playStage(STAGES[LAST], SKILLS[0], seed, id).hits;
            return total;
        };
        expect(hits('D')).toBeGreaterThan(hits('A'));
    });

    it('rests are measured in real seconds, so they shrink with the pace', () => {
        const rests = (id: PaceOptionId) => {
            const r = playStage(STAGES[0], SKILLS[0], 2, id).rests;
            return r.reduce((a, b) => a + b, 0) / Math.max(1, r.length);
        };
        expect(rests('D')).toBeLessThan(rests('A'));
    });
});
