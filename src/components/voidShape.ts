/**
 * The shapes a void is drawn with (ObstacleLayer.tsx), as SVG path strings. Kept apart from
 * the drawing so the geometry can be checked and previewed on its own.
 *
 * Its two edges run towards the grid's vanishing point, like the grid's own lines. Below each
 * edge is a cliff wall drawn in the grid: each line across the floor drops straight down the
 * wall, with rungs across it. The drawing clips everything to the gap, which hides the wall
 * you couldn't see from here (on the near side of each edge) without working it out.
 */
import { SCREEN_HEIGHT } from '../game/constants';
import { FLOOR_ROWS_Y, GROUND_Y, VANISH_Y } from './floorGeometry';

/** How far down a void's cliff walls are drawn before they're lost in the dark. */
export const CLIFF_DEPTH = 70;
/** Half the grid's line width (GridFloor draws its lines 2.5px wide), and a little over. */
const FAR_LINE_HALF_PX = 1.5;

export interface VoidPaths {
    /** The gap itself, across the floor from the far edge of the grid to the near. */
    gap: string;
    /** Both edges' lips. */
    edges: string;
    walls: {
        /** The wall's face, under one edge. */
        face: string;
        /** The floor's lines dropping down it. */
        drops: string;
        /** Lines across it, a third and two thirds of the way down. */
        rungs: [string, string];
    }[];
}

/**
 * `x` is the gap's left edge and `y` the runner's line it lies on, as for every obstacle;
 * `vanishX` is where the grid's lines meet.
 */
export const voidPaths = (x: number, y: number, width: number, vanishX: number): VoidPaths => {
    // How much nearer (bigger) a floor row is than the runner's line, and where an edge
    // through (edgeX, y) crosses that row.
    const scale = (rowY: number) => (rowY - VANISH_Y) / (y - VANISH_Y);
    const at = (edgeX: number, rowY: number) => vanishX + (edgeX - vanishX) * scale(rowY);
    const far = GROUND_Y;
    const near = SCREEN_HEIGHT + 2;
    const left = x;
    const right = x + width;
    const line = (e: number, depth: number) =>
        `M ${at(e, far)} ${far + depth * scale(far)} L ${at(e, near)} ${near + depth * scale(near)}`;
    const wall = (e: number) => ({
        face: `M ${at(e, far)} ${far} L ${at(e, near)} ${near} L ${at(e, near)} ${near + CLIFF_DEPTH * scale(near)} L ${at(e, far)} ${far + CLIFF_DEPTH * scale(far)} Z`,
        drops: FLOOR_ROWS_Y.map((rowY) => `M ${at(e, rowY)} ${rowY} L ${at(e, rowY)} ${rowY + CLIFF_DEPTH * scale(rowY)}`).join(' '),
        rungs: [line(e, CLIFF_DEPTH / 3), line(e, (2 * CLIFF_DEPTH) / 3)] as [string, string],
    });
    // The grid's far line is drawn centred on the floor's top edge, so half of it sits above:
    // the gap starts that much higher, so it doesn't leave a thread across the top.
    const top = far - FAR_LINE_HALF_PX;
    return {
        gap: `M ${at(left, top)} ${top} L ${at(right, top)} ${top} L ${at(right, near)} ${near} L ${at(left, near)} ${near} Z`,
        edges: `${line(left, 0)} ${line(right, 0)}`,
        walls: [wall(left), wall(right)],
    };
};
