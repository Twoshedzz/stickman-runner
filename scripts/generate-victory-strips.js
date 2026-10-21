/**
 * Generates the Victory Dawn (stage 4) skyline strips.
 *
 * Run: node scripts/generate-victory-strips.js
 *
 * Stage 4 returns to the city, but lit for a celebration: neon caps along the rooftops and
 * windows in gold and cyan. The lights are baked in rather than fading up like stage 1 -
 * by now it is morning and the city is already awake.
 *
 * Colours are sampled from assets/concepts/stage 4 - victory lap.png.
 *
 * Output: assets/victory/{back,front}_1..4.png
 */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'victory');

const BACK_BUILDING = '#1c0d52';
const FRONT_BUILDING = '#050208';
const ROOF_NEON = ['#22d3ee', '#ff2fb9'];
const WINDOWS = ['#fec03d', '#22d3ee'];

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

function rect(png, x0, y0, w, h, colour) {
    const [r, g, b] = colour;
    for (let y = Math.round(y0); y < Math.round(y0 + h); y++) {
        for (let x = Math.round(x0); x < Math.round(x0 + w); x++) {
            if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue;
            const i = (y * png.width + x) * 4;
            png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255;
        }
    }
}

/**
 * A row of buildings with neon rooftops and lit windows.
 *
 * Buildings are laid out so one always starts exactly at x=0 and the last ends exactly at
 * the right edge, which is what lets the strip repeat without a seam.
 */
function drawSkyline({ width, height, buildingColour, minHeight, maxHeight, windowSize, windowPitch, litShare, seed }) {
    const rand = makeRandom(seed);
    const png = blank(width, height);
    const body = rgb(buildingColour);

    // Pick widths that add up to exactly the strip width.
    const widths = [];
    let used = 0;
    while (used < width) {
        const w = Math.round(32 + rand() * 46);
        if (used + w > width) { widths.push(width - used); break; }
        widths.push(w);
        used += w;
    }

    let x = 0;
    for (const w of widths) {
        const h = Math.round(minHeight + rand() * (maxHeight - minHeight));
        const top = height - h;
        rect(png, x, top, w, h, body);

        // Neon cap along the roofline.
        const cap = rgb(ROOF_NEON[Math.floor(rand() * ROOF_NEON.length)]);
        rect(png, x, top, w, 3, cap);

        // Windows, inset from the edges.
        const margin = 6;
        const cols = Math.floor((w - margin * 2 + (windowPitch - windowSize)) / windowPitch);
        const rows = Math.floor((h - 14 + (windowPitch - windowSize)) / windowPitch);
        const originX = x + Math.round((w - (cols * windowPitch - (windowPitch - windowSize))) / 2);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (rand() > litShare) continue;
                const colour = rgb(WINDOWS[Math.floor(rand() * WINDOWS.length)]);
                rect(png, originX + c * windowPitch, top + 10 + r * windowPitch, windowSize, windowSize * 1.6, colour);
            }
        }
        x += w;
    }
    return png;
}

function write(name, png) {
    fs.writeFileSync(path.join(OUT_DIR, name), PNG.sync.write(png));
    console.log('  written', name, `${png.width}x${png.height}`);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

console.log('Victory Dawn skyline:');
for (let v = 1; v <= 4; v++) {
    write(`back_${v}.png`, drawSkyline({
        width: 300, height: 350,
        buildingColour: BACK_BUILDING,
        minHeight: 120, maxHeight: 250,
        windowSize: 4, windowPitch: 11, litShare: 0.3,
        seed: 7000 + v,
    }));
    write(`front_${v}.png`, drawSkyline({
        width: 450, height: 350,
        buildingColour: FRONT_BUILDING,
        minHeight: 150, maxHeight: 320,
        windowSize: 7, windowPitch: 20, litShare: 0.26,
        seed: 8000 + v,
    }));
}
console.log('Done. Re-run after changing any colour or size above.');
