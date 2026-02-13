/**
 * Native (iOS/Android) implementation using expo-audio.
 * Web uses useBackgroundMusic.web.ts (HTML5 Audio only).
 */
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

const musicMap: Record<string, number> = {
    music_city: require('../../assets/neoncity.mp3'),
    music_beach: require('../../assets/synthwavebeach.mp3'),
    music_mountains: require('../../assets/neoncity.mp3'),
    music_victory: require('../../assets/neoncity.mp3'),
};

export const useBackgroundMusic = () => {
    const [musicStatus, setMusicStatus] = useState<string>('Ready');
    const loadingRef = useRef(false);
    const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
    const currentTrackRef = useRef<string | null>(null);

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

    const playMusic = useCallback(async (trackKey: string = 'music_city') => {
        try {
            if (loadingRef.current) return;

            const source = musicMap[trackKey] ?? musicMap.music_city;
            const player = playerRef.current;

            // Same track already playing: do nothing (avoids restart on every jump / duplicate calls)
            if (player?.isLoaded && currentTrackRef.current === trackKey) {
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
        try {
            setMusicStatus('Stopping...');
            for (let i = 20; i >= 0; i--) {
                if (!playerRef.current) break;
                playerRef.current.volume = i / 20;
                await new Promise((r) => setTimeout(r, 100));
            }
            if (playerRef.current) {
                playerRef.current.pause();
                playerRef.current.seekTo(0);
            }
            currentTrackRef.current = null;
            setMusicStatus('Stopped');
        } catch (error) {
            console.warn('Error stopping music:', error);
        }
    }, []);

    return { playMusic, stopMusic, musicStatus };
};
