import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FONT, NEON } from './menu/menuStyle';
import { RNText } from './RNText';

export const reloadPage = () => window.location.reload();

interface CrashScreenProps {
    title: string;
    message: string;
    buttonLabel: string;
    onPress: () => void;
}

/** What shows when the game can't load or has crashed: what happened, and a way back in. */
export const CrashScreen = ({ title, message, buttonLabel, onPress }: CrashScreenProps) => (
    <View style={styles.screen}>
        <RNText style={styles.title}>{title}</RNText>
        <RNText style={styles.message}>{message}</RNText>
        <Pressable onPress={onPress} style={styles.button}>
            <RNText style={styles.buttonLabel}>{buttonLabel}</RNText>
        </Pressable>
    </View>
);

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        backgroundColor: '#04020c',
    },
    title: {
        fontFamily: FONT.display,
        fontSize: 22,
        letterSpacing: 3,
        textAlign: 'center',
        color: NEON.pink,
    },
    message: {
        maxWidth: 520,
        fontFamily: FONT.body,
        fontSize: 13,
        letterSpacing: 1,
        lineHeight: 20,
        textAlign: 'center',
        color: NEON.white,
    },
    button: {
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: NEON.cyan,
    },
    buttonLabel: {
        fontFamily: FONT.bold,
        fontSize: 16,
        letterSpacing: 3,
        color: NEON.cyan,
    },
});
