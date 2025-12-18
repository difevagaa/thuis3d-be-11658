-- Create table for lithophany orders
CREATE TABLE public.lithophany_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  order_id UUID REFERENCES public.orders(id),
  
  -- Original image
  original_image_url TEXT NOT NULL,
  processed_image_url TEXT,
  
  -- Image editing settings (JSON with all 300+ options)
  image_settings JSONB DEFAULT '{}',
  
  -- Lamp configuration
  lamp_type TEXT NOT NULL DEFAULT 'square_flat',
  lamp_width_mm NUMERIC NOT NULL DEFAULT 100,
  lamp_height_mm NUMERIC NOT NULL DEFAULT 100,
  lamp_depth_mm NUMERIC DEFAULT 3,
  lamp_curve_radius NUMERIC,
  lamp_custom_settings JSONB DEFAULT '{}',
  
  -- Base configuration
  base_type TEXT DEFAULT 'standard',
  base_width_mm NUMERIC,
  base_depth_mm NUMERIC,
  base_height_mm NUMERIC DEFAULT 25,
  light_hole_diameter_mm NUMERIC DEFAULT 16,
  light_hole_depth_mm NUMERIC DEFAULT 8,
  base_custom_settings JSONB DEFAULT '{}',
  
  -- Generated files
  lithophany_stl_url TEXT,
  base_stl_url TEXT,
  combined_stl_url TEXT,
  preview_image_url TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'ready', 'paid', 'printing', 'shipped', 'completed', 'cancelled')),
  
  -- Pricing
  calculated_price NUMERIC,
  final_price NUMERIC,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.lithophany_orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own lithophany orders"
ON public.lithophany_orders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lithophany orders"
ON public.lithophany_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own draft orders"
ON public.lithophany_orders
FOR UPDATE
USING (auth.uid() = user_id AND status = 'draft');

CREATE POLICY "Admins can view all lithophany orders"
ON public.lithophany_orders
FOR SELECT
USING (public.is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Admins can update all lithophany orders"
ON public.lithophany_orders
FOR UPDATE
USING (public.is_admin_or_superadmin(auth.uid()));

-- Create updated_at trigger
CREATE TRIGGER update_lithophany_orders_updated_at
BEFORE UPDATE ON public.lithophany_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for lamp templates
CREATE TABLE public.lithophany_lamp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_es TEXT,
  name_en TEXT,
  description TEXT,
  description_es TEXT,
  description_en TEXT,
  
  -- Type classification
  shape_type TEXT NOT NULL,
  category TEXT DEFAULT 'standard',
  
  -- Default dimensions
  default_width_mm NUMERIC NOT NULL DEFAULT 100,
  default_height_mm NUMERIC NOT NULL DEFAULT 100,
  min_width_mm NUMERIC DEFAULT 50,
  max_width_mm NUMERIC DEFAULT 300,
  min_height_mm NUMERIC DEFAULT 50,
  max_height_mm NUMERIC DEFAULT 300,
  
  -- Shape parameters
  curve_radius NUMERIC,
  corner_radius NUMERIC,
  segments INTEGER DEFAULT 32,
  
  -- Base compatibility
  base_type TEXT DEFAULT 'standard',
  requires_custom_base BOOLEAN DEFAULT false,
  
  -- Preview
  preview_image_url TEXT,
  preview_3d_model_url TEXT,
  
  -- Pricing
  base_price NUMERIC DEFAULT 0,
  price_per_cm2 NUMERIC DEFAULT 0.5,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lithophany_lamp_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view active templates
CREATE POLICY "Anyone can view active lamp templates"
ON public.lithophany_lamp_templates
FOR SELECT
USING (is_active = true);

-- Only admins can manage templates
CREATE POLICY "Admins can manage lamp templates"
ON public.lithophany_lamp_templates
FOR ALL
USING (public.is_admin_or_superadmin(auth.uid()));

-- Insert default lamp templates (25 types)
INSERT INTO public.lithophany_lamp_templates (name, name_es, name_en, shape_type, category, default_width_mm, default_height_mm, description_es, description_en, display_order) VALUES
('Cuadrada Plana', 'Cuadrada Plana', 'Flat Square', 'flat_square', 'standard', 100, 100, 'Litofanía cuadrada plana clásica', 'Classic flat square lithophany', 1),
('Rectangular Plana', 'Rectangular Plana', 'Flat Rectangle', 'flat_rectangle', 'standard', 150, 100, 'Rectangular plana para fotos panorámicas', 'Flat rectangular for landscape photos', 2),
('Cuadrada con Borde', 'Cuadrada con Borde', 'Framed Square', 'framed_square', 'premium', 100, 100, 'Cuadrada con marco decorativo', 'Square with decorative frame', 3),
('Ovalada Plana', 'Ovalada Plana', 'Flat Oval', 'flat_oval', 'artistic', 120, 100, 'Forma ovalada elegante', 'Elegant oval shape', 4),
('Corazón', 'Corazón', 'Heart', 'heart', 'artistic', 100, 100, 'Forma de corazón romántico', 'Romantic heart shape', 5),
('Curvada Suave', 'Curvada Suave', 'Soft Curve', 'curved_soft', 'premium', 100, 100, 'Curva suave para iluminación tenue', 'Gentle curve for soft lighting', 6),
('Curvada Pronunciada', 'Curvada Pronunciada', 'Deep Curve', 'curved_deep', 'premium', 100, 100, 'Curva pronunciada para efecto dramático', 'Deep curve for dramatic effect', 7),
('Ondulada', 'Ondulada', 'Wave', 'wave', 'artistic', 150, 100, 'Diseño ondulado', 'Wavy design', 8),
('Cilíndrica Pequeña', 'Cilíndrica Pequeña', 'Small Cylinder', 'cylinder_small', 'standard', 100, 80, 'Lámpara cilíndrica pequeña', 'Small cylindrical lamp', 9),
('Cilíndrica Mediana', 'Cilíndrica Mediana', 'Medium Cylinder', 'cylinder_medium', 'standard', 150, 100, 'Lámpara cilíndrica mediana', 'Medium cylindrical lamp', 10),
('Cilíndrica Grande', 'Cilíndrica Grande', 'Large Cylinder', 'cylinder_large', 'premium', 200, 150, 'Lámpara cilíndrica grande', 'Large cylindrical lamp', 11),
('Semicilíndrica', 'Semicilíndrica', 'Half Cylinder', 'half_cylinder', 'standard', 120, 100, 'Semicilindro para pared', 'Half cylinder for wall mount', 12),
('Hexagonal', 'Hexagonal', 'Hexagonal', 'hexagonal', 'artistic', 100, 100, 'Forma geométrica de seis lados', 'Six-sided geometric shape', 13),
('Octagonal', 'Octagonal', 'Octagonal', 'octagonal', 'artistic', 100, 100, 'Forma geométrica de ocho lados', 'Eight-sided geometric shape', 14),
('Diamante', 'Diamante', 'Diamond', 'diamond', 'premium', 100, 120, 'Forma de diamante', 'Diamond shape', 15),
('Estrella', 'Estrella', 'Star', 'star', 'artistic', 100, 100, 'Forma de estrella', 'Star shape', 16),
('Arco', 'Arco', 'Arch', 'arch', 'premium', 100, 130, 'Diseño con arco superior', 'Arched top design', 17),
('Gótica', 'Gótica', 'Gothic', 'gothic', 'premium', 80, 150, 'Arco gótico puntiagudo', 'Gothic pointed arch', 18),
('Nube', 'Nube', 'Cloud', 'cloud', 'artistic', 140, 90, 'Forma de nube suave', 'Soft cloud shape', 19),
('Circular', 'Circular', 'Circular', 'circular', 'standard', 100, 100, 'Círculo perfecto', 'Perfect circle', 20),
('Marco Ornamental', 'Marco Ornamental', 'Ornamental Frame', 'ornamental', 'premium', 120, 120, 'Marco ornamental decorativo', 'Decorative ornamental frame', 21),
('Minimalista', 'Minimalista', 'Minimalist', 'minimalist', 'minimal', 80, 80, 'Diseño minimalista limpio', 'Clean minimalist design', 22),
('Panorámica', 'Panorámica', 'Panoramic', 'panoramic', 'standard', 250, 80, 'Formato panorámico amplio', 'Wide panoramic format', 23),
('Retrato', 'Retrato', 'Portrait', 'portrait', 'standard', 80, 120, 'Formato vertical retrato', 'Vertical portrait format', 24),
('Luna', 'Luna', 'Moon', 'moon', 'artistic', 100, 100, 'Forma de luna creciente', 'Crescent moon shape', 25);

-- Create storage bucket for lithophany files
INSERT INTO storage.buckets (id, name, public)
VALUES ('lithophany-files', 'lithophany-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload lithophany images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lithophany-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view lithophany files"
ON storage.objects FOR SELECT
USING (bucket_id = 'lithophany-files');

CREATE POLICY "Users can update their own lithophany files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'lithophany-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own lithophany files"
ON storage.objects FOR DELETE
USING (bucket_id = 'lithophany-files' AND auth.uid()::text = (storage.foldername(name))[1]);