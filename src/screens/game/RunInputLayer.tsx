/** The see-through layer over the game that takes taps and swipes (off while Stage Clear shows, so music doesn't restart). */
// Left out of the React Compiler, like the rest of the game screen: see GameScreen.tsx.
'use no memo';

import React from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, GestureType } from 'react-native-gesture-handler';

interface Props {
    /** A phone browser: one touch handler decides tap or swipe. Otherwise the gesture library and a tap button. */
    touchWeb: boolean;
    disabled: boolean;
    duckGesture: GestureType;
    onTap: () => void;
    touchHandlers: {
        onTouchStart: (e: GestureResponderEvent) => void;
        onTouchMove: (e: GestureResponderEvent) => void;
        onTouchEnd: (e: GestureResponderEvent) => void;
    };
}

export const RunInputLayer = ({ touchWeb, disabled, duckGesture, onTap, touchHandlers }: Props) =>
    touchWeb ? (
        <View
            style={[styles.inputLayer, { pointerEvents: disabled ? 'none' : 'auto' }]}
            onTouchStart={touchHandlers.onTouchStart}
            onTouchMove={touchHandlers.onTouchMove}
            onTouchEnd={touchHandlers.onTouchEnd}
        />
    ) : (
        <GestureDetector gesture={duckGesture}>
            <View style={[styles.inputLayer, { pointerEvents: disabled ? 'none' : 'auto' }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onTap} />
            </View>
        </GestureDetector>
    );

const styles = StyleSheet.create({
    inputLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
        backgroundColor: 'transparent',
    },
});
