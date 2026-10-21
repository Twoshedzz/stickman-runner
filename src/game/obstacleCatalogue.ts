/**
 * What each stage's obstacles are, how big they are, and what they do.
 *
 * The shape of an obstacle is art; its ROLE is the mechanic. A bench, a rock and a car
 * are all "something low you jump over" - they only differ in how they look and how much
 * a hit costs. That keeps one set of rules across every stage.
 *
 * Heights are chosen against the jump arc: a jump peaks 120px up and covers 160px, so
 * anything up to about 90px wide can be cleared. The bus is deliberately wider than that
 * and needs a double jump - it is the one obstacle that makes the energy bar matter.
 */

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

export interface ObstacleSprite {
    /** Width and height in game pixels. The hitbox is the same, so what you see is what you hit. */
    width: number;
    height: number;
    /** Sits on the ground unless this is set, which lifts it to the duck band. */
    overhead?: boolean;
}

export interface StageObstacles {
    sources: number[];
    sprites: ObstacleSprite[];
    /** Which sprites can appear for each role. More than one means variety. */
    roles: Partial<Record<ObstacleRole, number[]>>;
}

export const STAGE_OBSTACLES: Record<string, StageObstacles> = {
    stage_1_city: {
        sources: [
            require('../../assets/obstacles/city/car-hatchback.png'),
            require('../../assets/obstacles/city/car-sedan.png'),
            require('../../assets/obstacles/city/van.png'),
            require('../../assets/obstacles/city/dog.png'),
            require('../../assets/obstacles/city/bus.png'),
            require('../../assets/obstacles/city/bird-swarm.png'),
        ],
        sprites: [
            { width: 79, height: 30 },   // hatchback
            { width: 87, height: 26 },   // sedan
            { width: 83, height: 38 },   // van
            { width: 42, height: 22 },   // dog
            { width: 156, height: 42 },  // bus - too wide for a single jump, by design
            { width: 48, height: 144, overhead: true },
        ],
        roles: { small: [0, 1], large: [2], mover: [3], huge: [4], overhead: [5] },
    },

    stage_2_beach: {
        sources: [
            require('../../assets/obstacles/beach/bench.png'),
            require('../../assets/obstacles/beach/car.png'),
            require('../../assets/obstacles/beach/dog.png'),
            require('../../assets/obstacles/beach/roller-skater-left.png'),
            require('../../assets/obstacles/beach/roller-skater-right.png'),
            require('../../assets/obstacles/beach/seagull-swarm.png'),
        ],
        sprites: [
            { width: 74, height: 24 },   // bench
            { width: 77, height: 30 },   // car
            { width: 38, height: 22 },   // dog
            { width: 39, height: 40 },   // skater, left stride
            { width: 37, height: 40 },   // skater, right stride
            { width: 52, height: 144, overhead: true },
        ],
        roles: { small: [0], large: [1], mover: [2, 3, 4], overhead: [5] },
    },

    stage_3_landscape: {
        sources: [
            require('../../assets/obstacles/mountain/shrub.png'),
            require('../../assets/obstacles/mountain/log.png'),
            require('../../assets/obstacles/mountain/rock.png'),
            require('../../assets/obstacles/mountain/bear.png'),
            require('../../assets/obstacles/mountain/bat-swarm.png'),
        ],
        sprites: [
            { width: 55, height: 24 },   // shrub
            { width: 65, height: 20 },   // log
            { width: 68, height: 26 },   // rock
            { width: 62, height: 34 },   // bear
            { width: 50, height: 144, overhead: true },
        ],
        roles: { small: [0, 1], large: [2], mover: [3], overhead: [4] },
    },
};

// Victory Dawn returns to the city, so it uses the same objects.
STAGE_OBSTACLES.stage_4_victory = STAGE_OBSTACLES.stage_1_city;

/** Looks up one obstacle's size, falling back to something sane for an unknown stage. */
export function spriteFor(stageId: string, index: number): ObstacleSprite {
    const stage = STAGE_OBSTACLES[stageId];
    return stage?.sprites[index] ?? { width: 40, height: 40 };
}

/** The sprites a role can use on a stage, or an empty list if the stage doesn't have that role. */
export function spritesForRole(stageId: string, role: ObstacleRole): number[] {
    return STAGE_OBSTACLES[stageId]?.roles[role] ?? [];
}
