/**
 * Generates the Midnight Mountains (stage 3) background strips as PNGs.
 *
 * Run: node scripts/generate-mountain-strips.js
 *
 * Why generated rather than drawn by hand: the art is flat silhouettes, so a script can
 * make as many variants as we want, in seconds, and we can re-run it after tweaking a
 * colour. Colours are sampled from assets/concepts/stage 3 - midnight mountains.png.
 *
 * The strips scroll sideways and repeat, so every ridge is made TILEABLE: the height at
 * the left edge always equals the height at the right edge.
 *
 * Output: assets/mountains/{far,mid,pines}_1..4.png
 */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'mountains');

/** Repeatable randomness: the same seed always produces the same art. */
function makeRandom(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function blank(width, height) {
    const png = new PNG({ width, height });
    png.data.fill(0); // fully transparent; the sky shows through
    return png;
}

function setPixel(png, x, y, [r, g, b]) {
    if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
    const i = (y * png.width + x) * 4;
    png.data[i] = r;
    png.data[i + 1] = g;
    png.data[i + 2] = b;
    png.data[i + 3] = 255;
}

/**
 * Mountain layer: overlapping triangles, each with a lighter face on the moonlit side.
 * Triangles (rather than one continuous ridge line) is what gives the concept's crisp
 * angular peaks, and makes the lit facet a clean wedge instead of a band.
 */
function drawMountains({ width, height, base, facet, count, minHeight, maxHeight, minHalf, maxHalf, centrePeak, seed }) {
    const rand = makeRandom(seed);
    const png = blank(width, height);
    const baseRgb = rgb(base);
    const facetRgb = rgb(facet);

    const peaks = [];
    for (let i = 0; i < count; i++) {
        peaks.push({
            cx: rand() * width,
            peakHeight: minHeight + rand() * (maxHeight - minHeight),
            half: minHalf + rand() * (maxHalf - minHalf),
        });
    }
    if (centrePeak) {
        peaks.push({ cx: width * 0.5, peakHeight: maxHeight, half: maxHalf * 1.15 });
    }
    // Tallest first, so smaller peaks sit in front of the big ones.
    peaks.sort((a, b) => b.peakHeight - a.peakHeight);

    for (const { cx, peakHeight, half } of peaks) {
        const peakY = height - peakHeight;
        // Draw the triangle three times so one crossing an edge reappears on the other:
        // the strip repeats, so a peak must never be cut in half.
        for (const offset of [-width, 0, width]) {
            const x0 = Math.round(cx + offset - half);
            const x1 = Math.round(cx + offset + half);
            for (let x = x0; x <= x1; x++) {
                if (x < 0 || x >= width) continue;
                const slope = Math.abs(x - (cx + offset)) / half; // 0 at summit, 1 at the foot
                const topY = Math.round(peakY + slope * peakHeight);
                const lit = x > cx + offset; // right-hand face catches the moon
                for (let y = topY; y < height; y++) {
                    setPixel(png, x, y, lit ? facetRgb : baseRgb);
                }
            }
        }
    }
    return png;
}

/** Pine layer: stacked triangle tiers, kept clear of both edges so tiling never cuts a tree. */
function drawPines({ width, height, colour, count, minHeight, maxHeight, seed }) {
    const rand = makeRandom(seed);
    const png = blank(width, height);
    const treeRgb = rgb(colour);

    for (let n = 0; n < count; n++) {
        const treeHeight = minHeight + rand() * (maxHeight - minHeight);
        const halfWidth = treeHeight * 0.3;
        const cx = halfWidth + rand() * (width - halfWidth * 2);
        const baseY = height;
        const tiers = 3;

        for (let tier = 0; tier < tiers; tier++) {
            // Each tier is a triangle: wider and shorter as you go down the tree.
            const tierTop = baseY - treeHeight * (1 - tier * 0.26);
            const tierBottom = baseY - treeHeight * (0.42 - tier * 0.21);
            const tierHalf = halfWidth * (0.45 + tier * 0.28);
            const tierHeight = tierBottom - tierTop;
            if (tierHeight <= 0) continue;
            for (let y = Math.round(tierTop); y < Math.round(tierBottom); y++) {
                const spread = ((y - tierTop) / tierHeight) * tierHalf;
                for (let x = Math.round(cx - spread); x <= Math.round(cx + spread); x++) {
                    setPixel(png, x, y, treeRgb);
                }
            }
        }
        // Trunk
        for (let y = Math.round(baseY - treeHeight * 0.16); y < baseY; y++) {
            for (let x = Math.round(cx - 1.5); x <= Math.round(cx + 1.5); x++) {
                setPixel(png, x, y, treeRgb);
            }
        }
    }
    return png;
}

function write(name, png) {
    const outPath = path.join(OUT_DIR, name);
    fs.writeFileSync(outPath, PNG.sync.write(png));
    console.log('  written', name, `${png.width}x${png.height}`);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

console.log('Midnight Mountains strips:');
for (let v = 1; v <= 4; v++) {
    write(`far_${v}.png`, drawMountains({
        width: 600, height: 150,
        base: '#181f63', facet: '#1e2673',
        count: 9, minHeight: 50, maxHeight: 105,
        minHalf: 70, maxHalf: 150,
        centrePeak: false, seed: 1000 + v,
    }));
    write(`mid_${v}.png`, drawMountains({
        width: 600, height: 150,
        base: '#271971', facet: '#3a2691',
        count: 5, minHeight: 70, maxHeight: 142,
        minHalf: 95, maxHalf: 180,
        centrePeak: v === 1, seed: 2000 + v,
    }));
    write(`pines_${v}.png`, drawPines({
        width: 450, height: 90,
        colour: '#070822',
        count: 16, minHeight: 42, maxHeight: 86,
        seed: 3000 + v,
    }));
}
console.log('Done. Re-run after changing any colour or shape above.');
