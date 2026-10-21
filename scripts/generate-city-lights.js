/**
 * Generates the stage 1 window-light overlays.
 *
 * Run: node scripts/generate-city-lights.js
 *
 * The buildings themselves are NOT generated: the existing hand-drawn `*_none_*` strips
 * are used as-is. This script only works out where each building is, places windows
 * inside it, and writes overlay images of those windows lit.
 *
 * Overlays are CUMULATIVE — level 3 contains every window from levels 0 to 3 — so at
 * runtime the city costs one base image plus one overlay per tile, rather than one draw
 * per lighting group. Drawing a window per frame is what made the old city lag.
 *
 * Output: assets/city/lights/{front,back}_{variant}_lit_{level}.png
 */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const CITY_DIR = path.join(__dirname, '..', 'assets', 'city');
const OUT_DIR = path.join(CITY_DIR, 'lights');

/** How many steps the lights come on in. More = smoother, but one more file per variant. */
const LEVELS = 6;
/** Share of windows that never light at all, so a full city still looks lived-in. */
const NEVER_LIT = 0.22;
/** Share of lit windows using the dimmer shade, for variety. */
const DIM_SHARE = 0.25;
/** Share of grid positions left empty, so windows aren't a perfect lattice. */
const SKIP = 0.14;

const LAYERS = {
    // Sizes and colours measured from the existing *_all_* art.
    front: {
        variants: [1, 2, 3, 4],
        bright: [0x5d, 0xfb, 0xe6],
        dim: [0x3e, 0xa7, 0x99],
        win: { w: 12, h: 17, pitchX: 22, pitchY: 27 },
        margin: { x: 5, top: 9, bottom: 7 },
        seed: 77,
    },
    back: {
        variants: [1, 2, 3, 4],
        bright: [0xff, 0xff, 0x31],
        dim: [0xc8, 0xc8, 0x28],
        win: { w: 4, h: 11, pitchX: 9, pitchY: 17 },
        margin: { x: 3, top: 6, bottom: 5 },
        seed: 99,
    },
};

function makeRandom(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Buildings are runs of columns sharing a roofline. */
function findBuildings(png) {
    const { width: W, height: H, data } = png;
    const tops = [];
    for (let x = 0; x < W; x++) {
        let top = -1;
        for (let y = 0; y < H; y++) {
            if (data[(y * W + x) * 4 + 3] > 32) { top = y; break; }
        }
        tops.push(top);
    }

    const buildings = [];
    let start = 0;
    for (let x = 1; x <= W; x++) {
        const ended = x === W || tops[x] < 0 || tops[start] < 0 || Math.abs(tops[x] - tops[start]) > 1;
        if (ended) {
            const width = x - start;
            if (tops[start] >= 0 && width >= 10 && H - tops[start] >= 24) {
                buildings.push({ x: start, width, top: tops[start] });
            }
            start = x;
        }
    }
    return buildings;
}

/** Lays windows out inside each building and decides when (or whether) each one lights. */
function planWindows(png, layer, rand) {
    const { width: W, height: H } = png;
    const windows = [];

    for (const building of findBuildings(png)) {
        const usableW = building.width - layer.margin.x * 2;
        const cols = Math.floor((usableW + (layer.win.pitchX - layer.win.w)) / layer.win.pitchX);
        const usableH = H - building.top - layer.margin.top - layer.margin.bottom;
        const rows = Math.floor((usableH + (layer.win.pitchY - layer.win.h)) / layer.win.pitchY);
        if (cols < 1 || rows < 1) continue;

        const span = cols * layer.win.pitchX - (layer.win.pitchX - layer.win.w);
        const originX = building.x + Math.round((building.width - span) / 2);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (rand() < SKIP) continue;               // a gap, so it isn't a perfect lattice
                if (rand() < NEVER_LIT) continue;          // this room stays dark all night
                windows.push({
                    x: originX + col * layer.win.pitchX,
                    y: building.top + layer.margin.top + row * layer.win.pitchY,
                    level: Math.floor(rand() * LEVELS),    // which step it comes on at
                    dim: rand() < DIM_SHARE,
                });
            }
        }
    }
    return windows;
}

function writeOverlay(file, width, height, windows, layer) {
    const png = new PNG({ width, height });
    png.data.fill(0);
    for (const win of windows) {
        const colour = win.dim ? layer.dim : layer.bright;
        for (let y = win.y; y < win.y + layer.win.h; y++) {
            for (let x = win.x; x < win.x + layer.win.w; x++) {
                if (x < 0 || y < 0 || x >= width || y >= height) continue;
                const i = (y * width + x) * 4;
                png.data[i] = colour[0];
                png.data[i + 1] = colour[1];
                png.data[i + 2] = colour[2];
                png.data[i + 3] = 255;
            }
        }
    }
    fs.writeFileSync(file, PNG.sync.write(png));
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

console.log(`Stage 1 window lights (${LEVELS} steps, cumulative):`);
for (const [name, layer] of Object.entries(LAYERS)) {
    for (const variant of layer.variants) {
        const base = path.join(CITY_DIR, `${name}_none_${variant}.png`);
        if (!fs.existsSync(base)) { console.log(`  skipped ${name} ${variant}: no base strip`); continue; }

        const png = PNG.sync.read(fs.readFileSync(base));
        const rand = makeRandom(layer.seed + variant * 1000);
        const windows = planWindows(png, layer, rand);

        for (let level = 0; level < LEVELS; level++) {
            // Cumulative: everything lit at this level and below.
            const lit = windows.filter((w) => w.level <= level);
            writeOverlay(
                path.join(OUT_DIR, `${name}_${variant}_lit_${level}.png`),
                png.width, png.height, lit, layer
            );
        }
        console.log(`  ${name} ${variant}: ${windows.length} windows`);
    }
}
console.log('Done. Buildings come from the existing *_none_* art; only windows are generated.');
