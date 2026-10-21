/**
 * Bakes the obstacle SVGs into a TypeScript module.
 *
 * The SVGs are layered line art: a dark body, translucent facet planes, a clipped rim
 * highlight, then the neon outlines. Colours are authored per stage, so they come through
 * as-is rather than being re-tinted by the game.
 *
 * Output is a flat list of draw operations in document order. Skia reads SVG path strings
 * directly, so the path data is copied untouched and only the wrapper is generated.
 *
 * Run: node scripts/generate-obstacle-art.js
 */
const fs = require('fs');

// The hand-drawn source art. Kept in the repo so this script can always be re-run.
const DIR = 'assets/obstacle-art';
const OBJECTS = [
  ['city/car-hatchback','carHatchback'], ['city/car-sedan','carSedan'], ['city/van','van'],
  ['city/dog','cityDog'], ['city/bus','bus'], ['city/bird-swarm','birdSwarm'],
  ['beach/bench','bench'], ['beach/car','beachCar'], ['beach/dog','beachDog'],
  ['beach/roller-skater-left','skaterLeft'], ['beach/roller-skater-right','skaterRight'],
  ['beach/seagull-swarm','seagullSwarm'],
  ['mountain/shrub','shrub'], ['mountain/log','log'], ['mountain/rock','rock'],
  ['mountain/bear','bear'], ['mountain/bat-swarm','batSwarm'],
];

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1] : undefined;
};

/** Circles become polygons, so everything downstream is just path data. */
function circleToPath(tag) {
  const cx = +attr(tag, 'cx'), cy = +attr(tag, 'cy'), r = +attr(tag, 'r');
  const steps = 24;
  return 'M' + Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ') + 'Z';
}

function convert(svg) {
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);

  // Pull out any clip path, then take it out of the stream so it isn't drawn.
  const clipMatch = svg.match(/<clipPath[^>]*>\s*<path[^>]*\sd="([^"]+)"/);
  const clip = clipMatch ? clipMatch[1].replace(/\s+/g, ' ').trim() : undefined;
  const body = svg.replace(/<defs>[\s\S]*?<\/defs>/g, '');

  const ops = [];
  const stack = [{}];
  const token = /<g([^>]*)>|<\/g>|<(path|circle)([^>]*?)\/?>/g;
  let m;
  while ((m = token.exec(body))) {
    if (m[0].startsWith('</g')) { stack.pop(); continue; }
    if (m[1] !== undefined) {                       // opening <g>: inherit its attributes
      const parent = stack[stack.length - 1];
      stack.push({
        fill: attr(m[0], 'fill') ?? parent.fill,
        stroke: attr(m[0], 'stroke') ?? parent.stroke,
        strokeWidth: attr(m[0], 'stroke-width') ?? parent.strokeWidth,
      });
      continue;
    }

    const tag = m[0];
    const inherited = stack[stack.length - 1];
    const d = m[2] === 'circle' ? circleToPath(tag)
                                : (attr(tag, 'd') || '').replace(/\s+/g, ' ').trim();
    if (!d) continue;

    const fill = attr(tag, 'fill') ?? inherited.fill;
    const stroke = attr(tag, 'stroke') ?? inherited.stroke;
    const strokeWidth = attr(tag, 'stroke-width') ?? inherited.strokeWidth;
    const alpha = attr(tag, 'fill-opacity') ?? attr(tag, 'opacity');
    const clipped = /clip-path="url\(#/.test(tag);
    const evenOdd = attr(tag, 'fill-rule') === 'evenodd';

    if (fill && fill !== 'none') {
      ops.push({ d, fill, opacity: alpha ? +alpha : undefined, clip: clipped || undefined, evenOdd: evenOdd || undefined });
    }
    if (stroke && stroke !== 'none') {
      ops.push({ d, stroke, strokeWidth: strokeWidth ? +strokeWidth : 3, opacity: attr(tag, 'opacity') ? +attr(tag, 'opacity') : undefined });
    }
  }
  return { width: +vb[1], height: +vb[2], clip, ops };
}

const fmt = (op) => '{ ' + Object.entries(op)
  .filter(([, v]) => v !== undefined)
  .map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v}`)
  .join(', ') + ' }';

let entries = '';
let bytes = 0, opCount = 0;
for (const [file, key] of OBJECTS) {
  const art = convert(fs.readFileSync(`${DIR}/${file}.svg`, 'utf8'));
  bytes += art.ops.reduce((n, o) => n + o.d.length, 0);
  opCount += art.ops.length;
  entries += `    ${key}: {\n        width: ${art.width}, height: ${art.height},\n`
    + (art.clip ? `        clip: '${art.clip}',\n` : '')
    + `        ops: [\n${art.ops.map((o) => `            ${fmt(o)},`).join('\n')}\n        ],\n    },\n`;
}

fs.writeFileSync('src/game/obstacleArt.ts',
`/**
 * Obstacle line art, generated from the SVGs in assets/concepts/obstacles.
 *
 * Each object is a list of draw operations in order: the dark body, translucent facet
 * planes, a rim highlight clipped to the body, then the neon outlines. Colours are
 * authored per stage in the artwork itself.
 *
 * Coordinates are in the drawing's own space; the game scales them to whatever size it
 * needs, so they stay crisp however large they are drawn.
 *
 * Regenerate with: node scripts/generate-obstacle-art.js
 */

export interface ArtOp {
    /** SVG path data, in the drawing's own coordinate space. */
    d: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
    /** Clip this operation to the body outline. */
    clip?: boolean;
    evenOdd?: boolean;
}

export interface ArtDefinition {
    width: number;
    height: number;
    /** The body outline, used to clip the rim highlight. */
    clip?: string;
    ops: ArtOp[];
}

export const OBSTACLE_ART: Record<string, ArtDefinition> = {
${entries}};
`);
console.log(`wrote src/game/obstacleArt.ts - ${OBJECTS.length} objects, ${opCount} draw ops, ${(bytes/1024).toFixed(1)}KB of path data`);
