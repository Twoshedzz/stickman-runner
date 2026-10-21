/**
 * What obstacles are, how big they are, and what they do.
 *
 * Obstacles are plain shapes: blocks you jump, a sphere that wobbles as it comes, and a
 * bar you duck under. The ROLE is the mechanic; the stage only changes the colours.
 *
 * Hand-drawn line art for these lives in assets/obstacle-art/ and can be turned back on
 * by regenerating it (scripts/generate-obstacle-art.js) and drawing it in GameCanvas.
 * It is parked rather than deleted: it looked out of place against the flat scenery, and
 * the generated path data added about 145KB to the app.
 *
 * Widths are set against the jump arc: a jump peaks 120px up and covers 160px, so
 * anything up to about 90px wide can be cleared. The wide block is deliberately wider and
 * needs a double jump - it is the one obstacle that makes the energy bar matter.
 */

export type ObstacleRole = 'small' | 'large' | 'mover' | 'huge' | 'overhead' | 'heart';

/** Which of the stage's colours a role is drawn in. */
export type ObstacleTint = 'block' | 'red' | 'purple' | 'overhead' | 'heart';

export interface RoleShape {
    shape: 'block' | 'sphere' | 'bar';
    width: number;
    height: number;
    tint: ObstacleTint;
    /** Hangs in the duck band instead of standing on the ground. */
    overhead?: boolean;
    damage: number;
}

/**
 * Every stage uses the same shapes and sizes, so the rules are identical everywhere and
 * only the palette changes. Colour also teaches: a purple sphere always moves.
 */
export const ROLE_SHAPES: Record<ObstacleRole, RoleShape> = {
    small:    { shape: 'block',  width: 28,  height: 28,  tint: 'block',    damage: 2 },
    large:    { shape: 'block',  width: 40,  height: 40,  tint: 'red',      damage: 4 },
    mover:    { shape: 'sphere', width: 36,  height: 36,  tint: 'purple',   damage: 3 },
    huge:     { shape: 'block',  width: 110, height: 40,  tint: 'red',      damage: 5 },
    overhead: { shape: 'bar',    width: 28,  height: 144, tint: 'overhead', overhead: true, damage: 3 },
    heart:    { shape: 'sphere', width: 28,  height: 28,  tint: 'heart',    damage: 0 },
};

export function shapeFor(role: ObstacleRole | undefined): RoleShape {
    return ROLE_SHAPES[role ?? 'small'];
}
