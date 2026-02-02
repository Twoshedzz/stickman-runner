
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
    difficulty: {
        baseSpeed: number;
        spawnRate: number; // Interval in ms (approx)
    };
    durationDistance: number; // Distance required to clear the stage (Reach Dawn)
}

export const STAGES: StageConfig[] = [
    {
        id: 'stage_1_city',
        name: 'NEON CITY',
        description: 'Survive the urban night run.',
        theme: {
            groundColor: '#ff00cc', // Neon Pink
            skyColors: ['#0f0c29', '#302b63', '#24243e'], // Deep Purple/Blue
            sunColor: '#ff0099',
            moonColor: '#FEFCD7'
        },
        assets: {
            backgroundType: 'city'
        },
        difficulty: {
            baseSpeed: 5,
            spawnRate: 1500
        },
        durationDistance: 2000 // Distance units to reach dawn
    },
    {
        id: 'stage_2_beach',
        name: 'SYNTHWAVE BEACH',
        description: 'Dodge obstacles on the retro coast.',
        theme: {
            groundColor: '#00ffff', // Cyan
            skyColors: ['#1a2a6c', '#b21f1f', '#fdbb2d'], // Sunset/Sunrise vibes
            sunColor: '#ffdd55',
            moonColor: '#ffffff'
        },
        assets: {
            backgroundType: 'beach'
        },
        difficulty: {
            baseSpeed: 6,
            spawnRate: 1300
        },
        durationDistance: 2500
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
        difficulty: {
            baseSpeed: 7,
            spawnRate: 1100
        },
        durationDistance: 3000
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
        difficulty: {
            baseSpeed: 8,
            spawnRate: 900
        },
        durationDistance: 4000
    }
];
