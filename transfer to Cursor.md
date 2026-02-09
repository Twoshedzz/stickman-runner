# Stickman Runner — How the Game Works (Transfer to Cursor)

This document describes how the **Stickman Runner** game is structured and how it runs, so you can continue work (e.g. on the second stage) with a clear mental model.

---

## Tech Stack (Not “Antigravity”)

The app is built with:

- **Expo** (React Native) — app shell, routing, dev/build
- **React Native** — UI and touch
- **TypeScript**
- **@shopify/react-native-skia** — 2D canvas rendering (player, obstacles, particles, backgrounds)
- **expo-audio** — background music (replaced expo-av)
- **expo-router** — single screen (`app/index.tsx` → `GameScreen`)

There is no “antigravity” library; the runner uses a **custom game loop** with gravity and jump physics implemented in `src/game/systems/physics.ts`.

---

## High-Level Flow

1. **Entry:** `app/_layout.tsx` wraps the app in `SkiaWrapper` (Skia provider) and a `Stack` with one screen.
2. **Screen:** `app/index.tsx` renders `GameScreen`.
3. **GameScreen** uses:
   - **`useGameLoop()`** — single source of truth for game state, input, and tick.
   - **`GameCanvas`** (Skia) — draws world, stickman, obstacles, particles, sky, ground.
   - **UI overlay** — start screen, HUD (health, energy, score), game over, “Stage Clear / Continue”, instructions.
   - **`useBackgroundMusic()`** — plays stage music; starts on first tap, stops on game over.
4. **Input:** Tap (or Space/Up on web) = jump (or start game). No left/right movement; the world scrolls.

---

## Game Loop (`useGameLoop.ts`)

- **State** lives in a **ref** (`stateRef`), not in React state, so the loop can mutate it every frame without triggering re-renders for every field.
- **`requestAnimationFrame`** drives a loop that:
  - Runs only when **game started** and **not game over**.
  - Updates **stage progress** from `state.distance / currentStage.courseLength` and drives **time-of-day** for visuals (e.g. sunset → night → sunrise in Stage 1).
  - When `distance >= courseLength + 300`, sets **stage complete** and shows **“Continue?”**.
  - While **playing**: runs **physics**, **spawn**, **particles**, **collisions**.
  - Syncs a **throttled** subset of state to React (`gameMetrics`: score, health, energy, maxHealth) so the HUD updates without excessive re-renders.
  - Always increments **`renderTrigger`** so the Skia canvas re-draws every frame (60fps feel).
- **Restart:** `restartGame()` resets state with `createInitialState()`, sets `gameStarted = true`, resets spawner.
- **Continue:** `onContinue()` advances to the next stage (next entry in `STAGES`), resets `distance`, clears obstacles, resets spawner after a short delay.

---

## Game State (`state.ts`)

- **Player:** `y`, `dy`, `isGrounded`, `jumpCount`, `health`, `maxHealth`.
- **Obstacles:** array of `{ x, id, passed?, type?, phase? }`. Types: `standard`, `red`, `purple`, `heart`, `boulder`.
- **Particles:** list for explosions, dust, healing effects, homing to UI.
- **Meta:** `score`, `distance`, `energy`, `timeOfDay`, `stageProgress`, `stageId`, `stageStatus` (`playing` | `exhausted` | `victory`), `gameOver`, `gameStarted`, `showContinue`, `debugMode`, `shield`, `lastDoubleObstacleDistance`.

Initial state uses `stageId: 'stage_1_city'`.

---

## Physics (`physics.ts`)

- **Gravity:** `player.dy += GRAVITY`, `player.y += player.dy`.
- **Ground:** clamp to `groundY`, set `dy = 0`, `isGrounded = true`, `jumpCount = 0`; regen **energy** when grounded.
- **Distance:** `state.distance += BASE_SPEED` each frame (world scroll).
- **Obstacles:** move left by `BASE_SPEED` (boulders add a cosine “wobble” via `phase`). When an obstacle’s right edge passes the player’s left, **score +1** and obstacle marked `passed`. Off-screen obstacles are removed.
- **Jump (`jump()`):**
  - **Grounded:** one jump, `dy = JUMP_FORCE`, no energy cost.
  - **Air (double jump):** if `jumpCount < 2` and `energy >= JUMP_ENERGY_COST`, apply jump again and spend full energy bar; spawn cyan particles.

Particles for landing dust and run dust are spawned here.

---

## Collisions (`collisions.ts`)

- **AABB** with a small **hit margin** (forgiveness).
- **Hearts:** if health &lt; max, heal (HEART_HEAL) and spawn pink homing particles to health bar; else score bonus and gold particles to score. Then remove obstacle.
- **Other obstacles:** apply damage (unless `debugMode`), spawn explosion particles, remove obstacle. If health ≤ 0 → **game over**.

---

## Spawning (`spawn.ts`)

- **Per-stage config:** `spawnRate`, `allowedObstacles`, `allowDoubleSpawns`, `baseSpeed` (used in loop via `currentStage.difficulty`).
- Converts spawn rate to a **distance-based** check; spawns when the last obstacle is far enough away (with some randomness).
- **Types:** can pick `heart` with ~10% chance when allowed; otherwise random from allowed non-heart types. **Boulders** get a random `phase` for wobble.
- **Double spawns:** if allowed and cooldown passed (`distance - lastDoubleObstacleDistance > 1200`), 20% chance to add a second obstacle (simple types only) slightly behind the first.
- Obstacles list is capped (e.g. shift if &gt; 20) for safety.

---

## Stages (`stages.ts`)

**Four stages** are defined in `STAGES`:

| # | Id                 | Name             | Background   | Notes |
|---|--------------------|------------------|-------------|--------|
| 1 | `stage_1_city`     | NEON CITY        | city        | Implemented. Day→sunset→night→dawn timeline, city skyline, night lights. Obstacles: standard, boulder, heart. Double spawns. |
| 2 | `stage_2_beach`    | SYNTHWAVE BEACH  | beach       | **Config present; you’re about to work on this.** Beach theme, purple/red obstacles, no double spawns. |
| 3 | `stage_3_landscape`| DIGITAL PEAKS    | mountains   | Config only; mountains background not implemented in canvas yet. |
| 4 | `stage_4_victory`  | VICTORY LAP      | city_victory| Config only; victory city background not implemented. |

Each stage has: **theme** (ground, sky, sun/moon), **assets.backgroundType**, **audio.musicTrack**, **difficulty** (baseSpeed, spawnRate, allowedObstacles, allowDoubleSpawns), **courseLength**, and optional **timeline** (visual events keyed by distance).

**Stage 1** uses `timeline` for: sun set, sky gradient (day→night), night lights ramp, moon rise, sunrise, dawn sky. `GameCanvas`’s `getTheme(distance, stage)` evaluates these events to drive sky gradient and sun/moon position and color.

---

## Rendering (`GameCanvas.tsx`)

- **Order of draw:**  
  Sky gradient → Sun → Moon (if visible) → **Stage background** → Ground line → **Victory arch** (when near course end) → Obstacles → Stickman → Particles.
- **Background:** switched by `currentStage.assets.backgroundType`: `city` → `NeonCityBackground`, `beach` → `SynthwaveBeachBackground`. Mountains and city_victory are commented placeholders.
- **Theme:** For Stage 1, `getTheme(gameState.distance, currentStage)` computes sky colors and sun/moon from the stage’s `timeline`. Other stages use static theme from config.
- **Obstacles:** Rendered by type (rect, circle, boulder with inner circle, hearts as circles). Colors and sizes from constants and stage.
- **Stickman:** `Stickman` component uses pose data from `animations.ts` (run cycle, jump, stand, exhausted) and `tick` for animation.

---

## Stickman & Animations

- **Stickman.tsx:** Draws a stick figure with Skia `Line` and `Circle` (head). Poses define limb angles (upper/lower for legs and arms).
- **animations.ts:** `RUN_POSES`, `JUMP_POSE`, `STAND_POSE`, `EXHAUSTED_POSE`. Run is a 4-frame cycle plus mirrored 4 for 8-frame loop; interpolated by `tick` for smooth motion. Status `exhausted` / `victory` switches to hands-on-knees or stand.

---

## Particles (`particles.ts`)

- **Particles** have position, velocity, life, decay, color, optional **target** (for homing to health bar or score).
- **updateParticles:** Moves particles; homing ones accelerate toward target then die; others get light damping. Life decreases each frame; dead particles are filtered out.
- **spawnParticles:** Called from physics (landing, run dust, double-jump burst) and collisions (explosions, hearts, score bonus). Can pass a velocity bias (e.g. drift left).

---

## Audio

- **useBackgroundMusic:** Uses `expo-audio`. One track per stage key (`music_city`, `music_beach`, etc.); stage 1 uses `neoncity.mp3`, others placeholder until added. Starts when the player taps to start; stops (with fade) on game over.

---

## Constants (`constants.ts`)

- **Layout:** `SCREEN_WIDTH`, `SCREEN_HEIGHT`, `GROUND_HEIGHT`, `PLAYER_SIZE`, `PLAYER_X`, `OBSTACLE_SIZE`, etc.
- **Physics:** `GRAVITY`, `JUMP_FORCE`, `BASE_SPEED`.
- **Damage/Heal:** `DAMAGE_BLOCK`, `DAMAGE_PURPLE`, `HEART_HEAL`.
- **Energy:** `MAX_ENERGY`, `JUMP_ENERGY_COST`, `ENERGY_REGEN`.
- **Visual:** Theme colors, `TIME_CYCLE_DURATION` for day/night cycle.

---

## Summary: How the Game “Works”

1. **Start:** Tap → `gameStarted = true`, first jump, music starts.
2. **Play:** Every frame, physics moves the player (gravity + jump), advances `distance`, moves obstacles (and boulder phase), spawns obstacles per stage rules, updates particles, checks collisions. Score increases when obstacles pass the player; hearts heal or give bonus; hazards reduce health until game over.
3. **Stage completion:** When `distance` passes the stage’s `courseLength` (+ 300), status becomes “exhausted” and “Stage Clear / Continue?” is shown. On continue, `stageId` switches to the next stage, distance and obstacles reset.
4. **Four stages:** 1 = Neon City (done with timeline), 2 = Synthwave Beach (config + beach background exist; second stage to polish), 3 = Digital Peaks, 4 = Victory Lap. Background and timeline support are in place; stages 2–4 need their content and any extra logic you want.

---

## Suggested Focus for Stage 2 (Synthwave Beach)

- **Already there:** `stage_2_beach` in `STAGES`, `SynthwaveBeachBackground`, and the loop already uses `currentStage.difficulty` and `currentStage.assets.backgroundType`, so switching to Stage 2 after clearing Stage 1 will load beach theme and purple/red obstacles.
- **You might add:**  
  - A **timeline** for Stage 2 (e.g. sun position, sky gradient over the course) in `stages.ts` and ensure `getTheme` or beach background use it if needed.  
  - **Beach-specific music** (replace placeholder in `useBackgroundMusic`).  
  - **Tuning:** spawn rate, `courseLength`, and difficulty so the second stage feels right.  
  - Any **beach-specific visuals** (e.g. more palm variety, waves, or foreground elements) in `SynthwaveBeachBackground.tsx`.

This is how the game works end-to-end and where Stage 2 fits in.
