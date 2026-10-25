/**
 * When the game screen draws again (redraw.ts). Away from play the loop only has it drawn
 * when shownKey changes, so anything that changes which screens show must change the key.
 */
import { MenuFlags, whichScreens } from '../../screens/game/whichScreen';
import { movesEveryFrame, shownKey } from '../loop/redraw';
import { createInitialState, GameState } from '../state';

const state = (changes: Partial<GameState>): GameState => ({ ...createInitialState(), ...changes });

const MENU_FLAGS: MenuFlags[] = [];
for (const readyToStart of [false, true])
    for (const showInstructions of [false, true])
        for (const enteringInitials of [false, true])
            for (const worldScreen of [null, 'entered', 'browse'] as const)
                MENU_FLAGS.push({ readyToStart, showInstructions, enteringInitials, worldScreen });

const screensFor = (game: GameState) => MENU_FLAGS.map(flags => whichScreens(game, flags).join(',')).join(' / ');

describe('movesEveryFrame', () => {
    it('is true while a stage is played or the 3-2-1 counts down', () => {
        expect(movesEveryFrame(state({ gameStarted: true }))).toBe(true);
        expect(movesEveryFrame(state({ gameStarted: true, paused: true, resumeAt: 10 }))).toBe(true);
    });

    it('is false on the title, PAUSED, Stage Clear and Game Over', () => {
        expect(movesEveryFrame(state({}))).toBe(false);
        expect(movesEveryFrame(state({ gameStarted: true, paused: true }))).toBe(false);
        expect(movesEveryFrame(state({ gameStarted: true, stageStatus: 'exhausted', showContinue: true }))).toBe(false);
        expect(movesEveryFrame(state({ gameStarted: true, gameOver: true }))).toBe(false);
        expect(movesEveryFrame(state({ gameStarted: true, gameOver: true, gameComplete: true, stageStatus: 'victory' }))).toBe(false);
    });
});

describe('shownKey', () => {
    it('changes whenever the screens showing change, away from play', () => {
        const byKey = new Map<string, string>();
        for (const gameStarted of [false, true])
            for (const gameOver of [false, true])
                for (const gameComplete of [false, true])
                    for (const stageStatus of ['playing', 'exhausted', 'victory'] as const)
                        for (const showContinue of [false, true])
                            for (const paused of [false, true])
                                for (const resumeAt of [0, 10])
                                    for (const debugMode of [false, true]) {
                                        const game = state({ gameStarted, gameOver, gameComplete, stageStatus, showContinue, paused, resumeAt, debugMode });
                                        if (movesEveryFrame(game)) continue;
                                        const key = shownKey(game);
                                        const screens = screensFor(game);
                                        expect(byKey.get(key) ?? screens).toBe(screens);
                                        byKey.set(key, screens);
                                    }
        expect(byKey.size).toBeGreaterThan(20);
    });

    it('stays the same while the Stage Clear screen waits (the stage clock still runs there)', () => {
        const at = (elapsedSecInStage: number) =>
            state({ gameStarted: true, stageStatus: 'exhausted', showContinue: true, stageProgress: 1, elapsedSecInStage });
        expect(shownKey(at(400))).toBe(shownKey(at(180)));
        expect(screensFor(at(400))).toBe(screensFor(at(180)));
    });

    it('changes with the numbers on the HUD and menus', () => {
        const base = state({ gameStarted: true, paused: true });
        const player = base.player;
        expect(shownKey({ ...base, score: 5 })).not.toBe(shownKey(base));
        expect(shownKey({ ...base, streak: 3 })).not.toBe(shownKey(base));
        expect(shownKey({ ...base, energy: base.energy - 1 })).not.toBe(shownKey(base));
        expect(shownKey({ ...base, player: { ...player, health: player.health - 1 } })).not.toBe(shownKey(base));
        expect(shownKey({ ...base, stageId: 'stage_2_beach' })).not.toBe(shownKey(base));
    });
});
