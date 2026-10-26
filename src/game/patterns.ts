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
import { Move, moveFor, ObstacleRole, shapeFor } from './obstacleCatalogue';

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
    { id: 'hole-hole', cost: 3, steps: [{ role: 'hole', at: 0 }, { role: 'hole', at: 1.0 }] },
    { id: 'mover-bar', cost: 3, steps: [{ role: 'mover', at: 0 }, { role: 'overhead', at: 1.25 }] },
    // Longer runs, for the later stages
    { id: 'bar-bar-hop', cost: 4, steps: [{ role: 'overhead', at: 0 }, { role: 'overhead', at: 0.5 }, { role: 'small', at: 1.1 }] },
    { id: 'pair-bar', cost: 4, steps: [{ role: 'small', at: 0 }, { role: 'small', at: 0.15 }, { role: 'overhead', at: 1.15 }] },
    { id: 'hole-hop-hole', cost: 4, steps: [{ role: 'hole', at: 0 }, { role: 'small', at: 1.0 }, { role: 'hole', at: 2.0 }] },
    // Switching between ducking and jumping, quick-fire: the runs players enjoy most
    { id: 'weave', cost: 4, steps: [{ role: 'overhead', at: 0 }, { role: 'hole', at: 0.6 }, { role: 'overhead', at: 1.75 }, { role: 'small', at: 2.35 }, { role: 'overhead', at: 3.5 }] },
    { id: 'zigzag', cost: 4, steps: [{ role: 'small', at: 0 }, { role: 'overhead', at: 1.1 }, { role: 'hole', at: 1.7 }, { role: 'overhead', at: 2.85 }] },
    { id: 'quad', cost: 5, steps: [{ role: 'small', at: 0 }, { role: 'large', at: 0.95 }, { role: 'small', at: 1.9 }, { role: 'large', at: 2.85 }] },
    { id: 'hole-bar-hole', cost: 5, steps: [{ role: 'hole', at: 0 }, { role: 'overhead', at: 1.15 }, { role: 'hole', at: 1.75 }] },
    { id: 'gauntlet', cost: 5, steps: [{ role: 'overhead', at: 0 }, { role: 'small', at: 0.6 }, { role: 'overhead', at: 1.75 }, { role: 'hole', at: 2.35 }] },
    // More runs mixing them, so most of the time there's something coming (step 11). The same
    // spacings as above: a pattern is busier by being longer, not by squeezing its gaps.
    { id: 'pair-hop', cost: 3, steps: [{ role: 'small', at: 0 }, { role: 'small', at: 0.15 }, { role: 'large', at: 1.1 }] },
    { id: 'bar-pair', cost: 3, steps: [{ role: 'overhead', at: 0 }, { role: 'small', at: 0.6 }, { role: 'small', at: 0.75 }] },
    { id: 'bar-bar-bar', cost: 3, steps: [{ role: 'overhead', at: 0 }, { role: 'overhead', at: 0.5 }, { role: 'overhead', at: 1.0 }] },
    { id: 'hop-bar-bar', cost: 4, steps: [{ role: 'small', at: 0 }, { role: 'overhead', at: 1.1 }, { role: 'overhead', at: 1.6 }] },
    { id: 'bar-hop-hop', cost: 4, steps: [{ role: 'overhead', at: 0 }, { role: 'small', at: 0.6 }, { role: 'large', at: 1.55 }] },
    { id: 'stairs', cost: 4, steps: [{ role: 'small', at: 0 }, { role: 'large', at: 0.95 }, { role: 'hole', at: 1.95 }] },
    { id: 'hop-hole-hop', cost: 4, steps: [{ role: 'small', at: 0 }, { role: 'hole', at: 1.0 }, { role: 'small', at: 2.0 }] },
    { id: 'hole-hop-bar', cost: 4, steps: [{ role: 'hole', at: 0 }, { role: 'small', at: 1.0 }, { role: 'overhead', at: 2.1 }] },
    { id: 'mover-bar-hop', cost: 4, steps: [{ role: 'mover', at: 0 }, { role: 'overhead', at: 1.25 }, { role: 'small', at: 1.85 }] },
    { id: 'mover-mover', cost: 4, steps: [{ role: 'mover', at: 0 }, { role: 'mover', at: 1.45 }] },
    { id: 'hop-pair', cost: 3, steps: [{ role: 'small', at: 0 }, { role: 'small', at: 0.95 }, { role: 'small', at: 1.1 }] },
    { id: 'bar-bar-pair', cost: 4, steps: [{ role: 'overhead', at: 0 }, { role: 'overhead', at: 0.5 }, { role: 'small', at: 1.1 }, { role: 'small', at: 1.25 }] },
    { id: 'pair-bar-bar', cost: 4, steps: [{ role: 'small', at: 0 }, { role: 'small', at: 0.15 }, { role: 'overhead', at: 1.25 }, { role: 'overhead', at: 1.75 }] },
    { id: 'run', cost: 5, steps: [{ role: 'small', at: 0 }, { role: 'overhead', at: 1.1 }, { role: 'small', at: 1.7 }, { role: 'overhead', at: 2.8 }, { role: 'hole', at: 3.4 }, { role: 'overhead', at: 4.55 }] },
    // The wide block: needs a double jump, so only appears when the energy bar allows (spawn.ts)
    { id: 'huge', cost: 4, steps: [{ role: 'huge', at: 0 }] },
    // A gap across the whole floor: a double jump too, and the same energy rule
    { id: 'void', cost: 4, steps: [{ role: 'void', at: 0 }] },
    // Ducking and jumping in quick alternation, and voids in among them to mix it up
    { id: 'switchback', cost: 4, steps: [{ role: 'overhead', at: 0 }, { role: 'small', at: 0.6 }, { role: 'overhead', at: 1.7 }, { role: 'small', at: 2.3 }] },
    { id: 'flicker', cost: 5, steps: [{ role: 'overhead', at: 0 }, { role: 'small', at: 0.6 }, { role: 'overhead', at: 1.7 }, { role: 'hole', at: 2.3 }, { role: 'overhead', at: 3.4 }, { role: 'small', at: 4.0 }] },
    { id: 'bar-void', cost: 4, steps: [{ role: 'overhead', at: 0 }, { role: 'void', at: 1.0 }] },
    { id: 'void-bar', cost: 4, steps: [{ role: 'void', at: 0 }, { role: 'overhead', at: 1.6 }] },
    { id: 'hop-void', cost: 4, steps: [{ role: 'small', at: 0 }, { role: 'void', at: 1.3 }] },
    { id: 'bar-void-bar', cost: 5, steps: [{ role: 'overhead', at: 0 }, { role: 'void', at: 1.0 }, { role: 'overhead', at: 2.6 }] },
    // Two voids in quick succession: takes the whole energy bar, so only when it's full (spawn.ts)
    { id: 'void-void', cost: 5, steps: [{ role: 'void', at: 0 }, { role: 'void', at: 1.9 }] },
];

/**
 * The least time between one pattern's last obstacle passing the runner and the next
 * pattern's first one arriving. A jump lasts 0.67 sec and you can't duck in mid-air, so
 * anything after a jump needs the most room.
 */
const MIN_GAP: Record<Move, Record<Move, number>> = {
    jump:    { jump: 0.65, double: 0.9, duck: 0.85, collect: 0.3 },
    double:  { jump: 1.1,  double: 1.1, duck: 1.1, collect: 0.3 },
    duck:    { jump: 0.4,  double: 0.5, duck: 0.35, collect: 0.3 },
    collect: { jump: 0.3,  double: 0.3, duck: 0.3, collect: 0.3 },
};

/** A purple sphere speeds up and slows down as it comes, so it gets extra room either side. */
const MOVER_SLACK = 0.15;

export const minGapSec = (prev: ObstacleRole, next: ObstacleRole) =>
    MIN_GAP[moveFor(prev)][moveFor(next)] +
    (shapeFor(prev).moves ? MOVER_SLACK : 0) +
    (shapeFor(next).moves ? MOVER_SLACK : 0);

/**
 * As a stage builds to its finish, patterns close up: their steps come this much closer
 * together at the busiest (1 = as designed). patterns.test.ts checks every pattern at this
 * tightest spacing too, with human-sized timing at every speed.
 */
export const TIGHTEST_SPACING = 0.88;

/** A pattern's steps closed up by `spacing` (1 = as designed, TIGHTEST_SPACING at the busiest). */
export const closedUp = (pattern: Pattern, spacing: number): PatternStep[] =>
    pattern.steps.map((s) => ({ ...s, at: s.at * spacing }));

/** How long a pattern takes to pass the runner, from its first obstacle's front edge. */
export const patternLengthSec = (pattern: Pattern, speedPxPerSec: number) =>
    Math.max(...pattern.steps.map((s) => s.at + shapeFor(s.role).width / speedPxPerSec));
