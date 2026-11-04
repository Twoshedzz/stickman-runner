/**
 * The crash screen sits outside the game, and by the time it shows, the game has gone. So the
 * score table leaves its save here for the crash screen to call.
 */
let save: (() => void) | null = null;

export const setCrashSave = (saveHighScore: () => void) => {
    save = saveHighScore;
};

/** Keep what can be kept. A crash while crashing must not get in the way of the crash screen. */
export const saveBeforeCrash = () => {
    try {
        save?.();
    } catch (error) {
        console.warn("Couldn't save the high score:", error);
    }
};
