
-- Fix 1: Add missing SELECT policy for orders (users can view their own orders)
CREATE POLICY "orders_user_select" ON public.orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Fix 2: Replace hardcoded old Supabase keys in database functions with current project
-- Function: send_notification_email_http
CREATE OR REPLACE FUNCTION public.send_notification_email_http(
  p_to text,
  p_subject text,
  p_message text,
  p_link text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
BEGIN
  SELECT INTO request_id extensions.http_post(
    url := 'https://ljygreayxxpsdmncwzia.supabase.co/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeWdyZWF5eHhwc2RtbmN3emlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODMxOTUsImV4cCI6MjA3ODM1OTE5NX0.309lxyM-chybzF-Df_nj9PiW83dE379iw1D5EgKLkUI'
    ),
    body := jsonb_build_object(
      'to', p_to,
      'subject', p_subject,
      'message', p_message,
      'link', p_link
    )
  );
  
  RAISE NOTICE 'Notification email queued (request_id: %)', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to queue notification email: %', SQLERRM;
END;
$$;

-- Function: send_quote_confirmation_http
CREATE OR REPLACE FUNCTION public.send_quote_confirmation_http(p_quote_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
  quote_data RECORD;
BEGIN
  SELECT customer_email, customer_name, quote_type, description
  INTO quote_data
  FROM quotes
  WHERE id = p_quote_id;
  
  IF quote_data.customer_email IS NULL THEN
    RETURN;
  END IF;

  SELECT INTO request_id extensions.http_post(
    url := 'https://ljygreayxxpsdmncwzia.supabase.co/functions/v1/send-quote-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeWdyZWF5eHhwc2RtbmN3emlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODMxOTUsImV4cCI6MjA3ODM1OTE5NX0.309lxyM-chybzF-Df_nj9PiW83dE379iw1D5EgKLkUI'
    ),
    body := jsonb_build_object(
      'to', quote_data.customer_email,
      'customer_name', quote_data.customer_name,
      'quote_type', quote_data.quote_type,
      'description', quote_data.description
    )
  );
  
  RAISE NOTICE 'Quote email queued (request_id: %)', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to queue quote email: %', SQLERRM;
END;
$$;

-- Function: send_quote_update_email_async
CREATE OR REPLACE FUNCTION public.send_quote_update_email_async(p_quote_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
  quote_data RECORD;
BEGIN
  SELECT customer_email, customer_name, estimated_price, quote_type
  INTO quote_data
  FROM quotes
  WHERE id = p_quote_id;
  
  IF quote_data.customer_email IS NULL THEN
    RETURN;
  END IF;

  SELECT INTO request_id extensions.http_post(
    url := 'https://ljygreayxxpsdmncwzia.supabase.co/functions/v1/send-quote-update-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeWdyZWF5eHhwc2RtbmN3emlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODMxOTUsImV4cCI6MjA3ODM1OTE5NX0.309lxyM-chybzF-Df_nj9PiW83dE379iw1D5EgKLkUI'
    ),
    body := jsonb_build_object(
      'quote_id', p_quote_id,
      'email', quote_data.customer_email,
      'customer_name', quote_data.customer_name,
      'estimated_price', quote_data.estimated_price,
      'quote_type', quote_data.quote_type
    )
  );
  
  RAISE NOTICE 'Quote update email queued (request_id: %)', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to queue quote update email: %', SQLERRM;
END;
$$;

-- Function: send_welcome_email_http
CREATE OR REPLACE FUNCTION public.send_welcome_email_http(user_email text, user_name text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
BEGIN
  SELECT INTO request_id extensions.http_post(
    url := 'https://ljygreayxxpsdmncwzia.supabase.co/functions/v1/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeWdyZWF5eHhwc2RtbmN3emlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODMxOTUsImV4cCI6MjA3ODM1OTE5NX0.309lxyM-chybzF-Df_nj9PiW83dE379iw1D5EgKLkUI'
    ),
    body := jsonb_build_object(
      'to', user_email,
      'name', COALESCE(user_name, 'Cliente')
    )
  );
  
  RAISE NOTICE 'Welcome email queued (request_id: %)', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to queue welcome email: %', SQLERRM;
END;
$$;
