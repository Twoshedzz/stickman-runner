/**
 * The menu music in the phone app (expo-audio): a 30-second loop for the title and info
 * screens. The web version (useMenuMusic.web.ts) plays through Web Audio instead, so it
 * can fade on iPhone Safari; here the player's own volume fades fine.
 */
import { createAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';
import { MENU_TRACK } from './musicTracks';

/** How loud the loop plays, compared with the stage music. */
const MENU_VOLUME = 0.8;
/** How often a fade takes a step, in milliseconds. */
const FADE_STEP_MS = 50;

type Player = ReturnType<typeof createAudioPlayer>;

/** The timers behind a fade, so a new fade (or a stop) can cancel the one under way. */
type Timers = { fade: ReturnType<typeof setInterval> | null; delay: ReturnType<typeof setTimeout> | null };

const cancel = (timers: Timers) => {
    if (timers.fade) clearInterval(timers.fade);
    if (timers.delay) clearTimeout(timers.delay);
    timers.fade = null;
    timers.delay = null;
};

/** Move the player's volume to `to` over `sec`, then call `done`. */
const fadeTo = (p: Player, timers: Timers, to: number, sec: number, done?: () => void) => {
    const from = p.volume;
    const steps = Math.max(1, Math.round((sec * 1000) / FADE_STEP_MS));
    let i = 0;
    timers.fade = setInterval(() => {
        i++;
        p.volume = from + ((to - from) * i) / steps;
        if (i >= steps) {
            if (timers.fade) clearInterval(timers.fade);
            timers.fade = null;
            done?.();
        }
    }, FADE_STEP_MS);
};

export const useMenuMusic = () => {
    const playerRef = useRef<Player | null>(null);
    const timersRef = useRef<Timers>({ fade: null, delay: null });
    const playingRef = useRef(false);

    const player = useCallback(() => {
        if (!playerRef.current) {
            const p = createAudioPlayer(MENU_TRACK, {});
            p.loop = true;
            p.volume = 0;
            playerRef.current = p;
        }
        return playerRef.current;
    }, []);

    useEffect(() => {
        const timers = timersRef.current;
        return () => {
            cancel(timers);
            playerRef.current?.remove();
            playerRef.current = null;
        };
    }, []);

    /** Play the loop, fading in over `fadeInSec` after waiting `delaySec`. Already playing: carries on. */
    const startMenuMusic = useCallback((fadeInSec = 1.5, delaySec = 0) => {
        if (playingRef.current) return;
        playingRef.current = true;
        const timers = timersRef.current;
        cancel(timers);
        const p = player();
        p.volume = 0;
        timers.delay = setTimeout(() => {
            timers.delay = null;
            p.seekTo(0);
            p.play();
            fadeTo(p, timers, MENU_VOLUME, fadeInSec);
        }, delaySec * 1000);
    }, [player]);

    /** Fade the loop out over `fadeOutSec` and stop it. */
    const stopMenuMusic = useCallback((fadeOutSec = 0.6) => {
        if (!playingRef.current) return;
        playingRef.current = false;
        const timers = timersRef.current;
        cancel(timers);
        const p = player();
        fadeTo(p, timers, 0, fadeOutSec, () => p.pause());
    }, [player]);

    return { startMenuMusic, stopMenuMusic };
};
