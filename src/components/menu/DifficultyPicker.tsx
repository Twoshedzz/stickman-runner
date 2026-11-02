import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DIFFICULTIES, DifficultyId } from '../../game/pace';
import { RNText } from '../RNText';
import { FONT, glow, NEON } from './menuStyle';

interface Props {
    difficulty: DifficultyId;
    onPick: (difficulty: DifficultyId) => void;
}

/** EASY, MEDIUM, HARD on the title screen: a row of neon buttons, the picked one lit. */
export const DifficultyPicker = ({ difficulty, onPick }: Props) => (
    <View style={styles.picker}>
        {DIFFICULTIES.map((d) => (
            <Pressable
                key={d.id}
                onPress={() => onPick(d.id)}
                hitSlop={4}
                style={[styles.button, d.id === difficulty && styles.buttonOn]}
            >
                <RNText style={[styles.buttonText, d.id === difficulty && styles.buttonTextOn]}>{d.name}</RNText>
            </Pressable>
        ))}
    </View>
);

const styles = StyleSheet.create({
    // A dark band, so it reads over the sun and the horizon glow.
    picker: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 4,
        paddingVertical: 3,
        paddingHorizontal: 10,
        backgroundColor: 'rgba(4, 2, 12, 0.72)',
    },
    button: {
        width: 92,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(0, 255, 255, 0.45)',
        backgroundColor: 'rgba(4, 2, 12, 0.6)',
    },
    buttonOn: {
        borderColor: NEON.cyan,
        backgroundColor: 'rgba(0, 255, 255, 0.2)',
        boxShadow: '0 0 10px rgba(0, 255, 255, 0.6)',
    },
    buttonText: {
        fontFamily: FONT.display,
        fontSize: 16,
        color: NEON.cyan,
    },
    buttonTextOn: {
        color: NEON.white,
        ...glow(NEON.pink, 8),
    },
});
