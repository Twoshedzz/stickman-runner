/** The world scoreboard around a run: asking for initials, sending the score, and the top 10 screen. */
// Left out of the React Compiler, like the rest of the game screen: see GameScreen.tsx.
'use no memo';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameState } from '../../game/state';
import { BOARD_SIZE } from '../../scoreboard/rules';
import { SendOutcome, useWorldBoard } from '../../scoreboard/worldBoard';
import { useLatest } from './useLatest';

/**
 * The world scoreboard. When a run ends with a score that makes the world top 10, it
 * asks for initials before the Game Over or Finished screen. Debug runs never count.
 */
export const useWorldScoreFlow = (gameState: GameState) => {
    const world = useWorldBoard();
    const [enterInitials, setEnterInitials] = useState<{ score: number; completed: boolean } | null>(null);
    /** What became of the last run's score on the world board, for the end screens. */
    const [worldResult, setWorldResult] = useState<SendOutcome | null>(null);
    /**
     * The world top 10 screen: straight after entering initials ('entered', then on to the
     * end screen), or opened from the title or Game Over menu ('browse').
     */
    const [worldScreen, setWorldScreen] = useState<'entered' | 'browse' | null>(null);
    /** This run's own place on the board, to light up. */
    const myPlace = worldResult?.outcome === 'sent' && worldResult.rank !== null && worldResult.rank < BOARD_SIZE
        ? worldResult.rank
        : -1;
    const runCheckedRef = useRef(false);
    /** A screen with its own keys is open (typing initials, the world board), so the game's keys stand aside. */
    const ownKeysOpenRef = useLatest(enterInitials !== null || worldScreen !== null);
    useEffect(() => {
        if (!gameState.gameOver) {
            // A new run after the last one ended: look at the board afresh, so it's up to
            // date by the time this run ends.
            if (runCheckedRef.current && gameState.gameStarted) {
                runCheckedRef.current = false;
                setWorldResult(null);
                world.refresh();
            }
            return;
        }
        if (runCheckedRef.current) return;
        runCheckedRef.current = true;
        if (!gameState.debugMode && world.canEnter(gameState.score)) {
            setEnterInitials({ score: gameState.score, completed: gameState.gameComplete });
        }
    }, [gameState.gameOver, gameState.gameStarted, gameState.debugMode, gameState.score, gameState.gameComplete, world]);

    const submitInitials = useCallback(async (initials: string) => {
        const entry = enterInitials;
        setEnterInitials(null);
        if (!entry) return;
        setWorldResult({ outcome: 'sending' });
        setWorldScreen('entered');
        setWorldResult(await world.submit({ initials, ...entry }));
    }, [enterInitials, world]);
    const skipInitials = useCallback(() => setEnterInitials(null), []);
    /** Opens the world top 10 from a menu; left out when there's no board to show. */
    const browseWorld = world.available ? () => setWorldScreen('browse') : undefined;
    const closeWorld = useCallback(() => setWorldScreen(null), []);

    return {
        world, enterInitials, worldResult, worldScreen, myPlace, ownKeysOpenRef,
        submitInitials, skipInitials, browseWorld, closeWorld,
    };
};
