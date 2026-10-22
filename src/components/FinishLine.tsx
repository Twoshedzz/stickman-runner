/**
 * The finish line, drawn in the grid's perspective so the runner runs through it.
 *
 * It lies across the track like one of the grid's converging lines: a chequered stripe on
 * the ground, a post at the far end (behind the runner), a post at the near end (in front),
 * and a banner overhead joining them. GameCanvas draws the far part before the runner and
 * the near post after, which is what puts the runner between them.
 *
 * Everything is positioned from one number: where the line crosses the runner's depth.
 * The rest follows from the vanishing point, so it always agrees with the grid.
 */

import { Group, Path } from "@shopify/react-native-skia";
import React from "react";
import { GROUND_HEIGHT, RUNNER_GROUND_Y, SCREEN_HEIGHT } from "../game/constants";
import { VANISH_Y } from "./GridFloor";

const HORIZON_Y = SCREEN_HEIGHT - GROUND_HEIGHT;
/** Ends of the line on the ground: just below the horizon, and near the bottom of the screen. */
const FAR_Y = HORIZON_Y + 3;
const NEAR_Y = SCREEN_HEIGHT - 4;
/** Post height at the runner's depth; nearer posts look taller, further ones shorter. */
const POST_HEIGHT = 100;
const BANNER_DEPTH = 16;
const STRIPE_HALF_WIDTH = 7;
const CHEQUER_ROWS = 8;

interface Props {
    /** Screen x where the line crosses the runner's depth. */
    lineX: number;
    viewWidth: number;
    colour: string;
}

/** How much bigger things look at a given depth, relative to the runner's depth. */
const depthScale = (y: number) => (y - VANISH_Y) / (RUNNER_GROUND_Y - VANISH_Y);

/** The line's x at any depth, following the grid's convergence. */
const lineXAt = (lineX: number, vanishX: number, y: number) =>
    vanishX + (lineX - vanishX) * depthScale(y);

const quad = (a: number[], b: number[], c: number[], d: number[]) =>
    `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}` +
    `L${c[0].toFixed(1)} ${c[1].toFixed(1)}L${d[0].toFixed(1)} ${d[1].toFixed(1)}Z`;

function postPath(lineX: number, vanishX: number, footY: number) {
    const x = lineXAt(lineX, vanishX, footY);
    const s = depthScale(footY);
    const half = 2.2 * s;
    const top = footY - POST_HEIGHT * s;
    return { d: quad([x - half, top], [x + half, top], [x + half, footY], [x - half, footY]), x, top, s };
}

/** The parts behind the runner: chequered stripe, far post, and the banner. */
export const FinishLineBehind = ({ lineX, viewWidth, colour }: Props) => {
    const vanishX = viewWidth / 2;

    // Chequer: two columns either side of the line, alternating light and dark.
    let light = "";
    let dark = "";
    const step = (NEAR_Y - FAR_Y) / CHEQUER_ROWS;
    for (let row = 0; row < CHEQUER_ROWS; row++) {
        const y0 = FAR_Y + row * step;
        const y1 = y0 + step;
        const x0 = lineXAt(lineX, vanishX, y0), x1 = lineXAt(lineX, vanishX, y1);
        const w0 = STRIPE_HALF_WIDTH * depthScale(y0), w1 = STRIPE_HALF_WIDTH * depthScale(y1);
        const left = quad([x0 - w0, y0], [x0, y0], [x1, y1], [x1 - w1, y1]);
        const right = quad([x0, y0], [x0 + w0, y0], [x1 + w1, y1], [x1, y1]);
        if (row % 2 === 0) { light += left; dark += right; } else { dark += left; light += right; }
    }

    const far = postPath(lineX, vanishX, FAR_Y);
    const near = postPath(lineX, vanishX, NEAR_Y);
    const banner = quad(
        [far.x, far.top],
        [near.x, near.top],
        [near.x, near.top + BANNER_DEPTH * near.s],
        [far.x, far.top + BANNER_DEPTH * far.s]
    );

    return (
        <Group>
            <Path path={dark} color="#0a0a14" style="fill" />
            <Path path={light} color="#ffffff" style="fill" />
            <Path path={far.d} color="#ffffff" style="fill" />
            {/* Glow, then the banner itself. */}
            <Path path={banner} color={colour} style="stroke" strokeWidth={8} opacity={0.3} strokeJoin="round" />
            <Path path={banner} color={colour} style="fill" />
            <Path path={banner} color="#ffffff" style="stroke" strokeWidth={1.5} strokeJoin="round" />
        </Group>
    );
};

/** The near post, drawn after the runner so it passes in front of them. */
export const FinishLineFront = ({ lineX, viewWidth }: Omit<Props, "colour">) => {
    const near = postPath(lineX, viewWidth / 2, NEAR_Y);
    return <Path path={near.d} color="#ffffff" style="fill" />;
};
