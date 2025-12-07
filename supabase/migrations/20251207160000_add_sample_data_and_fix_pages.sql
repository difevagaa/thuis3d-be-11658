-- Add sample data for gallery, blog, and legal pages
-- This migration ensures all pages have content to display

-- ============================================================================
-- SAMPLE GALLERY ITEMS
-- ============================================================================

-- Add sample gallery items (using placeholder images from a reliable source)
INSERT INTO public.gallery_items (title, description, media_url, media_type, is_published, display_order)
VALUES 
  (
    'Prototipo Industrial',
    'Pieza funcional para maquinaria industrial impresa en PLA reforzado',
    'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800',
    'image',
    true,
    1
  ),
  (
    'Figura Decorativa',
    'Escultura decorativa de alta precisión con acabado premium',
    'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800',
    'image',
    true,
    2
  ),
  (
    'Modelo Arquitectónico',
    'Maqueta a escala para presentación de proyecto arquitectónico',
    'https://images.unsplash.com/photo-1581092918484-8313e1f339a4?w=800',
    'image',
    true,
    3
  ),
  (
    'Componente Mecánico',
    'Pieza de repuesto impresa en PETG para aplicación mecánica',
    'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=800',
    'image',
    true,
    4
  ),
  (
    'Herramienta Personalizada',
    'Herramienta ergonómica diseñada a medida del cliente',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
    'image',
    true,
    5
  ),
  (
    'Molde de Inyección',
    'Molde para producción de piezas pequeñas en serie',
    'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=800',
    'image',
    true,
    6
  ),
  (
    'Joyería Personalizada',
    'Diseño único de joyería creado mediante impresión 3D',
    'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800',
    'image',
    true,
    7
  ),
  (
    'Prótesis Médica',
    'Prótesis personalizada para aplicación médica',
    'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=800',
    'image',
    true,
    8
  ),
  (
    'Componente Electrónico',
    'Carcasa protectora para dispositivo electrónico',
    'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800',
    'image',
    true,
    9
  ),
  (
    'Arte Conceptual',
    'Escultura artística con geometría compleja',
    'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800',
    'image',
    true,
    10
  ),
  (
    'Pieza Aeroespacial',
    'Componente ligero para aplicación aeroespacial',
    'https://images.unsplash.com/photo-1581092918484-8313e1f339a4?w=800',
    'image',
    true,
    11
  ),
  (
    'Accesorio Automotriz',
    'Pieza de recambio para vehículo vintage',
    'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=800',
    'image',
    true,
    12
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SAMPLE BLOG POSTS
-- ============================================================================

-- Add sample blog posts
INSERT INTO public.blog_posts (
  title, 
  slug, 
  content, 
  excerpt, 
  featured_image, 
  is_published, 
  published_at
)
VALUES 
  (
    '¿Qué es la impresión 3D y cómo funciona?',
    'que-es-impresion-3d',
    '<h2>Introducción a la Impresión 3D</h2><p>La impresión 3D, también conocida como fabricación aditiva, es un proceso revolucionario que permite crear objetos tridimensionales a partir de un modelo digital.</p><h3>Cómo Funciona</h3><p>El proceso consiste en depositar material capa por capa hasta formar el objeto completo. Existen varias tecnologías, siendo las más comunes FDM (Modelado por Deposición Fundida) y SLA (Estereolitografía).</p><h3>Aplicaciones</h3><p>La impresión 3D se utiliza en múltiples industrias: medicina, arquitectura, automotriz, aeroespacial, joyería, y más.</p>',
    'Descubre cómo funciona la tecnología de impresión 3D y sus principales aplicaciones en la industria moderna.',
    'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=1200',
    true,
    NOW() - INTERVAL '7 days'
  ),
  (
    'Materiales de Impresión 3D: Guía Completa',
    'materiales-impresion-3d-guia',
    '<h2>Tipos de Materiales</h2><p>Existen numerosos materiales para impresión 3D, cada uno con características únicas.</p><h3>PLA (Ácido Poliláctico)</h3><p>Material biodegradable, fácil de imprimir, ideal para principiantes y prototipos.</p><h3>ABS (Acrilonitrilo Butadieno Estireno)</h3><p>Resistente y duradero, usado en piezas funcionales y mecánicas.</p><h3>PETG</h3><p>Combina facilidad de impresión con resistencia, ideal para uso alimentario.</p><h3>Resinas</h3><p>Ofrecen alta precisión y acabados superficiales excepcionales.</p>',
    'Guía completa sobre los materiales más utilizados en impresión 3D y sus aplicaciones específicas.',
    'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=1200',
    true,
    NOW() - INTERVAL '5 days'
  ),
  (
    'Consejos para Diseñar Modelos Optimizados',
    'consejos-disenar-modelos-3d',
    '<h2>Diseño para Impresión 3D</h2><p>Diseñar para impresión 3D requiere consideraciones específicas diferentes al diseño tradicional.</p><h3>Espesor de Paredes</h3><p>Mantén un espesor mínimo de 2mm para piezas estructurales.</p><h3>Soportes</h3><p>Diseña con ángulos menores a 45° para minimizar soportes.</p><h3>Tolerancias</h3><p>Considera tolerancias de 0.2-0.5mm para piezas ensamblables.</p>',
    'Aprende a diseñar modelos 3D optimizados para obtener los mejores resultados de impresión.',
    'https://images.unsplash.com/photo-1581092918484-8313e1f339a4?w=1200',
    true,
    NOW() - INTERVAL '3 days'
  ),
  (
    'Aplicaciones Médicas de la Impresión 3D',
    'aplicaciones-medicas-impresion-3d',
    '<h2>Revolución en la Medicina</h2><p>La impresión 3D está transformando el campo médico con aplicaciones innovadoras.</p><h3>Prótesis Personalizadas</h3><p>Creación de prótesis a medida con ajuste perfecto para cada paciente.</p><h3>Modelos Quirúrgicos</h3><p>Réplicas exactas de órganos para planificación de cirugías complejas.</p><h3>Bioimpresión</h3><p>Investigación en impresión de tejidos vivos y órganos artificiales.</p>',
    'Descubre cómo la impresión 3D está revolucionando la medicina moderna con aplicaciones innovadoras.',
    'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=1200',
    true,
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- LEGAL PAGES CONTENT
-- ============================================================================

-- Helper function to get page ID by key
CREATE OR REPLACE FUNCTION get_page_id_temp(page_key_param TEXT)
RETURNS UUID AS $$
DECLARE
  page_id_var UUID;
BEGIN
  SELECT id INTO page_id_var
  FROM public.page_builder_pages
  WHERE page_key = page_key_param;
  RETURN page_id_var;
END;
$$ LANGUAGE plpgsql;

-- Privacy Policy Content
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id_temp('privacy-policy'),
  'text',
  'Política de Privacidad',
  0,
  true,
  jsonb_build_object(
    'title', 'Política de Privacidad',
    'text', '<h2>1. Información que Recopilamos</h2><p>Recopilamos información que usted nos proporciona directamente, como nombre, correo electrónico, dirección y datos de pago cuando realiza un pedido.</p><h2>2. Uso de la Información</h2><p>Utilizamos su información para procesar pedidos, mejorar nuestros servicios, y comunicarnos con usted sobre sus compras.</p><h2>3. Protección de Datos</h2><p>Implementamos medidas de seguridad para proteger su información personal contra acceso no autorizado.</p><h2>4. Cookies</h2><p>Utilizamos cookies para mejorar su experiencia de navegación. Puede configurar su navegador para rechazar cookies.</p><h2>5. Derechos del Usuario</h2><p>Tiene derecho a acceder, modificar o eliminar su información personal en cualquier momento.</p>'
  ),
  jsonb_build_object('fullWidth', false),
  jsonb_build_object('backgroundColor', '#ffffff', 'padding', 60, 'maxWidth', '900px')
) ON CONFLICT DO NOTHING;

-- Terms of Service Content
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id_temp('terms-of-service'),
  'text',
  'Términos y Condiciones',
  0,
  true,
  jsonb_build_object(
    'title', 'Términos y Condiciones de Uso',
    'text', '<h2>1. Aceptación de Términos</h2><p>Al utilizar nuestros servicios, usted acepta estos términos y condiciones en su totalidad.</p><h2>2. Servicios Ofrecidos</h2><p>Ofrecemos servicios de impresión 3D profesional para empresas y particulares.</p><h2>3. Proceso de Pedido</h2><p>Los pedidos se procesan según disponibilidad. Nos reservamos el derecho de rechazar pedidos por razones técnicas.</p><h2>4. Precios y Pago</h2><p>Los precios están sujetos a cambios sin previo aviso. El pago debe realizarse antes del envío.</p><h2>5. Propiedad Intelectual</h2><p>Usted conserva todos los derechos sobre sus diseños. Nosotros no los utilizaremos sin su consentimiento.</p>'
  ),
  jsonb_build_object('fullWidth', false),
  jsonb_build_object('backgroundColor', '#ffffff', 'padding', 60, 'maxWidth', '900px')
) ON CONFLICT DO NOTHING;

-- Cookies Policy Content
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id_temp('cookies-policy'),
  'text',
  'Política de Cookies',
  0,
  true,
  jsonb_build_object(
    'title', 'Política de Cookies',
    'text', '<h2>¿Qué son las Cookies?</h2><p>Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita nuestro sitio web.</p><h2>Tipos de Cookies que Utilizamos</h2><h3>Cookies Esenciales</h3><p>Necesarias para el funcionamiento básico del sitio web.</p><h3>Cookies de Análisis</h3><p>Nos ayudan a entender cómo los visitantes interactúan con nuestro sitio.</p><h3>Cookies de Preferencias</h3><p>Guardan sus preferencias de idioma y configuración.</p><h2>Gestión de Cookies</h2><p>Puede configurar su navegador para rechazar todas las cookies o para que le avise cuando se envía una cookie.</p>'
  ),
  jsonb_build_object('fullWidth', false),
  jsonb_build_object('backgroundColor', '#ffffff', 'padding', 60, 'maxWidth', '900px')
) ON CONFLICT DO NOTHING;

-- Legal Notice Content
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id_temp('legal-notice'),
  'text',
  'Aviso Legal',
  0,
  true,
  jsonb_build_object(
    'title', 'Aviso Legal',
    'text', '<h2>Datos Identificativos</h2><p><strong>Razón Social:</strong> Thuis 3D Printing Services<br><strong>CIF:</strong> B-12345678<br><strong>Domicilio:</strong> Calle Ejemplo, 123, 28001 Madrid, España<br><strong>Email:</strong> info@thuis3d.com</p><h2>Objeto</h2><p>El presente aviso legal regula el uso del sitio web de servicios de impresión 3D.</p><h2>Condiciones de Acceso</h2><p>El acceso a este sitio web es gratuito y no requiere registro previo.</p><h2>Responsabilidad</h2><p>No nos hacemos responsables del uso indebido que terceros puedan hacer de los contenidos de este sitio web.</p>'
  ),
  jsonb_build_object('fullWidth', false),
  jsonb_build_object('backgroundColor', '#ffffff', 'padding', 60, 'maxWidth', '900px')
) ON CONFLICT DO NOTHING;

-- Shipping Policy Content
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id_temp('shipping-policy'),
  'text',
  'Política de Envíos',
  0,
  true,
  jsonb_build_object(
    'title', 'Política de Envíos y Entregas',
    'text', '<h2>Tiempos de Producción</h2><p>El tiempo de producción varía según la complejidad del proyecto, generalmente entre 3-7 días laborables.</p><h2>Métodos de Envío</h2><h3>Envío Estándar</h3><p>Entrega en 5-7 días laborables tras finalizar la producción.</p><h3>Envío Express</h3><p>Entrega en 2-3 días laborables tras finalizar la producción.</p><h2>Costes de Envío</h2><p>Los costes se calculan según peso, dimensiones y destino. Envío gratuito para pedidos superiores a 100€.</p><h2>Seguimiento</h2><p>Recibirá un código de seguimiento cuando su pedido sea enviado.</p>'
  ),
  jsonb_build_object('fullWidth', false),
  jsonb_build_object('backgroundColor', '#ffffff', 'padding', 60, 'maxWidth', '900px')
) ON CONFLICT DO NOTHING;

-- Return Policy Content
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id_temp('return-policy'),
  'text',
  'Política de Devoluciones',
  0,
  true,
  jsonb_build_object(
    'title', 'Política de Devoluciones y Reembolsos',
    'text', '<h2>Derecho de Desistimiento</h2><p>Tiene 14 días desde la recepción del pedido para ejercer su derecho de desistimiento.</p><h2>Condiciones para Devoluciones</h2><p>Los productos deben estar en perfecto estado, sin usar y en su embalaje original.</p><h2>Proceso de Devolución</h2><ol><li>Contacte con nuestro servicio de atención al cliente</li><li>Reciba la autorización de devolución</li><li>Envíe el producto al almacén indicado</li><li>Recibirá el reembolso en 7-14 días laborables</li></ol><h2>Excepciones</h2><p>Los productos personalizados no admiten devolución salvo defecto de fabricación.</p>'
  ),
  jsonb_build_object('fullWidth', false),
  jsonb_build_object('backgroundColor', '#ffffff', 'padding', 60, 'maxWidth', '900px')
) ON CONFLICT DO NOTHING;

-- Contact Page Content
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id_temp('contact'),
  'text',
  'Información de Contacto',
  0,
  true,
  jsonb_build_object(
    'title', 'Contáctanos',
    'text', '<h2>Estamos Aquí para Ayudarte</h2><p>Nuestro equipo está disponible para responder a tus consultas y asesorarte en tu proyecto.</p><h3>Datos de Contacto</h3><p><strong>Email:</strong> info@thuis3d.com<br><strong>Teléfono:</strong> +34 912 345 678<br><strong>WhatsApp:</strong> +34 612 345 678</p><h3>Horario de Atención</h3><p>Lunes a Viernes: 9:00 - 18:00<br>Sábados: 10:00 - 14:00</p><h3>Dirección</h3><p>Calle Ejemplo, 123<br>28001 Madrid, España</p>'
  ),
  jsonb_build_object('fullWidth', false),
  jsonb_build_object('backgroundColor', '#ffffff', 'padding', 60, 'maxWidth', '800px', 'textAlign', 'center')
) ON CONFLICT DO NOTHING;

-- FAQ Page Content
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id_temp('faq'),
  'accordion',
  'Preguntas Frecuentes',
  0,
  true,
  jsonb_build_object(
    'title', 'Preguntas Frecuentes',
    'items', jsonb_build_array(
      jsonb_build_object(
        'title', '¿Qué formatos de archivo aceptan?',
        'content', 'Aceptamos archivos STL, OBJ, 3MF y STEP. Si tienes otro formato, contáctanos y buscaremos una solución.'
      ),
      jsonb_build_object(
        'title', '¿Cuánto cuesta un proyecto de impresión 3D?',
        'content', 'El coste depende del tamaño, material, complejidad y acabado. Usa nuestra calculadora online o solicita un presupuesto personalizado.'
      ),
      jsonb_build_object(
        'title', '¿Cuánto tiempo tarda la producción?',
        'content', 'Generalmente entre 3-7 días laborables, dependiendo de la complejidad del proyecto y nuestra carga de trabajo actual.'
      ),
      jsonb_build_object(
        'title', '¿Puedo ver mi pieza antes de que sea producida?',
        'content', 'Sí, te enviamos una vista previa 3D de tu modelo y confirmamos todos los detalles antes de comenzar la producción.'
      ),
      jsonb_build_object(
        'title', '¿Qué materiales están disponibles?',
        'content', 'Ofrecemos PLA, ABS, PETG, TPU, resinas, nylon y materiales especiales. Consulta nuestro catálogo completo para más detalles.'
      ),
      jsonb_build_object(
        'title', '¿Ofrecen servicios de diseño?',
        'content', 'Sí, nuestro equipo puede ayudarte a diseñar tu proyecto desde cero o modificar diseños existentes.'
      ),
      jsonb_build_object(
        'title', '¿Realizan envíos internacionales?',
        'content', 'Sí, enviamos a toda Europa y otros destinos internacionales. Los costes varían según destino.'
      ),
      jsonb_build_object(
        'title', '¿Qué garantía tienen los productos?',
        'content', 'Garantizamos la calidad de nuestras impresiones. Si hay algún defecto de fabricación, lo reimprimimos sin coste adicional.'
      )
    )
  ),
  jsonb_build_object('allowMultiple', false),
  jsonb_build_object('backgroundColor', '#ffffff', 'padding', 60, 'maxWidth', '900px')
) ON CONFLICT DO NOTHING;

-- Clean up helper function
DROP FUNCTION IF EXISTS get_page_id_temp(TEXT);

-- Add comment
COMMENT ON TABLE public.gallery_items IS 'Gallery items with sample data for demonstration';
COMMENT ON TABLE public.blog_posts IS 'Blog posts with sample content for demonstration';
