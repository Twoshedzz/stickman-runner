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
import { qualifies, SEASON, WorldEntry } from './rules';

/** The live site. The phone app has no site of its own, so it asks this one. */
const SITE = 'https://stickman-runner-twoshedzzs-projects.vercel.app';
const API = Platform.OS === 'web' ? '/api/scores' : `${SITE}/api/scores`;
/** Give up waiting after this long: a slow answer is treated like no signal. */
const TIMEOUT_MS = 6000;

/**
 * Whether scores can go to the world board. Off in the pace test build (step 12): previews share
 * the real board, and test scores can't be compared with it. With it off, nothing is ever sent:
 * not asked for initials, not posted, and any held-back score stays where it is. The board can
 * still be looked at.
 */
export const WORLD_SCORES_OPEN: boolean = false;

const CACHE_KEY = `WORLD_BOARD_SEASON_${SEASON}`;
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

interface Submission {
    initials: string;
    score: number;
    completed: boolean;
}

const request = async (init?: RequestInit) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        return await fetch(API, { ...init, signal: controller.signal });
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

export const loadBoard = async (): Promise<{ status: BoardStatus; entries: WorldEntry[] }> => {
    const cached = await readJson<WorldEntry[]>(CACHE_KEY, []);
    try {
        const response = await request();
        if (isOff(response.status)) return { status: 'off', entries: [] };
        if (!response.ok) return { status: 'offline', entries: cached };
        const data = await response.json().catch(() => null);
        // Not JSON (a dev server hands back the game's page instead): no board here.
        if (!data || !Array.isArray(data.entries)) return { status: 'off', entries: [] };
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data.entries)).catch(() => {});
        return { status: 'ok', entries: data.entries };
    } catch {
        return { status: 'offline', entries: cached };
    }
};

/** Send one score. Returns the new board too, when it got through. */
const post = async (submission: Submission): Promise<{ result: SendOutcome; entries?: WorldEntry[] }> => {
    if (!WORLD_SCORES_OPEN) return { result: { outcome: 'refused' } };
    try {
        const response = await request({
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
 * Try again with any scores that couldn't be sent before. Keeps only those still stuck,
 * and returns the board as it stands after the last one that got through.
 */
export const flushPending = async (): Promise<WorldEntry[] | null> => {
    if (!WORLD_SCORES_OPEN) return null;
    const pending = await readJson<Submission[]>(PENDING_KEY, []);
    if (pending.length === 0) return null;
    const stuck: Submission[] = [];
    let board: WorldEntry[] | null = null;
    for (const submission of pending) {
        const { result, entries } = await post(submission);
        if (result.outcome === 'queued') stuck.push(submission);
        if (entries) board = entries;
    }
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(stuck)).catch(() => {});
    return board;
};

/** The world board for the screens: what's on it, and sending to it. */
export const useWorldBoard = () => {
    const [entries, setEntries] = useState<WorldEntry[]>([]);
    const [status, setStatus] = useState<BoardStatus>('loading');
    const [lastInitials, setLastInitials] = useState('AAA');

    const refresh = useCallback(async () => {
        const board = await loadBoard();
        setStatus(board.status);
        setEntries(board.entries);
        if (board.status !== 'ok') return;
        // Scores held back for lack of signal go now, and the board shows them.
        const after = await flushPending();
        if (after) setEntries(after);
    }, []);

    useEffect(() => {
        refresh();
        AsyncStorage.getItem(INITIALS_KEY).then((v) => { if (v) setLastInitials(v); }).catch(() => {});
    }, [refresh]);

    /** There's a board to show: live, or the last one seen while there's no signal. */
    const available = status === 'ok' || (status === 'offline' && entries.length > 0);

    const canEnter = useCallback(
        (score: number) => WORLD_SCORES_OPEN && available && qualifies(score, entries),
        [available, entries]
    );

    const submit = useCallback(async (submission: Submission): Promise<SendOutcome> => {
        setLastInitials(submission.initials);
        AsyncStorage.setItem(INITIALS_KEY, submission.initials).catch(() => {});
        const { result, entries: board } = await post(submission);
        if (board) {
            setEntries(board);
            setStatus('ok');
            AsyncStorage.setItem(CACHE_KEY, JSON.stringify(board)).catch(() => {});
        }
        if (result.outcome === 'queued') await queue(submission);
        return result;
    }, []);

    return { entries, status, available, lastInitials, refresh, canEnter, submit };
};
