import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { STAGES } from '../../game/stages';
import { RNText } from '../RNText';
import { ArcadeMenu, useBlink } from './ArcadeMenu';
import { MenuScreen } from './MenuScreen';
import { FONT, glow, NEON } from './menuStyle';

/** Obstacles and pickups are shown in stage 1's colours, which is where the player first meets them. */
const COLOURS = STAGES[0].theme.obstacleColors!;
const HEART = '#FF1493';
const PICKUP = STAGES[0].theme.pickupColors;

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

/** One pickup, as it looks in the game: a small pale diamond with a glow. */
const Diamond = ({ lift = 0 }: { lift?: number }) => (
    <View style={[styles.diamond, { marginBottom: lift }]} />
);

/** Pickups laid out the way they come: in a line, over a jump, or up high. */
const Pickups = ({ lifts }: { lifts: number[] }) => (
    <View style={styles.pickups}>{lifts.map((lift, i) => <Diamond key={i} lift={lift} />)}</View>
);

const Row = ({ keyText, text, icons, pickups }: { keyText?: string; text: string; icons?: Shape[]; pickups?: number[] }) => (
    <View style={styles.row}>
        {icons ? (
            <View style={styles.icons}>{icons.map((s, i) => <Icon key={i} {...s} />)}</View>
        ) : pickups ? (
            <Pickups lifts={pickups} />
        ) : (
            <RNText style={styles.key}>{keyText}</RNText>
        )}
        <RNText style={styles.text}>{text}</RNText>
    </View>
);

/** The controls and the obstacles. */
const PageOne = ({ keyboard }: { keyboard: boolean }) => (
    <>
        <View style={styles.column}>
            <RNText style={styles.heading}>CONTROLS</RNText>
            <Row keyText={keyboard ? 'SPACE / ↑' : 'TAP'} text="JUMP" />
            <Row keyText={keyboard ? 'AGAIN' : 'TAP AGAIN'} text="DOUBLE JUMP IN THE AIR" />
            <Row keyText={'⚡'} text="EACH DOUBLE JUMP USES HALF THE ENERGY BAR" />
            <Row keyText={keyboard ? '↓ / S' : 'SWIPE ↓'} text="DUCK · HOLD TO STAY DOWN" />
            {!keyboard && <Row keyText="SWIPE ↑" text="FROM A DUCK: JUMP STRAIGHT UP" />}
        </View>

        <View style={styles.column}>
            <RNText style={styles.heading}>OBSTACLES</RNText>
            <Row icons={[{ kind: 'block', colour: COLOURS.block }, { kind: 'ball', colour: COLOURS.purple }]} text="JUMP OVER" />
            <Row icons={[{ kind: 'bar', colour: COLOURS.overhead }]} text="DUCK UNDER" />
            <Row icons={[{ kind: 'wide', colour: COLOURS.red }]} text="DOUBLE JUMP" />
            <Row icons={[{ kind: 'ball', colour: HEART }]} text="COLLECT FOR HEALTH" />
        </View>
    </>
);

/** The pickups and the streak multiplier. */
const PageTwo = () => (
    <>
        <View style={styles.column}>
            <RNText style={styles.heading}>PICKUPS</RNText>
            <Row pickups={[0, 0, 0]} text="ON THE GROUND: RUN THROUGH FOR POINTS" />
            <Row pickups={[0, 8, 0]} text="OVER A BLOCK: A GOOD JUMP GETS THEM ALL" />
            <Row keyText="STAGE 2+" text="IN A GAP: TAKE AN EXTRA JUMP" />
            <Row keyText="STAGE 3+" text="UP HIGH: DOUBLE JUMP · USES ENERGY" />
        </View>

        <View style={styles.column}>
            <RNText style={styles.heading}>STREAK</RNText>
            <RNText style={styles.note}>OBSTACLES CLEARED IN A ROW WITHOUT A HIT</RNText>
            <Row keyText="10" text="×2 ON EVERY POINT" />
            <Row keyText="25" text="×3" />
            <Row keyText="50" text="×4" />
            <Row keyText="HIT" text="STREAK BACK TO 0" />
        </View>
    </>
);

const PAGES = 2;

/** An arrow either side of the panels, to turn the page. Faint when there's no page that way. */
const PageArrow = ({ symbol, enabled, onPress }: { symbol: string; enabled: boolean; onPress: () => void }) => {
    const blinkOn = useBlink();
    return (
        <Pressable onPress={enabled ? onPress : undefined} style={styles.arrowButton} hitSlop={12}>
            <RNText style={[styles.arrow, { opacity: !enabled ? 0.15 : blinkOn ? 1 : 0.55 }]}>{symbol}</RNText>
        </Pressable>
    );
};

/**
 * How to play, as its own screen over two pages: controls and obstacles, then pickups and
 * the streak. Arrows either side, a swipe on a phone, or ← → on a keyboard turn the page.
 */
export const HowToPlayScreen = ({ keyboard, onBack }: { keyboard: boolean; onBack: () => void }) => {
    const [page, setPage] = useState(0);
    const back = () => setPage((p) => Math.max(0, p - 1));
    const next = () => setPage((p) => Math.min(PAGES - 1, p + 1));

    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const onKey = (e: KeyboardEvent) => {
            if (e.code === 'ArrowLeft') setPage((p) => Math.max(0, p - 1));
            if (e.code === 'ArrowRight') setPage((p) => Math.min(PAGES - 1, p + 1));
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        // Swiping left brings in the next page, like turning a page.
        <MenuScreen onSwipe={(direction) => (direction === 'left' ? next() : back())}>
            <RNText style={styles.title}>HOW TO PLAY</RNText>

            <View style={styles.pageRow}>
                <PageArrow symbol="◀" enabled={page > 0} onPress={back} />
                <View style={styles.columns}>
                    {page === 0 ? <PageOne keyboard={keyboard} /> : <PageTwo />}
                </View>
                <PageArrow symbol="▶" enabled={page < PAGES - 1} onPress={next} />
            </View>

            <View style={styles.dots}>
                {Array.from({ length: PAGES }, (_, i) => (
                    <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
                ))}
            </View>

            <ArcadeMenu items={[{ label: 'BACK', onPress: onBack }]} />
        </MenuScreen>
    );
};

const styles = StyleSheet.create({
    title: {
        fontFamily: FONT.display,
        fontSize: 26,
        letterSpacing: 5,
        color: NEON.white,
        ...glow(NEON.pink, 12),
    },
    pageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    columns: {
        flexDirection: 'row',
        gap: 18,
    },
    arrowButton: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'stretch',
    },
    // Cyan like the panel outlines, so they don't look like the pink arrows on the menu.
    arrow: {
        color: NEON.cyan,
        fontSize: 30,
        ...glow(NEON.cyan, 10),
    },
    dots: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
        marginBottom: 8,
    },
    dot: {
        width: 6,
        height: 6,
        borderWidth: 1,
        borderColor: NEON.cyan,
    },
    dotOn: {
        backgroundColor: NEON.cyan,
        boxShadow: `0 0 6px ${NEON.cyan}`,
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
    note: {
        fontFamily: FONT.body,
        fontSize: 9,
        letterSpacing: 1,
        color: NEON.dim,
        marginTop: -4,
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
    pickups: {
        width: 78,
        height: 24,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 9,
        paddingLeft: 6,
        paddingBottom: 6,
    },
    diamond: {
        width: 6,
        height: 6,
        transform: [{ rotate: '45deg' }],
        backgroundColor: PICKUP.core,
        boxShadow: `0 0 7px 1px ${PICKUP.glow}`,
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
