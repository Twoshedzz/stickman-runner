/**
 * The menu music on the web: a 30-second loop for the title and info screens.
 *
 * It plays through Web Audio rather than an audio element, for two reasons. iPhone Safari
 * ignores an audio element's volume, so it couldn't fade in or out; a Web Audio gain can.
 * And a decoded clip loops without the small gap an audio element leaves at the join.
 *
 * Browsers only allow sound after a tap, so if the menu music is wanted before the first
 * one (the title screen on opening the game), it starts on that first tap. Once the sound
 * has been allowed it stays allowed, so after a run the music can fade in by itself.
 * The stage music is separate (useBackgroundMusic.web.ts); this never touches it.
 *
 * There is only ever one loop per page: the player is shared, not one per screen, so
 * moving between screens (or the app reloading its code while developing) can't start a
 * second copy over the first.
 */
import { Asset } from 'expo-asset';
import { useCallback, useEffect } from 'react';
import { MENU_TRACK } from './musicTracks';

/** How loud the loop plays, compared with the stage music. */
const MENU_VOLUME = 0.8;

type Wanted = { fadeInSec: number; delaySec: number };

interface MenuPlayer {
    ctx: AudioContext;
    gain: GainNode;
    buffer: AudioBuffer | null;
    source: AudioBufferSourceNode | null;
    /** Asked to play and not since asked to stop, with how it should come in. */
    wanted: Wanted | null;
}

/** Kept on the page itself, so even a fresh copy of this code finds the one already playing. */
const holder = globalThis as typeof globalThis & { __stickmanMenuMusic?: MenuPlayer | null };

/** How long the clip is silent for at the very start. */
const leadingSilenceSec = (buffer: AudioBuffer) => {
    const data = buffer.getChannelData(0);
    const limit = Math.min(data.length, buffer.sampleRate / 10);
    let i = 0;
    while (i < limit && Math.abs(data[i]) < 0.001) i++;
    return i / buffer.sampleRate;
};

/** The shared player, made on first use. It starts out silent until a tap allows sound. */
const menuPlayer = (): MenuPlayer | null => {
    if (holder.__stickmanMenuMusic !== undefined) return holder.__stickmanMenuMusic;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return (holder.__stickmanMenuMusic = null);
    // Play like music, not like a ringtone: without this, iPhone's silent switch mutes
    // Web Audio while the stage music (an audio element) carries on regardless.
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'playback';
    const ctx = new Ctx();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    const player: MenuPlayer = { ctx, gain, buffer: null, source: null, wanted: null };
    holder.__stickmanMenuMusic = player;
    load(player);
    return player;
};

/** Fetch and decode the loop once; it's small. */
const load = async (player: MenuPlayer) => {
    try {
        const asset = Asset.fromModule(MENU_TRACK);
        const uri = asset.uri ?? asset.localUri;
        if (!uri) return;
        const data = await (await fetch(uri)).arrayBuffer();
        player.buffer = await player.ctx.decodeAudioData(data);
        tryStart(player);
    } catch {
        // No menu music, then: the game is fine without it.
    }
};

/** Start the loop if it's wanted, loaded and allowed to sound, fading in as asked. */
const tryStart = (player: MenuPlayer) => {
    const { ctx, gain, wanted, buffer } = player;
    if (!wanted || !buffer || player.source || ctx.state !== 'running') return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    // The clip opens with a few milliseconds of silence from encoding; skip it on each
    // repeat so the join doesn't stutter.
    source.loopStart = leadingSilenceSec(buffer);
    source.loopEnd = buffer.duration;
    source.connect(gain);
    const now = ctx.currentTime;
    const startAt = now + wanted.delaySec;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(MENU_VOLUME, startAt + Math.max(0.05, wanted.fadeInSec));
    source.start(startAt);
    player.source = source;
};

/** Let the sound system run (only works during a tap, or once a tap has allowed it). */
const wake = () => {
    const player = menuPlayer();
    if (!player) return;
    if (player.ctx.state === 'running') tryStart(player);
    else player.ctx.resume().then(() => tryStart(player), () => {});
};

export const useMenuMusic = () => {
    // Every tap gives the sound system a chance to wake: the first one starts the music on
    // the title screen, and later ones keep sound allowed for the fade-in after a run.
    useEffect(() => {
        menuPlayer();
        document.addEventListener('touchend', wake, true);
        document.addEventListener('click', wake, true);
        return () => {
            document.removeEventListener('touchend', wake, true);
            document.removeEventListener('click', wake, true);
        };
    }, []);

    // Quiet while the game is in the background; back on return (or on the next tap).
    useEffect(() => {
        const onVisibility = () => {
            const player = menuPlayer();
            if (!player) return;
            if (document.hidden) player.ctx.suspend().catch(() => {});
            else if (player.wanted) player.ctx.resume().then(() => tryStart(player), () => {});
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);

    /**
     * Play the loop, fading in over `fadeInSec` after waiting `delaySec`. If it can't sound yet
     * (no tap so far), it starts on the first tap. Already playing: carries on as it is.
     */
    const startMenuMusic = useCallback((fadeInSec = 1.5, delaySec = 0) => {
        const player = menuPlayer();
        if (!player) return;
        player.wanted = { fadeInSec, delaySec };
        wake();
    }, []);

    /** Fade the loop out over `fadeOutSec` and stop it. */
    const stopMenuMusic = useCallback((fadeOutSec = 0.6) => {
        const player = menuPlayer();
        if (!player) return;
        player.wanted = null;
        const { ctx, gain, source } = player;
        player.source = null;
        if (!source) return;
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + fadeOutSec);
        try {
            source.stop(now + fadeOutSec + 0.05);
        } catch {
            // Already stopped.
        }
    }, []);

    return { startMenuMusic, stopMenuMusic };
};
