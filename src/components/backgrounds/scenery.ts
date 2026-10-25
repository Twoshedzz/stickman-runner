/**
 * Each stage's scenery, by the `backgroundType` it names in stages.ts. A new kind of scenery
 * is a component that takes SceneryProps (it can ignore what it doesn't need) and one more
 * entry here.
 */
import { ComponentType } from 'react';
import { BackgroundType } from '../../game/stages';
import { MidnightMountainsBackground } from './MidnightMountainsBackground';
import { NeonCityScenery } from './NeonCityScenery';
import { SunsetBeachBackground } from './SunsetBeachBackground';
import { VictoryDawnBackground } from './VictoryDawnBackground';

/**
 * What every scenery is given each frame. Plain numbers and strings: passing the game state
 * object makes the React Compiler treat it as unchanged and the scenery stops scrolling.
 */
export interface SceneryProps {
    /** How far the world has scrolled this stage, in pixels (GameState.scroll). */
    distance: number;
    /** Seconds into the stage. */
    seconds: number;
    /** How far through the stage, 0 at the start to 1 at the finish. */
    progress: number;
    /** The sky's colours right now (sky.ts), for scenery that reflects the sky. */
    skyTop: string;
    skyMid: string;
    skyBottom: string;
    viewWidth: number;
    /** City windows: 0 = every one dark, 1 = fully lit. */
    lightLevel: number;
    /** Called once the scenery's images are ready, so the start screen can appear. */
    onAssetsReady?: () => void;
}

export interface Scenery {
    Component: ComponentType<SceneryProps>;
    /**
     * Loads images and calls onAssetsReady itself once they're ready. Scenery without it is
     * drawn from shapes, and the game is told it's ready straight away.
     */
    loadsAssets?: boolean;
}

export const SCENERY: Record<BackgroundType, Scenery> = {
    city: { Component: NeonCityScenery, loadsAssets: true },
    beach: { Component: SunsetBeachBackground },
    mountains: { Component: MidnightMountainsBackground },
    city_victory: { Component: VictoryDawnBackground },
};
