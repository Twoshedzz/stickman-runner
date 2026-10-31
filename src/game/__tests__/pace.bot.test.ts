/**
 * The pace test build (step 12): can it all still be done at every option, with human-sized
 * timing kept in real frames? patterns.test.ts does the same for option A.
 */
import { checkPatterns, clearsStage } from '../difficulty/patternBot';
import { PACE_OPTIONS } from '../pace';
import { STAGES } from '../stages';

describe.each(PACE_OPTIONS.filter((o) => !o.onTheBeat).map((o) => [o.id, o] as const))('option %s', (_id, option) => {
    it('every pattern can be cleared at every speed and pace the option reaches', () => {
        expect(checkPatterns(option).failed).toEqual([]);
    });

    STAGES.forEach((stage, stageIndex) => {
        for (const seed of [1, 2, 3]) {
            it(`a whole stage can be cleared: ${stage.name} (seed ${seed})`, () => {
                expect(clearsStage(option, stageIndex, seed)).toBe(true);
            });
        }
    });
});
