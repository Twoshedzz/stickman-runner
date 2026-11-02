/**
 * Can it all still be done at Medium and Hard, with human-sized timing kept in real frames?
 * patterns.test.ts does the same for Easy.
 */
import { checkPatterns, clearsStage } from '../difficulty/patternBot';
import { DIFFICULTIES } from '../pace';
import { STAGES } from '../stages';

describe.each(DIFFICULTIES.filter((d) => !d.onTheBeat).map((d) => [d.id, d] as const))('%s', (_id, difficulty) => {
    it('every pattern can be cleared at every speed and pace the difficulty reaches', () => {
        expect(checkPatterns(difficulty).failed).toEqual([]);
    });

    STAGES.forEach((stage, stageIndex) => {
        for (const seed of [1, 2, 3]) {
            it(`a whole stage can be cleared: ${stage.name} (seed ${seed})`, () => {
                expect(clearsStage(difficulty, stageIndex, seed)).toBe(true);
            });
        }
    });
});
