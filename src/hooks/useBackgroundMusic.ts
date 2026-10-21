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

            const newPlayer = createAudioPlayer(source, {});
            newPlayer.loop = true;
            newPlayer.volume = 1;
            if (playerRef.current) {
                playerRef.current.remove();
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

    return { playMusic, stopMusic, musicStatus };
};
