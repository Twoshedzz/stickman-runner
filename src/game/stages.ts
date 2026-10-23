import { COURSE_LENGTH, STAGE_DURATION_SECONDS } from './constants';
import { ObstacleRole } from './obstacleCatalogue';

export type VisualEventType = 'sky_gradient' | 'celestial_sun' | 'celestial_moon' | 'night_lights' | 'night_lights_dwindle';

export interface VisualEvent {
    type: VisualEventType;
    trigger: {
        start: number; // Absolute distance OR -negative (relative to end)
        end: number;   // Absolute distance OR -negative
    };
    values: {
        startColor?: string | string[];
        endColor?: string | string[];
        startY?: number;
        endY?: number;
        opacity?: number;
        startOpacity?: number;
        endOpacity?: number;
    };
}

/**
 * How a stage gets harder. The spawner picks patterns from src/game/patterns.ts; these
 * numbers decide which ones are allowed and how much breathing space follows each one.
 * Pairs are [start of stage, end of stage], blended smoothly in between.
 */
export interface StagePacing {
    /** The most demanding pattern cost allowed (1 = single obstacles only, 4 = everything). */
    budget: [number, number];
    /** Seconds of breathing space after each pattern, before any extra for harder patterns. */
    rest: [number, number];
    /**
     * When each obstacle first turns up, as a fraction of the stage (0 = from the start,
     * 0.5 = halfway). Obstacles not listed never appear. Hearts are always available.
     */
    unlocks: Partial<Record<ObstacleRole, number>>;
    /** How readily hearts turn up. Generous early on balances a harder start. */
    hearts: {
        /** Below this share of health, a heart comes at every chance, at most every `hurtEverySec`. */
        hurtBelow: number;
        hurtEverySec: number;
        /** Only a little hurt: this chance of a heart in each rest, at most every `topUpEverySec`. */
        topUpChance: number;
        topUpEverySec: number;
    };
}

export interface StageConfig {
    id: string;
    name: string;
    description: string;
    theme: {
        groundColor: string;
        skyColors: [string, string, string]; // Top, Mid, Bottom
        sunColor: string;
        moonColor: string;
        /** Optional neon colour for the grid lines. Colour only; the grid's shape never changes. */
        gridColor?: string;
        /**
         * Hazard colours for this stage. The shapes are deliberately abstract, so colour is
         * what ties them to the scenery. Pickups are deliberately NOT here: hearts stay pink
         * on every stage so "this one helps you" always reads the same.
         */
        obstacleColors?: {
            block: string;      // standard, small and boulder
            blockGlow: string;
            red: string;
            redGlow: string;
            purple: string;
            purpleGlow: string;
            overhead: string;   // the bar you duck under
            overheadGlow: string;
        };
    };
    assets: {
        backgroundType: 'city' | 'beach' | 'mountains' | 'city_victory';
    };
    audio: {
        musicTrack: string; // Key for the music mapping
    };
    pacing: StagePacing;
    /**
     * How fast the world moves, in pixels per second, at the start and end of the stage.
     * It rises smoothly in between. The stage still ends on the 3-minute clock, so the
     * music and the dawn stay in step whatever the speed.
     */
    speed: [number, number];
    /**
     * The length of the sky's dusk-to-dawn timeline (sun, moon, lights). Distance runs on
     * the clock rather than the speed, so this is a clock in disguise; it is not how far
     * the runner travels. For that, see GameState.scroll.
     */
    courseLength: number;
    timeline?: VisualEvent[]; // Optional ordered list of visual changes
}

/** World speed in pixels per second at a point in the stage (0 = start, 1 = end). */
export const speedAt = (stage: StageConfig, progress: number) =>
    stage.speed[0] + (stage.speed[1] - stage.speed[0]) * progress;

/** How many more pixels the world will travel before the stage ends. Places the finish line. */
export const remainingScroll = (stage: StageConfig, progress: number) => {
    const [start, end] = stage.speed;
    const p = Math.min(Math.max(progress, 0), 1);
    // The area under a straight-line speed rise, from now to the end of the stage.
    return STAGE_DURATION_SECONDS * (start * (1 - p) + ((end - start) * (1 - p * p)) / 2);
};

export const STAGES: StageConfig[] = [
    {
        id: 'stage_1_city',
        name: 'NEON CITY',
        description: 'Survive the urban night run.',
        theme: {
            groundColor: '#ff00cc', // Neon Pink
            skyColors: ['#0f0c29', '#302b63', '#24243e'], // Deep Purple/Blue
            sunColor: '#FDB813', // Yellow
            moonColor: '#FEFCD7',
            obstacleColors: {
                block: '#ffff00', blockGlow: '#ffa500',        // as stage 1 always looked
                red: '#ff0040', redGlow: '#ff4d4d',
                purple: '#bf55ec', purpleGlow: '#e056fd',
                overhead: '#00ffff', overheadGlow: '#7df5ff',
            }
        },
        assets: {
            backgroundType: 'city'
        },
        audio: {
            musicTrack: 'music_city'
        },
        // Duck bars from the first few seconds, a quicker ramp, and plenty of hearts to balance it.
        pacing: {
            budget: [1.5, 4],
            rest: [1.2, 0.8],
            unlocks: { small: 0, overhead: 0.05, large: 0.1, mover: 0.25, huge: 0.6 },
            hearts: { hurtBelow: 0.8, hurtEverySec: 6, topUpChance: 0.5, topUpEverySec: 12 },
        },
        speed: [260, 300],
        courseLength: COURSE_LENGTH,
        // SECTIONS (7200 per 30s):
        // 1. 0–7200     : Sun in sky yellow→orange, moves down; sky dark at top by 7200
        // 2. 7200–14400 : Few city lights come on; at 11000 moon appears from top
        // 3. 14400–21600: City lights on all buildings; moon descending, hidden by buildings
        // 4. 21600–28800 : Moon below horizon
        // 5. 28800–36000 : Dawn, pink glow on horizon
        // 6. 36000–43200 : Pink lighter; sun rises (yellow) to just above buildings
        timeline: [
            // --- SEGMENT 1 (0–7200): Sun sets, sky dark at top ---
            {
                type: 'celestial_sun',
                trigger: { start: 0, end: 7200 },
                values: {
                    startY: 50,
                    endY: 280,
                    startColor: '#FDB813',
                    endColor: '#ff512f'
                }
            },
            // Sunset sky: slow fade to dark over full segment
            {
                type: 'sky_gradient',
                trigger: { start: 0, end: 9000 },
                values: {
                    startColor: ['#4b6cb7', '#87CEEB', '#e8a030'],
                    endColor: ['#0f0c29', '#302b63', '#24243e']
                }
            },
            // Sun below horizon during night (7200–36000)
            {
                type: 'celestial_sun',
                trigger: { start: 7200, end: 36000 },
                values: { startY: 400, endY: 400, startColor: '#ff512f', endColor: '#ff512f' }
            },
            // --- Lights start at 3000 distance, step on in bands (no fade) ---
            {
                type: 'night_lights',
                trigger: { start: 3000, end: 7200 },
                values: { startOpacity: 0, endOpacity: 0.25 }
            },
            {
                type: 'night_lights',
                trigger: { start: 7200, end: 14400 },
                values: { startOpacity: 0.25, endOpacity: 0.5 }
            },
            {
                type: 'celestial_moon',
                trigger: { start: 10000, end: 14400 },
                values: { startY: -50, endY: 90, opacity: 1 }
            },
            // --- SEGMENT 3 (14400–21600): All buildings have lights on; moon descending ---
            {
                type: 'night_lights',
                trigger: { start: 14400, end: 20000 },
                values: { startOpacity: 0.5, endOpacity: 1 }
            },
            {
                type: 'night_lights',
                trigger: { start: 20000, end: 999999 },
                values: { opacity: 1 }
            },
            {
                type: 'celestial_moon',
                trigger: { start: 14400, end: 21600 },
                values: { startY: 90, endY: 300, opacity: 1 }
            },
            // --- SEGMENT 4 (21600–28800): Moon below horizon (hidden) ---
            {
                type: 'celestial_moon',
                trigger: { start: 21600, end: -1 },
                values: { startY: 400, endY: 400, opacity: 0 }
            },
            // --- SEGMENT 5 (32000–40000): Lights dwindle in reverse order (night_lights_dwindle 0→1), gradual step-down ---
            {
                type: 'night_lights_dwindle',
                trigger: { start: 32000, end: 40000 },
                values: { startOpacity: 0, endOpacity: 1 }
            },
            {
                type: 'night_lights_dwindle',
                trigger: { start: 40000, end: 999999 },
                values: { opacity: 1 }
            },
            // --- SEGMENT 5: Dawn, pink glow emerges very slowly (28000–40000) ---
            {
                type: 'sky_gradient',
                trigger: { start: 28000, end: 40000 },
                values: {
                    startColor: ['#0f0c29', '#302b63', '#24243e'],
                    endColor: ['#0f0c29', '#302b63', '#ff69b4']
                }
            },
            // --- SEGMENT 6: Dawn to light blue sky as sun rises (38000–43200) ---
            {
                type: 'sky_gradient',
                trigger: { start: 38000, end: -1 },
                values: {
                    startColor: ['#0f0c29', '#302b63', '#ff69b4'],
                    endColor: ['#00b4db', '#48c6ef', '#88defb']
                }
            },
            {
                type: 'celestial_sun',
                trigger: { start: 36000, end: -1 },
                values: {
                    startY: 400,
                    endY: 120,
                    startColor: '#FDB813',
                    endColor: '#FDB813'
                }
            },
            // Hold day look after checkpoint (distance > courseLength) so sky doesn't flip back to night
            {
                type: 'sky_gradient',
                trigger: { start: 43200, end: 999999 },
                values: {
                    startColor: ['#00b4db', '#48c6ef', '#88defb'],
                    endColor: ['#00b4db', '#48c6ef', '#88defb']
                }
            },
            {
                type: 'celestial_sun',
                trigger: { start: 43200, end: 999999 },
                values: { startY: 120, endY: 120, startColor: '#FDB813', endColor: '#FDB813' }
            }
        ]
    },
    {
        id: 'stage_2_beach',
        name: 'SUNSET BEACH',
        description: 'Dodge obstacles on the retro coast.',
        theme: {
            // Sampled from assets/concepts/stage 2 - sunset beach.png
            groundColor: '#ffb347', // Warm neon horizon line
            skyColors: ['#6f59ad', '#b2609c', '#ee7174'], // Purple high, coral at the water
            sunColor: '#fd943f',
            moonColor: '#ffd79a',
            gridColor: 'rgba(255, 179, 71, 0.55)',
            obstacleColors: {
                block: '#ffb347', blockGlow: '#ffd79a',
                red: '#ff4f81', redGlow: '#ff85a8',
                purple: '#c86090', purpleGlow: '#e58bb4',
                overhead: '#ffd79a', overheadGlow: '#ff9e5e',
            }
        },
        assets: {
            backgroundType: 'beach'
        },
        audio: {
            musicTrack: 'music_beach'
        },
        pacing: {
            budget: [2, 4],
            rest: [1.3, 0.8],
            unlocks: { small: 0, large: 0, mover: 0, overhead: 0 },
            hearts: { hurtBelow: 0.6, hurtEverySec: 8, topUpChance: 0.3, topUpEverySec: 20 },
        },
        speed: [280, 320],
        courseLength: COURSE_LENGTH
    },
    {
        id: 'stage_3_landscape',
        name: 'MIDNIGHT MOUNTAINS',
        description: 'Navigate the wireframe mountains.',
        // Colours sampled from assets/concepts/stage 3 - midnight mountains.png
        theme: {
            groundColor: '#7df5ff', // Icy cyan horizon line
            skyColors: ['#0b1a44', '#0e265a', '#143979'], // Midnight navy, lighter at the horizon
            sunColor: '#b0f7fd', // Unused: stage 3 is fixed at midnight
            moonColor: '#b0f7fd',
            gridColor: 'rgba(34, 211, 238, 0.55)',
            obstacleColors: {
                block: '#9ef7ff', blockGlow: '#22d3ee',
                red: '#ff6b9d', redGlow: '#ffa3c4',
                purple: '#a78bfa', purpleGlow: '#c4b5fd',
                overhead: '#e0fbff', overheadGlow: '#7df5ff',
            }
        },
        assets: {
            backgroundType: 'mountains'
        },
        audio: {
            musicTrack: 'music_mountains'
        },
        pacing: {
            budget: [2.5, 4.5],
            rest: [1.2, 0.75],
            unlocks: { small: 0, large: 0, mover: 0, overhead: 0, huge: 0.2 },
            hearts: { hurtBelow: 0.5, hurtEverySec: 10, topUpChance: 0.25, topUpEverySec: 25 },
        },
        speed: [300, 340],
        courseLength: COURSE_LENGTH
    },
    {
        id: 'stage_4_victory',
        name: 'VICTORY DAWN',
        description: 'The final sprint to glory.',
        theme: {
            // Sampled from assets/concepts/stage 4 - victory lap.png
            groundColor: '#ff2fb9', // Magenta horizon line
            skyColors: ['#01114a', '#0f1661', '#261b7c'], // Deep navy up to purple
            sunColor: '#fec734',
            moonColor: '#ffffff',
            gridColor: 'rgba(255, 47, 185, 0.55)',
            obstacleColors: {
                block: '#ffd700', blockGlow: '#ffe98a',
                red: '#ff2fb9', redGlow: '#ff7ad9',
                purple: '#9b5de5', purpleGlow: '#c77dff',
                overhead: '#00e5ff', overheadGlow: '#7df5ff',
            }
        },
        assets: {
            backgroundType: 'city_victory'
        },
        audio: {
            musicTrack: 'music_victory'
        },
        pacing: {
            budget: [3, 5],
            rest: [1.1, 0.7],
            unlocks: { small: 0, large: 0, mover: 0, overhead: 0, huge: 0 },
            hearts: { hurtBelow: 0.5, hurtEverySec: 12, topUpChance: 0.2, topUpEverySec: 30 },
        },
        speed: [320, 360],
        courseLength: COURSE_LENGTH
    }
];
