/** How big the game is drawn and how it's scaled to the screen, and whether to ask for the phone to be turned. */
// Left out of the React Compiler, like the rest of the game screen: see GameScreen.tsx.
'use no memo';

import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../../game/constants';
import { useWebSafeAreaSides } from './useWebSafeAreaSides';

const LOGICAL_WIDTH = SCREEN_WIDTH;   // 600 – game logic (spawn, player, focus) stays in this width
const LOGICAL_HEIGHT = SCREEN_HEIGHT; // 350

/** Desktop web: fixed size for preview/feedback; no filling the browser. */
const WEB_VIEWPORT = { width: 600, height: 350 };

/**
 * A phone or tablet browser, including the game saved to the home screen. These fill the
 * screen the way the phone app does, rather than showing the small desktop preview.
 */
export const isTouchWeb =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(pointer: coarse)').matches;

export const useViewport = () => {
    const windowDim = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    /** Desktop web shows a fixed-size preview; everything else fills the screen. */
    const fixedPreview = isWeb && !isTouchWeb;
    const viewportWidth = fixedPreview ? WEB_VIEWPORT.width : windowDim.width;
    const viewportHeight = fixedPreview ? WEB_VIEWPORT.height : windowDim.height;
    /** Phones can't be locked sideways from a web page, so ask the player to turn it. */
    const needsRotate = isTouchWeb && windowDim.height > windowDim.width;

    // View width: on mobile when viewport is wide, draw wider so obstacles have longer run-in; focus stays left 600.
    const viewWidth = fixedPreview ? LOGICAL_WIDTH : Math.max(LOGICAL_WIDTH, LOGICAL_HEIGHT * (viewportWidth / viewportHeight));
    const viewHeight = LOGICAL_HEIGHT;

    // The game fills the whole screen, notch included; the score and health bars stay clear of
    // the notch and rounded corners. Insets are in screen points, so divide by the game's scale.
    // In a phone browser they're read from the browser itself (see useWebSafeAreaSides).
    const appInsets = useSafeAreaInsets();
    const insets = useWebSafeAreaSides() ?? appInsets;

    // Single uniform scale → no stretch (aspect ratio preserved). Scale to fill viewport.
    const scale = Math.max(viewportWidth / viewWidth, viewportHeight / viewHeight);
    const translateX = viewportWidth / 2 - viewWidth / 2;
    const translateY = viewportHeight / 2 - viewHeight / 2;

    /** Where the HUD sits clear of the notch, in game units; the desktop preview has none. */
    const hudInsets = fixedPreview ? null : { left: insets.left / scale, right: insets.right / scale };

    return { fixedPreview, needsRotate, viewWidth, viewHeight, scale, translateX, translateY, hudInsets };
};
