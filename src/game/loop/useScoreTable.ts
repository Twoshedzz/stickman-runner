import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DIFFICULTY_IDS, DifficultyId } from '../../scoreboard/rules';
import { GameState } from '../state';

/** One run in the score table. */
export interface ScoreEntry {
    score: number;
    /** ISO date the run ended. */
    date: string;
    /** Cleared every stage, rather than running out of health. */
    completed: boolean;
}

const SCORE_TABLE_SIZE = 5;

/**
 * Where a difficulty's scores are kept on the phone. Easy has the keys from before there were
 * difficulties, so the scores people already have stay there.
 */
export const scoreKeys = (difficulty: DifficultyId) =>
    difficulty === 'easy'
        ? { highScore: 'HIGH_SCORE', table: 'SCORE_TABLE' }
        : { highScore: `HIGH_SCORE_${difficulty}`, table: `SCORE_TABLE_${difficulty}` };

/**
 * The high score and the best runs for each difficulty, kept between sessions. Hands back the
 * ones for `difficulty`, the one picked on the title screen.
 *
 * The high score on screen follows the score live, but it's only written to the phone's
 * storage at moments that matter: the end of a run, a pause, and the app going to the
 * background (so a run that's killed part-way still keeps it). Writing it on every frame
 * the score went up was wasted work.
 */
export const useScoreTable = (difficulty: DifficultyId) => {
    const [highScores, setHighScores] = useState<Record<DifficultyId, number>>({ easy: 0, medium: 0, hard: 0 });
    const highScoresRef = useRef(highScores);
    /** The high scores as last read from or written to storage. */
    const storedHighScoresRef = useRef({ ...highScores });

    // The best runs. Every run that scores goes in, not only ones that finish, so a big
    // score that died in stage 4 still counts.
    const [scoreTables, setScoreTables] = useState<Record<DifficultyId, ScoreEntry[]>>({ easy: [], medium: [], hard: [] });
    const scoreTablesRef = useRef(scoreTables);
    /** Where the run that just ended landed in its table, or -1 if it didn't make it. */
    const [newScoreIndex, setNewScoreIndex] = useState(-1);
    const recordedRef = useRef(false);

    // Load the score tables
    useEffect(() => {
        for (const id of DIFFICULTY_IDS) {
            AsyncStorage.getItem(scoreKeys(id).table).then((raw) => {
                if (!raw) return;
                try {
                    const saved = JSON.parse(raw);
                    if (Array.isArray(saved)) {
                        scoreTablesRef.current = { ...scoreTablesRef.current, [id]: saved };
                        setScoreTables(scoreTablesRef.current);
                    }
                } catch {
                    // A corrupt table just starts empty again.
                }
            });
        }
    }, []);

    // Load the high scores
    useEffect(() => {
        for (const id of DIFFICULTY_IDS) {
            AsyncStorage.getItem(scoreKeys(id).highScore).then(value => {
                if (value) {
                    const score = parseInt(value, 10);
                    highScoresRef.current = { ...highScoresRef.current, [id]: score };
                    setHighScores(highScoresRef.current);
                    storedHighScoresRef.current[id] = score;
                }
            });
        }
    }, []);

    /** Every frame of a run: a score past the high score becomes the new one, on screen. */
    const noteScore = useCallback((id: DifficultyId, score: number) => {
        if (score > highScoresRef.current[id]) {
            highScoresRef.current = { ...highScoresRef.current, [id]: score };
            setHighScores(highScoresRef.current);
        }
    }, []);

    /** Write the high scores to storage, any that have gone up since they were last written. */
    const saveHighScore = useCallback(() => {
        for (const id of DIFFICULTY_IDS) {
            if (highScoresRef.current[id] > storedHighScoresRef.current[id]) {
                storedHighScoresRef.current[id] = highScoresRef.current[id];
                AsyncStorage.setItem(scoreKeys(id).highScore, highScoresRef.current[id].toString());
            }
        }
    }, []);

    /**
     * A run has ended: save the high score, and put the run in its difficulty's table, once.
     * Debug runs are left out of the table, since debug mode switches off damage and would
     * flood it.
     */
    const recordRun = useCallback((state: GameState) => {
        if (recordedRef.current) return;
        recordedRef.current = true;
        saveHighScore();
        if (state.score > 0 && !state.debugMode) {
            const id = state.difficulty;
            const entry: ScoreEntry = {
                score: state.score,
                date: new Date().toISOString(),
                completed: state.gameComplete,
            };
            const table = [...scoreTablesRef.current[id], entry]
                .sort((a, b) => b.score - a.score)
                .slice(0, SCORE_TABLE_SIZE);
            scoreTablesRef.current = { ...scoreTablesRef.current, [id]: table };
            setScoreTables(scoreTablesRef.current);
            setNewScoreIndex(table.indexOf(entry));
            AsyncStorage.setItem(scoreKeys(id).table, JSON.stringify(table));
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

    return {
        highScore: highScores[difficulty],
        scoreTable: scoreTables[difficulty],
        newScoreIndex, noteScore, saveHighScore, recordRun, unrecordRun, newRun,
    };
};
