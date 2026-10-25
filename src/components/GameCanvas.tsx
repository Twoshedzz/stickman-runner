
import { Canvas, Circle, Group, LinearGradient, Mask, Oval, Rect, vec } from "@shopify/react-native-skia";
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
    BASE_SPEED, GROUND_HEIGHT, HIT_GRACE_SEC,
    PLAYER_SIZE, PLAYER_X, RUNNER_GROUND_Y, SCREEN_HEIGHT, SCREEN_WIDTH
} from "../game/constants";
import { pulseBand } from "../game/beatPulse";
import { shapeFor } from "../game/obstacleCatalogue";
import { PICKUP_RADIUS } from "../game/pickups";
import { getTheme, moonAt } from "../game/sky";
import { remainingScroll, stageById } from "../game/stages";
import { GameState } from "../game/state";
import { HOLE_RY, ObstacleLayer } from "./ObstacleLayer";
import { safeColor, safeOpacity } from "./safeColor";
import { Stickman } from "./Stickman";
import { SCENERY } from "./backgrounds/scenery";
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

/** Visual only: draw runner 5px higher so feet align with obstacle bottom. Physics/collision unchanged. */
const RUNNER_VISUAL_Y_OFFSET = -5;

/**
 * While the runner drops into a hole, he's only drawn above the floor and inside the hole:
 * everything above the running line, plus the near half of the hole's opening. The floor
 * in front of the hole hides the rest of him as he goes down.
 */
const fallClip = (viewWidth: number, cx: number, rx: number) => {
    const cy = RUNNER_GROUND_Y;
    return `M 0 0 H ${viewWidth} V ${cy} H ${cx + rx} A ${rx} ${HOLE_RY} 0 0 1 ${cx - rx} ${cy} H 0 Z`;
};

/** How long the pink flash lasts when the runner is hit. */
const HIT_FLASH_SEC = 0.18;

export const GameCanvas = ({ gameState, tick, viewWidth: viewWidthProp, onAssetsReady }: GameCanvasProps) => {
    const { player, obstacles } = gameState;
    const viewWidth = viewWidthProp ?? SCREEN_WIDTH;
    const gameOffsetX = (viewWidth - SCREEN_WIDTH) / 2;

    const currentStage = useMemo(() => stageById(gameState.stageId), [gameState.stageId]);

    const currentTheme = useMemo(
        () => getTheme(gameState.distance, currentStage),
        [gameState.distance, currentStage]
    );
    const moon = moonAt(gameState.distance, currentStage, currentTheme);
    const scenery = SCENERY[currentStage.assets.backgroundType];
    const Scenery = scenery.Component;
    const sceneryLoadsAssets = !!scenery.loadsAssets;

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

    // Scenery drawn from shapes (everything but the city) has no images to wait for: signal
    // ready straight away so the countdown isn't held up.
    useEffect(() => {
        if (onAssetsReady && !sceneryLoadsAssets) onAssetsReady();
    }, [onAssetsReady, sceneryLoadsAssets]);

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

                {/* 3. Moon: a bright crescent, cut out with a mask. */}
                {moon && (() => {
                    const mx = viewWidth * 0.72;
                    const my = moon.y;
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
                            <Circle cx={mx} cy={my} r={rMoon} color="#FFFFFF" style="fill" opacity={safeOpacity(moon.opacity)} />
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

                {/* 5 & 6. The stage's scenery (backgrounds/scenery.ts): drawn after grid + ground line so
                    buildings render on top. Written as a component here rather than returned from a
                    helper: with the React Compiler on, a helper's result gets cached and the
                    background stops scrolling. */}
                <Scenery
                    distance={gameState.scroll}
                    seconds={gameState.elapsedSecInStage}
                    progress={gameState.stageProgress}
                    skyTop={currentTheme.skyTop}
                    skyMid={currentTheme.skyMid}
                    skyBottom={currentTheme.skyBottom}
                    viewWidth={viewWidth}
                    lightLevel={cityLightLevel}
                    onAssetsReady={onAssetsReady}
                />

                {/* 8. Finish line, far side: the runner is drawn in front of this part. */}
                {showFinish && (
                    <FinishLineBehind
                        lineX={finishX}
                        viewWidth={viewWidth}
                        colour={safeColor(currentStage.theme?.groundColor)}
                    />
                )}

                {/* 9. Obstacles. */}
                <ObstacleLayer obstacles={obstacles} offsetX={gameOffsetX} viewWidth={viewWidth} theme={currentStage.theme} />

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

                {/* His shadow on the floor: smaller and fainter the higher he jumps. Not in a hole. */}
                {player.falling <= 0 && (() => {
                    const height = Math.max(0, RUNNER_GROUND_Y - PLAYER_SIZE - player.y);
                    const k = Math.max(0, 1 - height / 160);
                    const rx = PLAYER_SIZE * (0.4 + 0.25 * k);
                    const ry = 3 + 2 * k;
                    // The floor is nearly black, so the shadow shows by dimming the grid lines under him.
                    return (
                        <Oval
                            x={PLAYER_X + gameOffsetX + PLAYER_SIZE / 2 - rx} y={RUNNER_GROUND_Y - ry}
                            width={rx * 2} height={ry * 2}
                            color="#05020f" opacity={0.35 + 0.55 * k}
                        />
                    );
                })()}
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
