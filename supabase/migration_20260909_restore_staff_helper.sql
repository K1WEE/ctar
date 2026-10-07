-- Applied to hosted CTAR on 2026-09-09. No policy or patient data changes.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.patients WHERE id = auth.uid() AND role IN ('doctor', 'admin')); $$;
