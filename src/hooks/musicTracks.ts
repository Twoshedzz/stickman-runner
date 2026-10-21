/**
 * The stage music, in one place. Both the native hook (useBackgroundMusic.ts) and the
 * web hook (useBackgroundMusic.web.ts) import this, so a new track is added once.
 *
 * Keys match `audio.musicTrack` in src/game/stages.ts.
 * Every track is 3 minutes, matching STAGE_DURATION_SECONDS, so the music and the end
 * of the stage arrive together.
 */
export const MUSIC_TRACKS: Record<string, number> = {
    music_city: require('../../assets/neoncity.mp3'),            // 1 Neon City
    music_beach: require('../../assets/synthwavebeach.mp3'),     // 2 Sunset Beach
    music_mountains: require('../../assets/midnightmountains.mp3'), // 3 Midnight Mountains
    music_victory: require('../../assets/victorydawn.mp3'),      // 4 Victory Dawn
};

/** Used when a stage has no track, or an unknown key is passed. */
export const DEFAULT_TRACK = 'music_city';
