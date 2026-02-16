# Debugging plan: Web black screen (Vercel / main branch)

**Goal:** Code stays optimised for phone; you can test the game in a web browser.  
**Problem:** The latest version on GitHub (and Vercel) shows a black screen on web.

---

## 1. Where the problem came in (from Git history)

- **Commit b3b24d5** (Web deploy setup, HOW_WE_WORK, CanvasKit fix):  
  GameCanvas used **only `NeonCityLayer`** on all platforms. The comment said:  
  **“City buildings (legacy layer path – sprites disabled to avoid black screen).”**  
  So at that point, **sprites were deliberately turned off on web** because they caused a black screen.

- **Commit fc079a3** (Stage 1 review, performance improvements):  
  GameCanvas was changed so that **on web** it uses **`NeonCitySprites`** (texture-based building lights), and on native it still uses `NeonCityLayer`.  
  The comment was updated to:  
  “City: on web use texture-based sprites (fewer draw calls, avoids CanvasKit Aborted under load).”

So the **performance change that switched building lights to the sprite method on web** is in **fc079a3**. That commit **re-enabled** the sprite path on web. The earlier commit had already disabled that path to avoid the black screen. So the black screen on Vercel is very likely from **using `NeonCitySprites` on web again**.

**Summary:** The problem almost certainly came in when **web was switched from `NeonCityLayer` to `NeonCitySprites`** in fc079a3. The sprite path uses many `useTexture()` calls and Skia `Image`; on web that path can fail or render black.

---

## 2. Relevant code (for debugging)

| Area | Role |
|------|------|
| **GameCanvas.tsx** | Chooses city renderer: `Platform.OS === 'web' ? NeonCitySprites : NeonCityLayer` (current main). |
| **NeonCityBackground.tsx** | `NeonCityLayer` = many `Path` + `Rect` per frame. `NeonCitySprites` = 18× `useTexture(...)` then `Image` with those textures. |
| **skiaWasmPreload.web.ts** | WASM preload; can affect whether Skia is ready before first draw. |
| **app/_layout.tsx** | WasmGate, lazy Skia load; can affect when Canvas is first rendered. |

---

## 3. Debugging plan (step by step)

### Step 1: Confirm the cause (one code change)

**Change:** On web, use **`NeonCityLayer`** instead of **`NeonCitySprites`** (same as mobile).

- In `GameCanvas.tsx`, replace the `Platform.OS === 'web' ? NeonCitySprites : NeonCityLayer` block with the **same** block as mobile: always use the two `NeonCityLayer` calls (back + front) for both web and native.
- Deploy to Vercel (or run `npx expo start --web` and test in the browser).

**If the black screen goes away:**  
The sprite path (`NeonCitySprites` / `useTexture` on web) is the cause. Keep web on `NeonCityLayer` so you can test on web; phone stays optimised (still `NeonCityLayer`; no change for mobile).

**If the black screen remains:**  
The cause is elsewhere (e.g. Skia/WASM load, or another part of the Canvas). Then continue with Steps 2–4.

---

### Step 2: Check the browser console (if Step 1 didn’t fix it)

- Open DevTools (F12) → Console.
- Reload the game and note any **red errors** (e.g. “Skia failed to load”, “Aborted”, “Failed to construct 'Text'”, or CanvasKit/WASM errors).
- Note the **exact message and file/line** if given. That will point to either WASM load, Skia init, or a specific component.

---

### Step 3: Review other fc079a3 changes that touch web

If reverting the sprite switch wasn’t enough, the next suspects are other web-related edits in fc079a3:

- **app/_layout.tsx** – WasmGate, lazy load, loading screen.
- **src/skiaWasmPreload.web.ts** – Preload and timing of WASM.
- **scripts/patch-canvaskit-worker.js** – CanvasKit patch.

Revert or adjust these **one at a time**, then test web after each change. Prefer reverting only the minimal part that might affect first paint (e.g. timing of when the Canvas is mounted or when WASM is considered “ready”).

---

### Step 4: If useTexture on web is still desired later

If you later want to try sprites on web again (for performance):

- Check whether **`useTexture`** on web returns a valid texture or `null`/invalid.
- Consider a **fallback**: if `useTexture` fails or returns null on web, render **`NeonCityLayer`** instead of `NeonCitySprites` so the game never stays black.

---

## 4. Recommended immediate fix (for Vercel and local web testing)

- **Do:** In `GameCanvas.tsx`, use **`NeonCityLayer` for both web and native** when rendering the city (remove the `Platform.OS === 'web' ? NeonCitySprites : …` branch).
- **Result:**  
  - **Phone:** Unchanged; still `NeonCityLayer`, optimised as now.  
  - **Web:** Same draw path that was known to work before fc079a3; more draw calls than sprites but no black screen, so you can test the game in a browser and Vercel preview works again.

This matches the “sprites disabled to avoid black screen” approach from b3b24d5 and keeps one codebase that works on both phone and web.

---

## 5. Optional: Document the trade-off

In `docs/WEB_PATCHES_AND_ARCHITECTURE.md` or `docs/STAGE1_REVIEW.md`, add a short note:

- On web we use **`NeonCityLayer`** (not `NeonCitySprites`) so the browser preview doesn’t show a black screen.
- Trade-off: web has more draw calls for the city lights; acceptable for “test in browser” and Vercel deploy.

This helps future changes avoid re-enabling `NeonCitySprites` on web without a fallback.

---

## 6. Mid-game "Aborted()" on web

If you see **Uncaught Error: Aborted(). Build with -sASSERTIONS for more info.** in the browser console during play, that’s **CanvasKit (WASM)** aborting—often when it’s under load (e.g. collisions, particles, worklets loading a chunk). It comes from `fetchThenEvalJs.ts` when a code-split chunk is evaluated and Skia is in a bad state.

**What we do:** The Expo patch retries the eval **up to twice** (three attempts total) on the next frame(s) when the error message contains `"Aborted"`. Sometimes the next frame succeeds; if not, the error is rethrown.

**If it keeps happening:** Expected on web under load; the docs treat web as preview-only. For a stable run, use Expo Go on phone. If you need web to be more stable, options are in `WEB_PATCHES_AND_ARCHITECTURE.md` (e.g. reduce load, or web without Skia).

**If you see 1–2 of these errors in the console but the game still runs:** That’s normal. The retry runs up to three times; if CanvasKit is under load (e.g. worklets loading chunks), all attempts can still abort and the error is logged. The game can keep working; treat web as preview and use the phone build for a smooth run.

---

## 7. What to do when you see “fix or re-apply patches”

### What are patches?

The project has **two patch files** in the `patches/` folder:

1. **expo+54.0.33.patch** – Changes how Expo loads code chunks so we wait for Skia WASM and retry on "Aborted".
2. **canvaskit-wasm+0.40.0.patch** – Changes how CanvasKit loads the WASM binary so it uses our preloaded binary.

They **edit code inside `node_modules`** (Expo and CanvasKit). Those edits are not in the normal package source; they’re stored as patch files and **re-applied** after installs.

### When do they get applied?

After **`npm install`**, the **postinstall** script in `package.json` runs. It tries to apply both patches. If that succeeds, you don’t need to do anything.

### What “re-apply” means

**Re-apply** = run the step that applies the patches again so the patched code is in `node_modules`.

**What you do:**

1. Open a terminal in the project folder.
2. Run:
   ```bash
   npm run postinstall
   ```
   That runs the same script that runs after `npm install` and will try to apply both patches.

   Or run the patch tool directly:
   ```bash
   npx patch-package
   ```
   That applies all patches in `patches/` to `node_modules`.

3. If you see **“Failed to apply patch”** or **“could not be parsed”** for one of the patches, then **patch-package** is failing on that file. In that case:
   - **Expo patch:** The retry logic for "Aborted" may not be in `node_modules` yet. The game can still run; you might see "Aborted" mid-game on web more often.
   - **Canvaskit patch:** Your `postinstall` script has a fallback that runs the system `patch` command for the CanvasKit patch. So CanvasKit might still get patched even if `patch-package` fails.

### What “fix” means

**Fix** = get the patch tool to succeed so both patches are applied.

- If **patch-package** says a patch file **“could not be parsed”**, the patch file format may be wrong (e.g. line endings, or a change that broke the format). Fixing that usually means regenerating the patch (after editing the file in `node_modules` and running `npx patch-package <package-name>`) or correcting the patch file by hand. If you’re not comfortable editing patch files, you can leave it: the game often still works; the Expo patch mainly adds extra retries for the "Aborted" error on web.
- If **patch-package** says **“Failed to apply patch”** because the code in `node_modules` doesn’t match (e.g. after an Expo or CanvasKit upgrade), the package was updated and the patch is out of date. Then you either update the patch to match the new code or temporarily remove that patch until it’s updated.

**Summary:** Run **`npm run postinstall`** (or **`npx patch-package`**) to re-apply patches. If one patch fails, the other may still apply; the game will often run, with possible extra "Aborted" errors on web if the Expo patch didn’t apply.
