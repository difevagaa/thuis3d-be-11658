-- Migration: Fix notify_message_received() function to handle missing pg_net extension
-- Problem: The function uses net.http_post() which requires pg_net extension that may not be enabled
-- Error: "schema net no existe" when sending chat messages
-- Solution: Remove the dependency on pg_net extension for email notifications
--           The in-app notifications will still work and email can be sent from edge functions

CREATE OR REPLACE FUNCTION public.notify_message_received() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
DECLARE
  admin_user_id UUID;
  recipient_email TEXT;
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
      
      -- Note: Email notifications via pg_net have been removed since the extension
      -- is not available. In-app notifications will still work and admins can be 
      -- notified through the admin panel's notification system.
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

      -- Note: Email notifications via pg_net have been removed since the extension
      -- is not available. Users will still receive in-app notifications.
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add a comment to explain the fix
COMMENT ON FUNCTION public.notify_message_received() IS 'Trigger function for message notifications. Fixed to work without pg_net extension - only creates in-app notifications.';
