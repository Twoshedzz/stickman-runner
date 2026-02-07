import { GROUND_HEIGHT, MAX_HEALTH, PLAYER_SIZE, SCREEN_HEIGHT } from './constants';
import { Particle } from './particles';

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
        type?: 'standard' | 'red' | 'purple' | 'heart' | 'boulder'; // Added standard
        phase?: number; // For oscillation
    }[];
    particles: Particle[];
    score: number;
    stageStatus: 'playing' | 'exhausted' | 'victory';
    distance: number;
    lastDoubleObstacleDistance: number; // For tracking double obstacle cooldown
    energy: number;
    timeOfDay: number; // 0 to TIME_CYCLE_DURATION (Visual Only now, effectively)
    gameOver: boolean;
    gameStarted: boolean;
    stageId: string;
    stageProgress: number; // 0 (Dusk) -> 1 (Dawn)
    shield: number;
    debugMode: boolean;
    showContinue: boolean;
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
    particles: [],
    score: 0,
    stageStatus: 'playing',
    distance: 0,
    lastDoubleObstacleDistance: -1200, // Allow immediate double obstacle if RNG allows
    energy: 100,
    timeOfDay: 0.35 * 6000,
    gameOver: false,
    gameStarted: false,
    stageId: 'stage_1_city',
    stageProgress: 0,
    shield: 0,
    debugMode: false,
    showContinue: false
});
