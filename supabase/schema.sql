-- Supabase SQL Schema for CTAR Medical IoT
-- ----------------------------------------------------

-- Step 1: Create Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role VARCHAR DEFAULT 'user' NOT NULL,
    dob DATE,
    stars INTEGER DEFAULT 0,
    target_reps INTEGER DEFAULT 15,
    hold_duration_ms INTEGER DEFAULT 2000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 2: Create Sessions Table (Metadata)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    session_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    max_force NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    avg_force NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    reps INTEGER NOT NULL DEFAULT 0,
    duration_seconds NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    file_url TEXT NOT NULL, -- Hybrid Storage: Pointer to raw JSON/CSV in bucket
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 3: Enable Row Level Security (RLS)
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user a doctor or admin?
-- SECURITY DEFINER so the function bypasses RLS on patients, which avoids
-- infinite recursion when patients' own policies call it.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.patients
        WHERE id = auth.uid() AND role IN ('doctor', 'admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Helper: is the current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.patients
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ---- patients ----
-- A patient sees / edits only their own row; staff see / edit everyone.
CREATE POLICY "patients_select_own_or_staff"
    ON public.patients FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR public.is_staff());

CREATE POLICY "patients_insert_self"
    ON public.patients FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "patients_update_own_or_staff"
    ON public.patients FOR UPDATE
    TO authenticated
    USING (id = auth.uid() OR public.is_staff())
    WITH CHECK (id = auth.uid() OR public.is_staff());

-- Guard against privilege escalation on registration:
-- Any public client signup inserting into patients is forced to 'user'.
CREATE OR REPLACE FUNCTION public.force_user_role_on_insert()
RETURNS trigger AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        NEW.role := 'user';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_force_user_role_on_insert ON public.patients;
CREATE TRIGGER trg_force_user_role_on_insert
    BEFORE INSERT ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.force_user_role_on_insert();

-- Guard against unauthorized role changes:
-- Role changes are only permitted if the authenticated caller is an admin,
-- or if executed by the service_role (auth.uid() IS NULL).
CREATE OR REPLACE FUNCTION public.block_role_change()
RETURNS trigger AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
            RAISE EXCEPTION 'Only administrators can modify user roles';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_block_role_change ON public.patients;
CREATE TRIGGER trg_block_role_change
    BEFORE UPDATE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.block_role_change();

-- Create the patients row on sign-up, including when email confirmation is
-- pending and the client has no session yet. Role is always 'user':
-- auth.uid() is NULL here and user metadata is client-controlled.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.patients (id, first_name, last_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        'user'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Dedicated Admin RPC for changing user roles securely
CREATE OR REPLACE FUNCTION public.admin_set_user_role(target_user_id UUID, new_role TEXT)
RETURNS void AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied: caller is not an administrator';
    END IF;

    IF new_role NOT IN ('user', 'doctor', 'admin') THEN
        RAISE EXCEPTION 'Invalid role specified: %', new_role;
    END IF;

    UPDATE public.patients
    SET role = new_role
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Expose this privileged RPC only to authenticated callers.
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) TO authenticated;

-- ---- sessions ----
-- A patient reads / writes only their own sessions; staff see everyone's.
CREATE POLICY "sessions_select_own_or_staff"
    ON public.sessions FOR SELECT
    TO authenticated
    USING (patient_id = auth.uid() OR public.is_staff());

CREATE POLICY "sessions_insert_own_or_staff"
    ON public.sessions FOR INSERT
    TO authenticated
    WITH CHECK (patient_id = auth.uid() OR public.is_staff());

CREATE POLICY "sessions_update_own_or_staff"
    ON public.sessions FOR UPDATE
    TO authenticated
    USING (patient_id = auth.uid() OR public.is_staff())
    WITH CHECK (patient_id = auth.uid() OR public.is_staff());

CREATE POLICY "sessions_delete_own_or_staff"
    ON public.sessions FOR DELETE
    TO authenticated
    USING (patient_id = auth.uid() OR public.is_staff());

-- Step 4: Create raw_clinical_data Storage Bucket natively via Supabase Postgres
INSERT INTO storage.buckets (id, name, public)
VALUES ('raw_clinical_data', 'raw_clinical_data', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Bucket RLS Policies for secure data drops.
-- Files are stored as "<patientId>/session_<ts>.json", so the first path
-- segment is the owner's id. A patient may only touch their own folder;
-- staff may read every patient's raw data.
CREATE POLICY "clinical_data_insert_own"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'raw_clinical_data'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "clinical_data_select_own_or_staff"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'raw_clinical_data'
        AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff())
    );


CREATE TABLE IF NOT EXISTS public.weekly_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start DATE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'fa-star',
    target INTEGER DEFAULT 1,
    reward INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX idx_weekly_tasks_week_start
    ON public.weekly_tasks(week_start);


CREATE TABLE IF NOT EXISTS public.patient_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    task_id    UUID REFERENCES public.weekly_tasks(id) ON DELETE CASCADE,

    progress   INTEGER DEFAULT 0,
    completed  BOOLEAN DEFAULT false,
    claimed_at TIMESTAMP WITH TIME ZONE,

    -- เพิ่ม week_start เพื่อ filter สัปดาห์ได้ตรงๆ ไม่ต้อง join
    week_start DATE NOT NULL DEFAULT date_trunc('week', now())::DATE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),

    CONSTRAINT unique_patient_task UNIQUE (patient_id, task_id)
);

CREATE INDEX idx_patient_tasks_week_start
    ON public.patient_tasks(patient_id, week_start);


-- RLS
ALTER TABLE public.weekly_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_tasks ENABLE ROW LEVEL SECURITY;

-- weekly_tasks are shared catalogue content: every signed-in user may read
-- them, but only staff may create / change / remove them.
CREATE POLICY "weekly_tasks_select_all"
    ON public.weekly_tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "weekly_tasks_write_staff"
    ON public.weekly_tasks FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- patient_tasks are per-patient progress: a patient sees / updates only their
-- own rows; staff see everyone's.
CREATE POLICY "patient_tasks_select_own_or_staff"
    ON public.patient_tasks FOR SELECT TO authenticated
    USING (patient_id = auth.uid() OR public.is_staff());

CREATE POLICY "patient_tasks_insert_own_or_staff"
    ON public.patient_tasks FOR INSERT TO authenticated
    WITH CHECK (patient_id = auth.uid() OR public.is_staff());

CREATE POLICY "patient_tasks_update_own_or_staff"
    ON public.patient_tasks FOR UPDATE TO authenticated
    USING (patient_id = auth.uid() OR public.is_staff())
    WITH CHECK (patient_id = auth.uid() OR public.is_staff());

CREATE POLICY "patient_tasks_delete_own_or_staff"
    ON public.patient_tasks FOR DELETE TO authenticated
    USING (patient_id = auth.uid() OR public.is_staff());


ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS stars INTEGER DEFAULT 0;

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS target_reps INTEGER DEFAULT 15;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS hold_duration_ms INTEGER DEFAULT 2000;

-- A reward is an immutable, one-time ledger entry.  Keep this table private;
-- the SECURITY DEFINER claim function below is the only writer.
CREATE TABLE IF NOT EXISTS public.task_reward_claims (
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.weekly_tasks(id) ON DELETE CASCADE,
    reward INTEGER NOT NULL CHECK (reward >= 0),
    claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT task_reward_claims_pkey PRIMARY KEY (patient_id, task_id)
);

REVOKE ALL ON TABLE public.task_reward_claims FROM PUBLIC, anon, authenticated;

-- Calculate progress from recorded sessions, rather than trusting the
-- patient-controlled progress/completed columns in patient_tasks.
CREATE OR REPLACE FUNCTION public.patient_task_actual_progress(
    p_patient_id UUID,
    p_task_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_week_start DATE;
    v_title TEXT;
    v_target INTEGER;
    v_progress INTEGER := 0;
BEGIN
    SELECT pt.week_start, wt.title, GREATEST(COALESCE(wt.target, 1), 0)
    INTO v_week_start, v_title, v_target
    FROM public.patient_tasks pt
    JOIN public.weekly_tasks wt ON wt.id = pt.task_id
    WHERE pt.patient_id = p_patient_id AND pt.task_id = p_task_id;

    IF NOT FOUND OR v_target <= 0 THEN
        RETURN 0;
    END IF;

    IF v_title = 'นักสู้ CTAR' THEN
        SELECT COUNT(*)::INTEGER INTO v_progress
        FROM public.sessions s
        WHERE s.patient_id = p_patient_id
          AND s.session_date >= v_week_start
          AND s.session_date < (v_week_start + 7);
    ELSIF v_title = 'พลังคอสุดแกร่ง' THEN
        SELECT LEAST(v_target, GREATEST(0, FLOOR(COALESCE(MAX(s.max_force), 0))))::INTEGER
        INTO v_progress
        FROM public.sessions s
        WHERE s.patient_id = p_patient_id
          AND s.session_date >= v_week_start
          AND s.session_date < (v_week_start + 7);
    ELSIF v_title = 'สายอึด' THEN
        SELECT LEAST(v_target, GREATEST(0,
            ROUND(COALESCE(SUM(s.duration_seconds), 0) / 60.0)))::INTEGER
        INTO v_progress
        FROM public.sessions s
        WHERE s.patient_id = p_patient_id
          AND s.session_date >= v_week_start
          AND s.session_date < (v_week_start + 7);
    ELSIF v_title = 'นักฝึกต่อเนื่อง' THEN
        -- Count the longest run of distinct training days in this task week.
        WITH session_days AS (
            SELECT DISTINCT s.session_date::DATE AS training_day
            FROM public.sessions s
            WHERE s.patient_id = p_patient_id
              AND s.session_date >= v_week_start
              AND s.session_date < (v_week_start + 7)
        ), numbered_days AS (
            SELECT training_day,
                   training_day - ROW_NUMBER() OVER (ORDER BY training_day)::INTEGER AS island
            FROM session_days
        ), streaks AS (
            SELECT COUNT(*)::INTEGER AS streak_length
            FROM numbered_days
            GROUP BY island
        )
        SELECT LEAST(v_target, COALESCE(MAX(streak_length), 0))::INTEGER
        INTO v_progress
        FROM streaks;
    END IF;

    RETURN LEAST(v_target, GREATEST(COALESCE(v_progress, 0), 0));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.patient_task_actual_progress(UUID, UUID) FROM PUBLIC, anon, authenticated;

-- Preserve the existing client update flow for progress while protecting
-- completion and reward-claim state. Patients cannot move a task to another
-- patient/week or change completed/claimed_at directly; staff and the trusted
-- reward RPC remain able to maintain those values.
CREATE OR REPLACE FUNCTION public.guard_patient_task_progress()
RETURNS trigger AS $$
DECLARE
    v_task_week DATE;
    v_target INTEGER;
BEGIN
    IF auth.uid() IS NULL OR public.is_staff() THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.patient_id := auth.uid();
        SELECT wt.week_start
        INTO v_task_week
        FROM public.weekly_tasks wt
        WHERE wt.id = NEW.task_id;

        IF FOUND THEN
            NEW.week_start := v_task_week;
        END IF;
        NEW.progress := 0;
        NEW.completed := false;
        RETURN NEW;
    END IF;

    NEW.patient_id := OLD.patient_id;
    NEW.task_id := OLD.task_id;
    NEW.week_start := OLD.week_start;

    -- Patients never set progress or completion directly: both are derived
    -- from their recorded sessions, so a client can only trigger a recompute.
    -- Completion is sticky so a finished mission is never un-finished.
    SELECT GREATEST(COALESCE(wt.target, 1), 0)
    INTO v_target
    FROM public.weekly_tasks wt
    WHERE wt.id = OLD.task_id;

    NEW.progress := public.patient_task_actual_progress(OLD.patient_id, OLD.task_id);
    NEW.completed := OLD.completed OR (v_target > 0 AND NEW.progress >= v_target);

    IF NEW.claimed_at IS DISTINCT FROM OLD.claimed_at
       AND current_setting('ctar.allow_reward_claim', true) IS DISTINCT FROM 'on' THEN
        RAISE EXCEPTION 'Patients cannot change task reward claim state';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_guard_patient_task_progress ON public.patient_tasks;
CREATE TRIGGER trg_guard_patient_task_progress
    BEFORE INSERT OR UPDATE ON public.patient_tasks
    FOR EACH ROW EXECUTE FUNCTION public.guard_patient_task_progress();

-- Secure Task Reward Claiming:
-- Atomically mark a completed task as claimed before changing the patient's
-- balance. The claimed_at NULL predicate makes concurrent/retried claims pay
-- at most once.
CREATE OR REPLACE FUNCTION public.claim_task_reward(p_patient_id UUID, p_task_id UUID)
RETURNS integer AS $$
DECLARE
    v_claimed_reward integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Must be caller's own task or staff
    IF auth.uid() <> p_patient_id AND NOT public.is_staff() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- This flag lets the protected trigger distinguish this trusted operation
    -- from a direct patient UPDATE while retaining the caller identity check.
    PERFORM set_config('ctar.allow_reward_claim', 'on', true);

    UPDATE public.patient_tasks AS pt
    SET claimed_at = timezone('utc', now())
    FROM public.weekly_tasks AS wt
    WHERE pt.patient_id = p_patient_id
      AND pt.task_id = p_task_id
      AND pt.completed = true
      AND pt.claimed_at IS NULL
      AND wt.id = pt.task_id
    RETURNING COALESCE(wt.reward, 1) INTO v_claimed_reward;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task not found or not yet marked as completed';
    END IF;

    UPDATE public.patients
    SET stars = COALESCE(stars, 0) + v_claimed_reward
    WHERE id = p_patient_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Patient not found';
    END IF;

    RETURN v_claimed_reward;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Profile and exercise settings retain the existing own-or-staff RLS access.
-- Stars can only change through a
-- trusted SECURITY DEFINER reward/admin operation.
REVOKE UPDATE ON TABLE public.patients FROM authenticated;
GRANT UPDATE (first_name, last_name, dob, target_reps, hold_duration_ms) ON TABLE public.patients TO authenticated;

-- Expose this privileged RPC only to authenticated callers.
REVOKE EXECUTE ON FUNCTION public.claim_task_reward(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_task_reward(UUID, UUID) TO authenticated;

-- Secured add_stars fallback:
-- Only self or staff, with rate/amount sanity cap (1 to 50 stars per call)
CREATE OR REPLACE FUNCTION public.add_stars(patient_id UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF auth.uid() <> patient_id AND NOT public.is_staff() THEN
        RAISE EXCEPTION 'Access denied: cannot modify stars for another user';
    END IF;

    IF amount <= 0 OR amount > 50 THEN
        RAISE EXCEPTION 'Invalid star amount (must be between 1 and 50)';
    END IF;

    UPDATE public.patients
    SET stars = COALESCE(stars, 0) + amount
    WHERE id = patient_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Expose this privileged RPC only to authenticated callers.
REVOKE EXECUTE ON FUNCTION public.add_stars(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_stars(UUID, INTEGER) TO authenticated;

-- Step 5: Sessions Integrity Constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_positive_metrics'
    ) THEN
        ALTER TABLE public.sessions
            ADD CONSTRAINT check_positive_metrics
            CHECK (max_force >= 0 AND avg_force >= 0 AND reps >= 0 AND duration_seconds >= 0);
    END IF;
END $$;

-- Step 6: Clinic Patients Aggregated Summary View (Solves N+1 Query bottleneck)
-- Run this view with the caller's privileges so the patients/sessions RLS
-- policies continue to apply to every query through the view.
CREATE OR REPLACE VIEW public.clinic_patients_summary
WITH (security_invoker = true) AS
SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.role,
    p.created_at,
    COUNT(s.id)::int AS session_count,
    MAX(s.session_date) AS last_session_date,
    (
        SELECT s2.max_force
        FROM public.sessions s2
        WHERE s2.patient_id = p.id
        ORDER BY s2.session_date DESC
        LIMIT 1
    ) AS last_max_force
FROM public.patients p
LEFT JOIN public.sessions s ON s.patient_id = p.id
WHERE p.role = 'user'
GROUP BY p.id, p.first_name, p.last_name, p.role, p.created_at;

-- The summary contains protected clinical data. It is available to signed-in
-- callers only; security_invoker above limits each caller to rows allowed by
-- the underlying patients and sessions RLS policies.
REVOKE ALL ON TABLE public.clinic_patients_summary FROM PUBLIC;
REVOKE ALL ON TABLE public.clinic_patients_summary FROM anon;
REVOKE ALL ON TABLE public.clinic_patients_summary FROM authenticated;
GRANT SELECT ON TABLE public.clinic_patients_summary TO authenticated;
