
import { Group, Path, Rect, Skia } from "@shopify/react-native-skia";
import React from 'react';
import { COLOR_CITY_BACK, COLOR_CITY_FRONT, GROUND_HEIGHT, SCREEN_HEIGHT, SCREEN_WIDTH } from "../../game/constants";
import { GameState } from "../../game/state";

// --- City Assets ---
// --- City Assets ---
const CITY_WIDTH = SCREEN_WIDTH * 2;
interface CityData {
    path: any; // Skia Path
    w: number;
    windows: { x: number, y: number, w: number, h: number, activationThreshold: number }[];
}

const createCityline = (offsetY: number, buildings: number, windowProbability: number): CityData => {
    const path = Skia.Path.Make();
    let x = 0;
    const windows: { x: number, y: number, w: number, h: number, activationThreshold: number }[] = [];

    path.moveTo(x, SCREEN_HEIGHT);
    const groundY = SCREEN_HEIGHT - GROUND_HEIGHT - offsetY;
    path.lineTo(x, groundY);

    // Initial flat ground to ensure seam is clean
    x += 10;
    path.lineTo(x, groundY);

    let buildingCount = 0;

    while (x < CITY_WIDTH - 60 && buildingCount < buildings) { // Check limits
        const width = 40 + Math.random() * 60;
        const height = 30 + Math.random() * 100;

        // Ensure we don't overshoot drastically
        if (x + width > CITY_WIDTH - 10) break;

        const buildingX = x;
        const buildingY = groundY - height;

        // Up
        path.lineTo(buildingX, buildingY);
        x += width;
        // Across
        path.lineTo(x, buildingY);
        // Down
        path.lineTo(x, groundY);

        buildingCount++;

        // Windows
        if (Math.random() < windowProbability && height > 40) {
            const rows = Math.floor(height / 15);
            const cols = Math.floor(width / 12);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (Math.random() > 0.3) {
                        windows.push({
                            x: buildingX + 5 + (c * 12),
                            y: buildingY + 5 + (r * 15),
                            w: 6,
                            h: 8,
                            activationThreshold: Math.random() * 0.8
                        });
                    }
                }
            }
        }

        // Gap between buildings (optional, but good for style)
        x += Math.random() * 10;
        path.lineTo(x, groundY);
    }

    // Connect to end
    path.lineTo(CITY_WIDTH, groundY);
    path.lineTo(CITY_WIDTH, SCREEN_HEIGHT);
    path.close();

    return { path, w: CITY_WIDTH, windows };
};

interface NeonCityProps {
    gameState: GameState;
    currentTheme: { nightProgress: number; };
}

export const NeonCityBackground = ({ gameState, currentTheme }: NeonCityProps) => {
    const [cityData, setCityData] = React.useState<{ back: CityData, front: CityData } | null>(null);

    React.useEffect(() => {
        // Delay generation to ensure Skia is ready and avoid render blocking
        const back = createCityline(20, 30, 0.4);
        const front = createCityline(0, 20, 0.8);
        setCityData({ back, front });
    }, []);

    if (!cityData) return null; // Render nothing until data is generated

    const { back: cityDataBack, front: cityDataFront } = cityData;

    // Parallax Offsets
    const bgOffsetBack = -(gameState.distance * 0.2) % CITY_WIDTH;
    const bgOffsetFront = -(gameState.distance * 0.5) % CITY_WIDTH;

    return (
        <>
            {/* Back Layer (Dark Purple + Dim Windows) */}
            <Group transform={[{ translateX: bgOffsetBack }]}>
                <Path path={cityDataBack.path} color={COLOR_CITY_BACK} />
                {cityDataBack.windows.map((w, i) => (
                    currentTheme.nightProgress > w.activationThreshold && (
                        <Rect key={`wb-${i}`} x={w.x} y={w.y} width={w.w} height={w.h} color="rgba(255, 255, 0, 0.2)" />
                    )
                ))}
            </Group>
            <Group transform={[{ translateX: bgOffsetBack + CITY_WIDTH }]}>
                <Path path={cityDataBack.path} color={COLOR_CITY_BACK} />
                {cityDataBack.windows.map((w, i) => (
                    currentTheme.nightProgress > w.activationThreshold && (
                        <Rect key={`wb-rep-${i}`} x={w.x} y={w.y} width={w.w} height={w.h} color="rgba(255, 255, 0, 0.2)" />
                    )
                ))}
            </Group>

            {/* Front Layer (Black Silhouette + Bright Windows) */}
            <Group transform={[{ translateX: bgOffsetFront }]}>
                <Path path={cityDataFront.path} color={COLOR_CITY_FRONT} />
                {cityDataFront.windows.map((w, i) => (
                    currentTheme.nightProgress > w.activationThreshold && (
                        <Rect key={`wf-${i}`} x={w.x} y={w.y} width={w.w} height={w.h} color="rgba(0, 255, 255, 0.4)" />
                    )
                ))}
            </Group>
            <Group transform={[{ translateX: bgOffsetFront + CITY_WIDTH }]}>
                <Path path={cityDataFront.path} color={COLOR_CITY_FRONT} />
                {cityDataFront.windows.map((w, i) => (
                    currentTheme.nightProgress > w.activationThreshold && (
                        <Rect key={`wf-rep-${i}`} x={w.x} y={w.y} width={w.w} height={w.h} color="rgba(0, 255, 255, 0.4)" />
                    )
                ))}
            </Group>
        </>
    );
};
