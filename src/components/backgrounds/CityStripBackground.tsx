/**
 * City background using pre-generated strip images (no/some/all lights).
 * Replaces per-frame Path + many Rects with a few Image draws for performance.
 * See docs/CITY_LIGHTS_PREGEN_DESIGN.md.
 *
 * Strip queuing: strip type changes are queued by game distance so new strips
 * only appear as they scroll on from the right—no visible flip on screen.
 * Same approach can be used for other levels (trees, mountains).
 *
 * Assets: assets/city/
 * - Back (16): back_amount_number.png — amount none|few|more|all, number 1–4. Each 300px wide.
 * - Front (17): front_amount_number.png — amount none|few|more|all, number 1–4 (all has 1–5). Each 450px wide.
 * Front and back use same theme mapping (getBackAmountFromTheme) so lights grow/dwindle at the same points.
 */

import { Group, Image, Rect, Skia, useImage } from "@shopify/react-native-skia";
import type { SkImage } from "@shopify/react-native-skia";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Asset } from "expo-asset";
import { GROUND_HEIGHT, SCREEN_HEIGHT, SCREEN_WIDTH } from "../../game/constants";
import { GameState } from "../../game/state";

const CITY_WIDTH = SCREEN_WIDTH * 2;
const BACK_RATE = 0.2;
const FRONT_RATE = 0.5;
/** Grid top (y of the pink runner line); building strip bottom meets this with no gap. */
const GRID_TOP_Y = SCREEN_HEIGHT - GROUND_HEIGHT;
/** y of the bottom of the front building strip (same as grid top = no gap). */
const FRONT_STRIP_BOTTOM_Y = GRID_TOP_Y;
/** One back-layer tile in game distance; never prune queue entries within this of leftmost tile. */
const BACK_TILE_DISTANCE = CITY_WIDTH / BACK_RATE;
const FRONT_TILE_DISTANCE = CITY_WIDTH / FRONT_RATE;
const BUILDING_BAND_TOP = 170;
/** Front building strip height as fraction of space above grid; full PNG visible with fit="contain". */
const FRONT_LAYER_SCALE = 0.53;
/** Back layer scale multiplier vs front (1.25 = 25% bigger). */
const BACK_LAYER_SCALE_MULT = 1.25;
/** Front strip images are 450px wide; default aspect when image not loaded. */
const FRONT_STRIP_DEFAULT_ASPECT = 450 / 100;
/** Minimum strips in queue at start. */
const MIN_STRIP_QUEUE_LENGTH = 5;
/** Back strips are shorter (300px); need more in queue at start. */
const MIN_BACK_STRIP_QUEUE_LENGTH = 10;

/** Back parallax layer enabled; uses same strip queue as front (no on-screen flip). */
const ENABLE_BACK_LAYER = true;

/** Shared amount for front and back so lights grow/dwindle at the same points. */
export type BackAmount = "none" | "few" | "more" | "all";
export type FrontAmount = BackAmount;

export const BACK_AMOUNTS: BackAmount[] = ["none", "few", "more", "all"];
export const BACK_VARIANTS = [1, 2, 3, 4] as const;
export type BackVariant = (typeof BACK_VARIANTS)[number];

export const FRONT_ALL_VARIANTS = [1, 2, 3, 4, 5] as const;
export type FrontAllVariant = (typeof FRONT_ALL_VARIANTS)[number];
export const FRONT_OTHER_VARIANTS = [1, 2, 3, 4] as const;
export type FrontOtherVariant = (typeof FRONT_OTHER_VARIANTS)[number];

/** Map theme to amount: morning/dawn → none, middle of night → all. Same for front and back. */
export function getBackAmountFromTheme(currentTheme: {
    nightProgress: number;
    lightsDwindle?: number;
}): BackAmount {
    const lightsDwindle = currentTheme.lightsDwindle ?? 0;
    const effectiveLevel = Math.max(
        0,
        Math.min(1, currentTheme.nightProgress * (1 - lightsDwindle))
    );
    if (effectiveLevel <= 0.15) return "none";
    if (effectiveLevel < 0.4) return "few";
    if (effectiveLevel < 0.85) return "more";
    return "all";
}

export const getFrontAmountFromTheme = getBackAmountFromTheme;

// Static requires so Metro can resolve assets.
const FRONT_STRIP_SOURCES: Record<FrontAmount, Record<number, number>> = {
    none: {
        1: require("../../../assets/city/front_none_1.png"),
        2: require("../../../assets/city/front_none_2.png"),
        3: require("../../../assets/city/front_none_3.png"),
        4: require("../../../assets/city/front_none_4.png"),
    },
    few: {
        1: require("../../../assets/city/front_few_1.png"),
        2: require("../../../assets/city/front_few_2.png"),
        3: require("../../../assets/city/front_few_3.png"),
        4: require("../../../assets/city/front_few_4.png"),
    },
    more: {
        1: require("../../../assets/city/front_more_1.png"),
        2: require("../../../assets/city/front_more_2.png"),
        3: require("../../../assets/city/front_more_3.png"),
        4: require("../../../assets/city/front_more_4.png"),
    },
    all: {
        1: require("../../../assets/city/front_all_1.png"),
        2: require("../../../assets/city/front_all_2.png"),
        3: require("../../../assets/city/front_all_3.png"),
        4: require("../../../assets/city/front_all_4.png"),
        5: require("../../../assets/city/front_all_5.png"),
    },
};

const BACK_STRIP_SOURCES: Record<BackAmount, Record<BackVariant, number>> = {
    none: {
        1: require("../../../assets/city/back_none_1.png"),
        2: require("../../../assets/city/back_none_2.png"),
        3: require("../../../assets/city/back_none_3.png"),
        4: require("../../../assets/city/back_none_4.png"),
    },
    few: {
        1: require("../../../assets/city/back_few_1.png"),
        2: require("../../../assets/city/back_few_2.png"),
        3: require("../../../assets/city/back_few_3.png"),
        4: require("../../../assets/city/back_few_4.png"),
    },
    more: {
        1: require("../../../assets/city/back_more_1.png"),
        2: require("../../../assets/city/back_more_2.png"),
        3: require("../../../assets/city/back_more_3.png"),
        4: require("../../../assets/city/back_more_4.png"),
    },
    all: {
        1: require("../../../assets/city/back_all_1.png"),
        2: require("../../../assets/city/back_all_2.png"),
        3: require("../../../assets/city/back_all_3.png"),
        4: require("../../../assets/city/back_all_4.png"),
    },
};

/** Web only: cache loaded SkImages at module level. */
type BackImageMap = Record<BackAmount, Record<BackVariant, SkImage>>;
type FrontImageMap = Record<FrontAmount, Record<number, SkImage>>; // none/few/more: 1-4, all: 1-5
let cachedWebFrontStripImages: FrontImageMap | null = null;
let cachedWebBackStripImages: BackImageMap | null = null;

interface CityStripBackgroundProps {
    gameState: GameState;
    currentTheme: { nightProgress: number; lightsDwindle?: number };
    /** Called once when front strip images are ready (so UI can show countdown / allow start). */
    onAssetsReady?: () => void;
}

export interface BackQueueEntry {
    amount: BackAmount;
    variant: BackVariant;
}

export interface FrontQueueEntry {
    amount: FrontAmount;
    variant: number; // 1-4 for none/few/more, 1-5 for all
}

/** Pick variant 1–4 from distance (deterministic). */
function backVariantFromDistance(distance: number): BackVariant {
    const n = Math.floor(distance / 80) % 4;
    return (n + 1) as BackVariant;
}

/** Pick front variant from distance: 1-4 for none/few/more, 1-5 for all. */
function frontVariantFromDistance(distance: number, amount: FrontAmount): number {
    const seed = Math.floor(distance / 80);
    if (amount === "all") return (seed % 5) + 1;
    return (seed % 4) + 1;
}

export function CityStripBackground({
    gameState,
    currentTheme,
    onAssetsReady,
}: CityStripBackgroundProps) {
    const themeFrontAmount = useMemo(
        () => getFrontAmountFromTheme(currentTheme),
        [currentTheme.nightProgress, currentTheme.lightsDwindle]
    );
    const themeBackAmount = useMemo(
        () => getBackAmountFromTheme(currentTheme),
        [currentTheme.nightProgress, currentTheme.lightsDwindle]
    );

    const frontStripQueueRef = useRef<FrontQueueEntry[]>([]);
    const backStripQueueRef = useRef<BackQueueEntry[]>([]);

    const isWeb = typeof window !== "undefined";
    const [webFrontImagesReady, setWebFrontImagesReady] = useState(!!cachedWebFrontStripImages);

    useEffect(() => {
        if (!isWeb) return;
        let cancelled = false;
        const uri = (a: Asset) => a.localUri ?? a.uri ?? null;

        (async () => {
            try {
                const hasSkia = typeof Skia?.Data?.fromURI === "function";
                if (!hasSkia) return;

                const frontModules = BACK_AMOUNTS.flatMap((a) =>
                    a === "all"
                        ? FRONT_ALL_VARIANTS.map((v) => FRONT_STRIP_SOURCES[a][v])
                        : FRONT_OTHER_VARIANTS.map((v) => FRONT_STRIP_SOURCES[a][v])
                );
                const backModules = BACK_AMOUNTS.flatMap((a) =>
                    BACK_VARIANTS.map((v) => BACK_STRIP_SOURCES[a][v])
                );

                // Load front and back in parallel so back is ready much sooner (often with front).
                const [frontLoaded, backLoaded] = await Promise.all([
                    cachedWebFrontStripImages === null ? Asset.loadAsync(frontModules) : Promise.resolve([]),
                    cachedWebBackStripImages === null ? Asset.loadAsync(backModules) : Promise.resolve([]),
                ]);
                if (cancelled) return;

                const decodeFront = async (): Promise<void> => {
                    if (cachedWebFrontStripImages !== null || frontLoaded.length === 0) return;
                    const frontUris = frontLoaded.map((a) => (a ? uri(a) : null));
                    const frontData = await Promise.all(
                        frontUris.map((u) => (u ? Skia.Data.fromURI(u) : Promise.resolve(null)))
                    );
                    if (cancelled) return;
                    const frontImgs = frontData.map((d) => (d ? Skia.Image.MakeImageFromEncoded(d) : null));
                    if (frontImgs.every(Boolean)) {
                        const map: FrontImageMap = { none: { 1: null!, 2: null!, 3: null!, 4: null! }, few: { 1: null!, 2: null!, 3: null!, 4: null! }, more: { 1: null!, 2: null!, 3: null!, 4: null! }, all: { 1: null!, 2: null!, 3: null!, 4: null!, 5: null! } };
                        let idx = 0;
                        BACK_AMOUNTS.forEach((amount) => {
                            const vars = amount === "all" ? FRONT_ALL_VARIANTS : FRONT_OTHER_VARIANTS;
                            vars.forEach((v) => {
                                map[amount][v] = frontImgs[idx]!;
                                idx++;
                            });
                        });
                        cachedWebFrontStripImages = map;
                        setWebFrontImagesReady(true);
                    }
                };

                const decodeBack = async (): Promise<void> => {
                    if (cachedWebBackStripImages !== null || backLoaded.length === 0) return;
                    try {
                        const backUris = backLoaded.map((a) => (a ? uri(a) : null));
                        const backData = await Promise.all(
                            backUris.map((u) => (u ? Skia.Data.fromURI(u) : Promise.resolve(null)))
                        );
                        if (cancelled) return;
                        const backImgs = backData.map((d) => (d ? Skia.Image.MakeImageFromEncoded(d) : null));
                        if (backImgs.every(Boolean)) {
                            const map: BackImageMap = { none: { 1: null!, 2: null!, 3: null!, 4: null! }, few: { 1: null!, 2: null!, 3: null!, 4: null! }, more: { 1: null!, 2: null!, 3: null!, 4: null! }, all: { 1: null!, 2: null!, 3: null!, 4: null! } };
                            BACK_AMOUNTS.forEach((amount, ai) => {
                                BACK_VARIANTS.forEach((variant, vi) => {
                                    map[amount][variant] = backImgs[ai * 4 + vi]!;
                                });
                            });
                            cachedWebBackStripImages = map;
                        }
                    } catch {
                        // keep null
                    }
                };

                // Decode both in parallel so back is ready as soon as possible after front.
                await Promise.all([decodeFront(), decodeBack()]);
            } catch {
                // Don't clear caches
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isWeb]);

    const backImageNone1 = useImage(BACK_STRIP_SOURCES.none[1]);
    const backImageNone2 = useImage(BACK_STRIP_SOURCES.none[2]);
    const backImageNone3 = useImage(BACK_STRIP_SOURCES.none[3]);
    const backImageNone4 = useImage(BACK_STRIP_SOURCES.none[4]);
    const backImageFew1 = useImage(BACK_STRIP_SOURCES.few[1]);
    const backImageFew2 = useImage(BACK_STRIP_SOURCES.few[2]);
    const backImageFew3 = useImage(BACK_STRIP_SOURCES.few[3]);
    const backImageFew4 = useImage(BACK_STRIP_SOURCES.few[4]);
    const backImageMore1 = useImage(BACK_STRIP_SOURCES.more[1]);
    const backImageMore2 = useImage(BACK_STRIP_SOURCES.more[2]);
    const backImageMore3 = useImage(BACK_STRIP_SOURCES.more[3]);
    const backImageMore4 = useImage(BACK_STRIP_SOURCES.more[4]);
    const backImageAll1 = useImage(BACK_STRIP_SOURCES.all[1]);
    const backImageAll2 = useImage(BACK_STRIP_SOURCES.all[2]);
    const backImageAll3 = useImage(BACK_STRIP_SOURCES.all[3]);
    const backImageAll4 = useImage(BACK_STRIP_SOURCES.all[4]);
    const backImagesNative: Record<BackAmount, Record<BackVariant, SkImage | null>> = {
        none: { 1: backImageNone1, 2: backImageNone2, 3: backImageNone3, 4: backImageNone4 },
        few: { 1: backImageFew1, 2: backImageFew2, 3: backImageFew3, 4: backImageFew4 },
        more: { 1: backImageMore1, 2: backImageMore2, 3: backImageMore3, 4: backImageMore4 },
        all: { 1: backImageAll1, 2: backImageAll2, 3: backImageAll3, 4: backImageAll4 },
    };
    const backImages: Record<BackAmount, Record<BackVariant, SkImage | null>> =
        isWeb && cachedWebBackStripImages ? cachedWebBackStripImages : backImagesNative;

    const frontNone1 = useImage(FRONT_STRIP_SOURCES.none[1]);
    const frontNone2 = useImage(FRONT_STRIP_SOURCES.none[2]);
    const frontNone3 = useImage(FRONT_STRIP_SOURCES.none[3]);
    const frontNone4 = useImage(FRONT_STRIP_SOURCES.none[4]);
    const frontFew1 = useImage(FRONT_STRIP_SOURCES.few[1]);
    const frontFew2 = useImage(FRONT_STRIP_SOURCES.few[2]);
    const frontFew3 = useImage(FRONT_STRIP_SOURCES.few[3]);
    const frontFew4 = useImage(FRONT_STRIP_SOURCES.few[4]);
    const frontMore1 = useImage(FRONT_STRIP_SOURCES.more[1]);
    const frontMore2 = useImage(FRONT_STRIP_SOURCES.more[2]);
    const frontMore3 = useImage(FRONT_STRIP_SOURCES.more[3]);
    const frontMore4 = useImage(FRONT_STRIP_SOURCES.more[4]);
    const frontAll1 = useImage(FRONT_STRIP_SOURCES.all[1]);
    const frontAll2 = useImage(FRONT_STRIP_SOURCES.all[2]);
    const frontAll3 = useImage(FRONT_STRIP_SOURCES.all[3]);
    const frontAll4 = useImage(FRONT_STRIP_SOURCES.all[4]);
    const frontAll5 = useImage(FRONT_STRIP_SOURCES.all[5]);
    const frontImagesNative: Record<FrontAmount, Record<number, SkImage | null>> = {
        none: { 1: frontNone1, 2: frontNone2, 3: frontNone3, 4: frontNone4 },
        few: { 1: frontFew1, 2: frontFew2, 3: frontFew3, 4: frontFew4 },
        more: { 1: frontMore1, 2: frontMore2, 3: frontMore3, 4: frontMore4 },
        all: { 1: frontAll1, 2: frontAll2, 3: frontAll3, 4: frontAll4, 5: frontAll5 },
    };
    const frontImages: Record<FrontAmount, Record<number, SkImage | null>> =
        isWeb && cachedWebFrontStripImages ? cachedWebFrontStripImages : frontImagesNative;

    const frontImagesReady = !!(frontImages.none[1] ?? frontImages.few[1] ?? frontImages.more[1] ?? frontImages.all[1]);
    const hasReportedReady = useRef(false);
    useEffect(() => {
        if (onAssetsReady && frontImagesReady && !hasReportedReady.current) {
            hasReportedReady.current = true;
            onAssetsReady();
        }
    }, [onAssetsReady, frontImagesReady]);

    const frontHeight = FRONT_STRIP_BOTTOM_Y * FRONT_LAYER_SCALE;
    const backHeight = frontHeight * BACK_LAYER_SCALE_MULT;
    const frontImageForAspect = frontImages.none[1] ?? frontImages.few[1] ?? frontImages.more[1] ?? frontImages.all[1];
    const stripVisibleWidth =
        frontImageForAspect && typeof frontImageForAspect.width === "function" && typeof frontImageForAspect.height === "function"
            ? frontHeight * (frontImageForAspect.width() / frontImageForAspect.height())
            : frontHeight * FRONT_STRIP_DEFAULT_ASPECT;
    const backImageForAspect = backImages.none[1] ?? backImages.few[1] ?? backImages.more[1] ?? backImages.all[1];
    const backVisibleWidth =
        backImageForAspect && typeof backImageForAspect.width === "function" && typeof backImageForAspect.height === "function"
            ? backHeight * (backImageForAspect.width() / backImageForAspect.height())
            : backHeight * (300 / 100);

    const frontWorldX = gameState.distance * FRONT_RATE;
    const kMin = Math.floor((frontWorldX - stripVisibleWidth) / stripVisibleWidth);
    const kMax = Math.ceil((frontWorldX + SCREEN_WIDTH) / stripVisibleWidth);
    const visibleStripCount = kMax - kMin + 1;
    const targetStripQueueLength =
        gameState.distance === 0
            ? Math.max(visibleStripCount, MIN_STRIP_QUEUE_LENGTH)
            : visibleStripCount;

    // Front queue: same amount mapping as back so lights grow/dwindle at same points; variant from distance.
    if (gameState.distance === 0) frontStripQueueRef.current = [];
    const frontStripQueue = frontStripQueueRef.current;
    while (frontStripQueue.length < targetStripQueueLength) {
        frontStripQueue.push({
            amount: themeFrontAmount,
            variant: frontVariantFromDistance(gameState.distance + frontStripQueue.length * 80, themeFrontAmount),
        });
    }
    while (frontStripQueue.length > targetStripQueueLength) frontStripQueue.shift();

    const backWorldX = gameState.distance * BACK_RATE;
    const kMinBack = Math.floor((backWorldX - backVisibleWidth) / backVisibleWidth);
    const kMaxBack = Math.ceil((backWorldX + SCREEN_WIDTH) / backVisibleWidth);
    const visibleBackCount = Math.max(0, kMaxBack - kMinBack + 1);
    const targetBackQueueLength =
        gameState.distance === 0
            ? Math.max(visibleBackCount, MIN_BACK_STRIP_QUEUE_LENGTH)
            : visibleBackCount;

    if (ENABLE_BACK_LAYER) {
        if (gameState.distance === 0) backStripQueueRef.current = [];
        const backStripQueue = backStripQueueRef.current;
        while (backStripQueue.length < targetBackQueueLength) {
            backStripQueue.push({
                amount: themeBackAmount,
                variant: backVariantFromDistance(gameState.distance + backStripQueue.length * 80),
            });
        }
        while (backStripQueue.length > targetBackQueueLength) backStripQueue.shift();
    }

    const fallbackColorBack = "#2c1e4a";
    const fallbackColorFront = "#000000";

    const frontY = FRONT_STRIP_BOTTOM_Y - frontHeight;
    const backY = FRONT_STRIP_BOTTOM_Y - backHeight;

    const renderBackTile = (translateX: number, entry: BackQueueEntry, tileIndex: number) => {
        const image = backImages[entry.amount][entry.variant];
        const w = backVisibleWidth;
        return (
            <Group key={`back-${tileIndex}`} transform={[{ translateX }]}>
                {image ? (
                    <Image
                        image={image}
                        x={0}
                        y={backY}
                        width={w}
                        height={backHeight}
                        fit="contain"
                    />
                ) : (
                    <Rect x={0} y={backY} width={w} height={backHeight} color={fallbackColorBack} />
                )}
            </Group>
        );
    };

    const renderFrontTile = (translateX: number, entry: FrontQueueEntry, tileIndex: number, tileWidth: number) => {
        const image = frontImages[entry.amount]?.[entry.variant] ?? null;
        const w = tileWidth;
        return (
            <Group key={`front-${tileIndex}`} transform={[{ translateX }]}>
                {image ? (
                    <Image
                        image={image}
                        x={0}
                        y={frontY}
                        width={w}
                        height={frontHeight}
                        fit="contain"
                    />
                ) : (
                    <Rect x={0} y={frontY} width={w} height={frontHeight} color={fallbackColorFront} />
                )}
            </Group>
        );
    };

    const haveBackImages = !!(backImages.none[1] ?? backImages.few[1] ?? backImages.more[1] ?? backImages.all[1]);
    return (
        <>
            {/* Back layer: same queue as front. On web only draw when we have images (no purple fallback over sky). */}
            {ENABLE_BACK_LAYER && haveBackImages &&
                Array.from({ length: visibleBackCount }, (_, i) => {
                    const k = kMinBack + i;
                    const translateX = k * backVisibleWidth - backWorldX;
                    const entry = backStripQueueRef.current[i] ?? { amount: themeBackAmount, variant: 1 as BackVariant };
                    return renderBackTile(translateX, entry, k);
                })}
            {Array.from({ length: visibleStripCount }, (_, i) => {
                const k = kMin + i;
                const translateX = k * stripVisibleWidth - frontWorldX;
                const entry = frontStripQueueRef.current[i] ?? { amount: themeFrontAmount, variant: frontVariantFromDistance(gameState.distance, themeFrontAmount) };
                return renderFrontTile(translateX, entry, k, stripVisibleWidth);
            })}
        </>
    );
}
