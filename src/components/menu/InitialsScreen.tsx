import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GestureResponderEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import { INITIALS_LENGTH, isBlocked, LETTERS } from '../../scoreboard/rules';
import { RNText } from '../RNText';
import { ArcadeMenu, useBlink } from './ArcadeMenu';
import { MenuScreen } from './MenuScreen';
import { FONT, glow, NEON } from './menuStyle';

/** How far a finger moves up or down on a letter to change it. */
const SWIPE_PX = 20;

interface Props {
    score: number;
    /** Start from the initials used last time, so it's usually one tap. */
    initials: string;
    keyboard: boolean;
    onSubmit: (initials: string) => void;
    onSkip: () => void;
}

const startingLetters = (initials: string) =>
    [...Array(INITIALS_LENGTH)].map((_, i) => (LETTERS.includes(initials[i] ?? '') ? initials[i] : 'A'));

/**
 * The run made the world top 10: three letters, arcade style. ▲ and ▼ (or a swipe up or
 * down on the letter) step through the alphabet; on a keyboard, just type.
 */
export const InitialsScreen = ({ score, initials, keyboard, onSubmit, onSkip }: Props) => {
    const [letters, setLetters] = useState(() => startingLetters(initials));
    const [cursor, setCursor] = useState(0);
    const [refused, setRefused] = useState(false);
    const blinkOn = useBlink(350);

    const step = useCallback((slot: number, by: number) => {
        setCursor(slot);
        setRefused(false);
        setLetters((current) => current.map((letter, i) =>
            i === slot ? LETTERS[(LETTERS.indexOf(letter) + by + LETTERS.length) % LETTERS.length] : letter));
    }, []);

    const submit = useCallback(() => {
        const chosen = letters.join('');
        if (isBlocked(chosen)) setRefused(true);
        else onSubmit(chosen);
    }, [letters, onSubmit]);

    // A keyboard: type the letters, arrows to adjust, Enter to finish.
    const submitRef = useRef(submit);
    submitRef.current = submit;
    const cursorRef = useRef(cursor);
    cursorRef.current = cursor;
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const onKey = (e: KeyboardEvent) => {
            const slot = cursorRef.current;
            if (/^[a-zA-Z]$/.test(e.key)) {
                const letter = e.key.toUpperCase();
                setRefused(false);
                setLetters((current) => current.map((l, i) => (i === slot ? letter : l)));
                setCursor(Math.min(INITIALS_LENGTH - 1, slot + 1));
            } else if (e.key === 'ArrowUp') step(slot, 1);
            else if (e.key === 'ArrowDown') step(slot, -1);
            else if (e.key === 'ArrowLeft' || e.key === 'Backspace') setCursor(Math.max(0, slot - 1));
            else if (e.key === 'ArrowRight') setCursor(Math.min(INITIALS_LENGTH - 1, slot + 1));
            else if (e.key === 'Enter') submitRef.current();
            else return;
            e.preventDefault();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [step]);

    return (
        <MenuScreen>
            {/* A dark window, so the letters read clearly over the sun and grid. */}
            <View style={styles.panel}>
                <RNText style={styles.kicker}>YOU&apos;RE IN THE WORLD TOP 10!</RNText>
                <RNText style={styles.score}>{String(score).padStart(6, '0')}</RNText>
                <RNText style={styles.prompt}>ENTER YOUR INITIALS</RNText>

                <View style={styles.slots}>
                    {letters.map((letter, i) => (
                        <LetterSlot
                            key={i}
                            letter={letter}
                            selected={i === cursor}
                            blinkOn={blinkOn}
                            onUp={() => step(i, 1)}
                            onDown={() => step(i, -1)}
                            onSelect={() => setCursor(i)}
                        />
                    ))}
                </View>

                <RNText style={[styles.hint, refused && styles.refused]}>
                    {refused ? 'PICK DIFFERENT LETTERS' : keyboard ? 'TYPE · ↑ ↓ · ENTER' : 'TAP ▲ ▼ OR SWIPE A LETTER'}
                </RNText>
            </View>

            <ArcadeMenu
                items={[
                    { label: 'ENTER', onPress: submit },
                    { label: 'SKIP', onPress: onSkip },
                ]}
            />
        </MenuScreen>
    );
};

interface SlotProps {
    letter: string;
    selected: boolean;
    blinkOn: boolean;
    onUp: () => void;
    onDown: () => void;
    onSelect: () => void;
}

/** One letter, with ▲ and ▼ to change it. A swipe up or down on the letter does the same. */
const LetterSlot = ({ letter, selected, blinkOn, onUp, onDown, onSelect }: SlotProps) => {
    const startY = useRef<number | null>(null);
    const onTouchStart = (e: GestureResponderEvent) => {
        startY.current = e.nativeEvent.touches[0]?.pageY ?? null;
    };
    const onTouchEnd = (e: GestureResponderEvent) => {
        const from = startY.current;
        const to = e.nativeEvent.changedTouches[0]?.pageY;
        startY.current = null;
        if (from === null || to === undefined) return;
        if (to - from < -SWIPE_PX) onUp();
        else if (to - from > SWIPE_PX) onDown();
    };

    return (
        <View style={styles.slot}>
            <Pressable onPress={onUp} hitSlop={8} style={styles.stepButton}>
                <RNText style={[styles.step, selected && styles.stepSelected]}>▲</RNText>
            </Pressable>
            <Pressable
                onPress={onSelect}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                style={[styles.frame, selected && styles.frameSelected]}
            >
                <RNText style={[styles.letter, selected && !blinkOn && styles.letterDim]}>{letter}</RNText>
            </Pressable>
            <Pressable onPress={onDown} hitSlop={8} style={styles.stepButton}>
                <RNText style={[styles.step, selected && styles.stepSelected]}>▼</RNText>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    panel: {
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingTop: 8,
        marginBottom: 6,
        backgroundColor: NEON.panel,
        borderWidth: 1,
        borderColor: 'rgba(255, 224, 102, 0.7)',
        boxShadow: '0 0 14px rgba(255, 224, 102, 0.7)',
    },
    kicker: {
        fontFamily: FONT.display,
        fontSize: 16,
        letterSpacing: 3,
        color: NEON.yellow,
        ...glow('#ff8a3d', 10),
    },
    score: {
        fontFamily: FONT.bold,
        fontSize: 18,
        letterSpacing: 4,
        color: NEON.white,
        marginTop: 2,
    },
    prompt: {
        fontFamily: FONT.bold,
        fontSize: 11,
        letterSpacing: 3,
        color: NEON.hotPink,
        marginTop: 4,
    },
    slots: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 4,
    },
    slot: {
        alignItems: 'center',
    },
    stepButton: {
        paddingHorizontal: 14,
        paddingVertical: 1,
    },
    step: {
        fontSize: 14,
        color: NEON.cyan,
        opacity: 0.45,
    },
    stepSelected: {
        opacity: 1,
        ...glow(NEON.cyan, 8),
    },
    frame: {
        width: 44,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(0, 255, 255, 0.25)',
        backgroundColor: NEON.panel,
    },
    frameSelected: {
        borderColor: NEON.cyan,
        boxShadow: '0 0 12px rgba(0, 255, 255, 0.6)',
    },
    letter: {
        fontFamily: FONT.display,
        fontSize: 30,
        color: NEON.white,
        ...glow(NEON.pink, 10),
    },
    letterDim: {
        opacity: 0.35,
    },
    hint: {
        fontFamily: FONT.body,
        fontSize: 9,
        letterSpacing: 2,
        color: NEON.dim,
        marginTop: 4,
        marginBottom: 6,
    },
    refused: {
        color: NEON.pink,
    },
});
