/**
 * Stage 3 — Midnight Mountains.
 *
 * Three parallax layers of generated silhouette strips (see scripts/generate-mountain-strips.js),
 * with the moon, its glow and the stars drawn as shapes since they never need art.
 *
 * It stays midnight throughout, but the stage still has an arc: the runner is crossing a
 * mountain pass. The mountains start low, tower overhead in the middle of the stage, then
 * drop away again, and the moon travels across the sky from left to right. Both change so
 * slowly that you notice where you are, not the movement.
 *
 * Which strip variant appears at a given point is worked out from the world position, so a
 * tile always shows the same art no matter when it scrolls past — no queue to keep in step.
 */

import { Circle, Group, Image, RadialGradient, vec } from "@shopify/react-native-skia";
import type { SkImage } from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { GROUND_HEIGHT, SCREEN_HEIGHT, SCREEN_WIDTH } from "../../game/constants";
import { useStripImages } from "./useStripImages";

// Module level so the loader sees the same array every render.
const FAR_SOURCES = [
    require("../../../assets/mountains/far_1.png"),
    require("../../../assets/mountains/far_2.png"),
    require("../../../assets/mountains/far_3.png"),
    require("../../../assets/mountains/far_4.png"),
];
const MID_SOURCES = [
    require("../../../assets/mountains/mid_1.png"),
    require("../../../assets/mountains/mid_2.png"),
    require("../../../assets/mountains/mid_3.png"),
    require("../../../assets/mountains/mid_4.png"),
];
const PINE_SOURCES = [
    require("../../../assets/mountains/pines_1.png"),
    require("../../../assets/mountains/pines_2.png"),
    require("../../../assets/mountains/pines_3.png"),
    require("../../../assets/mountains/pines_4.png"),
];

/** Strip bottoms meet the grid's top line, so there's never a gap under the scenery. */
const GRID_TOP_Y = SCREEN_HEIGHT - GROUND_HEIGHT;

/** Native size of each generated strip, and how fast it scrolls relative to the ground. */
const FAR = { width: 600, height: 150, rate: 0.12 };
const MID = { width: 600, height: 150, rate: 0.25 };
const PINES = { width: 450, height: 90, rate: 0.5 };

const MOON = { radius: 42, colour: "#b0f7fd" };

/** How tall each layer is through the pass: this share of its height at the start and end, and at the summit. */
const FAR_RISE = { low: 0.55, summit: 1.5 };
const MID_RISE = { low: 0.55, summit: 1.3 };

/** The moon's path: across from left to right, highest in the middle of the stage. */
function moonAt(progress: number, viewWidth: number) {
    return {
        x: viewWidth * (0.12 + 0.76 * progress),
        y: 150 - 85 * Math.sin(Math.PI * progress),
    };
}
const STAR_COUNT = 50;

interface Props {
    /** How far the player has run. Passed as a number, not pulled off the game state object:
     *  the React Compiler memoises on prop identity, and the state object is mutated in place,
     *  so passing the object makes this component freeze on its first frame. */
    distance: number;
    /** How far through the stage, 0 to 1: drives the moon and the height of the mountains. */
    progress: number;
    /** Drawn width; wider than 600 on wide phones, so layers must tile to fill it. */
    viewWidth?: number;
}

/** Repeatable star field, so stars don't jump around between frames. */
function useStars(viewWidth: number) {
    return useMemo(() => {
        let seed = 20260321;
        const random = () => {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            return seed / 0x7fffffff;
        };
        return Array.from({ length: STAR_COUNT }, (_, i) => ({
            id: i,
            x: random() * viewWidth,
            y: random() * (GRID_TOP_Y * 0.62),
            r: 0.6 + random() * 1.1,
            opacity: 0.35 + random() * 0.5,
        }));
    }, [viewWidth]);
}

/** Repeats one layer's strips across the view, offset by how far the player has run. */
function tileLayer(
    images: SkImage[],
    layer: { width: number; height: number; rate: number },
    distance: number,
    viewWidth: number,
    topY: number,
    keyPrefix: string
) {
    if (images.length === 0) return null;

    const worldX = distance * layer.rate;
    const firstTile = Math.floor(worldX / layer.width);
    const tileCount = Math.ceil(viewWidth / layer.width) + 2;

    return Array.from({ length: tileCount }, (_, i) => {
        const tileIndex = firstTile + i;
        const variant = ((tileIndex % images.length) + images.length) % images.length;
        return (
            <Image
                key={`${keyPrefix}-${tileIndex}`}
                image={images[variant]}
                x={tileIndex * layer.width - worldX}
                y={topY}
                width={layer.width}
                height={layer.height}
                fit="fill"
            />
        );
    });
}

export const MidnightMountainsBackground = ({ distance, progress, viewWidth: viewWidthProp }: Props) => {
    const viewWidth = viewWidthProp ?? SCREEN_WIDTH;
    const stars = useStars(viewWidth);

    const far = useStripImages("mountains-far", FAR_SOURCES);
    const mid = useStripImages("mountains-mid", MID_SOURCES);
    const pines = useStripImages("mountains-pines", PINE_SOURCES);

    const p = Math.max(0, Math.min(1, progress));
    const { x: moonX, y: moonY } = moonAt(p, viewWidth);
    // 0 at the start and end of the pass, 1 at the summit halfway through.
    const summit = Math.sin(Math.PI * p);
    const farHeight = FAR.height * (FAR_RISE.low + (FAR_RISE.summit - FAR_RISE.low) * summit);
    const midHeight = MID.height * (MID_RISE.low + (MID_RISE.summit - MID_RISE.low) * summit);

    return (
        <>
            {/* Stars first, so everything else sits in front of them. */}
            <Group>
                {stars.map((s) => (
                    <Circle key={s.id} cx={s.x} cy={s.y} r={s.r} color="#dff6ff" opacity={s.opacity} />
                ))}
            </Group>

            {/* Moon: one circle carrying a fading gradient for the halo, then the solid disk.
                Stacked circles left visible rings. */}
            <Circle cx={moonX} cy={moonY} r={MOON.radius * 2.3}>
                <RadialGradient
                    c={vec(moonX, moonY)}
                    r={MOON.radius * 2.3}
                    colors={["rgba(176, 247, 253, 0.42)", "rgba(176, 247, 253, 0.10)", "rgba(176, 247, 253, 0)"]}
                    positions={[0.34, 0.62, 1]}
                />
            </Circle>
            <Circle cx={moonX} cy={moonY} r={MOON.radius} color={MOON.colour} />

            {/* The ridges are stretched upwards from the grid line, taller towards the summit. */}
            {tileLayer(far, { ...FAR, height: farHeight }, distance, viewWidth, GRID_TOP_Y - farHeight, "far")}
            {tileLayer(mid, { ...MID, height: midHeight }, distance, viewWidth, GRID_TOP_Y - midHeight, "mid")}
            {tileLayer(pines, PINES, distance, viewWidth, GRID_TOP_Y - PINES.height, "pines")}
        </>
    );
};
