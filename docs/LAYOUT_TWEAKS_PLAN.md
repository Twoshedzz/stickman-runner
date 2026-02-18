# Plan: Layout tweaks with no functional impact on grid maths or background queuing

This document plans cosmetic/layout changes so that:
- **Grid computation** (perspective, scroll, cell spacing) remains correct and the grid always fills the screen with no lines “appearing” at the edge.
- **Background strip queuing** (distance-based queue, per-tile strip type, pruning) is unchanged; only where/when strips are **drawn** (vertical extent and draw order) changes.

---

## 1. Scrolling grid: center perspective and active zone on wide screens

### Problem
On wide mobile screens (`viewWidth > 600`), the grid’s single-point perspective (vanishing point) is fixed at `VANISH_X = SCREEN_WIDTH / 2` (300). The grid extends to `viewWidth`, but vertical lines are generated from a span around 300, so on a wide screen the player can see new lines appearing at the right edge instead of a full, pre-existing grid.

### Desired
- **Vanishing point** = center of the **visible screen** (i.e. `viewWidth / 2`), not the fixed logical 300.
- **Active game zone** = a **fixed 600 px wide** band (player, obstacles, spawn) **centered** in the view. The **runner is always on the left** of this 600 px action space (at `PLAYER_X = 50` in logical space). On wider screens the whole 600 px band is centered, so the runner is further from the physical left edge of the screen but still on the left of the central action space. The grid scrolls as a complete animated grid across the full width.

### Approach (no change to grid maths or queuing)

1. **Grid (GridFloor.tsx)**
   - **VANISH_X**: use `viewWidth / 2` instead of `SCREEN_WIDTH / 2`. The grid is already parameterized by `viewWidth`; only the vanishing point constant changes so the “spinning spokes” center is at screen center.
   - **Vertical line span**: keep generating lines so the grid always covers the full `viewWidth` (e.g. `halfSpan` from center). No change to scroll formula (`scrollOffset` from `gameState.distance`, `CELL_WIDTH`, `GRID_SPEED_NUDGE`).
   - **Horizontal lines**: already full width `viewWidth`; no change.
   - **Result**: Grid maths (perspective rays, scroll offset, cell spacing) unchanged; only the X position of the vanishing point is screen-relative.

2. **Game space vs view space (centering the 600-wide action space)**
   - **Option A (recommended):** Keep all **game logic** in a 600-wide logical space (spawn, obstacles, **player at left of zone** `PLAYER_X = 50`, arch, collision). Introduce a **view offset** `gameOffsetX = (viewWidth - SCREEN_WIDTH) / 2`. When **drawing** in GameCanvas:
     - Draw sky, grid, ground line, grid background across full `viewWidth` (already the case for grid).
     - Draw **player, obstacles, arch, particles** at `logicalX + gameOffsetX` (so the 0..600 band is centered in the view).
     - The runner is drawn at `gameOffsetX + PLAYER_X`: always on the **left** of the 600 px central action space; on wide screens he is further from the screen's left edge because the whole band is centered.
     - **Spawn/collision**: remain in logical space (0..600 + scroll); no change to spawn or collision maths.
   - **Option B:** Move player to `viewWidth/2` and have obstacles spawn relative to that. This would require spawn and collision to use `viewWidth` and a “camera” and is a larger change; Option A is minimal and keeps all existing maths.

3. **What must not change**
   - `scrollOffset` in GridFloor (still from `gameState.distance`, `courseLength`, `CELL_WIDTH`, `GRID_SPEED_NUDGE`).
   - Spawn positions (still `SCREEN_WIDTH + 200`, etc.) and collision (still `PLAYER_X`, `player.y`, `RUNNER_GROUND_Y`).
   - Background queuing (still uses `gameState.distance` and `SCREEN_WIDTH`/`CITY_WIDTH` for tile positions; parallax and queue are distance-based, not viewWidth-based).

### Files to touch
- **GridFloor.tsx**: `VANISH_X` from constant `SCREEN_WIDTH/2` to prop/`viewWidth/2` (already has `viewWidth`).
- **GameCanvas.tsx**: apply `gameOffsetX` when drawing player, obstacles, arch, particles (and any other 600-space content). Sky/city/grid can stay full-width; grid already uses `viewWidth`.
- **GameScreen.tsx**: no change to `viewWidth` calculation; already passes `viewWidth` to GameCanvas.

### Success criteria
- Grid scrolls smoothly across the **full** screen as a complete grid; no vertical lines “appearing” at the right on wide screens.
- Vanishing point is at the center of the screen.
- The 600 px action space is centered in the view. The **runner is always on the left** of that space (at 50 px in logical space); on wide screens he is further from the physical left edge so he stays within the central 600 px. Obstacles and arch also sit in the same 600-wide band.

---

## 2. Buildings and parallax above the grid; grid has its own background

### Desired
- Buildings and background parallax (city strips, beach, etc.) appear **above** the grid (drawn on top of the grid visually).
- **Bottom of sprites** touches the **topmost grid line** (i.e. `y = GROUND_Y = SCREEN_HEIGHT - GROUND_HEIGHT`).
- The grid has its own background colour behind the lines (already the case: `Rect` at `GROUND_Y` with `GRID_HEIGHT + 2`).

### Approach

1. **Draw order in GameCanvas**
   - Current order: Sky → Sun → Moon → City/background → **Grid** → Ground line → Arch → Obstacles → Player.
   - New order: Sky → Sun → Moon → **Grid (with background Rect)** → **City/parallax** (and other BGs) → Ground line → Arch → Obstacles → Player.
   - So: draw grid first (with its background), then city/beach so they sit **on top of** the grid. Bottom of city band should meet the grid top.

2. **City strips (and other parallax) vertical extent**
   - **CityStripBackground**: today strips are drawn full height (`y={0}`, `height={SCREEN_HEIGHT}`). Constrain so the **building band ends at the grid top**:
     - Define **grid top** as `GRID_TOP_Y = SCREEN_HEIGHT - GROUND_HEIGHT` (same as `GROUND_Y`).
     - Draw strips from `y=0` to `y=GRID_TOP_Y` (i.e. strip height = `GRID_TOP_Y`). Use Skia `Image` with a destination rect that crops/clips the strip so the bottom of the visible strip is at `GRID_TOP_Y`. So: `<Image … y={0} height={GRID_TOP_Y} … />` and ensure the image is scaled/cropped so the **bottom** of the strip content aligns with the bottom of this rect (e.g. `fit="cover"` with alignment to bottom, or draw with `y=0` and height `GRID_TOP_Y` so the top of the strip is at 0 and the bottom at `GRID_TOP_Y`).
   - Strip **queuing and parallax maths** are unchanged: still use `gameState.distance`, `BACK_RATE`, `FRONT_RATE`, `CITY_WIDTH`, same tile positions and per-tile strip type. Only the **vertical draw region** changes.
   - **BUILDING_BAND_TOP** in CityStripBackground is used for fallback Rects; the “building band” in the PNG can still be defined the same way; we just draw the strip into a rect that ends at `GRID_TOP_Y`.

3. **Non-city backgrounds (e.g. SynthwaveBeachBackground)**
   - Same idea: draw above the grid, bottom of scenery at `GRID_TOP_Y`. Adjust any ocean/ground rects so they don’t overlap the grid; scenery sits above the grid.

### What must not change
- Parallax scroll (distance * rate), tile offsets, queue (startDistance, getStripTypeForDistance, pruning). All of that is independent of where we clip the vertical draw.
- Grid: `GROUND_Y`, `GRID_HEIGHT`, `scrollOffset`, perspective maths unchanged.

### Files to touch
- **GameCanvas.tsx**: reorder children so Grid (with background) is drawn before CityStripBackground / renderNonCityBackground.
- **CityStripBackground.tsx**: pass or import `GRID_TOP_Y` (or `SCREEN_HEIGHT - GROUND_HEIGHT`); draw Images (and fallback Rects) in a rect from 0 to `GRID_TOP_Y`; keep Image source aspect ratio (see next section for front-layer height scale).
- **SynthwaveBeachBackground.tsx** (if used): ensure scenery bottom aligns to grid top.

### Success criteria
- Buildings/parallax are drawn **above** the grid.
- Bottom of building (and other parallax) sprites touches the topmost grid line.
- Grid still has its own background colour behind the lines.

---

## 3. Foreground building sprites: reduce height, keep aspect ratio

### Desired
- Foreground (front) building layer is a bit too large; reduce its **height** and keep PNG aspect ratio (no stretch).

### Approach
- **Front layer only**: draw the front strip at a **reduced height** with the **same aspect ratio** (scale width by the same factor so the image is not stretched).
  - Example: if we want front layer at 80% height, use drawn height `H_front = GRID_TOP_Y * 0.8` (or similar) and drawn width per tile = `CITY_WIDTH * (H_front / SCREEN_HEIGHT)` so aspect ratio of the PNG is preserved. That would make the front layer not full-width; we still need to **tile** horizontally so the strip repeats. So: each front tile is drawn at width `W = CITY_WIDTH * scaleFactor`, height `H = GRID_TOP_Y * scaleFactor` (or a fixed scale like 0.85). Tile with step `W` so the strip scrolls seamlessly.
- **Back layer**: can stay full-width/full-height (or same scale as front for consistency); plan can keep back layer as-is and only scale front, or scale both by the same factor.
- **Queuing**: unchanged; we still choose back_no/some/all and front_no/some/all per tile from the queue. Only the **draw size** of the front (and optionally back) Image changes.

### Implementation detail
- In CityStripBackground, for the **front** layer: choose a scale factor (e.g. `FRONT_LAYER_SCALE = 0.85`). Draw front Image with `width={CITY_WIDTH * FRONT_LAYER_SCALE}`, `height={GRID_TOP_Y * FRONT_LAYER_SCALE}` (or similar so bottom aligns to grid top). Horizontal tiling: still use two tiles at `frontOffset` and `frontOffset + CITY_WIDTH` for **scroll**, but each tile’s drawn width is `CITY_WIDTH * FRONT_LAYER_SCALE` so we may need to draw more than two tiles to cover the screen, or keep two tiles at full scroll width and accept that the front layer is scaled down (then the “strip” repeats every `CITY_WIDTH` in scroll space). Easiest: draw two front tiles at the same positions as now, but with `width` and `height` scaled so aspect ratio is kept and height is reduced; the strip will still tile at `CITY_WIDTH` in scroll, but the drawn tile size is smaller—so we’d draw more tiles to fill the width, or we draw two tiles at `CITY_WIDTH` width each with a scaled height and the image fits within that (letterbox). Clarification: “reduce height, maintain aspect ratio” → scale the **content** uniformly. So drawn rect height = `GRID_TOP_Y * 0.85`, drawn rect width = `CITY_WIDTH * 0.85` for that tile. Then we still need two tiles to cover; each tile is drawn at 0.85 size, so total width covered = 2 * CITY_WIDTH * 0.85 which is > CITY_WIDTH, so we’re fine. Actually tiling: we have two tiles at translateX `frontOffset` and `frontOffset + CITY_WIDTH`. Each tile draws an image of width CITY_WIDTH (in strip space). If we draw at 0.85 scale, each tile is 0.85*CITY_WIDTH wide and 0.85*GRID_TOP_Y tall. To avoid gaps we’d still position them at frontOffset and frontOffset + CITY_WIDTH; the overlap or gap depends on how we want it. Simplest: draw the front layer at the same two positions but with scaled width/height so the image isn’t stretched and is shorter; bottom align to grid top. So `width={CITY_WIDTH}`, `height={GRID_TOP_Y * 0.85}` and use `fit="cover"` with bottom alignment, or scale uniformly and bottom-align the rect.

### What must not change
- Queue, strip type selection, parallax offset maths. Only the **rendered size** of the front (and optionally back) Image nodes.

### Files to touch
- **CityStripBackground.tsx**: for front layer Image (and fallback Rect), use a reduced height and scale width by the same factor; bottom of the drawn rect at `GRID_TOP_Y`.

### Success criteria
- Foreground building layer is visibly shorter.
- No stretch: aspect ratio of the PNGs is preserved.

---

## 4. Runner feet alignment with obstacles (move runner up 5px)

### Desired
- Bottom of runner’s feet on the same horizontal line as the bottom of obstacles.
- Runner moves up by about 5 pixels (visual only).

### Approach
- **Do not change** `RUNNER_GROUND_Y` or obstacle positions: obstacles stay at `y = RUNNER_GROUND_Y - size` (bottom at `RUNNER_GROUND_Y`).
- **Do not change** physics or collision: `groundY = RUNNER_GROUND_Y - PLAYER_SIZE`, collision still uses `player.y` and `player.y + PLAYER_SIZE`.
- **Visual only**: when drawing the **Stickman**, use `y={player.y - 5}` instead of `y={player.y}` in GameCanvas. So the runner is rendered 5px higher; hitbox and ground stay the same.

### Files to touch
- **GameCanvas.tsx**: where `<Stickman … y={player.y} … />` is used, change to `y={player.y - 5}` (or introduce a constant `RUNNER_VISUAL_Y_OFFSET = -5` and use `y={player.y + RUNNER_VISUAL_Y_OFFSET}`).

### Success criteria
- Runner’s feet (visually) align with the bottom of obstacles.
- No change to jump, collision, or spawn.

---

## 5. Summary: what stays the same

| System | What must not change |
|--------|----------------------|
| **Grid** | `scrollOffset` formula, `CELL_WIDTH`, `GRID_SPEED_NUDGE`, horizontal/vertical line maths; only VANISH_X becomes viewWidth/2. |
| **Background queuing** | Queue structure, `startDistance`, `getStripTypeForDistance`, pruning rule, `BACK_RATE`, `FRONT_RATE`, `CITY_WIDTH`, tile start distance calculation. |
| **Spawn** | Spawn in 600-wide logical space; positions and distances unchanged. |
| **Collision** | `PLAYER_X`, `player.y`, `RUNNER_GROUND_Y`, obstacle `y` and sizes. |
| **Physics** | `RUNNER_GROUND_Y`, `groundY`, jump, gravity. |

---

## 6. Suggested implementation order

1. **Runner 5px up** (GameCanvas): one-line visual offset; no dependency.
2. **Grid vanishing point** (GridFloor): VANISH_X = viewWidth/2; then test grid on a wide screen.
3. **Center 600-wide game zone** (GameCanvas): introduce `gameOffsetX`, draw player/obstacles/arch/particles at logical + offset; verify spawn/collision unchanged.
4. **Draw order: grid then city** (GameCanvas): move Grid above CityStripBackground; ensure grid has background Rect.
5. **City vertical extent** (CityStripBackground): draw strips from 0 to GRID_TOP_Y; bottom of sprites at grid top.
6. **Front layer scale** (CityStripBackground): reduce front layer height and scale width by same factor; bottom align to GRID_TOP_Y.

After each step, run on a wide mobile viewport and confirm no strip flips (queuing unchanged) and grid still scrolls correctly.
