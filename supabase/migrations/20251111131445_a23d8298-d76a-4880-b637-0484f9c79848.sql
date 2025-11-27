-- Agregar columnas de tracking a profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_sign_in_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS current_page text,
ADD COLUMN IF NOT EXISTS last_activity_at timestamp with time zone DEFAULT now();

-- Crear o reemplazar función para manejar nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    email,
    last_sign_in_at,
    is_online,
    created_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    new.last_sign_in_at,
    false,
    new.created_at
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    email = EXCLUDED.email;
  
  RETURN new;
END;
$$;

-- Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear trigger para usuarios nuevos
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Crear función para actualizar última actividad
CREATE OR REPLACE FUNCTION public.update_user_activity(
  user_id_param uuid,
  page_path text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET 
    is_online = true,
    current_page = COALESCE(page_path, current_page),
    last_activity_at = now(),
    last_sign_in_at = GREATEST(last_sign_in_at, now())
  WHERE id = user_id_param;
END;
$$;

-- Crear función para marcar usuario como offline
CREATE OR REPLACE FUNCTION public.mark_user_offline(
  user_id_param uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET 
    is_online = false,
    last_activity_at = now()
  WHERE id = user_id_param;
END;
$$;

-- Crear perfiles para usuarios existentes sin perfil
INSERT INTO profiles (id, full_name, email, last_sign_in_at, created_at, is_online)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  au.email,
  au.last_sign_in_at,
  au.created_at,
  false
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;