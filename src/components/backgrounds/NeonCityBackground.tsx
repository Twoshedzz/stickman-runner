import { Group, Image, Path, Rect, Skia, useTexture } from "@shopify/react-native-skia";
import React from 'react';
import { COLOR_CITY_BACK, COLOR_CITY_FRONT, GROUND_HEIGHT, SCREEN_HEIGHT, SCREEN_WIDTH } from "../../game/constants";
import { GameState } from "../../game/state";

const CITY_WIDTH = SCREEN_WIDTH * 2;
const CITY_SPRITE_SIZE = { width: CITY_WIDTH, height: SCREEN_HEIGHT };

export interface CityWindow {
    x: number;
    y: number;
    w: number;
    h: number;
    activationThreshold: number;
    turnOffOrder: number;
    /** 0–3: which band turns on (0 = first quarter, 3 = last). Used for stepped on/off. */
    phase: number;
}
export interface CityData {
    path: ReturnType<typeof Skia.Path.Make>;
    w: number;
    windows: CityWindow[];
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
                        const activationThreshold = Math.random();
                        windows.push({
                            x: buildingX + 5 + (c * 12),
                            y: buildingY + 5 + (r * 15),
                            w: 6,
                            h: 8,
                            activationThreshold,
                            turnOffOrder: activationThreshold, // first to turn on (low threshold) = last to turn off (low turnOffOrder)
                            phase: 0, // set below by quartile
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

    // Assign phase 0–3 by activationThreshold quartile so lights step on in bands (no fade)
    windows.sort((a, b) => a.activationThreshold - b.activationThreshold);
    const n = windows.length;
    windows.forEach((w, i) => {
        w.phase = n <= 1 ? 0 : Math.min(3, Math.floor((i / n) * 4));
    });

    return { path, w: CITY_WIDTH, windows };
};

/** One-time city data for both layers. Only created when stage is city. Full quality on all platforms. */
export function useNeonCityData(stageId: string): { back: CityData; front: CityData } | null {
    const [cityData, setCityData] = React.useState<{ back: CityData; front: CityData } | null>(null);

    React.useEffect(() => {
        if (stageId !== "stage_1_city") return;
        const back = createCityline(20, 30, 0.95);
        const front = createCityline(0, 20, 0.95);
        setCityData({ back, front });
    }, [stageId]);

    return cityData;
}

/** Buildings only (path fill) for useTexture - drawn at opacity 1 always. */
function CityBuildingsSpriteContent({ data, layer }: { data: CityData; layer: "back" | "front" }) {
    const pathColor = layer === "back" ? COLOR_CITY_BACK : COLOR_CITY_FRONT;
    return <Path path={data.path} color={pathColor} style="fill" />;
}

/** Windows only (subset by phase) for useTexture - lights turning ON. maxPhase 0–3 = first quarter to all. */
function CityWindowsSpriteContent({ data, layer, maxPhase }: { data: CityData; layer: "back" | "front"; maxPhase: number }) {
    const windowColor = layer === "back" ? "rgba(255, 255, 0, 0.7)" : "rgba(0, 255, 255, 0.5)";
    return (
        <Group>
            {data.windows.filter(w => w.phase <= maxPhase).map((w, i) => (
                <Rect key={i} x={w.x} y={w.y} width={w.w} height={w.h} color={windowColor} />
            ))}
        </Group>
    );
}

/** Windows only (subset by turnOffOrder) - lights turning OFF in reverse order. minTurnOffOrder 0.25/0.5/0.75 = 75%/50%/25% still on. */
function CityWindowsOffSpriteContent({ data, layer, minTurnOffOrder }: { data: CityData; layer: "back" | "front"; minTurnOffOrder: number }) {
    const windowColor = layer === "back" ? "rgba(255, 255, 0, 0.7)" : "rgba(0, 255, 255, 0.5)";
    return (
        <Group>
            {data.windows.filter(w => w.turnOffOrder >= minTurnOffOrder).map((w, i) => (
                <Rect key={i} x={w.x} y={w.y} width={w.w} height={w.h} color={windowColor} />
            ))}
        </Group>
    );
}

interface NeonCitySpritesProps {
    data: { back: CityData; front: CityData };
    gameState: GameState;
    currentTheme: { nightProgress: number; lightsDwindle?: number };
}

const LIGHTS_STEPS = 4; // 0 = first quarter on … 3 = all on; no fade, on or off per band

/** Renders city as cached textures: buildings always visible; lights step on/off by band (no fade). */
export function NeonCitySprites({ data, gameState, currentTheme }: NeonCitySpritesProps) {
    const backBuildingsTexture = useTexture(
        <CityBuildingsSpriteContent data={data.back} layer="back" />,
        CITY_SPRITE_SIZE,
        []
    );
    const frontBuildingsTexture = useTexture(
        <CityBuildingsSpriteContent data={data.front} layer="front" />,
        CITY_SPRITE_SIZE,
        []
    );
    const backWindows0 = useTexture(<CityWindowsSpriteContent data={data.back} layer="back" maxPhase={0} />, CITY_SPRITE_SIZE, []);
    const backWindows1 = useTexture(<CityWindowsSpriteContent data={data.back} layer="back" maxPhase={1} />, CITY_SPRITE_SIZE, []);
    const backWindows2 = useTexture(<CityWindowsSpriteContent data={data.back} layer="back" maxPhase={2} />, CITY_SPRITE_SIZE, []);
    const backWindows3 = useTexture(<CityWindowsSpriteContent data={data.back} layer="back" maxPhase={3} />, CITY_SPRITE_SIZE, []);
    const backOff25 = useTexture(<CityWindowsOffSpriteContent data={data.back} layer="back" minTurnOffOrder={0.25} />, CITY_SPRITE_SIZE, []);
    const backOff50 = useTexture(<CityWindowsOffSpriteContent data={data.back} layer="back" minTurnOffOrder={0.5} />, CITY_SPRITE_SIZE, []);
    const backOff75 = useTexture(<CityWindowsOffSpriteContent data={data.back} layer="back" minTurnOffOrder={0.75} />, CITY_SPRITE_SIZE, []);
    const frontWindows0 = useTexture(<CityWindowsSpriteContent data={data.front} layer="front" maxPhase={0} />, CITY_SPRITE_SIZE, []);
    const frontWindows1 = useTexture(<CityWindowsSpriteContent data={data.front} layer="front" maxPhase={1} />, CITY_SPRITE_SIZE, []);
    const frontWindows2 = useTexture(<CityWindowsSpriteContent data={data.front} layer="front" maxPhase={2} />, CITY_SPRITE_SIZE, []);
    const frontWindows3 = useTexture(<CityWindowsSpriteContent data={data.front} layer="front" maxPhase={3} />, CITY_SPRITE_SIZE, []);
    const frontOff25 = useTexture(<CityWindowsOffSpriteContent data={data.front} layer="front" minTurnOffOrder={0.25} />, CITY_SPRITE_SIZE, []);
    const frontOff50 = useTexture(<CityWindowsOffSpriteContent data={data.front} layer="front" minTurnOffOrder={0.5} />, CITY_SPRITE_SIZE, []);
    const frontOff75 = useTexture(<CityWindowsOffSpriteContent data={data.front} layer="front" minTurnOffOrder={0.75} />, CITY_SPRITE_SIZE, []);
    const backOffset = -(gameState.distance * 0.2) % CITY_WIDTH;
    const frontOffset = -(gameState.distance * 0.5) % CITY_WIDTH;
    const lightsDwindle = currentTheme.lightsDwindle ?? 0;
    const effectiveLevel = Math.max(0, Math.min(1, currentTheme.nightProgress * (1 - lightsDwindle)));
    const lightsStep = effectiveLevel <= 0 ? -1 : Math.min(LIGHTS_STEPS - 1, Math.floor(effectiveLevel * LIGHTS_STEPS));
    const isTurningOff = lightsDwindle > 0;
    const backWindowsTex = lightsStep >= 0
        ? (isTurningOff
            ? (lightsStep === 3 ? backWindows3 : [backOff25, backOff50, backOff75][lightsStep])
            : [backWindows0, backWindows1, backWindows2, backWindows3][lightsStep])
        : null;
    const frontWindowsTex = lightsStep >= 0
        ? (isTurningOff
            ? (lightsStep === 3 ? frontWindows3 : [frontOff25, frontOff50, frontOff75][lightsStep])
            : [frontWindows0, frontWindows1, frontWindows2, frontWindows3][lightsStep])
        : null;

    const BackWindows = backWindowsTex ? (
        <Image image={backWindowsTex} x={0} y={0} width={CITY_WIDTH} height={SCREEN_HEIGHT} />
    ) : null;
    const FrontWindows = frontWindowsTex ? (
        <Image image={frontWindowsTex} x={0} y={0} width={CITY_WIDTH} height={SCREEN_HEIGHT} />
    ) : null;

    return (
        <>
            <Group transform={[{ translateX: backOffset }]}>
                <Image image={backBuildingsTexture} x={0} y={0} width={CITY_WIDTH} height={SCREEN_HEIGHT} />
                {BackWindows}
            </Group>
            <Group transform={[{ translateX: backOffset + CITY_WIDTH }]}>
                <Image image={backBuildingsTexture} x={0} y={0} width={CITY_WIDTH} height={SCREEN_HEIGHT} />
                {BackWindows}
            </Group>
            <Group transform={[{ translateX: frontOffset }]}>
                <Image image={frontBuildingsTexture} x={0} y={0} width={CITY_WIDTH} height={SCREEN_HEIGHT} />
                {FrontWindows}
            </Group>
            <Group transform={[{ translateX: frontOffset + CITY_WIDTH }]}>
                <Image image={frontBuildingsTexture} x={0} y={0} width={CITY_WIDTH} height={SCREEN_HEIGHT} />
                {FrontWindows}
            </Group>
        </>
    );
}

interface NeonCityLayerProps {
    layer: "back" | "front";
    data: CityData;
    gameState: GameState;
    currentTheme: { nightProgress: number; lightsDwindle?: number };
}

const safeColor = (c: unknown): string =>
    (typeof c === 'string' && c.length > 0) ? c : '#000000';

/** Renders a single city layer (back or front) for correct draw order. */
export function NeonCityLayer({ layer, data, gameState, currentTheme }: NeonCityLayerProps) {
    const bgOffset = layer === "back"
        ? -(gameState.distance * 0.2) % CITY_WIDTH
        : -(gameState.distance * 0.5) % CITY_WIDTH;

    const isBack = layer === "back";
    const pathColor = safeColor(isBack ? COLOR_CITY_BACK : COLOR_CITY_FRONT);
    const windowColor = safeColor(isBack
        ? "rgba(255, 255, 0, 0.7)"
        : "rgba(0, 255, 255, 0.5)");

    const dwindle = currentTheme.lightsDwindle ?? 0;
    const showWindow = (w: (typeof data.windows)[0]) =>
        currentTheme.nightProgress > w.activationThreshold && (1 - dwindle) > w.turnOffOrder;

    return (
        <>
            <Group transform={[{ translateX: bgOffset }]}>
                <Path path={data.path} color={pathColor} />
                {data.windows.map((w, i) =>
                    showWindow(w) ? (
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
                    showWindow(w) ? (
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
