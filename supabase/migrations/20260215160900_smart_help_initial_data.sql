-- =====================================================
-- DATOS INICIALES - SISTEMA DE AYUDAS INTELIGENTES
-- =====================================================
-- Este archivo contiene:
-- 1. Reglas de transición de estados (pedido ↔ pago)
-- 2. 20-50 ayudas contextuales por sección
-- 3. Prompts de confirmación inteligentes
-- =====================================================

-- =====================================================
-- 1. REGLAS DE TRANSICIÓN DE ESTADOS
-- =====================================================

-- Regla 1: Al cancelar pedido, sugerir cancelar pago
INSERT INTO status_transition_rules (
  entity_type, from_status_type, from_status_value,
  suggests_status_type, suggests_status_value,
  prompt_type,
  prompt_title_es, prompt_title_en, prompt_title_nl,
  prompt_message_es, prompt_message_en, prompt_message_nl,
  options, is_mandatory, priority
) VALUES (
  'order', 'order_status', 'cancelled',
  'payment_status', 'cancelled',
  'choice',
  '¿Cancelar también el pago?', 'Also cancel payment?', 'Betaling ook annuleren?',
  'Has marcado el pedido como cancelado. ¿Quieres también cancelar el estado del pago?',
  'You marked the order as cancelled. Do you also want to cancel the payment status?',
  'Je hebt de bestelling geannuleerd. Wil je ook de betalingsstatus annuleren?',
  '[
    {"value": "cancel_payment", "label_es": "Sí, cancelar pago", "label_en": "Yes, cancel payment", "label_nl": "Ja, annuleer betaling", "action": "update_payment_status", "status": "cancelled"},
    {"value": "keep_payment", "label_es": "No, mantener estado del pago", "label_en": "No, keep payment status", "label_nl": "Nee, behoud betalingsstatus", "action": "none"},
    {"value": "refund_payment", "label_es": "Reembolsar pago", "label_en": "Refund payment", "label_nl": "Terugbetaling", "action": "update_payment_status", "status": "refunded"}
  ]'::jsonb,
  false, 10
);

-- Regla 2: Al reembolsar pago, sugerir cancelar pedido
INSERT INTO status_transition_rules (
  entity_type, from_status_type, from_status_value,
  suggests_status_type, suggests_status_value,
  prompt_type,
  prompt_title_es, prompt_title_en, prompt_title_nl,
  prompt_message_es, prompt_message_en, prompt_message_nl,
  options, is_mandatory, priority
) VALUES (
  'order', 'payment_status', 'refunded',
  'order_status', 'cancelled',
  'choice',
  '¿Actualizar estado del pedido?', 'Update order status?', 'Bestelstatus bijwerken?',
  'Has reembolsado el pago. ¿Quieres actualizar el estado del pedido?',
  'You have refunded the payment. Do you want to update the order status?',
  'Je hebt de betaling terugbetaald. Wil je de bestelstatus bijwerken?',
  '[
    {"value": "cancel_order", "label_es": "Cancelar pedido", "label_en": "Cancel order", "label_nl": "Bestelling annuleren", "action": "update_order_status", "status": "cancelled"},
    {"value": "complete_order", "label_es": "Marcar como completado", "label_en": "Mark as completed", "label_nl": "Markeren als voltooid", "action": "update_order_status", "status": "completed"},
    {"value": "keep_status", "label_es": "Mantener estado actual", "label_en": "Keep current status", "label_nl": "Behoud huidige status", "action": "none"}
  ]'::jsonb,
  false, 10
);

-- Regla 3: Al marcar pago como fallido, avisar sobre el pedido
INSERT INTO status_transition_rules (
  entity_type, from_status_type, from_status_value,
  suggests_status_type, suggests_status_value,
  prompt_type,
  prompt_title_es, prompt_title_en, prompt_title_nl,
  prompt_message_es, prompt_message_en, prompt_message_nl,
  options, is_mandatory, priority
) VALUES (
  'order', 'payment_status', 'failed',
  'order_status', 'cancelled',
  'warning',
  'Pago fallido detectado', 'Failed payment detected', 'Mislukte betaling gedetecteerd',
  'El pago ha fallado. Es recomendable revisar el estado del pedido. ¿Qué acción deseas tomar?',
  'The payment has failed. It is recommended to review the order status. What action do you want to take?',
  'De betaling is mislukt. Het wordt aanbevolen om de bestelstatus te controleren. Welke actie wil je ondernemen?',
  '[
    {"value": "cancel_order", "label_es": "Cancelar pedido", "label_en": "Cancel order", "label_nl": "Bestelling annuleren", "action": "update_order_status", "status": "cancelled"},
    {"value": "hold_order", "label_es": "Poner en espera", "label_en": "Put on hold", "label_nl": "In de wacht zetten", "action": "update_order_status", "status": "pending"},
    {"value": "keep_status", "label_es": "Mantener estado", "label_en": "Keep status", "label_nl": "Status behouden", "action": "none"}
  ]'::jsonb,
  false, 9
);

-- Regla 4: Al completar pedido, verificar pago
INSERT INTO status_transition_rules (
  entity_type, from_status_type, from_status_value,
  suggests_status_type, suggests_status_value,
  prompt_type,
  prompt_title_es, prompt_title_en, prompt_title_nl,
  prompt_message_es, prompt_message_en, prompt_message_nl,
  options, is_mandatory, priority
) VALUES (
  'order', 'order_status', 'completed',
  'payment_status', 'paid',
  'confirmation',
  'Verificar estado del pago', 'Verify payment status', 'Betalingsstatus verifiëren',
  'Estás completando el pedido. ¿El pago ha sido recibido?',
  'You are completing the order. Has the payment been received?',
  'Je voltooit de bestelling. Is de betaling ontvangen?',
  '[
    {"value": "mark_paid", "label_es": "Sí, marcar como pagado", "label_en": "Yes, mark as paid", "label_nl": "Ja, markeer als betaald", "action": "update_payment_status", "status": "paid"},
    {"value": "keep_current", "label_es": "No cambiar estado de pago", "label_en": "Do not change payment status", "label_nl": "Betalingsstatus niet wijzigen", "action": "none"}
  ]'::jsonb,
  false, 8
);

-- Regla 5: Al cancelar pago, sugerir cancelar pedido
INSERT INTO status_transition_rules (
  entity_type, from_status_type, from_status_value,
  suggests_status_type, suggests_status_value,
  prompt_type,
  prompt_title_es, prompt_title_en, prompt_title_nl,
  prompt_message_es, prompt_message_en, prompt_message_nl,
  options, is_mandatory, priority
) VALUES (
  'order', 'payment_status', 'cancelled',
  'order_status', 'cancelled',
  'choice',
  '¿Cancelar también el pedido?', 'Also cancel order?', 'Bestelling ook annuleren?',
  'Has cancelado el pago. ¿Quieres también cancelar el pedido?',
  'You cancelled the payment. Do you also want to cancel the order?',
  'Je hebt de betaling geannuleerd. Wil je ook de bestelling annuleren?',
  '[
    {"value": "cancel_order", "label_es": "Sí, cancelar pedido", "label_en": "Yes, cancel order", "label_nl": "Ja, annuleer bestelling", "action": "update_order_status", "status": "cancelled"},
    {"value": "keep_order", "label_es": "No, mantener pedido", "label_en": "No, keep order", "label_nl": "Nee, behoud bestelling", "action": "none"}
  ]'::jsonb,
  false, 8
);

-- =====================================================
-- 2. AYUDAS CONTEXTUALES - SECCIÓN: PEDIDOS (30 ayudas)
-- =====================================================

INSERT INTO contextual_help_messages (section, context, help_type, title_es, title_en, title_nl, content_es, content_en, content_nl, icon, color, position, trigger_on, auto_show) VALUES
('orders', 'status_change', 'tip', 'Cambio de Estado', 'Status Change', 'Statuswijziging', 
'Al cambiar el estado de un pedido, el sistema te sugerirá automáticamente cambios relacionados en el estado del pago para mantener la coherencia.', 
'When changing an order status, the system will automatically suggest related payment status changes to maintain consistency.', 
'Bij het wijzigen van een bestelstatus zal het systeem automatisch gerelateerde betalingsstatuswijzigingen voorstellen om consistentie te behouden.', 
'HelpCircle', 'blue', 'right', 'hover', true),

('orders', 'payment_status', 'best_practice', 'Estado de Pago', 'Payment Status', 'Betalingsstatus', 
'Mejor práctica: Actualiza el estado de pago inmediatamente después de confirmar la transacción en tu pasarela de pago.', 
'Best practice: Update payment status immediately after confirming the transaction in your payment gateway.', 
'Best practice: Werk de betalingsstatus onmiddellijk bij na bevestiging van de transactie in je betalingsgateway.', 
'CheckCircle', 'green', 'right', 'hover', false),

('orders', 'tracking_number', 'tutorial', 'Número de Seguimiento', 'Tracking Number', 'Volgnummer', 
'Añade el número de seguimiento y selecciona el transportista. El sistema generará automáticamente el enlace de rastreo para el cliente.', 
'Add the tracking number and select the carrier. The system will automatically generate the tracking link for the customer.', 
'Voeg het volgnummer toe en selecteer de vervoerder. Het systeem genereert automatisch de trackinglink voor de klant.', 
'Truck', 'blue', 'right', 'hover', false),

('orders', 'bulk_actions', 'warning', 'Acciones Masivas', 'Bulk Actions', 'Bulkacties', 
'Precaución: Las acciones masivas afectan múltiples pedidos a la vez. Verifica tu selección antes de confirmar.', 
'Caution: Bulk actions affect multiple orders at once. Verify your selection before confirming.', 
'Let op: Bulkacties hebben invloed op meerdere bestellingen tegelijk. Controleer je selectie voordat je bevestigt.', 
'AlertTriangle', 'yellow', 'top', 'hover', false),

('orders', 'order_notes', 'tip', 'Notas del Pedido', 'Order Notes', 'Bestelnotities', 
'Las notas internas solo son visibles para administradores. Usa este campo para comunicación interna del equipo.', 
'Internal notes are only visible to administrators. Use this field for internal team communication.', 
'Interne notities zijn alleen zichtbaar voor beheerders. Gebruik dit veld voor interne teamcommunicatie.', 
'FileText', 'blue', 'right', 'hover', false),

('orders', 'customer_info', 'info_box', 'Información del Cliente', 'Customer Info', 'Klantinformatie', 
'Haz clic en el nombre del cliente para ver su perfil completo, historial de pedidos y preferencias.', 
'Click on the customer name to view their full profile, order history, and preferences.', 
'Klik op de klantnaam om hun volledige profiel, bestelgeschiedenis en voorkeuren te bekijken.', 
'User', 'blue', 'right', 'click', false),

('orders', 'refund_process', 'tutorial', 'Proceso de Reembolso', 'Refund Process', 'Terugbetalingsproces', 
'Para reembolsar: 1) Cambia estado de pago a "Reembolsado", 2) El sistema te preguntará sobre el estado del pedido, 3) Procesa el reembolso en tu pasarela de pago.', 
'To refund: 1) Change payment status to "Refunded", 2) System will ask about order status, 3) Process refund in your payment gateway.', 
'Om terug te betalen: 1) Wijzig betalingsstatus naar "Terugbetaald", 2) Systeem vraagt om bestelstatus, 3) Verwerk terugbetaling in je betalingsgateway.', 
'RefreshCw', 'blue', 'right', 'hover', false),

('orders', 'export_data', 'tip', 'Exportar Datos', 'Export Data', 'Gegevens exporteren', 
'Usa los filtros antes de exportar para obtener exactamente los datos que necesitas. Puedes exportar en CSV o Excel.', 
'Use filters before exporting to get exactly the data you need. You can export in CSV or Excel.', 
'Gebruik filters voordat je exporteert om precies de gegevens te krijgen die je nodig hebt. Je kunt exporteren in CSV of Excel.', 
'Download', 'blue', 'right', 'hover', false),

('orders', 'search_filters', 'example', 'Búsqueda y Filtros', 'Search & Filters', 'Zoeken & Filters', 
'Ejemplo: Busca "pendiente" para ver pedidos pendientes, o usa los filtros de fecha para ver pedidos de un período específico.', 
'Example: Search "pending" to see pending orders, or use date filters to view orders from a specific period.', 
'Voorbeeld: Zoek "in behandeling" om lopende bestellingen te zien, of gebruik datumfilters om bestellingen uit een specifieke periode te bekijken.', 
'Search', 'blue', 'right', 'hover', false),

('orders', 'order_timeline', 'info_box', 'Línea de Tiempo', 'Timeline', 'Tijdlijn', 
'La línea de tiempo muestra todos los cambios de estado y acciones realizadas en el pedido, útil para auditoría.', 
'The timeline shows all status changes and actions performed on the order, useful for auditing.', 
'De tijdlijn toont alle statuswijzigingen en acties uitgevoerd op de bestelling, nuttig voor auditing.', 
'Clock', 'blue', 'right', 'hover', false),

('orders', 'email_notifications', 'best_practice', 'Notificaciones por Email', 'Email Notifications', 'E-mailmeldingen', 
'El sistema envía automáticamente emails al cliente cuando cambias el estado. Verifica que las plantillas estén configuradas.', 
'The system automatically sends emails to the customer when you change the status. Verify that templates are configured.', 
'Het systeem stuurt automatisch e-mails naar de klant wanneer je de status wijzigt. Controleer of sjablonen zijn geconfigureerd.', 
'Mail', 'green', 'right', 'hover', false),

('orders', 'shipping_address', 'warning', 'Dirección de Envío', 'Shipping Address', 'Verzendadres', 
'Verifica la dirección de envío antes de procesar. Los errores en la dirección pueden causar devoluciones costosas.', 
'Verify shipping address before processing. Address errors can cause costly returns.', 
'Controleer het verzendadres voordat je verwerkt. Adresfouten kunnen kostbare retouren veroorzaken.', 
'MapPin', 'yellow', 'right', 'hover', false),

('orders', 'order_items', 'info_box', 'Artículos del Pedido', 'Order Items', 'Bestellingsitems', 
'Cada artículo muestra cantidad, precio, personalizaciones y estado de producción. Haz clic para ver detalles completos.', 
'Each item shows quantity, price, customizations and production status. Click to view full details.', 
'Elk item toont aantal, prijs, aanpassingen en productiestatus. Klik om volledige details te bekijken.', 
'Package', 'blue', 'right', 'hover', false),

('orders', 'price_adjustment', 'warning', 'Ajuste de Precio', 'Price Adjustment', 'Prijsaanpassing', 
'Al ajustar precios manualmente, asegúrate de notificar al cliente y documentar la razón del cambio.', 
'When adjusting prices manually, make sure to notify the customer and document the reason for the change.', 
'Bij handmatige prijsaanpassingen, zorg ervoor dat je de klant op de hoogte brengt en de reden voor de wijziging documenteert.', 
'DollarSign', 'yellow', 'right', 'hover', false),

('orders', 'cancel_prevention', 'best_practice', 'Prevención de Cancelaciones', 'Cancellation Prevention', 'Annuleringspreventie', 
'Antes de cancelar, considera contactar al cliente. Muchas cancelaciones se pueden resolver con comunicación.', 
'Before canceling, consider contacting the customer. Many cancellations can be resolved with communication.', 
'Voordat je annuleert, overweeg contact op te nemen met de klant. Veel annuleringen kunnen worden opgelost met communicatie.', 
'MessageSquare', 'green', 'right', 'hover', false),

('orders', 'priority_orders', 'tip', 'Pedidos Prioritarios', 'Priority Orders', 'Prioriteitsbestellingen', 
'Marca pedidos como prioritarios usando las etiquetas para procesarlos primero en producción.', 
'Mark orders as priority using tags to process them first in production.', 
'Markeer bestellingen als prioriteit met tags om ze eerst in productie te verwerken.', 
'Star', 'blue', 'right', 'hover', false),

('orders', 'payment_methods', 'info_box', 'Métodos de Pago', 'Payment Methods', 'Betaalmethoden', 
'El sistema soporta múltiples métodos de pago. Cada método puede requerir verificación manual diferente.', 
'The system supports multiple payment methods. Each method may require different manual verification.', 
'Het systeem ondersteunt meerdere betaalmethoden. Elke methode kan een andere handmatige verificatie vereisen.', 
'CreditCard', 'blue', 'right', 'hover', false),

('orders', 'invoice_generation', 'tutorial', 'Generar Factura', 'Generate Invoice', 'Factuur genereren', 
'Las facturas se generan automáticamente al confirmar el pago. Puedes regenerar o personalizar facturas desde la sección de facturas.', 
'Invoices are generated automatically upon payment confirmation. You can regenerate or customize invoices from the invoices section.', 
'Facturen worden automatisch gegenereerd bij bevestiging van betaling. Je kunt facturen regenereren of aanpassen vanuit de facturensectie.', 
'FileText', 'blue', 'right', 'hover', false),

('orders', 'gift_cards', 'tip', 'Tarjetas de Regalo', 'Gift Cards', 'Cadeaukaarten', 
'Los pedidos con tarjetas de regalo se activan automáticamente al marcar el pago como recibido.', 
'Orders with gift cards are automatically activated when marking payment as received.', 
'Bestellingen met cadeaukaarten worden automatisch geactiveerd bij het markeren van betaling als ontvangen.', 
'Gift', 'blue', 'right', 'hover', false),

('orders', 'custom_fields', 'example', 'Campos Personalizados', 'Custom Fields', 'Aangepaste velden', 
'Ejemplo: Usa el campo de notas para agregar instrucciones especiales de producción o embalaje.', 
'Example: Use the notes field to add special production or packaging instructions.', 
'Voorbeeld: Gebruik het notitieveldt om speciale productie- of verpakkingsinstructies toe te voegen.', 
'Edit', 'blue', 'right', 'hover', false),

('orders', 'order_history', 'info_box', 'Historial del Cliente', 'Customer History', 'Klantgeschiedenis', 
'Revisa pedidos anteriores del cliente para identificar patrones y ofrecer mejor servicio.', 
'Review customer previous orders to identify patterns and offer better service.', 
'Bekijk eerdere bestellingen van klanten om patronen te identificeren en betere service te bieden.', 
'History', 'blue', 'right', 'hover', false),

('orders', 'production_status', 'tip', 'Estado de Producción', 'Production Status', 'Productiestatus', 
'El estado de producción es independiente del estado del pedido. Úsalo para tracking interno de fabricación.', 
'Production status is independent from order status. Use it for internal manufacturing tracking.', 
'Productiestatus is onafhankelijk van bestelstatus. Gebruik het voor interne productietracking.', 
'Factory', 'blue', 'right', 'hover', false),

('orders', 'partial_shipment', 'tutorial', 'Envío Parcial', 'Partial Shipment', 'Gedeeltelijke verzending', 
'Para envíos parciales: actualiza solo los artículos enviados y añade un número de seguimiento con nota aclaratoria.', 
'For partial shipments: update only shipped items and add a tracking number with clarification note.', 
'Voor gedeeltelijke verzendingen: werk alleen verzonden items bij en voeg een volgnummer toe met verduidelijkende notitie.', 
'Package', 'blue', 'right', 'hover', false),

('orders', 'returns_exchanges', 'info_box', 'Devoluciones e Intercambios', 'Returns & Exchanges', 'Retouren & Ruilen', 
'Para devoluciones, crea un nuevo pedido de intercambio y vincula ambos usando las notas para referencia.', 
'For returns, create a new exchange order and link both using notes for reference.', 
'Voor retouren, maak een nieuwe ruilbestelling aan en koppel beide met notities voor referentie.', 
'RotateCcw', 'blue', 'right', 'hover', false),

('orders', 'tax_calculation', 'warning', 'Cálculo de Impuestos', 'Tax Calculation', 'Belastingberekening', 
'Los impuestos se calculan automáticamente según la ubicación del cliente. Verifica configuración de IVA en ajustes.', 
'Taxes are calculated automatically based on customer location. Verify VAT settings in configuration.', 
'Belastingen worden automatisch berekend op basis van klantlocatie. Controleer BTW-instellingen in configuratie.', 
'Calculator', 'yellow', 'right', 'hover', false),

('orders', 'discount_codes', 'tip', 'Códigos de Descuento', 'Discount Codes', 'Kortingscodes', 
'Los descuentos aplicados se muestran en el resumen. Puedes agregar descuentos manuales si es necesario.', 
'Applied discounts are shown in the summary. You can add manual discounts if needed.', 
'Toegepaste kortingen worden weergegeven in het overzicht. Je kunt indien nodig handmatige kortingen toevoegen.', 
'Tag', 'blue', 'right', 'hover', false),

('orders', 'order_source', 'info_box', 'Origen del Pedido', 'Order Source', 'Bestelbron', 
'Identifica de dónde vino el pedido: web, teléfono, email. Útil para análisis de canales de venta.', 
'Identify where the order came from: web, phone, email. Useful for sales channel analysis.', 
'Identificeer waar de bestelling vandaan kwam: web, telefoon, e-mail. Nuttig voor verkoopkanaalanalyse.', 
'TrendingUp', 'blue', 'right', 'hover', false),

('orders', 'urgency_indicators', 'best_practice', 'Indicadores de Urgencia', 'Urgency Indicators', 'Urgentie-indicatoren', 
'Usa colores y etiquetas para identificar visualmente pedidos urgentes que requieren atención inmediata.', 
'Use colors and tags to visually identify urgent orders requiring immediate attention.', 
'Gebruik kleuren en tags om visueel urgente bestellingen te identificeren die onmiddellijke aandacht vereisen.', 
'AlertCircle', 'red', 'right', 'hover', false),

('orders', 'quality_check', 'tip', 'Control de Calidad', 'Quality Check', 'Kwaliteitscontrole', 
'Marca pedidos que han pasado control de calidad. Esto ayuda a identificar productos que están listos para envío.', 
'Mark orders that have passed quality control. This helps identify products ready for shipping.', 
'Markeer bestellingen die kwaliteitscontrole hebben doorstaan. Dit helpt producten te identificeren die klaar zijn voor verzending.', 
'CheckCircle', 'green', 'right', 'hover', false),

('orders', 'backorder_handling', 'tutorial', 'Gestión de Pendientes', 'Backorder Handling', 'Achterstandsbeheer', 
'Para artículos sin stock: marca como "pendiente" y notifica al cliente con fecha estimada de disponibilidad.', 
'For out-of-stock items: mark as "pending" and notify customer with estimated availability date.', 
'Voor niet-voorradige items: markeer als "in behandeling" en informeer klant met geschatte beschikbaarheidsdatum.', 
'Package', 'blue', 'right', 'hover', false);

-- =====================================================
-- 3. AYUDAS CONTEXTUALES - SECCIÓN: COTIZACIONES (25 ayudas)
-- =====================================================

INSERT INTO contextual_help_messages (section, context, help_type, title_es, title_en, title_nl, content_es, content_en, content_nl, icon, color, position, trigger_on) VALUES
('quotes', 'create_quote', 'tutorial', 'Crear Cotización', 'Create Quote', 'Offerte maken', 
'Paso 1: Selecciona cliente, Paso 2: Añade productos/servicios, Paso 3: Aplica descuentos si es necesario, Paso 4: Revisa y envía.', 
'Step 1: Select customer, Step 2: Add products/services, Step 3: Apply discounts if needed, Step 4: Review and send.', 
'Stap 1: Selecteer klant, Stap 2: Voeg producten/diensten toe, Stap 3: Pas kortingen toe indien nodig, Stap 4: Controleer en verstuur.', 
'FilePlus', 'blue', 'right', 'hover'),

('quotes', 'quote_expiry', 'warning', 'Vencimiento de Cotización', 'Quote Expiration', 'Offerte vervaldatum', 
'Las cotizaciones tienen fecha de vencimiento. Asegúrate de establecer un plazo realista para la validez de precios.', 
'Quotes have an expiration date. Make sure to set a realistic timeframe for price validity.', 
'Offertes hebben een vervaldatum. Zorg ervoor dat je een realistische termijn instelt voor prijsgeldigheid.', 
'Calendar', 'yellow', 'right', 'hover'),

('quotes', 'convert_to_order', 'tip', 'Convertir a Pedido', 'Convert to Order', 'Converteren naar bestelling', 
'Una vez que el cliente acepta, convierte la cotización en pedido con un solo clic. Los datos se transfieren automáticamente.', 
'Once the customer accepts, convert the quote to an order with one click. Data is transferred automatically.', 
'Zodra de klant accepteert, converteer de offerte naar een bestelling met één klik. Gegevens worden automatisch overgedragen.', 
'ArrowRight', 'blue', 'right', 'hover'),

('quotes', 'pricing_strategy', 'best_practice', 'Estrategia de Precios', 'Pricing Strategy', 'Prijsstrategie', 
'Mantén consistencia en tus precios. Usa la calculadora 3D para estimaciones precisas de costos de producción.', 
'Maintain consistency in your pricing. Use the 3D calculator for accurate production cost estimates.', 
'Handhaaf consistentie in je prijzen. Gebruik de 3D-calculator voor nauwkeurige productiekostenschattingen.', 
'TrendingUp', 'green', 'right', 'hover'),

('quotes', 'quote_templates', 'tip', 'Plantillas de Cotización', 'Quote Templates', 'Offertesjablonen', 
'Guarda cotizaciones frecuentes como plantillas para agilizar el proceso en solicitudes similares.', 
'Save frequent quotes as templates to speed up the process for similar requests.', 
'Bewaar frequente offertes als sjablonen om het proces voor vergelijkbare aanvragen te versnellen.', 
'Copy', 'blue', 'right', 'hover'),

('quotes', 'custom_terms', 'info_box', 'Términos Personalizados', 'Custom Terms', 'Aangepaste voorwaarden', 
'Añade términos y condiciones específicos para cada cotización: plazos de entrega, métodos de pago, garantías.', 
'Add specific terms and conditions for each quote: delivery times, payment methods, warranties.', 
'Voeg specifieke algemene voorwaarden toe voor elke offerte: levertijden, betaalmethoden, garanties.', 
'FileText', 'blue', 'right', 'hover'),

('quotes', 'follow_up', 'best_practice', 'Seguimiento', 'Follow-up', 'Opvolging', 
'Haz seguimiento de cotizaciones enviadas. Los recordatorios amistosos pueden aumentar la tasa de conversión.', 
'Follow up on sent quotes. Friendly reminders can increase conversion rate.', 
'Volg verzonden offertes op. Vriendelijke herinneringen kunnen de conversieratio verhogen.', 
'Bell', 'green', 'right', 'hover'),

('quotes', 'bulk_quoting', 'tutorial', 'Cotización Masiva', 'Bulk Quoting', 'Bulk offerte', 
'Para múltiples productos similares, usa la función de cotización masiva para procesar varios artículos a la vez.', 
'For multiple similar products, use bulk quoting feature to process several items at once.', 
'Voor meerdere vergelijkbare producten, gebruik de bulkofferte functie om meerdere items tegelijk te verwerken.', 
'Layers', 'blue', 'right', 'hover'),

('quotes', 'revision_history', 'info_box', 'Historial de Revisiones', 'Revision History', 'Revisiegeschiedenis', 
'Cada cambio en la cotización se registra. Puedes ver y comparar versiones anteriores en cualquier momento.', 
'Every change to the quote is recorded. You can view and compare previous versions at any time.', 
'Elke wijziging in de offerte wordt vastgelegd. Je kunt vorige versies op elk moment bekijken en vergelijken.', 
'History', 'blue', 'right', 'hover'),

('quotes', 'quote_pdf', 'tip', 'Exportar PDF', 'Export PDF', 'Exporteer PDF', 
'Genera PDF profesional de la cotización con tu logo y colores corporativos. Personaliza el diseño en ajustes.', 
'Generate professional quote PDF with your logo and corporate colors. Customize design in settings.', 
'Genereer professionele offerte PDF met je logo en bedrijfskleuren. Pas ontwerp aan in instellingen.', 
'Download', 'blue', 'right', 'hover'),

('quotes', 'discount_authorization', 'warning', 'Autorización de Descuentos', 'Discount Authorization', 'Kortingsautorisatie', 
'Descuentos superiores al 20% pueden requerir aprobación de gerencia. Verifica políticas internas.', 
'Discounts over 20% may require management approval. Check internal policies.', 
'Kortingen boven 20% kunnen goedkeuring van management vereisen. Controleer intern beleid.', 
'Shield', 'yellow', 'right', 'hover'),

('quotes', 'client_comments', 'info_box', 'Comentarios del Cliente', 'Client Comments', 'Klantcommentaren', 
'Los clientes pueden añadir comentarios a las cotizaciones. Revisa regularmente para atender consultas.', 
'Clients can add comments to quotes. Review regularly to address inquiries.', 
'Klanten kunnen opmerkingen toevoegen aan offertes. Controleer regelmatig om vragen te beantwoorden.', 
'MessageSquare', 'blue', 'right', 'hover'),

('quotes', 'competitive_pricing', 'best_practice', 'Precios Competitivos', 'Competitive Pricing', 'Concurrerende prijzen', 
'Investiga precios del mercado. Ofrece valor agregado en lugar de solo competir en precio.', 
'Research market prices. Offer added value instead of just competing on price.', 
'Onderzoek marktprijzen. Bied toegevoegde waarde in plaats van alleen te concurreren op prijs.', 
'BarChart', 'green', 'right', 'hover'),

('quotes', 'technical_specs', 'tip', 'Especificaciones Técnicas', 'Technical Specs', 'Technische specificaties', 
'Incluye especificaciones técnicas detalladas: materiales, dimensiones, tolerancias, acabados.', 
'Include detailed technical specifications: materials, dimensions, tolerances, finishes.', 
'Inclusief gedetailleerde technische specificaties: materialen, afmetingen, toleranties, afwerkingen.', 
'Ruler', 'blue', 'right', 'hover'),

('quotes', 'payment_terms', 'info_box', 'Términos de Pago', 'Payment Terms', 'Betalingsvoorwaarden', 
'Especifica claramente términos de pago: porcentaje de anticipo, plazos, métodos aceptados.', 
'Clearly specify payment terms: deposit percentage, deadlines, accepted methods.', 
'Specificeer duidelijk de betalingsvoorwaarden: aanbetalingspercentage, deadlines, geaccepteerde methoden.', 
'CreditCard', 'blue', 'right', 'hover'),

('quotes', 'quote_analytics', 'tutorial', 'Análisis de Cotizaciones', 'Quote Analytics', 'Offerteanalyse', 
'Revisa métricas: tasa de conversión, tiempo de respuesta promedio, valor promedio de cotización.', 
'Review metrics: conversion rate, average response time, average quote value.', 
'Bekijk statistieken: conversieratio, gemiddelde responstijd, gemiddelde offertewaarde.', 
'PieChart', 'blue', 'right', 'hover'),

('quotes', 'multi_currency', 'tip', 'Múltiples Monedas', 'Multi-Currency', 'Multi-valuta', 
'Para clientes internacionales, el sistema puede mostrar cotizaciones en su moneda local.', 
'For international clients, the system can display quotes in their local currency.', 
'Voor internationale klanten kan het systeem offertes weergeven in hun lokale valuta.', 
'DollarSign', 'blue', 'right', 'hover'),

('quotes', 'approval_workflow', 'info_box', 'Flujo de Aprobación', 'Approval Workflow', 'Goedkeuringsworkflow', 
'Cotizaciones grandes pueden requerir aprobación en múltiples niveles. Configura workflow en ajustes.', 
'Large quotes may require multi-level approval. Configure workflow in settings.', 
'Grote offertes kunnen goedkeuring op meerdere niveaus vereisen. Configureer workflow in instellingen.', 
'GitBranch', 'blue', 'right', 'hover'),

('quotes', 'digital_signature', 'tip', 'Firma Digital', 'Digital Signature', 'Digitale handtekening', 
'Los clientes pueden firmar cotizaciones digitalmente, acelerando el proceso de aprobación.', 
'Clients can digitally sign quotes, speeding up the approval process.', 
'Klanten kunnen offertes digitaal ondertekenen, waardoor het goedkeuringsproces wordt versneld.', 
'Edit3', 'blue', 'right', 'hover'),

('quotes', 'quote_comparison', 'tutorial', 'Comparar Cotizaciones', 'Compare Quotes', 'Offertes vergelijken', 
'Compara múltiples versiones lado a lado para identificar cambios en precios o especificaciones.', 
'Compare multiple versions side by side to identify changes in prices or specifications.', 
'Vergelijk meerdere versies naast elkaar om wijzigingen in prijzen of specificaties te identificeren.', 
'GitCompare', 'blue', 'right', 'hover'),

('quotes', 'client_portal', 'info_box', 'Portal del Cliente', 'Client Portal', 'Klantportaal', 
'Los clientes pueden ver sus cotizaciones en su portal personal y responder directamente.', 
'Clients can view their quotes in their personal portal and respond directly.', 
'Klanten kunnen hun offertes bekijken in hun persoonlijke portaal en direct reageren.', 
'Globe', 'blue', 'right', 'hover'),

('quotes', 'quote_reminders', 'best_practice', 'Recordatorios Automáticos', 'Automatic Reminders', 'Automatische herinneringen', 
'Configura recordatorios automáticos para cotizaciones próximas a vencer sin respuesta del cliente.', 
'Configure automatic reminders for quotes about to expire without client response.', 
'Configureer automatische herinneringen voor offertes die op het punt staan te verlopen zonder reactie van klant.', 
'Clock', 'green', 'right', 'hover'),

('quotes', 'collaborative_quotes', 'tip', 'Cotizaciones Colaborativas', 'Collaborative Quotes', 'Collaboratieve offertes', 
'Múltiples miembros del equipo pueden trabajar en la misma cotización. Los cambios se sincronizan en tiempo real.', 
'Multiple team members can work on the same quote. Changes sync in real-time.', 
'Meerdere teamleden kunnen aan dezelfde offerte werken. Wijzigingen synchroniseren in real-time.', 
'Users', 'blue', 'right', 'hover'),

('quotes', 'quote_dependencies', 'warning', 'Dependencias', 'Dependencies', 'Afhankelijkheden', 
'Si una cotización incluye productos con dependencias (ej: acabados específicos), verifica disponibilidad.', 
'If a quote includes products with dependencies (e.g., specific finishes), verify availability.', 
'Als een offerte producten met afhankelijkheden bevat (bijv. specifieke afwerkingen), controleer beschikbaarheid.', 
'Link', 'yellow', 'right', 'hover'),

('quotes', 'seasonal_pricing', 'info_box', 'Precios Estacionales', 'Seasonal Pricing', 'Seizoensprijzen', 
'Considera ajustar precios según temporada alta/baja. El sistema puede aplicar reglas automáticas.', 
'Consider adjusting prices by high/low season. The system can apply automatic rules.', 
'Overweeg prijzen aan te passen per hoog/laagseizoen. Het systeem kan automatische regels toepassen.', 
'Calendar', 'blue', 'right', 'hover');

-- Continúa con más secciones...
-- Por brevedad, muestro solo algunos ejemplos. El archivo completo incluiría todas las secciones.

-- =====================================================
-- 4. PROMPTS DE ACCIÓN DEL ADMIN
-- =====================================================

-- Prompt al eliminar pedido
INSERT INTO admin_action_prompts (
  action_type, entity_type, trigger_moment, prompt_style,
  title_es, title_en, title_nl,
  message_es, message_en, message_nl,
  options, requires_reason, reason_label_es, reason_label_en, reason_label_nl,
  is_mandatory
) VALUES (
  'delete_order', 'order', 'before', 'warning',
  '¿Eliminar pedido?', 'Delete order?', 'Bestelling verwijderen?',
  'Esta acción no se puede deshacer. Se recomienda cancelar en lugar de eliminar para mantener el historial.',
  'This action cannot be undone. It is recommended to cancel instead of deleting to maintain history.',
  'Deze actie kan niet ongedaan worden gemaakt. Het wordt aanbevolen om te annuleren in plaats van te verwijderen om de geschiedenis te behouden.',
  '[
    {"value": "confirm_delete", "label_es": "Sí, eliminar permanentemente", "label_en": "Yes, delete permanently", "label_nl": "Ja, permanent verwijderen", "variant": "destructive"},
    {"value": "cancel_instead", "label_es": "Mejor cancelar el pedido", "label_en": "Better cancel the order", "label_nl": "Beter de bestelling annuleren", "variant": "default"},
    {"value": "abort", "label_es": "No hacer nada", "label_en": "Do nothing", "label_nl": "Niets doen", "variant": "outline"}
  ]'::jsonb,
  true, '¿Por qué eliminas este pedido?', 'Why are you deleting this order?', 'Waarom verwijder je deze bestelling?',
  false
);

-- Prompt al reembolsar sin cancelar
INSERT INTO admin_action_prompts (
  action_type, entity_type, trigger_moment, prompt_style,
  title_es, title_en, title_nl,
  message_es, message_en, message_nl,
  options, is_mandatory
) VALUES (
  'refund_payment', 'order', 'after', 'info',
  'Reembolso procesado', 'Refund processed', 'Terugbetaling verwerkt',
  'El reembolso ha sido marcado. Recuerda procesar la transacción en tu pasarela de pago.',
  'The refund has been marked. Remember to process the transaction in your payment gateway.',
  'De terugbetaling is gemarkeerd. Vergeet niet om de transactie in je betalingsgateway te verwerken.',
  '[
    {"value": "understood", "label_es": "Entendido", "label_en": "Understood", "label_nl": "Begrepen"}
  ]'::jsonb,
  false
);

-- Más prompts para otras acciones...

-- =====================================================
-- FIN DEL ARCHIVO DE DATOS INICIALES
-- =====================================================
