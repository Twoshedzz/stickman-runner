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

// ob() sync path: (1) globalThis/window binary, (2) sync XHR to ib (unpkg), (3) sync XHR same-origin (multiple paths)
// Multiple same-origin paths help when segment 5 or worker loads before preload completes.
const obWithSyncXhr = 'function ob(a){var bin=typeof globalThis!=="undefined"&&globalThis.__SKIA_WASM_BINARY__?globalThis.__SKIA_WASM_BINARY__:(typeof window!=="undefined"&&window.__SKIA_WASM_BINARY__?window.__SKIA_WASM_BINARY__:null);if(a==ib&&bin){Ia=bin;return new Uint8Array(Ia);}if(a==ib&&Ia)return new Uint8Array(Ia);if(Da)return Da(a);if(a==ib){try{var xhr=new XMLHttpRequest();xhr.open("GET",ib,false);xhr.responseType="arraybuffer";xhr.send(null);if((xhr.status===200||xhr.status===0)&&xhr.response){Ia=new Uint8Array(xhr.response);return new Uint8Array(Ia);}}catch(e){}var origin=typeof location!=="undefined"&&location.origin?location.origin:"";var paths=["/static/js/canvaskit.wasm","/canvaskit.wasm","/static/canvaskit.wasm"];for(var i=0;i<paths.length;i++){try{var xhr2=new XMLHttpRequest();xhr2.open("GET",origin+paths[i],false);xhr2.responseType="arraybuffer";xhr2.send(null);if((xhr2.status===200||xhr2.status===0)&&xhr2.response){Ia=new Uint8Array(xhr2.response);return new Uint8Array(Ia);}}catch(e){}}}throw"both async and sync fetching of the wasm failed";}';
const obOriginal = 'function ob(a){if(a==ib&&Ia)return new Uint8Array(Ia);if(Da)return Da(a);throw"both async and sync fetching of the wasm failed";}';
const obGlobalOnly = 'function ob(a){if(a==ib&&typeof globalThis!=="undefined"&&globalThis.__SKIA_WASM_BINARY__){Ia=globalThis.__SKIA_WASM_BINARY__;return new Uint8Array(Ia);}if(a==ib&&Ia)return new Uint8Array(Ia);if(Da)return Da(a);throw"both async and sync fetching of the wasm failed";}';
const obWithWindow = 'function ob(a){var bin=typeof globalThis!=="undefined"&&globalThis.__SKIA_WASM_BINARY__?globalThis.__SKIA_WASM_BINARY__:(typeof window!=="undefined"&&window.__SKIA_WASM_BINARY__?window.__SKIA_WASM_BINARY__:null);if(a==ib&&bin){Ia=bin;return new Uint8Array(Ia);}if(a==ib&&Ia)return new Uint8Array(Ia);if(Da)return Da(a);throw"both async and sync fetching of the wasm failed";}';
const obWithSyncXhrUnpkgOnly = 'function ob(a){var bin=typeof globalThis!=="undefined"&&globalThis.__SKIA_WASM_BINARY__?globalThis.__SKIA_WASM_BINARY__:(typeof window!=="undefined"&&window.__SKIA_WASM_BINARY__?window.__SKIA_WASM_BINARY__:null);if(a==ib&&bin){Ia=bin;return new Uint8Array(Ia);}if(a==ib&&Ia)return new Uint8Array(Ia);if(Da)return Da(a);if(a==ib&&ib.indexOf("http")===0){try{var xhr=new XMLHttpRequest();xhr.open("GET",ib,false);xhr.responseType="arraybuffer";xhr.send(null);if(xhr.status===200&&xhr.response){Ia=new Uint8Array(xhr.response);return new Uint8Array(Ia);}}catch(e){}}throw"both async and sync fetching of the wasm failed";}';
// Upgrade single same-origin path to multiple paths (so segment 5 / different bases work)
const obSingleSameOrigin = 'var sameOrigin=(typeof location!=="undefined"&&location.origin?location.origin:"")+"/static/js/canvaskit.wasm";try{var xhr2=new XMLHttpRequest();xhr2.open("GET",sameOrigin,false);xhr2.responseType="arraybuffer";xhr2.send(null);if(xhr2.status===200&&xhr2.response){Ia=new Uint8Array(xhr2.response);return new Uint8Array(Ia);}}catch(e){}}';
const obMultiSameOrigin = 'var origin=typeof location!=="undefined"&&location.origin?location.origin:"";var paths=["/static/js/canvaskit.wasm","/canvaskit.wasm","/static/canvaskit.wasm"];for(var i=0;i<paths.length;i++){try{var xhr2=new XMLHttpRequest();xhr2.open("GET",origin+paths[i],false);xhr2.responseType="arraybuffer";xhr2.send(null);if((xhr2.status===200||xhr2.status===0)&&xhr2.response){Ia=new Uint8Array(xhr2.response);return new Uint8Array(Ia);}}catch(e){}}}';
if (content.includes(obSingleSameOrigin) && !content.includes('paths.length')) {
  content = content.replace(obSingleSameOrigin, obMultiSameOrigin);
  changed = true;
}
// Also accept status 0 on first XHR (ib) for local/cors edge cases
if (content.includes('if(xhr.status===200&&xhr.response){Ia=new Uint8Array(xhr.response)') && !content.includes('xhr.status===0')) {
  content = content.replace('if(xhr.status===200&&xhr.response){Ia=new Uint8Array(xhr.response)', 'if((xhr.status===200||xhr.status===0)&&xhr.response){Ia=new Uint8Array(xhr.response)');
  changed = true;
}
if (content.includes('xhr2.open("GET",sameOrigin,false)') && !content.includes('paths.length')) {
  // Old single-path form still present (replace didn't run above?), try line-based replace
} else if (content.includes('xhr2.open("GET",sameOrigin,false)')) {
  // Already have multi-path or other same-origin fallback
} else if (content.includes(obWithSyncXhrUnpkgOnly)) {
  content = content.replace(obWithSyncXhrUnpkgOnly, obWithSyncXhr);
  changed = true;
} else if (content.includes(obWithWindow)) {
  content = content.replace(obWithWindow, obWithSyncXhr);
  changed = true;
} else if (content.includes(obGlobalOnly)) {
  content = content.replace(obGlobalOnly, obWithSyncXhr);
  changed = true;
} else if (content.includes(obOriginal)) {
  content = content.replace(obOriginal, obWithSyncXhr);
  changed = true;
}

if (changed) fs.writeFileSync(file, content, 'utf8');
