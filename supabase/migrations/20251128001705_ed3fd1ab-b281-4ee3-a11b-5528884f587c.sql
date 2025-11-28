-- =====================================================
-- FIX 1: Corregir función notify_message_received sin usar net.http_post
-- El esquema pg_net no está disponible en este proyecto
-- =====================================================

CREATE OR REPLACE FUNCTION notify_message_received()
RETURNS TRIGGER AS $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Si es un mensaje de cliente al admin
  IF NEW.is_admin_message = false THEN
    -- Obtener el primer admin desde user_roles
    SELECT user_id INTO admin_user_id
    FROM user_roles
    WHERE role = 'admin'
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
      -- Verificar que el user_id exista en auth.users antes de insertar
      IF EXISTS (SELECT 1 FROM auth.users WHERE id = admin_user_id) THEN
        -- Crear notificación para el admin
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          link
        ) VALUES (
          admin_user_id,
          'new_message',
          '💬 Nuevo mensaje de cliente',
          'De: ' || NEW.sender_name || ' - ' || SUBSTRING(NEW.message, 1, 100),
          '/admin/messages'
        );
      END IF;
    END IF;
  
  -- Si es un mensaje del admin al cliente
  ELSE
    IF NEW.user_id IS NOT NULL THEN
      -- Verificar que el user_id exista en auth.users antes de insertar
      IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
        -- Crear notificación para el usuario
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          link
        ) VALUES (
          NEW.user_id,
          'admin_reply',
          '💬 Respuesta del equipo de soporte',
          SUBSTRING(NEW.message, 1, 100),
          '/mis-mensajes'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- FIX 2: Agregar columna language a seo_keywords
-- =====================================================

-- Agregar columna language si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_keywords' AND column_name = 'language'
  ) THEN
    ALTER TABLE seo_keywords ADD COLUMN language TEXT DEFAULT 'es';
  END IF;
END $$;

-- Crear índice para búsquedas por idioma
CREATE INDEX IF NOT EXISTS idx_seo_keywords_language ON seo_keywords(language);

-- Crear índice compuesto para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_seo_keywords_lang_active ON seo_keywords(language, is_active);

-- Actualizar keywords existentes para asignar idioma basándose en el contenido
UPDATE seo_keywords
SET language = 
  CASE 
    WHEN keyword ~* '(the|and|with|for|this|that|from|have|are|will|can|your)' THEN 'en'
    WHEN keyword ~* '(de|het|en|van|een|voor|met|naar|zijn|hebben|worden|deze|dat)' THEN 'nl'
    ELSE 'es'
  END
WHERE language IS NULL OR language = 'es';