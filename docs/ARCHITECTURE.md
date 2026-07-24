# Architectural decisions

Why Stickman Runner is shaped the way it is — the choices we made, what they enable, and what we accept as trade-offs.

## 1. Custom game loop, not a full engine

**Decision:** Build a small update loop (`useGameLoop` + `requestAnimationFrame`) and explicit systems (physics, collisions, spawn) instead of Unity, Godot, or Phaser-in-RN.

**Why**

- The project is educational; the loop should be readable line by line.  
- We only need a 2D side-scroller subset: gravity, jump, moving obstacles, AABB hits.  
- Avoids engine lock-in and opaque lifecycle.

**Trade-off:** We own frame timing, delta time, and edge cases ourselves. That is intentional.

## 2. Separate game logic from rendering

**Decision:** Mutable game state lives in a **ref** updated by systems each tick. React re-renders are triggered lightly (e.g. a tick counter) so Skia and UI read the latest state. Positions and velocities do not “live in JSX.”

**Why**

- Matches [project.md](../project.md) principles: rendering is a view of state.  
- Avoids fighting React’s render cycle for 60fps simulation.  
- Keeps systems testable in isolation in principle (pure-ish functions over state).

**Trade-off:** Components must not assume React state is the source of truth for the runner; the ref is.

## 3. Expo + React Native as the app shell

**Decision:** Expo (expo-router entry), TypeScript, React Native UI for screens/overlays; ship early via **Expo Go**, later via **EAS** for installable binaries.

**Why**

- Mobile-first without early Xcode/Android Studio ceremony.  
- Same project can open on phone and (with caveats) web.  
- Fits a non-full-time-coder workflow: `npm start`, scan, play.

**Trade-off:** Native modules and Skia versioning need care; web is a second-class citizen (see §6).

## 4. Skia for the game view

**Decision:** Draw the playfield with `@shopify/react-native-skia` (stickman, grid, backgrounds, particles). React Native views handle chrome (bars, modals, tap targets).

**Why**

- High-performance 2D drawing on device.  
- One drawing API for complex neon/city visuals.  
- Landscape canvas composition stays in `GameCanvas` and background components.

**Trade-off:** Web uses CanvasKit (WASM). That path is heavier and more fragile than native Skia; patches/preload exist, but phone remains authoritative.

## 5. Time-based stages, not frame- or distance-primary progress

**Decision:** Each stage lasts **180 seconds of real time**. `stageProgress` and derived `distance` come from elapsed wall time so the run ends with the soundtrack. Difficulty segments and visual timelines key off that progress (and distance derived from it).

**Why**

- Music and “night → dawn” stay in sync when FPS drops (especially on web).  
- Clear design rule for every stage: one 3-minute track, one arc.  
- Documented in [STAGE_DESIGN.md](./STAGE_DESIGN.md).

**Trade-off:** “Course length” is a visual/logical scale mapped onto three minutes, not a pure physics distance meter. Obstacle **scroll speed** is largely global (`BASE_SPEED`); stage `baseSpeed` mainly influences spawn spacing — see [STAGE1_REVIEW.md](./STAGE1_REVIEW.md).

## 6. Phone primary; web as preview

**Decision:** Optimise for Expo Go / native. Keep web export and deploy docs for sharing, but do not treat CanvasKit stability as a hard requirement for “done.”

**Why**

- Primary players and testers are on a phone.  
- Skia-on-web + Expo code splitting caused races and aborts under load; patches fix timing, not the architectural tension.  
- Documented in [WEB_PATCHES_AND_ARCHITECTURE.md](./WEB_PATCHES_AND_ARCHITECTURE.md).

**Future options (not chosen yet):** dedicated Canvas2D/WebGL draw path for web; or permanently label web “preview only.”

## 7. Stage config as data

**Decision:** Stages are data in `stages.ts` (theme, difficulty, segments, timeline, music ids, background type). Runtime switches backgrounds and spawns from that config.

**Why**

- Adding Stage 2–4 should mean new config + art/music + background component, not a fork of the loop.  
- Timeline/theme functions keep sky/lights declarative.

**Trade-off:** Incomplete stages can look “wired” in config before visuals exist; checklist discipline matters ([PROJECT_PLAN.md](./PROJECT_PLAN.md)).

## 8. Parallax city as strip queues (Stage 1)

**Decision:** Front/back city layers use pre-made PNG strips in queues. Theme (lights amount) maps from night progress; variants come from distance. Queues update off-screen so strip type does not flip mid-view. Web loads/decodes images into cached SkImages; play waits on a “Get ready” gate until front assets are ready.

**Why**

- Richer look than drawing every window every frame.  
- Controllable art pipeline (`assets/city`).  
- Avoids visible pop when theme changes.

**Trade-off:** Asset count and naming conventions matter; web path needs parallel load/decode care.

## 9. Frame-rate–independent motion where it matters

**Decision:** Scale player vertical physics by delta time; drive stickman run cycle from elapsed stage time (or equivalent), not raw frame ticks.

**Why**

- On slow devices, tick-based jumps felt longer / animation slower.  
- Keeps feel closer across phone and web FPS variance.

**Trade-off:** Every new motion system should be checked for the same delta-time habit.

## 10. Landscape, auto-run, tap to jump

**Decision:** Landscape orientation; player does not move left/right; world/obstacles scroll; tap = jump, double tap in air = double jump with energy cost.

**Why**

- Matches classic runner feel and the child’s chosen format.  
- Simplifies collision and camera (fixed player X).  
- Energy/health give depth without adding movement axes.

## Deliberate non-goals (for now)

- Multiplayer, backend, monetisation  
- Full App Store polish as day-one requirement  
- Feature parity of web vs native rendering quality  
- Premature ECS or heavy abstraction layers  

## Where to change what

| Concern | Primary place |
|---------|----------------|
| Gravity, jump, ground | `src/game/systems/physics.ts`, `constants.ts` |
| Hits / hearts | `src/game/systems/collisions.ts` |
| Obstacle cadence | `src/game/systems/spawn.ts`, stage `difficultySegments` |
| Stage themes / music ids | `src/game/stages.ts` |
| Loop / stage timing | `src/game/loop/useGameLoop.ts` |
| Draw composition | `src/components/GameCanvas.tsx` |
| City strips | `src/components/backgrounds/CityStripBackground.tsx` |
| Overlays / input | `src/screens/GameScreen.tsx` |

## Related docs

- [PROJECT_BRIEF.md](./PROJECT_BRIEF.md) — product narrative and next steps  
- [STAGE_DESIGN.md](./STAGE_DESIGN.md) — stage timing rules  
- [STAGE1_REVIEW.md](./STAGE1_REVIEW.md) — Stage 1 implementation notes  
- [WEB_PATCHES_AND_ARCHITECTURE.md](./WEB_PATCHES_AND_ARCHITECTURE.md) — web/Skia patches in depth  
- [project.md](../project.md) — original principles  
