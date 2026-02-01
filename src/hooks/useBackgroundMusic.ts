import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';

export const useBackgroundMusic = () => {
    // console.log('Initializing useBackgroundMusic hook');
    const [musicStatus, setMusicStatus] = useState<string>('Ready');
    const loadingRef = useRef(false);
    const soundRef = useRef<Audio.Sound | null>(null);

    // Initial Configuration for Mobile Stability
    useEffect(() => {
        const configureAudio = async () => {
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    staysActiveInBackground: false, // Pause when app backgrounded (good for games)
                    playsInSilentModeIOS: true, // CRITICAL: Play even if switch is silent
                    shouldDuckAndroid: true, // Duck other audio (notifications)
                    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
                    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
                    playThroughEarpieceAndroid: false,
                });
            } catch (e) {
                console.warn('Failed to set audio mode', e);
            }
        };
        configureAudio();
    }, []);

    const playMusic = useCallback(async () => {
        try {
            if (loadingRef.current) return;

            // If already loaded, just ensure it's playing and volume is up
            if (soundRef.current) {
                const status = await soundRef.current.getStatusAsync();
                if (status.isLoaded) {
                    await soundRef.current.setVolumeAsync(1.0);
                    if (!status.isPlaying) {
                        await soundRef.current.replayAsync();
                    }
                    setMusicStatus('Playing');
                    return;
                }
            }

            loadingRef.current = true;
            setMusicStatus('Loading...');

            const { sound } = await Audio.Sound.createAsync(
                require('../../assets/music.mp3'),
                { isLooping: true, volume: 1.0 }
            );

            soundRef.current = sound;
            await sound.playAsync();
            setMusicStatus('Playing');
        } catch (error) {
            console.warn('Error playing music:', error);
            setMusicStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            loadingRef.current = false;
        }
    }, []);

    const stopMusic = useCallback(async () => {
        if (!soundRef.current) return;
        try {
            setMusicStatus('Stopping...');
            // Simple fade out (2 seconds)
            for (let i = 20; i >= 0; i--) {
                if (!soundRef.current) break;
                await soundRef.current.setVolumeAsync(i / 20);
                await new Promise(r => setTimeout(r, 100)); // 20 * 100ms = 2000ms
            }
            if (soundRef.current) {
                await soundRef.current.stopAsync();
            }
            setMusicStatus('Stopped');
        } catch (error) {
            console.warn('Error stopping music:', error);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, []);

    return { playMusic, stopMusic, musicStatus };
};
