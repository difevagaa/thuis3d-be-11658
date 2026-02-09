-- =====================================================
-- ENHANCE HOMEPAGE CONTENT - Professional Redesign
-- Updates existing homepage sections with improved content,
-- better images, and more professional styling.
-- Also adds sample content for products, blog, and gallery pages.
-- =====================================================

DO $$
DECLARE
  home_page_id UUID;
BEGIN
  -- Get home page ID
  SELECT id INTO home_page_id FROM page_builder_pages WHERE page_key = 'home';

  IF home_page_id IS NULL THEN
    RAISE NOTICE 'Home page not found, skipping homepage enhancements';
    RETURN;
  END IF;

  -- Update Hero section with more professional content and better image
  UPDATE page_builder_sections
  SET
    content = jsonb_build_object(
      'title', 'Impresión 3D Profesional a Tu Medida',
      'subtitle', 'Transformamos tus ideas en realidad con tecnología de última generación. Desde prototipos industriales hasta regalos personalizados, creamos piezas únicas con precisión milimétrica.',
      'buttonText', 'Explorar Productos',
      'buttonUrl', '/productos',
      'secondaryButtonText', 'Solicitar Cotización',
      'secondaryButtonUrl', '/cotizaciones',
      'backgroundImage', 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=1920&h=800&fit=crop&q=80'
    ),
    styles = jsonb_build_object(
      'backgroundColor', '#0f172a',
      'textColor', '#ffffff',
      'padding', 120,
      'textAlign', 'center'
    ),
    settings = jsonb_build_object(
      'fullWidth', true,
      'height', '700px',
      'overlayOpacity', 0.6
    )
  WHERE page_id = home_page_id AND section_type = 'hero'
    AND section_name = 'Bienvenido a Thuis3D';

  -- Update Features section with more detailed services
  UPDATE page_builder_sections
  SET
    content = jsonb_build_object(
      'title', '¿Por Qué Elegir Thuis3D?',
      'subtitle', 'Combinamos tecnología avanzada con atención personalizada para ofrecerte resultados excepcionales',
      'features', jsonb_build_array(
        jsonb_build_object(
          'icon', 'Printer',
          'title', 'Tecnología de Vanguardia',
          'description', 'Equipos de impresión 3D de última generación con precisión de hasta 0.05mm para resultados perfectos en cada pieza.'
        ),
        jsonb_build_object(
          'icon', 'Zap',
          'title', 'Entrega Express Disponible',
          'description', 'Servicio de entrega rápida para proyectos urgentes. Tu pedido puede estar listo en tan solo 24-48 horas.'
        ),
        jsonb_build_object(
          'icon', 'Shield',
          'title', 'Garantía de Calidad',
          'description', 'Cada pieza pasa por un estricto control de calidad. Si no cumple con tus expectativas, la reimprimimos sin costo.'
        ),
        jsonb_build_object(
          'icon', 'Users',
          'title', 'Asesoramiento Experto',
          'description', 'Nuestro equipo de ingenieros y diseñadores te guía en la selección de materiales, acabados y optimización del diseño.'
        ),
        jsonb_build_object(
          'icon', 'Palette',
          'title', 'Amplia Gama de Materiales',
          'description', 'PLA, ABS, PETG, TPU, Nylon, resinas de alta resolución y más. El material perfecto para cada aplicación.'
        ),
        jsonb_build_object(
          'icon', 'Award',
          'title', 'Precios Competitivos',
          'description', 'Ofrecemos la mejor relación calidad-precio del mercado, con presupuestos transparentes y sin costos ocultos.'
        )
      )
    ),
    styles = jsonb_build_object(
      'backgroundColor', '#f8fafc',
      'padding', 100,
      'textColor', '#1e293b'
    ),
    settings = jsonb_build_object(
      'fullWidth', false,
      'columns', 3,
      'featuresCardStyle', 'shadowed',
      'featuresHoverEffect', true,
      'featuresHoverType', 'lift',
      'featuresIconColor', '#3b82f6'
    )
  WHERE page_id = home_page_id AND section_type = 'features'
    AND section_name = 'Nuestros Servicios';

  -- Update Products Carousel with better title
  UPDATE page_builder_sections
  SET
    content = jsonb_build_object(
      'title', 'Productos Destacados',
      'subtitle', 'Explora nuestra colección de productos más populares y descubre la calidad que nos distingue',
      'category', 'all',
      'limit', 12
    ),
    styles = jsonb_build_object(
      'backgroundColor', '#ffffff',
      'padding', 100,
      'textColor', '#1e293b'
    )
  WHERE page_id = home_page_id AND section_type = 'products-carousel'
    AND section_name = 'Productos Destacados';

  -- Update Banner - Special Offer with better design
  UPDATE page_builder_sections
  SET
    content = jsonb_build_object(
      'title', 'Tu Primera Impresión 3D con 20% de Descuento',
      'subtitle', 'Regístrate hoy y recibe un código de descuento exclusivo para tu primer pedido. ¡Sin compromiso!',
      'buttonText', 'Obtener Descuento',
      'buttonUrl', '/auth',
      'backgroundImage', 'https://images.unsplash.com/photo-1563520239648-a24e51d4b570?w=1920&h=500&fit=crop&q=80'
    ),
    styles = jsonb_build_object(
      'backgroundColor', '#1e40af',
      'textColor', '#ffffff',
      'padding', 80,
      'textAlign', 'center'
    ),
    settings = jsonb_build_object(
      'fullWidth', true,
      'height', '450px',
      'overlayOpacity', 0.7
    )
  WHERE page_id = home_page_id AND section_type = 'banner'
    AND section_name = 'Oferta Especial';

  -- Update Image Carousel with better 3D printing images
  UPDATE page_builder_sections
  SET
    content = jsonb_build_object(
      'title', 'Galería de Proyectos Realizados',
      'subtitle', 'Cada proyecto es único. Mira algunos de los trabajos que hemos realizado para nuestros clientes.',
      'images', jsonb_build_array(
        jsonb_build_object(
          'url', 'https://images.unsplash.com/photo-1612800563031-5f8912c0b176?w=800&h=500&fit=crop&q=80',
          'caption', 'Figuras personalizadas con acabado profesional',
          'alt', 'Figura 3D personalizada de alta calidad'
        ),
        jsonb_build_object(
          'url', 'https://images.unsplash.com/photo-1614935151651-0bea6508db6b?w=800&h=500&fit=crop&q=80',
          'caption', 'Maquetas arquitectónicas con detalle milimétrico',
          'alt', 'Modelo arquitectónico 3D detallado'
        ),
        jsonb_build_object(
          'url', 'https://images.unsplash.com/photo-1565191999001-551c187427bb?w=800&h=500&fit=crop&q=80',
          'caption', 'Prototipos industriales funcionales',
          'alt', 'Prototipo 3D para validación industrial'
        ),
        jsonb_build_object(
          'url', 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&h=500&fit=crop&q=80',
          'caption', 'Esculturas y piezas artísticas en 3D',
          'alt', 'Escultura artística impresa en 3D'
        ),
        jsonb_build_object(
          'url', 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=500&fit=crop&q=80',
          'caption', 'Piezas de repuesto fabricadas bajo demanda',
          'alt', 'Piezas de repuesto impresas en 3D'
        ),
        jsonb_build_object(
          'url', 'https://images.unsplash.com/photo-1563520239648-a24e51d4b570?w=800&h=500&fit=crop&q=80',
          'caption', 'Accesorios y complementos personalizados',
          'alt', 'Accesorios 3D personalizados'
        )
      )
    ),
    styles = jsonb_build_object(
      'backgroundColor', '#f1f5f9',
      'padding', 100
    ),
    settings = jsonb_build_object(
      'itemsPerView', 3,
      'itemsPerViewTablet', 2,
      'itemsPerViewMobile', 1,
      'spaceBetween', 24,
      'autoplay', true,
      'autoplayDelay', 4,
      'loop', true,
      'showNavigation', true,
      'showPagination', true,
      'imageCarouselHeight', 400,
      'imageCarouselFit', 'cover',
      'imageCarouselShowCaptions', true,
      'carouselWidth', 'wide'
    )
  WHERE page_id = home_page_id AND section_type = 'image-carousel'
    AND section_name = 'Galería de Proyectos';

  -- Update CTA section
  UPDATE page_builder_sections
  SET
    content = jsonb_build_object(
      'title', '¿Listo Para Dar Vida a Tu Proyecto?',
      'description', 'Solicita una cotización gratuita y sin compromiso. Nuestro equipo te responderá en menos de 24 horas con una propuesta personalizada.',
      'buttonText', 'Solicitar Cotización Gratis',
      'buttonUrl', '/cotizaciones',
      'secondaryButtonText', 'Explorar Catálogo',
      'secondaryButtonUrl', '/productos'
    ),
    styles = jsonb_build_object(
      'backgroundColor', '#ffffff',
      'padding', 80,
      'textAlign', 'center',
      'textColor', '#1e293b'
    )
  WHERE page_id = home_page_id AND section_type = 'cta'
    AND section_name = 'Solicita tu Cotización';

  -- Update Testimonials section
  UPDATE page_builder_sections
  SET
    content = jsonb_build_object(
      'title', 'Lo Que Dicen Nuestros Clientes',
      'subtitle', 'La satisfacción de nuestros clientes es nuestra mejor carta de presentación',
      'testimonials', jsonb_build_array(
        jsonb_build_object(
          'quote', 'La calidad de impresión superó mis expectativas. Mi figura personalizada quedó con un nivel de detalle increíble. Definitivamente volveré a pedir.',
          'author', 'María González',
          'role', 'Diseñadora Gráfica',
          'rating', 5
        ),
        jsonb_build_object(
          'quote', 'Necesitábamos prototipos funcionales para una presentación importante. El equipo de Thuis3D los entregó en tiempo récord con una calidad excelente.',
          'author', 'Carlos Rodríguez',
          'role', 'Director de Innovación',
          'rating', 5
        ),
        jsonb_build_object(
          'quote', 'Pedí piezas de repuesto para un electrodoméstico descontinuado. Las reprodujeron a la perfección y funcionan como las originales. Servicio excepcional.',
          'author', 'Ana Martínez',
          'role', 'Ingeniera Mecánica',
          'rating', 5
        ),
        jsonb_build_object(
          'quote', 'Encargué un regalo personalizado para mi esposa y fue un éxito total. La atención fue muy profesional y el resultado hermoso. ¡Muy recomendado!',
          'author', 'Pedro Sánchez',
          'role', 'Cliente Frecuente',
          'rating', 5
        )
      )
    ),
    styles = jsonb_build_object(
      'backgroundColor', '#f8fafc',
      'padding', 100,
      'textColor', '#1e293b'
    )
  WHERE page_id = home_page_id AND section_type = 'testimonials'
    AND section_name = 'Lo Que Dicen Nuestros Clientes';

  -- Update Stats section with more impactful design
  UPDATE page_builder_sections
  SET
    content = jsonb_build_object(
      'title', 'Thuis3D en Cifras',
      'stats', jsonb_build_array(
        jsonb_build_object(
          'value', '2,500+',
          'label', 'Proyectos Completados',
          'icon', 'CheckCircle'
        ),
        jsonb_build_object(
          'value', '1,200+',
          'label', 'Clientes Satisfechos',
          'icon', 'Users'
        ),
        jsonb_build_object(
          'value', '< 24h',
          'label', 'Tiempo de Respuesta',
          'icon', 'Clock'
        ),
        jsonb_build_object(
          'value', '99%',
          'label', 'Tasa de Satisfacción',
          'icon', 'Star'
        )
      )
    ),
    styles = jsonb_build_object(
      'backgroundColor', '#0f172a',
      'textColor', '#ffffff',
      'padding', 80
    )
  WHERE page_id = home_page_id AND section_type = 'stats'
    AND section_name = 'Nuestros Números';

  -- Update Steps/Process section
  UPDATE page_builder_sections
  SET
    content = jsonb_build_object(
      'title', 'Tu Pedido en 4 Sencillos Pasos',
      'subtitle', 'Un proceso simple, transparente y sin complicaciones',
      'steps', jsonb_build_array(
        jsonb_build_object(
          'number', '1',
          'title', 'Comparte Tu Idea',
          'description', 'Envíanos tu archivo 3D o cuéntanos qué necesitas. Te asesoraremos sobre materiales, acabados y las mejores opciones para tu proyecto.'
        ),
        jsonb_build_object(
          'number', '2',
          'title', 'Recibe Tu Presupuesto',
          'description', 'En menos de 24 horas recibirás un presupuesto detallado y transparente. Sin sorpresas ni costos ocultos.'
        ),
        jsonb_build_object(
          'number', '3',
          'title', 'Producción de Alta Calidad',
          'description', 'Una vez aprobado, nuestro equipo imprime tu pieza con la máxima precisión. Te enviamos fotos del progreso.'
        ),
        jsonb_build_object(
          'number', '4',
          'title', 'Recibe Tu Pedido',
          'description', 'Empacamos cuidadosamente y enviamos a tu dirección. Seguimiento en tiempo real incluido.'
        )
      )
    ),
    styles = jsonb_build_object(
      'backgroundColor', '#ffffff',
      'padding', 100,
      'textColor', '#1e293b'
    )
  WHERE page_id = home_page_id AND section_type = 'steps'
    AND section_name = 'Cómo Funciona';

  -- Update FAQ/Accordion section with more comprehensive questions
  UPDATE page_builder_sections
  SET
    content = jsonb_build_object(
      'title', 'Preguntas Frecuentes',
      'subtitle', 'Todo lo que necesitas saber sobre nuestros servicios de impresión 3D',
      'items', jsonb_build_array(
        jsonb_build_object(
          'title', '¿Qué materiales están disponibles para la impresión 3D?',
          'content', 'Ofrecemos una amplia variedad de materiales: PLA (biodegradable, ideal para decoración), ABS (resistente al calor), PETG (resistente y flexible), TPU (elástico), Nylon (alta resistencia mecánica), y resinas de alta resolución para detalles finos. Te asesoramos sobre cuál es el mejor para tu proyecto específico.'
        ),
        jsonb_build_object(
          'title', '¿Cuánto tiempo tarda un pedido?',
          'content', 'Los tiempos varían según la complejidad: piezas simples en 2-3 días hábiles, proyectos medianos en 5-7 días, y proyectos complejos o de gran volumen en 1-2 semanas. Ofrecemos servicio express (24-48h) con un recargo adicional.'
        ),
        jsonb_build_object(
          'title', '¿Puedo enviar mi propio diseño 3D?',
          'content', '¡Absolutamente! Aceptamos archivos STL, OBJ, 3MF y STEP. Si tu diseño necesita ajustes para optimizar la impresión, nuestro equipo te lo indicará sin costo adicional.'
        ),
        jsonb_build_object(
          'title', '¿Cuáles son los tamaños máximos de impresión?',
          'content', 'Nuestras impresoras pueden crear piezas de hasta 30x30x40 cm en una sola pieza. Para proyectos más grandes, dividimos el diseño en secciones que se ensamblan profesionalmente.'
        ),
        jsonb_build_object(
          'title', '¿Ofrecen servicios de diseño 3D?',
          'content', 'Sí, contamos con diseñadores 3D expertos que pueden crear modelos desde cero basándose en tus ideas, bocetos o fotos de referencia. También podemos escanear objetos existentes para su reproducción digital.'
        ),
        jsonb_build_object(
          'title', '¿Qué métodos de pago aceptan?',
          'content', 'Aceptamos tarjetas de crédito/débito, transferencias bancarias, PayPal y pagos en criptomonedas. También ofrecemos planes de pago para pedidos de mayor volumen.'
        ),
        jsonb_build_object(
          'title', '¿Realizan envíos internacionales?',
          'content', 'Sí, realizamos envíos a toda Europa y América. Los tiempos y costos de envío varían según el destino. Todos los pedidos incluyen número de seguimiento.'
        )
      )
    ),
    styles = jsonb_build_object(
      'backgroundColor', '#f8fafc',
      'padding', 100,
      'textColor', '#1e293b'
    )
  WHERE page_id = home_page_id AND section_type = 'accordion'
    AND section_name = 'Preguntas Frecuentes';

  -- Update Materials Banner
  UPDATE page_builder_sections
  SET
    content = jsonb_build_object(
      'title', 'Materiales Premium para Cada Necesidad',
      'subtitle', 'Más de 15 tipos de filamentos y resinas profesionales. Desde PLA biodegradable hasta resinas de ingeniería.',
      'buttonText', 'Conocer Materiales',
      'buttonUrl', '/productos',
      'backgroundImage', 'https://images.unsplash.com/photo-1581092918484-8313e1f7e8c7?w=1920&h=450&fit=crop&q=80'
    ),
    styles = jsonb_build_object(
      'backgroundColor', '#1e293b',
      'textColor', '#ffffff',
      'padding', 80,
      'textAlign', 'center'
    ),
    settings = jsonb_build_object(
      'fullWidth', true,
      'height', '400px',
      'overlayOpacity', 0.65
    )
  WHERE page_id = home_page_id AND section_type = 'banner'
    AND section_name = 'Materiales Premium';

  -- Update Icon Grid / Applications section
  UPDATE page_builder_sections
  SET
    content = jsonb_build_object(
      'title', 'Aplicaciones de Impresión 3D',
      'subtitle', 'Soluciones para cada industria y necesidad. Descubre cómo la impresión 3D puede ayudarte.',
      'items', jsonb_build_array(
        jsonb_build_object(
          'icon', '🔧',
          'title', 'Prototipos Funcionales',
          'description', 'Valida tus diseños antes de la producción en serie'
        ),
        jsonb_build_object(
          'icon', '🎁',
          'title', 'Regalos Únicos',
          'description', 'Crea obsequios personalizados e irrepetibles'
        ),
        jsonb_build_object(
          'icon', '🏗️',
          'title', 'Maquetas Arquitectónicas',
          'description', 'Modelos a escala con precisión profesional'
        ),
        jsonb_build_object(
          'icon', '🎮',
          'title', 'Figuras y Coleccionables',
          'description', 'Miniaturas y figuras con detalles sorprendentes'
        ),
        jsonb_build_object(
          'icon', '⚙️',
          'title', 'Piezas de Repuesto',
          'description', 'Reproduce componentes difíciles de encontrar'
        ),
        jsonb_build_object(
          'icon', '🎨',
          'title', 'Arte y Decoración',
          'description', 'Esculturas y objetos decorativos exclusivos'
        ),
        jsonb_build_object(
          'icon', '🔬',
          'title', 'Modelos Educativos',
          'description', 'Herramientas didácticas para enseñanza'
        ),
        jsonb_build_object(
          'icon', '💍',
          'title', 'Joyería Personalizada',
          'description', 'Diseños únicos para accesorios y bisutería'
        )
      )
    ),
    styles = jsonb_build_object(
      'backgroundColor', '#ffffff',
      'padding', 100,
      'textColor', '#1e293b'
    ),
    settings = jsonb_build_object(
      'fullWidth', false,
      'columns', 4,
      'iconSize', 56,
      'iconColor', '#3b82f6'
    )
  WHERE page_id = home_page_id AND section_type = 'icon-grid'
    AND section_name = 'Aplicaciones';

  -- Update Newsletter section
  UPDATE page_builder_sections
  SET
    content = jsonb_build_object(
      'title', '¡No Te Pierdas Nuestras Novedades!',
      'description', 'Suscríbete y recibe ofertas exclusivas, lanzamientos de nuevos materiales y consejos profesionales de impresión 3D.',
      'emailPlaceholder', 'tu@correo.com',
      'buttonText', 'Suscribirme',
      'privacyText', 'Respetamos tu privacidad. Puedes darte de baja en cualquier momento.'
    ),
    styles = jsonb_build_object(
      'backgroundColor', '#1e40af',
      'textColor', '#ffffff',
      'padding', 80,
      'textAlign', 'center'
    )
  WHERE page_id = home_page_id AND section_type = 'newsletter'
    AND section_name = 'Suscríbete';

  -- Update Social section
  UPDATE page_builder_sections
  SET
    content = jsonb_build_object(
      'title', 'Síguenos en Redes Sociales',
      'subtitle', 'Mantente al día con nuestros últimos proyectos, ofertas y novedades',
      'platforms', jsonb_build_array(
        jsonb_build_object(
          'platform', 'facebook',
          'url', 'https://facebook.com/thuis3d',
          'icon', '📘'
        ),
        jsonb_build_object(
          'platform', 'instagram',
          'url', 'https://instagram.com/thuis3d',
          'icon', '📷'
        ),
        jsonb_build_object(
          'platform', 'twitter',
          'url', 'https://twitter.com/thuis3d',
          'icon', '🐦'
        ),
        jsonb_build_object(
          'platform', 'youtube',
          'url', 'https://youtube.com/thuis3d',
          'icon', '📺'
        ),
        jsonb_build_object(
          'platform', 'linkedin',
          'url', 'https://linkedin.com/company/thuis3d',
          'icon', '💼'
        )
      )
    ),
    styles = jsonb_build_object(
      'backgroundColor', '#f1f5f9',
      'padding', 80,
      'textAlign', 'center',
      'textColor', '#1e293b'
    )
  WHERE page_id = home_page_id AND section_type = 'social'
    AND section_name = 'Síguenos en Redes Sociales';

  RAISE NOTICE 'Successfully enhanced homepage content with professional redesign';
END $$;

-- =====================================================
-- ADD SAMPLE CONTENT FOR OTHER PAGES
-- Adds sections to products, blog, and gallery pages
-- =====================================================

DO $$
DECLARE
  target_page_id UUID;
  max_order INT := 0;
BEGIN
  -- ===== PRODUCTS PAGE =====
  SELECT id INTO target_page_id FROM page_builder_pages WHERE page_key = 'products';

  IF target_page_id IS NOT NULL THEN
    SELECT COALESCE(MAX(display_order), -1) INTO max_order
    FROM page_builder_sections WHERE page_id = target_page_id;

    -- Only add sections if page has no content
    IF max_order < 0 THEN
      -- Hero for Products
      INSERT INTO page_builder_sections (
        page_id, section_type, section_name, display_order, is_visible,
        settings, content, styles
      ) VALUES (
        target_page_id, 'hero', 'Catálogo de Productos', 0, true,
        jsonb_build_object('fullWidth', true, 'height', '400px'),
        jsonb_build_object(
          'title', 'Nuestro Catálogo',
          'subtitle', 'Explora nuestra amplia variedad de productos impresos en 3D. Cada pieza es fabricada con los más altos estándares de calidad.',
          'backgroundImage', 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=1920&h=400&fit=crop&q=80'
        ),
        jsonb_build_object(
          'backgroundColor', '#0f172a',
          'textColor', '#ffffff',
          'padding', 80,
          'textAlign', 'center'
        )
      );

      -- Features for Products page
      INSERT INTO page_builder_sections (
        page_id, section_type, section_name, display_order, is_visible,
        settings, content, styles
      ) VALUES (
        target_page_id, 'features', 'Ventajas de Nuestros Productos', 1, true,
        jsonb_build_object('fullWidth', false, 'columns', 3, 'featuresCardStyle', 'bordered', 'featuresHoverEffect', true),
        jsonb_build_object(
          'title', 'Calidad en Cada Detalle',
          'features', jsonb_build_array(
            jsonb_build_object(
              'icon', 'Shield',
              'title', 'Materiales Certificados',
              'description', 'Todos nuestros materiales cumplen con estándares de calidad europeos e internacionales.'
            ),
            jsonb_build_object(
              'icon', 'Truck',
              'title', 'Envío Seguro',
              'description', 'Empacamos con materiales protectores para que tu pedido llegue en perfectas condiciones.'
            ),
            jsonb_build_object(
              'icon', 'RefreshCw',
              'title', 'Devolución Sencilla',
              'description', 'Si no estás 100% satisfecho, gestiona tu devolución de forma rápida y sin complicaciones.'
            )
          )
        ),
        jsonb_build_object(
          'backgroundColor', '#f8fafc',
          'padding', 80,
          'textColor', '#1e293b'
        )
      );

      RAISE NOTICE 'Added sections to Products page';
    END IF;
  END IF;

  -- ===== BLOG PAGE =====
  SELECT id INTO target_page_id FROM page_builder_pages WHERE page_key = 'blog';

  IF target_page_id IS NOT NULL THEN
    SELECT COALESCE(MAX(display_order), -1) INTO max_order
    FROM page_builder_sections WHERE page_id = target_page_id;

    IF max_order < 0 THEN
      -- Hero for Blog
      INSERT INTO page_builder_sections (
        page_id, section_type, section_name, display_order, is_visible,
        settings, content, styles
      ) VALUES (
        target_page_id, 'hero', 'Blog de Impresión 3D', 0, true,
        jsonb_build_object('fullWidth', true, 'height', '350px'),
        jsonb_build_object(
          'title', 'Blog de Thuis3D',
          'subtitle', 'Noticias, tutoriales y novedades del mundo de la impresión 3D. Mantente al día con las últimas tendencias y técnicas.',
          'backgroundImage', 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1920&h=350&fit=crop&q=80'
        ),
        jsonb_build_object(
          'backgroundColor', '#1e293b',
          'textColor', '#ffffff',
          'padding', 80,
          'textAlign', 'center'
        )
      );

      RAISE NOTICE 'Added sections to Blog page';
    END IF;
  END IF;

  -- ===== GALLERY PAGE =====
  SELECT id INTO target_page_id FROM page_builder_pages WHERE page_key = 'gallery';

  IF target_page_id IS NOT NULL THEN
    SELECT COALESCE(MAX(display_order), -1) INTO max_order
    FROM page_builder_sections WHERE page_id = target_page_id;

    IF max_order < 0 THEN
      -- Hero for Gallery
      INSERT INTO page_builder_sections (
        page_id, section_type, section_name, display_order, is_visible,
        settings, content, styles
      ) VALUES (
        target_page_id, 'hero', 'Galería de Trabajos', 0, true,
        jsonb_build_object('fullWidth', true, 'height', '350px'),
        jsonb_build_object(
          'title', 'Galería de Proyectos',
          'subtitle', 'Descubre la variedad y calidad de nuestros trabajos. Cada pieza cuenta una historia de creatividad e innovación.',
          'backgroundImage', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1920&h=350&fit=crop&q=80'
        ),
        jsonb_build_object(
          'backgroundColor', '#0f172a',
          'textColor', '#ffffff',
          'padding', 80,
          'textAlign', 'center'
        )
      );

      -- Image carousel for gallery page
      INSERT INTO page_builder_sections (
        page_id, section_type, section_name, display_order, is_visible,
        settings, content, styles
      ) VALUES (
        target_page_id, 'image-carousel', 'Trabajos Destacados', 1, true,
        jsonb_build_object(
          'itemsPerView', 3,
          'itemsPerViewTablet', 2,
          'itemsPerViewMobile', 1,
          'spaceBetween', 24,
          'autoplay', true,
          'autoplayDelay', 5,
          'loop', true,
          'showNavigation', true,
          'showPagination', true,
          'imageCarouselHeight', 450,
          'imageCarouselFit', 'cover',
          'imageCarouselShowCaptions', true,
          'carouselWidth', 'wide'
        ),
        jsonb_build_object(
          'title', 'Nuestros Mejores Trabajos',
          'subtitle', 'Una muestra de la versatilidad y calidad de la impresión 3D profesional',
          'images', jsonb_build_array(
            jsonb_build_object(
              'url', 'https://images.unsplash.com/photo-1612800563031-5f8912c0b176?w=800&h=500&fit=crop&q=80',
              'caption', 'Figuras coleccionables con acabado premium',
              'alt', 'Figuras 3D coleccionables'
            ),
            jsonb_build_object(
              'url', 'https://images.unsplash.com/photo-1614935151651-0bea6508db6b?w=800&h=500&fit=crop&q=80',
              'caption', 'Maquetas arquitectónicas de precisión',
              'alt', 'Maquetas arquitectónicas 3D'
            ),
            jsonb_build_object(
              'url', 'https://images.unsplash.com/photo-1565191999001-551c187427bb?w=800&h=500&fit=crop&q=80',
              'caption', 'Prototipos industriales validados',
              'alt', 'Prototipos industriales 3D'
            ),
            jsonb_build_object(
              'url', 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&h=500&fit=crop&q=80',
              'caption', 'Piezas decorativas y artísticas',
              'alt', 'Arte decorativo impreso en 3D'
            )
          )
        ),
        jsonb_build_object(
          'backgroundColor', '#f8fafc',
          'padding', 80
        )
      );

      -- CTA for Gallery
      INSERT INTO page_builder_sections (
        page_id, section_type, section_name, display_order, is_visible,
        settings, content, styles
      ) VALUES (
        target_page_id, 'cta', 'Contacto Galería', 2, true,
        jsonb_build_object('fullWidth', false),
        jsonb_build_object(
          'title', '¿Te Inspiran Nuestros Trabajos?',
          'description', 'Podemos crear algo igual de increíble para ti. Cuéntanos tu idea y te ayudamos a hacerla realidad.',
          'buttonText', 'Solicitar Cotización',
          'buttonUrl', '/cotizaciones'
        ),
        jsonb_build_object(
          'backgroundColor', '#ffffff',
          'padding', 80,
          'textAlign', 'center',
          'textColor', '#1e293b'
        )
      );

      RAISE NOTICE 'Added sections to Gallery page';
    END IF;
  END IF;

  -- ===== QUOTES PAGE =====
  SELECT id INTO target_page_id FROM page_builder_pages WHERE page_key = 'quotes';

  IF target_page_id IS NOT NULL THEN
    SELECT COALESCE(MAX(display_order), -1) INTO max_order
    FROM page_builder_sections WHERE page_id = target_page_id;

    IF max_order < 0 THEN
      -- Hero for Quotes
      INSERT INTO page_builder_sections (
        page_id, section_type, section_name, display_order, is_visible,
        settings, content, styles
      ) VALUES (
        target_page_id, 'hero', 'Solicitar Cotización', 0, true,
        jsonb_build_object('fullWidth', true, 'height', '350px'),
        jsonb_build_object(
          'title', 'Solicita Tu Cotización',
          'subtitle', 'Obtén un presupuesto personalizado para tu proyecto de impresión 3D. Respuesta garantizada en menos de 24 horas.',
          'backgroundImage', 'https://images.unsplash.com/photo-1563520239648-a24e51d4b570?w=1920&h=350&fit=crop&q=80'
        ),
        jsonb_build_object(
          'backgroundColor', '#1e40af',
          'textColor', '#ffffff',
          'padding', 80,
          'textAlign', 'center'
        )
      );

      -- Steps for Quotes process
      INSERT INTO page_builder_sections (
        page_id, section_type, section_name, display_order, is_visible,
        settings, content, styles
      ) VALUES (
        target_page_id, 'steps', 'Proceso de Cotización', 1, true,
        jsonb_build_object('fullWidth', false),
        jsonb_build_object(
          'title', 'Proceso de Cotización',
          'subtitle', 'Solicitar un presupuesto es rápido y sencillo',
          'steps', jsonb_build_array(
            jsonb_build_object(
              'number', '1',
              'title', 'Envía Tu Solicitud',
              'description', 'Completa el formulario con los detalles de tu proyecto. Adjunta archivos 3D si los tienes.'
            ),
            jsonb_build_object(
              'number', '2',
              'title', 'Análisis Técnico',
              'description', 'Nuestro equipo analiza tu proyecto y prepara un presupuesto detallado.'
            ),
            jsonb_build_object(
              'number', '3',
              'title', 'Presupuesto Personalizado',
              'description', 'Recibirás un presupuesto con opciones de materiales, acabados y plazos de entrega.'
            )
          )
        ),
        jsonb_build_object(
          'backgroundColor', '#f8fafc',
          'padding', 80,
          'textColor', '#1e293b'
        )
      );

      RAISE NOTICE 'Added sections to Quotes page';
    END IF;
  END IF;

  -- ===== GIFT CARDS PAGE =====
  SELECT id INTO target_page_id FROM page_builder_pages WHERE page_key = 'gift-cards';

  IF target_page_id IS NOT NULL THEN
    SELECT COALESCE(MAX(display_order), -1) INTO max_order
    FROM page_builder_sections WHERE page_id = target_page_id;

    IF max_order < 0 THEN
      INSERT INTO page_builder_sections (
        page_id, section_type, section_name, display_order, is_visible,
        settings, content, styles
      ) VALUES (
        target_page_id, 'hero', 'Tarjetas de Regalo', 0, true,
        jsonb_build_object('fullWidth', true, 'height', '350px'),
        jsonb_build_object(
          'title', 'Tarjetas de Regalo Thuis3D',
          'subtitle', 'El regalo perfecto para los amantes de la tecnología y la creatividad. Deja que elijan su propia creación 3D.',
          'buttonText', 'Comprar Tarjeta',
          'buttonUrl', '/gift-cards',
          'backgroundImage', 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=1920&h=350&fit=crop&q=80'
        ),
        jsonb_build_object(
          'backgroundColor', '#7c3aed',
          'textColor', '#ffffff',
          'padding', 80,
          'textAlign', 'center'
        )
      );

      RAISE NOTICE 'Added sections to Gift Cards page';
    END IF;
  END IF;

END $$;
