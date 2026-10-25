/** The keyboard in a browser: Space / ↑ jump, ↓ / S held ducks, P / Esc pause, Enter plays again. */
// Left out of the React Compiler, like the rest of the game screen: see GameScreen.tsx.
'use no memo';

import { MutableRefObject, useEffect } from 'react';
import { Platform } from 'react-native';
import { GameState } from '../../game/state';
import { useLatest } from './useLatest';

interface Options {
    gameState: GameState;
    onJump: () => void;
    onDuck: (hold?: boolean) => void;
    onDuckRelease: () => void;
    pauseRun: () => void;
    resumeRun: () => void;
    playAgain: () => void;
    showInstructions: boolean;
    /** A screen with its own keys is open (initials, the world board). */
    ownKeysOpenRef: MutableRefObject<boolean>;
}

// Capture phase so we handle Space/Up before React (no synthetic click on Pressable). Set up
// once; the handlers read the latest of everything through refs.
export const useWebKeyboard = (options: Options) => {
    const latest = useLatest(options);
    useEffect(() => {
        if (Platform.OS === 'web') {
            const handleKeyDown = (e: KeyboardEvent) => {
                const { gameState: state, onJump, onDuck, pauseRun, resumeRun, playAgain, showInstructions, ownKeysOpenRef } = latest.current;
                // Typing initials: the keys are letters and arrows there, not jump and duck.
                if (ownKeysOpenRef.current) return;
                // P or Esc pauses, and on the PAUSED screen carries on.
                if (e.code === 'KeyP' || e.code === 'Escape') {
                    e.preventDefault();
                    if (!state.paused) pauseRun();
                    else if (!state.resumeAt && !showInstructions) resumeRun();
                    return;
                }
                // Nothing else does anything while paused.
                if (state.paused) {
                    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') e.preventDefault();
                    return;
                }
                if (e.code === 'Space' || e.code === 'ArrowUp') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    if (state.gameOver) return;
                    if (state.showContinue) return;
                    onJump();
                }
                if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                    e.preventDefault();
                    if (state.gameOver || state.showContinue) return;
                    onDuck(true); // held until the key comes up
                }
                // Enter on Game Over: the same as PLAY AGAIN.
                if (state.gameOver && (e.code === 'Enter' || e.code === 'NumpadEnter')) playAgain();
            };
            const handleKeyUp = (e: KeyboardEvent) => {
                if (e.code === 'ArrowDown' || e.code === 'KeyS') latest.current.onDuckRelease();
            };
            window.addEventListener('keydown', handleKeyDown, true);
            window.addEventListener('keyup', handleKeyUp, true);
            return () => {
                window.removeEventListener('keydown', handleKeyDown, true);
                window.removeEventListener('keyup', handleKeyUp, true);
            };
        }
    }, [latest]);
};
