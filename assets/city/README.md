# City background strips (stage 1)

Drawn by `src/components/backgrounds/NeonCityScenery.tsx`.

- `front_none_1.png` … `front_none_4.png`, `back_none_1.png` … `back_none_4.png` – the
  hand-drawn buildings with no lights on, four variants per layer.
- `lights/` – the lit windows, as overlays stacked on top of the buildings at the current
  light level. Generated from the `*_none_*` strips; regenerate with:

```bash
node scripts/generate-city-lights.js
```

- `*.psd` – the source art the strips were made from.

See "City lights: from per-frame drawing to pre-generated strips" in `docs/HISTORY.md` for how
the city got here.
