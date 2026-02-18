/**
 * Generates 1200×350 placeholder PNGs for city strips.
 * Top portion = transparent (sky shows through); bottom = building band.
 * Run: node scripts/generate-city-placeholders.js
 * Replace these with your real art; see assets/city/README.md.
 */

const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const WIDTH = 1200;
const HEIGHT = 350;
const OUT_DIR = path.join(__dirname, "..", "assets", "city");
// Building band: from this Y to bottom (matches city ground + building height)
const BUILDING_BAND_TOP = 170;

// Fill full image with transparent, then fill building band (from BUILDING_BAND_TOP to HEIGHT) with color
function fillWithColorAndTransparentSky(png, hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  for (let y = 0; y < HEIGHT; y++) {
    const a = y >= BUILDING_BAND_TOP ? 255 : 0;
    for (let x = 0; x < WIDTH; x++) {
      const i = (y * WIDTH + x) * 4;
      png.data[i] = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = a;
    }
  }
}

function writePng(filename, hexColor) {
  const png = new PNG({ width: WIDTH, height: HEIGHT });
  fillWithColorAndTransparentSky(png, hexColor);
  const buffer = PNG.sync.write(png);
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, buffer);
  console.log("Written:", outPath);
}

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Back layer (purple tones) – slightly different so you can tell them apart in IDE
writePng("back_no.png", "#2c1e4a");   // city back
writePng("back_some.png", "#352252");  // slightly lighter
writePng("back_all.png", "#3e2860");   // slightly lighter again

// Front layer (black tones)
writePng("front_no.png", "#000000");
writePng("front_some.png", "#0a0a12");
writePng("front_all.png", "#14141e");

// Keep placeholder.png as a copy of back_no for reference
writePng("placeholder.png", "#2c1e4a");

console.log("Done. Placeholders are 1200×350; replace with your art when ready.");
