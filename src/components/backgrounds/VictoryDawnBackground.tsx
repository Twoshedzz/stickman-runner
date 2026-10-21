/**
 * Stage 4 — Victory Dawn.
 *
 * The city returns at sunrise: a gold sun behind the skyline, rooftops and windows already
 * lit, and fireworks going off overhead.
 *
 * Each firework is drawn once as a unit-sized burst and then scaled, so animating it costs
 * nothing per frame beyond a transform - no rebuilding paths sixty times a second.
 *
 * Layout and colours are measured from assets/concepts/stage 4 - victory lap.png.
 */

import { Circle, Group, Image, Path } from "@shopify/react-native-skia";
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

const SUN = { y: 142, radius: 40, colour: "#fec734" };

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

export const VictoryDawnBackground = ({ distance, viewWidth: viewWidthProp }: Props) => {
    const viewWidth = viewWidthProp ?? SCREEN_WIDTH;
    const back = useStripImages("victory-back", BACK_SOURCES);
    const front = useStripImages("victory-front", FRONT_SOURCES);

    const paths = useMemo(
        () => FIREWORKS.map((f) => burstPath(f.spokes)),
        []
    );

    // Distance advances at a steady rate, so it doubles as a clock.
    const seconds = distance / 240;

    return (
        <>
            {/* Sun first, so the skyline stands in front of it. */}
            <Circle cx={viewWidth / 2} cy={SUN.y} r={SUN.radius} color={SUN.colour} />

            {FIREWORKS.map((firework, i) => {
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
                            opacity={opacity}
                        />
                    </Group>
                );
            })}

            {tileLayer(back, { width: BACK_WIDTH, height: BACK.height, rate: BACK.rate },
                distance, viewWidth, GRID_TOP_Y - BACK.height, "victory-back")}
            {tileLayer(front, { width: FRONT_WIDTH, height: FRONT.height, rate: FRONT.rate },
                distance, viewWidth, GRID_TOP_Y - FRONT.height, "victory-front")}
        </>
    );
};
