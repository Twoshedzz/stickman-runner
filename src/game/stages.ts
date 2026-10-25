import { COURSE_LENGTH } from './constants';
import { ObstacleRole } from './obstacleCatalogue';
import type { SkyLook } from './sky';

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
    /**
     * What gives the stage its own character: patterns it leans on, as a multiplier on how
     * often each is picked (by id from src/game/patterns.ts; anything unlisted is 1).
     */
    favour?: Partial<Record<string, number>>;
    /** How readily hearts turn up. Generous early on balances a harder start. */
    hearts: {
        /** Below this share of health, a heart comes at every chance, at most every `hurtEverySec`. */
        hurtBelow: number;
        hurtEverySec: number;
        /** Only a little hurt: this chance of a heart in each rest, at most every `topUpEverySec`. */
        topUpChance: number;
        topUpEverySec: number;
    };
    /**
     * How much the neon pickups ask of you (src/game/pickups.ts). Both are chances.
     * Stage 1 keeps them easy: arcs over blocks and trails along the ground.
     */
    pickups: {
        /** A rest gets an arc floating in mid-air instead of a ground trail: an extra jump to reach. */
        hop: [number, number];
        /** A block's arc traces a double jump, so the top of it costs energy. */
        double: [number, number];
    };
}

/**
 * A stage's own touches to the sky, on top of its timeline (worked out in sky.ts).
 * Distances are on the same dusk-to-dawn clock as the timeline (`courseLength`).
 */
export interface StageSky {
    /** Held once the stage is over, so the Stage Clear screen doesn't flip back to night. */
    afterFinish?: SkyLook;
    /** From this distance to the finish, the city lights never drop below `level` (0-1). */
    lightsFloor?: { from: number; level: number };
    /**
     * The moon's path between two distances, in place of the timeline's moon: down the sky
     * from `fromY` to `toY`, fading in over the first `fadeIn` of the way.
     */
    moonPath?: { from: number; to: number; fromY: number; toY: number; fadeIn: number };
}

/** Which scenery a stage is drawn with (src/components/backgrounds/scenery.ts). */
export type BackgroundType = 'city' | 'beach' | 'mountains' | 'city_victory';

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
         * what ties them to the scenery. Hearts are deliberately NOT here: they stay pink on
         * every stage so "this one helps you" always reads the same.
         */
        obstacleColors: {
            block: string;      // standard, small and boulder
            blockGlow: string;
            red: string;
            redGlow: string;
            purple: string;
            purpleGlow: string;
            overhead: string;   // the bar you duck under
            overheadGlow: string;
        };
        /** The neon pickups: a pale core in the stage's horizon colour glow. */
        pickupColors: { core: string; glow: string };
    };
    assets: {
        backgroundType: BackgroundType;
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
     * How long the stage lasts, in seconds. Matched to its track: each one is 3 minutes long
     * but ends with a few seconds of fade or silence, so the stage ends when the music does.
     */
    durationSec: number;
    /**
     * The music's beat, measured by analysing the track: seconds per beat, and when the
     * first beat falls. Obstacles are timed to reach the runner on this beat. `pulseEvery`:
     * the beat pulse on the floor (beatPulse.ts) rolls every this many beats (default 1).
     */
    beat: { sec: number; firstSec: number; pulseEvery?: number };
    /**
     * The length of the sky's dusk-to-dawn timeline (sun, moon, lights). Distance runs on
     * the clock rather than the speed, so this is a clock in disguise; it is not how far
     * the runner travels. For that, see GameState.scroll.
     */
    courseLength: number;
    timeline?: VisualEvent[]; // Optional ordered list of visual changes
    sky?: StageSky;
}

/** The stage with this id, or the first stage if there's no such stage. */
export const stageById = (id: string): StageConfig => STAGES.find((s) => s.id === id) ?? STAGES[0];

/** World speed in pixels per second at a point in the stage (0 = start, 1 = end). */
export const speedAt = (stage: StageConfig, progress: number) =>
    stage.speed[0] + (stage.speed[1] - stage.speed[0]) * progress;

/** How many more pixels the world will travel before the stage ends. Places the finish line. */
export const remainingScroll = (stage: StageConfig, progress: number) => {
    const [start, end] = stage.speed;
    const p = Math.min(Math.max(progress, 0), 1);
    // The area under a straight-line speed rise, from now to the end of the stage.
    return stage.durationSec * (start * (1 - p) + ((end - start) * (1 - p * p)) / 2);
};

/**
 * The rhythm obstacles snap to: half-beats, so they land in time with the music without the
 * stage getting any sparser (about every 0.3-0.4 sec on these tracks).
 */
export const beatGridSec = (stage: StageConfig) => stage.beat.sec / 2;

/** How far through the current beat the music is, 0 just as a beat lands to 1 just before the next. */
export const beatPhase = (stage: StageConfig, stageSec: number) => {
    const beats = (stageSec - stage.beat.firstSec) / stage.beat.sec;
    return beats - Math.floor(beats);
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
            },
            pickupColors: { core: '#ffd6f5', glow: '#ff00cc' },
        },
        assets: {
            backgroundType: 'city'
        },
        audio: {
            musicTrack: 'music_city'
        },
        // Something new every half minute or so, and mostly runs that switch between ducking and
        // jumping. Players found it too easy on 24 October, so it starts busier than it used to.
        pacing: {
            budget: [2.5, 5],
            rest: [1.0, 0.65],
            // Holes come about 35 seconds in: on their own first, then in simple pairs.
            unlocks: { small: 0, overhead: 0.03, large: 0.06, mover: 0.15, hole: 0.2, huge: 0.45 },
            // The basics: the longer runs are saved for later stages.
            favour: {
                'bar-hop': 2, 'hop-bar': 2, 'bar-hole': 2, 'hole-bar': 2,
                'bar-hop-bar': 2, 'hop-bar-hop': 2, weave: 2.5, zigzag: 2.5,
                small: 0.4, large: 0.4, bar: 0.5,
                'bar-bar-hop': 0, 'pair-bar': 0, 'mover-bar': 0, 'hole-hole': 0, 'hole-hop-hole': 0,
                quad: 0, 'hole-bar-hole': 0, gauntlet: 0,
            },
            hearts: { hurtBelow: 0.65, hurtEverySec: 8, topUpChance: 0.35, topUpEverySec: 16 },
            pickups: { hop: [0, 0], double: [0, 0] },
        },
        speed: [260, 300],
        durationSec: 180, // music plays to 179.5s
        beat: { sec: 0.7982, firstSec: 0.425 }, // 75.2 BPM
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
            // --- Lights go out uniformly across the city, group by group in the reverse of how they
            //     came on, from 2:15 to the finish. The three phases mirror the switch-on above
            //     (which took 70s) in reverse, scaled to 45s: last on, first off. Dwindle 0.5 =
            //     half the city's light level gone, and so on. ---
            {
                type: 'night_lights_dwindle',
                trigger: { start: 32400, end: 35920 },
                values: { startOpacity: 0, endOpacity: 0.5 }
            },
            {
                type: 'night_lights_dwindle',
                trigger: { start: 35920, end: 40520 },
                values: { startOpacity: 0.5, endOpacity: 0.75 }
            },
            {
                type: 'night_lights_dwindle',
                trigger: { start: 40520, end: 43200 },
                values: { startOpacity: 0.75, endOpacity: 1 }
            },
            // (A leftover rule here used to force every light off at 40000 - about 2:47 - so the
            // last part of the switch-off happened all at once. Removed: the steps above now run
            // right to the finish, and after the finish the day sky takes over anyway.)
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
        ],
        sky: {
            // Daytime, with every light off, once the stage is over.
            afterFinish: {
                skyTop: '#00b4db', skyMid: '#48c6ef', skyBottom: '#88defb',
                sunColor: '#FDB813', sunY: 120,
                moonY: -100, moonOpacity: 0,
                nightProgress: 0, lightsDwindle: 1,
            },
            // Once the lights start coming on, a few always show.
            lightsFloor: { from: 3000, level: 0.02 },
            // The moon comes down from above the screen (-80) to behind the buildings (300)
            // over 5k-32k, clearer as night draws in.
            moonPath: { from: 5000, to: 32000, fromY: -80, toY: 300, fadeIn: 5000 },
        },
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
            },
            pickupColors: { core: '#fff1c1', glow: '#ffb347' },
        },
        assets: {
            backgroundType: 'beach'
        },
        audio: {
            musicTrack: 'music_beach'
        },
        pacing: {
            budget: [3, 4.5],
            rest: [0.8, 0.5],
            // Holes, first met in stage 1, are this stage's speciality, combinations included.
            unlocks: { small: 0, large: 0, mover: 0, overhead: 0, hole: 0 },
            favour: {
                hole: 1.2, 'hole-hop': 2.5, 'bar-hole': 2, 'hole-bar': 2, 'hole-hole': 2, 'hole-hop-hole': 1.5,
                weave: 2.5, zigzag: 2.5,
                small: 0.4, bar: 0.4, large: 0.5, pair: 0.7,
            },
            hearts: { hurtBelow: 0.6, hurtEverySec: 8, topUpChance: 0.3, topUpEverySec: 18 },
            // Introduces the extra jump between obstacles.
            pickups: { hop: [0.3, 0.6], double: [0, 0] },
        },
        speed: [280, 320],
        durationSec: 174, // music plays to 173.5s
        beat: { sec: 0.7483, firstSec: 0.025 }, // 80.2 BPM
        courseLength: COURSE_LENGTH,
        // Sunset: the sky deepens gently from lighter to darker tones over the whole stage.
        // The sun and its light on the water sink with it (SunsetBeachBackground).
        timeline: [
            {
                type: 'sky_gradient',
                trigger: { start: 0, end: COURSE_LENGTH },
                values: {
                    startColor: ['#7d68bd', '#c472a8', '#f8957c'],
                    endColor: ['#3e2c7a', '#8c4a8e', '#d8636c'],
                },
            },
        ],
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
            },
            pickupColors: { core: '#ffffff', glow: '#7df5ff' },
        },
        assets: {
            backgroundType: 'mountains'
        },
        audio: {
            musicTrack: 'music_mountains'
        },
        pacing: {
            budget: [3, 5.5],
            rest: [0.75, 0.45],
            unlocks: { small: 0, large: 0, mover: 0, overhead: 0, hole: 0, huge: 0.2 },
            // Moving spheres, the wide block and runs of three; the longest runs near the end.
            favour: {
                mover: 1.5, 'mover-hop': 2, 'mover-bar': 2, huge: 2,
                triple: 1.8, 'bar-bar-hop': 1.8, 'pair-bar': 1.8, quad: 1.5, weave: 1.5, zigzag: 1.5,
                small: 0.5, bar: 0.5, large: 0.6, hole: 0.6,
            },
            hearts: { hurtBelow: 0.6, hurtEverySec: 8, topUpChance: 0.3, topUpEverySec: 20 },
            // Adds double-jump arcs, which compete with the wide block for the energy bar.
            pickups: { hop: [0.4, 0.6], double: [0.25, 0.45] },
        },
        speed: [300, 340],
        durationSec: 176, // music plays to 175.5s
        beat: { sec: 0.59865, firstSec: 0.025, pulseEvery: 2 }, // 100.2 BPM: a pulse every other beat
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
            },
            pickupColors: { core: '#ffe0f4', glow: '#ff2fb9' },
        },
        assets: {
            backgroundType: 'city_victory'
        },
        audio: {
            musicTrack: 'music_victory'
        },
        pacing: {
            budget: [4.5, 6],
            rest: [0.65, 0.4],
            unlocks: { small: 0, large: 0, mover: 0, overhead: 0, hole: 0, huge: 0 },
            // The finale: everything, in the longest runs.
            favour: {
                gauntlet: 2.5, quad: 2, 'hole-bar-hole': 2, 'hole-hop-hole': 1.5, weave: 2, zigzag: 2,
                'bar-hop-bar': 1.5, 'hop-bar-hop': 1.5, 'bar-bar-hop': 1.5, 'pair-bar': 1.5,
                small: 0.4, bar: 0.4, large: 0.5, hole: 0.6, mover: 0.7,
            },
            hearts: { hurtBelow: 0.55, hurtEverySec: 9, topUpChance: 0.25, topUpEverySec: 22 },
            pickups: { hop: [0.5, 0.7], double: [0.4, 0.6] },
        },
        speed: [320, 360],
        durationSec: 178, // music plays to 177.4s
        beat: { sec: 0.5986, firstSec: 0.18, pulseEvery: 2 }, // 100.2 BPM: a pulse every other beat
        courseLength: COURSE_LENGTH,
        // Evening into night: a warm sunset sky deepens to navy by about 45% of the way,
        // then stays night to the finish (sun, street lights, fireworks and moon are in
        // VictoryDawnBackground).
        timeline: [
            {
                type: 'sky_gradient',
                trigger: { start: 0, end: COURSE_LENGTH * 0.45 },
                values: {
                    startColor: ['#3d5fa3', '#d0769c', '#ffb36b'],
                    endColor: ['#01114a', '#0f1661', '#261b7c'],
                },
            },
            {
                type: 'sky_gradient',
                trigger: { start: COURSE_LENGTH * 0.45, end: COURSE_LENGTH },
                values: {
                    startColor: ['#01114a', '#0f1661', '#261b7c'],
                    endColor: ['#01114a', '#0f1661', '#261b7c'],
                },
            },
        ],
    }
];
