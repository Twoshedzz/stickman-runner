import { DUCK_DURATION_SEC, DUCK_RELEASE_SEC, ENERGY_REGEN, GRAVITY, JUMP_BUFFER_SEC, JUMP_ENERGY_COST, JUMP_FORCE, MAX_ENERGY, PLAYER_SIZE, PLAYER_X, RUNNER_GROUND_Y } from '../constants';
import { frameScale } from '../frame';
import { shapeFor } from '../obstacleCatalogue';
import { spawnParticles } from '../particles';
import { clearedObstacle } from '../pickups';
import { isFalling, updateFall } from './holes';
import { GameState } from '../state';

/**
 * Where obstacles are dropped, in play-area pixels. The widest screens (about 3:1) show
 * roughly 225px to the left of the play area; this leaves room to spare.
 */
const OFFSCREEN_LEFT_X = -300;

/** How long the grid glow under the runner takes to fade after landing. */
const LAND_GLOW_SEC = 0.5;

/** deltaTimeSec: seconds since last frame (used so movement stays in sync with real time) */
export const applyPhysics = (state: GameState, deltaTimeSec: number) => {
    const { player } = state;
    const scale = frameScale(deltaTimeSec);

    player.jumpBuffer = Math.max(0, player.jumpBuffer - deltaTimeSec);
    player.hurtTimer = Math.max(0, player.hurtTimer - deltaTimeSec);
    player.landGlow = Math.max(0, player.landGlow - deltaTimeSec / LAND_GLOW_SEC);

    // Ducking runs down in real seconds, and is cancelled the moment the runner leaves the ground.
    // While it's held the timer can't run out, so letting go leaves at least a moment's duck,
    // and a quick swipe still gets the full duck.
    if (player.isDucking) {
        player.duckTimer -= deltaTimeSec;
        if (player.duckHeld) player.duckTimer = Math.max(player.duckTimer, DUCK_RELEASE_SEC);
        if (player.duckTimer <= 0 || !player.isGrounded) {
            player.isDucking = false;
            player.duckTimer = 0;
            player.duckHeld = false;
        }
    }

    // Dropping into a hole: no running or jumping until he's put back on the line.
    if (isFalling(state)) {
        updateFall(state, deltaTimeSec, scale, (state.speed / 60) * scale);
    } else {
        runAndJump(state, scale);
    }

    moveWorld(state, scale);
};

/** The runner's own movement: gravity, landing, and what happens with his feet on the ground. */
const runAndJump = (state: GameState, scale: number) => {
    const { player } = state;
    // Player vertical physics: scale by time so jump duration and height are the same at any frame rate
    player.dy += GRAVITY * scale;
    player.y += player.dy * scale;

    // Distance is now driven by time in the game loop (see STAGE_DESIGN.md)

    // Ground Collision (runner stands on grid, below pink line)
    const groundY = RUNNER_GROUND_Y - PLAYER_SIZE;
    if (player.y >= groundY) {
        // Landing Event
        if (!player.isGrounded) {
            // The grid lights up under his feet. Obstacles arrive on the beat, so landings
            // tend to fall on it too, and the grid pulses in time with the music.
            player.landGlow = 1;
            // More particles, slower speed for cloud effect, drifting left
            state.particles = spawnParticles(
                state.particles,
                PLAYER_X + PLAYER_SIZE / 2,
                RUNNER_GROUND_Y,
                'white',
                20,
                4,
                undefined,
                { x: -3, y: -1 } // Drift Left
            );
        }

        player.y = groundY;
        player.dy = 0;
        player.isGrounded = true;
        player.jumpCount = 0; // Reset jumps

        // A tap made just before landing jumps now, rather than being lost.
        if (player.jumpBuffer > 0) {
            player.jumpBuffer = 0;
            jump(state);
        }

        // Energy Regen
        state.energy = Math.min(state.energy + ENERGY_REGEN * scale, MAX_ENERGY);

        // Run Dust
        if (Math.random() < 0.4) {
            // Gravitate left to show speed, smaller size (2)
            state.particles = spawnParticles(
                state.particles,
                PLAYER_X,
                RUNNER_GROUND_Y,
                'rgba(255,255,255,0.6)',
                3,
                1,
                undefined,
                { x: -4, y: -0.5 },
                2 // Smaller size
            );
        }
    } else {
        player.isGrounded = false;
    }
};

/** Everything else moves left with the world. */
const moveWorld = (state: GameState, scale: number) => {
    const { obstacles } = state;
    // Move Obstacles (scale by deltaTime so movement is in sync with real time)
    obstacles.forEach(obs => {
        let speed = state.speed / 60; // pixels per 60fps frame
        if (shapeFor(obs.role).moves) {
            obs.phase = (obs.phase || 0) + 0.1 * scale;
            speed += Math.cos(obs.phase) * 3;
        }
        obs.x -= speed * scale;

        // Score Logic: use this obstacle's real width, so wide ones score when they
        // have actually gone past rather than when a 40px box would have.
        const obsRight = obs.x + shapeFor(obs.role).width;
        // Check if obstacle has passed the player (player's left side is at PLAYER_X)
        // We use PLAYER_X here. If obstacle right side < PLAYER_X, it's passed.
        // We need to track if it's already been scored.
        if (!obs.passed && obsRight < PLAYER_X) {
            obs.passed = true;
            // A missed heart isn't an obstacle cleared, and one brushed straight after a hit
            // wasn't cleanly cleared.
            if (!shapeFor(obs.role).heals && !obs.grazed) clearedObstacle(state);
        }
    });

    // Pickups ride along with the world.
    const pickupStep = (state.speed / 60) * scale;
    state.pickups.forEach(p => { p.x -= pickupStep; });
    state.pickups = state.pickups.filter(p => p.x > OFFSCREEN_LEFT_X);

    // Remove obstacles once they're off the screen. On a wide phone the screen reaches well
    // to the left of the 600px play area, so wait until they're past even the widest one;
    // removing them at 0 made them vanish in plain sight.
    state.obstacles = obstacles.filter(obs => obs.x + shapeFor(obs.role).width > OFFSCREEN_LEFT_X);
};

/**
 * Duck under an overhead bar. Grounded only, and free: it must not compete with the double jump.
 * With `hold`, the runner stays down until releaseDuck() — for a finger kept on the screen
 * after a swipe, or the ↓ key held down — so two bars in a row can be ducked in one go.
 */
export const startDuck = (state: GameState, hold = false) => {
    const { player } = state;
    if (!player.isGrounded || isFalling(state)) return;
    player.isDucking = true;
    player.duckTimer = DUCK_DURATION_SEC;
    player.duckHeld = hold;
};

/** The finger lifted or the key came up: stand up shortly, rather than straight away. */
export const releaseDuck = (state: GameState) => {
    state.player.duckHeld = false;
};

export const jump = (state: GameState) => {
    const { isGrounded, jumpCount } = state.player;
    if (isFalling(state)) return;

    // 1. Grounded Jump (Always allowed, no energy cost)
    if (isGrounded) {
        state.player.isDucking = false; // can't be crouched and airborne at once
        state.player.duckTimer = 0;
        state.player.duckHeld = false;
        state.player.dy = JUMP_FORCE;
        state.player.isGrounded = false;
        state.player.jumpCount = 1;
        // No dust for normal jumps
        return;
    }

    // 2. Air Jump (Double Jump - Costs Energy)
    if (jumpCount < 2 && state.energy >= JUMP_ENERGY_COST) {
        state.player.jumpBuffer = 0;
        state.player.dy = JUMP_FORCE;
        state.player.jumpCount += 1;
        state.energy -= JUMP_ENERGY_COST;
        // Cyan Burst, drifting left
        state.particles = spawnParticles(
            state.particles,
            PLAYER_X + PLAYER_SIZE / 2,
            state.player.y + PLAYER_SIZE,
            '#00ffff',
            30,
            6,
            undefined,
            { x: -3, y: 0 } // Drift Left
        );
        return;
    }

    // 3. Can't jump again in the air: remember the tap, and jump the moment we land.
    state.player.jumpBuffer = JUMP_BUFFER_SEC;
};
