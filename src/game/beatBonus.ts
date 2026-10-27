/**
 * The beat bonus: points and energy for landing on the beat (step 9 in docs/PROJECT_PLAN.md).
 *
 * A landing counts if the feet touch down within a short window of the beat pulse crossing
 * the runner's line (beatPulse.ts). Only beats that pulse count, so every other beat in the
 * faster stages, and the timing is the pulse's own, so the reward always matches what's on
 * screen. A drop into a hole or void never counts, even if the feet came down on the beat.
 *
 * The reward: points through the streak multiplier, like a pickup, and a quarter of the
 * energy bar. Silent (decision 7): the landing glow flashes white, the pulse flares as it
 * passes, and a few sparks fly to the score.
 *
 * Called from stepWorld (step.ts) every frame, so the pretend player earns it too.
 */
import { MAX_ENERGY, PLAYER_SIZE, PLAYER_X, RUNNER_GROUND_Y, SCREEN_WIDTH } from './constants';
import { nearestPulseSec } from './beatPulse';
import { spawnParticles } from './particles';
import { addScore } from './pickups';
import { StageConfig } from './stages';
import { GameState } from './state';

/** How far either side of the pulse crossing the runner's line a landing still counts. */
export const BEAT_WINDOW_SEC = 0.1;
/** Points for a landing on the beat, before the streak multiplier. A pickup is 1. */
export const BEAT_BONUS_POINTS = 2;
/** Energy for a landing on the beat: a quarter of the bar, never past full. */
export const BEAT_BONUS_ENERGY = MAX_ENERGY / 4;
/** How long the white flash (landing glow and pulse) takes to fade. */
const BEAT_FLASH_SEC = 0.4;
/** Sparks that fly from the feet to the score. */
const BEAT_SPARKS = 5;

/** Is this stage moment within the window of a pulse crossing the runner's line? */
export const isOnBeat = (stage: StageConfig, stageSec: number) =>
    Math.abs(stageSec - nearestPulseSec(stage, stageSec)) <= BEAT_WINDOW_SEC;

/**
 * Reward a landing on the beat, and fade the flash. Called each frame after the collision
 * checks, so a landing that drops straight into a hole is already falling and doesn't count.
 */
export const checkBeatLanding = (state: GameState, stage: StageConfig, deltaTimeSec: number) => {
    const { player } = state;
    player.beatFlash = Math.max(0, player.beatFlash - deltaTimeSec / BEAT_FLASH_SEC);
    if (!state.events.some((e) => e.type === 'land')) return;
    if (player.falling > 0 || !isOnBeat(stage, state.elapsedSecInStage)) return;

    state.onBeatCount += 1;
    state.onBeatInStage += 1;
    state.events.push({ type: 'onBeat' });
    addScore(state, BEAT_BONUS_POINTS);
    state.energy = Math.min(MAX_ENERGY, state.energy + BEAT_BONUS_ENERGY);
    player.beatFlash = 1;
    state.particles = spawnParticles(
        state.particles,
        PLAYER_X + PLAYER_SIZE / 2,
        RUNNER_GROUND_Y,
        'white',
        BEAT_SPARKS,
        3,
        { x: SCREEN_WIDTH - 60, y: 40 },
        undefined,
        3
    );
};
