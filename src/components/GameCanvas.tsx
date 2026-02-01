import { BlurMask, Canvas, Circle, Group, LinearGradient, Path, Rect, Skia, vec } from "@shopify/react-native-skia";
import React, { useMemo } from 'react';
import { COLOR_CITY_BACK, COLOR_CITY_FRONT, COLOR_GROUND_NEON, COLOR_OBSTACLE, COLOR_OBSTACLE_GLOW, COLOR_SKY_BOTTOM, COLOR_SKY_MID, COLOR_SKY_TOP, COLOR_SUN, GROUND_HEIGHT, OBSTACLE_SIZE, OBSTACLE_SIZE_PURPLE, PLAYER_SIZE, SCREEN_HEIGHT, SCREEN_WIDTH } from "../game/constants";
import { GameState } from "../game/state";
import { Stickman } from "./Stickman";

interface GameCanvasProps {
    gameState: GameState;
    tick?: number;
}

const PLAYER_X = 50;

export const GameCanvas = ({ gameState, tick }: GameCanvasProps) => {
    const { player, obstacles } = gameState;

    const CITY_WIDTH = SCREEN_WIDTH * 2;

    // Procedural City Generation (Simple jagged line)
    const cityPathBack = useMemo(() => {
        const path = Skia.Path.Make();
        path.moveTo(0, SCREEN_HEIGHT);
        let x = 0;
        while (x < CITY_WIDTH) {
            const width = 40 + Math.random() * 60; // Wider buildings
            const height = 80 + Math.random() * 120; // 80-200 (Mid-range)
            path.lineTo(x, SCREEN_HEIGHT - height);
            path.lineTo(x + width, SCREEN_HEIGHT - height);
            x += width;
        }
        path.lineTo(x, SCREEN_HEIGHT);
        path.close();
        return path;
    }, [CITY_WIDTH]);

    const cityPathFront = useMemo(() => {
        const path = Skia.Path.Make();
        path.moveTo(0, SCREEN_HEIGHT);
        let x = 0;
        while (x < CITY_WIDTH) {
            const width = 30 + Math.random() * 50;
            const height = 60 + Math.random() * 100; // 60-160 (Mid-range)
            path.lineTo(x, SCREEN_HEIGHT - height);
            path.lineTo(x + width, SCREEN_HEIGHT - height);
            x += width;
        }
        path.lineTo(x, SCREEN_HEIGHT);
        path.close();
        return path;
    }, [CITY_WIDTH]);

    // Parallax Offsets (Looping over CITY_WIDTH)
    const bgOffsetBack = -(gameState.distance * 0.1) % CITY_WIDTH;
    const bgOffsetFront = -(gameState.distance * 0.3) % CITY_WIDTH;

    return (
        <Canvas style={{ flex: 1 }}>
            {/* 1. Sky Gradient (3-Color Fade) - Pink reaches higher */}
            <Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
                <LinearGradient
                    start={vec(0, 0)}
                    end={vec(0, SCREEN_HEIGHT)}
                    colors={[COLOR_SKY_TOP, COLOR_SKY_MID, COLOR_SKY_BOTTOM]}
                    positions={[0, 0.4, 0.8]}
                />
            </Rect>

            {/* 2. Retro Sun (Sharp) */}
            <Circle cx={SCREEN_WIDTH / 2} cy={SCREEN_HEIGHT - 100} r={60} color={COLOR_SUN} />

            {/* 3. Parallax Cityscape (Back) */}
            <Path path={cityPathBack} color={COLOR_CITY_BACK} transform={[{ translateX: bgOffsetBack }]} />
            <Path path={cityPathBack} color={COLOR_CITY_BACK} transform={[{ translateX: bgOffsetBack + CITY_WIDTH }]} />

            {/* 4. Parallax Cityscape (Front) */}
            <Path path={cityPathFront} color={COLOR_CITY_FRONT} transform={[{ translateX: bgOffsetFront }]} />
            <Path path={cityPathFront} color={COLOR_CITY_FRONT} transform={[{ translateX: bgOffsetFront + CITY_WIDTH }]} />

            {/* 5. Neon Ground */}
            <Rect
                x={0}
                y={SCREEN_HEIGHT - GROUND_HEIGHT}
                width={SCREEN_WIDTH}
                height={5} // Neon Line
                color={COLOR_GROUND_NEON}
            >
                <BlurMask blur={4} style="normal" />
            </Rect>
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

            {/* Obstacles */}
            {obstacles.map((obs) => {
                const isPurple = obs.type === 'purple';
                const isHeart = obs.type === 'heart';

                let size = OBSTACLE_SIZE;
                // Default: Yellow Glow
                let mainColor = COLOR_OBSTACLE;
                let glowColor = COLOR_OBSTACLE_GLOW;

                if (isPurple) {
                    size = OBSTACLE_SIZE_PURPLE; // Smaller
                    mainColor = COLOR_OBSTACLE; // Still Yellow
                    glowColor = COLOR_OBSTACLE_GLOW;
                } else if (isHeart) {
                    size = 30; // Heart size
                    mainColor = "#ff00cc"; // Hotpink
                    glowColor = "#ff00cc";
                }

                if (isHeart) {
                    // Render simple Circle for heart
                    return (
                        <Group key={obs.id}>
                            <Circle
                                cx={obs.x + size / 2}
                                cy={SCREEN_HEIGHT - GROUND_HEIGHT - size / 2}
                                r={size / 2}
                                color={glowColor}
                            >
                                <BlurMask blur={5} style="normal" />
                            </Circle>
                            <Circle
                                cx={obs.x + size / 2}
                                cy={SCREEN_HEIGHT - GROUND_HEIGHT - size / 2}
                                r={size / 2}
                                color={mainColor}
                            />
                        </Group>
                    );
                }

                return (
                    <Group key={obs.id}>
                        {/* Glow Layer */}
                        <Rect
                            x={obs.x}
                            y={SCREEN_HEIGHT - GROUND_HEIGHT - size}
                            width={size}
                            height={size}
                            color={glowColor}
                        >
                            <BlurMask blur={8} style="normal" />
                        </Rect>
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
