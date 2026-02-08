# Implementation Plan: Stage 1 Feedback (grabs_080226)

Based on **feedback/grabs_080226.md** (screen grabs from 2026-02-08). This plan maps each feedback item to concrete code changes.

---

## Summary of feedback

| Segment | Distance | Feedback |
|--------|----------|----------|
| 1 | 7,200 | Some building lights should start to appear now – 1–2 per building |
| 2 | 14,400 | Moon should be descending from top; not visible. Lights good but should be on **all** buildings |
| 3 | 21,600 | **Moon not visible**; should be descending. **All** buildings should have lights on |
| 4 | 28,800 | Moon should be there, nearly disappearing behind buildings |
| 5 | 36,000 | **Fewer** lights; currently some buildings have lots, some none – should be **even** across all |
| 6 | 43,200 | **All** building lights off. Sun should have slowly changed to yellow |
| After completion | >43,200 | Game reverts to dark; end-of-3:00 look should **persist**. No loop for visuals or music |

---

## 1. Moon visibility and descent (Segments 2–4)

**Problem:** Moon is not visible in any grab; it should descend from the top and disappear behind buildings by ~28,800.

**Relevant code:**
- `src/game/stages.ts` – `celestial_moon` timeline (11000→14400, 14400→21600, 21600→opacity 0).
- `src/components/GameCanvas.tsx` – Moon drawn after sky/sun, before rear buildings (order: Sky, Sun, Moon, Back, Front).

**Planned changes:**
1. **Verify draw order** – Confirm moon is not clipped or drawn behind anything (z-order: Sky → Sun → Moon → Back buildings → Front).
2. **Verify timeline** – At 11000–14400 moon Y goes -60→80; at 14400–21600, 80→320. Ensure `getTheme()` is applied for `stage_1_city` and distance is correct (no stageId/offset bug).
3. **Visibility** – Increase moon size/contrast if needed (e.g. larger radius, brighter colour, or soft glow) so it reads clearly against the sky.
4. **Position** – Ensure moon Y is on-screen for 11000–21600 (e.g. 80–320 is within SCREEN_HEIGHT 350). Consider moving moon appearance slightly earlier (e.g. 10000) so it’s clearly “descending from top” by 1:00.
5. **Debug** – Add a temporary debug label or log when `moonOpacity > 0` and distance in 11000–21600 to confirm moon block is rendered and theme values are correct.

**Deliverable:** Moon clearly visible from ~1:00, descending, then disappearing behind buildings by ~2:00.

---

## 2. Segment 1 (0:30, 7,200): First lights – 1–2 per building

**Problem:** By end of 0:30, “some building lights should start to appear now – 1–2 per building”.

**Relevant code:**
- `stages.ts` – `night_lights` currently 7200→14400 with `startOpacity: 0`, `endOpacity: 0.5`.
- `NeonCityBackground.tsx` – Windows use `currentTheme.nightProgress > w.activationThreshold` (threshold 0–1 random).

**Planned changes:**
1. **Earlier, gentler ramp** – By 7200, `nightProgress` should be low so only a few windows pass. Options:
   - Add a short ramp 6000→7200 (or 5000→7200) with `endOpacity` ≈ 0.12–0.2 so only low-threshold windows (e.g. 1–2 per building) are on by 7,200.
   - Or keep 7200→14400 but reduce `endOpacity` at 7200 by splitting: e.g. 7200→14400 0→0.2 for “first lights”, then 14400→21600 0.2→0.85 for “all buildings filling”.
2. **Per-building cap (optional)** – If “1–2 per building” must be strict, add a per-building window limit or a separate “early lights” set of windows with lower thresholds. Prefer first a simple ramp that gives a “few lights” look by 7200.

**Deliverable:** At distance 7,200, a small number of lights visible (1–2 per building feel), not a full half-on.

---

## 3. Segments 2–3 (1:00–1:30): Lights on all buildings

**Problem:** By 1:00 and 1:30, lights should appear on **all** buildings (not just some).

**Relevant code:**
- `stages.ts` – 14400→21600: `night_lights` 0.5→0.85; 21600→32000: hold 0.85.
- Windows use `activationThreshold: Math.random()` so at 0.85 about 85% of windows are on.

**Planned changes:**
1. **Reach “all” by end of segment 3** – By 21,600, set `nightProgress` to **1.0** (or 0.98) so every window with threshold &lt; 1 is on. Change 14400→21600 to `endOpacity: 1` (or 0.98), and 21600→32000 hold at 1.
2. **Back layer** – Ensure back layer has enough windows (already increased probability) and same `nightProgress` so “all buildings” includes both layers.

**Deliverable:** By 14,400 and definitely by 21,600, all buildings show lights (no dark buildings).

---

## 4. Segment 5 (2:30, 36,000): Even “fewer lights” across buildings

**Problem:** At 2:30 some buildings have lots of lights, some none; feedback wants **fewer** lights and **even** distribution across all buildings.

**Relevant code:**
- `stages.ts` – 32000→36000: `night_lights` 0.85→0.
- With random thresholds, as progress drops from 0.85 to 0, high-threshold windows turn off first, so buildings with many high-threshold windows go dark first → uneven.

**Planned changes:**
1. **Uniform dwindling** – Instead of using the same `nightProgress` vs random threshold (which causes uneven buildings), introduce a **global multiplier** for the number of lights that are “on”:
   - Option A: Second timeline value `lightsDwindle: 1→0` from 32000→36000. When drawing windows, show a window only if `nightProgress > threshold && Math.random() < lightsDwindle` (or similar) so all buildings lose lights proportionally.
   - Option B: Don’t reduce `nightProgress`; instead reduce **number of windows drawn** uniformly (e.g. only draw every nth window, or use a global “lights on” probability that decreases from 32000→36000).
   - Option C: Keep one `nightProgress` but **reverse** the logic for “dwindle” phase: after 32000, interpret progress as “lights off” progress so we turn off windows in a more uniform way (e.g. by building or by a global random that’s seeded so it’s even).
2. **Simplest approach** – Use a separate `dwindleProgress` (0→1 from 32000→36000). For each window, show it only if `(nightProgress > activationThreshold) && (1 - dwindleProgress) > someUniformFactor`. Or: show window if `nightProgress > activationThreshold` and `Math.random() > dwindleProgress` (re-random each frame would flicker; so use a deterministic “turn off” order, e.g. sort windows by id and turn off by index as dwindleProgress increases).
3. **Recommendation** – Add `nightLightsOff: 0→1` from 32000→36000. Window visible if `nightProgress > activationThreshold && (1 - nightLightsOff) > perWindowTurnOffOrder` where per-window order is a fixed random in 0–1 stored when creating the city. So all buildings lose lights smoothly and evenly.

**Deliverable:** By 36,000, fewer lights on, with a similar “fewer” look across all buildings (no “some full, some off”).

---

## 5. Segment 6 (3:00, 43,200): All lights off; sun yellow

**Problem:** By 3:00 all building lights should be off; sun should have slowly changed to yellow.

**Relevant code:**
- `stages.ts` – 32000→36000 already goes to 0; 36000→43200 sun is already yellow (#FDB813).
- If lights are still on at 43,200, either the ramp is wrong or there’s a hold past 36000.

**Planned changes:**
1. **Lights off by 43,200** – Ensure no “hold” of night_lights after 36000. Timeline: by 36000 `nightProgress` (or equivalent) should be 0 so no windows show. If we add a “dwindle” channel, ensure it reaches “all off” by 36000 (or 38000) and stays off.
2. **Sun yellow** – Sun rise is 36000→43200 with startColor/endColor #FDB813. If feedback is “slowly changed to yellow”, consider starting the sunrise colour slightly earlier (e.g. 34000) so the shift to yellow feels gradual, or ensure the dawn gradient and sun colour are aligned so that by 43,200 the sun is clearly yellow and “just above buildings”.

**Deliverable:** At 43,200 no building lights; sun clearly yellow and in final position.

---

## 6. After completion: Persist day look; no loop

**Problem:** After stage clear, the game reverts to dark; end-of-3:00 look should persist; no loop for visuals or music.

**Relevant code:**
- `stages.ts` – Hold events 43200→999999 for sky and sun (day look).
- `GameScreen.tsx` – `stopMusic()` when `showContinue` or `gameOver`.
- `useGameLoop.ts` – On “Continue”, next stage loads and state resets (stageId, distance, etc.).

**Planned changes:**
1. **Persist visuals when showContinue** – When `showContinue === true`, the view is still “stage 1” until the user taps Continue. Ensure we don’t reset `distance` or `stageId` before the transition, and that when distance &gt; 43200 we use the “hold day” theme (already in timeline). If the screen flashes dark, check that the component that provides `gameState`/`currentTheme` still has distance ≥ 43200 and stageId === 'stage_1_city' while the “Stage Clear” modal is up.
2. **No visual loop** – Confirm there is no code that resets distance to 0 or switches theme back to night when showing “Stage Clear”. If the modal re-mounts or a different route mounts, ensure it still receives the same game state (distance, stageId) so the canvas keeps drawing the hold-day look.
3. **Music** – Already stopped on `showContinue`; confirm it doesn’t restart until the user leaves the screen or starts the next stage.

**Deliverable:** From the moment “Stage Clear” appears until “Continue” is pressed, the scene stays in the end-of-3:00 day look and music stays off.

---

## Implementation order (suggested)

1. **Moon visibility** (fix first so you can verify segments 2–4 in grabs).
2. **Lights timeline** – Segment 1 “first lights”, segments 2–3 “all buildings”, segment 5 “even fewer”, segment 6 “all off”.
3. **Dwindle logic** – Uniform “fewer lights” (segment 5).
4. **After completion** – Persist day + no loop (verify with a test run past 43,200).

---

## Files to touch

| File | Changes |
|------|--------|
| `src/game/stages.ts` | Timeline: night_lights ramps and holds; optional dwindle channel; moon timing if needed. |
| `src/components/GameCanvas.tsx` | Moon draw order/size/visibility; any debug. |
| `src/components/backgrounds/NeonCityBackground.tsx` | Window visibility logic: support “dwindle” and/or per-building behaviour if needed. |
| `src/components/GameCanvas.tsx` (getTheme) | If we add `nightLightsOff` or similar, `getTheme()` and theme type in NeonCityLayer. |
| `src/screens/GameScreen.tsx` / `useGameLoop.ts` | Only if we find a bug in state when showContinue (persist day look). |

---

## Acceptance (quick check)

- [ ] At 7,200: a few lights (1–2 per building feel).
- [ ] At 14,400 & 21,600: moon visible and descending; all buildings have lights.
- [ ] At 28,800: moon nearly gone behind buildings.
- [ ] At 36,000: fewer lights, evenly distributed across buildings.
- [ ] At 43,200: no building lights; sun yellow.
- [ ] After “Stage Clear”: day look persists; music does not restart until Continue/next stage.
