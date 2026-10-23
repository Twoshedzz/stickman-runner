# Stickman Runner – Project plan

This document is the **single place** for implementation and project plans: what's done, what's
being worked on now, and what's left before the game is finished.

Read [CONTEXT_FOR_AGENTS.md](./CONTEXT_FOR_AGENTS.md) first if you're new (human or AI). For how the
game works today see [ARCHITECTURE.md](./ARCHITECTURE.md); for why it's shaped this way see
[HISTORY.md](./HISTORY.md).

**Work in step order.** Each step is small enough to test on the phone before moving on.

*Last updated 23 October 2026 (evening).*

---

## 1. Where we are

All four stages are playable end to end. Each has its own scenery, music, colours and a slow
3-minute arc of its own, and the game has a full set of 80s-arcade menu screens.

| Stage | Scenery | Its arc over 3 minutes |
|-------|---------|-------------|
| 1 Neon City | city strips, windows light up and fade | dusk → night → dawn; lights linger into the sunrise |
| 2 Sunset Beach | sea, palms, waves washing the sand | sunrise: the sun climbs from a sliver, its light on the water widens |
| 3 Midnight Mountains | ridges, pines, moon | a mountain pass: peaks rise to a summit mid-stage, the moon crosses the sky |
| 4 Victory Dawn | city, street lamps, fireworks | evening into night: sunset, lamps at dusk, fireworks, moonrise at the finish |

The names stay as they are, even though stage 2 is now a sunrise and stage 4 ends at night
(Pete, 23 October).

**Playable on an iPhone** as a home screen web app (see §6), as well as in Expo Go.

**Current focus:** the gameplay pass (§4). Steps 0–3 and 6 are done; steps 4 and 5 are next.

---

## 2. Decisions locked in

Don't re-open these without a reason — a lot depends on them.

1. **Duck = swipe down, and hold to stay down.** Tap anywhere jumps. On a keyboard, ↓ or S ducks
   and holding the key keeps you down.
2. **World speed rises gently through each stage**, and each stage starts a little faster than the
   last. Stages still end on the 3-minute clock, so music and sky stay in sync.
3. **Art = silhouette + lit overlay** for scenery strips.
4. **Every stage has its own slow arc** over its 3 minutes (§1), more subtle than stage 1's
   dusk-to-dawn.
5. **Obstacles stay abstract** — blocks, spheres and bars, coloured per stage. Drawn obstacle art is
   parked (§7).
6. **Casual, not manic.** Engagement comes from rhythm and rewards, not from making it harder.
7. **No new sound effects.** The soundtrack is the only audio — pickups and feedback are visual.
8. **The game ends after stage 4** with a win screen and best-runs table.
9. **Menus are screens of their own**, not pop-ups over the game, in an 80s arcade style: chrome
   and neon logo, Tron-style grid, arcade menu items with blinking arrows. Lettering is Audiowide
   (headings) and Orbitron (smaller text). The colour palette stays as it is.

---

## 3. The numbers everything is tuned against

| Quantity | Value | Where it comes from |
|---|---|---|
| World speed | 260→300 / 280→320 / 300→340 / 320→360 px/sec for stages 1–4 | `speed` in `stages.ts` |
| Jump airtime | 0.67 sec | `JUMP_FORCE` −12, `GRAVITY` 0.6 |
| Jump peak height | 120 px | |
| Duck | 0.55 sec for a quick swipe; held, it lasts until 0.15 sec after letting go | `DUCK_DURATION_SEC`, `DUCK_RELEASE_SEC` |
| Double jump cost | half the energy bar | `JUMP_ENERGY_COST` 50 of `MAX_ENERGY` 100 |
| Energy refill while grounded | 3.3 sec | `ENERGY_REGEN`, time-based |
| Stage length | 180 / 174 / 176 / 178 sec for stages 1–4: each ends when its music does | `durationSec` in `stages.ts` |

---

## 4. The gameplay pass (current work)

### What the research said

The common thread for a **casual** runner: engagement comes from **rhythm and rewards**, not
danger. Chrome Dino (speed creeps up), Canabalt (forgiving timing), Alto's Adventure (pickup
trails, gentle failure), Bit.Trip Runner (obstacles on the beat), Sayonara Wild Hearts and
Melody's Escape (calm and busy sections follow the music), Subway Surfers (trails show the path).

### The steps

**Step 0 — finish the work in progress.** ✅ Done.

**Step 1 — obstacle patterns and difficulty budget.** ✅ Done.
~14 hand-made patterns (`src/game/patterns.ts`), a budget that rises through each stage, rests
between patterns, and per-obstacle unlock points (`pacing` in `stages.ts`). Gaps are in seconds,
so they stay fair at any speed.

*Tuned 23 October:* stage 1 is harder sooner — duck bars from about 11 seconds in, a faster ramp,
42 → 50 obstacles a minute — balanced by **more hearts early on**. Each stage now sets its own
heart generosity (`pacing.hearts`): stage 1 the most generous, stage 4 the least.

**Step 2 — a gentle speed rise.** ✅ Done.

**Step 3 — put the obstacles on the beat.** ✅ Done.
- Each track's tempo and first beat were measured by analysing the audio, and live in `beat` in
  `stages.ts`: Neon City 75.2 BPM, Sunset Beach 80.2, Midnight Mountains and Victory Dawn 100.2.
- Every obstacle reaches the runner on the half-beat grid (about every 0.3–0.4 sec), except the
  second of a tight pair, which is deliberately close behind the first. A test checks this.
- The ground line pulses on every beat.

**Step 4 — something to do between obstacles.** Not started.
Silent neon pickups in trails (along the ground and tracing jump arcs), and a streak multiplier
(×2 / ×3 / ×4 at 10 / 25 / 50 clean obstacles; a hit resets it).

**Step 5 — calm and busy sections that follow the music.** Not started.
A short intensity list per track (warm-up, waves, breather, finale) that scales the step 1 budget.

**Step 6 — feel and forgiveness.** ✅ Done.
- Jump buffering: a tap up to 0.12 sec before landing still jumps on landing.
- Double jump costs half the bar, so a full bar gives two.
- After a hit: the runner blinks, a short pink flash, and 1 sec safe from further hits.

### How each step is checked

- `npx tsc --noEmit` clean, `npx expo lint` no worse, and `npm test` passing (90 tests).
- `npm test` runs a bot that plays the real jump and duck physics with human-sized timing,
  against every pattern at the slowest, middle and fastest speeds and full generated runs of
  every stage. It also checks the held duck and that the finish line arrives on time.
- Then played on the phone — Pete and his son are the real test.

---

## 5. Done since the gameplay pass began

**Controls and feel**
- Swipe down **and hold** to stay ducked; keyboard ↓/S the same.
- The stage name ("STAGE 1 · NEON CITY") shows for 5 seconds at the start of each stage, then fades.

**Look**
- **New menu screens** (decision 9): title with attract mode (logo and best runs take turns) and
  HI-SCORE, How to Play with each obstacle drawn as its real shape, Stage Clear, Game Over (with
  NEW HI-SCORE!), Finished with the best-runs table, and a loading screen with ZX Spectrum
  loading stripes. All in `src/components/menu/`.
- The logo and menu backdrop are drawn by `scripts/generate-menu-art.js`; re-run it after changing
  colours or layout.
- **Stage arcs** for stages 2–4 (§1).
- **Sunset Beach:** sea and sand clearly different colours, waves washing up the sand, a slow
  twinkle on the water, palms set back from the surf.
- **Neon City:** the lights linger into the sunrise (start going out at 2:30, last ones at the
  finish), and go out building by building at scattered times rather than all at once.
- **Sunset Beach:** the hills became low cloud streaks (bumpy-topped nearer ones, flat stripes by
  the horizon), and the light on the water is as wide as the sun showing above the sea.
- **Stage length matches the music.** Every track is 3:00 long but most end in a few seconds of
  fade or silence, so each stage now ends where its music does (§3).
- **CONTINUE goes straight to the next stage** (no second-long glimpse of the old one).
- **Home screen icon** redrawn: a white runner in a full sprint with speed streaks.

**Web and iPhone**
- The web `Aborted()` crashes were a memory leak in Skia's web renderer; fixed with a patch. See
  [WEB_PATCHES_AND_ARCHITECTURE.md](./WEB_PATCHES_AND_ARCHITECTURE.md).
- Music downloads in full before a stage starts, with a progress bar; later stages' music
  downloads in the background, and CONTINUE waits for it.
- Tap to jump works in browsers (the HUD layer was swallowing every tap).
- Obstacles slide off the edge of wide screens instead of vanishing early.

---

## 6. Playing on an iPhone

**Route 1 — home screen web app.** ✅ Working.
Open **https://stickman-runner-twoshedzzs-projects.vercel.app** in Safari, then Share → Add to
Home Screen. It opens full screen, edge to edge, with its own icon and name.

- Vercel Authentication (Deployment Protection) is **off** on the project, so the link opens
  without a login. `stickman-runner.vercel.app` is someone else's project — don't use it.
- Phone browsers fill the screen (desktop keeps a 600×350 preview), use one touch handler for tap
  and swipe, keep the score and health clear of the notch, and ask you to turn the phone sideways
  when it's upright.
- iPhone Safari only lets music start during a tap, so START, CONTINUE and PLAY AGAIN start it
  directly. Other tracks are "unlocked" on later taps, never on the START tap itself (that made
  stage 1 silent). If Safari still refuses, the next tap starts the music.
- The game and its music **pause while the app is in the background** (another app, phone
  locked) and carry on where they left off.
- To pick up a new version, fully close the home screen app from the app switcher and reopen it.
  Only a new icon needs the icon removing and re-adding.
- Home screen apps can hold on to an old copy: if a change doesn't show, remove the icon and add it
  again.

**Route 2 — a real app via EAS.** Not started. Needs the Apple Developer Program ($99/year) to
install via a link or TestFlight. Before building: a proper display name, icon and splash screen
for the native app (still Expo's defaults), and the exact commands in `docs/RELEASE.md`.

---

## 7. Still to do after the gameplay pass

### Sky timeline tidy-up

Stage 1's sky runs on absolute distances plus stage-1-only special cases in `getTheme`
(`GameCanvas.tsx`); stages 2–4 now use the same timeline plus their own scenery code. Tidying it
into fractions of the stage is optional; compare stage 1 before and after if it's done.

### Drawn obstacles (parked)

The line art in `assets/obstacle-art/` was reverted to plain shapes: its line weight didn't match
the grid, and small objects didn't stand out. The SVGs and generator are kept. Hearts are still
circles, not heart shapes.

### Tuning

| Area | What to check |
|---|---|
| Damage | Do 2–3 hits feel right? Should later stages hit harder? |
| Speed | Each stage's start and end speed are two numbers in `stages.ts` |
| Arcs | Timings in each scenery file (e.g. when stage 4's lamps and fireworks start) |
| Colours | Stage 2's moving sphere (`#c86090`) is close to the heart pink |

### Stickman

The run cycle reads as stiff — better poses or easing between them. Then landing, hit, victory and
idle poses.

---

## 8. Cleanup backlog

Not urgent, but each one removes a trap:

- [x] `DEBUG_ENABLED` tied to `__DEV__`.
- [x] One table of obstacle sizes, colours and damage (`obstacleCatalogue.ts`).
- [x] The old pop-up menu styles in `GameScreen.tsx` removed with the menu redesign.
- [ ] Delete dead scenery code: `NeonCityBackground.tsx`, `CityStripBackground.tsx` and
      `SynthwaveBeachBackground.tsx` are no longer used.
- [ ] Delete the city PNGs only those dead files used: the old brightness strips (`back_all_*`,
      `back_some*`, `front_all_*`, …) and placeholders (`back_no`, `front_no`, `placeholder`).
      Keep the `*_none_*` strips and `assets/city/lights/`.
- [ ] Remove unused packages: `expo-av`, `expo-haptics`, `expo-image`, `expo-symbols`,
      `expo-web-browser`, `@react-navigation/bottom-tabs`.
- [ ] Fix the one lint error (missing display name in `ScoreDisplay.tsx`) and the 10 warnings.
- [ ] `PLAYER_X` is defined twice — in `constants.ts` and again in `GameCanvas.tsx`.
- [ ] The debug panel still shows "Segment: N (30s each)", left over from the old spawner.
- [ ] The game loop re-renders every frame even on menu screens.
- [ ] On web the scene is recorded twice per screen refresh.

---

## 9. Summary

| Area | Status |
|---|---|
| Four stages: scenery, music, colours, each with its own arc | ✅ Done |
| Duck mechanic, including hold to stay down | ✅ Done |
| Menu screens: title, How to Play, Stage Clear, Game Over, Finished, loading | ✅ Done (80s arcade style) |
| Gameplay step 1: obstacle patterns, budget, hearts | ✅ Done; stage 1 retuned |
| Gameplay step 2: speed rise | ✅ Done |
| Gameplay step 3: obstacles on the beat | ✅ Done |
| Gameplay step 6: feel and forgiveness | ✅ Done |
| Gameplay steps 4–5: pickups and streak, music sections | ⏭️ Next |
| Web `Aborted()` crash | ✅ Fixed |
| iPhone: home screen web app | ✅ Working |
| iPhone: real app via EAS | Not started |
| Tuning, stickman poses | Not started |
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
