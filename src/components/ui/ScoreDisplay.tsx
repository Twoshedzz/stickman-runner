import React from 'react';
import { StyleSheet, View } from 'react-native';
import { multiplierFor } from '../../game/pickups';
import { RNText } from '../RNText';

interface ScoreDisplayProps {
    score: number;
    stageNumber?: number;
    /** Obstacles cleared in a row. Shows the multiplier it's earned, and the count once it's going. */
    streak?: number;
    /** The stage's pickup glow, so the multiplier matches what you're collecting. */
    colour?: string;
}

/** The streak count only shows once it's worth noticing. */
const SHOW_STREAK_FROM = 3;

export const ScoreDisplay = React.memo(({ score, stageNumber, streak = 0, colour = '#ff00cc' }: ScoreDisplayProps) => {
    const multiplier = multiplierFor(streak);
    return (
        <View style={styles.scoreContainer}>
            {stageNumber !== undefined && (
                <RNText style={styles.stageLabel}>STAGE {stageNumber}</RNText>
            )}
            <RNText style={styles.scoreLabel}>SCORE</RNText>
            <RNText style={styles.scoreValue}>{score}</RNText>
            {multiplier > 1 && (
                <RNText style={[styles.multiplier, { color: colour, textShadowColor: colour }]}>×{multiplier}</RNText>
            )}
            {streak >= SHOW_STREAK_FROM && (
                <RNText style={[styles.streak, { color: colour }]}>STREAK {streak}</RNText>
            )}
        </View>
    );
}, (prevProps, nextProps) => {
    return prevProps.score === nextProps.score &&
        prevProps.stageNumber === nextProps.stageNumber &&
        prevProps.streak === nextProps.streak &&
        prevProps.colour === nextProps.colour;
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
    stageLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#ff00cc', // Neon Pink for stage
        letterSpacing: 2,
        marginBottom: -2,
    },
    multiplier: {
        fontSize: 20,
        fontWeight: '900',
        marginTop: -4,
        textShadowRadius: 8,
    },
    streak: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 2,
    },
});
