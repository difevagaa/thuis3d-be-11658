-- Fix search_path for critical SECURITY DEFINER functions to prevent privilege escalation

-- Fix has_role function (critical - used in all RLS policies)
ALTER FUNCTION public.has_role(_user_id uuid, _role text)
SET search_path = public;

-- Fix verify_admin_pin function (critical - protects admin operations)
ALTER FUNCTION public.verify_admin_pin(pin_input text)
SET search_path = public;

-- Fix hash_admin_pin function
ALTER FUNCTION public.hash_admin_pin()
SET search_path = public;

-- Fix generate_order_number function
ALTER FUNCTION public.generate_order_number()
SET search_path = public;

-- Fix generate_invoice_number function
ALTER FUNCTION public.generate_invoice_number()
SET search_path = public;

-- Fix generate_next_invoice_number function  
ALTER FUNCTION public.generate_next_invoice_number()
SET search_path = public;

-- Fix handle_new_user function (critical - runs on every signup)
ALTER FUNCTION public.handle_new_user()
SET search_path = public;

-- Fix award_loyalty_points function
ALTER FUNCTION public.award_loyalty_points(p_user_id uuid, p_order_amount numeric, p_order_id uuid)
SET search_path = public;

-- Fix send_notification function
ALTER FUNCTION public.send_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_link text)
SET search_path = public;

-- Fix notify_all_admins function
ALTER FUNCTION public.notify_all_admins(p_type text, p_title text, p_message text, p_link text)
SET search_path = public;

-- Fix generate_product_code function
ALTER FUNCTION public.generate_product_code()
SET search_path = public;

-- Fix set_product_code function
ALTER FUNCTION public.set_product_code()
SET search_path = public;

-- Fix update_user_activity function
ALTER FUNCTION public.update_user_activity(user_id_param uuid, page_path text)
SET search_path = public;

-- Fix mark_user_offline function
ALTER FUNCTION public.mark_user_offline(user_id_param uuid)
SET search_path = public;