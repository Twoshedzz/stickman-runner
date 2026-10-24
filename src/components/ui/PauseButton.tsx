import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

/**
 * The pause button: two bars in a ring, at the top in the middle, away from the notch and
 * clear of the health bars and score. Tapping it pauses without also jumping, since it sits
 * above the layer that turns taps into jumps.
 */
export const PauseButton = ({ onPress }: { onPress: () => void }) => (
    <Pressable
        onPress={onPress}
        hitSlop={14}
        accessibilityRole="button"
        accessibilityLabel="Pause"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
        <View style={styles.bar} />
        <View style={styles.bar} />
    </Pressable>
);

const styles = StyleSheet.create({
    button: {
        position: 'absolute',
        top: 14,
        alignSelf: 'center',
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.75)',
        backgroundColor: 'rgba(4, 2, 12, 0.45)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
    },
    pressed: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    bar: {
        width: 4,
        height: 13,
        borderRadius: 1,
        backgroundColor: 'white',
    },
});
