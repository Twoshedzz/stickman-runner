import { Audio, setAudioModeAsync } from 'expo-audio';
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
    const playerRef = useRef<ReturnType<typeof Audio.createAudioPlayer> | null>(null);

    useEffect(() => {
        const configureAudio = async () => {
            try {
                await setAudioModeAsync({
                    playsInSilentMode: true,
                    shouldPlayInBackground: false,
                    interruptionMode: 'doNotMix',
                });
            } catch (e) {
                console.warn('Failed to set audio mode', e);
            }
        };
        configureAudio();

        return () => {
            if (playerRef.current) {
                playerRef.current.remove();
                playerRef.current = null;
            }
        };
    }, []);

    const playMusic = useCallback(async (trackKey: string = 'music_city') => {
        try {
            if (loadingRef.current) return;

            const source = musicMap[trackKey] ?? musicMap.music_city;

            const player = playerRef.current;
            if (player?.isLoaded) {
                player.replace(source);
                player.loop = true;
                player.volume = 1;
                player.play();
                setMusicStatus('Playing');
                return;
            }

            loadingRef.current = true;
            setMusicStatus(`Loading ${trackKey}...`);

            const newPlayer = Audio.createAudioPlayer(source, { loop: true });
            newPlayer.volume = 1;
            if (playerRef.current) {
                playerRef.current.remove();
            }
            playerRef.current = newPlayer;
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
                await new Promise(r => setTimeout(r, 100));
            }
            if (playerRef.current) {
                playerRef.current.pause();
                playerRef.current.seekTo(0);
            }
            setMusicStatus('Stopped');
        } catch (error) {
            console.warn('Error stopping music:', error);
        }
    }, []);

    return { playMusic, stopMusic, musicStatus };
};
