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
    /** Stage seconds when the last heart, last wide block (or void) and last breather were placed. */
    lastHeartSec: number;
    lastHugeSec: number;
    lastBreatherSec: number;
    /** How many of each planned pattern (`pacing.planned`) have been placed. */
    plannedPlaced: Record<string, number>;
    /** The patterns placed most recently, newest first, so the same few don't keep coming. */
    recent: string[];
}

export const createSpawnerState = (): SpawnerState => ({
    endX: 0,
    restSec: 0,
    lastRole: null,
    lastCost: 0,
    lastHeartSec: 0,
    lastHugeSec: -Infinity,
    lastBreatherSec: 0,
    plannedPlaced: {},
    recent: [],
});

/**
 * Something that happened this frame, for other code to react to. The list is emptied at the
 * start of every frame (see step.ts), so it only ever holds this frame's events.
 */
export type GameEvent =
    /** The runner's feet touched down after a jump. */
    | { type: 'land' };

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
        /** Finger still down after a swipe (or the ↓ key held): stay ducked until it's let go. */
        duckHeld: boolean;
        /** Seconds left on a tap made just before landing; it jumps the moment the feet touch down. */
        jumpBuffer: number;
        /** Seconds of safety left after a hit. The runner blinks and can't be hurt meanwhile. */
        hurtTimer: number;
        /** 1 the moment the runner lands, fading to 0: lights up the grid under his feet. */
        landGlow: number;
        /** Seconds left of a drop into a hole (see systems/holes.ts); 0 when not falling. */
        falling: number;
        /** The hole being fallen into, or -1. */
        fallHoleId: number;
        /** How far the world has carried the runner back while he falls, in pixels. */
        fallDrift: number;
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
        /** Touched during the safe moment after a hit: it doesn't count towards the streak. */
        grazed?: boolean;
    }[];
    /**
     * Neon pickups to collect, by the centre of each. They move with the obstacles. The top of
     * a double arc is marked `needsDouble`: reaching it costs a double jump.
     */
    pickups: { id: number; x: number; y: number; needsDouble?: boolean }[];
    particles: Particle[];
    /** What happened this frame (landings, so far). Nothing listens yet. */
    events: GameEvent[];
    score: number;
    /** Obstacles cleared in a row without a hit. Sets the score multiplier (see pickups.ts). */
    streak: number;
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
    /** The run is paused (see pause.ts): nothing moves and the stage clock stands still. */
    paused: boolean;
    /** Unix seconds when the pause began. */
    pausedAt: number;
    /** Unix seconds when the 3-2-1 runs out and play carries on; 0 while plainly paused. */
    resumeAt: number;
}

export const createInitialState = (): GameState => ({
    player: {
        y: RUNNER_GROUND_Y - PLAYER_SIZE,
        dy: 0,
        isGrounded: true,
        jumpCount: 0,
        isDucking: false,
        duckTimer: 0,
        duckHeld: false,
        jumpBuffer: 0,
        hurtTimer: 0,
        landGlow: 0,
        falling: 0,
        fallHoleId: -1,
        fallDrift: 0,
        health: MAX_HEALTH,
        maxHealth: MAX_HEALTH,
    },
    obstacles: [],
    pickups: [],
    particles: [],
    events: [],
    score: 0,
    streak: 0,
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
    showContinue: false,
    paused: false,
    pausedAt: 0,
    resumeAt: 0,
});
