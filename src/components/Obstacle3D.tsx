/**
 * Obstacles drawn as solid shapes in the grid's perspective, like the finish line and holes.
 *
 * A block is a box: its front face is exactly where the obstacle is (so what you see is still
 * what you hit), and it reaches back into the screen towards the grid's vanishing point. We
 * look down on the floor, so the top shows; and the side facing the middle of the screen
 * shows, shrinking as the box nears the middle and swapping sides as it passes, the same way
 * the grid lines turn. Spheres get shading and a shadow on the floor.
 */
import { Circle, Group, Oval, Path, RadialGradient, vec } from "@shopify/react-native-skia";
import React from "react";
import { RUNNER_GROUND_Y } from "../game/constants";
import { VANISH_Y } from "./floorGeometry";

/**
 * How deep a box is: its back face is this much the size of its front, scaled towards the
 * vanishing point. Smaller is deeper.
 */
const BACK_SCALE = 0.9;

/** Blend a #rrggbb colour towards white (amount > 0) or black (amount < 0). */
export const shade = (hex: string, amount: number) => {
    const m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const target = amount > 0 ? 255 : 0;
    const t = Math.abs(amount);
    const mix = (c: number) => Math.round(c + (target - c) * t);
    const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};

type Point = [number, number];

const quad = (a: Point, b: Point, c: Point, d: Point) =>
    `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}` +
    `L${c[0].toFixed(1)} ${c[1].toFixed(1)}L${d[0].toFixed(1)} ${d[1].toFixed(1)}Z`;

interface BoxProps {
    /** The front face, as the obstacle's hitbox. */
    x: number;
    y: number;
    width: number;
    height: number;
    colour: string;
    glow: string;
    /** Where the grid's lines meet, across the screen. */
    vanishX: number;
}

export const Box3D = ({ x, y, width, height, colour, glow, vanishX }: BoxProps) => {
    // The back face: the front, scaled towards the vanishing point.
    const back = ([px, py]: Point): Point => [
        vanishX + (px - vanishX) * BACK_SCALE,
        VANISH_Y + (py - VANISH_Y) * BACK_SCALE,
    ];
    const tl: Point = [x, y], tr: Point = [x + width, y];
    const bl: Point = [x, y + height], br: Point = [x + width, y + height];
    const [btl, btr, bbl, bbr] = [tl, tr, bl, br].map(back);

    // We see the top of anything below eye level (the horizon), and the underside of
    // anything above it. The side towards the middle of the screen shows.
    const top = y > VANISH_Y ? quad(tl, tr, btr, btl) : null;
    const bottom = y + height < VANISH_Y ? quad(bl, br, bbr, bbl) : null;
    const centre = x + width / 2;
    const side = centre > vanishX ? quad(tl, bl, bbl, btl) : quad(tr, br, bbr, btr);
    const front = quad(tl, tr, br, bl);

    return (
        <Group>
            {/* A soft glow around the whole shape. */}
            <Path path={side} color={glow} style="stroke" strokeWidth={7} opacity={0.3} strokeJoin="round" />
            <Path path={front} color={glow} style="stroke" strokeWidth={7} opacity={0.3} strokeJoin="round" />
            {top && <Path path={top} color={glow} style="stroke" strokeWidth={7} opacity={0.3} strokeJoin="round" />}
            <Path path={side} color={shade(colour, -0.45)} />
            {top && <Path path={top} color={shade(colour, 0.35)} />}
            {bottom && <Path path={bottom} color={shade(colour, -0.6)} />}
            <Path path={front} color={colour} />
            {/* Lit edges, so the shape reads at a glance. */}
            <Path path={front} color={shade(colour, 0.6)} style="stroke" strokeWidth={1} strokeJoin="round" />
            {top && <Path path={top} color={shade(colour, 0.7)} style="stroke" strokeWidth={1} strokeJoin="round" />}
        </Group>
    );
};

interface SphereProps {
    cx: number;
    cy: number;
    r: number;
    colour: string;
}

/** A shaded ball, lit from above, with its shadow on the floor beneath it. */
export const Sphere3D = ({ cx, cy, r, colour }: SphereProps) => (
    <Group>
        <Oval x={cx - r * 0.9} y={RUNNER_GROUND_Y - 3} width={r * 1.8} height={6} color="#000000" opacity={0.45} />
        <Circle cx={cx} cy={cy} r={r}>
            <RadialGradient
                c={vec(cx - r * 0.35, cy - r * 0.4)}
                r={r * 1.4}
                colors={[shade(colour, 0.7), colour, shade(colour, -0.55)]}
                positions={[0, 0.45, 1]}
            />
        </Circle>
    </Group>
);
