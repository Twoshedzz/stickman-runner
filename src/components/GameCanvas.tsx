import { Canvas, Circle, Group, LinearGradient, Path, Rect, Skia, vec } from "@shopify/react-native-skia";
import React, { useMemo } from 'react';
import {
    COLOR_CITY_BACK, COLOR_CITY_FRONT,
    COLOR_OBSTACLE,
    COLOR_OBSTACLE_GLOW, GROUND_HEIGHT, OBSTACLE_SIZE, OBSTACLE_SIZE_PURPLE,
    PLAYER_SIZE, SCREEN_HEIGHT, SCREEN_WIDTH,
    TIME_CYCLE_DURATION
} from "../game/constants";
import { STAGES, StageConfig } from "../game/stages";
import { GameState } from "../game/state";
import { Stickman } from "./Stickman";

interface GameCanvasProps {
    gameState: GameState;
    tick?: number;
}

const PLAYER_X = 50;

// Helper: Hex Color Interpolation
const interpolateColor = (color1: string, color2: string, factor: number) => {
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);

    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);

    return `rgb(${r}, ${g}, ${b})`;
};

const getTheme = (time: number, stage: StageConfig) => {
    const progress = (time % TIME_CYCLE_DURATION) / TIME_CYCLE_DURATION;

    let t;
    let nightProgress = 0;

    let skyTop, skyMid, skyBottom, sunColor;

    // --- User Requested "Neon/Synthwave" Sequence ---

    // 1. Early Evening (0.0 - 0.35)
    // "Light blue chasing the yellow sun"
    if (progress < 0.35) {
        t = progress / 0.35;
        // Light Blue -> Deep Blue
        skyTop = interpolateColor("#4b6cb7", "#182848", t);
        skyMid = interpolateColor("#87CEEB", "#4b6cb7", t);
        skyBottom = interpolateColor("#87CEEB", "#FDB813", t); // Horizon turns yellow matching sun
        sunColor = "#FDB813"; // Pure Yellow
    }
    // 2. Evening (0.35 - 0.52)
    // "Light blue turning to dark blue at top, sun setting horizon going orange"
    else if (progress < 0.52) {
        t = (progress - 0.35) / 0.17;
        skyTop = interpolateColor("#182848", "#0f0c29", t);  // Darkens significantly
        skyMid = interpolateColor("#4b6cb7", "#2c3e50", t);
        skyBottom = interpolateColor("#FDB813", "#ff512f", t); // Yellow -> Deep Orange
        sunColor = interpolateColor("#FDB813", "#ff512f", t); // Sun turns orange
    }
    // 3. Pink Vibes (0.52 - 0.75)
    // "Night encroaching from top, pink vibes around setting yellow-orange sun"
    else if (progress < 0.75) {
        t = (progress - 0.52) / 0.23;
        skyTop = "#0f0c29"; // Steady Dark
        skyMid = interpolateColor("#2c3e50", "#2c1e4a", t); // Deep Purple mid
        skyBottom = interpolateColor("#ff512f", "#ff00cc", t); // Orange -> Hot Pink
        sunColor = interpolateColor("#ff512f", "#ff00cc", t); // Sun blends into the pink

        // Start lights early here
        nightProgress = t * 0.5;
    }
    // 4. Night (0.75 - 0.95)
    // "Orange goes, night kicks in... low street lamp glow"
    else if (progress < 0.95) {
        t = (progress - 0.75) / 0.20;
        skyTop = "#000000";
        skyMid = "#1a1a2e";
        skyBottom = interpolateColor("#ff00cc", "#2c1e4a", t); // Pink fades to Dark Purple glow
        sunColor = "#000000"; // Gone
        nightProgress = 0.5 + (t * 0.5); // 0.5 -> 1.0
    }
    // 5. Dawn (0.95 - 1.0)
    // "Dawn glow on horizon"
    else {
        t = (progress - 0.95) / 0.05;
        skyTop = interpolateColor("#000000", "#4b6cb7", t);
        skyMid = interpolateColor("#1a1a2e", "#87CEEB", t);
        skyBottom = interpolateColor("#2c1e4a", "#FDB813", t);
        sunColor = "#FDB813";
        nightProgress = 1 - t;
    }

    // --- Celestial Positions ---
    // Sun: Starts descending immediately. Sets by 0.75 (End of Pink Phase).
    let sunY = 400;
    if (progress < 0.75) {
        // 0.0 -> 0.75 moves from Top (60) to Horizon (350)
        const sunP = progress / 0.75;
        sunY = 60 + sunP * 340;
    }

    let moonY = -100;
    let moonOpacity = 0;
    // Moon rises at 0.75 (Night Start)
    if (progress > 0.75) {
        const moonP = (progress - 0.75) / 0.25;
        moonY = 50 + moonP * 150;
        moonOpacity = 1;
        if (moonP < 0.2) moonOpacity = moonP * 5;
    }

    return {
        skyTop, skyMid, skyBottom,
        sunColor,
        sunY,
        moonY,
        moonOpacity,
        nightProgress
    };
};

export const GameCanvas = ({ gameState, tick }: GameCanvasProps) => {
    const { player, obstacles } = gameState;
    const CITY_WIDTH = SCREEN_WIDTH * 2;

    // Identify Current Stage
    const currentStage = useMemo(() =>
        STAGES.find(s => s.id === gameState.stageId) || STAGES[0]
        , [gameState.stageId]);

    const currentTheme = getTheme(gameState.timeOfDay || 0, currentStage);

    // --- Background Assets ---

    // 1. City (Neon City)
    const cityDataBack = useMemo(() => {
        const path = Skia.Path.Make();
        path.moveTo(0, SCREEN_HEIGHT);
        const windows = [];
        let x = 0;
        while (x < CITY_WIDTH) {
            const width = 40 + Math.random() * 60;
            const height = 80 + Math.random() * 120;
            path.lineTo(x, SCREEN_HEIGHT - height);
            path.lineTo(x + width, SCREEN_HEIGHT - height);
            if (Math.random() > 0.3) {
                const rows = Math.floor(height / 15);
                const cols = Math.floor(width / 15);
                for (let r = 1; r < rows; r++) {
                    for (let c = 1; c < cols; c++) {
                        if (Math.random() > 0.4) {
                            windows.push({
                                x: x + c * 15 - 5,
                                y: SCREEN_HEIGHT - height + r * 15,
                                w: 6,
                                h: 8,
                                activationThreshold: Math.random()
                            });
                        }
                    }
                }
            }
            x += width;
        }
        path.lineTo(x, SCREEN_HEIGHT);
        path.close();
        return { path, windows };
    }, [CITY_WIDTH]);

    const cityDataFront = useMemo(() => {
        const path = Skia.Path.Make();
        path.moveTo(0, SCREEN_HEIGHT);
        const windows = [];
        let x = 0;
        while (x < CITY_WIDTH) {
            const width = 30 + Math.random() * 50;
            const height = 60 + Math.random() * 100;
            path.lineTo(x, SCREEN_HEIGHT - height);
            path.lineTo(x + width, SCREEN_HEIGHT - height);
            if (Math.random() > 0.3) {
                const rows = Math.floor(height / 12);
                const cols = Math.floor(width / 12);
                for (let r = 1; r < rows; r++) {
                    for (let c = 1; c < cols; c++) {
                        if (Math.random() > 0.5) {
                            windows.push({
                                x: x + c * 12 - 4,
                                y: SCREEN_HEIGHT - height + r * 12,
                                w: 5,
                                h: 7,
                                activationThreshold: Math.random()
                            });
                        }
                    }
                }
            }
            x += width;
        }
        path.lineTo(x, SCREEN_HEIGHT);
        path.close();
        return { path, windows };
    }, [CITY_WIDTH]);

    // 2. Mountains (Digital Landscape)
    const mountainsBack = useMemo(() => {
        const path = Skia.Path.Make();
        path.moveTo(0, SCREEN_HEIGHT);
        let x = 0;
        while (x < CITY_WIDTH) {
            const width = 150 + Math.random() * 100;
            const height = 100 + Math.random() * 150;
            path.lineTo(x + width / 2, SCREEN_HEIGHT - height);
            path.lineTo(x + width, SCREEN_HEIGHT);
            x += width;
        }
        path.close();
        return path;
    }, [CITY_WIDTH]);

    // 3. Moon Path
    const moonPath = useMemo(() => {
        const path = Skia.Path.Make();
        const s = 1.0;
        path.moveTo(0, -40 * s);
        path.cubicTo(
            40 * s, -40 * s,
            40 * s, 40 * s,
            0, 40 * s
        );
        path.cubicTo(
            20 * s, 20 * s,
            20 * s, -20 * s,
            0, -40 * s
        );
        path.close();
        return path;
    }, []);

    // Parallax Offsets
    const bgOffsetBack = -(gameState.distance * 0.1) % CITY_WIDTH;
    const bgOffsetFront = -(gameState.distance * 0.3) % CITY_WIDTH;

    // Helper to render backgrounds based on type
    const renderBackgroundLayers = () => {
        // --- STAGE 1 & 4: CITY ---
        if (currentStage.assets.backgroundType === 'city' || currentStage.assets.backgroundType === 'city_victory') {
            return (
                <>
                    <Group transform={[{ translateX: bgOffsetBack }]}>
                        <Path path={cityDataBack.path} color={COLOR_CITY_BACK} />
                        {cityDataBack.windows.map((w, i) => (
                            currentTheme.nightProgress > w.activationThreshold && (
                                <Rect key={`wb-${i}`} x={w.x} y={w.y} width={w.w} height={w.h} color="rgba(255, 255, 0, 0.3)" />
                            )
                        ))}
                    </Group>
                    <Group transform={[{ translateX: bgOffsetBack + CITY_WIDTH }]}>
                        <Path path={cityDataBack.path} color={COLOR_CITY_BACK} />
                        {cityDataBack.windows.map((w, i) => (
                            currentTheme.nightProgress > w.activationThreshold && (
                                <Rect key={`wb-rep-${i}`} x={w.x} y={w.y} width={w.w} height={w.h} color="rgba(255, 255, 0, 0.3)" />
                            )
                        ))}
                    </Group>

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
        }

        // --- STAGE 2: BEACH ---
        if (currentStage.assets.backgroundType === 'beach') {
            // Ocean horizon
            return (
                <>
                    <Rect x={0} y={SCREEN_HEIGHT - 80} width={SCREEN_WIDTH} height={80} color="#006994" />
                    {/* Placeholder for now */}
                </>
            );
        }

        // --- STAGE 3: MOUNTAINS ---
        if (currentStage.assets.backgroundType === 'mountains') {
            return (
                <>
                    <Group transform={[{ translateX: bgOffsetBack }]}>
                        <Path path={mountainsBack} color="#0f9b0f" style="stroke" strokeWidth={2} />
                    </Group>
                    <Group transform={[{ translateX: bgOffsetBack + CITY_WIDTH }]}>
                        <Path path={mountainsBack} color="#0f9b0f" style="stroke" strokeWidth={2} />
                    </Group>
                </>
            );
        }

        return null;
    };

    return (
        <Canvas style={{ flex: 1 }}>
            {/* 1. Dynamic Sky Gradient */}
            <Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
                <LinearGradient
                    start={vec(0, 0)}
                    end={vec(0, SCREEN_HEIGHT)}
                    colors={[currentTheme.skyTop, currentTheme.skyMid, currentTheme.skyBottom]}
                    positions={[0, 0.4, 0.8]}
                />
            </Rect>

            {/* 2a. Sun */}
            <Circle
                cx={SCREEN_WIDTH / 2}
                cy={currentTheme.sunY}
                r={60}
                color={currentTheme.sunColor}
            />

            {/* 2b. Moon */}
            {moonPath && (
                <Group
                    transform={[{ translateX: SCREEN_WIDTH / 2 }, { translateY: currentTheme.moonY }]}
                    opacity={currentTheme.moonOpacity}
                >
                    <Path path={moonPath} color={currentStage.theme.moonColor} />
                </Group>
            )}

            {/* 3 & 4. Background Layers (Dynamic) */}
            {renderBackgroundLayers()}

            {/* 5. Neon Ground */}
            <Rect
                x={0}
                y={SCREEN_HEIGHT - GROUND_HEIGHT}
                width={SCREEN_WIDTH}
                height={5}
                color={currentStage.theme.groundColor} // DYNAMIC GROUND COLOR
                opacity={0.6}
            />
            <Rect
                x={0}
                y={SCREEN_HEIGHT - GROUND_HEIGHT}
                width={SCREEN_WIDTH}
                height={2}
                color="white"
            />
            <Rect
                x={0}
                y={SCREEN_HEIGHT - GROUND_HEIGHT + 5}
                width={SCREEN_WIDTH}
                height={GROUND_HEIGHT}
                color="black"
            />

            {/* Victory Arch */}
            {(currentStage.courseLength - gameState.distance) + PLAYER_X > -200 && (currentStage.courseLength - gameState.distance) + PLAYER_X < SCREEN_WIDTH + 200 && (
                <Group>
                    {/* Inner Arch */}
                    <Path
                        path={`M ${(currentStage.courseLength - gameState.distance) + PLAYER_X - 40} ${SCREEN_HEIGHT - GROUND_HEIGHT} L ${(currentStage.courseLength - gameState.distance) + PLAYER_X - 40} ${SCREEN_HEIGHT - GROUND_HEIGHT - 70} C ${(currentStage.courseLength - gameState.distance) + PLAYER_X - 40} ${SCREEN_HEIGHT - GROUND_HEIGHT - 100} ${(currentStage.courseLength - gameState.distance) + PLAYER_X + 40} ${SCREEN_HEIGHT - GROUND_HEIGHT - 100} ${(currentStage.courseLength - gameState.distance) + PLAYER_X + 40} ${SCREEN_HEIGHT - GROUND_HEIGHT - 70} L ${(currentStage.courseLength - gameState.distance) + PLAYER_X + 40} ${SCREEN_HEIGHT - GROUND_HEIGHT}`}
                        style="stroke"
                        strokeWidth={5}
                        color="#00ffff"
                    />
                    {/* Glow */}
                    <Path
                        path={`M ${(currentStage.courseLength - gameState.distance) + PLAYER_X - 40} ${SCREEN_HEIGHT - GROUND_HEIGHT} L ${(currentStage.courseLength - gameState.distance) + PLAYER_X - 40} ${SCREEN_HEIGHT - GROUND_HEIGHT - 70} C ${(currentStage.courseLength - gameState.distance) + PLAYER_X - 40} ${SCREEN_HEIGHT - GROUND_HEIGHT - 100} ${(currentStage.courseLength - gameState.distance) + PLAYER_X + 40} ${SCREEN_HEIGHT - GROUND_HEIGHT - 100} ${(currentStage.courseLength - gameState.distance) + PLAYER_X + 40} ${SCREEN_HEIGHT - GROUND_HEIGHT - 70} L ${(currentStage.courseLength - gameState.distance) + PLAYER_X + 40} ${SCREEN_HEIGHT - GROUND_HEIGHT}`}
                        style="stroke"
                        strokeWidth={15}
                        color="#00ffff"
                        opacity={0.3}
                    />
                </Group>
            )}

            {/* Player */}
            <Stickman
                x={PLAYER_X}
                y={player.y}
                size={PLAYER_SIZE}
                tick={tick || 0}
                isGrounded={player.isGrounded}
                isRunning={gameState.gameStarted && !gameState.gameOver}
                status={gameState.stageStatus}
            />

            {/* Particles */}
            {gameState.particles.map(p => (
                <Rect
                    key={p.id}
                    x={p.x}
                    y={p.y}
                    width={p.size}
                    height={p.size}
                    color={p.color}
                    opacity={p.life}
                />
            ))}

            {/* Obstacles */}
            {obstacles.map((obs) => {
                const isPurple = obs.type === 'purple';
                const isHeart = obs.type === 'heart';

                let size = OBSTACLE_SIZE;
                let mainColor = COLOR_OBSTACLE;

                if (isPurple) {
                    size = OBSTACLE_SIZE_PURPLE;
                    mainColor = COLOR_OBSTACLE;
                } else if (isHeart) {
                    size = 30;
                    mainColor = "#ff00cc";
                }

                if (isHeart) {
                    return (
                        <Group key={obs.id}>
                            <Circle
                                cx={obs.x + size / 2}
                                cy={SCREEN_HEIGHT - GROUND_HEIGHT - size / 2}
                                r={size / 2 + 5}
                                color={mainColor}
                                opacity={0.3}
                            />
                            <Circle
                                cx={obs.x + size / 2}
                                cy={SCREEN_HEIGHT - GROUND_HEIGHT - size / 2}
                                r={size / 2}
                                color={mainColor}
                            />
                        </Group>
                    );
                }

                if (obs.type === 'boulder') {
                    return (
                        <Group key={obs.id}>
                            <Circle
                                cx={obs.x + size / 2}
                                cy={SCREEN_HEIGHT - GROUND_HEIGHT - size / 2}
                                r={size / 2}
                                color={COLOR_OBSTACLE}
                            />
                            <Circle
                                cx={obs.x + size / 2 - 5}
                                cy={SCREEN_HEIGHT - GROUND_HEIGHT - size / 2 - 5}
                                r={size / 4}
                                color="rgba(255,255,255,0.4)"
                            />
                        </Group>
                    );
                }

                return (
                    <Group key={obs.id}>
                        <Rect
                            x={obs.x - 4}
                            y={SCREEN_HEIGHT - GROUND_HEIGHT - size - 4}
                            width={size + 8}
                            height={size + 8}
                            color={obs.type === 'purple' ? COLOR_OBSTACLE_GLOW : COLOR_OBSTACLE_GLOW}
                            opacity={0.3}
                        />
                        <Rect
                            x={obs.x}
                            y={SCREEN_HEIGHT - GROUND_HEIGHT - size}
                            width={size}
                            height={size}
                            color={mainColor}
                        />
                    </Group>
                );
            })}
        </Canvas>
    );
};
