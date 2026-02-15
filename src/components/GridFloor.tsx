import { Group, Path, Rect } from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { BASE_SPEED, GROUND_HEIGHT, SCREEN_HEIGHT, SCREEN_WIDTH, STAGE_DURATION_SECONDS } from "../game/constants";
import { GameState } from "../game/state";

const GROUND_Y = SCREEN_HEIGHT - GROUND_HEIGHT;
const GRID_HEIGHT = GROUND_HEIGHT;
/** Vanishing point at center of focus (600); grid can extend to viewWidth. */
const VANISH_X = SCREEN_WIDTH / 2;
const VANISH_Y = GROUND_Y - 120;

const CELL_WIDTH = 56; // spacing at bottom (~30% fewer lines = bigger squares), loops smoothly
// Slight nudge so grid keeps up with obstacles (avoids obstacles appearing to slide forward)
const GRID_SPEED_NUDGE = 1.18;

interface GridFloorProps {
    gameState: GameState;
    /** Stage course length (so grid scroll matches obstacle speed). */
    courseLength: number;
    tick?: number;
    /** Drawn width (default SCREEN_WIDTH). When > 600, grid extends to fill wider view. */
    viewWidth?: number;
}

/**
 * Neon grid below the runner line.
 * Horizontal lines: static, full width.
 * Vertical lines: perspective (toward vanishing point) but they SCROLL horizontally
 * at the bottom instead of rotating - gives smooth motion without angle changes.
 */
export const GridFloor = ({ gameState, courseLength, tick = 0, viewWidth: viewWidthProp }: GridFloorProps) => {
    const viewWidth = viewWidthProp ?? SCREEN_WIDTH;
    const isMoving =
        gameState.gameStarted &&
        !gameState.gameOver &&
        gameState.stageStatus === "playing";

    const scrollOffset = useMemo(() => {
        if (!isMoving) return 0;
        // Match obstacle speed: obstacles move BASE_SPEED*60 px/s, distance increases by courseLength/STAGE_DURATION per second
        const pixelsPerDistance = ((BASE_SPEED * 60 * STAGE_DURATION_SECONDS) / courseLength) * GRID_SPEED_NUDGE;
        const raw = gameState.distance * pixelsPerDistance;
        return ((raw % CELL_WIDTH) + CELL_WIDTH) % CELL_WIDTH;
    }, [isMoving, gameState.distance, courseLength, tick]);

    const content = useMemo(() => {
        const lines: string[] = [];
        const gridColor = "rgba(255, 100, 255, 0.55)";
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

        // ---- Vertical lines: fixed angle toward vanishing point, scroll by shifting bottom x ----
        // Each line goes from (xBottom, SCREEN_HEIGHT) to (xTop, GROUND_Y) where top is on the ray to (VANISH_X, VANISH_Y).
        // xTop = VANISH_X + (xBottom - VANISH_X) * tTop. Scroll: xBottom = baseX - scrollOffset.
        const halfSpan = viewWidth * 0.6;
        let baseX = Math.floor((VANISH_X - halfSpan) / CELL_WIDTH) * CELL_WIDTH;
        const linesOut: string[] = [];
        while (baseX <= VANISH_X + halfSpan + CELL_WIDTH) {
            const xBottom = baseX - scrollOffset;
            const xTop = VANISH_X + (xBottom - VANISH_X) * tTop;
            const y1 = GROUND_Y;
            const y2 = SCREEN_HEIGHT;
            if (xBottom > -80 && xBottom < viewWidth + 80) {
                linesOut.push(`M ${xTop} ${y1} L ${xBottom} ${y2}`);
            }
            baseX += CELL_WIDTH;
        }
        lines.push(...linesOut);

        return { lines, gridColor };
    }, [scrollOffset, tick, viewWidth]);

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
                    color={content.gridColor}
                />
            ))}
        </Group>
    );
};
