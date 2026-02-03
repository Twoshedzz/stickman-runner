import { SCREEN_WIDTH } from '../constants';
import { GameState } from '../state';

let nextId = 0;

export const spawnObstacle = (state: GameState) => {
    // Phased Difficulty (Distance Based)
    const dist = state.distance;

    let minDist = 600;
    let maxDist = 800;
    let spawnChance = 0.05;
    let availableTypes: ('red' | 'purple' | 'boulder')[] = ['purple'];
    let allowDouble = false;

    if (dist >= 30000) {
        // Stage 5: Hardcore
        minDist = 300;
        maxDist = 500;
        spawnChance = 0.15;
        availableTypes = ['red', 'purple', 'boulder'];
        allowDouble = true;
    } else if (dist >= 20000) {
        // Stage 4: Double Trouble
        minDist = 350;
        maxDist = 600;
        spawnChance = 0.12;
        availableTypes = ['red', 'purple', 'boulder'];
        allowDouble = true;
    } else if (dist >= 12000) {
        // Stage 3: Boulders
        minDist = 400;
        maxDist = 600;
        spawnChance = 0.10;
        availableTypes = ['red', 'purple', 'boulder'];
    } else if (dist >= 5000) {
        // Stage 2: Large Obstacles (Red/Yellow)
        minDist = 450;
        maxDist = 700;
        spawnChance = 0.08;
        availableTypes = ['red', 'purple'];
    }

    // Check last obstacle
    const lastObstacle = state.obstacles[state.obstacles.length - 1];
    const lastX = lastObstacle ? lastObstacle.x : -Infinity;

    // If no obstacles yet, spawn one immediately
    if (state.obstacles.length === 0) {
        state.obstacles.push({
            x: SCREEN_WIDTH + 200,
            id: nextId++,
            type: 'purple', // Safe start
        });
        return;
    }

    // Only spawn if enough distance has passed
    if (lastX < SCREEN_WIDTH - minDist) {
        // Chance to spawn
        if (Math.random() < spawnChance || (lastX < SCREEN_WIDTH - maxDist)) {

            // Determine Type
            let type: 'red' | 'purple' | 'heart' | 'boulder' = 'purple';
            if (Math.random() < 0.1) { // Boosted to 10%
                type = 'heart';
            } else {
                const randIndex = Math.floor(Math.random() * availableTypes.length);
                type = availableTypes[randIndex];
            }

            state.obstacles.push({
                x: SCREEN_WIDTH,
                id: nextId++,
                type: type,
                phase: type === 'boulder' ? Math.random() * Math.PI : undefined,
            });

            // Double Obstacle Logic (Energy Gated)
            // Increase buffer to 1200 to give player margin for error
            // 1200px = 300 frames = 150 energy regen
            if (allowDouble && state.distance - state.lastDoubleObstacleDistance > 1200) {
                // 20% Chance for a double obstacle
                if (Math.random() < 0.2) {
                    // Second obstacle is never a heart or boulder (too complex)
                    // Just a simple block or purple spike
                    const secondType = Math.random() < 0.5 ? 'purple' : 'red';

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

    // Cleanup
    if (state.obstacles.length > 20) {
        state.obstacles.shift();
    }
};

export const resetSpawner = () => {
    nextId = 0;
};
