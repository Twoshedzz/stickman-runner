import { STAGES } from '../stages';
import { createInitialState, GameState } from '../state';
import { stepWorld } from '../step';
import { jump } from '../systems/physics';

const DT = 1 / 60;
const STAGE = STAGES[0];

/** A runner on an empty course: far enough along that nothing more spawns. */
const runner = (): GameState => {
    const state = createInitialState();
    state.gameStarted = true;
    state.distance = STAGE.courseLength;
    return state;
};

/** Play frames; how many landing events they gave, counted frame by frame. */
const landings = (state: GameState, frames: number, each?: (frame: number) => void) => {
    let count = 0;
    for (let f = 0; f < frames; f++) {
        each?.(f);
        stepWorld(state, STAGE, DT, { sparks: false });
        count += state.events.filter((e) => e.type === 'land').length;
    }
    return count;
};

describe('landing event', () => {
    it('a jump lands exactly once', () => {
        const state = runner();
        jump(state);
        expect(landings(state, 120)).toBe(1);
        expect(state.player.isGrounded).toBe(true);
    });

    it('a double jump still lands once', () => {
        const state = runner();
        jump(state);
        expect(landings(state, 150, (f) => f === 12 && jump(state))).toBe(1);
    });

    it('running along the ground never lands', () => {
        expect(landings(runner(), 60)).toBe(0);
    });

    it('only lasts the frame it happened in', () => {
        const state = runner();
        jump(state);
        landings(state, 120);
        stepWorld(state, STAGE, DT, { sparks: false });
        expect(state.events).toEqual([]);
    });
});
