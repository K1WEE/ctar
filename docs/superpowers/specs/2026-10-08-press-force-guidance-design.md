# Press-force guidance on the calibration screen

## Problem

User testing of the "วัดแรง" (measure) step in `/calibrate` showed two failures:

1. Users don't realise they must start pressing — they sit on the "ทดสอบอุปกรณ์" screen waiting.
2. Users who do press don't press at full strength, so the calibrated peak is too low.

Users don't read the instruction text, and voice cues can't be relied on: patients often use the app in public places with sound off. Guidance must work **visually and through haptics alone**; voice stays as a supplement.

## Scope

Only the `waiting` and `pulling` states of `CalibrateComponent`
(`src/app/components/calibrate/calibrate.component.ts`, styles in `src/training.css`).
No changes to calibration logic, thresholds that start the test (2 N held 200 ms), the 3 s test length, or stored values.

## Design

### 1. Waiting state — one instruction, shown not written

- Remove the 3-item instruction list in the `waiting` state.
- Under the device illustration show a single large prompt: **"กดคางลง สุดแรง!"** / **"Press your chin down — as hard as you can!"** (new i18n key).
- The chin-tuck demo keeps its looping press-arrow animation.
- **Idle nudge at 4 s:** if no force ≥ 0.5 N has arrived 4 s after entering `waiting`, the device stage gets a pulsing animation and the phone vibrates once (`biofeedback.vibrate`). The nudge clears as soon as force arrives. Under `prefers-reduced-motion` the pulse is replaced by a static highlight (border/glow), since the global rule collapses animations.
- The existing 10 s text hint + `cue_no_force.mp3` voice stay unchanged.

### 2. Force ring — fill to 10 N, then colour climbs

- Ring fill = `min(force / 10 N, 1)` (as now, `forceRingMax = 10`).
- Above 10 N the ring stays full and its colour interpolates continuously by live force:

| Force | Ring | Level label (under the number) |
|---|---|---|
| 0 – <5 N | blue, filling | **เบาไป กดอีก!** / Too light — press harder! |
| 5 – <10 N | blue, nearly full | **อีกนิด!** / Almost there! |
| 10 – <20 N | full, blue → green | **ดีมาก แรงอีก!** / Good — harder! |
| 20 – <30 N | full, green → orange | **เยี่ยม!** / Great! |
| ≥ 30 N | full, orange-gold + glow | **สุดยอด!** / Amazing! |

- Colour stops: 10 N `#1d4ed8` (brand blue) → 20 N `#059669` (green) → 30 N `#f59e0b` (amber/gold). No red — it reads as danger / "too much".
- **Label uses the session peak, not live force:** during one attempt the label only moves up (based on `ctar.peakForce()` for the current attempt, reset when a new attempt starts), so jittery readings don't make it flicker. The number and ring stay live.
- **Haptic per level-up:** one short vibration each time the label advances to a higher level. Never on the way down.
- The label is visible whenever the live-force readout is visible (force ≥ 0.5 N or `pulling`).

### Structure

- Pure helpers in a new `src/app/components/calibrate/force-guidance.ts`:
  - `forceLevel(force: number): 0 | 1 | 2 | 3 | 4` — thresholds 5 / 10 / 20 / 30 N.
  - `forceRingColor(force: number): string` — interpolated colour per the table.
- Component keeps track of the highest level reached in the current attempt and the idle-nudge timer; template binds ring `stroke`, label text, and a `nudge` class.
- i18n keys for the prompt and five level labels in `i18n.service.ts`.

### Testing

- Unit tests (`force-guidance.spec.ts`) for level boundaries (4.9 / 5 / 9.9 / 10 / 20 / 30 N, NaN, negative) and colour endpoints.
- Manual check via the simulate device: idle nudge after 4 s, label only climbs, colour shift above 10 N, dark mode, phone width.
