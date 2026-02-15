-- =====================================================
-- DATOS ADICIONALES - AYUDAS CONTEXTUALES
-- Secciones: Productos, Facturas, Usuarios, Materiales, etc.
-- =====================================================

-- =====================================================
-- AYUDAS CONTEXTUALES - SECCIÓN: PRODUCTOS (30 ayudas)
-- =====================================================

INSERT INTO contextual_help_messages (section, context, help_type, title_es, title_en, title_nl, content_es, content_en, content_nl, icon, color, position, trigger_on) VALUES

('products', 'create_product', 'tutorial', 'Crear Producto', 'Create Product', 'Product maken',
'Paso 1: Añade nombre y descripción, Paso 2: Establece precio y stock, Paso 3: Añade imágenes, Paso 4: Configura opciones 3D si aplica',
'Step 1: Add name and description, Step 2: Set price and stock, Step 3: Add images, Step 4: Configure 3D options if applicable',
'Stap 1: Voeg naam en beschrijving toe, Stap 2: Stel prijs en voorraad in, Stap 3: Voeg afbeeldingen toe, Stap 4: Configureer 3D-opties indien van toepassing',
'Package', 'blue', 'right', 'hover'),

('products', 'pricing', 'best_practice', 'Estrategia de Precios', 'Pricing Strategy', 'Prijsstrategie',
'Considera costos de material, tiempo de impresión, electricidad y margen. Usa la calculadora 3D para estimaciones precisas.',
'Consider material costs, printing time, electricity and margin. Use 3D calculator for accurate estimates.',
'Overweeg materiaalkosten, printtijd, elektriciteit en marge. Gebruik 3D-calculator voor nauwkeurige schattingen.',
'TrendingUp', 'green', 'right', 'hover'),

('products', 'inventory', 'warning', 'Control de Inventario', 'Inventory Control', 'Voorraadcontrole',
'Mantén el stock actualizado. Los productos sin stock se marcan automáticamente como no disponibles en la tienda.',
'Keep stock updated. Out-of-stock products are automatically marked as unavailable in the store.',
'Houd voorraad bijgewerkt. Producten zonder voorraad worden automatisch gemarkeerd als niet beschikbaar in de winkel.',
'AlertTriangle', 'yellow', 'right', 'hover'),

('products', 'images', 'tip', 'Imágenes de Producto', 'Product Images', 'Productafbeeldingen',
'Usa imágenes de alta calidad (min 1200x1200px). La primera imagen es la que aparece en listados.',
'Use high-quality images (min 1200x1200px). First image appears in listings.',
'Gebruik hoogwaardige afbeeldingen (min 1200x1200px). Eerste afbeelding verschijnt in lijsten.',
'Image', 'blue', 'right', 'hover'),

('products', 'categories', 'info_box', 'Categorías', 'Categories', 'Categorieën',
'Organiza productos en categorías para facilitar navegación. Un producto puede estar en múltiples categorías.',
'Organize products into categories for easy navigation. A product can be in multiple categories.',
'Organiseer producten in categorieën voor gemakkelijke navigatie. Een product kan in meerdere categorieën zijn.',
'Folder', 'blue', 'right', 'hover'),

('products', 'seo', 'best_practice', 'SEO del Producto', 'Product SEO', 'Product SEO',
'Usa palabras clave relevantes en título y descripción. Añade texto alternativo a imágenes para mejor posicionamiento.',
'Use relevant keywords in title and description. Add alt text to images for better ranking.',
'Gebruik relevante zoekwoorden in titel en beschrijving. Voeg alt-tekst toe aan afbeeldingen voor betere ranking.',
'Search', 'green', 'right', 'hover'),

('products', 'variants', 'tutorial', 'Variantes de Producto', 'Product Variants', 'Productvarianten',
'Crea variantes para colores, tamaños o materiales. Cada variante puede tener su propio precio y stock.',
'Create variants for colors, sizes or materials. Each variant can have its own price and stock.',
'Creëer varianten voor kleuren, maten of materialen. Elke variant kan zijn eigen prijs en voorraad hebben.',
'Layers', 'blue', 'right', 'hover'),

('products', 'bulk_edit', 'tip', 'Edición Masiva', 'Bulk Edit', 'Bulkbewerking',
'Selecciona múltiples productos para cambiar precios, categorías o estado en masa.',
'Select multiple products to change prices, categories or status in bulk.',
'Selecteer meerdere producten om prijzen, categorieën of status in bulk te wijzigen.',
'Edit', 'blue', 'right', 'hover'),

('products', 'featured', 'info_box', 'Productos Destacados', 'Featured Products', 'Uitgelichte producten',
'Marca productos como destacados para mostrarlos en la página principal y promociones especiales.',
'Mark products as featured to display them on homepage and special promotions.',
'Markeer producten als featured om ze weer te geven op de homepage en speciale promoties.',
'Star', 'blue', 'right', 'hover'),

('products', 'digital_products', 'tutorial', 'Productos Digitales', 'Digital Products', 'Digitale producten',
'Para productos digitales (archivos STL, diseños), activa la descarga automática después del pago.',
'For digital products (STL files, designs), enable automatic download after payment.',
'Voor digitale producten (STL-bestanden, ontwerpen), schakel automatische download in na betaling.',
'Download', 'blue', 'right', 'hover');

-- Continúa con más ayudas de productos...

-- =====================================================
-- AYUDAS CONTEXTUALES - SECCIÓN: FACTURAS (25 ayudas)
-- =====================================================

INSERT INTO contextual_help_messages (section, context, help_type, title_es, title_en, title_nl, content_es, content_en, content_nl, icon, color, position, trigger_on) VALUES

('invoices', 'create_invoice', 'tutorial', 'Crear Factura', 'Create Invoice', 'Factuur maken',
'Las facturas se generan automáticamente desde pedidos. También puedes crear facturas manuales para servicios especiales.',
'Invoices are automatically generated from orders. You can also create manual invoices for special services.',
'Facturen worden automatisch gegenereerd vanuit bestellingen. Je kunt ook handmatige facturen maken voor speciale diensten.',
'FileText', 'blue', 'right', 'hover'),

('invoices', 'invoice_number', 'info_box', 'Numeración de Facturas', 'Invoice Numbering', 'Factuurnummering',
'Los números de factura son secuenciales y únicos. No se pueden modificar una vez creados.',
'Invoice numbers are sequential and unique. They cannot be modified once created.',
'Factuurnummers zijn opeenvolgend en uniek. Ze kunnen niet worden gewijzigd zodra ze zijn aangemaakt.',
'Hash', 'blue', 'right', 'hover'),

('invoices', 'tax_calculation', 'warning', 'Cálculo de IVA', 'VAT Calculation', 'BTW-berekening',
'El IVA se calcula según la ubicación del cliente y la configuración fiscal. Verifica que esté correcto antes de enviar.',
'VAT is calculated based on customer location and tax settings. Verify it is correct before sending.',
'BTW wordt berekend op basis van klantlocatie en belastinginstellingen. Controleer of het correct is voordat je verzendt.',
'Calculator', 'yellow', 'right', 'hover'),

('invoices', 'payment_status', 'tip', 'Estado de Pago de Factura', 'Invoice Payment Status', 'Factuur betalingsstatus',
'El estado de pago de la factura se sincroniza automáticamente con el pedido asociado.',
'Invoice payment status is automatically synchronized with the associated order.',
'Factuur betalingsstatus wordt automatisch gesynchroniseerd met de bijbehorende bestelling.',
'CreditCard', 'blue', 'right', 'hover'),

('invoices', 'pdf_download', 'info_box', 'Descargar PDF', 'Download PDF', 'Download PDF',
'Genera PDF profesional con tu logo y datos fiscales. El cliente también recibe copia por email.',
'Generate professional PDF with your logo and tax details. Customer also receives copy by email.',
'Genereer professionele PDF met je logo en fiscale gegevens. Klant ontvangt ook kopie per e-mail.',
'Download', 'blue', 'right', 'hover');

-- =====================================================
-- AYUDAS CONTEXTUALES - SECCIÓN: USUARIOS (20 ayudas)
-- =====================================================

INSERT INTO contextual_help_messages (section, context, help_type, title_es, title_en, title_nl, content_es, content_en, content_nl, icon, color, position, trigger_on) VALUES

('users', 'user_roles', 'tutorial', 'Roles de Usuario', 'User Roles', 'Gebruikersrollen',
'Define roles para controlar acceso: Admin (acceso total), Manager (gestión sin ajustes), Staff (solo lectura y edición limitada).',
'Define roles to control access: Admin (full access), Manager (management without settings), Staff (read-only and limited editing).',
'Definieer rollen om toegang te controleren: Admin (volledige toegang), Manager (beheer zonder instellingen), Staff (alleen-lezen en beperkt bewerken).',
'Shield', 'blue', 'right', 'hover'),

('users', 'customer_data', 'warning', 'Datos del Cliente (GDPR)', 'Customer Data (GDPR)', 'Klantgegevens (GDPR)',
'Respeta las leyes de protección de datos. Solo recopila información necesaria y permite que los clientes accedan/eliminen sus datos.',
'Respect data protection laws. Only collect necessary information and allow customers to access/delete their data.',
'Respecteer wetgeving gegevensbescherming. Verzamel alleen noodzakelijke informatie en sta klanten toe om hun gegevens te openen/verwijderen.',
'AlertTriangle', 'yellow', 'right', 'hover'),

('users', 'bulk_actions', 'tip', 'Acciones Masivas', 'Bulk Actions', 'Bulkacties',
'Exporta usuarios, envía emails masivos o actualiza segmentos de clientes a la vez.',
'Export users, send mass emails or update customer segments at once.',
'Exporteer gebruikers, verstuur massa-e-mails of werk klantsegmenten tegelijk bij.',
'Users', 'blue', 'right', 'hover'),

('users', 'customer_segments', 'best_practice', 'Segmentación de Clientes', 'Customer Segmentation', 'Klantsegmentatie',
'Crea segmentos basados en comportamiento: clientes VIP, compradores frecuentes, inactivos, etc.',
'Create segments based on behavior: VIP customers, frequent buyers, inactive, etc.',
'Creëer segmenten gebaseerd op gedrag: VIP-klanten, frequente kopers, inactief, enz.',
'Filter', 'green', 'right', 'hover');

-- =====================================================
-- AYUDAS CONTEXTUALES - SECCIÓN: MATERIALES (15 ayudas)
-- =====================================================

INSERT INTO contextual_help_messages (section, context, help_type, title_es, title_en, title_nl, content_es, content_en, content_nl, icon, color, position, trigger_on) VALUES

('materials', 'material_properties', 'info_box', 'Propiedades del Material', 'Material Properties', 'Materiaaleigenschappen',
'Define densidad, precio por gramo, temperatura de impresión y compatibilidad con acabados.',
'Define density, price per gram, printing temperature and finishing compatibility.',
'Definieer dichtheid, prijs per gram, printtemperatuur en afwerkingscompatibiliteit.',
'Layers', 'blue', 'right', 'hover'),

('materials', 'pricing', 'best_practice', 'Precio de Materiales', 'Material Pricing', 'Materiaalprijzen',
'Actualiza precios regularmente según el mercado. La calculadora 3D usa estos valores para cotizaciones.',
'Update prices regularly according to the market. The 3D calculator uses these values for quotes.',
'Werk prijzen regelmatig bij volgens de markt. De 3D-calculator gebruikt deze waarden voor offertes.',
'TrendingUp', 'green', 'right', 'hover'),

('materials', 'stock_control', 'warning', 'Control de Stock de Material', 'Material Stock Control', 'Materiaalvoorraadcontrole',
'Mantén registro del material disponible para evitar aceptar pedidos que no puedas cumplir.',
'Keep track of available material to avoid accepting orders you cannot fulfill.',
'Houd beschikbaar materiaal bij om te voorkomen dat je bestellingen accepteert die je niet kunt uitvoeren.',
'Package', 'yellow', 'right', 'hover');

-- =====================================================
-- AYUDAS CONTEXTUALES - SECCIÓN: COLORES (15 ayudas)
-- =====================================================

INSERT INTO contextual_help_messages (section, context, help_type, title_es, title_en, title_nl, content_es, content_en, content_nl, icon, color, position, trigger_on) VALUES

('colors', 'color_management', 'tip', 'Gestión de Colores', 'Color Management', 'Kleurbeheer',
'Usa códigos HEX para colores precisos. Añade fotos reales del material impreso para que clientes vean el resultado exacto.',
'Use HEX codes for precise colors. Add real photos of printed material so customers see exact results.',
'Gebruik HEX-codes voor precieze kleuren. Voeg echte foto\'s van gedrukt materiaal toe zodat klanten exacte resultaten zien.',
'Palette', 'blue', 'right', 'hover'),

('colors', 'popular_colors', 'best_practice', 'Colores Populares', 'Popular Colors', 'Populaire kleuren',
'Marca colores populares para mostrarlos primero. Facilita la elección del cliente.',
'Mark popular colors to show them first. Makes customer choice easier.',
'Markeer populaire kleuren om ze eerst te tonen. Maakt klantkeuze gemakkelijker.',
'Star', 'green', 'right', 'hover');

-- =====================================================
-- AYUDAS CONTEXTUALES - SECCIÓN: CUPONES (20 ayudas)
-- =====================================================

INSERT INTO contextual_help_messages (section, context, help_type, title_es, title_en, title_nl, content_es, content_en, content_nl, icon, color, position, trigger_on) VALUES

('coupons', 'create_coupon', 'tutorial', 'Crear Cupón', 'Create Coupon', 'Coupon maken',
'Define código único, tipo de descuento (% o €), fecha de expiración y límite de usos.',
'Define unique code, discount type (% or €), expiration date and usage limit.',
'Definieer unieke code, kortingstype (% of €), vervaldatum en gebruikslimiet.',
'Tag', 'blue', 'right', 'hover'),

('coupons', 'coupon_types', 'info_box', 'Tipos de Cupón', 'Coupon Types', 'Coupontypes',
'Porcentaje: descuento del X% del total. Fijo: descuento de cantidad fija. Envío gratis: elimina costos de envío.',
'Percentage: X% off total. Fixed: fixed amount off. Free shipping: removes shipping costs.',
'Percentage: X% korting op totaal. Vast: vast bedrag korting. Gratis verzending: verwijdert verzendkosten.',
'Percent', 'blue', 'right', 'hover'),

('coupons', 'usage_limits', 'warning', 'Límites de Uso', 'Usage Limits', 'Gebruikslimieten',
'Establece límite total de usos y límite por usuario para evitar abuso de cupones.',
'Set total usage limit and per-user limit to prevent coupon abuse.',
'Stel totale gebruikslimiet en limiet per gebruiker in om misbruik van coupons te voorkomen.',
'Shield', 'yellow', 'right', 'hover'),

('coupons', 'expiration', 'tip', 'Fecha de Expiración', 'Expiration Date', 'Vervaldatum',
'Los cupones expirados se desactivan automáticamente. Usa fechas para crear urgencia en campañas.',
'Expired coupons are automatically deactivated. Use dates to create urgency in campaigns.',
'Verlopen coupons worden automatisch gedeactiveerd. Gebruik datums om urgentie in campagnes te creëren.',
'Calendar', 'blue', 'right', 'hover');

-- =====================================================
-- AYUDAS CONTEXTUALES - SECCIÓN: CALCULADORA 3D (25 ayudas)
-- =====================================================

INSERT INTO contextual_help_messages (section, context, help_type, title_es, title_en, title_nl, content_es, content_en, content_nl, icon, color, position, trigger_on) VALUES

('calculator_3d', 'upload_model', 'tutorial', 'Subir Modelo 3D', 'Upload 3D Model', '3D-model uploaden',
'Acepta archivos STL, OBJ y 3MF. El sistema calcula automáticamente volumen, área y tiempo de impresión.',
'Accepts STL, OBJ and 3MF files. System automatically calculates volume, area and printing time.',
'Accepteert STL-, OBJ- en 3MF-bestanden. Systeem berekent automatisch volume, oppervlakte en printtijd.',
'Upload', 'blue', 'right', 'hover'),

('calculator_3d', 'auto_pricing', 'best_practice', 'Precio Automático', 'Automatic Pricing', 'Automatische prijsbepaling',
'El cálculo considera: material usado, tiempo de impresión, electricidad y margen de ganancia configurado.',
'Calculation considers: material used, printing time, electricity and configured profit margin.',
'Berekening houdt rekening met: gebruikt materiaal, printtijd, elektriciteit en geconfigureerde winstmarge.',
'DollarSign', 'green', 'right', 'hover'),

('calculator_3d', 'model_validation', 'warning', 'Validación de Modelo', 'Model Validation', 'Modelvalidatie',
'El sistema detecta errores: paredes muy delgadas, geometría no imprimible, tamaño excesivo.',
'System detects errors: walls too thin, non-printable geometry, excessive size.',
'Systeem detecteert fouten: wanden te dun, niet-printbare geometrie, te grote afmeting.',
'AlertTriangle', 'yellow', 'right', 'hover'),

('calculator_3d', 'infill_settings', 'info_box', 'Configuración de Relleno', 'Infill Settings', 'Vulinstellingen',
'Mayor relleno = más resistencia pero más material y tiempo. 20% es estándar para piezas decorativas.',
'More infill = more strength but more material and time. 20% is standard for decorative pieces.',
'Meer vulling = meer sterkte maar meer materiaal en tijd. 20% is standaard voor decoratieve stukken.',
'Layers', 'blue', 'right', 'hover');

-- =====================================================
-- AYUDAS CONTEXTUALES - SECCIÓN: SEO (20 ayudas)
-- =====================================================

INSERT INTO contextual_help_messages (section, context, help_type, title_es, title_en, title_nl, content_es, content_en, content_nl, icon, color, position, trigger_on) VALUES

('seo', 'meta_titles', 'best_practice', 'Títulos SEO', 'SEO Titles', 'SEO-titels',
'Longitud ideal: 50-60 caracteres. Incluye palabra clave principal y marca. Ejemplo: "Impresión 3D PLA | Thuis3D"',
'Ideal length: 50-60 characters. Include main keyword and brand. Example: "3D Printing PLA | Thuis3D"',
'Ideale lengte: 50-60 tekens. Inclusief hoofdzoekwoord en merk. Voorbeeld: "3D-printen PLA | Thuis3D"',
'FileText', 'green', 'right', 'hover'),

('seo', 'meta_descriptions', 'tip', 'Meta Descripciones', 'Meta Descriptions', 'Meta-beschrijvingen',
'150-160 caracteres. Resume el contenido y añade llamada a la acción para aumentar clics.',
'150-160 characters. Summarize content and add call-to-action to increase clicks.',
'150-160 tekens. Vat inhoud samen en voeg call-to-action toe om klikken te verhogen.',
'AlignLeft', 'blue', 'right', 'hover'),

('seo', 'keywords', 'tutorial', 'Palabras Clave', 'Keywords', 'Zoekwoorden',
'Investiga palabras que tus clientes usan. Usa herramientas como Google Keyword Planner o Ubersuggest.',
'Research words your customers use. Use tools like Google Keyword Planner or Ubersuggest.',
'Onderzoek woorden die je klanten gebruiken. Gebruik tools zoals Google Keyword Planner of Ubersuggest.',
'Search', 'blue', 'right', 'hover');

-- =====================================================
-- AYUDAS CONTEXTUALES - SECCIÓN: MENSAJES (15 ayudas)
-- =====================================================

INSERT INTO contextual_help_messages (section, context, help_type, title_es, title_en, title_nl, content_es, content_en, content_nl, icon, color, position, trigger_on) VALUES

('messages', 'customer_support', 'best_practice', 'Soporte al Cliente', 'Customer Support', 'Klantenondersteuning',
'Responde en menos de 24 horas. Los clientes satisfechos con el soporte compran más y recomiendan.',
'Respond in less than 24 hours. Customers satisfied with support buy more and recommend.',
'Reageer binnen 24 uur. Klanten tevreden met ondersteuning kopen meer en bevelen aan.',
'MessageSquare', 'green', 'right', 'hover'),

('messages', 'templates', 'tip', 'Plantillas de Respuesta', 'Response Templates', 'Antwoordsjablonen',
'Crea plantillas para preguntas frecuentes: plazos de envío, devoluciones, especificaciones técnicas.',
'Create templates for frequently asked questions: delivery times, returns, technical specifications.',
'Creëer sjablonen voor veelgestelde vragen: levertijden, retouren, technische specificaties.',
'Copy', 'blue', 'right', 'hover');

-- =====================================================
-- AYUDAS CONTEXTUALES - SECCIÓN: AJUSTES (25 ayudas)
-- =====================================================

INSERT INTO contextual_help_messages (section, context, help_type, title_es, title_en, title_nl, content_es, content_en, content_nl, icon, color, position, trigger_on) VALUES

('store_settings', 'payment_methods', 'info_box', 'Métodos de Pago', 'Payment Methods', 'Betaalmethoden',
'Configura pasarelas: Stripe, PayPal, transferencia bancaria. Más opciones = más ventas.',
'Configure gateways: Stripe, PayPal, bank transfer. More options = more sales.',
'Configureer gateways: Stripe, PayPal, bankoverschrijving. Meer opties = meer verkopen.',
'CreditCard', 'blue', 'right', 'hover'),

('shipping', 'shipping_zones', 'tutorial', 'Zonas de Envío', 'Shipping Zones', 'Verzendzones',
'Define costos por país/región. Ofrece envío gratis a partir de cierto monto para aumentar ticket promedio.',
'Define costs by country/region. Offer free shipping from certain amount to increase average ticket.',
'Definieer kosten per land/regio. Bied gratis verzending aan vanaf bepaald bedrag om gemiddeld ticket te verhogen.',
'Truck', 'blue', 'right', 'hover'),

('taxes', 'vat_configuration', 'warning', 'Configuración de IVA', 'VAT Configuration', 'BTW-configuratie',
'Asegúrate de configurar correctamente las tasas de IVA según tu país y los países a los que vendes.',
'Make sure to correctly configure VAT rates according to your country and countries you sell to.',
'Zorg ervoor dat je BTW-tarieven correct configureert volgens je land en landen waar je aan verkoopt.',
'Calculator', 'yellow', 'right', 'hover');

-- FIN DEL ARCHIVO
