-- Corregir RLS policy de visitor_sessions para permitir INSERT de visitantes no autenticados
DROP POLICY IF EXISTS "Allow anonymous visitor session creation" ON public.visitor_sessions;

CREATE POLICY "Allow anonymous visitor session creation"
ON public.visitor_sessions
FOR INSERT
TO anon
WITH CHECK (true);

-- También permitir a usuarios autenticados crear sesiones
DROP POLICY IF EXISTS "Allow authenticated user session creation" ON public.visitor_sessions;

CREATE POLICY "Allow authenticated user session creation"
ON public.visitor_sessions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Comentario explicativo
COMMENT ON POLICY "Allow anonymous visitor session creation" ON public.visitor_sessions
IS 'Permite a visitantes anónimos crear sesiones de tracking';

COMMENT ON POLICY "Allow authenticated user session creation" ON public.visitor_sessions
IS 'Permite a usuarios autenticados crear sesiones de tracking';