-- Enable RLS on role_change_audit
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view role change audit"
ON public.role_change_audit
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert role change audit"
ON public.role_change_audit
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fix old overloads with missing search_path
DROP FUNCTION IF EXISTS public.get_applicable_transition_rules(character varying, character varying, character varying);

CREATE OR REPLACE FUNCTION public.get_applicable_transition_rules(
  p_entity_type character varying,
  p_from_status_type character varying,
  p_from_status_value character varying
)
RETURNS SETOF public.status_transition_rules
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.status_transition_rules
  WHERE entity_type = p_entity_type
    AND from_status_type = p_from_status_type
    AND from_status_value = p_from_status_value
    AND is_active = true
  ORDER BY priority ASC;
$$;

DROP FUNCTION IF EXISTS public.get_contextual_help(character varying, character varying, character varying);

CREATE OR REPLACE FUNCTION public.get_contextual_help(
  p_section character varying,
  p_context character varying DEFAULT NULL,
  p_language character varying DEFAULT 'es'
)
RETURNS SETOF public.contextual_help_messages
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.contextual_help_messages
  WHERE section = p_section
    AND (p_context IS NULL OR context = p_context)
    AND is_active = true
  ORDER BY priority ASC;
$$;