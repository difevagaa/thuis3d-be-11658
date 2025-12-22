-- Actualizar categorías para que coincidan con el frontend
-- Frontend espera: flat, curved, cylindrical, special

-- Flat shapes (standard) 
UPDATE public.lithophany_lamp_templates 
SET category = 'flat' 
WHERE shape_type IN ('flat_square', 'flat_rectangle', 'circular', 'panoramic', 'portrait', 'minimalist');

-- Curved shapes (premium)
UPDATE public.lithophany_lamp_templates 
SET category = 'curved' 
WHERE shape_type IN ('curved_soft', 'curved_deep', 'arch', 'gothic', 'ornamental', 'framed_square');

-- Cylindrical shapes
UPDATE public.lithophany_lamp_templates 
SET category = 'cylindrical' 
WHERE shape_type IN ('cylinder_small', 'cylinder_medium', 'cylinder_large', 'half_cylinder', 'hexagonal', 'octagonal');

-- Special shapes (artistic)
UPDATE public.lithophany_lamp_templates 
SET category = 'special' 
WHERE shape_type IN ('heart', 'star', 'diamond', 'wave', 'cloud', 'moon', 'flat_oval');