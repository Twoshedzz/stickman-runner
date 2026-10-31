/**
 * The pace dial (step 12 in docs/PROJECT_PLAN.md, a test build): how fast game time runs
 * against real time. At pace 1.3, 1.3 seconds of game happen in each real second.
 *
 * Everything in stepWorld runs on game time: the scrolling, the jump and gravity, the duck,
 * moving spheres, the gaps between obstacles, energy refill, the hurt and fall timers, the
 * jump buffer. A jump lasts the same in game time and the world moves the same pixels in it,
 * so a jump covers the same distance at any pace, and no obstacle needs a different size.
 *
 * The music, the stage clock, the stage's progress, the sky and the finish stay on real time.
 * The people playing do too: the pretend player's and the bot's timing is in real frames.
 */
import { frameScale } from './frame';
import { remainingScroll, StageConfig, STAGES } from './stages';
import { GameState } from './state';

export type PaceOptionId = 'A' | 'B' | 'C' | 'D';

export interface PaceOption {
    id: PaceOptionId;
    name: string;
    /** Obstacles snap to the music's beat. Only at pace 1, where game time runs with the music. */
    onTheBeat: boolean;
    /** Each stage's pace [at its start, at its end], in stage order: a straight line between. */
    stages: [number, number][];
}

/** The options Pete compares, picked on the title screen. */
export const PACE_OPTIONS: PaceOption[] = [
    { id: 'A', name: 'TODAY', onTheBeat: true, stages: [[1, 1], [1, 1], [1, 1], [1, 1]] },
    { id: 'B', name: 'FLAT', onTheBeat: false, stages: [[1.3, 1.3], [1.3, 1.3], [1.3, 1.3], [1.3, 1.3]] },
    { id: 'C', name: 'GENTLE CURVE', onTheBeat: false, stages: [[1.0, 1.2], [1.1, 1.3], [1.2, 1.4], [1.3, 1.5]] },
    { id: 'D', name: 'BOLD CURVE', onTheBeat: false, stages: [[1.1, 1.4], [1.2, 1.5], [1.3, 1.6], [1.4, 1.7]] },
];

export const paceOption = (id: PaceOptionId) => PACE_OPTIONS.find((o) => o.id === id) ?? PACE_OPTIONS[0];

const stagePace = (id: PaceOptionId, stage: StageConfig) =>
    paceOption(id).stages[Math.max(0, STAGES.indexOf(stage))];

/** The pace at a point in a stage (0 = start, 1 = end). */
export const paceAt = (id: PaceOptionId, stage: StageConfig, progress: number) => {
    const [start, end] = stagePace(id, stage);
    return start + (end - start) * progress;
};

/**
 * The clock the spawner remembers things by (the last breather, heart and wide block). Game
 * time, so they come at the same rhythm as the obstacles. On the beat that's the stage clock
 * itself, which is what the game has always used.
 */
export const gameClockSec = (state: GameState) =>
    paceOption(state.paceOption).onTheBeat ? state.elapsedSecInStage : state.gameSec;

/**
 * How to play one real frame of `deltaTimeSec` at a pace: this many steps, each this long in
 * game time. At pace 1 it's the one step the game has always taken.
 *
 * Faster than that, the frame is cut into steps of at most one 60fps frame's worth, with
 * collisions checked after each, so a slow frame can't carry the runner through an obstacle.
 * A slow frame counts for at most 2 real frames of movement, like at pace 1 (see frame.ts).
 * The steps are equal, not exactly one frame long, so the world moves evenly from one drawn
 * frame to the next. That leaves a jump within one frame's movement of its length at pace 1
 * (6px at most) and a little higher, never lower (3px at most), as on a 120Hz phone against a
 * 60Hz one.
 */
export const gameStep = (deltaTimeSec: number, pace: number) => {
    if (pace === 1) return { steps: 1, stepSec: deltaTimeSec };
    const frames = frameScale(deltaTimeSec) * pace;
    const steps = Math.max(1, Math.ceil(frames - 1e-9));
    return { steps, stepSec: frames / steps / 60 };
};

/** How many more pixels the world will travel before the stage ends, at this option's pace. */
export const remainingPacedScroll = (id: PaceOptionId, stage: StageConfig, progress: number) => {
    if (paceOption(id).onTheBeat) return remainingScroll(stage, progress);
    const [s0, s1] = stage.speed;
    const [p0, p1] = stagePace(id, stage);
    const ds = s1 - s0;
    const dp = p1 - p0;
    const p = Math.min(Math.max(progress, 0), 1);
    // The area under speed × pace, both straight lines, from now to the end of the stage.
    return stage.durationSec * (
        s0 * p0 * (1 - p) +
        ((s0 * dp + ds * p0) * (1 - p * p)) / 2 +
        (ds * dp * (1 - p * p * p)) / 3
    );
};
