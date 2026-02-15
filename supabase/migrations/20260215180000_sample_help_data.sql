-- =====================================================
-- SAMPLE DATA FOR SMART ADMIN HELP SYSTEM
-- =====================================================
-- This migration adds sample data to demonstrate the help system
-- You can modify or add more data as needed

-- =====================================================
-- SAMPLE CONTEXTUAL HELP MESSAGES
-- =====================================================
-- Orders section help messages
INSERT INTO contextual_help_messages (
  section, context, help_type,
  title_es, title_en, title_nl,
  content_es, content_en, content_nl,
  icon, color, position, trigger_on, auto_show, dismissible, priority
) VALUES
-- Order management help
('orders', 'general', 'info_box',
 'Gestión de Pedidos', 'Order Management', 'Bestelbeheer',
 'Aquí puedes ver y gestionar todos los pedidos. Usa los filtros para encontrar pedidos específicos y cambia el estado para actualizar el proceso.', 
 'Here you can view and manage all orders. Use filters to find specific orders and change status to update the process.',
 'Hier kunt u alle bestellingen bekijken en beheren. Gebruik filters om specifieke bestellingen te vinden en wijzig de status om het proces bij te werken.',
 'Info', 'blue', 'right', 'auto', true, true, 100),

('orders', 'status_change', 'best_practice',
 'Cambio de Estado', 'Status Change', 'Status Wijzigen',
 'Al cambiar el estado de un pedido, se enviará automáticamente un email al cliente. Asegúrate de agregar información de seguimiento si el pedido es enviado.',
 'When changing order status, an email will be automatically sent to the customer. Make sure to add tracking information if the order is shipped.',
 'Bij het wijzigen van de bestelstatus wordt automatisch een e-mail naar de klant verzonden. Voeg trackinggegevens toe als de bestelling wordt verzonden.',
 'CheckCircle', 'green', 'right', 'hover', false, true, 90),

('orders', 'payment_status', 'warning',
 'Estado de Pago', 'Payment Status', 'Betaalstatus',
 'Si cambias el estado de pago a "Pagado", se sincronizará automáticamente con la factura asociada. Para tarjetas regalo, se enviará el código de activación.',
 'If you change payment status to "Paid", it will automatically sync with the associated invoice. For gift cards, the activation code will be sent.',
 'Als u de betaalstatus wijzigt naar "Betaald", wordt deze automatisch gesynchroniseerd met de bijbehorende factuur. Voor cadeaubonnen wordt de activatiecode verzonden.',
 'AlertTriangle', 'yellow', 'right', 'hover', false, true, 95),

-- Quote section help
('quotes', 'general', 'info_box',
 'Gestión de Cotizaciones', 'Quote Management', 'Offertesbeheer',
 'Las cotizaciones permiten enviar presupuestos a clientes. Una vez aprobadas, se generan automáticamente facturas y pedidos.',
 'Quotes allow you to send budgets to customers. Once approved, invoices and orders are automatically generated.',
 'Met offertes kunt u budgetten naar klanten sturen. Eenmaal goedgekeurd, worden automatisch facturen en bestellingen gegenereerd.',
 'Info', 'blue', 'right', 'auto', true, true, 100),

('quotes', 'approval', 'tutorial',
 'Aprobar Cotización', 'Approve Quote', 'Offerte Goedkeuren',
 'Al aprobar una cotización se activará la automatización que: 1) Genera una factura automáticamente, 2) Crea un pedido, 3) Envía email al cliente, 4) Crea notificación en el panel del cliente.',
 'Approving a quote will trigger automation that: 1) Automatically generates an invoice, 2) Creates an order, 3) Sends email to customer, 4) Creates notification in customer panel.',
 'Het goedkeuren van een offerte activeert automatisering die: 1) Automatisch een factuur genereert, 2) Een bestelling aanmaakt, 3) E-mail naar de klant stuurt, 4) Melding in klantenpaneel aanmaakt.',
 'BookOpen', 'blue', 'right', 'hover', false, true, 95),

-- Calculator 3D help
('calculator_3d', 'material_selection', 'tip',
 'Selección de Material', 'Material Selection', 'Materiaalselectie',
 'El material afecta el precio final. PLA es económico y versátil, mientras que ABS es más resistente al calor. PETG ofrece un buen balance.',
 'Material affects final price. PLA is economical and versatile, while ABS is more heat resistant. PETG offers a good balance.',
 'Materiaal beïnvloedt de uiteindelijke prijs. PLA is economisch en veelzijdig, terwijl ABS hittebestendiger is. PETG biedt een goede balans.',
 'Lightbulb', 'blue', 'right', 'hover', false, true, 80),

('calculator_3d', 'volume', 'example',
 'Volumen del Modelo', 'Model Volume', 'Model Volume',
 'El volumen se calcula automáticamente desde tu archivo STL. Modelos más grandes = más material = precio más alto.',
 'Volume is automatically calculated from your STL file. Larger models = more material = higher price.',
 'Volume wordt automatisch berekend vanuit uw STL-bestand. Grotere modellen = meer materiaal = hogere prijs.',
 'Info', 'blue', 'right', 'hover', false, true, 75),

-- Products help
('products', 'pricing', 'best_practice',
 'Estrategia de Precios', 'Pricing Strategy', 'Prijsstrategie',
 'Configura descuentos por cantidad para incentivar compras al por mayor. Los descuentos se aplican automáticamente en el carrito.',
 'Set up quantity discounts to incentivize bulk purchases. Discounts are automatically applied in cart.',
 'Stel kwantumkortingen in om bulkaankopen aan te moedigen. Kortingen worden automatisch toegepast in winkelwagen.',
 'CheckCircle', 'green', 'right', 'hover', false, true, 85),

('products', 'seo', 'tip',
 'Optimización SEO', 'SEO Optimization', 'SEO Optimalisatie',
 'Completa el título SEO, descripción y keywords para mejorar el posicionamiento en Google. El sistema genera sugerencias automáticamente.',
 'Complete SEO title, description and keywords to improve Google ranking. System generates suggestions automatically.',
 'Vul SEO-titel, beschrijving en trefwoorden in om Google-ranking te verbeteren. Systeem genereert automatisch suggesties.',
 'Lightbulb', 'blue', 'right', 'hover', false, true, 80),

-- Dashboard help
('dashboard', 'metrics', 'info_box',
 'Métricas Clave', 'Key Metrics', 'Belangrijke Statistieken',
 'El dashboard muestra métricas en tiempo real de tu negocio. Los gráficos se actualizan automáticamente cada 5 minutos.',
 'Dashboard shows real-time metrics of your business. Charts update automatically every 5 minutes.',
 'Dashboard toont realtime statistieken van uw bedrijf. Grafieken worden automatisch elke 5 minuten bijgewerkt.',
 'Info', 'blue', 'center', 'auto', false, true, 90)

ON CONFLICT (section, context, help_type, title_es) DO NOTHING;

-- =====================================================
-- SAMPLE STATUS TRANSITION RULES
-- =====================================================
-- Order status transitions
INSERT INTO status_transition_rules (
  entity_type, from_status_type, from_status_value,
  suggests_status_type, suggests_status_value,
  prompt_type,
  prompt_title_es, prompt_title_en, prompt_title_nl,
  prompt_message_es, prompt_message_en, prompt_message_nl,
  options, is_active, is_mandatory, priority
) VALUES
-- When marking order as cancelled, suggest updating payment status
('order', 'order_status', 'Cancelado',
 'payment_status', 'cancelled',
 'choice',
 '¿Actualizar estado de pago?', 'Update payment status?', 'Betaalstatus bijwerken?',
 'El pedido fue cancelado. ¿Deseas también actualizar el estado de pago a "Cancelado"?',
 'Order was cancelled. Do you also want to update payment status to "Cancelled"?',
 'Bestelling is geannuleerd. Wilt u ook de betaalstatus bijwerken naar "Geannuleerd"?',
 '[
   {"value": "yes", "label_es": "Sí, cancelar pago", "label_en": "Yes, cancel payment", "label_nl": "Ja, betaling annuleren", "action": "update_payment_status", "variant": "default"},
   {"value": "no", "label_es": "No, mantener estado", "label_en": "No, keep status", "label_nl": "Nee, status behouden", "action": "none", "variant": "outline"}
 ]'::jsonb,
 true, false, 90),

-- When marking payment as paid, suggest marking order as confirmed
('order', 'payment_status', 'paid',
 'order_status', 'Confirmado',
 'confirmation',
 'Pago confirmado', 'Payment confirmed', 'Betaling bevestigd',
 'El pago fue confirmado. ¿Deseas actualizar el estado del pedido a "Confirmado"?',
 'Payment was confirmed. Do you want to update order status to "Confirmed"?',
 'Betaling is bevestigd. Wilt u de bestelstatus bijwerken naar "Bevestigd"?',
 '[
   {"value": "confirm", "label_es": "Sí, confirmar pedido", "label_en": "Yes, confirm order", "label_nl": "Ja, bestelling bevestigen", "action": "update_order_status", "variant": "default"},
   {"value": "skip", "label_es": "No por ahora", "label_en": "Not now", "label_nl": "Niet nu", "action": "none", "variant": "outline"}
 ]'::jsonb,
 true, false, 85),

-- When marking order as delivered, suggest sending review request
('order', 'order_status', 'Entregado',
 null, null,
 'info',
 'Pedido entregado', 'Order delivered', 'Bestelling geleverd',
 'El pedido fue marcado como entregado. El cliente recibirá una notificación y un email de agradecimiento.',
 'Order was marked as delivered. Customer will receive a notification and thank you email.',
 'Bestelling is gemarkeerd als geleverd. Klant ontvangt een melding en bedank-e-mail.',
 '[
   {"value": "ok", "label_es": "Entendido", "label_en": "Got it", "label_nl": "Begrepen", "action": "none", "variant": "default"}
 ]'::jsonb,
 true, false, 80)

ON CONFLICT (entity_type, from_status_type, from_status_value, suggests_status_type) DO NOTHING;

-- =====================================================
-- SAMPLE ADMIN ACTION PROMPTS
-- =====================================================
INSERT INTO admin_action_prompts (
  action_type, entity_type, trigger_moment,
  title_es, title_en, title_nl,
  message_es, message_en, message_nl,
  prompt_style, requires_reason, is_active, is_mandatory
) VALUES
('delete_order', 'order', 'before',
 '¿Eliminar pedido?', 'Delete order?', 'Bestelling verwijderen?',
 'Estás a punto de eliminar este pedido. Esta acción se puede deshacer desde la papelera durante 30 días.',
 'You are about to delete this order. This action can be undone from trash for 30 days.',
 'U staat op het punt deze bestelling te verwijderen. Deze actie kan binnen 30 dagen ongedaan worden gemaakt vanuit de prullenbak.',
 'warning', false, true, true),

('delete_product', 'product', 'before',
 '¿Eliminar producto?', 'Delete product?', 'Product verwijderen?',
 'Estás a punto de eliminar este producto. Los pedidos existentes no se verán afectados, pero el producto no estará disponible para nuevas compras.',
 'You are about to delete this product. Existing orders will not be affected, but the product will not be available for new purchases.',
 'U staat op het punt dit product te verwijderen. Bestaande bestellingen worden niet beïnvloed, maar het product is niet beschikbaar voor nieuwe aankopen.',
 'warning', true, true, true)

ON CONFLICT (action_type, entity_type, trigger_moment) DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Check that data was inserted
DO $$
DECLARE
  help_count INTEGER;
  rule_count INTEGER;
  prompt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO help_count FROM contextual_help_messages WHERE is_active = true;
  SELECT COUNT(*) INTO rule_count FROM status_transition_rules WHERE is_active = true;
  SELECT COUNT(*) INTO prompt_count FROM admin_action_prompts WHERE is_active = true;
  
  RAISE NOTICE 'Sample data inserted successfully:';
  RAISE NOTICE '- Contextual help messages: %', help_count;
  RAISE NOTICE '- Status transition rules: %', rule_count;
  RAISE NOTICE '- Admin action prompts: %', prompt_count;
END $$;
