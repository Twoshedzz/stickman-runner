# Project history

A single record of how Stickman Runner got to its current state: debugging sessions, plans that were carried out, and design detours that didn't become the final approach. If you just want to know **how the game works today**, read [ARCHITECTURE.md](./ARCHITECTURE.md) and [PROJECT_BRIEF.md](./PROJECT_BRIEF.md) instead — this file is the "why did we end up here" archive.

Entries are grouped by topic, each with what the problem was, what we tried, and where it landed (all landed decisions are already reflected in `ARCHITECTURE.md`).

---

## Mobile viewport: fill the screen without stretching

**Problem:** Game logic works in a fixed 600×350 logical space. On mobile that needed to fill different phone aspect ratios without distorting anything; on web it needed to stay a small, predictable preview instead of stretching to fill the browser.

**Approach taken:**

- Game logic (spawn, physics, collisions) always stays in the 600×350 logical space — never touches raw device pixels.
- **Mobile:** the drawn canvas can widen beyond 600 (`viewWidth = max(600, 350 × deviceAspect)`) so wide phones see more world (obstacles have a longer run-in), while a single uniform scale factor fills the viewport with no stretch.
- **Web:** fixed 600×350 viewport, centered in the browser — a preview window, not a fill.

**Status:** Implemented. See `viewWidth`/`WEB_VIEWPORT` in [GameScreen.tsx](../src/screens/GameScreen.tsx) and decision §11 in `ARCHITECTURE.md`.

---

## Layout tweaks: centered action zone, grid/city draw order, runner alignment

**Problem:** Once the canvas could be wider than 600px on mobile, a few things needed adjusting without touching the underlying grid math or background parallax queuing:

1. The grid's vanishing point was fixed at logical x=300, so on wide screens new grid lines visibly "appeared" at the right edge instead of a full pre-existing grid.
2. Buildings/parallax needed to sit visually above the grid, with building bottoms meeting the grid's top line.
3. The foreground building layer read as oversized.
4. The runner's feet weren't quite aligned with the bottom of obstacles.

**Approach taken (in order):**

1. Runner nudged up ~5px visually only (no change to hitbox/physics).
2. Grid vanishing point (`vanishX`) changed from a fixed logical point to **screen-center** (`viewWidth / 2`), so perspective lines don't pop in at the edge.
3. Introduced `gameOffsetX = (viewWidth - SCREEN_WIDTH) / 2` so the 600px action band (player, obstacles, arch) draws centered in a wider view, while spawn/collision math stays untouched in logical space.
4. Draw order changed so the grid (with its own background) renders before city/parallax layers.
5. City strips clipped to end at the grid's top line; front (foreground) building layer scaled down while preserving aspect ratio.

**Status:** Implemented — `vanishX`, `gameOffsetX` are live in [GridFloor.tsx](../src/components/GridFloor.tsx) and [GameCanvas.tsx](../src/components/GameCanvas.tsx). See decision §11 in `ARCHITECTURE.md`. Any new draw code for obstacles/particles must remember to add `gameOffsetX` or it will drift off-center on wide phones.

---

## City lights: from per-frame drawing to pre-generated strips

**Problem:** The original city background (`NeonCityLayer`) drew many small rectangles per building window, every frame — expensive on both web (contributed to CanvasKit crashes under load) and mobile (frame drops slowed the whole game, including jump feel and obstacle timing). A texture-based alternative (`NeonCitySprites`, using `useTexture`) reduced draw calls but caused a black screen on web (see below) and was still relatively heavy.

**Approach taken:** Move to **pre-generated PNG strips** — a small number of full-width "row of buildings" images (no-lights / some-lights / all-lights variants, for front and back layers) that are chosen and scrolled at runtime instead of drawn primitive-by-primitive. Considered three options:

- **Option A** — 60 strips (10 layout variants × 3 light states × front/back) for maximum variety.
- **Option B** — 6 strips (one variant per light state × front/back) to validate the pipeline fast. *(Chosen as the starting point.)*
- **Option C** — bake textures at runtime once per stage load — rejected, since it still relies on the same `useTexture`/surface path that caused the web black screen.

A "strip queue" keyed by distance ensures a strip type never changes for tiles already on screen — only new tiles scrolling in from the right pick up the new type, so there's no visible "flip."

**Status:** Implemented as Stage 1's front/back city strip queues. See decision §8 in `ARCHITECTURE.md` and [CityStripBackground.tsx](../src/components/backgrounds/CityStripBackground.tsx). The same strip pattern is intended for beach/mountain backgrounds in later stages (see `PROJECT_PLAN.md`).

---

## Web black screen debugging (resolved)

**Problem:** A deployed build (Vercel / web) showed a black screen instead of the game.

**Diagnosis (from git history):** An earlier commit had deliberately disabled the texture-based city renderer (`NeonCitySprites`) on web to avoid a black screen, using the simpler per-frame `NeonCityLayer` instead. A later performance commit re-enabled `NeonCitySprites` on web (to cut draw calls) — and reintroduced the black screen, since `useTexture()` was unreliable on web's CanvasKit/WASM setup.

**Fix applied:** Use `NeonCityLayer` (not `NeonCitySprites`) on web; keep the texture path off the web code path entirely. Mobile was unaffected either way. This was later superseded architecturally by the pre-generated city strips (above), which replaced both per-frame drawing and textures with simple image draws.

**Related, ongoing (not a one-time bug):** Web can still throw a mid-game `Aborted()` error from CanvasKit under heavy load (collisions, particles, lazy-loaded chunks touching Skia at a bad moment). Two patches mitigate this — see [WEB_PATCHES_AND_ARCHITECTURE.md](./WEB_PATCHES_AND_ARCHITECTURE.md) for what they do and why the underlying tension (Skia-on-web + code splitting) isn't something a patch can fully remove. The project's stance is that **phone (Expo Go) is the source of truth; web is a best-effort preview** — see decision §6 in `ARCHITECTURE.md`.

---

## Stage 1: bug fixed and performance pass

While reviewing Stage 1 as the stable base for stages 2–4 (see `STAGE1_REVIEW.md` for the current-state writeup), two things came out of that pass:

**Bug fixed — stage transition:** `stageStartTime` wasn't reset when `onContinue` moved the game to the next stage, so `elapsedSecInStage` kept climbing from stage 1's start time. A new stage could hit "exhausted" almost immediately. Fixed by setting `state.stageStartTime = Date.now() / 1000` when the next stage is applied.

**Performance changes made:**

- Removed a native-only ~30fps throttle so the loop re-renders every frame on all platforms, matching web's smoothness.
- `currentTheme` in `GameCanvas` now uses `useMemo` keyed on distance/stage, avoiding a full timeline walk on every render when only the frame tick changed.
- Particles were already capped (`MAX_PARTICLES = 40`); UI metrics were already throttled to only sync on actual value changes. Both confirmed fine as-is.
