import { DAMAGE_BLOCK, DAMAGE_PURPLE, GROUND_HEIGHT, HEART_HEAL, OBSTACLE_SIZE, OBSTACLE_SIZE_PURPLE, PLAYER_SIZE, PLAYER_X, SCREEN_HEIGHT } from '../constants';
import { GameState } from '../state';

export const checkCollisions = (state: GameState) => {
    const playerX = PLAYER_X;
    const playerY = state.player.y;
    const playerR = playerX + PLAYER_SIZE;
    const playerB = playerY + PLAYER_SIZE;

    const obstacleY = SCREEN_HEIGHT - GROUND_HEIGHT - OBSTACLE_SIZE;

    for (let i = 0; i < state.obstacles.length; i++) {
        const obs = state.obstacles[i];

        const isPurple = obs.type === 'purple';
        const size = isPurple ? OBSTACLE_SIZE_PURPLE : OBSTACLE_SIZE;
        const damage = isPurple ? DAMAGE_PURPLE : DAMAGE_BLOCK;

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
                // Heal Player
                state.player.health = Math.min(state.player.health + HEART_HEAL, state.player.maxHealth);
                // Remove heart
                state.obstacles.splice(i, 1);
                i--;
                return true; // Collision occurred (trigger UI update)
            }

            // 1. Deal Damage
            state.player.health -= damage;

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
