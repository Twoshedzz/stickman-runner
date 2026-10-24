
import { Canvas, Circle, Group, LinearGradient, Mask, Oval, Path, Rect, Skia, vec } from "@shopify/react-native-skia";
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
    BASE_SPEED, COLOR_HP_DEEP, HIT_GRACE_SEC, COLOR_OBSTACLE, COLOR_OBSTACLE_GLOW,
    GROUND_HEIGHT, HEART_SIZE, OVERHEAD_TOP_OFFSET,
    PLAYER_SIZE, RUNNER_GROUND_Y, SCREEN_HEIGHT, SCREEN_WIDTH
} from "../game/constants";
import { pulseBand } from "../game/beatPulse";
import { shapeFor } from "../game/obstacleCatalogue";
import { PICKUP_RADIUS } from "../game/pickups";
import { remainingScroll, STAGES, StageConfig } from "../game/stages";
import { GameState } from "../game/state";
import { Box3D, Sphere3D } from "./Obstacle3D";
import { Stickman } from "./Stickman";
import { NeonCityScenery } from "./backgrounds/NeonCityScenery";
import { MidnightMountainsBackground } from "./backgrounds/MidnightMountainsBackground";
import { SunsetBeachBackground } from "./backgrounds/SunsetBeachBackground";
import { VictoryDawnBackground } from "./backgrounds/VictoryDawnBackground";
import { FinishLineBehind, FinishLineFront } from "./FinishLine";
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
/**
 * A solid heart filling a HEART_SIZE box (30 wide, its point resting on the bottom edge).
 * Made into a Skia path once, inside the component: on web Skia isn't ready at module load.
 */
/** Half the height of a hole: a circle on the floor, flattened to the grid's perspective. */
const HOLE_RY = 8;

/**
 * While the runner drops into a hole, he's only drawn above the floor and inside the hole:
 * everything above the running line, plus the near half of the hole's opening. The floor
 * in front of the hole hides the rest of him as he goes down.
 */
const fallClip = (viewWidth: number, cx: number, rx: number) => {
    const cy = RUNNER_GROUND_Y;
    return `M 0 0 H ${viewWidth} V ${cy} H ${cx + rx} A ${rx} ${HOLE_RY} 0 0 1 ${cx - rx} ${cy} H 0 Z`;
};

const HEART_SVG = 'M15 30 C6 23 0 17.5 0 10.5 C0 5.5 3.8 2 8.2 2 C11 2 13.5 3.5 15 6 C16.5 3.5 19 2 21.8 2 C26.2 2 30 5.5 30 10.5 C30 17.5 24 23 15 30 Z';

/** Ensure Skia always receives a valid color string (avoids JsiSkPaint/savePaint crashes on web). */
const safeColor = (c: unknown): string =>
    (typeof c === 'string' && c.length > 0) ? c : '#000000';

/** Ensure opacity is a number in 0-1. */
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

/** How long the pink flash lasts when the runner is hit. */
const HIT_FLASH_SEC = 0.18;

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

    const heartPath = useMemo(() => Skia.Path.MakeFromSVGString(HEART_SVG)!, []);
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
    const pickupColors = currentStage.theme.pickupColors;
    // The beat pulse rolls up the floor while a stage is being played (not paused or over).
    const beatPulseBand = gameState.gameStarted && !gameState.gameOver && !gameState.paused && gameState.stageStatus === 'playing'
        ? pulseBand(currentStage, gameState.elapsedSecInStage)
        : null;
    const holeRx = shapeFor('hole').width / 2;
    const fallingInto = player.falling > 0 ? gameState.obstacles.find(o => o.id === player.fallHoleId) : undefined;
    const runnerClip = player.falling > 0
        ? fallClip(viewWidth, fallingInto ? fallingInto.x + gameOffsetX + holeRx : PLAYER_X + gameOffsetX + PLAYER_SIZE / 2, holeRx)
        : undefined;

    // Where the finish line crosses the runner's depth. It reaches the runner a quarter of a
    // second before the stage ends, so they finish standing just past it rather than on it.
    const RUN_THROUGH = 60;
    const finishX = remainingScroll(currentStage, gameState.stageProgress)
        + PLAYER_X + PLAYER_SIZE / 2 - RUN_THROUGH + gameOffsetX;
    const showFinish = finishX > -400 && finishX < viewWidth + 400;

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
                <GridFloor
                    gameState={gameState}
                    tick={tick}
                    glow={player.landGlow}
                    glowX={PLAYER_X + PLAYER_SIZE / 2 + gameOffsetX}
                    glowY={RUNNER_GROUND_Y} viewWidth={viewWidth} gridColor={currentStage.theme?.gridColor}
                    pulse={beatPulseBand} />
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
                        distance={gameState.scroll}
                        lightLevel={cityLightLevel}
                        viewWidth={viewWidth}
                        onAssetsReady={onAssetsReady}
                    />
                )}
                {/* Scenery is written inline rather than returned from a helper: with the React
                    Compiler on, a helper's result gets cached and the background stops scrolling. */}
                {currentStage.assets.backgroundType === "beach" && (
                    <SunsetBeachBackground
                        distance={gameState.scroll}
                        seconds={gameState.elapsedSecInStage}
                        progress={gameState.stageProgress}
                        skyTop={currentTheme.skyTop}
                        skyMid={currentTheme.skyMid}
                        skyBottom={currentTheme.skyBottom}
                        viewWidth={viewWidth}
                    />
                )}
                {currentStage.assets.backgroundType === "mountains" && (
                    <MidnightMountainsBackground
                        distance={gameState.scroll}
                        progress={gameState.stageProgress}
                        viewWidth={viewWidth}
                    />
                )}
                {currentStage.assets.backgroundType === "city_victory" && (
                    <VictoryDawnBackground
                        distance={gameState.scroll}
                        seconds={gameState.elapsedSecInStage}
                        progress={gameState.stageProgress}
                        viewWidth={viewWidth}
                    />
                )}

                {/* 8. Finish line, far side: the runner is drawn in front of this part. */}
                {showFinish && (
                    <FinishLineBehind
                        lineX={finishX}
                        viewWidth={viewWidth}
                        colour={safeColor(currentStage.theme?.groundColor)}
                    />
                )}

                {/* 9. Obstacles. The drawing is the hitbox, so what you see is what you hit. */}
                {obstacles.map(obs => {
                    const role = obs.role ?? 'small';
                    const drawX = obs.x + gameOffsetX;
                    // Patterns are placed whole, so some of each one waits off to the right.
                    // Don't draw what can't be seen: on web every shape adds to the load.
                    if (drawX > viewWidth + 10 || drawX + shapeFor(role).width < -10) return null;

                    // Hearts keep the same pink everywhere: a pickup that changed colour per
                    // stage would stop reading as "this one helps you".
                    if (role === 'heart') {
                        const heartY = RUNNER_GROUND_Y - HEART_SIZE;
                        return (
                            <Group key={obs.id} transform={[{ translateX: drawX }, { translateY: heartY }]}>
                                <Path path={heartPath} color={safeColor(COLOR_HP_DEEP)} />
                            </Group>
                        );
                    }

                    // A hole: a dark opening cut into the grid, its rim lit in the stage's colours.
                    if (role === 'hole') {
                        const rx = shapeFor(role).width / 2;
                        const cx = drawX + rx;
                        const cy = RUNNER_GROUND_Y;
                        return (
                            <Group key={obs.id}>
                                <Oval x={cx - rx - 4} y={cy - HOLE_RY - 3} width={2 * rx + 8} height={2 * HOLE_RY + 6} color={safeColor(pickupColors.glow)} opacity={0.35} />
                                <Oval x={cx - rx} y={cy - HOLE_RY} width={2 * rx} height={2 * HOLE_RY} color="#020008" />
                                {/* The far wall catches a little light. */}
                                <Oval x={cx - rx + 6} y={cy - HOLE_RY + 1} width={2 * rx - 12} height={HOLE_RY} color={safeColor(pickupColors.glow)} opacity={0.12} />
                                <Oval x={cx - rx} y={cy - HOLE_RY} width={2 * rx} height={2 * HOLE_RY} color={safeColor(pickupColors.glow)} style="stroke" strokeWidth={2} />
                            </Group>
                        );
                    }

                    const art = shapeFor(role);
                    // The bar hangs in the air; everything else stands on the ground.
                    const y = art.overhead
                        ? RUNNER_GROUND_Y - OVERHEAD_TOP_OFFSET
                        : RUNNER_GROUND_Y - art.height;

                    const colour = art.tint === 'red' ? palette.red
                        : art.tint === 'purple' ? palette.purple
                        : art.tint === 'overhead' ? palette.overhead
                        : palette.block;
                    const glow = art.tint === 'red' ? palette.redGlow
                        : art.tint === 'purple' ? palette.purpleGlow
                        : art.tint === 'overhead' ? palette.overheadGlow
                        : palette.blockGlow;

                    // Solid shapes in the grid's perspective (Obstacle3D.tsx).
                    if (art.shape === 'sphere') {
                        return (
                            <Sphere3D
                                key={obs.id}
                                cx={drawX + art.width / 2}
                                cy={y + art.height / 2}
                                r={art.width / 2}
                                colour={safeColor(colour)}
                            />
                        );
                    }

                    return (
                        <Box3D
                            key={obs.id}
                            x={drawX} y={y} width={art.width} height={art.height}
                            colour={safeColor(colour)} glow={safeColor(glow)} vanishX={viewWidth / 2}
                        />
                    );
                })}

                {/* 9b. Pickups: a small pale diamond in a soft glow of the stage's horizon colour.
                    The glow is two see-through circles rather than a blur, which is heavy on web. */}
                {gameState.pickups.map(p => {
                    const cx = p.x + gameOffsetX;
                    if (cx > viewWidth + 10 || cx < -10) return null;
                    const r = PICKUP_RADIUS;
                    // A slow shimmer, each one a little out of step with its neighbours.
                    const shimmer = 0.75 + 0.25 * Math.sin(gameState.elapsedSecInStage * 6 + p.id);
                    const side = r * Math.SQRT2;
                    return (
                        <Group key={p.id}>
                            <Circle cx={cx} cy={p.y} r={r * 3} color={safeColor(pickupColors.glow)} opacity={0.18 * shimmer} />
                            <Circle cx={cx} cy={p.y} r={r * 1.8} color={safeColor(pickupColors.glow)} opacity={0.45 * shimmer} />
                            <Rect
                                x={cx - side / 2} y={p.y - side / 2} width={side} height={side}
                                color={safeColor(pickupColors.core)}
                                origin={vec(cx, p.y)} transform={[{ rotate: Math.PI / 4 }]}
                            />
                        </Group>
                    );
                })}

                {/* 10. Player (Stickman) - left of 600 zone; visual y -5 so feet align with obstacles */}
                {/* Blinks during the safe moment after a hit (hidden every other tenth of a second). */}
                {/* Dropping into a hole: he goes back with the hole, cut off by the floor in front of it. */}
                <Group clip={runnerClip}>
                {!(player.hurtTimer > 0 && Math.floor(player.hurtTimer * 10) % 2 === 1) && <Stickman
                    x={PLAYER_X + gameOffsetX - player.fallDrift}
                    y={player.y + RUNNER_VISUAL_Y_OFFSET}
                    size={PLAYER_SIZE}
                    // Legs keep pace with the ground: at the original 240 px/sec this is plain seconds.
                    animationTimeSec={gameState.scroll / (BASE_SPEED * 60)}
                    isGrounded={player.isGrounded}
                    isDucking={player.isDucking}
                    verticalSpeed={player.dy}
                    landing={player.landGlow}
                    isRunning={gameState.gameStarted && !gameState.gameOver}
                    status={gameState.stageStatus}
                />}
                </Group>
                {/* A short pink flash as the hit lands. */}
                {player.hurtTimer > HIT_GRACE_SEC - HIT_FLASH_SEC && (
                    <Rect
                        x={0} y={0} width={viewWidth} height={SCREEN_HEIGHT}
                        color="#ff00cc"
                        opacity={0.3 * (player.hurtTimer - (HIT_GRACE_SEC - HIT_FLASH_SEC)) / HIT_FLASH_SEC}
                    />
                )}

                {/* The finish line's near post passes in front of the runner. */}
                {showFinish && <FinishLineFront lineX={finishX} viewWidth={viewWidth} />}

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
