/**
 * The stage music, in one place. Both the native hook (useBackgroundMusic.ts) and the
 * web hook (useBackgroundMusic.web.ts) import this, so a new track is added once.
 *
 * Keys match `audio.musicTrack` in src/game/stages.ts.
 * Every track is 3 minutes long, but most end with a few seconds of fade or silence, so
 * each stage's `durationSec` (stages.ts) is set to where its music actually ends. Measured
 * by decoding the files: city 179.5s, beach 173.5s, mountains 175.5s, victory 177.4s.
 */
export const MUSIC_TRACKS: Record<string, number> = {
    music_city: require('../../assets/neoncity.mp3'),            // 1 Neon City
    music_beach: require('../../assets/synthwavebeach.mp3'),     // 2 Sunset Beach
    music_mountains: require('../../assets/midnightmountains.mp3'), // 3 Midnight Mountains
    music_victory: require('../../assets/victorydawn.mp3'),      // 4 Victory Dawn
};

/** Used when a stage has no track, or an unknown key is passed. */
export const DEFAULT_TRACK = 'music_city';

/**
 * The menu music: a 30-second loop for the title and info screens, before and after a game.
 * Played on its own, apart from the stage music (see startMenuMusic in the music hooks).
 */
export const MENU_TRACK: number = require('../../assets/Start_Screen_Glide.mp3');
