import React, { PropsWithChildren, useRef } from 'react';
import { GestureResponderEvent, Image, StyleSheet, View } from 'react-native';
import { MenuBackdropFx } from './MenuBackdropFx';

const BACKDROP = require('../../../assets/images/menu-backdrop.jpg');

/** How far a finger has to travel sideways to count as a swipe. */
const SWIPE_PX = 40;

interface MenuScreenProps {
    /** A sideways swipe anywhere on the screen. 'left' means the finger moved to the left. */
    onSwipe?: (direction: 'left' | 'right') => void;
}

/**
 * A full screen of its own, for everything that isn't the game itself: title, how to play,
 * and so on. Opaque, so the game doesn't show through - these are separate views, not
 * pop-ups over the game. The backdrop is drawn by scripts/generate-menu-art.js, with
 * twinkling stars and a grid pulse laid over it by MenuBackdropFx.
 */
export const MenuScreen = ({ children, onSwipe }: PropsWithChildren<MenuScreenProps>) => {
    const start = useRef<{ x: number; y: number } | null>(null);
    const onTouchStart = (e: GestureResponderEvent) => {
        const t = e.nativeEvent.touches[0];
        start.current = t ? { x: t.pageX, y: t.pageY } : null;
    };
    const onTouchEnd = (e: GestureResponderEvent) => {
        const from = start.current;
        const t = e.nativeEvent.changedTouches[0];
        start.current = null;
        if (!from || !t) return;
        const dx = t.pageX - from.x;
        const dy = t.pageY - from.y;
        // Clearly sideways, so a tap or a sloppy scroll doesn't turn the page.
        if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
            onSwipe?.(dx < 0 ? 'left' : 'right');
        }
    };

    return (
        <View
            style={styles.screen}
            onTouchStart={onSwipe ? onTouchStart : undefined}
            onTouchEnd={onSwipe ? onTouchEnd : undefined}
        >
            <Image source={BACKDROP} style={styles.backdrop} resizeMode="cover" />
            <MenuBackdropFx />
            <View style={styles.content}>{children}</View>
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#04020c',
        zIndex: 30,
        overflow: 'hidden',
    },
    // Width and height have to be explicit: on web an image without them takes the picture's
    // own size (1920x1080) and only its top-left corner shows.
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
});
