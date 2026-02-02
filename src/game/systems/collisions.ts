import { DAMAGE_BLOCK, DAMAGE_PURPLE, GROUND_HEIGHT, HEART_HEAL, OBSTACLE_SIZE, OBSTACLE_SIZE_PURPLE, PLAYER_SIZE, PLAYER_X, SCREEN_HEIGHT, SCREEN_WIDTH } from '../constants';
import { spawnParticles } from '../particles';
import { GameState } from '../state';

export const checkCollisions = (state: GameState) => {
    const playerX = PLAYER_X;
    const playerY = state.player.y;
    const playerR = playerX + PLAYER_SIZE;
    const playerB = playerY + PLAYER_SIZE;

    for (let i = 0; i < state.obstacles.length; i++) {
        const obs = state.obstacles[i];

        const isPurple = obs.type === 'purple';
        // const isBoulder = obs.type === 'boulder'; // Unused
        const size = isPurple ? OBSTACLE_SIZE_PURPLE : OBSTACLE_SIZE; // Boulders are full size
        const damage = isPurple ? DAMAGE_PURPLE : DAMAGE_BLOCK; // Boulders deal full damage

        const obsX = obs.x;
        const obsY = SCREEN_HEIGHT - GROUND_HEIGHT - size; // Align to ground
        const obsR = obsX + size;
        const obsB = obsY + size;

        // AABB Collision with Forgiveness (Hitbox reduction)
        const hitMargin = 5;
        if (
            playerX + hitMargin < obsR - hitMargin &&
            playerR - hitMargin > obsX + hitMargin &&
            playerY + hitMargin < obsB - hitMargin &&
            playerB - hitMargin > obsY + hitMargin
        ) {
            // Collision detected!

            if (obs.type === 'heart') {
                // Check for Excess Health
                if (state.player.health < state.player.maxHealth) {
                    // Normal Heal
                    state.player.health = Math.min(state.player.health + HEART_HEAL, state.player.maxHealth);
                    // Spawn Pink Particles -> Fly to Health Bar (Top Left)
                    state.particles = spawnParticles(
                        state.particles,
                        obs.x + OBSTACLE_SIZE / 2,
                        obsY + OBSTACLE_SIZE / 2,
                        '#FF1493', // Pink
                        10,
                        4,
                        { x: 80, y: 40 } // Target: Health Bar
                    );
                } else {
                    // Excess Health -> Score Bonus!
                    state.score += 1;
                    // Spawn Gold Particles -> Fly to Score Display (Top Right)
                    state.particles = spawnParticles(
                        state.particles,
                        obs.x + OBSTACLE_SIZE / 2,
                        obsY + OBSTACLE_SIZE / 2,
                        '#FFD700', // Gold
                        10,
                        4,
                        { x: SCREEN_WIDTH - 60, y: 40 } // Target: Score Display
                    );
                }

                // Remove the heart
                state.obstacles.splice(i, 1);
                i--;
                continue;
            }

            // 1. Deal Damage
            state.player.health -= damage;

            // Explosion scaling
            // More particles, smaller size for pixel explosion look
            // Boulders count as big obstacles
            const isBig = !isPurple;
            const particleCount = isBig ? 30 : 15;
            state.particles = spawnParticles(
                state.particles,
                obs.x + size / 2,
                obsY + size / 2,
                '#ffff00',
                particleCount,
                isPurple ? 4 : 6,
                undefined,
                undefined,
                3 // Size (small pixels)
            );

            // 2. Remove the obstacle so we don't hit it again next frame
            state.obstacles.splice(i, 1);
            i--; // Adjust index since we removed an element

            // 3. Check for Death
            if (state.player.health <= 0) {
                state.player.health = 0;
                state.gameOver = true;
            }

            return true;
        }
    }
    return false;
};
