import { Group, Path, Rect, rect, rrect } from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { GROUND_HEIGHT, SCREEN_HEIGHT, SCREEN_WIDTH } from "../game/constants";
import { GameState } from "../game/state";

const GROUND_Y = SCREEN_HEIGHT - GROUND_HEIGHT;
const GRID_HEIGHT = GROUND_HEIGHT;
/** Where the grid's lines converge. Exported so anything standing in the grid (the finish
 *  line) can follow the same perspective. */
export const VANISH_Y = GROUND_Y - 120;

const CELL_WIDTH = 56; // spacing at bottom (~30% fewer lines = bigger squares), loops smoothly
// Slight nudge so grid keeps up with obstacles (avoids obstacles appearing to slide forward)
const GRID_SPEED_NUDGE = 1.18;

interface GridFloorProps {
    gameState: GameState;
    tick?: number;
    /** Drawn width (default SCREEN_WIDTH). When > 600, grid extends to fill wider view. */
    viewWidth?: number;
    /** Neon colour of the grid lines. Defaults to stage 1's pink. Colour only: the line
     *  count, spacing and perspective are the same on every stage. */
    gridColor?: string;
    /** Landing glow under the runner: where his feet are, and how strong (1 just landed, 0 none). */
    glowX?: number;
    glowY?: number;
    glow?: number;
}

/**
 * Neon grid below the runner line.
 * Horizontal lines: static, full width.
 * Vertical lines: perspective (toward vanishing point) but they SCROLL horizontally
 * at the bottom instead of rotating - gives smooth motion without angle changes.
 */
export const GridFloor = ({ gameState, tick = 0, viewWidth: viewWidthProp, gridColor = "rgba(255, 100, 255, 0.55)", glowX = 0, glowY = 0, glow = 0 }: GridFloorProps) => {
    const viewWidth = viewWidthProp ?? SCREEN_WIDTH;
    const vanishX = viewWidth / 2;
    const isMoving =
        gameState.gameStarted &&
        !gameState.gameOver &&
        gameState.stageStatus === "playing";

    const scrollOffset = useMemo(() => {
        if (!isMoving) return 0;
        // Scroll moves exactly as far as the obstacles do, whatever the speed.
        const raw = gameState.scroll * GRID_SPEED_NUDGE;
        return ((raw % CELL_WIDTH) + CELL_WIDTH) % CELL_WIDTH;
    }, [isMoving, gameState.scroll, tick]);

    const content = useMemo(() => {
        const lines: string[] = [];
        const depthToBottom = SCREEN_HEIGHT - VANISH_Y;
        const depthToGround = GROUND_Y - VANISH_Y;
        const tTop = depthToGround / depthToBottom; // param for where ray hits y=GROUND_Y

        const round = (n: number) => Math.round(n);

        // ---- Static horizontal lines: full width ----
        const nHorizontal = 4;
        for (let i = 0; i <= nHorizontal; i++) {
            const t = i / nHorizontal;
            const y = round(GROUND_Y + (SCREEN_HEIGHT - GROUND_Y) * t);
            lines.push(`M 0 ${y} L ${viewWidth} ${y}`);
        }

        // ---- Vertical lines: toward vanishX (screen center), extend off-screen to avoid pop-in on wide mobiles ----
        const halfSpan = viewWidth * 1.4;
        const margin = 120;
        let baseX = Math.floor((vanishX - halfSpan) / CELL_WIDTH) * CELL_WIDTH;
        const linesOut: string[] = [];
        while (baseX <= vanishX + halfSpan + CELL_WIDTH) {
            const xBottom = baseX - scrollOffset;
            const xTop = vanishX + (xBottom - vanishX) * tTop;
            const y1 = GROUND_Y;
            const y2 = SCREEN_HEIGHT;
            if (xBottom > -margin && xBottom < viewWidth + margin) {
                linesOut.push(`M ${xTop} ${y1} L ${xBottom} ${y2}`);
            }
            baseX += CELL_WIDTH;
        }
        lines.push(...linesOut);

        // All the lines as one shape too, for drawing the landing glow cheaply.
        return { lines, all: lines.join(' ') };
    }, [scrollOffset, tick, viewWidth, vanishX]);

    // The glow spreads out as it fades, like a ripple, flattened to the grid's perspective.
    const spread = 1 - glow;
    const rx = 48 + 46 * spread;
    const ry = 9 + 8 * spread;

    return (
        <Group>
            <Rect
                x={0}
                y={GROUND_Y}
                width={viewWidth}
                height={GRID_HEIGHT + 2}
                color="rgba(8, 4, 24, 0.98)"
            />
            {content.lines.map((path, i) => (
                <Path
                    key={i}
                    path={path}
                    style="stroke"
                    strokeWidth={2.5}
                    color={gridColor}
                />
            ))}
            {/* Landing glow: just the grid lines near his feet, brighter for a moment. */}
            {glow > 0.02 && (
                <Group clip={rrect(rect(glowX - rx, glowY - ry, rx * 2, ry * 2), rx, ry)}>
                    <Path path={content.all} style="stroke" strokeWidth={3} color={gridColor} opacity={glow} />
                    <Path path={content.all} style="stroke" strokeWidth={1} color="#ffffff" opacity={0.6 * glow} />
                </Group>
            )}
        </Group>
    );
};
