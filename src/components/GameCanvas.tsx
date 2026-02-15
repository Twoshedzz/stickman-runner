
import { Canvas, Circle, Group, LinearGradient, Mask, Path, Rect, vec } from "@shopify/react-native-skia";
import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
    COLOR_HP_DEEP, COLOR_OBSTACLE, COLOR_OBSTACLE_GLOW,
    GROUND_HEIGHT, OBSTACLE_SIZE, OBSTACLE_SIZE_PURPLE, OBSTACLE_SIZE_SMALL,
    PLAYER_SIZE, RUNNER_GROUND_Y, SCREEN_HEIGHT, SCREEN_WIDTH
} from "../game/constants";
import { STAGES, StageConfig } from "../game/stages";
import { GameState } from "../game/state";
import { Stickman } from "./Stickman";
import { NeonCityLayer, NeonCitySprites, useNeonCityData } from "./backgrounds/NeonCityBackground";
import { SynthwaveBeachBackground } from "./backgrounds/SynthwaveBeachBackground";
import { GridFloor } from "./GridFloor";

interface GameCanvasProps {
    gameState: GameState;
    tick?: number;
    /** Drawn width (default SCREEN_WIDTH). When > 600 on mobile, shows longer obstacle run-in; focus stays left 600. */
    viewWidth?: number;
}

const PLAYER_X = 50;

/** Ensure Skia always receives a valid color string (avoids JsiSkPaint/savePaint crashes on web). */
const safeColor = (c: unknown): string =>
    (typeof c === 'string' && c.length > 0) ? c : '#000000';

/** Ensure opacity is a number in 0–1. */
const safeOpacity = (o: unknown): number => {
    const n = Number(o);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
};

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
    // Stage 1 complete: always use day theme so background never resets to night on Continue screen
    if (stage.id === 'stage_1_city' && distance >= stage.courseLength) {
        return {
            skyTop: '#00b4db',
            skyMid: '#48c6ef',
            skyBottom: '#88defb',
            sunColor: '#FDB813',
            sunY: 120,
            moonY: -100,
            moonOpacity: 0,
            nightProgress: 0,
            lightsDwindle: 1,
        };
    }

    // Default / Fallback from static config
    let skyTop = stage.theme.skyColors[0];
    let skyMid = stage.theme.skyColors[1];
    let skyBottom = stage.theme.skyColors[2];
    let sunColor = stage.theme.sunColor;
    let sunY = -100; // Default off screen
    let moonY = -100;
    let moonOpacity = 0;
    let nightProgress = 0;
    let lightsDwindle = 0; // 0 = all on, 1 = all off (uniform turn-off order)

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
                    case 'night_lights_dwindle':
                        if (event.values.startOpacity !== undefined && event.values.endOpacity !== undefined) {
                            lightsDwindle = event.values.startOpacity + (event.values.endOpacity - event.values.startOpacity) * progress;
                        } else {
                            lightsDwindle = event.values.opacity !== undefined ? event.values.opacity : 0;
                        }
                        break;
                }
            }
        });
    }

    // Prevent city lights (and any dependent opacity) from flickering to full off on mobile when
    // distance is in a band where lights should be on (avoids brief 0 from timing/boundary glitches).
    if (stage.id === 'stage_1_city' && distance >= 3000 && distance < stage.courseLength) {
        nightProgress = Math.max(nightProgress, 0.02);
    }

    return {
        skyTop, skyMid, skyBottom,
        sunColor,
        sunY,
        moonY,
        moonOpacity,
        nightProgress,
        lightsDwindle
    };
};

export const GameCanvas = ({ gameState, tick, viewWidth: viewWidthProp }: GameCanvasProps) => {
    const { player, obstacles } = gameState;
    const viewWidth = viewWidthProp ?? SCREEN_WIDTH;

    const currentStage = useMemo(() =>
        STAGES.find(s => s.id === gameState.stageId) || STAGES[0]
        , [gameState.stageId]);

    const currentTheme = useMemo(
        () => getTheme(gameState.distance, currentStage),
        [gameState.distance, currentStage]
    );
    const neonCityData = useNeonCityData(gameState.stageId);
    const isCity = currentStage.assets.backgroundType === "city";

    const renderNonCityBackground = () => {
        switch (currentStage.assets.backgroundType) {
            case "beach":
                return <SynthwaveBeachBackground gameState={gameState} />;
            default:
                return null;
        }
    };

    return (
        <View style={[styles.container, { width: viewWidth }]}>
            <Canvas style={{ flex: 1 }}>
                {/* 1. Sky (back) */}
                <Rect x={0} y={0} width={viewWidth} height={SCREEN_HEIGHT}>
                    <LinearGradient
                        start={vec(0, 0)}
                        end={vec(0, SCREEN_HEIGHT)}
                        colors={[safeColor(currentTheme.skyTop), safeColor(currentTheme.skyMid), safeColor(currentTheme.skyBottom)]}
                    />
                </Rect>

                {/* 2. Sun */}
                <Circle cx={viewWidth / 2} cy={currentTheme.sunY} r={52} color={safeColor(currentTheme.sunColor)} />

                {/* 3. Moon - single bright circle so it’s always visible; stage 1 between 5k–25k distance */}
                {(() => {
                    const dist = gameState.distance;
                    const isStage1 = gameState.stageId === 'stage_1_city';
                    const inMoonRange = isStage1 && dist >= 5000 && dist < 32000;
                    if (!inMoonRange && currentTheme.moonOpacity <= 0) return null;
                    const mx = viewWidth * 0.72;
                    const t = inMoonRange ? (dist - 5000) / 27000 : 0;
                    // Move down from above screen (-80) to final position (300) over 5k–32k
                    const my = inMoonRange ? -80 + 380 * Math.min(1, Math.max(0, t)) : currentTheme.moonY;
                    // Fade in over first 5k of range so moon becomes clearer as night draws in
                    const moonOpacity = inMoonRange ? Math.min(1, (dist - 5000) / 5000) : currentTheme.moonOpacity;
                    if (my < -80 || my > SCREEN_HEIGHT + 60) return null;
                    const rMoon = 48;
                    const rBite = 40;
                    const biteOffset = 24;
                    return (
                        <Group opacity={safeOpacity(moonOpacity)}>
                            <Mask
                                mode="luminance"
                                mask={
                                    <Group>
                                        <Circle cx={mx} cy={my} r={rMoon} color="white" style="fill" />
                                        <Circle cx={mx + biteOffset} cy={my} r={rBite} color="black" style="fill" />
                                    </Group>
                                }
                            >
                                <Circle cx={mx} cy={my} r={rMoon} color="#FFFFFF" style="fill" />
                            </Mask>
                        </Group>
                    );
                })()}

                {/* 4 & 5. City: on web use texture-based sprites (fewer draw calls, avoids CanvasKit Aborted under load). */}
                {isCity && neonCityData && (
                    Platform.OS === 'web' ? (
                        <NeonCitySprites data={neonCityData} gameState={gameState} currentTheme={currentTheme} />
                    ) : (
                        <>
                            <NeonCityLayer layer="back" data={neonCityData.back} gameState={gameState} currentTheme={currentTheme} />
                            <NeonCityLayer layer="front" data={neonCityData.front} gameState={gameState} currentTheme={currentTheme} />
                        </>
                    )
                )}

                {/* 6. Non-city background (beach etc.) */}
                {!isCity && renderNonCityBackground()}

                {/* 6b. Grid floor (below pink line; perspective, moves only when running) */}
                <GridFloor gameState={gameState} courseLength={currentStage.courseLength} tick={tick} viewWidth={viewWidth} />

                {/* 7. Ground Line (thin pink line at top of grid) */}
                <Rect
                    x={0}
                    y={SCREEN_HEIGHT - GROUND_HEIGHT}
                    width={viewWidth}
                    height={2}
                    color={safeColor(currentStage.theme?.groundColor)}
                />

                {/* 8. Victory Arch (If near end) */}
                {(currentStage.courseLength - gameState.distance) + PLAYER_X > -200 && (currentStage.courseLength - gameState.distance) + PLAYER_X < viewWidth + 200 && (
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
                            opacity={safeOpacity(0.3)}
                        />
                    </Group>
                )}

                {/* 9. Obstacles */}
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
                    if (obs.type === 'small') size = OBSTACLE_SIZE_SMALL;
                    if (obs.type === 'purple') size = OBSTACLE_SIZE_PURPLE;
                    if (obs.type === 'heart') size = 30;

                    const y = RUNNER_GROUND_Y - size;

                    if (obs.type === 'heart') {
                        return <Circle key={obs.id} cx={obs.x + size / 2} cy={y + size / 2} r={size / 2} color={safeColor(color)} />;
                    }
                    if (isBoulder) {
                        return (
                            <Group key={obs.id}>
                                <Circle cx={obs.x + size / 2} cy={y + size / 2} r={size / 2} color={safeColor(color)} />
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
                                color={safeColor(glowColor)}
                                opacity={safeOpacity(0.4)}
                            />
                            {/* Inner Core */}
                            <Rect
                                x={obs.x}
                                y={y}
                                width={size}
                                height={size}
                                color={safeColor(color)}
                            />
                        </Group>
                    );
                })}

                {/* 10. Player (Stickman) */}
                <Stickman
                    x={PLAYER_X}
                    y={player.y}
                    size={PLAYER_SIZE}
                    tick={tick || 0}
                    isGrounded={player.isGrounded}
                    isRunning={gameState.gameStarted && !gameState.gameOver}
                    status={gameState.stageStatus}
                />

                {/* 11. Particles */}
                {gameState.particles.map(p => (
                    <Rect key={p.id} x={p.x} y={p.y} width={p.size} height={p.size} color={safeColor(p.color)} opacity={safeOpacity(p.life)} />
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
