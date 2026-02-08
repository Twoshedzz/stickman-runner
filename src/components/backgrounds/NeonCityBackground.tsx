
import { Group, Path, Rect, Skia } from "@shopify/react-native-skia";
import React from 'react';
import { COLOR_CITY_BACK, COLOR_CITY_FRONT, GROUND_HEIGHT, SCREEN_HEIGHT, SCREEN_WIDTH } from "../../game/constants";
import { GameState } from "../../game/state";

const CITY_WIDTH = SCREEN_WIDTH * 2;

export interface CityData {
    path: ReturnType<typeof Skia.Path.Make>;
    w: number;
    windows: { x: number; y: number; w: number; h: number; activationThreshold: number }[];
}

export const createCityline = (
    offsetY: number,
    buildings: number,
    windowProbability: number
): CityData => {
    const path = Skia.Path.Make();
    let x = 0;
    const windows: CityData["windows"] = [];

    path.moveTo(x, SCREEN_HEIGHT);
    const groundY = SCREEN_HEIGHT - GROUND_HEIGHT - offsetY;
    path.lineTo(x, groundY);

    x += 10;
    path.lineTo(x, groundY);

    let buildingCount = 0;

    while (x < CITY_WIDTH - 60 && buildingCount < buildings) {
        const width = 40 + Math.random() * 60;
        const height = 30 + Math.random() * 100;

        if (x + width > CITY_WIDTH - 10) break;

        const buildingX = x;
        const buildingY = groundY - height;

        path.lineTo(buildingX, buildingY);
        x += width;
        path.lineTo(x, buildingY);
        path.lineTo(x, groundY);

        buildingCount++;

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
                            activationThreshold: Math.random(),
                        });
                    }
                }
            }
        }

        x += Math.random() * 10;
        path.lineTo(x, groundY);
    }

    path.lineTo(CITY_WIDTH, groundY);
    path.lineTo(CITY_WIDTH, SCREEN_HEIGHT);
    path.close();

    return { path, w: CITY_WIDTH, windows };
};

/** One-time city data for both layers. Only created when stage is city. */
export function useNeonCityData(stageId: string): { back: CityData; front: CityData } | null {
    const [cityData, setCityData] = React.useState<{ back: CityData; front: CityData } | null>(null);

    React.useEffect(() => {
        if (stageId !== "stage_1_city") return;
        const back = createCityline(20, 30, 0.78);
        const front = createCityline(0, 20, 0.8);
        setCityData({ back, front });
    }, [stageId]);

    return cityData;
}

interface NeonCityLayerProps {
    layer: "back" | "front";
    data: CityData;
    gameState: GameState;
    currentTheme: { nightProgress: number };
}

/** Renders a single city layer (back or front) for correct draw order. */
export function NeonCityLayer({ layer, data, gameState, currentTheme }: NeonCityLayerProps) {
    const bgOffset = layer === "back"
        ? -(gameState.distance * 0.2) % CITY_WIDTH
        : -(gameState.distance * 0.5) % CITY_WIDTH;

    const isBack = layer === "back";
    const pathColor = isBack ? COLOR_CITY_BACK : COLOR_CITY_FRONT;
    const windowColor = isBack
        ? "rgba(255, 255, 0, 0.55)"
        : "rgba(0, 255, 255, 0.4)";

    return (
        <>
            <Group transform={[{ translateX: bgOffset }]}>
                <Path path={data.path} color={pathColor} />
                {data.windows.map((w, i) =>
                    currentTheme.nightProgress > w.activationThreshold ? (
                        <Rect
                            key={`${layer}-${i}`}
                            x={w.x}
                            y={w.y}
                            width={w.w}
                            height={w.h}
                            color={windowColor}
                        />
                    ) : null
                )}
            </Group>
            <Group transform={[{ translateX: bgOffset + CITY_WIDTH }]}>
                <Path path={data.path} color={pathColor} />
                {data.windows.map((w, i) =>
                    currentTheme.nightProgress > w.activationThreshold ? (
                        <Rect
                            key={`${layer}-rep-${i}`}
                            x={w.x}
                            y={w.y}
                            width={w.w}
                            height={w.h}
                            color={windowColor}
                        />
                    ) : null
                )}
            </Group>
        </>
    );
}

interface NeonCityProps {
    gameState: GameState;
    currentTheme: { nightProgress: number };
}

/** Legacy single-component render (back + front together). Use layers in GameCanvas for correct order. */
export const NeonCityBackground = ({ gameState, currentTheme }: NeonCityProps) => {
    const cityData = useNeonCityData("stage_1_city");
    if (!cityData) return null;
    return (
        <>
            <NeonCityLayer layer="back" data={cityData.back} gameState={gameState} currentTheme={currentTheme} />
            <NeonCityLayer layer="front" data={cityData.front} gameState={gameState} currentTheme={currentTheme} />
        </>
    );
};
