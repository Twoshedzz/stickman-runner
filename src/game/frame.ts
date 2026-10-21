/**
 * How many 60fps frames' worth of movement one tick is worth.
 *
 * Anything that moves or changes a little bit each frame should multiply by this, so the
 * game plays the same on a 60Hz phone, a 120Hz phone, and a browser dropping frames.
 * Capped at 2 so one slow frame can't shoot the player straight through an obstacle.
 */
export const frameScale = (deltaTimeSec: number) =>
    Math.max(0.001, Math.min(2, deltaTimeSec * 60));
