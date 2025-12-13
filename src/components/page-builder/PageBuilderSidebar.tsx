import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { productCarouselTemplates, getCarouselTemplateOptions } from "@/lib/productCarouselTemplates";
import {
  Plus,
  Layout,
  Type,
  Image as ImageIcon,
  Square,
  Grid3X3,
  Star,
  MessageSquare,
  MousePointer,
  Minus,
  Code,
  Video,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Package
} from "lucide-react";

interface SectionTemplate {
  id: string;
  template_name: string;
  template_type: string;
  category: string;
  config: any;
  preview_image?: string;
}

interface PageBuilderSidebarProps {
  selectedSection: any;
  onAddSection: (config: any) => void;
  onUpdateSection: (sectionId: string, updates: any) => void;
}

const sectionTypeIcons: Record<string, React.ReactNode> = {
  'hero': <Layout className="h-4 w-4" />,
  'text': <Type className="h-4 w-4" />,
  'image': <ImageIcon className="h-4 w-4" />,
  'banner': <Square className="h-4 w-4" />,
  'gallery': <Grid3X3 className="h-4 w-4" />,
  'features': <Star className="h-4 w-4" />,
  'testimonials': <MessageSquare className="h-4 w-4" />,
  'cta': <MousePointer className="h-4 w-4" />,
  'divider': <Minus className="h-4 w-4" />,
  'spacer': <Square className="h-4 w-4" />,
  'custom': <Code className="h-4 w-4" />,
  'video': <Video className="h-4 w-4" />,
  'text-image': <Layout className="h-4 w-4" />
};

export function PageBuilderSidebar({ 
  selectedSection, 
  onAddSection, 
  onUpdateSection 
}: PageBuilderSidebarProps) {
  const { t } = useTranslation(['admin', 'common']);
  const [templates, setTemplates] = useState<SectionTemplate[]>([]);
  const [activeTab, setActiveTab] = useState(selectedSection ? 'settings' : 'add');

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedSection) {
      setActiveTab('settings');
    }
  }, [selectedSection]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('page_builder_templates')
        .select('*')
        .eq('is_active', true)
        .order('template_name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      logger.error('Error loading templates:', error);
    }
  };

  const handleAddTemplate = (template: SectionTemplate) => {
    onAddSection({
      type: template.config.type,
      name: template.template_name,
      settings: template.config.settings || {},
      content: template.config.content || {},
      styles: template.config.styles || {}
    });
  };

  const quickAddSections = [
    // Core sections
    { type: 'hero', name: 'Hero Banner', icon: <Layout className="h-5 w-5" />, preview: '🖼️ Imagen grande + título + botón' },
    
    // 10 TIPOS DE CARRUSELES DE PRODUCTOS
    ...productCarouselTemplates.map(template => ({
      type: 'products-carousel',
      name: template.name,
      icon: <Package className="h-5 w-5" />,
      preview: `${template.icon} ${template.description}`,
      carouselTemplate: template.id,
      config: {
        settings: template.settings,
        content: {
          title: template.name,
          subtitle: template.description,
          category: 'all',
          limit: template.settings.itemsPerView * 3
        },
        styles: {
          backgroundColor: '#ffffff',
          padding: 80,
          ...template.styles
        }
      }
    })),
    
    { type: 'image-carousel', name: 'Carrusel de Imágenes', icon: <Grid3X3 className="h-5 w-5" />, preview: '🖼️ [ ← 🖼️ → ]' },
    { type: 'text', name: 'Texto', icon: <Type className="h-5 w-5" />, preview: '📝 Párrafo de texto' },
    { type: 'image', name: 'Imagen', icon: <ImageIcon className="h-5 w-5" />, preview: '🖼️ Imagen simple' },
    { type: 'gallery', name: 'Galería', icon: <Grid3X3 className="h-5 w-5" />, preview: '🖼️🖼️🖼️\n🖼️🖼️🖼️' },
    { type: 'features', name: 'Características', icon: <Star className="h-5 w-5" />, preview: '✨[icon] Título\nDescripción' },
    { type: 'cta', name: 'Llamada a la acción', icon: <MousePointer className="h-5 w-5" />, preview: '📣 Título\n[Botón CTA]' },
    { type: 'banner', name: 'Banner', icon: <Square className="h-5 w-5" />, preview: '🎨 Fondo + Texto + Botón' },
    { type: 'testimonials', name: 'Testimonios', icon: <MessageSquare className="h-5 w-5" />, preview: '💬 "Testimonio"\n- Cliente' },
    { type: 'video', name: 'Video', icon: <Video className="h-5 w-5" />, preview: '▶️ Reproductor de video' },
    { type: 'form', name: 'Formulario', icon: <Type className="h-5 w-5" />, preview: '📋 [____]\n[____]\n[Enviar]' },
    { type: 'accordion', name: 'Acordeón', icon: <AlignLeft className="h-5 w-5" />, preview: '▼ Pregunta 1\n▶ Pregunta 2' },
    { type: 'tabs', name: 'Pestañas', icon: <AlignLeft className="h-5 w-5" />, preview: '[Tab1] [Tab2] [Tab3]\nContenido' },
    { type: 'countdown', name: 'Contador', icon: <Type className="h-5 w-5" />, preview: '⏱️ 5d 12h 30m 45s' },
    { type: 'pricing', name: 'Precios', icon: <Star className="h-5 w-5" />, preview: '💳 Plan\n€99/mes\n✓ Feature' },
    { type: 'team', name: 'Equipo', icon: <Star className="h-5 w-5" />, preview: '👤 Nombre\nPuesto' },
    { type: 'stats', name: 'Estadísticas', icon: <Star className="h-5 w-5" />, preview: '📊 1000+\nClientes' },
    { type: 'newsletter', name: 'Newsletter', icon: <Type className="h-5 w-5" />, preview: '📧 [email] [Suscribir]' },
    { type: 'social', name: 'Redes Sociales', icon: <Star className="h-5 w-5" />, preview: '📱 [f] [t] [i] [in]' },
    
    // NEW: 20+ additional section types
    { type: 'timeline', name: 'Línea de Tiempo', icon: <AlignLeft className="h-5 w-5" />, preview: '📅 ●━━○━━○\n2020 2021 2022' },
    { type: 'logos', name: 'Logos / Marcas', icon: <Grid3X3 className="h-5 w-5" />, preview: '[Logo] [Logo] [Logo]\n[Logo] [Logo] [Logo]' },
    { type: 'faq', name: 'Preguntas Frecuentes', icon: <MessageSquare className="h-5 w-5" />, preview: '❓ Pregunta\n✓ Respuesta' },
    { type: 'map', name: 'Mapa / Ubicación', icon: <Square className="h-5 w-5" />, preview: '🗺️ Mapa interactivo\n📍 Ubicación' },
    { type: 'contact-form', name: 'Formulario de Contacto', icon: <Type className="h-5 w-5" />, preview: '📞 Nombre\n📧 Email\n💬 Mensaje' },
    { type: 'search', name: 'Barra de Búsqueda', icon: <Type className="h-5 w-5" />, preview: '🔍 [Buscar...] 🔎' },
    { type: 'breadcrumbs', name: 'Breadcrumbs', icon: <AlignLeft className="h-5 w-5" />, preview: 'Inicio > Productos > Item' },
    { type: 'progress', name: 'Barra de Progreso', icon: <Minus className="h-5 w-5" />, preview: '[████████░░] 80%' },
    { type: 'alert', name: 'Alerta / Aviso', icon: <MessageSquare className="h-5 w-5" />, preview: '⚠️ Mensaje importante\n[X]' },
    { type: 'quote', name: 'Cita / Quote', icon: <Type className="h-5 w-5" />, preview: '❝ Cita inspiradora ❞\n- Autor' },
    { type: 'code-snippet', name: 'Código / Snippet', icon: <Code className="h-5 w-5" />, preview: '</> code {\n  color: blue;\n}' },
    { type: 'comparison-table', name: 'Tabla Comparativa', icon: <Grid3X3 className="h-5 w-5" />, preview: '│Plan│✓│✗│\n│Pro│✓│✓│' },
    { type: 'before-after', name: 'Antes/Después', icon: <ImageIcon className="h-5 w-5" />, preview: '🖼️ Antes | 🖼️ Después\n    ↔️ Deslizar' },
    { type: 'steps', name: 'Pasos / Proceso', icon: <AlignLeft className="h-5 w-5" />, preview: '① Paso 1\n② Paso 2\n③ Paso 3' },
    { type: 'icon-grid', name: 'Cuadrícula de Iconos', icon: <Grid3X3 className="h-5 w-5" />, preview: '[📦][🚀][💡]\n[🎯][⚡][🔧]' },
    { type: 'blog-posts', name: 'Posts de Blog', icon: <Type className="h-5 w-5" />, preview: '📰 [Post 1] [Post 2]\n[Post 3] [Post 4]' },
    { type: 'portfolio', name: 'Portafolio', icon: <Grid3X3 className="h-5 w-5" />, preview: '🎨 [Proyecto 1]\n[Proyecto 2]' },
    { type: 'interactive-cards', name: 'Tarjetas Interactivas', icon: <Square className="h-5 w-5" />, preview: '🎴 [Hover]\nContenido flip' },
    { type: 'text-columns', name: 'Columnas de Texto', icon: <AlignLeft className="h-5 w-5" />, preview: '[Col 1] [Col 2] [Col 3]\nTexto  Texto  Texto' },
    { type: 'media-text', name: 'Media + Texto', icon: <Layout className="h-5 w-5" />, preview: '[🖼️ Media] | Texto\n              contenido' },
    { type: 'slider-gallery', name: 'Galería Deslizante', icon: <Grid3X3 className="h-5 w-5" />, preview: '🖼️ ← [Galería] →\n• • ○ •' },
    { type: 'awards', name: 'Premios / Logros', icon: <Star className="h-5 w-5" />, preview: '🏆 Premio 2024\n⭐ Certificado' },
    { type: 'partners', name: 'Socios / Partners', icon: <Grid3X3 className="h-5 w-5" />, preview: '🤝 [Partner 1]\n[Partner 2]' },
    { type: 'download', name: 'Descarga / CTA', icon: <MousePointer className="h-5 w-5" />, preview: '📥 Archivo.pdf\n[Descargar]' },
    
    // Utility sections
    { type: 'divider', name: 'Separador', icon: <Minus className="h-5 w-5" />, preview: '━━━━━━━━━━━' },
    { type: 'spacer', name: 'Espaciador', icon: <Square className="h-5 w-5" />, preview: '⬜ Espacio vacío' },
    { type: 'custom', name: 'HTML Personalizado', icon: <Code className="h-5 w-5" />, preview: '</> <div>\nHTML custom\n</div>' }
  ];

  const handleStyleChange = (property: string, value: any) => {
    if (!selectedSection) return;
    
    const newStyles = {
      ...selectedSection.styles,
      [property]: value
    };
    
    onUpdateSection(selectedSection.id, { styles: newStyles });
  };

  const handleSettingsChange = (property: string, value: any) => {
    if (!selectedSection) return;
    
    const newSettings = {
      ...selectedSection.settings,
      [property]: value
    };
    
    onUpdateSection(selectedSection.id, { settings: newSettings });
  };

  const handleContentChange = (property: string, value: any) => {
    if (!selectedSection) return;
    
    const newContent = {
      ...selectedSection.content,
      [property]: value
    };
    
    onUpdateSection(selectedSection.id, { content: newContent });
  };

  return (
    <div className="w-56 lg:w-64 flex-shrink-0 border-l bg-card flex flex-col min-h-0">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start rounded-none border-b px-1 flex-shrink-0 h-9">
          <TabsTrigger value="add" className="text-xs h-7 px-2">
            <Plus className="h-3 w-3 mr-1" />
            Añadir
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs h-7 px-2" disabled={!selectedSection}>
            <Palette className="h-3 w-3 mr-1" />
            Configurar
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 min-h-0">
          <TabsContent value="add" className="m-0 p-2 space-y-3">
            {/* Quick Add Sections */}
            <div>
              <h4 className="font-medium text-xs mb-2 text-muted-foreground uppercase tracking-wide">Añadir Sección</h4>
              <div className="grid grid-cols-2 gap-1">
                {quickAddSections.map((section, index) => (
                  <button
                    key={`${section.type}-${index}`}
                    onClick={() => onAddSection(
                      'config' in section && section.config ? 
                      { type: section.type, name: section.name, ...section.config } :
                      { type: section.type, name: section.name }
                    )}
                    className="group relative flex flex-col items-center gap-1 p-2 rounded border border-dashed hover:border-primary hover:bg-primary/5 transition-colors"
                    title={section.preview}
                  >
                    {section.icon}
                    <span className="text-[10px] text-center leading-tight line-clamp-2">{section.name}</span>
                    
                    {/* Preview tooltip on hover */}
                    <div className="absolute left-full ml-2 top-0 z-50 hidden group-hover:block bg-popover text-popover-foreground rounded-md border p-2 shadow-md min-w-[150px] max-w-[200px]">
                      <p className="text-[9px] font-medium mb-1">{section.name}</p>
                      <pre className="text-[8px] whitespace-pre-wrap leading-tight font-mono text-muted-foreground">
                        {section.preview}
                      </pre>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Templates */}
            {templates.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-3">Plantillas</h4>
                <div className="space-y-2">
                  {templates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleAddTemplate(template)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                    >
                      {sectionTypeIcons[template.category] || <Layout className="h-4 w-4" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{template.template_name}</p>
                        <p className="text-xs text-muted-foreground">{template.category}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="m-0 p-3 space-y-4">
            {selectedSection ? (
              <>
                {/* Section Info */}
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tipo:</span>
                    <span className="text-xs font-medium capitalize">{selectedSection.section_type.replace('-', ' ')}</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre</Label>
                    <Input
                      value={selectedSection.section_name}
                      onChange={(e) => onUpdateSection(selectedSection.id, { section_name: e.target.value })}
                      placeholder="Nombre de la sección"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Visible</Label>
                    <Switch
                      checked={selectedSection.is_visible}
                      onCheckedChange={(checked) => onUpdateSection(selectedSection.id, { is_visible: checked })}
                    />
                  </div>
                </div>

                {/* Quick Content Edit */}
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase">Contenido Rápido</h4>
                  
                  {/* Title - Common to most sections */}
                  {['hero', 'text', 'banner', 'cta', 'features', 'gallery', 'products-carousel', 'image-carousel'].includes(selectedSection.section_type) && (
                    <div className="space-y-1">
                      <Label className="text-xs">Título</Label>
                      <Input
                        value={selectedSection.content?.title || ''}
                        onChange={(e) => handleContentChange('title', e.target.value)}
                        placeholder="Título de la sección"
                        className="h-8 text-xs"
                      />
                    </div>
                  )}

                  {/* Subtitle for hero/banner */}
                  {['hero', 'banner', 'cta'].includes(selectedSection.section_type) && (
                    <div className="space-y-1">
                      <Label className="text-xs">Subtítulo / Descripción</Label>
                      <textarea
                        value={selectedSection.content?.subtitle || selectedSection.content?.description || ''}
                        onChange={(e) => handleContentChange(
                          selectedSection.section_type === 'hero' ? 'subtitle' : 'description', 
                          e.target.value
                        )}
                        placeholder="Texto descriptivo..."
                        className="w-full min-h-[60px] px-2 py-1.5 text-xs rounded-md border bg-background resize-none"
                      />
                    </div>
                  )}

                  {/* Text content */}
                  {selectedSection.section_type === 'text' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Contenido</Label>
                      <textarea
                        value={selectedSection.content?.text || ''}
                        onChange={(e) => handleContentChange('text', e.target.value)}
                        placeholder="Escribe tu texto..."
                        className="w-full min-h-[80px] px-2 py-1.5 text-xs rounded-md border bg-background resize-none"
                      />
                    </div>
                  )}

                  {/* Button text for CTA sections */}
                  {['hero', 'banner', 'cta'].includes(selectedSection.section_type) && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Texto botón</Label>
                        <Input
                          value={selectedSection.content?.buttonText || ''}
                          onChange={(e) => handleContentChange('buttonText', e.target.value)}
                          placeholder="Ver más"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">URL botón</Label>
                        <Input
                          value={selectedSection.content?.buttonUrl || ''}
                          onChange={(e) => handleContentChange('buttonUrl', e.target.value)}
                          placeholder="/pagina"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Spacer height */}
                  {selectedSection.section_type === 'spacer' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Altura: {selectedSection.settings?.height || 60}px</Label>
                      <Slider
                        value={[selectedSection.settings?.height || 60]}
                        onValueChange={([value]) => handleSettingsChange('height', value)}
                        min={20}
                        max={200}
                        step={10}
                      />
                    </div>
                  )}
                </div>

                {/* Quick Styles */}
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase">Estilos Rápidos</h4>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Fondo</Label>
                      <div className="flex gap-1">
                        <Input
                          type="color"
                          value={selectedSection.styles?.backgroundColor || '#ffffff'}
                          onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                          className="w-8 h-8 p-0.5 cursor-pointer"
                        />
                        <Input
                          value={selectedSection.styles?.backgroundColor || ''}
                          onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                          placeholder="#fff"
                          className="h-8 text-xs flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Texto</Label>
                      <div className="flex gap-1">
                        <Input
                          type="color"
                          value={selectedSection.styles?.textColor || '#000000'}
                          onChange={(e) => handleStyleChange('textColor', e.target.value)}
                          className="w-8 h-8 p-0.5 cursor-pointer"
                        />
                        <Input
                          value={selectedSection.styles?.textColor || ''}
                          onChange={(e) => handleStyleChange('textColor', e.target.value)}
                          placeholder="#000"
                          className="h-8 text-xs flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Padding: {selectedSection.styles?.padding || 40}px</Label>
                    <Slider
                      value={[selectedSection.styles?.padding || 40]}
                      onValueChange={([value]) => handleStyleChange('padding', value)}
                      min={0}
                      max={120}
                      step={8}
                    />
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant={selectedSection.styles?.textAlign === 'left' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStyleChange('textAlign', 'left')}
                      className="flex-1 h-8"
                    >
                      <AlignLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant={selectedSection.styles?.textAlign === 'center' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStyleChange('textAlign', 'center')}
                      className="flex-1 h-8"
                    >
                      <AlignCenter className="h-3 w-3" />
                    </Button>
                    <Button
                      variant={selectedSection.styles?.textAlign === 'right' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStyleChange('textAlign', 'right')}
                      className="flex-1 h-8"
                    >
                      <AlignRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Info about advanced settings */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Para más opciones (tipografía, animaciones, carrusel, responsive, etc.):
                  </p>
                  <p className="text-xs font-medium text-primary">
                    Haz doble clic en la sección o usa el botón ✏️ Editar
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Layout className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Selecciona una sección para ver sus opciones</p>
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
