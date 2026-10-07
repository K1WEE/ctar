-- PENDING: policy changes require approval; not applied to the hosted database.
-- Repair missing helper and replace legacy permissive policies. No patient data changes.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.patients
        WHERE id = auth.uid() AND role IN ('doctor', 'admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;

DROP POLICY IF EXISTS "Allow authenticated full access to patients" ON public.patients;

DROP POLICY IF EXISTS "Allow authenticated full access to sessions" ON public.sessions;

DROP POLICY IF EXISTS "Allow authenticated full access to patient_tasks" ON public.patient_tasks;

DROP POLICY IF EXISTS "Allow authenticated full access to weekly_tasks" ON public.weekly_tasks;

DROP POLICY IF EXISTS "Allow authenticated insert to clinical data" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated select to clinical data" ON storage.objects;

DROP POLICY IF EXISTS "patients_select_own_or_staff" ON public.patients;

CREATE POLICY "patients_select_own_or_staff"
    ON public.patients FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "patients_insert_self" ON public.patients;

CREATE POLICY "patients_insert_self"
    ON public.patients FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "patients_update_own_or_staff" ON public.patients;

CREATE POLICY "patients_update_own_or_staff"
    ON public.patients FOR UPDATE
    TO authenticated
    USING (id = auth.uid() OR public.is_staff())
    WITH CHECK (id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "sessions_select_own_or_staff" ON public.sessions;

CREATE POLICY "sessions_select_own_or_staff"
    ON public.sessions FOR SELECT
    TO authenticated
    USING (patient_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "sessions_insert_own_or_staff" ON public.sessions;

CREATE POLICY "sessions_insert_own_or_staff"
    ON public.sessions FOR INSERT
    TO authenticated
    WITH CHECK (patient_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "sessions_update_own_or_staff" ON public.sessions;

CREATE POLICY "sessions_update_own_or_staff"
    ON public.sessions FOR UPDATE
    TO authenticated
    USING (patient_id = auth.uid() OR public.is_staff())
    WITH CHECK (patient_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "sessions_delete_own_or_staff" ON public.sessions;

CREATE POLICY "sessions_delete_own_or_staff"
    ON public.sessions FOR DELETE
    TO authenticated
    USING (patient_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "clinical_data_insert_own" ON storage.objects;

CREATE POLICY "clinical_data_insert_own"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'raw_clinical_data'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "clinical_data_select_own_or_staff" ON storage.objects;

CREATE POLICY "clinical_data_select_own_or_staff"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'raw_clinical_data'
        AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff())
    );

DROP POLICY IF EXISTS "weekly_tasks_select_all" ON public.weekly_tasks;

CREATE POLICY "weekly_tasks_select_all"
    ON public.weekly_tasks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "weekly_tasks_write_staff" ON public.weekly_tasks;

CREATE POLICY "weekly_tasks_write_staff"
    ON public.weekly_tasks FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "patient_tasks_select_own_or_staff" ON public.patient_tasks;

CREATE POLICY "patient_tasks_select_own_or_staff"
    ON public.patient_tasks FOR SELECT TO authenticated
    USING (patient_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "patient_tasks_insert_own_or_staff" ON public.patient_tasks;

CREATE POLICY "patient_tasks_insert_own_or_staff"
    ON public.patient_tasks FOR INSERT TO authenticated
    WITH CHECK (patient_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "patient_tasks_update_own_or_staff" ON public.patient_tasks;

CREATE POLICY "patient_tasks_update_own_or_staff"
    ON public.patient_tasks FOR UPDATE TO authenticated
    USING (patient_id = auth.uid() OR public.is_staff())
    WITH CHECK (patient_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "patient_tasks_delete_own_or_staff" ON public.patient_tasks;

CREATE POLICY "patient_tasks_delete_own_or_staff"
    ON public.patient_tasks FOR DELETE TO authenticated
    USING (patient_id = auth.uid() OR public.is_staff());

COMMIT;
