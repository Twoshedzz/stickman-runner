// Compare two capture runs: HTML byte-for-byte, canvas PNGs pixel by pixel.
// Usage: node scripts/checks/compare.js <shots dir> <prefix A> <prefix B>
const fs = require('fs'), path = require('path');
const { PNG } = require('pngjs');
const [dir, a, b] = process.argv.slice(2);
// Ids and the logo's tint filter names are counters, and the menu backdrop appears whenever the browser gets round to measuring it.
const norm = (h) => {
  h = h.replace(/ id="\d+"/g, '').replace(/tint-\d+/g, 'tint-N');
  for (;;) {
    const m = h.match(/<div class="css-view-g5y9jx" style="position: absolute; left: [-\d.]+px; top: [-\d.]+px; width: [\d.]+px; height: [\d.]+px;">/);
    const i = m ? m.index : -1;
    if (i < 0) return h;
    let depth = 0, j = i;
    do { const o = h.indexOf('<div', j + 1), c = h.indexOf('</div>', j + 1);
      if (o >= 0 && o < c) { depth++; j = o; } else { depth--; j = c; } } while (depth >= 0);
    h = h.slice(0, i) + h.slice(j + 6);
  }
};
const names = fs.readdirSync(dir).filter(f => f.startsWith(a + '_')).map(f => f.slice(a.length + 1)).sort();
for (const n of names) {
  const fa = path.join(dir, a + '_' + n), fb = path.join(dir, b + '_' + n);
  if (!fs.existsSync(fb)) { console.log(n, 'MISSING in', b); continue; }
  if (!n.endsWith('.png')) {
    const x = norm(fs.readFileSync(fa, 'utf8')), y = norm(fs.readFileSync(fb, 'utf8'));
    if (x === y) { console.log(n, 'same'); continue; }
    let i = 0; while (x[i] === y[i]) i++;
    console.log(n, 'DIFF at', i, '\n   ' + a + ': ' + x.slice(Math.max(0, i - 80), i + 120) + '\n   ' + b + ': ' + y.slice(Math.max(0, i - 80), i + 120));
  } else {
    const p = PNG.sync.read(fs.readFileSync(fa)), q = PNG.sync.read(fs.readFileSync(fb));
    let d = 0; for (let i = 0; i < p.data.length; i += 4) if (p.data[i] !== q.data[i] || p.data[i + 1] !== q.data[i + 1] || p.data[i + 2] !== q.data[i + 2]) d++;
    console.log(n, d === 0 ? 'same' : 'pixels differ: ' + d);
  }
}
