/**
 * In a phone browser, how far the notch and rounded corners reach in from the left and right,
 * read from the browser's own `env(safe-area-inset-*)`. Since SDK 58 Expo Router reports these
 * as zero on the web, so the HUD would sit under the notch. Null on the phone app, which still
 * gets them from the safe-area library.
 */
// Left out of the React Compiler, like the rest of the game screen: see GameScreen.tsx.
'use no memo';

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

type Sides = { left: number; right: number };

export const useWebSafeAreaSides = (): Sides | null => {
    const [sides, setSides] = useState<Sides | null>(null);
    useEffect(() => {
        if (Platform.OS !== 'web' || typeof document === 'undefined') return;
        // A hidden element padded by the insets: its padding is their size in pixels.
        const probe = document.createElement('div');
        probe.style.cssText =
            'position:fixed;visibility:hidden;pointer-events:none;' +
            'padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)';
        document.body.appendChild(probe);
        const read = () => {
            const style = getComputedStyle(probe);
            setSides({ left: parseFloat(style.paddingLeft) || 0, right: parseFloat(style.paddingRight) || 0 });
        };
        // Turning the phone moves the notch; the new values can land just after the resize.
        let later: ReturnType<typeof setTimeout> | undefined;
        const onChange = () => {
            read();
            clearTimeout(later);
            later = setTimeout(read, 300);
        };
        read();
        window.addEventListener('resize', onChange);
        window.addEventListener('orientationchange', onChange);
        return () => {
            clearTimeout(later);
            window.removeEventListener('resize', onChange);
            window.removeEventListener('orientationchange', onChange);
            probe.remove();
        };
    }, []);
    return sides;
};
