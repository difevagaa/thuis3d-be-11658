/**
 * Enhanced Section Options - Provides 40+ configuration options for each section type
 * This component is used by SectionEditor to render comprehensive customization options
 * Each section type now has specific additional options beyond the common 46 base options
 */

import { 
  FieldWithHelp, 
  ColorFieldWithHelp,
  SwitchFieldWithHelp, 
  SelectFieldWithHelp, 
  SliderFieldWithHelp,
  TextareaFieldWithHelp 
} from "./FieldWithHelp";
import { ImageUploadField } from "./ImageUploadField";

interface EnhancedOptionsProps {
  sectionType: string;
  settings: any;
  styles: any;
  content: any;
  onUpdateSettings: (key: string, value: any) => void;
  onUpdateStyles: (key: string, value: any) => void;
  onUpdateContent: (key: string, value: any) => void;
}

export function EnhancedSectionOptions({
  sectionType,
  settings,
  styles,
  content,
  onUpdateSettings,
  onUpdateStyles,
  onUpdateContent
}: EnhancedOptionsProps) {
  
  // Render section-specific options based on section type
  const renderSectionSpecificOptions = () => {
    switch (sectionType) {
      case 'hero':
        return renderHeroOptions();
      case 'features':
        return renderFeaturesOptions();
      case 'products-carousel':
        return renderProductsCarouselOptions();
      case 'image-carousel':
        return renderImageCarouselOptions();
      case 'banner':
      case 'cta':
        return renderBannerOptions();
      case 'gallery':
        return renderGalleryOptions();
      case 'text':
        return renderTextOptions();
      default:
        return null;
    }
  };

  // Hero Section Specific Options (10+ additional options)
  const renderHeroOptions = () => (
    <div className="space-y-3 mt-6">
      <h5 className="text-xs font-medium text-muted-foreground uppercase border-t pt-3">
        Opciones de Hero/Banner Principal
      </h5>
      
      <ImageUploadField
        label="Imagen de fondo"
        helpText="Imagen de fondo para el hero (subir archivo o URL)"
        value={content.backgroundImage || ''}
        onChange={(value) => onUpdateContent('backgroundImage', value)}
      />

      <SelectFieldWithHelp
        label="Posición del contenido"
        help="Dónde colocar el texto del hero"
        value={settings.heroContentPosition || 'center'}
        onChange={(value) => onUpdateSettings('heroContentPosition', value)}
        options={[
          { value: 'top-left', label: 'Superior izquierda' },
          { value: 'top-center', label: 'Superior centro' },
          { value: 'top-right', label: 'Superior derecha' },
          { value: 'center-left', label: 'Centro izquierda' },
          { value: 'center', label: 'Centro' },
          { value: 'center-right', label: 'Centro derecha' },
          { value: 'bottom-left', label: 'Inferior izquierda' },
          { value: 'bottom-center', label: 'Inferior centro' },
          { value: 'bottom-right', label: 'Inferior derecha' }
        ]}
      />

      <SliderFieldWithHelp
        label="Opacidad del overlay"
        help="Capa oscura sobre la imagen para mejorar legibilidad (0-100%)"
        value={settings.heroOverlayOpacity || 50}
        onChange={(value) => onUpdateSettings('heroOverlayOpacity', value)}
        min={0}
        max={100}
        step={5}
      />

      <ColorFieldWithHelp
        label="Color del overlay"
        help="Color de la capa sobre la imagen de fondo"
        value={settings.heroOverlayColor || '#000000'}
        onChange={(value) => onUpdateSettings('heroOverlayColor', value)}
      />

      <SliderFieldWithHelp
        label="Tamaño del título"
        help="Tamaño de fuente del título principal en píxeles"
        value={settings.heroTitleSize || 48}
        onChange={(value) => onUpdateSettings('heroTitleSize', value)}
        min={24}
        max={120}
        step={4}
      />

      <SliderFieldWithHelp
        label="Tamaño del subtítulo"
        help="Tamaño de fuente del subtítulo en píxeles"
        value={settings.heroSubtitleSize || 20}
        onChange={(value) => onUpdateSettings('heroSubtitleSize', value)}
        min={14}
        max={48}
        step={2}
      />

      <SelectFieldWithHelp
        label="Estilo del botón"
        help="Diseño visual del botón de acción"
        value={settings.heroButtonStyle || 'primary'}
        onChange={(value) => onUpdateSettings('heroButtonStyle', value)}
        options={[
          { value: 'primary', label: 'Principal (relleno)' },
          { value: 'secondary', label: 'Secundario' },
          { value: 'outline', label: 'Contorno' },
          { value: 'ghost', label: 'Fantasma' },
          { value: 'link', label: 'Enlace simple' }
        ]}
      />

      <SelectFieldWithHelp
        label="Tamaño del botón"
        help="Tamaño del botón de llamada a la acción"
        value={settings.heroButtonSize || 'default'}
        onChange={(value) => onUpdateSettings('heroButtonSize', value)}
        options={[
          { value: 'sm', label: 'Pequeño' },
          { value: 'default', label: 'Normal' },
          { value: 'lg', label: 'Grande' },
          { value: 'xl', label: 'Extra grande' }
        ]}
      />

      <SwitchFieldWithHelp
        label="Efecto parallax"
        help="Imagen de fondo se mueve más lento que el scroll"
        checked={settings.heroParallax || false}
        onCheckedChange={(checked) => onUpdateSettings('heroParallax', checked)}
      />

      <SwitchFieldWithHelp
        label="Video de fondo"
        help="Usar video en lugar de imagen (URL debe ser de video)"
        checked={settings.heroVideoBackground || false}
        onCheckedChange={(checked) => onUpdateSettings('heroVideoBackground', checked)}
      />

      <SwitchFieldWithHelp
        label="Pantalla completa"
        help="El hero ocupa toda la altura de la ventana"
        checked={settings.heroFullHeight || false}
        onCheckedChange={(checked) => onUpdateSettings('heroFullHeight', checked)}
      />

      <SelectFieldWithHelp
        label="Efecto de entrada del texto"
        help="Animación al aparecer el texto del hero"
        value={settings.heroTextAnimation || 'fade-in'}
        onChange={(value) => onUpdateSettings('heroTextAnimation', value)}
        options={[
          { value: 'none', label: 'Sin animación' },
          { value: 'fade-in', label: 'Aparecer gradualmente' },
          { value: 'slide-up', label: 'Deslizar hacia arriba' },
          { value: 'slide-down', label: 'Deslizar hacia abajo' },
          { value: 'zoom-in', label: 'Acercar' },
          { value: 'typewriter', label: 'Máquina de escribir' }
        ]}
      />
    </div>
  );

  // Features Section Options (10+ additional options)
  const renderFeaturesOptions = () => (
    <div className="space-y-3 mt-6">
      <h5 className="text-xs font-medium text-muted-foreground uppercase border-t pt-3">
        Opciones de Características/Features
      </h5>
      
      <SliderFieldWithHelp
        label="Número de columnas"
        help="Cuántas características mostrar por fila"
        value={settings.featuresColumns || 3}
        onChange={(value) => onUpdateSettings('featuresColumns', value)}
        min={1}
        max={6}
        step={1}
      />

      <SliderFieldWithHelp
        label="Espaciado entre cards"
        help="Espacio entre tarjetas de características en píxeles"
        value={settings.featuresGap || 24}
        onChange={(value) => onUpdateSettings('featuresGap', value)}
        min={0}
        max={64}
        step={4}
      />

      <SliderFieldWithHelp
        label="Tamaño del icono"
        help="Tamaño de los iconos de las características en píxeles"
        value={settings.featuresIconSize || 48}
        onChange={(value) => onUpdateSettings('featuresIconSize', value)}
        min={24}
        max={96}
        step={4}
      />

      <ColorFieldWithHelp
        label="Color de los iconos"
        help="Color de los iconos de características"
        value={settings.featuresIconColor || '#3b82f6'}
        onChange={(value) => onUpdateSettings('featuresIconColor', value)}
      />

      <SelectFieldWithHelp
        label="Estilo de las tarjetas"
        help="Diseño visual de cada característica"
        value={settings.featuresCardStyle || 'default'}
        onChange={(value) => onUpdateSettings('featuresCardStyle', value)}
        options={[
          { value: 'default', label: 'Predeterminado' },
          { value: 'bordered', label: 'Con borde' },
          { value: 'shadowed', label: 'Con sombra' },
          { value: 'filled', label: 'Relleno' },
          { value: 'minimal', label: 'Minimalista' }
        ]}
      />

      <SelectFieldWithHelp
        label="Alineación de contenido"
        help="Alineación del texto en cada tarjeta"
        value={settings.featuresAlignment || 'center'}
        onChange={(value) => onUpdateSettings('featuresAlignment', value)}
        options={[
          { value: 'left', label: 'Izquierda' },
          { value: 'center', label: 'Centro' },
          { value: 'right', label: 'Derecha' }
        ]}
      />

      <SliderFieldWithHelp
        label="Tamaño del título de característica"
        help="Tamaño de fuente del título en píxeles"
        value={settings.featuresTitleSize || 20}
        onChange={(value) => onUpdateSettings('featuresTitleSize', value)}
        min={14}
        max={32}
        step={2}
      />

      <SliderFieldWithHelp
        label="Tamaño de descripción"
        help="Tamaño de fuente de la descripción en píxeles"
        value={settings.featuresDescSize || 14}
        onChange={(value) => onUpdateSettings('featuresDescSize', value)}
        min={12}
        max={20}
        step={1}
      />

      <SwitchFieldWithHelp
        label="Efecto hover en tarjetas"
        help="Aplicar efecto al pasar el mouse sobre características"
        checked={settings.featuresHoverEffect || true}
        onCheckedChange={(checked) => onUpdateSettings('featuresHoverEffect', checked)}
      />

      <SelectFieldWithHelp
        label="Tipo de efecto hover"
        help="Qué efecto aplicar al pasar el mouse"
        value={settings.featuresHoverType || 'lift'}
        onChange={(value) => onUpdateSettings('featuresHoverType', value)}
        options={[
          { value: 'none', label: 'Ninguno' },
          { value: 'lift', label: 'Elevar' },
          { value: 'scale', label: 'Agrandar' },
          { value: 'glow', label: 'Resplandor' },
          { value: 'tilt', label: 'Inclinar' }
        ]}
      />

      <SwitchFieldWithHelp
        label="Animación en scroll"
        help="Animar características al hacer scroll"
        checked={settings.featuresScrollAnimation || true}
        onCheckedChange={(checked) => onUpdateSettings('featuresScrollAnimation', checked)}
      />

      <SelectFieldWithHelp
        label="Posición del icono"
        help="Dónde ubicar el icono respecto al texto"
        value={settings.featuresIconPosition || 'top'}
        onChange={(value) => onUpdateSettings('featuresIconPosition', value)}
        options={[
          { value: 'top', label: 'Arriba' },
          { value: 'left', label: 'Izquierda' },
          { value: 'right', label: 'Derecha' }
        ]}
      />
    </div>
  );

  // Products Carousel Options (30+ additional options)
  const renderProductsCarouselOptions = () => (
    <div className="space-y-3 mt-6">
      <h5 className="text-xs font-medium text-muted-foreground uppercase border-t pt-3">
        Opciones de Carrusel de Productos (30+ opciones)
      </h5>
      
      {/* Display Settings */}
      <h6 className="text-[10px] font-medium text-muted-foreground uppercase pt-2">Visualización</h6>
      
      <SliderFieldWithHelp
        label="Productos por vista (Desktop)"
        help="Cuántos productos mostrar simultáneamente en desktop"
        value={settings.carouselProductsPerView || 4}
        onChange={(value) => onUpdateSettings('carouselProductsPerView', value)}
        min={1}
        max={8}
        step={1}
      />

      <SliderFieldWithHelp
        label="Productos por vista (Tablet)"
        help="Cuántos productos mostrar en tablets"
        value={settings.carouselProductsPerViewTablet || 3}
        onChange={(value) => onUpdateSettings('carouselProductsPerViewTablet', value)}
        min={1}
        max={6}
        step={1}
      />

      <SliderFieldWithHelp
        label="Productos por vista (Móvil)"
        help="Cuántos productos mostrar en móviles"
        value={settings.carouselProductsPerViewMobile || 1}
        onChange={(value) => onUpdateSettings('carouselProductsPerViewMobile', value)}
        min={1}
        max={4}
        step={1}
      />

      <SliderFieldWithHelp
        label="Espaciado entre productos"
        help="Espacio entre productos en el carrusel (px)"
        value={settings.carouselGap || 16}
        onChange={(value) => onUpdateSettings('carouselGap', value)}
        min={0}
        max={64}
        step={4}
      />

      {/* Image Settings */}
      <h6 className="text-[10px] font-medium text-muted-foreground uppercase pt-2">Imágenes de productos</h6>

      <SliderFieldWithHelp
        label="Altura de imágenes de producto"
        help="Altura de las imágenes de productos en píxeles"
        value={settings.carouselImageHeight || 250}
        onChange={(value) => onUpdateSettings('carouselImageHeight', value)}
        min={100}
        max={600}
        step={10}
      />

      <SelectFieldWithHelp
        label="Ajuste de imagen"
        help="Cómo se ajustan las imágenes al contenedor"
        value={settings.carouselImageFit || 'cover'}
        onChange={(value) => onUpdateSettings('carouselImageFit', value)}
        options={[
          { value: 'cover', label: 'Cubrir (crop)' },
          { value: 'contain', label: 'Contener (completa)' },
          { value: 'fill', label: 'Rellenar (estirar)' }
        ]}
      />

      <SelectFieldWithHelp
        label="Radio de bordes de imagen"
        help="Redondeo de las esquinas de la imagen"
        value={settings.carouselImageRadius || 'md'}
        onChange={(value) => onUpdateSettings('carouselImageRadius', value)}
        options={[
          { value: 'none', label: 'Sin redondeo' },
          { value: 'sm', label: 'Pequeño' },
          { value: 'md', label: 'Mediano' },
          { value: 'lg', label: 'Grande' },
          { value: 'full', label: 'Circular' }
        ]}
      />

      {/* Typography */}
      <h6 className="text-[10px] font-medium text-muted-foreground uppercase pt-2">Tipografía</h6>

      <SliderFieldWithHelp
        label="Tamaño del título del producto"
        help="Tamaño de fuente del nombre del producto"
        value={settings.carouselTitleSize || 16}
        onChange={(value) => onUpdateSettings('carouselTitleSize', value)}
        min={12}
        max={28}
        step={2}
      />

      <SliderFieldWithHelp
        label="Tamaño del precio"
        help="Tamaño de fuente del precio del producto"
        value={settings.carouselPriceSize || 18}
        onChange={(value) => onUpdateSettings('carouselPriceSize', value)}
        min={12}
        max={32}
        step={2}
      />

      <ColorFieldWithHelp
        label="Color del precio"
        help="Color del texto del precio"
        value={settings.carouselPriceColor || ''}
        onChange={(value) => onUpdateSettings('carouselPriceColor', value)}
      />

      <SwitchFieldWithHelp
        label="Mostrar descripción corta"
        help="Mostrar extracto de descripción del producto"
        checked={settings.carouselShowDescription || false}
        onCheckedChange={(checked) => onUpdateSettings('carouselShowDescription', checked)}
      />

      <SwitchFieldWithHelp
        label="Mostrar categoría"
        help="Mostrar categoría del producto en la tarjeta"
        checked={settings.carouselShowCategory || false}
        onCheckedChange={(checked) => onUpdateSettings('carouselShowCategory', checked)}
      />

      {/* Navigation & Controls */}
      <h6 className="text-[10px] font-medium text-muted-foreground uppercase pt-2">Navegación</h6>

      <SwitchFieldWithHelp
        label="Auto-reproducción"
        help="El carrusel avanza automáticamente"
        checked={settings.carouselAutoplay || false}
        onCheckedChange={(checked) => onUpdateSettings('carouselAutoplay', checked)}
      />

      <SliderFieldWithHelp
        label="Velocidad de auto-reproducción"
        help="Segundos entre cada cambio automático"
        value={settings.carouselAutoplaySpeed || 3}
        onChange={(value) => onUpdateSettings('carouselAutoplaySpeed', value)}
        min={1}
        max={15}
        step={0.5}
      />

      <SwitchFieldWithHelp
        label="Pausar al pasar el mouse"
        help="Detener autoplay cuando el cursor está encima"
        checked={settings.carouselPauseOnHover !== false}
        onCheckedChange={(checked) => onUpdateSettings('carouselPauseOnHover', checked)}
      />

      <SwitchFieldWithHelp
        label="Loop infinito"
        help="Volver al inicio al llegar al final"
        checked={settings.carouselLoop !== false}
        onCheckedChange={(checked) => onUpdateSettings('carouselLoop', checked)}
      />

      <SwitchFieldWithHelp
        label="Mostrar flechas de navegación"
        help="Mostrar botones de anterior/siguiente"
        checked={settings.carouselShowArrows !== false}
        onCheckedChange={(checked) => onUpdateSettings('carouselShowArrows', checked)}
      />

      <SwitchFieldWithHelp
        label="Mostrar puntos de paginación"
        help="Mostrar indicadores de posición debajo"
        checked={settings.carouselShowDots || false}
        onCheckedChange={(checked) => onUpdateSettings('carouselShowDots', checked)}
      />

      {/* Transitions & Effects */}
      <h6 className="text-[10px] font-medium text-muted-foreground uppercase pt-2">Efectos y Transiciones</h6>

      <SelectFieldWithHelp
        label="Efecto de transición"
        help="Tipo de animación al cambiar de producto"
        value={settings.carouselTransition || 'slide'}
        onChange={(value) => onUpdateSettings('carouselTransition', value)}
        options={[
          { value: 'slide', label: 'Deslizar' },
          { value: 'fade', label: 'Desvanecer' },
          { value: 'cube', label: 'Cubo 3D' },
          { value: 'coverflow', label: 'Coverflow' },
          { value: 'flip', label: 'Voltear' }
        ]}
      />

      <SliderFieldWithHelp
        label="Velocidad de transición"
        help="Duración de la animación en milisegundos"
        value={settings.carouselTransitionSpeed || 600}
        onChange={(value) => onUpdateSettings('carouselTransitionSpeed', value)}
        min={200}
        max={2000}
        step={100}
      />

      <SwitchFieldWithHelp
        label="Centrar diapositivas"
        help="Centrar el producto activo en el carrusel"
        checked={settings.carouselCentered || false}
        onCheckedChange={(checked) => onUpdateSettings('carouselCentered', checked)}
      />

      <SelectFieldWithHelp
        label="Efecto hover en tarjetas"
        help="Efecto al pasar el mouse sobre productos"
        value={settings.carouselHoverEffect || 'lift'}
        onChange={(value) => onUpdateSettings('carouselHoverEffect', value)}
        options={[
          { value: 'none', label: 'Ninguno' },
          { value: 'lift', label: 'Elevar' },
          { value: 'scale', label: 'Agrandar' },
          { value: 'glow', label: 'Resplandor' },
          { value: 'tilt', label: 'Inclinar' }
        ]}
      />

      {/* Card Styling */}
      <h6 className="text-[10px] font-medium text-muted-foreground uppercase pt-2">Estilo de tarjetas</h6>

      <SelectFieldWithHelp
        label="Estilo de tarjeta"
        help="Diseño visual de las tarjetas de producto"
        value={settings.carouselCardStyle || 'shadowed'}
        onChange={(value) => onUpdateSettings('carouselCardStyle', value)}
        options={[
          { value: 'flat', label: 'Plano' },
          { value: 'bordered', label: 'Con borde' },
          { value: 'shadowed', label: 'Con sombra' },
          { value: 'elevated', label: 'Elevado' }
        ]}
      />

      <ColorFieldWithHelp
        label="Color de fondo de tarjeta"
        help="Color de fondo de las tarjetas de producto"
        value={settings.carouselCardBgColor || ''}
        onChange={(value) => onUpdateSettings('carouselCardBgColor', value)}
      />

      <SliderFieldWithHelp
        label="Padding de tarjeta"
        help="Espacio interno de las tarjetas en píxeles"
        value={settings.carouselCardPadding || 16}
        onChange={(value) => onUpdateSettings('carouselCardPadding', value)}
        min={0}
        max={40}
        step={4}
      />

      {/* Data Source */}
      <h6 className="text-[10px] font-medium text-muted-foreground uppercase pt-2">Fuente de datos</h6>

      <SelectFieldWithHelp
        label="Fuente de productos"
        help="De dónde obtener los productos a mostrar"
        value={settings.productsSource || 'featured'}
        onChange={(value) => onUpdateSettings('productsSource', value)}
        options={[
          { value: 'featured', label: 'Productos destacados' },
          { value: 'recent', label: 'Más recientes' },
          { value: 'bestsellers', label: 'Más vendidos' },
          { value: 'category', label: 'Por categoría' },
          { value: 'custom', label: 'Selección manual' }
        ]}
      />

      <SliderFieldWithHelp
        label="Límite de productos"
        help="Número máximo de productos a mostrar"
        value={settings.productsLimit || 12}
        onChange={(value) => onUpdateSettings('productsLimit', value)}
        min={1}
        max={50}
        step={1}
      />

      <SelectFieldWithHelp
        label="Ordenar por"
        help="Criterio de ordenación de productos"
        value={settings.sortBy || 'created_at'}
        onChange={(value) => onUpdateSettings('sortBy', value)}
        options={[
          { value: 'created_at', label: 'Fecha de creación' },
          { value: 'name', label: 'Nombre' },
          { value: 'price', label: 'Precio' },
          { value: 'updated_at', label: 'Última actualización' }
        ]}
      />

      <SelectFieldWithHelp
        label="Orden"
        help="Dirección de ordenación"
        value={settings.sortOrder || 'desc'}
        onChange={(value) => onUpdateSettings('sortOrder', value)}
        options={[
          { value: 'asc', label: 'Ascendente' },
          { value: 'desc', label: 'Descendente' }
        ]}
      />

      <SwitchFieldWithHelp
        label="Respetar filtros de roles"
        help="Mostrar solo productos según rol del usuario (activo por defecto)"
        checked={settings.respectRoleFilters !== false}
        onCheckedChange={(checked) => onUpdateSettings('respectRoleFilters', checked)}
      />
    </div>
  );

  // Image Carousel Options (30+ additional options)
  const renderImageCarouselOptions = () => (
    <div className="space-y-3 mt-6">
      <h5 className="text-xs font-medium text-muted-foreground uppercase border-t pt-3">
        Opciones de Carrusel de Imágenes (30+ opciones)
      </h5>
      
      {/* Display Settings */}
      <h6 className="text-[10px] font-medium text-muted-foreground uppercase pt-2">Visualización</h6>
      
      <SliderFieldWithHelp
        label="Imágenes por vista (Desktop)"
        help="Cuántas imágenes mostrar simultáneamente en desktop"
        value={settings.imageCarouselPerView || 3}
        onChange={(value) => onUpdateSettings('imageCarouselPerView', value)}
        min={1}
        max={8}
        step={1}
      />

      <SliderFieldWithHelp
        label="Imágenes por vista (Tablet)"
        help="Cuántas imágenes mostrar en tablets"
        value={settings.imageCarouselPerViewTablet || 2}
        onChange={(value) => onUpdateSettings('imageCarouselPerViewTablet', value)}
        min={1}
        max={6}
        step={1}
      />

      <SliderFieldWithHelp
        label="Imágenes por vista (Móvil)"
        help="Cuántas imágenes mostrar en móviles"
        value={settings.imageCarouselPerViewMobile || 1}
        onChange={(value) => onUpdateSettings('imageCarouselPerViewMobile', value)}
        min={1}
        max={3}
        step={1}
      />

      <SliderFieldWithHelp
        label="Espaciado entre imágenes"
        help="Espacio entre imágenes en píxeles"
        value={settings.imageCarouselGap || 20}
        onChange={(value) => onUpdateSettings('imageCarouselGap', value)}
        min={0}
        max={60}
        step={4}
      />

      {/* Image Sizing */}
      <h6 className="text-[10px] font-medium text-muted-foreground uppercase pt-2">Tamaño de imágenes</h6>

      <SliderFieldWithHelp
        label="Altura de las imágenes"
        help="Altura de las imágenes en el carrusel (px)"
        value={settings.imageCarouselHeight || 400}
        onChange={(value) => onUpdateSettings('imageCarouselHeight', value)}
        min={150}
        max={900}
        step={25}
      />

      <SliderFieldWithHelp
        label="Ancho máximo de imagen"
        help="Ancho máximo de cada imagen en píxeles (0 = automático)"
        value={settings.imageCarouselMaxWidth || 0}
        onChange={(value) => onUpdateSettings('imageCarouselMaxWidth', value)}
        min={0}
        max={800}
        step={50}
      />

      <SelectFieldWithHelp
        label="Ajuste de imagen"
        help="Cómo se ajustan las imágenes al contenedor"
        value={settings.imageCarouselFit || 'cover'}
        onChange={(value) => onUpdateSettings('imageCarouselFit', value)}
        options={[
          { value: 'cover', label: 'Cubrir (crop)' },
          { value: 'contain', label: 'Contener (completa)' },
          { value: 'fill', label: 'Rellenar (estirar)' },
          { value: 'scale-down', label: 'Escalar hacia abajo' }
        ]}
      />

      <SelectFieldWithHelp
        label="Relación de aspecto"
        help="Proporción de las imágenes"
        value={settings.imageCarouselAspectRatio || 'auto'}
        onChange={(value) => onUpdateSettings('imageCarouselAspectRatio', value)}
        options={[
          { value: 'auto', label: 'Automático' },
          { value: '1/1', label: 'Cuadrado (1:1)' },
          { value: '4/3', label: 'Estándar (4:3)' },
          { value: '16/9', label: 'Panorámico (16:9)' },
          { value: '3/2', label: 'Fotografía (3:2)' }
        ]}
      />

      <SelectFieldWithHelp
        label="Radio de bordes"
        help="Redondeo de las esquinas de las imágenes"
        value={settings.imageCarouselBorderRadius || 'lg'}
        onChange={(value) => onUpdateSettings('imageCarouselBorderRadius', value)}
        options={[
          { value: 'none', label: 'Sin redondeo' },
          { value: 'sm', label: 'Pequeño' },
          { value: 'md', label: 'Mediano' },
          { value: 'lg', label: 'Grande' },
          { value: 'xl', label: 'Muy grande' },
          { value: 'full', label: 'Circular' }
        ]}
      />

      {/* Captions & Overlays */}
      <h6 className="text-[10px] font-medium text-muted-foreground uppercase pt-2">Captions y Overlays</h6>

      <SwitchFieldWithHelp
        label="Mostrar captions"
        help="Mostrar descripciones sobre las imágenes"
        checked={settings.imageCarouselShowCaptions !== false}
        onCheckedChange={(checked) => onUpdateSettings('imageCarouselShowCaptions', checked)}
      />

      <SelectFieldWithHelp
        label="Posición de captions"
        help="Dónde mostrar las descripciones"
        value={settings.imageCarouselCaptionPosition || 'bottom'}
        onChange={(value) => onUpdateSettings('imageCarouselCaptionPosition', value)}
        options={[
          { value: 'top', label: 'Arriba' },
          { value: 'bottom', label: 'Abajo' },
          { value: 'overlay', label: 'Sobre la imagen' }
        ]}
      />

      <ColorFieldWithHelp
        label="Color de fondo de caption"
        help="Color de fondo para las descripciones"
        value={settings.imageCarouselCaptionBg || 'rgba(0,0,0,0.7)'}
        onChange={(value) => onUpdateSettings('imageCarouselCaptionBg', value)}
      />

      <SwitchFieldWithHelp
        label="Mostrar overlay oscuro"
        help="Añadir capa oscura sobre las imágenes"
        checked={settings.imageCarouselShowOverlay || false}
        onCheckedChange={(checked) => onUpdateSettings('imageCarouselShowOverlay', checked)}
      />

      <SliderFieldWithHelp
        label="Opacidad de overlay"
        help="Transparencia del overlay oscuro"
        value={settings.imageCarouselOverlayOpacity || 30}
        onChange={(value) => onUpdateSettings('imageCarouselOverlayOpacity', value)}
        min={0}
        max={100}
        step={5}
      />

      {/* Navigation & Controls */}
      <h6 className="text-[10px] font-medium text-muted-foreground uppercase pt-2">Navegación</h6>

      <SwitchFieldWithHelp
        label="Auto-reproducción"
        help="Avanzar automáticamente las imágenes"
        checked={settings.imageCarouselAutoplay || false}
        onCheckedChange={(checked) => onUpdateSettings('imageCarouselAutoplay', checked)}
      />

      <SliderFieldWithHelp
        label="Velocidad de auto-reproducción"
        help="Segundos entre cada cambio"
        value={settings.imageCarouselAutoplaySpeed || 4}
        onChange={(value) => onUpdateSettings('imageCarouselAutoplaySpeed', value)}
        min={1}
        max={15}
        step={0.5}
      />

      <SwitchFieldWithHelp
        label="Pausar al pasar el mouse"
        help="Detener autoplay cuando el cursor está encima"
        checked={settings.imageCarouselPauseOnHover !== false}
        onCheckedChange={(checked) => onUpdateSettings('imageCarouselPauseOnHover', checked)}
      />

      <SwitchFieldWithHelp
        label="Loop infinito"
        help="Volver al inicio al llegar al final"
        checked={settings.imageCarouselLoop !== false}
        onCheckedChange={(checked) => onUpdateSettings('imageCarouselLoop', checked)}
      />

      <SwitchFieldWithHelp
        label="Mostrar flechas"
        help="Mostrar botones de anterior/siguiente"
        checked={settings.imageCarouselShowArrows !== false}
        onCheckedChange={(checked) => onUpdateSettings('imageCarouselShowArrows', checked)}
      />

      <SwitchFieldWithHelp
        label="Mostrar puntos"
        help="Mostrar indicadores de posición"
        checked={settings.imageCarouselShowDots || false}
        onCheckedChange={(checked) => onUpdateSettings('imageCarouselShowDots', checked)}
      />

      <SwitchFieldWithHelp
        label="Miniaturas de navegación"
        help="Mostrar miniaturas debajo para navegar"
        checked={settings.imageCarouselThumbnails || false}
        onCheckedChange={(checked) => onUpdateSettings('imageCarouselThumbnails', checked)}
      />

      {/* Effects & Interactions */}
      <h6 className="text-[10px] font-medium text-muted-foreground uppercase pt-2">Efectos e interacciones</h6>

      <SelectFieldWithHelp
        label="Efecto de transición"
        help="Tipo de animación entre imágenes"
        value={settings.imageCarouselTransition || 'slide'}
        onChange={(value) => onUpdateSettings('imageCarouselTransition', value)}
        options={[
          { value: 'slide', label: 'Deslizar' },
          { value: 'fade', label: 'Desvanecer' },
          { value: 'cube', label: 'Cubo 3D' },
          { value: 'flip', label: 'Voltear' },
          { value: 'cards', label: 'Cartas' },
          { value: 'creative', label: 'Creativo' }
        ]}
      />

      <SliderFieldWithHelp
        label="Velocidad de transición"
        help="Duración de la animación en milisegundos"
        value={settings.imageCarouselTransitionSpeed || 600}
        onChange={(value) => onUpdateSettings('imageCarouselTransitionSpeed', value)}
        min={200}
        max={2000}
        step={100}
      />

      <SwitchFieldWithHelp
        label="Efecto ken burns"
        help="Zoom sutil en las imágenes durante el autoplay"
        checked={settings.imageCarouselKenBurns || false}
        onCheckedChange={(checked) => onUpdateSettings('imageCarouselKenBurns', checked)}
      />

      <SelectFieldWithHelp
        label="Efecto hover"
        help="Efecto al pasar el mouse sobre imágenes"
        value={settings.imageCarouselHoverEffect || 'zoom'}
        onChange={(value) => onUpdateSettings('imageCarouselHoverEffect', value)}
        options={[
          { value: 'none', label: 'Ninguno' },
          { value: 'zoom', label: 'Zoom' },
          { value: 'lift', label: 'Elevar' },
          { value: 'overlay', label: 'Oscurecer' },
          { value: 'blur', label: 'Desenfocar' }
        ]}
      />

      <SwitchFieldWithHelp
        label="Lightbox al hacer clic"
        help="Abrir imagen en pantalla completa al hacer clic"
        checked={settings.imageCarouselLightbox !== false}
        onCheckedChange={(checked) => onUpdateSettings('imageCarouselLightbox', checked)}
      />

      <SwitchFieldWithHelp
        label="Centrar imágenes"
        help="Centrar la imagen activa en el carrusel"
        checked={settings.imageCarouselCentered || false}
        onCheckedChange={(checked) => onUpdateSettings('imageCarouselCentered', checked)}
      />

      <SwitchFieldWithHelp
        label="Arrastrar para navegar"
        help="Permitir arrastrar las imágenes para navegar"
        checked={settings.imageCarouselDraggable !== false}
        onCheckedChange={(checked) => onUpdateSettings('imageCarouselDraggable', checked)}
      />

      {/* Advanced */}
      <h6 className="text-[10px] font-medium text-muted-foreground uppercase pt-2">Avanzado</h6>

      <SwitchFieldWithHelp
        label="Lazy loading"
        help="Cargar imágenes solo cuando sean visibles"
        checked={settings.imageCarouselLazyLoad !== false}
        onCheckedChange={(checked) => onUpdateSettings('imageCarouselLazyLoad', checked)}
      />

      <SwitchFieldWithHelp
        label="Control con teclado"
        help="Permitir navegación con flechas del teclado"
        checked={settings.imageCarouselKeyboard || false}
        onCheckedChange={(checked) => onUpdateSettings('imageCarouselKeyboard', checked)}
      />

      <SwitchFieldWithHelp
        label="Control con rueda del mouse"
        help="Permitir navegación con scroll del mouse"
        checked={settings.imageCarouselMouseWheel || false}
        onCheckedChange={(checked) => onUpdateSettings('imageCarouselMouseWheel', checked)}
      />
    </div>
  );

  // Banner/CTA Options (10+ additional options)
  const renderBannerOptions = () => (
    <div className="space-y-3 mt-6">
      <h5 className="text-xs font-medium text-muted-foreground uppercase border-t pt-3">
        Opciones de Banner/CTA
      </h5>
      
      <ImageUploadField
        label="Imagen de fondo del banner"
        helpText="Imagen de fondo (subir archivo o URL)"
        value={content.backgroundImage || ''}
        onChange={(value) => onUpdateContent('backgroundImage', value)}
      />

      <SliderFieldWithHelp
        label="Altura del banner"
        help="Altura del banner en píxeles"
        value={settings.bannerHeight || 300}
        onChange={(value) => onUpdateSettings('bannerHeight', value)}
        min={150}
        max={800}
        step={50}
      />

      <SelectFieldWithHelp
        label="Ancho del banner"
        help="Ancho del banner respecto a la pantalla"
        value={settings.bannerWidth || 'full'}
        onChange={(value) => onUpdateSettings('bannerWidth', value)}
        options={[
          { value: 'full', label: 'Ancho completo (100%)' },
          { value: 'wide', label: 'Ancho amplio (90%)' },
          { value: 'container', label: 'Contenedor (80%)' },
          { value: 'narrow', label: 'Estrecho (60%)' },
          { value: 'custom', label: 'Personalizado' }
        ]}
      />

      <SliderFieldWithHelp
        label="Ancho personalizado (px)"
        help="Ancho máximo del banner en píxeles (si selecciona personalizado)"
        value={settings.bannerMaxWidth || 1200}
        onChange={(value) => onUpdateSettings('bannerMaxWidth', value)}
        min={300}
        max={1920}
        step={50}
      />

      <SelectFieldWithHelp
        label="Alineación del contenido"
        help="Posición del texto dentro del banner"
        value={settings.bannerContentAlign || 'center'}
        onChange={(value) => onUpdateSettings('bannerContentAlign', value)}
        options={[
          { value: 'left', label: 'Izquierda' },
          { value: 'center', label: 'Centro' },
          { value: 'right', label: 'Derecha' }
        ]}
      />

      <ColorFieldWithHelp
        label="Color del overlay"
        help="Capa de color sobre la imagen de fondo"
        value={settings.bannerOverlayColor || '#000000'}
        onChange={(value) => onUpdateSettings('bannerOverlayColor', value)}
      />

      <SliderFieldWithHelp
        label="Opacidad del overlay"
        help="Transparencia de la capa de color (0-100%)"
        value={settings.bannerOverlayOpacity || 40}
        onChange={(value) => onUpdateSettings('bannerOverlayOpacity', value)}
        min={0}
        max={100}
        step={5}
      />

      <SliderFieldWithHelp
        label="Tamaño del título"
        help="Tamaño de fuente del título del banner"
        value={settings.bannerTitleSize || 32}
        onChange={(value) => onUpdateSettings('bannerTitleSize', value)}
        min={20}
        max={72}
        step={4}
      />

      <SliderFieldWithHelp
        label="Tamaño del texto"
        help="Tamaño de fuente de la descripción"
        value={settings.bannerTextSize || 16}
        onChange={(value) => onUpdateSettings('bannerTextSize', value)}
        min={12}
        max={28}
        step={2}
      />

      <SelectFieldWithHelp
        label="Estilo del botón"
        help="Diseño visual del botón CTA"
        value={settings.bannerButtonStyle || 'primary'}
        onChange={(value) => onUpdateSettings('bannerButtonStyle', value)}
        options={[
          { value: 'primary', label: 'Principal' },
          { value: 'secondary', label: 'Secundario' },
          { value: 'outline', label: 'Contorno' },
          { value: 'ghost', label: 'Fantasma' }
        ]}
      />

      <SwitchFieldWithHelp
        label="Banner fijo (sticky)"
        help="El banner permanece visible al hacer scroll"
        checked={settings.bannerSticky || false}
        onCheckedChange={(checked) => onUpdateSettings('bannerSticky', checked)}
      />

      <SwitchFieldWithHelp
        label="Banner desechable"
        help="Permite cerrar el banner (útil para anuncios)"
        checked={settings.bannerDismissible || false}
        onCheckedChange={(checked) => onUpdateSettings('bannerDismissible', checked)}
      />
    </div>
  );

  // Gallery Options (10+ additional options)
  const renderGalleryOptions = () => (
    <div className="space-y-3 mt-6">
      <h5 className="text-xs font-medium text-muted-foreground uppercase border-t pt-3">
        Opciones de Galería
      </h5>
      
      <SelectFieldWithHelp
        label="Diseño de galería"
        help="Tipo de layout para mostrar las imágenes"
        value={settings.galleryLayout || 'grid'}
        onChange={(value) => onUpdateSettings('galleryLayout', value)}
        options={[
          { value: 'grid', label: 'Cuadrícula regular' },
          { value: 'masonry', label: 'Masonry (Pinterest)' },
          { value: 'justified', label: 'Justificado' },
          { value: 'carousel', label: 'Carrusel' },
          { value: 'slider', label: 'Slider pantalla completa' }
        ]}
      />

      <SliderFieldWithHelp
        label="Columnas (Desktop)"
        help="Número de columnas en la galería"
        value={settings.galleryColumns || 4}
        onChange={(value) => onUpdateSettings('galleryColumns', value)}
        min={2}
        max={8}
        step={1}
      />

      <SliderFieldWithHelp
        label="Columnas (Tablet)"
        help="Número de columnas en tablets"
        value={settings.galleryColumnsTablet || 3}
        onChange={(value) => onUpdateSettings('galleryColumnsTablet', value)}
        min={2}
        max={6}
        step={1}
      />

      <SliderFieldWithHelp
        label="Columnas (Móvil)"
        help="Número de columnas en móviles"
        value={settings.galleryColumnsMobile || 2}
        onChange={(value) => onUpdateSettings('galleryColumnsMobile', value)}
        min={1}
        max={3}
        step={1}
      />

      <SliderFieldWithHelp
        label="Espaciado entre imágenes"
        help="Espacio entre imágenes en píxeles"
        value={settings.galleryGap || 16}
        onChange={(value) => onUpdateSettings('galleryGap', value)}
        min={0}
        max={48}
        step={4}
      />

      <SelectFieldWithHelp
        label="Relación de aspecto"
        help="Proporción de las imágenes en la galería"
        value={settings.galleryAspectRatio || 'auto'}
        onChange={(value) => onUpdateSettings('galleryAspectRatio', value)}
        options={[
          { value: 'auto', label: 'Automático (original)' },
          { value: '1/1', label: 'Cuadrado (1:1)' },
          { value: '4/3', label: 'Estándar (4:3)' },
          { value: '16/9', label: 'Widescreen (16:9)' },
          { value: '3/2', label: 'Fotografía (3:2)' }
        ]}
      />

      <SwitchFieldWithHelp
        label="Lightbox"
        help="Abrir imágenes en vista ampliada al hacer clic"
        checked={settings.galleryLightbox !== false}
        onCheckedChange={(checked) => onUpdateSettings('galleryLightbox', checked)}
      />

      <SwitchFieldWithHelp
        label="Lazy loading"
        help="Cargar imágenes solo cuando sean visibles"
        checked={settings.galleryLazyLoad !== false}
        onCheckedChange={(checked) => onUpdateSettings('galleryLazyLoad', checked)}
      />

      <SwitchFieldWithHelp
        label="Mostrar captions"
        help="Mostrar título/descripción al pasar el mouse"
        checked={settings.galleryShowCaptions || false}
        onCheckedChange={(checked) => onUpdateSettings('galleryShowCaptions', checked)}
      />

      <SelectFieldWithHelp
        label="Efecto hover"
        help="Efecto visual al pasar el mouse sobre imágenes"
        value={settings.galleryHoverEffect || 'zoom'}
        onChange={(value) => onUpdateSettings('galleryHoverEffect', value)}
        options={[
          { value: 'none', label: 'Ninguno' },
          { value: 'zoom', label: 'Zoom' },
          { value: 'overlay', label: 'Overlay oscuro' },
          { value: 'lift', label: 'Elevar' },
          { value: 'blur', label: 'Desenfocar fondo' }
        ]}
      />

      <SwitchFieldWithHelp
        label="Filtro de categorías"
        help="Permitir filtrar imágenes por categoría"
        checked={settings.galleryFilter || false}
        onCheckedChange={(checked) => onUpdateSettings('galleryFilter', checked)}
      />

      <SwitchFieldWithHelp
        label="Botón cargar más"
        help="Cargar imágenes de forma paginada"
        checked={settings.galleryLoadMore || false}
        onCheckedChange={(checked) => onUpdateSettings('galleryLoadMore', checked)}
      />
    </div>
  );

  // Text Section Options (8+ additional options)
  const renderTextOptions = () => (
    <div className="space-y-3 mt-6">
      <h5 className="text-xs font-medium text-muted-foreground uppercase border-t pt-3">
        Opciones de Sección de Texto
      </h5>
      
      <SelectFieldWithHelp
        label="Ancho del contenido"
        help="Ancho máximo del texto"
        value={settings.textMaxWidth || 'container'}
        onChange={(value) => onUpdateSettings('textMaxWidth', value)}
        options={[
          { value: 'full', label: 'Ancho completo' },
          { value: 'container', label: 'Contenedor (80%)' },
          { value: 'narrow', label: 'Estrecho (60%)' },
          { value: 'xs', label: 'Extra estrecho (40%)' }
        ]}
      />

      <SliderFieldWithHelp
        label="Tamaño de fuente base"
        help="Tamaño de fuente del texto principal"
        value={settings.textFontSize || 16}
        onChange={(value) => onUpdateSettings('textFontSize', value)}
        min={12}
        max={24}
        step={1}
      />

      <SliderFieldWithHelp
        label="Altura de línea"
        help="Espaciado vertical entre líneas"
        value={settings.textLineHeight || 1.6}
        onChange={(value) => onUpdateSettings('textLineHeight', value)}
        min={1.2}
        max={2.5}
        step={0.1}
      />

      <SelectFieldWithHelp
        label="Alineación de texto"
        help="Alineación horizontal del texto"
        value={settings.textAlign || 'left'}
        onChange={(value) => onUpdateSettings('textAlign', value)}
        options={[
          { value: 'left', label: 'Izquierda' },
          { value: 'center', label: 'Centro' },
          { value: 'right', label: 'Derecha' },
          { value: 'justify', label: 'Justificado' }
        ]}
      />

      <SwitchFieldWithHelp
        label="Formato enriquecido (HTML)"
        help="Permitir formato HTML en el texto"
        checked={settings.textRichFormat || false}
        onCheckedChange={(checked) => onUpdateSettings('textRichFormat', checked)}
      />

      <SwitchFieldWithHelp
        label="Columnas de texto"
        help="Dividir texto en múltiples columnas (estilo periódico)"
        checked={settings.textColumns || false}
        onCheckedChange={(checked) => onUpdateSettings('textColumns', checked)}
      />

      <SliderFieldWithHelp
        label="Número de columnas"
        help="Cuántas columnas usar (si está activado)"
        value={settings.textColumnsCount || 2}
        onChange={(value) => onUpdateSettings('textColumnsCount', value)}
        min={2}
        max={4}
        step={1}
      />

      <SwitchFieldWithHelp
        label="Letra capital (drop cap)"
        help="Primera letra grande estilo revista"
        checked={settings.textDropCap || false}
        onCheckedChange={(checked) => onUpdateSettings('textDropCap', checked)}
      />
    </div>
  );
  
  return (
    <div className="space-y-6">
      <h4 className="font-semibold text-sm border-b pb-2">Opciones Avanzadas (40+)</h4>
      
      {/* Layout & Display Options (10 options) */}
      <div className="space-y-3">
        <h5 className="text-xs font-medium text-muted-foreground uppercase">Diseño y Visualización</h5>
        
        <SelectFieldWithHelp
          label="Ancho del contenedor"
          help="Define el ancho máximo del contenido"
          value={settings.containerWidth || 'container'}
          onChange={(value) => onUpdateSettings('containerWidth', value)}
          options={[
            { value: 'full', label: 'Ancho completo (100%)' },
            { value: 'wide', label: 'Ancho amplio (90%)' },
            { value: 'container', label: 'Contenedor (80%)' },
            { value: 'narrow', label: 'Estrecho (60%)' }
          ]}
        />

        <SliderFieldWithHelp
          label="Padding superior e inferior"
          help="Espacio interno vertical en píxeles"
          value={settings.paddingY || 40}
          onChange={(value) => onUpdateSettings('paddingY', value)}
          min={0}
          max={200}
          step={8}
        />

        <SliderFieldWithHelp
          label="Padding lateral"
          help="Espacio interno horizontal en píxeles"
          value={settings.paddingX || 20}
          onChange={(value) => onUpdateSettings('paddingX', value)}
          min={0}
          max={100}
          step={4}
        />

        <SliderFieldWithHelp
          label="Margen superior"
          help="Espacio externo superior en píxeles"
          value={settings.marginTop || 0}
          onChange={(value) => onUpdateSettings('marginTop', value)}
          min={0}
          max={200}
          step={8}
        />

        <SliderFieldWithHelp
          label="Margen inferior"
          help="Espacio externo inferior en píxeles"
          value={settings.marginBottom || 0}
          onChange={(value) => onUpdateSettings('marginBottom', value)}
          min={0}
          max={200}
          step={8}
        />

        <SelectFieldWithHelp
          label="Alineación del contenido"
          help="Alineación horizontal del contenido dentro de la sección"
          value={settings.contentAlignment || 'center'}
          onChange={(value) => onUpdateSettings('contentAlignment', value)}
          options={[
            { value: 'left', label: 'Izquierda' },
            { value: 'center', label: 'Centro' },
            { value: 'right', label: 'Derecha' }
          ]}
        />

        <SelectFieldWithHelp
          label="Alineación vertical"
          help="Alineación vertical del contenido"
          value={settings.verticalAlignment || 'top'}
          onChange={(value) => onUpdateSettings('verticalAlignment', value)}
          options={[
            { value: 'top', label: 'Superior' },
            { value: 'center', label: 'Centro' },
            { value: 'bottom', label: 'Inferior' }
          ]}
        />

        <SelectFieldWithHelp
          label="Alto mínimo"
          help="Altura mínima de la sección"
          value={settings.minHeight || 'auto'}
          onChange={(value) => onUpdateSettings('minHeight', value)}
          options={[
            { value: 'auto', label: 'Automático' },
            { value: '200px', label: 'Pequeño (200px)' },
            { value: '400px', label: 'Mediano (400px)' },
            { value: '50vh', label: 'Media pantalla (50%)' },
            { value: '70vh', label: 'Grande (70%)' },
            { value: '100vh', label: 'Pantalla completa' }
          ]}
        />

        <SwitchFieldWithHelp
          label="Ocultar en móvil"
          help="No mostrar esta sección en dispositivos móviles"
          checked={settings.hideMobile || false}
          onCheckedChange={(checked) => onUpdateSettings('hideMobile', checked)}
        />

        <SwitchFieldWithHelp
          label="Ocultar en tablet"
          help="No mostrar esta sección en tablets"
          checked={settings.hideTablet || false}
          onCheckedChange={(checked) => onUpdateSettings('hideTablet', checked)}
        />
      </div>

      {/* Background & Colors (8 options) */}
      <div className="space-y-3">
        <h5 className="text-xs font-medium text-muted-foreground uppercase">Fondo y Colores</h5>
        
        <FieldWithHelp
          label="Color de fondo"
          help="Color de fondo de la sección (hex, rgb o transparente)"
          value={styles.backgroundColor || ''}
          onChange={(value) => onUpdateStyles('backgroundColor', value)}
          placeholder="#ffffff o transparent"
        />

        <FieldWithHelp
          label="Imagen de fondo (URL)"
          help="URL de la imagen de fondo"
          value={styles.backgroundImage || ''}
          onChange={(value) => onUpdateStyles('backgroundImage', value)}
          placeholder="https://..."
        />

        <SelectFieldWithHelp
          label="Tamaño de fondo"
          help="Cómo se ajusta la imagen de fondo"
          value={styles.backgroundSize || 'cover'}
          onChange={(value) => onUpdateStyles('backgroundSize', value)}
          options={[
            { value: 'cover', label: 'Cubrir' },
            { value: 'contain', label: 'Contener' },
            { value: 'auto', label: 'Tamaño original' }
          ]}
        />

        <SelectFieldWithHelp
          label="Posición de fondo"
          help="Posición de la imagen de fondo"
          value={styles.backgroundPosition || 'center'}
          onChange={(value) => onUpdateStyles('backgroundPosition', value)}
          options={[
            { value: 'center', label: 'Centro' },
            { value: 'top', label: 'Superior' },
            { value: 'bottom', label: 'Inferior' },
            { value: 'left', label: 'Izquierda' },
            { value: 'right', label: 'Derecha' }
          ]}
        />

        <SwitchFieldWithHelp
          label="Fondo fijo (parallax)"
          help="La imagen de fondo permanece fija al hacer scroll"
          checked={styles.backgroundAttachment === 'fixed'}
          onCheckedChange={(checked) => onUpdateStyles('backgroundAttachment', checked ? 'fixed' : 'scroll')}
        />

        <SliderFieldWithHelp
          label="Opacidad del fondo"
          help="Transparencia del fondo (0-100%)"
          value={styles.backgroundOpacity || 100}
          onChange={(value) => onUpdateStyles('backgroundOpacity', value)}
          min={0}
          max={100}
          step={5}
        />

        <FieldWithHelp
          label="Color del texto"
          help="Color predeterminado del texto en esta sección"
          value={styles.textColor || ''}
          onChange={(value) => onUpdateStyles('textColor', value)}
          placeholder="#000000"
        />

        <FieldWithHelp
          label="Color de overlay"
          help="Capa de color sobre el fondo (útil para mejorar legibilidad)"
          value={styles.overlayColor || ''}
          onChange={(value) => onUpdateStyles('overlayColor', value)}
          placeholder="rgba(0,0,0,0.5)"
        />
      </div>

      {/* Typography (6 options) */}
      <div className="space-y-3">
        <h5 className="text-xs font-medium text-muted-foreground uppercase">Tipografía</h5>
        
        <SelectFieldWithHelp
          label="Familia de fuente"
          help="Fuente tipográfica para el texto"
          value={styles.fontFamily || 'inherit'}
          onChange={(value) => onUpdateStyles('fontFamily', value)}
          options={[
            { value: 'inherit', label: 'Predeterminada' },
            { value: 'system-ui', label: 'Sistema' },
            { value: 'serif', label: 'Serif' },
            { value: 'sans-serif', label: 'Sans-serif' },
            { value: 'monospace', label: 'Monoespaciada' }
          ]}
        />

        <SliderFieldWithHelp
          label="Tamaño base de fuente"
          help="Tamaño del texto en píxeles"
          value={styles.fontSize || 16}
          onChange={(value) => onUpdateStyles('fontSize', value)}
          min={12}
          max={32}
          step={1}
        />

        <SliderFieldWithHelp
          label="Altura de línea"
          help="Espaciado entre líneas de texto"
          value={styles.lineHeight || 1.5}
          onChange={(value) => onUpdateStyles('lineHeight', value)}
          min={1}
          max={2.5}
          step={0.1}
        />

        <SelectFieldWithHelp
          label="Peso de fuente"
          help="Grosor de la fuente"
          value={styles.fontWeight || 'normal'}
          onChange={(value) => onUpdateStyles('fontWeight', value)}
          options={[
            { value: '300', label: 'Ligera' },
            { value: 'normal', label: 'Normal' },
            { value: '500', label: 'Media' },
            { value: '600', label: 'Semi-negrita' },
            { value: 'bold', label: 'Negrita' }
          ]}
        />

        <SelectFieldWithHelp
          label="Alineación de texto"
          help="Alineación horizontal del texto"
          value={styles.textAlign || 'left'}
          onChange={(value) => onUpdateStyles('textAlign', value)}
          options={[
            { value: 'left', label: 'Izquierda' },
            { value: 'center', label: 'Centro' },
            { value: 'right', label: 'Derecha' },
            { value: 'justify', label: 'Justificado' }
          ]}
        />

        <SliderFieldWithHelp
          label="Espaciado entre letras"
          help="Espacio adicional entre caracteres (en píxeles)"
          value={styles.letterSpacing || 0}
          onChange={(value) => onUpdateStyles('letterSpacing', value)}
          min={-2}
          max={10}
          step={0.5}
        />
      </div>

      {/* Borders & Shadows (6 options) */}
      <div className="space-y-3">
        <h5 className="text-xs font-medium text-muted-foreground uppercase">Bordes y Sombras</h5>
        
        <SelectFieldWithHelp
          label="Radio de bordes"
          help="Redondeo de las esquinas"
          value={styles.borderRadius || '0'}
          onChange={(value) => onUpdateStyles('borderRadius', value)}
          options={[
            { value: '0', label: 'Sin redondeo' },
            { value: '4px', label: 'Pequeño (4px)' },
            { value: '8px', label: 'Mediano (8px)' },
            { value: '16px', label: 'Grande (16px)' },
            { value: '24px', label: 'Muy grande (24px)' },
            { value: '50%', label: 'Circular' }
          ]}
        />

        <SliderFieldWithHelp
          label="Grosor del borde"
          help="Ancho del borde en píxeles"
          value={styles.borderWidth || 0}
          onChange={(value) => onUpdateStyles('borderWidth', value)}
          min={0}
          max={10}
          step={1}
        />

        <FieldWithHelp
          label="Color del borde"
          help="Color del borde (hex o rgb)"
          value={styles.borderColor || ''}
          onChange={(value) => onUpdateStyles('borderColor', value)}
          placeholder="#e5e5e5"
        />

        <SelectFieldWithHelp
          label="Estilo del borde"
          help="Tipo de línea del borde"
          value={styles.borderStyle || 'solid'}
          onChange={(value) => onUpdateStyles('borderStyle', value)}
          options={[
            { value: 'none', label: 'Sin borde' },
            { value: 'solid', label: 'Sólido' },
            { value: 'dashed', label: 'Discontinuo' },
            { value: 'dotted', label: 'Punteado' }
          ]}
        />

        <SelectFieldWithHelp
          label="Sombra"
          help="Efecto de sombra para la sección"
          value={styles.boxShadow || 'none'}
          onChange={(value) => onUpdateStyles('boxShadow', value)}
          options={[
            { value: 'none', label: 'Sin sombra' },
            { value: '0 1px 3px rgba(0,0,0,0.12)', label: 'Pequeña' },
            { value: '0 4px 6px rgba(0,0,0,0.1)', label: 'Mediana' },
            { value: '0 10px 25px rgba(0,0,0,0.15)', label: 'Grande' },
            { value: '0 20px 40px rgba(0,0,0,0.2)', label: 'Muy grande' }
          ]}
        />

        <SwitchFieldWithHelp
          label="Sombra interna"
          help="Aplicar sombra hacia dentro en lugar de hacia fuera"
          checked={styles.insetShadow || false}
          onCheckedChange={(checked) => onUpdateStyles('insetShadow', checked)}
        />
      </div>

      {/* Animation & Effects (6+ options) */}
      <div className="space-y-3">
        <h5 className="text-xs font-medium text-muted-foreground uppercase">Animaciones y Efectos</h5>
        
        <SelectFieldWithHelp
          label="Animación de entrada"
          help="Efecto al aparecer la sección en pantalla"
          value={settings.animation || 'none'}
          onChange={(value) => onUpdateSettings('animation', value)}
          options={[
            { value: 'none', label: 'Sin animación' },
            { value: 'fade-in', label: 'Aparecer gradualmente' },
            { value: 'slide-up', label: 'Deslizar desde abajo' },
            { value: 'slide-down', label: 'Deslizar desde arriba' },
            { value: 'slide-left', label: 'Deslizar desde izquierda' },
            { value: 'slide-right', label: 'Deslizar desde derecha' },
            { value: 'zoom-in', label: 'Acercar (zoom in)' },
            { value: 'zoom-out', label: 'Alejar (zoom out)' },
            { value: 'rotate', label: 'Rotar' },
            { value: 'flip', label: 'Voltear' }
          ]}
        />

        <SliderFieldWithHelp
          label="Duración de la animación"
          help="Tiempo de la animación en milisegundos"
          value={settings.animationDuration || 600}
          onChange={(value) => onUpdateSettings('animationDuration', value)}
          min={100}
          max={2000}
          step={100}
        />

        <SelectFieldWithHelp
          label="Tipo de transición"
          help="Curva de aceleración de la animación"
          value={settings.animationEasing || 'ease'}
          onChange={(value) => onUpdateSettings('animationEasing', value)}
          options={[
            { value: 'linear', label: 'Lineal' },
            { value: 'ease', label: 'Suave' },
            { value: 'ease-in', label: 'Aceleración' },
            { value: 'ease-out', label: 'Desaceleración' },
            { value: 'ease-in-out', label: 'Suave entrada/salida' },
            { value: 'bounce', label: 'Rebote' }
          ]}
        />

        <SliderFieldWithHelp
          label="Retraso de animación"
          help="Tiempo antes de iniciar la animación (ms)"
          value={settings.animationDelay || 0}
          onChange={(value) => onUpdateSettings('animationDelay', value)}
          min={0}
          max={2000}
          step={100}
        />

        <SwitchFieldWithHelp
          label="Efecto hover"
          help="Aplicar efectos al pasar el mouse sobre la sección"
          checked={settings.enableHover || false}
          onCheckedChange={(checked) => onUpdateSettings('enableHover', checked)}
        />

        <SelectFieldWithHelp
          label="Efecto de parallax"
          help="Movimiento de fondo a diferente velocidad que el scroll"
          value={settings.parallaxEffect || 'none'}
          onChange={(value) => onUpdateSettings('parallaxEffect', value)}
          options={[
            { value: 'none', label: 'Sin parallax' },
            { value: 'slow', label: 'Lento' },
            { value: 'medium', label: 'Medio' },
            { value: 'fast', label: 'Rápido' }
          ]}
        />
      </div>

      {/* Advanced Settings (4+ options) */}
      <div className="space-y-3">
        <h5 className="text-xs font-medium text-muted-foreground uppercase">Configuración Avanzada</h5>
        
        <FieldWithHelp
          label="Clase CSS personalizada"
          help="Clases CSS adicionales para aplicar a la sección"
          value={settings.customClass || ''}
          onChange={(value) => onUpdateSettings('customClass', value)}
          placeholder="mi-clase custom-style"
        />

        <FieldWithHelp
          label="ID único"
          help="Identificador HTML único para la sección (para anclas)"
          value={settings.sectionId || ''}
          onChange={(value) => onUpdateSettings('sectionId', value)}
          placeholder="mi-seccion"
        />

        <TextareaFieldWithHelp
          label="CSS personalizado"
          help="Estilos CSS personalizados para esta sección"
          value={settings.customCSS || ''}
          onChange={(value) => onUpdateSettings('customCSS', value)}
          placeholder=".mi-seccion { ... }"
          rows={4}
        />

        <SwitchFieldWithHelp
          label="Lazy loading"
          help="Cargar el contenido solo cuando sea visible (mejora rendimiento)"
          checked={settings.lazyLoad !== false}
          onCheckedChange={(checked) => onUpdateSettings('lazyLoad', checked)}
        />
      </div>

      {/* Section-Type Specific Options */}
      {renderSectionSpecificOptions()}
    </div>
  );
}
