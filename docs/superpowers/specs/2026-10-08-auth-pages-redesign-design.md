# Auth pages redesign (login / register / forgot / reset)

Date: 2026-10-08

## Goals

Fix usability problems for elderly patients on the four pre-login pages, make
them visually consistent with the in-app navbar, remove duplicated markup, and
fix the missing `patients` row for sign-ups that require email confirmation.

## Shared components (`src/app/components/auth/`)

- `password-policy.ts` — single source for password rules: `PASSWORD_RULES`
  (id, i18n key, test fn) and a zod `passwordSchema` built from them. Used by
  register and reset-password.
- `AuthShellComponent` (`app-auth-shell`) — page + card; top row with the
  existing font-scale control and a segmented ไทย | English switch
  (`aria-pressed`); AeroChin logo (white backing in dark mode); `title` and
  `subtitle` inputs; form content projected via `<ng-content>`.
- `AuthFieldComponent` (`app-auth-field`) — `ControlValueAccessor` text input
  with label, leading icon, show/hide toggle for `type="password"`, optional
  hint slot, and an `error` input that sets red border, `aria-invalid` and
  `aria-describedby` pointing at the error text. Exposes `focus()`.
- `PasswordRulesComponent` (`app-password-rules`) — live checklist of
  `PASSWORD_RULES` for the given `password`, each rule turning into a green
  check when satisfied.

## Visual

- One accent colour on all four pages: `blue-800` (#1e40af) for primary
  button, links and focus ring. No more emerald on register.
- Placeholders `slate-400` italic; password placeholder is text
  ("กรอกรหัสผ่าน"), not bullets.
- Register first/last name stack on mobile, side by side from `sm`.

## Behaviour

- Validate on submit. Show every field error at once under its field, focus
  the first invalid field. After the first submit, errors update live.
- Server errors stay in the alert box above the submit button.
- Email validated with `z.string().email()` → `auth.error.emailInvalid`.
- Login: empty fields show field errors; "Email not confirmed" maps to
  `error.emailNotConfirmed`.
- Register: password checklist; when sign-up returns no session, replace the
  form with a success panel naming the email and a "go to login" button. The
  client no longer inserts into `patients` and no longer sends `role` in
  metadata.
- Forgot: same email validation; existing success panel inside the new shell.
- Reset: password checklist; mismatch error under the confirm field; when the
  reset link is invalid, hide the form and show a "request a new link" button
  to `/forgot-password`.
- Unchanged: post-login route (`/dashboard`), Supabase service API.

## Database

`supabase/migration_20261008_auto_create_patient.sql`:

- `public.handle_new_user()` (`SECURITY DEFINER`) + `AFTER INSERT ON
  auth.users` trigger inserting `patients(id, first_name, last_name, role)`
  from `raw_user_meta_data`, `''` when missing, `ON CONFLICT (id) DO NOTHING`.
- Role is hard-coded `'user'`: during sign-up `auth.uid()` is NULL so
  `force_user_role_on_insert` does not fire, and metadata is user-controlled.
- Backfill existing `auth.users` without a `patients` row.
- Mirror in `schema.sql`.

## Testing

Karma/Jasmine specs: `password-policy.spec.ts`, `auth-field.component.spec.ts`,
`login.component.spec.ts`, `register.component.spec.ts`. SQL verified manually
(steps in migration comment). Visual check of all four pages at 375px and
desktop, light and dark.
