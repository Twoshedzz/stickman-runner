import { BASE_SPEED, ENERGY_REGEN, GRAVITY, GROUND_HEIGHT, JUMP_ENERGY_COST, JUMP_FORCE, MAX_ENERGY, OBSTACLE_SIZE, PLAYER_SIZE, PLAYER_X, SCREEN_HEIGHT } from '../constants';
import { spawnParticles } from '../particles';
import { GameState } from '../state';

/** deltaTimeSec: seconds since last frame (used so movement stays in sync with real time) */
export const applyPhysics = (state: GameState, deltaTimeSec: number) => {
    const { player, obstacles } = state;
    const scale = Math.max(0.001, deltaTimeSec * 60); // 60 = nominal fps so at 60fps scale=1

    // Player Gravity
    player.dy += GRAVITY;
    player.y += player.dy;

    // Distance is now driven by time in the game loop (see STAGE_DESIGN.md)

    // Ground Collision
    const groundY = SCREEN_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE;
    if (player.y >= groundY) {
        // Landing Event
        if (!player.isGrounded) {
            // More particles, slower speed for cloud effect, drifting left
            state.particles = spawnParticles(
                state.particles,
                PLAYER_X + PLAYER_SIZE / 2,
                groundY + PLAYER_SIZE,
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
        state.energy = Math.min(state.energy + ENERGY_REGEN, MAX_ENERGY);

        // Run Dust
        if (Math.random() < 0.4) {
            // Gravitate left to show speed, smaller size (2)
            state.particles = spawnParticles(
                state.particles,
                PLAYER_X,
                groundY + PLAYER_SIZE,
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
        if (obs.type === 'boulder') {
            obs.phase = (obs.phase || 0) + 0.1;
            speed += Math.cos(obs.phase) * 3;
        }
        obs.x -= speed * scale;

        // Score Logic
        const obsRight = obs.x + OBSTACLE_SIZE;
        // Check if obstacle has passed the player (player's left side is at PLAYER_X)
        // We use PLAYER_X here. If obstacle right side < PLAYER_X, it's passed.
        // We need to track if it's already been scored.
        if (!obs.passed && obsRight < PLAYER_X) {
            state.score += 1;
            obs.passed = true;
        }
    });

    // Remove off-screen obstacles
    state.obstacles = obstacles.filter(obs => obs.x + OBSTACLE_SIZE > 0);
};

export const jump = (state: GameState) => {
    const { isGrounded, jumpCount } = state.player;

    // 1. Grounded Jump (Always allowed, no energy cost)
    if (isGrounded) {
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
