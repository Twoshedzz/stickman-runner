import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLOR_ENERGY, MAX_ENERGY } from '../../game/constants';

interface EnergyBarProps {
    energy: number;
}

function EnergyBarComponent({ energy }: EnergyBarProps) {
    // Calculate width percentage
    const widthPercent = Math.max(0, Math.min((energy / MAX_ENERGY) * 100, 100));

    return (
        <View style={styles.container}>
            <View style={styles.barBackground}>
                <View
                    style={[
                        styles.barFill,
                        { width: `${widthPercent}%` }
                    ]}
                />
            </View>
            <Text style={styles.text}>ENERGY</Text>
        </View>
    );
}

export const EnergyBar = React.memo(EnergyBarComponent, (prev, next) => prev.energy === next.energy);

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50, // Below Health Bar (which is at top: 20)
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    barBackground: {
        width: 150,
        height: 12, // Slightly thinner than HP
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    barFill: {
        height: '100%',
        backgroundColor: COLOR_ENERGY,
    },
    text: {
        fontSize: 12,
        fontWeight: '900',
        color: COLOR_ENERGY, // Cyan text
        textShadowColor: 'rgba(0, 255, 255, 0.5)',
        textShadowRadius: 4,
    },
});
