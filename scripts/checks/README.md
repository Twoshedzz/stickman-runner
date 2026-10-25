# Before/after checks in the browser

Scripts for checking that a change meant to change nothing really changed nothing on screen.
They drive the web game with its clock frozen, save what every screen shows, and compare two
runs. Written during the architecture pass (A4, A5) and kept here since the SDK upgrade (U1).
`docs/CONTEXT_FOR_AGENTS.md` "How to check a change" explains why each trick is needed.

| File | Runs in | What it does |
|------|---------|--------------|
| `receiver.js` | node | Saves what the page sends (canvas PNGs, HTML, JSON) into a folder, and serves the other scripts to the page. Listens on `127.0.0.1:8099`. |
| `frozen-clock.js` | the page | Replaces the clock and `requestAnimationFrame` with one stepped by hand, seeds `Math.random`, keeps a hidden page "visible", mutes the music. Sets up `window.__fk`. `__fk.set('B')` saves each stage at fixed moments (10s, 90s, 150s, 170s, the clear). |
| `capture-screens.js` | the page, after `frozen-clock.js` | Walks through 35 screens (title, How to Play, banner, PAUSED, 3-2-1, debug, Stage Clear, Finished, Game Over, initials, world board with a pretend `/api/scores`, attract pages) saving each one's HTML without the canvas, the canvas pixels and the game numbers. Sets up `window.__a5`. |
| `input-checks.js` | the page, after both above | Real touch events and key presses: tap and double jump, swipe-down duck and hold, swipe up from a duck, keyboard, pause and resume, the pause button. Prints PASS/FAIL lines. |
| `music-in-tap.js` | a fresh page, after `frozen-clock.js` and `capture-screens.js` | Presses START GAME, RESUME, CONTINUE and PLAY AGAIN the way a tap does and logs whether the music started inside each press (iPhone Safari refuses it otherwise). `await __music.run()`; the log should match before and after. |
| `compare.js` | node | Compares two runs in a folder: HTML byte for byte (minus id counters and the menu backdrop), PNGs pixel by pixel. |

## How to run a before/after

1. Start the receiver with a folder outside the repo for the results:
   `node scripts/checks/receiver.js <shots dir>`
   (If 8099 is taken, start it with `PORT=8098` and set `window.__checksBase = 'http://127.0.0.1:8098/'` in the page first.)
2. Open the game in the browser pane: 740×360 is the phone-browser layout, 900×500 the desktop
   preview. A fresh page each time.
3. In the page's console (or the pane's JavaScript tool):
   ```js
   eval(await (await fetch('http://127.0.0.1:8099/frozen-clock.js')).text())
   ```
   then take one screenshot, so the game loop's waiting frame moves onto the frozen clock.
4. Screens: `eval(await (await fetch('http://127.0.0.1:8099/capture-screens.js')).text())`, then
   `__a5.start('B')` and poll `__a5.done` until it holds the log (about a minute).
   Stage moments: in a fresh page, turn debug on (invincible) and run `await __fk.set('B')`.
   Input: `eval(await (await fetch('http://127.0.0.1:8099/input-checks.js')).text())` after both
   others, then `await __a5in.run()`.
5. Do the same with the change in place, using a different prefix (`A`), then
   `node scripts/checks/compare.js <shots dir> B A`.
6. Reload the page afterwards: the music stays muted otherwise.

## Reading the results

- HTML and the `.json` game numbers should be `same`.
- Canvas pixels differ a little even between two runs of the same code (dust, sparks), so a
  few hundred differing pixels is noise; look at the two PNGs if it's more.
- Behind a menu the canvas doesn't redraw, and a canvas that hasn't just drawn reads as blank,
  so only the HTML and numbers count there.
