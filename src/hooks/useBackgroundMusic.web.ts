/**
 * Web implementation: HTML5 Audio + expo-asset only (no expo-audio).
 * Native uses useBackgroundMusic.ts (expo-audio).
 */
import { Asset } from 'expo-asset';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_TRACK, MUSIC_TRACKS } from './musicTracks';

export const useBackgroundMusic = () => {
    const [musicStatus, setMusicStatus] = useState<string>('Ready');
    const loadingRef = useRef(false);
    const webAudioRef = useRef<HTMLAudioElement | null>(null);
    const currentTrackRef = useRef<string | null>(null);
    /** Bumped on every play. A fade-out that sees this change has been overtaken and stops. */
    const playGenerationRef = useRef(0);

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

    const playMusic = useCallback(async (trackKey: string = DEFAULT_TRACK) => {
        try {
            if (loadingRef.current) return;

            // Tell any in-flight fade-out to leave the audio alone from here on.
            playGenerationRef.current += 1;

            const source = MUSIC_TRACKS[trackKey] ?? MUSIC_TRACKS[DEFAULT_TRACK];
            const prev = webAudioRef.current;
            const prevTrack = prev ? (prev as HTMLAudioElement & { __trackKey?: string }).__trackKey : null;

            // Same track already playing: do nothing (avoids restart on every jump / duplicate calls)
            if (prev && prevTrack === trackKey) {
                prev.volume = 1; // a fade may have left it part-way down
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
        // The fade takes ~2 seconds. If a new run starts in that time, this fade must not
        // touch the new audio, or the rest of that run plays in silence.
        const generation = playGenerationRef.current;
        const overtaken = () => playGenerationRef.current !== generation || webAudioRef.current !== audio;
        try {
            setMusicStatus('Stopping...');
            for (let i = 20; i >= 0; i--) {
                if (overtaken()) return;
                audio.volume = i / 20;
                await new Promise((r) => setTimeout(r, 100));
            }
            if (overtaken()) return;
            audio.pause();
            audio.currentTime = 0;
            currentTrackRef.current = null;
            webAudioRef.current = null; // so next playMusic() creates a fresh Audio (fixes Play Again not starting)
            setMusicStatus('Stopped');
        } catch (error) {
            console.warn('Error stopping music:', error);
        }
    }, []);

    return { playMusic, stopMusic, musicStatus };
};
