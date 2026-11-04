/**
 * Loads a set of bundled PNGs as Skia images.
 *
 * Why this exists: Skia's own `useImage` does not resolve bundled assets on web — the
 * files are never even requested — so images have to be fetched and decoded by hand.
 * All the scenery uses this hook.
 *
 * Loads are shared and cached per key, so a set is fetched once no matter how many
 * components ask for it or how often they remount. Without the in-flight sharing, a
 * remount part-way through downloads everything a second time.
 */

import { Skia } from "@shopify/react-native-skia";
import type { SkImage } from "@shopify/react-native-skia";
import { Asset } from "expo-asset";
import { useEffect, useState } from "react";
import { retry, withTimeout } from "../../loadWithLimits";

/** Each strip is a small file (a few KB), so this is plenty even on slow mobile data. */
const STRIP_LIMIT_MS = 30000;
const RETRY_DELAYS_MS = [1000, 3000];

const loaded = new Map<string, SkImage[]>();
const inFlight = new Map<string, Promise<SkImage[]>>();

/** One strip, fetched and decoded. A web page in place of the picture fails to decode. */
async function fetchStrip(source: number): Promise<SkImage> {
    const [asset] = await withTimeout(Asset.loadAsync(source), STRIP_LIMIT_MS);
    const uri = asset?.localUri ?? asset?.uri;
    if (!uri) throw new Error("No address for this strip");
    const bytes = await withTimeout(Skia.Data.fromURI(uri), STRIP_LIMIT_MS);
    const image = bytes ? Skia.Image.MakeImageFromEncoded(bytes) : null;
    if (!image) throw new Error("Couldn't decode this strip");
    return image;
}

async function fetchStrips(sources: number[]): Promise<SkImage[]> {
    // Each image is fetched and decoded on its own, and becomes null if it keeps failing.
    // Promise.all would otherwise reject on the first failure and leave its siblings
    // rejecting with nobody listening, which surfaces as an uncaught "Failed to fetch".
    // One bad strip now just means one missing strip.
    const images = await Promise.all(
        sources.map((source) => retry(() => fetchStrip(source), RETRY_DELAYS_MS).catch(() => null))
    );
    return images.filter((image): image is SkImage => !!image);
}

function loadOnce(key: string, sources: number[]): Promise<SkImage[]> {
    const already = inFlight.get(key);
    if (already) return already;

    const pending = fetchStrips(sources)
        .then((images) => {
            if (images.length > 0) loaded.set(key, images);
            return images;
        })
        .catch(() => [] as SkImage[])
        .finally(() => inFlight.delete(key));

    inFlight.set(key, pending);
    return pending;
}

/** `onGaveUp` is called if none of the set could be loaded, after the retries. */
export function useStripImages(key: string, sources: number[], onGaveUp?: () => void): SkImage[] {
    const [images, setImages] = useState<SkImage[]>(() => loaded.get(key) ?? []);

    useEffect(() => {
        const cached = loaded.get(key);
        if (cached) {
            setImages(cached);
            return;
        }
        let cancelled = false;
        loadOnce(key, sources).then((result) => {
            if (cancelled) return;
            if (result.length > 0) setImages(result);
            else onGaveUp?.();
        });
        return () => {
            cancelled = true;
        };
        // `sources` is a module-level constant in every caller, so this runs once per key.
    }, [key, sources, onGaveUp]);

    return images;
}
