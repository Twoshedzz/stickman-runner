import { SCREEN_WIDTH } from '../constants';
import { ObstacleRole } from '../obstacleCatalogue';
import { getDifficultyAtDistance, StageConfig } from '../stages';
import { GameState } from '../state';

let nextId = 0;

export const spawnObstacle = (state: GameState, currentStage: StageConfig) => {
    // Difficulty from 30s segments, keyed by distance so it matches scroll progression
    const difficulty = getDifficultyAtDistance(currentStage, state.distance);
    const { spawnRate, allowedObstacles, allowDoubleSpawns } = difficulty;

    // Convert spawnRate (ms) to distance/frames approx
    // Faster speed = cover distance faster
    // Basic logic: Higher speed needs more distance between spawns
    const speed = difficulty.baseSpeed;
    const minDist = speed * 60 * (spawnRate / 1000) * 0.8; // 80% variances
    const maxDist = speed * 60 * (spawnRate / 1000) * 1.2;

    // Check last obstacle
    const lastObstacle = state.obstacles[state.obstacles.length - 1];
    const lastX = lastObstacle ? lastObstacle.x : -Infinity;

    // If no obstacles yet, spawn one immediately (safely)
    if (state.obstacles.length === 0) {
        const first = allowedObstacles.find((r) => r !== 'heart') ?? 'small';
        state.obstacles.push({
            x: SCREEN_WIDTH + 200,
            id: nextId++,
            role: first,
        });
        return;
    }

    // Only spawn if enough distance has passed
    if (lastX < SCREEN_WIDTH - minDist) {
        // Chance to spawn
        // We use a simplified probability or just checking limits
        // Here we spawn if we pass maxDist OR random chance after minDist
        const shouldSpawn = (lastX < SCREEN_WIDTH - maxDist) || (Math.random() < 0.05);

        if (shouldSpawn) {
            // Pick what it does first, then which of that role's drawings to use.
            let role: ObstacleRole = 'small';
            if (allowedObstacles.includes('heart') && Math.random() < 0.1) {
                role = 'heart';
            } else {
                const available = allowedObstacles.filter((r) => r !== 'heart');
                if (available.length > 0) {
                    role = available[Math.floor(Math.random() * available.length)];
                }
            }

            state.obstacles.push({
                x: SCREEN_WIDTH,
                id: nextId++,
                role,
                phase: role === 'mover' ? Math.random() * Math.PI : undefined,
            });

            // Double Obstacle Logic (Energy Gated; cooldown ~4s at baseSpeed 5 so energy can replenish)
            if (allowDoubleSpawns && state.distance - state.lastDoubleObstacleDistance > 1200) {
                // 20% Chance for a double obstacle
                if (Math.random() < 0.2) {
                    // Second obstacle: only the easy roles, and never a bus right behind
                    // something else. At most one heart per pair.
                    const simpleRoles = allowedObstacles.filter(
                        (r) => r === 'small' || r === 'large' || r === 'heart'
                    );
                    const allowHeartInSecond = role !== 'heart' && (Math.random() < 0.15);
                    const secondPool = allowHeartInSecond
                        ? simpleRoles
                        : simpleRoles.filter((r) => r !== 'heart');
                    if (secondPool.length > 0) {
                        const secondRole = secondPool[Math.floor(Math.random() * secondPool.length)];

                        state.obstacles.push({
                            x: SCREEN_WIDTH + 100, // Close gap!
                            id: nextId++,
                            role: secondRole,
                        });

                        state.lastDoubleObstacleDistance = state.distance;
                    }
                }
            }
        }
    }

    // Cleanup
    if (state.obstacles.length > 20) {
        state.obstacles.shift();
    }
};

export const resetSpawner = () => {
    nextId = 0;
};
