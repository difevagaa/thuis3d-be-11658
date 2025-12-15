-- Add 'superadmin' to app_role enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'superadmin' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'superadmin';
  END IF;
END $$;

-- Ensure verify_admin_pin function uses bcrypt comparison correctly
CREATE OR REPLACE FUNCTION public.verify_admin_pin(pin_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_pin text;
BEGIN
  SELECT admin_pin INTO stored_pin
  FROM public.profiles
  WHERE id = auth.uid();

  IF stored_pin IS NULL THEN
    RETURN false;
  END IF;

  -- If stored PIN looks like a bcrypt hash, use crypt comparison
  IF stored_pin LIKE '$2%' THEN
    RETURN stored_pin = extensions.crypt(pin_input, stored_pin);
  ELSE
    -- Legacy plain text comparison (should not happen after migration)
    RETURN stored_pin = pin_input;
  END IF;
END;
$$;

-- Update has_role to accept text (for superadmin compatibility)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  )
$$;