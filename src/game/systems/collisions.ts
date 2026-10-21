import { Platform } from 'react-native';
import { DAMAGE_BLOCK, DAMAGE_OVERHEAD, DAMAGE_SMALL, DAMAGE_PURPLE, HEART_HEAL, HEART_SIZE, OBSTACLE_SIZE, OBSTACLE_SIZE_PURPLE, OBSTACLE_SIZE_SMALL, OVERHEAD_BOTTOM_OFFSET, OVERHEAD_TOP_OFFSET, OVERHEAD_WIDTH, PLAYER_DUCK_HEIGHT, PLAYER_SIZE, PLAYER_X, RUNNER_GROUND_Y, SCREEN_WIDTH } from '../constants';
import { spawnParticles } from '../particles';
import { GameState } from '../state';

export const checkCollisions = (state: GameState) => {
    const playerX = PLAYER_X;
    const playerR = playerX + PLAYER_SIZE;
    // Ducking keeps the feet on the ground and drops the head, so the box shrinks from the top.
    const ducking = state.player.isDucking;
    const playerY = ducking ? RUNNER_GROUND_Y - PLAYER_DUCK_HEIGHT : state.player.y;
    const playerB = ducking ? RUNNER_GROUND_Y : state.player.y + PLAYER_SIZE;

    for (let i = 0; i < state.obstacles.length; i++) {
        const obs = state.obstacles[i];

        const isPurple = obs.type === 'purple';
        const isSmall = obs.type === 'small';
        const isOverhead = obs.type === 'overhead';
        const size = obs.type === 'heart' ? HEART_SIZE
            : isOverhead ? OVERHEAD_WIDTH
            : (isPurple ? OBSTACLE_SIZE_PURPLE : (isSmall ? OBSTACLE_SIZE_SMALL : OBSTACLE_SIZE));
        const damage = isOverhead ? DAMAGE_OVERHEAD
            : (isPurple ? DAMAGE_PURPLE : (isSmall ? DAMAGE_SMALL : DAMAGE_BLOCK));

        const obsX = obs.x;
        const obsR = obsX + size;
        // Everything but the overhead bar sits on the ground; the bar hangs above it.
        const obsY = isOverhead ? RUNNER_GROUND_Y - OVERHEAD_TOP_OFFSET : RUNNER_GROUND_Y - size;
        const obsB = isOverhead ? RUNNER_GROUND_Y - OVERHEAD_BOTTOM_OFFSET : RUNNER_GROUND_Y;

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
                        obs.x + size / 2,
                        obsY + size / 2,
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
                        obs.x + size / 2,
                        obsY + size / 2,
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

            // 1. Deal Damage (Unless Debug Mode)
            if (!state.debugMode) {
                state.player.health -= damage;
            } else {
                console.log("Debug Mode: Damage Negated");
            }

            // Explosion scaling; fewer particles on web to reduce CanvasKit load (avoids Aborted).
            const isBig = !isPurple && !isSmall;
            const burstY = isOverhead ? obsB - 10 : obsY + size / 2;
            const particleCount = Platform.OS === 'web' ? (isBig ? 12 : 6) : (isBig ? 30 : 15);
            state.particles = spawnParticles(
                state.particles,
                obs.x + size / 2,
                burstY,
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
