/**
 * Pausing a run: when it's allowed, that the stage clock stands still while paused, and
 * that the 3-2-1 puts play back exactly where it stopped.
 */
import {
    canPause, cancelResume, countdownLeft, isCountingDown, pauseRun, RESUME_COUNTDOWN_SEC,
    startResume, tickPause,
} from '../pause';
import { createInitialState, GameState } from '../state';

/** A run that started at t=1000 (Unix seconds) and is going. */
const running = (): GameState => {
    const state = createInitialState();
    state.gameStarted = true;
    state.stageStartTime = 1000;
    return state;
};

/** Seconds into the stage at `now`, the way the game loop works it out. */
const elapsed = (state: GameState, now: number) => now - state.stageStartTime;

describe('when a run can be paused', () => {
    it('only while a stage is being played', () => {
        expect(canPause(running())).toBe(true);
        expect(canPause(createInitialState())).toBe(false); // the title screen

        const over = running();
        over.gameOver = true;
        expect(canPause(over)).toBe(false);

        const clear = running();
        clear.stageStatus = 'exhausted';
        clear.showContinue = true;
        expect(canPause(clear)).toBe(false);
    });

    it('not twice', () => {
        const state = running();
        expect(pauseRun(state, 1010)).toBe(true);
        expect(pauseRun(state, 1020)).toBe(false);
        expect(state.pausedAt).toBe(1010);
    });
});

describe('the stage clock', () => {
    it('stands still while paused, and carries on from the same moment after the 3-2-1', () => {
        const state = running();
        pauseRun(state, 1030); // 30 sec in
        // A minute later, RESUME.
        expect(tickPause(state, 1090)).toBe(false);
        startResume(state, 1090);
        expect(isCountingDown(state)).toBe(true);
        // Still counting: nothing moves yet.
        expect(tickPause(state, 1090 + RESUME_COUNTDOWN_SEC - 0.01)).toBe(false);
        expect(state.paused).toBe(true);
        // The count runs out: play carries on exactly 30 sec in.
        const back = 1090 + RESUME_COUNTDOWN_SEC;
        expect(tickPause(state, back)).toBe(true);
        expect(state.paused).toBe(false);
        expect(elapsed(state, back)).toBeCloseTo(30);
        expect(elapsed(state, back + 5)).toBeCloseTo(35);
    });

    it('nothing happens without RESUME, however long it waits', () => {
        const state = running();
        pauseRun(state, 1030);
        expect(tickPause(state, 99999)).toBe(false);
        expect(state.paused).toBe(true);
    });

    it('several pauses add up', () => {
        const state = running();
        pauseRun(state, 1010);
        startResume(state, 1020);
        tickPause(state, 1020 + RESUME_COUNTDOWN_SEC);
        pauseRun(state, 1040 + RESUME_COUNTDOWN_SEC);
        startResume(state, 1100);
        tickPause(state, 1100 + RESUME_COUNTDOWN_SEC);
        // 10 sec of play, a pause, 20 more, a pause: 30 sec in.
        expect(elapsed(state, 1100 + RESUME_COUNTDOWN_SEC)).toBeCloseTo(30);
    });
});

describe('the 3-2-1', () => {
    it('counts 3, 2, 1', () => {
        const state = running();
        pauseRun(state, 1010);
        startResume(state, 2000);
        expect(countdownLeft(state, 2000)).toBe(3);
        expect(countdownLeft(state, 2001.2)).toBe(2);
        expect(countdownLeft(state, 2002.5)).toBe(1);
    });

    it('only starts when paused, and only once', () => {
        const state = running();
        expect(startResume(state, 1010)).toBe(false);
        pauseRun(state, 1010);
        expect(startResume(state, 1020)).toBe(true);
        expect(startResume(state, 1021)).toBe(false);
        expect(state.resumeAt).toBe(1020 + RESUME_COUNTDOWN_SEC);
    });

    it('stopped part-way (the app went to the background) leaves it plainly paused', () => {
        const state = running();
        pauseRun(state, 1030);
        startResume(state, 1040);
        cancelResume(state);
        expect(isCountingDown(state)).toBe(false);
        expect(tickPause(state, 99999)).toBe(false);
        // A fresh RESUME later still carries on from the original moment.
        startResume(state, 1200);
        tickPause(state, 1200 + RESUME_COUNTDOWN_SEC);
        expect(elapsed(state, 1200 + RESUME_COUNTDOWN_SEC)).toBeCloseTo(30);
    });
});
