# Patient portal — white, cobalt, emerald, and gold

Revised direction: 2026-10-06. The owner rejected the cream canvas and muted treatment; the light canvas is now pure white, with stronger cobalt, emerald progress, and golden rewards. Visitor mode: Operate.

## Intent and boundary

Make daily practice feel warm, fresh, and encouraging for older patients, while keeping the current layout, copy, navigation, and exercise behavior. Applies to `ctar-frontend` patient portal, its weekly missions and leaderboard, and the shared navbar/settings only on `/patient-portal`. The older `ctar-for-deploy` project is outside this change.

## Color roles

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#FFFFFF` | `#17202C` |
| Card | `#FFFFFF` | `#222F3D` |
| Quiet surface | `#F0F5FF` | `#2C3947` |
| Text | `#172B4D` | `#F4F1EA` |
| Secondary text | `#506079` | `#BCC8D5` |
| Action / today / focus | `#1746C8` | `#A9C9FF` |
| Action surface | `#EDF3FF` | `#293F5D` |
| Progress / success | `#08745A` | `#98D8B4` |
| Success surface | `#E3F5ED` | `#253E35` |
| Reward text | `#70410D` | `#FFD2AE` |
| Reward surface | `#FFE3A3` | `#49362B` |

The welcome region uses saturated cobalt with a golden primary action in both themes. Overall progress owns a solid emerald field with light text and a mint progress bar. Completed calendar cells retain dark green with white checks; today's outline remains blue even when completed. Red errors and amber pending-sync warnings retain their established meaning. Do not assign arbitrary hues to individual statistics.

Roles are CSS custom properties scoped to `.patient-palette` and `[data-home-navbar]` in `src/styles.css`. Portal role classes use the `pp-` prefix. Navbar overrides require its portal route marker; other routes keep their existing styling.

## Interaction and readability

Preserve Thai/English, the text-size control, device feedback, reduced-motion support, and connect → calibrate → start navigation. Carousel controls keep small visual dots inside 44px hit areas, with visible keyboard focus and a current-item indicator. The leaderboard wraps names on small screens, hides its redundant avatar below 480px, and scrolls within the available height.

Use solid surfaces and existing icons. Body text must reach 4.5:1 and meaningful graphics/focus indicators 3:1. Success includes checks and accessible labels; reward information includes stars and numeric values. No new claims, animations, or decorative illustrations.

## Verification recipe

Build the existing isolated `src/.home-preview.ts` entry with `tsconfig.home-preview.json`; it uses simulated patient/device data. Supported query parameters include `theme=dark`, `font=large`, `lang=en`, `data=empty|error|loading`, `device=off`, `calibrated=no`, and `pending=yes`. Open settings to instantiate the existing font-size control when checking its persisted 125% setting.

Check 360px, 768px, and 1440px widths, both themes, populated/empty/error/loading states, settings, leaderboard, completed missions, focus, and navigation. Confirm that the shared navbar retains its original styling after leaving the portal. Keep visual review bounded to one batched inspection and one confirmation after fixes.

## Verification results (2026-10-06)

- Production, development, and isolated preview builds passed; document-shell regression test passed. Production retains existing component-style size warnings for calibration and Zen Balloon, outside this change.
- Browser checks covered 360px light/dark, 768px empty/pending-sync and error, desktop populated, 125% English, settings, and leaderboard. Navigation to calibration removed the portal navbar marker and restored the original white shell.
- Previous revision: computed rendered text contrast checks on the populated portal found minimum 5.30:1 in light and 5.74:1 in dark. No horizontal page overflow at 360px, including 125% English.
- Impeccable detector ran in degraded regex mode because its optional parser modules were unavailable. Its sole finding called the carousel dot pseudo-element a side-tab accent; this is a false positive (a centered 10px round dot within a 44px button). Computed contrast was checked separately in the browser.

## Brighter white-canvas revision

The welcome panel is cobalt `#1746C8`, its primary button gold `#FFE28A` with dark blue `#173168` text. The overall-progress panel locally remaps its color roles to emerald `#075E52` (dark mode `#105A50`), white headings, `#E0F3EB` body text, and `#B9F3CD` progress fill. Local remapping keeps other success surfaces quiet. The navbar and page canvas are pure white in light mode.

Rendered text checks for this revision: minimum 5.84:1 on light desktop and 6.27:1 on dark mobile at 125% text, with no horizontal page overflow. The existing dark-theme option remains available. The detector still uses its degraded regex fallback.

## Latest adjustment — lighter blue/green, white start button

The owner requested brighter blue and green, and rejected the gold start button. Welcome now uses `#246BD6` with white body text; its primary button is white with a blue play icon on a pale-blue disc and a small offset shadow. Hover remains near-white. Gold remains only in reward accents. The light progress panel is fresh mint `#BDF1D7` with dark green text; dark mode uses brighter emerald `#17795B` with white text. These values supersede the earlier cobalt/gold action and deep-emerald panel above. Page and navbar remain white in light mode.

## 2026-10-07 — original layout retained, more color

The owner selected the original portal composition instead of prototype A/B/C and requested richer color. Layout, carousel, copy, navigation and exercise behavior stay as implemented. The new rules are scoped to `.patient-palette.pp-page` so other routes and the isolated structural prototypes do not acquire this treatment.

- Welcome: vivid blue `#195DD8`, white action, deep-blue device status.
- Training: very pale blue surface and stronger `#D9E8FF` statistic tiles, with blue text. All statistics use the same color role.
- Progress: fresh emerald/mint `#8EE8BF`, dark green text and clearly outlined pale tracks.
- Missions/rewards: warm gold `#FFF0C7` mission surface and `#FFDB79` reward accents, with dark brown text.
- Dark mode composes blue, emerald and gold on deep surfaces with light text.

Preview: `npm run preview:portal` → http://127.0.0.1:4318/patient-portal?device=off&calibrated=no (simulated patient/device data through the existing isolated entry).

Verification: preview build passed. Computed visible text contrast minimum 5.57:1 on the light portal, 6.01:1 on the dark portal, and 5.16:1 with the dark leaderboard open. Inspected 1440px desktop, 360px mobile, and 768px tablet; dark English at 125% had no horizontal page overflow. The Impeccable regex fallback returned no findings; full parser unavailable. Screenshot: `patient-portal-colorful-desktop.png`.
