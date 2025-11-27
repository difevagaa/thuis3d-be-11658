-- Actualizar el constraint para permitir 'faq'
ALTER TABLE legal_pages DROP CONSTRAINT IF EXISTS legal_pages_page_type_check;

-- Crear nuevo constraint con 'faq' incluido
ALTER TABLE legal_pages ADD CONSTRAINT legal_pages_page_type_check 
CHECK (page_type IN ('privacy', 'cookies', 'terms', 'legal_notice', 'faq'));

-- Ahora insertar la página de FAQ
INSERT INTO legal_pages (page_type, title, content, is_published)
VALUES ('faq', 'Preguntas Frecuentes', '<h2>Sobre Pedidos y Cotizaciones</h2><h3>¿Cómo puedo solicitar una cotización?</h3><p>Puede solicitar una cotización de dos formas: Cotización 3D (suba su archivo STL, OBJ o 3MF) o Cotización de Servicio (describa el servicio que necesita).</p><h3>¿Cuánto tiempo tarda una cotización?</h3><p>Normalmente respondemos las cotizaciones en 24-48 horas hábiles.</p><h2>Sobre Impresión 3D</h2><h3>¿Qué formatos de archivo aceptan?</h3><p>Aceptamos archivos en formato STL, OBJ y 3MF.</p><h3>¿Qué materiales están disponibles?</h3><p>Trabajamos con PLA, PETG, TPU y ABS.</p><h2>Sobre Envíos</h2><h3>¿Realizan envíos internacionales?</h3><p>Actualmente realizamos envíos principalmente dentro de Bélgica.</p><h2>¿Tienes más preguntas?</h2><p>Contáctenos a través de nuestro formulario de mensajes o chat en vivo.</p>', true)
ON CONFLICT (page_type) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();