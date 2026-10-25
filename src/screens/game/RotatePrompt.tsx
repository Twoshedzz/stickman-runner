/** Phone browsers held upright: asks for the phone to be turned sideways, over everything. */
// Left out of the React Compiler, like the rest of the game screen: see GameScreen.tsx.
'use no memo';

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { RNText } from '../../components/RNText';

export const RotatePrompt = () => (
    <View style={styles.rotateOverlay}>
        <RNText style={styles.rotateIcon}>{'\u21BB'}</RNText>
        <RNText style={styles.rotateText}>TURN YOUR PHONE SIDEWAYS</RNText>
    </View>
);

const styles = StyleSheet.create({
    rotateOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0f0c29',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    rotateIcon: {
        color: '#ff00cc',
        fontSize: 64,
    },
    rotateText: {
        color: '#00ffff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
});
