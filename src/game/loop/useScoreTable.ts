import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GameState } from '../state';

/** One run in the score table. */
export interface ScoreEntry {
    score: number;
    /** ISO date the run ended. */
    date: string;
    /** Cleared every stage, rather than running out of health. */
    completed: boolean;
}

const HIGH_SCORE_KEY = 'HIGH_SCORE';
const SCORE_TABLE_KEY = 'SCORE_TABLE';
const SCORE_TABLE_SIZE = 5;

/**
 * The high score and the best runs, kept between sessions.
 *
 * The high score on screen follows the score live, but it's only written to the phone's
 * storage at moments that matter: the end of a run, a pause, and the app going to the
 * background (so a run that's killed part-way still keeps it). Writing it on every frame
 * the score went up was wasted work.
 */
export const useScoreTable = () => {
    const [highScore, setHighScore] = useState(0);
    const highScoreRef = useRef(0);
    /** The high score as last read from or written to storage. */
    const storedHighScoreRef = useRef(0);

    // The best runs. Every run that scores goes in, not only ones that finish, so a big
    // score that died in stage 4 still counts.
    const [scoreTable, setScoreTable] = useState<ScoreEntry[]>([]);
    const scoreTableRef = useRef<ScoreEntry[]>([]);
    /** Where the run that just ended landed in the table, or -1 if it didn't make it. */
    const [newScoreIndex, setNewScoreIndex] = useState(-1);
    const recordedRef = useRef(false);

    // Load the score table
    useEffect(() => {
        AsyncStorage.getItem(SCORE_TABLE_KEY).then((raw) => {
            if (!raw) return;
            try {
                const saved = JSON.parse(raw);
                if (Array.isArray(saved)) {
                    scoreTableRef.current = saved;
                    setScoreTable(saved);
                }
            } catch {
                // A corrupt table just starts empty again.
            }
        });
    }, []);

    // Load the high score
    useEffect(() => {
        AsyncStorage.getItem(HIGH_SCORE_KEY).then(value => {
            if (value) {
                const score = parseInt(value, 10);
                setHighScore(score);
                highScoreRef.current = score;
                storedHighScoreRef.current = score;
            }
        });
    }, []);

    /** Every frame of a run: a score past the high score becomes the new one, on screen. */
    const noteScore = useCallback((score: number) => {
        if (score > highScoreRef.current) {
            highScoreRef.current = score;
            setHighScore(score);
        }
    }, []);

    /** Write the high score to storage, if it's gone up since it was last written. */
    const saveHighScore = useCallback(() => {
        if (highScoreRef.current > storedHighScoreRef.current) {
            storedHighScoreRef.current = highScoreRef.current;
            AsyncStorage.setItem(HIGH_SCORE_KEY, highScoreRef.current.toString());
        }
    }, []);

    /**
     * A run has ended: save the high score, and put the run in the table, once. Debug runs are
     * left out of the table, since debug mode switches off damage and would flood it.
     */
    const recordRun = useCallback((state: GameState) => {
        if (recordedRef.current) return;
        recordedRef.current = true;
        saveHighScore();
        if (state.score > 0 && !state.debugMode) {
            const entry: ScoreEntry = {
                score: state.score,
                date: new Date().toISOString(),
                completed: state.gameComplete,
            };
            const table = [...scoreTableRef.current, entry]
                .sort((a, b) => b.score - a.score)
                .slice(0, SCORE_TABLE_SIZE);
            scoreTableRef.current = table;
            setScoreTable(table);
            setNewScoreIndex(table.indexOf(entry));
            AsyncStorage.setItem(SCORE_TABLE_KEY, JSON.stringify(table));
        } else {
            setNewScoreIndex(-1);
        }
    }, [saveHighScore]);

    /** The run carries on after all (debug jump to a stage): it can be recorded when it ends. */
    const unrecordRun = useCallback(() => {
        recordedRef.current = false;
    }, []);

    /** A new run, or back to the title: nothing recorded yet, and no place in the table to show. */
    const newRun = useCallback(() => {
        recordedRef.current = false;
        setNewScoreIndex(-1);
    }, []);

    return { highScore, scoreTable, newScoreIndex, noteScore, saveHighScore, recordRun, unrecordRun, newRun };
};
