-- Tabla para almacenar la configuración completa del footer
CREATE TABLE IF NOT EXISTS public.footer_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Configuración general
  show_footer BOOLEAN DEFAULT true,
  background_color VARCHAR(50) DEFAULT '',
  text_color VARCHAR(50) DEFAULT '',
  border_color VARCHAR(50) DEFAULT '',
  
  -- Tipografía
  title_font_size INTEGER DEFAULT 18,
  title_font_weight VARCHAR(20) DEFAULT '700',
  text_font_size INTEGER DEFAULT 14,
  link_font_size INTEGER DEFAULT 14,
  
  -- Espaciado
  padding_top INTEGER DEFAULT 48,
  padding_bottom INTEGER DEFAULT 48,
  padding_horizontal INTEGER DEFAULT 16,
  section_gap INTEGER DEFAULT 32,
  
  -- Marca/Brand
  show_brand_section BOOLEAN DEFAULT true,
  brand_name VARCHAR(255) DEFAULT '',
  brand_tagline VARCHAR(500) DEFAULT '',
  
  -- Redes sociales
  show_social_icons BOOLEAN DEFAULT true,
  social_icon_size INTEGER DEFAULT 20,
  social_icon_color VARCHAR(50) DEFAULT '',
  social_facebook VARCHAR(500) DEFAULT '',
  social_instagram VARCHAR(500) DEFAULT '',
  social_twitter VARCHAR(500) DEFAULT '',
  social_linkedin VARCHAR(500) DEFAULT '',
  social_tiktok VARCHAR(500) DEFAULT '',
  social_youtube VARCHAR(500) DEFAULT '',
  
  -- Sección de ayuda
  show_help_section BOOLEAN DEFAULT true,
  help_section_title VARCHAR(100) DEFAULT 'Ayuda',
  show_faq_link BOOLEAN DEFAULT true,
  show_terms_link BOOLEAN DEFAULT true,
  show_privacy_link BOOLEAN DEFAULT true,
  show_cookies_link BOOLEAN DEFAULT true,
  show_legal_link BOOLEAN DEFAULT true,
  
  -- Enlaces rápidos
  show_quick_links BOOLEAN DEFAULT true,
  quick_links_title VARCHAR(100) DEFAULT 'Enlaces Rápidos',
  show_catalog_link BOOLEAN DEFAULT true,
  show_quote_link BOOLEAN DEFAULT true,
  show_gift_cards_link BOOLEAN DEFAULT true,
  show_blog_link BOOLEAN DEFAULT true,
  
  -- Newsletter
  show_newsletter BOOLEAN DEFAULT true,
  newsletter_title VARCHAR(100) DEFAULT 'Newsletter',
  newsletter_description VARCHAR(500) DEFAULT '',
  newsletter_placeholder VARCHAR(100) DEFAULT '',
  newsletter_button_color VARCHAR(50) DEFAULT '',
  
  -- Métodos de pago
  show_payment_methods BOOLEAN DEFAULT true,
  payment_methods_title VARCHAR(100) DEFAULT '',
  show_visa BOOLEAN DEFAULT true,
  show_mastercard BOOLEAN DEFAULT true,
  show_bancontact BOOLEAN DEFAULT true,
  show_paypal BOOLEAN DEFAULT true,
  show_ideal BOOLEAN DEFAULT false,
  
  -- Copyright
  show_copyright BOOLEAN DEFAULT true,
  copyright_text VARCHAR(500) DEFAULT '',
  
  -- Diseño avanzado
  columns_layout VARCHAR(20) DEFAULT '4',
  border_top_width INTEGER DEFAULT 1,
  border_top_style VARCHAR(20) DEFAULT 'solid'
);

-- Habilitar RLS
ALTER TABLE public.footer_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Lectura pública
CREATE POLICY "Footer settings are publicly readable"
ON public.footer_settings
FOR SELECT
USING (true);

-- Políticas RLS - Solo admins pueden modificar
CREATE POLICY "Only admins can modify footer settings"
ON public.footer_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Insertar configuración por defecto
INSERT INTO public.footer_settings (id) VALUES (gen_random_uuid());

-- Trigger para updated_at
CREATE TRIGGER update_footer_settings_updated_at
BEFORE UPDATE ON public.footer_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Añadir página de Footer al Page Builder si no existe
INSERT INTO public.page_builder_pages (page_key, page_name, description, is_enabled)
VALUES ('footer', 'Pie de Página', 'Configuración del pie de página de la aplicación', true)
ON CONFLICT (page_key) DO NOTHING;