-- 1) Hash any legacy/plain admin PINs (4 digits) so verification works consistently
UPDATE public.profiles
SET admin_pin = extensions.crypt(admin_pin, extensions.gen_salt('bf'))
WHERE admin_pin IS NOT NULL
  AND admin_pin ~ '^\d{4}$'
  AND admin_pin NOT LIKE '$2%';

-- 2) Create helper to set admin PIN securely (hashing server-side)
CREATE OR REPLACE FUNCTION public.set_admin_pin(target_user_id uuid, pin_input text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF pin_input IS NULL OR pin_input !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits';
  END IF;

  -- Only superadmin OR the user themself (when they are admin) can set a PIN
  IF NOT (
    public.has_role(auth.uid(), 'superadmin')
    OR (auth.uid() = target_user_id AND public.has_role(auth.uid(), 'admin'))
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.profiles
  SET admin_pin = extensions.crypt(pin_input, extensions.gen_salt('bf'))
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
END;
$$;

-- 3) Create helper to clear admin PIN securely
CREATE OR REPLACE FUNCTION public.clear_admin_pin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'superadmin')
    OR (auth.uid() = target_user_id AND public.has_role(auth.uid(), 'admin'))
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.profiles
  SET admin_pin = NULL
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
END;
$$;