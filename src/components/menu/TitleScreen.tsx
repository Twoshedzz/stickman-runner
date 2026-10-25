import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ScoreEntry } from '../../game/loop/useScoreTable';
import type { WorldEntry } from '../../scoreboard/rules';
import { RNText } from '../RNText';
import { ArcadeMenu } from './ArcadeMenu';
import { BestRuns } from './BestRuns';
import { MenuScreen } from './MenuScreen';
import { FONT, glow, NEON } from './menuStyle';
import { ShinyLogo } from './ShinyLogo';
import { WorldBoard } from './WorldBoard';

/** Attract mode: how long the logo and each table stay up. */
const ATTRACT_LOGO_MS = 7000;
const ATTRACT_SCORES_MS = 5000;

type Feature = 'logo' | 'world' | 'best';

interface Props {
    hiScore: number;
    scoreTable: ScoreEntry[];
    /** The world top 10, or null when there's no world board to show. */
    worldEntries: WorldEntry[] | null;
    onStart: () => void;
    onHowToPlay: () => void;
    /** Opens the world top 10. Left out when there's no world board to show. */
    onWorldScores?: () => void;
}

/**
 * The title screen, like an arcade cabinet's attract mode: the logo, the world top 10, then
 * this phone's best runs, taking turns until someone starts a game.
 */
export const TitleScreen = ({ hiScore, scoreTable, worldEntries, onStart, onHowToPlay, onWorldScores }: Props) => {
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
                    <WorldBoard entries={worldEntries} />
                ) : feature === 'best' ? (
                    <BestRuns entries={scoreTable} />
                ) : (
                    <ShinyLogo width={420} />
                )}
            </View>

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
    feature: {
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 6,
        marginBottom: 6,
    },
});
