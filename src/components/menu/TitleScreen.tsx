import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ScoreEntry } from '../../game/loop/useScoreTable';
import type { DifficultyId } from '../../game/pace';
import type { WorldEntry } from '../../scoreboard/rules';
import { RNText } from '../RNText';
import { ArcadeMenu } from './ArcadeMenu';
import { BestRuns } from './BestRuns';
import { DifficultyPicker } from './DifficultyPicker';
import { MenuScreen } from './MenuScreen';
import { FONT, glow, NEON } from './menuStyle';
import { ShinyLogo } from './ShinyLogo';
import { WorldBoard } from './WorldBoard';

/** Attract mode: how long the logo and each table stay up. */
const ATTRACT_LOGO_MS = 7000;
const ATTRACT_SCORES_MS = 5000;

type Feature = 'logo' | 'world' | 'best';

interface Props {
    /** The high score, best runs and world top 10 are all the picked difficulty's. */
    hiScore: number;
    scoreTable: ScoreEntry[];
    /** The world top 10, or null when there's no world board to show. */
    worldEntries: WorldEntry[] | null;
    onStart: () => void;
    onHowToPlay: () => void;
    /** Opens the world top 10. Left out when there's no world board to show. */
    onWorldScores?: () => void;
    difficulty: DifficultyId;
    onPickDifficulty: (difficulty: DifficultyId) => void;
}

/**
 * The title screen, like an arcade cabinet's attract mode: the logo, the world top 10, then
 * this phone's best runs, taking turns until someone starts a game.
 */
export const TitleScreen = ({ hiScore, scoreTable, worldEntries, onStart, onHowToPlay, onWorldScores, difficulty, onPickDifficulty }: Props) => {
    const features: Feature[] = worldEntries ? ['logo', 'world', 'best'] : ['logo', 'best'];
    const [step, setStep] = useState(0);
    const feature = features[step % features.length];
    useEffect(() => {
        const id = setTimeout(() => setStep((s) => s + 1), feature === 'logo' ? ATTRACT_LOGO_MS : ATTRACT_SCORES_MS);
        return () => clearTimeout(id);
    }, [feature, step]);

    return (
        <MenuScreen>
            <View style={styles.hiScore}>
                <RNText style={styles.hiScoreLabel}>HI-SCORE</RNText>
                <RNText style={styles.hiScoreValue}>{String(hiScore).padStart(6, '0')}</RNText>
            </View>

            <View style={styles.feature}>
                {feature === 'world' && worldEntries ? (
                    <View style={styles.smallTable}><WorldBoard entries={worldEntries} /></View>
                ) : feature === 'best' ? (
                    <View style={styles.smallTable}><BestRuns entries={scoreTable} /></View>
                ) : (
                    <ShinyLogo width={340} />
                )}
            </View>

            <DifficultyPicker difficulty={difficulty} onPick={onPickDifficulty} />

            <ArcadeMenu
                items={[
                    { label: 'START GAME', onPress: onStart },
                    ...(onWorldScores ? [{ label: 'WORLD SCORES', onPress: onWorldScores }] : []),
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
    // The tables are drawn a little smaller, to leave room for the difficulty picker.
    smallTable: {
        transform: [{ scale: 0.78 }],
    },
    feature: {
        height: 118,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 14,
        marginBottom: 2,
    },
});
