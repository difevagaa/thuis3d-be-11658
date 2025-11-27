
-- Agregar política INSERT para que usuarios puedan crear su propio perfil
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Comentario explicativo
COMMENT ON POLICY "Users can insert their own profile" ON public.profiles 
IS 'Permite a los usuarios autenticados crear su propio perfil durante el primer uso';
