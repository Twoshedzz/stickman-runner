/**
 * When the game screen needs drawing again.
 *
 * The screen reads the game state object while drawing, and that object changes without React
 * being told, so the loop asks React to draw again. While a stage is being played (or the
 * 3-2-1 counts down) things move every frame, so it draws every frame. The rest of the time
 * (the title, menus, PAUSED, Stage Clear, Game Over) nothing on screen moves, and the menu
 * animations run on their own, so it only draws when something the screen shows has changed.
 */
import { isCountingDown } from '../pause';
import { GameState } from '../state';

/** Something on screen moves every frame: a stage being played, or the 3-2-1 counting down. */
export const movesEveryFrame = (state: GameState) =>
    state.gameStarted &&
    !state.gameOver &&
    state.stageStatus === 'playing' &&
    (!state.paused || isCountingDown(state));

/**
 * Everything the screen shows from the game state while nothing moves: which screens are up
 * (see whichScreens in src/screens/game/whichScreen.ts), and the numbers on the HUD and menus.
 * While this stays the same, drawing again would show the same thing.
 */
export const shownKey = (state: GameState) => [
    state.gameStarted,
    state.gameOver,
    state.gameComplete,
    state.stageStatus,
    state.showContinue,
    state.paused,
    isCountingDown(state),
    state.debugMode,
    state.stageId,
    state.paceOption,
    state.score,
    state.player.health,
    state.player.maxHealth,
    Math.floor(state.energy),
    state.streak,
].join('|');
