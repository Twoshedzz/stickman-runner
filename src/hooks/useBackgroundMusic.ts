/**
 * Native (iOS/Android) implementation using expo-audio.
 * Web uses useBackgroundMusic.web.ts (HTML5 Audio only).
 */
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_TRACK, MUSIC_TRACKS } from './musicTracks';

export const useBackgroundMusic = () => {
    const [musicStatus, setMusicStatus] = useState<string>('Ready');
    const loadingRef = useRef(false);
    const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
    const currentTrackRef = useRef<string | null>(null);
    /** Bumped on every play. A fade-out that sees this change has been overtaken and stops. */
    const playGenerationRef = useRef(0);
    /** Tracks already loaded, so starting them is instant. */
    const preloadedRef = useRef<Map<string, ReturnType<typeof createAudioPlayer>>>(new Map());
    /** A resume waiting to start (see resumeMusic), cancelled if the game pauses again first. */
    const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: false,
            interruptionMode: 'doNotMix',
        }).catch((e: unknown) => console.warn('Failed to set audio mode', e));

        return () => {
            if (playerRef.current) {
                playerRef.current.remove();
                playerRef.current = null;
            }
            currentTrackRef.current = null;
        };
    }, []);

    /**
     * Loads a track without playing it.
     *
     * Each track is about 4MB. Starting a stage before it has loaded puts the music
     * permanently behind the visuals for the whole three minutes, and the tracks are cut
     * to match the stage exactly, so that drift matters.
     *
     * Always resolves, even on failure: a missing track must not stop the game starting.
     */
    const preloadTrack = useCallback(async (trackKey: string = DEFAULT_TRACK, onProgress?: (fraction: number) => void) => {
        // The music is built into the app, so there's no download to track: just report done.
        if (preloadedRef.current.has(trackKey)) {
            onProgress?.(1);
            return;
        }
        try {
            const source = MUSIC_TRACKS[trackKey] ?? MUSIC_TRACKS[DEFAULT_TRACK];
            const player = createAudioPlayer(source, {});
            player.loop = true;
            player.volume = 1;

            // Wait for it to report loaded, but never hang the game on it.
            const deadline = Date.now() + 6000;
            while (!player.isLoaded && Date.now() < deadline) {
                await new Promise((r) => setTimeout(r, 50));
            }

            preloadedRef.current.set(trackKey, player);
        } catch {
            // Leave it unpreloaded; playMusic still works, just with the old delay.
        } finally {
            onProgress?.(1);
        }
    }, []);

    const playMusic = useCallback(async (trackKey: string = DEFAULT_TRACK) => {
        try {
            if (loadingRef.current) return;

            // Tell any in-flight fade-out to leave the audio alone from here on.
            playGenerationRef.current += 1;

            const source = MUSIC_TRACKS[trackKey] ?? MUSIC_TRACKS[DEFAULT_TRACK];
            const player = playerRef.current;

            // Same track already playing: do nothing (avoids restart on every jump / duplicate calls)
            if (player?.isLoaded && currentTrackRef.current === trackKey) {
                player.volume = 1; // a fade may have left it part-way down
                player.play();
                return;
            }

            loadingRef.current = true;
            setMusicStatus(`Loading ${trackKey}...`);

            // Use the already-loaded copy when there is one: it starts immediately, which
            // is what keeps the music lined up with the stage.
            const ready = preloadedRef.current.get(trackKey);
            const newPlayer = ready ?? createAudioPlayer(source, {});
            newPlayer.loop = true;
            newPlayer.volume = 1;
            if (ready) newPlayer.seekTo(0);
            // Don't remove a preloaded player; it's kept for the next time this track plays.
            const previous = playerRef.current;
            if (previous && previous !== newPlayer && !preloadedRef.current.has(currentTrackRef.current ?? '')) {
                previous.remove();
            }
            playerRef.current = newPlayer;
            currentTrackRef.current = trackKey;
            newPlayer.play();
            setMusicStatus('Playing');
        } catch (error) {
            console.warn('Error playing music:', error);
            setMusicStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            loadingRef.current = false;
        }
    }, []);

    const stopMusic = useCallback(async () => {
        const player = playerRef.current;
        if (!player) return;
        // The fade takes ~2 seconds. If a new run starts in that time, this fade must not
        // touch the new audio, or the rest of that run plays in silence.
        const generation = playGenerationRef.current;
        const overtaken = () => playGenerationRef.current !== generation || playerRef.current !== player;
        try {
            setMusicStatus('Stopping...');
            for (let i = 20; i >= 0; i--) {
                if (overtaken()) return;
                player.volume = i / 20;
                await new Promise((r) => setTimeout(r, 100));
            }
            if (overtaken()) return;
            player.pause();
            player.seekTo(0);
            currentTrackRef.current = null;
            setMusicStatus('Stopped');
        } catch (error) {
            console.warn('Error stopping music:', error);
        }
    }, []);

    /** Pause for the game's pause button. */
    const pauseMusic = useCallback(() => {
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
        playerRef.current?.pause();
    }, []);

    /**
     * Carry on after a pause, rewound by `leadInSec` so the music plays through the game's
     * 3-2-1 and is back where it stopped as play resumes.
     */
    const resumeMusic = useCallback(async (leadInSec = 0) => {
        const player = playerRef.current;
        if (!player) return;
        const back = Math.min(leadInSec, player.currentTime);
        try {
            await player.seekTo(player.currentTime - back);
        } catch {
            // Couldn't rewind: carry on from where it is.
        }
        // Paused in the first seconds of the track: not enough to rewind, so start later instead.
        const wait = leadInSec - back;
        if (wait > 0.05) {
            resumeTimerRef.current = setTimeout(() => {
                resumeTimerRef.current = null;
                player.play();
            }, wait * 1000);
        } else {
            player.play();
        }
    }, []);

    /**
     * Where the music is in `trackKey`, in seconds, while that track is actually playing;
     * otherwise null. The game uses it to keep its stage clock on the music.
     */
    const musicPosition = useCallback((trackKey: string) => {
        const player = playerRef.current;
        if (!player || currentTrackRef.current !== trackKey || !player.playing) return null;
        return player.currentTime;
    }, []);

    return { playMusic, stopMusic, pauseMusic, resumeMusic, musicPosition, preloadTrack, musicStatus };
};
