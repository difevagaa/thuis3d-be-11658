-- Add allow_quote_request column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS allow_quote_request boolean DEFAULT true;

-- Add card_payment_link setting key for card payment configuration
INSERT INTO public.site_settings (setting_key, setting_value, setting_group)
VALUES ('card_payment_link', '', 'general')
ON CONFLICT (setting_key) DO NOTHING;