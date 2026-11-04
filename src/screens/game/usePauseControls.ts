/** Pausing and resuming a run, with its music: the pause button, P / Esc, and leaving the app. */
// Left out of the React Compiler, like the rest of the game screen: see GameScreen.tsx.
'use no memo';

import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { canPause, isCountingDown, RESUME_COUNTDOWN_SEC } from '../../game/pause';
import { GameState } from '../../game/state';
import { useLatest } from './useLatest';

interface Options {
    gameState: GameState;
    pauseGame: () => boolean;
    resumeGame: () => void;
    setMusicClock: (clock: ((trackKey: string) => number | null) | null) => void;
    pauseMusic: () => void;
    resumeMusic: (rewindSec: number) => void;
    musicPosition: (trackKey: string) => number | null;
    /** A phone browser held upright: the game is hidden behind the prompt to turn it. */
    needsRotate: boolean;
}

/**
 * Pausing. The button (or P / Esc) stops the run and its music; RESUME counts 3-2-1 with
 * the music rewound to play through the count (see src/game/pause.ts).
 */
export const usePauseControls = ({ gameState, pauseGame, resumeGame, setMusicClock, pauseMusic, resumeMusic, musicPosition, needsRotate }: Options) => {
    const countingDown = isCountingDown(gameState);
    // Also catches a pause the game made itself, when the app went to the background.
    useEffect(() => {
        if (gameState.paused && !countingDown) pauseMusic();
    }, [gameState.paused, countingDown, pauseMusic]);
    const pauseRun = useCallback(() => {
        if (pauseGame()) pauseMusic();
    }, [pauseGame, pauseMusic]);
    // The phone turned upright hides the game, so a run that's going stops. A 3-2-1 is left to
    // finish, and if the phone is still upright then, the run stops at that moment.
    const hiddenRunGoing = needsRotate && canPause(gameState);
    useEffect(() => {
        if (hiddenRunGoing) pauseRun();
    }, [hiddenRunGoing, pauseRun]);
    // Leaving the app mid-run pauses the run (in the game loop), so pause its music here and
    // now too. Waiting for the screen to catch up let the music play for a moment on return,
    // which put it a little out of step with the game.
    const gameStateRef = useLatest(gameState);
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next) => {
            const state = gameStateRef.current;
            if (next !== 'active' && (state.paused || canPause(state))) pauseMusic();
        });
        return () => subscription.remove();
    }, [pauseMusic, gameStateRef]);
    // The stage clock follows the music (see src/game/musicSync.ts).
    useEffect(() => {
        setMusicClock(musicPosition);
        return () => setMusicClock(null);
    }, [setMusicClock, musicPosition]);
    // The music starts inside this tap: iPhone Safari won't start it any other way.
    const resumeRun = useCallback(() => {
        resumeMusic(RESUME_COUNTDOWN_SEC);
        resumeGame();
    }, [resumeMusic, resumeGame]);

    return { pauseRun, resumeRun };
};
