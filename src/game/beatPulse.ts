/**
 * The beat pulse: a band of light that rolls up the floor in time with the music, crossing the
 * runner's line exactly on the beat (step 9 in docs/PROJECT_PLAN.md).
 *
 * Like the title screen's grid pulse, it travels from the front edge of the floor back to the
 * horizon. It rolls on every beat in the slower stages, and on every other beat where the music
 * is faster (`beat.pulseEvery` in stages.ts). Everything here runs on the stage clock, which
 * follows the music (musicSync.ts), so the pulse stays in time.
 */
import { GROUND_HEIGHT, RUNNER_GROUND_Y, SCREEN_HEIGHT } from './constants';
import type { StageConfig } from './stages';

/** How long the band takes to roll from the front of the floor to the horizon. */
export const PULSE_TRAVEL_SEC = 0.5;

/** The floor, top to bottom: the horizon line and the front edge. */
const FLOOR_TOP = SCREEN_HEIGHT - GROUND_HEIGHT;
const FLOOR_BOTTOM = SCREEN_HEIGHT;

/** How far up the floor the runner's line is, from the front edge (0) to the horizon (1). */
const RUNNER_AT = (FLOOR_BOTTOM - RUNNER_GROUND_Y) / (FLOOR_BOTTOM - FLOOR_TOP);

/** Seconds between pulses. */
export const pulseSec = (stage: StageConfig) => stage.beat.sec * (stage.beat.pulseEvery ?? 1);

/** The stage time of the pulse nearest `stageSec`: when it crosses the runner's line. */
export const nearestPulseSec = (stage: StageConfig, stageSec: number) => {
    const every = pulseSec(stage);
    const n = Math.round((stageSec - stage.beat.firstSec) / every);
    return stage.beat.firstSec + Math.max(0, n) * every;
};

/**
 * Where the band is at `stageSec`: its height on screen and how bright it is (fading in at the
 * front of the floor and out at the horizon), or null between pulses.
 */
export const pulseBand = (stage: StageConfig, stageSec: number): { y: number; strength: number } | null => {
    const every = pulseSec(stage);
    // The pulse whose roll covers this moment: it starts RUNNER_AT of the way before its beat.
    const n = Math.floor((stageSec - stage.beat.firstSec + RUNNER_AT * PULSE_TRAVEL_SEC) / every);
    if (n < 0) return null;
    const beatSec = stage.beat.firstSec + n * every;
    const along = (stageSec - beatSec) / PULSE_TRAVEL_SEC + RUNNER_AT;
    if (along < 0 || along > 1) return null;
    const y = FLOOR_BOTTOM - along * (FLOOR_BOTTOM - FLOOR_TOP);
    // Quick to come up, brightest as it crosses the runner, fading as it nears the horizon.
    const strength = Math.min(1, along / 0.15, (1 - along) / 0.3);
    return { y, strength };
};
