import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLOR_HP_DEEP } from '../../game/constants';

interface HealthBarProps {
    health: number;
    maxHealth: number;
}

function HealthBarComponent({ health, maxHealth }: HealthBarProps) {
    // Calculate width percentage
    const widthPercent = Math.max(0, Math.min((health / maxHealth) * 100, 100));

    return (
        <View style={styles.healthContainer}>
            <View style={styles.healthBarBackground}>
                <View
                    style={[
                        styles.healthBarFill,
                        { width: `${widthPercent}%` }
                    ]}
                />
            </View>
            <Text style={styles.healthText}>HP</Text>
        </View>
    );
}

const arePropsEqual = (prevProps: HealthBarProps, nextProps: HealthBarProps) => {
    return prevProps.health === nextProps.health && prevProps.maxHealth === nextProps.maxHealth;
};

export const HealthBar = React.memo(HealthBarComponent, arePropsEqual);

const styles = StyleSheet.create({
    healthContainer: {
        position: 'absolute',
        top: 20,
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    healthBarBackground: {
        width: 150,
        height: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    healthBarFill: {
        height: '100%',
        backgroundColor: COLOR_HP_DEEP,
    },
    healthText: {
        fontSize: 16,
        fontWeight: '900',
        color: 'white',
    },
});
