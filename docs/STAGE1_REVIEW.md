# Stage 1 review and stable platform checklist

Full code review of how stage 1 works, what was fixed, and how to keep mechanics easy to tweak while staying efficient. Use this as the stable base for stages 2–4.

---

## 1. Stage 1 flow (end-to-end)

1. **Stages** (`src/game/stages.ts`)  
   - `stage_1_city`: `courseLength: 43200`, `STAGE_DURATION_SECONDS: 180`, `difficulty` + `difficultySegments` (30s steps), `timeline` (visual events by distance).

2. **Loop** (`src/game/loop/useGameLoop.ts`)  
   - `requestAnimationFrame` runs every frame.  
   - **Time-based progress:** `stageStartTime` set on first frame (or on Continue when switching stage).  
   - `elapsedSecInStage = now - stageStartTime`, `stageProgress = elapsedSec / 180`, `distance = stageProgress * courseLength`.  
   - So distance and scroll are driven by real time (3 min per stage), not FPS.

3. **Physics** (`src/game/systems/physics.ts`)  
   - `applyPhysics(state, deltaTimeSec)`: gravity, ground clamp at `RUNNER_GROUND_Y - PLAYER_SIZE`, energy regen on ground, obstacle movement.  
   - Obstacles move at **`BASE_SPEED`** from `constants.ts` (scale by `deltaTimeSec * 60` for frame-rate independence).  
   - Score when obstacle right edge passes `PLAYER_X`. Off-screen obstacles filtered out.

4. **Spawn** (`src/game/systems/spawn.ts`)  
   - `getDifficultyAtDistance(stage, state.distance)` maps distance → 30s segments → effective `spawnRate`, `allowedObstacles`, `allowDoubleSpawns`.  
   - Spawn spacing uses **`difficulty.baseSpeed`** (and spawnRate) for min/max distance between obstacles.  
   - **Note:** Actual obstacle speed in physics is `BASE_SPEED` (constants), not `stage.difficulty.baseSpeed`. So stage `baseSpeed` only affects spawn spacing.

5. **Collisions** (`src/game/systems/collisions.ts`)  
   - AABB with small hit margin (5px). Heart = heal or score bonus; others = damage (or no damage in debug).  
   - Obstacle sizes: `OBSTACLE_SIZE` (standard/boulder), `OBSTACLE_SIZE_SMALL`, `OBSTACLE_SIZE_PURPLE`; all aligned to `RUNNER_GROUND_Y`.

6. **Theme / visuals** (`src/components/GameCanvas.tsx`)  
   - `getTheme(distance, stage)` runs over `stage.timeline` and returns sky, sun/moon positions and opacities, `nightProgress`, `lightsDwindle`.  
   - Stage 1 special case: when `distance >= courseLength` return fixed “day” theme so Continue screen doesn’t flip back to night.  
   - City lights flicker fix: for `stage_1_city` and `distance in [3000, courseLength)`, `nightProgress = Math.max(nightProgress, 0.02)`.

7. **Grid** (`src/components/GridFloor.tsx`)  
   - Scroll derived from `distance` and `courseLength` so grid matches obstacle movement; `GRID_SPEED_NUDGE = 1.18` so grid doesn’t lag.  
   - Uses `BASE_SPEED` and `STAGE_DURATION_SECONDS` for pixels-per-distance.

8. **Continue to next stage**  
   - `onContinue`: set `stageStatus = 'victory'`, then after 1s set `stageId`, `distance = 0`, `stageStatus = 'playing'`, **`stageStartTime = Date.now()/1000`**, clear obstacles, `resetSpawner()`.  
   - **Critical:** Resetting `stageStartTime` on transition was added so stage 2+ progress starts from 0; without it, the next stage would instantly complete.

---

## 2. Bugs fixed in this review

- **Continue to next stage:** `stageStartTime` was not reset when moving to the next stage, so `elapsedSecInStage` kept increasing and the new stage could hit “exhausted” immediately. **Fixed:** set `state.stageStartTime = Date.now() / 1000` when applying the next stage in `onContinue`.

---

## 3. Design choices (no bugs, good to know)

- **Single source for scroll speed:** Obstacle movement and grid scroll use **`BASE_SPEED`** (and time) from `constants.ts`. Stage `difficulty.baseSpeed` is used **only for spawn spacing** (min/max distance between obstacles). So one place to tweak “how fast the world moves” is `BASE_SPEED`; stage `baseSpeed` only tunes “how often obstacles appear” relative to that.  
  - To make per-stage speeds later: pass effective speed (e.g. from stage) into `applyPhysics` and into `GridFloor`’s scroll formula.

- **Distance is derived from time:** So `courseLength` is a “visual scale”: same 3 minutes always, but `distance` runs from 0 to `courseLength` so timeline events and difficulty segments line up with 30s steps (e.g. 7200 per 30s for 43200).

- **gameState is a ref:** Loop mutates `stateRef.current`; React re-renders are forced by `setRenderTrigger(prev => prev + 1)` every frame. Components receive the same object reference; they re-render because `tick` (renderTrigger) changes. No redundant state copy.

---

## 4. Performance changes made

- **Smoother animation:** Removed the native-only throttle that limited updates to ~30fps. The loop now triggers a React re-render every frame (same as web) so animation doesn’t slow. If a specific device struggles, a configurable throttle can be re-added (e.g. via a constant).

- **Theme computation:** `currentTheme` in `GameCanvas` is now computed with `useMemo(() => getTheme(gameState.distance, currentStage), [gameState.distance, currentStage])` so we don’t re-run the full timeline walk every render when distance hasn’t changed meaningfully (e.g. when only `tick` changed). This keeps one place to tweak visuals (timeline + `getTheme`) while avoiding unnecessary work.

- **Particles:** Already capped at `MAX_PARTICLES = 40` and sliced in `updateParticles`; no change.

- **UI metrics:** Already throttled by only calling `setGameMetrics` when score/health/energy/maxHealth actually change; no change.

---

## 5. Further performance options (without changing “one place to tweak”)

- **City lights:** `NeonCityLayer` draws many small `Rect`s per window every frame (path + per-window visibility). `NeonCityBackground.tsx` also has a texture-based `NeonCitySprites` that uses pre-baked textures per lights step. Switching stage 1 to `NeonCitySprites` (or using it when available) would reduce per-frame draw calls while keeping the same `currentTheme.nightProgress` / `lightsDwindle` contract. Mechanics and tweaking stay in timeline + theme.

- **Grid:** `GridFloor` already memoizes `scrollOffset` and line content by `[isMoving, distance, courseLength, tick]`; no change needed unless you add more dynamic grid features.

---

## 6. Stable platform checklist for stages 2–4

When adding or tuning stages 2–4, keep this contract so behaviour stays consistent and predictable:

| Contract | Where | What to do |
|----------|--------|------------|
| **Time-based progress** | Loop | Use `stageStartTime` and `STAGE_DURATION_SECONDS`; never drive “stage complete” from distance or frames only. Reset `stageStartTime` when switching stage (e.g. in `onContinue`). |
| **Distance** | Loop | `distance = stageProgress * currentStage.courseLength`. All timeline and difficulty logic keyed to this. |
| **Obstacle speed** | Physics | Uses `BASE_SPEED` from constants. Grid and obstacles stay in sync. |
| **Spawn difficulty** | Spawn | Use `getDifficultyAtDistance(stage, state.distance)`; define `difficultySegments` in seconds for 30s ramping. |
| **Theme** | GameCanvas | Use `getTheme(gameState.distance, currentStage)`. Stage defines `timeline` (and optional special cases in `getTheme` for that stage id). |
| **Grid** | GridFloor | Pass `courseLength` from current stage; grid formula uses `BASE_SPEED` and `STAGE_DURATION_SECONDS`. |
| **Ground / collision** | Constants + collisions | `RUNNER_GROUND_Y`, `PLAYER_X`, obstacle sizes from constants; collisions use same ground Y for all obstacle types. |

**Single place to tweak mechanics:**  
- Global run speed and jump/gravity: `src/game/constants.ts`.  
- Per-stage length and difficulty: `src/game/stages.ts` (courseLength, difficulty, difficultySegments, timeline).  
- Visual quirks for one stage: `getTheme` in `GameCanvas.tsx` (e.g. stage id checks and `nightProgress` clamp).

---

## 7. File reference

| Area | Files |
|------|--------|
| Stage config & difficulty | `src/game/stages.ts` |
| Loop, time, distance, Continue | `src/game/loop/useGameLoop.ts` |
| Movement, obstacles, scoring | `src/game/systems/physics.ts` |
| Spawn rules | `src/game/systems/spawn.ts` |
| Collisions | `src/game/systems/collisions.ts` |
| Theme & sky/moon/lights | `src/components/GameCanvas.tsx` (`getTheme`, usage of `currentTheme`) |
| Grid scroll | `src/components/GridFloor.tsx` |
| City background | `src/components/backgrounds/NeonCityBackground.tsx` |
| Design rules | `docs/STAGE_DESIGN.md` |

This gives you a stable, reviewed base for stage 1 and a clear pattern for stages 2–4, with one place to tweak mechanics and targeted performance improvements that don’t complicate that.
