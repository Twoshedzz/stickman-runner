/** The big 3-2-1 over the frozen game when a paused run carries on. */
// Left out of the React Compiler, like the rest of the game screen: see GameScreen.tsx.
'use no memo';

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { FONT, glow, NEON } from '../../components/menu/menuStyle';
import { RNText } from '../../components/RNText';
import { countdownLeft } from '../../game/pause';
import { GameState } from '../../game/state';

export const ResumeCountdown = ({ gameState }: { gameState: GameState }) => (
    <View style={styles.countdown}>
        <RNText style={styles.countdownNumber}>{countdownLeft(gameState, Date.now() / 1000)}</RNText>
    </View>
);

const styles = StyleSheet.create({
    countdown: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        // Taps pass straight through (they don't jump while paused anyway).
        pointerEvents: 'none',
    },
    countdownNumber: {
        fontFamily: FONT.display,
        fontSize: 96,
        color: NEON.white,
        ...glow(NEON.pink, 24),
    },
});
