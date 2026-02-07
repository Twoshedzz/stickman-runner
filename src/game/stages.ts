
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

export type ObstacleType = 'standard' | 'red' | 'purple' | 'boulder' | 'heart';

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
            allowedObstacles: ['standard', 'boulder', 'heart'],
            allowDoubleSpawns: true
        },
        courseLength: 43200, // 3 minutes at 60fps (Speed 4)
        // SECTIONS (7200 per 30s):
        // 1. 0     - 7200   : Day/Sunset
        // 2. 7200  - 14400  : Twilight/Lights On
        // 3. 14400 - 21600  : Night Full
        // 4. 21600 - 28800  : Night Full
        // 5. 28800 - 36000  : Pre-Dawn
        // 6. 36000 - 43200  : Sunrise/Victory
        timeline: [
            // 0. Sun Set (0 -> 8000)
            {
                type: 'celestial_sun',
                trigger: { start: 0, end: 8000 },
                values: {
                    startY: 50,
                    endY: 400,
                    startColor: '#FDB813',
                    endColor: '#ff512f'
                }
            },
            // 1. Sunset Sky (0 -> 13000)
            {
                type: 'sky_gradient',
                trigger: { start: 0, end: 13000 },
                values: {
                    startColor: ['#4b6cb7', '#87CEEB', '#FDB813'], // Blue/Orange
                    endColor: ['#0f0c29', '#302b63', '#ff00cc']   // Black/Pink
                }
            },
            // 2. City Lights (8000 -> 20000) - Ramping up
            {
                type: 'night_lights',
                trigger: { start: 8000, end: 20000 },
                values: { startOpacity: 0, endOpacity: 1 } // Interpolates 0 -> 1
            },
            {
                type: 'night_lights',
                trigger: { start: 20000, end: -1 },
                values: { opacity: 1 } // Hold full
            },
            // Moon Rise (14400 -> 36000)
            {
                type: 'celestial_moon',
                trigger: { start: 14400, end: 36000 },
                values: { startY: -60, endY: 120, opacity: 1 }
            },
            // 3. Sunrise (End-10000 -> End)
            {
                type: 'celestial_sun',
                trigger: { start: -10000, end: -1 },
                values: { startY: 400, endY: 150, startColor: '#FF4500', endColor: '#FDB813' }
            },
            // 4. Dawn Sky (End-8000 -> End)
            {
                type: 'sky_gradient',
                trigger: { start: -8000, end: -1 },
                values: {
                    startColor: ['#0f0c29', '#302b63', '#ff00cc'], // Night
                    endColor: ['#00b4db', '#48c6ef', '#ffdd55']   // Bright Morning
                }
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
