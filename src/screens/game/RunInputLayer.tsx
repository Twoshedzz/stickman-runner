/** The see-through layer over the game that takes taps and swipes (off while Stage Clear shows, so music doesn't restart). */
// Left out of the React Compiler, like the rest of the game screen: see GameScreen.tsx.
'use no memo';

import React from 'react';
import { GestureResponderEvent, StyleSheet, View } from 'react-native';
import { GestureDetector, type LegacyComposedGesture } from 'react-native-gesture-handler';
import { fillParent } from '../../components/fillParent';

interface Props {
    /** A phone browser: one touch handler decides tap or swipe. Otherwise the gesture library does. */
    touchWeb: boolean;
    disabled: boolean;
    /** Tap to jump, swipe to duck (useRunInput). */
    runGesture: LegacyComposedGesture;
    touchHandlers: {
        onTouchStart: (e: GestureResponderEvent) => void;
        onTouchMove: (e: GestureResponderEvent) => void;
        onTouchEnd: (e: GestureResponderEvent) => void;
    };
}

export const RunInputLayer = ({ touchWeb, disabled, runGesture, touchHandlers }: Props) =>
    touchWeb ? (
        <View
            style={[styles.inputLayer, { pointerEvents: disabled ? 'none' : 'auto' }]}
            onTouchStart={touchHandlers.onTouchStart}
            onTouchMove={touchHandlers.onTouchMove}
            onTouchEnd={touchHandlers.onTouchEnd}
        />
    ) : (
        <GestureDetector gesture={runGesture}>
            <View style={[styles.inputLayer, { pointerEvents: disabled ? 'none' : 'auto' }]} />
        </GestureDetector>
    );

const styles = StyleSheet.create({
    inputLayer: {
        ...fillParent,
        zIndex: 10,
        backgroundColor: 'transparent',
    },
});
