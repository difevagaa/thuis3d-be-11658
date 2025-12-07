/**
 * Enhanced Section Options - Provides 30+ configuration options for each section type
 * This component is used by SectionEditor to render comprehensive customization options
 */

import { 
  FieldWithHelp, 
  SwitchFieldWithHelp, 
  SelectFieldWithHelp, 
  SliderFieldWithHelp,
  TextareaFieldWithHelp 
} from "./FieldWithHelp";

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
  
  return (
    <div className="space-y-6">
      <h4 className="font-semibold text-sm border-b pb-2">Opciones Avanzadas</h4>
      
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
    </div>
  );
}
