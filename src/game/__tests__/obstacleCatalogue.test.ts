/**
 * Checks the obstacle table is complete and agrees with itself, so the game logic can trust
 * what each entry says it does.
 */
import { Move, moveFor, ObstacleRole, ROLE_SHAPES } from '../obstacleCatalogue';
import { PATTERNS } from '../patterns';

/** What each role has always asked of the player. Change this only on purpose. */
const EXPECTED_MOVE: Record<ObstacleRole, Move> = {
    small: 'jump',
    large: 'jump',
    mover: 'jump',
    huge: 'double',
    overhead: 'duck',
    hole: 'jump',
    void: 'double',
    heart: 'collect',
};

describe('the obstacle table', () => {
    const roles = Object.keys(EXPECTED_MOVE) as ObstacleRole[];

    it('has a complete entry for every role', () => {
        expect(Object.keys(ROLE_SHAPES).sort()).toEqual([...roles].sort());
        for (const role of roles) {
            const art = ROLE_SHAPES[role];
            expect(['block', 'sphere', 'bar', 'hole', 'void', 'heart']).toContain(art.shape);
            expect(art.width).toBeGreaterThan(0);
            expect(art.height).toBeGreaterThanOrEqual(0);
            expect(art.damage).toBeGreaterThanOrEqual(0);
            expect(art.tint).toBeTruthy();
            expect(art.clearBy).toBe(EXPECTED_MOVE[role]);
        }
    });

    it('agrees with itself', () => {
        for (const role of roles) {
            const art = ROLE_SHAPES[role];
            // Only what hangs in the air is ducked under.
            expect(!!art.overhead).toBe(art.clearBy === 'duck');
            // Only pickups are collected, and they never hurt.
            expect(!!art.heals).toBe(art.clearBy === 'collect');
            if (art.heals) expect(art.damage).toBe(0);
            else expect(art.damage).toBeGreaterThan(0);
            // Something you fall into has nothing standing up to bump.
            if (art.fallIn) expect(art.height).toBe(0);
            // Pickups only arc over what a plain, steady jump clears.
            if (art.arcsOver) expect(art.clearBy === 'jump' && !art.moves).toBe(true);
        }
    });

    it("gives every pattern step its role's move", () => {
        for (const pattern of PATTERNS) {
            for (const step of pattern.steps) {
                expect(moveFor(step.role)).toBe(EXPECTED_MOVE[step.role]);
                // Patterns are hazards; hearts are placed separately, in the rests.
                expect(moveFor(step.role)).not.toBe('collect');
            }
        }
    });
});
