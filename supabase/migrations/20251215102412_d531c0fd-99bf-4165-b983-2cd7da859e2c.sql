-- =====================================================
-- SISTEMA COMPLETO DE GESTIÓN DE EMAILS
-- =====================================================

-- 1. Tabla de plantillas de email
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'transactional',
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'es',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tabla de campañas de email
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_id UUID REFERENCES public.email_templates(id),
  html_content TEXT,
  recipient_type TEXT NOT NULL DEFAULT 'all',
  recipient_filter JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Tabla de logs de emails
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.email_templates(id),
  campaign_id UUID REFERENCES public.email_campaigns(id),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  user_id UUID,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Tabla de configuración de emails
CREATE TABLE IF NOT EXISTS public.email_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Tabla de listas de suscriptores
CREATE TABLE IF NOT EXISTS public.email_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'subscribed',
  tags JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Tabla de destinatarios de campañas
CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Tabla de automatizaciones de email
CREATE TABLE IF NOT EXISTS public.email_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_conditions JSONB DEFAULT '{}'::jsonb,
  template_id UUID REFERENCES public.email_templates(id),
  delay_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  total_sent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admins only
CREATE POLICY "Admins can manage email_templates" ON public.email_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage email_campaigns" ON public.email_campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage email_logs" ON public.email_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage email_settings" ON public.email_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage email_subscribers" ON public.email_subscribers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage email_campaign_recipients" ON public.email_campaign_recipients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage email_automations" ON public.email_automations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON public.email_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_status ON public.email_subscribers(status);

-- Insert default system email templates
INSERT INTO public.email_templates (name, slug, subject, html_content, description, category, is_system, variables) VALUES
('Confirmación de Pedido', 'order-confirmation', 'Tu pedido #{{order_number}} ha sido confirmado', 
'<h1>¡Gracias por tu pedido!</h1><p>Hola {{customer_name}},</p><p>Tu pedido <strong>#{{order_number}}</strong> ha sido confirmado.</p><p>Total: €{{total}}</p><p>Te mantendremos informado sobre el estado de tu pedido.</p>', 
'Email enviado cuando se confirma un pedido', 'transactional', true, 
'["customer_name", "order_number", "total", "items"]'::jsonb),

('Cambio de Estado de Pedido', 'order-status-change', 'Actualización de tu pedido #{{order_number}}', 
'<h1>Actualización de Pedido</h1><p>Hola {{customer_name}},</p><p>Tu pedido <strong>#{{order_number}}</strong> ahora está: <strong>{{new_status}}</strong></p>', 
'Email enviado cuando cambia el estado de un pedido', 'transactional', true, 
'["customer_name", "order_number", "old_status", "new_status"]'::jsonb),

('Confirmación de Cotización', 'quote-confirmation', 'Hemos recibido tu solicitud de cotización', 
'<h1>Cotización Recibida</h1><p>Hola {{customer_name}},</p><p>Hemos recibido tu solicitud de cotización. Te responderemos lo antes posible.</p><p>Tipo: {{quote_type}}</p><p>Descripción: {{description}}</p>', 
'Email enviado cuando se recibe una cotización', 'transactional', true, 
'["customer_name", "quote_type", "description"]'::jsonb),

('Cotización Lista', 'quote-ready', 'Tu cotización está lista - €{{estimated_price}}', 
'<h1>Tu Cotización Está Lista</h1><p>Hola {{customer_name}},</p><p>Hemos procesado tu solicitud. El precio estimado es: <strong>€{{estimated_price}}</strong></p><p>Puedes proceder al pago desde tu cuenta.</p>', 
'Email enviado cuando se asigna precio a una cotización', 'transactional', true, 
'["customer_name", "estimated_price", "quote_type"]'::jsonb),

('Factura Generada', 'invoice-generated', 'Factura {{invoice_number}} - €{{total}}', 
'<h1>Nueva Factura</h1><p>Hola {{customer_name}},</p><p>Se ha generado la factura <strong>{{invoice_number}}</strong> por <strong>€{{total}}</strong>.</p><p>Puedes verla y pagarla desde tu cuenta.</p>', 
'Email enviado cuando se genera una factura', 'transactional', true, 
'["customer_name", "invoice_number", "total"]'::jsonb),

('Tarjeta de Regalo', 'gift-card', '🎁 {{sender_name}} te ha enviado una tarjeta de regalo', 
'<h1>¡Has recibido una tarjeta de regalo!</h1><p>{{sender_name}} te ha enviado una tarjeta de regalo por <strong>€{{amount}}</strong>.</p><p>Mensaje: {{message}}</p><p>Código: <strong>{{code}}</strong></p>', 
'Email enviado con tarjeta de regalo', 'transactional', true, 
'["sender_name", "amount", "message", "code", "recipient_name"]'::jsonb),

('Bienvenida', 'welcome', '¡Bienvenido a Thuis 3D!', 
'<h1>¡Bienvenido!</h1><p>Hola {{customer_name}},</p><p>Gracias por registrarte en Thuis 3D. Estamos emocionados de tenerte con nosotros.</p><p>Explora nuestro catálogo y solicita cotizaciones para tus proyectos de impresión 3D.</p>', 
'Email de bienvenida a nuevos usuarios', 'transactional', true, 
'["customer_name", "email"]'::jsonb),

('Recordatorio de Carrito Abandonado', 'abandoned-cart', '¿Olvidaste algo en tu carrito?', 
'<h1>Tu carrito te espera</h1><p>Hola {{customer_name}},</p><p>Notamos que dejaste artículos en tu carrito. ¡No dejes pasar esta oportunidad!</p><p>Vuelve y completa tu compra.</p>', 
'Email de recordatorio de carrito abandonado', 'marketing', false, 
'["customer_name", "cart_items", "cart_total"]'::jsonb),

('Newsletter', 'newsletter', '{{subject}}', 
'<h1>{{title}}</h1><p>{{content}}</p>', 
'Plantilla base para newsletters', 'marketing', false, 
'["subject", "title", "content"]'::jsonb),

('Puntos de Lealtad', 'loyalty-points', '¡Has ganado {{points_earned}} puntos!', 
'<h1>¡Puntos de Lealtad!</h1><p>Hola {{customer_name}},</p><p>Has ganado <strong>{{points_earned}} puntos</strong> con tu última compra.</p><p>Tu saldo actual: <strong>{{total_points}} puntos</strong></p>', 
'Email de notificación de puntos de lealtad', 'transactional', true, 
'["customer_name", "points_earned", "total_points"]'::jsonb),

('Respuesta a Mensaje', 'message-reply', 'Respuesta del equipo de soporte', 
'<h1>Respuesta a tu mensaje</h1><p>Hola {{customer_name}},</p><p>Hemos respondido a tu mensaje:</p><p>{{message}}</p>', 
'Email de respuesta a mensajes de clientes', 'transactional', true, 
'["customer_name", "message", "subject"]'::jsonb),

('Nuevo Mensaje de Cliente', 'new-message-admin', 'Nuevo mensaje de {{sender_name}}', 
'<h1>Nuevo Mensaje</h1><p>De: {{sender_name}} ({{sender_email}})</p><p>Asunto: {{subject}}</p><p>Mensaje: {{message}}</p>', 
'Notificación de nuevo mensaje para admins', 'transactional', true, 
'["sender_name", "sender_email", "subject", "message"]'::jsonb)

ON CONFLICT (slug) DO NOTHING;

-- Insert default email settings
INSERT INTO public.email_settings (setting_key, setting_value, description, category) VALUES
('sender_name', '"Thuis 3D"', 'Nombre del remitente', 'general'),
('sender_email', '"noreply@thuis3d.com"', 'Email del remitente', 'general'),
('reply_to', '"info@thuis3d.com"', 'Email de respuesta', 'general'),
('footer_text', '"© 2024 Thuis 3D. Todos los derechos reservados."', 'Texto del pie de email', 'general'),
('brand_color', '"#7c3aed"', 'Color principal de marca', 'design'),
('logo_url', '""', 'URL del logo para emails', 'design'),
('social_facebook', '""', 'URL de Facebook', 'social'),
('social_instagram', '""', 'URL de Instagram', 'social'),
('social_twitter', '""', 'URL de Twitter', 'social'),
('auto_welcome_email', 'true', 'Enviar email de bienvenida automático', 'automation'),
('auto_order_confirmation', 'true', 'Enviar confirmación de pedido automática', 'automation'),
('auto_quote_confirmation', 'true', 'Enviar confirmación de cotización automática', 'automation'),
('auto_invoice_email', 'true', 'Enviar factura por email automáticamente', 'automation'),
('auto_status_updates', 'true', 'Enviar actualizaciones de estado automáticas', 'automation'),
('abandoned_cart_delay', '24', 'Horas antes de enviar email de carrito abandonado', 'automation'),
('daily_digest_enabled', 'false', 'Habilitar resumen diario para admins', 'automation'),
('email_tracking_enabled', 'true', 'Habilitar tracking de aperturas y clics', 'tracking')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default automations
INSERT INTO public.email_automations (name, description, trigger_type, template_id, delay_minutes, is_active) VALUES
('Bienvenida a nuevos usuarios', 'Envía email de bienvenida cuando se registra un usuario', 'user_registered', 
  (SELECT id FROM email_templates WHERE slug = 'welcome'), 0, true),
('Confirmación de pedido', 'Envía confirmación cuando se crea un pedido', 'order_created', 
  (SELECT id FROM email_templates WHERE slug = 'order-confirmation'), 0, true),
('Actualización de estado de pedido', 'Envía notificación cuando cambia estado del pedido', 'order_status_changed', 
  (SELECT id FROM email_templates WHERE slug = 'order-status-change'), 0, true),
('Confirmación de cotización', 'Envía confirmación cuando se recibe una cotización', 'quote_created', 
  (SELECT id FROM email_templates WHERE slug = 'quote-confirmation'), 0, true),
('Cotización lista', 'Envía notificación cuando se asigna precio a cotización', 'quote_priced', 
  (SELECT id FROM email_templates WHERE slug = 'quote-ready'), 0, true),
('Factura generada', 'Envía factura cuando se genera', 'invoice_created', 
  (SELECT id FROM email_templates WHERE slug = 'invoice-generated'), 0, true),
('Puntos de lealtad', 'Notifica puntos ganados', 'loyalty_points_earned', 
  (SELECT id FROM email_templates WHERE slug = 'loyalty-points'), 0, true),
('Carrito abandonado', 'Recuerda al cliente sobre su carrito', 'cart_abandoned', 
  (SELECT id FROM email_templates WHERE slug = 'abandoned-cart'), 1440, false)
ON CONFLICT DO NOTHING;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_email_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

DROP TRIGGER IF EXISTS update_email_campaigns_updated_at ON email_campaigns;
CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

DROP TRIGGER IF EXISTS update_email_settings_updated_at ON email_settings;
CREATE TRIGGER update_email_settings_updated_at
  BEFORE UPDATE ON email_settings
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

DROP TRIGGER IF EXISTS update_email_automations_updated_at ON email_automations;
CREATE TRIGGER update_email_automations_updated_at
  BEFORE UPDATE ON email_automations
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();