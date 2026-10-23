/**
 * Stage 4 — Victory Dawn.
 *
 * The city returns for the finale, from evening into night: the sun sets behind the skyline,
 * street lamps come on at dusk, fireworks start once it's dark and keep going to the finish,
 * and the moon rises over the last stretch. The sky itself follows the stage's timeline.
 *
 * Each firework is drawn once as a unit-sized burst and then scaled, so animating it costs
 * nothing per frame beyond a transform - no rebuilding paths sixty times a second.
 *
 * Layout and colours are measured from assets/concepts/stage 4 - victory lap.png.
 */

import { Circle, Group, Image, Path, RadialGradient, vec } from "@shopify/react-native-skia";
import type { SkImage } from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { GROUND_HEIGHT, SCREEN_HEIGHT, SCREEN_WIDTH } from "../../game/constants";
import { useStripImages } from "./useStripImages";

const GRID_TOP_Y = SCREEN_HEIGHT - GROUND_HEIGHT;

/** Same proportions as stage 1's city, so the two skylines sit at the same depth. */
const FRONT = { height: GRID_TOP_Y * 0.53, rate: 0.5 };
const BACK = { height: GRID_TOP_Y * 0.53 * 1.25, rate: 0.2 };
const FRONT_WIDTH = FRONT.height * (450 / 350);
const BACK_WIDTH = BACK.height * (300 / 350);

const SUN = { radius: 40, colour: "#fec734" };

/**
 * The evening, as shares of the stage (0 = start, 1 = finish). The sun is down behind the
 * skyline by SUNSET_END; lamps come on over the dusk span; fireworks start at FIREWORKS_START;
 * the moon rises from MOONRISE_START to the finish.
 */
const SUNSET_END = 0.4;
const LAMPS_ON = { from: 0.28, to: 0.38 };
const FIREWORKS_START = { from: 0.42, to: 0.5 };
const MOONRISE_START = 0.72;
const MOON = { x: 0.8, radius: 30, topY: 78, colour: "#fff6dc" };
/** Where the sun sets and the moon rises from: low among the buildings, clear of the grid below. */
const HORIZON_Y = GRID_TOP_Y - 50;

/** Street lamps along the front of the city, scrolling a little slower than the ground. */
const LAMPS = { spacing: 150, rate: 0.75, height: 46, arm: 9 };
const LAMP_GLOW = "#ffd27a";

/** 0 before `from`, 1 after `to`, easing between. */
const fadeIn = (p: number, from: number, to: number) => Math.max(0, Math.min(1, (p - from) / (to - from)));

/** The posts as one dark shape, and the lamp heads as one bright one: two shapes for the whole row. */
function lampRow(distance: number, viewWidth: number) {
    const worldX = distance * LAMPS.rate;
    const first = Math.floor(worldX / LAMPS.spacing);
    const count = Math.ceil(viewWidth / LAMPS.spacing) + 2;
    let posts = "";
    let heads = "";
    const centres: { x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
        const x = (first + i) * LAMPS.spacing - worldX + 40;
        const top = GRID_TOP_Y - LAMPS.height;
        posts += `M${x - 1} ${GRID_TOP_Y}V${top}h${LAMPS.arm + 2}v2h-${LAMPS.arm}V${GRID_TOP_Y}Z`;
        const hx = x + LAMPS.arm - 2;
        heads += `M${hx} ${top + 2}h6v3h-6Z`;
        centres.push({ x: hx + 3, y: top + 4 });
    }
    return { posts, heads, centres };
}

const BACK_SOURCES = [
    require("../../../assets/victory/back_1.png"),
    require("../../../assets/victory/back_2.png"),
    require("../../../assets/victory/back_3.png"),
    require("../../../assets/victory/back_4.png"),
];
const FRONT_SOURCES = [
    require("../../../assets/victory/front_1.png"),
    require("../../../assets/victory/front_2.png"),
    require("../../../assets/victory/front_3.png"),
    require("../../../assets/victory/front_4.png"),
];

/**
 * Where each firework goes off, and how often.
 *
 * `at` is a fraction of the view width so they spread out on wider phones. `period` and
 * `offset` are in seconds, chosen so they never all burst together.
 */
const FIREWORKS = [
    { at: 0.17, y: 96,  colour: "#ff2fb9", radius: 44, spokes: 18, period: 3.1, offset: 0.0 },
    { at: 0.30, y: 132, colour: "#22d3ee", radius: 26, spokes: 14, period: 3.7, offset: 1.6 },
    { at: 0.70, y: 88,  colour: "#22d3ee", radius: 46, spokes: 20, period: 4.3, offset: 0.7 },
    { at: 0.86, y: 120, colour: "#fec734", radius: 30, spokes: 16, period: 3.4, offset: 2.4 },
];

/** A burst at radius 1, so it can simply be scaled up. Spokes stop short of the centre. */
function burstPath(spokes: number): string {
    let d = "";
    for (let i = 0; i < spokes; i++) {
        const angle = (i / spokes) * Math.PI * 2;
        const dx = Math.cos(angle), dy = Math.sin(angle);
        // Slightly uneven lengths, so it doesn't look mechanical.
        const tip = 0.82 + ((i * 37) % 19) / 100;
        d += `M${(dx * 0.3).toFixed(3)} ${(dy * 0.3).toFixed(3)}`
           + `L${(dx * tip).toFixed(3)} ${(dy * tip).toFixed(3)}`;
    }
    return d;
}

interface Props {
    /** How far the player has run. A plain number: the React Compiler treats the game
     *  state object as unchanged, which would freeze this on its first frame. */
    distance: number;
    /** Seconds into the stage, for the fireworks. Plain number, for the same reason. */
    seconds: number;
    /** How far through the stage, 0 to 1: drives the sunset, lamps, fireworks and moonrise. */
    progress: number;
    viewWidth?: number;
}

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
            />
        );
    });
}

export const VictoryDawnBackground = ({ distance, seconds, progress, viewWidth: viewWidthProp }: Props) => {
    const viewWidth = viewWidthProp ?? SCREEN_WIDTH;
    const back = useStripImages("victory-back", BACK_SOURCES);
    const front = useStripImages("victory-front", FRONT_SOURCES);

    const paths = useMemo(
        () => FIREWORKS.map((f) => burstPath(f.spokes)),
        []
    );

    const p = Math.max(0, Math.min(1, progress));
    // The sun sinks from high in the evening sky into the skyline, fading as it goes down so it
    // never ends up drawn over the grid. HORIZON_Y keeps it inside the band of buildings.
    const set = Math.min(1, p / SUNSET_END);
    const sunY = 110 + (HORIZON_Y - 110) * set;
    const sunOpacity = 1 - fadeIn(set, 0.7, 1);
    const lampsOn = fadeIn(p, LAMPS_ON.from, LAMPS_ON.to);
    const fireworksOn = fadeIn(p, FIREWORKS_START.from, FIREWORKS_START.to);
    const rise = fadeIn(p, MOONRISE_START, 1);
    const moonY = HORIZON_Y - (HORIZON_Y - MOON.topY) * rise;
    const moonOpacity = fadeIn(rise, 0, 0.25);
    const moonX = viewWidth * MOON.x;
    const lamps = lampRow(distance, viewWidth);

    return (
        <>
            {/* Sun and moon first, so the skyline stands in front of them. */}
            {sunOpacity > 0 && (
                <Circle cx={viewWidth / 2} cy={sunY} r={SUN.radius} color={SUN.colour} opacity={sunOpacity} />
            )}
            {p > MOONRISE_START && (
                // Opacity on each circle, not the group: group opacity can leak on phones.
                <Group>
                    <Circle cx={moonX} cy={moonY} r={MOON.radius * 2.4} opacity={moonOpacity}>
                        <RadialGradient
                            c={vec(moonX, moonY)}
                            r={MOON.radius * 2.4}
                            colors={["rgba(255, 246, 220, 0.35)", "rgba(255, 246, 220, 0.08)", "rgba(255, 246, 220, 0)"]}
                            positions={[0.35, 0.65, 1]}
                        />
                    </Circle>
                    <Circle cx={moonX} cy={moonY} r={MOON.radius} color={MOON.colour} opacity={moonOpacity} />
                </Group>
            )}

            {fireworksOn > 0 && FIREWORKS.map((firework, i) => {
                const t = ((seconds + firework.offset) % firework.period) / firework.period;
                // Shoots out fast, then drifts and fades.
                const scale = firework.radius * (1 - Math.pow(1 - Math.min(1, t * 2.2), 3));
                const opacity = t < 0.08 ? t / 0.08 : Math.max(0, 1 - (t - 0.08) / 0.72);
                if (opacity <= 0.01 || scale <= 0.5) return null;

                return (
                    <Group
                        key={i}
                        transform={[
                            { translateX: viewWidth * firework.at },
                            { translateY: firework.y },
                            { scale },
                        ]}
                    >
                        <Path
                            path={paths[i]}
                            color={firework.colour}
                            style="stroke"
                            // Divided by the scale, so the lines stay thin however big the burst gets.
                            strokeWidth={1.8 / scale}
                            strokeCap="round"
                            opacity={opacity * fireworksOn}
                        />
                    </Group>
                );
            })}

            {tileLayer(back, { width: BACK_WIDTH, height: BACK.height, rate: BACK.rate },
                distance, viewWidth, GRID_TOP_Y - BACK.height, "victory-back")}
            {tileLayer(front, { width: FRONT_WIDTH, height: FRONT.height, rate: FRONT.rate },
                distance, viewWidth, GRID_TOP_Y - FRONT.height, "victory-front")}

            {/* Street lamps: dark posts always, warm light once dusk falls. */}
            <Path path={lamps.posts} color="#0a0716" style="fill" />
            {lampsOn > 0 && (
                <Group>
                    {lamps.centres.map((c, i) => (
                        <Circle key={i} cx={c.x} cy={c.y + 10} r={26} opacity={lampsOn}>
                            <RadialGradient
                                c={vec(c.x, c.y + 10)}
                                r={26}
                                colors={["rgba(255, 210, 122, 0.55)", "rgba(255, 210, 122, 0.15)", "rgba(255, 210, 122, 0)"]}
                                positions={[0, 0.5, 1]}
                            />
                        </Circle>
                    ))}
                    <Path path={lamps.heads} color={LAMP_GLOW} style="fill" opacity={lampsOn} />
                </Group>
            )}
        </>
    );
};
