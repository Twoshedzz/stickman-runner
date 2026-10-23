import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ScoreEntry } from '../../game/loop/useGameLoop';
import { RNText } from '../RNText';
import { FONT, glow, NEON } from './menuStyle';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
/** "21 OCT", written by hand so it doesn't depend on the device's locale support. */
export const formatDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

const PLACES = ['1ST', '2ND', '3RD', '4TH', '5TH'];

/**
 * The best-runs table, arcade style: place, score, date, and a star for runs that
 * cleared every stage. `highlight` picks out the run just finished.
 */
export const BestRuns = ({ entries, highlight = -1 }: { entries: ScoreEntry[]; highlight?: number }) => (
    <View style={styles.table}>
        <RNText style={styles.heading}>BEST RUNS</RNText>
        {entries.length === 0 ? (
            <RNText style={styles.empty}>NO SCORES YET {'—'} BE THE FIRST</RNText>
        ) : (
            entries.map((entry, i) => {
                const isNew = i === highlight;
                const colour = isNew ? NEON.cyan : i === 0 ? NEON.yellow : NEON.white;
                return (
                    <View key={`${entry.date}-${i}`} style={styles.row}>
                        <RNText style={[styles.cell, styles.place, { color: colour }]}>{PLACES[i] ?? `${i + 1}TH`}</RNText>
                        <RNText style={[styles.cell, styles.score, { color: colour }]}>{String(entry.score).padStart(5, '0')}</RNText>
                        <RNText style={[styles.cell, styles.date, { color: colour }]}>{formatDate(entry.date)}</RNText>
                        <RNText style={[styles.cell, styles.star]}>{entry.completed ? '★' : ''}</RNText>
                    </View>
                );
            })
        )}
    </View>
);

const styles = StyleSheet.create({
    table: {
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 20,
        backgroundColor: NEON.panel,
        borderWidth: 1,
        borderColor: 'rgba(255, 0, 204, 0.6)',
    },
    heading: {
        fontFamily: FONT.display,
        fontSize: 16,
        letterSpacing: 4,
        color: NEON.pink,
        marginBottom: 4,
        ...glow(NEON.pink, 8),
    },
    empty: {
        fontFamily: FONT.body,
        fontSize: 11,
        letterSpacing: 2,
        color: NEON.dim,
        paddingVertical: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cell: {
        fontFamily: FONT.bold,
        fontSize: 13,
        letterSpacing: 2,
        lineHeight: 19,
    },
    place: { width: 44 },
    score: { width: 74, textAlign: 'right' },
    date: { width: 74, textAlign: 'right' },
    star: { width: 24, textAlign: 'right', color: NEON.yellow },
});
