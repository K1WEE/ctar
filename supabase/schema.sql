-- Supabase SQL Schema for CTAR Medical IoT
-- ----------------------------------------------------

-- Step 1: Create Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role VARCHAR DEFAULT 'user' NOT NULL,
    dob DATE,
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

-- Guard against self-promotion: block any role change that arrives through the
-- API (an authenticated JWT is present). The Supabase dashboard / service key
-- runs without auth.uid(), so role edits made there still go through.
CREATE OR REPLACE FUNCTION public.block_role_change()
RETURNS trigger AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role AND auth.uid() IS NOT NULL THEN
        RAISE EXCEPTION 'role can only be changed from the Supabase dashboard';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_role_change ON public.patients;
CREATE TRIGGER trg_block_role_change
    BEFORE UPDATE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.block_role_change();

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


-- RPC atomic stars update
CREATE OR REPLACE FUNCTION add_stars(patient_id UUID, amount INTEGER)
RETURNS void AS $$
    UPDATE patients SET stars = stars + amount WHERE id = patient_id;
$$ LANGUAGE sql SECURITY DEFINER;

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS stars INTEGER DEFAULT 0;