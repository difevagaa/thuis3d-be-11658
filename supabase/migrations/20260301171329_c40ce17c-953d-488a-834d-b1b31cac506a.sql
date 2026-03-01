
-- =============================================
-- Phase 1: RLS policies for profiles + notifications
-- + preferred_language default to 'en' + backfill
-- =============================================

-- ==================
-- A. PROFILES RLS
-- ==================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin_or_superadmin(auth.uid()));

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin_or_superadmin(auth.uid()))
WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- ==================
-- B. NOTIFICATIONS RLS
-- ==================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (public.is_admin_or_superadmin(auth.uid()));

-- Admins can update all notifications
CREATE POLICY "Admins can update all notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (public.is_admin_or_superadmin(auth.uid()))
WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- ==================
-- C. preferred_language default to 'en' + backfill
-- ==================

ALTER TABLE public.profiles ALTER COLUMN preferred_language SET DEFAULT 'en';

UPDATE public.profiles
SET preferred_language = 'en'
WHERE preferred_language IS NULL
   OR preferred_language = ''
   OR preferred_language NOT IN ('es', 'en', 'nl');

-- Validation trigger to normalize preferred_language
CREATE OR REPLACE FUNCTION public.validate_preferred_language()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.preferred_language IS NULL OR NEW.preferred_language NOT IN ('es', 'en', 'nl') THEN
    NEW.preferred_language := 'en';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_preferred_language ON public.profiles;
CREATE TRIGGER trg_validate_preferred_language
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_preferred_language();
