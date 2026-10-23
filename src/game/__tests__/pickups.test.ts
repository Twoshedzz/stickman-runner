/**
 * Checks the neon pickups and the streak multiplier against the real game code: the paths
 * can be collected with human-sized timing without getting hit, running along the ground
 * collects a trail, pickups never sit inside an obstacle, and the multiplier follows the
 * streak.
 */
import { MAX_ENERGY, PLAYER_SIZE, PLAYER_X, RUNNER_GROUND_Y } from '../constants';
import { ROLE_SHAPES, shapeFor } from '../obstacleCatalogue';
import { collectPickups, multiplierFor, PICKUP_RADIUS, placePickups } from '../pickups';
import { speedAt, StagePacing, STAGES } from '../stages';
import { createInitialState, GameState } from '../state';
import { checkCollisions } from '../systems/collisions';
import { applyPhysics, jump } from '../systems/physics';
import { spawnObstacle } from '../systems/spawn';

const DT = 1 / 60;
const RUNNER_MID_X = PLAYER_X + PLAYER_SIZE / 2;
const RUNNER_MID_Y = RUNNER_GROUND_Y - PLAYER_SIZE / 2;
/** Always says yes: every arc and trail that can be placed is. */
const always = () => 0;
/** Stage 1: plain arcs and ground trails only. */
const EASY = STAGES[0].pacing;
const withPickups = (hop: number, double: number): StagePacing => ({
    ...EASY,
    pickups: { hop: [hop, hop], double: [double, double] },
});
const HOPS = withPickups(1, 0);
const DOUBLES = withPickups(0, 1);

const freshState = (speed: number) => {
    const state = createInitialState();
    state.gameStarted = true;
    state.speed = speed;
    state.energy = MAX_ENERGY;
    return state;
};

/** One frame, in the game loop's order. Returns true if the runner was hit. */
const step = (state: GameState) => {
    applyPhysics(state, DT);
    const hit = checkCollisions(state);
    collectPickups(state);
    return hit;
};

/** Frames until something at `x` reaches the runner's middle. */
const framesTo = (x: number, speed: number) => Math.round((x - RUNNER_MID_X) / (speed / 60));

/** Play 4 seconds, tapping on the given frames. Returns the number of hits. */
const play = (state: GameState, taps: number[]) => {
    let hits = 0;
    for (let f = 0; f < 240; f++) {
        taps.filter((t) => t === f).forEach(() => jump(state));
        if (step(state)) hits++;
    }
    return hits;
};

const block = (x: number, id = 0) => ({ x, id, role: 'small' as const });

const SPEEDS = [STAGES[0].speed[0], 300, STAGES[STAGES.length - 1].speed[1]];
/** A tap up to 3 frames (0.05 sec) early or late. */
const SLACK = [-3, 0, 3];

describe('jump arcs', () => {
    for (const role of ['small', 'large'] as const) {
        for (const speed of SPEEDS) {
            it(`a well-timed jump over a ${role} block at ${speed} px/sec collects the whole arc`, () => {
                for (const slack of SLACK) {
                    const state = freshState(speed);
                    const obstacle = { x: 600, id: 0, role };
                    state.obstacles.push(obstacle);
                    placePickups(state, EASY, [obstacle], 600 + ROLE_SHAPES[role].width, 0, true, always);
                    const arc = state.pickups.length;
                    expect(arc).toBe(5);
                    // Take off so the top of the jump (20 frames up) is over the block's middle.
                    const takeOff = framesTo(obstacle.x + ROLE_SHAPES[role].width / 2, speed) - 20;
                    expect(play(state, [takeOff + slack])).toBe(0);
                    expect(state.pickups.length).toBe(0);
                    expect(state.score).toBe(arc + 1); // the arc, and the block cleared
                }
            });
        }
    }

    it('running along the ground under an arc collects none of it', () => {
        const state = freshState(300);
        state.player.hurtTimer = 100; // so walking into the block doesn't matter here
        placePickups(state, EASY, [block(600)], 628, 0, true, always);
        play(state, []);
        expect(state.score).toBe(0);
    });

    it('two blocks one jump clears share one arc', () => {
        const state = freshState(300);
        placePickups(state, EASY, [block(600), block(645, 1)], 673, 0, true, always);
        expect(state.pickups.length).toBe(5);
    });

    it('no arc over a purple sphere or a bar', () => {
        const state = freshState(300);
        placePickups(state, EASY, [{ x: 600, id: 0, role: 'mover' }, { x: 900, id: 1, role: 'overhead' }], 928, 0, true, always);
        expect(state.pickups.length).toBe(0);
    });
});

describe('double-jump arcs (stages 3 and 4)', () => {
    for (const speed of SPEEDS) {
        it(`a jump and a double jump at ${speed} px/sec collect the whole arc`, () => {
            for (const slack of SLACK) {
                for (const doubleSlack of SLACK) {
                    const state = freshState(speed);
                    state.obstacles.push(block(600));
                    placePickups(state, DOUBLES, [block(600)], 628, 2, true, always);
                    expect(state.pickups.length).toBe(6);
                    const takeOff = framesTo(614, speed) - 20 + slack;
                    expect(play(state, [takeOff, takeOff + 10 + doubleSlack])).toBe(0);
                    expect(state.score).toBe(6 + 1); // the arc, and the block cleared
                }
            }
        });
    }

    it('a plain jump only reaches the bottom of one', () => {
        const state = freshState(300);
        state.obstacles.push(block(600));
        placePickups(state, DOUBLES, [block(600)], 628, 2, true, always);
        play(state, [framesTo(614, 300) - 20]);
        expect(state.score).toBeLessThanOrEqual(1 + 3);
    });

    it('it costs energy: with none left, the top is out of reach', () => {
        const state = freshState(300);
        state.energy = 0;
        state.obstacles.push(block(600));
        placePickups(state, DOUBLES, [block(600)], 628, 2, true, always);
        const takeOff = framesTo(614, 300) - 20;
        play(state, [takeOff, takeOff + 10]);
        expect(state.score).toBeLessThanOrEqual(1 + 3);
    });

    it('not when something comes before the runner would be down again', () => {
        const state = freshState(300);
        // Two blocks 0.95 sec apart, as in the hop-hop pattern: plain arcs over both.
        placePickups(state, DOUBLES, [block(600), block(885, 1)], 913, 0.5, true, always);
        expect(state.pickups.length).toBe(10);
        expect(Math.min(...state.pickups.map((p) => p.y))).toBeGreaterThan(RUNNER_MID_Y - 120);
    });
});

describe('hops (stage 2 on)', () => {
    for (const speed of SPEEDS) {
        it(`at ${speed} px/sec, an extra jump in the rest collects the hop and still clears the next block`, () => {
            // About the shortest rest that gets a hop.
            const rest = 1.5;
            for (const slack of SLACK) {
                const state = freshState(speed);
                const first = block(600);
                const nextX = 628 + rest * speed;
                state.obstacles.push(first, block(nextX, 1));
                placePickups(state, HOPS, [first], 628, rest, false, always);
                // The hop is the last five placed; its middle one is the top of the jump.
                const hop = state.pickups.slice(-5);
                expect(hop.every((p) => p.y < RUNNER_MID_Y - 50)).toBe(true);
                const taps = [
                    framesTo(614, speed) - 20,
                    framesTo(hop[2].x, speed) - 20 + slack,
                    framesTo(nextX + 14, speed) - 20,
                ];
                const arc = state.pickups.length - 5;
                expect(play(state, taps)).toBe(0);
                expect(state.score).toBe(arc + 5 + 2); // both arcs, and both blocks
            }
        });
    }

    it('a rest too short for one gets a ground trail instead', () => {
        const state = freshState(300);
        placePickups(state, HOPS, [], 200, 1.2, false, always);
        expect(state.pickups.length).toBeGreaterThanOrEqual(3);
        expect(state.pickups.every((p) => p.y === RUNNER_MID_Y)).toBe(true);
    });
});

describe('ground trails', () => {
    it('running straight through a trail collects all of it', () => {
        const state = freshState(300);
        placePickups(state, EASY, [{ x: 400, id: 0, role: 'overhead' }], 428, 1.5, false, always);
        const trail = state.pickups.length;
        expect(trail).toBeGreaterThanOrEqual(3);
        play(state, []);
        expect(state.score).toBe(trail);
    });

    it('a ducking runner still collects it', () => {
        const state = freshState(300);
        placePickups(state, EASY, [], 200, 1.5, false, always);
        state.player.isDucking = true;
        state.player.duckHeld = true;
        state.player.duckTimer = 10;
        const trail = state.pickups.length;
        play(state, []);
        expect(state.score).toBe(trail);
    });

    it('a rest with a heart in it gets no trail', () => {
        const state = freshState(300);
        placePickups(state, EASY, [], 200, 1.5, true, always);
        expect(state.pickups.length).toBe(0);
    });

    it('a short rest gets no trail', () => {
        const state = freshState(300);
        placePickups(state, EASY, [], 200, 0.9, false, always);
        expect(state.pickups.length).toBe(0);
    });
});

describe('a whole stage of spawned pickups', () => {
    STAGES.forEach((stage, index) => {
        it(`${stage.name}: plenty of pickups, none inside an obstacle, high ones from stage 3`, () => {
            const state = createInitialState();
            state.stageId = stage.id;
            let seed = 7;
            const random = () => {
                seed = (seed * 1664525 + 1013904223) % 4294967296;
                return seed / 4294967296;
            };
            const frames = Math.round(stage.durationSec * 60);
            let placed = 0;
            let high = 0;
            const seen = new Set<number>();
            for (let frame = 0; frame < frames; frame++) {
                state.stageProgress = frame / frames;
                state.elapsedSecInStage = frame / 60;
                state.speed = speedAt(stage, state.stageProgress);
                spawnObstacle(state, stage, DT, random);
                for (const p of state.pickups) {
                    if (seen.has(p.id)) continue;
                    seen.add(p.id);
                    placed++;
                    // Higher than a plain jump can reach.
                    if (p.y < RUNNER_MID_Y - 140) high++;
                    for (const o of state.obstacles) {
                        const art = shapeFor(o.role);
                        const top = art.overhead ? RUNNER_GROUND_Y - 170 : RUNNER_GROUND_Y - art.height;
                        const inside =
                            p.x + PICKUP_RADIUS > o.x && p.x - PICKUP_RADIUS < o.x + art.width &&
                            p.y + PICKUP_RADIUS > top && p.y - PICKUP_RADIUS < top + art.height;
                        expect(inside).toBe(false);
                    }
                }
                // Everything scrolls together; the sphere's wobble is left out here.
                const move = state.speed / 60;
                state.obstacles.forEach((o) => { o.x -= move; });
                state.pickups.forEach((p) => { p.x -= move; });
                state.obstacles = state.obstacles.filter((o) => o.x > -300);
                state.pickups = state.pickups.filter((p) => p.x > -300);
            }
            // Roughly one to three a second, over three minutes.
            expect(placed).toBeGreaterThan(150);
            expect(placed).toBeLessThan(600);
            if (index < 2) expect(high).toBe(0);
            else expect(high).toBeGreaterThan(10);
        });
    });
});

describe('the streak multiplier', () => {
    it('steps up at 10, 25 and 50 clean obstacles', () => {
        expect(multiplierFor(0)).toBe(1);
        expect(multiplierFor(9)).toBe(1);
        expect(multiplierFor(10)).toBe(2);
        expect(multiplierFor(24)).toBe(2);
        expect(multiplierFor(25)).toBe(3);
        expect(multiplierFor(50)).toBe(4);
        expect(multiplierFor(500)).toBe(4);
    });

    it('clean obstacles build it, and score at the multiplier', () => {
        const state = freshState(300);
        state.streak = 9;
        state.obstacles.push(block(30)); // just about to pass the runner
        for (let f = 0; f < 10; f++) step(state);
        expect(state.streak).toBe(10);
        expect(state.score).toBe(2);
    });

    it('a hit resets it, and the obstacle brushed straight after does not count', () => {
        const state = freshState(260);
        state.streak = 30;
        state.obstacles.push(block(300), block(404, 1));
        play(state, []);
        expect(state.streak).toBe(0);
        expect(state.score).toBe(0);
    });

    it('a missed heart does not count', () => {
        const state = freshState(300);
        state.player.y = 0; // up out of reach
        state.player.dy = -100;
        state.obstacles.push({ x: 30, id: 0, role: 'heart' });
        applyPhysics(state, DT);
        state.obstacles[0].x = -20;
        applyPhysics(state, DT);
        expect(state.streak).toBe(0);
        expect(state.score).toBe(0);
    });
});
