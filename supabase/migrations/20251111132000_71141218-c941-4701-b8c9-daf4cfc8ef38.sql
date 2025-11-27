-- Asignar rol 'client' a usuarios existentes que no lo tienen
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'client'::text
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id AND ur.role = 'client'
WHERE ur.id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Recrear el trigger on_auth_user_created (por si no existe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();