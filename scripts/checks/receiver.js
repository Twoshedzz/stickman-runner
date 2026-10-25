// Saves what the page POSTs (PNGs from canvas data URLs, HTML and JSON as text) into a folder,
// and serves this folder's check scripts at GET /<name>.js.
// Usage: node scripts/checks/receiver.js <shots dir>   (listens on 127.0.0.1:8099, or PORT)
const http = require('http'); const fs = require('fs'); const path = require('path');
const dir = process.argv[2];
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method !== 'POST') { res.end(req.url.endsWith('.js') ? fs.readFileSync(path.join(__dirname, path.basename(req.url)), 'utf8') : 'ok'); return; }
  const name = path.basename(decodeURIComponent(req.url.slice(1)));
  const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => {
    const body = Buffer.concat(chunks).toString();
    if (!name.endsWith('.png')) { fs.writeFileSync(path.join(dir, name), body); res.end('saved ' + name); return; }
    const b64 = body.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(path.join(dir, name), Buffer.from(b64, 'base64'));
    res.end('saved ' + name);
  });
}).listen(Number(process.env.PORT) || 8099, '127.0.0.1');
