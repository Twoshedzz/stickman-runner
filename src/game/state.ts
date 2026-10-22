import { BASE_SPEED, MAX_HEALTH, PLAYER_SIZE, RUNNER_GROUND_Y } from './constants';
import { ObstacleRole } from './obstacleCatalogue';
import { Particle } from './particles';

export interface SpawnerState {
    /** Screen x of the last placed obstacle's back edge. Scrolls left with the world. */
    endX: number;
    /** Seconds of breathing space wanted after it, before the next pattern. */
    restSec: number;
    /** The last obstacle placed, so the next pattern leaves the right gap after it. */
    lastRole: ObstacleRole | null;
    lastCost: number;
    /** Stage seconds when the last heart and last wide block were placed. */
    lastHeartSec: number;
    lastHugeSec: number;
}

export const createSpawnerState = (): SpawnerState => ({
    endX: 0,
    restSec: 0,
    lastRole: null,
    lastCost: 0,
    lastHeartSec: 0,
    lastHugeSec: -Infinity,
});

export interface GameState {
    player: {
        y: number;
        dy: number;
        isGrounded: boolean;
        jumpCount: number;
        /** Ducking under an overhead bar. Only possible with both feet on the ground. */
        isDucking: boolean;
        /** Seconds of ducking left. Counts down in real time, like everything else. */
        duckTimer: number;
        health: number;
        maxHealth: number;
    };
    obstacles: {
        x: number;
        id: number;
        passed?: boolean;
        /** What it does: jump it, duck it, collect it. The sprite is only how it looks. */
        role?: ObstacleRole;
        phase?: number; // For oscillation
    }[];
    particles: Particle[];
    score: number;
    stageStatus: 'playing' | 'exhausted' | 'victory';
    /** Where the stage is on its dusk-to-dawn timeline. Runs on the clock, not the speed. */
    distance: number;
    /** How far the world has actually moved this stage, in pixels. Scenery and grid scroll by this. */
    scroll: number;
    /** Current world speed, pixels per second. Rises through each stage. */
    speed: number;
    /** What the spawner remembers about the last pattern it placed. */
    spawner: SpawnerState;
    energy: number;
    timeOfDay: number; // 0 to TIME_CYCLE_DURATION (Visual Only now, effectively)
    gameOver: boolean;
    /** Every stage cleared. Ends the run like gameOver does, but shows the win screen. */
    gameComplete: boolean;
    gameStarted: boolean;
    stageId: string;
    stageProgress: number; // 0 (Dusk) -> 1 (Dawn)
    stageStartTime: number; // Unix seconds when stage started (for time-based progress)
    /** Seconds elapsed in current stage (run cycle, spawner timing). */
    elapsedSecInStage: number;
    shield: number;
    debugMode: boolean;
    showContinue: boolean;
}

export const createInitialState = (): GameState => ({
    player: {
        y: RUNNER_GROUND_Y - PLAYER_SIZE,
        dy: 0,
        isGrounded: true,
        jumpCount: 0,
        isDucking: false,
        duckTimer: 0,
        health: MAX_HEALTH,
        maxHealth: MAX_HEALTH,
    },
    obstacles: [],
    particles: [],
    score: 0,
    stageStatus: 'playing',
    distance: 0,
    scroll: 0,
    speed: BASE_SPEED * 60,
    spawner: createSpawnerState(),
    energy: 100,
    timeOfDay: 0.35 * 6000,
    gameOver: false,
    gameComplete: false,
    gameStarted: false,
    stageId: 'stage_1_city',
    stageProgress: 0,
    stageStartTime: 0,
    elapsedSecInStage: 0,
    shield: 0,
    debugMode: false,
    showContinue: false
});
