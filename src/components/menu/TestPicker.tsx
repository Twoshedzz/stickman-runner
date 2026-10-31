import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { TestChoice } from '../../game/loop/useTestChoice';
import { PACE_OPTIONS, paceOption, PaceOptionId } from '../../game/pace';
import { STAGES } from '../../game/stages';
import { RNText } from '../RNText';
import { FONT, glow, NEON } from './menuStyle';

interface Props {
    choice: TestChoice;
    onPickOption: (option: PaceOptionId) => void;
    onPickStage: (stageId: string) => void;
}

/** A row of square neon buttons, the picked one lit. */
const Row = ({ label, items }: { label: string; items: { key: string; text: string; on: boolean; onPress: () => void }[] }) => (
    <View style={styles.row}>
        <RNText style={styles.rowLabel}>{label}</RNText>
        {items.map((item) => (
            <Pressable key={item.key} onPress={item.onPress} hitSlop={4} style={[styles.button, item.on && styles.buttonOn]}>
                <RNText style={[styles.buttonText, item.on && styles.buttonTextOn]}>{item.text}</RNText>
            </Pressable>
        ))}
    </View>
);

/** The pace test build's choices on the title screen: which option, and which stage to start on. */
export const TestPicker = ({ choice, onPickOption, onPickStage }: Props) => {
    const stageIndex = Math.max(0, STAGES.findIndex((s) => s.id === choice.stageId));
    const [from, to] = paceOption(choice.option).stages[stageIndex];
    const pace = from === to ? `${from.toFixed(1)}×` : `${from.toFixed(1)}× → ${to.toFixed(1)}×`;
    return (
        <View style={styles.picker}>
            <View style={styles.rows}>
                <Row
                    label="OPTION"
                    items={PACE_OPTIONS.map((o) => ({
                        key: o.id, text: o.id, on: o.id === choice.option, onPress: () => onPickOption(o.id),
                    }))}
                />
                <Row
                    label="STAGE"
                    items={STAGES.map((s, i) => ({
                        key: s.id, text: String(i + 1), on: s.id === choice.stageId, onPress: () => onPickStage(s.id),
                    }))}
                />
            </View>
            <RNText style={styles.caption}>
                TEST BUILD {'·'} {paceOption(choice.option).name} {'·'} STAGE {stageIndex + 1} AT {pace} {'·'} SCORES NOT SENT
            </RNText>
        </View>
    );
};

const styles = StyleSheet.create({
    picker: {
        alignItems: 'center',
        marginBottom: 4,
    },
    rows: {
        flexDirection: 'row',
        gap: 22,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    rowLabel: {
        fontFamily: FONT.bold,
        fontSize: 10,
        letterSpacing: 2,
        color: NEON.pink,
        marginRight: 3,
        ...glow(NEON.pink, 6),
    },
    button: {
        width: 36,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(0, 255, 255, 0.45)',
        backgroundColor: 'rgba(4, 2, 12, 0.6)',
    },
    buttonOn: {
        borderColor: NEON.cyan,
        backgroundColor: 'rgba(0, 255, 255, 0.2)',
        boxShadow: '0 0 10px rgba(0, 255, 255, 0.6)',
    },
    buttonText: {
        fontFamily: FONT.display,
        fontSize: 16,
        color: NEON.cyan,
    },
    buttonTextOn: {
        color: NEON.white,
        ...glow(NEON.pink, 8),
    },
    caption: {
        marginTop: 3,
        fontFamily: FONT.body,
        fontSize: 9,
        letterSpacing: 1,
        color: NEON.yellow,
    },
});
