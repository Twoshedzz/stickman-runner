# City background strips (pre-generated)

Strip size: **1200 × 350** px (CITY_WIDTH × SCREEN_HEIGHT).

The repo includes **placeholder** PNGs (solid colours) so the strip approach can be tested. Regenerate them with:

```bash
node scripts/generate-city-placeholders.js
```

That overwrites the 6 strip files and `placeholder.png` with 1200×350 images (back = purple tones, front = black tones). Replace these with your own art when ready.

## Option B (6 strips)

Place PNGs here with these names (used until you add Option A variants):

- `back_no.png` – back layer, no lights (building silhouettes only)
- `back_some.png` – back layer, some lights on
- `back_all.png` – back layer, all lights on
- `front_no.png` – front layer, no lights
- `front_some.png` – front layer, some lights on
- `front_all.png` – front layer, all lights on

Until these exist, the app uses `placeholder.png` for all slots so you can test the scroll and no/some/all switching.

## Option A (60 strips, variety)

For 10 variants per state, name files:

- `back_no_00.png` … `back_no_09.png`
- `back_some_00.png` … `back_some_09.png`
- `back_all_00.png` … `back_all_09.png`
- `front_no_00.png` … `front_no_09.png`
- `front_some_00.png` … `front_some_09.png`
- `front_all_00.png` … `front_all_09.png`

See `docs/CITY_LIGHTS_PREGEN_DESIGN.md` for generation and runtime logic.
