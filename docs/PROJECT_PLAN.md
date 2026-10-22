# Stickman Runner – Project plan

This document is the **single place** for implementation and project plans: what's done, what's
being worked on now, and what's left before the game is finished.

Read [CONTEXT_FOR_AGENTS.md](./CONTEXT_FOR_AGENTS.md) first if you're new (human or AI). For how the
game works today see [ARCHITECTURE.md](./ARCHITECTURE.md); for why it's shaped this way see
[HISTORY.md](./HISTORY.md).

**Work in step order.** Each step is small enough to test on the phone before moving on.

*Last updated 22 October 2026.*

---

## 1. Where we are

All four stages are playable end to end, each with its own scenery, music and colours, and the game
has a proper ending.

| Stage | Scenery | Music | Time of day |
|-------|---------|-------|-------------|
| 1 Neon City | ✅ city strips, windows light up and fade | ✅ `neoncity.mp3` | dusk → dawn |
| 2 Sunset Beach | ✅ sea, palms, sun reflection | ✅ `synthwavebeach.mp3` | sunset |
| 3 Midnight Mountains | ✅ ridges, pines, moon | ✅ `midnightmountains.mp3` | midnight |
| 4 Victory Dawn | ✅ city at sunrise, animated fireworks | ✅ `victorydawn.mp3` | dawn |

Also working: jump, double jump, **duck** (swipe down, or ↓/S on web), overhead bars, a perspective
finish line, a **FINISHED** screen after stage 4 with a best-runs table, and accurate HOW TO PLAY
instructions.

**Current focus: the gameplay pass (§4).** The game looks finished; the job now is making it *play*
well — a casual, lean-back synthwave runner with more pace and more to do.

---

## 2. Decisions locked in

Don't re-open these without a reason — a lot depends on them.

1. **Duck = swipe down.** Tap anywhere still jumps.
2. **World speed rises gently through each stage**, and each stage starts a little faster than the
   last. *(Changed 22 October 2026 — it used to be fixed. Agreed with Pete as part of the gameplay
   pass.)* Stages still end on the 3-minute clock, so music and sky stay in sync whatever the speed.
3. **Art = silhouette + lit overlay.** A dark shape per scenery strip, plus a matching lit layer faded
   on top.
4. **Each stage is its own time-of-day vignette.** Only stage 1 runs dusk → dawn.
5. **Obstacles stay abstract** — blocks, spheres and bars, coloured per stage. The drawn obstacle art
   is parked (see §7).
6. **Casual, not manic.** Engagement comes from rhythm and rewards, not from making it harder.
7. **No new sound effects.** The soundtrack is the only audio — pickups and feedback are visual.
8. **The game ends after stage 4** with a win screen and best-runs table (no endless loop for now).

---

## 3. The numbers everything is tuned against

| Quantity | Value | Where it comes from |
|---|---|---|
| World speed | 260→300 / 280→320 / 300→340 / 320→360 px/sec for stages 1–4 | `speed` in `stages.ts` |
| Jump airtime | 0.67 sec | `JUMP_FORCE` −12, `GRAVITY` 0.6 |
| Jump peak height | 120 px | |
| Duck length | 0.55 sec | `DUCK_DURATION_SEC` |
| Double jump cost | the whole energy bar | `JUMP_ENERGY_COST` = `MAX_ENERGY` = 100 |
| Energy refill while grounded | 3.3 sec | `ENERGY_REGEN`, time-based |
| Stage length | 180 sec | `STAGE_DURATION_SECONDS` |

For comparison, Chrome's dinosaur game starts at 360 px/sec — our fastest point.

---

## 4. The gameplay pass (current work)

### What the research said

Pete asked for research into running/jumping/ducking games to see what we were missing. The common
thread for a **casual** runner: engagement comes from **rhythm and rewards**, not danger.

| Game | What it does well | What we take |
|---|---|---|
| Chrome Dino | Speed creeps up to a cap; gaps grow with speed | Gentle speed rise; gaps timed in seconds |
| Canabalt | One button, forgiving timing | Accept a tap slightly early |
| Alto's Adventure | Relaxing *and* engaging: pickup trails, simple combos, gentle failure | Optional things to do, not more danger |
| Bit.Trip Runner | Obstacles placed on the beat | Obstacles arrive on the beat |
| Sayonara Wild Hearts | Challenge follows the song; failure never breaks the rhythm | Calm and busy sections follow the track |
| Melody's Escape | Quiet music = calm, loud = intense | An intensity map per track |
| Subway Surfers | Pickup trails show you the path | Trails that trace the jump arc |

### Before the pass, the game had

- A flat 240 px/sec, slower than the dinosaur game's *starting* speed.
- One obstacle every ~2.3 sec at the start of stage 1, and no ramp at all in stages 2–4.
- Nothing to do between obstacles, and a score that barely varied between players.
- Obstacles at random moments, ignoring the music.

### The steps

**Step 0 — finish the work in progress.** ✅ Done.
Duck pose planted on the ground, perspective finish line, win screen and best-runs table, accurate
instructions.

**Step 1 — obstacle patterns and difficulty budget.** ✅ Done.
Obstacles now come as ~14 hand-made patterns (`src/game/patterns.ts`): "bar then block", "three
hops", "two blocks close enough for one jump", and so on. Each stage has a **budget** that rises
through the three minutes, a **rest** after each pattern, and a point where each obstacle first
**unlocks** (`pacing` in `stages.ts`). Gaps are in seconds, so they stay fair at any speed. Hearts are
placed when you're hurt rather than at random. The wide block only appears when the energy bar is
full.

Result: stage 1 now runs 32 → 45 obstacles a minute (was 26 → 40); stages 2–4 run 45–51 with harder
combinations mixed in (was a flat 37).

**Step 2 — a gentle speed rise.** ✅ Done.
See decision 2 and §3. Grid, scenery, obstacles and the runner's legs all speed up together; the sky
and music still follow the clock. The finish line still meets the runner as the music ends.

**Step 3 — put the obstacles on the beat.** ⏭️ Next.
- Measure each track's tempo and first beat once (decoding the MP3s in a browser — no new tools), and
  store them in `src/hooks/musicTracks.ts`.
- Schedule each pattern so its obstacles **reach the runner on a beat**; write pattern spacing in
  beats rather than seconds.
- The pink grid line brightens briefly on each beat (`GridFloor.tsx`).

**Step 4 — something to do between obstacles.** Not started.
- **Neon pickups** in short trails along the ground and in arcs that trace a jump. Collecting one is
  **silent** — a sparkle and a pulse of the counter.
- **Streak multiplier:** ×2 / ×3 / ×4 at 10 / 25 / 50 obstacles cleared without a hit; a hit resets
  it. Shown next to the score.
- Score = pickups + obstacles passed, × the multiplier, so the best-runs table is worth chasing.

**Step 5 — calm and busy sections that follow the music.** Not started.
A short list per track of `{ from, to, intensity }` — warm-up, waves, a breather, the finale.
Intensity scales the step 1 budget: breathers are pickups only. Authored by ear against each track.

**Step 6 — feel and forgiveness.** Not started.
- **Jump buffering:** a tap up to 0.12 sec before landing still jumps on landing.
- **Double jump costs half the bar** (50), so it's usable two or three times a stage. This also
  removes the one remaining unfairness: using a double jump just before a wide block arrives.
- **Hit feedback:** a brief flash and a short safe window after a hit.
- Small visual pops for clean passes and streak milestones.

### How each step is checked

- `npx tsc --noEmit` clean, `npx expo lint` no worse, and `npm test` passing.
- `npm test` runs a bot that plays the real jump and duck physics, with human-sized timing (each move
  must also work 0.05 sec early and late). It checks every pattern at the slowest, middle and fastest
  speeds, and full generated 3-minute runs of every stage. If a change makes anything impossible, it
  fails.
- Then played on the phone — Pete and his son are the real test of "does this feel better".

---

## 5. Also fixed along the way

- **Web `Aborted()` crashes: found and fixed.** They were a memory leak in Skia's web renderer, not
  general web flakiness — memory hit its 2GB ceiling after ~7 minutes. A patch now frees each frame's
  objects; a full four-stage game levels off at ~460MB. See
  [WEB_PATCHES_AND_ARCHITECTURE.md](./WEB_PATCHES_AND_ARCHITECTURE.md).
- Obstacles off the right edge of the screen are no longer drawn.

---

## 6. Earlier phases (complete)

Kept short; the detail is in git history and [HISTORY.md](./HISTORY.md).

| Phase | What | Status |
|---|---|---|
| 0 | Blocking fixes: stage 4 freeze, music fade on quick restart, one track list, derived course length, time-based energy/particles, platform detection | ✅ |
| 1 | Ducking: swipe-down gesture, ↓/S on web, overhead bars, duck pose | ✅ |
| 2 | Obstacle sequencing | ✅ Became step 1 of the gameplay pass |
| 4 | Scenery for stages 2–4, built from generated strips with a shared loader (`useStripImages`); city lights as lit overlays | ✅ |
| 5 | Music for all four stages, preloaded so it starts in sync | ✅ |
| 6 | Ending after stage 4: win screen with best-runs table | ✅ |

---

## 7. Still to do after the gameplay pass

### Sky timeline tidy-up (old phase 3)

Stage 1's sky still runs on a long list of absolute distances in `stages.ts`, plus three
stage-1-only special cases in `getTheme` (`GameCanvas.tsx`). It works, so this is tidying rather than
a fix: express triggers as fractions of the stage (0–1) and fold the special cases in. It's the one
change that could alter how stage 1 looks, so compare side by side before and after.

### Drawn obstacles (parked)

The line art in `assets/obstacle-art/` was built, then reverted to plain blocks and spheres. Two
reasons: its line weight didn't match the grid's ~2.5px lines, and smaller objects (the dog
especially) didn't stand out. The SVGs and `scripts/generate-obstacle-art.js` are kept, so it can come
back without redrawing. Hearts are also still circles rather than heart shapes.

### Tuning

| Area | What to check |
|---|---|
| Damage | Do 2–3 hits feel right? Should later stages hit harder? |
| Health | `MAX_HEALTH` 10, `HEART_HEAL` 3 — right length for a 3-minute stage? |
| Speed | Each stage's start and end speed are two numbers in `stages.ts` — easy to nudge after phone testing |
| Colours | Stage 2's moving sphere (`#c86090`) is close to the heart pink |

### UI and stickman

- Health and energy bars, messages and instructions: readable on a small phone?
- **The run cycle reads as stiff** — better poses, more of them, or easing between them. Then
  landing, hit, victory and idle poses. The skater pose idea for stage 2 is in the backlog too.

### Installable app (EAS)

Goal: install on a phone and play without Expo Go. Set up `eas.json` profiles, build a preview with
`eas build --platform ios` (or `android`), and write the exact commands into `docs/RELEASE.md`.

---

## 8. Cleanup backlog

Not urgent, but each one removes a trap:

- [x] `DEBUG_ENABLED` tied to `__DEV__`, so the debug switch doesn't ship to players.
- [x] One table of obstacle sizes, colours and damage (`obstacleCatalogue.ts`).
- [ ] Delete dead scenery code: `NeonCityBackground.tsx`, `CityStripBackground.tsx` and
      `SynthwaveBeachBackground.tsx` are no longer used.
- [ ] Delete the city PNGs only those dead files used: the old brightness strips
      (`back_all_*`, `back_some*`, `front_all_*`, …) and the placeholders (`back_no`, `front_no`,
      `placeholder`). The `*_none_*` strips and `assets/city/lights/` are still in use.
- [ ] Remove unused packages: `expo-av`, `expo-haptics`, `expo-image`, `expo-symbols`,
      `expo-web-browser`, `@react-navigation/bottom-tabs` (none are imported anywhere).
- [ ] Fix the one lint error (missing display name in `ScoreDisplay.tsx`) and the 11 warnings.
- [ ] `PLAYER_X` is defined twice — in `constants.ts` and again in `GameCanvas.tsx`.
- [ ] The debug panel still shows "Segment: N (30s each)", left over from the old spawner.
- [ ] The game loop re-renders every frame even on the start and Game Over screens.
- [ ] On web the scene is recorded twice per screen refresh; halving that would save work.

---

## 9. Summary

| Area | Status |
|---|---|
| Four stages: scenery, music, colours | ✅ Done |
| Duck mechanic | ✅ Done |
| Ending: win screen and best runs | ✅ Done |
| Gameplay step 1: obstacle patterns and budget | ✅ Done |
| Gameplay step 2: speed rise | ✅ Done, needs phone testing |
| Gameplay step 3: obstacles on the beat | ⏭️ Next |
| Gameplay steps 4–6: pickups and streak, music sections, feel | Not started |
| Web `Aborted()` crash | ✅ Fixed (Skia memory leak) |
| Sky timeline tidy-up | Not started |
| Tuning, UI, stickman poses | Not started |
| Installable builds | Not started |
| Cleanup backlog | Partly done |

When you or an agent finishes something, update its row and tick the boxes above so this stays the
single source of truth.

---

## Related docs

- [CONTEXT_FOR_AGENTS.md](./CONTEXT_FOR_AGENTS.md) — start here
- [ARCHITECTURE.md](./ARCHITECTURE.md) — how the game works today and why
- [STAGE_DESIGN.md](./STAGE_DESIGN.md) — 3-minute stages, time-based progress, music sync
- [STAGE1_REVIEW.md](./STAGE1_REVIEW.md) — stage 1 end to end
- [WEB_PATCHES_AND_ARCHITECTURE.md](./WEB_PATCHES_AND_ARCHITECTURE.md) — the web patches, including the leak fix
- [HISTORY.md](./HISTORY.md) — past debugging and completed plans
