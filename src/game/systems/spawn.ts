import { SCREEN_WIDTH } from '../constants';
import { GameState } from '../state';

let nextId = 0;

export const spawnObstacle = (state: GameState) => {
    // 1. Guarantee first 3 obstacles for testing
    // Obstacles need to be far enough apart to be jumpable
    const MIN_DISTANCE = 400; // pixels
    const MAX_DISTANCE = 700;

    // Check last obstacle
    const lastObstacle = state.obstacles[state.obstacles.length - 1];
    const lastX = lastObstacle ? lastObstacle.x : -Infinity;

    // If no obstacles yet, spawn one immediately (with a small delay for player readiness)
    if (state.obstacles.length === 0) {
        state.obstacles.push({
            x: SCREEN_WIDTH + 200, // Start slightly offscreen
            id: nextId++,
        });
        return;
    }

    // Only spawn if enough distance has passed
    if (lastX < SCREEN_WIDTH - MIN_DISTANCE) {
        // Chance to spawn
        if (Math.random() < 0.05 || (lastX < SCREEN_WIDTH - MAX_DISTANCE)) {
            // Spawn Logic:
            // 5% Heart
            // 25% Purple
            // 70% Red
            const rand = Math.random();
            let type: 'red' | 'purple' | 'heart' = 'red';

            if (rand < 0.05) type = 'heart';
            else if (rand < 0.3) type = 'purple';

            state.obstacles.push({
                x: SCREEN_WIDTH,
                id: nextId++,
                type: type,
            });
        }
    }

    // Cleanup
    // We remove them when x + OBSTACLE_SIZE < 0 in physics.ts, so we don't need to do it here
    // But let's keep the array size manageable just in case
    if (state.obstacles.length > 20) {
        state.obstacles.shift();
    }
};

export const resetSpawner = () => {
    nextId = 0;
};
