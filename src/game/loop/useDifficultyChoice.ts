/**
 * The difficulty picked on the title screen. It lasts from run to run until it's changed, but
 * only in memory: a fresh start of the game is on Easy.
 */
import { RefObject, useCallback, useRef, useState } from 'react';
import { DifficultyId } from '../pace';
import { GameState } from '../state';

export const useDifficultyChoice = (stateRef: RefObject<GameState>) => {
    const [difficulty, setDifficulty] = useState<DifficultyId>('easy');
    const difficultyRef = useRef(difficulty);

    /** A run about to start takes the choice. */
    const applyDifficulty = useCallback((state: GameState) => {
        state.difficulty = difficultyRef.current;
    }, []);

    const pickDifficulty = useCallback((next: DifficultyId) => {
        difficultyRef.current = next;
        setDifficulty(next);
        // The title screen's waiting state takes it straight away.
        if (!stateRef.current.gameStarted) applyDifficulty(stateRef.current);
    }, [stateRef, applyDifficulty]);

    return { difficulty, applyDifficulty, pickDifficulty };
};
