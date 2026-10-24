/**
 * One finger on the screen: a tap jumps, a swipe down ducks while held, and a swipe back up
 * from that duck jumps - once per press.
 */
import { endSwipe, moveSwipe, startSwipe, SWIPE_DUCK_PX, SWIPE_JUMP_PX } from '../swipe';

describe('swipe', () => {
    it('a tap, or a small wobble, is a tap', () => {
        const swipe = startSwipe(100, 100);
        expect(moveSwipe(swipe, 104, 108)).toBeNull();
        expect(endSwipe(swipe)).toBe('tap');
    });

    it('a swipe down ducks, and lifting the finger lets go of the duck', () => {
        const swipe = startSwipe(100, 100);
        expect(moveSwipe(swipe, 102, 100 + SWIPE_DUCK_PX + 1)).toBe('duck');
        expect(moveSwipe(swipe, 102, 160)).toBeNull(); // already down
        expect(endSwipe(swipe)).toBe('release');
    });

    it('a sideways drag does not duck', () => {
        const swipe = startSwipe(100, 100);
        expect(moveSwipe(swipe, 160, 130)).toBeNull();
        expect(endSwipe(swipe)).toBe('tap');
    });

    it('a swipe up from a held duck jumps, measured from the lowest point', () => {
        const swipe = startSwipe(100, 100);
        moveSwipe(swipe, 100, 130); // duck
        moveSwipe(swipe, 100, 170); // keeps going down
        // Back up past where the duck started, but not yet far enough up from the lowest point.
        expect(moveSwipe(swipe, 100, 170 - SWIPE_JUMP_PX)).toBeNull();
        expect(moveSwipe(swipe, 100, 170 - SWIPE_JUMP_PX - 1)).toBe('jump');
        // The jump replaces the tap and the release when the finger lifts.
        expect(endSwipe(swipe)).toBeNull();
    });

    it('only one jump per press, however the finger keeps moving', () => {
        const swipe = startSwipe(100, 100);
        moveSwipe(swipe, 100, 140);
        expect(moveSwipe(swipe, 100, 90)).toBe('jump');
        expect(moveSwipe(swipe, 100, 40)).toBeNull();
        expect(moveSwipe(swipe, 100, 160)).toBeNull(); // no second duck either
        expect(moveSwipe(swipe, 100, 60)).toBeNull();
    });

    it('a swipe up without ducking first does nothing until the finger lifts', () => {
        const swipe = startSwipe(100, 100);
        expect(moveSwipe(swipe, 100, 40)).toBeNull();
        expect(endSwipe(swipe)).toBe('tap');
    });

    it('a sideways drag while ducked does not jump', () => {
        const swipe = startSwipe(100, 100);
        moveSwipe(swipe, 100, 140);
        expect(moveSwipe(swipe, 180, 100)).toBeNull();
        expect(endSwipe(swipe)).toBe('release');
    });
});
