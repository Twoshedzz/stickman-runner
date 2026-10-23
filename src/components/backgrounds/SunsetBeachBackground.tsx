/**
 * Stage 2 — Sunset Beach.
 *
 * Layout and colours are taken from assets/concepts/stage 2 - sunset beach.png: the sun
 * sits just above the waterline, low cloud streaks run along it, and palms stand on the
 * sand in front.
 *
 * The sun, its banding, the water and its reflection are drawn as shapes, since they
 * either never move or need to shimmer. Only the palms are strips; the clouds on the horizon are drawn too.
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
const BAND_TINT = "#6b2f7a";
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
 * Sunset: the sun's centre at the start (the whole disk just clear of the water) and at the
 * end (just a sliver left above the sea). It sinks steadily between them.
 */
const SUN_START_Y = WATERLINE - SUN.radius - 4;
const SUN_END_Y = WATERLINE + SUN.radius - 8;

const PALMS = { width: 450, height: 170, rate: 0.45 };

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
    /** How far through the stage, 0 to 1: the sun sets with it. */
    progress: number;
    /** The sky's current top, middle and bottom colours (it darkens through the stage). */
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
function useReflection(viewWidth: number, seconds: number, rise: number, sunHalfWidth: number) {
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
                // As wide as the sun showing above the water, spreading a little wider nearer the viewer.
                const spread = sunHalfWidth * (0.85 + 0.35 * depth);
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
        // ...and dims as the sun goes down.
        return { d: p.d, opacity: p.base * (0.45 + 0.55 * rise) * Math.min(1, glint * 1.6) };
    });
}

/**
 * Low cloud along the horizon, the classic 80s sunset look. In perspective the streaks
 * nearest the horizon are the furthest away, so those stay as thin flat stripes, slightly
 * dimmer; the higher, nearer ones are a little thicker with a gently bumpy top. Both drift
 * slowly and cool in colour as the sun goes down. Each layer is one shape: two draws in all.
 */
const CLOUD_TILE = 1200;
const CLOUDS = {
    // Higher up, so nearer: bumpy tops.
    near: [
        { x: 40, y: 184, length: 260, h: 6 }, { x: 380, y: 194, length: 190, h: 5 },
        { x: 640, y: 180, length: 300, h: 7 }, { x: 1010, y: 190, length: 150, h: 5 },
    ],
    // Down by the horizon, so far away: plain thin stripes.
    far: [
        { x: 120, y: 205, length: 340, h: 3 }, { x: 560, y: 201, length: 220, h: 3 },
        { x: 820, y: 209, length: 280, h: 4 }, { x: 0, y: 212, length: 90, h: 2 },
    ],
};
/** Colours of each layer once the sun is down and while it's still up. */
const CLOUD_COLOURS = {
    near: ["#6e3570", "#ffa98a"],
    far: ["#4a2a66", "#c97a8e"],
};

function mixColour(from: string, to: string, t: number): string {
    const a = toRgb(from);
    const b = toRgb(to);
    const c = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
    return `rgb(${c(0)}, ${c(1)}, ${c(2)})`;
}

/** A long thin bar with rounded ends. */
function streak(x: number, y: number, length: number, h: number): string {
    const r = h / 2;
    return `M${(x + r).toFixed(1)} ${y}h${(length - h).toFixed(1)}a${r} ${r} 0 0 1 0 ${h}h-${(length - h).toFixed(1)}a${r} ${r} 0 0 1 0 -${h}Z`;
}

/**
 * The same bar with a softly billowing top: a row of small rounded bumps of uneven size.
 * `seed` keeps each cloud's bumps the same from frame to frame.
 */
function bumpyStreak(x: number, y: number, length: number, h: number, seed: number): string {
    const r = h / 2;
    const left = x + r;
    const right = x + length - r;
    // Flat bottom, then round the right-hand end up to the top...
    let d = `M${left.toFixed(1)} ${y + h}H${right.toFixed(1)}a${r} ${r} 0 0 0 0 -${h}`;
    // ...then back along the top in bumps...
    let at = right;
    let i = 0;
    while (at > left) {
        const width = Math.min(at - left, 14 + ((seed * 7 + i * 13) % 11));
        const lift = 1.5 + ((seed * 5 + i * 17) % 7) * 0.35;
        const next = at - width;
        d += `Q${(at - width / 2).toFixed(1)} ${(y - lift * 2).toFixed(1)} ${next.toFixed(1)} ${y}`;
        at = next;
        i++;
    }
    // ...and round the left-hand end back down.
    return `${d}a${r} ${r} 0 0 0 0 ${h}Z`;
}

function useClouds(viewWidth: number, distance: number, seconds: number, rise: number) {
    // Drift: a little with the scenery, a little on their own.
    const drift = (distance * 0.04 + seconds * 3) % CLOUD_TILE;
    const layer = (list: typeof CLOUDS.near, speed: number, bumpy: boolean) => {
        let d = "";
        const shift = drift * speed;
        for (let copy = -1; copy <= Math.ceil(viewWidth / CLOUD_TILE); copy++) {
            list.forEach((c, index) => {
                const x = c.x + copy * CLOUD_TILE - (shift % CLOUD_TILE);
                if (x > viewWidth || x + c.length < 0) return;
                d += bumpy ? bumpyStreak(x, c.y, c.length, c.h, index + 1) : streak(x, c.y, c.length, c.h);
            });
        }
        return d;
    };
    return {
        far: layer(CLOUDS.far, 0.6, false),
        near: layer(CLOUDS.near, 1, true),
        farColour: mixColour(CLOUD_COLOURS.far[0], CLOUD_COLOURS.far[1], rise),
        nearColour: mixColour(CLOUD_COLOURS.near[0], CLOUD_COLOURS.near[1], rise),
    };
}

export const SunsetBeachBackground = ({ distance, seconds, progress, skyTop, skyMid, skyBottom, viewWidth: viewWidthProp }: Props) => {
    const viewWidth = viewWidthProp ?? SCREEN_WIDTH;
    const palms = useStripImages("beach-palms", PALM_SOURCES);
    const set = Math.max(0, Math.min(1, progress));
    // How high the sun still is: 1 at the start, down to 0 as it sets. The clouds and the
    // light on the water fade with it.
    const rise = 1 - set;
    const sunY = SUN_START_Y + (SUN_END_Y - SUN_START_Y) * set;
    // How wide the sun is where it meets the water: its full width while it's clear, just a
    // chord once it's sinking into the sea. The light on the water matches this.
    const belowWater = sunY - WATERLINE;
    const sunHalfWidth = belowWater <= 0
        ? SUN.radius
        : Math.sqrt(Math.max(0, SUN.radius * SUN.radius - belowWater * belowWater));
    const reflection = useReflection(viewWidth, seconds, rise, sunHalfWidth);
    const sky: [string, string, string] = [skyTop, skyMid, skyBottom];
    const clouds = useClouds(viewWidth, distance, seconds, rise);

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
                            // A touch deeper than the sky, so the bands still show once the sky
                            // near the horizon has warmed to almost the sun's own orange.
                            color={mixColour(skyAt(y, sky), BAND_TINT, 0.35)}
                        />
                    );
                })}
            </Group>

            {/* Low cloud on the horizon, in front of the setting sun. */}
            <Path path={clouds.far} color={clouds.farColour} style="fill" opacity={0.75} />
            <Path path={clouds.near} color={clouds.nearColour} style="fill" opacity={0.9} />

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
