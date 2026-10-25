/**
 * Neon pickups and the streak multiplier: something to do between obstacles.
 *
 * Pickups come in trails, placed by the spawner alongside each pattern, and get more
 * demanding stage by stage (`pacing.pickups` in stages.ts):
 * - ARCS trace a jump over a block or a hole, so a well-timed jump sweeps up the whole arc and an
 *   early or late one only catches some of it. Every stage.
 * - TRAILS run along the ground in the rest after a pattern. Every stage.
 * - HOPS float in mid-air in a rest: an extra jump between obstacles, which still lands in
 *   time for the next one. From stage 2.
 * - DOUBLE arcs trace a jump and double jump over a block. A plain jump only reaches the
 *   bottom of one; the top costs half the energy bar. From stage 3.
 * They are silent (decision 7): collecting one sends a few sparks flying to the score.
 *
 * Every obstacle cleared without a hit adds one to the streak, and a hit resets it. The
 * streak sets a multiplier on everything that scores.
 *
 * The paths are traced from the runner's real jump physics, frame by frame, so they match
 * the jump exactly at any speed. src/game/__tests__/pickups.test.ts plays them to check.
 */
import { GRAVITY, JUMP_FORCE, PLAYER_DUCK_HEIGHT, PLAYER_SIZE, PLAYER_X, RUNNER_GROUND_Y, SCREEN_WIDTH } from './constants';
import { moveFor, shapeFor } from './obstacleCatalogue';
import { spawnParticles } from './particles';
import { stageById, StagePacing } from './stages';
import { GameState } from './state';

/** Half the height of the diamond a pickup is drawn as. Small; the glow does the rest. */
export const PICKUP_RADIUS = 3.5;
/** How far outside the runner's box a pickup still counts as collected. Generous on purpose. */
const COLLECT_REACH = 8;

/** The stage's pickup colours. */
export const pickupColours = (stageId: string) =>
    stageById(stageId).theme.pickupColors;

/** Seconds between pickups along a ground trail. */
const TRAIL_SPACING_SEC = 0.15;
/** A trail or hop starts this long after the last obstacle, once the runner is back down... */
const AFTER_SEC = 0.4;
/** ...or longer after the wide block, whose double jump stays in the air for longer. */
const AFTER_HUGE_SEC = 0.75;
/** And ends this long before the next pattern could arrive, before the runner jumps for it. */
const BEFORE_SEC = 0.4;
/** Fewer than this isn't worth a trail. */
const TRAIL_MIN_PICKUPS = 3;
const TRAIL_CHANCE = 0.6;
const ARC_CHANCE = 0.5;
/** Blocks closer together than this are cleared by one jump, so they share one arc. */
const ONE_JUMP_SEC = 0.3;
/** A hop can start sooner than a trail: the runner can take off again the moment he lands. */
const HOP_AFTER_SEC = 0.3;
/** A hop needs at least this much choice in when to take off, so it's not a frame-perfect trick. */
const HOP_SLACK_SEC = 0.1;

const FPS = 60;
/** The double jump in a double arc comes this many frames after taking off, on the way up. */
const DOUBLE_AFTER_FRAMES = 10;
/** Frames after take-off that the pickups sit at. A plain jump peaks at frame 20. */
const ARC_FRAMES = [8, 14, 20, 26, 32];
const DOUBLE_FRAMES = [14, 20, 26, 32, 38, 44];
/** Arcs are lined up so a plain jump peaks over the block: take-off is this many frames before. */
const PEAK_FRAME = 20;

/**
 * Height above standing, frame by frame after take-off, until landing. The same steps as
 * applyPhysics and jump(), so the path is exactly where the runner goes.
 */
const flightPath = (doubleAt?: number) => {
    const heights: number[] = [];
    let dy = JUMP_FORCE;
    let h = 0;
    for (let frame = 1; frame < 200; frame++) {
        dy += GRAVITY;
        h -= dy;
        if (h <= 0) break;
        heights[frame] = h;
        if (frame === doubleAt) dy = JUMP_FORCE;
    }
    return heights;
};
const JUMP = flightPath();
const DOUBLE_JUMP = flightPath(DOUBLE_AFTER_FRAMES);
/** Seconds from take-off to landing. */
const JUMP_SEC = JUMP.length / FPS;
/** Seconds from a double arc's block centre to landing again. */
const DOUBLE_LANDS_SEC = (DOUBLE_JUMP.length - PEAK_FRAME) / FPS;

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

const blend = ([start, end]: [number, number], progress: number) =>
    start + (end - start) * progress;

/** Pickups along a flight path, for a jump that peaks (or would peak) over `peakX`. */
const placeAlong = (state: GameState, path: number[], frames: number[], peakX: number) => {
    for (const frame of frames) {
        state.pickups.push({
            id: nextId++,
            x: peakX + ((frame - PEAK_FRAME) / FPS) * state.speed,
            y: RUNNER_MID_Y - path[frame],
        });
    }
};

/**
 * Lay trails for a pattern the spawner has just placed.
 *
 * `placed` is that pattern's obstacles, `endX` its back edge, and `restSec` the clear time
 * after it, which the next pattern never arrives before. `heartPlaced` leaves the rest to the
 * heart, which sits in the middle of it.
 */
export const placePickups = (
    state: GameState,
    pacing: StagePacing,
    placed: GameState['obstacles'],
    endX: number,
    restSec: number,
    heartPlaced: boolean,
    random: () => number
) => {
    const speed = state.speed;
    const progress = state.stageProgress;
    const restEndX = endX + restSec * speed;

    // Arcs over the blocks you jump, one per jump.
    if (random() < ARC_CHANCE) {
        const groups: number[][] = [];
        for (const obs of placed) {
            if (!shapeFor(obs.role).arcsOver) continue;
            const centre = obs.x + shapeFor(obs.role).width / 2;
            const last = groups[groups.length - 1];
            if (last && centre - last[last.length - 1] < ONE_JUMP_SEC * speed) last.push(centre);
            else groups.push([centre]);
        }
        for (const centres of groups) {
            // The top of a plain jump goes over the middle of what it clears.
            const peakX = (centres[0] + centres[centres.length - 1]) / 2;
            // A double jump stays up longer: only where nothing comes before it's down again
            // and could jump or duck the next thing.
            const nextX = Math.min(
                restEndX,
                ...placed.filter((o) => o.x > centres[centres.length - 1]).map((o) => o.x)
            );
            const roomSec = (nextX - peakX) / speed;
            const double =
                random() < blend(pacing.pickups.double, progress) &&
                roomSec >= DOUBLE_LANDS_SEC + BEFORE_SEC;
            if (double) placeAlong(state, DOUBLE_JUMP, DOUBLE_FRAMES, peakX);
            else placeAlong(state, JUMP, ARC_FRAMES, peakX);
        }
    }

    if (heartPlaced) return;
    const afterHuge = moveFor(placed[placed.length - 1]?.role) === 'double';

    // A hop: an arc in mid-air through the rest, for an extra jump. Taking off anywhere in
    // the window still lands before the next pattern needs you.
    const hopAfterSec = afterHuge ? AFTER_HUGE_SEC : HOP_AFTER_SEC;
    const hopWindowSec = restSec - hopAfterSec - JUMP_SEC - BEFORE_SEC;
    if (hopWindowSec >= HOP_SLACK_SEC && random() < blend(pacing.pickups.hop, progress)) {
        const takeOffX = endX + (hopAfterSec + hopWindowSec / 2) * speed;
        placeAlong(state, JUMP, ARC_FRAMES, takeOffX + (PEAK_FRAME / FPS) * speed);
        return;
    }

    // Otherwise maybe a line along the ground.
    const afterSec = afterHuge ? AFTER_HUGE_SEC : AFTER_SEC;
    const freeSec = restSec - afterSec - BEFORE_SEC;
    if (random() >= TRAIL_CHANCE) return;
    const count = Math.floor(freeSec / TRAIL_SPACING_SEC) + 1;
    if (count < TRAIL_MIN_PICKUPS) return;
    for (let i = 0; i < count; i++) {
        state.pickups.push({
            id: nextId++,
            x: endX + (afterSec + i * TRAIL_SPACING_SEC) * speed,
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
    // A new multiplier: a burst from the runner, since there's no sound for it.
    if (multiplierFor(state.streak) > before) {
        state.particles = spawnParticles(
            state.particles,
            PLAYER_X + PLAYER_SIZE / 2,
            state.player.y + PLAYER_SIZE / 2,
            pickupColours(state.stageId).glow,
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
    // Dropping into a hole: out of reach of everything.
    if (player.falling > 0) return;
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
            pickupColours(state.stageId).glow,
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
