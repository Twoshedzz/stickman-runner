/**
 * The game's side of the world scoreboard: fetching the top 10, sending a score, and
 * holding on to scores that couldn't be sent (no signal) until next time.
 *
 * The board is a nice extra, never a requirement: if it can't be reached the game carries
 * on with its own best-runs table. Until the database is connected on Vercel the server
 * answers "not set up" and the world board simply doesn't appear.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { DIFFICULTY_IDS, DifficultyId, qualifies, SEASON, WorldEntry } from './rules';

/** The live site. The phone app has no site of its own, so it asks this one. */
const SITE = 'https://stickman-runner-twoshedzzs-projects.vercel.app';
const API = Platform.OS === 'web' ? '/api/scores' : `${SITE}/api/scores`;
/** Give up waiting after this long: a slow answer is treated like no signal. */
const TIMEOUT_MS = 6000;

/** The last board seen, for no signal. Easy has the key from before there were difficulties. */
export const cacheKey = (difficulty: DifficultyId) =>
    difficulty === 'easy' ? `WORLD_BOARD_SEASON_${SEASON}` : `WORLD_BOARD_SEASON_${SEASON}_${difficulty}`;
const PENDING_KEY = `WORLD_PENDING_SEASON_${SEASON}`;
const INITIALS_KEY = 'LAST_INITIALS';

/** 'off': no board to show (not set up yet, or a dev server with no /api). */
export type BoardStatus = 'loading' | 'ok' | 'offline' | 'off';

/** What happened to a score sent to the board. */
export type SendOutcome =
    | { outcome: 'sending' }
    | { outcome: 'sent'; rank: number | null }
    | { outcome: 'queued' }
    | { outcome: 'refused' };

export interface Submission {
    initials: string;
    score: number;
    completed: boolean;
    difficulty: DifficultyId;
}

/** One difficulty's board as the game knows it. */
export interface Board {
    status: BoardStatus;
    entries: WorldEntry[];
}

const request = async (url: string, init?: RequestInit) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
};

const readJson = async <T,>(key: string, fallback: T): Promise<T> => {
    try {
        const raw = await AsyncStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
};

/** Answers that mean the board isn't there at all, rather than a passing problem. */
const isOff = (status: number) => status === 503 || status === 404;

export const loadBoard = async (difficulty: DifficultyId): Promise<Board> => {
    const cached = await readJson<WorldEntry[]>(cacheKey(difficulty), []);
    try {
        const response = await request(`${API}?difficulty=${difficulty}`);
        if (isOff(response.status)) return { status: 'off', entries: [] };
        if (!response.ok) return { status: 'offline', entries: cached };
        const data = await response.json().catch(() => null);
        // Not JSON (a dev server hands back the game's page instead): no board here.
        if (!data || !Array.isArray(data.entries)) return { status: 'off', entries: [] };
        // A server from before there were difficulties only has Easy's board. Leaving the others
        // off means no one is asked to send a Hard score to a server that would put it on Easy's.
        if ((data.difficulty ?? 'easy') !== difficulty) return { status: 'off', entries: [] };
        AsyncStorage.setItem(cacheKey(difficulty), JSON.stringify(data.entries)).catch(() => {});
        return { status: 'ok', entries: data.entries };
    } catch {
        return { status: 'offline', entries: cached };
    }
};

/** Send one score. Returns the new board too, when it got through. */
const post = async (submission: Submission): Promise<{ result: SendOutcome; entries?: WorldEntry[] }> => {
    try {
        const response = await request(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submission),
        });
        if (response.ok) {
            const data = await response.json();
            return { result: { outcome: 'sent', rank: data.rank ?? null }, entries: data.entries };
        }
        // Turned away (bad entry, too many) or not set up: trying again won't help.
        if (response.status < 500 || isOff(response.status)) return { result: { outcome: 'refused' } };
        return { result: { outcome: 'queued' } };
    } catch {
        return { result: { outcome: 'queued' } };
    }
};

const queue = async (submission: Submission) => {
    const pending = await readJson<Submission[]>(PENDING_KEY, []);
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify([...pending, submission].slice(-5))).catch(() => {});
};

/**
 * Try again with any scores that couldn't be sent before, each to its own difficulty's board.
 * Keeps only those still stuck, and returns each board as it stands after the last one that got
 * through. A score held back from before there were difficulties is Easy's.
 */
export const flushPending = async (): Promise<Partial<Record<DifficultyId, WorldEntry[]>>> => {
    const pending = await readJson<(Omit<Submission, 'difficulty'> & Partial<Submission>)[]>(PENDING_KEY, []);
    const boards: Partial<Record<DifficultyId, WorldEntry[]>> = {};
    if (pending.length === 0) return boards;
    const stuck: Submission[] = [];
    for (const held of pending) {
        const submission: Submission = { ...held, difficulty: held.difficulty ?? 'easy' };
        const { result, entries } = await post(submission);
        if (result.outcome === 'queued') stuck.push(submission);
        if (entries) boards[submission.difficulty] = entries;
    }
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(stuck)).catch(() => {});
    return boards;
};

/** There's a board to show: live, or the last one seen while there's no signal. */
export const isAvailable = ({ status, entries }: Board) => status === 'ok' || (status === 'offline' && entries.length > 0);

/** Would this score be asked for initials on this board? */
export const canEnterBoard = (score: number, board: Board) => isAvailable(board) && qualifies(score, board.entries);

const NOT_LOADED: Board = { status: 'loading', entries: [] };

/**
 * The world boards for the screens: what's on them, and sending to them. All three are loaded
 * at the start, so the title screen can change board at once when the difficulty changes.
 * `entries`, `status` and `available` are for `difficulty`, the one picked.
 */
export const useWorldBoard = (difficulty: DifficultyId) => {
    const [boards, setBoards] = useState<Record<DifficultyId, Board>>({ easy: NOT_LOADED, medium: NOT_LOADED, hard: NOT_LOADED });
    const [lastInitials, setLastInitials] = useState('AAA');

    const setBoard = useCallback((id: DifficultyId, board: Board) => {
        setBoards((current) => ({ ...current, [id]: board }));
    }, []);

    /** Scores held back for lack of signal go now, and the boards show them. */
    const sendHeldBack = useCallback(async () => {
        const after = await flushPending();
        for (const id of DIFFICULTY_IDS) {
            const entries = after[id];
            if (entries) setBoard(id, { status: 'ok', entries });
        }
    }, [setBoard]);

    /** Look at one board afresh. */
    const refresh = useCallback(async (id: DifficultyId) => {
        const board = await loadBoard(id);
        setBoard(id, board);
        if (board.status === 'ok') await sendHeldBack();
    }, [setBoard, sendHeldBack]);

    useEffect(() => {
        (async () => {
            const loaded = await Promise.all(DIFFICULTY_IDS.map(async (id) => {
                const board = await loadBoard(id);
                setBoard(id, board);
                return board;
            }));
            if (loaded.some((board) => board.status === 'ok')) await sendHeldBack();
        })();
        AsyncStorage.getItem(INITIALS_KEY).then((v) => { if (v) setLastInitials(v); }).catch(() => {});
    }, [setBoard, sendHeldBack]);

    const canEnter = useCallback(
        (score: number, id: DifficultyId) => canEnterBoard(score, boards[id]),
        [boards]
    );

    const submit = useCallback(async (submission: Submission): Promise<SendOutcome> => {
        setLastInitials(submission.initials);
        AsyncStorage.setItem(INITIALS_KEY, submission.initials).catch(() => {});
        const { result, entries: board } = await post(submission);
        if (board) {
            setBoard(submission.difficulty, { status: 'ok', entries: board });
            AsyncStorage.setItem(cacheKey(submission.difficulty), JSON.stringify(board)).catch(() => {});
        }
        if (result.outcome === 'queued') await queue(submission);
        return result;
    }, [setBoard]);

    const { entries, status } = boards[difficulty];
    return { entries, status, available: isAvailable(boards[difficulty]), lastInitials, refresh, canEnter, submit };
};
