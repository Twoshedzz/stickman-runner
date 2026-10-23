import { Platform } from 'react-native';
import { HEART_HEAL, HIT_GRACE_SEC, OVERHEAD_TOP_OFFSET, PLAYER_DUCK_HEIGHT, PLAYER_SIZE, PLAYER_X, RUNNER_GROUND_Y, SCREEN_WIDTH } from '../constants';
import { shapeFor } from '../obstacleCatalogue';
import { spawnParticles } from '../particles';
import { addScore, breakStreak } from '../pickups';
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

        const role = obs.role ?? 'small';
        const isHeart = role === 'heart';
        // The hitbox is the shape's own size, so what you see is what you hit.
        const art = shapeFor(role);
        const size = art.width;
        const damage = art.damage;

        const obsX = obs.x;
        const obsR = obsX + art.width;
        // Everything sits on the ground except a swarm, which hangs in the air.
        const obsY = art.overhead ? RUNNER_GROUND_Y - OVERHEAD_TOP_OFFSET : RUNNER_GROUND_Y - art.height;
        const obsB = obsY + art.height;

        // AABB Collision with Forgiveness (Hitbox reduction)
        const hitMargin = 5;
        if (
            playerX + hitMargin < obsR - hitMargin &&
            playerR - hitMargin > obsX + hitMargin &&
            playerY + hitMargin < obsB - hitMargin &&
            playerB - hitMargin > obsY + hitMargin
        ) {
            // Collision detected!

            if (isHeart) {
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
                    addScore(state);
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

            // Just been hit: safe for a moment, so pass straight through.
            if (state.player.hurtTimer > 0) {
                obs.grazed = true;
                continue;
            }
            state.player.hurtTimer = HIT_GRACE_SEC;
            // A hit ends the streak, debug mode or not: it's still a miss.
            breakStreak(state);

            // 1. Deal Damage (Unless Debug Mode)
            if (!state.debugMode) {
                state.player.health -= damage;
            } else {
                console.log("Debug Mode: Damage Negated");
            }

            // Explosion scaling; fewer particles on web to reduce CanvasKit load (avoids Aborted).
            const isBig = role === 'large' || role === 'huge';
            const burstY = art.overhead ? obsB - 10 : obsY + art.height / 2;
            const particleCount = Platform.OS === 'web' ? (isBig ? 12 : 6) : (isBig ? 30 : 15);
            state.particles = spawnParticles(
                state.particles,
                obs.x + size / 2,
                burstY,
                '#ffff00',
                particleCount,
                isBig ? 6 : 4,   // bigger objects throw their debris further
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
