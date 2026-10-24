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
| 2 Sunset Beach | sea, palms, waves washing the sand | sunset: the sun sinks to a sliver, the sky darkens, the light on the water fades |
| 3 Midnight Mountains | ridges, pines, moon | a mountain pass: peaks rise to a summit mid-stage, the moon crosses the sky |
| 4 Victory Dawn | city, street lamps, fireworks | evening into night: sunset, lamps at dusk, fireworks, moonrise at the finish |

The names stay as they are, even though stage 4 ends at night (Pete, 23 October). Stage 2 went
back to a sunset on 23 October, so its name fits again.

**Playable on an iPhone** as a home screen web app (see §6), as well as in Expo Go.

**Current focus:** the gameplay pass (§4). Steps 0–7 are done and live. Step 8 (sequencing and
difficulty, measured with the pretend player) is done apart from calm and busy sections that
follow the music. Step 9 (the beat pulse) has its pulse on the floor; the bonus for landing on
the beat is next. Obstacles are now 3D and there's menu music.

---

## 2. Decisions locked in

Don't re-open these without a reason — a lot depends on them.

1. **Duck = swipe down, and hold to stay down.** Tap anywhere jumps, and from a held duck a
   swipe back up jumps too. On a keyboard, ↓ or S ducks and holding the key keeps you down.
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
- When the runner lands, the grid lines around his feet glow briefly (this replaced a line
  that pulsed on every beat, which read as an extra element).

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

**Step 5 — a pause button.** ✅ Done and live 24 October, not yet tried on the phone.
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

**Step 7 — holes in the floor.** ✅ Done 24 October, not yet tried on the phone.
A circle cut into the grid, seen in perspective as a dark ellipse with a rim lit in the stage's
colours. Jump over it. It keeps to one running level (decision 11). The rules are in
`src/game/systems/holes.ts`.
- **Falling in:** if the runner's feet come down on a hole (more than 14px inside the rim), he
  stumbles, goes back with the hole as the world carries it away, and drops through it; the
  floor in front of the hole hides him as he goes. 0.7 sec later he's put back on the running
  line, blinking through the usual safe second. It costs 3 health and the streak, like a hit.
  It only ends the run if that was the last of the health, and then only after the drop.
- **Ducking doesn't help**, and nothing can be done mid-drop. In the safe second after a hit he
  runs straight across a hole.
- **Size:** 90px across, one jump at every speed.
- **Where:** from about 35 seconds into stage 1 (moved from stage 2 on 24 October, when players
  found stage 1 too easy), then all through stages 2–4, with stage 2 leaning on them. Patterns:
  a hole, hole then block, bar then hole, hole then bar, and longer hole runs later.
- Pickup arcs go over holes too, and How to Play has a row for them (the heart there is now a
  heart shape as well).
- `holes.test.ts` checks the drop and the reset; the bot test plays every hole pattern and
  whole stages with holes in them.

**Music stays in step after a pause.** ✅ Done 24 October. Each pause and restart left the music a
little behind the game (about 0.05 sec a time in a desktop browser, likely more on iPhone), and it
added up. The stage clock now follows the music: while a stage is played it is nudged gently
towards where the music actually is (never more than 0.1 sec per second, so nothing jumps). See
`src/game/musicSync.ts`. Leaving the app mid-run also pauses the music straight away, so it no
longer plays for a moment on return to the PAUSED screen.

**Step 8 — obstacle sequencing: less samey, and harder sooner.** In progress.
Takes in the old step 5 (calm and busy sections that follow the music). The feedback is that the
first two stages feel easy and alike; Pete also wants a look at how obstacles follow each other,
and a way to make the game harder gradually without it ever becoming impossible.

*The pretend player* ✅ (24 October): `src/game/difficulty/pretendPlayer.ts` plays whole stages of
the real game like a person. For each obstacle it finds the window of moments that get past, aims
for the middle, and misses by a human amount; now and then it doesn't react at all. Three skill
levels (steady, average, beginner). `npm run difficulty` plays every stage 12 times at each level
(about 2½ minutes) and writes [DIFFICULTY.md](./DIFFICULTY.md): survival, hits, health lost and
healed, what hits most, and each obstacle's timing window. First findings:
- **Difficulty is flat for an average player:** about 5 hits a stage in all four, surviving nearly
  every time, because the hearts heal almost all of it back.
- **A beginner meets a cliff after stage 1:** survives stage 1 92% of the time, stage 2 42%,
  stages 3–4 25%. Mostly fewer hearts, not harder obstacles.
- **Nothing is impossible:** no obstacle in any run had no way through. Timing windows are about
  0.4–0.5 sec for a jump, about 1 sec for a duck (it can be held), 0.7 sec for a double jump.
- **Why the average player's line is flat:** nearly all its hits are moments of not reacting at
  all, not mistimed presses (a jump's window is wide enough that ±0.07 sec timing almost never
  misses). So for most players, how hard a stage feels comes down to how many obstacles it has.

*First tuning* ✅ (24 October), against targets of a beginner surviving about 90% / 65% / 45% /
33% of stages 1–4 and an average player being stretched by stage 4. Stage 1 unchanged; stages 2–4
have shorter rests and a steeper budget, and hearts that thin out step by step instead of all at
once after stage 1. From 12 runs each:

| Survives | Stage 1 | Stage 2 | Stage 3 | Stage 4 |
|---|---|---|---|---|
| Beginner, before | 92% | 42% | 25% | 25% |
| Beginner, now | 92% | 83% | 42% | 33% |
| Average, now (hits) | 100% (4.8) | 100% (4.9) | 100% (6.3) | 83% (6.1) |

*Sequences* ✅ (24 October). Looking first showed stages 2–4 drew on every pattern about evenly
(no stage had a character of its own), stage 1 repeated the same pattern back to back 21% of the
time, and stage 2 was barely busier than stage 1. Now:
- **No pattern twice running**, and one from the last three is about a third as likely.
- **Each stage leans on its own patterns** (`pacing.favour` in `stages.ts`): stage 1 the basics,
  stage 2 holes, stage 3 moving spheres, the wide block and runs of three, stage 4 the longest runs.
- **Eight new patterns**, the longer ones for later stages: hole-hole, mover-bar, bar-bar-hop,
  pair-bar, hole-hop-hole, and three five-cost finales (quad, hole-bar-hole, gauntlet). All pass
  the bot at every speed.
- **Teach, then combine:** an obstacle that's new part-way through a stage (holes in stage 1) comes
  on its own for about 15 seconds before turning up mixed with others.
- **Stage 1 harder** (24 October, players found it too easy): holes from about 35 seconds,
  every obstacle type sooner (bars 5 s, big blocks 11 s, spheres 27 s, wide block 81 s),
  two-obstacle runs from the start, shorter rests and slightly fewer hearts. Stages 2–4 got
  shorter rests to stay ahead of it. Obstacles per stage: 137, 137, 144, 157 (stage 2 has the
  same number as stage 1 but more holes and combinations; its rests are at the fairness
  minimum).
- **Switching runs** (24 October, still too easy, and players liked runs like duck, hole, duck,
  jump, duck): two new patterns, *weave* (duck, hole, duck, jump, duck) and *zigzag* (jump, duck,
  hole, duck). Stage 1 now leans on the runs that switch between ducking and jumping, with
  single obstacles rarer; stages 2–4 use weave and zigzag too. Stage 1's hearts are a little
  scarcer. From 20 runs each:

| | Stage 1 | Stage 2 | Stage 3 | Stage 4 |
|---|---|---|---|---|
| Beginner survives | 55% | 45% | 40% | 30% |
| Average player survives (hits) | 95% (4.8) | 100% (4.7) | 95% (6.2) | 90% (5.8) |
| Obstacles | 135 | 138 | 144 | 153 |

Still to do in step 8: calm and busy sections that follow the music (below).

- **Calm and busy sections that follow the music:** a short intensity list per track (warm-up,
  waves, breather, finale) that scales the budget, so the hard stretches land on the music's
  big moments.

**Step 9 — the beat pulse: a bonus for landing on the beat.** Planned 24 October, from Pete's
idea. The floor pulses in time with the music, and landing on the beat earns a reward. It uses
the grid that's already there, with no new shapes on screen (in keeping with the landing glow).

*How it looks.* Like the title screen's grid pulse (`MenuBackdropFx.tsx`), but on the game's
floor: a band of light rolls up the floor from the front edge to the horizon, brightening the
grid lines as it passes over them (the same trick as the landing glow: the lines redrawn
brighter, clipped to the band). It's timed so the band crosses the runner's line exactly on the
beat. The beat of every track is already known (`beat` in `stages.ts`) and the stage clock
follows the music closely (`musicSync.ts`), so the pulse stays in time all the way through.
The game floor has only 5 horizontal lines, so a smooth band reads better than lighting them
one by one as the title screen does.

*Decided by Pete, 24 October:* the bonus is for **landing on the beat**; it gives **points and
some energy**; the pulse rolls on **every beat in stages 1–2 and every other beat in 3–4**.

*Part 1, the pulse alone* ✅ (24 October, to try on the phone): `src/game/beatPulse.ts` works out
where the band is from the stage clock; `GridFloor.tsx` draws it (the grid lines brightened in a
band, deeper at the front of the floor, thinner towards the horizon, with a faint wash). It
takes half a second to roll up the floor and crosses the runner's line exactly on the beat.
Hidden while paused. Tests in `beatPulse.test.ts`.

*The options that were weighed:*
1. **What earns it:** *landing* within a short window of the pulse crossing the runner's line
   (about ±0.1 sec to start with). It takes rhythm, so it rewards skill, and it works with the
   game rather than against it: obstacles already arrive on the music's beat grid, and the
   hops between them are free jumps you can time. (Simply being on the ground as the pulse
   passes would score almost every beat without trying.)
2. **The reward:** points with the streak multiplier, *and* a little energy (say a quarter of
   the bar), so good rhythm fuels double jumps. Feedback: the landing glow flashes white and
   bright, a few sparks fly to the score, and the pulse itself flares as it passes. Silent
   (decision 7).
3. **How often:** a pulse on every beat in stages 1–2 (about 0.75–0.8 sec apart) and on every
   other beat in stages 3–4, where the beat is faster (0.6 sec) and every beat would be busy.
   Or every beat throughout with the first beat of each bar brighter and worth more.
4. **A tally:** "ON THE BEAT: 23" on the Stage Clear and Game Over screens, so there's
   something to beat next time.

*Build order, each tried on the phone before the next.*
1. **The pulse alone** (no scoring): the band, its timing, its brightness and how often. Check
   by eye and ear that it feels on the beat, on every stage, after pauses too.
2. **Landing on the beat:** the window check in the physics (where landing is already
   detected), the reward, and the flash. Tests: a landing in the window scores, one just
   outside doesn't, and it holds at every speed.
3. **The tally** on the end-of-stage screens, and a line on How to Play.
4. **Measure and tune** with the pretend player: how often each skill level earns it by luck,
   and a rhythm-aware pretend player to see the most a good player can get. Tune the window
   and the reward so it's worth chasing but not essential.

### How each step is checked

- `npx tsc --noEmit` clean, `npx expo lint` no worse, and `npm test` passing (211 tests).
- `npm test` runs a bot that plays the real jump and duck physics with human-sized timing,
  against every pattern at the slowest, middle and fastest speeds and full generated runs of
  every stage. It also checks the held duck and that the finish line arrives on time.
- `pickups.test.ts` plays the arcs, hops and double arcs with timing a little early and late at
  every speed, checks none of them costs a hit, that no pickup sits inside an obstacle across
  whole stages, and the streak rules.
- `npm run difficulty` (not part of `npm test`; a quick check of it is) re-measures how hard each
  stage is after any change to obstacles, patterns or pacing. Commit the new DIFFICULTY.md.
- Then played on the phone — Pete and his son are the real test.

---

## 5. Done since the gameplay pass began

**Controls and feel**
- Swipe down **and hold** to stay ducked; keyboard ↓/S the same.
- From a held duck, **swipe back up to jump** (24 October). The finger reading lives in
  `src/game/swipe.ts`, shared by the phone app and phone browsers; How to Play shows it.
- **Smoother runner** (23 October): the run flows between poses on curves instead of jumping
  from one to the next, with a bounce in the stride, a proper leap on the way up, a reach for the
  ground on the way down, and a knee-bend on landing. Poses are in `animations.ts`.
- The stage name ("STAGE 1 · NEON CITY") shows for 5 seconds at the start of each stage, then fades.

**Look**
- **3D obstacles** (24 October): blocks and bars are solid boxes in the grid's perspective, like
  the finish line and holes, reaching back towards the vanishing point with a lit top and a
  shaded side. The side facing the middle of the screen shows, swapping over as a box passes
  the middle, just as the grid lines turn. Spheres are shaded with a shadow on the floor. The
  front face is exactly the hitbox, so what you see is still what you hit. `Obstacle3D.tsx`.
- **New menu screens** (decision 9): title with attract mode (logo and best runs take turns) and
  HI-SCORE, How to Play with each obstacle drawn as its real shape, Stage Clear, Game Over (with
  NEW HI-SCORE!), Finished with the best-runs table, and a loading screen with ZX Spectrum
  loading stripes. All in `src/components/menu/`.
- The logo and menu backdrop are drawn by `scripts/generate-menu-art.js`; re-run it after changing
  colours or layout.
- **Stage arcs** for stages 2–4 (§1).
- **Sunset Beach:** sea and sand clearly different colours, waves washing up the sand, a slow
  twinkle on the water, palms set back from the surf.
- **Neon City:** the lights linger into the sunrise and go out a few windows at a time, evenly
  across all the buildings, in the reverse of how they came on, over the last 45 seconds.
- **Sunset Beach:** the hills became low cloud streaks (bumpy-topped nearer ones, flat stripes by
  the horizon), and the light on the water is as wide as the sun showing above the sea.
- **Stage length matches the music.** Every track is 3:00 long but most end in a few seconds of
  fade or silence, so each stage now ends where its music does (§3).
- **CONTINUE goes straight to the next stage** (no second-long glimpse of the old one).
- **Home screen icon** redrawn: a white runner in a full sprint with speed streaks.
- **Menu animations:** stars that twinkle, a pulse of light running along the grid, and a light
  sweeping across the logo. They switch off under the phone's Reduce Motion setting.
- **Hearts** are drawn as heart shapes instead of circles.

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
the grid, and small objects didn't stand out. The SVGs and generator are kept. Hearts became
heart shapes on 24 October.

### Tuning

| Area | What to check |
|---|---|
| Damage | Do 2–3 hits feel right? Should later stages hit harder? |
| Speed | Each stage's start and end speed are two numbers in `stages.ts` |
| Arcs | Timings in each scenery file (e.g. when stage 4's lamps and fireworks start) |
| Colours | Stage 2's moving sphere (`#c86090`) is close to the heart pink |

### Stickman

The run, jump and landing were reworked on 23 October (§5). Still to do, if wanted: hit,
victory and idle poses.

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
| Gameplay step 5: pause button | ✅ Done; to try on the phone |
| Gameplay step 6: feel and forgiveness | ✅ Done |
| Swipe up from a duck to jump | ✅ Done; to try on the phone |
| Gameplay step 7: holes in the floor | ✅ Done; in stage 1 from 35 sec |
| Gameplay step 8: obstacle sequencing and difficulty | ✅ Done, except music sections |
| Pretend player and difficulty report | ✅ Done (`npm run difficulty`) |
| Gameplay step 9: the beat pulse (a bonus for landing on the beat) | Pulse done, to try on the phone; bonus next |
| Music stays in step after pauses | ✅ Done |
| Menu music (fades in after a game) | ✅ Done |
| 3D obstacles | ✅ Done |
| Web `Aborted()` crash | ✅ Fixed |
| iPhone: home screen web app | ✅ Working |
| iPhone: real app via EAS | Not started |
| World scoreboard | ✅ Live (§6) |
| Stickman run, jump and landing | ✅ Done |
| Tuning; hit, victory and idle poses | Not started |
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
- [DIFFICULTY.md](./DIFFICULTY.md) — how hard each stage is, measured by the pretend player
- [HISTORY.md](./HISTORY.md) — past debugging and completed plans
