-- Fix remaining functions without search_path (non-SECURITY DEFINER but still flagged by linter)

ALTER FUNCTION public.detect_device_type(user_agent text)
SET search_path = public;

ALTER FUNCTION public.set_visitor_device_type()
SET search_path = public;

ALTER FUNCTION public.update_banner_images_updated_at()
SET search_path = public;

ALTER FUNCTION public.update_customization_sections_updated_at()
SET search_path = public;

ALTER FUNCTION public.update_quantity_discount_tiers_updated_at()
SET search_path = public;

ALTER FUNCTION public.update_seo_updated_at()
SET search_path = public;

ALTER FUNCTION public.update_translation_updated_at()
SET search_path = public;