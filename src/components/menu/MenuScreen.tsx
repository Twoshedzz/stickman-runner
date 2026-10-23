import React, { PropsWithChildren } from 'react';
import { Image, StyleSheet, View } from 'react-native';

const BACKDROP = require('../../../assets/images/menu-backdrop.jpg');

/**
 * A full screen of its own, for everything that isn't the game itself: title, how to play,
 * and so on. Opaque, so the game doesn't show through - these are separate views, not
 * pop-ups over the game. The backdrop is drawn by scripts/generate-menu-art.js.
 */
export const MenuScreen = ({ children }: PropsWithChildren) => (
    <View style={styles.screen}>
        <Image source={BACKDROP} style={styles.backdrop} resizeMode="cover" />
        <View style={styles.content}>{children}</View>
    </View>
);

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
