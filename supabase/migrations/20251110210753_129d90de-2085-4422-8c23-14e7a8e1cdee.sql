-- Tabla para gestionar modelos 3D de vista previa
CREATE TABLE IF NOT EXISTS public.preview_3d_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  model_type TEXT NOT NULL CHECK (model_type IN ('simple', 'animal', 'character', 'object', 'geometric')),
  vertices_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.preview_3d_models ENABLE ROW LEVEL SECURITY;

-- Políticas: cualquiera puede ver modelos activos
CREATE POLICY "Anyone can view active preview models"
ON public.preview_3d_models
FOR SELECT
USING (is_active = true);

-- Solo admins pueden gestionar modelos
CREATE POLICY "Admins can manage preview models"
ON public.preview_3d_models
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_preview_3d_models_updated_at
BEFORE UPDATE ON public.preview_3d_models
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar modelos de ejemplo
INSERT INTO public.preview_3d_models (name, description, model_type, vertices_data, display_order) VALUES
('Patito de Goma', 'Clásico patito de baño', 'animal', '{"type":"duck"}', 1),
('Gatito Sentado', 'Gato adorable sentado', 'animal', '{"type":"cat"}', 2),
('Conejito', 'Conejo lindo', 'animal', '{"type":"rabbit"}', 3),
('Oso de Peluche', 'Osito tierno', 'animal', '{"type":"bear"}', 4),
('Robot Simple', 'Robot de juguete', 'character', '{"type":"robot"}', 5),
('Astronauta', 'Figura de astronauta', 'character', '{"type":"astronaut"}', 6),
('Ninja', 'Personaje ninja', 'character', '{"type":"ninja"}', 7),
('Taza de Café', 'Taza clásica', 'object', '{"type":"mug"}', 8),
('Maceta', 'Maceta decorativa', 'object', '{"type":"pot"}', 9),
('Jarrón', 'Jarrón elegante', 'object', '{"type":"vase"}', 10),
('Cubo Redondeado', 'Cubo con bordes suaves', 'geometric', '{"type":"rounded_cube"}', 11),
('Esfera Facetada', 'Esfera de baja poligonización', 'geometric', '{"type":"low_poly_sphere"}', 12),
('Estrella 3D', 'Estrella tridimensional', 'geometric', '{"type":"star"}', 13),
('Corazón', 'Corazón decorativo', 'geometric', '{"type":"heart"}', 14),
('Cohete', 'Cohete espacial', 'object', '{"type":"rocket"}', 15);