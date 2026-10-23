import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, { css, useReducedMotion } from 'react-native-reanimated';

/**
 * The backdrop picture's size, and where its horizon and sun sit (as drawn by
 * scripts/generate-menu-art.js), so the effects line up with it.
 */
const ART_W = 1920;
const ART_H = 1080;
const HORIZON = ART_H * 0.6;
const SUN = { x: ART_W / 2, y: HORIZON - ART_H * 0.13, r: ART_H * 0.25 };

const STAR_COUNT = 18;
/** How many of the stars, the biggest, also get a cross-shaped sparkle. */
const SPARKLES = 4;
/** One pulse runs from the front of the grid to the horizon, then the grid rests. */
const PULSE_CYCLE_S = 5;
const PULSE_STEP_S = 0.12;
const RUNGS = 12;

/** Fixed star positions in the sky, kept clear of the sun. Seeded, so they're the same every time. */
const STARS = (() => {
    let seed = 11;
    const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const stars = [];
    while (stars.length < STAR_COUNT) {
        const x = rand() * ART_W;
        const y = 20 + rand() * HORIZON * 0.7;
        if (Math.hypot(x - SUN.x, y - SUN.y) < SUN.r * 1.3) continue;
        stars.push({ x, y, size: 1.5 + rand() * 2, duration: 3 + rand() * 4, delay: rand() * 6 });
    }
    return stars.sort((a, b) => b.size - a.size);
})();

/** Mostly dim, with a quick bright flash part way through. */
const twinkle = css.keyframes({
    '0%': { opacity: 0.15, transform: [{ scale: 0.7 }] },
    '45%': { opacity: 0.15, transform: [{ scale: 0.7 }] },
    '55%': { opacity: 1, transform: [{ scale: 1.3 }] },
    '70%': { opacity: 0.15, transform: [{ scale: 0.7 }] },
    '100%': { opacity: 0.15, transform: [{ scale: 0.7 }] },
});

/** A rung lights up as the pulse passes it, and stays dark for the rest of the cycle. */
const rungFlash = css.keyframes({
    '0%': { opacity: 0 },
    '3%': { opacity: 1 },
    '12%': { opacity: 0 },
    '100%': { opacity: 0 },
});

/**
 * Subtle movement over the menu backdrop: stars twinkling in the sky, and a pulse of light
 * running back along the grid rungs, from the front to the horizon.
 *
 * Everything here is a CSS-style animation of opacity and scale only, so it runs on the UI
 * thread on phones (and as plain CSS animations on the web) with no JavaScript per frame and
 * no re-renders. Turned off when the phone asks for reduced motion.
 */
export const MenuBackdropFx = () => {
    const reduceMotion = useReducedMotion();
    const [size, setSize] = useState<{ w: number; h: number } | null>(null);
    const onLayout = (e: LayoutChangeEvent) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (!size || size.w !== w || size.h !== h) setSize({ w, h });
    };

    // The backdrop is shown with resizeMode="cover": scaled to fill, centred, edges cropped.
    // This box sits exactly where the picture is, so art positions can be scaled straight in.
    const box = useMemo(() => {
        if (!size) return null;
        const s = Math.max(size.w / ART_W, size.h / ART_H);
        return { s, left: (size.w - ART_W * s) / 2, top: (size.h - ART_H * s) / 2 };
    }, [size]);

    if (reduceMotion) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
            {box && (
                <View
                    style={{
                        position: 'absolute',
                        left: box.left,
                        top: box.top,
                        width: ART_W * box.s,
                        height: ART_H * box.s,
                    }}
                >
                    {STARS.map((star, i) => (
                        <Animated.View
                            key={i}
                            style={[
                                styles.star,
                                {
                                    left: star.x * box.s - 6,
                                    top: star.y * box.s - 6,
                                    animationName: twinkle,
                                    animationDuration: `${star.duration}s`,
                                    animationDelay: `${star.delay}s`,
                                },
                            ]}
                        >
                            {i < SPARKLES && (
                                <>
                                    <View style={styles.sparkleH} />
                                    <View style={styles.sparkleV} />
                                </>
                            )}
                            <View style={[styles.starDot, { width: star.size, height: star.size, borderRadius: star.size }]} />
                        </Animated.View>
                    ))}

                    {Array.from({ length: RUNGS }, (_, k) => {
                        // k = 0 is the front rung; the pulse reaches each one a step later.
                        const i = RUNGS - k;
                        const y = HORIZON + (ART_H - HORIZON) * Math.pow(i / RUNGS, 2.2);
                        const depth = i / RUNGS; // 1 at the front, near 0 at the horizon
                        return (
                            <Animated.View
                                key={i}
                                style={[
                                    styles.rung,
                                    {
                                        top: y * box.s - 1,
                                        height: Math.max(1, 3 * box.s * depth + 0.5),
                                        animationName: rungFlash,
                                        animationDuration: `${PULSE_CYCLE_S}s`,
                                        animationDelay: `${1 + k * PULSE_STEP_S}s`,
                                    },
                                ]}
                            >
                                <View style={[styles.rungLine, { opacity: 0.25 + 0.35 * depth }]} />
                            </Animated.View>
                        );
                    })}
                </View>
            )}
        </View>
    );
};

const styles = css.create({
    // A fixed 12x12 cell centred on the star, so the sparkle and the dot share a centre to scale from.
    star: {
        position: 'absolute',
        width: 12,
        height: 12,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.15,
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-in-out',
    },
    starDot: {
        backgroundColor: '#ffffff',
        boxShadow: '0 0 4px rgba(255, 255, 255, 0.9)',
    },
    sparkleH: {
        position: 'absolute',
        width: 12,
        height: 1,
        backgroundColor: 'rgba(255, 220, 250, 0.7)',
    },
    sparkleV: {
        position: 'absolute',
        width: 1,
        height: 12,
        backgroundColor: 'rgba(255, 220, 250, 0.7)',
    },
    rung: {
        position: 'absolute',
        left: 0,
        right: 0,
        opacity: 0,
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-out',
    },
    rungLine: {
        flex: 1,
        backgroundColor: '#ffd6f5',
        boxShadow: '0 0 8px 2px rgba(255, 0, 204, 0.8)',
    },
});
