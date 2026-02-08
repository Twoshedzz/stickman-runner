
export type VisualEventType = 'sky_gradient' | 'celestial_sun' | 'celestial_moon' | 'night_lights';

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

export type ObstacleType = 'standard' | 'small' | 'red' | 'purple' | 'boulder' | 'heart';

export interface StageConfig {
    id: string;
    name: string;
    description: string;
    theme: {
        groundColor: string;
        skyColors: [string, string, string]; // Top, Mid, Bottom
        sunColor: string;
        moonColor: string;
    };
    assets: {
        backgroundType: 'city' | 'beach' | 'mountains' | 'city_victory';
    };
    audio: {
        musicTrack: string; // Key for the music mapping
    };
    difficulty: {
        baseSpeed: number;
        spawnRate: number; // Interval in ms (approx)
        allowedObstacles: ObstacleType[];
        allowDoubleSpawns: boolean;
    };
    courseLength: number; // Distance required to clear stage
    timeline?: VisualEvent[]; // Optional ordered list of visual changes
}

export const STAGES: StageConfig[] = [
    {
        id: 'stage_1_city',
        name: 'NEON CITY',
        description: 'Survive the urban night run.',
        theme: {
            groundColor: '#ff00cc', // Neon Pink
            skyColors: ['#0f0c29', '#302b63', '#24243e'], // Deep Purple/Blue
            sunColor: '#FDB813', // Yellow
            moonColor: '#FEFCD7'
        },
        assets: {
            backgroundType: 'city'
        },
        audio: {
            musicTrack: 'music_city'
        },
        difficulty: {
            baseSpeed: 5,
            spawnRate: 1500,
            allowedObstacles: ['standard', 'small', 'boulder', 'heart'],
            allowDoubleSpawns: true
        },
        courseLength: 43200, // 3 minutes at 60fps (Speed 4)
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
            // --- SEGMENT 2 (7200–14400): City lights start, moon appears at 11000 ---
            {
                type: 'night_lights',
                trigger: { start: 7200, end: 14400 },
                values: { startOpacity: 0, endOpacity: 0.5 }
            },
            {
                type: 'celestial_moon',
                trigger: { start: 11000, end: 14400 },
                values: { startY: -60, endY: 80, opacity: 1 }
            },
            // --- SEGMENT 3 (14400–21600): Middle of night, 80–90% lights on; moon descending ---
            {
                type: 'night_lights',
                trigger: { start: 14400, end: 21600 },
                values: { startOpacity: 0.5, endOpacity: 0.85 }
            },
            {
                type: 'night_lights',
                trigger: { start: 21600, end: 32000 },
                values: { opacity: 0.85 }
            },
            // At 32000 lights slowly dwindle (people turning them off)
            {
                type: 'night_lights',
                trigger: { start: 32000, end: 36000 },
                values: { startOpacity: 0.85, endOpacity: 0 }
            },
            {
                type: 'celestial_moon',
                trigger: { start: 14400, end: 21600 },
                values: { startY: 80, endY: 320, opacity: 1 }
            },
            // --- SEGMENT 4 (21600–28800): Moon below horizon (hidden) ---
            {
                type: 'celestial_moon',
                trigger: { start: 21600, end: -1 },
                values: { startY: 400, endY: 400, opacity: 0 }
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
            // --- SEGMENT 6: Pink to lighter pink, slow fade (38000–43200) ---
            {
                type: 'sky_gradient',
                trigger: { start: 38000, end: -1 },
                values: {
                    startColor: ['#0f0c29', '#302b63', '#ff69b4'],
                    endColor: ['#2c1a4a', '#4a3560', '#ffb6c1']
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
                    startColor: ['#2c1a4a', '#4a3560', '#ffb6c1'],
                    endColor: ['#2c1a4a', '#4a3560', '#ffb6c1']
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
        name: 'SYNTHWAVE BEACH',
        description: 'Dodge obstacles on the retro coast.',
        theme: {
            groundColor: '#4b1248', // Dark Purple/Brown beach sand
            skyColors: ['#6a3093', '#ff00cc', '#fdbb2d'], // Reference: Purple -> Pink -> Golden
            sunColor: '#ffffff', // Bright white sun
            moonColor: '#ffffff'
        },
        assets: {
            backgroundType: 'beach'
        },
        audio: {
            musicTrack: 'music_beach'
        },
        difficulty: {
            baseSpeed: 6.5,
            spawnRate: 1200,
            allowedObstacles: ['purple', 'red'],
            allowDoubleSpawns: false
        },
        courseLength: 43200 // 3 minutes at 60fps (Speed 4)
    },
    {
        id: 'stage_3_landscape',
        name: 'DIGITAL PEAKS',
        description: 'Navigate the wireframe mountains.',
        theme: {
            groundColor: '#00ff00', // Neon Green
            skyColors: ['#000000', '#0f9b0f', '#000000'], // Matrix-ish
            sunColor: '#00ff00',
            moonColor: '#ccffcc'
        },
        assets: {
            backgroundType: 'mountains'
        },
        audio: {
            musicTrack: 'music_mountains'
        },
        difficulty: {
            baseSpeed: 7,
            spawnRate: 1100,
            allowedObstacles: ['purple', 'red', 'boulder'],
            allowDoubleSpawns: true
        },
        courseLength: 40000
    },
    {
        id: 'stage_4_victory',
        name: 'VICTORY LAP',
        description: 'The final sprint to glory.',
        theme: {
            groundColor: '#ffd700', // Gold
            skyColors: ['#4b6cb7', '#182848', '#FFD700'], // Royal Blue & Gold
            sunColor: '#ffffff',
            moonColor: '#ffffff'
        },
        assets: {
            backgroundType: 'city_victory'
        },
        audio: {
            musicTrack: 'music_victory'
        },
        difficulty: {
            baseSpeed: 8,
            spawnRate: 900,
            allowedObstacles: ['purple', 'red'],
            allowDoubleSpawns: false
        },
        courseLength: 50000
    }
];
