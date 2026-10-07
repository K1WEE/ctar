# AeroChin portal — UI prototype

Status: on 2026-10-07 the owner chose the original layout with richer color instead of A/B/C. The three structural experiments remain available as reference and are excluded from the production entry. The selected color treatment is recorded in ../patient-portal.md. No structural prototype was promoted.

## Run

From `ctar-frontend`, run `npm run prototype:portal` and open:

- http://127.0.0.1:4317/patient-portal?variant=A — Today first (recommended)
- http://127.0.0.1:4317/patient-portal?variant=B — Guided preparation
- http://127.0.0.1:4317/patient-portal?variant=C — Compact overview

This separate Angular build uses the real app shell and simulated providers. It never connects to Bluetooth or a patient database. All exercise/scenario state lives in memory and resets on reload; variant selection survives in the URL. Existing navbar settings use their normal preference storage on this preview-only origin. The production build starts from the original `main.ts` and cannot route to the prototype.

## Comparison brief

Audience: older patients practicing at home, primarily entering on phones. Visitor mode: Operate.

Question: can the patient immediately identify whether there is a record today and what action to take next? Keep white canvas, AeroChin branding and blue primary actions. Preserve Thai/English, theme, font-size controls. Rewards follow practice/history in every variant. A recorded session never claims that a prescribed daily plan is complete.

A places the action across the top with calendar/latest results below. B makes the three preparation steps explicit. C gives the action a left column beside compact history on desktop. Mobile stacks content with practice first. All share the same simulated state and mission list.

Use the floating arrows or Left/Right keys to compare; keys are not intercepted in inputs, selects, editable text or dialogs. Expand Scenario controls at the bottom to exercise device readiness, recorded today, empty/loading/error history, pending sync and zero/partial/full/empty missions. The primary button advances simulated preparation and then records a sample session. Ranking content is explicitly illustrative.

## Verification — 2026-10-07

- Prototype build passed. Production build passed; existing component CSS budget warnings remain in calibration and Zen Balloon.
- Inspected all variants at 360, 768 and 1440px. Computed page width matched viewport width across light Thai/normal font and dark English/125% font.
- Computed visible prototype text contrast minimum: 6.23:1 light, 7.65:1 dark. This is a focused DOM/color check, not a full accessibility certification. Empty progress track borders use the secondary text color for a clear outline.
- Exercised connect → calibrate → practice, history loading/error/retry/empty, pending sync, and mission partial/full/empty states.
- The Impeccable detector returned no regex findings, but parser dependencies are unavailable; computed contrast was checked independently in the browser.
- Desktop screenshots: A-desktop.png, B-desktop.png, C-desktop.png.
- Real-device behavior, production navigation regression tests, and final production UI integration remain for the selected design.

## Integration gate

Ask the owner to choose A, B, C, or a concrete combination. Then implement the selected view against existing patient/session/task services, test real navigation and date-derived history, archive all prototype variants on a dedicated prototype branch, and remove prototype-only entry/config/UI from the production delivery branch. Do not commit unrelated existing work.
