# CtarFrontend

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.3.17.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`. d

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Patient settings database migration

If saving patient settings fails with `PGRST204` mentioning `hold_duration_ms`
or `target_reps`, run `supabase/migration_20260907_patient_settings.sql` in the
SQL Editor of the Supabase project configured in the frontend environment.
This adds missing columns, preserves existing settings, and refreshes the REST
schema cache. It can be run more than once. Restarting Angular alone does not
update the hosted database.

After running it, save settings as a staff user, reload the patient detail page,
and verify that both values persist. The patient's game also reads these columns.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
