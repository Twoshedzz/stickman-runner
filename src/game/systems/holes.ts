/**
 * Holes in the floor.
 *
 * A hole isn't hit like the other obstacles. If the runner's feet come down on one, he
 * drops into it: he stops running, goes down with the hole as the world carries it away,
 * and disappears through it. A moment later he's put back on the running line, blinking
 * through the usual safe second, a little health lighter. A hole costs health like any
 * other obstacle; it never ends the run by itself (casual, not manic), unless that health
 * was the last of it.
 *
 * Jumping is the only way past. Ducking doesn't help: the feet are still on the ground.
 * A void (the wide gap) works the same way, but only a double jump clears it, and the drop
 * lasts until it has gone by, so he's never put back standing over the gap.
 */
import { GRAVITY, HIT_GRACE_SEC, PLAYER_SIZE, PLAYER_X, RUNNER_GROUND_Y } from '../constants';
import { shapeFor } from '../obstacleCatalogue';
import { breakStreak } from '../pickups';
import { GameState } from '../state';

/** How long from dropping in to being put back on the running line. */
export const FALL_SEC = 0.7;
/**
 * The feet have to be this far inside the rim to fall in, so catching the very edge on the
 * way down from a jump doesn't count.
 */
const RIM_MARGIN = 14;
/** Where the runner's feet are, across the screen. */
const FEET_X = PLAYER_X + PLAYER_SIZE / 2;
/** A little hop as the ground goes, so the drop reads as a stumble rather than a vanish. */
const STUMBLE_DY = -4;

export const isFalling = (state: GameState) => state.player.falling > 0;

/** The gap he fell into hasn't gone by yet (only ever the case for a wide void). */
const stillOver = (state: GameState) => {
    const gap = state.obstacles.find((o) => o.id === state.player.fallHoleId);
    return !!gap && FEET_X < gap.x + shapeFor(gap.role).width - RIM_MARGIN;
};

/**
 * Feet on the ground over a hole: drop in. Called with the collision checks each frame.
 * True on the frame the runner starts to fall (it counts as a hit).
 */
export const checkHoles = (state: GameState): boolean => {
    const { player } = state;
    if (isFalling(state) || !player.isGrounded) return false;
    for (const obs of state.obstacles) {
        const { fallIn, width, damage } = shapeFor(obs.role);
        if (!fallIn || obs.passed) continue;
        if (FEET_X <= obs.x + RIM_MARGIN || FEET_X >= obs.x + width - RIM_MARGIN) continue;
        // Over it, so it isn't a clean clear whatever happens next.
        obs.grazed = true;
        // Just been hit: safe for a moment, so run straight across.
        if (player.hurtTimer > 0) continue;
        startFall(state, obs.id, damage);
        return true;
    }
    return false;
};

const startFall = (state: GameState, holeId: number, damage: number) => {
    const { player } = state;
    player.falling = FALL_SEC;
    player.fallHoleId = holeId;
    player.fallDrift = 0;
    player.isGrounded = false;
    player.isDucking = false;
    player.duckTimer = 0;
    player.duckHeld = false;
    player.jumpBuffer = 0;
    player.dy = STUMBLE_DY;
    breakStreak(state);
    if (!state.debugMode) player.health = Math.max(0, player.health - damage);
};

/**
 * One frame of the drop, in place of the usual running and jumping. `stepPx` is how far the
 * world moved this frame: the runner goes with the hole, not with the running line.
 */
export const updateFall = (state: GameState, deltaTimeSec: number, scale: number, stepPx: number) => {
    const { player } = state;
    player.falling -= deltaTimeSec;
    player.fallDrift += stepPx;
    player.dy += GRAVITY * scale;
    player.y += player.dy * scale;
    // Not back up until the gap has gone by: never put back standing over a wide void.
    if (player.falling <= 0 && stillOver(state)) player.falling = Number.EPSILON;
    if (player.falling > 0) return;

    // Back on the running line, safe for a moment, unless that was the last of the health.
    player.falling = 0;
    player.fallDrift = 0;
    player.fallHoleId = -1;
    player.y = RUNNER_GROUND_Y - PLAYER_SIZE;
    player.dy = 0;
    player.isGrounded = true;
    player.jumpCount = 0;
    player.hurtTimer = HIT_GRACE_SEC;
    if (player.health <= 0) {
        player.health = 0;
        state.gameOver = true;
    }
};
