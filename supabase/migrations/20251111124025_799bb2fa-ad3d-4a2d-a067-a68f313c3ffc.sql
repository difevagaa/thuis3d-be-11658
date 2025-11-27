-- Crear función para generar factura cuando se añade precio estimado a cotización
CREATE OR REPLACE FUNCTION public.generate_invoice_from_quote_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice_number TEXT;
  v_invoice_id UUID;
  v_tax_rate NUMERIC := 0;
  v_tax_enabled BOOLEAN := false;
  v_subtotal NUMERIC;
  v_tax NUMERIC;
  v_shipping NUMERIC := 0;
  v_total NUMERIC;
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Solo ejecutar si estimated_price cambió de NULL a un valor
  IF (OLD.estimated_price IS NULL OR OLD.estimated_price = 0) 
     AND NEW.estimated_price IS NOT NULL 
     AND NEW.estimated_price > 0 THEN
    
    RAISE NOTICE '💰 [INVOICE] Precio añadido a cotización %, generando factura...', NEW.id;
    
    -- Verificar que no exista ya una factura para esta cotización
    IF EXISTS (SELECT 1 FROM invoices WHERE quote_id = NEW.id) THEN
      RAISE NOTICE '⚠️ [INVOICE] Ya existe factura para cotización %', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Obtener configuración de IVA
    SELECT tax_rate, is_enabled INTO v_tax_rate, v_tax_enabled
    FROM tax_settings
    LIMIT 1;
    
    IF NOT FOUND THEN
      v_tax_rate := 21.0;
      v_tax_enabled := true;
    END IF;
    
    -- Calcular valores
    v_subtotal := NEW.estimated_price;
    v_tax := CASE WHEN v_tax_enabled THEN ROUND((v_subtotal * v_tax_rate) / 100, 2) ELSE 0 END;
    v_shipping := COALESCE(NEW.shipping_cost, 0);
    v_total := ROUND(v_subtotal + v_tax + v_shipping, 2);
    
    -- Generar número de factura
    SELECT generate_next_invoice_number() INTO v_invoice_number;
    
    RAISE NOTICE '💰 [INVOICE] Creando factura % - Total: €%.2f (Subtotal: €%.2f, IVA: €%.2f, Envío: €%.2f)',
      v_invoice_number, v_total, v_subtotal, v_tax, v_shipping;
    
    -- Crear factura
    INSERT INTO invoices (
      invoice_number,
      quote_id,
      user_id,
      issue_date,
      due_date,
      payment_status,
      subtotal,
      tax,
      shipping,
      discount,
      total,
      notes
    ) VALUES (
      v_invoice_number,
      NEW.id,
      NEW.user_id,
      NOW(),
      NOW() + INTERVAL '30 days',
      'pending',
      v_subtotal,
      v_tax,
      v_shipping,
      0,
      v_total,
      'Factura generada automáticamente - ' || 
      CASE 
        WHEN NEW.quote_type = 'file_upload' THEN 'Cotización de Archivo 3D'
        WHEN NEW.quote_type = 'service' THEN 'Cotización de Servicio'
        ELSE 'Cotización'
      END ||
      CASE WHEN NEW.description IS NOT NULL THEN ' - ' || LEFT(NEW.description, 100) ELSE '' END
    )
    RETURNING id INTO v_invoice_id;
    
    -- Crear item de factura
    INSERT INTO invoice_items (
      invoice_id,
      product_name,
      description,
      quantity,
      unit_price,
      total_price,
      tax_enabled
    ) VALUES (
      v_invoice_id,
      CASE 
        WHEN NEW.quote_type = 'file_upload' THEN COALESCE(NEW.file_storage_path, 'Impresión 3D')
        WHEN NEW.quote_type = 'service' THEN 'Servicio'
        ELSE 'Cotización'
      END,
      COALESCE(LEFT(NEW.description, 200), 'Servicio solicitado'),
      COALESCE(NEW.quantity, 1),
      v_subtotal,
      v_subtotal,
      v_tax_enabled
    );
    
    RAISE NOTICE '✅ [INVOICE] Item de factura creado';
    
    -- Obtener datos del usuario para notificaciones
    v_user_email := NEW.customer_email;
    v_user_name := NEW.customer_name;
    
    -- Crear notificación in-app si hay user_id
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        NEW.user_id,
        'invoice',
        '📄 Cotización Lista - Factura Generada',
        'Tu cotización ha sido procesada. Factura ' || v_invoice_number || 
        ' por €' || ROUND(v_total, 2) || ' generada. Puedes proceder con el pago.',
        '/mi-cuenta?tab=invoices'
      );
      
      RAISE NOTICE '🔔 [INVOICE] Notificación in-app creada';
    END IF;
    
    -- Enviar email al cliente
    BEGIN
      PERFORM net.http_post(
        url := 'https://ljygreayxxpsdmncwzia.supabase.co/functions/v1/send-invoice-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeWdyZWF5eHhwc2RtbmN3emlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODMxOTUsImV4cCI6MjA3ODM1OTE5NX0.309lxyM-chybzF-Df_nj9PiW83dE379iw1D5EgKLkUI'
        ),
        body := jsonb_build_object(
          'to', v_user_email,
          'customer_name', v_user_name,
          'invoice_number', v_invoice_number,
          'total', v_total,
          'quote_type', NEW.quote_type
        )
      );
      
      RAISE NOTICE '📧 [INVOICE] Email enviado a %', v_user_email;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '⚠️ [INVOICE] Error enviando email: %', SQLERRM;
    END;
    
    RAISE NOTICE '✨ [INVOICE] Proceso completado - Factura % generada para cotización %', v_invoice_number, NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS trigger_generate_invoice_from_quote_price ON public.quotes;

-- Crear trigger que se ejecuta cuando se actualiza estimated_price
CREATE TRIGGER trigger_generate_invoice_from_quote_price
  AFTER UPDATE OF estimated_price ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_invoice_from_quote_price();