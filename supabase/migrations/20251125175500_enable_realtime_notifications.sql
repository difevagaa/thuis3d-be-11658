-- ============================================
-- HABILITAR REALTIME PARA TABLA DE NOTIFICACIONES
-- ============================================
-- Problema: Las notificaciones no se muestran en tiempo real
-- porque la tabla 'notifications' no está configurada para Supabase Realtime.
-- 
-- Solución: Habilitar REPLICA IDENTITY FULL y agregar la tabla 
-- a la publicación supabase_realtime.

-- 1. Establecer REPLICA IDENTITY FULL para que Supabase Realtime
-- pueda transmitir los cambios correctamente con filtros
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 2. Agregar la tabla a la publicación supabase_realtime
-- Esto es necesario para que los cambios en la tabla se transmitan
-- a través de Supabase Realtime
DO $$
BEGIN
  -- Verificar si la publicación existe
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Agregar la tabla a la publicación (solo si no está ya)
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
      RAISE NOTICE '✅ Tabla notifications agregada a supabase_realtime';
    ELSE
      RAISE NOTICE '📋 Tabla notifications ya está en supabase_realtime';
    END IF;
  ELSE
    -- Crear la publicación si no existe (no debería pasar en Supabase)
    CREATE PUBLICATION supabase_realtime FOR TABLE public.notifications;
    RAISE NOTICE '✅ Publicación supabase_realtime creada con notifications';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ No se pudo configurar la publicación supabase_realtime para notifications: %', SQLERRM;
END $$;

-- 3. También asegurar que otras tablas relacionadas tengan REPLICA IDENTITY FULL
-- para mejorar el sistema de notificaciones general

-- Orders - para notificaciones de pedidos
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Quotes - para notificaciones de cotizaciones
ALTER TABLE public.quotes REPLICA IDENTITY FULL;

-- Chat messages - para notificaciones de chat
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- 4. Agregar estas tablas a la publicación también
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Orders
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'orders'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;
    
    -- Quotes
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'quotes'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
    END IF;
    
    -- Chat messages
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'chat_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Error agregando tablas (orders/quotes/chat_messages) a supabase_realtime: %', SQLERRM;
END $$;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Realtime habilitado para notificaciones';
  RAISE NOTICE '📋 REPLICA IDENTITY FULL configurado para: notifications, orders, quotes, chat_messages';
  RAISE NOTICE '🔔 Las notificaciones ahora se mostrarán en tiempo real';
END $$;
