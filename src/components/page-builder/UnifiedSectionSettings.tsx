/**
 * Unified Section Settings - Consolidated configuration for all section types
 * Eliminates duplicated options and provides clear help text for each setting
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Layout, 
  Type, 
  Palette, 
  Box, 
  Smartphone,
  Sparkles,
  Image as ImageIcon,
  Move,
  Grid3X3,
  Play,
  MousePointer2
} from "lucide-react";

interface UnifiedSectionSettingsProps {
  sectionType: string;
  settings: any;
  styles: any;
  content: any;
  onUpdateSettings: (key: string, value: any) => void;
  onUpdateStyles: (key: string, value: any) => void;
  onUpdateContent: (key: string, value: any) => void;
}

export function UnifiedSectionSettings({
  sectionType,
  settings,
  styles,
  content,
  onUpdateSettings,
  onUpdateStyles,
  onUpdateContent
}: UnifiedSectionSettingsProps) {
  
  // Determine which option categories to show based on section type
  const showImageOptions = ['hero', 'banner', 'image', 'cta'].includes(sectionType);
  const showCarouselOptions = ['products-carousel', 'image-carousel'].includes(sectionType);
  const showTypographyOptions = ['hero', 'text', 'banner', 'cta', 'features'].includes(sectionType);
  const showLayoutGrid = ['features', 'gallery', 'products-carousel'].includes(sectionType);

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={['layout', 'specific']} className="w-full">
        
        {/* SECTION-SPECIFIC OPTIONS - Always show first */}
        <AccordionItem value="specific">
          <AccordionTrigger className="text-sm font-medium">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Opciones de {getSectionTypeName(sectionType)}
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            {renderSectionSpecificOptions(sectionType, settings, content, onUpdateSettings, onUpdateContent)}
          </AccordionContent>
        </AccordionItem>

        {/* LAYOUT & DIMENSIONS */}
        <AccordionItem value="layout">
          <AccordionTrigger className="text-sm font-medium">
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              Diseño y Dimensiones
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <SelectFieldWithHelp
              label="Ancho de la sección"
              help="Determina cuánto espacio horizontal ocupa la sección en la página"
              value={settings.containerWidth || 'container'}
              onChange={(value) => onUpdateSettings('containerWidth', value)}
              options={[
                { value: 'full', label: 'Pantalla completa (100%)' },
                { value: 'wide', label: 'Amplio (90%)' },
                { value: 'container', label: 'Contenedor estándar (80%)' },
                { value: 'narrow', label: 'Estrecho (60%)' }
              ]}
            />

            <SelectFieldWithHelp
              label="Altura de la sección"
              help="Altura mínima que ocupará esta sección"
              value={settings.minHeight || 'auto'}
              onChange={(value) => onUpdateSettings('minHeight', value)}
              options={[
                { value: 'auto', label: 'Automática (según contenido)' },
                { value: '200px', label: 'Pequeña (200px)' },
                { value: '400px', label: 'Mediana (400px)' },
                { value: '50vh', label: 'Media pantalla' },
                { value: '100vh', label: 'Pantalla completa' }
              ]}
            />

            <SliderFieldWithHelp
              label="Espacio interior vertical (Padding)"
              help="Espacio entre el borde de la sección y su contenido, arriba y abajo"
              value={settings.paddingY ?? 40}
              onChange={(value) => onUpdateSettings('paddingY', value)}
              min={0}
              max={200}
              step={8}
            />

            <SliderFieldWithHelp
              label="Espacio interior horizontal (Padding)"
              help="Espacio entre el borde de la sección y su contenido, izquierda y derecha"
              value={settings.paddingX ?? 20}
              onChange={(value) => onUpdateSettings('paddingX', value)}
              min={0}
              max={100}
              step={4}
            />

            <SliderFieldWithHelp
              label="Espacio superior (Margen)"
              help="Espacio exterior que separa esta sección de la anterior"
              value={settings.marginTop ?? 0}
              onChange={(value) => onUpdateSettings('marginTop', value)}
              min={0}
              max={200}
              step={8}
            />

            <SliderFieldWithHelp
              label="Espacio inferior (Margen)"
              help="Espacio exterior que separa esta sección de la siguiente"
              value={settings.marginBottom ?? 0}
              onChange={(value) => onUpdateSettings('marginBottom', value)}
              min={0}
              max={200}
              step={8}
            />

            <SelectFieldWithHelp
              label="Alineación del contenido"
              help="Posición horizontal del contenido dentro de la sección"
              value={settings.contentAlignment || 'center'}
              onChange={(value) => onUpdateSettings('contentAlignment', value)}
              options={[
                { value: 'left', label: 'Izquierda' },
                { value: 'center', label: 'Centro' },
                { value: 'right', label: 'Derecha' }
              ]}
            />
          </AccordionContent>
        </AccordionItem>

        {/* COLORS & BACKGROUND */}
        <AccordionItem value="colors">
          <AccordionTrigger className="text-sm font-medium">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Colores y Fondo
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <ColorFieldWithHelp
              label="Color de fondo"
              help="Color que se muestra detrás del contenido de la sección"
              value={styles.backgroundColor || ''}
              onChange={(value) => onUpdateStyles('backgroundColor', value)}
            />

            <ColorFieldWithHelp
              label="Color del texto"
              help="Color principal para todo el texto de esta sección"
              value={styles.textColor || ''}
              onChange={(value) => onUpdateStyles('textColor', value)}
            />

            {showImageOptions && (
              <>
                <ImageUploadField
                  label="Imagen de fondo"
                  helpText="Imagen que aparece detrás del contenido (se puede combinar con overlay)"
                  value={content.backgroundImage || ''}
                  onChange={(value) => onUpdateContent('backgroundImage', value)}
                />

                <ColorFieldWithHelp
                  label="Color del overlay"
                  help="Capa de color semi-transparente sobre la imagen de fondo para mejorar legibilidad"
                  value={settings.overlayColor || '#000000'}
                  onChange={(value) => onUpdateSettings('overlayColor', value)}
                />

                <SliderFieldWithHelp
                  label="Opacidad del overlay"
                  help="Qué tan visible es la capa de color (0% = invisible, 100% = sólido)"
                  value={settings.overlayOpacity ?? 40}
                  onChange={(value) => onUpdateSettings('overlayOpacity', value)}
                  min={0}
                  max={100}
                  step={5}
                />
              </>
            )}

            <SelectFieldWithHelp
              label="Radio de bordes"
              help="Cuánto se redondean las esquinas de la sección"
              value={styles.borderRadius || 'none'}
              onChange={(value) => onUpdateStyles('borderRadius', value)}
              options={[
                { value: 'none', label: 'Sin redondeo' },
                { value: 'sm', label: 'Pequeño' },
                { value: 'md', label: 'Mediano' },
                { value: 'lg', label: 'Grande' },
                { value: 'xl', label: 'Muy grande' }
              ]}
            />

            <SelectFieldWithHelp
              label="Sombra"
              help="Efecto de sombra que da profundidad a la sección"
              value={styles.boxShadow || 'none'}
              onChange={(value) => onUpdateStyles('boxShadow', value)}
              options={[
                { value: 'none', label: 'Sin sombra' },
                { value: 'sm', label: 'Sutil' },
                { value: 'md', label: 'Mediana' },
                { value: 'lg', label: 'Pronunciada' },
                { value: 'xl', label: 'Muy pronunciada' }
              ]}
            />
          </AccordionContent>
        </AccordionItem>

        {/* TYPOGRAPHY - Only for sections with text */}
        {showTypographyOptions && (
          <AccordionItem value="typography">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Tipografía
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <SliderFieldWithHelp
                label="Tamaño del título"
                help="Tamaño de fuente del título principal de esta sección"
                value={settings.titleSize ?? 32}
                onChange={(value) => onUpdateSettings('titleSize', value)}
                min={16}
                max={96}
                step={4}
              />

              <SliderFieldWithHelp
                label="Tamaño del texto"
                help="Tamaño de fuente para el texto de descripción o contenido"
                value={settings.textSize ?? 16}
                onChange={(value) => onUpdateSettings('textSize', value)}
                min={12}
                max={28}
                step={2}
              />

              <SelectFieldWithHelp
                label="Peso de la fuente del título"
                help="Qué tan gruesas son las letras del título"
                value={settings.titleWeight || 'bold'}
                onChange={(value) => onUpdateSettings('titleWeight', value)}
                options={[
                  { value: 'normal', label: 'Normal' },
                  { value: '500', label: 'Medio' },
                  { value: '600', label: 'Semi-negrita' },
                  { value: 'bold', label: 'Negrita' },
                  { value: '800', label: 'Extra negrita' }
                ]}
              />

              <SelectFieldWithHelp
                label="Alineación del texto"
                help="Posición horizontal del texto"
                value={settings.textAlign || 'center'}
                onChange={(value) => onUpdateSettings('textAlign', value)}
                options={[
                  { value: 'left', label: 'Izquierda' },
                  { value: 'center', label: 'Centro' },
                  { value: 'right', label: 'Derecha' },
                  { value: 'justify', label: 'Justificado' }
                ]}
              />

              <SliderFieldWithHelp
                label="Altura de línea"
                help="Espacio vertical entre líneas de texto (valores mayores = más separación)"
                value={settings.lineHeight ?? 1.5}
                onChange={(value) => onUpdateSettings('lineHeight', value)}
                min={1}
                max={2.5}
                step={0.1}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* GRID LAYOUT - For features, gallery, products */}
        {showLayoutGrid && (
          <AccordionItem value="grid">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <Grid3X3 className="h-4 w-4" />
                Cuadrícula
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <SliderFieldWithHelp
                label="Columnas en escritorio"
                help="Número de elementos por fila en pantallas grandes (computadores)"
                value={settings.columns ?? 3}
                onChange={(value) => onUpdateSettings('columns', value)}
                min={1}
                max={6}
                step={1}
              />

              <SliderFieldWithHelp
                label="Columnas en tablet"
                help="Número de elementos por fila en tablets"
                value={settings.columnsTablet ?? 2}
                onChange={(value) => onUpdateSettings('columnsTablet', value)}
                min={1}
                max={4}
                step={1}
              />

              <SliderFieldWithHelp
                label="Columnas en móvil"
                help="Número de elementos por fila en teléfonos móviles"
                value={settings.columnsMobile ?? 1}
                onChange={(value) => onUpdateSettings('columnsMobile', value)}
                min={1}
                max={2}
                step={1}
              />

              <SliderFieldWithHelp
                label="Espacio entre elementos"
                help="Separación entre cada elemento de la cuadrícula"
                value={settings.gap ?? 24}
                onChange={(value) => onUpdateSettings('gap', value)}
                min={0}
                max={64}
                step={4}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* CAROUSEL OPTIONS - Only for carousel sections */}
        {showCarouselOptions && (
          <AccordionItem value="carousel">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Carrusel y Navegación
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <SwitchFieldWithHelp
                label="Reproducción automática"
                help="El carrusel avanza solo sin necesidad de hacer clic"
                checked={settings.autoplay || false}
                onCheckedChange={(checked) => onUpdateSettings('autoplay', checked)}
              />

              <SliderFieldWithHelp
                label="Velocidad de cambio (segundos)"
                help="Tiempo que permanece cada elemento antes de cambiar al siguiente"
                value={settings.autoplaySpeed ?? 4}
                onChange={(value) => onUpdateSettings('autoplaySpeed', value)}
                min={1}
                max={15}
                step={0.5}
              />

              <SwitchFieldWithHelp
                label="Pausar al pasar el mouse"
                help="Detiene la reproducción automática cuando el cursor está sobre el carrusel"
                checked={settings.pauseOnHover !== false}
                onCheckedChange={(checked) => onUpdateSettings('pauseOnHover', checked)}
              />

              <SwitchFieldWithHelp
                label="Loop infinito"
                help="Al llegar al final, vuelve a empezar desde el principio"
                checked={settings.loop !== false}
                onCheckedChange={(checked) => onUpdateSettings('loop', checked)}
              />

              <SwitchFieldWithHelp
                label="Mostrar flechas"
                help="Botones de anterior/siguiente a los lados del carrusel"
                checked={settings.showArrows !== false}
                onCheckedChange={(checked) => onUpdateSettings('showArrows', checked)}
              />

              <SwitchFieldWithHelp
                label="Mostrar indicadores (puntos)"
                help="Puntos debajo del carrusel que indican la posición actual"
                checked={settings.showDots || false}
                onCheckedChange={(checked) => onUpdateSettings('showDots', checked)}
              />

              <SelectFieldWithHelp
                label="Efecto de transición"
                help="Tipo de animación al cambiar entre elementos"
                value={settings.transition || 'slide'}
                onChange={(value) => onUpdateSettings('transition', value)}
                options={[
                  { value: 'slide', label: 'Deslizar' },
                  { value: 'fade', label: 'Desvanecer' },
                  { value: 'cube', label: 'Cubo 3D' },
                  { value: 'flip', label: 'Voltear' }
                ]}
              />

              <SliderFieldWithHelp
                label="Velocidad de animación (ms)"
                help="Duración de la animación de transición en milisegundos"
                value={settings.transitionSpeed ?? 600}
                onChange={(value) => onUpdateSettings('transitionSpeed', value)}
                min={200}
                max={1500}
                step={100}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* RESPONSIVE */}
        <AccordionItem value="responsive">
          <AccordionTrigger className="text-sm font-medium">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Configuración Móvil
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <SwitchFieldWithHelp
              label="Ocultar en móviles"
              help="Esta sección no se mostrará en teléfonos (pantallas menores a 640px)"
              checked={settings.hideOnMobile || false}
              onCheckedChange={(checked) => onUpdateSettings('hideOnMobile', checked)}
            />

            <SwitchFieldWithHelp
              label="Ocultar en tablets"
              help="Esta sección no se mostrará en tablets (pantallas de 640px a 1024px)"
              checked={settings.hideOnTablet || false}
              onCheckedChange={(checked) => onUpdateSettings('hideOnTablet', checked)}
            />

            <SliderFieldWithHelp
              label="Espacio interior en móvil"
              help="Padding específico cuando se ve desde un teléfono"
              value={settings.mobilePadding ?? 16}
              onChange={(value) => onUpdateSettings('mobilePadding', value)}
              min={0}
              max={60}
              step={4}
            />

            <SliderFieldWithHelp
              label="Tamaño de texto en móvil"
              help="Tamaño de fuente específico para teléfonos (puede ser menor para mejor lectura)"
              value={settings.mobileFontSize ?? 14}
              onChange={(value) => onUpdateSettings('mobileFontSize', value)}
              min={10}
              max={24}
              step={1}
            />
          </AccordionContent>
        </AccordionItem>

        {/* EFFECTS & ANIMATIONS */}
        <AccordionItem value="effects">
          <AccordionTrigger className="text-sm font-medium">
            <div className="flex items-center gap-2">
              <MousePointer2 className="h-4 w-4" />
              Efectos y Animaciones
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <SelectFieldWithHelp
              label="Animación de entrada"
              help="Efecto visual cuando la sección aparece en pantalla al hacer scroll"
              value={settings.animation || 'none'}
              onChange={(value) => onUpdateSettings('animation', value)}
              options={[
                { value: 'none', label: 'Sin animación' },
                { value: 'fade-in', label: 'Aparecer gradualmente' },
                { value: 'slide-up', label: 'Deslizar hacia arriba' },
                { value: 'slide-left', label: 'Deslizar desde izquierda' },
                { value: 'slide-right', label: 'Deslizar desde derecha' },
                { value: 'zoom-in', label: 'Acercar (zoom)' },
                { value: 'bounce', label: 'Rebote' }
              ]}
            />

            <SelectFieldWithHelp
              label="Efecto al pasar el mouse"
              help="Animación que ocurre cuando el cursor está sobre la sección"
              value={settings.hoverEffect || 'none'}
              onChange={(value) => onUpdateSettings('hoverEffect', value)}
              options={[
                { value: 'none', label: 'Sin efecto' },
                { value: 'lift', label: 'Elevar' },
                { value: 'glow', label: 'Resplandor' },
                { value: 'scale', label: 'Agrandar ligeramente' }
              ]}
            />

            <SwitchFieldWithHelp
              label="Efecto parallax"
              help="La imagen de fondo se mueve más lento que el contenido al hacer scroll (efecto de profundidad)"
              checked={settings.parallax || false}
              onCheckedChange={(checked) => onUpdateSettings('parallax', checked)}
            />

            <SliderFieldWithHelp
              label="Opacidad de la sección"
              help="Transparencia general de toda la sección (100% = completamente visible)"
              value={Math.round((styles.opacity ?? 1) * 100)}
              onChange={(value) => onUpdateStyles('opacity', value / 100)}
              min={10}
              max={100}
              step={5}
            />
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
}

// Helper function to get readable section type name
function getSectionTypeName(type: string): string {
  const names: Record<string, string> = {
    'hero': 'Banner Principal (Hero)',
    'text': 'Texto',
    'image': 'Imagen',
    'banner': 'Banner Promocional',
    'cta': 'Llamada a la Acción (CTA)',
    'features': 'Características',
    'gallery': 'Galería de Imágenes',
    'products-carousel': 'Carrusel de Productos',
    'image-carousel': 'Carrusel de Imágenes',
    'accordion': 'Acordeón (FAQ)',
    'pricing': 'Tabla de Precios',
    'testimonials': 'Testimonios',
    'video': 'Video',
    'divider': 'Divisor',
    'spacer': 'Espaciador',
    'newsletter': 'Newsletter',
    'form': 'Formulario',
    'custom-html': 'HTML Personalizado'
  };
  return names[type] || type;
}

// Render section-specific options based on type
function renderSectionSpecificOptions(
  sectionType: string,
  settings: any,
  content: any,
  onUpdateSettings: (key: string, value: any) => void,
  onUpdateContent: (key: string, value: any) => void
) {
  switch (sectionType) {
    case 'hero':
      return (
        <div className="space-y-4">
          <SelectFieldWithHelp
            label="Posición del contenido"
            help="Dónde aparece el texto y botón dentro del banner"
            value={settings.contentPosition || 'center'}
            onChange={(value) => onUpdateSettings('contentPosition', value)}
            options={[
              { value: 'top-left', label: 'Superior izquierda' },
              { value: 'top-center', label: 'Superior centro' },
              { value: 'center-left', label: 'Centro izquierda' },
              { value: 'center', label: 'Centro' },
              { value: 'center-right', label: 'Centro derecha' },
              { value: 'bottom-left', label: 'Inferior izquierda' },
              { value: 'bottom-center', label: 'Inferior centro' }
            ]}
          />

          <SelectFieldWithHelp
            label="Estilo del botón"
            help="Diseño visual del botón de acción principal"
            value={settings.buttonStyle || 'primary'}
            onChange={(value) => onUpdateSettings('buttonStyle', value)}
            options={[
              { value: 'primary', label: 'Principal (relleno de color)' },
              { value: 'secondary', label: 'Secundario' },
              { value: 'outline', label: 'Solo contorno' },
              { value: 'ghost', label: 'Transparente' }
            ]}
          />

          <SelectFieldWithHelp
            label="Tamaño del botón"
            help="Dimensiones del botón de acción"
            value={settings.buttonSize || 'default'}
            onChange={(value) => onUpdateSettings('buttonSize', value)}
            options={[
              { value: 'sm', label: 'Pequeño' },
              { value: 'default', label: 'Normal' },
              { value: 'lg', label: 'Grande' },
              { value: 'xl', label: 'Extra grande' }
            ]}
          />

          <SwitchFieldWithHelp
            label="Pantalla completa"
            help="El banner ocupa toda la altura visible de la pantalla"
            checked={settings.fullHeight || false}
            onCheckedChange={(checked) => onUpdateSettings('fullHeight', checked)}
          />

          <SwitchFieldWithHelp
            label="Video de fondo"
            help="Usar un video en lugar de imagen (la URL debe ser de video)"
            checked={settings.videoBackground || false}
            onCheckedChange={(checked) => onUpdateSettings('videoBackground', checked)}
          />
        </div>
      );

    case 'products-carousel':
      return (
        <div className="space-y-4">
          <SliderFieldWithHelp
            label="Productos por vista (escritorio)"
            help="Cuántos productos se muestran al mismo tiempo en pantallas grandes"
            value={settings.productsPerView ?? 4}
            onChange={(value) => onUpdateSettings('productsPerView', value)}
            min={1}
            max={6}
            step={1}
          />

          <SliderFieldWithHelp
            label="Productos por vista (tablet)"
            help="Cuántos productos se muestran en tablets"
            value={settings.productsPerViewTablet ?? 3}
            onChange={(value) => onUpdateSettings('productsPerViewTablet', value)}
            min={1}
            max={4}
            step={1}
          />

          <SliderFieldWithHelp
            label="Productos por vista (móvil)"
            help="Cuántos productos se muestran en teléfonos"
            value={settings.productsPerViewMobile ?? 1}
            onChange={(value) => onUpdateSettings('productsPerViewMobile', value)}
            min={1}
            max={2}
            step={1}
          />

          <SliderFieldWithHelp
            label="Altura de imagen de producto"
            help="Altura de las imágenes de productos en píxeles"
            value={settings.imageHeight ?? 250}
            onChange={(value) => onUpdateSettings('imageHeight', value)}
            min={150}
            max={500}
            step={25}
          />

          <SelectFieldWithHelp
            label="Fuente de productos"
            help="De dónde se obtienen los productos a mostrar"
            value={settings.productsSource || 'featured'}
            onChange={(value) => onUpdateSettings('productsSource', value)}
            options={[
              { value: 'featured', label: 'Productos destacados' },
              { value: 'recent', label: 'Más recientes' },
              { value: 'bestsellers', label: 'Más vendidos' },
              { value: 'category', label: 'Por categoría específica' }
            ]}
          />

          <SliderFieldWithHelp
            label="Límite de productos"
            help="Número máximo de productos a mostrar en el carrusel"
            value={settings.productsLimit ?? 12}
            onChange={(value) => onUpdateSettings('productsLimit', value)}
            min={4}
            max={24}
            step={2}
          />

          <SwitchFieldWithHelp
            label="Mostrar precio"
            help="Mostrar el precio debajo de cada producto"
            checked={settings.showPrice !== false}
            onCheckedChange={(checked) => onUpdateSettings('showPrice', checked)}
          />

          <SwitchFieldWithHelp
            label="Mostrar botón de compra"
            help="Botón para añadir al carrito directamente desde el carrusel"
            checked={settings.showAddToCart || false}
            onCheckedChange={(checked) => onUpdateSettings('showAddToCart', checked)}
          />
        </div>
      );

    case 'image-carousel':
      return (
        <div className="space-y-4">
          <SliderFieldWithHelp
            label="Imágenes por vista (escritorio)"
            help="Cuántas imágenes se muestran al mismo tiempo en pantallas grandes"
            value={settings.imagesPerView ?? 3}
            onChange={(value) => onUpdateSettings('imagesPerView', value)}
            min={1}
            max={5}
            step={1}
          />

          <SliderFieldWithHelp
            label="Altura de las imágenes"
            help="Altura del carrusel de imágenes en píxeles"
            value={settings.imageHeight ?? 400}
            onChange={(value) => onUpdateSettings('imageHeight', value)}
            min={200}
            max={700}
            step={25}
          />

          <SelectFieldWithHelp
            label="Ajuste de imagen"
            help="Cómo se adaptan las imágenes al espacio disponible"
            value={settings.imageFit || 'cover'}
            onChange={(value) => onUpdateSettings('imageFit', value)}
            options={[
              { value: 'cover', label: 'Cubrir (recorta si es necesario)' },
              { value: 'contain', label: 'Contener (muestra completa)' },
              { value: 'fill', label: 'Estirar para rellenar' }
            ]}
          />

          <SwitchFieldWithHelp
            label="Mostrar descripciones"
            help="Mostrar texto debajo de cada imagen"
            checked={settings.showCaptions || false}
            onCheckedChange={(checked) => onUpdateSettings('showCaptions', checked)}
          />

          <SwitchFieldWithHelp
            label="Abrir en pantalla completa"
            help="Al hacer clic en una imagen se abre en tamaño grande (lightbox)"
            checked={settings.lightbox !== false}
            onCheckedChange={(checked) => onUpdateSettings('lightbox', checked)}
          />
        </div>
      );

    case 'features':
      return (
        <div className="space-y-4">
          <SliderFieldWithHelp
            label="Tamaño de iconos"
            help="Tamaño de los iconos de cada característica en píxeles"
            value={settings.iconSize ?? 48}
            onChange={(value) => onUpdateSettings('iconSize', value)}
            min={24}
            max={96}
            step={8}
          />

          <ColorFieldWithHelp
            label="Color de iconos"
            help="Color de los iconos de las características"
            value={settings.iconColor || ''}
            onChange={(value) => onUpdateSettings('iconColor', value)}
          />

          <SelectFieldWithHelp
            label="Estilo de tarjetas"
            help="Diseño visual de cada tarjeta de característica"
            value={settings.cardStyle || 'default'}
            onChange={(value) => onUpdateSettings('cardStyle', value)}
            options={[
              { value: 'default', label: 'Predeterminado' },
              { value: 'bordered', label: 'Con borde' },
              { value: 'shadowed', label: 'Con sombra' },
              { value: 'filled', label: 'Relleno de color' },
              { value: 'minimal', label: 'Minimalista' }
            ]}
          />

          <SelectFieldWithHelp
            label="Posición del icono"
            help="Dónde se ubica el icono respecto al texto"
            value={settings.iconPosition || 'top'}
            onChange={(value) => onUpdateSettings('iconPosition', value)}
            options={[
              { value: 'top', label: 'Arriba del texto' },
              { value: 'left', label: 'A la izquierda' },
              { value: 'right', label: 'A la derecha' }
            ]}
          />

          <SwitchFieldWithHelp
            label="Efecto al pasar mouse"
            help="Las tarjetas reaccionan cuando el cursor pasa sobre ellas"
            checked={settings.hoverEffect !== false}
            onCheckedChange={(checked) => onUpdateSettings('hoverEffect', checked)}
          />
        </div>
      );

    case 'banner':
    case 'cta':
      return (
        <div className="space-y-4">
          <SelectFieldWithHelp
            label="Ancho del banner"
            help="Cuánto espacio horizontal ocupa el banner"
            value={settings.bannerWidth || 'full'}
            onChange={(value) => onUpdateSettings('bannerWidth', value)}
            options={[
              { value: 'full', label: 'Pantalla completa' },
              { value: 'wide', label: 'Amplio (90%)' },
              { value: 'container', label: 'Contenedor (80%)' },
              { value: 'narrow', label: 'Estrecho (60%)' }
            ]}
          />

          <SliderFieldWithHelp
            label="Altura del banner"
            help="Altura del banner en píxeles"
            value={settings.bannerHeight ?? 300}
            onChange={(value) => onUpdateSettings('bannerHeight', value)}
            min={100}
            max={600}
            step={25}
          />

          <SelectFieldWithHelp
            label="Estilo del botón"
            help="Diseño visual del botón de acción"
            value={settings.buttonStyle || 'primary'}
            onChange={(value) => onUpdateSettings('buttonStyle', value)}
            options={[
              { value: 'primary', label: 'Principal' },
              { value: 'secondary', label: 'Secundario' },
              { value: 'outline', label: 'Solo contorno' },
              { value: 'ghost', label: 'Transparente' }
            ]}
          />

          <SwitchFieldWithHelp
            label="Banner fijo (sticky)"
            help="El banner permanece visible al hacer scroll por la página"
            checked={settings.sticky || false}
            onCheckedChange={(checked) => onUpdateSettings('sticky', checked)}
          />

          <SwitchFieldWithHelp
            label="Permitir cerrar"
            help="El usuario puede cerrar/ocultar el banner (útil para anuncios)"
            checked={settings.dismissible || false}
            onCheckedChange={(checked) => onUpdateSettings('dismissible', checked)}
          />
        </div>
      );

    case 'gallery':
      return (
        <div className="space-y-4">
          <SelectFieldWithHelp
            label="Diseño de galería"
            help="Cómo se organizan las imágenes en la galería"
            value={settings.layout || 'grid'}
            onChange={(value) => onUpdateSettings('layout', value)}
            options={[
              { value: 'grid', label: 'Cuadrícula uniforme' },
              { value: 'masonry', label: 'Masonry (estilo Pinterest)' },
              { value: 'carousel', label: 'Carrusel horizontal' }
            ]}
          />

          <SelectFieldWithHelp
            label="Proporción de imágenes"
            help="Forma de las imágenes en la galería"
            value={settings.aspectRatio || 'auto'}
            onChange={(value) => onUpdateSettings('aspectRatio', value)}
            options={[
              { value: 'auto', label: 'Original (sin recorte)' },
              { value: '1/1', label: 'Cuadradas' },
              { value: '4/3', label: 'Estándar (4:3)' },
              { value: '16/9', label: 'Panorámicas (16:9)' }
            ]}
          />

          <SwitchFieldWithHelp
            label="Ver en pantalla completa"
            help="Al hacer clic en una imagen se abre en grande"
            checked={settings.lightbox !== false}
            onCheckedChange={(checked) => onUpdateSettings('lightbox', checked)}
          />

          <SwitchFieldWithHelp
            label="Mostrar descripciones"
            help="Mostrar título de cada imagen al pasar el mouse"
            checked={settings.showCaptions || false}
            onCheckedChange={(checked) => onUpdateSettings('showCaptions', checked)}
          />

          <SelectFieldWithHelp
            label="Efecto al pasar mouse"
            help="Animación que ocurre al pasar el cursor sobre una imagen"
            value={settings.hoverEffect || 'zoom'}
            onChange={(value) => onUpdateSettings('hoverEffect', value)}
            options={[
              { value: 'none', label: 'Sin efecto' },
              { value: 'zoom', label: 'Acercar (zoom)' },
              { value: 'overlay', label: 'Oscurecer' },
              { value: 'lift', label: 'Elevar' }
            ]}
          />
        </div>
      );

    case 'text':
      return (
        <div className="space-y-4">
          <SelectFieldWithHelp
            label="Ancho del texto"
            help="Ancho máximo del bloque de texto para mejor legibilidad"
            value={settings.maxWidth || 'container'}
            onChange={(value) => onUpdateSettings('maxWidth', value)}
            options={[
              { value: 'full', label: 'Ancho completo' },
              { value: 'container', label: 'Contenedor (recomendado)' },
              { value: 'narrow', label: 'Estrecho (lectura óptima)' }
            ]}
          />

          <SwitchFieldWithHelp
            label="Formato enriquecido"
            help="Permite usar negritas, cursivas, listas y otros formatos HTML"
            checked={settings.richFormat || false}
            onCheckedChange={(checked) => onUpdateSettings('richFormat', checked)}
          />

          <SwitchFieldWithHelp
            label="Letra capital decorativa"
            help="La primera letra del texto aparece grande (estilo revista/periódico)"
            checked={settings.dropCap || false}
            onCheckedChange={(checked) => onUpdateSettings('dropCap', checked)}
          />
        </div>
      );

    case 'spacer':
      return (
        <div className="space-y-4">
          <SliderFieldWithHelp
            label="Altura del espaciador"
            help="Espacio vacío vertical entre secciones en píxeles"
            value={settings.height ?? 60}
            onChange={(value) => onUpdateSettings('height', value)}
            min={20}
            max={300}
            step={10}
          />
        </div>
      );

    case 'divider':
      return (
        <div className="space-y-4">
          <SelectFieldWithHelp
            label="Estilo de línea"
            help="Apariencia visual de la línea divisora"
            value={settings.style || 'solid'}
            onChange={(value) => onUpdateSettings('style', value)}
            options={[
              { value: 'solid', label: 'Línea sólida' },
              { value: 'dashed', label: 'Línea discontinua' },
              { value: 'dotted', label: 'Línea punteada' },
              { value: 'double', label: 'Línea doble' }
            ]}
          />

          <SliderFieldWithHelp
            label="Grosor de línea"
            help="Ancho de la línea divisora en píxeles"
            value={settings.thickness ?? 1}
            onChange={(value) => onUpdateSettings('thickness', value)}
            min={1}
            max={10}
            step={1}
          />

          <ColorFieldWithHelp
            label="Color de la línea"
            help="Color de la línea divisora"
            value={settings.color || ''}
            onChange={(value) => onUpdateSettings('color', value)}
          />

          <SelectFieldWithHelp
            label="Ancho del divisor"
            help="Cuánto de la pantalla ocupa la línea"
            value={settings.width || '100%'}
            onChange={(value) => onUpdateSettings('width', value)}
            options={[
              { value: '100%', label: 'Completo' },
              { value: '80%', label: '80%' },
              { value: '50%', label: '50%' },
              { value: '30%', label: '30%' }
            ]}
          />
        </div>
      );

    default:
      return (
        <p className="text-sm text-muted-foreground">
          Esta sección no tiene opciones específicas adicionales. 
          Usa las categorías de abajo para configurar diseño, colores y efectos.
        </p>
      );
  }
}
