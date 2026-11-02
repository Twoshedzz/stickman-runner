/**
 * Proves every obstacle sequence can be cleared.
 *
 * A search bot (difficulty/patternBot.ts) looks for any timing of taps and swipes that gets
 * past without a hit. If it finds none, the pattern or spacing is impossible and the test fails.
 */
import { DUCK_DURATION_SEC, DUCK_RELEASE_SEC, JUMP_ENERGY_COST, MAX_ENERGY, MAX_HEALTH, PLAYER_SIZE, PLAYER_X, RUNNER_GROUND_Y } from '../constants';
import { Arrivals, freshSim, patternArrivals, Sim, solve, stageFrames, startSearch, step } from '../difficulty/patternBot';
import { ROLE_SHAPES } from '../obstacleCatalogue';
import { closedUp, PATTERNS, TIGHTEST_SPACING } from '../patterns';
import { beatGridSec, remainingScroll, speedAt, STAGES } from '../stages';
import { createInitialState } from '../state';
import { applyPhysics, jump, releaseDuck, startDuck } from '../systems/physics';
import { canAskForDouble, SAME_JUMP_SEC, spawnObstacle } from '../systems/spawn';

const DT = 1 / 60;

describe('the bot itself', () => {
    it('reports an impossible sequence as impossible', () => {
        // A bar straight after a block: you're still in the air when it arrives.
        startSearch(200000);
        const arrivals = patternArrivals([{ role: 'large', at: 0 }, { role: 'overhead', at: 0.2 }], 300);
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
        // As designed, and closed up as tight as it gets at the end of a stage.
        for (const spacing of [1, TIGHTEST_SPACING]) {
            for (const speed of SPEEDS) {
                for (const phase of phases) {
                    const label = `${pattern.id}${spacing < 1 ? ' closed up' : ''} at ${speed} px/sec`;
                    it(`${label}${phases.length > 1 ? ` (sphere phase ${phase})` : ''}`, () => {
                        startSearch(200000);
                        const steps = closedUp(pattern, spacing);
                        expect(solve(freshSim(speed), patternArrivals(steps, speed, phase), 0)).toBe(true);
                    });
                }
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
                // Voids give the search many double-jump timings to try, so it needs more room.
                startSearch(4000000);
                expect(solve(sim, new Map(), stageFrames(stage))).toBe(true);
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
                for (let frame = startFrame; frame < stageFrames(stage); frame++) {
                    travelled += speedAt(stage, frame / stageFrames(stage)) / 60;
                }
                const predicted = remainingScroll(stage, startFrame / stageFrames(stage));
                // Within half a frame's movement.
                expect(Math.abs(travelled - predicted)).toBeLessThan(stage.speed[1] / 120);
            }
        }
    });
});

describe('holding a duck', () => {
    const ducksFor = (holdSec: number) => {
        const sim = freshSim();
        startDuck(sim.state, holdSec > 0);
        let frames = 0;
        while (sim.state.player.isDucking && frames < 600) {
            if (frames === Math.round(holdSec * 60)) releaseDuck(sim.state);
            applyPhysics(sim.state, DT);
            frames++;
        }
        return frames / 60;
    };

    it('a quick swipe still gives the full duck', () => {
        expect(ducksFor(0)).toBeCloseTo(DUCK_DURATION_SEC, 1);
        expect(ducksFor(0.05)).toBeCloseTo(DUCK_DURATION_SEC, 1);
    });

    it('stays down while held, and stands up shortly after letting go', () => {
        const total = ducksFor(2);
        expect(total).toBeGreaterThan(2);
        expect(total).toBeLessThan(2 + DUCK_RELEASE_SEC + 0.05);
    });

    it('two bars in a row can be ducked with one held swipe', () => {
        const arrivals = patternArrivals([{ role: 'overhead', at: 0 }, { role: 'overhead', at: 0.9 }], 300);
        const sim = freshSim(300);
        let hit = false;
        for (let f = 0; f < 240 && !hit; f++) {
            if (f === 70) startDuck(sim.state, true); // well before the first bar arrives
            hit = step(sim, arrivals);
        }
        expect(hit).toBe(false);
    });

    const landsDucked = (swipe: (sim: Sim) => void) => {
        const sim = freshSim();
        jump(sim.state);
        for (let f = 0; f < 20; f++) step(sim, new Map()); // on the way up
        swipe(sim);
        while (!sim.state.player.isGrounded) step(sim, new Map());
        return sim.state.player.isDucking;
    };

    it('a swipe down in mid-air ducks on landing, held or quick', () => {
        expect(landsDucked((sim) => startDuck(sim.state, true))).toBe(true);
        expect(landsDucked((sim) => { startDuck(sim.state, true); releaseDuck(sim.state); })).toBe(true);
    });

    it('a tap after a swipe in mid-air jumps on landing instead', () => {
        const sim = freshSim();
        sim.state.energy = 0; // so the tap can't be a double jump
        jump(sim.state);
        for (let f = 0; f < 20; f++) step(sim, new Map());
        startDuck(sim.state);
        while (sim.state.player.dy < 0 || sim.state.player.y < RUNNER_GROUND_Y - PLAYER_SIZE - 25) step(sim, new Map());
        jump(sim.state);
        let jumpedAgain = false;
        for (let f = 0; f < 20; f++) {
            step(sim, new Map());
            if (sim.state.player.dy < 0) jumpedAgain = true;
            expect(sim.state.player.isDucking).toBe(false);
        }
        expect(jumpedAgain).toBe(true);
    });
});

describe('feel and forgiveness', () => {
    const runFrames = (sim: Sim, frames: number, arrivals: Arrivals = new Map()) => {
        let hits = 0;
        for (let f = 0; f < frames; f++) if (step(sim, arrivals)) hits++;
        return hits;
    };

    it('a tap just before landing jumps on landing', () => {
        const sim = freshSim();
        sim.state.energy = 0; // so the tap can't be a double jump
        jump(sim.state);
        // Play on until a few frames before touching down, then tap.
        while (sim.state.player.dy < 0 || sim.state.player.y < RUNNER_GROUND_Y - PLAYER_SIZE - 25) step(sim, new Map());
        jump(sim.state);
        let landedAndJumped = false;
        for (let f = 0; f < 20; f++) {
            step(sim, new Map());
            if (sim.state.player.dy < 0 && sim.state.player.jumpCount === 1) landedAndJumped = true;
        }
        expect(landedAndJumped).toBe(true);
    });

    it('a full energy bar gives two double jumps', () => {
        const sim = freshSim();
        jump(sim.state); jump(sim.state); // jump, then double jump
        expect(sim.state.energy).toBe(MAX_ENERGY - JUMP_ENERGY_COST);
        runFrames(sim, 120); // land
        jump(sim.state); jump(sim.state);
        expect(sim.state.player.jumpCount).toBe(2);
    });

    it('two voids in quick succession are only asked for with a full bar and nothing else on its way', () => {
        const sim = freshSim();
        expect(canAskForDouble(sim.state, 2)).toBe(true);
        sim.state.energy = MAX_ENERGY - 1;
        expect(canAskForDouble(sim.state, 2)).toBe(false);
        sim.state.energy = MAX_ENERGY;
        sim.state.obstacles.push({ x: 400, id: 99, role: 'huge' });
        expect(canAskForDouble(sim.state, 2)).toBe(false);
    });

    it('after a hit, the next obstacle within a second can not hurt', () => {
        const sim = freshSim();
        const arrivals = patternArrivals([{ role: 'small', at: 0 }, { role: 'small', at: 0.4 }], 260);
        const hits = runFrames(sim, 240, arrivals);
        expect(hits).toBe(1);
        expect(sim.state.player.health).toBe(MAX_HEALTH - ROLE_SHAPES.small.damage);
    });
});

describe('obstacles land on the beat', () => {
    STAGES.forEach((stage) => {
        it(`${stage.name}: obstacles reach the runner on the music's beat grid`, () => {
            const state = createInitialState();
            state.stageId = stage.id;
            const grid = beatGridSec(stage);
            const runnerX = PLAYER_X + PLAYER_SIZE / 2;
            let offBeat = 0;
            let lastArrival = -Infinity;
            for (let frame = 0; frame < 60 * 60; frame++) {
                const sec = frame / 60;
                state.stageProgress = sec / stage.durationSec;
                state.elapsedSecInStage = sec;
                state.speed = speedAt(stage, state.stageProgress);
                const before = state.obstacles.length;
                spawnObstacle(state, stage, DT, Math.random);
                const placed = state.obstacles.slice(before).filter((o) => o.role !== 'heart');
                placed.forEach((o) => {
                    const arrival = sec + (o.x + ROLE_SHAPES[o.role!].width / 2 - runnerX) / state.speed;
                    const offGrid = Math.abs(((arrival - stage.beat.firstSec) / grid) % 1);
                    // The second of a tight pair is deliberately close behind the first.
                    const tightPair = arrival - lastArrival <= SAME_JUMP_SEC + 0.001;
                    if (!tightPair && Math.min(offGrid, 1 - offGrid) * grid >= 0.005) offBeat++;
                    lastArrival = arrival;
                });
                state.obstacles.forEach((o) => { o.x -= state.speed / 60; });
            }
            expect(offBeat).toBe(0);
        });
    });
});
