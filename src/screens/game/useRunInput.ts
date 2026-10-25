/** Taps and swipes on the game: tap to jump, swipe down and hold to duck, swipe back up to jump. */
// Left out of the React Compiler, like the rest of the game screen: see GameScreen.tsx.
'use no memo';

import { useCallback, useMemo, useRef } from 'react';
import { GestureResponderEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { GameState } from '../../game/state';
import { endSwipe, moveSwipe, startSwipe, Swipe } from '../../game/swipe';

interface Options {
    gameState: GameState;
    onJump: () => void;
    onDuck: (hold?: boolean) => void;
    onDuckRelease: () => void;
}

export const useRunInput = ({ gameState, onJump, onDuck, onDuckRelease }: Options) => {
    const handleInteraction = useCallback(() => {
        if (gameState.gameOver) return;
        if (gameState.showContinue) return;
        onJump();
    }, [onJump, gameState.gameOver, gameState.showContinue]);

    // Swipe down to duck, and keep the finger down to stay ducked; swipe back up from there
    // to jump. Tap still jumps. (The phone app: react-native-gesture-handler.)
    const gestureSwipeRef = useRef<Swipe | null>(null);
    const swipeGesture = useMemo(
        () => Gesture.Pan()
            .runOnJS(true)
            .minDistance(12)
            .onBegin(() => { gestureSwipeRef.current = startSwipe(0, 0); })
            .onUpdate((e) => {
                const swipe = gestureSwipeRef.current;
                if (!swipe) return;
                if (moveSwipe(swipe, e.translationX, e.translationY) === 'jump') {
                    onDuckRelease();
                    handleInteraction();
                } else if (swipe.ducked && !swipe.jumped) {
                    onDuck(true); // again as the finger moves, so a duck swiped in the air lands ducked
                }
            })
            .onFinalize((_e, success) => {
                const swipe = gestureSwipeRef.current;
                gestureSwipeRef.current = null;
                onDuckRelease();
                // A swipe that wasn't a duck (up, or sideways) jumps as the finger lifts, as in a
                // phone browser. `success`: the swipe won the race, so the tap didn't jump already.
                if (success && swipe && endSwipe(swipe) === 'tap') handleInteraction();
            }),
        [onDuck, onDuckRelease, handleInteraction]
    );
    // The tap races the swipe, so each touch is one or the other. (Until SDK 58 a plain button
    // took the tap and the gesture library cancelled it once a swipe began; since Gesture
    // Handler 3 it doesn't, so lifting the finger after a duck also jumped.) No time limit: a
    // long press still jumps on release, as the button did.
    const runGesture = useMemo(
        () => Gesture.Race(
            swipeGesture,
            Gesture.Tap()
                .runOnJS(true)
                .maxDuration(60_000)
                .onEnd((_e, success) => { if (success) handleInteraction(); }),
        ),
        [swipeGesture, handleInteraction]
    );

    /**
     * Phone browsers: one handler decides, for each touch, whether it's a tap (jump) or a
     * downward swipe (duck), or a swipe back up from that duck (jump). In a browser the gesture
     * library and the tap button each saw the same touch, so a swipe also jumped on release,
     * and jumping cancels a duck. The phone app keeps the gesture library above, where it works.
     */
    const touchRef = useRef<Swipe | null>(null);
    const onTouchStart = useCallback((e: GestureResponderEvent) => {
        const t = e.nativeEvent.touches[0];
        if (t) touchRef.current = startSwipe(t.pageX, t.pageY);
    }, []);
    const onTouchMove = useCallback((e: GestureResponderEvent) => {
        const swipe = touchRef.current;
        const t = e.nativeEvent.touches[0];
        if (!swipe || !t) return;
        // Duck the moment the finger has clearly moved down, rather than waiting for it to lift,
        // and stay down for as long as the finger stays on the screen.
        const action = moveSwipe(swipe, t.pageX, t.pageY);
        if (action === 'duck' && !gameState.gameOver && !gameState.showContinue) onDuck(true);
        if (action === 'jump') {
            onDuckRelease();
            handleInteraction();
        }
    }, [onDuck, onDuckRelease, handleInteraction, gameState.gameOver, gameState.showContinue]);
    const onTouchEnd = useCallback((e: GestureResponderEvent) => {
        const swipe = touchRef.current;
        touchRef.current = null;
        // Stops the browser also sending a mouse click for this touch.
        e.preventDefault();
        if (!swipe) return;
        const action = endSwipe(swipe);
        if (action === 'release') onDuckRelease();
        if (action === 'tap') handleInteraction();
    }, [handleInteraction, onDuckRelease]);

    return { handleInteraction, runGesture, touchHandlers: { onTouchStart, onTouchMove, onTouchEnd } };
};
