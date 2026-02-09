-- =====================================================
-- ADD SAMPLE CONTENT TO HOME PAGE
-- Adds 10+ diverse sections with example data to showcase
-- the page builder capabilities
-- =====================================================

DO $$
DECLARE
  home_page_id UUID;
  max_order INT := 0;
BEGIN
  -- Get home page ID
  SELECT id INTO home_page_id FROM page_builder_pages WHERE page_key = 'home';
  
  IF home_page_id IS NULL THEN
    RAISE EXCEPTION 'Home page not found in page_builder_pages';
  END IF;

  -- Get current max display_order
  SELECT COALESCE(MAX(display_order), -1) INTO max_order 
  FROM page_builder_sections 
  WHERE page_id = home_page_id;

  -- 1. Hero Banner - Welcome Section
  INSERT INTO page_builder_sections (
    page_id, section_type, section_name, display_order, is_visible,
    settings, content, styles
  ) VALUES (
    home_page_id,
    'hero',
    'Bienvenido a Thuis3D',
    max_order + 1,
    true,
    jsonb_build_object(
      'fullWidth', true,
      'height', '600px'
    ),
    jsonb_build_object(
      'title', '¡Bienvenido a Thuis3D!',
      'subtitle', 'Tu tienda de impresión 3D personalizada. Convierte tus ideas en realidad con tecnología de vanguardia.',
      'buttonText', 'Ver Productos',
      'buttonUrl', '/productos',
      'backgroundImage', 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=1920&h=600&fit=crop'
    ),
    jsonb_build_object(
      'backgroundColor', '#1a1a2e',
      'textColor', '#ffffff',
      'padding', 100,
      'textAlign', 'center'
    )
  );

  -- 2. Features Grid - Our Services
  INSERT INTO page_builder_sections (
    page_id, section_type, section_name, display_order, is_visible,
    settings, content, styles
  ) VALUES (
    home_page_id,
    'features',
    'Nuestros Servicios',
    max_order + 2,
    true,
    jsonb_build_object(
      'fullWidth', false,
      'columns', 3
    ),
    jsonb_build_object(
      'title', 'Por Qué Elegirnos',
      'subtitle', 'Ofrecemos servicios completos de impresión 3D',
      'features', jsonb_build_array(
        jsonb_build_object(
          'icon', 'Printer',
          'title', 'Impresión de Alta Calidad',
          'description', 'Tecnología de última generación para resultados perfectos'
        ),
        jsonb_build_object(
          'icon', 'Zap',
          'title', 'Entrega Rápida',
          'description', 'Procesamos y enviamos tus pedidos en tiempo récord'
        ),
        jsonb_build_object(
          'icon', 'Shield',
          'title', 'Garantía de Satisfacción',
          'description', 'Si no estás satisfecho, te devolvemos tu dinero'
        ),
        jsonb_build_object(
          'icon', 'Users',
          'title', 'Atención Personalizada',
          'description', 'Nuestro equipo te acompaña en cada paso del proceso'
        ),
        jsonb_build_object(
          'icon', 'Palette',
          'title', 'Personalización Total',
          'description', 'Tú decides colores, tamaños y acabados'
        ),
        jsonb_build_object(
          'icon', 'Award',
          'title', 'Calidad Certificada',
          'description', 'Materiales de primera calidad con certificaciones internacionales'
        )
      )
    ),
    jsonb_build_object(
      'backgroundColor', '#f8f9fa',
      'padding', 80
    )
  );

  -- 3. Products Carousel Section
  INSERT INTO page_builder_sections (
    page_id, section_type, section_name, display_order, is_visible,
    settings, content, styles
  ) VALUES (
    home_page_id,
    'products-carousel',
    'Productos Destacados',
    max_order + 3,
    true,
    jsonb_build_object(
      'itemsPerView', 3,
      'itemsPerViewTablet', 2,
      'itemsPerViewMobile', 1,
      'spaceBetween', 20,
      'autoplay', true,
      'autoplayDelay', 5,
      'loop', true,
      'showNavigation', true,
      'showPagination', true,
      'pauseOnHover', true,
      'carouselWidth', 'container'
    ),
    jsonb_build_object(
      'title', 'Nuestros Productos Más Populares',
      'subtitle', 'Descubre las creaciones favoritas de nuestros clientes',
      'category', 'all',
      'limit', 9
    ),
    jsonb_build_object(
      'backgroundColor', '#ffffff',
      'padding', 80
    )
  );

  -- 4. Banner - Special Offer
  INSERT INTO page_builder_sections (
    page_id, section_type, section_name, display_order, is_visible,
    settings, content, styles
  ) VALUES (
    home_page_id,
    'banner',
    'Oferta Especial',
    max_order + 4,
    true,
    jsonb_build_object(
      'fullWidth', true,
      'height', '400px'
    ),
    jsonb_build_object(
      'title', '🎉 ¡Oferta de Lanzamiento!',
      'subtitle', '20% de descuento en tu primer pedido',
      'buttonText', 'Aprovecha Ahora',
      'buttonUrl', '/productos',
      'backgroundImage', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1920&h=400&fit=crop'
    ),
    jsonb_build_object(
      'backgroundColor', '#4a90e2',
      'textColor', '#ffffff',
      'padding', 60,
      'textAlign', 'center'
    )
  );

  -- 5. Image Carousel - Gallery
  INSERT INTO page_builder_sections (
    page_id, section_type, section_name, display_order, is_visible,
    settings, content, styles
  ) VALUES (
    home_page_id,
    'image-carousel',
    'Galería de Proyectos',
    max_order + 5,
    true,
    jsonb_build_object(
      'itemsPerView', 3,
      'itemsPerViewTablet', 2,
      'itemsPerViewMobile', 1,
      'spaceBetween', 20,
      'autoplay', true,
      'autoplayDelay', 4,
      'loop', true,
      'showNavigation', true,
      'showPagination', true,
      'imageCarouselHeight', 400,
      'imageCarouselFit', 'cover',
      'imageCarouselShowCaptions', true,
      'carouselWidth', 'wide'
    ),
    jsonb_build_object(
      'title', 'Proyectos Realizados',
      'subtitle', 'Mira lo que hemos creado para nuestros clientes',
      'images', jsonb_build_array(
        jsonb_build_object(
          'url', 'https://images.unsplash.com/photo-1612800563031-5f8912c0b176?w=800&h=400&fit=crop',
          'caption', 'Figura personalizada de videojuego',
          'alt', 'Figura 3D personalizada'
        ),
        jsonb_build_object(
          'url', 'https://images.unsplash.com/photo-1614935151651-0bea6508db6b?w=800&h=400&fit=crop',
          'caption', 'Miniatura arquitectónica detallada',
          'alt', 'Modelo arquitectónico 3D'
        ),
        jsonb_build_object(
          'url', 'https://images.unsplash.com/photo-1565191999001-551c187427bb?w=800&h=400&fit=crop',
          'caption', 'Prototipo industrial funcional',
          'alt', 'Prototipo 3D industrial'
        ),
        jsonb_build_object(
          'url', 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&h=400&fit=crop',
          'caption', 'Escultura artística moderna',
          'alt', 'Escultura 3D artística'
        ),
        jsonb_build_object(
          'url', 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=400&fit=crop',
          'caption', 'Piezas de repuesto personalizadas',
          'alt', 'Piezas de repuesto 3D'
        )
      )
    ),
    jsonb_build_object(
      'backgroundColor', '#f8f9fa',
      'padding', 80
    )
  );

  -- 6. CTA Section - Get a Quote
  INSERT INTO page_builder_sections (
    page_id, section_type, section_name, display_order, is_visible,
    settings, content, styles
  ) VALUES (
    home_page_id,
    'cta',
    'Solicita tu Cotización',
    max_order + 6,
    true,
    jsonb_build_object(
      'fullWidth', false
    ),
    jsonb_build_object(
      'title', '¿Tienes un proyecto en mente?',
      'description', 'Solicita una cotización gratuita y sin compromiso. Te responderemos en menos de 24 horas.',
      'buttonText', 'Solicitar Cotización',
      'buttonUrl', '/cotizaciones',
      'secondaryButtonText', 'Ver Precios',
      'secondaryButtonUrl', '/productos'
    ),
    jsonb_build_object(
      'backgroundColor', '#ffffff',
      'padding', 60,
      'textAlign', 'center'
    )
  );

  -- 7. Testimonials Section
  INSERT INTO page_builder_sections (
    page_id, section_type, section_name, display_order, is_visible,
    settings, content, styles
  ) VALUES (
    home_page_id,
    'testimonials',
    'Lo Que Dicen Nuestros Clientes',
    max_order + 7,
    true,
    jsonb_build_object(
      'fullWidth', false,
      'columns', 2
    ),
    jsonb_build_object(
      'title', 'Testimonios',
      'subtitle', 'La satisfacción de nuestros clientes es nuestra mejor carta de presentación',
      'testimonials', jsonb_build_array(
        jsonb_build_object(
          'quote', 'Increíble calidad y atención al detalle. Mi figura personalizada quedó perfecta, superó mis expectativas. ¡100% recomendado!',
          'author', 'María González',
          'role', 'Diseñadora Gráfica',
          'rating', 5
        ),
        jsonb_build_object(
          'quote', 'El equipo de Thuis3D hizo realidad mi prototipo. Proceso rápido, comunicación excelente y resultado impecable.',
          'author', 'Carlos Rodríguez',
          'role', 'Ingeniero Industrial',
          'rating', 5
        ),
        jsonb_build_object(
          'quote', 'Necesitaba piezas de repuesto que ya no se fabrican. Thuis3D las reprodujo a la perfección. Servicio excepcional.',
          'author', 'Ana Martínez',
          'role', 'Restauradora',
          'rating', 5
        ),
        jsonb_build_object(
          'quote', 'Pedí un regalo personalizado y llegó en tiempo récord. La calidad es excelente y el precio muy competitivo.',
          'author', 'Pedro Sánchez',
          'role', 'Cliente Particular',
          'rating', 5
        )
      )
    ),
    jsonb_build_object(
      'backgroundColor', '#f8f9fa',
      'padding', 80
    )
  );

  -- 8. Stats Section
  INSERT INTO page_builder_sections (
    page_id, section_type, section_name, display_order, is_visible,
    settings, content, styles
  ) VALUES (
    home_page_id,
    'stats',
    'Nuestros Números',
    max_order + 8,
    true,
    jsonb_build_object(
      'fullWidth', true,
      'columns', 4
    ),
    jsonb_build_object(
      'title', 'Thuis3D en Números',
      'stats', jsonb_build_array(
        jsonb_build_object(
          'value', '1000+',
          'label', 'Proyectos Completados',
          'icon', 'CheckCircle'
        ),
        jsonb_build_object(
          'value', '500+',
          'label', 'Clientes Satisfechos',
          'icon', 'Users'
        ),
        jsonb_build_object(
          'value', '24h',
          'label', 'Tiempo de Respuesta',
          'icon', 'Clock'
        ),
        jsonb_build_object(
          'value', '98%',
          'label', 'Tasa de Satisfacción',
          'icon', 'Star'
        )
      )
    ),
    jsonb_build_object(
      'backgroundColor', '#1a1a2e',
      'textColor', '#ffffff',
      'padding', 60
    )
  );

  -- 9. Process Steps Section
  INSERT INTO page_builder_sections (
    page_id, section_type, section_name, display_order, is_visible,
    settings, content, styles
  ) VALUES (
    home_page_id,
    'steps',
    'Cómo Funciona',
    max_order + 9,
    true,
    jsonb_build_object(
      'fullWidth', false,
      'layout', 'vertical'
    ),
    jsonb_build_object(
      'title', '¿Cómo Funciona el Proceso?',
      'subtitle', 'De la idea al producto final en 4 sencillos pasos',
      'steps', jsonb_build_array(
        jsonb_build_object(
          'number', '1',
          'title', 'Cuéntanos tu Idea',
          'description', 'Comparte tu proyecto o solicita una cotización. Nuestro equipo te asesorará sobre materiales y opciones.'
        ),
        jsonb_build_object(
          'number', '2',
          'title', 'Diseño y Aprobación',
          'description', 'Creamos o adaptamos el diseño 3D. Tú lo revisas y apruebas antes de la impresión.'
        ),
        jsonb_build_object(
          'number', '3',
          'title', 'Impresión 3D',
          'description', 'Imprimimos tu pieza con tecnología de vanguardia y materiales de alta calidad.'
        ),
        jsonb_build_object(
          'number', '4',
          'title', 'Entrega',
          'description', 'Recibe tu producto terminado en la comodidad de tu hogar o empresa.'
        )
      )
    ),
    jsonb_build_object(
      'backgroundColor', '#ffffff',
      'padding', 80
    )
  );

  -- 10. FAQ Section
  INSERT INTO page_builder_sections (
    page_id, section_type, section_name, display_order, is_visible,
    settings, content, styles
  ) VALUES (
    home_page_id,
    'accordion',
    'Preguntas Frecuentes',
    max_order + 10,
    true,
    jsonb_build_object(
      'fullWidth', false,
      'allowMultiple', false
    ),
    jsonb_build_object(
      'title', 'Preguntas Frecuentes',
      'subtitle', 'Encuentra respuestas a las dudas más comunes',
      'items', jsonb_build_array(
        jsonb_build_object(
          'title', '¿Qué materiales utilizan para la impresión 3D?',
          'content', 'Trabajamos con una amplia variedad de materiales: PLA, ABS, PETG, TPU, resinas y materiales especiales. Cada uno tiene propiedades diferentes y te asesoramos sobre cuál es el mejor para tu proyecto.'
        ),
        jsonb_build_object(
          'title', '¿Cuánto tarda en completarse un pedido?',
          'content', 'El tiempo varía según la complejidad y tamaño del proyecto. Proyectos simples pueden estar listos en 2-3 días, mientras que los más complejos pueden tomar 1-2 semanas. Te informamos el plazo exacto al aprobar el diseño.'
        ),
        jsonb_build_object(
          'title', '¿Pueden imprimir a partir de mis propios diseños?',
          'content', '¡Por supuesto! Aceptamos archivos STL, OBJ y otros formatos 3D. Si necesitas ayuda para convertir tu idea en un archivo 3D, nuestro equipo de diseño puede ayudarte.'
        ),
        jsonb_build_object(
          'title', '¿Qué tamaños pueden imprimir?',
          'content', 'Nuestras impresoras pueden crear piezas desde unos pocos centímetros hasta 30x30x40 cm. Para proyectos más grandes, podemos dividir el diseño en partes que se ensamblan después.'
        ),
        jsonb_build_object(
          'title', '¿Ofrecen servicios de diseño 3D?',
          'content', 'Sí, contamos con un equipo de diseñadores 3D experimentados que pueden crear tu modelo desde cero o adaptar diseños existentes. Solicita una cotización para tu proyecto de diseño.'
        )
      )
    ),
    jsonb_build_object(
      'backgroundColor', '#f8f9fa',
      'padding', 80
    )
  );

  -- 11. Banner - Materials Showcase
  INSERT INTO page_builder_sections (
    page_id, section_type, section_name, display_order, is_visible,
    settings, content, styles
  ) VALUES (
    home_page_id,
    'banner',
    'Materiales Premium',
    max_order + 11,
    true,
    jsonb_build_object(
      'fullWidth', true,
      'height', '350px'
    ),
    jsonb_build_object(
      'title', 'Materiales de Primera Calidad',
      'subtitle', 'Utilizamos solo los mejores filamentos y resinas del mercado',
      'buttonText', 'Ver Materiales',
      'buttonUrl', '/productos',
      'backgroundImage', 'https://images.unsplash.com/photo-1581092918484-8313e1f7e8c7?w=1920&h=350&fit=crop'
    ),
    jsonb_build_object(
      'backgroundColor', '#2c3e50',
      'textColor', '#ffffff',
      'padding', 60,
      'textAlign', 'center'
    )
  );

  -- 12. Icon Grid - Applications
  INSERT INTO page_builder_sections (
    page_id, section_type, section_name, display_order, is_visible,
    settings, content, styles
  ) VALUES (
    home_page_id,
    'icon-grid',
    'Aplicaciones',
    max_order + 12,
    true,
    jsonb_build_object(
      'fullWidth', false,
      'columns', 4
    ),
    jsonb_build_object(
      'title', 'Aplicaciones de la Impresión 3D',
      'subtitle', 'Infinitas posibilidades para dar vida a tus ideas',
      'items', jsonb_build_array(
        jsonb_build_object(
          'icon', 'Wrench',
          'title', 'Prototipos',
          'description', 'Crea prototipos funcionales rápidamente'
        ),
        jsonb_build_object(
          'icon', 'Gift',
          'title', 'Regalos Personalizados',
          'description', 'Diseños únicos y especiales'
        ),
        jsonb_build_object(
          'icon', 'Building',
          'title', 'Arquitectura',
          'description', 'Maquetas y modelos a escala'
        ),
        jsonb_build_object(
          'icon', 'Gamepad2',
          'title', 'Coleccionables',
          'description', 'Figuras y miniaturas detalladas'
        ),
        jsonb_build_object(
          'icon', 'Cog',
          'title', 'Piezas de Repuesto',
          'description', 'Reproduce componentes difíciles de encontrar'
        ),
        jsonb_build_object(
          'icon', 'Palette',
          'title', 'Arte y Decoración',
          'description', 'Esculturas y objetos decorativos'
        ),
        jsonb_build_object(
          'icon', 'Microscope',
          'title', 'Educación',
          'description', 'Modelos didácticos y científicos'
        ),
        jsonb_build_object(
          'icon', 'Heart',
          'title', 'Joyería',
          'description', 'Accesorios y bisutería personalizada'
        )
      )
    ),
    jsonb_build_object(
      'backgroundColor', '#ffffff',
      'padding', 80
    )
  );

  -- 13. Newsletter Section
  INSERT INTO page_builder_sections (
    page_id, section_type, section_name, display_order, is_visible,
    settings, content, styles
  ) VALUES (
    home_page_id,
    'newsletter',
    'Suscríbete',
    max_order + 13,
    true,
    jsonb_build_object(
      'fullWidth', true
    ),
    jsonb_build_object(
      'title', '¡Mantente Informado!',
      'description', 'Suscríbete a nuestro boletín y recibe ofertas exclusivas, novedades y consejos sobre impresión 3D.',
      'placeholder', 'Tu correo electrónico',
      'buttonText', 'Suscribirse',
      'privacyText', 'No compartiremos tu información. Puedes darte de baja en cualquier momento.'
    ),
    jsonb_build_object(
      'backgroundColor', '#4a90e2',
      'textColor', '#ffffff',
      'padding', 60,
      'textAlign', 'center'
    )
  );

  -- 14. Social Media Section
  INSERT INTO page_builder_sections (
    page_id, section_type, section_name, display_order, is_visible,
    settings, content, styles
  ) VALUES (
    home_page_id,
    'social',
    'Síguenos en Redes Sociales',
    max_order + 14,
    true,
    jsonb_build_object(
      'fullWidth', false,
      'iconSize', 'large'
    ),
    jsonb_build_object(
      'title', 'Síguenos',
      'subtitle', 'Únete a nuestra comunidad en redes sociales',
      'platforms', jsonb_build_array(
        jsonb_build_object(
          'platform', 'facebook',
          'url', 'https://facebook.com/thuis3d',
          'icon', 'Facebook'
        ),
        jsonb_build_object(
          'platform', 'instagram',
          'url', 'https://instagram.com/thuis3d',
          'icon', 'Instagram'
        ),
        jsonb_build_object(
          'platform', 'twitter',
          'url', 'https://twitter.com/thuis3d',
          'icon', 'Twitter'
        ),
        jsonb_build_object(
          'platform', 'youtube',
          'url', 'https://youtube.com/thuis3d',
          'icon', 'Youtube'
        ),
        jsonb_build_object(
          'platform', 'linkedin',
          'url', 'https://linkedin.com/company/thuis3d',
          'icon', 'Linkedin'
        )
      )
    ),
    jsonb_build_object(
      'backgroundColor', '#f8f9fa',
      'padding', 60,
      'textAlign', 'center'
    )
  );

  RAISE NOTICE 'Successfully added 14 new sections to home page';
END $$;
