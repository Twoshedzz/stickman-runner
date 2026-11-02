/**
 * The world scoreboard's rules, shared by the game and the server (api/scores.ts), so both
 * agree on what a valid entry is. Plain TypeScript with no app imports: the server builds it
 * on its own.
 *
 * Entries are three letters, a score, a date, and whether the run cleared every stage. No
 * accounts and nothing personal: children play this.
 */

export const INITIALS_LENGTH = 3;
export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** How many entries the board shows. The server keeps a few more, to say where you came. */
export const BOARD_SIZE = 10;

/** Each difficulty has its own board. Their paces are in src/game/pace.ts. */
export const DIFFICULTY_IDS = ['easy', 'medium', 'hard'] as const;
export type DifficultyId = (typeof DIFFICULTY_IDS)[number];

export const isDifficulty = (value: unknown): value is DifficultyId =>
    DIFFICULTY_IDS.includes(value as DifficultyId);

/**
 * Bump this when the scoring rules change enough that old scores aren't comparable: the
 * board starts empty again, like a new season. The old one stays in the database.
 */
export const SEASON = 1;

/**
 * No run can score more than this. Each stage has a few hundred pickups and about 130
 * obstacles at Easy's pace, more at Medium's and Hard's, all at ×4 at best. One limit for all
 * three boards, set by Hard: src/scoreboard/__tests__/rules.test.ts checks it stays at least
 * 1.25× the real maximum. A made-up score above it is turned away.
 */
export const MAX_SCORE = 25000;

/**
 * Three-letter words that won't go on a public board. Kept short on purpose: three letters
 * leave little room for trouble. Add to it if something gets through.
 */
const BLOCKED = new Set([
    'ASS', 'CUM', 'FUK', 'FUC', 'FCK', 'FUX', 'FUQ', 'SEX', 'TIT', 'DIK', 'DIC', 'COK', 'COC',
    'CNT', 'KNT', 'NOB', 'PIS', 'VAG', 'WTF', 'KKK', 'NAZ', 'FAG', 'NIG', 'NGR', 'HOE',
    'KYS', 'SHT', 'JIZ',
]);

export const isBlocked = (initials: string) => BLOCKED.has(initials.toUpperCase());

export const isValidInitials = (initials: unknown): initials is string =>
    typeof initials === 'string' &&
    initials.length === INITIALS_LENGTH &&
    [...initials].every((c) => LETTERS.includes(c)) &&
    !isBlocked(initials);

export const isValidScore = (score: unknown): score is number =>
    typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= MAX_SCORE;

/** One line on the world board. */
export interface WorldEntry {
    initials: string;
    score: number;
    /** ISO date the run ended, as the server saw it. */
    date: string;
    /** Cleared every stage. */
    completed: boolean;
}

/** Would this score get onto the board as it stands? */
export const qualifies = (score: number, board: WorldEntry[]) =>
    isValidScore(score) &&
    (board.length < BOARD_SIZE || score > board[BOARD_SIZE - 1].score);
