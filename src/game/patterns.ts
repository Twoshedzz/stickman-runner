/**
 * The obstacle patterns, and the spacing rules between them.
 *
 * A pattern is a short, hand-made run of obstacles: "a bar, then a block", "three hops".
 * The spawner picks whole patterns rather than single obstacles, so every sequence the
 * player meets was designed, and none of them can be impossible.
 *
 * Everything is timed in SECONDS, not pixels. The world speeds up through a stage, and a
 * jump always lasts the same time, so a gap that is fair in seconds stays fair at any speed.
 *
 * Every pattern here is checked against the real jump and duck physics by
 * src/game/__tests__/patterns.test.ts - run `npm test` after changing anything.
 */
import { ObstacleRole, shapeFor } from './obstacleCatalogue';

/** What an obstacle asks the player to do. */
export type Move = 'jump' | 'double' | 'duck' | 'collect';

export const moveFor = (role: ObstacleRole): Move => {
    if (role === 'overhead') return 'duck';
    if (role === 'huge') return 'double';
    if (role === 'heart') return 'collect';
    return 'jump';
};

export interface PatternStep {
    role: ObstacleRole;
    /** Seconds after the pattern's first obstacle that this one reaches the runner. */
    at: number;
}

export interface Pattern {
    id: string;
    /** How demanding it is. A stage only picks patterns that fit its current budget. */
    cost: number;
    steps: PatternStep[];
}

export const PATTERNS: Pattern[] = [
    // One thing to do
    { id: 'small', cost: 1, steps: [{ role: 'small', at: 0 }] },
    { id: 'large', cost: 1, steps: [{ role: 'large', at: 0 }] },
    { id: 'bar', cost: 1, steps: [{ role: 'overhead', at: 0 }] },
    { id: 'mover', cost: 2, steps: [{ role: 'mover', at: 0 }] },
    // Two blocks close enough that one jump clears both
    { id: 'pair', cost: 2, steps: [{ role: 'small', at: 0 }, { role: 'small', at: 0.15 }] },
    // Two things in a row
    { id: 'hop-hop', cost: 2, steps: [{ role: 'small', at: 0 }, { role: 'large', at: 0.95 }] },
    { id: 'bar-bar', cost: 2, steps: [{ role: 'overhead', at: 0 }, { role: 'overhead', at: 0.5 }] },
    { id: 'bar-hop', cost: 3, steps: [{ role: 'overhead', at: 0 }, { role: 'small', at: 0.6 }] },
    { id: 'hop-bar', cost: 3, steps: [{ role: 'large', at: 0 }, { role: 'overhead', at: 1.1 }] },
    { id: 'mover-hop', cost: 3, steps: [{ role: 'mover', at: 0 }, { role: 'small', at: 1.15 }] },
    // Three in a row
    { id: 'triple', cost: 3, steps: [{ role: 'small', at: 0 }, { role: 'small', at: 0.95 }, { role: 'small', at: 1.9 }] },
    { id: 'bar-hop-bar', cost: 4, steps: [{ role: 'overhead', at: 0 }, { role: 'large', at: 0.6 }, { role: 'overhead', at: 1.75 }] },
    { id: 'hop-bar-hop', cost: 4, steps: [{ role: 'small', at: 0 }, { role: 'overhead', at: 1.1 }, { role: 'small', at: 1.7 }] },
    // Holes in the floor (from stage 2): jump them like a block, but there's no ducking past
    { id: 'hole', cost: 1, steps: [{ role: 'hole', at: 0 }] },
    { id: 'hole-hop', cost: 2, steps: [{ role: 'hole', at: 0 }, { role: 'small', at: 1.0 }] },
    { id: 'bar-hole', cost: 3, steps: [{ role: 'overhead', at: 0 }, { role: 'hole', at: 0.6 }] },
    { id: 'hole-bar', cost: 3, steps: [{ role: 'hole', at: 0 }, { role: 'overhead', at: 1.15 }] },
    // The wide block: needs a double jump, so only appears when the energy bar is full
    { id: 'huge', cost: 4, steps: [{ role: 'huge', at: 0 }] },
];

/**
 * The least time between one pattern's last obstacle passing the runner and the next
 * pattern's first one arriving. A jump lasts 0.67 sec and you can't duck in mid-air, so
 * anything after a jump needs the most room.
 */
const MIN_GAP: Record<Move, Record<Move, number>> = {
    jump:    { jump: 0.75, double: 0.9, duck: 0.9, collect: 0.3 },
    double:  { jump: 1.1,  double: 1.1, duck: 1.1, collect: 0.3 },
    duck:    { jump: 0.4,  double: 0.5, duck: 0.35, collect: 0.3 },
    collect: { jump: 0.3,  double: 0.3, duck: 0.3, collect: 0.3 },
};

/** A purple sphere speeds up and slows down as it comes, so it gets extra room either side. */
const MOVER_SLACK = 0.15;

export const minGapSec = (prev: ObstacleRole, next: ObstacleRole) =>
    MIN_GAP[moveFor(prev)][moveFor(next)] +
    (prev === 'mover' ? MOVER_SLACK : 0) +
    (next === 'mover' ? MOVER_SLACK : 0);

/** How long a pattern takes to pass the runner, from its first obstacle's front edge. */
export const patternLengthSec = (pattern: Pattern, speedPxPerSec: number) =>
    Math.max(...pattern.steps.map((s) => s.at + shapeFor(s.role).width / speedPxPerSec));
