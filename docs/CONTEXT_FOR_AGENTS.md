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
- **Target:** Mobile (iOS/Android) is the **primary platform**. Web is for **preview and feedback** only; it is not expected to be as stable or full-featured as mobile.
- **Stages:** The game has multiple stages (e.g. stage 1: Neon City). Stage 1 is the “stable platform”; stages 2–4 are to be built on the same pattern. See `docs/STAGE_DESIGN.md` and `docs/STAGE1_REVIEW.md`.

---

## Key technical decisions (as of now)

| Area | Decision | Where it’s documented |
|------|----------|----------------------|
| **Stage progress** | Time-based (3 min per stage), not distance or frame count. `distance` is derived from time so visuals and audio stay in sync. | `STAGE_DESIGN.md`, `STAGE1_REVIEW.md` |
| **Game logic** | All coordinates and logic use a fixed **600×350** “logical” size (`SCREEN_WIDTH` / `SCREEN_HEIGHT` in `src/game/constants.ts`). Physics, spawn, collisions never use raw viewport pixels. | `STAGE1_REVIEW.md`, `MOBILE_VIEWPORT_PLAN.md` |
| **Mobile viewport** | On mobile, the game **fills the screen** with a single uniform scale (no stretching). When the device is wide, the **drawn** width can be &gt; 600 so obstacles have a longer run-in; the **focus** (player, HUD) stays in the left 600. | `MOBILE_VIEWPORT_PLAN.md` |
| **Web viewport** | Web uses a **fixed 600×350** viewport; the game does **not** fill the browser. It’s a small preview window. | `MOBILE_VIEWPORT_PLAN.md` |
| **Web stability** | Web uses **Skia/CanvasKit (WASM)** for drawing. This setup is **inherently fragile** on web (code splitting + heavy rendering + WASM). We have patches and mitigations (texture-based city on web, fewer particles, one retry on “Aborted”), but **option C** is current: web is “preview only”; full experience is on mobile. A proper fix would be a **web-only renderer without Skia** (e.g. Canvas 2D). | `WEB_PATCHES_AND_ARCHITECTURE.md` |
| **Where to tweak** | **Mechanics:** `src/game/constants.ts` (global) and `src/game/stages.ts` (per-stage). **Visuals:** `getTheme()` in `GameCanvas.tsx` and each stage’s `timeline` in `stages.ts`. | `STAGE1_REVIEW.md` |

---

## Docs to read when relevant

- **`PROJECT_PLAN.md`** – **Single project and implementation plan:** stages 2–4 (beach, mountain, final lap with crowd), what happens after stage 4, making the app installable, UI uplift, stickman animations. Use it to prioritise work and stay consistent.
- **`STAGE_DESIGN.md`** – Why stages are 3 minutes, time-based progress, and how audio/visuals stay in sync.
- **`STAGE1_REVIEW.md`** – How stage 1 works end-to-end (loop → physics → spawn → collisions → theme → render), what was fixed, performance notes, and the **checklist for stages 2–4**.
- **`MOBILE_VIEWPORT_PLAN.md`** – How we fill the mobile screen without stretching, and how web stays a fixed size.
- **`WEB_PATCHES_AND_ARCHITECTURE.md`** – What the Expo and CanvasKit patches do, why web is fragile, and options (web without Skia vs mitigation vs accept preview-only).
- **`CURSOR_AGENTS_AND_CHATS.md`** – Plain-language note on Cursor chat names and when to use one vs multiple agents/chats.

---

## Important paths in the repo

- **Game logic:** `src/game/` (state, loop, physics, spawn, collisions, particles, constants, stages).
- **Rendering:** `src/components/GameCanvas.tsx` (main canvas), `GridFloor.tsx`, `backgrounds/`, `Stickman.tsx`.
- **Screen / viewport:** `src/screens/GameScreen.tsx` (viewport size, scale, web vs native).
- **Web Skia/WASM:** `src/skiaWasmPreload.web.ts`, `src/components/WasmGate.web.tsx`, `app/_layout.tsx` (gating and lazy load).
- **Patches:** `patches/expo+54.0.33.patch`, `patches/canvaskit-wasm+0.40.0.patch` (see `WEB_PATCHES_AND_ARCHITECTURE.md` for what they do).

---

## When adding features or fixing bugs

- For **stages 2–4:** Follow the contracts in `STAGE1_REVIEW.md` (time-based progress, distance from progress, spawn difficulty, theme from timeline, etc.).
- For **web:** Prefer reducing load (fewer draw calls, fewer particles) or documenting limitations; avoid assuming web will be as stable as mobile unless we add a non-Skia web renderer.
- For **explanations:** When the project owner is involved, include a short “what this does and why” in plain language, and call out architecture or “best approach” when it matters.
