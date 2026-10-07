# Calibration and game — card layout

2026-10-07: refresh of `/calibrate` and `/game` (Zen Balloon), built on the previous minimal layout. An earlier attempt that reused the portal's saturated blue panels was rejected as heavier than the original.

- Soft page background (`#f5f7fb` / dark `#0b1220`) with one white card per screen; existing brand blue `#1d4ed8` for primary actions only.
- Calibration: connected 3-step stepper, "Step n/3" eyebrow, numbered instruction rows, radial-tinted device illustration, live force panel with a 3 s timer bar, green result card with a check badge.
- Game preparation: same card, gold target chip, numbered step rows.
- Play screen (no title; single column up to 1023px, max 640px; from 1024px the scene fills the viewport height on the left and reps / hold time / cue are centred on the right): reps card with count on the right and an amber gradient bar; force shown as plain text beside the tube; hold-time card with a stopwatch icon; cue line between short rules.
- Each completed rep (including the last) shows a 1.8 s decorative praise burst over the tube (star, rays, confetti, sparkles, random word from `game.praise.1..4`). It is `aria-hidden`; the cue line announces success. Reduced motion keeps it static.
- Visual theme lives in `src/training.css`, scoped by `app-calibrate` / `app-zen-balloon` (keeps component CSS under the 4 kB budget). Zen Balloon layout and track geometry stay in the component because specs measure them in isolation. Force thresholds, track dimensions, timings, audio and navigation are unchanged.

## Isolated preview

`src/.training-theme-preview.ts` renders the real components with simulated device/account services. Build with:

```sh
./node_modules/.bin/ng build --configuration development --browser src/.training-theme-preview.ts --ts-config tsconfig.training-theme-preview.json --output-path /tmp/ctar-training-theme-preview
```

Serve the `browser` directory with SPA fallback and visit `/calibrate` or `/game` (`?theme=dark`, `?lang=en`).
