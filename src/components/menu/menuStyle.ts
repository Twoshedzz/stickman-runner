/**
 * Shared look for the menu screens: the 80s arcade / Tron style.
 *
 * Audiowide for headings and menu items (wide, smooth, futuristic capitals, in keeping with
 * the game's vector lines), Orbitron for smaller text and scores.
 */

/** Font files, loaded once by GameScreen. Each is required directly so only these get bundled. */
export const MENU_FONT_FILES = {
    Audiowide: require('@expo-google-fonts/audiowide/400Regular/Audiowide_400Regular.ttf'),
    'Orbitron-Medium': require('@expo-google-fonts/orbitron/500Medium/Orbitron_500Medium.ttf'),
    'Orbitron-Bold': require('@expo-google-fonts/orbitron/700Bold/Orbitron_700Bold.ttf'),
};

export const FONT = {
    display: 'Audiowide',
    body: 'Orbitron-Medium',
    bold: 'Orbitron-Bold',
};

export const NEON = {
    pink: '#ff00cc',
    hotPink: '#ff4fd8',
    cyan: '#00ffff',
    yellow: '#ffe066',
    white: '#ffffff',
    dim: 'rgba(255, 255, 255, 0.55)',
    panel: 'rgba(4, 2, 12, 0.86)',
};

/** A soft neon glow around text in the given colour. */
export const glow = (color: string, radius = 10) => ({
    textShadowColor: color,
    textShadowRadius: radius,
    textShadowOffset: { width: 0, height: 0 },
});
