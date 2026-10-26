/**
 * What obstacles are, how big they are, and what they do.
 *
 * Obstacles are plain shapes: blocks you jump, a sphere that wobbles as it comes, and a
 * bar you duck under. The ROLE is the mechanic; the stage only changes the colours.
 *
 * Hand-drawn line art for these lives in assets/obstacle-art/ and can be turned back on
 * by regenerating it (scripts/generate-obstacle-art.js) and drawing it in ObstacleLayer.
 * It is parked rather than deleted: it looked out of place against the flat scenery, and
 * the generated path data added about 145KB to the app.
 *
 * Widths are set against the jump arc: a jump peaks 120px up and covers 160px, so
 * anything up to about 90px wide can be cleared. The wide block is deliberately wider and
 * needs a double jump - it is the one obstacle that makes the energy bar matter.
 *
 * The hole is a circle cut into the floor. It isn't hit like the others: the runner falls
 * in if his feet come down on it (see systems/holes.ts), so jumping is the only way past.
 * The void is the same idea across the whole floor, and too wide for one jump: a gap with
 * the grid dropping away at each edge, crossed only with a double jump.
 *
 * Each entry says what the obstacle does as well as how it looks, so the game logic asks
 * the table ("does this one wobble?") instead of checking for particular roles. A new
 * obstacle is one more entry here; src/components/ObstacleLayer.tsx draws it by its `shape`
 * and `tint` (a new shape needs a drawing there too).
 */
import { OVERHEAD_TOP_OFFSET, RUNNER_GROUND_Y } from './constants';


export type ObstacleRole = 'small' | 'large' | 'mover' | 'huge' | 'overhead' | 'hole' | 'void' | 'heart';

/** Which of the stage's colours a role is drawn in. */
export type ObstacleTint = 'block' | 'red' | 'purple' | 'overhead' | 'hole' | 'heart';

/** What a role looks like: which drawing ObstacleLayer uses for it. */
export type ObstacleShape = 'block' | 'sphere' | 'bar' | 'hole' | 'void' | 'heart';

/** What an obstacle asks the player to do. */
export type Move = 'jump' | 'double' | 'duck' | 'collect';

export interface RoleShape {
    shape: ObstacleShape;
    width: number;
    height: number;
    tint: ObstacleTint;
    damage: number;
    /** How the player gets past it: jump, double jump, duck, or run into it to collect. */
    clearBy: Move;
    /** Hangs in the duck band instead of standing on the ground. */
    overhead?: boolean;
    /** Speeds up and slows down as it comes, so it gets extra room either side. */
    moves?: boolean;
    /** Fallen into rather than bumped into (systems/holes.ts), so it has no hitbox. */
    fallIn?: boolean;
    /** A plain jump clears it, so pickups can arc over it (not the sphere: it wobbles). */
    arcsOver?: boolean;
    /** Big enough that a hit throws more debris, further. */
    bigHit?: boolean;
    /** A pickup, not a hazard: it heals, and missing it isn't an obstacle cleared. */
    heals?: boolean;
}

/**
 * Every stage uses the same shapes and sizes, so the rules are identical everywhere and
 * only the palette changes. Colour also teaches: a purple sphere always moves.
 */
export const ROLE_SHAPES: Record<ObstacleRole, RoleShape> = {
    small:    { shape: 'block',  width: 28,  height: 28,  tint: 'block',    damage: 2, clearBy: 'jump', arcsOver: true },
    large:    { shape: 'block',  width: 40,  height: 40,  tint: 'red',      damage: 4, clearBy: 'jump', arcsOver: true, bigHit: true },
    mover:    { shape: 'sphere', width: 36,  height: 36,  tint: 'purple',   damage: 3, clearBy: 'jump', moves: true },
    huge:     { shape: 'block',  width: 110, height: 40,  tint: 'red',      damage: 5, clearBy: 'double', bigHit: true },
    overhead: { shape: 'bar',    width: 28,  height: 144, tint: 'overhead', damage: 3, clearBy: 'duck', overhead: true },
    // Flat on the floor, so no height: nothing stands up out of it to hit.
    hole:     { shape: 'hole',   width: 90,  height: 0,   tint: 'hole',     damage: 3, clearBy: 'jump', fallIn: true, arcsOver: true },
    // Wider than a jump carries you even at top speed (240px), inside a double jump from about
    // 260 px/sec. Falling in costs more than a hole.
    void:     { shape: 'void',   width: 300, height: 0,   tint: 'hole',     damage: 5, clearBy: 'double', fallIn: true },
    heart:    { shape: 'heart',  width: 28,  height: 28,  tint: 'heart',    damage: 0, clearBy: 'collect', heals: true },
};

export function shapeFor(role: ObstacleRole | undefined): RoleShape {
    return ROLE_SHAPES[role ?? 'small'];
}

/** What the player does to get past this obstacle. */
export const moveFor = (role: ObstacleRole | undefined): Move => shapeFor(role).clearBy;

/** The y of an obstacle's top edge: bars hang in the duck band, everything else stands on the ground. */
export const topYFor = (role: ObstacleRole | undefined): number => {
    const art = shapeFor(role);
    return art.overhead ? RUNNER_GROUND_Y - OVERHEAD_TOP_OFFSET : RUNNER_GROUND_Y - art.height;
};
