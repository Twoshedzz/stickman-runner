/** The music rules shared by the phone and web hooks (musicShared.ts). */
import { fadeOut, replayTrack, resumeLeadIn } from '../musicShared';

describe('fadeOut', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const run = async (overtakeAt = Infinity) => {
        const volumes: number[] = [];
        const done = fadeOut((v) => volumes.push(v), () => volumes.length >= overtakeAt);
        for (let i = 0; i < 25; i++) await jest.advanceTimersByTimeAsync(100);
        return { finished: await done, volumes };
    };

    it('steps the volume down from 1 to 0 in 20 steps, a tenth of a second apart', async () => {
        const { finished, volumes } = await run();
        expect(finished).toBe(true);
        expect(volumes).toEqual(Array.from({ length: 21 }, (_, i) => (20 - i) / 20));
    });

    it('leaves the volume alone once overtaken by a new run', async () => {
        const { finished, volumes } = await run(5);
        expect(finished).toBe(false);
        expect(volumes).toHaveLength(5);
    });
});

describe('resumeLeadIn', () => {
    it('rewinds by the whole 3-2-1 when it can, and plays straight away', () => {
        expect(resumeLeadIn(3, 42)).toEqual({ rewindSec: 3, waitSec: 0 });
    });

    it('near the start of the track, rewinds what it can and waits out the rest', () => {
        expect(resumeLeadIn(3, 1)).toEqual({ rewindSec: 1, waitSec: 2 });
    });

    it("doesn't wait for a moment too short to matter", () => {
        expect(resumeLeadIn(3, 2.98)).toEqual({ rewindSec: 2.98, waitSec: 0 });
    });
});

describe('replayTrack', () => {
    const fakeTrack = () => {
        const calls: string[] = [];
        return {
            calls,
            track: {
                rewind: () => calls.push('rewind'),
                setVolume: (v: number) => calls.push(`volume ${v}`),
                play: () => calls.push('play'),
            },
        };
    };

    it('carries on from where it is when no stop was in progress', () => {
        const { calls, track } = fakeTrack();
        replayTrack(track, false);
        expect(calls).toEqual(['volume 1', 'play']);
    });

    it('goes back to the start, before playing, when a new run comes inside the fade', () => {
        const { calls, track } = fakeTrack();
        replayTrack(track, true);
        expect(calls).toEqual(['rewind', 'volume 1', 'play']);
    });
});
