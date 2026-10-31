import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ScoreEntry } from '../../game/loop/useScoreTable';
import { BOARD_SIZE } from '../../scoreboard/rules';
import type { SendOutcome } from '../../scoreboard/worldBoard';
import { RNText } from '../RNText';
import { ArcadeMenu, useBlink } from './ArcadeMenu';
import { BestRuns } from './BestRuns';
import { MenuScreen } from './MenuScreen';
import { FONT, glow, NEON } from './menuStyle';

/** Scores shown arcade style, padded with zeros. */
const padded = (n: number, digits = 6) => String(Math.max(0, n)).padStart(digits, '0');

/** A dark, neon-edged window for the text, so it reads clearly over the sun and grid. */
const Panel = ({ children, colour = 'rgba(255, 0, 204, 0.7)' }: { children: React.ReactNode; colour?: string }) => (
    <View style={[styles.panel, { borderColor: colour, boxShadow: `0 0 14px ${colour}` }]}>{children}</View>
);

const ScoreLine = ({ label, value, colour = NEON.yellow }: { label: string; value: number; colour?: string }) => (
    <View style={styles.scoreLine}>
        <RNText style={styles.scoreLabel} numberOfLines={1}>{label}</RNText>
        <RNText style={[styles.scoreValue, { color: colour }]}>{padded(value)}</RNText>
    </View>
);

/** What became of this run's score on the world board, in a few words. */
export const worldText = (world: SendOutcome | null | undefined) => {
    if (!world) return '';
    switch (world.outcome) {
        case 'sending': return 'SENDING TO THE WORLD BOARD…';
        case 'queued': return 'NO SIGNAL · WILL SEND LATER';
        case 'refused': return "COULDN'T SEND TO THE WORLD BOARD";
        case 'sent':
            if (world.rank === null) return '';
            return world.rank < BOARD_SIZE ? `#${world.rank + 1} IN THE WORLD!` : `WORLD #${world.rank + 1}`;
    }
};

const WorldLine = ({ world }: { world?: SendOutcome | null }) => {
    const text = worldText(world);
    return text ? <RNText style={styles.world}>{text}</RNText> : null;
};

interface StageClearProps {
    stageNumber: number;
    score: number;
    nextStageNumber: number;
    nextStageName: string;
    /** 0-100: the next stage's music, which has to be in before it can start. */
    nextMusicPercent: number;
    onContinue: () => void;
}

/** Between stages: what you've done, what's next. */
export const StageClearScreen = ({ stageNumber, score, nextStageNumber, nextStageName, nextMusicPercent, onContinue }: StageClearProps) => {
    const ready = nextMusicPercent >= 100;
    return (
        <MenuScreen>
            <Panel colour="rgba(0, 255, 255, 0.7)">
                <RNText style={styles.kicker}>STAGE {stageNumber}</RNText>
                <RNText style={[styles.title, glow(NEON.cyan, 14)]}>CLEAR!</RNText>
                <ScoreLine label="SCORE" value={score} />
                <RNText style={styles.next}>
                    NEXT: STAGE {nextStageNumber} {'·'} {nextStageName}
                </RNText>
            </Panel>
            <ArcadeMenu
                items={[{
                    label: ready ? 'CONTINUE' : `LOADING MUSIC ${nextMusicPercent}%`,
                    onPress: onContinue,
                    disabled: !ready,
                }]}
            />
        </MenuScreen>
    );
};

interface GameOverProps {
    score: number;
    hiScore: number;
    /** This run set the best score. */
    newHiScore: boolean;
    /** This run's score on the world board, if it was entered. */
    world?: SendOutcome | null;
    onPlayAgain: () => void;
    /** Back to the title, to pick another option (test build). */
    onChangeOption: () => void;
    onHowToPlay: () => void;
    /** Opens the world top 10. Left out when there's no world board to show. */
    onWorldScores?: () => void;
}

export const GameOverScreen = ({ score, hiScore, newHiScore, world, onPlayAgain, onChangeOption, onHowToPlay, onWorldScores }: GameOverProps) => {
    const blinkOn = useBlink(400);
    return (
        <MenuScreen>
            <Panel>
                <RNText style={[styles.title, styles.gameOver]}>GAME OVER</RNText>
                <View style={styles.scores}>
                    <ScoreLine label="SCORE" value={score} colour={NEON.white} />
                    <ScoreLine label="HI-SCORE" value={hiScore} />
                </View>
                <RNText style={[styles.newHi, { opacity: newHiScore && blinkOn ? 1 : 0 }]}>NEW HI-SCORE!</RNText>
                <WorldLine world={world} />
            </Panel>
            <ArcadeMenu
                items={[
                    { label: 'PLAY AGAIN', onPress: onPlayAgain },
                    { label: 'CHANGE OPTION', onPress: onChangeOption },
                    ...(onWorldScores ? [{ label: 'WORLD SCORES', onPress: onWorldScores }] : []),
                    { label: 'HOW TO PLAY', onPress: onHowToPlay },
                ]}
            />
        </MenuScreen>
    );
};

interface FinishedProps {
    score: number;
    scoreTable: ScoreEntry[];
    /** Where this run landed in the table, to highlight it. -1 if it didn't make it. */
    newScoreIndex: number;
    /** This run's score on the world board, if it was entered. */
    world?: SendOutcome | null;
    onPlayAgain: () => void;
    /** Back to the title, to pick another option (test build). */
    onChangeOption: () => void;
}

/** Every stage cleared: the big finish, and the best runs with this one picked out. */
export const FinishedScreen = ({ score, scoreTable, newScoreIndex, world, onPlayAgain, onChangeOption }: FinishedProps) => (
    <MenuScreen>
        <Panel colour="rgba(255, 224, 102, 0.7)">
            <RNText style={[styles.title, styles.finished]}>FINISHED!</RNText>
            {/* The screen is full, so the world board line takes the subtitle's place. */}
            {worldText(world) ? <WorldLine world={world} /> : <RNText style={styles.subtitle}>ALL FOUR STAGES CLEARED</RNText>}
            <ScoreLine label="SCORE" value={score} />
        </Panel>
        <View style={styles.table}>
            <BestRuns entries={scoreTable} highlight={newScoreIndex} />
        </View>
        <ArcadeMenu items={[{ label: 'PLAY AGAIN', onPress: onPlayAgain }, { label: 'CHANGE OPTION', onPress: onChangeOption }]} />
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
    },
    kicker: {
        fontFamily: FONT.bold,
        fontSize: 14,
        letterSpacing: 6,
        color: NEON.cyan,
        ...glow(NEON.cyan, 6),
    },
    title: {
        fontFamily: FONT.display,
        fontSize: 44,
        letterSpacing: 4,
        color: NEON.white,
        marginBottom: 6,
    },
    gameOver: {
        color: NEON.pink,
        ...glow(NEON.pink, 18),
    },
    finished: {
        fontSize: 40,
        color: NEON.yellow,
        ...glow('#ff8a3d', 16),
    },
    subtitle: {
        fontFamily: FONT.bold,
        fontSize: 12,
        letterSpacing: 4,
        color: NEON.hotPink,
        marginBottom: 6,
    },
    scores: {
        gap: 2,
        alignItems: 'center',
    },
    scoreLine: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'baseline',
    },
    scoreLabel: {
        fontFamily: FONT.bold,
        fontSize: 13,
        letterSpacing: 3,
        color: NEON.hotPink,
        width: 120,
        textAlign: 'right',
    },
    scoreValue: {
        fontFamily: FONT.bold,
        fontSize: 18,
        letterSpacing: 3,
    },
    next: {
        fontFamily: FONT.body,
        fontSize: 12,
        letterSpacing: 3,
        color: NEON.white,
        marginTop: 8,
    },
    newHi: {
        fontFamily: FONT.display,
        fontSize: 16,
        letterSpacing: 4,
        color: NEON.cyan,
        marginTop: 6,
        ...glow(NEON.cyan, 10),
    },
    table: {
        marginTop: 8,
        marginBottom: 10,
    },
    world: {
        fontFamily: FONT.bold,
        fontSize: 12,
        letterSpacing: 3,
        color: NEON.cyan,
        marginTop: 4,
        ...glow(NEON.cyan, 8),
    },
});
