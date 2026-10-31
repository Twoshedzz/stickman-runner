/** Loading before play: the menu lettering, the scenery, the first track, and each next stage's music. */
// Left out of the React Compiler, like the rest of the game screen: see GameScreen.tsx.
'use no memo';

import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { MENU_FONT_FILES } from '../../components/menu/menuStyle';
import { stageById, STAGES } from '../../game/stages';
import { nextStage, stageTrack } from './stageInfo';

interface Options {
    stageId: string;
    /** The stage picked on the title screen (test build): its music has to be in before START. */
    startStageId: string;
    showContinue: boolean;
    preloadTrack: (trackKey?: string, onProgress?: (fraction: number) => void) => Promise<unknown>;
}

export const useGameLoading = ({ stageId, startStageId, showContinue, preloadTrack }: Options) => {
    // The menu lettering. Until it arrives, text shows in the system font rather than waiting.
    useFonts(MENU_FONT_FILES);

    // Loading overlay: hide black block until building strip (and other assets) are ready.
    const [assetsReady, setAssetsReady] = useState(false);
    const onAssetsReady = useCallback(() => setAssetsReady(true), []);

    /**
     * The stage can't start until its music has loaded.
     *
     * Each track is 3 minutes to match the stage exactly, so if the stage starts first the
     * music runs behind the sunrise for the whole run. Waiting here costs a moment on the
     * start screen and keeps them locked together.
     */
    const [musicReady, setMusicReady] = useState(false);
    /** How much of the first track has arrived, 0-100, for the loading screen. */
    const [musicPercent, setMusicPercent] = useState(0);
    useEffect(() => {
        let cancelled = false;
        preloadTrack(stageTrack(stageById(stageId)), (fraction) => {
            if (!cancelled) setMusicPercent(Math.floor(fraction * 100));
        }).finally(() => {
            if (!cancelled) setMusicReady(true);
        });
        return () => { cancelled = true; };
        // Runs once: preloadTrack is stable and the stage is always the first one here.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preloadTrack]);

    /**
     * Web: once the first track is in, fetch the other stages' music in the background, one at
     * a time, so each later stage can start straight away. (The phone app has it built in.)
     */
    useEffect(() => {
        if (!musicReady || Platform.OS !== 'web') return;
        let cancelled = false;
        (async () => {
            for (const stage of STAGES) {
                if (cancelled) return;
                await preloadTrack(stageTrack(stage));
            }
        })();
        return () => { cancelled = true; };
    }, [musicReady, preloadTrack]);

    /**
     * On the Stage Clear screen, make sure the next stage's music is in before CONTINUE is
     * offered. Usually it already is, from the background fetch above.
     */
    const [nextMusicPercent, setNextMusicPercent] = useState(100);
    useEffect(() => {
        if (!showContinue) return;
        const next = nextStage(stageId);
        if (!next) return;
        let cancelled = false;
        setNextMusicPercent(0);
        preloadTrack(stageTrack(next), (fraction) => {
            if (!cancelled) setNextMusicPercent(Math.floor(fraction * 100));
        }).finally(() => {
            if (!cancelled) setNextMusicPercent(100);
        });
        return () => { cancelled = true; };
    }, [showContinue, stageId, preloadTrack]);

    /** How much of the picked stage's music has arrived, for START: the stage clock follows the music. */
    const [startMusic, setStartMusic] = useState({ stageId: startStageId, percent: 0 });
    const startMusicPercent = startMusic.stageId === startStageId ? startMusic.percent : 0;
    useEffect(() => {
        let cancelled = false;
        preloadTrack(stageTrack(stageById(startStageId)), (fraction) => {
            if (!cancelled) setStartMusic({ stageId: startStageId, percent: Math.floor(fraction * 100) });
        }).finally(() => {
            if (!cancelled) setStartMusic({ stageId: startStageId, percent: 100 });
        });
        return () => { cancelled = true; };
    }, [startStageId, preloadTrack]);

    const readyToStart = assetsReady && musicReady;

    return { readyToStart, musicReady, musicPercent, nextMusicPercent, startMusicPercent, onAssetsReady };
};
