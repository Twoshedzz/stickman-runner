# Stickman Runner – Project plan

This document is the **single place** for implementation and project plans: what's done, what's
being worked on now, and what's left before the game is finished.

Read [CONTEXT_FOR_AGENTS.md](./CONTEXT_FOR_AGENTS.md) first if you're new (human or AI). For how the
game works today see [ARCHITECTURE.md](./ARCHITECTURE.md); for why it's shaped this way see
[HISTORY.md](./HISTORY.md).

**Work in step order.** Each step is small enough to test on the phone before moving on.

*Last updated 24 October 2026.*

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

**Current focus:** the gameplay pass (§4). Steps 0–4 and 6 are done (step 4's rework still to be
tried on the phone). From player feedback (24 October): the pause button (step 5) is done; holes
in the floor (step 7) are next, then a rethink of how obstacles are sequenced (step 8).

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
5. **Obstacles stay abstract** — blocks, spheres, bars and (step 7) holes, coloured per stage.
   Drawn obstacle art is parked (§7).
6. **Casual, not manic.** Engagement comes from rhythm and rewards, not from making it harder.
7. **No new sound effects.** The soundtrack is the only audio — pickups and feedback are visual.
8. **The game ends after stage 4** with a win screen and best-runs table.
9. **Menus are screens of their own**, not pop-ups over the game, in an 80s arcade style: chrome
   and neon logo, Tron-style grid, arcade menu items with blinking arrows. Lettering is Audiowide
   (headings) and Orbitron (smaller text). The colour palette stays as it is.
10. **One public world scoreboard**, arcade style: three initials, a score, the date. No accounts
    and nothing personal (children play this). The game works fine without it.
11. **One running level.** The runner stays on the ground line: no platforms to land on, no
    stairs, no climbing. A player suggested them; Pete prefers the one-level simplicity
    (24 October). Holes in the floor (step 7) keep to this.

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

### What players said (24 October)

From a tester, with Pete's take on each:

| Feedback | Pete's view | Where it went |
|---|---|---|
| Good fun | — | — |
| Add a pause button | Important | Step 5, done |
| Harder sooner? The first two stages are samey | Valid | Step 8 |
| More obstacle types: holes? | Yes: a circle in the grid | Step 7 |
| Jump and land on things? Go higher? Maybe later | Not keen: likes the one level | Decision 11 |
| Stairs? | Not keen, as above | Decision 11 |

Pete also wants a proper look at how obstacles are sequenced (step 8).

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

**Step 4 — something to do between obstacles.** ✅ Done; reworked 23 October after the first
phone test. All in `src/game/pickups.ts`; the spawner lays the trails as it places each pattern.
- **Small glowing diamonds in each stage's colours**: a pale core in the stage's horizon colour
  (`pickupColors` in `stages.ts`). The glow is two see-through circles, not a blur, which is
  heavy on web. Silent: collecting one sends a few sparks to the score.
- **Every stage:** arcs tracing a jump over a block (a well-timed jump collects the whole arc,
  running underneath none), and trails along the ground in the rests.
- **Stage 2 on — hops:** some rests get an arc floating in mid-air instead of a ground trail,
  for an extra jump between obstacles. Only where there's room to land in time for the next one.
- **Stage 3 on — double arcs:** some block arcs trace a jump and double jump, so a plain jump
  only reaches the bottom and the top costs half the energy bar. Only where nothing comes
  before the runner is down again.
- How often each turns up is `pacing.pickups` in `stages.ts`. Stage 1 has none of either; in
  stages 2–4 roughly 15–19 hops a stage, and in stages 3–4 roughly 10–15 double arcs.
- Every path is traced from the real jump physics frame by frame, so it matches the jump
  exactly at any speed.
- **Streak:** every obstacle cleared without a hit adds one; a hit resets it (in debug mode
  too). ×2 / ×3 / ×4 at 10 / 25 / 50, applied to everything that scores. The multiplier and
  streak count show under the score in the stage's pickup colour, and a burst marks each new level.
- Small changes to scoring: a missed heart no longer scores a point, and an obstacle brushed
  during the safe second after a hit doesn't count.
- **Scores are much bigger now** (pickups score, and the multiplier), so best runs from before
  are easy to beat.
- **How to Play is two pages** (controls and obstacles, then pickups and streak). Turn the page
  with the cyan arrows, a sideways swipe on a phone, or ← → on a keyboard.
- To check on the phone: stage 4's pink diamonds against the lit city windows.
- To tune: `TRAIL_SPACING_SEC`, `ARC_CHANCE`, `TRAIL_CHANCE` and `STREAK_LEVELS` in `pickups.ts`.

**Step 5 — a pause button.** ✅ Done 24 October, not yet tried on the phone.
The rules are in `src/game/pause.ts`.
- **Pausing:** a round button with two bars at the top in the middle, or P / Esc on a keyboard.
  It only shows while a stage is being played, and tapping it doesn't also jump.
- **What stops:** everything, including the stage clock and the music. When play carries on, the
  stage's start time moves on by the time spent paused, so the music and the sky stay in step.
- **The PAUSED screen:** the stage, the score, and RESUME, HOW TO PLAY and QUIT. QUIT goes back to
  the title, and the run isn't added to the best runs.
- **Resuming:** a big 3-2-1 over the frozen game. The music restarts in the RESUME tap itself
  (iPhone Safari only allows that), rewound 3 seconds, so it plays through the count and is back
  where it stopped as the run carries on. Paused in the first seconds of a track, the music
  waits the difference instead.
- **Switching away** (another app, the phone locked, pulling down Control Centre) pauses a run,
  so coming back lands on the PAUSED screen. A 3-2-1 that was counting goes back to plain paused.
- Jumps, ducks and the keyboard do nothing while paused.

**Step 6 — feel and forgiveness.** ✅ Done.
- Jump buffering: a tap up to 0.12 sec before landing still jumps on landing.
- Double jump costs half the bar, so a full bar gives two.
- After a hit: the runner blinks, a short pink flash, and 1 sec safe from further hits.

**Step 7 — holes in the floor.** Not started.
A new obstacle: a circle cut into the grid, seen in perspective as a dark ellipse with a glowing
rim in the stage's colours. Jump over it. It keeps to one running level (decision 11).
- **What happens if you don't jump:** a hit, like any other obstacle (health lost, the blink and
  the safe second), not a fall to your death. Casual, not manic (decision 6).
- **How it's detected:** by the runner's feet being on the ground over the hole, not by boxes
  overlapping like the other obstacles. Ducking doesn't help.
- **Size:** set against the jump, like the blocks: up to about 90px is one jump. A wide hole
  that needs a double jump could follow, the way the wide block does.
- **Where it first appears:** stage 2, so that stage brings something new (step 8).
- **Wiring:** a new role in `obstacleCatalogue.ts`, its own gap rules and patterns in
  `patterns.ts` (a hole, hole then block, bar then hole, …), drawing in the grid's perspective,
  pickup arcs over it, a row on How to Play, and the bot test proving every pattern can still
  be cleared.

**Step 8 — obstacle sequencing: less samey, and harder sooner.** Not started.
Takes in the old step 5 (calm and busy sections that follow the music). The feedback is that the
first two stages feel easy and alike; Pete also wants a look at how obstacles follow each other.
- **Look first:** a script that lists, for each stage, which patterns come up, how often, what
  follows what, and how long the rests are, to see the sameness in numbers before changing it.
- **Each stage its own character:** a few patterns it leans on, and something new to learn:
  holes in stage 2, double-jump pickups in stage 3, and so on. Today stages 1 and 2 draw from
  much the same mix.
- **Teach, then combine:** a new obstacle first appears alone and with room to spare, then in
  patterns with others.
- **Fewer repeats:** don't pick the same pattern twice running, or the same few too often.
- **Harder sooner in stage 2:** a quicker budget ramp and shorter rests early on; stage 1 was
  already retuned on 23 October.
- **Calm and busy sections that follow the music:** a short intensity list per track (warm-up,
  waves, breather, finale) that scales the budget, so the hard stretches land on the music's
  big moments.

### How each step is checked

- `npx tsc --noEmit` clean, `npx expo lint` no worse, and `npm test` passing (142 tests).
- `npm test` runs a bot that plays the real jump and duck physics with human-sized timing,
  against every pattern at the slowest, middle and fastest speeds and full generated runs of
  every stage. It also checks the held duck and that the finish line arrives on time.
- `pickups.test.ts` plays the arcs, hops and double arcs with timing a little early and late at
  every speed, checks none of them costs a hit, that no pickup sits inside an obstacle across
  whole stages, and the streak rules.
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
  locked). Coming back lands on the PAUSED screen during a run (step 5); RESUME carries on.
- To pick up a new version, fully close the home screen app from the app switcher and reopen it.
  Only a new icon needs the icon removing and re-adding.
- Home screen apps can hold on to an old copy: if a change doesn't show, remove the icon and add it
  again.

**Route 2 — a real app via EAS.** Not started. Needs the Apple Developer Program ($99/year) to
install via a link or TestFlight. Before building: a proper display name, icon and splash screen
for the native app (still Expo's defaults), and the exact commands in `docs/RELEASE.md`.

### World scoreboard

One public top 10 for everyone who plays, on the web or in the phone app (decision 10).

- **In the game:** a run that makes the top 10 asks for three initials, arcade style (tap ▲ ▼ or
  swipe a letter; on a keyboard, type). SKIP leaves it off. Then the board appears with that
  entry lit up, before Game Over or Finished. WORLD SCORES on the title and Game Over menus
  opens it any time, and the title's attract mode shows it between the logo and the best runs.
- **No signal:** the score is kept on the phone and sent next time the board can be reached.
- **Server:** `api/scores.ts`, a small Vercel function next to the site, keeping scores in an
  Upstash Redis database. The rules (three letters, a short rude-word list, the highest possible
  score) are in `src/scoreboard/rules.ts` and are checked on both sides. One address can send
  at most 10 scores in 10 minutes.
- **Cheating:** anyone determined could still send a made-up score below the limit. Delete it
  by hand (below). Fine for a family game.
- **New season:** bump `SEASON` in `src/scoreboard/rules.ts` when scoring changes a lot. The
  board starts empty; the old one stays in the database.

**Setting it up (once, needs Pete's Vercel login):**
1. In the Vercel dashboard, open the stickman-runner project → **Storage** (or the
   Marketplace) → add **Upstash for Redis** (the free plan) and connect it to the project.
   This gives the project the database's address and password as settings.
2. Redeploy (push, or Redeploy in the dashboard): settings only reach new deployments.
3. Check https://stickman-runner-twoshedzzs-projects.vercel.app/api/scores shows
   `{"season":1,"entries":[]}`. "not set up" means step 1's settings are missing; a 404 or the
   game's page means the function wasn't deployed.

Until then the server answers "not set up" and the game simply leaves the world board out.

**Removing an entry:** in the Upstash console, open the database's Data Browser, find the key
`stickman:scores:season1`, and delete the line.

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
| Gameplay step 4: pickups and streak | ✅ Done; to try on the phone |
| Gameplay step 6: feel and forgiveness | ✅ Done |
| Gameplay step 5: pause button | ✅ Done; to try on the phone |
| Gameplay step 7: holes in the floor | ⏭️ Next |
| Gameplay step 8: obstacle sequencing and music sections | Not started |
| Web `Aborted()` crash | ✅ Fixed |
| iPhone: home screen web app | ✅ Working |
| iPhone: real app via EAS | Not started |
| World scoreboard | ✅ Live (§6) |
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
