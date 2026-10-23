export const SCREEN_WIDTH = 600; // Logical width, will scale
export const SCREEN_HEIGHT = 350; // Logical height

export const GROUND_HEIGHT = 50;
/** Pixels below the pink ground line that the runner stands on (so they appear on the grid). */
export const RUNNER_Y_OFFSET = 18;
/** Y of the running surface (feet level); pink line is at SCREEN_HEIGHT - GROUND_HEIGHT. */
export const RUNNER_GROUND_Y = SCREEN_HEIGHT - GROUND_HEIGHT + RUNNER_Y_OFFSET;
export const PLAYER_SIZE = 40;
/** Height of the runner while ducking. Feet stay put, so the head drops by the difference. */
export const PLAYER_DUCK_HEIGHT = 22;
/** How long one duck lasts. An overhead bar covers the runner for about 0.4s, so this clears it. */
export const DUCK_DURATION_SEC = 0.55;
/** When a held duck is let go (finger lifted, key released), the runner stands this long after. */
export const DUCK_RELEASE_SEC = 0.15;
export const PLAYER_X = 50;
export const OBSTACLE_SIZE = 40;
export const OBSTACLE_SIZE_SMALL = 28; // Small yellow block (Neon City)
export const OBSTACLE_SIZE_PURPLE = 30;
export const HEART_SIZE = 30;
/**
 * The bar you duck under. Measured up from the runner's feet.
 *
 * The bottom sits just above a ducked head (22px) so ducking clears it. The top has to be
 * higher than the runner can reach: a jump peaks 120px up, which would put the whole body
 * above a short bar and let players jump it instead of ducking.
 */
export const OVERHEAD_BOTTOM_OFFSET = 26;
export const OVERHEAD_TOP_OFFSET = 170;
export const OVERHEAD_WIDTH = 28;

export const MAX_HEALTH = 10;
export const DAMAGE_BLOCK = 4;
export const DAMAGE_SMALL = 2; // Small block (Neon City)
export const DAMAGE_PURPLE = 2;
export const DAMAGE_OVERHEAD = 3;
export const HEART_HEAL = 3;

// Physics
export const GRAVITY = 0.6;
export const JUMP_FORCE = -12;
/**
 * The original world speed, 4px per frame (240 px/sec). The world now speeds up through
 * each stage (see `speed` in stages.ts); this stays as the yardstick for the sky timeline
 * and the run cycle, which were tuned at this speed.
 */
export const BASE_SPEED = 4;

// Visuals (Synthwave Theme & Day/Night Cycle)
export const COLOR_SKY_TOP = "#0f0c29";   // Fallback
export const COLOR_SKY_MID = "#302b63";   // Fallback
export const COLOR_SKY_BOTTOM = "#ff00cc"; // Fallback

export const TIME_CYCLE_DURATION = 6000; // Frames for full cycle (~100s at 60fps)

export const THEME_DAY = {
    skyTop: "#00b4db",
    skyMid: "#48c6ef",
    skyBottom: "#88defb",
    sun: "#ffdd55",
    celestialY: 50, // Sun height
};

export const THEME_SUNSET = {
    skyTop: "#2c3e50",
    skyMid: "#fd746c",
    skyBottom: "#ff9068",
    sun: "#ff512f",
    celestialY: 200, // Sun setting
};

export const THEME_NIGHT = {
    skyTop: "#0f0c29",
    skyMid: "#302b63",
    skyBottom: "#24243e",
    sun: "#fdfbfb", // Moon
    celestialY: 50, // Moon height
};

export const THEME_SUNRISE = {
    skyTop: "#1a2a6c",
    skyMid: "#b21f1f",
    skyBottom: "#fdbb2d",
    sun: "#ffdd55",
    celestialY: 200, // Sun rising
};

export const COLOR_SUN = "#ffdd55";
export const COLOR_CITY_BACK = "#2c1e4a";
export const COLOR_CITY_FRONT = "#000000"; // Darker for contrast
export const COLOR_GROUND_NEON = "#ff00cc"; // Reset keeping neon glow
export const COLOR_GROUND_LINE = "#FFB6C1"; // Light Pink for the line itself
export const COLOR_HP_DEEP = "#FF1493"; // Deep Pink for Health/Hearts
export const COLOR_OBSTACLE = "#ffff00"; // Yellow
export const COLOR_OBSTACLE_GLOW = "#ffa500"; // Orange/Gold Glow
export const COLOR_ENERGY = "#00ffff"; // Cyan

// Energy
// Energy
export const MAX_ENERGY = 100;
export const JUMP_ENERGY_COST = 100; // Depletes full bar
export const ENERGY_REGEN = 0.5;

// Stage timing: each stage = 3 minutes real time (keeps audio in sync on slow devices)
export const STAGE_DURATION_SECONDS = 180;

/**
 * Length of a stage's sky timeline (sun, moon, lights), in distance units. Distance runs
 * on the clock: it was once also how far the world moved, back when the speed was fixed.
 * Scenery, grid and finish line now move by GameState.scroll instead.
 */
export const COURSE_LENGTH = BASE_SPEED * 60 * STAGE_DURATION_SECONDS;

// Debug
/**
 * The DEBUG switch, the stats panel and the stage-jump buttons.
 *
 * __DEV__ is true when running from the dev server and false in a built app, so none of
 * this reaches players. It matters because debug mode turns off all damage, which would
 * make a deployed build impossible to lose.
 */
export const DEBUG_ENABLED = __DEV__;
