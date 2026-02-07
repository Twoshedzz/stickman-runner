import { SCREEN_WIDTH } from '../constants';
import { ObstacleType, StageConfig } from '../stages';
import { GameState } from '../state';

let nextId = 0;

export const spawnObstacle = (state: GameState, currentStage: StageConfig) => {
    // Difficulty from Config
    const { spawnRate, allowedObstacles, allowDoubleSpawns } = currentStage.difficulty;

    // Convert spawnRate (ms) to distance/frames approx
    // Faster speed = cover distance faster
    // Basic logic: Higher speed needs more distance between spawns
    const speed = currentStage.difficulty.baseSpeed;
    const minDist = speed * 60 * (spawnRate / 1000) * 0.8; // 80% variances
    const maxDist = speed * 60 * (spawnRate / 1000) * 1.2;

    // Check last obstacle
    const lastObstacle = state.obstacles[state.obstacles.length - 1];
    const lastX = lastObstacle ? lastObstacle.x : -Infinity;

    // If no obstacles yet, spawn one immediately (safely)
    if (state.obstacles.length === 0) {
        state.obstacles.push({
            x: SCREEN_WIDTH + 200,
            id: nextId++,
            type: allowedObstacles[0] || 'purple',
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
            // Determine Type
            let type: ObstacleType = 'purple';
            if (allowedObstacles.includes('heart') && Math.random() < 0.1) {
                type = 'heart';
            } else {
                const available = allowedObstacles.filter(t => t !== 'heart');
                if (available.length > 0) {
                    const randIndex = Math.floor(Math.random() * available.length);
                    type = available[randIndex];
                }
            }

            state.obstacles.push({
                x: SCREEN_WIDTH,
                id: nextId++,
                type: type,
                phase: type === 'boulder' ? Math.random() * Math.PI : undefined,
            });

            // Double Obstacle Logic (Energy Gated)
            if (allowDoubleSpawns && state.distance - state.lastDoubleObstacleDistance > 1200) {
                // 20% Chance for a double obstacle
                if (Math.random() < 0.2) {
                    // Second obstacle is simple
                    // Available simple types: standard, purple, red (exclude boulder/heart)
                    const simpleTypes = allowedObstacles.filter(t => t === 'standard' || t === 'purple' || t === 'red');
                    if (simpleTypes.length > 0) {
                        const secondType = simpleTypes[Math.floor(Math.random() * simpleTypes.length)];

                        state.obstacles.push({
                            x: SCREEN_WIDTH + 100, // Close gap!
                            id: nextId++,
                            type: secondType,
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
