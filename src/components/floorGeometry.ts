/**
 * Where the neon floor is and how its perspective works: plain numbers, shared by the grid
 * (GridFloor.tsx) and anything that stands in it or cuts into it (the finish line, blocks, a
 * void's cliffs).
 */
import { GROUND_HEIGHT, SCREEN_HEIGHT } from '../game/constants';

/** The top of the floor, where it meets the scenery. */
export const GROUND_Y = SCREEN_HEIGHT - GROUND_HEIGHT;
/** Where the grid's lines converge. */
export const VANISH_Y = GROUND_Y - 120;
/** The grid's lines across the floor, far to near. A void's cliffs drop from the same rows. */
export const FLOOR_ROWS_Y = [0, 1, 2, 3, 4].map((i) => Math.round(GROUND_Y + ((SCREEN_HEIGHT - GROUND_Y) * i) / 4));
/** Stage 1's pink, for stages that don't set their own grid colour. */
export const DEFAULT_GRID_COLOR = 'rgba(255, 100, 255, 0.55)';
