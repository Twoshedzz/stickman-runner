# Stickman Runner – Project plan

This document is the **single place** for implementation and project plans: how we get from one
finished stage to a finished game. It covers the new **duck** mechanic, a proper **obstacle
sequencing** system, the **day/night and asset family** for stages 2–4, the two remaining **music
tracks**, and the polish backlog (end-of-game screen, UI, stickman poses, installable builds).

Read [CONTEXT_FOR_AGENTS.md](./CONTEXT_FOR_AGENTS.md) first if you're new (human or AI). For how the
game works today see [ARCHITECTURE.md](./ARCHITECTURE.md); for why it's shaped this way see
[HISTORY.md](./HISTORY.md).

**Work in phase order.** Each phase is small enough to test on the phone before moving on.

---

## 1. Where we are

Stage 1 (Neon City) is a complete 3-minute run: dusk→dawn cycle, parallax city strips, building
lights that come on and fade again, music, victory arch, and the energy/double-jump mechanic.

Stages 2–4 are config entries in `src/game/stages.ts` with nothing behind them yet:

| Stage | Config | Background | Music | New mechanic |
|-------|--------|-----------|-------|--------------|
| 1 Neon City | ✅ complete | ✅ city strips | ✅ `neoncity.mp3` | jump, double jump, boulder |
| 2 Sunset Beach | ✅ exists | ⚠️ hand-drawn palms, not strips | ✅ `synthwavebeach.mp3` | **duck (new)** |
| 3 Midnight Mountains | ✅ exists | ❌ draws nothing | ❌ placeholder | tall obstacle (forced double jump) |
| 4 Victory Dawn | ✅ exists | ❌ draws nothing | ❌ placeholder | bar-and-block combinations |

Stages 2–4 were renamed on 21 October 2026 (from Synthwave Beach / Digital Peaks / Victory Lap) to say
what time of day each one is. Only the `name` field in `stages.ts` changes — nothing displays it, so
this is free. **Stage ids stay as they are** (`stage_3_landscape` included) to avoid pointless churn.

The game is playable through to stage 4 today, which is why Phase 0 matters: finishing stage 4
currently freezes.

---

## 2. Decisions locked in

Agreed on 21 October 2026. Don't re-open these without a reason — a lot below depends on them.

1. **Duck = swipe down.** Tap anywhere still jumps, so existing input is unchanged.
2. **World speed stays constant.** Difficulty comes from spacing, obstacle mix and which skills a
   stage demands — not from speeding the world up. The per-stage `baseSpeed` values read like they
   control speed but never did; they go away.
3. **Art = silhouette + lit overlay.** Two images per scenery variant (a dark shape, plus a matching
   lit layer faded on top) rather than stage 1's four separate brightness versions.
4. **Each stage is its own time-of-day vignette**, and time may jump between stages — the arcade
   idiom, where each level is a different scene. The dusk→dawn run belongs to **stage 1 only**; the
   others pick whatever time suits their scenery. Stage 1 is unaffected by this.
5. **Obstacles stay abstract** — squares and circles, each either static or with its own movement
   pattern. No stage needs obstacle art, and the duck obstacle is simply a wide rectangle at head
   height. All look-and-feel comes from background elements, so the whole art budget goes there.

---

## 3. The numbers everything is tuned against

Measured from the current code, at 60fps. The sequencer in Phase 2 is built on these.

| Quantity | Value | Where it comes from |
|---|---|---|
| World speed | 240 px/sec | `BASE_SPEED` 4 × 60 (`constants.ts`) |
| Warning time (spawn → player) | 2.3 sec | 550px of travel ÷ 240 |
| Jump airtime | 0.67 sec | `JUMP_FORCE` −12, `GRAVITY` 0.6 |
| Jump peak height | 120 px | well clear of the 40px obstacles |
| Ground covered in one jump | 160 px | 0.67 × 240 |
| Double jump cost | the whole energy bar | `JUMP_ENERGY_COST` = `MAX_ENERGY` = 100 |
| Energy refill while grounded | 3.3 sec | `ENERGY_REGEN` 0.5 per frame |
| Stage length | 180 sec | `STAGE_DURATION_SECONDS` |

⚠️ The energy refill currently counts **frames, not time**, so on a 120Hz phone the bar fills in 1.7
seconds instead of 3.3 — the double jump is twice as available on a newer phone. Fixed in Phase 0,
before any difficulty tuning depends on it.

---

## 4. Phase 0 – fixes before new content

Small and self-contained. Nothing here changes how stage 1 plays, except the energy timing.

- [x] **Finishing stage 4 freezes the game.** `onContinue` in `src/game/loop/useGameLoop.ts` looks
      for a next stage and silently does nothing when there isn't one: the runner stops, no message
      appears, tapping does nothing. Add the missing branch — for now route to Game Over; the proper
      win screen is Phase 6.
- [x] **Music dies if you restart quickly.** The 2-second fade-out in both
      `src/hooks/useBackgroundMusic.ts` and `useBackgroundMusic.web.ts` re-reads "the current track"
      on every step, so if you press PLAY AGAIN during the fade it turns the *new* run's music down
      to zero and pauses it. Capture the audio element once when the fade starts and stop if it's
      been replaced.
- [x] **One track list, not two.** Both music hooks hold their own copy of `musicMap`. Extract to a
      single shared module so Phase 5 adds the new tracks in one place.
- [x] **Derive `courseLength`.** Stage 1's 43200 is exactly 180 sec × 240 px/sec, which is what makes
      one unit of distance equal one pixel — the victory arch and grid scroll both rely on it.
      Stages 3 and 4 use 40000 and 50000, which makes the arch drift against the ground. Calculate it
      from speed × duration instead of typing a number per stage.
- [x] **Make frame-counted things time-based.** Energy regen, the boulder's wobble and particle fade
      all count frames. Scale them by the `scale` value already used in
      `src/game/systems/physics.ts`, the way the player's jump already is.
- [x] **Fix platform detection in `particles.ts`.** It detected web with
      `typeof window !== "undefined"`, but React Native defines `window` too, so phones quietly used
      the lower web particle cap. Now uses `Platform.OS === 'web'`.
- [ ] **Same bug in `CityStripBackground.tsx`**, where it makes the phone load every city PNG twice.
      Deliberately left for Phase 4, which rewrites that loader anyway — changing it now would alter
      how stage 1's city loads for no gain.

---

## 5. Phase 1 – ducking

The new mechanic: overhead bars you must duck under. They can't be jumped — jumping into one still
hurts, which is the whole point.

### Input

`react-native-gesture-handler` is already a dependency but isn't wired up — there's no
`GestureHandlerRootView` anywhere, so one needs adding in `app/_layout.tsx` inside `WasmGate`. Then a
Pan gesture over the game area that ducks on a downward flick past a velocity threshold. The existing
`Pressable` keeps handling tap-to-jump, so nothing about jumping changes. On web, add ArrowDown and
KeyS to the keyboard handler in `src/screens/GameScreen.tsx`.

### Geometry

Measured from the runner's feet (negative = above the ground line):

| | Height | Top edge |
|---|---|---|
| Standing | 40 px | −40 |
| Ducking | 22 px | −22 |
| Overhead bar | 32 px tall | −58 to −26 |

A standing runner's head (−40) overlaps the bar; a ducked one (−22) passes under with 4px to spare.
Both margins survive the 5px of forgiveness already applied in `collisions.ts`.

### Rules

- **Duck lasts 0.55 sec.** A 60px-wide bar overlaps the runner for about 0.42 sec, so one duck clears
  it with margin.
- **Ducking is free.** It must not compete with the double jump for energy.
- **Grounded only.** You can't duck in mid-air — which is what makes the jump→duck gap rule in
  Phase 2 necessary.
- **Ducking doesn't help against ground obstacles.** A ducked box still overlaps a 28px block, so you
  can't crouch past a normal obstacle.

### Work

- [ ] `GestureHandlerRootView` in `app/_layout.tsx`; Pan gesture in `GameScreen.tsx`
- [ ] `isDucking` + duck timer in `src/game/state.ts`; `startDuck()` beside `jump()` in `physics.ts`
- [ ] New `'overhead'` obstacle type through the type union, `checkCollisions`, and the draw switch in
      `GameCanvas.tsx`
- [ ] `DUCK_POSE` in `src/game/animations.ts`, wired into the pose selection in `Stickman.tsx`
- [ ] Third line on the HOW TO PLAY screen ("SWIPE DOWN TO DUCK")

---

## 6. Phase 2 – obstacle sequencing

The current spawner (`src/game/systems/spawn.ts`) picks a random type at a random spacing with a 20%
chance of a second obstacle. It can't express "getting harder", and nothing stops it producing a
combination that's impossible to survive. Replace it with **patterns plus a difficulty budget**.

### Patterns

A pattern is a short authored sequence — 1 to 4 obstacles at fixed relative spacings — tagged with
the skills it needs, a cost, and a recovery gap. About ten to start with:

| Pattern | Cost | Needs |
|---|---|---|
| Single block / single small | 1 | jump |
| Two blocks, 280px apart | 2 | two jumps |
| Two blocks, 150px apart | 3 | one jump clears both |
| Single overhead bar | 2 | duck |
| Block then bar, 220px apart | 4 | jump, land, duck |
| Bar then block, 200px apart | 4 | duck, then jump |
| Boulder | 3 | timing |
| Tall obstacle | 5 | double jump (full bar) |
| Heart | 0 | placed deliberately, not random |

### Difficulty budget

A budget ramps across each stage's three minutes. The spawner only picks patterns whose cost fits the
current budget **and** whose required skills that stage has introduced:

| Stage | Budget start → end | Introduces |
|---|---|---|
| 1 Neon City | 1 → 4 | jump, double jump, boulder |
| 2 Sunset Beach | 2 → 5 | **overhead bars (duck)** |
| 3 Midnight Mountains | 3 → 6 | tall obstacles (forced double jump) |
| 4 Victory Dawn | 4 → 7 | bar-and-block combinations |

Difficulty now rises *across* stages as well as within them. Under the old system stage 4 was
actually easier than the back half of stage 1.

### The "never impossible" rules

These are the point of the whole phase. All of them come from the numbers in §3:

1. **Minimum gap of 96px** (0.4 sec of reaction time) between any two obstacles.
2. **After a jump-required obstacle, no duck-required obstacle for 192px** (0.8 sec) — you can't duck
   in mid-air and a jump lasts 0.67 sec.
3. **A double-jump pattern only spawns if the energy bar is actually full**, or 3.3 sec of grounded
   time has passed.
4. **Recovery gap scales with cost:** `120px + cost × 40px`.
5. **Never two patterns of cost 4 or more back to back.**
6. **Hearts are placed, not random** — after an expensive pattern, or when health is below half —
   instead of the current flat 10% chance.

### Movement patterns are a difficulty dimension

Since obstacles are abstract shapes, their *movement* is what makes them interesting, and it's free
to add: the boulder already oscillates horizontally. A vertical bouncer, a slow drifter, or a bar
that dips are all a few lines in `physics.ts` and cost no art. Treat movement as part of a pattern's
cost — a moving obstacle is worth roughly one more point than the same shape sitting still.

### What this replaces

`spawnRate`, `baseSpeed` and `difficultySegments` all become redundant and should be deleted rather
than left to confuse. After this, tuning lives in exactly two places: the pattern library, and one
budget curve per stage.

---

## 7. Phase 3 – one cycle engine, four time slices

Stage 1's visual timeline is 120 lines of absolute distances (7200, 32000, 43200…) in `stages.ts`,
and `getTheme` in `GameCanvas.tsx` then overrides it with three stage-1-only special cases: a
forced-day branch after the course ends, a minimum-brightness nudge, and a moon block that ignores
the timeline's own moon events entirely.

Copying that three times is the expensive path. Instead:

- [ ] Express timeline triggers as **fractions of stage progress (0–1)** rather than absolute
      distances, so a stage's length and its visuals stop being coupled.
- [ ] Build **one cycle engine** covering sunset → night → dawn, and have each stage declare only the
      **slice** of it they use, plus a palette and an asset set. Stage 1 uses the whole thing; stage 2
      uses the sunset end; stage 4 uses the dawn end.
- [ ] Support **static-time stages**: stage 3 sits at midnight and needs no timeline at all, so the
      engine must handle "no cycle, just these colours" without special-casing.
- [ ] Fold the three hardcoded cases into that shared engine, so `getTheme` has no per-stage branches.

This is the one phase that risks changing how stage 1 looks, so compare it side by side with the
current build before and after.

---

## 8. Phase 4 – asset system and the family for each stage

### Why the current system is expensive

Stage 1 needs 33 PNGs: four brightness levels (`none`/`few`/`more`/`all`) × four layout variants ×
two depth layers. Every brightness level is separate Photoshop work — hence the seven `.psd` files in
`assets/city`. The loader hardcodes 33 `useImage` calls, loads everything twice on the phone (see
Phase 0), and lands brightness in one of four visible steps.

File size isn't the problem — all the PNGs together are about 200KB. The Photoshop effort and the
loader are.

### The new system

- **Two images per variant:** `*_base.png` (opaque dark silhouette) and `*_lit.png` (just the lit
  windows/details, transparent elsewhere). Draw base, then draw lit on top at an opacity taken
  straight from the timeline's 0–1 light level. Smooth fade instead of four steps, and one painting
  instead of four.
- **One config-driven loader:** a single list of image sources per stage loaded in a loop, replacing
  the 33 hardcoded hooks and the duplicate web decode path.
- **One `StageScenery` component** driven by per-stage config, instead of a bespoke component per
  stage.
- **Retire** `getBackAmountFromTheme` and the whole `none`/`few`/`more`/`all` mechanism.
- **Keep the existing strip dimensions** — far layer 300×350, near layer 450×350 — so the tile maths
  carries over. (Two stale fallback values in `CityStripBackground.tsx` assume 100px-tall images and
  draw tiles 3.5× too wide until the real ones load; fix while rewriting.)

### The asset family, per stage

Stage 1's family is: sky gradient, sun, moon, far city strip, near city strip, window lights, neon
grid, victory arch. Every stage fills the same six slots. Numbers in brackets are new PNGs needed.

| Slot | 2 Sunset Beach<br>*sunset → dusk* | 3 Midnight Mountains<br>*static midnight* | 4 Victory Dawn<br>*dawn → morning* |
|---|---|---|---|
| **Sky** | purple → pink → gold → deep dusk | near-constant deep blue/green, lifting only at the very end | dawn pink → gold → bright morning |
| **Celestial** | big sun sinking **into the sea**, then moon rises | high moon + stars, slow drift, **no sun** | sun rising to full height |
| **Far layer** | ocean + horizon (3) | wireframe ridges (4) | **reuse stage 1 city strips, tinted gold/blue (0)** |
| **Near layer** | palm silhouettes (4) | closer peaks / pines (4) | crowd stands + flags (4) |
| **Lit overlay** | reflection column on the water, then stars (code, 0) | ridge / cabin lights, constant (4, optional) | crowd camera flashes (4) |
| **Ground** | sand, recoloured grid | neon green grid | gold grid + finish banner |

Celestial bodies, stars, water reflections, camera flashes and confetti are drawn in **code** —
reusing the existing `spawnParticles` for flashes and confetti — so they cost no art at all.

Two freebies worth taking:

- **Stage 2's reflection column.** The sun sinking into the sea with a reflection stretching toward
  the runner is the hero moment of the stage; when the sun has gone, the same code becomes a moon
  path. One mechanism, two looks, no art.
- **Stage 4's skyline.** Reusing stage 1's city strips with a gold/blue tint costs nothing and closes
  the loop — the city you ran through at dusk, seen again at sunrise.

**Total: 23–27 new PNGs for three stages**, versus roughly 120 if stage 1's scheme were copied.

### Which stage to build first

Build **stage 3's scenery first**, even though stage 2 comes first in play order. It's static-time, so
it needs no timeline and its lit layer can be a constant — 8 PNGs and no cycle animation. That makes
it the cheapest way to prove the new loader and `StageScenery` config before committing stage 2's
sunset cycle and stage 4's crowd to it.

### Build before the art exists

- [ ] Extend `scripts/generate-city-placeholders.js` to emit base+lit placeholder strips for any
      stage, so stages 2–4 are playable and tunable while the real art is still in Photoshop.
- [ ] Convert stage 2's hand-drawn palms (`SynthwaveBeachBackground.tsx`) to the strip system. It
      currently draws at a fixed 600px width, so on a wide phone the ocean stops short and leaves a
      gap at the right edge.

---

## 9. Phase 5 – music

Two tracks still needed, generated in ElevenLabs to match the existing two:

| Track | File | Mood |
|---|---|---|
| Midnight Mountains | `assets/midnightmountains.mp3` | cold, sparse, hypnotic — deep midnight, no sunrise to build to |
| Victory Dawn | `assets/victorydawn.mp3` | bright, driving, triumphant — sunrise and a crowd |

Specs to match what's already there:

- **MP3**, around 4MB
- **3:00 ± 2 sec** — stage length is exactly 180 sec (`STAGE_DURATION_SECONDS`), so the music and the
  dawn should arrive together
- **Loop-friendly** — a player who dies at 2:50 and retries hears it from the start, so it shouldn't
  end on a hard stop

Drop both files in `assets/`, alongside `neoncity.mp3` and `synthwavebeach.mp3`. Wiring is then one
line each in the shared track map from Phase 0 — the `music_mountains` and `music_victory` keys
currently both `require` `neoncity.mp3`, in two separate files.

---

## 10. Phase 6 – what happens after stage 4

Phase 0 routes stage 4's end to Game Over so nobody gets stuck. The real ending still needs deciding:

- **A. "You win" screen** — final score, best score, play again. Simplest, and gives the run a proper
  ending.
- **B. Loop back to stage 1** — endless play, tracking laps. Good for replay value.
- **C. Stage select / free play** — unlock replaying any stage.
- **D. New Game+** — all four stages again at higher difficulty, then a final win screen.

**Recommendation:** A now (it's the ending the four-stage structure implies), with B as a follow-up if
your tester wants to keep going. Whatever is chosen, write it down here and in
`CONTEXT_FOR_AGENTS.md` so it stays consistent.

---

## 11. Phase 7 – gameplay tuning and polish

### Damage, energy and health

Worth a proper pass once ducking and the new sequencer are in, because the sequencer's rules depend
on these values:

| Area | What to check |
|---|---|
| **Damage** | `DAMAGE_BLOCK` 4, `DAMAGE_SMALL` 2, `DAMAGE_PURPLE` 2. Do 2–3 hits feel right? Should stage 4 hit harder? What should an overhead bar cost? |
| **Health** | `MAX_HEALTH` 10 and `HEART_HEAL` 3 — is "game over after ~3 bad hits" the right length for a 3-minute stage? |
| **Energy** | `JUMP_ENERGY_COST` is the full bar, so you get one double jump every 3.3 sec. **Likely change: halve it** so the double jump is usable 2–3 times per stage, which also gives the sequencer more room. |
| **Shield** | There's an unused `shield` field in game state. If added as a pick-up: collect by jumping into it, absorbs one hit. |

### Other obstacle ideas (not yet assigned to a stage)

- **Shield pick-up** — jump into it, absorbs the next hit.
- **Bouncing obstacle** — like the boulder but moving up and down, so it's a timing puzzle.

### UI uplift

| Area | What to review |
|---|---|
| Health bar | Position, size, how it shows damage; readable on a small screen |
| Energy bar | Same, plus how clearly it shows double-jump availability |
| Score / stage | Is "STAGE 2" clear enough? |
| Messages | GAME OVER, STAGE CLEAR, CONTINUE?, START GAME — wording, size, contrast |
| Instructions | Needs the duck line; make it scannable; consider showing on first launch only |

### Stickman poses

Beyond the duck pose from Phase 1: **landing** (a brief squash on touch-down), **hit** (a stagger when
damaged), **victory** (arms up on stage clear), **idle** (gentle movement on the start screen). Add
them one at a time — each is driven by existing state like `isGrounded`, so none of them touch game
logic.

---

## 12. Phase 8 – making the app installable

Goal: install on a device and play without opening Expo Go.

1. **EAS Build** — standalone binaries: `.ipa` for iOS, `.aab`/`.apk` for Android.
2. **Prerequisites** — `eas build:configure` if not already done; correct `name`, `slug` and version
   in `app.json`; an Apple Developer account for iOS (a free one works for your own device), or just
   an APK for Android sideloading.
3. **Steps** — create `development` / `preview` / `production` profiles in `eas.json`, then
   `eas build --platform ios` (or `android`) for an installable preview build. For stores, add signing
   credentials and use `eas submit`.
4. **Docs** — Expo's [EAS Build](https://docs.expo.dev/build/introduction/) and
   [EAS Submit](https://docs.expo.dev/submit/introduction/).

**Deliverable:** a short `docs/RELEASE.md` with the exact commands, and at least one preview build
installed on a real phone.

---

## 13. Cleanup backlog

Not urgent, but each one removes a trap:

- [ ] `DEBUG_ENABLED` in `constants.ts` is permanently `true`, so the debug switch — and its
      damage-off cheat — ships to players. Tie it to `__DEV__` **before any real build**.
- [ ] Delete `src/components/backgrounds/NeonCityBackground.tsx` (299 dead lines, including the
      texture code that caused the web black screen).
- [ ] Delete the seven superseded placeholder PNGs in `assets/city` (`back_no`, `back_some`,
      `back_all`, `front_no`, `front_some`, `front_all`, `placeholder`).
- [ ] Remove unused packages: `expo-av` (replaced by `expo-audio`), `expo-haptics`, `expo-image`,
      `expo-symbols`, `expo-web-browser`, `@react-navigation/bottom-tabs`.
- [ ] Fix the one lint error (missing display name in `ScoreDisplay.tsx`) and the 12 warnings.
- [ ] `PLAYER_X` is defined twice — in `constants.ts` and again in `GameCanvas.tsx`. Changing one
      moves the hitbox away from the drawing.
- [ ] Obstacle size, colour and damage are re-derived in three files. One table of obstacle types
      would collapse it — worth doing as part of Phase 1, since that adds a type.
- [ ] The game loop re-renders at 60fps even on the start and Game Over screens, draining battery
      while nothing moves.

---

## 14. Testing

There are no tests today. Not a suite — just a few checks on the pure functions, which are plain
functions over a state object and need no rendering:

- [ ] Add `jest-expo`.
- [ ] Test the pattern picker and the six sequencing rules from Phase 2.
- [ ] Test `checkCollisions` for standing/ducking against ground obstacles and overhead bars.
- [ ] **The valuable one:** simulate a full 3-minute stage and assert no sequencing rule is ever
      violated. That's the cheapest possible guard against shipping an impossible stage.

Phone (Expo Go) stays the source of truth for how things feel; web is a preview.

---

## 15. Summary

| Phase | Area | Status |
|---|---|---|
| 0 | Blocking fixes (stage 4 freeze, music fade, course length, timing) | ✅ Done, needs phone testing |
| 1 | Duck mechanic (swipe down, overhead bars) | Not started |
| 2 | Obstacle sequencing (patterns + difficulty budget) | Not started |
| 3 | One day/night shape, four palettes | Not started |
| 4 | Asset system (silhouette + lit) and families for stages 2–4 | Not started |
| 5 | Music for Midnight Mountains and Victory Dawn | ✅ Both tracks in and wired up |
| 6 | What happens after stage 4 | Needs a decision (recommend A) |
| 7 | Tuning and polish (damage/energy, UI, stickman poses) | Not started |
| 8 | Installable builds via EAS | Not started |

When you or an agent finishes a phase, update its row and tick the boxes above so this stays the
single source of truth.

---

## Related docs

- [CONTEXT_FOR_AGENTS.md](./CONTEXT_FOR_AGENTS.md) — start here
- [ARCHITECTURE.md](./ARCHITECTURE.md) — how the game works today and why
- [STAGE_DESIGN.md](./STAGE_DESIGN.md) — 3-minute stages, time-based progress, music sync
- [STAGE1_REVIEW.md](./STAGE1_REVIEW.md) — stage 1 end to end; the pattern to follow
- [WEB_PATCHES_AND_ARCHITECTURE.md](./WEB_PATCHES_AND_ARCHITECTURE.md) — why web is fragile
- [HISTORY.md](./HISTORY.md) — past debugging and completed plans
