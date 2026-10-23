import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { ScoreEntry } from '../../game/loop/useGameLoop';
import { RNText } from '../RNText';
import { ArcadeMenu } from './ArcadeMenu';
import { BestRuns } from './BestRuns';
import { MenuScreen } from './MenuScreen';
import { FONT, glow, NEON } from './menuStyle';

const LOGO = require('../../../assets/images/logo.png');
/** The logo image is 1500x470 (drawn by scripts/generate-menu-art.js). */
const LOGO_ASPECT = 1500 / 470;
/** Attract mode: how long the logo and the best-runs table each stay up. */
const ATTRACT_LOGO_MS = 7000;
const ATTRACT_SCORES_MS = 5000;

interface Props {
    hiScore: number;
    scoreTable: ScoreEntry[];
    onStart: () => void;
    onHowToPlay: () => void;
}

/**
 * The title screen, like an arcade cabinet's attract mode: the logo, then the best runs,
 * taking turns until someone starts a game.
 */
export const TitleScreen = ({ hiScore, scoreTable, onStart, onHowToPlay }: Props) => {
    const [showScores, setShowScores] = useState(false);
    useEffect(() => {
        const id = setTimeout(() => setShowScores((v) => !v), showScores ? ATTRACT_SCORES_MS : ATTRACT_LOGO_MS);
        return () => clearTimeout(id);
    }, [showScores]);

    return (
        <MenuScreen>
            <View style={styles.hiScore}>
                <RNText style={styles.hiScoreLabel}>HI-SCORE</RNText>
                <RNText style={styles.hiScoreValue}>{String(hiScore).padStart(6, '0')}</RNText>
            </View>

            <View style={styles.feature}>
                {showScores ? (
                    <BestRuns entries={scoreTable} />
                ) : (
                    <Image source={LOGO} style={styles.logo} resizeMode="contain" />
                )}
            </View>

            <ArcadeMenu
                items={[
                    { label: 'START GAME', onPress: onStart },
                    { label: 'HOW TO PLAY', onPress: onHowToPlay },
                ]}
            />
        </MenuScreen>
    );
};

const styles = StyleSheet.create({
    hiScore: {
        position: 'absolute',
        top: 12,
        alignSelf: 'center',
        flexDirection: 'row',
        gap: 10,
    },
    hiScoreLabel: {
        fontFamily: FONT.bold,
        fontSize: 12,
        letterSpacing: 3,
        color: NEON.pink,
        ...glow(NEON.pink, 6),
    },
    hiScoreValue: {
        fontFamily: FONT.bold,
        fontSize: 12,
        letterSpacing: 3,
        color: NEON.yellow,
    },
    feature: {
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 6,
        marginBottom: 6,
    },
    logo: {
        width: 420,
        height: 420 / LOGO_ASPECT,
    },
});
