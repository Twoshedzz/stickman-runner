# Stickman Runner

A landscape **endless / staged runner** with a retro neon synthwave look. Built with **Expo**, **React Native**, and **Shopify Skia** — a small custom game loop, not a heavy engine.

Made as a learning and collaboration project (adult + child): readable code, playable milestones, phone-first via Expo Go, with web as a secondary preview.

## How to play

- **Tap / Space / Up**: Jump  
- **Double tap (in air)**: Double jump (uses energy)  
- **Goal**: Survive the stage, collect hearts, reach dawn  

**Rules**

- Avoid yellow (and other) obstacles — hits cost health  
- Energy regenerates on the ground; double jump spends it  
- Pink hearts restore health  

Stage 1 (Neon City) is the current stable playable stage: ~3 minutes of real time, night → dawn, parallax city strips, grid floor, health/energy UI.

## Tech stack

| Layer | Choice |
|--------|--------|
| App shell | Expo + expo-router |
| UI / native | React Native + TypeScript |
| Game draw | `@shopify/react-native-skia` |
| Music | expo-audio (stage tracks) |
| Platforms | iOS / Android (primary), web (preview) |

## Project structure

```
/src
  /game
    constants.ts       # Physics, sizes, colours, stage duration
    state.ts           # Game state shape
    stages.ts          # Stage configs (themes, difficulty, timeline)
    particles.ts
    animations.ts
    /loop
      useGameLoop.ts   # requestAnimationFrame update loop
    /systems
      physics.ts       # Gravity, jump, obstacle motion (delta-time)
      collisions.ts    # AABB player vs obstacles / hearts
      spawn.ts         # Obstacle spawning from stage difficulty
  /components
    GameCanvas.tsx     # Skia canvas composition
    Stickman.tsx
    GridFloor.tsx
    /backgrounds       # City strips, neon city, beach, …
    /ui                # Health, energy, score
  /screens
    GameScreen.tsx     # Input, overlays, “Get ready”
  /hooks
    useBackgroundMusic.ts (+ .web)
/app                   # Expo Router entry
/assets/city           # Front/back city strip PNGs
/docs                  # Plans, stage design, architecture
```

**Idea:** game logic updates a ref of state each frame; Skia (and light React UI) render that state. Logic stays out of JSX.

## Running locally

```bash
npm install
npm start                 # Expo dev server (LAN)
# or
npm run start:tunnel      # Easier for phone when LAN QR fails
```

- **Phone:** Expo Go → scan QR, or enter the `exp://…` URL manually  
- **Web:** press `w` in the Expo terminal (or `npm run web`)  
- **Static web export:** `npm run build:web` → see [DEPLOY_WEB.md](./DEPLOY_WEB.md)

Orientation is **landscape**. Primary testing target is a real phone.

## Docs

| Doc | What it’s for |
|-----|----------------|
| [docs/PROJECT_BRIEF.md](./docs/PROJECT_BRIEF.md) | Why the project exists, how it evolved, what’s next |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Architectural decisions and trade-offs |
| [docs/STAGE_DESIGN.md](./docs/STAGE_DESIGN.md) | 3-minute stages, time-based progress, music sync |
| [docs/PROJECT_PLAN.md](./docs/PROJECT_PLAN.md) | Stages 2–4, installable builds, polish backlog |
| [docs/STAGE1_REVIEW.md](./docs/STAGE1_REVIEW.md) | Stage 1 as stable base |
| [project.md](./project.md) | Original goals and principles |
| [HOW_WE_WORK.md](./HOW_WE_WORK.md) | Collaboration preferences for contributors / AI |

## Status

- **Stage 1 (Neon City)** — playable and tagged as a working baseline (`stage-one-working` on `main` when present)  
- **Stages 2–4** — configs/scaffolding exist; full art, music, and unique obstacles still planned  
- **Web** — useful for sharing; Skia/CanvasKit can be fragile under load — see architecture doc  

## Credits

Built to learn game loops, physics, and shipping a small cross-platform app without a black-box engine.
