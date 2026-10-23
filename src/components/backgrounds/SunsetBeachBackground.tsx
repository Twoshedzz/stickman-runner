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

import { Circle, Group, Image, Path, Rect } from "@shopify/react-native-skia";
import type { SkImage } from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { GROUND_HEIGHT, SCREEN_HEIGHT, SCREEN_WIDTH } from "../../game/constants";
import { useStripImages } from "./useStripImages";

/** Where the water meets the sky, the sand meets the water, and the grid begins. */
const WATERLINE = 217;
const SAND = 266;
const GRID_TOP_Y = SCREEN_HEIGHT - GROUND_HEIGHT;

const SUN = { radius: 47, colour: "#fd943f" };
/** The bands cut across the sun's lower half in the concept, like heat haze over the sea. */
const SUN_BANDS = [0.34, 0.52, 0.70, 0.86];
// Sea and sand are kept clearly apart: the sea cool and deep, the sand warm, catching the sunset.
const OCEAN = "#221a52";
const SAND_COLOUR = "#6e3657";
/** Surf where the water meets the sand. */
const SURF = "#f7a8c4";
/** How far into the sand the palm trunks stand: further than the waves ever reach. */
const PALM_SETBACK = 16;
/** The thin sheet of water a wave pushes up the sand. */
const WASH = "#4a3a86";
/** How long one wave takes to wash up the sand and slide back. */
const WAVE_PERIOD_SEC = 5;
/** How far up the sand a wave reaches, in pixels. */
const WAVE_REACH = 7;
/** The waterline sits at mid depth, so the surf drifts past at about this share of the ground's speed. */
const SURF_RATE = 0.3;
const REFLECTION = "#fd9e5d";

/**
 * Sunrise: the sun's centre at the start (a sliver showing above the distant headlands) and
 * at the end (the whole disk just clear of the water). It climbs steadily between them.
 */
const SUN_START_Y = WATERLINE + SUN.radius - 18;
const SUN_END_Y = WATERLINE - SUN.radius - 4;

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

/** "#rrggbb" or "rgb(r, g, b)" as [r, g, b]. The sky colours arrive in both forms. */
function toRgb(colour: string): number[] {
    if (colour.startsWith('#')) return [1, 3, 5].map((i) => parseInt(colour.slice(i, i + 2), 16));
    return (colour.match(/\d+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number);
}

/** The sky colour at a given height, so the sun's bands match what's behind them. */
function skyAt(y: number, sky: [string, string, string]): string {
    const t = Math.max(0, Math.min(1, y / WATERLINE));
    const stops = sky.map(toRgb);
    const span = t < 0.5 ? [stops[0], stops[1], t * 2] : [stops[1], stops[2], (t - 0.5) * 2];
    const [from, to, mix] = span as [number[], number[], number];
    const channel = (i: number) => Math.round(from[i] + (to[i] - from[i]) * mix);
    return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

interface Props {
    /** How far the player has run. A plain number: the React Compiler treats the game
     *  state object as unchanged, which would freeze this on its first frame. */
    distance: number;
    /** Seconds into the stage, for the waves. Plain number, for the same reason. */
    seconds: number;
    /** How far through the stage, 0 to 1: the sun rises with it. */
    progress: number;
    /** The sky's current top, middle and bottom colours (it lightens through the stage). */
    skyTop: string;
    skyMid: string;
    skyBottom: string;
    viewWidth?: number;
}

/**
 * The foam edge of one wave: a gently rippled line that washes a few pixels up the sand
 * and slides back again, brightest at the top of its run. `offset` (0-1) staggers waves.
 * One path per wave keeps the draw count low on web.
 */
function foam(viewWidth: number, distance: number, seconds: number, offset: number) {
    const cycle = (seconds / WAVE_PERIOD_SEC + offset) % 1;
    const wash = Math.sin(cycle * Math.PI); // 0 at the waterline, 1 at the top of the run
    const reach = SAND + wash * WAVE_REACH;
    const drift = distance * SURF_RATE;
    let d = "";
    for (let x = -10; x <= viewWidth + 10; x += 10) {
        const worldX = x + drift;
        const y = reach + Math.sin(worldX / 23) * 1.2 + Math.sin(worldX / 61 + seconds * 0.7) * 1.6 * wash;
        d += `${d ? "L" : "M"}${x} ${y.toFixed(1)} `;
    }
    // The sheet of water behind the foam, from the waterline down to the foam's edge.
    const sheet = `${d}L${viewWidth + 10} ${SAND} L-10 ${SAND} Z`;
    return { d, sheet, wash, opacity: 0.15 + 0.6 * wash };
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

/**
 * Broken bars of light on the water, narrowing towards the horizon.
 *
 * Grouped into three bands by brightness and baked into one path each, so the whole
 * reflection costs three shapes rather than fifty. Drawing a shape per bar put stage 2
 * well above stage 1's element count, and per-frame element churn is what makes
 * CanvasKit give up on web.
 */
const REFLECTION_BANDS = [0.72, 0.52, 0.34];

/** The glints on the water twinkle in groups, each brightening and fading in turn. */
const TWINKLE_GROUPS = 3;
/** How long one glint takes to brighten and fade away again. */
const TWINKLE_SEC = 2.4;

/**
 * The sun's reflection: short glints on the water that twinkle. Each group of glints fades
 * in and out on its own beat, and only moves to new spots while it's fully faded, so the
 * water sparkles gently instead of jumping. A few paths in all, to keep web drawing light.
 */
function useReflection(viewWidth: number, seconds: number, rise: number) {
    // Which fade each group is on. A group's glints are only re-laid out when this changes,
    // which is the moment that group is invisible.
    const cycles = Array.from({ length: TWINKLE_GROUPS }, (_, g) =>
        Math.floor(seconds / TWINKLE_SEC + g / TWINKLE_GROUPS));
    const cycleKey = cycles.join(',');

    const paths = useMemo(() => {
        const out: { d: string; base: number; group: number }[] = [];
        cycles.forEach((cycle, group) => {
            let seed = 9901 + group * 7919 + cycle * 104729;
            const random = () => {
                seed = (seed * 1103515245 + 12345) & 0x7fffffff;
                return seed / 0x7fffffff;
            };
            const bands = REFLECTION_BANDS.map(() => '');
            for (let y = WATERLINE + 3; y < SAND; y += 3) {
                const depth = (y - WATERLINE) / (SAND - WATERLINE);
                // The light spreads wider across the water as the sun climbs.
                const spread = (10 + depth * 46) * (0.35 + 0.8 * rise);
                // Nearer the horizon the light is brighter, so pick the band by depth.
                const band = Math.min(REFLECTION_BANDS.length - 1, Math.floor(depth * REFLECTION_BANDS.length));
                const length = spread * (0.3 + random() * 0.7);
                const x = viewWidth / 2 + (random() - 0.5) * spread * 2 - length / 2;
                bands[band] += `M${x.toFixed(1)} ${y}h${length.toFixed(1)}v1.5h-${length.toFixed(1)}Z`;
            }
            bands.forEach((d, i) => out.push({ d, base: REFLECTION_BANDS[i], group }));
        });
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewWidth, cycleKey]);

    return paths.map((p) => {
        const along = (seconds / TWINKLE_SEC + p.group / TWINKLE_GROUPS) % 1;
        const glint = Math.sin(Math.PI * along) ** 2; // 0 at each end of the fade, 1 in the middle
        // ...and grows brighter.
        return { d: p.d, opacity: p.base * (0.45 + 0.55 * rise) * Math.min(1, glint * 1.6) };
    });
}

export const SunsetBeachBackground = ({ distance, seconds, progress, skyTop, skyMid, skyBottom, viewWidth: viewWidthProp }: Props) => {
    const viewWidth = viewWidthProp ?? SCREEN_WIDTH;
    const far = useStripImages("beach-far", FAR_SOURCES);
    const palms = useStripImages("beach-palms", PALM_SOURCES);
    const rise = Math.max(0, Math.min(1, progress));
    const reflection = useReflection(viewWidth, seconds, rise);
    const sunY = SUN_START_Y + (SUN_END_Y - SUN_START_Y) * rise;
    const sky: [string, string, string] = [skyTop, skyMid, skyBottom];

    const sunX = viewWidth / 2;

    return (
        <>
            {/* Sun: a disk with the sky banding cut across its lower half, as in the concept. */}
            <Group>
                <Circle cx={sunX} cy={sunY} r={SUN.radius} color={SUN.colour} />
                {SUN_BANDS.map((at) => {
                    const y = sunY + SUN.radius * at;
                    // Narrow towards the bottom of the disk, following its curve.
                    const halfWidth = Math.sqrt(Math.max(0, SUN.radius * SUN.radius - (y - sunY) ** 2));
                    return (
                        <Rect
                            key={at}
                            x={sunX - halfWidth} y={y}
                            width={halfWidth * 2} height={3}
                            color={skyAt(y, sky)}
                        />
                    );
                })}
            </Group>

            {tileLayer(far, FAR, distance, viewWidth, WATERLINE - FAR.height, "beach-far", 0.85)}

            {/* Water, then the light running across it. */}
            <Rect x={0} y={WATERLINE} width={viewWidth} height={SAND - WATERLINE} color={OCEAN} />
            {reflection.map((band, i) => band.d ? (
                <Path key={i} path={band.d} color={REFLECTION} style="fill" opacity={band.opacity} />
            ) : null)}

            {/* Sand, then the palms standing on it. */}
            <Rect x={0} y={SAND} width={viewWidth} height={GRID_TOP_Y - SAND} color={SAND_COLOUR} />
            <Rect x={0} y={SAND - 1} width={viewWidth} height={1.5} color={SURF} opacity={0.35} />
            {[0, 0.5].map((offset) => {
                const wave = foam(viewWidth, distance, seconds, offset);
                return (
                    <Group key={offset}>
                        <Path path={wave.sheet} color={WASH} style="fill" opacity={0.5 * wave.wash} />
                        <Path path={wave.d} color={SURF} style="stroke" strokeWidth={1.6} opacity={wave.opacity} />
                    </Group>
                );
            })}
            {/* Palms stand far enough back that the highest wave (about 10px up the sand) stops short of the trunks. */}
            {tileLayer(palms, PALMS, distance, viewWidth, SAND - PALMS.height + PALM_SETBACK, "beach-palms")}
        </>
    );
};
