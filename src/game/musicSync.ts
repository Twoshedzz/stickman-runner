/**
 * Keeping the stage clock on the music.
 *
 * Everything that follows the music (obstacles on the beat, the sky, the finish line) runs
 * on the stage clock, which counts real time from the start of the stage. The music runs on
 * its own, and the two drift apart a little whenever the music stops and starts: each pause,
 * each trip to another app, a slow start on the phone. A pause on iPhone Safari can leave
 * the music a few tenths of a second behind, and that adds up.
 *
 * So while a stage is being played, the clock is nudged towards wherever the music actually
 * is. The nudge is gentle, never more than a tenth of a second per second, so nothing on
 * screen visibly jumps; a small drift is gone within a second or two.
 */

/** How quickly the clock closes the gap: about two-thirds of it in this many seconds. */
const CATCH_UP_SEC = 0.5;
/** The most the clock is moved per second of play. */
const MAX_NUDGE_PER_SEC = 0.1;
/**
 * A gap bigger than this isn't drift: the music is still starting, a different track is
 * playing, or something else is going on. Leave the clock alone rather than chase it.
 */
const MAX_GAP_SEC = 2;

/**
 * How far to move the stage's start time this frame, given the stage clock (`stageSec`) and
 * where the music is (`musicSec`). Positive moves the start later, so the clock reads less.
 */
export const musicNudge = (stageSec: number, musicSec: number, dtSec: number) => {
    const gap = stageSec - musicSec;
    if (!Number.isFinite(gap) || Math.abs(gap) > MAX_GAP_SEC || dtSec <= 0) return 0;
    const step = gap * (1 - Math.exp(-dtSec / CATCH_UP_SEC));
    const limit = MAX_NUDGE_PER_SEC * dtSec;
    return Math.max(-limit, Math.min(limit, step));
};
