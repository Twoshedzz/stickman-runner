/** Ensure Skia always receives a valid color string (avoids JsiSkPaint/savePaint crashes on web). */
export const safeColor = (c: unknown): string =>
    (typeof c === 'string' && c.length > 0) ? c : '#000000';

/** Ensure opacity is a number in 0-1. */
export const safeOpacity = (o: unknown): number => {
    const n = Number(o);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
};
