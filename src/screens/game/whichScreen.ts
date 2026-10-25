/**
 * Which screens show over the game right now, worked out in one place from the game state
 * and the menu flags. Some show together (the HUD under PAUSED, the debug panel over
 * anything), so the answer is a list, in the order they're drawn: later ones on top.
 */
import { isCountingDown } from '../../game/pause';
import { GameState } from '../../game/state';

/** The stage name shows for this long at the start of each stage, then fades over the next bit. */
export const STAGE_BANNER_SEC = 5;
export const STAGE_BANNER_FADE_SEC = 0.8;

export type Screen =
    | 'loading'
    | 'title'
    | 'worldScores'
    | 'stageBanner'
    | 'hud'
    | 'countdown'
    | 'paused'
    | 'initials'
    | 'finished'
    | 'gameOver'
    | 'howToPlay'
    | 'debug'
    | 'stageClear';

/** The screen's own menu flags, kept outside the game state. */
export interface MenuFlags {
    /** The first stage's music and the scenery have loaded. */
    readyToStart: boolean;
    /** How to Play is open. */
    showInstructions: boolean;
    /** A run made the world top 10 and is asking for initials. */
    enteringInitials: boolean;
    /** The world top 10 is open: just after entering initials, or opened from a menu. */
    worldScreen: 'entered' | 'browse' | null;
}

export const whichScreens = (game: GameState, ui: MenuFlags): Screen[] => {
    const { readyToStart, showInstructions, enteringInitials, worldScreen } = ui;
    const countingDown = isCountingDown(game);
    /** Initials, the world board and How to Play all hold back the end-of-run screens. */
    const endScreenFree = !enteringInitials && !worldScreen && !showInstructions;
    const shown: [Screen, boolean][] = [
        ['loading', !readyToStart],
        ['title', readyToStart && !game.gameStarted && !game.gameOver && !showInstructions && !worldScreen],
        ['worldScores', !!worldScreen && !showInstructions],
        ['stageBanner', game.gameStarted && game.stageStatus === 'playing' && !game.gameOver &&
            game.elapsedSecInStage < STAGE_BANNER_SEC + STAGE_BANNER_FADE_SEC],
        ['hud', game.gameStarted || game.gameOver],
        ['countdown', countingDown],
        ['paused', game.paused && !countingDown && !showInstructions],
        ['initials', enteringInitials && !showInstructions],
        ['finished', game.gameComplete && endScreenFree],
        ['gameOver', game.gameOver && !game.gameComplete && endScreenFree],
        ['howToPlay', showInstructions],
        ['debug', game.debugMode],
        ['stageClear', game.showContinue],
    ];
    return shown.filter(([, on]) => on).map(([screen]) => screen);
};
