import React from 'react';
import { StyleSheet, View } from 'react-native';
import { RNText } from '../RNText';
import { ArcadeMenu } from './ArcadeMenu';
import { MenuScreen } from './MenuScreen';
import { FONT, glow, NEON } from './menuStyle';

interface Props {
    stageNumber: number;
    stageName: string;
    score: number;
    onResume: () => void;
    onHowToPlay: () => void;
    /** Give up the run and go back to the title. */
    onQuit: () => void;
}

/** The run is paused: where you are, and the way back in (or out). */
export const PausedScreen = ({ stageNumber, stageName, score, onResume, onHowToPlay, onQuit }: Props) => (
    <MenuScreen>
        <View style={styles.panel}>
            <RNText style={styles.title}>PAUSED</RNText>
            <RNText style={styles.where}>STAGE {stageNumber} {'·'} {stageName}</RNText>
            <RNText style={styles.score}>SCORE {String(score).padStart(6, '0')}</RNText>
        </View>
        <ArcadeMenu
            items={[
                { label: 'RESUME', onPress: onResume },
                { label: 'HOW TO PLAY', onPress: onHowToPlay },
                { label: 'QUIT', onPress: onQuit },
            ]}
        />
    </MenuScreen>
);

const styles = StyleSheet.create({
    panel: {
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingVertical: 10,
        marginBottom: 12,
        backgroundColor: NEON.panel,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 255, 0.7)',
        boxShadow: '0 0 14px rgba(0, 255, 255, 0.7)',
    },
    title: {
        fontFamily: FONT.display,
        fontSize: 44,
        letterSpacing: 6,
        color: NEON.white,
        ...glow(NEON.cyan, 16),
    },
    where: {
        fontFamily: FONT.bold,
        fontSize: 12,
        letterSpacing: 4,
        color: NEON.hotPink,
        marginTop: 4,
    },
    score: {
        fontFamily: FONT.bold,
        fontSize: 14,
        letterSpacing: 3,
        color: NEON.yellow,
        marginTop: 4,
    },
});
