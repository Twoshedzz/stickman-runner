# The web patches, how the web loads Skia, and the deeper web problem

## Where things stand: no patches (since the SDK 58 upgrade, U1)

Up to Expo SDK 54 the web game needed three patches to code inside `node_modules`, plus a script
that changed CanvasKit after every install. The upgrade to SDK 58 (step U1, October 2026) retired
all of them: the newer libraries either fix the problem themselves, or changed so the patch no
longer had anything to do. `patches/` is gone; `patch-package` still runs on every install, ready
if a patch is ever needed again (see "If a patch is needed again" below).

| Patch (SDK 54) | What it did | What happened in U1 |
|---|---|---|
| **Skia** (`@shopify+react-native-skia+2.2.12`) | Fixed the memory leak behind the web `Aborted()` crashes (below). | Ported to Skia 2.4 and 2.6 on the way; **retired at Skia 2.14 (SDK 58)**, which fixes the leak itself. |
| **CanvasKit** (`canvaskit-wasm+0.40.0`), and `scripts/patch-canvaskit-worker.js` | Made CanvasKit use the `.wasm` file the game had already downloaded, and wait for it. | **Retired at CanvasKit 0.41 (SDK 56)**: its loader was rewritten, so there was nothing left to patch. The game now hands CanvasKit the downloaded file another way (below). |
| **Expo** (`expo+54.0.33`, `fetchThenEvalJs.ts`) | Made code chunks wait for the Skia file before running, and retried on `Aborted`. | **Retired at SDK 58.** It only ever ran on the web development server (the built site loads chunks with plain `<script>` tags), and CanvasKit is now only loaded after its file has arrived. |

### The memory leak (the Skia patch, now fixed in Skia)

**This was the main cause of `Aborted()` on web.** On web, Skia objects (paints, paths, gradients,
pictures) live in CanvasKit's own memory and are never freed automatically: something has to call
`dispose()` on each one. Skia's web renderer up to 2.6 didn't, for the objects it creates while
drawing each frame. The game redraws the whole scene every frame during play, so CanvasKit's memory
grew by about 5MB a second until it hit its 2GB ceiling (roughly 7 minutes of play, which is why
crashes tended to come late in stage 2) and then aborted.

Our patch freed each frame's paints, paths, gradients and filters once the frame's picture was
recorded, the picture recorder, the previous frame's picture, and the old paint when a paint was
reset. Skia 2.14 does the same itself: everything made while drawing a frame belongs to that frame
and is freed after it (`sksg/Recorder/FrameScope`), along with the recorder, the previous picture
and replaced paints.

**Measured after the upgrade (SDK 58, built site):** 10 minutes of game time through all four
stages, every frame drawn (72,036 pictures): CanvasKit's memory was **128MB at the start and 128MB
at the end**. With Skia's freeing switched off, the same test climbs 128 → 319 → 647MB in two
minutes, so the test does catch a leak. (Before the original fix: 2GB and a crash by 7 minutes.)

**How to check it again:** `scripts/checks/memory-soak.js` (see `scripts/checks/README.md`) on the
built game. Or by hand, in the browser console during play: `CanvasKit.HEAPU8.byteLength / 1048576`
is CanvasKit's memory in MB. It should level off, not climb steadily.

## How the web loads Skia

- `src/skiaWasmPreload.web.ts` runs first (imported at the top of `app/_layout.tsx`). It downloads
  CanvasKit's `.wasm` file (from unpkg, at the version in `CANVASKIT_VERSION`), then starts
  CanvasKit and puts it on `globalThis.CanvasKit`.
- Since CanvasKit 0.41 it can't be handed the downloaded file directly (the old `wasmBinary`
  option is gone); it only asks where the file is (`locateFile`). The preload gives it a local
  `blob:` address for the copy already downloaded, so the file isn't fetched twice.
- The page is also rendered once in Node when it's built (static output). Nothing is drawn there,
  so the preload skips CanvasKit outside a browser.
- `src/components/SkiaWrapper.web.tsx` waits for the preload before showing anything drawn with
  Skia, and has a fallback that loads CanvasKit itself if the preload didn't run.
- `public/canvaskit.wasm` is a copy of the installed CanvasKit's file. A test
  (`src/__tests__/canvaskitFile.test.ts`) checks it, and the `CANVASKIT_VERSION` in the preload and
  the wrapper, match the installed CanvasKit, so a Skia upgrade that changes CanvasKit fails the
  tests until they're updated: copy `node_modules/canvaskit-wasm/bin/full/canvaskit.wasm` over
  `public/canvaskit.wasm` and change the two version numbers.
- Found in U1, not changed: the preload first tries to read the file from the game's own site
  without waiting (`trySyncSameOriginWasm`), but browsers don't allow that kind of read on a web
  page, so it always falls back to unpkg. The game has always downloaded CanvasKit from unpkg.

## If a patch is needed again

Every `npm install` runs the `postinstall` script in `package.json`: `patch-package` applies any
files in `patches/` (and prints a tick for each), then Skia's own `setup-canvaskit.js` copies
`canvaskit.wasm` into `web/static/js/`. If `patch-package` fails, the install carries on and prints
"patch-package failed: see docs/WEB_PATCHES_AND_ARCHITECTURE.md", so look for the ticks.

To make a patch:

1. Change the file inside `node_modules` (for web code, usually under `lib/module`, which is what the
   web build loads; change `src` to match). Delete any `.orig` or `.rej` files next to it.
2. Run `npx patch-package <package-name>`. That writes `patches/<package>+<version>.patch`.
3. Run `npm run postinstall` and check for the tick.

A patch is tied to the exact version in its file name; after an upgrade, "Failed to apply patch"
means the library changed and the patch needs redoing, or may no longer be needed.

---

> **Update (October 2026):** most of the "architecture" diagnosis below turned out to be a
> memory leak in Skia's web renderer, fixed first by our patch and, since SDK 58, by Skia itself.
> The notes below were written before that, when the patches were in place; they're kept because
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
   - 60fps game loop, many Skia draw calls (canvas, grid, scenery, particles), and state updates. (Since October 2026 the screen only redraws every frame during play; the menus redraw only when something on them changes.)

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
