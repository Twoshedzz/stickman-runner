/**
 * Draws the home-screen icon: a striped synthwave sun over a neon grid, with a stick
 * runner in front. Writes the sizes the web app needs into public/.
 *
 *   node scripts/generate-app-icon.js
 *
 * Everything is drawn from shapes in 0-1 coordinates, so any size comes out sharp.
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const OUT_DIR = path.join(__dirname, '..', 'public');
const SIZES = { 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512 };
/** Samples per pixel along each axis, for smooth edges. */
const SUPERSAMPLE = 4;

const HORIZON = 0.64;
const SUN = { x: 0.5, y: 0.47, r: 0.25 };
const VANISH = { x: 0.5, y: HORIZON };

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const clamp01 = (t) => Math.max(0, Math.min(1, t));

const SKY_TOP = hex('#0f0c29');
const SKY_HORIZON = hex('#5b2a86');
const SUN_TOP = hex('#ffdd55');
const SUN_BOTTOM = hex('#ff2fb9');
const GROUND = hex('#120a2e');
const GRID = hex('#ff00cc');
const RUNNER = hex('#ffffff');

/** Distance from point p to the segment a-b. */
function segmentDistance(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const t = clamp01(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// The runner, flat out: leaning into the sprint, front knee driven high, back leg fully
// stretched behind, arms pumping. Head, then limbs as line segments with rounded ends.
const HEAD = { x: 0.575, y: 0.52, r: 0.045 };
const LIMBS = [
    [0.55, 0.575, 0.475, 0.735],  // body, leaning forward
    [0.54, 0.6, 0.605, 0.67],     // front arm: elbow forward, hand up by the chin
    [0.605, 0.67, 0.655, 0.6],
    [0.54, 0.6, 0.465, 0.6],      // back arm: elbow swung back, hand down behind
    [0.465, 0.6, 0.425, 0.675],
    [0.475, 0.735, 0.585, 0.74],  // front leg: knee driven high
    [0.585, 0.74, 0.565, 0.845],
    [0.475, 0.735, 0.41, 0.83],   // back leg: pushing off behind
    [0.41, 0.83, 0.31, 0.875],
];
const LIMB_WIDTH = 0.04;

/** Faint cyan speed streaks trailing behind the runner: [y, start x, end x]. */
const STREAKS = [[0.6, 0.12, 0.36], [0.69, 0.06, 0.33], [0.78, 0.14, 0.34]];
const STREAK_WIDTH = 0.012;
const CYAN = hex('#00ffff');

function colourAt(x, y) {
    // Runner in front of everything
    if (Math.hypot(x - HEAD.x, y - HEAD.y) < HEAD.r) return RUNNER;
    for (const [ax, ay, bx, by] of LIMBS) {
        if (segmentDistance(x, y, ax, ay, bx, by) < LIMB_WIDTH / 2) return RUNNER;
    }
    // Speed streaks over the background, fading out towards the tail.
    const bg = backgroundAt(x, y);
    for (const [sy, x0, x1] of STREAKS) {
        if (x >= x0 && x <= x1 && Math.abs(y - sy) < STREAK_WIDTH / 2) {
            return mix(bg, CYAN, 0.85 * Math.pow((x - x0) / (x1 - x0), 1.5));
        }
    }
    return bg;
}

function backgroundAt(x, y) {
    if (y < HORIZON) {
        // Sun, with the classic stripes cut out of its lower half, widening towards the bottom
        const inSun = Math.hypot(x - SUN.x, y - SUN.y) < SUN.r;
        if (inSun) {
            const t = (y - (SUN.y - SUN.r)) / (2 * SUN.r);
            const stripeStart = 0.55;
            if (t > stripeStart) {
                const band = (t - stripeStart) / (1 - stripeStart); // 0..1 down the lower half
                const period = 0.085;
                const gap = 0.012 + band * 0.04;
                const phase = (y - (SUN.y + SUN.r * (2 * stripeStart - 1))) % period;
                if (phase < gap) return mix(SKY_TOP, SKY_HORIZON, y / HORIZON);
            }
            return mix(SUN_TOP, SUN_BOTTOM, t);
        }
        return mix(SKY_TOP, SKY_HORIZON, Math.pow(y / HORIZON, 1.6));
    }

    // Ground: perspective grid converging on the vanishing point
    const depth = (y - HORIZON) / (1 - HORIZON); // 0 at horizon, 1 at the bottom
    const lineWidth = 0.004 + depth * 0.01;
    if (y - HORIZON < 0.006) return GRID; // the horizon line itself
    // Horizontal lines, bunched towards the horizon
    for (let i = 1; i <= 6; i++) {
        const ly = HORIZON + (1 - HORIZON) * Math.pow(i / 6, 1.8);
        if (Math.abs(y - ly) < lineWidth / 2) return mix(GROUND, GRID, 0.4 + 0.6 * depth);
    }
    // Lines fanning out from the vanishing point
    const slope = (x - VANISH.x) / (y - VANISH.y);
    for (let i = -6; i <= 6; i++) {
        const target = i * 0.45;
        const distance = Math.abs(slope - target) * (y - VANISH.y);
        if (distance < lineWidth / 2) return mix(GROUND, GRID, 0.4 + 0.6 * depth);
    }
    return GROUND;
}

function render(size) {
    const png = new PNG({ width: size, height: size });
    for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
            let sum = [0, 0, 0];
            for (let sy = 0; sy < SUPERSAMPLE; sy++) {
                for (let sx = 0; sx < SUPERSAMPLE; sx++) {
                    const c = colourAt(
                        (px + (sx + 0.5) / SUPERSAMPLE) / size,
                        (py + (sy + 0.5) / SUPERSAMPLE) / size
                    );
                    sum = sum.map((v, i) => v + c[i]);
                }
            }
            const n = SUPERSAMPLE * SUPERSAMPLE;
            const i = (py * size + px) * 4;
            png.data[i] = Math.round(sum[0] / n);
            png.data[i + 1] = Math.round(sum[1] / n);
            png.data[i + 2] = Math.round(sum[2] / n);
            png.data[i + 3] = 255;
        }
    }
    return PNG.sync.write(png);
}

for (const [name, size] of Object.entries(SIZES)) {
    fs.writeFileSync(path.join(OUT_DIR, name), render(size));
    console.log(`wrote public/${name} (${size}x${size})`);
}
