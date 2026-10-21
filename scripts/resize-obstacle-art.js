/**
 * Rewrites the obstacle SVGs at the size they are actually drawn in the game.
 *
 * The art is drawn large (a rock is 580px wide) but appears at about 68px. A 3px line in
 * the big drawing becomes about a third of a pixel on screen - which is why the objects
 * looked faint next to the grid, whose lines are 2.5px.
 *
 * These resized files are meant as a starting point for redrawing at the real size, with
 * the line weight set for that size rather than scaled down into nothing.
 *
 * Run: node scripts/resize-obstacle-art.js
 */
const fs = require('fs');
const path = require('path');

const IN_DIR = path.join(__dirname, '..', 'assets', 'obstacle-art');
const OUT_DIR = path.join(IN_DIR, 'at-game-size');

/** Target width in game pixels. Swarms are sized by height instead, to fill the duck band. */
const SIZES = {
    'city/car-hatchback': { width: 79 },
    'city/car-sedan': { width: 87 },
    'city/van': { width: 83 },
    'city/dog': { width: 42 },
    'city/bus': { width: 156 },
    'city/bird-swarm': { height: 144 },
    'beach/bench': { width: 74 },
    'beach/car': { width: 77 },
    'beach/dog': { width: 38 },
    'beach/roller-skater-left': { width: 39 },
    'beach/roller-skater-right': { width: 37 },
    'beach/seagull-swarm': { height: 144 },
    'mountain/shrub': { width: 55 },
    'mountain/log': { width: 65 },
    'mountain/rock': { width: 68 },
    'mountain/bear': { width: 62 },
    'mountain/bat-swarm': { height: 144 },
};

/** The weight the lines should end up at, matching the grid. */
const TARGET_STROKE = 2.6;

const round = (n) => Math.round(n * 100) / 100;

console.log('object                       original      at game size   old line weight becomes');
for (const [name, target] of Object.entries(SIZES)) {
    const file = path.join(IN_DIR, `${name}.svg`);
    if (!fs.existsSync(file)) { console.log(`  ${name}: missing`); continue; }
    let svg = fs.readFileSync(file, 'utf8');

    const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const srcW = +vb[1], srcH = +vb[2];
    const scale = target.width ? target.width / srcW : target.height / srcH;
    const outW = round(srcW * scale), outH = round(srcH * scale);
    const oldStroke = +(svg.match(/stroke-width="([\d.]+)"/) || [, 3])[1];

    // Only M and Z are used, so every number in a path is a coordinate and can be scaled.
    svg = svg.replace(/\sd="([^"]+)"/g, (_, d) =>
        ' d="' + d.replace(/-?[\d.]+/g, (n) => String(round(+n * scale))) + '"');

    // Circles and ellipses scale the same way.
    for (const attr of ['cx', 'cy', 'r', 'rx', 'ry']) {
        svg = svg.replace(new RegExp(`\\s${attr}="([\\d.]+)"`, 'g'),
            (_, v) => ` ${attr}="${round(+v * scale)}"`);
    }

    // Set the line weight for the new size rather than scaling it down to nothing.
    svg = svg.replace(/stroke-width="[\d.]+"/g, `stroke-width="${TARGET_STROKE}"`);
    svg = svg.replace(/width="[\d.]+" height="[\d.]+"/, `width="${outW}" height="${outH}"`);
    svg = svg.replace(/viewBox="0 0 [\d.]+ [\d.]+"/, `viewBox="0 0 ${outW} ${outH}"`);

    const out = path.join(OUT_DIR, `${name}.svg`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, svg);

    console.log(`${name.padEnd(28)} ${String(srcW).padStart(4)}x${String(srcH).padEnd(5)} ` +
        `${String(outW).padStart(6)}x${String(outH).padEnd(6)} ` +
        `${oldStroke}px -> ${round(oldStroke * scale)}px`);
}
console.log(`\nWritten to assets/obstacle-art/at-game-size/, with stroke-width set to ${TARGET_STROKE}px.`);
