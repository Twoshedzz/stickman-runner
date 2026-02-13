# Stage design rules (Stickman Runner)

This doc sets **high-level rules** for how stages work. Use it when adding stages or changing game logic so the game and audio stay in sync and the structure stays consistent.

---

## Core rules

1. **Each stage lasts 3 minutes (180 seconds) of real time.**  
   The stage ends when 3 minutes have elapsed, not when the player reaches a distance target. This keeps the stage in sync with the 3-minute soundtrack.

2. **Each stage has exactly one soundtrack.**  
   The track is 3 minutes long. When the stage is done, the music and the “run” end together.

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

All of these are **keyed to stage progress** (0 → 1 over 3 minutes). Progress comes from **elapsed real time** (e.g. `progress = elapsedSeconds / 180`), not from distance or frames, so they stay in sync with the audio.

---

## Why this matters for audio and performance

- **expo-audio** (replacing expo-av) is used for stage music.
- If the game used **distance** or **frame count** to decide “stage complete”, then on a slow device (e.g. Vercel web) fewer frames run per second, so the run would feel longer than 3 minutes and the music would end too early (out of sync).
- By tying **stage duration and progress to real time** (and optionally to the audio position), the stage always lasts 3 minutes and stays in sync with the soundtrack.

---

## Implementation notes

- **Stage duration constant:** e.g. `STAGE_DURATION_SECONDS = 180` in constants.
- **In the game loop:** Track `stageStartTime` (real timestamp) and compute  
  `stageProgress = (Date.now() / 1000 - stageStartTime) / STAGE_DURATION_SECONDS`.  
  Stage complete when `stageProgress >= 1`.
- **Distance / scrolling:** Can be derived from `stageProgress` (e.g. `distance = stageProgress * courseLength`) so visuals match the 3-minute run.
- **Obstacles / events:** Spawn and trigger from `stageProgress` (or from a distance that is itself derived from progress) so they stay aligned with the music and sky.

---

## Difficulty segments (30-second ramping)

Stages can define **difficulty segments** so the run starts easier and gets harder over time. Each segment is a time window (seconds from stage start) with optional overrides:

- **`spawnRate`** (ms) – Higher = fewer obstacles (easier). Lower = more frequent (harder). Base value is in `stage.difficulty.spawnRate`.
- **`allowDoubleSpawns`** – Turn doubles off for the first 30–60s, then on.
- **`allowedObstacles`** – Restrict or expand types per segment (e.g. no boulders at the start).

**Where to edit:** `src/game/stages.ts` → the stage’s `difficultySegments` array. Segments are checked in order; the first one that contains the current `elapsedSecInStage` wins. Use `endSec: 9999` for “to end of stage”.

**Example (Neon City):** 0–30s easy (spawnRate 2200, no doubles), then 30s steps ramping to 1100 ms and doubles allowed from 60s onward.
