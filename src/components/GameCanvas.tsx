
import { Canvas, Circle, Group, LinearGradient, Path, Rect, vec } from "@shopify/react-native-skia";
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
    COLOR_HP_DEEP, COLOR_OBSTACLE, COLOR_OBSTACLE_GLOW,
    GROUND_HEIGHT, OBSTACLE_SIZE, OBSTACLE_SIZE_PURPLE,
    PLAYER_SIZE, SCREEN_HEIGHT, SCREEN_WIDTH
} from "../game/constants";
import { STAGES, StageConfig } from "../game/stages";
import { GameState } from "../game/state";
import { Stickman } from "./Stickman";
import { NeonCityBackground } from "./backgrounds/NeonCityBackground";
import { SynthwaveBeachBackground } from "./backgrounds/SynthwaveBeachBackground";

interface GameCanvasProps {
    gameState: GameState;
    tick?: number;
}

const PLAYER_X = 50;

// Helper: Hex Color Interpolation
const lerpColor = (color1: string, color2: string, factor: number) => {
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

const getTheme = (distance: number, stage: StageConfig) => {
    // Default / Fallback from static config
    let skyTop = stage.theme.skyColors[0];
    let skyMid = stage.theme.skyColors[1];
    let skyBottom = stage.theme.skyColors[2];
    let sunColor = stage.theme.sunColor;
    let sunY = -100; // Default off screen
    let moonY = -100;
    let moonOpacity = 0;
    let nightProgress = 0;

    if (stage.timeline) {
        stage.timeline.forEach(event => {
            // Calculate Start/End Distances (Support Negative "From End" Syntax)
            let start = event.trigger.start >= 0 ? event.trigger.start : stage.courseLength + event.trigger.start;
            let end = event.trigger.end >= 0 ? event.trigger.end : stage.courseLength + event.trigger.end;

            // If end is -1 (or any special "until end"), clamp to course length
            if (event.trigger.end === -1) end = stage.courseLength;

            // Check if active
            if (distance >= start && distance <= end) {
                const totalDist = end - start;
                const progress = totalDist > 0 ? (distance - start) / totalDist : 1;

                switch (event.type) {
                    case 'sky_gradient':
                        if (event.values.startColor && event.values.endColor) {
                            const sC = event.values.startColor as string[];
                            const eC = event.values.endColor as string[];
                            skyTop = lerpColor(sC[0], eC[0], progress);
                            skyMid = lerpColor(sC[1], eC[1], progress);
                            skyBottom = lerpColor(sC[2], eC[2], progress);
                        }
                        break;
                    case 'celestial_sun':
                        if (event.values.startY !== undefined && event.values.endY !== undefined) {
                            sunY = event.values.startY + (event.values.endY - event.values.startY) * progress;
                        }
                        if (event.values.startColor && event.values.endColor) {
                            sunColor = lerpColor(event.values.startColor as string, event.values.endColor as string, progress);
                        }
                        break;
                    case 'celestial_moon':
                        if (event.values.startY !== undefined && event.values.endY !== undefined) {
                            moonY = event.values.startY + (event.values.endY - event.values.startY) * progress;
                        }
                        moonOpacity = event.values.opacity !== undefined ? event.values.opacity : 1;
                        break;
                    case 'night_lights':
                        if (event.values.startOpacity !== undefined && event.values.endOpacity !== undefined) {
                            nightProgress = event.values.startOpacity + (event.values.endOpacity - event.values.startOpacity) * progress;
                        } else {
                            nightProgress = event.values.opacity !== undefined ? event.values.opacity : 0;
                        }
                        break;
                }
            }
        });
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

    // Identify Current Stage
    const currentStage = useMemo(() =>
        STAGES.find(s => s.id === gameState.stageId) || STAGES[0]
        , [gameState.stageId]);

    const currentTheme = getTheme(gameState.distance, currentStage);

    // --- Background Selection ---
    const renderBackground = () => {
        switch (currentStage.assets.backgroundType) {
            case 'city':
                return <NeonCityBackground gameState={gameState} currentTheme={currentTheme} />;
            case 'beach':
                return <SynthwaveBeachBackground gameState={gameState} />;
            /* 
            case 'mountains':
                return <DigitalMountainsBackground gameState={gameState} />;
            case 'city_victory':
                return <VictoryCityBackground gameState={gameState} />;
            */
            default:
                return <NeonCityBackground gameState={gameState} currentTheme={currentTheme} />;
        }
    };

    return (
        <View style={styles.container}>
            <Canvas style={{ flex: 1 }}>

                {/* 1. Dynamic Heaven/Sky */}
                <Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
                    <LinearGradient
                        start={vec(0, 0)}
                        end={vec(0, SCREEN_HEIGHT)}
                        colors={[currentTheme.skyTop, currentTheme.skyMid, currentTheme.skyBottom]}
                    />
                </Rect>

                {/* 2. Celestials (Sun/Moon) */}
                {/* Sun - Solid Color per user request */}
                <Circle cx={SCREEN_WIDTH / 2} cy={currentTheme.sunY} r={52} color={currentTheme.sunColor} />

                {/* Moon - Crescent */}
                {currentTheme.moonOpacity > 0 && (
                    <Group transform={[{ translateX: SCREEN_WIDTH * 0.8 }, { translateY: currentTheme.moonY }]}>
                        <Path
                            path="M 0 -30 A 30 30 0 1 0 0 30 A 25 25 0 1 1 0 -30"
                            color={`rgba(255, 255, 255, ${currentTheme.moonOpacity})`}
                            style="fill"
                        />
                    </Group>
                )}

                {/* 3. Stage-Specific Background */}
                {renderBackground()}

                {/* 4. Ground Line */}
                <Rect
                    x={0}
                    y={SCREEN_HEIGHT - GROUND_HEIGHT}
                    width={SCREEN_WIDTH}
                    height={4}
                    color={currentStage.theme.groundColor}
                />

                {/* 5. Victory Arch (If near end) */}
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

                {/* 6. Obstacles */}
                {obstacles.map(obs => {
                    const isBoulder = obs.type === 'boulder';
                    let color = COLOR_OBSTACLE;
                    let glowColor = COLOR_OBSTACLE_GLOW; // Default Orange/Gold for Yellow blocks

                    if (obs.type === 'red') {
                        color = '#ff0040';
                        glowColor = '#ff4d4d';
                    }
                    if (obs.type === 'purple') {
                        color = '#bf55ec';
                        glowColor = '#e056fd';
                    }
                    if (obs.type === 'boulder') color = COLOR_OBSTACLE;
                    if (obs.type === 'heart') color = COLOR_HP_DEEP;

                    let size = OBSTACLE_SIZE;
                    if (obs.type === 'purple') size = OBSTACLE_SIZE_PURPLE;
                    if (obs.type === 'heart') size = 30;

                    const y = SCREEN_HEIGHT - GROUND_HEIGHT - size;

                    if (obs.type === 'heart') {
                        return <Circle key={obs.id} cx={obs.x + size / 2} cy={y + size / 2} r={size / 2} color={color} />;
                    }
                    if (isBoulder) {
                        return (
                            <Group key={obs.id}>
                                <Circle cx={obs.x + size / 2} cy={y + size / 2} r={size / 2} color={color} />
                                <Circle cx={obs.x + size / 2 - 5} cy={y + size / 2 - 5} r={size / 4} color="rgba(0,0,0,0.2)" />
                            </Group>
                        );
                    }

                    return (
                        <Group key={obs.id}>
                            {/* Outer Glow */}
                            <Rect
                                x={obs.x - 4}
                                y={y - 4}
                                width={size + 8}
                                height={size + 8}
                                color={glowColor}
                                opacity={0.4}
                            />
                            {/* Inner Core */}
                            <Rect
                                x={obs.x}
                                y={y}
                                width={size}
                                height={size}
                                color={color}
                            />
                        </Group>
                    );
                })}

                {/* 7. Player (Stickman) */}
                <Stickman
                    x={PLAYER_X}
                    y={player.y}
                    size={PLAYER_SIZE}
                    tick={tick || 0}
                    isGrounded={player.isGrounded}
                    isRunning={gameState.gameStarted && !gameState.gameOver}
                    status={gameState.stageStatus}
                />

                {/* 8. Particles */}
                {gameState.particles.map(p => (
                    <Rect key={p.id} x={p.x} y={p.y} width={p.size} height={p.size} color={p.color} opacity={p.life} />
                ))}

            </Canvas>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: 'black',
    },
});
