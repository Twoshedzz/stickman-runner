/**
 * Which screens show over the game. `oldConditions` is copied word for word from the
 * conditions GameScreen.tsx used before they moved into whichScreen.ts, and every mix of
 * game state and menu flags must give the same answer.
 */
import { isCountingDown } from '../../../game/pause';
import { createInitialState, GameState } from '../../../game/state';
import { Screen, STAGE_BANNER_FADE_SEC, STAGE_BANNER_SEC, whichScreens } from '../whichScreen';

interface Flags {
    readyToStart: boolean;
    showInstructions: boolean;
    enterInitials: object | null;
    worldScreen: 'entered' | 'browse' | null;
}

/** The JSX conditions in GameScreen.tsx before the split, in the order it drew them. */
const oldConditions = (gameState: GameState, f: Flags): Screen[] => {
    const { readyToStart, showInstructions, enterInitials, worldScreen } = f;
    const countingDown = isCountingDown(gameState);
    const shown: [Screen, unknown][] = [
        ['loading', !readyToStart],
        ['title', readyToStart && !gameState.gameStarted && !gameState.gameOver && !showInstructions && !worldScreen],
        ['worldScores', worldScreen && !showInstructions],
        ['stageBanner', gameState.gameStarted && gameState.stageStatus === 'playing' && !gameState.gameOver &&
            gameState.elapsedSecInStage < STAGE_BANNER_SEC + STAGE_BANNER_FADE_SEC],
        ['hud', gameState.gameStarted || gameState.gameOver],
        ['countdown', countingDown],
        ['paused', gameState.paused && !countingDown && !showInstructions],
        ['initials', enterInitials && !showInstructions],
        ['finished', gameState.gameComplete && !enterInitials && !worldScreen && !showInstructions],
        ['gameOver', gameState.gameOver && !gameState.gameComplete && !enterInitials && !worldScreen && !showInstructions],
        ['howToPlay', showInstructions],
        ['debug', gameState.debugMode],
        ['stageClear', gameState.showContinue],
    ];
    return shown.filter(([, on]) => !!on).map(([name]) => name);
};

const state = (overrides: Partial<GameState> = {}): GameState => Object.assign(createInitialState(), overrides);

const flags = (overrides: Partial<Flags> = {}): Flags => ({
    readyToStart: true,
    showInstructions: false,
    enterInitials: null,
    worldScreen: null,
    ...overrides,
});

const screens = (g: GameState, f: Flags) =>
    whichScreens(g, {
        readyToStart: f.readyToStart,
        showInstructions: f.showInstructions,
        enteringInitials: f.enterInitials !== null,
        worldScreen: f.worldScreen,
    });

describe('which screens show', () => {
    it('matches the old conditions for every mix of game state and menu flags', () => {
        const bools = [false, true];
        let checked = 0;
        for (const gameStarted of bools)
        for (const gameOver of bools)
        for (const gameComplete of bools)
        for (const showContinue of bools)
        for (const paused of bools)
        for (const resumeAt of [0, 1234])
        for (const stageStatus of ['playing', 'exhausted', 'victory'] as const)
        for (const elapsedSecInStage of [0, STAGE_BANNER_SEC + STAGE_BANNER_FADE_SEC - 0.01, STAGE_BANNER_SEC + STAGE_BANNER_FADE_SEC, 90])
        for (const debugMode of bools)
        for (const readyToStart of bools)
        for (const showInstructions of bools)
        for (const enterInitials of [null, { score: 5, completed: false }])
        for (const worldScreen of [null, 'entered', 'browse'] as const) {
            const g = state({ gameStarted, gameOver, gameComplete, showContinue, paused, resumeAt, stageStatus, elapsedSecInStage, debugMode });
            const f = { readyToStart, showInstructions, enterInitials, worldScreen };
            expect(screens(g, f)).toEqual(oldConditions(g, f));
            checked++;
        }
        expect(checked).toBe(2 ** 10 * 3 * 4 * 3);
    });

    it('loading, before the first track is in', () => {
        expect(screens(state(), flags({ readyToStart: false }))).toEqual(['loading']);
    });

    it('the title, once everything has loaded', () => {
        expect(screens(state(), flags())).toEqual(['title']);
    });

    it('How to Play in place of the title', () => {
        expect(screens(state(), flags({ showInstructions: true }))).toEqual(['howToPlay']);
    });

    it('the world top 10 in place of the title', () => {
        expect(screens(state(), flags({ worldScreen: 'browse' }))).toEqual(['worldScores']);
    });

    it('the stage name and the HUD at the start of a stage, then just the HUD', () => {
        expect(screens(state({ gameStarted: true }), flags())).toEqual(['stageBanner', 'hud']);
        expect(screens(state({ gameStarted: true, elapsedSecInStage: 30 }), flags())).toEqual(['hud']);
    });

    it('PAUSED over the HUD, then the 3-2-1 instead', () => {
        const paused = state({ gameStarted: true, elapsedSecInStage: 30, paused: true });
        expect(screens(paused, flags())).toEqual(['hud', 'paused']);
        expect(screens({ ...paused, resumeAt: 99 }, flags())).toEqual(['hud', 'countdown']);
        expect(screens(paused, flags({ showInstructions: true }))).toEqual(['hud', 'howToPlay']);
    });

    it('Stage Clear over the HUD', () => {
        const clear = state({ gameStarted: true, elapsedSecInStage: 180, stageStatus: 'exhausted', showContinue: true });
        expect(screens(clear, flags())).toEqual(['hud', 'stageClear']);
    });

    it('initials first when a run makes the world top 10, then the board, then Game Over', () => {
        const over = state({ gameStarted: true, gameOver: true, elapsedSecInStage: 60 });
        expect(screens(over, flags({ enterInitials: { score: 5, completed: false } }))).toEqual(['hud', 'initials']);
        expect(screens(over, flags({ worldScreen: 'entered' }))).toEqual(['worldScores', 'hud']);
        expect(screens(over, flags())).toEqual(['hud', 'gameOver']);
    });

    it('Finished rather than Game Over when every stage is cleared', () => {
        const done = state({ gameStarted: true, gameOver: true, gameComplete: true, stageStatus: 'victory' });
        expect(screens(done, flags())).toEqual(['hud', 'finished']);
    });

    it('the debug panel on top of whatever else is showing', () => {
        expect(screens(state({ debugMode: true }), flags())).toEqual(['title', 'debug']);
    });
});
