/**
 * The world scoreboard's rules, and a check that the score limit stays well above anything
 * a real run can reach as the scoring changes.
 */
import { speedAt, STAGES } from '../../game/stages';
import { createInitialState } from '../../game/state';
import { spawnObstacle } from '../../game/systems/spawn';
import { BOARD_SIZE, isValidInitials, isValidScore, MAX_SCORE, qualifies, WorldEntry } from '../rules';

describe('initials', () => {
    it('three capital letters', () => {
        expect(isValidInitials('ABC')).toBe(true);
        expect(isValidInitials('ZZZ')).toBe(true);
        expect(isValidInitials('AB')).toBe(false);
        expect(isValidInitials('ABCD')).toBe(false);
        expect(isValidInitials('abc')).toBe(false);
        expect(isValidInitials('A1C')).toBe(false);
        expect(isValidInitials('A C')).toBe(false);
        expect(isValidInitials(123)).toBe(false);
    });

    it('not a rude word', () => {
        expect(isValidInitials('ASS')).toBe(false);
        expect(isValidInitials('KKK')).toBe(false);
    });
});

describe('scores', () => {
    it('whole numbers from 1 up to the limit', () => {
        expect(isValidScore(1)).toBe(true);
        expect(isValidScore(MAX_SCORE)).toBe(true);
        expect(isValidScore(0)).toBe(false);
        expect(isValidScore(MAX_SCORE + 1)).toBe(false);
        expect(isValidScore(12.5)).toBe(false);
        expect(isValidScore('100')).toBe(false);
    });

    it('the limit is well above the most a real run could score', () => {
        // Everything a whole run could possibly collect or clear, all at ×4.
        let most = 0;
        for (const stage of STAGES) {
            let busiest = 0;
            for (const seed of [1, 2, 3, 4, 5]) {
                let s = seed;
                const random = () => {
                    s = (s * 1664525 + 1013904223) % 4294967296;
                    return s / 4294967296;
                };
                const state = createInitialState();
                state.stageId = stage.id;
                state.player.health = 5; // hurt, so hearts are placed too
                const frames = Math.round(stage.durationSec * 60);
                const seen = new Set<string>();
                for (let f = 0; f < frames; f++) {
                    state.stageProgress = f / frames;
                    state.elapsedSecInStage = f / 60;
                    state.speed = speedAt(stage, state.stageProgress);
                    spawnObstacle(state, stage, 1 / 60, random);
                    state.obstacles.forEach((o) => seen.add(`o${o.id}`));
                    state.pickups.forEach((p) => seen.add(`p${p.id}`));
                    state.obstacles.forEach((o) => { o.x -= state.speed / 60; });
                    state.pickups.forEach((p) => { p.x -= state.speed / 60; });
                }
                busiest = Math.max(busiest, seen.size);
            }
            most += busiest * 4;
        }
        expect(MAX_SCORE).toBeGreaterThan(most * 1.25);
    });
});

describe('making the board', () => {
    const board = (n: number, score = 100): WorldEntry[] =>
        Array.from({ length: n }, () => ({ initials: 'AAA', score, date: '', completed: false }));

    it('anything counts while the board has room', () => {
        expect(qualifies(1, board(BOARD_SIZE - 1))).toBe(true);
    });

    it('once full, only beating the last place counts', () => {
        expect(qualifies(100, board(BOARD_SIZE))).toBe(false);
        expect(qualifies(101, board(BOARD_SIZE))).toBe(true);
    });

    it('never a score of nothing', () => {
        expect(qualifies(0, [])).toBe(false);
    });
});
