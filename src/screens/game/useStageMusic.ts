/** Which music plays when: each stage's track through a run, and the menu loop either side of it. */
// Left out of the React Compiler, like the rest of the game screen: see GameScreen.tsx.
'use no memo';

import { Dispatch, SetStateAction, useCallback, useEffect, useRef } from 'react';
import { useMenuMusic } from '../../hooks/useMenuMusic';
import { stageById, STAGES } from '../../game/stages';
import { GameState } from '../../game/state';
import { nextStage, stageTrack } from './stageInfo';

interface Options {
    gameState: GameState;
    playMusic: (trackKey?: string) => unknown;
    stopMusic: () => unknown;
    restartGame: () => void;
    quitToTitle: () => void;
    onContinue: () => void;
    jumpToStage: (stageId: string) => void;
    setShowInstructions: Dispatch<SetStateAction<boolean>>;
    /** What a tap on the game does: START does the same. */
    handleInteraction: () => void;
}

/**
 * START, CONTINUE and PLAY AGAIN (and RESUME, in usePauseControls) start their music right
 * inside the tap: iPhone Safari only lets music start during one. Keep those calls in the
 * tap handlers here, not in effects.
 */
export const useStageMusic = ({ gameState, playMusic, stopMusic, restartGame, quitToTitle, onContinue, jumpToStage, setShowInstructions, handleInteraction }: Options) => {
    // Start music only when playing (not on game over) so we don't start then immediately fade on death
    const musicStartedForRunRef = useRef(false);
    useEffect(() => {
        if (gameState.gameStarted && !gameState.gameOver && !musicStartedForRunRef.current) {
            musicStartedForRunRef.current = true;
            playMusic(stageTrack(stageById(gameState.stageId)));
        }
    }, [gameState.gameStarted, gameState.gameOver, gameState.stageId, playMusic]);

    /** QUIT on the PAUSED screen: the run is dropped, back to the title. */
    const quitRun = useCallback(() => {
        musicStartedForRunRef.current = false;
        stopMusic();
        setShowInstructions(false);
        quitToTitle();
    }, [stopMusic, setShowInstructions, quitToTitle]);

    // Stop music on game over / continue; reset so Play Again can start music again
    useEffect(() => {
        if (gameState.gameOver || gameState.showContinue) {
            musicStartedForRunRef.current = false;
            stopMusic();
        }
    }, [gameState.gameOver, gameState.showContinue, stopMusic]);

    // The menu loop: on the title and info screens before a run, and after one (Game Over,
    // Finished, entering initials), where it fades in as the stage music fades away. Off
    // during a run, Stage Clear and pauses included.
    const { startMenuMusic, stopMenuMusic } = useMenuMusic();
    const inRun = gameState.gameStarted && !gameState.gameOver;
    const afterRun = gameState.gameOver;
    useEffect(() => {
        if (inRun) stopMenuMusic(0.6);
        else if (afterRun) startMenuMusic(3, 1.5);
        else startMenuMusic(1.5, 0);
    }, [inRun, afterRun, startMenuMusic, stopMenuMusic]);

    // A new run always starts at stage 1, so start stage 1's music - not the music of the
    // stage the last run ended on.
    const playAgain = useCallback(() => {
        playMusic(stageTrack(STAGES[0]));
        restartGame();
    }, [playMusic, restartGame]);

    /**
     * START. The music is started right here, inside the tap, as well as when the run begins:
     * iPhone Safari only lets music start during a tap, and won't download it ahead of time,
     * so on a first visit the track isn't ready yet. Started from the tap, it plays as soon
     * as it arrives; starting the same track again later does nothing.
     */
    const startGame = useCallback(() => {
        playMusic(stageTrack(stageById(gameState.stageId)));
        handleInteraction();
    }, [gameState.stageId, playMusic, handleInteraction]);

    /**
     * CONTINUE on the Stage Clear screen. Like START, the next stage's music is started right
     * here in the tap (iPhone Safari only allows music to start during one), and the stage
     * itself starts at the same moment.
     */
    const continueToNextStage = useCallback(() => {
        const next = nextStage(gameState.stageId);
        if (next) {
            musicStartedForRunRef.current = true;
            playMusic(stageTrack(next));
        }
        onContinue();
    }, [gameState.stageId, playMusic, onContinue]);

    /** Debug: jump straight to a stage, with its music. */
    const jumpToStageWithMusic = useCallback((stageId: string) => {
        jumpToStage(stageId);
        musicStartedForRunRef.current = true;
        playMusic(stageTrack(stageById(stageId)));
    }, [jumpToStage, playMusic]);

    return { quitRun, playAgain, startGame, continueToNextStage, jumpToStageWithMusic };
};
