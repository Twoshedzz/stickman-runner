/**
 * What each stage's obstacles are, how big they are, and what they do.
 *
 * The drawing of an obstacle is art; its ROLE is the mechanic. A bench, a rock and a car
 * are all "something low you jump over" - they only differ in how they look and what a hit
 * costs. That keeps one set of rules across every stage, with the art as dressing.
 *
 * Widths are chosen against the jump arc: a jump peaks 120px up and covers 160px, so
 * anything up to about 90px wide can be cleared. The bus is deliberately wider and needs a
 * double jump - it is the one obstacle that makes the energy bar matter.
 */

import { OBSTACLE_ART } from './obstacleArt';

export type ObstacleRole = 'small' | 'large' | 'mover' | 'huge' | 'overhead' | 'heart';

/** How much a hit costs, by role. */
export const ROLE_DAMAGE: Record<ObstacleRole, number> = {
    small: 2,
    large: 4,
    mover: 3,
    huge: 5,
    overhead: 3,
    heart: 0,
};

export interface ObstacleEntry {
    /** Key into OBSTACLE_ART. */
    art: string;
    /** Drawn width in game pixels. Height follows from the drawing's proportions. */
    width: number;
    /** Hangs in the duck band instead of standing on the ground. */
    overhead?: boolean;
}

interface StageObstacles {
    entries: ObstacleEntry[];
    /** Which entries can appear for each role. More than one gives variety. */
    roles: Partial<Record<ObstacleRole, number[]>>;
}

export const STAGE_OBSTACLES: Record<string, StageObstacles> = {
    stage_1_city: {
        entries: [
            { art: 'carHatchback', width: 79 },
            { art: 'carSedan', width: 87 },
            { art: 'van', width: 83 },
            { art: 'cityDog', width: 42 },
            { art: 'bus', width: 156 },          // too wide for a single jump, by design
            { art: 'birdSwarm', width: 48, overhead: true },
        ],
        roles: { small: [0, 1], large: [2], mover: [3], huge: [4], overhead: [5] },
    },

    stage_2_beach: {
        entries: [
            { art: 'bench', width: 74 },
            { art: 'beachCar', width: 77 },
            { art: 'beachDog', width: 38 },
            { art: 'skaterLeft', width: 39 },
            { art: 'skaterRight', width: 37 },
            { art: 'seagullSwarm', width: 52, overhead: true },
        ],
        roles: { small: [0], large: [1], mover: [2, 3, 4], overhead: [5] },
    },

    stage_3_landscape: {
        entries: [
            { art: 'shrub', width: 55 },
            { art: 'log', width: 65 },
            { art: 'rock', width: 68 },
            { art: 'bear', width: 62 },
            { art: 'batSwarm', width: 50, overhead: true },
        ],
        roles: { small: [0, 1], large: [2], mover: [3], overhead: [4] },
    },
};

// Victory Dawn returns to the city, so it uses the same objects.
STAGE_OBSTACLES.stage_4_victory = STAGE_OBSTACLES.stage_1_city;

export interface ObstacleSprite {
    width: number;
    height: number;
    overhead?: boolean;
    art?: string;
}

/** One obstacle's size on screen. The hitbox is the same, so what you see is what you hit. */
export function spriteFor(stageId: string, index: number): ObstacleSprite {
    const entry = STAGE_OBSTACLES[stageId]?.entries[index];
    if (!entry) return { width: 40, height: 40 };
    const art = OBSTACLE_ART[entry.art];
    // An overhead swarm is sized by its height instead, so it fills the duck band exactly.
    if (entry.overhead) {
        const height = 144;
        return { width: entry.width, height, overhead: true, art: entry.art };
    }
    return {
        width: entry.width,
        height: Math.round(entry.width * art.height / art.width),
        art: entry.art,
    };
}

/** The entries a role can use on a stage, or an empty list if it doesn't have that role. */
export function spritesForRole(stageId: string, role: ObstacleRole): number[] {
    return STAGE_OBSTACLES[stageId]?.roles[role] ?? [];
}
