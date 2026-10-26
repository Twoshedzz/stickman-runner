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

**Decision:** Mutable game state lives in a **ref** (one object the loop changes in place) updated by systems each frame. React is told to redraw with a counter, and Skia and the menus read the latest state. Positions and velocities do not “live in JSX.” The screen redraws **every frame only while it moves**: a stage being played, or the 3-2-1 after a pause. On the title, menus, PAUSED, Stage Clear and Game Over it redraws only when something it shows changes (`src/game/loop/redraw.ts`), so the menus went from 60 redraws a second to none.

**Why**

- Matches [project.md](../project.md) principles: rendering is a view of state.  
- Avoids fighting React’s render cycle for 60fps simulation.  
- Keeps systems testable on their own: `stepWorld` (§“How the code fits together”) is plain functions over the state, run in tests without a screen.

**Trade-off:** Components must not assume React state is the source of truth for the runner; the ref is. Because the object changes without React noticing, two rules follow (see “Rules that keep it safe”): the React Compiler must not cache anything read from it, and anything new a menu shows must be added to `shownKey` in `redraw.ts`.

## 3. Expo + React Native as the app shell

**Decision:** Expo (expo-router entry), TypeScript, React Native UI for screens/overlays; ship early via **Expo Go**, later via **EAS** for installable binaries.

**Why**

- Mobile-first without early Xcode/Android Studio ceremony.  
- Same project can open on phone and (with caveats) web.  
- Fits a non-full-time-coder workflow: `npm start`, scan, play.

**Trade-off:** Native modules and Skia versioning need care; web is a second-class citizen (see §6). Expo Go only opens projects on its own SDK version and updates itself, so the game has to keep up: in October 2026 Expo Go moved to SDK 58 and the game followed (step U1).

## 4. Skia for the game view

**Decision:** Draw the playfield with `@shopify/react-native-skia` (stickman, grid, backgrounds, particles). React Native views handle chrome (bars, modals, tap targets).

**Why**

- High-performance 2D drawing on device.  
- One drawing API for complex neon/city visuals.  
- Landscape canvas composition stays in `GameCanvas` and background components.

**Trade-off:** Web uses CanvasKit (WASM). That path is heavier and more fragile than native Skia; patches/preload exist, but phone remains authoritative.

## 5. Time-based stages, not frame- or distance-primary progress

**Decision:** Each stage lasts as long as its music (`durationSec` in `stages.ts`: 174–180 seconds of real time). `stageProgress` and the derived `distance` come from elapsed wall time so the run ends with the soundtrack, and the stage clock is nudged gently towards where the music actually is (`musicSync.ts`). How hard it gets, the world's speed and the sky all key off that progress.

**Why**

- Music and the stage's arc (dusk → dawn, sunset, …) stay in sync when FPS drops (especially on web).  
- Clear design rule for every stage: one track, one arc.  
- Documented in [STAGE_DESIGN.md](./STAGE_DESIGN.md).

**Trade-off:** `distance` and `courseLength` are a clock in disguise (they drive the sky's timeline), not how far the runner has gone; that is `state.scroll`. Each stage's world speed rises between two numbers (`speed` in `stages.ts`), and obstacle gaps are set in seconds, so they stay fair at any speed.

## 6. Phone primary; web as preview

**Decision:** Optimise for the phone (Expo Go, later an installable app). Phone browsers are a close second: the game saved to the iPhone home screen fills the screen and is how it's tested for now. Keep web export and deploy docs for sharing, but do not treat CanvasKit stability as a hard requirement for “done.”

**Why**

- Primary players and testers are on a phone.  
- Skia-on-web + Expo code splitting caused races and aborts under load; patches fix timing, not the architectural tension.  
- Documented in [WEB_PATCHES_AND_ARCHITECTURE.md](./WEB_PATCHES_AND_ARCHITECTURE.md).

**Future options (not chosen yet):** dedicated Canvas2D/WebGL draw path for web; or permanently label web “preview only.”

## 7. Stage config as data

**Decision:** Stages are data in `stages.ts`: colours, pacing (how hard it gets and which obstacles turn up when), speed, length, the music's beat, the sky's `timeline`, and a `sky` block for any touches of the stage's own (a look held after the finish, a floor on the city lights, a fixed moon path). Each stage also names its scenery (`assets.backgroundType`), looked up in the scenery table, `src/components/backgrounds/scenery.ts`. Find a stage by its id with `stageById`.

**Why**

- A new stage is new config + art/music + a scenery component, not a fork of the loop.  
- The sky is worked out from the stage's settings by `src/game/sky.ts`, which has no “if stage 1” checks, and a test locks in how every stage's sky looks.

**Trade-off:** A stage can look “wired” in config before its visuals exist; checklist discipline matters ([PROJECT_PLAN.md](./PROJECT_PLAN.md)).

## 8. Scenery as image strips with light overlays

**Decision:** Scenery is a few pre-made PNG strips per layer, tiled by how far the world has scrolled, rather than shapes drawn every frame. Stage 1's city (`NeonCityScenery.tsx`) draws its unlit buildings (`assets/city/*_none_*`) and stacks lit-window overlays on top (`assets/city/lights/`, made by `scripts/generate-city-lights.js`) at the current light level, so windows come on through the night and go off towards dawn. Stages 2–4 draw strips made by their own `scripts/generate-*-strips.js`, plus shapes (sun, sea, fireworks). The city tells the game when its images are ready, so play waits on the loading screen until they are.

**Why**

- Richer look than drawing every window every frame; a tile costs its picture plus at most two overlays.  
- Controllable art pipeline (`assets/city`, `assets/beach`, `assets/mountains`, `assets/victory`).  
- No visible pop as the lights change: overlays fade between levels.

**Trade-off:** Asset count and naming conventions matter; the web needs the images decoded before play.

## 9. Frame-rate–independent motion where it matters

**Decision:** Scale player vertical physics by delta time; drive stickman run cycle from elapsed stage time (or equivalent), not raw frame ticks.

**Why**

- On slow devices, tick-based jumps felt longer / animation slower.  
- Keeps feel closer across phone and web FPS variance.

**Trade-off:** Every new motion system should be checked for the same delta-time habit.

## 10. Landscape, auto-run, tap to jump

**Decision:** Landscape orientation; player does not move left/right; world/obstacles scroll; tap = jump, double tap in air = double jump with energy cost, swipe down (and hold) = duck. The finger reading is in `src/game/swipe.ts`, shared by the phone app and phone browsers.

**Why**

- Matches classic runner feel and the child’s chosen format.  
- Simplifies collision and camera (fixed player X).  
- Energy/health give depth without adding movement axes.

## 11. Viewport scaling: fixed web preview, centered action zone on mobile

**Decision:** Game logic always works in a fixed **600×350 logical space** (`SCREEN_WIDTH`/`SCREEN_HEIGHT`). On **desktop web**, the canvas is a fixed 600×350 preview window, centered in the browser. On **phones** (the app, and phone browsers including the home screen web app), the drawn canvas can be wider than 600 (`viewWidth = max(600, 350 × deviceAspect)`) so wide phones see more world, but the 600px action band (player, obstacles) stays centered via a `gameOffsetX` draw offset — spawn, physics, and collisions never change. The grid's vanishing point (`vanishX`) is screen-center, not a fixed logical point, so perspective lines don't visibly "appear" at the edge on wide screens.

**Why**

- Keeps one set of gameplay math (spawn distances, collision boxes) regardless of device width — only the *drawing* offsets by `gameOffsetX`.
- Desktop web stays a small, predictable preview window rather than stretching to fill arbitrary browser sizes.
- The sizes are worked out in `src/screens/game/useViewport.ts`.

**Trade-off:** Any new draw code (obstacles, particles, arch) must remember to add `gameOffsetX`; anything using raw logical X will drift off-center on wide phones.

## 12. One small server: the world scoreboard

**Decision:** The game is a static site with no server, except for the world scoreboard: one
Vercel function (`api/scores.ts`) and an Upstash Redis database, reached over HTTPS with no
extra packages. The phone app calls the live site's address.

**Why**

- Vercel already hosts the site, so the function deploys with it and needs no second service.
- A Redis sorted set keeps scores in order by itself, which is all a leaderboard needs.
- The board is optional: when it can't be reached (no signal, not set up, the dev server) the
  game carries on with its own best-runs table, and holds unsent scores until next time.

**Trade-off:** Scores can't be proved genuine without replaying runs on the server, which isn't
worth it here. The server checks the shape of an entry, caps the score at what's possible, and
limits how often one address can send. `api/tsconfig.json` makes the function plain CommonJS,
since Expo's TypeScript settings leave `import`/`export` lines that Node can't load.

## Deliberate non-goals (for now)

- Multiplayer, accounts, monetisation (the world scoreboard, §12, is the only server)  
- Full App Store polish as day-one requirement  
- Feature parity of web vs native rendering quality  
- Premature ECS or heavy abstraction layers  

## How the code fits together

What happens each frame, and where each part lives:

```
Every frame: src/game/loop/useGameLoop.ts
 ├─ the stage clock: time since the stage began → progress → distance → speed,
 │  nudged towards the music (musicSync.ts); paused, it stands still (pause.ts)
 ├─ stepWorld (src/game/step.ts): the one frame order, also played by the pretend player
 │    scroll → physics → spawn → sparks → collisions → pickups
 │    systems/physics.ts (+ holes.ts), systems/spawn.ts (+ patterns.ts), particles.ts,
 │    systems/collisions.ts, pickups.ts
 │    every system asks the obstacle table (obstacleCatalogue.ts) what an obstacle does
 │    state.events lists what happened this frame (so far: 'land')
 └─ draw again? (loop/redraw.ts): every frame while a stage plays or the 3-2-1 counts;
    otherwise only when something shown changes (shownKey)

Drawing
 src/screens/GameScreen.tsx: the screen, with its jobs in src/screens/game/
  ├─ whichScreen.ts: which menus, HUD and banners show, from the state and menu flags
  ├─ input (useRunInput.ts, useWebKeyboard.ts), music (useStageMusic.ts), loading,
  │  pause buttons, the world-scoreboard flow, screen size (useViewport.ts)
  └─ src/components/GameCanvas.tsx: the game picture, back to front
       ├─ the sky: src/game/sky.ts works out colours, sun, moon and city lights
       │  from the stage's timeline and sky block
       ├─ GridFloor.tsx: the floor, the landing glow, the beat pulse
       ├─ the stage's scenery: picked from the scenery table (backgrounds/scenery.ts)
       ├─ ObstacleLayer.tsx: each obstacle drawn by its shape and tint in the table
       └─ pickups, the runner (Stickman.tsx), the finish line, sparks

Around the run
 loop/useScoreTable.ts: the high score and best runs, saved when a run ends or
                        pauses, or the app goes to the background
 src/hooks/musicShared.ts: the music rules the phone (expo-audio) and web versions share
```

The pretend player (`src/game/difficulty/pretendPlayer.ts`) sets its own clock by counting frames, then calls the same `stepWorld`. So anything added to `stepWorld` is played by the game and measured by `npm run difficulty` alike.

## Where to change what

| Concern | Primary place |
|---------|----------------|
| Gravity, jump, duck, ground | `src/game/systems/physics.ts`, `src/game/constants.ts` |
| Hits / hearts | `src/game/systems/collisions.ts` |
| Holes in the floor (falling in, the reset) | `src/game/systems/holes.ts` |
| What each obstacle is and does (size, damage, how it's cleared) | `src/game/obstacleCatalogue.ts` |
| Obstacle patterns and the gaps between them | `src/game/patterns.ts`; the spawner in `src/game/systems/spawn.ts` |
| How hard each stage gets, and when each obstacle turns up | `pacing` in `src/game/stages.ts` |
| One frame's order (shared by the game and the pretend player) | `src/game/step.ts` |
| Loop / stage timing / Continue | `src/game/loop/useGameLoop.ts` |
| When the screen draws again | `src/game/loop/redraw.ts` |
| Stage clock following the music | `src/game/musicSync.ts` |
| Pickups, streak multiplier | `src/game/pickups.ts` |
| The beat pulse on the floor | `src/game/beatPulse.ts`; drawn in `src/components/GridFloor.tsx` |
| Pausing (the stage clock, the 3-2-1) | `src/game/pause.ts`; `src/screens/game/usePauseControls.ts`; button and screen in `src/components/ui/PauseButton.tsx`, `src/components/menu/PausedScreen.tsx` |
| Stage colours, speed, length, beat, music track | `src/game/stages.ts` |
| Sky (colours, sun, moon, city lights) | `src/game/sky.ts`; per-stage `timeline` and `sky` in `src/game/stages.ts` |
| Each stage's scenery | `src/components/backgrounds/scenery.ts` (by `backgroundType`) |
| City strips and lit windows | `src/components/backgrounds/NeonCityScenery.tsx`, `scripts/generate-city-lights.js` |
| Obstacle drawing | `src/components/ObstacleLayer.tsx` (by the obstacle table's `shape` and `tint`), `src/components/Obstacle3D.tsx`; colours in `src/components/obstacleColours.ts` |
| Draw composition | `src/components/GameCanvas.tsx` |
| The runner's poses | `src/game/animations.ts`, `src/components/Stickman.tsx` |
| Which screen shows | `src/screens/game/whichScreen.ts` |
| Menu screens | `src/components/menu/` |
| Touch and keyboard | `src/game/swipe.ts`, `src/screens/game/useRunInput.ts`, `src/screens/game/RunInputLayer.tsx`, `src/screens/game/useWebKeyboard.ts` |
| Music | track list in `src/hooks/musicTracks.ts`; `src/hooks/useBackgroundMusic.ts` (+ `.web.ts`), `src/hooks/useMenuMusic.ts` (+ `.web.ts`), shared rules in `src/hooks/musicShared.ts`; when it starts and stops in `src/screens/game/useStageMusic.ts` |
| High score and best runs | `src/game/loop/useScoreTable.ts` |
| World scoreboard | `api/scores.ts`, `api/_lib/scoreboardServer.ts` (server); `src/scoreboard/` (rules, game side); `src/screens/game/useWorldScoreFlow.ts`; `src/components/menu/InitialsScreen.tsx`, `WorldBoard.tsx`, `WorldScoresScreen.tsx` |
| Viewport / centering | `src/screens/game/useViewport.ts` (`viewWidth`), `src/components/GameCanvas.tsx` (`gameOffsetX`), `src/components/GridFloor.tsx` (`vanishX`) |
| How hard it is, measured | `src/game/difficulty/pretendPlayer.ts`; `npm run difficulty` writes [DIFFICULTY.md](./DIFFICULTY.md) |

## Recipes

Each one names the files to touch and the checks to run. “The usual checks” are: `npx tsc --noEmit` clean, `npx expo lint` no worse, `npm test` passing, then played in the browser at phone size, then on the phone.

### Add an obstacle

Example: a flock of bats to duck under (Pete's concept sheet is `assets/concepts/flying-swarm-prompt.md`, in the main folder on the Mac; it isn't in git).

1. **`src/game/obstacleCatalogue.ts`**: add the name to `ObstacleRole` and an entry to `ROLE_SHAPES`: size, damage, how it's cleared (`clearBy: 'duck'`) and what it does (`overhead: true` hangs it in the duck band). Every rule in the game reads this entry; nothing else checks names.
2. **Its look**, if it isn't an existing shape: add a shape to `ObstacleShape`, and a drawing that fills the obstacle's box to `SHAPE_LOOKS` in `src/components/ObstacleLayer.tsx`. The drawing is the hitbox, so draw inside the box. For new colours: a tint in `ObstacleTint`, a case in `src/components/obstacleColours.ts`, and the colours in each stage's `theme.obstacleColors` in `stages.ts`.
3. **How to Play**: add it to a row in `src/components/menu/HowToPlayScreen.tsx` (its small `Icon` drawing needs a case for a new shape).
4. **`src/game/patterns.ts`**: one or more patterns that use it, timed in seconds.
5. **`src/game/stages.ts`**: when it first turns up in each stage (`pacing.unlocks`), and, if a stage should lean on it, `pacing.favour`.
6. **`src/game/__tests__/obstacleCatalogue.test.ts`**: add it to `EXPECTED_MOVE` (and a new shape to the shapes it allows).

Checks: the usual ones (`npm test` plays every pattern with the real physics at three speeds, so an impossible pattern fails). Then `npm run difficulty`: this change is *meant* to move the numbers, so read the new [DIFFICULTY.md](./DIFFICULTY.md) and commit it.

### Add a stage

1. **Music**: the track in `assets/`, and a key for it in `MUSIC_TRACKS` (`src/hooks/musicTracks.ts`). Measure where the music really ends and its beat (seconds per beat, and when the first beat falls).
2. **Scenery**: a component in `src/components/backgrounds/` that takes `SceneryProps` (image strips from a `scripts/generate-*-strips.js`, shapes, or both). Add a name to `BackgroundType` in `stages.ts` and an entry to `SCENERY` in `backgrounds/scenery.ts`. If it loads images, mark it `loadsAssets: true` and call `onAssetsReady` once they're ready.
3. **`src/game/stages.ts`**: a new entry in `STAGES`, in play order. Copying the nearest stage is easiest: `id`, `name`, `theme` colours, `assets.backgroundType`, `audio.musicTrack`, `pacing`, `speed`, `durationSec` (where the music ends), `beat`, `courseLength: COURSE_LENGTH`, its `timeline`, and a `sky` block only if it needs touches of its own.
4. **The world scoreboard's cap**: `MAX_SCORE` in `src/scoreboard/rules.ts` turns away scores no real game could reach. A fifth stage may need it raised; `rules.test.ts` checks it stays above the real maximum. It's checked on the server too, so the change goes live with the site.

Continue, the last-stage check, the stage banner and the debug stage buttons all follow `STAGES`, so nothing else lists the stages.

Checks: the usual ones. `sky.test.ts` saves a picture of the new stage's sky the first time it runs (commit `src/game/__tests__/__snapshots__/sky.test.ts.snap`); the other stages' must not change. `npm run difficulty` now includes the new stage: commit the new DIFFICULTY.md. Try it with the debug panel's stage buttons.

### Add a mechanic to the frame

Example: the planned beat bonus (plan step 9), points and energy for landing on the beat.

1. **Its rules in a file of their own** in `src/game/`, as plain functions over the game state, with the numbers to tune at the top (like `pickups.ts`). For the beat bonus, “how far from the nearest pulse is this moment” is already in `beatPulse.ts` (`nearestPulseSec`).
2. **Call it from `stepWorld`** in `src/game/step.ts`, at the right point in the order. The beat bonus goes after `applyPhysics`: if `state.events` holds a `land`, check the time against the beat and give the reward. Because the pretend player runs the same `stepWorld`, the difficulty report measures it from day one.
3. **New numbers on the state** (a tally, say): add them to `GameState` and `createInitialState` in `src/game/state.ts`, and reset them in `startStage` in `useGameLoop.ts` if they're per stage. If something happens that other code may want to react to, add an event to `GameEvent` and push it where it happens.
4. **Show it**: on the canvas, pass plain numbers to the drawing (for the beat bonus, a flash in `GridFloor.tsx`). On a menu or the HUD (“ON THE BEAT: 23” on Stage Clear), also add the field to `shownKey` in `src/game/loop/redraw.ts`, or the menu won't update.
5. **A test** in `src/game/__tests__/` that drives `stepWorld` frame by frame, as `step.test.ts` does for landings: a landing in the window rewards, one just outside doesn't.

Checks: the usual ones, then `npm run difficulty`. A mechanic that only adds points leaves survival alone; one that gives energy may change it. Read the new DIFFICULTY.md and commit it.

## Rules that keep it safe

- **The React Compiler is on** (`app.json`): it caches parts of components and reuses them while their inputs look the same. The game state object is changed in place every frame, so it always looks the same. So: files that read the per-frame game state while drawing start with `'use no memo'` (all of `src/screens/game/` and `GameScreen.tsx` do), or the component is handed plain numbers rather than the state object (the scenery is; `GridFloor.tsx` also gets `tick`, which changes every frame). Getting this wrong shows as something frozen on screen: the pause button left on Game Over, scenery that stops scrolling.
- **Music must start inside the tap on iPhone Safari.** START, CONTINUE, PLAY AGAIN and RESUME call play straight from the tap; anything that waits first (a timer, a download) is refused.
- **Draw code adds `gameOffsetX`.** Game logic works in the 600-wide space; on wide screens it's drawn centered, so anything drawn at a game position adds the offset (§11).
- **Stages run on the clock.** Progress, distance, the sky and the finish come from time, never from frames or how far the world has scrolled (§5).
- **Anything new a menu shows from game state goes in `shownKey`** in `src/game/loop/redraw.ts`; away from play the screen only draws when that changes. `redraw.test.ts` checks the key against `whichScreens`.
- **A change meant to change nothing leaves `npm run difficulty` byte-identical.** The pretend player uses fixed dice, so any difference means the game plays differently. Run it before and after and compare the two fresh runs (12 runs per stage and skill is the default; the committed DIFFICULTY.md was made with `DIFFICULTY_RUNS=20`, so don't compare against that). Put DIFFICULTY.md back afterwards if it was only a check.

## Related docs

- [PROJECT_BRIEF.md](./PROJECT_BRIEF.md) — product narrative and next steps  
- [CONTEXT_FOR_AGENTS.md](./CONTEXT_FOR_AGENTS.md) — start here, and how to check a change  
- [STAGE_DESIGN.md](./STAGE_DESIGN.md) — stage timing rules  
- [STAGE1_REVIEW.md](./STAGE1_REVIEW.md) — Stage 1 implementation notes  
- [WEB_PATCHES_AND_ARCHITECTURE.md](./WEB_PATCHES_AND_ARCHITECTURE.md) — web/Skia patches in depth  
- [HISTORY.md](./HISTORY.md) — the full story: debugging sessions, completed plans, design detours  
- [project.md](../project.md) — original principles  
