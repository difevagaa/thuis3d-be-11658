-- ============================================
-- CORRECCIÓN 1: Políticas RLS para quote-files bucket
-- ============================================
-- Permitir que usuarios no autenticados suban archivos a quote-files

-- Primero, verificar que el bucket existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-files', 'quote-files', false)
ON CONFLICT (id) DO NOTHING;

-- Eliminar políticas existentes conflictivas
DROP POLICY IF EXISTS "Authenticated users can upload quote files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload quote files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload quote files" ON storage.objects;

-- Crear política para que CUALQUIERA pueda subir archivos (incluso sin autenticación)
CREATE POLICY "Anyone can upload to quote-files"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'quote-files');

-- Permitir que admins vean todos los archivos
CREATE POLICY "Admins can view all quote files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'quote-files' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Permitir que el usuario que subió el archivo lo vea
CREATE POLICY "Users can view their own quote files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'quote-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- CORRECCIÓN 2: Crear rol 'admin' en custom_roles
-- ============================================
-- Insertar los roles del sistema en custom_roles para que aparezcan en la UI
INSERT INTO custom_roles (name, display_name, description, allowed_pages)
VALUES 
  ('admin', 'Administrador', 'Acceso completo a todas las funcionalidades del sistema', ARRAY[
    '/admin',
    '/admin/productos',
    '/admin/pedidos',
    '/admin/cotizaciones',
    '/admin/usuarios',
    '/admin/blog',
    '/admin/gift-cards',
    '/admin/facturas',
    '/admin/mensajes',
    '/admin/estadisticas',
    '/admin/configuracion',
    '/admin/materiales',
    '/admin/colores',
    '/admin/categorias',
    '/admin/roles',
    '/admin/estados'
  ]),
  ('client', 'Cliente', 'Usuario estándar con acceso a funcionalidades de cliente', ARRAY['/mi-cuenta', '/pedidos', '/cotizaciones']),
  ('moderator', 'Moderador', 'Usuario con permisos de moderación', ARRAY['/admin/blog', '/admin/mensajes'])
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  allowed_pages = EXCLUDED.allowed_pages,
  updated_at = NOW();

-- ============================================
-- CORRECCIÓN 3: Insertar páginas legales
-- ============================================
-- Insertar contenido estándar para las páginas legales
INSERT INTO legal_pages (page_type, title, content, is_published)
VALUES 
  ('privacy', 'Política de Privacidad', 
   '<h2>1. Información que Recopilamos</h2>
    <p>Recopilamos información personal que usted nos proporciona directamente cuando:</p>
    <ul>
      <li>Crea una cuenta en nuestro sitio</li>
      <li>Realiza una compra o solicita una cotización</li>
      <li>Se comunica con nosotros a través de formularios de contacto</li>
      <li>Se suscribe a nuestro boletín de noticias</li>
    </ul>
    
    <h2>2. Uso de la Información</h2>
    <p>Utilizamos la información recopilada para:</p>
    <ul>
      <li>Procesar sus pedidos y cotizaciones</li>
      <li>Comunicarnos con usted sobre su cuenta y pedidos</li>
      <li>Mejorar nuestros productos y servicios</li>
      <li>Enviarle información promocional (si ha dado su consentimiento)</li>
    </ul>
    
    <h2>3. Protección de Datos</h2>
    <p>Implementamos medidas de seguridad técnicas y organizativas apropiadas para proteger sus datos personales contra el acceso no autorizado, la alteración, divulgación o destrucción.</p>
    
    <h2>4. Sus Derechos</h2>
    <p>Usted tiene derecho a:</p>
    <ul>
      <li>Acceder a sus datos personales</li>
      <li>Rectificar datos inexactos</li>
      <li>Solicitar la eliminación de sus datos</li>
      <li>Oponerse al procesamiento de sus datos</li>
      <li>Solicitar la portabilidad de sus datos</li>
    </ul>
    
    <h2>5. Contacto</h2>
    <p>Para ejercer sus derechos o si tiene preguntas sobre esta política, puede contactarnos a través de nuestro formulario de contacto.</p>', 
   true),
   
  ('cookies', 'Política de Cookies', 
   '<h2>¿Qué son las cookies?</h2>
    <p>Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita un sitio web. Nos ayudan a proporcionar una mejor experiencia de usuario.</p>
    
    <h2>Tipos de Cookies que Utilizamos</h2>
    
    <h3>1. Cookies Esenciales</h3>
    <p>Estas cookies son necesarias para el funcionamiento básico del sitio web. Incluyen:</p>
    <ul>
      <li>Cookies de sesión de usuario</li>
      <li>Cookies de seguridad</li>
      <li>Cookies de preferencias de idioma</li>
    </ul>
    
    <h3>2. Cookies de Análisis</h3>
    <p>Utilizamos cookies para analizar cómo los usuarios interactúan con nuestro sitio web y mejorar su funcionamiento.</p>
    
    <h3>3. Cookies de Funcionalidad</h3>
    <p>Estas cookies permiten que el sitio web recuerde las elecciones que hace (como su nombre de usuario o región) para proporcionar funciones mejoradas y más personales.</p>
    
    <h2>Gestión de Cookies</h2>
    <p>Puede configurar su navegador para rechazar todas las cookies o para indicar cuándo se envía una cookie. Sin embargo, si no acepta las cookies, es posible que no pueda utilizar algunas funciones de nuestro sitio web.</p>
    
    <h2>Actualización de esta Política</h2>
    <p>Podemos actualizar esta política de cookies ocasionalmente. Le recomendamos que revise esta página periódicamente para estar informado de cualquier cambio.</p>', 
   true),
   
  ('terms', 'Términos y Condiciones', 
   '<h2>1. Aceptación de los Términos</h2>
    <p>Al acceder y utilizar este sitio web, usted acepta estar sujeto a estos términos y condiciones de uso.</p>
    
    <h2>2. Uso del Sitio</h2>
    <p>Usted se compromete a:</p>
    <ul>
      <li>Utilizar el sitio solo para fines legales</li>
      <li>No intentar acceder a áreas restringidas sin autorización</li>
      <li>No transmitir contenido malicioso o dañino</li>
      <li>Proporcionar información veraz y actualizada</li>
    </ul>
    
    <h2>3. Productos y Servicios</h2>
    <p>Todos los productos y servicios están sujetos a disponibilidad. Nos reservamos el derecho de:</p>
    <ul>
      <li>Modificar precios sin previo aviso</li>
      <li>Rechazar o cancelar pedidos a nuestra discreción</li>
      <li>Limitar cantidades de compra</li>
    </ul>
    
    <h2>4. Pedidos y Pagos</h2>
    <p>Al realizar un pedido, usted garantiza que:</p>
    <ul>
      <li>Tiene capacidad legal para celebrar contratos vinculantes</li>
      <li>La información proporcionada es precisa y completa</li>
      <li>Tiene autorización para usar el método de pago proporcionado</li>
    </ul>
    
    <h2>5. Envíos y Entregas</h2>
    <p>Los plazos de entrega son estimados y pueden variar. No nos hacemos responsables por retrasos causados por circunstancias fuera de nuestro control.</p>
    
    <h2>6. Devoluciones y Reembolsos</h2>
    <p>Consulte nuestra política de devoluciones para obtener información detallada sobre devoluciones y reembolsos.</p>
    
    <h2>7. Propiedad Intelectual</h2>
    <p>Todo el contenido del sitio web, incluyendo textos, gráficos, logos e imágenes, es propiedad de nuestra empresa y está protegido por las leyes de propiedad intelectual.</p>
    
    <h2>8. Limitación de Responsabilidad</h2>
    <p>No seremos responsables de ningún daño directo, indirecto, incidental o consecuente que resulte del uso o la imposibilidad de usar este sitio web.</p>
    
    <h2>9. Modificaciones</h2>
    <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación en el sitio web.</p>
    
    <h2>10. Contacto</h2>
    <p>Para cualquier pregunta sobre estos términos, puede contactarnos a través de nuestro formulario de contacto.</p>', 
   true),
   
  ('legal_notice', 'Aviso Legal', 
   '<h2>Identificación del Titular</h2>
    <p>En cumplimiento de la normativa aplicable, se informa de los siguientes datos:</p>
    <ul>
      <li><strong>Titular del sitio web:</strong> [Nombre de la empresa]</li>
      <li><strong>CIF/NIF:</strong> [Número de identificación fiscal]</li>
      <li><strong>Domicilio:</strong> [Dirección completa]</li>
      <li><strong>Email de contacto:</strong> [Email]</li>
      <li><strong>Teléfono:</strong> [Teléfono]</li>
    </ul>
    
    <h2>Objeto</h2>
    <p>Este sitio web tiene como objeto la venta de servicios de impresión 3D y productos relacionados.</p>
    
    <h2>Condiciones de Uso</h2>
    <p>El acceso y uso de este sitio web implica la aceptación de las condiciones generales de uso aquí establecidas.</p>
    
    <h2>Responsabilidad</h2>
    <p>El titular no se hace responsable de:</p>
    <ul>
      <li>La disponibilidad continua del sitio web</li>
      <li>Errores u omisiones en el contenido</li>
      <li>Daños derivados del uso indebido del sitio</li>
      <li>Enlaces a sitios web de terceros</li>
    </ul>
    
    <h2>Propiedad Intelectual</h2>
    <p>Todos los derechos de propiedad intelectual sobre este sitio web y sus contenidos pertenecen al titular o han sido legalmente cedidos. Queda prohibida la reproducción, distribución o comunicación pública sin autorización expresa.</p>
    
    <h2>Protección de Datos</h2>
    <p>Para información sobre el tratamiento de datos personales, consulte nuestra Política de Privacidad.</p>
    
    <h2>Legislación Aplicable</h2>
    <p>Estas condiciones se rigen por la legislación belga. Para cualquier controversia será competente la jurisdicción correspondiente.</p>', 
   true)
ON CONFLICT (page_type) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();