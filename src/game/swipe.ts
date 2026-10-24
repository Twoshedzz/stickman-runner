/**
 * Reading one finger on the screen as a tap, a swipe down to duck, or - from a held duck -
 * a swipe back up to jump. Kept apart from the touch code so both the phone app's gesture
 * and the phone browser's touch handler read a finger the same way.
 */

/** How far a finger has to move down, in screen points, to count as a swipe to duck. */
export const SWIPE_DUCK_PX = 24;

/** How far a ducking finger has to move back up, in screen points, to jump. */
export const SWIPE_JUMP_PX = 30;

/** One finger, from touching down to lifting. Positions can be in any one frame of reference. */
export type Swipe = {
    startX: number;
    startY: number;
    /** The lowest point the finger has reached since ducking: a swipe up is measured from here. */
    lowX: number;
    lowY: number;
    ducked: boolean;
    /** Swiped back up and jumped. Only once per press: after that the finger does nothing more. */
    jumped: boolean;
};

export const startSwipe = (x: number, y: number): Swipe => ({
    startX: x, startY: y, lowX: x, lowY: y, ducked: false, jumped: false,
});

/** The finger moved to (x, y): 'duck' or 'jump' the moment it becomes one, otherwise null. */
export const moveSwipe = (swipe: Swipe, x: number, y: number): 'duck' | 'jump' | null => {
    if (swipe.jumped) return null;

    if (!swipe.ducked) {
        const dx = x - swipe.startX;
        const dy = y - swipe.startY;
        if (dy > SWIPE_DUCK_PX && dy > Math.abs(dx)) {
            swipe.ducked = true;
            swipe.lowX = x;
            swipe.lowY = y;
            return 'duck';
        }
        return null;
    }

    if (y > swipe.lowY) {
        swipe.lowX = x;
        swipe.lowY = y;
        return null;
    }
    const up = swipe.lowY - y;
    if (up > SWIPE_JUMP_PX && up > Math.abs(x - swipe.lowX)) {
        swipe.jumped = true;
        return 'jump';
    }
    return null;
};

/** The finger lifted: a 'tap' (jump), the end of a held duck, or nothing left to do. */
export const endSwipe = (swipe: Swipe): 'tap' | 'release' | null => {
    if (swipe.jumped) return null;
    return swipe.ducked ? 'release' : 'tap';
};
