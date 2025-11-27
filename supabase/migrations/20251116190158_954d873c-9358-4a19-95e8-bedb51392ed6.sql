-- Crear tabla para secciones de la página de inicio
CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla para tarjetas de acceso rápido
CREATE TABLE IF NOT EXISTS public.homepage_quick_access_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icon_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  button_text TEXT NOT NULL,
  button_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla para características "Por Qué Elegirnos"
CREATE TABLE IF NOT EXISTS public.homepage_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icon_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actualizar tabla homepage_banners con nuevos campos
ALTER TABLE public.homepage_banners 
  ADD COLUMN IF NOT EXISTS size_mode TEXT DEFAULT 'cover',
  ADD COLUMN IF NOT EXISTS display_style TEXT DEFAULT 'fullscreen',
  ADD COLUMN IF NOT EXISTS position_order INTEGER DEFAULT 0;

-- Comentarios para documentación
COMMENT ON COLUMN homepage_banners.size_mode IS 'Modo de visualización: cover, contain, fill';
COMMENT ON COLUMN homepage_banners.display_style IS 'Estilo de display: fullscreen, partial';
COMMENT ON COLUMN homepage_banners.position_order IS 'Posición específica en la página de inicio';

-- Insertar datos iniciales para secciones
INSERT INTO public.homepage_sections (section_key, title, subtitle) VALUES
  ('featured_products', '⭐ Productos Destacados', 'Descubre nuestras creaciones más populares'),
  ('why_us', '¿Por Qué Elegirnos?', 'Calidad y compromiso en cada proyecto')
ON CONFLICT (section_key) DO NOTHING;

-- Insertar datos iniciales para tarjetas de acceso rápido
INSERT INTO public.homepage_quick_access_cards (icon_name, title, description, button_text, button_url, display_order) VALUES
  ('Printer', 'Catálogo de Productos', 'Explora nuestra colección de productos impresos en 3D con tecnología de punta', 'Ver Productos', '/products', 1),
  ('FileText', 'Solicita un Presupuesto', 'Obtén un presupuesto personalizado para tu proyecto en minutos', 'Solicitar', '/quotes', 2),
  ('Gift', 'Tarjetas Regalo', 'El regalo perfecto para los entusiastas de la impresión 3D', 'Comprar', '/gift-card', 3)
ON CONFLICT DO NOTHING;

-- Insertar datos iniciales para características
INSERT INTO public.homepage_features (icon_name, title, description, display_order) VALUES
  ('Sparkles', 'Calidad Superior', 'Utilizamos los mejores materiales y tecnología de impresión 3D para garantizar resultados excepcionales', 1),
  ('Zap', 'Entrega Rápida', 'Procesos optimizados que nos permiten entregar tus proyectos en el menor tiempo posible', 2),
  ('Shield', 'Garantía Total', 'Respaldamos nuestro trabajo con una garantía completa de satisfacción en todos nuestros productos', 3)
ON CONFLICT DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_quick_access_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_features ENABLE ROW LEVEL SECURITY;

-- Políticas: Todos pueden leer
CREATE POLICY "Todos pueden leer homepage_sections"
  ON public.homepage_sections FOR SELECT
  USING (true);

CREATE POLICY "Todos pueden leer homepage_quick_access_cards"
  ON public.homepage_quick_access_cards FOR SELECT
  USING (true);

CREATE POLICY "Todos pueden leer homepage_features"
  ON public.homepage_features FOR SELECT
  USING (true);

-- Políticas: Solo admins pueden modificar
CREATE POLICY "Solo admins pueden insertar homepage_sections"
  ON public.homepage_sections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden actualizar homepage_sections"
  ON public.homepage_sections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden eliminar homepage_sections"
  ON public.homepage_sections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden insertar homepage_quick_access_cards"
  ON public.homepage_quick_access_cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden actualizar homepage_quick_access_cards"
  ON public.homepage_quick_access_cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden eliminar homepage_quick_access_cards"
  ON public.homepage_quick_access_cards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden insertar homepage_features"
  ON public.homepage_features FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden actualizar homepage_features"
  ON public.homepage_features FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden eliminar homepage_features"
  ON public.homepage_features FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Triggers para traducción automática
CREATE TRIGGER queue_homepage_sections_translation
  AFTER INSERT OR UPDATE ON public.homepage_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_translation();

CREATE TRIGGER queue_homepage_quick_access_cards_translation
  AFTER INSERT OR UPDATE ON public.homepage_quick_access_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_translation();

CREATE TRIGGER queue_homepage_features_translation
  AFTER INSERT OR UPDATE ON public.homepage_features
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_translation();