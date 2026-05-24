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

-- Basic RLS Policies (Allow authenticated users full R/W locally; refine in production)
CREATE POLICY "Allow authenticated full access to patients" 
    ON public.patients FOR ALL 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow authenticated full access to sessions" 
    ON public.sessions FOR ALL 
    TO authenticated 
    USING (true);

-- Step 4: Create raw_clinical_data Storage Bucket natively via Supabase Postgres
INSERT INTO storage.buckets (id, name, public) 
VALUES ('raw_clinical_data', 'raw_clinical_data', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Bucket RLS Policies for secure data drops
CREATE POLICY "Allow authenticated insert to clinical data"
    ON storage.objects FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'raw_clinical_data');

CREATE POLICY "Allow authenticated select to clinical data"
    ON storage.objects FOR SELECT 
    TO authenticated 
    USING (bucket_id = 'raw_clinical_data');


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

CREATE POLICY "Allow authenticated full access to weekly_tasks"
    ON public.weekly_tasks FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated full access to patient_tasks"
    ON public.patient_tasks FOR ALL TO authenticated USING (true);


-- RPC atomic stars update
CREATE OR REPLACE FUNCTION add_stars(patient_id UUID, amount INTEGER)
RETURNS void AS $$
    UPDATE patients SET stars = stars + amount WHERE id = patient_id;
$$ LANGUAGE sql SECURITY DEFINER;