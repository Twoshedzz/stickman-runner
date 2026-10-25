/**
 * Web implementation: HTML5 Audio + expo-asset only (no expo-audio).
 * Native uses useBackgroundMusic.ts (expo-audio).
 */
import { Asset } from 'expo-asset';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fadeOut, resumeLeadIn } from './musicShared';
import { DEFAULT_TRACK, MUSIC_TRACKS } from './musicTracks';

interface TrackLoad {
    progress: number;
    listeners: Set<(fraction: number) => void>;
    promise: Promise<void>;
}

/** Fetches a file, reporting how much has arrived, and hands back an in-memory address for it. */
async function downloadWithProgress(uri: string, report: (fraction: number) => void): Promise<string> {
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const total = Number(response.headers.get('content-length')) || 0;
    const type = response.headers.get('content-type') || 'audio/mpeg';
    if (!response.body || !total) {
        // No size given, so no progress to show; just wait for all of it.
        return URL.createObjectURL(await response.blob());
    }
    const reader = response.body.getReader();
    const chunks: BlobPart[] = [];
    let received = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        report(Math.min(0.99, received / total));
    }
    return URL.createObjectURL(new Blob(chunks, { type }));
}

export const useBackgroundMusic = () => {
    const [musicStatus, setMusicStatus] = useState<string>('Ready');
    const loadingRef = useRef(false);
    const webAudioRef = useRef<HTMLAudioElement | null>(null);
    const currentTrackRef = useRef<string | null>(null);
    /** Bumped on every play. A fade-out that sees this change has been overtaken and stops. */
    const playGenerationRef = useRef(0);
    /** Music has been asked to play and not asked to stop: used to restart it if it was refused. */
    const wantPlayingRef = useRef(false);
    /** Tracks already fetched and buffered, so starting them is instant. */
    const preloadedRef = useRef<Map<string, HTMLAudioElement>>(new Map());
    /** A resume waiting to start (see resumeMusic), cancelled if the game pauses again first. */
    const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            // Safety net: if music should be playing but iPhone Safari refused to start it,
            // this tap (players tap all the time to jump) is allowed to start it, so it comes in
            // a moment late rather than not at all.
            const current = webAudioRef.current;
            if (wantPlayingRef.current && current && current.paused) {
                current.play()?.catch(() => {});
            }
            // Only unlock other tracks once the music is already going (taps to jump during a
            // stage). On the START tap itself this would start-and-stop stage 1's own track in
            // the same instant the game starts it for real, and iPhone could drop the real start.
            if (!wantPlayingRef.current) return;
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

    /** Downloads in progress or done, by track, so several callers share one download. */
    const loadsRef = useRef<Map<string, TrackLoad>>(new Map());

    /**
     * Pause the music while the game is in the background (another app, or the phone locked)
     * and pick it up again on return. If iPhone won't restart it without a tap, the safety
     * net above starts it on the first tap back in the game.
     */
    useEffect(() => {
        const onVisibility = () => {
            const current = webAudioRef.current;
            if (!current) return;
            if (document.hidden) current.pause();
            else if (wantPlayingRef.current) current.play()?.catch(() => {});
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);

    /**
     * Downloads a track in full, without playing it, reporting progress (0 to 1) as it goes.
     *
     * Each track is about 4MB. Starting a stage before its music has arrived leaves the music
     * behind the visuals for the whole three minutes. iPhone Safari won't even start fetching
     * an audio file until it's played, so instead the whole file is downloaded here and played
     * from memory, which also lets the loading screen show how far along it is.
     *
     * Always resolves, even on failure: a missing track must not stop the game starting.
     */
    const preloadTrack = useCallback((trackKey: string = DEFAULT_TRACK, onProgress?: (fraction: number) => void) => {
        const existing = loadsRef.current.get(trackKey);
        if (existing) {
            if (onProgress) {
                onProgress(existing.progress);
                existing.listeners.add(onProgress);
            }
            return existing.promise;
        }

        const load: TrackLoad = { progress: 0, listeners: new Set(onProgress ? [onProgress] : []), promise: Promise.resolve() };
        const report = (fraction: number) => {
            load.progress = fraction;
            load.listeners.forEach((listener) => listener(fraction));
        };
        load.promise = (async () => {
            try {
                const source = MUSIC_TRACKS[trackKey] ?? MUSIC_TRACKS[DEFAULT_TRACK];
                const asset = Asset.fromModule(source);
                const uri = asset.uri ?? asset.localUri;
                if (!uri) return;

                const audio = new Audio(await downloadWithProgress(uri, report)) as HTMLAudioElement & { __trackKey?: string };
                audio.__trackKey = trackKey;
                audio.loop = true;
                audio.preload = 'auto';
                audio.load();
                await new Promise<void>((resolve) => {
                    // It's already in memory, so this is quick; the timeout is only a safety net.
                    if (audio.readyState >= 3) return resolve();
                    audio.addEventListener('canplaythrough', () => resolve(), { once: true });
                    audio.addEventListener('error', () => resolve(), { once: true });
                    setTimeout(resolve, 3000);
                });
                preloadedRef.current.set(trackKey, audio);
            } catch {
                // Leave it unpreloaded; playMusic will stream it instead.
            } finally {
                report(1);
            }
        })();
        loadsRef.current.set(trackKey, load);
        return load.promise;
    }, []);

    const playMusic = useCallback(async (trackKey: string = DEFAULT_TRACK) => {
        try {
            if (loadingRef.current) return;

            // Tell any in-flight fade-out to leave the audio alone from here on.
            playGenerationRef.current += 1;
            wantPlayingRef.current = true;

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
        // A new run starting during the fade overtakes it (see fadeOut).
        const generation = playGenerationRef.current;
        const overtaken = () => playGenerationRef.current !== generation || webAudioRef.current !== audio;
        try {
            wantPlayingRef.current = false;
            setMusicStatus('Stopping...');
            if (!(await fadeOut((volume) => { audio.volume = volume; }, overtaken))) return;
            audio.pause();
            audio.currentTime = 0;
            currentTrackRef.current = null;
            webAudioRef.current = null; // so next playMusic() creates a fresh Audio (fixes Play Again not starting)
            setMusicStatus('Stopped');
        } catch (error) {
            console.warn('Error stopping music:', error);
        }
    }, []);

    /**
     * Pause for the game's pause button. The music counts as not wanted while paused, so
     * neither coming back to the app nor a tap restarts it.
     */
    const pauseMusic = useCallback(() => {
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
        wantPlayingRef.current = false;
        webAudioRef.current?.pause();
    }, []);

    /**
     * Carry on after a pause, rewound by `leadInSec` so the music plays through the game's
     * 3-2-1 and is back where it stopped as play resumes. Call it from the RESUME tap itself:
     * iPhone Safari only lets music start during a tap.
     */
    const resumeMusic = useCallback((leadInSec = 0) => {
        const audio = webAudioRef.current;
        if (!audio) return;
        wantPlayingRef.current = true;
        const { rewindSec, waitSec } = resumeLeadIn(leadInSec, audio.currentTime);
        audio.currentTime -= rewindSec;
        const start = () => {
            resumeTimerRef.current = null;
            audio.play()?.catch(() => {});
        };
        if (waitSec) resumeTimerRef.current = setTimeout(start, waitSec * 1000);
        else start();
    }, []);

    /**
     * Where the music is in `trackKey`, in seconds, while that track is actually playing;
     * otherwise null. The game uses it to keep its stage clock on the music.
     */
    const musicPosition = useCallback((trackKey: string) => {
        const audio = webAudioRef.current as (HTMLAudioElement & { __trackKey?: string }) | null;
        if (!audio || audio.__trackKey !== trackKey || audio.paused || audio.seeking || audio.readyState < 3) return null;
        return audio.currentTime;
    }, []);

    return { playMusic, stopMusic, pauseMusic, resumeMusic, musicPosition, preloadTrack, musicStatus };
};
