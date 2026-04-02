CREATE OR REPLACE FUNCTION public.get_applicable_transition_rules(
  p_entity_type text,
  p_current_status text
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
    AND from_status_value = p_current_status
    AND is_active = true
  ORDER BY priority ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_contextual_help(
  p_section text,
  p_context text DEFAULT NULL
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

CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = NEW.user_id AND TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Users cannot modify their own role';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_order_invoice_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE public.invoices
    SET status = CASE
      WHEN NEW.status = 'completed' THEN 'paid'
      WHEN NEW.status = 'cancelled' THEN 'cancelled'
      ELSE invoices.status
    END,
    updated_at = now()
    WHERE order_id = NEW.id
      AND status NOT IN ('paid', 'cancelled');
  END IF;
  RETURN NEW;
END;
$$;