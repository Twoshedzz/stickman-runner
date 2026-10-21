import { BASE_SPEED, DUCK_DURATION_SEC, ENERGY_REGEN, GRAVITY, JUMP_ENERGY_COST, JUMP_FORCE, MAX_ENERGY, PLAYER_SIZE, PLAYER_X, RUNNER_GROUND_Y } from '../constants';
import { frameScale } from '../frame';
import { spriteFor } from '../obstacleCatalogue';
import { spawnParticles } from '../particles';
import { GameState } from '../state';

/** deltaTimeSec: seconds since last frame (used so movement stays in sync with real time) */
export const applyPhysics = (state: GameState, deltaTimeSec: number) => {
    const { player, obstacles } = state;
    const scale = frameScale(deltaTimeSec);

    // Ducking runs down in real seconds, and is cancelled the moment the runner leaves the ground.
    if (player.isDucking) {
        player.duckTimer -= deltaTimeSec;
        if (player.duckTimer <= 0 || !player.isGrounded) {
            player.isDucking = false;
            player.duckTimer = 0;
        }
    }

    // Player vertical physics: scale by time so jump duration and height are the same at any frame rate
    player.dy += GRAVITY * scale;
    player.y += player.dy * scale;

    // Distance is now driven by time in the game loop (see STAGE_DESIGN.md)

    // Ground Collision (runner stands on grid, below pink line)
    const groundY = RUNNER_GROUND_Y - PLAYER_SIZE;
    if (player.y >= groundY) {
        // Landing Event
        if (!player.isGrounded) {
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

    // Move Obstacles (scale by deltaTime so movement is in sync with real time)
    obstacles.forEach(obs => {
        let speed = BASE_SPEED;
        if (obs.role === 'mover') {
            obs.phase = (obs.phase || 0) + 0.1 * scale;
            speed += Math.cos(obs.phase) * 3;
        }
        obs.x -= speed * scale;

        // Score Logic: use this obstacle's real width, so wide ones score when they
        // have actually gone past rather than when a 40px box would have.
        const obsRight = obs.x + spriteFor(state.stageId, obs.sprite ?? 0).width;
        // Check if obstacle has passed the player (player's left side is at PLAYER_X)
        // We use PLAYER_X here. If obstacle right side < PLAYER_X, it's passed.
        // We need to track if it's already been scored.
        if (!obs.passed && obsRight < PLAYER_X) {
            state.score += 1;
            obs.passed = true;
        }
    });

    // Remove off-screen obstacles
    state.obstacles = obstacles.filter(obs => obs.x + spriteFor(state.stageId, obs.sprite ?? 0).width > 0);
};

/** Duck under an overhead bar. Grounded only, and free: it must not compete with the double jump. */
export const startDuck = (state: GameState) => {
    const { player } = state;
    if (!player.isGrounded) return;
    player.isDucking = true;
    player.duckTimer = DUCK_DURATION_SEC;
};

export const jump = (state: GameState) => {
    const { isGrounded, jumpCount } = state.player;

    // 1. Grounded Jump (Always allowed, no energy cost)
    if (isGrounded) {
        state.player.isDucking = false; // can't be crouched and airborne at once
        state.player.duckTimer = 0;
        state.player.dy = JUMP_FORCE;
        state.player.isGrounded = false;
        state.player.jumpCount = 1;
        // No dust for normal jumps
        return;
    }

    // 2. Air Jump (Double Jump - Costs Energy)
    if (jumpCount < 2 && state.energy >= JUMP_ENERGY_COST) {
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
    }
};
