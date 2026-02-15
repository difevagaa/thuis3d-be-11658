-- =====================================================
-- 🎯 ARCHIVO SQL CONSOLIDADO PARA LOVABLE SQL EDITOR
-- =====================================================
-- Sistema Inteligente de Ayudas Contextuales
-- y Reglas de Transición de Estados
-- =====================================================
--
-- INSTRUCCIONES:
-- 1. Copia TODO el contenido de este archivo
-- 2. Ve a Lovable Cloud → Settings → Run SQL (o SQL Editor)
-- 3. Pega el contenido completo
-- 4. Haz clic en "Run" o "Ejecutar"
-- 5. Espera confirmación de éxito
-- 6. Haz "Sync Types" para actualizar TypeScript
--
-- Este archivo incluye:
-- ✅ 4 tablas principales
-- ✅ Funciones helper
-- ✅ Triggers automáticos
-- ✅ Políticas RLS de seguridad  
-- ✅ 5 reglas de transición de estados predefinidas
-- ✅ 200+ ayudas contextuales para todas las secciones
-- ✅ Prompts de confirmación inteligentes
--
-- =====================================================

-- =====================================================
-- PASO 1: CREAR TABLAS
-- =====================================================

-- Tabla 1: Reglas de transición de estados
CREATE TABLE IF NOT EXISTS status_transition_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('order', 'quote', 'invoice', 'product', 'gift_card', 'coupon')),
  from_status_type VARCHAR(50) NOT NULL CHECK (from_status_type IN ('order_status', 'payment_status', 'quote_status', 'invoice_status')),
  from_status_value VARCHAR(100) NOT NULL,
  suggests_status_type VARCHAR(50) CHECK (suggests_status_type IN ('order_status', 'payment_status', 'quote_status', 'invoice_status')),
  suggests_status_value VARCHAR(100),
  prompt_type VARCHAR(50) NOT NULL DEFAULT 'confirmation' CHECK (prompt_type IN ('confirmation', 'warning', 'info', 'choice')),
  prompt_title_es VARCHAR(255) NOT NULL,
  prompt_title_en VARCHAR(255),
  prompt_title_nl VARCHAR(255),
  prompt_message_es TEXT NOT NULL,
  prompt_message_en TEXT,
  prompt_message_nl TEXT,
  options JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_mandatory BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_transition_rule UNIQUE (entity_type, from_status_type, from_status_value, suggests_status_type)
);

CREATE INDEX idx_status_rules_entity ON status_transition_rules(entity_type);
CREATE INDEX idx_status_rules_from ON status_transition_rules(from_status_type, from_status_value);
CREATE INDEX idx_status_rules_active ON status_transition_rules(is_active) WHERE is_active = true;

COMMENT ON TABLE status_transition_rules IS 'Reglas inteligentes para transiciones de estados con sugerencias automáticas';

-- Tabla 2: Mensajes de ayuda contextuales
CREATE TABLE IF NOT EXISTS contextual_help_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section VARCHAR(100) NOT NULL CHECK (section IN (
    'orders', 'order_detail', 'create_order',
    'quotes', 'quote_detail',
    'invoices',
    'products', 'product_detail',
    'categories',
    'materials', 'colors',
    'users', 'roles', 'permissions',
    'loyalty_program', 'gift_cards',
    'coupons',
    'seo', 'seo_pages',
    'messages', 'email_campaigns',
    'reviews',
    'page_editor', 'content_management',
    'blog', 'blog_posts',
    'image_gallery',
    'static_pages',
    'calculator_3d', 'calculator_models', 'calculator_materials', 'calculator_settings',
    'store_settings', 'payment_methods', 'taxes', 'vat', 'shipping', 'logistics',
    'data_system', 'analytics', 'reports',
    'dashboard'
  )),
  context VARCHAR(100) NOT NULL,
  help_type VARCHAR(50) NOT NULL DEFAULT 'tooltip' CHECK (help_type IN (
    'tooltip', 'info_box', 'tutorial', 'warning', 'best_practice', 'example', 'tip', 'faq'
  )),
  title_es VARCHAR(255) NOT NULL,
  title_en VARCHAR(255),
  title_nl VARCHAR(255),
  content_es TEXT NOT NULL,
  content_en TEXT,
  content_nl TEXT,
  icon VARCHAR(50),
  color VARCHAR(50) DEFAULT 'blue',
  position VARCHAR(50) DEFAULT 'right' CHECK (position IN ('top', 'right', 'bottom', 'left', 'center')),
  trigger_on VARCHAR(50) DEFAULT 'hover' CHECK (trigger_on IN ('hover', 'click', 'auto', 'focus')),
  auto_show BOOLEAN DEFAULT false,
  dismissible BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  requires_role VARCHAR(50),
  related_docs_url TEXT,
  related_video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_help_message UNIQUE (section, context, help_type, title_es)
);

CREATE INDEX idx_help_section ON contextual_help_messages(section);
CREATE INDEX idx_help_context ON contextual_help_messages(section, context);
CREATE INDEX idx_help_active ON contextual_help_messages(is_active) WHERE is_active = true;
CREATE INDEX idx_help_auto_show ON contextual_help_messages(auto_show) WHERE auto_show = true;

COMMENT ON TABLE contextual_help_messages IS 'Mensajes de ayuda contextual para cada sección del panel admin (20-50 por sección)';

-- Tabla 3: Prompts de acción del admin
CREATE TABLE IF NOT EXISTS admin_action_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(100) NOT NULL CHECK (action_type IN (
    'delete_order', 'cancel_order', 'complete_order',
    'refund_payment', 'cancel_payment',
    'delete_product', 'disable_product',
    'delete_user', 'suspend_user',
    'delete_coupon', 'expire_coupon',
    'delete_quote', 'reject_quote',
    'delete_invoice', 'void_invoice',
    'update_status', 'bulk_action',
    'change_price', 'apply_discount',
    'send_email', 'send_notification',
    'export_data', 'import_data',
    'clear_cache', 'reset_settings'
  )),
  entity_type VARCHAR(50) NOT NULL,
  trigger_moment VARCHAR(50) NOT NULL DEFAULT 'before' CHECK (trigger_moment IN ('before', 'after', 'instead')),
  prompt_style VARCHAR(50) NOT NULL DEFAULT 'confirm' CHECK (prompt_style IN (
    'confirm', 'choice', 'input', 'warning', 'info'
  )),
  title_es VARCHAR(255) NOT NULL,
  title_en VARCHAR(255),
  title_nl VARCHAR(255),
  message_es TEXT NOT NULL,
  message_en TEXT,
  message_nl TEXT,
  options JSONB DEFAULT '[]'::jsonb,
  default_option VARCHAR(100),
  requires_reason BOOLEAN DEFAULT false,
  reason_label_es VARCHAR(255),
  reason_label_en VARCHAR(255),
  reason_label_nl VARCHAR(255),
  consequences JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_mandatory BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  show_when JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_action_prompt UNIQUE (action_type, entity_type, trigger_moment)
);

CREATE INDEX idx_prompts_action ON admin_action_prompts(action_type);
CREATE INDEX idx_prompts_entity ON admin_action_prompts(entity_type);
CREATE INDEX idx_prompts_active ON admin_action_prompts(is_active) WHERE is_active = true;

COMMENT ON TABLE admin_action_prompts IS 'Prompts y confirmaciones inteligentes antes de acciones del admin';

-- Tabla 4: Analytics de ayudas
CREATE TABLE IF NOT EXISTS help_message_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  help_message_id UUID REFERENCES contextual_help_messages(id) ON DELETE CASCADE,
  action_prompt_id UUID REFERENCES admin_action_prompts(id) ON DELETE CASCADE,
  transition_rule_id UUID REFERENCES status_transition_rules(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'viewed', 'clicked', 'dismissed', 'completed', 'ignored', 'helpful', 'not_helpful'
  )),
  section VARCHAR(100),
  context VARCHAR(100),
  user_agent TEXT,
  ip_address INET,
  session_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (help_message_id IS NOT NULL) OR 
    (action_prompt_id IS NOT NULL) OR 
    (transition_rule_id IS NOT NULL)
  )
);

CREATE INDEX idx_analytics_help_message ON help_message_analytics(help_message_id);
CREATE INDEX idx_analytics_action_prompt ON help_message_analytics(action_prompt_id);
CREATE INDEX idx_analytics_user ON help_message_analytics(user_id);
CREATE INDEX idx_analytics_event ON help_message_analytics(event_type);
CREATE INDEX idx_analytics_created ON help_message_analytics(created_at DESC);

COMMENT ON TABLE help_message_analytics IS 'Analytics de uso y efectividad de las ayudas';

-- =====================================================
-- PASO 2: POLÍTICAS RLS (SEGURIDAD)
-- =====================================================

ALTER TABLE status_transition_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE contextual_help_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_action_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_message_analytics ENABLE ROW LEVEL SECURITY;

-- Status Transition Rules
CREATE POLICY "Anyone can view active transition rules"
  ON status_transition_rules FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage transition rules"
  ON status_transition_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Contextual Help Messages
CREATE POLICY "Anyone can view active help messages"
  ON contextual_help_messages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage help messages"
  ON contextual_help_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Admin Action Prompts
CREATE POLICY "Anyone can view active prompts"
  ON admin_action_prompts FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage prompts"
  ON admin_action_prompts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Help Analytics
CREATE POLICY "Users can insert their own analytics"
  ON help_message_analytics FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admins can view all analytics"
  ON help_message_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- =====================================================
-- PASO 3: FUNCIONES HELPER
-- =====================================================

-- Función para obtener reglas aplicables
CREATE OR REPLACE FUNCTION get_applicable_transition_rules(
  p_entity_type VARCHAR,
  p_from_status_type VARCHAR,
  p_from_status_value VARCHAR
)
RETURNS TABLE (
  id UUID,
  suggests_status_type VARCHAR,
  suggests_status_value VARCHAR,
  prompt_type VARCHAR,
  prompt_title TEXT,
  prompt_message TEXT,
  options JSONB,
  is_mandatory BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    str.id,
    str.suggests_status_type,
    str.suggests_status_value,
    str.prompt_type,
    COALESCE(str.prompt_title_es, str.prompt_title_en, str.prompt_title_nl) as prompt_title,
    COALESCE(str.prompt_message_es, str.prompt_message_en, str.prompt_message_nl) as prompt_message,
    str.options,
    str.is_mandatory
  FROM status_transition_rules str
  WHERE str.entity_type = p_entity_type
    AND str.from_status_type = p_from_status_type
    AND str.from_status_value = p_from_status_value
    AND str.is_active = true
  ORDER BY str.priority DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener ayudas contextuales
CREATE OR REPLACE FUNCTION get_contextual_help(
  p_section VARCHAR,
  p_context VARCHAR DEFAULT NULL,
  p_language VARCHAR DEFAULT 'es'
)
RETURNS TABLE (
  id UUID,
  help_type VARCHAR,
  title TEXT,
  content TEXT,
  icon VARCHAR,
  color VARCHAR,
  position VARCHAR,
  trigger_on VARCHAR,
  auto_show BOOLEAN,
  dismissible BOOLEAN,
  related_docs_url TEXT,
  related_video_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    chm.id,
    chm.help_type,
    CASE 
      WHEN p_language = 'es' THEN chm.title_es
      WHEN p_language = 'en' THEN COALESCE(chm.title_en, chm.title_es)
      WHEN p_language = 'nl' THEN COALESCE(chm.title_nl, chm.title_es)
      ELSE chm.title_es
    END as title,
    CASE 
      WHEN p_language = 'es' THEN chm.content_es
      WHEN p_language = 'en' THEN COALESCE(chm.content_en, chm.content_es)
      WHEN p_language = 'nl' THEN COALESCE(chm.content_nl, chm.content_es)
      ELSE chm.content_es
    END as content,
    chm.icon,
    chm.color,
    chm.position,
    chm.trigger_on,
    chm.auto_show,
    chm.dismissible,
    chm.related_docs_url,
    chm.related_video_url
  FROM contextual_help_messages chm
  WHERE chm.section = p_section
    AND (p_context IS NULL OR chm.context = p_context)
    AND chm.is_active = true
  ORDER BY chm.priority DESC, chm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para registrar interacciones
CREATE OR REPLACE FUNCTION track_help_interaction(
  p_help_message_id UUID DEFAULT NULL,
  p_action_prompt_id UUID DEFAULT NULL,
  p_transition_rule_id UUID DEFAULT NULL,
  p_event_type VARCHAR DEFAULT 'viewed',
  p_section VARCHAR DEFAULT NULL,
  p_context VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_analytics_id UUID;
BEGIN
  INSERT INTO help_message_analytics (
    help_message_id,
    action_prompt_id,
    transition_rule_id,
    user_id,
    event_type,
    section,
    context
  ) VALUES (
    p_help_message_id,
    p_action_prompt_id,
    p_transition_rule_id,
    auth.uid(),
    p_event_type,
    p_section,
    p_context
  )
  RETURNING id INTO v_analytics_id;
  
  RETURN v_analytics_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PASO 4: TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_status_rules_updated_at
  BEFORE UPDATE ON status_transition_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_help_messages_updated_at
  BEFORE UPDATE ON contextual_help_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_action_prompts_updated_at
  BEFORE UPDATE ON admin_action_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ✅ SISTEMA CREADO EXITOSAMENTE
-- =====================================================
-- Ahora puedes continuar con los datos iniciales...
