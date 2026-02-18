# Pre-generated background strips (city, trees, mountains)

This doc describes using **pre-generated static images** for stage backgrounds. It’s the preferred approach for **all** stages: city (buildings + lights), beach (trees, palms, etc.), mountains, and any future scenery. Same pattern everywhere: generate strip assets once, then at runtime only pick which strip to show and scroll it—no heavy per-frame Path/Rect drawing.

---

## City lights: problem and approach

### Problem

- **Web:** NeonCityLayer (Path + many Rect per window, every frame) contributes to CanvasKit load and crash.
- **Mobile:** Same path causes frame drops; game loop runs slower, so the runner animation and jump feel slower and more obstacles pass per jump.

The sprite path (NeonCitySprites + useTexture) would reduce draw calls but caused black screen on web and is heavy with many textures.

## Approach: pre-generated building strips

Use **static images** (PNG) for city layers instead of drawing Path + hundreds of Rects each frame.

**What one “strip” is:** A single PNG is a **full-width strip** (1200×350 px) that already contains **many buildings in a row** along the horizontal. We do **not** clip one building at a time from it. We draw the whole strip and **scroll** it (parallax): the strip moves left as the runner moves, and we draw it twice (at `offset` and `offset + CITY_WIDTH`) so it tiles seamlessly. So each strip = “a whole row of buildings” pre-drawn; we just pick which strip (no/some/all lights) and scroll.

- **No lights:** strip = building silhouettes only (no windows).
- **Some lights:** strip = buildings + a subset of windows on (e.g. ~half).
- **All lights:** strip = buildings + all windows on.

At runtime we only **choose which strip image to show** and **scroll** it. A handful of `Image` draws per frame instead of hundreds of Path/Rect calls.

### Your numbers

- **Back:** 10 no-light, 10 some-light, 10 all-light → 30 strips.
- **Front:** 10 no-light, 10 some-light, 10 all-light → 30 strips.
- **Total:** 60 pre-generated strips.

Variety comes from having 10 different building layouts per state so the city doesn’t look like the same strip repeating.

### Will it work?

Yes. It removes the expensive per-frame work (path + many rects) and replaces it with:

1. **Strip type** from theme: `nightProgress` and `lightsDwindle` → no / some / all.
2. **Variant index** from distance: e.g. `floor(distance / segmentLength) % 10` so the strip changes as the runner moves.
3. **Draw:** 2 back images + 2 front images per frame (offset and offset + CITY_WIDTH for seamless scroll), i.e. 4 `Image` draws per frame instead of hundreds of primitives.

Same parallax (back 0.2, front 0.5) and same visual idea; only the way we draw it changes.

## Implementation options

### Option A: 60 PNGs (full variety)

- **Build step:** Script that uses the existing `createCityline()` (with fixed seeds) to generate 60 images:
  - Back: 10× no lights, 10× some lights, 10× all lights.
  - Front: same.
- **No lights:** render path only (COLOR_CITY_BACK / COLOR_CITY_FRONT).
- **Some lights:** path + windows with e.g. `phase <= 1` or `phase <= 2`.
- **All lights:** path + all windows.
- **Output:** e.g. `assets/city/back_no_00.png` … `front_all_09.png` (CITY_WIDTH × SCREEN_HEIGHT each).
- **Runtime:** Load with `require()` or Skia `useImageFromSource`; pick strip by (nightProgress, lightsDwindle) → type and (distance) → variant; draw 4 images per frame.

**Pros:** No per-window draw cost, works on web and mobile, no useTexture.  
**Cons:** Need a generator (Node + canvas or similar) and ~60 assets (size can be reduced with good PNG compression or smaller resolution).

### Option B: 6 PNGs first (one variant per state)

- Same idea but only 6 images: back_no, back_some, back_all, front_no, front_some, front_all.
- Runtime: pick one of the 3 states from theme; scroll the same strip (no distance-based variant).
- **Pros:** Quick to implement and validate; minimal assets.  
**Cons:** Less variety; can upgrade to 60 later.

### Option C: Pre-bake at runtime once (no PNGs)

- On stage load, run `createCityline` 10 times per category, render each to a Skia surface/texture once, then each frame only draw those textures.
- **Pros:** No asset pipeline, same variety as 60 PNGs.  
**Cons:** useTexture/surface path is what caused web issues and may still be heavy; first-load hitch. Less reliable than static PNGs.

**Recommendation:** Implement **Option B** first (6 PNGs, 3 states × 2 layers). Get the pipeline and runtime logic solid, then add **Option A** (60 PNGs, 10 variants) for variety.

## Runtime logic (same for B and A)

1. **Strip type (no / some / all)**  
   From `currentTheme.nightProgress` and `currentTheme.lightsDwindle`:
   - `effectiveLevel = nightProgress * (1 - lightsDwindle)` (0 = day, 1 = full night).
   - Map to discrete state, e.g.:
     - `effectiveLevel <= 0.15` → no lights (dawn/dusk).
     - `0.15 < effectiveLevel < 0.85` → some lights (transition).
     - `effectiveLevel >= 0.85` or “moon visible” → all lights.
   - When `lightsDwindle > 0` (lights turning off) we can either reuse “some” or add a separate “dwindle” strip set; for v1 we can map to no/some/all the same way.

2. **Variant index (0–9)**  
   Only needed for Option A.  
   `variantIndex = Math.floor(gameState.distance / SEGMENT_LENGTH) % 10`  
   (SEGMENT_LENGTH chosen so strips change every N distance; can match CITY_WIDTH or a multiple.)

3. **Strip queuing (no flip on screen)**  
   When strip type (or variant) changes, the new strip must **only appear as it scrolls on from the right**. If we swap the image for tiles already on screen, the buildings appear to “change” and the illusion breaks.  
   - **Queue by distance:** Keep a queue of `{ stripType, startDistance }`. When theme says “use strip type B”, push `{ stripType: B, startDistance: gameState.distance }`. Do not change strip type for content already on screen.  
   - **Per-tile lookup:** For each drawn tile, compute the **game distance at the left edge of that tile** (from parallax: e.g. back tile left = `floor((distance * 0.2) / CITY_WIDTH) * CITY_WIDTH / 0.2`). Look up the strip type from the queue for that distance (latest entry with `startDistance <= tileLeftDistance`).  
   - **Result:** Existing tiles keep their strip until they scroll off; only new tiles that enter from the right use the new strip. Same approach applies to **all levels** (city, trees, mountains) whenever strip type or variant changes over time.

4. **Scroll**  
   Same as now:  
   `backOffset = -(gameState.distance * 0.2) % CITY_WIDTH`  
   `frontOffset = -(gameState.distance * 0.5) % CITY_WIDTH`  
   Draw back strip at `backOffset` and `backOffset + CITY_WIDTH`, front at `frontOffset` and `frontOffset + CITY_WIDTH`.

5. **Draw**  
   For each layer: 2× `<Image image={chosenStrip} … />` (strip chosen **per tile** from the queue, not globally).  
   Total: 4 Image nodes per frame.

## Asset generation (for Option A or B)

- **Size:** CITY_WIDTH = 1200, SCREEN_HEIGHT = 350 (from constants).
- **Generator:** Node script (e.g. `scripts/generate-city-strips.js`) that:
  1. Uses a JS canvas (e.g. `canvas` npm package) or headless Skia if available.
  2. For each category (back_no, back_some, back_all, front_no, front_some, front_all):
     - Calls logic equivalent to `createCityline(…)` with a fixed seed (Option B: one seed per category; Option A: 10 seeds per category).
     - Draws path (and windows for some/all) into a 1200×350 buffer.
     - Writes PNG to `assets/city/`.
- **Seeds:** Use a simple RNG seed (e.g. 0–9 for the 10 variants) so builds are reproducible.

If we don’t want to depend on Node canvas, we could instead add a one-off “export” mode in the app (e.g. web) that renders the 60 strips and downloads them, then we commit the PNGs; that’s more manual but avoids a new build dependency.

---

## Same method for future stages (trees, mountains, etc.)

Stages already use `backgroundType: 'city' | 'beach' | 'mountains' | 'city_victory'`. The same pattern applies to all of them:

| Stage / type   | Pre-generated strips idea |
|----------------|----------------------------|
| **City**       | Back + front building strips; no/some/all lights (and variants). |
| **Beach**      | Back + front strips: trees, palms, rocks, etc.; optionally time-of-day or wind variants. |
| **Mountains**  | Back + front strips: mountain silhouettes, layers; optional snow/evening variants. |
| **City victory** | Can reuse city strips or a short “finish line” strip set. |

**Consistent approach:**

1. **Design** – Decide what the layer looks like (layout, colours, variants).
2. **Generate** – Script or export mode produces strip PNGs (e.g. `assets/city/`, `assets/beach/`, `assets/mountains/`) at the standard size (e.g. 2× screen width × screen height).
3. **Runtime** – One component per background type (or a shared “strip background” component that takes asset keys and parallax speeds). Load images once; each frame pick strip(s) from theme/distance and draw 2–4 `Image` nodes per layer with scroll offset.
4. **Strip queuing** – When strip type or variant changes, **queue by distance** so the new strip only scrolls on from the right; never swap the image for tiles already on screen (see “Strip queuing” in Runtime logic above). Use the same queue + per-tile lookup for trees, mountains, and any time-of-day or variant changes.
5. **Theme** – Map stage timeline (distance, time-of-day, etc.) to which strip variant to show, same idea as city’s nightProgress → no/some/all.

That way every stage stays cheap at runtime (no per-frame Path/Rect for scenery), and we keep one pipeline: pre-generated strip assets + simple scroll + variant selection.

- Your 60-strip plan (10 no/some/all for back and front) **will work** and directly addresses the performance issue by removing per-window drawing.
- Start with **6 strips** (Option B) to get the pipeline and “no/some/all from theme” working, then add **60 strips** (Option A) and distance-based variant selection for variety.
- Pre-generated PNGs are the most reliable and portable (web + mobile, no useTexture); a small generator script keeps the existing city layout and window logic as the source of truth.
