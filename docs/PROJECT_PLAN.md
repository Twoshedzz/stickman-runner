# Stickman Runner – Project plan

This document is the **single place** for implementation and project plans. It covers: the three new stages (beach, mountain, final lap), **each stage introduces a new obstacle type**, what happens after stage 4, **new obstacle ideas** (shields, tall/double-jump, bouncing), **review of damage/energy/health** for best gameplay, making the app installable, UI polish, and stickman animations. Use it to prioritise work and to bring new contributors or AI agents up to speed.

---

## 1. Three new stages (beach, mountain, final lap with crowd)

**Design principle:** Each stage introduces at least one **new obstacle (or pick-up) type** so the player learns something fresh per stage and difficulty ramps in a clear way.

Each stage needs:
- **Theme-appropriate visuals and effects** (sky, ground, background, any special effects).
- **A unique 3-minute soundtrack** (one track per stage; same duration so it stays in sync with the time-based progress).
- **New obstacle/pick-up type(s)** as per the principle above (see §6 and §7 for ideas and mechanics review).

The game already has **stage configs** for all four stages in `src/game/stages.ts` (stage 1: Neon City; stage 2: Synthwave Beach; stage 3: Digital Peaks; stage 4: Victory Lap). The **pattern** for each new stage is described in `docs/STAGE1_REVIEW.md` (time-based progress, distance, difficulty segments, timeline, etc.).

### Stage 2 – Beach (Synthwave Beach)

| Item | Status / plan |
|------|----------------|
| **Config** | Already in `stages.ts`: `stage_2_beach`, `backgroundType: 'beach'`, `musicTrack: 'music_beach'`. |
| **Background** | `SynthwaveBeachBackground` exists in `src/components/backgrounds/SynthwaveBeachBackground.tsx`. |
| **Visuals / effects** | Refine to match “retro coast” theme (sky gradient, sun/sunset, water, palm/silhouettes if desired). Use `timeline` in `stages.ts` for time-of-run visual changes (e.g. sunset → dusk). |
| **Audio** | Add or confirm a **3-minute** `music_beach` asset; wire it in `useBackgroundMusic` (web and native) so it plays for stage 2. |
| **Difficulty** | Config has `difficultySegments` optional; add segments (e.g. 30s steps) if you want ramping difficulty like stage 1. |

### Stage 3 – Mountain (Digital Peaks)

| Item | Status / plan |
|------|----------------|
| **Config** | Already in `stages.ts`: `stage_3_landscape`, `backgroundType: 'mountains'`, `musicTrack: 'music_mountains'`. |
| **Background** | **To implement:** a mountains background component (e.g. `MountainsBackground.tsx` or `WireframeMountainsBackground.tsx`). Register it in `GameCanvas.tsx` in the same way as `SynthwaveBeachBackground` (switch on `backgroundType === 'mountains'`). |
| **Visuals / effects** | Match “wireframe mountains” / “Digital Peaks” (e.g. matrix-ish greens, silhouettes, or simple wireframe-style shapes). Add a `timeline` in `stages.ts` if you want the look to change over the 3 minutes. |
| **Audio** | Add or confirm a **3-minute** `music_mountains` track; currently the code may still point at a placeholder (e.g. neoncity.mp3). Replace with the real track and ensure it’s wired in both web and native music hooks. |
| **Difficulty** | Config already has boulders and double spawns; add `difficultySegments` if you want a gentler start. |

### Stage 4 – Final lap (Victory lap with crowd)

| Item | Status / plan |
|------|----------------|
| **Config** | Already in `stages.ts`: `stage_4_victory`, `backgroundType: 'city_victory'`, `musicTrack: 'music_victory'`. |
| **Background** | **To implement:** a “victory lap” / “crowd” background (e.g. `CityVictoryBackground.tsx` or `VictoryLapBackground.tsx`) that reads as a finish line with crowd. Register in `GameCanvas.tsx` for `backgroundType === 'city_victory'`. |
| **Visuals / effects** | Crowd silhouettes, finish line, confetti or flags, gold/blue theme to match config. Optionally a simple “crowd” layer (e.g. repeating figures or shapes) that animates or scrolls. Use `timeline` if the look should change over the 3 minutes. |
| **Audio** | Add or confirm a **3-minute** `music_victory` track and wire it in both web and native. |
| **Difficulty** | Already set as hardest (baseSpeed 8, spawnRate 900); add segments if you want the lap to ramp. |

**Checklist per stage (for implementation):**

- [ ] Background component exists and is wired in `GameCanvas.tsx`.
- [ ] Stage has a **3-minute** music track and it’s wired in `useBackgroundMusic` (and any web-specific music hook).
- [ ] `stages.ts` has the right `theme`, `timeline` (if needed), and `difficultySegments` (if desired).
- [ ] Run through the stage once to confirm: time-based progress, distance, and music stay in sync (see `STAGE_DESIGN.md`).

---

## 2. What happens after stage 4

**To decide:** When the player completes stage 4 (Victory lap), what happens next?

Options to choose from (or mix):

- **A. “You win” / credits**  
  Show a dedicated “You win” or “Game complete” screen (with optional credits, high score, “Play again” or “Back to stage 1”). No stage 5.

- **B. Loop back to stage 1**  
  After stage 4, the game returns to stage 1 (Neon City) and continues; high score and possibly “laps” or “cycles” are tracked. Good for endless play.

- **C. Free play / stage select**  
  After stage 4, unlock a “stage select” or “free play” mode so the player can replay any stage without going through 1→2→3→4 again.

- **D. New Game+ or harder run**  
  After stage 4, offer a “New Game+” that replays all stages with higher difficulty or different obstacles, then show a final “You win” screen.

**Implementation note:** Right now, “Continue” after a stage moves to the next stage (e.g. stage 1 → 2). When `onContinue` is called after **stage 4**, the code will look for a “next” stage; if there isn’t one, you need to handle that case (e.g. show a “You win” screen instead of trying to load stage 5). So the plan should explicitly say: “After stage 4 we do X,” and then implement that branch (win screen, loop to 1, or stage select).

**Recommendation:** Decide one “canonical” behaviour (e.g. “Show win screen, then offer Play again / Back to menu”). Document it here and in `CONTEXT_FOR_AGENTS.md` so future work stays consistent.

---

## 3. Making the app installable (not just Expo Go)

**Goal:** Players can install the app on their device (home screen / app drawer) and run it without opening Expo Go.

**Approach (Expo / EAS):**

1. **EAS Build (Expo Application Services)**  
   Use EAS to build **standalone** binaries:
   - **iOS:** Build an `.ipa` (or submit directly to App Store via EAS Submit).
   - **Android:** Build an `.aab` or `.apk` for Play Store or sideloading.

2. **Prerequisites**  
   - Expo project already uses EAS (or add it: `eas build:configure`).
   - **Apple:** Apple Developer account (for App Store) or free account (for device testing only).
   - **Android:** Google Play Developer account (for store) or just build APK for sideloading.

3. **Steps to plan**  
   - Run `eas build:configure` if not already done; ensure `app.json` / `app.config.js` has the right `expo.name`, `expo.slug`, and version.
   - Create build profiles (e.g. `development`, `preview`, `production`) in `eas.json`.
   - For **preview / testing:** run `eas build --platform ios` or `--platform android` to get an installable build; install via link or TestFlight (iOS) / internal testing (Android).
   - For **store release:** add signing (credentials), then use `eas submit` or the stores’ own upload flows. Optionally set up EAS Update for over-the-air updates without a new store build.

4. **Docs**  
   Expo’s [EAS Build](https://docs.expo.dev/build/introduction/) and [EAS Submit](https://docs.expo.dev/submit/introduction/) are the canonical references. The plan here is “use EAS Build to produce installable apps; use EAS Submit (or store UIs) for store release.”

**Deliverable:** A short “Release / install” section in the repo (or this doc) that says: “To build an installable app: 1. Configure EAS. 2. Run `eas build --platform …`. 3. For stores, configure credentials and submit.” Optionally a `README` section or `docs/RELEASE.md` with exact commands and links.

---

## 4. UI uplift (bars, messages, instructions)

**Goal:** Polish the UI so health/energy bars, on-screen messages, and instructions are “spot on.” They’re good enough for now but need tweaking.

**Areas to cover:**

| Area | What to review |
|------|----------------|
| **Health bar** | Position, size, colours, and how it reflects damage (e.g. smooth vs chunked). Ensure it’s readable on small screens and doesn’t overlap important content. |
| **Energy bar** | Same as health: clarity, position, and how it reflects double-jump usage and regen. |
| **Score / stage** | Visibility, placement, and whether “Stage 2” (or similar) is clear. |
| **Messages** | “GAME OVER,” “STAGE CLEAR,” “CONTINUE?,” “START GAME,” etc. Wording, font size, contrast, and position. Consider short, clear copy and accessibility (readable in different lighting). |
| **Instructions** | “HOW TO PLAY” content: avoid obstacles, hearts = health, double jump = energy. Make it scannable (bullets or icons) and easy to dismiss. Optionally a “first launch only” or “?” button. |

**Process:** Go through each screen (start, playing, game over, stage clear, instructions) and list concrete tweaks (e.g. “Increase title font size by 4pt,” “Move energy bar 10px right”). Then implement in the relevant components (e.g. `HealthBar`, `EnergyBar`, `ScoreDisplay`, `GameScreen` modals and text styles). No change to game logic required; this is layout, styling, and copy.

**Deliverable:** A short UI checklist or a “UI polish” section in this doc (or a separate `docs/UI_POLISH.md`) with the list of agreed tweaks and their status (done / pending).

---

## 5. Stickman animations and poses

**Goal:** Consider extra stickman animations and poses for more visual satisfaction, without breaking gameplay.

**Ideas to consider:**

- **Run cycle** – Slight variation in arm/leg phases or speed so the run feels less static over long stages.
- **Jump / fall** – Different arm or body tilt when going up vs coming down (e.g. arms up on ascent, arms out or down on descent).
- **Landing** – A brief “squash” or “land” pose on touch-down before returning to run.
- **Hit / hurt** – When the player takes damage, a short “hit” or “stagger” pose (e.g. flash or lean) so the collision feels more impactful.
- **Victory** – On stage clear or win screen, a “arms up” or “celebrate” pose instead of the default run.
- **Idle** – On the start screen, a gentle idle (e.g. breathing or weight shift) so the stickman doesn’t look frozen.

**Implementation note:** The stickman is likely driven by `Stickman.tsx` (or similar) with props such as `isGrounded`, `isRunning`, `status`. New poses mean new drawing or animation states keyed to those props (or new props like `justLanded`, `justHit`, `celebrating`). Prefer small, incremental additions (e.g. landing first, then hit, then victory) so each step is testable and doesn’t affect game logic.

**Deliverable:** A short “Stickman animations” backlog in this doc (or a separate design note) listing the chosen poses and their trigger (e.g. “Landing: 2 frames when `isGrounded` just became true after `!isGrounded`”). Then implement in the stickman component and wire triggers from game state where needed.

---

## 6. New obstacle types (each stage introduces something new)

**Goal:** One (or more) new obstacle or pick-up type per stage so progression feels clear and each stage has a distinct challenge.

**Ideas to consider:**

| Type | Behaviour | Stage fit / notes |
|------|-----------|-------------------|
| **Shield (pick-up)** | Collect by **jumping** into it (like hearts but requires jump). Grants **one hit of protection**: next collision that would deal damage is absorbed, shield is consumed. | Introduces “must jump to collect” and a safety buffer; fits any stage. |
| **Tall obstacle** | Too high to clear with a single jump. Player **must double jump** to get over. If only single jump, they take damage. | Teaches/rewards double jump; good for stage 2 or 3 once double jump is familiar. |
| **Bouncing obstacle** | Like the boulder (periodic motion), but **moves up and down** (vertical bounce) instead of side to side. Timing the jump is the challenge. | Adds variety; can be introduced in a stage that already has boulders so the “bounce” is the twist. |

**Implementation notes:**

- **Shield:** New obstacle type (e.g. `'shield'` in `ObstacleType`). Collision: if player overlaps and is in air (or always when overlapping?), consume shield and don’t apply damage; remove obstacle. State: add `shield: number` (or “shield active” flag) to game state if not already there (currently there is `shield` in state – confirm usage). Spawn: similar to hearts, maybe only in certain stages or after stage 1.
- **Tall:** New type (e.g. `'tall'`). Collision: same AABB but height > single-jump clearance. Require `player.jumpCount >= 2` (or equivalent) when overlapping to count as “cleared”; otherwise deal damage. Draw: taller rect or sprite.
- **Bouncing (vertical):** New type or variant of boulder. In physics, apply vertical oscillation (e.g. `obs.y = baseY + amplitude * sin(phase)`) instead of horizontal speed wobble. Collision uses current `obs.y`.

**Deliverable:** Decide which new types to add and in which stage(s). Add types to `stages.ts` (`ObstacleType`, `allowedObstacles` per stage), then implement spawn, physics, collision, and draw for each. Update §1 stage tables with “New type this stage: …”.

---

## 7. Damage, energy, and health – gameplay review

**Goal:** Review and tune damage, energy, and health so the game feels fair, readable, and fun (not too punishing, not trivial).

**Areas to review:**

| Area | What to check |
|------|----------------|
| **Damage values** | Per obstacle type: `DAMAGE_BLOCK`, `DAMAGE_SMALL`, `DAMAGE_PURPLE`, etc. (in `constants.ts`). Do 1–2 hits feel right, or should the player survive more (or fewer) hits? Should any stage or segment change damage (e.g. stage 4 hits harder)? |
| **Health** | `MAX_HEALTH` and how many hits that allows. Is “game over after X hits” the right length for a 3-minute stage? Should hearts heal more or less (`HEART_HEAL`)? |
| **Energy** | `MAX_ENERGY`, `JUMP_ENERGY_COST`, `ENERGY_REGEN`. Can the player double jump often enough to feel useful but not spam it? Is full-bar cost for one double jump right, or should it be a smaller cost so they can do 2–3 per stage with regen? |
| **Shield (if added)** | If we add a shield pick-up: does it stack with health (e.g. “one free hit”) or replace a health point? When is it consumed – any damage or only the first hit after collect? |

**Process:** Play through each stage and note “felt too hard,” “felt too easy,” or “good.” Then adjust constants (or stage-specific overrides) and re-test. Prefer one place for tuning (e.g. `constants.ts` plus optional per-stage overrides in `stages.ts`).

**Deliverable:** A short “Mechanics tuning” note (in this doc or `docs/STAGE1_REVIEW.md`) with the chosen values and the reasoning (e.g. “Double jump costs 50% bar so player can use it 2–3 times per stage with regen”). Implement the chosen values and, if needed, add stage-specific damage/health/energy overrides.

---

## Summary table

| Area | Status | Next steps |
|------|--------|------------|
| **Stage 2 (Beach)** | Config + background exist; music and timeline may need adding/refining | Wire 3-min beach track; refine visuals/timeline; **assign new obstacle type for stage 2**; test full run |
| **Stage 3 (Mountain)** | Config exists; no mountains background yet | Implement mountains background; add 3-min mountains track; wire in GameCanvas; **assign new obstacle type for stage 3**; add timeline if desired |
| **Stage 4 (Victory / crowd)** | Config exists; no city_victory background yet | Implement victory/crowd background; add 3-min victory track; wire in GameCanvas; **assign new obstacle type for stage 4**; add timeline if desired |
| **After stage 4** | Not decided | Choose behaviour (win screen / loop / stage select); implement and document |
| **New obstacle types** | Ideas listed (§6) | Decide: shields, tall (double-jump), bouncing vertical; implement and assign to stages |
| **Damage / energy / health** | Current values in constants | Review for best gameplay (§7); tune and document choices |
| **Installable app** | Likely not set up | Configure EAS Build; add build/submit steps to docs; produce at least one preview build per platform |
| **UI uplift** | Good enough for now | List concrete tweaks for bars, messages, instructions; implement and tick off |
| **Stickman animations** | Basic run/jump | Decide poses (landing, hit, victory, idle); add states and draw/animate in Stickman component |

---

When you or an agent works on one of these, update the relevant row and “Next steps” so this doc stays the single source of truth for the project plan.
