/**
 * The world scoreboard's rules, and a check that the score limit stays well above anything
 * a real run can reach as the scoring changes.
 */
import { mostPossibleScore } from '../../game/difficulty/pretendPlayer';
import { DIFFICULTIES } from '../../game/pace';
import { BOARD_SIZE, DIFFICULTY_IDS, isDifficulty, isValidInitials, isValidScore, MAX_SCORE, qualifies, WorldEntry } from '../rules';

describe('difficulties', () => {
    it('the three in the pace table are the three with boards', () => {
        expect(DIFFICULTIES.map((d) => d.id)).toEqual([...DIFFICULTY_IDS]);
    });

    it('anything else is not one', () => {
        expect(isDifficulty('hard')).toBe(true);
        for (const other of ['HARD', 'nightmare', '', null, undefined, 1]) expect(isDifficulty(other)).toBe(false);
    });
});

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
        // Everything a whole run could possibly collect or clear, all at ×4. Hard, the fastest,
        // places the most.
        for (const id of DIFFICULTY_IDS) {
            expect(MAX_SCORE).toBeGreaterThan(mostPossibleScore(id) * 1.25);
        }
        expect(mostPossibleScore('hard')).toBeGreaterThan(mostPossibleScore('easy'));
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
