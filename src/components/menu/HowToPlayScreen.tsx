import React from 'react';
import { StyleSheet, View } from 'react-native';
import { STAGES } from '../../game/stages';
import { RNText } from '../RNText';
import { ArcadeMenu } from './ArcadeMenu';
import { MenuScreen } from './MenuScreen';
import { FONT, glow, NEON } from './menuStyle';

/** Obstacles are shown in stage 1's colours, which is where the player first meets them. */
const COLOURS = STAGES[0].theme.obstacleColors!;
const HEART = '#FF1493';

type Shape = { kind: 'block' | 'ball' | 'bar' | 'wide'; colour: string };

/** A small drawing of the obstacle itself, so the player knows exactly what to look for. */
const Icon = ({ kind, colour }: Shape) => {
    const shape =
        kind === 'ball' ? { width: 16, height: 16, borderRadius: 8 }
        : kind === 'bar' ? { width: 7, height: 22 }
        : kind === 'wide' ? { width: 30, height: 12 }
        : { width: 15, height: 15 };
    return (
        <View style={styles.iconBox}>
            <View style={[shape, { backgroundColor: colour, boxShadow: `0 0 8px ${colour}` }]} />
        </View>
    );
};

const Row = ({ keyText, text, icons }: { keyText?: string; text: string; icons?: Shape[] }) => (
    <View style={styles.row}>
        {icons ? (
            <View style={styles.icons}>{icons.map((s, i) => <Icon key={i} {...s} />)}</View>
        ) : (
            <RNText style={styles.key}>{keyText}</RNText>
        )}
        <RNText style={styles.text}>{text}</RNText>
    </View>
);

/** How to play, as its own screen: the controls on the left, the obstacles on the right. */
export const HowToPlayScreen = ({ keyboard, onBack }: { keyboard: boolean; onBack: () => void }) => (
    <MenuScreen>
        <RNText style={styles.title}>HOW TO PLAY</RNText>

        <View style={styles.columns}>
            <View style={styles.column}>
                <RNText style={styles.heading}>CONTROLS</RNText>
                <Row keyText={keyboard ? 'SPACE / ↑' : 'TAP'} text="JUMP" />
                <Row keyText={keyboard ? 'AGAIN' : 'TAP AGAIN'} text="DOUBLE JUMP IN THE AIR" />
                <Row keyText={'⚡'} text="EACH DOUBLE JUMP USES HALF THE ENERGY BAR" />
                <Row keyText={keyboard ? '↓ / S' : 'SWIPE ↓'} text="DUCK · HOLD TO STAY DOWN" />
            </View>

            <View style={styles.column}>
                <RNText style={styles.heading}>OBSTACLES</RNText>
                <Row icons={[{ kind: 'block', colour: COLOURS.block }, { kind: 'ball', colour: COLOURS.purple }]} text="JUMP OVER" />
                <Row icons={[{ kind: 'bar', colour: COLOURS.overhead }]} text="DUCK UNDER" />
                <Row icons={[{ kind: 'wide', colour: COLOURS.red }]} text="DOUBLE JUMP" />
                <Row icons={[{ kind: 'ball', colour: HEART }]} text="COLLECT FOR HEALTH" />
            </View>
        </View>

        <ArcadeMenu items={[{ label: 'BACK', onPress: onBack }]} />
    </MenuScreen>
);

const styles = StyleSheet.create({
    title: {
        fontFamily: FONT.display,
        fontSize: 26,
        letterSpacing: 5,
        color: NEON.white,
        ...glow(NEON.pink, 12),
    },
    columns: {
        flexDirection: 'row',
        gap: 18,
        marginTop: 10,
        marginBottom: 12,
    },
    column: {
        width: 250,
        padding: 10,
        backgroundColor: NEON.panel,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 255, 0.5)',
        gap: 6,
    },
    heading: {
        fontFamily: FONT.display,
        fontSize: 13,
        letterSpacing: 3,
        color: NEON.cyan,
        marginBottom: 2,
        ...glow(NEON.cyan, 6),
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 24,
    },
    key: {
        width: 78,
        fontFamily: FONT.bold,
        fontSize: 10,
        letterSpacing: 1,
        color: NEON.yellow,
    },
    icons: {
        width: 78,
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 34,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        flex: 1,
        fontFamily: FONT.body,
        fontSize: 10,
        letterSpacing: 1,
        lineHeight: 14,
        color: NEON.white,
    },
});
