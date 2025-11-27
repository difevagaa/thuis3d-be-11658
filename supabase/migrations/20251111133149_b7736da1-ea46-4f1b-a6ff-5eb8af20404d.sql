-- Add new SEO configuration fields for additional search engines and social platforms
ALTER TABLE public.seo_settings
ADD COLUMN IF NOT EXISTS bing_site_verification TEXT,
ADD COLUMN IF NOT EXISTS yandex_verification TEXT,
ADD COLUMN IF NOT EXISTS facebook_app_id TEXT;

-- Add helpful comments to the new columns
COMMENT ON COLUMN public.seo_settings.bing_site_verification IS 'Bing Webmaster Tools verification code';
COMMENT ON COLUMN public.seo_settings.yandex_verification IS 'Yandex Webmaster verification code';
COMMENT ON COLUMN public.seo_settings.facebook_app_id IS 'Facebook App ID for Facebook Insights and Open Graph';