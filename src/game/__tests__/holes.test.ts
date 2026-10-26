import { HIT_GRACE_SEC, MAX_HEALTH, PLAYER_SIZE, PLAYER_X, RUNNER_GROUND_Y } from '../constants';
import { ROLE_SHAPES } from '../obstacleCatalogue';
import { createInitialState, GameState } from '../state';
import { checkCollisions } from '../systems/collisions';
import { FALL_SEC } from '../systems/holes';
import { applyPhysics, jump, startDuck } from '../systems/physics';

const DT = 1 / 60;
const SPEED = 280;
const GROUND = RUNNER_GROUND_Y - PLAYER_SIZE;

/** A runner with a hole coming, its front edge `aheadPx` past his feet. */
const withHole = (aheadPx = 60): GameState => {
    const state = createInitialState();
    state.gameStarted = true;
    state.speed = SPEED;
    state.obstacles.push({ id: 1, role: 'hole', x: PLAYER_X + PLAYER_SIZE / 2 + aheadPx });
    return state;
};

/** Play frames the way the game loop does; how many of them started a hit. */
const play = (state: GameState, frames: number, each?: (frame: number) => void) => {
    let hits = 0;
    for (let f = 0; f < frames; f++) {
        each?.(f);
        applyPhysics(state, DT);
        if (checkCollisions(state)) hits++;
    }
    return hits;
};

describe('holes in the floor', () => {
    it('running onto one drops the runner in, a hit like any other', () => {
        const state = withHole();
        const hits = play(state, 30);
        expect(hits).toBe(1);
        expect(state.player.falling).toBeGreaterThan(0);
        expect(state.player.health).toBe(MAX_HEALTH - ROLE_SHAPES.hole.damage);
        expect(state.streak).toBe(0);
    });

    it('he goes down with the hole, out of sight below the floor', () => {
        const state = withHole();
        play(state, 30);
        const startDrift = state.player.fallDrift;
        play(state, 20);
        expect(state.player.fallDrift).toBeGreaterThan(startDrift);
        expect(state.player.y).toBeGreaterThan(RUNNER_GROUND_Y);
    });

    it('then he is put back on the running line, safe for a moment', () => {
        const state = withHole();
        play(state, 30);
        let frames = 0;
        while (state.player.falling > 0 && frames < 120) {
            play(state, 1);
            frames++;
        }
        expect(frames / 60).toBeLessThanOrEqual(FALL_SEC);
        expect(state.player.falling).toBe(0);
        expect(state.player.fallDrift).toBe(0);
        expect(state.player.y).toBe(GROUND);
        expect(state.player.isGrounded).toBe(true);
        expect(state.player.hurtTimer).toBeGreaterThan(HIT_GRACE_SEC - 0.1);
        expect(state.gameOver).toBe(false);
    });

    it("can't jump or duck out of it", () => {
        const state = withHole();
        play(state, 30);
        jump(state);
        startDuck(state);
        expect(state.player.dy).toBeGreaterThan(-12);
        expect(state.player.isDucking).toBe(false);
    });

    it('a jump in time clears it', () => {
        const state = withHole(60);
        // Take off as the hole's front edge is about to reach the feet.
        const hits = play(state, 120, (f) => { if (f === 5) jump(state); });
        expect(hits).toBe(0);
        expect(state.player.health).toBe(MAX_HEALTH);
    });

    it('ducking does not help', () => {
        const state = withHole();
        const hits = play(state, 30, () => startDuck(state, true));
        expect(hits).toBe(1);
    });

    it('the last of the health ends the run, after the drop', () => {
        const state = withHole();
        state.player.health = ROLE_SHAPES.hole.damage;
        play(state, 30);
        expect(state.gameOver).toBe(false);
        play(state, Math.ceil(FALL_SEC * 60) + 1);
        expect(state.gameOver).toBe(true);
    });

    it('in the safe moment after a hit, he runs straight across', () => {
        const state = withHole();
        state.player.hurtTimer = HIT_GRACE_SEC;
        const hits = play(state, 40);
        expect(hits).toBe(0);
        expect(state.player.falling).toBe(0);
    });

    it('only the rim under the feet on landing does not count', () => {
        // Landing with the feet just short of the far rim: past the margin, so no fall.
        const state = withHole(-ROLE_SHAPES.hole.width + 10);
        const hits = play(state, 10);
        expect(hits).toBe(0);
    });
});

/** A runner with a void coming at `speed`, its front edge `aheadPx` past his feet, energy full. */
const withVoid = (speed: number, aheadPx = 60): GameState => {
    const state = withHole(aheadPx);
    state.speed = speed;
    state.obstacles[0].role = 'void';
    return state;
};

/** The wide gap: too far for one jump at any speed, a double jump gets across. */
describe('voids', () => {
    it('running onto one drops the runner in, and costs more than a hole', () => {
        const state = withVoid(300);
        const hits = play(state, 30);
        expect(hits).toBe(1);
        expect(state.player.health).toBe(MAX_HEALTH - ROLE_SHAPES.void.damage);
        expect(ROLE_SHAPES.void.damage).toBeGreaterThan(ROLE_SHAPES.hole.damage);
    });

    it('he is only put back once the gap has gone by, never standing over it', () => {
        const state = withVoid(290);
        play(state, 30);
        let frames = 0;
        while (state.player.falling > 0 && frames < 240) {
            play(state, 1);
            frames++;
        }
        expect(state.player.falling).toBe(0);
        const gap = state.obstacles[0];
        const feetX = PLAYER_X + PLAYER_SIZE / 2;
        expect(feetX).toBeGreaterThanOrEqual(gap.x + ROLE_SHAPES.void.width - 14);
        // The safe moment still starts as he's put back.
        expect(state.player.hurtTimer).toBeGreaterThan(HIT_GRACE_SEC - 0.1);
    });

    for (const speed of [290, 300, 360]) {
        it(`no single jump gets across at ${speed} px/sec`, () => {
            for (let takeOff = 0; takeOff < 40; takeOff++) {
                const state = withVoid(speed, 120);
                const hits = play(state, 150, (f) => { if (f === takeOff) jump(state); });
                expect(hits).toBe(1);
            }
        });

        it(`a double jump does, at ${speed} px/sec`, () => {
            let clears = 0;
            for (let takeOff = 0; takeOff < 40; takeOff++) {
                for (const second of [12, 16, 20, 24, 28]) {
                    const state = withVoid(speed, 120);
                    const hits = play(state, 150, (f) => {
                        if (f === takeOff || f === takeOff + second) jump(state);
                    });
                    if (hits === 0) clears++;
                }
            }
            // Not one lucky frame: several take-off moments work.
            expect(clears).toBeGreaterThan(10);
        });
    }
});
