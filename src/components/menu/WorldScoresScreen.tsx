import React, { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import type { WorldEntry } from '../../scoreboard/rules';
import type { SendOutcome } from '../../scoreboard/worldBoard';
import { RNText } from '../RNText';
import { ArcadeMenu } from './ArcadeMenu';
import { MenuScreen } from './MenuScreen';
import { FONT, glow, NEON } from './menuStyle';
import { worldText } from './ResultScreens';
import { WorldBoard } from './WorldBoard';

interface Props {
    entries: WorldEntry[];
    /** The player's own place on the board, to light up; -1 for none. */
    highlight: number;
    /** What became of this run's score, if one was just entered. */
    world: SendOutcome | null;
    /** Showing the last board seen, because there's no signal right now. */
    offline: boolean;
    /** 'CONTINUE' straight after entering initials; 'BACK' from a menu. */
    doneLabel: string;
    onDone: () => void;
}

/**
 * The world top 10 as a screen of its own: straight after entering initials (with the new
 * entry lit up, as arcade machines do), or from the title and Game Over menus.
 */
export const WorldScoresScreen = ({ entries, highlight, world, offline, doneLabel, onDone }: Props) => {
    // Enter (or Escape) on a keyboard does the same as the button.
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault();
                onDone();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onDone]);

    const line = worldText(world) || (offline ? 'NO SIGNAL · LAST SCORES SEEN' : '');
    return (
        <MenuScreen>
            {line ? <RNText style={styles.line}>{line}</RNText> : null}
            <WorldBoard entries={entries} highlight={highlight} />
            <ArcadeMenu items={[{ label: doneLabel, onPress: onDone }]} />
        </MenuScreen>
    );
};

const styles = StyleSheet.create({
    line: {
        fontFamily: FONT.display,
        fontSize: 18,
        letterSpacing: 3,
        color: NEON.cyan,
        marginBottom: 10,
        ...glow(NEON.cyan, 10),
    },
});
