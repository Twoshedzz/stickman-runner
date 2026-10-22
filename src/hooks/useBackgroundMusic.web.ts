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
    /** Tracks already fetched and buffered, so starting them is instant. */
    const preloadedRef = useRef<Map<string, HTMLAudioElement>>(new Map());

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

    /**
     * iPhone Safari only lets a track start playing during a tap. The game starts the music
     * a moment after START is tapped (once the screen has updated), which Safari would
     * block, leaving the run silent. Starting and instantly stopping each loaded track
     * during a tap "unlocks" it, so the game can play it later. Runs on every tap, so
     * tracks loaded later (the next stage's, on the Stage Clear screen) get unlocked too.
     */
    useEffect(() => {
        const unlocked = new WeakSet<HTMLAudioElement>();
        const unlock = () => {
            preloadedRef.current.forEach((audio) => {
                if (unlocked.has(audio) || audio === webAudioRef.current) return;
                unlocked.add(audio);
                // Stopping straight away makes play() report an interruption; that's expected.
                audio.play()?.catch(() => {});
                audio.pause();
                audio.currentTime = 0;
            });
        };
        document.addEventListener('touchend', unlock, true);
        document.addEventListener('click', unlock, true);
        return () => {
            document.removeEventListener('touchend', unlock, true);
            document.removeEventListener('click', unlock, true);
        };
    }, []);

    /**
     * Fetches and buffers a track without playing it.
     *
     * Each track is about 4MB. Starting a stage before it has loaded puts the music
     * permanently behind the visuals for the whole three minutes, and the tracks are cut
     * to match the stage exactly, so that drift matters.
     *
     * Always resolves, even on failure: a missing track must not stop the game starting.
     */
    const preloadTrack = useCallback(async (trackKey: string = DEFAULT_TRACK) => {
        if (preloadedRef.current.has(trackKey)) return;
        try {
            const source = MUSIC_TRACKS[trackKey] ?? MUSIC_TRACKS[DEFAULT_TRACK];
            const asset = Asset.fromModule(source);
            if (!asset.localUri && !asset.uri) await asset.downloadAsync();
            const uri = asset.localUri ?? asset.uri;
            if (!uri) return;

            const audio = new Audio(uri) as HTMLAudioElement & { __trackKey?: string };
            audio.__trackKey = trackKey;
            audio.loop = true;
            audio.preload = 'auto';
            audio.load();

            await new Promise<void>((resolve) => {
                let settled = false;
                const done = () => { if (!settled) { settled = true; resolve(); } };
                if (audio.readyState >= 3) return done();
                audio.addEventListener('canplaythrough', done, { once: true });
                audio.addEventListener('error', done, { once: true });
                setTimeout(done, 6000); // never block the game on a slow or broken file
            });

            preloadedRef.current.set(trackKey, audio);
        } catch {
            // Leave it unpreloaded; playMusic still works, just with the old delay.
        }
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

            loadingRef.current = true;
            setMusicStatus(`Loading ${trackKey}...`);

            // Use the buffered copy when there is one: it starts immediately, which is what
            // keeps the music lined up with the stage.
            const ready = preloadedRef.current.get(trackKey);
            let audio: HTMLAudioElement & { __trackKey?: string };
            if (ready) {
                audio = ready as HTMLAudioElement & { __trackKey?: string };
                audio.currentTime = 0;
            } else {
                const asset = Asset.fromModule(source);
                const uri = asset.localUri ?? asset.uri;
                if (!uri) {
                    setMusicStatus('Error: No audio URL');
                    loadingRef.current = false;
                    return;
                }
                audio = new Audio(uri) as HTMLAudioElement & { __trackKey?: string };
            }
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

    return { playMusic, stopMusic, preloadTrack, musicStatus };
};
