# Stage 1 review and stable platform checklist

How stage 1 works end-to-end, and how to keep mechanics easy to tweak while staying efficient. Stages 2–4 are built on the same pattern. For the bug fixes and performance work that got it here, see [HISTORY.md](./HISTORY.md). For the whole code map and recipes, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 1. Stage 1 flow (end-to-end)

1. **Stages** (`src/game/stages.ts`)  
   - `stage_1_city`: `durationSec: 180` (where its music ends), `speed: [260, 300]` (pixels a second, rising through the stage), `pacing` (how hard it gets and when each obstacle first turns up), `beat` (the music's tempo), `courseLength: COURSE_LENGTH` (43200: the sky's clock), `timeline` (visual events by distance) and a `sky` block.

2. **Loop** (`src/game/loop/useGameLoop.ts`)  
   - `requestAnimationFrame` runs every frame.  
   - **Time-based progress:** `stageStartTime` set on the first frame (or when a stage starts: Continue, or the debug buttons).  
   - `elapsedSecInStage = now - stageStartTime`, `stageProgress = elapsedSec / durationSec`, `distance = stageProgress * courseLength`, `speed` from `speedAt(stage, progress)`.  
   - The stage clock is nudged gently towards where the music actually is (`musicSync.ts`), and stands still while paused (`pause.ts`).  
   - Then it calls **`stepWorld`** (`src/game/step.ts`), the one frame order: scroll → physics → spawn → sparks → collisions → pickups.

3. **Physics** (`src/game/systems/physics.ts`)  
   - `applyPhysics(state, deltaTimeSec)`: gravity, jump and duck, ground clamp, energy regen on the ground, obstacle movement, and a `land` event in `state.events` when the feet touch down.  
   - Obstacles move at **`state.speed`** (the stage's speed now), scaled by `deltaTimeSec * 60` for frame-rate independence.  
   - Score when an obstacle's right edge passes `PLAYER_X`. Off-screen obstacles are filtered out. Falling into a hole is `systems/holes.ts`.

4. **Spawn** (`src/game/systems/spawn.ts`)  
   - Picks whole **patterns** from `src/game/patterns.ts` (“a bar, then a block”), within the stage's current `pacing.budget`, with a rest after each.  
   - Gaps are in **seconds**, so they stay fair at any speed, and obstacles reach the runner on the music's half-beat grid.

5. **Collisions** (`src/game/systems/collisions.ts`)  
   - Boxes with a small hit margin (5px). Hearts heal; other obstacles do damage (none in debug mode).  
   - Sizes, damage and what each obstacle does come from the obstacle table, `src/game/obstacleCatalogue.ts`; everything stands on `RUNNER_GROUND_Y` except the bar, which hangs in the duck band.

6. **Sky / visuals** (`src/game/sky.ts`, drawn by `src/components/GameCanvas.tsx`)  
   - `getTheme(distance, stage)` runs over `stage.timeline` and returns sky, sun/moon positions and opacities, `nightProgress`, `lightsDwindle`.  
   - A stage's own touches are settings in its `sky` block in `stages.ts`. Stage 1 has three: `afterFinish` (a fixed “day” look once the stage is over, so the Continue screen doesn’t flip back to night), `lightsFloor` (city lights flicker fix: from 3000 to the finish, `nightProgress` is at least 0.02) and `moonPath` (the moon’s path over 5000–32000).  
   - The stage's scenery is picked by `assets.backgroundType` from `src/components/backgrounds/scenery.ts`; obstacles are drawn by `src/components/ObstacleLayer.tsx`.

7. **Grid** (`src/components/GridFloor.tsx`)  
   - Scrolls with `state.scroll`, the pixels the world has actually moved, so it keeps pace with the obstacles at any speed; `GRID_SPEED_NUDGE = 1.18` so the grid doesn’t look as if it lags.  
   - Also draws the landing glow and the beat pulse.

8. **Continue to next stage**  
   - `onContinue` calls `startStage`: the next `stageId`, `distance` and `scroll` back to 0, `stageStatus = 'playing'`, **`stageStartTime = Date.now()/1000`**, obstacles cleared, spawner reset. Straight in, with no pause.  
   - **Critical:** Resetting `stageStartTime` on transition is what makes stage 2+ progress start from 0; without it, the next stage would instantly complete.

---

## 2. Design choices (no bugs, good to know)

- **Speed per stage:** each stage's world speed rises between two numbers (`speed` in `stages.ts`), and each stage starts a little faster than the last. Obstacles, pickups, scenery and grid all move by `state.speed`, so they stay together. `BASE_SPEED` in `constants.ts` is now only the old speed that `COURSE_LENGTH`, the starting `speed` before the first frame, and the runner's leg pace are measured against.

- **Distance is derived from time:** so `courseLength` is the sky's clock, not a distance: `distance` runs from 0 to `courseLength` over the stage whatever the speed. How far the world has actually moved is `state.scroll`.

- **gameState is a ref:** The loop mutates `stateRef.current`. React redraws are asked for with `setRenderTrigger`: every frame while a stage is played or the 3-2-1 counts, and otherwise only when something the screen shows changes (`src/game/loop/redraw.ts`). Components receive the same object reference, so the React Compiler must not cache what they read from it (see “Rules that keep it safe” in ARCHITECTURE.md).

---

## 3. Further performance options (without changing “one place to tweak”)

- **City lights:** done. The city no longer draws a `Rect` per window: `NeonCityScenery.tsx` stacks pre-generated light overlays (`assets/city/lights/`) on the building strips, still driven by `currentTheme.nightProgress` / `lightsDwindle`.

- **Menus:** done. The screen no longer redraws 60 times a second behind the menus (0 now).

- **Grid:** `GridFloor` already memoizes `scrollOffset` and line content; no change needed unless you add more dynamic grid features.

For the bugs and performance work already done to reach this stable base, see [HISTORY.md](./HISTORY.md).

---

## 4. Stable platform checklist for every stage

When adding or tuning a stage, keep this contract so behaviour stays consistent and predictable:

| Contract | Where | What to do |
|----------|--------|------------|
| **Time-based progress** | Loop | Use `stageStartTime` and the stage's `durationSec`; never drive “stage complete” from distance or frames only. Reset `stageStartTime` when switching stage (`startStage`). |
| **Distance** | Loop | `distance = stageProgress * currentStage.courseLength`. The sky's timeline is keyed to this. |
| **One frame order** | `step.ts` | Anything that happens each frame goes in `stepWorld`, so the pretend player plays it too. |
| **Obstacle speed** | Physics | Uses `state.speed` from the stage's `speed`. Grid, scenery and obstacles stay in sync. |
| **Spawn difficulty** | Spawn | Patterns from `patterns.ts`, gated by the stage's `pacing` (budget, rests, unlocks, favour, hearts). |
| **Sky** | sky.ts | Use `getTheme(gameState.distance, currentStage)`. Stage defines `timeline`, and any touches of its own in its `sky` block (no stage id checks in `sky.ts`). |
| **Scenery** | scenery.ts | One entry per `backgroundType`; scenery is handed plain numbers, never the state object. |
| **Ground / collision** | Constants + obstacle table | `RUNNER_GROUND_Y`, `PLAYER_X`; obstacle sizes from `obstacleCatalogue.ts`, the same on every stage. |

**Single place to tweak mechanics:**  
- Jump, gravity, duck, energy: `src/game/constants.ts`.  
- Per-stage length, speed and difficulty: `src/game/stages.ts` (`durationSec`, `speed`, `pacing`).  
- Visual quirks for one stage: the stage's `sky` block in `stages.ts` (worked out in `src/game/sky.ts`).

---

## 5. File reference

| Area | Files |
|------|--------|
| Stage config & difficulty | `src/game/stages.ts`, `src/game/patterns.ts` |
| Loop, time, distance, Continue | `src/game/loop/useGameLoop.ts` |
| One frame's order | `src/game/step.ts` |
| Movement, obstacles, scoring | `src/game/systems/physics.ts` |
| Spawn rules | `src/game/systems/spawn.ts` |
| Collisions | `src/game/systems/collisions.ts` |
| Obstacle table | `src/game/obstacleCatalogue.ts` |
| Theme & sky/moon/lights | `src/game/sky.ts` (`getTheme`, `moonAt`); stage settings in `src/game/stages.ts` (`timeline`, `sky`) |
| Each stage's scenery | `src/components/backgrounds/scenery.ts` (by `backgroundType`) |
| Obstacle drawing | `src/components/ObstacleLayer.tsx` (by the obstacle table's `shape` and `tint`) |
| Grid scroll | `src/components/GridFloor.tsx` |
| City background | `src/components/backgrounds/NeonCityScenery.tsx` |
| Design rules | `docs/STAGE_DESIGN.md` |

This gives you a stable, reviewed base for stage 1 and a clear pattern for every stage, with one place to tweak mechanics and targeted performance improvements that don’t complicate that.
