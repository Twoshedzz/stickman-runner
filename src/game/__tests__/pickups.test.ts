/**
 * Checks the neon pickups and the streak multiplier against the real game code: a good jump
 * sweeps up a whole arc, running along the ground collects a trail, pickups never sit
 * inside an obstacle, and the multiplier follows the streak.
 */
import { MAX_ENERGY, PLAYER_SIZE, PLAYER_X, RUNNER_GROUND_Y } from '../constants';
import { ROLE_SHAPES, shapeFor } from '../obstacleCatalogue';
import { collectPickups, multiplierFor, PICKUP_RADIUS, placePickups } from '../pickups';
import { speedAt, STAGES } from '../stages';
import { createInitialState, GameState } from '../state';
import { checkCollisions } from '../systems/collisions';
import { applyPhysics, jump } from '../systems/physics';
import { spawnObstacle } from '../systems/spawn';

const DT = 1 / 60;
const RUNNER_MID_X = PLAYER_X + PLAYER_SIZE / 2;
/** Always says yes: every arc and trail that can be placed is. */
const always = () => 0;

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

const SPEEDS = [STAGES[0].speed[0], 300, STAGES[STAGES.length - 1].speed[1]];

describe('jump arcs', () => {
    for (const role of ['small', 'large'] as const) {
        for (const speed of SPEEDS) {
            it(`a well-timed jump over a ${role} block at ${speed} px/sec collects the whole arc`, () => {
                const state = freshState(speed);
                const obstacle = { x: 600, id: 0, role };
                state.obstacles.push(obstacle);
                placePickups(state, [obstacle], 600 + ROLE_SHAPES[role].width, 0, true, always);
                const arc = state.pickups.length;
                expect(arc).toBe(5);

                // Take off so the top of the jump (20 frames up) is over the block's middle.
                const centre = obstacle.x + ROLE_SHAPES[role].width / 2;
                const takeOff = Math.round((centre - RUNNER_MID_X) / (speed / 60)) - 20;
                let hits = 0;
                for (let f = 0; f < 240; f++) {
                    if (f === takeOff) jump(state);
                    if (step(state)) hits++;
                }
                expect(hits).toBe(0);
                expect(state.pickups.length).toBe(0);
                expect(state.score).toBe(arc + 1); // the arc, and the block cleared
            });
        }
    }

    it('running along the ground under an arc collects none of it', () => {
        const state = freshState(300);
        state.player.hurtTimer = 100; // so walking into the block doesn't matter here
        const obstacle = { x: 600, id: 0, role: 'small' as const };
        placePickups(state, [obstacle], 628, 0, true, always);
        for (let f = 0; f < 240; f++) step(state);
        expect(state.score).toBe(0);
    });

    it('two blocks one jump clears share one arc', () => {
        const state = freshState(300);
        const pair = [{ x: 600, id: 0, role: 'small' as const }, { x: 645, id: 1, role: 'small' as const }];
        placePickups(state, pair, 673, 0, true, always);
        expect(state.pickups.length).toBe(5);
    });

    it('no arc over a purple sphere or a bar', () => {
        const state = freshState(300);
        placePickups(state, [{ x: 600, id: 0, role: 'mover' }, { x: 900, id: 1, role: 'overhead' }], 928, 0, true, always);
        expect(state.pickups.length).toBe(0);
    });
});

describe('ground trails', () => {
    it('running straight through a trail collects all of it', () => {
        const state = freshState(300);
        placePickups(state, [{ x: 400, id: 0, role: 'overhead' }], 428, 1.5, false, always);
        const trail = state.pickups.length;
        expect(trail).toBeGreaterThanOrEqual(3);
        state.obstacles = [];
        for (let f = 0; f < 300; f++) step(state);
        expect(state.pickups.length).toBe(0);
        expect(state.score).toBe(trail);
    });

    it('a ducking runner still collects it', () => {
        const state = freshState(300);
        placePickups(state, [], 200, 1.5, false, always);
        state.player.isDucking = true;
        state.player.duckHeld = true;
        state.player.duckTimer = 10;
        for (let f = 0; f < 300; f++) step(state);
        expect(state.pickups.length).toBe(0);
    });

    it('a rest with a heart in it gets no trail', () => {
        const state = freshState(300);
        placePickups(state, [], 200, 1.5, true, always);
        expect(state.pickups.length).toBe(0);
    });

    it('a short rest gets no trail', () => {
        const state = freshState(300);
        placePickups(state, [], 200, 0.9, false, always);
        expect(state.pickups.length).toBe(0);
    });
});

describe('a whole stage of spawned pickups', () => {
    STAGES.forEach((stage) => {
        it(`${stage.name}: plenty of pickups, and none inside an obstacle`, () => {
            const state = createInitialState();
            state.stageId = stage.id;
            let seed = 7;
            const random = () => {
                seed = (seed * 1664525 + 1013904223) % 4294967296;
                return seed / 4294967296;
            };
            const frames = Math.round(stage.durationSec * 60);
            let placed = 0;
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
        state.obstacles.push({ x: 30, id: 0, role: 'small' }); // just about to pass the runner
        for (let f = 0; f < 10; f++) step(state);
        expect(state.streak).toBe(10);
        expect(state.score).toBe(2);
    });

    it('a hit resets it, and the obstacle brushed straight after does not count', () => {
        const state = freshState(260);
        state.streak = 30;
        state.obstacles.push({ x: 300, id: 0, role: 'small' }, { x: 404, id: 1, role: 'small' });
        for (let f = 0; f < 240; f++) step(state);
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
