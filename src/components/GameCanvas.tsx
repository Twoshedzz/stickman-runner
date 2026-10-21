
import { Canvas, Circle, Group, LinearGradient, Mask, Path, Rect, vec } from "@shopify/react-native-skia";
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
    COLOR_HP_DEEP, COLOR_OBSTACLE, COLOR_OBSTACLE_GLOW,
    GROUND_HEIGHT, HEART_SIZE, OVERHEAD_TOP_OFFSET,
    PLAYER_SIZE, RUNNER_GROUND_Y, SCREEN_HEIGHT, SCREEN_WIDTH
} from "../game/constants";
import { OBSTACLE_ART } from "../game/obstacleArt";
import { spriteFor } from "../game/obstacleCatalogue";
import { STAGES, StageConfig } from "../game/stages";
import { GameState } from "../game/state";
import { Stickman } from "./Stickman";
import { NeonCityScenery } from "./backgrounds/NeonCityScenery";
import { MidnightMountainsBackground } from "./backgrounds/MidnightMountainsBackground";
import { SynthwaveBeachBackground } from "./backgrounds/SynthwaveBeachBackground";
import { GridFloor } from "./GridFloor";

interface GameCanvasProps {
    gameState: GameState;
    tick?: number;
    /** Drawn width (default SCREEN_WIDTH). When > 600 on mobile, shows longer obstacle run-in; focus stays left 600. */
    viewWidth?: number;
    /** Called when stage background assets are ready (e.g. city strip images). Used for loading + countdown before start. */
    onAssetsReady?: () => void;
}

const PLAYER_X = 50;
/** Visual only: draw runner 5px higher so feet align with obstacle bottom. Physics/collision unchanged. */
const RUNNER_VISUAL_Y_OFFSET = -5;

/** Ensure Skia always receives a valid color string (avoids JsiSkPaint/savePaint crashes on web). */
const safeColor = (c: unknown): string =>
    (typeof c === 'string' && c.length > 0) ? c : '#000000';

/** Ensure opacity is a number in 0-1. */
const safeOpacity = (o: unknown): number => {
    const n = Number(o);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
};

/**
 * One obstacle, drawn exactly as the artwork describes it: a dark body, translucent facet
 * planes, a rim highlight clipped to the body, then the neon outlines on top.
 *
 * The drawing is stored in its own coordinate space and scaled here, so it stays crisp at
 * any size, and its colours are authored per stage rather than tinted by the game.
 */
const ObstacleArtwork = ({ artKey, x, y, width, height, swarm }: {
    artKey: string; x: number; y: number; width: number; height: number; swarm?: boolean;
}) => {
    const art = OBSTACLE_ART[artKey];
    if (!art) return null;
    // A swarm is sized by height so it fills the duck band; everything else by width.
    const scale = swarm ? height / art.height : width / art.width;

    return (
        <Group transform={[{ translateX: x }, { translateY: y }, { scale }]}>
            {art.ops.map((op, i) => {
                const node = op.fill ? (
                    <Path
                        path={op.d}
                        color={safeColor(op.fill)}
                        style="fill"
                        fillType={op.evenOdd ? "evenOdd" : "winding"}
                        opacity={op.opacity === undefined ? 1 : safeOpacity(op.opacity)}
                    />
                ) : (
                    <Path
                        path={op.d}
                        color={safeColor(op.stroke)}
                        style="stroke"
                        strokeWidth={op.strokeWidth ?? 3}
                        strokeJoin="round"
                        strokeCap="round"
                        opacity={op.opacity === undefined ? 1 : safeOpacity(op.opacity)}
                    />
                );

                // The rim highlight is clipped to the body so it never spills outside it.
                return op.clip && art.clip
                    ? <Group key={i} clip={art.clip}>{node}</Group>
                    : <React.Fragment key={i}>{node}</React.Fragment>;
            })}
        </Group>
    );
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

export const GameCanvas = ({ gameState, tick, viewWidth: viewWidthProp, onAssetsReady }: GameCanvasProps) => {
    const { player, obstacles } = gameState;
    const viewWidth = viewWidthProp ?? SCREEN_WIDTH;
    const gameOffsetX = (viewWidth - SCREEN_WIDTH) / 2;

    const currentStage = useMemo(() =>
        STAGES.find(s => s.id === gameState.stageId) || STAGES[0]
        , [gameState.stageId]);

    const currentTheme = useMemo(
        () => getTheme(gameState.distance, currentStage),
        [gameState.distance, currentStage]
    );
    const isCity = currentStage.assets.backgroundType === "city";

    // Hazards wear the stage's colours; stage 1's values match what it always used.
    const palette = currentStage.theme.obstacleColors ?? {
        block: COLOR_OBSTACLE, blockGlow: COLOR_OBSTACLE_GLOW,
        red: '#ff0040', redGlow: '#ff4d4d',
        purple: '#bf55ec', purpleGlow: '#e056fd',
        overhead: '#00ffff', overheadGlow: '#7df5ff',
    };

    // 0 = every window dark, 1 = fully lit. Lights come on through the night
    // (nightProgress) and go off again towards dawn (lightsDwindle).
    const cityLightLevel = Math.max(0, Math.min(1,
        currentTheme.nightProgress * (1 - (currentTheme.lightsDwindle ?? 0))
    ));

    // Non-city stages (e.g. beach) don't have async strip assets; signal ready immediately so countdown isn't blocked.
    useEffect(() => {
        if (onAssetsReady && !isCity) onAssetsReady();
    }, [onAssetsReady, isCity]);

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

                {/* 3. Moon - single bright circle so it’s always visible; stage 1 between 5k–32k distance */}
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
                    // Skip drawing when effectively invisible (avoids unnecessary Mask/Circle work)
                    if (moonOpacity <= 0.01) return null;
                    if (my < -80 || my > SCREEN_HEIGHT + 60) return null;
                    const rMoon = 48;
                    const rBite = 40;
                    const biteOffset = 24;
                    // No Group opacity: on mobile Group opacity can leak and make city/assets transparent. Use Circle opacity instead.
                    return (
                        <Mask
                            mode="luminance"
                            mask={
                                <Group>
                                    <Circle cx={mx} cy={my} r={rMoon} color="white" style="fill" />
                                    <Circle cx={mx + biteOffset} cy={my} r={rBite} color="black" style="fill" />
                                </Group>
                            }
                        >
                            <Circle cx={mx} cy={my} r={rMoon} color="#FFFFFF" style="fill" opacity={safeOpacity(moonOpacity)} />
                        </Mask>
                    );
                })()}

                {/* 4. Grid and ground line first; then city on top so buildings are never clipped by the line. */}
                <GridFloor gameState={gameState} courseLength={currentStage.courseLength} tick={tick} viewWidth={viewWidth} gridColor={currentStage.theme?.gridColor} />
                <Rect
                    x={0}
                    y={SCREEN_HEIGHT - GROUND_HEIGHT}
                    width={viewWidth}
                    height={2}
                    color={safeColor(currentStage.theme?.groundColor)}
                />

                {/* 5 & 6. City / non-city: drawn after grid + ground line so buildings render on top (no clip; city content is already above grid). */}
                {isCity && (
                    <NeonCityScenery
                        distance={gameState.distance}
                        lightLevel={cityLightLevel}
                        viewWidth={viewWidth}
                        onAssetsReady={onAssetsReady}
                    />
                )}
                {/* Scenery is written inline rather than returned from a helper: with the React
                    Compiler on, a helper's result gets cached and the background stops scrolling. */}
                {currentStage.assets.backgroundType === "beach" && (
                    <SynthwaveBeachBackground gameState={gameState} />
                )}
                {currentStage.assets.backgroundType === "mountains" && (
                    <MidnightMountainsBackground distance={gameState.distance} viewWidth={viewWidth} />
                )}

                {/* 8. Victory Arch (If near end) - 600 zone centered via gameOffsetX */}
                {(() => {
                    const archLeft = (currentStage.courseLength - gameState.distance) + PLAYER_X - 40;
                    const archRight = (currentStage.courseLength - gameState.distance) + PLAYER_X + 40;
                    const gY = SCREEN_HEIGHT - GROUND_HEIGHT;
                    if (archLeft <= -200 || archRight >= SCREEN_WIDTH + 200) return null;
                    return (
                        <Group>
                            <Path
                                path={`M ${archLeft + gameOffsetX} ${gY} L ${archLeft + gameOffsetX} ${gY - 70} C ${archLeft + gameOffsetX} ${gY - 100} ${archRight + gameOffsetX} ${gY - 100} ${archRight + gameOffsetX} ${gY - 70} L ${archRight + gameOffsetX} ${gY}`}
                                style="stroke"
                                strokeWidth={5}
                                color="#00ffff"
                            />
                            <Path
                                path={`M ${archLeft + gameOffsetX} ${gY} L ${archLeft + gameOffsetX} ${gY - 70} C ${archLeft + gameOffsetX} ${gY - 100} ${archRight + gameOffsetX} ${gY - 100} ${archRight + gameOffsetX} ${gY - 70} L ${archRight + gameOffsetX} ${gY}`}
                                style="stroke"
                                strokeWidth={15}
                                color="#00ffff"
                                opacity={safeOpacity(0.3)}
                            />
                        </Group>
                    );
                })()}

                {/* 9. Obstacles. The drawing is the hitbox, so what you see is what you hit. */}
                {obstacles.map(obs => {
                    const role = obs.role ?? 'small';
                    const drawX = obs.x + gameOffsetX;

                    // Hearts keep the same pink everywhere: a pickup that changed colour per
                    // stage would stop reading as "this one helps you".
                    if (role === 'heart') {
                        const heartY = RUNNER_GROUND_Y - HEART_SIZE;
                        return (
                            <Circle
                                key={obs.id}
                                cx={drawX + HEART_SIZE / 2}
                                cy={heartY + HEART_SIZE / 2}
                                r={HEART_SIZE / 2}
                                color={safeColor(COLOR_HP_DEEP)}
                            />
                        );
                    }

                    const art = spriteFor(gameState.stageId, obs.sprite ?? 0);
                    // Swarms hang in the air; everything else stands on the ground.
                    const y = art.overhead
                        ? RUNNER_GROUND_Y - OVERHEAD_TOP_OFFSET
                        : RUNNER_GROUND_Y - art.height;

                    if (!art.art) {
                        // No drawing for this stage yet: a plain block, so an obstacle is
                        // never invisible - being hit by something you can't see is unfair.
                        return (
                            <Rect key={obs.id} x={drawX} y={y}
                                  width={art.width} height={art.height}
                                  color={safeColor(palette.block)} opacity={safeOpacity(0.85)} />
                        );
                    }

                    return (
                        <ObstacleArtwork
                            key={obs.id}
                            artKey={art.art}
                            x={drawX} y={y}
                            width={art.width} height={art.height}
                            swarm={art.overhead}
                        />
                    );
                })}

                {/* 10. Player (Stickman) - left of 600 zone; visual y -5 so feet align with obstacles */}
                <Stickman
                    x={PLAYER_X + gameOffsetX}
                    y={player.y + RUNNER_VISUAL_Y_OFFSET}
                    size={PLAYER_SIZE}
                    animationTimeSec={gameState.elapsedSecInStage ?? 0}
                    isGrounded={player.isGrounded}
                    isDucking={player.isDucking}
                    isRunning={gameState.gameStarted && !gameState.gameOver}
                    status={gameState.stageStatus}
                />

                {/* 11. Particles (600 zone centered) */}
                {gameState.particles.map(p => (
                    <Rect key={p.id} x={p.x + gameOffsetX} y={p.y} width={p.size} height={p.size} color={safeColor(p.color)} opacity={safeOpacity(p.life)} />
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
