# Stickman Runner

A landscape **staged runner** with a retro neon synthwave look. Built with **Expo**, **React Native**, and **Shopify Skia** — a small custom game loop, not a heavy engine.

Made as a learning and collaboration project (adult + child): readable code, playable milestones, phone-first, with web as a secondary preview.

## How to play

- **Tap / Space / Up**: Jump  
- **Tap again in the air**: Double jump (uses half the energy bar)  
- **Swipe down and hold / Down / S**: Duck (slide under bars); from a held duck, swipe up to jump  
- **Pause button / P / Esc**: Pause  
- **Goal**: Survive all four stages, each as long as its song (about 3 minutes)  

**Rules**

- Jump blocks, spheres and holes, duck under bars, double jump the wide block — hits cost health  
- Energy regenerates on the ground; double jump spends it  
- Pink hearts restore health; glowing pickups and a streak of clean clears add to the score  

Four stages: Neon City, Sunset Beach, Midnight Mountains and Victory Dawn, each with its own scenery, music, colours and arc, then a win screen and best runs. A public world top 10 takes three initials.

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
    constants.ts       # Physics, sizes, colours
    state.ts           # Game state shape, and this frame's events
    stages.ts          # Stage configs (colours, pacing, speed, length, beat, sky)
    step.ts            # One frame: scroll, physics, spawn, sparks, collisions, pickups
    obstacleCatalogue.ts # What each obstacle is and does
    patterns.ts        # Hand-made obstacle patterns
    sky.ts             # The sky at any moment of a stage
    pickups.ts, particles.ts, animations.ts, …
    /loop
      useGameLoop.ts   # requestAnimationFrame loop and the stage clock
      redraw.ts        # When the screen draws again
      useScoreTable.ts # High score and best runs
    /systems
      physics.ts       # Gravity, jump, duck, obstacle motion (delta-time)
      collisions.ts    # Player vs obstacles / hearts
      holes.ts         # Falling into a hole
      spawn.ts         # Picks patterns from the stage's pacing
    /difficulty
      pretendPlayer.ts # Plays whole stages for `npm run difficulty`
  /components
    GameCanvas.tsx     # Skia canvas composition
    ObstacleLayer.tsx  # Draws obstacles from the obstacle table
    Stickman.tsx
    GridFloor.tsx
    /backgrounds       # Each stage's scenery (scenery.ts picks it)
    /menu              # Title, How to Play, PAUSED, Stage Clear, Game Over, …
    /ui                # Health, energy, score, pause button
  /screens
    GameScreen.tsx     # The game screen
    /game              # Its pieces: which screen shows, input, music, loading, …
  /hooks
    useBackgroundMusic.ts, useMenuMusic.ts (+ .web), musicShared.ts
  /scoreboard          # World scoreboard rules (game side)
/api                   # The world scoreboard server (a Vercel function)
/app                   # Expo Router entry
/assets                # Scenery strips, music
/docs                  # Plans, stage design, architecture
```

**Idea:** game logic updates a ref of state each frame; Skia (and light React UI) render that state. Logic stays out of JSX.

## Running locally

Needs **Node 22.13 or newer** (Expo SDK 58). On this Mac the Terminal's own Node is 20, and Node 24
is installed through `fnm`, so put `fnm exec --using=24` in front of each command:

```bash
fnm exec --using=24 npm install
fnm exec --using=24 npm start               # Expo dev server (LAN)
# or
fnm exec --using=24 npm run start:tunnel    # Easier for phone when LAN QR fails
```

- **Phone:** Expo Go → scan QR, or enter the `exp://…` URL manually (the game is on Expo SDK 58, which is what Expo Go opens). If Expo Go is signed in to an Expo account, the Mac must be signed in to the same one, or Expo Go says "not signed in to Expo CLI". Sign in once with `NODE_EXTRA_CA_CERTS=$HOME/.certs/zscaler-root.pem fnm exec --using=24 npx expo login` (the certificate part is for the office network's filter), then restart the dev server.  
- **Web:** press `w` in the Expo terminal (or `npm run web`)  
- **Static web export:** `npm run build:web` → see [DEPLOY_WEB.md](./DEPLOY_WEB.md)

Orientation is **landscape**. Primary testing target is a real phone.

## Docs

| Doc | What it’s for |
|-----|----------------|
| [docs/PROJECT_BRIEF.md](./docs/PROJECT_BRIEF.md) | Why the project exists, how it evolved, what’s next |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Architectural decisions and trade-offs |
| [docs/STAGE_DESIGN.md](./docs/STAGE_DESIGN.md) | 3-minute stages, time-based progress, music sync |
| [docs/PROJECT_PLAN.md](./docs/PROJECT_PLAN.md) | The plan: where things stand, and each step still to do |
| [docs/CONTEXT_FOR_AGENTS.md](./docs/CONTEXT_FOR_AGENTS.md) | Start here (people and AI agents), and how to check a change |
| [docs/STAGE1_REVIEW.md](./docs/STAGE1_REVIEW.md) | Stage 1 end to end, and the contract every stage keeps |
| [docs/HISTORY.md](./docs/HISTORY.md) | Project history: debugging sessions and completed plans |
| [project.md](./project.md) | Original goals and principles |
| [HOW_WE_WORK.md](./HOW_WE_WORK.md) | Collaboration preferences for contributors / AI |

## Status

- **All four stages** — playable end to end, with menus, pause, pickups and a world scoreboard  
- **Next** — the Expo SDK upgrade, then a bonus for landing on the beat (see the project plan)  
- **Web** — live on Vercel from `main`; the iPhone home screen version is how the game is tested for now  

## Credits

Built to learn game loops, physics, and shipping a small cross-platform app without a black-box engine.
