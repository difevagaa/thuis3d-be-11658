
-- =====================================================
-- ACTUALIZACIÓN MASIVA DE POLÍTICAS RLS PARA SUPERADMIN (PARTE 2)
-- =====================================================

-- 41. messages
DROP POLICY IF EXISTS "Admins can manage all messages" ON public.messages;
CREATE POLICY "Admins can manage all messages" ON public.messages
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 42. notifications
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
CREATE POLICY "Admins can manage notifications" ON public.notifications
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 43. order_items
DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;
CREATE POLICY "Admins can manage all order items" ON public.order_items
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 44. order_statuses
DROP POLICY IF EXISTS "Admins can manage order statuses" ON public.order_statuses;
CREATE POLICY "Admins can manage order statuses" ON public.order_statuses
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 45. orders
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders" ON public.orders
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 46. page_builder_elements
DROP POLICY IF EXISTS "Admins can manage page builder elements" ON public.page_builder_elements;
CREATE POLICY "Admins can manage page builder elements" ON public.page_builder_elements
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 47. page_builder_history
DROP POLICY IF EXISTS "Admins can manage page builder history" ON public.page_builder_history;
CREATE POLICY "Admins can manage page builder history" ON public.page_builder_history
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 48. page_builder_pages
DROP POLICY IF EXISTS "Admins can manage page builder pages" ON public.page_builder_pages;
CREATE POLICY "Admins can manage page builder pages" ON public.page_builder_pages
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 49. page_builder_sections
DROP POLICY IF EXISTS "Admins can manage page builder sections" ON public.page_builder_sections;
CREATE POLICY "Admins can manage page builder sections" ON public.page_builder_sections
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 50. page_builder_templates
DROP POLICY IF EXISTS "Admins can manage page builder templates" ON public.page_builder_templates;
CREATE POLICY "Admins can manage page builder templates" ON public.page_builder_templates
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 51. pages
DROP POLICY IF EXISTS "Admins can manage pages" ON public.pages;
CREATE POLICY "Admins can manage pages" ON public.pages
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 52. preview_3d_models
DROP POLICY IF EXISTS "Admins can manage preview models" ON public.preview_3d_models;
CREATE POLICY "Admins can manage preview models" ON public.preview_3d_models
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 53. printing_calculator_settings
DROP POLICY IF EXISTS "Admins can manage calculator settings" ON public.printing_calculator_settings;
CREATE POLICY "Admins can manage calculator settings" ON public.printing_calculator_settings
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 54. product_customization_sections
DROP POLICY IF EXISTS "Admins can manage product customization sections" ON public.product_customization_sections;
CREATE POLICY "Admins can manage product customization sections" ON public.product_customization_sections
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 55. product_images
DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;
CREATE POLICY "Admins can manage product images" ON public.product_images
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 56. product_roles
DROP POLICY IF EXISTS "Admins can delete product roles" ON public.product_roles;
DROP POLICY IF EXISTS "Admins can insert product roles" ON public.product_roles;
DROP POLICY IF EXISTS "Admins can update product roles" ON public.product_roles;
CREATE POLICY "Admins can delete product roles" ON public.product_roles
FOR DELETE TO public USING (public.is_admin_or_superadmin(auth.uid()));
CREATE POLICY "Admins can insert product roles" ON public.product_roles
FOR INSERT TO public WITH CHECK (public.is_admin_or_superadmin(auth.uid()));
CREATE POLICY "Admins can update product roles" ON public.product_roles
FOR UPDATE TO public USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 57. product_section_colors
DROP POLICY IF EXISTS "Admins can manage product section colors" ON public.product_section_colors;
CREATE POLICY "Admins can manage product section colors" ON public.product_section_colors
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 58. products
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 59. quantity_discount_tiers
DROP POLICY IF EXISTS "Admins can manage quantity discounts" ON public.quantity_discount_tiers;
DROP POLICY IF EXISTS "Admins can manage quantity discount tiers" ON public.quantity_discount_tiers;
CREATE POLICY "Admins can manage quantity discount tiers" ON public.quantity_discount_tiers
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 60. quote_statuses
DROP POLICY IF EXISTS "Admins can manage quote statuses" ON public.quote_statuses;
CREATE POLICY "Admins can manage quote statuses" ON public.quote_statuses
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 61. quotes
DROP POLICY IF EXISTS "Admins can manage all quotes" ON public.quotes;
CREATE POLICY "Admins can manage all quotes" ON public.quotes
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 62. reviews
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.reviews;
CREATE POLICY "Admins can manage all reviews" ON public.reviews
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 63. seo_audit_log
DROP POLICY IF EXISTS "Admins can manage seo audits" ON public.seo_audit_log;
CREATE POLICY "Admins can manage seo audits" ON public.seo_audit_log
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 64. seo_keywords
DROP POLICY IF EXISTS "Admins can manage seo keywords" ON public.seo_keywords;
CREATE POLICY "Admins can manage seo keywords" ON public.seo_keywords
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 65. seo_meta_tags
DROP POLICY IF EXISTS "Admins can manage seo meta tags" ON public.seo_meta_tags;
CREATE POLICY "Admins can manage seo meta tags" ON public.seo_meta_tags
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 66. seo_redirects
DROP POLICY IF EXISTS "Admins can manage seo redirects" ON public.seo_redirects;
CREATE POLICY "Admins can manage seo redirects" ON public.seo_redirects
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 67. seo_settings
DROP POLICY IF EXISTS "Admins can manage seo settings" ON public.seo_settings;
CREATE POLICY "Admins can manage seo settings" ON public.seo_settings
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 68. shipping_countries
DROP POLICY IF EXISTS "Admins can manage shipping countries" ON public.shipping_countries;
CREATE POLICY "Admins can manage shipping countries" ON public.shipping_countries
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 69. shipping_postal_codes
DROP POLICY IF EXISTS "Admins can manage shipping postal codes" ON public.shipping_postal_codes;
CREATE POLICY "Admins can manage shipping postal codes" ON public.shipping_postal_codes
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 70. shipping_settings
DROP POLICY IF EXISTS "Admins can manage shipping settings" ON public.shipping_settings;
CREATE POLICY "Admins can manage shipping settings" ON public.shipping_settings
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 71. shipping_zones
DROP POLICY IF EXISTS "Admins can manage shipping zones" ON public.shipping_zones;
CREATE POLICY "Admins can manage shipping zones" ON public.shipping_zones
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 72. site_customization
DROP POLICY IF EXISTS "Admins can manage site customization" ON public.site_customization;
CREATE POLICY "Admins can manage site customization" ON public.site_customization
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 73. support_detection_settings
DROP POLICY IF EXISTS "Admins can manage support detection settings" ON public.support_detection_settings;
CREATE POLICY "Admins can manage support detection settings" ON public.support_detection_settings
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 74. tax_settings
DROP POLICY IF EXISTS "Admins can manage tax settings" ON public.tax_settings;
CREATE POLICY "Admins can manage tax settings" ON public.tax_settings
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 75. translations
DROP POLICY IF EXISTS "Admins can manage translations" ON public.translations;
CREATE POLICY "Admins can manage translations" ON public.translations
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 76. translation_queue
DROP POLICY IF EXISTS "Admins can manage translation queue" ON public.translation_queue;
CREATE POLICY "Admins can manage translation queue" ON public.translation_queue
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 77. translation_settings
DROP POLICY IF EXISTS "Admins can manage translation settings" ON public.translation_settings;
CREATE POLICY "Admins can manage translation settings" ON public.translation_settings
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 78. visitor_sessions
DROP POLICY IF EXISTS "Admins can view all visitor sessions" ON public.visitor_sessions;
CREATE POLICY "Admins can view all visitor sessions" ON public.visitor_sessions
FOR SELECT TO authenticated USING (public.is_admin_or_superadmin(auth.uid()));

-- 79. product_colors
DROP POLICY IF EXISTS "Admins can manage product colors" ON public.product_colors;
CREATE POLICY "Admins can manage product colors" ON public.product_colors
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 80. product_materials
DROP POLICY IF EXISTS "Admins can manage product materials" ON public.product_materials;
CREATE POLICY "Admins can manage product materials" ON public.product_materials
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 81. product_section_images
DROP POLICY IF EXISTS "Admins can manage product section images" ON public.product_section_images;
CREATE POLICY "Admins can manage product section images" ON public.product_section_images
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 82. product_shipping_rates
DROP POLICY IF EXISTS "Admins can manage product shipping rates" ON public.product_shipping_rates;
CREATE POLICY "Admins can manage product shipping rates" ON public.product_shipping_rates
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));
