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
  Underline
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
    { type: 'hero', name: 'Hero Banner', icon: <Layout className="h-5 w-5" /> },
    { type: 'products-carousel', name: 'Carrusel de Productos', icon: <Square className="h-5 w-5" /> },
    { type: 'image-carousel', name: 'Carrusel de Imágenes', icon: <Grid3X3 className="h-5 w-5" /> },
    { type: 'text', name: 'Texto', icon: <Type className="h-5 w-5" /> },
    { type: 'image', name: 'Imagen', icon: <ImageIcon className="h-5 w-5" /> },
    { type: 'gallery', name: 'Galería', icon: <Grid3X3 className="h-5 w-5" /> },
    { type: 'features', name: 'Características', icon: <Star className="h-5 w-5" /> },
    { type: 'cta', name: 'Llamada a la acción', icon: <MousePointer className="h-5 w-5" /> },
    { type: 'banner', name: 'Banner', icon: <Square className="h-5 w-5" /> },
    { type: 'testimonials', name: 'Testimonios', icon: <MessageSquare className="h-5 w-5" /> },
    { type: 'video', name: 'Video', icon: <Video className="h-5 w-5" /> },
    { type: 'form', name: 'Formulario', icon: <Type className="h-5 w-5" /> },
    { type: 'accordion', name: 'Acordeón', icon: <AlignLeft className="h-5 w-5" /> },
    { type: 'tabs', name: 'Pestañas', icon: <AlignLeft className="h-5 w-5" /> },
    { type: 'countdown', name: 'Contador', icon: <Type className="h-5 w-5" /> },
    { type: 'pricing', name: 'Precios', icon: <Star className="h-5 w-5" /> },
    { type: 'team', name: 'Equipo', icon: <Star className="h-5 w-5" /> },
    { type: 'stats', name: 'Estadísticas', icon: <Star className="h-5 w-5" /> },
    { type: 'newsletter', name: 'Newsletter', icon: <Type className="h-5 w-5" /> },
    { type: 'social', name: 'Redes Sociales', icon: <Star className="h-5 w-5" /> },
    { type: 'divider', name: 'Separador', icon: <Minus className="h-5 w-5" /> },
    { type: 'spacer', name: 'Espaciador', icon: <Square className="h-5 w-5" /> },
    { type: 'custom', name: 'HTML Personalizado', icon: <Code className="h-5 w-5" /> }
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
    <div className="w-80 border-l bg-card flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b px-2">
          <TabsTrigger value="add" className="text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Añadir
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs" disabled={!selectedSection}>
            <Palette className="h-3 w-3 mr-1" />
            Configurar
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="add" className="m-0 p-4 space-y-4">
            {/* Quick Add Sections */}
            <div>
              <h4 className="font-medium text-sm mb-3">Añadir Sección</h4>
              <div className="grid grid-cols-2 gap-2">
                {quickAddSections.map(section => (
                  <button
                    key={section.type}
                    onClick={() => onAddSection({ type: section.type, name: section.name })}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg border border-dashed hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    {section.icon}
                    <span className="text-xs text-center">{section.name}</span>
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

          <TabsContent value="settings" className="m-0 p-4 space-y-6">
            {selectedSection ? (
              <>
                {/* Section Name */}
                <div className="space-y-2">
                  <Label className="text-xs">Nombre de la sección</Label>
                  <Input
                    value={selectedSection.section_name}
                    onChange={(e) => onUpdateSection(selectedSection.id, { section_name: e.target.value })}
                    placeholder="Nombre"
                  />
                </div>

                {/* Visibility */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Visible</Label>
                  <Switch
                    checked={selectedSection.is_visible}
                    onCheckedChange={(checked) => onUpdateSection(selectedSection.id, { is_visible: checked })}
                  />
                </div>

                {/* Content Settings based on section type */}
                {selectedSection.section_type === 'hero' && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm border-b pb-2">Contenido del Hero</h4>
                    <div className="space-y-2">
                      <Label className="text-xs">Título</Label>
                      <Input
                        value={selectedSection.content?.title || ''}
                        onChange={(e) => handleContentChange('title', e.target.value)}
                        placeholder="Título principal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Subtítulo</Label>
                      <Input
                        value={selectedSection.content?.subtitle || ''}
                        onChange={(e) => handleContentChange('subtitle', e.target.value)}
                        placeholder="Subtítulo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Texto del botón</Label>
                      <Input
                        value={selectedSection.content?.buttonText || ''}
                        onChange={(e) => handleContentChange('buttonText', e.target.value)}
                        placeholder="Llamada a la acción"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">URL del botón</Label>
                      <Input
                        value={selectedSection.content?.buttonUrl || ''}
                        onChange={(e) => handleContentChange('buttonUrl', e.target.value)}
                        placeholder="/productos"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Imagen de fondo (URL)</Label>
                      <Input
                        value={selectedSection.content?.backgroundImage || ''}
                        onChange={(e) => handleContentChange('backgroundImage', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                )}

                {selectedSection.section_type === 'text' && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm border-b pb-2">Contenido de Texto</h4>
                    <div className="space-y-2">
                      <Label className="text-xs">Título</Label>
                      <Input
                        value={selectedSection.content?.title || ''}
                        onChange={(e) => handleContentChange('title', e.target.value)}
                        placeholder="Título"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Contenido</Label>
                      <textarea
                        value={selectedSection.content?.text || ''}
                        onChange={(e) => handleContentChange('text', e.target.value)}
                        placeholder="Escribe tu contenido..."
                        className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border bg-background"
                      />
                    </div>
                  </div>
                )}

                {selectedSection.section_type === 'image' && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm border-b pb-2">Configuración de Imagen</h4>
                    <div className="space-y-2">
                      <Label className="text-xs">URL de la imagen</Label>
                      <Input
                        value={selectedSection.content?.imageUrl || ''}
                        onChange={(e) => handleContentChange('imageUrl', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Texto alternativo</Label>
                      <Input
                        value={selectedSection.content?.altText || ''}
                        onChange={(e) => handleContentChange('altText', e.target.value)}
                        placeholder="Descripción de la imagen"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Enlace (opcional)</Label>
                      <Input
                        value={selectedSection.content?.linkUrl || ''}
                        onChange={(e) => handleContentChange('linkUrl', e.target.value)}
                        placeholder="/productos"
                      />
                    </div>
                  </div>
                )}

                {selectedSection.section_type === 'banner' && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm border-b pb-2">Configuración del Banner</h4>
                    <div className="space-y-2">
                      <Label className="text-xs">Título</Label>
                      <Input
                        value={selectedSection.content?.title || ''}
                        onChange={(e) => handleContentChange('title', e.target.value)}
                        placeholder="Título del banner"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Descripción</Label>
                      <Input
                        value={selectedSection.content?.description || ''}
                        onChange={(e) => handleContentChange('description', e.target.value)}
                        placeholder="Descripción"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Imagen de fondo</Label>
                      <Input
                        value={selectedSection.content?.backgroundImage || ''}
                        onChange={(e) => handleContentChange('backgroundImage', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Texto del botón</Label>
                      <Input
                        value={selectedSection.content?.buttonText || ''}
                        onChange={(e) => handleContentChange('buttonText', e.target.value)}
                        placeholder="Ver más"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">URL del botón</Label>
                      <Input
                        value={selectedSection.content?.buttonUrl || ''}
                        onChange={(e) => handleContentChange('buttonUrl', e.target.value)}
                        placeholder="/ofertas"
                      />
                    </div>
                  </div>
                )}

                {selectedSection.section_type === 'cta' && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm border-b pb-2">Llamada a la Acción</h4>
                    <div className="space-y-2">
                      <Label className="text-xs">Título</Label>
                      <Input
                        value={selectedSection.content?.title || ''}
                        onChange={(e) => handleContentChange('title', e.target.value)}
                        placeholder="¿Listo para empezar?"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Descripción</Label>
                      <Input
                        value={selectedSection.content?.description || ''}
                        onChange={(e) => handleContentChange('description', e.target.value)}
                        placeholder="Descripción breve"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Texto del botón</Label>
                      <Input
                        value={selectedSection.content?.buttonText || ''}
                        onChange={(e) => handleContentChange('buttonText', e.target.value)}
                        placeholder="Contactar"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">URL del botón</Label>
                      <Input
                        value={selectedSection.content?.buttonUrl || ''}
                        onChange={(e) => handleContentChange('buttonUrl', e.target.value)}
                        placeholder="/contacto"
                      />
                    </div>
                  </div>
                )}

                {selectedSection.section_type === 'features' && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm border-b pb-2">Características</h4>
                    <div className="space-y-2">
                      <Label className="text-xs">Título de la sección</Label>
                      <Input
                        value={selectedSection.content?.title || ''}
                        onChange={(e) => handleContentChange('title', e.target.value)}
                        placeholder="Por Qué Elegirnos"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                      Las características individuales se gestionan desde la sección "Características" en Contenido.
                    </div>
                  </div>
                )}

                {selectedSection.section_type === 'spacer' && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm border-b pb-2">Espaciador</h4>
                    <div className="space-y-2">
                      <Label className="text-xs">Altura (px): {selectedSection.settings?.height || 60}</Label>
                      <Slider
                        value={[selectedSection.settings?.height || 60]}
                        onValueChange={([value]) => handleSettingsChange('height', value)}
                        min={20}
                        max={200}
                        step={10}
                      />
                    </div>
                  </div>
                )}

                {/* Common Styles */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm border-b pb-2">Estilos</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Color de fondo</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={selectedSection.styles?.backgroundColor || '#ffffff'}
                        onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                        className="w-12 h-9 p-1"
                      />
                      <Input
                        value={selectedSection.styles?.backgroundColor || ''}
                        onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                        placeholder="#ffffff"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Color de texto</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={selectedSection.styles?.textColor || '#000000'}
                        onChange={(e) => handleStyleChange('textColor', e.target.value)}
                        className="w-12 h-9 p-1"
                      />
                      <Input
                        value={selectedSection.styles?.textColor || ''}
                        onChange={(e) => handleStyleChange('textColor', e.target.value)}
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Padding (px): {selectedSection.styles?.padding || 40}</Label>
                    <Slider
                      value={[selectedSection.styles?.padding || 40]}
                      onValueChange={([value]) => handleStyleChange('padding', value)}
                      min={0}
                      max={120}
                      step={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Alineación del texto</Label>
                    <div className="flex gap-1">
                      <Button
                        variant={selectedSection.styles?.textAlign === 'left' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStyleChange('textAlign', 'left')}
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={selectedSection.styles?.textAlign === 'center' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStyleChange('textAlign', 'center')}
                      >
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={selectedSection.styles?.textAlign === 'right' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStyleChange('textAlign', 'right')}
                      >
                        <AlignRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Ancho completo</Label>
                    <Switch
                      checked={selectedSection.settings?.fullWidth || false}
                      onCheckedChange={(checked) => handleSettingsChange('fullWidth', checked)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Selecciona una sección para editar sus propiedades</p>
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
