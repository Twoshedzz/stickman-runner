# Stage design rules (Stickman Runner)

This doc sets **high-level rules** for how stages work. Use it when adding stages or changing game logic so the game and audio stay in sync and the structure stays consistent.

---

## Core rules

1. **Each stage lasts as long as its music: about 3 minutes of real time.**  
   The stage ends when that time has elapsed, not when the player reaches a distance target. Every track is 3 minutes long but most end with a few seconds of fade or silence, so each stage's `durationSec` is where its music actually ends (174–180 seconds).

2. **Each stage has exactly one soundtrack.**  
   When the stage is done, the music and the “run” end together.

3. **Stage progress is driven by real time, not by frame count or distance.**  
   So if the app runs slowly (e.g. on web), the stage still finishes when the music finishes. Visual distance / scrolling can be derived from elapsed time so everything stays in sync.

---

## What each stage defines

For each stage we decide:

- **Sky colours** – How the sky looks over the 3 minutes (e.g. sunset → night → dawn).
- **Background and foreground** – Parallax or static art (effect only; no collision).
- **Visual enhancements** – e.g. city lights, moon, moon-on-water, particles.
- **Obstacle types** – Which obstacles appear in this stage.
- **Power-ups** – e.g. hearts, double-jump pickups.

All of these are **keyed to stage progress** (0 → 1 over the stage). Progress comes from **elapsed real time** (`progress = elapsedSeconds / durationSec`), not from distance or frames, so they stay in sync with the audio.

---

## Why this matters for audio and performance

- **expo-audio** (replacing expo-av) is used for stage music.
- If the game used **distance** or **frame count** to decide “stage complete”, then on a slow device (e.g. Vercel web) fewer frames run per second, so the run would feel longer than the music and the music would end too early (out of sync).
- By tying **stage duration and progress to real time**, and nudging the stage clock gently towards where the music actually is (`src/game/musicSync.ts`, never more than 0.1 sec per second), the stage lasts exactly as long as its track and stays in sync with it, even after pauses.

---

## Implementation notes

- **Stage duration:** each stage's `durationSec` in `src/game/stages.ts`.
- **In the game loop** (`src/game/loop/useGameLoop.ts`): Track `stageStartTime` (real timestamp) and compute  
  `stageProgress = (Date.now() / 1000 - stageStartTime) / durationSec`.  
  Stage complete when `stageProgress >= 1`. A pause moves `stageStartTime` on by the time spent paused.
- **Distance / scrolling:** Can be derived from `stageProgress` (e.g. `distance = stageProgress * courseLength`) so visuals match the 3-minute run.
- **Obstacles / events:** Spawn and trigger from `stageProgress` (or from a distance that is itself derived from progress) so they stay aligned with the music and sky. Obstacles also reach the runner on the music's beat (`beat` in `stages.ts`).
- **Speed:** the world's speed rises through the stage (`speed` in `stages.ts`) without changing its length: the clock decides when it ends, not how far the runner has gone.

---

## How a stage gets harder (pacing)

Stages start easier and get harder over time. The spawner picks whole **patterns** of obstacles (`src/game/patterns.ts`), and each stage's `pacing` in `src/game/stages.ts` decides which ones it may pick and when. Pairs are `[start of stage, end of stage]`, blended smoothly in between:

- **`budget`** – The most demanding pattern allowed (1 = single obstacles only). Rises through the stage.
- **`rest`** – Seconds of breathing space after each pattern. Shrinks through the stage.
- **`unlocks`** – When each obstacle first turns up, as a share of the stage (0 = from the start, 0.5 = halfway). A new obstacle comes on its own for a while before it's mixed with others.
- **`favour`** – Patterns this stage leans on, which gives it a character of its own.
- **`hearts`** and **`pickups`** – How generous the hearts are, and how much the glowing pickups ask of you.

**Where to edit:** the stage's `pacing` in `src/game/stages.ts`. Gaps are in seconds, so they stay fair at any speed. After a change, `npm test` checks every pattern can be got through, and `npm run difficulty` measures how hard each stage now is ([DIFFICULTY.md](./DIFFICULTY.md)).
