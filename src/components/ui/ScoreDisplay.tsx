import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ScoreDisplayProps {
    score: number;
}

export const ScoreDisplay = React.memo(({ score }: ScoreDisplayProps) => {
    return (
        <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>SCORE</Text>
            <Text style={styles.scoreValue}>{score}</Text>
        </View>
    );
}, (prevProps, nextProps) => {
    return prevProps.score === nextProps.score;
});

const styles = StyleSheet.create({
    scoreContainer: {
        position: 'absolute',
        top: 20,
        right: 20,
        alignItems: 'flex-end',
    },
    scoreLabel: {
        fontSize: 12,
        fontWeight: '900',
        color: 'white',
        letterSpacing: 2,
    },
    scoreValue: {
        fontSize: 32,
        fontWeight: '900',
        color: 'white',
    },
});
