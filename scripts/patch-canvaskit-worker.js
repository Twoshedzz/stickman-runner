/**
 * Apply worker fallback + CORS fix to canvaskit-wasm so CanvasKit can load in worklet/worker
 * contexts. Run after patch-package in postinstall.
 * 1) When globalThis.__SKIA_WASM_BINARY__ is not set, use unpkg URL so fetch can load WASM.
 * 2) Use credentials:"omit" and mode:"cors" so cross-origin fetch works in workers.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../node_modules/canvaskit-wasm/bin/full/canvaskit.js');
if (!fs.existsSync(file)) return;

let content = fs.readFileSync(file, 'utf8');
let changed = false;

// Worker fallback: use unpkg URL when no binary is available (e.g. in worklet)
const search = '}var ib;ib="canvaskit.wasm";if(!hb(ib)){var nb=ib;ib=w.locateFile?w.locateFile(nb,Aa):Aa+nb}function ob(a){';
const replace = '}var ib;ib="canvaskit.wasm";if(!hb(ib)){var nb=ib;ib=w.locateFile?w.locateFile(nb,Aa):Aa+nb}if(!Ia&&typeof globalThis!=="undefined"&&!globalThis.__SKIA_WASM_BINARY__&&ib.indexOf("http")!==0)ib="https://unpkg.com/canvaskit-wasm@0.40.0/bin/full/canvaskit.wasm";function ob(a){';
if (content.includes(search) && !content.includes('unpkg.com/canvaskit-wasm@0.40.0')) {
  content = content.replace(search, replace);
  changed = true;
}

// CORS fix: same-origin credentials can block cross-origin WASM fetch in workers
if (content.includes('credentials:"same-origin"')) {
  content = content.replace(/fetch\(([^,]+),\{credentials:"same-origin"\}\)/g, 'fetch($1,{credentials:"omit",mode:"cors"})');
  changed = true;
}

// When fetch fails (e.g. in worklet), try __SKIA_WASM_PROMISE__ then XMLHttpRequest before throwing
const pbCatch = '.catch(()=>ob(a))';
const pbCatchXhr = '.catch(()=>Ca?new Promise((b,d)=>Ca(a,f=>b(new Uint8Array(f)),d)):Promise.resolve().then(()=>ob(a)))';
const pbCatchWithPromise = '.catch(()=>{if(typeof globalThis!=="undefined"&&globalThis.__SKIA_WASM_PROMISE__)return globalThis.__SKIA_WASM_PROMISE__;return Ca?new Promise((b,d)=>Ca(a,f=>b(new Uint8Array(f)),d)):Promise.resolve().then(()=>ob(a))})';
if (content.includes(pbCatch) && !content.includes('__SKIA_WASM_PROMISE__')) {
  content = content.replace(pbCatch, pbCatchXhr);
  changed = true;
}
if (content.includes(pbCatchXhr) && !content.includes('__SKIA_WASM_PROMISE__')) {
  content = content.replace(pbCatchXhr, pbCatchWithPromise);
  changed = true;
}

// When fetch fails in rb(), fall back to qb (which will try pb and use XHR fallback)
if (content.includes('return qb(d,a,b)}));});}function sb(a){') && !content.includes(').catch(function(){return qb(d,a,b);})')) {
  content = content.replace('return qb(d,a,b)}));});}function sb(a){', 'return qb(d,a,b)})).catch(function(){return qb(d,a,b);});});}function sb(a){');
  changed = true;
}

if (changed) fs.writeFileSync(file, content, 'utf8');
