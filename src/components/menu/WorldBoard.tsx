import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BOARD_SIZE, WorldEntry } from '../../scoreboard/rules';
import { RNText } from '../RNText';
import { useBlink } from './ArcadeMenu';
import { FONT, glow, NEON } from './menuStyle';

const COLUMN = BOARD_SIZE / 2;

/**
 * The world top 10, arcade style: place, initials, score, and a star for runs that cleared
 * every stage. Two columns of five, so it fits where the best-runs table does.
 * `highlight` picks out the player's own entry: the whole row in cyan, blinking.
 */
export const WorldBoard = ({ entries, highlight = -1 }: { entries: WorldEntry[]; highlight?: number }) => {
    const blinkOn = useBlink(400);
    return (
        <View style={styles.table}>
            <RNText style={styles.heading}>WORLD TOP {BOARD_SIZE}</RNText>
            {entries.length === 0 ? (
                <RNText style={styles.empty}>NO SCORES YET {'—'} BE THE FIRST</RNText>
            ) : (
                <View style={styles.columns}>
                    {[0, 1].map((column) => (
                        <View key={column}>
                            {entries.slice(column * COLUMN, (column + 1) * COLUMN).map((entry, i) => {
                                const place = column * COLUMN + i;
                                const mine = place === highlight;
                                const colour = mine ? NEON.cyan : place === 0 ? NEON.yellow : NEON.white;
                                const own = mine ? [{ color: NEON.cyan }, glow(NEON.cyan, 8)] : null;
                                return (
                                    <View key={place} style={[styles.row, mine && styles.mine, mine && !blinkOn && styles.mineDim]}>
                                        <RNText style={[styles.cell, styles.place, { color: colour }, own]}>{place + 1}.</RNText>
                                        <RNText style={[styles.cell, styles.initials, own]}>{entry.initials}</RNText>
                                        <RNText style={[styles.cell, styles.score, { color: colour }, own]}>{String(entry.score).padStart(5, '0')}</RNText>
                                        <RNText style={[styles.cell, styles.star]}>{entry.completed ? '★' : ''}</RNText>
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    table: {
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 20,
        backgroundColor: NEON.panel,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 255, 0.6)',
    },
    heading: {
        fontFamily: FONT.display,
        fontSize: 16,
        letterSpacing: 4,
        color: NEON.cyan,
        marginBottom: 4,
        ...glow(NEON.cyan, 8),
    },
    empty: {
        fontFamily: FONT.body,
        fontSize: 11,
        letterSpacing: 2,
        color: NEON.dim,
        paddingVertical: 8,
    },
    columns: {
        flexDirection: 'row',
        gap: 28,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    /** The player's own row: framed in cyan, and blinking. */
    mine: {
        borderColor: NEON.cyan,
        backgroundColor: 'rgba(0, 255, 255, 0.12)',
    },
    mineDim: {
        opacity: 0.45,
    },
    cell: {
        fontFamily: FONT.bold,
        fontSize: 13,
        letterSpacing: 2,
        lineHeight: 19,
    },
    place: { width: 34 },
    initials: { width: 52, color: NEON.hotPink },
    score: { width: 70, textAlign: 'right' },
    star: { width: 22, textAlign: 'right', color: NEON.yellow },
});
