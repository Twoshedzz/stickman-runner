import { BASE_SPEED, GRAVITY, GROUND_HEIGHT, JUMP_FORCE, OBSTACLE_SIZE, PLAYER_SIZE, PLAYER_X, SCREEN_HEIGHT } from '../constants';
import { GameState } from '../state';

export const applyPhysics = (state: GameState) => {
    const { player, obstacles } = state;

    // Player Gravity
    player.dy += GRAVITY;
    player.y += player.dy;

    // Ground Collision
    const groundY = SCREEN_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE;
    if (player.y >= groundY) {
        player.y = groundY;
        player.dy = 0;
        player.isGrounded = true;
        player.jumpCount = 0; // Reset jumps
    } else {
        player.isGrounded = false;
    }

    // Move Obstacles
    obstacles.forEach(obs => {
        obs.x -= BASE_SPEED;

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
    // Allow jump if grounded OR (not grounded AND jumpCount < 2)
    if (state.player.isGrounded || state.player.jumpCount < 2) {
        state.player.dy = JUMP_FORCE;
        state.player.isGrounded = false;
        state.player.jumpCount += 1;
    }
};
