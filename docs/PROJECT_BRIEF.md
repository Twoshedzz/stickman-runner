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
- Then **pre-generated city strip PNGs** (front and back layers), now with the lit windows as overlays that fade in and out with the night  
- Asset loading on web needed special handling (decode + cache SkImages) so play waits for the strips  
- Stages 2–4 followed the same pattern: image strips plus a few drawn shapes each

A working Stage 1 snapshot was marked on `main` (tag `stage-one-working` when present) so visual tweaks and later stages have a known good baseline.

### Cross-platform reality check

Expo + Skia on **native** is the reliable path. On **web**, CanvasKit WASM plus Expo’s chunk loading led to races and aborts under load; patches and preloads mitigate that, but web remains a **preview/share** surface. Phone testing is the source of truth. See [WEB_PATCHES_AND_ARCHITECTURE.md](./WEB_PATCHES_AND_ARCHITECTURE.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).

### Gameplay systems that stuck

- Auto-run; tap / double-tap for jump / double jump; swipe down and hold to duck  
- Health vs energy (regen on ground)  
- Hearts as heal pickups; glowing pickups and a streak multiplier between obstacles  
- Hand-made obstacle patterns timed to the music's beat, and holes in the floor  
- Frame-rate–independent vertical physics and run animation (so slow devices don’t feel “floaty” or stretch jumps)

All four stages (city, beach, mountains, victory) are playable, each with its own scenery, music, colours and arc.

## Current position

| Area | Status |
|------|--------|
| Four stages | All playable end to end: Neon City, Sunset Beach, Midnight Mountains, Victory Dawn |
| Menus | Full set of 80s-arcade screens: title, How to Play, PAUSED, Stage Clear, Game Over, Finished, best runs |
| Gameplay | Duck, holes, patterns on the beat, pickups and streak, pause; the beat pulse shows on the floor |
| World scoreboard | Live: a public top 10, three initials, nothing personal |
| Code | Tidied in October 2026 so new obstacles, stages and mechanics are each a change in one or two places ([ARCHITECTURE.md](./ARCHITECTURE.md)) |
| iPhone | Home screen web app works, and Expo Go opens the game again (SDK 58, step U1) |
| Installable app (App Store / TestFlight) | Not started; needs EAS and the Apple Developer Program |
| Web deploy | Live on Vercel from `main`; desktop browsers get a small preview |

## Next steps

Priorities follow [PROJECT_PLAN.md](./PROJECT_PLAN.md); order can shift with playtesting.

1. **Upgrade Expo (step U1)** — SDK 54 → 58, so Expo Go opens the game again.  
2. **The beat bonus (step 9)** — points and energy for landing on the beat, then a tally on the end-of-stage screens.  
3. **Calm and busy sections that follow the music** — the last part of step 8.  
4. **Tuning** — damage, speeds and colours, from play on the phone.  
5. **Ideas waiting for Pete** — themed obstacle looks per stage, flying swarms to duck under, hit/victory/idle poses.  
6. **Installable builds** — EAS, so the game can leave Expo Go.  

Stage timing rules stay in [STAGE_DESIGN.md](./STAGE_DESIGN.md).

## Success looks like

- Someone can open the repo, run Expo, and play Stage 1 on a phone in minutes.  
- A novice can find “where gravity lives” and change it safely.  
- Stages 2–4 feel distinct (look, sound, challenge) without rewriting the core loop.  
- Learning and fun stay ahead of premature engine abstraction.
