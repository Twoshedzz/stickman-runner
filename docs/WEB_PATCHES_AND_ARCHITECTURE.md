# What the patches do, and the deeper web problem

## What the patches are doing

### 1. Expo patch (`expo+54.0.33.patch` – `fetchThenEvalJs.ts`)

**What this file does (unpatched):**  
When the app loads a **code-split chunk** (e.g. a lazy-loaded module), Expo fetches the chunk’s JS over the network and runs it with `eval(body)`.

**What we changed:**

- **Wait for Skia WASM before eval**  
  We don’t run `eval(body)` until `__SKIA_WASM_PROMISE__` has resolved. So when the chunk contains CanvasKit/Skia code, the WASM binary is already in memory. That avoids one specific failure: the chunk runs, tries to use the WASM binary, it isn’t there yet, and CanvasKit aborts.

- **Retry up to twice on "Aborted"**  
  If `eval(body)` throws an error whose message contains `"Aborted"`, we retry on the next `requestAnimationFrame`, up to **two retries** (three attempts total). If all fail, we rethrow so the app can show an error. This helps when CanvasKit aborts under load (e.g. mid-game during collisions/particles); sometimes the next frame succeeds.

**So:**  
We are **not** “telling the app to keep running no matter what.” We are (a) fixing a **race** (eval before WASM is ready) and (b) adding **retries** to see if the failure was timing-related. If CanvasKit is in a bad state, retries may still fail and you’ll see “Aborted(). Build with -sASSERTIONS for more info.” in the console—that’s expected on web under load; primary platform is phone.

---

### 2. CanvasKit-WASM patch (`canvaskit-wasm+0.40.0.patch`)

**What it does:**

- Uses `globalThis.__SKIA_WASM_BINARY__` if the app has already put the binary there (e.g. from our preload), instead of only fetching from a URL.
- Makes CanvasKit wait on `__SKIA_WASM_PROMISE__` before instantiating, so it doesn’t run before our preload has set the binary.

**So:**  
This patch is about **when and how** the WASM binary is supplied to CanvasKit, so that our preload and Expo’s chunk loading are aligned. It does not hide or ignore errors.

---

### 3. Skia patch (`@shopify+react-native-skia+2.2.12.patch`) – the memory leak

**This was the main cause of `Aborted()` on web.** On web, Skia objects (paints, paths, gradients, pictures) live in CanvasKit's own memory and are never freed automatically — something has to call `dispose()` on each one. The library's web renderer didn't, for the objects it creates while drawing each frame. Since the game redraws the whole scene every frame, CanvasKit's memory grew by about 5MB a second until it hit its 2GB ceiling — roughly 7 minutes of play, which is why crashes tended to come late in stage 2 — and then aborted.

**What we changed** (web-only files; the phone app doesn't use them):

- `sksg/Container.web` – each frame, track every paint, parsed SVG path, gradient and filter created while recording the picture, and free them once the picture is finished. Also free the picture recorder.
- `views/SkiaPictureView.web` – free the previous frame's picture when the next one replaces it.
- `skia/web/JsiSkPaint` – `assign()` and `reset()` replaced a paint's internals without freeing the old ones.

Each change is applied to both `lib/module` (what the web build actually loads) and `src` (kept in step).

**Measured:** before, memory hit 2GB within about 7 minutes. After, a full four-stage game levels off at about 460MB by mid stage 2 and stays flat to the end, with no errors.

**How to check it again:** in the browser console during play, `CanvasKit.HEAPU8.byteLength / 1048576` is CanvasKit's memory in MB. It should level off, not climb steadily.

---

## Keeping the patches applied

The patches change code inside `node_modules`, which gets replaced whenever packages are reinstalled. So the changes are stored as files in `patches/` and re-applied automatically.

**When they’re applied:** every `npm install` runs the `postinstall` script in `package.json`, which:

1. Runs `patch-package` to apply the files in `patches/`.
2. Runs `scripts/patch-canvaskit-worker.js`, which makes further CanvasKit changes (a fallback download address for the `.wasm` file, cross-origin loading fixes, and extra loading fallbacks).
3. Copies `canvaskit.wasm` into `web/static/js/`.

A good run shows a tick for each patch:

```
@shopify/react-native-skia@2.2.12 ✔
canvaskit-wasm@0.40.0 ✔
expo@54.0.33 ✔
```

(Running it a second time on an already-patched install shows a "Failed to apply" error for `canvaskit-wasm` only. That's because the worker script in step 2 has changed the same file since; the patch is still in place.)

**To re-apply by hand:** run `npm run postinstall`.

**If you see an error instead of the ticks:**

- **“could not be parsed”** – the patch file itself is broken, usually from being edited by hand. Don’t hand-edit patch files; regenerate them (below).
- **“Failed to apply patch”** – usually Expo or CanvasKit was upgraded, so the code the patch expects has changed. The patch needs redoing for the new version (the version is in the file name).
- The `postinstall` script has a fallback that hides errors, so always look for the ticks rather than assuming it worked.
- Without the patches, web may still load but will hit `Aborted()` errors more often. The phone app (Expo Go) doesn’t use these patches.

**To regenerate a patch:**

1. Get a clean, unpatched copy of the package: delete its folder from `node_modules` (e.g. `node_modules/canvaskit-wasm`), then run `npm install --ignore-scripts`. This reinstalls it without applying any patches.
2. To keep the current patch as a starting point, apply just that one with `git apply --recount patches/<file>.patch`. Then make your changes inside `node_modules`.
3. Delete any `.orig` or `.rej` files next to the changed file. These are backups left by the system `patch` command, and they would otherwise end up inside the patch.
4. Run `npx patch-package <package-name>` (e.g. `npx patch-package canvaskit-wasm`).
5. Run `npm run postinstall` and check for the ticks.

For CanvasKit, regenerate *before* `scripts/patch-canvaskit-worker.js` has run on the clean copy (step 1 makes sure of this); otherwise the worker script’s changes get baked into the patch.

---

> **Update (October 2026):** most of the "architecture" diagnosis below turned out to be a
> memory leak in Skia's web renderer, now fixed by patch 3 above. The notes are kept because
> the load and chunk-loading risks they describe are still real, just much smaller.

## Is there a deeper root cause? Yes.

The patches address **specific failure modes** (binary not ready, one-off timing). They do **not** fix the underlying architectural tension.

### What’s actually going on

On web you have:

1. **React Native Web + Expo**  
   - Code splitting and dynamic `eval()` of chunks (e.g. worklets, lazy Skia).

2. **CanvasKit (Skia compiled to WASM)**  
   - Runs on the main thread, has its own memory and lifecycle, and can **abort** (e.g. assertions, OOM, or internal errors) when something goes wrong.

3. **Heavy, frequent work**  
   - 60fps game loop, many Skia draw calls (canvas, grid, city, particles), and state updates.

4. **Lazy loading**  
   - Some code (e.g. from `react-native-worklets` or Skia) is loaded in chunks. When a chunk is loaded, Expo fetches it and runs `eval(body)`. That chunk may:
   - Touch CanvasKit, or
   - Trigger more loading, or
   - Run while the main thread is already under load.

So the **deeper root cause** is:

- **The web stack depends on CanvasKit WASM + dynamic eval in the same app**, with a lot of main-thread and WASM work.  
- Any chunk that touches Skia can run **during** a busy frame. If CanvasKit is in a bad state (memory, re-entrancy, or internal assert), it can **abort**.  
- The Expo patch only makes sure (a) WASM is ready before first use and (b) we retry **once** on Aborted. It does not stop Skia from aborting when it’s under load or in a bad state. So if the environment is inherently unstable, you get a high failure rate (e.g. 80–90%).

So: **we are not “missing” a single bug we could fix with another patch. The architecture itself—Skia-on-web in this loading and rendering setup—is fragile.**

---

## Options going forward

### A. Web without Skia (architectural fix)

- **Use a different renderer for web only:** e.g. HTML Canvas 2D, or a small WebGL layer, or React DOM + SVG/CSS for the game view.
- **Keep Skia only for native** (iOS/Android), where it’s stable.
- **Share game logic** (physics, spawn, collisions, state) everywhere; only the **draw** path is different: Skia on native, Canvas 2D (or similar) on web.

**Pros:** Web no longer depends on CanvasKit or its Aborted() behaviour; you remove the main source of flakiness.  
**Cons:** Two draw implementations to maintain; web and native may look slightly different unless you invest in parity.

### B. Reduce load and surface area on web (mitigation only)

- Further reduce particles, draw calls, and complexity on web (you’ve already started).
- Avoid or delay lazy-loaded code that touches Skia during gameplay (hard to control from your app alone).
- Treat web as a **low-fidelity preview** and accept that it may still crash under load.

**Pros:** No big refactor.  
**Cons:** Does not remove the fundamental tension; 80–90% failure suggests this may not be enough.

### C. Accept web as “preview only” and document it

- Position web as: “for quick preview and feedback; for real play use mobile.”
- Optionally add a simple “Web not fully supported” or “Best on mobile” message on the web shell.
- Keep the patches as a best-effort to reduce obvious races and give one retry, without expecting full stability.

---

## Short answers to your questions

- **What is the patching doing?**  
  (1) Delaying chunk eval until WASM is ready, and (2) retrying **once** on Aborted. It is **not** “if errors happen, keep running”; if the retry fails, the error still propagates and the app can crash.

- **Are we missing a deeper root cause?**  
  No. The deeper cause is **the architecture**: relying on CanvasKit WASM on web with code-split chunks and heavy, 60fps rendering. The patches fix specific races and add one retry; they don’t make that architecture stable.

- **Why 80–90% failure on web?**  
  Because the underlying situation (Skia under load + dynamic eval) is still there. The retry only helps when the failure is a one-frame timing glitch; most of the time the abort is structural (load + WASM + main thread), so the retry fails too.

If you want to pursue the architectural fix (web without Skia), the next step is to design a minimal web-only renderer (e.g. Canvas 2D) that reads the same game state and draws the runner, obstacles, and background, and then route `Platform.OS === 'web'` to that path instead of Skia.
