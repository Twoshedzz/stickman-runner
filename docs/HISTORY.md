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

**Status:** Implemented. See `viewWidth`/`WEB_VIEWPORT` in [useViewport.ts](../src/screens/game/useViewport.ts) (in `GameScreen.tsx` until the architecture pass) and decision §11 in `ARCHITECTURE.md`. Phone browsers later got the phone's fill-the-screen layout too; only desktop browsers keep the fixed preview.

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

**Status:** Implemented as Stage 1's front/back city strip queues (`CityStripBackground.tsx`). Later the brightness variants gave way to unlit building strips with lit-window overlays on top, in [NeonCityScenery.tsx](../src/components/backgrounds/NeonCityScenery.tsx), and the old strip files and pictures were deleted in the architecture pass (below). See decision §8 in `ARCHITECTURE.md`. Stages 2–4 use the same strip pattern for their scenery.

---

## Web black screen debugging (resolved)

**Problem:** A deployed build (Vercel / web) showed a black screen instead of the game.

**Diagnosis (from git history):** An earlier commit had deliberately disabled the texture-based city renderer (`NeonCitySprites`) on web to avoid a black screen, using the simpler per-frame `NeonCityLayer` instead. A later performance commit re-enabled `NeonCitySprites` on web (to cut draw calls) — and reintroduced the black screen, since `useTexture()` was unreliable on web's CanvasKit/WASM setup.

**Fix applied:** Use `NeonCityLayer` (not `NeonCitySprites`) on web; keep the texture path off the web code path entirely. Mobile was unaffected either way. This was later superseded architecturally by the pre-generated city strips (above), which replaced both per-frame drawing and textures with simple image draws.

**If you want textures on web again:** first check whether `useTexture` returns a valid texture on web (not `null` or empty). If you try it, add a fallback that draws `NeonCityLayer` whenever the texture isn't ready, so a texture failure can never leave the screen black.

**Related, ongoing (not a one-time bug):** Web can still throw a mid-game `Aborted()` error from CanvasKit under heavy load (collisions, particles, lazy-loaded chunks touching Skia at a bad moment). Two patches mitigate this — see [WEB_PATCHES_AND_ARCHITECTURE.md](./WEB_PATCHES_AND_ARCHITECTURE.md) for what they do and why the underlying tension (Skia-on-web + code splitting) isn't something a patch can fully remove. The project's stance is that **phone (Expo Go) is the source of truth; web is a best-effort preview** — see decision §6 in `ARCHITECTURE.md`.

---

## Web `Aborted()` crashes: found to be a memory leak (October 2026)

**Problem:** Web play crashed with `Aborted()`, usually several minutes in (often late in stage 2). This had been put down to Skia-on-web being inherently fragile.

**Diagnosis:** Sampling CanvasKit's memory (`CanvasKit.HEAPU8.byteLength`) during play showed it climbing about 5MB a second, reaching the 2GB ceiling in roughly 7 minutes. Counting objects created and freed per type showed Skia's web renderer never freeing the paints, paths, gradients, recorders and pictures it makes every frame, and leaking a paint's internals whenever one was copied.

**Fix:** A patch to `@shopify/react-native-skia` (web-only files) that frees each frame's objects once its picture is recorded, frees the previous picture, and frees replaced paint internals. A full four-stage run now levels off at about 460MB with no errors. Details in [WEB_PATCHES_AND_ARCHITECTURE.md](./WEB_PATCHES_AND_ARCHITECTURE.md).

**Looked at later:** the scene is recorded twice per screen refresh on web. The architecture pass (below) found this happens inside the Skia library, not the game's code, and it isn't needed for stability, so it's left alone.

---

## Stage 1: bug fixed and performance pass

While reviewing Stage 1 as the stable base for stages 2–4 (see `STAGE1_REVIEW.md` for the current-state writeup), two things came out of that pass:

**Bug fixed — stage transition:** `stageStartTime` wasn't reset when `onContinue` moved the game to the next stage, so `elapsedSecInStage` kept climbing from stage 1's start time. A new stage could hit "exhausted" almost immediately. Fixed by setting `state.stageStartTime = Date.now() / 1000` when the next stage is applied.

**Performance changes made:**

- Removed a native-only ~30fps throttle so the loop re-renders every frame on all platforms, matching web's smoothness.
- `currentTheme` in `GameCanvas` now uses `useMemo` keyed on distance/stage, avoiding a full timeline walk on every render when only the frame tick changed.
- Particles were already capped (`MAX_PARTICLES = 40`); UI metrics were already throttled to only sync on actual value changes. Both confirmed fine as-is.

---

## Architecture pass (25 October 2026)

**Why:** Pete asked for the code to be made **optimised and extensible** before more features went in: new obstacles, stages and mechanics should each be a change in one or two places. Every step was a tidy-up only, meant to change nothing you can see or feel, done in small steps (each in its own Claude session and worktree) and played before the next.

**What the code looked like before:**

- Each obstacle's behaviour was spread over about 11 files, each checking the obstacle's name for itself. A new obstacle meant touching all of them.
- One frame of the game was written twice: in the game loop, and again by hand in the pretend player. Anything added to one would be missing from the other, and the difficulty report would quietly be wrong.
- The scenery and sky were wired into the main canvas: a chain of “if this stage, draw that”, stage 1 special cases inside the sky code, and finding the current stage copied out about 15 times.
- `GameScreen.tsx` was 791 lines doing six jobs.
- The loop saved the high score to the phone on every frame the score went up, and the whole screen redrew 60 times a second even behind the menus.
- Leftovers: three scenery files and 34 city pictures nothing used, eight packages nothing imported.

**The steps:**

- **A1 — dead wood.** The unused scenery files, pictures, packages and theme helpers deleted; lint down to 0 errors.
- **A2 — obstacles describe themselves.** The obstacle table (`src/game/obstacleCatalogue.ts`) now says what each obstacle does: how it's cleared, whether it moves, whether you fall in, whether pickup arcs go over it, how hard a hit is. The game logic reads the table instead of checking names.
- **A3 — one shared step.** `stepWorld` in `src/game/step.ts` is the frame's one order, used by the game and the pretend player. Landings are reported in `state.events`, ready for the beat bonus.
- **A4 — stages plug in their scenery and sky.** The sky maths moved to `src/game/sky.ts` (with a test that locks in how every stage's sky looked), stage 1's special cases became a `sky` block in `stages.ts`, scenery is picked from a table (`backgrounds/scenery.ts`), obstacles are drawn by `ObstacleLayer.tsx` from the obstacle table, and `stageById` finds a stage. `GameCanvas.tsx` went from 503 to 258 lines.
- **A5 — the game screen split.** `GameScreen.tsx` went from 791 to 232 lines, its jobs in named pieces in `src/screens/game/`. Which screens show is one tested rule, `whichScreen.ts`, checked against the old conditions in every combination.
- **A6 — a lighter loop.** The high score and best runs are saved when a run ends, pauses or the app goes to the background (`useScoreTable.ts`), not every frame. The screen redraws every frame only while a stage is played or the 3-2-1 counts (`redraw.ts`). The phone and web music share their common rules (`musicShared.ts`).
- **A7 — docs and recipes.** ARCHITECTURE.md gained a map of the code, three recipes (add an obstacle, a stage, a mechanic) and the rules that keep changes safe; the other docs were brought up to date.

**How “nothing changed” was checked:**

- The type check, lint and every test, after each step.
- **The game plays the same:** the pretend player uses fixed dice, so `npm run difficulty` gives exactly the same DIFFICULTY.md if, and only if, the game behaves the same. Every step was checked this way, comparing a run before with a run after.
- **It looks the same:** pictures of every stage before and after, taken with a stand-in clock so both are of exactly the same moment. In A4, 8 of 10 were identical and the other 2 differed only by a few specks of dust at the runner's feet. In A5, all 35 screens (title, How to Play, PAUSED, Stage Clear, Game Over, the world board, …) matched, compared by their page layout and the game's numbers.
- **It sounds the same:** a log of every time the music was asked to play, and whether that was inside the tap, was identical before and after A6.
- Then played in the browser at phone size, and by Pete and his son on the phone.

**What was found on the way:**

- **The React Compiler.** The app has the React Compiler switched on: it remembers parts of the screen and reuses them while their inputs look unchanged. The game state is one object changed in place every frame, so to the compiler it never looks changed. The old `GameScreen.tsx` had never been compiled (a lint comment made the compiler skip it), so this never showed. Once A5 split it up, the new pieces were compiled and went stale: the pause button stayed on the PAUSED and Game Over screens. The fix was a `'use no memo'` line at the top of each of those files, which tells the compiler to leave the file alone. It's now one of the rules in ARCHITECTURE.md.
- **The worktree skip rules.** So that tests and the bundler wouldn't trip over other sessions' copies of the project in `.claude/worktrees/`, they were told to skip any path containing `.claude/`. But a session's own copy lives there too, so inside a copy *everything* was skipped: no tests ran, and the web preview couldn't find the game. Fixed by skipping only the `.claude/` folder inside the project being run.
- **Expo Go needs SDK 58.** Expo Go on the iPhone updated itself and no longer opens a project on Expo SDK 54, and an older Expo Go can't be installed. Phone tests moved to Safari, and the upgrade became step U1, straight after this pass.
- **The menus: 60 redraws a second to 0.** Measured in A6: before, the screen redrew 60 times a second on every screen; after, 60 a second only while playing or counting down, and none on the title, How to Play, PAUSED, Stage Clear or Game Over.
- **The difficulty report's run count.** The plain `npm run difficulty` plays each stage 12 times per skill level, but the committed DIFFICULTY.md had been made with 20, so comparing against it always showed a difference. “Nothing changed” checks compare two fresh runs instead.
- **The web drawing the scene twice per refresh** turned out to be inside the Skia library, not the game's code. Nothing to do.
