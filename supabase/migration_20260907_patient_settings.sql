-- Run in the SQL Editor of the Supabase project used by the frontend.
-- Safe to rerun; existing patient settings are preserved.
BEGIN;

ALTER TABLE public.patients
    ADD COLUMN IF NOT EXISTS target_reps INTEGER DEFAULT 15,
    ADD COLUMN IF NOT EXISTS hold_duration_ms INTEGER DEFAULT 2000;

-- Match schema.sql's column privileges; existing RLS policies still apply.
GRANT UPDATE (target_reps, hold_duration_ms) ON public.patients TO authenticated;

-- Refresh the REST API schema after committing the new columns.
NOTIFY pgrst, 'reload schema';

COMMIT;
