import { musicNudge } from '../musicSync';

const DT = 1 / 60;

/** Play `seconds` with the music `startGap` seconds behind the clock; the gap left at the end. */
const gapAfter = (startGap: number, seconds: number) => {
    let start = 0; // the stage's start time
    const end = 10 + seconds;
    let stageSec = 0;
    let musicSec = 0;
    for (let now = 10; now < end; now += DT) {
        stageSec = now - start;
        musicSec = now - startGap; // the music runs steadily, startGap behind
        const nudge = musicNudge(stageSec, musicSec, DT);
        // Never more than a tenth of a second per second, so nothing visibly jumps.
        expect(Math.abs(nudge)).toBeLessThanOrEqual(0.1 * DT + 1e-9);
        start += nudge;
    }
    return stageSec - musicSec;
};

describe('the stage clock follows the music', () => {
    it('closes a small drift within a second or two', () => {
        expect(Math.abs(gapAfter(0.05, 2))).toBeLessThan(0.005);
        expect(Math.abs(gapAfter(-0.05, 2))).toBeLessThan(0.005);
    });

    it('closes a bigger drift steadily, without jumping', () => {
        expect(Math.abs(gapAfter(0.4, 6))).toBeLessThan(0.01);
    });

    it('leaves the clock alone when the music is somewhere else entirely', () => {
        expect(musicNudge(30, 2, DT)).toBe(0);
        expect(musicNudge(2, 30, DT)).toBe(0);
        expect(musicNudge(30, NaN, DT)).toBe(0);
    });

    it('does nothing when they already agree', () => {
        expect(musicNudge(42, 42, DT)).toBe(0);
    });
});
