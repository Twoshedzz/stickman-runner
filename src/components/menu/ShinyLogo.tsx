import React from 'react';
import { Image, View } from 'react-native';
import Animated, { css, type CSSKeyframesRule, useReducedMotion } from 'react-native-reanimated';

const LOGO = require('../../../assets/images/logo.png');
/** The logo image is 1500x470 (drawn by scripts/generate-menu-art.js). */
export const LOGO_ASPECT = 1500 / 470;

/** One sweep takes the first part of each cycle; the logo rests for the rest. */
const CYCLE_S = 4;
const SWEEP_SHARE = 0.3;
const START_DELAY_S = 0.6;
const LEAN = '-20deg';
const UNLEAN = '20deg';
const TAN_LEAN = Math.tan((20 * Math.PI) / 180);

/**
 * The keyframes for a band sliding from one x to another, made once per size and reused. On the
 * web every css.keyframes() call adds a rule to the page's style sheet that's never taken out,
 * and the logo remounts each time attract mode comes back round to it.
 */
const bandKeyframes = new Map<string, { slide: CSSKeyframesRule; counter: CSSKeyframesRule }>();
const keyframesFor = (from: number, to: number) => {
    const key = `${from},${to}`;
    let frames = bandKeyframes.get(key);
    if (!frames) {
        const end = `${SWEEP_SHARE * 100}%`;
        frames = {
            slide: css.keyframes({
                '0%': { transform: [{ translateX: from }, { skewX: LEAN }] },
                [end]: { transform: [{ translateX: to }, { skewX: LEAN }] },
                '100%': { transform: [{ translateX: to }, { skewX: LEAN }] },
            }),
            counter: css.keyframes({
                '0%': { transform: [{ skewX: UNLEAN }, { translateX: -from }] },
                [end]: { transform: [{ skewX: UNLEAN }, { translateX: -to }] },
                '100%': { transform: [{ skewX: UNLEAN }, { translateX: -to }] },
            }),
        };
        bandKeyframes.set(key, frames);
    }
    return frames;
};

/**
 * The STICKMAN RUNNER logo, with a band of light sweeping across it now and then.
 *
 * The light is a white copy of the logo seen through a narrow, leaning window. The window
 * slides across while the copy inside slides back by the same amount, so the copy stays put
 * over the logo and only the lettering lights up, never the empty space round it. Two bands
 * (a wide faint one and a narrow bright one) give the light a soft edge. Only transforms
 * animate, on the UI thread, so it costs next to nothing.
 */
export const ShinyLogo = ({ width }: { width: number }) => {
    const height = width / LOGO_ASPECT;
    const reduceMotion = useReducedMotion();

    return (
        <View style={{ width, height }}>
            <Image source={LOGO} style={{ width, height }} resizeMode="contain" />
            {!reduceMotion && (
                <>
                    <Band logoW={width} logoH={height} bandW={width * 0.14} strength={0.3} />
                    <Band logoW={width} logoH={height} bandW={width * 0.045} strength={0.6} />
                </>
            )}
        </View>
    );
};

const Band = ({ logoW, logoH, bandW, strength }: { logoW: number; logoH: number; bandW: number; strength: number }) => {
    // From just off the left edge to just off the right, allowing for the lean.
    const lean = (logoH / 2) * TAN_LEAN;
    const from = -bandW - lean;
    const to = logoW + lean;
    const { slide, counter } = keyframesFor(from, to);
    const timing = {
        animationDuration: `${CYCLE_S}s`,
        animationDelay: `${START_DELAY_S}s`,
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-in-out',
    } as const;

    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: bandW,
                height: logoH,
                overflow: 'hidden',
                transform: [{ translateX: from }, { skewX: LEAN }],
                animationName: slide,
                ...timing,
            }}
        >
            <Animated.View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: logoW,
                    height: logoH,
                    opacity: strength,
                    transform: [{ skewX: UNLEAN }, { translateX: -from }],
                    animationName: counter,
                    ...timing,
                }}
            >
                <Image source={LOGO} style={{ width: logoW, height: logoH, tintColor: '#ffffff' }} resizeMode="contain" />
            </Animated.View>
        </Animated.View>
    );
};
