/**
 * Pausing a run.
 *
 * The stage runs on the clock (stageStartTime), so music and sky stay in step. Pausing stops
 * that clock rather than the game loop: when play carries on, the stage's start time moves
 * on by however long it was paused, the same trick used when the app is in the background.
 *
 * Resuming isn't instant: a 3-2-1 count first, so nobody is thrown straight into an
 * obstacle. The music is rewound by the same amount and plays through the count, so it's
 * back exactly where it stopped when the run carries on.
 */
import { GameState } from './state';

/** How long the 3-2-1 lasts. */
export const RESUME_COUNTDOWN_SEC = 3;

/** Only a run that's actually going can be paused: not menus, Stage Clear or Game Over. */
export const canPause = (state: GameState) =>
    state.gameStarted &&
    !state.gameOver &&
    !state.showContinue &&
    state.stageStatus === 'playing' &&
    !state.paused;

/** Pause now. False if there's nothing to pause. */
export const pauseRun = (state: GameState, nowSec: number) => {
    if (!canPause(state)) return false;
    state.paused = true;
    state.pausedAt = nowSec;
    state.resumeAt = 0;
    return true;
};

/** Start the 3-2-1. False if not paused, or already counting. */
export const startResume = (state: GameState, nowSec: number, countdownSec = RESUME_COUNTDOWN_SEC) => {
    if (!state.paused || state.resumeAt > 0) return false;
    state.resumeAt = nowSec + countdownSec;
    return true;
};

/** Stop a 3-2-1 part-way (the app went to the background): back to plain paused. */
export const cancelResume = (state: GameState) => {
    state.resumeAt = 0;
};

/** Paused and counting down to carrying on. */
export const isCountingDown = (state: GameState) => state.paused && state.resumeAt > 0;

/** Whole seconds left on the 3-2-1, for the big number on screen. */
export const countdownLeft = (state: GameState, nowSec: number) =>
    Math.max(1, Math.ceil(state.resumeAt - nowSec));

/**
 * Called every frame while paused. Once the 3-2-1 has run out, the stage clock moves on by
 * the time spent paused and play carries on. True on the frame it does.
 */
export const tickPause = (state: GameState, nowSec: number) => {
    if (!state.paused || state.resumeAt <= 0 || nowSec < state.resumeAt) return false;
    state.stageStartTime += state.resumeAt - state.pausedAt;
    state.paused = false;
    state.pausedAt = 0;
    state.resumeAt = 0;
    return true;
};
