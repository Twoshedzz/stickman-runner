/**
 * The obstacles. Each is drawn by what it looks like (the obstacle table's `shape` and
 * `tint`), never by what it does, so a drawing can change without touching the rules.
 * The drawing is the hitbox, so what you see is what you hit.
 *
 * To give a stage its own looks (cars for blocks in the city, say), write a drawing that
 * takes ObstacleLookProps and fills the same box, and choose it for that stage in place of
 * the one in SHAPE_LOOKS.
 */
import { Group, Oval, Path, Skia } from "@shopify/react-native-skia";
import React, { ComponentType, useMemo } from 'react';
import { HEART_SIZE } from "../game/constants";
import { ObstacleShape, shapeFor, topYFor } from "../game/obstacleCatalogue";
import { StageConfig } from "../game/stages";
import { GameState } from "../game/state";
import { DEFAULT_GRID_COLOR } from "./floorGeometry";
import { Box3D, Sphere3D } from "./Obstacle3D";
import { tintColours } from "./obstacleColours";
import { safeColor } from "./safeColor";
import { voidPaths } from "./voidShape";

/** Half the height of a hole: a circle on the floor, flattened to the grid's perspective. */
export const HOLE_RY = 8;

/** What every obstacle drawing is given: its box on screen and its colours. */
export interface ObstacleLookProps {
    /** The obstacle's box: left edge, top, size. Holes have no height; their y is the floor. */
    x: number;
    y: number;
    width: number;
    height: number;
    colour: string;
    glow: string;
    /** Where the grid's lines meet, for drawings in perspective. */
    vanishX: number;
    /** The stage's floor grid colour, for drawings that are part of the floor. */
    floorColour: string;
}

/** Solid shapes in the grid's perspective (Obstacle3D.tsx). */
const BlockLook = ({ x, y, width, height, colour, glow, vanishX }: ObstacleLookProps) => (
    <Box3D x={x} y={y} width={width} height={height} colour={colour} glow={glow} vanishX={vanishX} />
);

const SphereLook = ({ x, y, width, height, colour }: ObstacleLookProps) => (
    <Sphere3D cx={x + width / 2} cy={y + height / 2} r={width / 2} colour={colour} />
);

/** A dark opening cut into the grid, its rim lit in the stage's colours. */
const HoleLook = ({ x, y, width, height, colour }: ObstacleLookProps) => {
    const rx = width / 2;
    const cx = x + rx;
    const cy = y + height;
    return (
        <Group>
            <Oval x={cx - rx - 4} y={cy - HOLE_RY - 3} width={2 * rx + 8} height={2 * HOLE_RY + 6} color={colour} opacity={0.35} />
            <Oval x={cx - rx} y={cy - HOLE_RY} width={2 * rx} height={2 * HOLE_RY} color="#020008" />
            {/* The far wall catches a little light. */}
            <Oval x={cx - rx + 6} y={cy - HOLE_RY + 1} width={2 * rx - 12} height={HOLE_RY} color={colour} opacity={0.12} />
            <Oval x={cx - rx} y={cy - HOLE_RY} width={2 * rx} height={2 * HOLE_RY} color={colour} style="stroke" strokeWidth={2} />
        </Group>
    );
};

/** A gap across the whole floor, with the grid dropping away into it (shapes in voidShape.ts). */
const VoidLook = ({ x, y, width, colour, vanishX, floorColour }: ObstacleLookProps) => {
    const { gap, edges, walls } = voidPaths(x, y, width, vanishX);
    return (
        <Group>
            <Group clip={gap}>
                <Path path={gap} color="#020008" />
                {walls.map((wall, i) => (
                    <Group key={i}>
                        <Path path={wall.face} color={floorColour} opacity={0.12} />
                        <Path path={wall.drops} style="stroke" strokeWidth={2} color={floorColour} />
                        <Path path={wall.rungs[0]} style="stroke" strokeWidth={2} color={floorColour} opacity={0.6} />
                        <Path path={wall.rungs[1]} style="stroke" strokeWidth={2} color={floorColour} opacity={0.3} />
                    </Group>
                ))}
            </Group>
            {/* The lip of each edge, lit like a hole's rim so it reads at speed. */}
            <Path path={edges} style="stroke" strokeWidth={6} color={colour} opacity={0.3} />
            <Path path={edges} style="stroke" strokeWidth={2} color={colour} />
        </Group>
    );
};

/**
 * A solid heart filling a HEART_SIZE box (30 wide, its point resting on the bottom edge).
 * Made into a Skia path inside the component: on web Skia isn't ready at module load.
 */
const HEART_SVG = 'M15 30 C6 23 0 17.5 0 10.5 C0 5.5 3.8 2 8.2 2 C11 2 13.5 3.5 15 6 C16.5 3.5 19 2 21.8 2 C26.2 2 30 5.5 30 10.5 C30 17.5 24 23 15 30 Z';

const HeartLook = ({ x, y, height, colour }: ObstacleLookProps) => {
    const heartPath = useMemo(() => Skia.Path.MakeFromSVGString(HEART_SVG)!, []);
    return (
        <Group transform={[{ translateX: x }, { translateY: y + height - HEART_SIZE }]}>
            <Path path={heartPath} color={colour} />
        </Group>
    );
};

/** The drawing for each shape in the obstacle table. */
export const SHAPE_LOOKS: Record<ObstacleShape, ComponentType<ObstacleLookProps>> = {
    block: BlockLook,
    bar: BlockLook,
    sphere: SphereLook,
    hole: HoleLook,
    void: VoidLook,
    heart: HeartLook,
};

interface ObstacleLayerProps {
    /** A fresh array each frame (the game filters it every step), so this redraws as they move. */
    obstacles: GameState['obstacles'];
    /** How far the 600-wide game area sits from the left of the drawn view. */
    offsetX: number;
    viewWidth: number;
    theme: StageConfig['theme'];
}

export const ObstacleLayer = ({ obstacles, offsetX, viewWidth, theme }: ObstacleLayerProps) => (
    <>
        {obstacles.map(obs => {
            const role = obs.role ?? 'small';
            const art = shapeFor(role);
            const x = obs.x + offsetX;
            // Patterns are placed whole, so some of each one waits off to the right.
            // Don't draw what can't be seen: on web every shape adds to the load. A void's far
            // end leans in towards the middle, so it's still showing a little further out.
            const margin = art.shape === 'void' ? viewWidth * 0.2 : 10;
            if (x > viewWidth + margin || x + art.width < -margin) return null;
            const Look = SHAPE_LOOKS[art.shape];
            const { colour, glow } = tintColours(art.tint, theme);
            return (
                <Look
                    key={obs.id}
                    x={x} y={topYFor(role)} width={art.width} height={art.height}
                    colour={safeColor(colour)} glow={safeColor(glow)} vanishX={viewWidth / 2}
                    floorColour={safeColor(theme.gridColor ?? DEFAULT_GRID_COLOR)}
                />
            );
        })}
    </>
);
