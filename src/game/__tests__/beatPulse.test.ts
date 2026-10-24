import { RUNNER_GROUND_Y, SCREEN_HEIGHT } from '../constants';
import { nearestPulseSec, PULSE_TRAVEL_SEC, pulseBand, pulseSec } from '../beatPulse';
import { STAGES } from '../stages';

describe('the beat pulse', () => {
    it('crosses the runner\'s line exactly on the beat, on every stage', () => {
        for (const stage of STAGES) {
            for (const n of [0, 1, 7, 100]) {
                const beat = stage.beat.firstSec + n * pulseSec(stage);
                const band = pulseBand(stage, beat);
                expect(band).not.toBeNull();
                expect(band!.y).toBeCloseTo(RUNNER_GROUND_Y, 5);
                expect(band!.strength).toBeGreaterThan(0.9);
                expect(nearestPulseSec(stage, beat + 0.05)).toBeCloseTo(beat, 5);
            }
        }
    });

    it('rolls from the front of the floor towards the horizon', () => {
        const stage = STAGES[0];
        const beat = stage.beat.firstSec + 10 * pulseSec(stage);
        const before = pulseBand(stage, beat - 0.2)!;
        const after = pulseBand(stage, beat + 0.1)!;
        expect(before.y).toBeGreaterThan(RUNNER_GROUND_Y);
        expect(before.y).toBeLessThanOrEqual(SCREEN_HEIGHT);
        expect(after.y).toBeLessThan(RUNNER_GROUND_Y);
    });

    it('is quiet between pulses', () => {
        const stage = STAGES[0];
        const beat = stage.beat.firstSec + 10 * pulseSec(stage);
        // Done just after crossing the runner, and the next one hasn't started yet.
        expect(pulseBand(stage, beat + (1 - 0.64) * PULSE_TRAVEL_SEC + 0.05)).toBeNull();
    });

    it('rolls on every other beat where the music is faster', () => {
        const stage = STAGES[2];
        expect(stage.beat.pulseEvery).toBe(2);
        const offBeat = stage.beat.firstSec + 11 * stage.beat.sec; // an odd beat
        const band = pulseBand(stage, offBeat);
        expect(band === null || Math.abs(band.y - RUNNER_GROUND_Y) > 5).toBe(true);
    });
});
