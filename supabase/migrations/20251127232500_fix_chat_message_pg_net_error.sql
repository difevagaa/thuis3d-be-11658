-- Migration: Fix notify_message_received() function to handle missing pg_net extension
-- Problem: The function uses net.http_post() which requires pg_net extension that may not be enabled
-- Error: "schema net no existe" when sending chat messages
-- Solution: Wrap the http_post calls in a BEGIN/EXCEPTION block to gracefully handle the error
--           and check if pg_net extension is available before using it

CREATE OR REPLACE FUNCTION public.notify_message_received() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
DECLARE
  admin_user_id UUID;
  recipient_email TEXT;
  sender_display_name TEXT;
  pg_net_available BOOLEAN := FALSE;
BEGIN
  -- Check if pg_net extension is available
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') INTO pg_net_available;

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
      
      -- Try to send email notification via edge function (optional - won't fail if pg_net not available)
      IF pg_net_available THEN
        BEGIN
          -- Obtener email del admin para enviar correo
          SELECT email INTO recipient_email
          FROM auth.users
          WHERE id = admin_user_id;
          
          IF recipient_email IS NOT NULL THEN
            PERFORM net.http_post(
              url := 'https://ljygreayxxpsdmncwzia.supabase.co/functions/v1/send-chat-notification-email',
              headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeWdyZWF5eHhwc2RtbmN3emlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODMxOTUsImV4cCI6MjA3ODM1OTE5NX0.309lxyM-chybzF-Df_nj9PiW83dE379iw1D5EgKLkUI'
              ),
              body := jsonb_build_object(
                'to_email', recipient_email,
                'sender_name', NEW.sender_name,
                'message_preview', NEW.message,
                'is_admin', false,
                'has_attachments', (NEW.attachments IS NOT NULL AND jsonb_array_length(NEW.attachments) > 0)
              )
            );
          END IF;
        EXCEPTION WHEN OTHERS THEN
          -- Log the error but don't fail the message insert
          RAISE WARNING 'Could not send chat notification email: %', SQLERRM;
        END;
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

      -- Try to send email notification via edge function (optional - won't fail if pg_net not available)
      IF pg_net_available THEN
        BEGIN
          -- Obtener email del cliente
          SELECT email INTO recipient_email
          FROM auth.users
          WHERE id = NEW.user_id;
          
          IF recipient_email IS NOT NULL THEN
            PERFORM net.http_post(
              url := 'https://ljygreayxxpsdmncwzia.supabase.co/functions/v1/send-chat-notification-email',
              headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeWdyZWF5eHhwc2RtbmN3emlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODMxOTUsImV4cCI6MjA3ODM1OTE5NX0.309lxyM-chybzF-Df_nj9PiW83dE379iw1D5EgKLkUI'
              ),
              body := jsonb_build_object(
                'to_email', recipient_email,
                'sender_name', 'Equipo de Soporte',
                'message_preview', NEW.message,
                'is_admin', true,
                'has_attachments', (NEW.attachments IS NOT NULL AND jsonb_array_length(NEW.attachments) > 0)
              )
            );
          END IF;
        EXCEPTION WHEN OTHERS THEN
          -- Log the error but don't fail the message insert
          RAISE WARNING 'Could not send chat notification email: %', SQLERRM;
        END;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add a comment to explain the fix
COMMENT ON FUNCTION public.notify_message_received() IS 'Trigger function for message notifications. Fixed to gracefully handle missing pg_net extension.';
