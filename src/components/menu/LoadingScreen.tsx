import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { RNText } from '../RNText';
import { FONT, glow, NEON } from './menuStyle';

const LOGO = require('../../../assets/images/logo.png');
const BACKDROP = require('../../../assets/images/menu-backdrop.jpg');
const LOGO_ASPECT = 1500 / 470;

/** How many coloured bands fill the border at once, and how often they change. */
const BANDS = 26;
const FLICKER_MS = 80;
/** The ZX Spectrum's loading colours: red and cyan for the lead-in, blue and yellow for data. */
const PAIRS = [['#d40000', '#00d4d4'], ['#0000d4', '#d4d400']];

function randomBands() {
    const pair = PAIRS[Math.random() < 0.25 ? 0 : 1];
    return Array.from({ length: BANDS }, (_, i) => ({
        colour: pair[i % 2],
        weight: 0.4 + Math.random() * 1.6,
    }));
}

/**
 * The loading screen, as a nod to the ZX Spectrum: while the music downloads, coloured stripes
 * flicker round the border just like a tape loading, with the progress shown in the middle.
 */
export const LoadingScreen = ({ label, percent }: { label: string; percent?: number }) => {
    const [bands, setBands] = useState(randomBands);
    useEffect(() => {
        const id = setInterval(() => setBands(randomBands()), FLICKER_MS);
        return () => clearInterval(id);
    }, []);

    return (
        <View style={styles.screen}>
            {/* The border: bands stacked down the whole screen, mostly hidden by the "screen" panel. */}
            <View style={StyleSheet.absoluteFill}>
                {bands.map((band, i) => (
                    <View key={i} style={{ flex: band.weight, backgroundColor: band.colour }} />
                ))}
            </View>

            <View style={styles.inner}>
                <Image source={BACKDROP} style={styles.backdrop} resizeMode="cover" />
                <View style={styles.content}>
                    <Image source={LOGO} style={styles.logo} resizeMode="contain" />
                    <RNText style={styles.label}>{label}</RNText>
                    {percent !== undefined && (
                        <View style={styles.track}>
                            <View style={[styles.fill, { width: `${percent}%` }]} />
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 40,
        backgroundColor: '#000',
    },
    inner: {
        position: 'absolute',
        top: 22,
        bottom: 22,
        left: 34,
        right: 34,
        overflow: 'hidden',
        backgroundColor: '#04020c',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0.55,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 320,
        height: 320 / LOGO_ASPECT,
        marginBottom: 18,
    },
    label: {
        fontFamily: FONT.display,
        fontSize: 18,
        letterSpacing: 4,
        color: NEON.cyan,
        ...glow(NEON.cyan, 8),
    },
    track: {
        width: 260,
        height: 10,
        marginTop: 12,
        borderWidth: 1,
        borderColor: NEON.cyan,
        padding: 1,
    },
    fill: {
        height: '100%',
        backgroundColor: NEON.pink,
    },
});
