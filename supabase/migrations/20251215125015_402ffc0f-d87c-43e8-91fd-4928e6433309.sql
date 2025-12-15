-- Create a function to execute admin SQL (for table creation)
-- This is a privileged function that only superadmins can use
CREATE OR REPLACE FUNCTION public.execute_admin_sql(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only allow superadmins to execute this
  IF NOT has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Only superadmins can execute admin SQL';
  END IF;
  
  -- Execute the query
  EXECUTE sql_query;
  
  RETURN jsonb_build_object('success', true, 'message', 'SQL executed successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute to authenticated users (function checks permissions internally)
GRANT EXECUTE ON FUNCTION public.execute_admin_sql(text) TO authenticated;

COMMENT ON FUNCTION public.execute_admin_sql IS 'Execute administrative SQL commands. Only superadmins can use this function.';