
-- =====================================================
-- ACTUALIZACIÓN MASIVA DE POLÍTICAS RLS PARA SUPERADMIN (PARTE 1)
-- Actualiza todas las políticas que solo verifican 'admin' para incluir también 'superadmin'
-- =====================================================

-- 1. backup_metadata
DROP POLICY IF EXISTS "Admins can update backup metadata" ON public.backup_metadata;
DROP POLICY IF EXISTS "Admins can view all backup metadata" ON public.backup_metadata;
CREATE POLICY "Admins can update backup metadata" ON public.backup_metadata
FOR UPDATE TO public USING (public.is_admin_or_superadmin(auth.uid()));
CREATE POLICY "Admins can view all backup metadata" ON public.backup_metadata
FOR SELECT TO public USING (public.is_admin_or_superadmin(auth.uid()));

-- 2. backup_retention_settings
DROP POLICY IF EXISTS "Admins can manage retention settings" ON public.backup_retention_settings;
CREATE POLICY "Admins can manage retention settings" ON public.backup_retention_settings
FOR ALL TO public USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 3. banner_images
DROP POLICY IF EXISTS "banner_images_delete_policy" ON public.banner_images;
DROP POLICY IF EXISTS "banner_images_insert_policy" ON public.banner_images;
DROP POLICY IF EXISTS "banner_images_update_policy" ON public.banner_images;
CREATE POLICY "banner_images_delete_policy" ON public.banner_images
FOR DELETE TO authenticated USING (public.is_admin_or_superadmin(auth.uid()));
CREATE POLICY "banner_images_insert_policy" ON public.banner_images
FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_superadmin(auth.uid()));
CREATE POLICY "banner_images_update_policy" ON public.banner_images
FOR UPDATE TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 4. blog_categories
DROP POLICY IF EXISTS "Admins can manage blog categories" ON public.blog_categories;
CREATE POLICY "Admins can manage blog categories" ON public.blog_categories
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 5. blog_post_roles
DROP POLICY IF EXISTS "Admins can delete blog post roles" ON public.blog_post_roles;
DROP POLICY IF EXISTS "Admins can insert blog post roles" ON public.blog_post_roles;
DROP POLICY IF EXISTS "Admins can update blog post roles" ON public.blog_post_roles;
CREATE POLICY "Admins can delete blog post roles" ON public.blog_post_roles
FOR DELETE TO public USING (public.is_admin_or_superadmin(auth.uid()));
CREATE POLICY "Admins can insert blog post roles" ON public.blog_post_roles
FOR INSERT TO public WITH CHECK (public.is_admin_or_superadmin(auth.uid()));
CREATE POLICY "Admins can update blog post roles" ON public.blog_post_roles
FOR UPDATE TO public USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 6. blog_posts
DROP POLICY IF EXISTS "Admins can manage blog posts" ON public.blog_posts;
CREATE POLICY "Admins can manage blog posts" ON public.blog_posts
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 7. calculator_calibrations
DROP POLICY IF EXISTS "Admins can manage calibrations" ON public.calculator_calibrations;
CREATE POLICY "Admins can manage calibrations" ON public.calculator_calibrations
FOR ALL TO public USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 8. calibration_materials
DROP POLICY IF EXISTS "Admins can manage calibration materials" ON public.calibration_materials;
CREATE POLICY "Admins can manage calibration materials" ON public.calibration_materials
FOR ALL TO public USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 9. calibration_profiles
DROP POLICY IF EXISTS "Admins can manage calibration profiles" ON public.calibration_profiles;
CREATE POLICY "Admins can manage calibration profiles" ON public.calibration_profiles
FOR ALL TO public USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 10. calibration_tests
DROP POLICY IF EXISTS "Admins can manage calibration tests" ON public.calibration_tests;
CREATE POLICY "Admins can manage calibration tests" ON public.calibration_tests
FOR ALL TO public USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 11. categories
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 12. colors
DROP POLICY IF EXISTS "Admins can manage colors" ON public.colors;
CREATE POLICY "Admins can manage colors" ON public.colors
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 13. coupons
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons" ON public.coupons
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 14. custom_roles
DROP POLICY IF EXISTS "Admins can manage custom roles" ON public.custom_roles;
CREATE POLICY "Admins can manage custom roles" ON public.custom_roles
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 15. email_automations
DROP POLICY IF EXISTS "Admins can manage email_automations" ON public.email_automations;
CREATE POLICY "Admins can manage email_automations" ON public.email_automations
FOR ALL TO public USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 16. email_campaign_recipients
DROP POLICY IF EXISTS "Admins can manage email_campaign_recipients" ON public.email_campaign_recipients;
CREATE POLICY "Admins can manage email_campaign_recipients" ON public.email_campaign_recipients
FOR ALL TO public USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 17. email_campaigns
DROP POLICY IF EXISTS "Admins can manage email_campaigns" ON public.email_campaigns;
CREATE POLICY "Admins can manage email_campaigns" ON public.email_campaigns
FOR ALL TO public USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 18. email_logs
DROP POLICY IF EXISTS "Admins can manage email_logs" ON public.email_logs;
CREATE POLICY "Admins can manage email_logs" ON public.email_logs
FOR ALL TO public USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 19. email_settings
DROP POLICY IF EXISTS "Admins can manage email_settings" ON public.email_settings;
CREATE POLICY "Admins can manage email_settings" ON public.email_settings
FOR ALL TO public USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 20. email_subscribers
DROP POLICY IF EXISTS "Admins can manage email_subscribers" ON public.email_subscribers;
CREATE POLICY "Admins can manage email_subscribers" ON public.email_subscribers
FOR ALL TO public USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 21. email_templates
DROP POLICY IF EXISTS "Admins can manage email_templates" ON public.email_templates;
CREATE POLICY "Admins can manage email_templates" ON public.email_templates
FOR ALL TO public USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 22. expenses
DROP POLICY IF EXISTS "Admins can manage expenses" ON public.expenses;
CREATE POLICY "Admins can manage expenses" ON public.expenses
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 23. footer_links
DROP POLICY IF EXISTS "Admins can manage footer links" ON public.footer_links;
CREATE POLICY "Admins can manage footer links" ON public.footer_links
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 24. footer_settings
DROP POLICY IF EXISTS "Only admins can modify footer settings" ON public.footer_settings;
CREATE POLICY "Only admins can modify footer settings" ON public.footer_settings
FOR ALL TO public USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 25. gallery_items
DROP POLICY IF EXISTS "Admins can manage gallery items" ON public.gallery_items;
CREATE POLICY "Admins can manage gallery items" ON public.gallery_items
FOR ALL TO public USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 26. gift_cards
DROP POLICY IF EXISTS "Admins can delete gift cards" ON public.gift_cards;
DROP POLICY IF EXISTS "Admins can manage gift cards" ON public.gift_cards;
DROP POLICY IF EXISTS "Admins can update all gift cards" ON public.gift_cards;
DROP POLICY IF EXISTS "Admins can view all gift cards" ON public.gift_cards;
CREATE POLICY "Admins can delete gift cards" ON public.gift_cards
FOR DELETE TO authenticated USING (public.is_admin_or_superadmin(auth.uid()));
CREATE POLICY "Admins can manage gift cards" ON public.gift_cards
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));
CREATE POLICY "Admins can update all gift cards" ON public.gift_cards
FOR UPDATE TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));
CREATE POLICY "Admins can view all gift cards" ON public.gift_cards
FOR SELECT TO authenticated USING (public.is_admin_or_superadmin(auth.uid()));

-- 27. homepage_banners
DROP POLICY IF EXISTS "Admins can manage banners" ON public.homepage_banners;
CREATE POLICY "Admins can manage banners" ON public.homepage_banners
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 28. homepage_features
DROP POLICY IF EXISTS "Solo admins pueden actualizar homepage_features" ON public.homepage_features;
DROP POLICY IF EXISTS "Solo admins pueden eliminar homepage_features" ON public.homepage_features;
DROP POLICY IF EXISTS "Solo admins pueden insertar homepage_features" ON public.homepage_features;
DROP POLICY IF EXISTS "Admins can manage homepage_features" ON public.homepage_features;
CREATE POLICY "Admins can manage homepage_features" ON public.homepage_features
FOR ALL TO public USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 29. homepage_quick_access_cards
DROP POLICY IF EXISTS "Solo admins pueden actualizar homepage_quick_access_cards" ON public.homepage_quick_access_cards;
DROP POLICY IF EXISTS "Solo admins pueden eliminar homepage_quick_access_cards" ON public.homepage_quick_access_cards;
DROP POLICY IF EXISTS "Solo admins pueden insertar homepage_quick_access_cards" ON public.homepage_quick_access_cards;
DROP POLICY IF EXISTS "Admins can manage homepage_quick_access_cards" ON public.homepage_quick_access_cards;
CREATE POLICY "Admins can manage homepage_quick_access_cards" ON public.homepage_quick_access_cards
FOR ALL TO public USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 30. homepage_sections
DROP POLICY IF EXISTS "Solo admins pueden actualizar homepage_sections" ON public.homepage_sections;
DROP POLICY IF EXISTS "Solo admins pueden eliminar homepage_sections" ON public.homepage_sections;
DROP POLICY IF EXISTS "Solo admins pueden insertar homepage_sections" ON public.homepage_sections;
DROP POLICY IF EXISTS "Admins can manage homepage_sections" ON public.homepage_sections;
CREATE POLICY "Admins can manage homepage_sections" ON public.homepage_sections
FOR ALL TO public USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 31. invoice_items
DROP POLICY IF EXISTS "Admins can manage all invoice items" ON public.invoice_items;
CREATE POLICY "Admins can manage all invoice items" ON public.invoice_items
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 32. invoices
DROP POLICY IF EXISTS "Admins can manage all invoices" ON public.invoices;
CREATE POLICY "Admins can manage all invoices" ON public.invoices
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 33. legal_pages
DROP POLICY IF EXISTS "Admins can manage legal pages" ON public.legal_pages;
CREATE POLICY "Admins can manage legal pages" ON public.legal_pages
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 34. loyalty_adjustments
DROP POLICY IF EXISTS "Admins can manage loyalty adjustments" ON public.loyalty_adjustments;
CREATE POLICY "Admins can manage loyalty adjustments" ON public.loyalty_adjustments
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 35. loyalty_points
DROP POLICY IF EXISTS "Admins can manage all loyalty points" ON public.loyalty_points;
CREATE POLICY "Admins can manage all loyalty points" ON public.loyalty_points
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 36. loyalty_redemptions
DROP POLICY IF EXISTS "Admins can view all redemptions" ON public.loyalty_redemptions;
CREATE POLICY "Admins can view all redemptions" ON public.loyalty_redemptions
FOR SELECT TO authenticated USING (public.is_admin_or_superadmin(auth.uid()));

-- 37. loyalty_rewards
DROP POLICY IF EXISTS "Admins can manage rewards" ON public.loyalty_rewards;
CREATE POLICY "Admins can manage rewards" ON public.loyalty_rewards
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 38. loyalty_settings
DROP POLICY IF EXISTS "Admins can manage loyalty settings" ON public.loyalty_settings;
CREATE POLICY "Admins can manage loyalty settings" ON public.loyalty_settings
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 39. material_colors
DROP POLICY IF EXISTS "Admins can manage material colors" ON public.material_colors;
CREATE POLICY "Admins can manage material colors" ON public.material_colors
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- 40. materials
DROP POLICY IF EXISTS "Admins can manage materials" ON public.materials;
CREATE POLICY "Admins can manage materials" ON public.materials
FOR ALL TO authenticated USING (public.is_admin_or_superadmin(auth.uid())) WITH CHECK (public.is_admin_or_superadmin(auth.uid()));
