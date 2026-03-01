
# Plan: 10+ Nuevas Funciones Inspiradas en Shopify

## Analisis del Sitio Actual vs Shopify

Tu sitio ya tiene: productos, carrito, cupones, gift cards, blog, galeria, reviews, loyalty, cotizaciones, facturas, pedidos, SEO, page builder, litofanias, envios, impuestos, multiidioma.

**Funciones que faltan o se pueden mejorar significativamente:**

---

## 1. Lista de Deseos (Wishlist)
**Nueva funcion** - Los clientes pueden guardar productos favoritos para comprar despues.
- Tabla `wishlists` (user_id, product_id, created_at) con RLS
- Icono de corazon en cada ProductCard y ProductDetail
- Tab "Mis Favoritos" en Mi Cuenta
- Contador de favoritos visible en la navegacion

## 2. Productos Vistos Recientemente
**Nueva funcion** - Seccion "Vistos recientemente" en ProductDetail y Home.
- Almacenamiento en localStorage (ultimos 10 productos)
- Componente `RecentlyViewedProducts` con carrusel horizontal
- Se muestra debajo del detalle del producto y opcionalmente en Home

## 3. Productos Relacionados y Upsell
**Mejora** - Los campos `related_product_ids` y `upsell_product_ids` ya existen en la tabla products pero NO se muestran en ninguna parte.
- Seccion "Productos Relacionados" en ProductDetail
- Seccion "Tambien te puede interesar" (upsell) en Cart
- Carrusel con ProductCard reutilizado

## 4. Barra de Busqueda Global de Productos
**Mejora** - Actualmente solo se busca por codigo de producto. Shopify permite buscar por nombre/descripcion.
- Barra de busqueda con autocompletado en el header (desktop + mobile)
- Busqueda por nombre, descripcion, codigo, categoria
- Resultados en dropdown con imagen, nombre y precio
- Busqueda instantanea mientras se escribe (debounce 300ms)

## 5. Compartir Producto en Redes Sociales
**Nueva funcion** - Botones de compartir en ProductDetail.
- Compartir en WhatsApp, Facebook, Twitter/X, copiar enlace
- Usa Web Share API en movil como fallback nativo
- Open Graph meta tags por producto (ya hay infraestructura SEO)

## 6. Notificacion de Stock (Back in Stock)
**Mejora** - La tabla `stock_waitlist` ya existe pero no tiene interfaz de usuario.
- Boton "Avisarme cuando este disponible" en ProductDetail cuando stock = 0
- Email automatico cuando el producto vuelve a tener stock
- Edge function para enviar notificaciones de restock

## 7. Temporizador de Oferta (Sale Countdown)
**Nueva funcion** - Los productos tienen `sale_end_date` pero no se muestra un countdown.
- Componente `SaleCountdown` con dias/horas/minutos/segundos
- Se muestra en ProductDetail y ProductCard cuando hay oferta activa
- Desaparece automaticamente cuando la oferta expira

## 8. Resenas con Fotos
**Mejora** - El sistema de reviews existe pero no permite adjuntar imagenes.
- Agregar campo `image_urls` (jsonb) a la tabla `reviews`
- Upload de imagenes al crear resena (maximo 3 fotos)
- Galeria de fotos de clientes en la seccion de resenas del producto

## 9. Carrito Persistente en Base de Datos
**Mejora critica** - El carrito actual usa localStorage, se pierde al cambiar dispositivo.
- Tabla `cart_items` ya existe pero no se usa desde el frontend
- Sincronizar carrito con la base de datos cuando el usuario esta autenticado
- Al hacer login, fusionar carrito local con carrito guardado
- Permite continuar compra desde cualquier dispositivo

## 10. Descuento por Primera Compra
**Nueva funcion** - Popup/banner para nuevos usuarios ofreciendo descuento.
- Detectar si el usuario no tiene pedidos previos
- Mostrar banner con codigo de descuento automatico
- Cupon auto-generado para primera compra (configurable desde admin)

## 11. Breadcrumbs de Navegacion
**Mejora** - Shopify muestra breadcrumbs en todas las paginas (Home > Productos > Nombre).
- Componente `Breadcrumbs` reutilizable
- Se muestra en ProductDetail, Blog, Galeria, etc.
- Mejora SEO con datos estructurados (JSON-LD)

## 12. Estimacion de Entrega en Producto
**Mejora** - El campo `estimated_delivery_days` existe pero no se muestra al cliente.
- Mostrar "Entrega estimada: X-Y dias" en ProductDetail
- Calcular fecha estimada basada en la fecha actual
- Icono de camion con la informacion de entrega

---

## Detalles Tecnicos

### Base de Datos (1 migracion SQL):
- Crear tabla `wishlists` (id, user_id, product_id, created_at) con RLS
- Agregar columna `image_urls jsonb` a tabla `reviews`
- Politicas RLS para wishlists (usuario ve/gestiona las suyas, admin ve todas)

### Archivos Nuevos:
- `src/components/Wishlist.tsx` - Boton corazon + logica
- `src/components/RecentlyViewedProducts.tsx` - Carrusel de vistos recientemente
- `src/components/RelatedProducts.tsx` - Productos relacionados
- `src/components/GlobalSearchBar.tsx` - Busqueda global con autocompletado
- `src/components/ShareProduct.tsx` - Botones compartir redes sociales
- `src/components/BackInStockNotify.tsx` - Formulario aviso restock
- `src/components/SaleCountdown.tsx` - Temporizador de oferta
- `src/components/Breadcrumbs.tsx` - Migas de pan
- `src/components/FirstPurchaseDiscount.tsx` - Banner primera compra
- `src/components/DeliveryEstimate.tsx` - Estimacion de entrega
- `supabase/functions/notify-restock/index.ts` - Email de restock

### Archivos Modificados:
- `src/components/ProductCard.tsx` - Agregar boton wishlist + countdown
- `src/pages/ProductDetail.tsx` - Agregar compartir, relacionados, vistos, breadcrumbs, entrega, restock, countdown
- `src/pages/Cart.tsx` - Agregar upsell + sincronizacion BD
- `src/components/Layout.tsx` - Agregar barra busqueda global en header
- `src/pages/user/MyAccount.tsx` - Agregar tab "Favoritos"
- `src/components/ProductReviews.tsx` - Agregar upload de fotos
- Traducciones en `public/locales/{es,en,nl}/products.json`

### Orden de Implementacion:
1. Migracion SQL (wishlists + reviews image_urls)
2. Componentes independientes (Breadcrumbs, SaleCountdown, DeliveryEstimate, ShareProduct)
3. Busqueda global (GlobalSearchBar + integracion en Layout)
4. Wishlist (componente + integracion en ProductCard/ProductDetail/MyAccount)
5. Productos vistos recientemente + Relacionados/Upsell
6. Back in Stock (componente + edge function)
7. Resenas con fotos
8. Carrito persistente (sincronizacion localStorage <-> DB)
9. Descuento primera compra
10. Traducciones completas

### Checklist de Verificacion:
- [ ] Wishlist: agregar/quitar favoritos, ver en Mi Cuenta
- [ ] Busqueda global: buscar por nombre muestra resultados en dropdown
- [ ] Productos relacionados se muestran en ProductDetail
- [ ] Upsell se muestra en Cart
- [ ] Compartir producto funciona en WhatsApp/Facebook/Twitter
- [ ] Countdown de oferta aparece cuando hay sale_end_date
- [ ] Breadcrumbs visibles en ProductDetail
- [ ] Estimacion de entrega visible cuando hay estimated_delivery_days
- [ ] Boton "Avisarme" aparece en productos sin stock
- [ ] Resenas permiten adjuntar fotos
- [ ] Carrito se mantiene al cambiar dispositivo (login)
- [ ] Banner primera compra aparece para usuarios nuevos
- [ ] Ninguna funcion existente se rompe
