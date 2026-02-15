# Mobile viewport: fill space, no stretch, web constrained

## Goals

1. **No stretching** – One uniform scale factor (scaleX = scaleY) so aspect ratio is preserved; nothing is distorted.
2. **Fill viewport on mobile** – The game view fills the screen; the **main focus** (player, HUD, action) stays in the **central 600 logical pixels**.
3. **Wider view when viewport is wide** – On mobile, when the device is wider than 600∶350, the **drawn** width becomes `viewWidth = max(600, 350 × viewportWidth/viewportHeight)`. So obstacles have a longer visible run-in and the background is on screen longer; the left 600 remains the focus. Game logic (spawn at 600, player at 50, collisions) is unchanged.
4. **Web: constrained size** – On web the game does **not** fill the browser. Use a fixed 600×350 viewport so it acts as a preview/feedback window; the game is centered in the window.

## Approach

- **Game logic** always uses **600×350** (`SCREEN_WIDTH`, `SCREEN_HEIGHT` in `constants.ts`). Spawn, physics, collisions, and “focus” are defined in that space.
- **Drawn canvas width** can be **wider than 600** on mobile when the viewport aspect is wide: `viewWidth = max(600, 350 × viewportAspect)`. Sky, grid, ground line, and background are drawn to `viewWidth`; the vanishing point and “center” of the action stay at 300 (center of 600).
- **Single uniform scale** – The drawn area is `(viewWidth × 350)`. We scale it with one factor: `scale = max(viewportWidth/viewWidth, viewportHeight/350)`, so we fill the viewport with **no stretch** (same scale in X and Y). Any overflow is cropped evenly (centered).
- **Web** – Use a fixed viewport `{ width: 600, height: 350 }`; no scale-to-fill. The 600×350 game is centered in the browser (letterboxing as needed).

## Implementation summary

| Item | Action |
|------|--------|
| **Stretching** | None. Single `scale` for both dimensions. |
| **Game logic** | Unchanged; always 600×350 (spawn at 600, player at 50, etc.). |
| **View width (mobile)** | `viewWidth = max(600, 350 × viewportWidth/viewportHeight)` so wide viewports get a wider drawn view; focus stays left 600. |
| **View width (web)** | Always 600. |
| **GameScreen** | On web: fixed 600×350, centered (no transform). On native: wrapper size `(viewWidth × 350)`, transform scale + translate to fill viewport. |
| **GameCanvas** | Accepts `viewWidth` prop; uses it for sky Rect, ground line, sun/moon horizontal center, victory-arch visibility, and passes to `GridFloor`. |
| **GridFloor** | Accepts `viewWidth`; extends grid and rect to `viewWidth`; vanishing point stays at 300. |
| **Web viewport** | `WEB_VIEWPORT = { width: 600, height: 350 }`; game does not fill the browser. |

## Optional later

- **Safe area:** Use insets so the viewport is inside the safe area (e.g. avoid notch).
- **Web max size:** If you want the web preview smaller (e.g. max 500px wide), scale 600×350 down to fit that max and center.
