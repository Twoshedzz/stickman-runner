/**
 * Stage 2 — Sunset Beach.
 *
 * Layout and colours are taken from assets/concepts/stage 2 - sunset beach.png: the sun
 * sits just above the waterline, distant headlands run along it, and palms stand on the
 * sand in front.
 *
 * The sun, its banding, the water and its reflection are drawn as shapes, since they
 * either never move or need to shimmer. Only the headlands and palms are strips.
 *
 * Same shape as the other scenery: numbers in, strips tiled by world position.
 */

import { Circle, Group, Image, Rect } from "@shopify/react-native-skia";
import type { SkImage } from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { GROUND_HEIGHT, SCREEN_HEIGHT, SCREEN_WIDTH } from "../../game/constants";
import { useStripImages } from "./useStripImages";

/** Where the water meets the sky, the sand meets the water, and the grid begins. */
const WATERLINE = 217;
const SAND = 266;
const GRID_TOP_Y = SCREEN_HEIGHT - GROUND_HEIGHT;

const SUN = { y: 163, radius: 47, colour: "#fd943f" };
/** The bands cut across the sun's lower half in the concept, like heat haze over the sea. */
const SUN_BANDS = [0.34, 0.52, 0.70, 0.86];
const OCEAN = "#31153e";
const SAND_COLOUR = "#3a1a44";
const REFLECTION = "#fd9e5d";

/** Matches the stage's skyColors, so the sun's bands blend into the sky behind them. */
const SKY_STOPS = [[0x6f, 0x59, 0xad], [0xb2, 0x60, 0x9c], [0xee, 0x71, 0x74]];

const FAR = { width: 300, height: 40, rate: 0.08 };
const PALMS = { width: 450, height: 170, rate: 0.45 };

const FAR_SOURCES = [
    require("../../../assets/beach/far_1.png"),
    require("../../../assets/beach/far_2.png"),
    require("../../../assets/beach/far_3.png"),
    require("../../../assets/beach/far_4.png"),
];
const PALM_SOURCES = [
    require("../../../assets/beach/palms_1.png"),
    require("../../../assets/beach/palms_2.png"),
    require("../../../assets/beach/palms_3.png"),
    require("../../../assets/beach/palms_4.png"),
];

/** The sky colour at a given height, so the sun's bands match what's behind them. */
function skyAt(y: number): string {
    const t = Math.max(0, Math.min(1, y / WATERLINE));
    const stops = SKY_STOPS;
    const span = t < 0.5 ? [stops[0], stops[1], t * 2] : [stops[1], stops[2], (t - 0.5) * 2];
    const [from, to, mix] = span as [number[], number[], number];
    const channel = (i: number) => Math.round(from[i] + (to[i] - from[i]) * mix);
    return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

interface Props {
    /** How far the player has run. A plain number: the React Compiler treats the game
     *  state object as unchanged, which would freeze this on its first frame. */
    distance: number;
    viewWidth?: number;
}

function tileLayer(
    images: SkImage[],
    layer: { width: number; height: number; rate: number },
    distance: number,
    viewWidth: number,
    topY: number,
    keyPrefix: string,
    opacity = 1
) {
    if (images.length === 0) return null;
    const worldX = distance * layer.rate;
    const firstTile = Math.floor(worldX / layer.width);
    const count = Math.ceil(viewWidth / layer.width) + 2;

    return Array.from({ length: count }, (_, i) => {
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
                opacity={opacity}
            />
        );
    });
}

/** Broken bars of light on the water, narrowing towards the horizon. */
function useReflection(viewWidth: number, distance: number) {
    // Shifts slowly so the water moves without the bars jittering every frame.
    const phase = Math.floor(distance / 26);
    return useMemo(() => {
        let seed = 9901 + phase;
        const random = () => {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            return seed / 0x7fffffff;
        };
        const bars = [];
        for (let y = WATERLINE + 3; y < SAND; y += 3) {
            const depth = (y - WATERLINE) / (SAND - WATERLINE);
            const spread = 10 + depth * 46;
            for (let b = 0; b < 3; b++) {
                const length = spread * (0.3 + random() * 0.7);
                bars.push({
                    key: `${y}-${b}`,
                    x: viewWidth / 2 + (random() - 0.5) * spread * 2 - length / 2,
                    y,
                    width: length,
                    opacity: 0.35 + 0.4 * (1 - depth),
                });
            }
        }
        return bars;
    }, [viewWidth, phase]);
}

export const SunsetBeachBackground = ({ distance, viewWidth: viewWidthProp }: Props) => {
    const viewWidth = viewWidthProp ?? SCREEN_WIDTH;
    const far = useStripImages("beach-far", FAR_SOURCES);
    const palms = useStripImages("beach-palms", PALM_SOURCES);
    const reflection = useReflection(viewWidth, distance);

    const sunX = viewWidth / 2;

    return (
        <>
            {/* Sun: a disk with the sky banding cut across its lower half, as in the concept. */}
            <Group>
                <Circle cx={sunX} cy={SUN.y} r={SUN.radius} color={SUN.colour} />
                {SUN_BANDS.map((at) => {
                    const y = SUN.y + SUN.radius * at;
                    // Narrow towards the bottom of the disk, following its curve.
                    const halfWidth = Math.sqrt(Math.max(0, SUN.radius * SUN.radius - (y - SUN.y) ** 2));
                    return (
                        <Rect
                            key={at}
                            x={sunX - halfWidth} y={y}
                            width={halfWidth * 2} height={3}
                            color={skyAt(y)}
                        />
                    );
                })}
            </Group>

            {tileLayer(far, FAR, distance, viewWidth, WATERLINE - FAR.height, "beach-far", 0.85)}

            {/* Water, then the light running across it. */}
            <Rect x={0} y={WATERLINE} width={viewWidth} height={SAND - WATERLINE} color={OCEAN} />
            {reflection.map((bar) => (
                <Rect key={bar.key} x={bar.x} y={bar.y} width={bar.width} height={1.5}
                      color={REFLECTION} opacity={bar.opacity} />
            ))}

            {/* Sand, then the palms standing on it. */}
            <Rect x={0} y={SAND} width={viewWidth} height={GRID_TOP_Y - SAND} color={SAND_COLOUR} />
            {tileLayer(palms, PALMS, distance, viewWidth, SAND - PALMS.height + 8, "beach-palms")}
        </>
    );
};
