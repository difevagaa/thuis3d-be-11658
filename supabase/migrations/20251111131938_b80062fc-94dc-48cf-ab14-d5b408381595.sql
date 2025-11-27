-- Modificar la función handle_new_user para asignar automáticamente el rol 'client'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Crear perfil del usuario
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    last_sign_in_at,
    is_online,
    last_activity_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    NOW(),
    true,
    NOW()
  );
  
  -- Asignar automáticamente el rol 'client' a todos los nuevos usuarios
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;