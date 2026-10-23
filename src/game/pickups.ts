/**
 * Neon pickups and the streak multiplier: something to do between obstacles.
 *
 * Pickups come in trails, placed by the spawner alongside each pattern:
 * - along the ground, in the rest after a pattern, where the runner is running anyway;
 * - tracing a jump's arc over a block, so a well-timed jump sweeps up the whole arc and an
 *   early or late one only catches some of it.
 * They are silent (decision 7): collecting one sends a little burst flying to the score.
 *
 * Every obstacle cleared without a hit adds one to the streak, and a hit resets it. The
 * streak sets a multiplier on everything that scores.
 *
 * Like the patterns, placement is in SECONDS converted to pixels at the current speed, so a
 * jump arc matches the real jump at any speed. src/game/__tests__/pickups.test.ts checks it.
 */
import { GRAVITY, JUMP_FORCE, PLAYER_DUCK_HEIGHT, PLAYER_SIZE, PLAYER_X, RUNNER_GROUND_Y, SCREEN_WIDTH } from './constants';
import { ObstacleRole, shapeFor } from './obstacleCatalogue';
import { spawnParticles } from './particles';
import { GameState } from './state';

/** Neon green: no stage uses it for anything else, so it always reads as "collect me". */
export const PICKUP_COLOUR = '#39ff14';
export const PICKUP_GLOW = '#b6ff9e';
/** Half the width of the diamond a pickup is drawn as. */
export const PICKUP_RADIUS = 6;
/** How far outside the runner's box a pickup still counts as collected. Generous on purpose. */
const COLLECT_REACH = 6;

/** Seconds between pickups along a ground trail. */
const TRAIL_SPACING_SEC = 0.15;
/** A ground trail starts this long after the last obstacle, once the runner is back down... */
const TRAIL_AFTER_SEC = 0.4;
/** ...or longer after the wide block, whose double jump stays in the air for longer. */
const TRAIL_AFTER_HUGE_SEC = 0.75;
/** And ends this long before the next pattern could arrive, before the runner jumps for it. */
const TRAIL_BEFORE_SEC = 0.4;
/** Fewer than this isn't worth a trail. */
const TRAIL_MIN_PICKUPS = 3;
const TRAIL_CHANCE = 0.6;

/** Seconds either side of the top of the jump that an arc's pickups sit at. */
const ARC_OFFSETS_SEC = [-0.2, -0.1, 0, 0.1, 0.2];
const ARC_CHANCE = 0.5;
/** Blocks closer together than this are cleared by one jump, so they share one arc. */
const ONE_JUMP_SEC = 0.3;

/** A plain jump: how long it lasts and how high it goes, from the same physics the runner uses. */
const JUMP_HALF_SEC = -JUMP_FORCE / GRAVITY / 60;
const JUMP_PEAK = (JUMP_FORCE * JUMP_FORCE) / (2 * GRAVITY);

/** Where the middle of the runner is when standing. Ground trails sit here. */
const RUNNER_MID_Y = RUNNER_GROUND_Y - PLAYER_SIZE / 2;

/** The streak needed for each multiplier, highest first. */
export const STREAK_LEVELS = [
    { streak: 50, multiplier: 4 },
    { streak: 25, multiplier: 3 },
    { streak: 10, multiplier: 2 },
];

export const multiplierFor = (streak: number) =>
    STREAK_LEVELS.find((level) => streak >= level.streak)?.multiplier ?? 1;

let nextId = 0;

/** Height above the runner's standing position, `sec` seconds from the top of a plain jump. */
export const jumpHeightAt = (sec: number) =>
    Math.max(0, JUMP_PEAK * (1 - (sec / JUMP_HALF_SEC) ** 2));

/** Blocks a plain jump clears. Not the purple sphere (it wobbles) or the wide block (double jump). */
const arcsOver = (role: ObstacleRole | undefined) => role === 'small' || role === 'large';

/**
 * Lay trails for a pattern the spawner has just placed.
 *
 * `placed` is that pattern's obstacles, `endX` its back edge, and `restSec` the clear time
 * after it, which the next pattern never arrives before. `heartPlaced` leaves the rest to the
 * heart, which sits in the middle of it.
 */
export const placePickups = (
    state: GameState,
    placed: GameState['obstacles'],
    endX: number,
    restSec: number,
    heartPlaced: boolean,
    random: () => number
) => {
    const speed = state.speed;

    // Arcs over the blocks you jump, one per jump.
    if (random() < ARC_CHANCE) {
        const groups: number[][] = [];
        for (const obs of placed) {
            if (!arcsOver(obs.role)) continue;
            const centre = obs.x + shapeFor(obs.role).width / 2;
            const last = groups[groups.length - 1];
            if (last && centre - last[last.length - 1] < ONE_JUMP_SEC * speed) last.push(centre);
            else groups.push([centre]);
        }
        for (const centres of groups) {
            // The top of the jump goes over the middle of what it clears.
            const peakX = (centres[0] + centres[centres.length - 1]) / 2;
            for (const sec of ARC_OFFSETS_SEC) {
                state.pickups.push({
                    id: nextId++,
                    x: peakX + sec * speed,
                    y: RUNNER_MID_Y - jumpHeightAt(sec),
                });
            }
        }
    }

    // A line along the ground through the rest that follows.
    if (heartPlaced || random() >= TRAIL_CHANCE) return;
    const lastRole = placed[placed.length - 1]?.role;
    const after = lastRole === 'huge' ? TRAIL_AFTER_HUGE_SEC : TRAIL_AFTER_SEC;
    const count = Math.floor((restSec - after - TRAIL_BEFORE_SEC) / TRAIL_SPACING_SEC) + 1;
    if (count < TRAIL_MIN_PICKUPS) return;
    for (let i = 0; i < count; i++) {
        state.pickups.push({
            id: nextId++,
            x: endX + (after + i * TRAIL_SPACING_SEC) * speed,
            y: RUNNER_MID_Y,
        });
    }
};

/** Score something, at the current multiplier. */
export const addScore = (state: GameState, points = 1) => {
    state.score += points * multiplierFor(state.streak);
};

/** An obstacle went past without touching the runner. */
export const clearedObstacle = (state: GameState) => {
    const before = multiplierFor(state.streak);
    state.streak += 1;
    addScore(state);
    // A new multiplier: a burst of green from the runner, since there's no sound for it.
    if (multiplierFor(state.streak) > before) {
        state.particles = spawnParticles(
            state.particles,
            PLAYER_X + PLAYER_SIZE / 2,
            state.player.y + PLAYER_SIZE / 2,
            PICKUP_COLOUR,
            12,
            5
        );
    }
};

/** The runner was hit: back to no multiplier. */
export const breakStreak = (state: GameState) => {
    state.streak = 0;
};

/** Pick up anything the runner is touching. Called every frame, after collisions. */
export const collectPickups = (state: GameState) => {
    const { player } = state;
    // Ducking keeps the feet down and drops the head, as in collisions.ts.
    const top = player.isDucking ? RUNNER_GROUND_Y - PLAYER_DUCK_HEIGHT : player.y;
    const bottom = player.isDucking ? RUNNER_GROUND_Y : player.y + PLAYER_SIZE;
    const reach = PICKUP_RADIUS + COLLECT_REACH;

    let collected = false;
    state.pickups = state.pickups.filter((p) => {
        const touching =
            p.x > PLAYER_X - reach && p.x < PLAYER_X + PLAYER_SIZE + reach &&
            p.y > top - reach && p.y < bottom + reach;
        if (!touching) return true;
        collected = true;
        addScore(state);
        // A few sparks that fly up to the score.
        state.particles = spawnParticles(
            state.particles,
            p.x,
            p.y,
            PICKUP_COLOUR,
            3,
            3,
            { x: SCREEN_WIDTH - 60, y: 40 },
            undefined,
            3
        );
        return false;
    });
    return collected;
};

/** Start the numbering afresh, for a new run or a new stage. */
export const resetPickups = (state: GameState) => {
    nextId = 0;
    state.pickups = [];
};
