/**
 * One frame of the world: the one place the frame's order lives.
 *
 * The game loop (loop/useGameLoop.ts) and the pretend player (difficulty/pretendPlayer.ts)
 * both call this, so anything added here is played by the game and measured by the
 * difficulty report alike.
 *
 * The caller sets the stage clock first (elapsed time → progress → distance → speed): the
 * game runs on real time, the pretend player counts frames. The world then runs on game time,
 * at the pace the stage has reached (pace.ts).
 */
import { frameScale } from './frame';
import { gameStep, paceAt } from './pace';
import { updateParticles } from './particles';
import { collectPickups } from './pickups';
import { StageConfig } from './stages';
import { GameState } from './state';
import { checkCollisions } from './systems/collisions';
import { applyPhysics } from './systems/physics';
import { spawnObstacle } from './systems/spawn';

export interface StepOptions {
    /** The spawner's dice. The pretend player brings its own, so a run can be played again. */
    random?: () => number;
    /** Move the sparks along. Off for the pretend player: they change nothing, and copying them is slow. */
    sparks?: boolean;
}

/** One step of game time: scroll, physics, spawn, sparks, collisions, pickups. True if the runner was hit. */
const stepGame = (
    state: GameState,
    stage: StageConfig,
    deltaTimeSec: number,
    random: () => number,
    sparks: boolean
): boolean => {
    state.gameSec += deltaTimeSec;
    // Same step the obstacles take, so the scenery and grid move with them.
    state.scroll += (state.speed / 60) * frameScale(deltaTimeSec);
    applyPhysics(state, deltaTimeSec);
    if (state.distance < stage.courseLength - 1000) {
        spawnObstacle(state, stage, deltaTimeSec, random);
    }
    state.particles = sparks ? updateParticles(state.particles, deltaTimeSec) : [];
    const hit = checkCollisions(state);
    collectPickups(state);
    return hit;
};

/** One real frame of the world, at the pace the stage has reached. True if the runner was hit. */
export const stepWorld = (
    state: GameState,
    stage: StageConfig,
    deltaTimeSec: number,
    { random = Math.random, sparks = true }: StepOptions = {}
): boolean => {
    // What happened this frame (see GameEvent), for anything that wants to react to it.
    state.events = [];
    const { steps, stepSec } = gameStep(deltaTimeSec, paceAt(state.paceOption, stage, state.stageProgress));
    let hit = false;
    for (let i = 0; i < steps && !state.gameOver; i++) {
        if (stepGame(state, stage, stepSec, random, sparks)) hit = true;
    }
    return hit;
};
