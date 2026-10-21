/**
 * Generates the Sunset Beach (stage 2) background strips.
 *
 * Run: node scripts/generate-beach-strips.js
 *
 * Two layers: distant headlands sitting on the waterline, and palm silhouettes standing on
 * the sand. Colours are sampled from assets/concepts/stage 2 - sunset beach.png.
 *
 * Strips repeat as they scroll, so both are drawn tileable: the headland ridge starts and
 * ends at the same height, and palms are kept clear of the edges.
 *
 * Output: assets/beach/{far,palms}_1..4.png
 */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'beach');

const HEADLAND = '#a1456f';   // distant, washed out by the haze
const PALM = '#2b1138';       // near-black against the sky

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
    png.data.fill(0);
    return png;
}

function setPixel(png, x, y, [r, g, b], alpha = 1) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
    const i = (y * png.width + x) * 4;
    png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b;
    png.data[i + 3] = Math.max(png.data[i + 3], Math.round(255 * alpha));
}

/** Soft rounded hills, low and hazy, meeting the water. */
function drawHeadlands({ width, height, colour, seed }) {
    const rand = makeRandom(seed);
    const png = blank(width, height);
    const c = rgb(colour);

    const peaks = 5;
    const heights = Array.from({ length: peaks + 1 }, (_, i) =>
        i % 2 === 0 ? height * (0.45 + rand() * 0.5) : height * (0.1 + rand() * 0.2)
    );
    heights[peaks] = heights[0];   // tileable

    const step = (width - 1) / peaks;
    for (let x = 0; x < width; x++) {
        const t = x / step;
        const i = Math.min(peaks - 1, Math.floor(t));
        const f = t - i;
        // Smooth rather than angular: these are distant hills, not crags.
        const smooth = f * f * (3 - 2 * f);
        const h = heights[i] + (heights[i + 1] - heights[i]) * smooth;
        for (let y = Math.round(height - h); y < height; y++) setPixel(png, x, y, c);
    }
    return png;
}

/** One palm: a leaning tapered trunk with fronds arcing up and out, drooping at the tips. */
function drawPalm(png, baseX, baseY, trunkHeight, lean, rand, colour) {
    const c = rgb(colour);

    // Trunk as a filled band between its two edges, so it has no gaps.
    const segments = 40;
    const spine = [];
    for (let s = 0; s <= segments; s++) {
        const t = s / segments;
        spine.push({
            x: baseX + lean * t * t,            // curves rather than tilting uniformly
            y: baseY - trunkHeight * t,
            half: (1 - t * 0.55) * trunkHeight * 0.035 + 0.8,
        });
    }
    for (let s = 0; s < segments; s++) {
        const a = spine[s], b = spine[s + 1];
        const steps = Math.ceil(Math.abs(b.y - a.y)) + 2;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = a.x + (b.x - a.x) * t;
            const y = a.y + (b.y - a.y) * t;
            const half = a.half + (b.half - a.half) * t;
            for (let dx = -half; dx <= half; dx += 0.5) setPixel(png, x + dx, y, c);
        }
    }

    const crown = spine[segments];
    const fronds = 7 + Math.floor(rand() * 3);
    for (let f = 0; f < fronds; f++) {
        // Fan them across the top half, pointing up and out.
        const spread = -Math.PI * 0.08 - (f / (fronds - 1)) * Math.PI * 0.84;
        const length = trunkHeight * (0.42 + rand() * 0.26);
        const sag = length * (0.45 + rand() * 0.3);

        // Quadratic curve: straight out, then drooping at the tip.
        const p0 = { x: crown.x, y: crown.y };
        const p1 = { x: crown.x + Math.cos(spread) * length * 0.6,
                     y: crown.y + Math.sin(spread) * length * 0.6 };
        const p2 = { x: crown.x + Math.cos(spread) * length,
                     y: crown.y + Math.sin(spread) * length + sag };

        const steps = 26;
        for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const u = 1 - t;
            const x = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x;
            const y = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y;
            // Thickest near the middle of the frond, tapering to a point.
            const thickness = Math.sin(Math.PI * Math.min(1, t * 1.15)) * trunkHeight * 0.035 + 0.7;
            for (let dy = -thickness; dy <= thickness; dy += 0.5)
                for (let dx = -thickness; dx <= thickness; dx += 0.5)
                    if (Math.hypot(dx, dy) <= thickness) setPixel(png, x + dx, y + dy, c);
        }
    }
}

function drawPalms({ width, height, colour, count, seed }) {
    const rand = makeRandom(seed);
    const png = blank(width, height);
    for (let n = 0; n < count; n++) {
        const trunkHeight = height * (0.5 + rand() * 0.42);
        const margin = height * 0.3;
        const baseX = margin + rand() * (width - margin * 2);
        const lean = (rand() - 0.5) * height * 0.3;
        drawPalm(png, baseX, height - 1, trunkHeight, lean, rand, colour);
    }
    return png;
}

function write(name, png) {
    fs.writeFileSync(path.join(OUT_DIR, name), PNG.sync.write(png));
    console.log('  written', name, `${png.width}x${png.height}`);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

console.log('Sunset Beach strips:');
for (let v = 1; v <= 4; v++) {
    write(`far_${v}.png`, drawHeadlands({ width: 300, height: 40, colour: HEADLAND, seed: 4000 + v }));
    write(`palms_${v}.png`, drawPalms({ width: 450, height: 170, colour: PALM, count: 3, seed: 5000 + v }));
}
console.log('Done. Re-run after changing any colour or shape above.');
