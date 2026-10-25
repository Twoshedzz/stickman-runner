/**
 * Which colours an obstacle is drawn in on a stage, from its `tint` in the obstacle table.
 * Kept apart from the Skia drawing so the menus can use it too.
 */
import { COLOR_HP_DEEP } from '../game/constants';
import { ObstacleTint } from '../game/obstacleCatalogue';
import { StageConfig } from '../game/stages';

export const tintColours = (tint: ObstacleTint, theme: StageConfig['theme']): { colour: string; glow: string } => {
    const palette = theme.obstacleColors;
    switch (tint) {
        case 'red': return { colour: palette.red, glow: palette.redGlow };
        case 'purple': return { colour: palette.purple, glow: palette.purpleGlow };
        case 'overhead': return { colour: palette.overhead, glow: palette.overheadGlow };
        // A hole's rim is lit in the stage's pickup glow.
        case 'hole': return { colour: theme.pickupColors.glow, glow: theme.pickupColors.glow };
        // Hearts keep the same pink everywhere: a pickup that changed colour per stage would
        // stop reading as "this one helps you".
        case 'heart': return { colour: COLOR_HP_DEEP, glow: COLOR_HP_DEEP };
        default: return { colour: palette.block, glow: palette.blockGlow };
    }
};
