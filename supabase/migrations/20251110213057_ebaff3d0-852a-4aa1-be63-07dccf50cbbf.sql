-- SEO Settings table for global configuration
CREATE TABLE public.seo_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_title text NOT NULL DEFAULT 'Thuis 3D',
  site_description text NOT NULL DEFAULT 'Servicio de impresión 3D profesional',
  site_keywords text[] DEFAULT ARRAY[]::text[],
  og_image text,
  twitter_handle text,
  google_site_verification text,
  google_analytics_id text,
  favicon_url text,
  canonical_domain text,
  auto_generate_keywords boolean DEFAULT true,
  auto_generate_meta_descriptions boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- SEO Meta Tags for specific pages
CREATE TABLE public.seo_meta_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path text NOT NULL UNIQUE,
  page_title text NOT NULL,
  meta_description text NOT NULL,
  keywords text[] DEFAULT ARRAY[]::text[],
  og_title text,
  og_description text,
  og_image text,
  og_type text DEFAULT 'website',
  twitter_title text,
  twitter_description text,
  twitter_image text,
  canonical_url text,
  noindex boolean DEFAULT false,
  nofollow boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- SEO Keywords tracking and ranking
CREATE TABLE public.seo_keywords (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword text NOT NULL,
  source_type text NOT NULL, -- 'product', 'blog', 'category', 'manual'
  source_id uuid,
  search_volume integer DEFAULT 0,
  competition_level text DEFAULT 'low', -- 'low', 'medium', 'high'
  current_ranking integer,
  target_ranking integer,
  is_active boolean DEFAULT true,
  auto_generated boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- SEO Audit Log
CREATE TABLE public.seo_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_type text NOT NULL, -- 'meta_tags', 'keywords', 'sitemap', 'performance', 'structured_data'
  page_path text,
  status text NOT NULL, -- 'success', 'warning', 'error'
  message text NOT NULL,
  details jsonb,
  score integer, -- 0-100
  recommendations text[],
  created_at timestamp with time zone DEFAULT now()
);

-- SEO Redirects
CREATE TABLE public.seo_redirects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_path text NOT NULL UNIQUE,
  to_path text NOT NULL,
  redirect_type integer DEFAULT 301, -- 301, 302, 307, 308
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_meta_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_redirects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seo_settings
CREATE POLICY "Anyone can view SEO settings"
  ON public.seo_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage SEO settings"
  ON public.seo_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for seo_meta_tags
CREATE POLICY "Anyone can view SEO meta tags"
  ON public.seo_meta_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage SEO meta tags"
  ON public.seo_meta_tags FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for seo_keywords
CREATE POLICY "Anyone can view active SEO keywords"
  ON public.seo_keywords FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage SEO keywords"
  ON public.seo_keywords FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for seo_audit_log
CREATE POLICY "Admins can view SEO audit logs"
  ON public.seo_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create SEO audit logs"
  ON public.seo_audit_log FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for seo_redirects
CREATE POLICY "Anyone can view active SEO redirects"
  ON public.seo_redirects FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage SEO redirects"
  ON public.seo_redirects FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Insert default SEO settings
INSERT INTO public.seo_settings (
  site_title,
  site_description,
  site_keywords,
  canonical_domain,
  auto_generate_keywords,
  auto_generate_meta_descriptions
) VALUES (
  'Thuis 3D - Impresión 3D Profesional',
  'Servicio profesional de impresión 3D con la mejor calidad y precios competitivos. Cotiza tu proyecto gratis.',
  ARRAY['impresión 3D', '3D printing', 'servicio impresión', 'cotización 3D', 'prototipado rápido', 'fabricación aditiva'],
  'https://thuis3d.com',
  true,
  true
);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_seo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_seo_settings_updated_at
  BEFORE UPDATE ON public.seo_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_seo_updated_at();

CREATE TRIGGER update_seo_meta_tags_updated_at
  BEFORE UPDATE ON public.seo_meta_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_seo_updated_at();

CREATE TRIGGER update_seo_keywords_updated_at
  BEFORE UPDATE ON public.seo_keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_seo_updated_at();

CREATE TRIGGER update_seo_redirects_updated_at
  BEFORE UPDATE ON public.seo_redirects
  FOR EACH ROW
  EXECUTE FUNCTION update_seo_updated_at();

-- Function to generate keywords from products
CREATE OR REPLACE FUNCTION generate_product_keywords()
RETURNS void AS $$
DECLARE
  product_record RECORD;
  keyword_array text[];
BEGIN
  FOR product_record IN 
    SELECT id, name, description 
    FROM products 
    WHERE deleted_at IS NULL
  LOOP
    -- Extract keywords from product name and description
    keyword_array := string_to_array(lower(product_record.name || ' ' || COALESCE(product_record.description, '')), ' ');
    
    -- Insert unique keywords
    FOREACH keyword_array IN ARRAY keyword_array
    LOOP
      IF length(keyword_array) > 3 THEN
        INSERT INTO seo_keywords (keyword, source_type, source_id, auto_generated)
        VALUES (keyword_array, 'product', product_record.id, true)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate keywords from blog posts
CREATE OR REPLACE FUNCTION generate_blog_keywords()
RETURNS void AS $$
DECLARE
  blog_record RECORD;
  keyword_array text[];
BEGIN
  FOR blog_record IN 
    SELECT id, title, excerpt, content 
    FROM blog_posts 
    WHERE deleted_at IS NULL AND is_published = true
  LOOP
    -- Extract keywords from blog content
    keyword_array := string_to_array(lower(blog_record.title || ' ' || COALESCE(blog_record.excerpt, '') || ' ' || COALESCE(blog_record.content, '')), ' ');
    
    -- Insert unique keywords
    FOREACH keyword_array IN ARRAY keyword_array
    LOOP
      IF length(keyword_array) > 3 THEN
        INSERT INTO seo_keywords (keyword, source_type, source_id, auto_generated)
        VALUES (keyword_array, 'blog', blog_record.id, true)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;