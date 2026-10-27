import { BEAT_BONUS_ENERGY, BEAT_BONUS_POINTS, BEAT_WINDOW_SEC, isOnBeat } from '../beatBonus';
import { nearestPulseSec, pulseSec } from '../beatPulse';
import { MAX_ENERGY, PLAYER_SIZE, PLAYER_X } from '../constants';
import { shapeFor } from '../obstacleCatalogue';
import { multiplierFor } from '../pickups';
import { speedAt, StageConfig, STAGES } from '../stages';
import { createInitialState, GameState } from '../state';
import { stepWorld } from '../step';
import { jump } from '../systems/physics';

const DT = 1 / 60;
/** A stage with a pulse on every beat, and one with a pulse on every other beat. */
const EVERY_BEAT = STAGES[0];
const EVERY_OTHER = STAGES.find((s) => (s.beat.pulseEvery ?? 1) === 2)!;

/** A runner on an empty course (nothing more spawns), at a speed partway through the stage. */
const runner = (stage: StageConfig, progress = 0.5): GameState => {
    const state = createInitialState();
    state.gameStarted = true;
    state.stageId = stage.id;
    state.distance = stage.courseLength;
    state.speed = speedAt(stage, progress);
    state.energy = 0;
    return state;
};

/** Frames from a jump to the frame the feet touch down. */
const JUMP_FRAMES = (() => {
    const state = runner(EVERY_BEAT);
    jump(state);
    for (let f = 1; f < 200; f++) {
        stepWorld(state, EVERY_BEAT, DT, { sparks: false });
        if (state.events.some((e) => e.type === 'land')) return f;
    }
    throw new Error('never landed');
})();

/**
 * Jump so the feet touch down `offsetSec` from a pulse crossing the runner's line (`beatSec`),
 * and play on a little past the landing. The stage clock runs on from just before the jump.
 */
const landAt = (state: GameState, stage: StageConfig, beatSec: number, offsetSec: number, before?: () => void) => {
    const startSec = beatSec + offsetSec - JUMP_FRAMES * DT;
    state.elapsedSecInStage = startSec;
    before?.();
    jump(state);
    let landedAt = NaN;
    for (let f = 1; f <= JUMP_FRAMES + 10; f++) {
        state.elapsedSecInStage = startSec + f * DT;
        stepWorld(state, stage, DT, { sparks: false });
        if (state.events.some((e) => e.type === 'land')) landedAt = state.elapsedSecInStage;
    }
    return landedAt;
};

/** A pulse well into the stage. */
const pulseNear = (stage: StageConfig, sec: number) => nearestPulseSec(stage, sec);

describe('the beat bonus', () => {
    it('a landing right on the pulse scores and gives energy', () => {
        const state = runner(EVERY_BEAT);
        const beat = pulseNear(EVERY_BEAT, 60);
        expect(landAt(state, EVERY_BEAT, beat, 0)).toBeCloseTo(beat, 6);
        expect(state.onBeatCount).toBe(1);
        expect(state.onBeatInStage).toBe(1);
        expect(state.score).toBe(BEAT_BONUS_POINTS);
        // A quarter of the bar, plus the little the ground gives back each frame after.
        expect(state.energy).toBeGreaterThanOrEqual(BEAT_BONUS_ENERGY);
        expect(state.energy).toBeLessThan(BEAT_BONUS_ENERGY + 10);
        expect(state.player.beatFlash).toBeGreaterThan(0);
    });

    it('just inside the window counts, early or late', () => {
        for (const offset of [-BEAT_WINDOW_SEC + 0.005, BEAT_WINDOW_SEC - 0.005]) {
            const state = runner(EVERY_BEAT);
            landAt(state, EVERY_BEAT, pulseNear(EVERY_BEAT, 60), offset);
            expect(state.onBeatCount).toBe(1);
        }
    });

    it('just outside the window does not', () => {
        for (const offset of [-BEAT_WINDOW_SEC - 0.01, BEAT_WINDOW_SEC + 0.01]) {
            const state = runner(EVERY_BEAT);
            landAt(state, EVERY_BEAT, pulseNear(EVERY_BEAT, 60), offset);
            expect(state.onBeatCount).toBe(0);
            expect(state.score).toBe(0);
            expect(state.player.beatFlash).toBe(0);
        }
    });

    it('holds at the slowest, middle and fastest speeds, in every stage', () => {
        for (const stage of STAGES) {
            for (const progress of [0, 0.5, 1]) {
                const beat = pulseNear(stage, progress * stage.durationSec * 0.9 + 10);
                const hit = runner(stage, progress);
                landAt(hit, stage, beat, 0.05);
                expect(hit.onBeatCount).toBe(1);
                const miss = runner(stage, progress);
                landAt(miss, stage, beat, BEAT_WINDOW_SEC + 0.02);
                expect(miss.onBeatCount).toBe(0);
            }
        }
    });

    it('only beats that pulse count: every other beat in the faster stages', () => {
        const pulse = pulseNear(EVERY_OTHER, 60);
        const offBeat = pulse + EVERY_OTHER.beat.sec;
        expect(pulseSec(EVERY_OTHER)).toBeCloseTo(EVERY_OTHER.beat.sec * 2, 6);
        expect(isOnBeat(EVERY_OTHER, pulse)).toBe(true);
        expect(isOnBeat(EVERY_OTHER, offBeat)).toBe(false);

        const onPulse = runner(EVERY_OTHER);
        landAt(onPulse, EVERY_OTHER, pulse, 0);
        expect(onPulse.onBeatCount).toBe(1);
        const between = runner(EVERY_OTHER);
        landAt(between, EVERY_OTHER, offBeat, 0);
        expect(between.onBeatCount).toBe(0);
        // In the slower stages that same in-between beat would have pulsed.
        expect(isOnBeat(EVERY_BEAT, pulseNear(EVERY_BEAT, 60) + EVERY_BEAT.beat.sec)).toBe(true);
    });

    it('the energy never goes above full', () => {
        const state = runner(EVERY_BEAT);
        state.energy = MAX_ENERGY - 5;
        landAt(state, EVERY_BEAT, pulseNear(EVERY_BEAT, 60), 0);
        expect(state.onBeatCount).toBe(1);
        expect(state.energy).toBe(MAX_ENERGY);
    });

    it('the points go through the streak multiplier', () => {
        const state = runner(EVERY_BEAT);
        state.streak = 25;
        landAt(state, EVERY_BEAT, pulseNear(EVERY_BEAT, 60), 0);
        expect(state.score).toBe(BEAT_BONUS_POINTS * multiplierFor(25));
    });

    it('landing in a hole does not count, even on the beat', () => {
        const state = runner(EVERY_BEAT);
        const { width } = shapeFor('hole');
        // A hole that's right under the feet when they come down.
        const atLanding = PLAYER_X + PLAYER_SIZE / 2 - width / 2;
        landAt(state, EVERY_BEAT, pulseNear(EVERY_BEAT, 60), 0, () => {
            state.obstacles.push({ id: 1, role: 'hole', x: atLanding + (state.speed / 60) * JUMP_FRAMES });
        });
        expect(state.player.falling).toBeGreaterThan(0);
        expect(state.onBeatCount).toBe(0);
        expect(state.score).toBe(0);
    });

    it('running along the ground never earns it', () => {
        const state = runner(EVERY_BEAT);
        for (let f = 0; f < 600; f++) {
            state.elapsedSecInStage = 30 + f * DT;
            stepWorld(state, EVERY_BEAT, DT, { sparks: false });
        }
        expect(state.onBeatCount).toBe(0);
    });

    it('a landing on the beat says so in the events', () => {
        const state = runner(EVERY_BEAT);
        const beat = pulseNear(EVERY_BEAT, 60);
        const startSec = beat - JUMP_FRAMES * DT;
        state.elapsedSecInStage = startSec;
        jump(state);
        const seen: string[] = [];
        for (let f = 1; f <= JUMP_FRAMES; f++) {
            state.elapsedSecInStage = startSec + f * DT;
            stepWorld(state, EVERY_BEAT, DT, { sparks: false });
            seen.push(...state.events.map((e) => e.type));
        }
        expect(seen).toEqual(['land', 'onBeat']);
    });
});
