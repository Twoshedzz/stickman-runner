import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { RNText } from '../RNText';
import { FONT, glow, NEON } from './menuStyle';

export interface MenuItem {
    label: string;
    onPress?: () => void;
    /** Shown dimmed and does nothing, e.g. while music is still loading. */
    disabled?: boolean;
}

/** True and false in turn, for arcade-style blinking. */
export const useBlink = (ms = 450) => {
    const [on, setOn] = useState(true);
    useEffect(() => {
        const id = setInterval(() => setOn((v) => !v), ms);
        return () => clearInterval(id);
    }, [ms]);
    return on;
};

/**
 * An arcade menu: square-cornered neon frame around the selected item, with blinking
 * arrows either side. The first item starts selected; pointing at another selects it.
 * Any item can be tapped directly.
 */
export const ArcadeMenu = ({ items }: { items: MenuItem[] }) => {
    const [selected, setSelected] = useState(0);
    const blinkOn = useBlink();

    return (
        <View style={styles.menu}>
            {items.map((item, i) => {
                const isSelected = i === selected;
                return (
                    <Pressable
                        key={item.label}
                        onPress={item.disabled ? undefined : item.onPress}
                        onHoverIn={() => setSelected(i)}
                        onPressIn={() => setSelected(i)}
                        style={styles.row}
                    >
                        <RNText style={[styles.arrow, { opacity: isSelected && blinkOn ? 1 : 0 }]}>{'▶'}</RNText>
                        <View style={[styles.frame, isSelected && styles.frameSelected]}>
                            <RNText
                                style={[
                                    styles.label,
                                    isSelected ? styles.labelSelected : styles.labelIdle,
                                    item.disabled && styles.labelDisabled,
                                ]}
                            >
                                {item.label}
                            </RNText>
                        </View>
                        <RNText style={[styles.arrow, { opacity: isSelected && blinkOn ? 1 : 0 }]}>{'◀'}</RNText>
                    </Pressable>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    menu: {
        alignItems: 'center',
        gap: 6,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    arrow: {
        color: NEON.pink,
        fontSize: 14,
        ...glow(NEON.pink, 8),
    },
    frame: {
        minWidth: 210,
        paddingVertical: 6,
        paddingHorizontal: 18,
        borderWidth: 2,
        borderColor: 'transparent',
        alignItems: 'center',
    },
    frameSelected: {
        borderColor: NEON.cyan,
        backgroundColor: 'rgba(0, 255, 255, 0.08)',
        boxShadow: '0 0 12px rgba(0, 255, 255, 0.6), inset 0 0 10px rgba(0, 255, 255, 0.25)',
    },
    label: {
        fontFamily: FONT.display,
        fontSize: 18,
        letterSpacing: 3,
    },
    labelSelected: {
        color: NEON.white,
        ...glow(NEON.pink, 10),
    },
    labelIdle: {
        color: NEON.cyan,
    },
    labelDisabled: {
        opacity: 0.5,
    },
});
