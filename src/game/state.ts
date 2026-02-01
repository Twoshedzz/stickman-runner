import { GROUND_HEIGHT, MAX_HEALTH, PLAYER_SIZE, SCREEN_HEIGHT } from './constants';

export interface GameState {
    player: {
        y: number;
        dy: number;
        isGrounded: boolean;
        jumpCount: number;
        health: number;
        maxHealth: number;
    };
    obstacles: {
        x: number;
        id: number;
        passed?: boolean;
        type?: 'red' | 'purple' | 'heart';
    }[];
    score: number;
    gameOver: boolean;
}

export const createInitialState = (): GameState => ({
    player: {
        y: SCREEN_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE,
        dy: 0,
        isGrounded: true,
        jumpCount: 0,
        health: MAX_HEALTH,
        maxHealth: MAX_HEALTH,
    },
    obstacles: [],
    score: 0,
    gameOver: false,
});
