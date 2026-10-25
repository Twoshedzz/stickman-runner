/**
 * The parts of the music hooks that are the same on the phone and on the web. Each hook has
 * a phone version (expo-audio) and a .web version (HTML audio); these rules are shared.
 */

/** How loud the menu loop plays, compared with the stage music. */
export const MENU_VOLUME = 0.8;

/** The stage music's fade-out at the end of a run: 20 steps of a tenth of a second. */
const FADE_OUT_STEPS = 20;
const FADE_OUT_STEP_MS = 100;

/**
 * Fade the stage music down to silence, about 2 seconds. If a new run starts in that time,
 * the fade must not touch the new audio, or the rest of that run plays in silence: it stops
 * as soon as `overtaken` says so. True if it reached the end, so the music can be stopped.
 */
export const fadeOut = async (setVolume: (volume: number) => void, overtaken: () => boolean) => {
    for (let i = FADE_OUT_STEPS; i >= 0; i--) {
        if (overtaken()) return false;
        setVolume(i / FADE_OUT_STEPS);
        await new Promise((r) => setTimeout(r, FADE_OUT_STEP_MS));
    }
    return !overtaken();
};

/**
 * Carrying on after a pause: the music is rewound by `leadInSec` so it plays through the
 * game's 3-2-1 and is back where it stopped as play resumes. Paused in the first seconds of
 * the track there isn't that much to rewind, so it starts a little later instead.
 *
 * Gives how far to rewind, and how long to wait before playing (0: play straight away, which
 * on iPhone Safari must happen inside the RESUME tap).
 */
export const resumeLeadIn = (leadInSec: number, positionSec: number) => {
    const rewindSec = Math.min(leadInSec, positionSec);
    const wait = leadInSec - rewindSec;
    return { rewindSec, waitSec: wait > 0.05 ? wait : 0 };
};
