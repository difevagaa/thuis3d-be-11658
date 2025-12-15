-- Optimized verify_admin_pin function with user_id parameter for faster lookup
CREATE OR REPLACE FUNCTION public.verify_admin_pin(pin_input text, user_id_input uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  stored_pin TEXT;
  target_user_id UUID;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  target_user_id := COALESCE(user_id_input, auth.uid());
  
  IF target_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Direct lookup by user_id (very fast with index)
  SELECT admin_pin INTO stored_pin
  FROM profiles
  WHERE id = target_user_id;

  IF stored_pin IS NULL THEN
    RETURN false;
  END IF;

  -- Use bcrypt comparison
  RETURN stored_pin = extensions.crypt(pin_input, stored_pin);
END;
$function$;

-- Ensure index exists on profiles.id (primary key, already indexed)
-- Add index on admin_pin for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_profiles_admin_pin ON profiles(id) WHERE admin_pin IS NOT NULL;