# Project brief

What Stickman Runner is addressing, how it has evolved, and where it goes next.

## What this project is addressing

Stickman Runner is a **small, teachable game** — not a commercial engine demo. It answers a few practical needs at once:

1. **Learn by building** — An adult and a child (the “tester”) can read and change real game code: gravity, jumps, obstacles, stages. No Unity/Phaser black box; the loop is ours.
2. **Ship something fun early** — Playable on a real phone via Expo Go as soon as the basics work. Feedback comes from play, not from unfinished systems.
3. **One codebase, phone first** — iOS/Android are the target. Web exists so friends can try a build in a browser and so iteration is fast, without pretending web is as solid as native Skia.
4. **Readable structure** — Clear folders (`game` vs `components` vs `screens`), small milestones, and docs so the next session (or the next person) can pick up the thread.

In short: **a staged neon runner that stays understandable while growing from “jump over a box” into a multi-stage experience.**

## How it has evolved

### From rectangle to runner

Early work followed [project.md](../project.md): a stickman as a rectangle, a ground line, tap-to-jump, one moving obstacle, collision reset. That milestone locked the pattern — **separate state and systems from rendering** — and proved Expo Go on a phone.

### Custom loop instead of an engine

The game grew a thin engine of its own:

- `useGameLoop` + `requestAnimationFrame`
- Systems for physics, collisions, spawn
- UI overlays (health, energy, score) on top of a Skia canvas

That kept ownership of behaviour and made teaching (“here is gravity”) possible.

### From endless to staged (3 minutes + music)

Design shifted from pure endless run to **stages of fixed real time** (180 seconds), each with its own soundtrack and visual arc. Progress is driven by **elapsed wall-clock time**, not frame count, so music and “dawn” stay aligned even when FPS dips. See [STAGE_DESIGN.md](./STAGE_DESIGN.md).

Stage 1 (Neon City) became the reference: night → dawn, difficulty segments every ~30s, timeline-driven sky/lights.

### Visuals: shapes → neon city → city strips

Backgrounds moved from simple gradients/shapes toward a denser city look:

- Procedural / neon city layers and grid floor  
- Then **pre-generated city strip PNGs** (front and back parallax queues) keyed to night/lights theme, with careful scaling and no on-screen theme flipping  
- Asset loading on web needed special handling (decode + cache SkImages) so “Get ready” waits for strips before play  

A working Stage 1 snapshot was marked on `main` (tag `stage-one-working` when present) so visual tweaks and later stages have a known good baseline.

### Cross-platform reality check

Expo + Skia on **native** is the reliable path. On **web**, CanvasKit WASM plus Expo’s chunk loading led to races and aborts under load; patches and preloads mitigate that, but web remains a **preview/share** surface. Phone testing is the source of truth. See [WEB_PATCHES_AND_ARCHITECTURE.md](./WEB_PATCHES_AND_ARCHITECTURE.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).

### Gameplay systems that stuck

- Auto-run; tap / double-tap for jump / double jump  
- Health vs energy (regen on ground)  
- Hearts as heal pickups  
- Frame-rate–independent vertical physics and run animation (so slow devices don’t feel “floaty” or stretch jumps)

Four stage **configs** live in `stages.ts` (city, beach, mountains, victory). Only Stage 1 is fully realised as a playable visual/gameplay loop.

## Current position

| Area | Status |
|------|--------|
| Stage 1 Neon City | Stable playable baseline |
| Stages 2–4 | Config + some background scaffolding; not finished |
| Installable app (store / home screen) | Planned via EAS; still Expo Go–centric |
| Web deploy | Buildable (`npm run build:web`); treat as preview |
| Polish (UI, stickman poses, new obstacles) | Backlogged in [PROJECT_PLAN.md](./PROJECT_PLAN.md) |

## Next steps

Priorities below follow the project plan; order can shift with playtesting.

1. **Protect Stage 1** — Small visual tweaks only unless something is broken; keep the tagged baseline usable.  
2. **Finish the stage roadmap** — Beach → mountains → victory lap: each with its own background, 3-minute track, and **at least one new obstacle or pickup** so stages teach something new.  
3. **Decide “after Stage 4”** — Win/credits screen, loop, stage select, or New Game+ — and implement that branch so Continue after the last stage does not fall through.  
4. **Installable builds** — EAS preview/production so the game can leave Expo Go.  
5. **UI and feel** — Health/energy/score layout, instructions, stickman poses (land, hit, victory).  
6. **Web stance** — Keep as shareable preview, or invest in a non-Skia web renderer if browser stability becomes a real goal.  

Detailed checklists and obstacle ideas live in [PROJECT_PLAN.md](./PROJECT_PLAN.md). Stage timing rules stay in [STAGE_DESIGN.md](./STAGE_DESIGN.md).

## Success looks like

- Someone can open the repo, run Expo, and play Stage 1 on a phone in minutes.  
- A novice can find “where gravity lives” and change it safely.  
- Stages 2–4 feel distinct (look, sound, challenge) without rewriting the core loop.  
- Learning and fun stay ahead of premature engine abstraction.
