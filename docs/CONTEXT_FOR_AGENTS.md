# Context for AI agents (and project owner)

**Purpose:** This file gives new AI agents (and the project owner) enough context to work effectively on this codebase without relying on prior chat history. Please keep it updated when major decisions or changes happen.

---

## About the project owner

- **The project owner is not a coder.** When suggesting changes or explaining code:
  - Prefer **plain-language explanations** of what something does and why it matters.
  - Avoid jargon where possible; when you use technical terms, briefly explain them.
  - Offer **architecture and best-practice guidance** explicitly: e.g. “here are two approaches; this one is better because…”
  - When there are tradeoffs (e.g. “quick fix vs proper fix”), spell them out so they can make an informed choice.
- **Be thorough and watch for errors in approach.** Before implementing, consider edge cases, alternative approaches, and whether the proposed change could introduce bugs or regressions. Flag possible issues and suggest checks or tests where useful.

---

## What this project is

- **Stickman Runner** – A side-scrolling runner game (Expo / React Native).
- **Target:** Mobile (iOS/Android) is the **primary platform**. Phone browsers come next: the game saved to the iPhone home screen is how it's tested for now (below). Desktop web is for **preview and feedback** only.
- **Stages:** All four are playable end to end (Neon City, Sunset Beach, Midnight Mountains, Victory Dawn), each with its own scenery, music, colours and arc. See `docs/PROJECT_PLAN.md` §1.

---

## Testing on the phone

The game is on **Expo SDK 58** (step U1, October 2026), the version Expo Go on the iPhone opens. Expo Go only opens projects on its own SDK version and updates itself, so when Expo Go moves on, the game needs the next upgrade. The other phone test is **Safari**: the home screen web app (https://stickman-runner-twoshedzzs-projects.vercel.app, updated by a push to `main`), or a development server on the Mac opened in Safari on the same Wi-Fi.

SDK 58 needs **Node 22.13 or newer**. The Mac's default Node is 20; Node 24 is installed through `fnm`, so run commands as `fnm exec --using=24 npm …` (or put `~/.local/share/fnm/node-versions/v24.14.1/installation/bin` first on the PATH). `package.json` says so in `engines`, which also tells Vercel which Node to build with.

Expo Go 58 refuses a project from a Mac that isn't signed in to Expo when the phone's Expo Go is signed in ("not signed in to Expo CLI"). The Mac was signed in as twoshedzz on 2026-10-25 (`npx expo login`, with `NODE_EXTRA_CA_CERTS` set for the office network's filter); restart the dev server after signing in.

---

## Key technical decisions (as of now)

| Area | Decision | Where it’s documented |
|------|----------|----------------------|
| **Stage progress** | Time-based: each stage lasts as long as its music (`durationSec`, 174–180 sec), not distance or frame count. `distance` is derived from time so visuals and audio stay in sync. | `STAGE_DESIGN.md`, `ARCHITECTURE.md` §5 |
| **Game logic** | All coordinates and logic use a fixed **600×350** “logical” size (`SCREEN_WIDTH` / `SCREEN_HEIGHT` in `src/game/constants.ts`). Physics, spawn, collisions never use raw viewport pixels. | `STAGE1_REVIEW.md`, `ARCHITECTURE.md` §11 |
| **One frame, one place** | The frame's order (scroll, physics, spawn, sparks, collisions, pickups) is `stepWorld` in `src/game/step.ts`, used by the game and by the pretend player that measures difficulty. | `ARCHITECTURE.md` “How the code fits together” |
| **Obstacles describe themselves** | What each obstacle is and does lives in one table, `src/game/obstacleCatalogue.ts`; nothing else checks obstacle names. | `ARCHITECTURE.md` recipes |
| **Mobile viewport** | On phones (the app and phone browsers), the game **fills the screen** with a single uniform scale (no stretching). When the device is wide, the **drawn** width can be &gt; 600 so obstacles have a longer run-in; the action stays centred (`gameOffsetX`). | `ARCHITECTURE.md` §11, `HISTORY.md` |
| **Web viewport** | Desktop browsers get a **fixed 600×350** viewport; the game does **not** fill the browser. It’s a small preview window. | `ARCHITECTURE.md` §11, `HISTORY.md` |
| **Web stability** | Web uses **Skia/CanvasKit (WASM)** for drawing. The old `Aborted()` crashes turned out to be a memory leak in Skia's web renderer, fixed by a patch until SDK 58 and by Skia itself since; the setup is still heavier and more delicate than the phone's. | `WEB_PATCHES_AND_ARCHITECTURE.md` |
| **React Compiler** | On for the whole app (`app.json`). The game state object changes every frame without React being told, so the game screen files start with `'use no memo'`, and drawing components are handed plain numbers. | `ARCHITECTURE.md` “Rules that keep it safe” |
| **Where to tweak** | **Mechanics:** `src/game/constants.ts` (global) and `src/game/stages.ts` (per-stage). **Visuals:** each stage’s `timeline` and `sky` in `stages.ts` (worked out by `src/game/sky.ts`); its scenery from `backgrounds/scenery.ts`; obstacle drawings in `ObstacleLayer.tsx`. | `ARCHITECTURE.md` “Where to change what” |

---

## Docs to read when relevant

- **`PROJECT_PLAN.md`** – **The single project plan**: where things stand, decisions locked in, each step in order with its status, the ideas inbox, and a summary table. Read it before starting any work. One planner session owns it; other sessions report what they did and the planner records it.
- **`ARCHITECTURE.md`** – Why the game is built the way it is, how the code fits together, where to change what, three recipes (add an obstacle, a stage, a mechanic) and the rules that keep changes safe.
- **`STAGE_DESIGN.md`** – Why stages run on the clock, and how audio/visuals stay in sync.
- **`STAGE1_REVIEW.md`** – How stage 1 works end-to-end (loop → step → physics → spawn → collisions → sky → render), and the contract every stage keeps.
- **`DIFFICULTY.md`** – How hard each stage is, measured by the pretend player (`npm run difficulty`). Don't edit by hand.
- **`WEB_PATCHES_AND_ARCHITECTURE.md`** – What the Expo, CanvasKit and Skia patches do, and why web is more delicate than the phone.
- **`HISTORY.md`** – The full record: debugging sessions, completed plans and the architecture pass. Read this if you need to know *why* something is built the way it is, not just how it works today.
- **`CURSOR_AGENTS_AND_CHATS.md`** – Plain-language note on Cursor chat names and when to use one vs multiple agents/chats.

---

## Important paths in the repo

- **Game logic:** `src/game/` (state, the frame in `step.ts`, loop, systems, obstacle table, patterns, pickups, sky, stages, constants).
- **Rendering:** `src/components/GameCanvas.tsx` (main canvas), `ObstacleLayer.tsx`, `GridFloor.tsx`, `backgrounds/` (`scenery.ts` picks each stage's), `Stickman.tsx`; menus in `src/components/menu/`.
- **Screen:** `src/screens/GameScreen.tsx`, with its jobs in `src/screens/game/` (which screen shows, input, music, loading, pause, world scoreboard, viewport size and scale).
- **Web Skia/WASM:** `src/skiaWasmPreload.web.ts`, `src/components/WasmGate.web.tsx`, `app/_layout.tsx` (gating and lazy load).
- **Patches:** none since SDK 58; `WEB_PATCHES_AND_ARCHITECTURE.md` has what the old ones did, why they went, and how to add one.
- **Before/after checks:** `scripts/checks/` (the browser scripts below: frozen clock, every screen, input, music in the tap, web memory). Its README says how to run them.

---

## When adding features or fixing bugs

- Follow the recipes and rules in `ARCHITECTURE.md`. Every stage keeps the contract in `STAGE1_REVIEW.md` (time-based progress, distance from progress, sky from the timeline).
- For **web:** Prefer reducing load (fewer draw calls, fewer particles) or documenting limitations.
- For **explanations:** When the project owner is involved, include a short “what this does and why” in plain language, and call out architecture or “best approach” when it matters.
- **Pete often runs several Claude sessions at once.** Each session that builds something works in its own copy of the project (a git *worktree*) under `.claude/worktrees/`. Check `git status` and commit only your own files.

---

## How to check a change

What the architecture-pass sessions learned (October 2026). The plan's “How each step is checked” has the list for each step; these are the how-tos.

- **The basics:** `npx tsc --noEmit` clean, `npx expo lint` no worse (since SDK 58: 0 errors, 40 warnings, most of them the React Compiler's checks flagging the ref-held game state on purpose), `npm test` passing. In a worktree, check `npx jest --listTests` finds the tests (it should list 16 or more files): the rules that skip other sessions' copies once skipped your own too (fixed in October 2026).
- **“Nothing changed” for gameplay:** `npm run difficulty` before and after must give byte-identical DIFFICULTY.md files. Compare two fresh runs with each other, not with the committed file: the default is 12 runs per stage and skill (about 2½ minutes), and the committed file was made with `DIFFICULTY_RUNS=20` (about 5). Put DIFFICULTY.md back afterwards if it was only a check.
- **“Nothing changed” on screen:** capture the page before and after and compare. The page's layout (the HTML with the canvas taken out) and the game's numbers are exact; canvas pixels differ slightly even between two runs of the same code (dust, sparks), so use them as a rough check. Away from play the canvas no longer redraws, and a canvas that hasn't just drawn reads as blank, so behind a menu compare the HTML and numbers only. Since Skia 2.14 (SDK 58) the canvas is drawn straight after each update rather than on the next frame, so read it the moment Skia finishes (`scripts/checks/frozen-clock.js` does, via `Surface.flush`).
- **A frozen stand-in clock for the browser pane.** When the pane is hidden, the browser barely runs the game's frames, and a hidden page counts as “the app went to the background”, which pauses the run. What works: replace `Date.now`, `performance.now` and `requestAnimationFrame` with your own clock, step frames by hand, seed `Math.random`, block `visibilitychange`, and mute the music (`HTMLMediaElement.prototype.play`) with its clock ignored. Take one screenshot after installing it so the loop's waiting frame moves onto your clock, and watch for the old loop joining as a second one. Reload the page afterwards, or the music stays muted.
- **Phone size in the pane:** 740×360 counts as a phone (touch on, the phone-browser layout); 900×500 is the desktop preview.
- **Touch:** use touch events. Synthetic pointer events break the gesture library (a `setPointerCapture` error).
- **Music starting in the tap:** wrap `HTMLMediaElement.prototype.play` and log whether each call happens inside a tap's handler; the log should be the same before and after.
- **Smoothness:** judge it only on Vercel. Any build served from the Mac over Wi-Fi stalls on the iPhone, even the live site's own code, so a Mac-served build is for checking behaviour only.
- **Shorter stages for a test:** lower a stage's `durationSec` in `stages.ts`, marked `// TEMP`, and put it back before committing.
