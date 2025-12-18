-- Primero eliminar las políticas problemáticas de user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and superadmins can manage all roles" ON public.user_roles;

-- Asignar rol superadmin al usuario
DO $$
DECLARE
  user_uuid UUID;
BEGIN
  SELECT id INTO user_uuid FROM public.profiles WHERE email = 'difevaga@outlook.com';
  
  IF user_uuid IS NOT NULL THEN
    -- Eliminar roles existentes usando DELETE directo (bypass RLS con DO block)
    DELETE FROM public.user_roles WHERE user_id = user_uuid;
    
    -- Insertar rol superadmin
    INSERT INTO public.user_roles (user_id, role) VALUES (user_uuid, 'superadmin');
    
    RAISE NOTICE 'Usuario % asignado como superadmin', user_uuid;
  ELSE
    RAISE NOTICE 'Usuario difevaga@outlook.com no encontrado';
  END IF;
END $$;

-- Crear políticas separadas por operación para user_roles
-- SELECT: usuarios ven sus propios roles, admins ven todos
CREATE POLICY "Users can view their own roles" 
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin_or_superadmin(auth.uid()));

-- INSERT: solo admins pueden insertar
CREATE POLICY "Admins can insert roles" 
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- UPDATE: solo admins pueden actualizar
CREATE POLICY "Admins can update roles" 
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_admin_or_superadmin(auth.uid()))
WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- DELETE: solo admins pueden eliminar
CREATE POLICY "Admins can delete roles" 
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_admin_or_superadmin(auth.uid()));