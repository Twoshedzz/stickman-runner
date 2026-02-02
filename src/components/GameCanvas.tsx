import { Canvas, Circle, Group, LinearGradient, Path, Rect, Skia, vec } from "@shopify/react-native-skia";
import React, { useMemo } from 'react';
import {
    COLOR_CITY_BACK, COLOR_CITY_FRONT, COLOR_GROUND_NEON, COLOR_OBSTACLE,
    COLOR_OBSTACLE_GLOW, GROUND_HEIGHT, OBSTACLE_SIZE, OBSTACLE_SIZE_PURPLE,
    PLAYER_SIZE, SCREEN_HEIGHT, SCREEN_WIDTH,
    THEME_DAY, THEME_NIGHT, THEME_SUNRISE, THEME_SUNSET,
    TIME_CYCLE_DURATION
} from "../game/constants";
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

const getTheme = (time: number) => {
    // Cycle: 0.0 (Sunrise) -> 1.0 (End of Night)
    const progress = (time % TIME_CYCLE_DURATION) / TIME_CYCLE_DURATION;

    let targetFrom, targetTo, t;
    let nightProgress = 0; // 0 = Day, 1 = Full Night (for city lights)

    // --- Color & Lighting Cycle ---
    if (progress < 0.15) { // Sunrise -> Day (Short)
        targetFrom = THEME_SUNRISE;
        targetTo = THEME_DAY;
        t = progress / 0.15;
    } else if (progress < 0.25) { // Day (Peak) - Very Short!
        targetFrom = THEME_DAY;
        targetTo = THEME_DAY;
        t = 0;
    } else if (progress < 0.60) { // Day -> Sunset (Long Transition)
        targetFrom = THEME_DAY;
        targetTo = THEME_SUNSET;
        t = (progress - 0.25) / 0.35;
    } else if (progress < 0.70) { // Sunset -> Night
        targetFrom = THEME_SUNSET;
        targetTo = THEME_NIGHT;
        t = (progress - 0.60) / 0.10;
        nightProgress = t; // Lights turn on
    } else if (progress < 0.95) { // Night (Long Stable)
        targetFrom = THEME_NIGHT;
        targetTo = THEME_NIGHT;
        t = 0;
        nightProgress = 1;
    } else { // Night -> Sunrise (Dawn)
        targetFrom = THEME_NIGHT;
        targetTo = THEME_SUNRISE;
        t = (progress - 0.95) / 0.05;
        nightProgress = 1 - t; // Lights off
    }

    const skyTop = interpolateColor(targetFrom.skyTop, targetTo.skyTop, t);
    const skyMid = interpolateColor(targetFrom.skyMid, targetTo.skyMid, t);
    const skyBottom = interpolateColor(targetFrom.skyBottom, targetTo.skyBottom, t);
    const sunColor = interpolateColor(targetFrom.sun, targetTo.sun, t);

    // --- Celestial Positions ---

    // Sun: Rise (0-0.15), Top (0.15-0.25), Set (0.25-0.60)
    let sunY = 400;
    if (progress < 0.15) {
        sunY = 300 - (progress / 0.15) * 240; // Rise to 60
    } else if (progress < 0.25) {
        sunY = 60; // Peak
    } else if (progress < 0.60) {
        sunY = 60 + ((progress - 0.25) / 0.35) * 290; // Set to 350
    }

    // Moon: Hidden until 0.60, Descend 0.60 -> 1.0
    let moonY = -100;
    let moonOpacity = 0;
    if (progress > 0.60) {
        // Descend from Top (50) to Horizon (200)
        // 0.60 -> 50
        // 1.0 -> 250
        const moonP = (progress - 0.60) / 0.40;
        moonY = 50 + moonP * 200;
        moonOpacity = 1;
        if (moonP < 0.1) moonOpacity = moonP * 10; // Fade in
        if (moonP > 0.9) moonOpacity = (1 - moonP) * 10; // Fade out
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

    const currentTheme = getTheme(gameState.timeOfDay || 0);

    // Procedural City & Windows
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

            // Generate Windows
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
                                activationThreshold: Math.random() // Unique threshold for gradual lighting
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
            // Generate Windows
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

    // Crescent Moon Path (Manual Construction)
    const moonPath = useMemo(() => {
        const path = Skia.Path.Make();
        // Scale factor
        const s = 1.0;

        path.moveTo(0, -40 * s);
        // Outer Curve (Right)
        path.cubicTo(
            40 * s, -40 * s,
            40 * s, 40 * s,
            0, 40 * s
        );
        // Inner Curve (Left) - Creating the crescent hollow
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

            {/* 2a. Sun (Independent of Moon) */}
            <Circle
                cx={SCREEN_WIDTH / 2}
                cy={currentTheme.sunY}
                r={60}
                color={currentTheme.sunColor}
            />

            {/* 2b. Moon (Manual Path) */}
            {moonPath && (
                <Group
                    transform={[{ translateX: SCREEN_WIDTH / 2 }, { translateY: currentTheme.moonY }]}
                    opacity={currentTheme.moonOpacity}
                >
                    <Path path={moonPath} color="#FEFCD7" />
                </Group>
            )}

            {/* 3. Parallax Cityscape (Back) */}
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

            {/* 4. Parallax Cityscape (Front) */}
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


            {/* 5. Neon Ground - Simplified for Performance */}
            <Rect
                x={0}
                y={SCREEN_HEIGHT - GROUND_HEIGHT}
                width={SCREEN_WIDTH}
                height={5} // Neon Line
                color={COLOR_GROUND_NEON}
                opacity={0.6} // Simple transparency instead of blur
            />
            <Rect
                x={0}
                y={SCREEN_HEIGHT - GROUND_HEIGHT} // Sharp core
                width={SCREEN_WIDTH}
                height={2}
                color="white"
            />
            <Rect
                x={0}
                y={SCREEN_HEIGHT - GROUND_HEIGHT + 5}
                width={SCREEN_WIDTH}
                height={GROUND_HEIGHT}
                color="black" // Solid ground below line
            />

            {/* Player */}
            <Stickman
                x={PLAYER_X}
                y={player.y}
                size={PLAYER_SIZE}
                tick={tick || 0}
                isGrounded={player.isGrounded}
                isRunning={gameState.gameStarted && !gameState.gameOver}
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
                            {/* Simple Glow Halo (No Blur) */}
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
                        {/* Simple Glow Border (No Blur) */}
                        <Rect
                            x={obs.x - 4}
                            y={SCREEN_HEIGHT - GROUND_HEIGHT - size - 4}
                            width={size + 8}
                            height={size + 8}
                            color={obs.type === 'purple' ? COLOR_OBSTACLE_GLOW : COLOR_OBSTACLE_GLOW}
                            opacity={0.3}
                        />
                        {/* Main Block */}
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
