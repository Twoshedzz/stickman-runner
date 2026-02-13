/**
 * Web implementation: HTML5 Audio + expo-asset only (no expo-audio).
 * Native uses useBackgroundMusic.ts (expo-audio).
 */
import { Asset } from 'expo-asset';
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
    const webAudioRef = useRef<HTMLAudioElement | null>(null);
    const currentTrackRef = useRef<string | null>(null);

    useEffect(() => {
        return () => {
            const el = webAudioRef.current;
            if (el) {
                el.pause();
                el.src = '';
                el.load();
                webAudioRef.current = null;
            }
            currentTrackRef.current = null;
        };
    }, []);

    const playMusic = useCallback(async (trackKey: string = 'music_city') => {
        try {
            if (loadingRef.current) return;

            const source = musicMap[trackKey] ?? musicMap.music_city;
            const prev = webAudioRef.current;
            const prevTrack = prev ? (prev as HTMLAudioElement & { __trackKey?: string }).__trackKey : null;

            // Same track already playing: do nothing (avoids restart on every jump / duplicate calls)
            if (prev && prevTrack === trackKey) {
                prev.play().catch(() => {});
                return;
            }

            if (prev) {
                prev.pause();
                prev.src = '';
                prev.load();
                webAudioRef.current = null;
            }
            currentTrackRef.current = trackKey;

            const asset = Asset.fromModule(source);
            const uri = asset.localUri ?? asset.uri;
            if (!uri) {
                setMusicStatus('Error: No audio URL');
                return;
            }

            loadingRef.current = true;
            setMusicStatus(`Loading ${trackKey}...`);

            const audio = new Audio(uri) as HTMLAudioElement & { __trackKey?: string };
            audio.__trackKey = trackKey;
            webAudioRef.current = audio;
            audio.loop = true;
            audio.volume = 1;
            // Prevent user manipulation: no controls, no remote playback, not exposed to assistive tech
            audio.controls = false;
            audio.setAttribute('controlsList', 'nodownload nofullscreen noremoteplayback noplaybackrate');
            if ('disableRemotePlayback' in audio) (audio as HTMLMediaElement & { disableRemotePlayback: boolean }).disableRemotePlayback = true;
            if ('disablePictureInPicture' in audio) (audio as HTMLMediaElement & { disablePictureInPicture: boolean }).disablePictureInPicture = true;

            audio.oncanplaythrough = () => setMusicStatus('Playing');
            audio.onerror = () => {
                setMusicStatus(`Error: ${audio.error?.message ?? 'Load failed'}`);
            };

            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch((e) => {
                    console.warn('Audio play failed (e.g. autoplay policy):', e);
                    setMusicStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
                });
            }
        } catch (error) {
            console.warn('Error playing music:', error);
            setMusicStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            loadingRef.current = false;
        }
    }, []);

    const stopMusic = useCallback(async () => {
        const audio = webAudioRef.current;
        if (!audio) return;
        try {
            setMusicStatus('Stopping...');
            for (let i = 20; i >= 0; i--) {
                if (!webAudioRef.current) break;
                webAudioRef.current.volume = i / 20;
                await new Promise((r) => setTimeout(r, 100));
            }
            if (webAudioRef.current) {
                webAudioRef.current.pause();
                webAudioRef.current.currentTime = 0;
            }
            currentTrackRef.current = null;
            setMusicStatus('Stopped');
        } catch (error) {
            console.warn('Error stopping music:', error);
        }
    }, []);

    return { playMusic, stopMusic, musicStatus };
};
