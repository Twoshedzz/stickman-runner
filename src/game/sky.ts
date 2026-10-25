/**
 * The sky at any moment of a stage: its colours, where the sun and moon are, and how many
 * city lights are on. Pure numbers in, numbers out; GameCanvas draws the result.
 *
 * Most of it comes from the stage's `timeline` (stages.ts). A stage can add a few touches of
 * its own in `sky` (a look held after the finish, a floor on the city lights, a fixed moon
 * path); this file has no stage-specific checks.
 */
import { SCREEN_HEIGHT } from './constants';
import { StageConfig } from './stages';

/** What the sky looks like at one moment. */
export interface SkyLook {
    skyTop: string;
    skyMid: string;
    skyBottom: string;
    sunColor: string;
    sunY: number;
    moonY: number;
    moonOpacity: number;
    /** How far the city lights have come on: 0 = none, 1 = all. */
    nightProgress: number;
    /** How far they've gone off again towards dawn: 0 = all on, 1 = all off. */
    lightsDwindle: number;
}

/** Blend two #rrggbb colours: 0 = the first, 1 = the second. */
export const lerpColor = (color1: string, color2: string, factor: number) => {
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);

    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);

    return `rgb(${r}, ${g}, ${b})`;
};

export const getTheme = (distance: number, stage: StageConfig): SkyLook => {
    // Once the stage is over, a stage can hold one look (so the Stage Clear screen doesn't
    // flip back to night).
    if (stage.sky?.afterFinish && distance >= stage.courseLength) {
        return { ...stage.sky.afterFinish };
    }

    // Default / Fallback from static config
    let skyTop = stage.theme.skyColors[0];
    let skyMid = stage.theme.skyColors[1];
    let skyBottom = stage.theme.skyColors[2];
    let sunColor = stage.theme.sunColor;
    let sunY = -100; // Default off screen
    let moonY = -100;
    let moonOpacity = 0;
    let nightProgress = 0;
    let lightsDwindle = 0; // 0 = all on, 1 = all off (uniform turn-off order)

    if (stage.timeline) {
        stage.timeline.forEach(event => {
            // Calculate Start/End Distances (Support Negative "From End" Syntax)
            let start = event.trigger.start >= 0 ? event.trigger.start : stage.courseLength + event.trigger.start;
            let end = event.trigger.end >= 0 ? event.trigger.end : stage.courseLength + event.trigger.end;

            // If end is -1 (or any special "until end"), clamp to course length
            if (event.trigger.end === -1) end = stage.courseLength;

            // Check if active
            if (distance >= start && distance <= end) {
                const totalDist = end - start;
                const progress = totalDist > 0 ? (distance - start) / totalDist : 1;

                switch (event.type) {
                    case 'sky_gradient':
                        if (event.values.startColor && event.values.endColor) {
                            const sC = event.values.startColor as string[];
                            const eC = event.values.endColor as string[];
                            skyTop = lerpColor(sC[0], eC[0], progress);
                            skyMid = lerpColor(sC[1], eC[1], progress);
                            skyBottom = lerpColor(sC[2], eC[2], progress);
                        }
                        break;
                    case 'celestial_sun':
                        if (event.values.startY !== undefined && event.values.endY !== undefined) {
                            sunY = event.values.startY + (event.values.endY - event.values.startY) * progress;
                        }
                        if (event.values.startColor && event.values.endColor) {
                            sunColor = lerpColor(event.values.startColor as string, event.values.endColor as string, progress);
                        }
                        break;
                    case 'celestial_moon':
                        if (event.values.startY !== undefined && event.values.endY !== undefined) {
                            moonY = event.values.startY + (event.values.endY - event.values.startY) * progress;
                        }
                        moonOpacity = event.values.opacity !== undefined ? event.values.opacity : 1;
                        break;
                    case 'night_lights':
                        if (event.values.startOpacity !== undefined && event.values.endOpacity !== undefined) {
                            nightProgress = event.values.startOpacity + (event.values.endOpacity - event.values.startOpacity) * progress;
                        } else {
                            nightProgress = event.values.opacity !== undefined ? event.values.opacity : 0;
                        }
                        break;
                    case 'night_lights_dwindle':
                        if (event.values.startOpacity !== undefined && event.values.endOpacity !== undefined) {
                            lightsDwindle = event.values.startOpacity + (event.values.endOpacity - event.values.startOpacity) * progress;
                        } else {
                            lightsDwindle = event.values.opacity !== undefined ? event.values.opacity : 0;
                        }
                        break;
                }
            }
        });
    }

    // Keeps the city lights from flickering to fully off on mobile while they should be on
    // (a brief 0 from timing or boundary glitches).
    const floor = stage.sky?.lightsFloor;
    if (floor && distance >= floor.from && distance < stage.courseLength) {
        nightProgress = Math.max(nightProgress, floor.level);
    }

    return {
        skyTop, skyMid, skyBottom,
        sunColor,
        sunY,
        moonY,
        moonOpacity,
        nightProgress,
        lightsDwindle
    };
};

/**
 * Where the moon is drawn and how strongly, or null when it can't be seen. A stage's
 * `sky.moonPath` takes over from the timeline's moon between its two distances.
 */
export const moonAt = (distance: number, stage: StageConfig, theme: SkyLook) => {
    const path = stage.sky?.moonPath;
    const onPath = !!path && distance >= path.from && distance < path.to;
    if (!onPath && theme.moonOpacity <= 0) return null;
    let y = theme.moonY;
    let opacity = theme.moonOpacity;
    if (path && onPath) {
        // Down the sky from fromY to toY, fading in over the first `fadeIn` of the way.
        const t = (distance - path.from) / (path.to - path.from);
        y = path.fromY + (path.toY - path.fromY) * Math.min(1, Math.max(0, t));
        opacity = Math.min(1, (distance - path.from) / path.fadeIn);
    }
    // Skip drawing when effectively invisible (avoids unnecessary Mask/Circle work)
    if (opacity <= 0.01) return null;
    if (y < -80 || y > SCREEN_HEIGHT + 60) return null;
    return { y, opacity };
};
