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

const loaded = new Map<string, SkImage[]>();
const inFlight = new Map<string, Promise<SkImage[]>>();

async function fetchStrips(sources: number[]): Promise<SkImage[]> {
    const assets = await Asset.loadAsync(sources);
    const uris = assets
        .map((asset) => asset?.localUri ?? asset?.uri)
        .filter((uri): uri is string => !!uri);

    // Each image is fetched and decoded on its own, and becomes null if it fails.
    // Promise.all would otherwise reject on the first failure and leave its siblings
    // rejecting with nobody listening, which surfaces as an uncaught "Failed to fetch".
    // One bad strip now just means one missing strip.
    const images = await Promise.all(
        uris.map(async (uri) => {
            try {
                const bytes = await Skia.Data.fromURI(uri);
                return bytes ? Skia.Image.MakeImageFromEncoded(bytes) : null;
            } catch {
                return null;
            }
        })
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

export function useStripImages(key: string, sources: number[]): SkImage[] {
    const [images, setImages] = useState<SkImage[]>(() => loaded.get(key) ?? []);

    useEffect(() => {
        const cached = loaded.get(key);
        if (cached) {
            setImages(cached);
            return;
        }
        let cancelled = false;
        loadOnce(key, sources).then((result) => {
            if (!cancelled && result.length > 0) setImages(result);
        });
        return () => {
            cancelled = true;
        };
        // `sources` is a module-level constant in every caller, so this runs once per key.
    }, [key, sources]);

    return images;
}
