import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CarouselSettings } from "./CarouselSettings";
import { URLSelector } from "./URLSelector";
import { AdvancedSectionSettings } from "./AdvancedSectionSettings";
import { SocialMediaSettings } from "./SocialMediaSettings";
import { CounterSettings } from "./CounterSettings";
import { VideoSettings } from "./VideoSettings";
import { 
  Image as ImageIcon, 
  Upload, 
  Link as LinkIcon,
  X,
  Plus
} from "lucide-react";

interface SectionEditorProps {
  section: any;
  onUpdate: (updates: any) => void;
  onClose: () => void;
}

export function SectionEditor({ section, onUpdate, onClose }: SectionEditorProps) {
  const { t } = useTranslation(['admin', 'common']);
  const [localContent, setLocalContent] = useState(section.content || {});
  const [localSettings, setLocalSettings] = useState(section.settings || {});
  const [localStyles, setLocalStyles] = useState(section.styles || {});

  const handleSave = () => {
    onUpdate({
      content: localContent,
      settings: localSettings,
      styles: localStyles
    });
    onClose();
  };

  const updateContent = (key: string, value: any) => {
    setLocalContent(prev => ({ ...prev, [key]: value }));
  };

  const updateSettings = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateStyles = (key: string, value: any) => {
    setLocalStyles(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Editar: {section.section_name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="content" className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
            <TabsTrigger value="content">Contenido</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
            <TabsTrigger value="styles">Estilos</TabsTrigger>
            <TabsTrigger value="advanced">Avanzado</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto min-h-0 mt-4">
            <TabsContent value="content" className="space-y-4 mt-0">
            {/* Content fields based on section type */}
            {section.section_type === 'hero' && (
              <>
                <div className="space-y-2">
                  <Label>Título principal</Label>
                  <Input
                    value={localContent.title || ''}
                    onChange={(e) => updateContent('title', e.target.value)}
                    placeholder="Tu título aquí..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo</Label>
                  <Textarea
                    value={localContent.subtitle || ''}
                    onChange={(e) => updateContent('subtitle', e.target.value)}
                    placeholder="Descripción o subtítulo..."
                    rows={3}
                  />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Texto del botón</Label>
                    <Input
                      value={localContent.buttonText || ''}
                      onChange={(e) => updateContent('buttonText', e.target.value)}
                      placeholder="Ver más"
                    />
                  </div>
                  <URLSelector
                    value={localContent.buttonUrl || ''}
                    onChange={(value) => updateContent('buttonUrl', value)}
                    label="URL del botón"
                    placeholder="/productos"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Imagen de fondo (URL)</Label>
                  <Input
                    value={localContent.backgroundImage || ''}
                    onChange={(e) => updateContent('backgroundImage', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </>
            )}

            {section.section_type === 'text' && (
              <>
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={localContent.title || ''}
                    onChange={(e) => updateContent('title', e.target.value)}
                    placeholder="Título de la sección"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contenido</Label>
                  <Textarea
                    value={localContent.text || ''}
                    onChange={(e) => updateContent('text', e.target.value)}
                    placeholder="Escribe tu contenido aquí..."
                    rows={6}
                  />
                </div>
              </>
            )}

            {section.section_type === 'image' && (
              <>
                <div className="space-y-2">
                  <Label>URL de la imagen</Label>
                  <Input
                    value={localContent.imageUrl || ''}
                    onChange={(e) => updateContent('imageUrl', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Texto alternativo</Label>
                  <Input
                    value={localContent.altText || ''}
                    onChange={(e) => updateContent('altText', e.target.value)}
                    placeholder="Descripción de la imagen"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Enlace (opcional)</Label>
                  <Input
                    value={localContent.linkUrl || ''}
                    onChange={(e) => updateContent('linkUrl', e.target.value)}
                    placeholder="/productos"
                  />
                </div>
                {localContent.imageUrl && (
                  <div className="mt-4">
                    <Label className="text-xs text-muted-foreground">Vista previa</Label>
                    <img 
                      src={localContent.imageUrl} 
                      alt="Preview" 
                      className="mt-2 max-h-[200px] rounded border"
                    />
                  </div>
                )}
              </>
            )}

            {section.section_type === 'banner' && (
              <>
                <div className="space-y-2">
                  <Label>Título del banner</Label>
                  <Input
                    value={localContent.title || ''}
                    onChange={(e) => updateContent('title', e.target.value)}
                    placeholder="Oferta especial"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={localContent.description || ''}
                    onChange={(e) => updateContent('description', e.target.value)}
                    placeholder="Descripción del banner..."
                    rows={2}
                  />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Texto del botón</Label>
                    <Input
                      value={localContent.buttonText || ''}
                      onChange={(e) => updateContent('buttonText', e.target.value)}
                      placeholder="Comprar ahora"
                    />
                  </div>
                  <URLSelector
                    value={localContent.buttonUrl || ''}
                    onChange={(value) => updateContent('buttonUrl', value)}
                    label="URL del botón"
                    placeholder="/ofertas"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Imagen de fondo</Label>
                  <Input
                    value={localContent.backgroundImage || ''}
                    onChange={(e) => updateContent('backgroundImage', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </>
            )}

            {section.section_type === 'cta' && (
              <>
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={localContent.title || ''}
                    onChange={(e) => updateContent('title', e.target.value)}
                    placeholder="¿Listo para empezar?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={localContent.description || ''}
                    onChange={(e) => updateContent('description', e.target.value)}
                    placeholder="Breve descripción..."
                    rows={2}
                  />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Texto del botón</Label>
                    <Input
                      value={localContent.buttonText || ''}
                      onChange={(e) => updateContent('buttonText', e.target.value)}
                      placeholder="Contactar"
                    />
                  </div>
                  <URLSelector
                    value={localContent.buttonUrl || ''}
                    onChange={(value) => updateContent('buttonUrl', value)}
                    label="URL del botón"
                    placeholder="/contacto"
                  />
                </div>
              </>
            )}

            {section.section_type === 'features' && (
              <>
                <div className="space-y-2 mb-4">
                  <Label>Título de la sección</Label>
                  <Input
                    value={localContent.title || ''}
                    onChange={(e) => updateContent('title', e.target.value)}
                    placeholder="Por Qué Elegirnos"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">Características</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newFeatures = [...(localContent.features || []), {
                          id: `feature-${Date.now()}`,
                          icon: '✨',
                          title: 'Nueva característica',
                          description: 'Descripción de la característica'
                        }];
                        updateContent('features', newFeatures);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Añadir
                    </Button>
                  </div>
                  {(localContent.features || []).map((feature: any, index: number) => (
                    <div key={feature.id || index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <Label className="text-xs">Característica {index + 1}</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            const newFeatures = localContent.features.filter((_: any, i: number) => i !== index);
                            updateContent('features', newFeatures);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Input
                          value={feature.icon || ''}
                          onChange={(e) => {
                            const newFeatures = [...localContent.features];
                            newFeatures[index] = { ...newFeatures[index], icon: e.target.value };
                            updateContent('features', newFeatures);
                          }}
                          placeholder="Icono (emoji o nombre)"
                          className="text-sm"
                        />
                        <Input
                          value={feature.title || ''}
                          onChange={(e) => {
                            const newFeatures = [...localContent.features];
                            newFeatures[index] = { ...newFeatures[index], title: e.target.value };
                            updateContent('features', newFeatures);
                          }}
                          placeholder="Título"
                          className="text-sm"
                        />
                        <Textarea
                          value={feature.description || ''}
                          onChange={(e) => {
                            const newFeatures = [...localContent.features];
                            newFeatures[index] = { ...newFeatures[index], description: e.target.value };
                            updateContent('features', newFeatures);
                          }}
                          placeholder="Descripción"
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  ))}
                  {(!localContent.features || localContent.features.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay características. Haz clic en "Añadir" para crear una.
                    </p>
                  )}
                </div>
              </>
            )}

            {section.section_type === 'accordion' && (
              <>
                <div className="space-y-2">
                  <Label>Título de la sección</Label>
                  <Input
                    value={localContent.title || ''}
                    onChange={(e) => updateContent('title', e.target.value)}
                    placeholder="Preguntas Frecuentes"
                  />
                </div>
                <div className="space-y-4 mt-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">Items del acordeón</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newItems = [...(localContent.items || []), {
                          id: `item-${Date.now()}`,
                          title: 'Nuevo ítem',
                          content: 'Contenido del ítem'
                        }];
                        updateContent('items', newItems);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Añadir
                    </Button>
                  </div>
                  {(localContent.items || []).map((item: any, index: number) => (
                    <div key={item.id || index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <Label className="text-xs">Ítem {index + 1}</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            const newItems = localContent.items.filter((_: any, i: number) => i !== index);
                            updateContent('items', newItems);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        value={item.title || ''}
                        onChange={(e) => {
                          const newItems = [...localContent.items];
                          newItems[index] = { ...newItems[index], title: e.target.value };
                          updateContent('items', newItems);
                        }}
                        placeholder="Título"
                        className="text-sm"
                      />
                      <Textarea
                        value={item.content || ''}
                        onChange={(e) => {
                          const newItems = [...localContent.items];
                          newItems[index] = { ...newItems[index], content: e.target.value };
                          updateContent('items', newItems);
                        }}
                        placeholder="Contenido"
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {section.section_type === 'pricing' && (
              <>
                <div className="space-y-2">
                  <Label>Título de la sección</Label>
                  <Input
                    value={localContent.title || ''}
                    onChange={(e) => updateContent('title', e.target.value)}
                    placeholder="Planes y Precios"
                  />
                </div>
                <div className="space-y-4 mt-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">Planes</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newPlans = [...(localContent.plans || []), {
                          id: `plan-${Date.now()}`,
                          name: 'Nuevo Plan',
                          price: '0',
                          period: 'mes',
                          features: [],
                          highlighted: false
                        }];
                        updateContent('plans', newPlans);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Añadir Plan
                    </Button>
                  </div>
                  {(localContent.plans || []).map((plan: any, index: number) => (
                    <div key={plan.id || index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <Label className="text-xs">Plan {index + 1}</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            const newPlans = localContent.plans.filter((_: any, i: number) => i !== index);
                            updateContent('plans', newPlans);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        value={plan.name || ''}
                        onChange={(e) => {
                          const newPlans = [...localContent.plans];
                          newPlans[index] = { ...newPlans[index], name: e.target.value };
                          updateContent('plans', newPlans);
                        }}
                        placeholder="Nombre del plan"
                        className="text-sm"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={plan.price || ''}
                          onChange={(e) => {
                            const newPlans = [...localContent.plans];
                            newPlans[index] = { ...newPlans[index], price: e.target.value };
                            updateContent('plans', newPlans);
                          }}
                          placeholder="Precio"
                          className="text-sm"
                        />
                        <Input
                          value={plan.period || ''}
                          onChange={(e) => {
                            const newPlans = [...localContent.plans];
                            newPlans[index] = { ...newPlans[index], period: e.target.value };
                            updateContent('plans', newPlans);
                          }}
                          placeholder="Período"
                          className="text-sm"
                        />
                      </div>
                      <Textarea
                        value={(plan.features || []).join('\n')}
                        onChange={(e) => {
                          const newPlans = [...localContent.plans];
                          newPlans[index] = { ...newPlans[index], features: e.target.value.split('\n') };
                          updateContent('plans', newPlans);
                        }}
                        placeholder="Características (una por línea)"
                        rows={3}
                        className="text-sm"
                      />
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Plan destacado</Label>
                        <Switch
                          checked={plan.highlighted || false}
                          onCheckedChange={(checked) => {
                            const newPlans = [...localContent.plans];
                            newPlans[index] = { ...newPlans[index], highlighted: checked };
                            updateContent('plans', newPlans);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {section.section_type === 'form' && (
              <>
                <div className="space-y-2">
                  <Label>Título del formulario</Label>
                  <Input
                    value={localContent.title || ''}
                    onChange={(e) => updateContent('title', e.target.value)}
                    placeholder="Contáctanos"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={localContent.description || ''}
                    onChange={(e) => updateContent('description', e.target.value)}
                    placeholder="Rellena el formulario y te contactaremos pronto"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email de destino</Label>
                  <Input
                    value={localSettings.targetEmail || ''}
                    onChange={(e) => updateSettings('targetEmail', e.target.value)}
                    placeholder="contacto@ejemplo.com"
                    type="email"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Incluir campo de teléfono</Label>
                  <Switch
                    checked={localSettings.includePhone !== false}
                    onCheckedChange={(checked) => updateSettings('includePhone', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Campo de mensaje obligatorio</Label>
                  <Switch
                    checked={localSettings.requireMessage !== false}
                    onCheckedChange={(checked) => updateSettings('requireMessage', checked)}
                  />
                </div>
              </>
            )}

            {section.section_type === 'newsletter' && (
              <>
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={localContent.title || ''}
                    onChange={(e) => updateContent('title', e.target.value)}
                    placeholder="Suscríbete a nuestro newsletter"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={localContent.description || ''}
                    onChange={(e) => updateContent('description', e.target.value)}
                    placeholder="Recibe las últimas noticias y ofertas"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Texto del botón</Label>
                  <Input
                    value={localContent.buttonText || ''}
                    onChange={(e) => updateContent('buttonText', e.target.value)}
                    placeholder="Suscribirse"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Placeholder del email</Label>
                  <Input
                    value={localContent.emailPlaceholder || ''}
                    onChange={(e) => updateContent('emailPlaceholder', e.target.value)}
                    placeholder="tu@email.com"
                  />
                </div>
              </>
            )}

            {section.section_type === 'video' && (
              <VideoSettings
                settings={localSettings}
                content={localContent}
                onUpdateSettings={updateSettings}
                onUpdateContent={updateContent}
              />
            )}

            {section.section_type === 'custom' && (
              <div className="space-y-2">
                <Label>HTML Personalizado</Label>
                <Textarea
                  value={localContent.html || ''}
                  onChange={(e) => updateContent('html', e.target.value)}
                  placeholder="<div>Tu código HTML aquí...</div>"
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            )}

            {section.section_type === 'spacer' && (
              <div className="space-y-4">
                <Label>Altura del espaciador: {localSettings.height || 60}px</Label>
                <Slider
                  value={[localSettings.height || 60]}
                  onValueChange={([value]) => updateSettings('height', value)}
                  min={20}
                  max={300}
                  step={10}
                />
              </div>
            )}

            {section.section_type === 'products-carousel' && (
              <>
                <div className="space-y-2">
                  <Label>Título de la sección</Label>
                  <Input
                    value={localContent.title || ''}
                    onChange={(e) => updateContent('title', e.target.value)}
                    placeholder="Productos Destacados"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo (opcional)</Label>
                  <Input
                    value={localContent.subtitle || ''}
                    onChange={(e) => updateContent('subtitle', e.target.value)}
                    placeholder="Descubre nuestros mejores productos"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoría (opcional)</Label>
                  <Input
                    value={localSettings.category || ''}
                    onChange={(e) => updateSettings('category', e.target.value)}
                    placeholder="Deja vacío para mostrar todas"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Solo productos destacados</Label>
                  <Switch
                    checked={localSettings.featured || false}
                    onCheckedChange={(checked) => updateSettings('featured', checked)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ordenar por</Label>
                  <Select
                    value={localSettings.sortBy || 'created_at'}
                    onValueChange={(value) => updateSettings('sortBy', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Más recientes</SelectItem>
                      <SelectItem value="name">Nombre</SelectItem>
                      <SelectItem value="price">Precio</SelectItem>
                      <SelectItem value="popularity">Popularidad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Orden</Label>
                  <Select
                    value={localSettings.sortOrder || 'desc'}
                    onValueChange={(value) => updateSettings('sortOrder', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascendente</SelectItem>
                      <SelectItem value="desc">Descendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Límite de productos: {localSettings.limit || 10}</Label>
                  <Slider
                    value={[localSettings.limit || 10]}
                    onValueChange={([value]) => updateSettings('limit', value)}
                    min={1}
                    max={50}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Productos visibles: {localSettings.maxVisible || 4}</Label>
                  <Slider
                    value={[localSettings.maxVisible || 4]}
                    onValueChange={([value]) => updateSettings('maxVisible', value)}
                    min={1}
                    max={6}
                    step={1}
                  />
                </div>
                
                {/* Carousel Configuration */}
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-3">Configuración del Carrusel</h4>
                  <CarouselSettings
                    settings={localSettings}
                    onUpdate={updateSettings}
                  />
                </div>
              </>
            )}

            {section.section_type === 'image-carousel' && (
              <>
                <div className="space-y-2">
                  <Label>Título de la sección</Label>
                  <Input
                    value={localContent.title || ''}
                    onChange={(e) => updateContent('title', e.target.value)}
                    placeholder="Galería de Imágenes"
                  />
                </div>
                <div className="space-y-4 mt-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">Imágenes</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newImages = [...(localContent.images || []), {
                          id: `img-${Date.now()}`,
                          url: '',
                          alt: '',
                          caption: ''
                        }];
                        updateContent('images', newImages);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Añadir Imagen
                    </Button>
                  </div>
                  {(localContent.images || []).map((image: any, index: number) => (
                    <div key={image.id || index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <Label className="text-xs">Imagen {index + 1}</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            const newImages = localContent.images.filter((_: any, i: number) => i !== index);
                            updateContent('images', newImages);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        value={image.url || ''}
                        onChange={(e) => {
                          const newImages = [...localContent.images];
                          newImages[index] = { ...newImages[index], url: e.target.value };
                          updateContent('images', newImages);
                        }}
                        placeholder="URL de la imagen"
                        className="text-sm"
                      />
                      <Input
                        value={image.alt || ''}
                        onChange={(e) => {
                          const newImages = [...localContent.images];
                          newImages[index] = { ...newImages[index], alt: e.target.value };
                          updateContent('images', newImages);
                        }}
                        placeholder="Texto alternativo"
                        className="text-sm"
                      />
                      <Input
                        value={image.caption || ''}
                        onChange={(e) => {
                          const newImages = [...localContent.images];
                          newImages[index] = { ...newImages[index], caption: e.target.value };
                          updateContent('images', newImages);
                        }}
                        placeholder="Descripción (opcional)"
                        className="text-sm"
                      />
                      <URLSelector
                        value={image.linkUrl || ''}
                        onChange={(value) => {
                          const newImages = [...localContent.images];
                          newImages[index] = { ...newImages[index], linkUrl: value };
                          updateContent('images', newImages);
                        }}
                        label="Enlace (opcional)"
                        placeholder="/productos"
                      />
                    </div>
                  ))}
                  {(!localContent.images || localContent.images.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay imágenes. Haz clic en "Añadir Imagen" para crear una.
                    </p>
                  )}
                </div>

                {/* Carousel Configuration */}
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-3">Configuración del Carrusel</h4>
                  <CarouselSettings
                    settings={localSettings}
                    onUpdate={updateSettings}
                  />
                </div>
              </>
            )}

            {section.section_type === 'social-media' && (
              <SocialMediaSettings
                settings={localSettings}
                content={localContent}
                onUpdateSettings={updateSettings}
                onUpdateContent={updateContent}
              />
            )}

            {section.section_type === 'counter' && (
              <CounterSettings
                settings={localSettings}
                content={localContent}
                onUpdateSettings={updateSettings}
                onUpdateContent={updateContent}
              />
            )}

            {section.section_type === 'stats' && (
              <>
                <div className="space-y-2">
                  <Label>Título de la sección</Label>
                  <Input
                    value={localContent.title || ''}
                    onChange={(e) => updateContent('title', e.target.value)}
                    placeholder="Nuestras Estadísticas"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo (opcional)</Label>
                  <Input
                    value={localContent.subtitle || ''}
                    onChange={(e) => updateContent('subtitle', e.target.value)}
                    placeholder="Logros que nos respaldan"
                  />
                </div>
                <div className="space-y-4 mt-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">Estadísticas</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newStats = [...(localContent.stats || []), {
                          id: `stat-${Date.now()}`,
                          value: '0',
                          label: 'Nueva estadística',
                          prefix: '',
                          suffix: '',
                          icon: '📊'
                        }];
                        updateContent('stats', newStats);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Añadir Estadística
                    </Button>
                  </div>
                  {(localContent.stats || []).map((stat: any, index: number) => (
                    <div key={stat.id || index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <Label className="text-xs">Estadística {index + 1}</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            const newStats = localContent.stats.filter((_: any, i: number) => i !== index);
                            updateContent('stats', newStats);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          value={stat.prefix || ''}
                          onChange={(e) => {
                            const newStats = [...localContent.stats];
                            newStats[index] = { ...newStats[index], prefix: e.target.value };
                            updateContent('stats', newStats);
                          }}
                          placeholder="Prefijo ($, €)"
                          className="text-sm"
                        />
                        <Input
                          value={stat.value || ''}
                          onChange={(e) => {
                            const newStats = [...localContent.stats];
                            newStats[index] = { ...newStats[index], value: e.target.value };
                            updateContent('stats', newStats);
                          }}
                          placeholder="Valor"
                          className="text-sm"
                        />
                        <Input
                          value={stat.suffix || ''}
                          onChange={(e) => {
                            const newStats = [...localContent.stats];
                            newStats[index] = { ...newStats[index], suffix: e.target.value };
                            updateContent('stats', newStats);
                          }}
                          placeholder="Sufijo (+, K)"
                          className="text-sm"
                        />
                      </div>
                      <Input
                        value={stat.label || ''}
                        onChange={(e) => {
                          const newStats = [...localContent.stats];
                          newStats[index] = { ...newStats[index], label: e.target.value };
                          updateContent('stats', newStats);
                        }}
                        placeholder="Etiqueta"
                        className="text-sm"
                      />
                      <Input
                        value={stat.icon || ''}
                        onChange={(e) => {
                          const newStats = [...localContent.stats];
                          newStats[index] = { ...newStats[index], icon: e.target.value };
                          updateContent('stats', newStats);
                        }}
                        placeholder="Icono (emoji o nombre)"
                        className="text-sm"
                      />
                    </div>
                  ))}
                  {(!localContent.stats || localContent.stats.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay estadísticas. Haz clic en "Añadir Estadística" para crear una.
                    </p>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-0">
            {/* Common Settings for All Sections */}
            <div className="flex items-center justify-between">
              <Label>Ancho completo</Label>
              <Switch
                checked={localSettings.fullWidth || false}
                onCheckedChange={(checked) => updateSettings('fullWidth', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Visible en la página</Label>
              <Switch
                checked={localSettings.visible !== false}
                onCheckedChange={(checked) => updateSettings('visible', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label>Clase CSS personalizada</Label>
              <Input
                value={localSettings.customClass || ''}
                onChange={(e) => updateSettings('customClass', e.target.value)}
                placeholder="mi-clase-personalizada"
              />
            </div>

            <div className="space-y-2">
              <Label>ID personalizado</Label>
              <Input
                value={localSettings.customId || ''}
                onChange={(e) => updateSettings('customId', e.target.value)}
                placeholder="mi-id-personalizado"
              />
            </div>

            {/* Hero Section Settings */}
            {section.section_type === 'hero' && (
              <>
                <div className="space-y-2">
                  <Label>Altura del hero</Label>
                  <Select
                    value={localSettings.height || '80vh'}
                    onValueChange={(value) => updateSettings('height', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50vh">Pequeño (50%)</SelectItem>
                      <SelectItem value="70vh">Mediano (70%)</SelectItem>
                      <SelectItem value="80vh">Grande (80%)</SelectItem>
                      <SelectItem value="100vh">Pantalla completa</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {localSettings.height === 'custom' && (
                  <div className="space-y-2">
                    <Label>Altura personalizada</Label>
                    <Input
                      value={localSettings.customHeight || '600px'}
                      onChange={(e) => updateSettings('customHeight', e.target.value)}
                      placeholder="600px, 50vh, etc."
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Posición del contenido</Label>
                  <Select
                    value={localSettings.contentPosition || 'center'}
                    onValueChange={(value) => updateSettings('contentPosition', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Arriba</SelectItem>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="bottom">Abajo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Alineación del contenido</Label>
                  <Select
                    value={localSettings.contentAlign || 'center'}
                    onValueChange={(value) => updateSettings('contentAlign', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Izquierda</SelectItem>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="right">Derecha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Overlay oscuro</Label>
                  <Switch
                    checked={localSettings.darkOverlay || false}
                    onCheckedChange={(checked) => updateSettings('darkOverlay', checked)}
                  />
                </div>

                {localSettings.darkOverlay && (
                  <div className="space-y-2">
                    <Label>Opacidad del overlay: {localSettings.overlayOpacity || 40}%</Label>
                    <Slider
                      value={[localSettings.overlayOpacity || 40]}
                      onValueChange={([value]) => updateSettings('overlayOpacity', value)}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label>Efecto parallax en fondo</Label>
                  <Switch
                    checked={localSettings.parallaxEffect || false}
                    onCheckedChange={(checked) => updateSettings('parallaxEffect', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tamaño del botón</Label>
                  <Select
                    value={localSettings.buttonSize || 'default'}
                    onValueChange={(value) => updateSettings('buttonSize', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">Pequeño</SelectItem>
                      <SelectItem value="default">Normal</SelectItem>
                      <SelectItem value="lg">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estilo del botón</Label>
                  <Select
                    value={localSettings.buttonVariant || 'default'}
                    onValueChange={(value) => updateSettings('buttonVariant', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Por defecto</SelectItem>
                      <SelectItem value="outline">Outline</SelectItem>
                      <SelectItem value="ghost">Ghost</SelectItem>
                      <SelectItem value="secondary">Secundario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Mostrar flecha de scroll</Label>
                  <Switch
                    checked={localSettings.showScrollArrow || false}
                    onCheckedChange={(checked) => updateSettings('showScrollArrow', checked)}
                  />
                </div>
              </>
            )}

            {/* Gallery Section Settings */}
            {section.section_type === 'gallery' && (
              <>
                <div className="space-y-2">
                  <Label>Columnas (Desktop)</Label>
                  <Select
                    value={String(localSettings.columns || 4)}
                    onValueChange={(value) => updateSettings('columns', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 columnas</SelectItem>
                      <SelectItem value="3">3 columnas</SelectItem>
                      <SelectItem value="4">4 columnas</SelectItem>
                      <SelectItem value="5">5 columnas</SelectItem>
                      <SelectItem value="6">6 columnas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Columnas (Tablet)</Label>
                  <Select
                    value={String(localSettings.columnsTablet || 3)}
                    onValueChange={(value) => updateSettings('columnsTablet', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 columnas</SelectItem>
                      <SelectItem value="3">3 columnas</SelectItem>
                      <SelectItem value="4">4 columnas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Columnas (Móvil)</Label>
                  <Select
                    value={String(localSettings.columnsMobile || 1)}
                    onValueChange={(value) => updateSettings('columnsMobile', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 columna</SelectItem>
                      <SelectItem value="2">2 columnas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Espaciado entre imágenes: {localSettings.gap || 16}px</Label>
                  <Slider
                    value={[localSettings.gap || 16]}
                    onValueChange={([value]) => updateSettings('gap', value)}
                    min={0}
                    max={50}
                    step={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Relación de aspecto</Label>
                  <Select
                    value={localSettings.aspectRatio || 'square'}
                    onValueChange={(value) => updateSettings('aspectRatio', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="square">Cuadrado (1:1)</SelectItem>
                      <SelectItem value="landscape">Horizontal (16:9)</SelectItem>
                      <SelectItem value="portrait">Vertical (3:4)</SelectItem>
                      <SelectItem value="auto">Automático</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Efecto hover en imágenes</Label>
                  <Switch
                    checked={localSettings.hoverEffect !== false}
                    onCheckedChange={(checked) => updateSettings('hoverEffect', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Lightbox al hacer clic</Label>
                  <Switch
                    checked={localSettings.enableLightbox !== false}
                    onCheckedChange={(checked) => updateSettings('enableLightbox', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Lazy loading</Label>
                  <Switch
                    checked={localSettings.lazyLoad !== false}
                    onCheckedChange={(checked) => updateSettings('lazyLoad', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Diseño de mosaico (Masonry)</Label>
                  <Switch
                    checked={localSettings.masonryLayout || false}
                    onCheckedChange={(checked) => updateSettings('masonryLayout', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Mostrar títulos de imágenes</Label>
                  <Switch
                    checked={localSettings.showTitles || false}
                    onCheckedChange={(checked) => updateSettings('showTitles', checked)}
                  />
                </div>
              </>
            )}

            {/* Features Section Settings */}
            {section.section_type === 'features' && (
              <>
                <div className="space-y-2">
                  <Label>Columnas de características</Label>
                  <Select
                    value={String(localSettings.columns || 3)}
                    onValueChange={(value) => updateSettings('columns', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 columnas</SelectItem>
                      <SelectItem value="3">3 columnas</SelectItem>
                      <SelectItem value="4">4 columnas</SelectItem>
                      <SelectItem value="5">5 columnas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tamaño de iconos: {localSettings.iconSize || 48}px</Label>
                  <Slider
                    value={[localSettings.iconSize || 48]}
                    onValueChange={([value]) => updateSettings('iconSize', value)}
                    min={24}
                    max={100}
                    step={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estilo de iconos</Label>
                  <Select
                    value={localSettings.iconStyle || 'default'}
                    onValueChange={(value) => updateSettings('iconStyle', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Por defecto</SelectItem>
                      <SelectItem value="circled">Con círculo</SelectItem>
                      <SelectItem value="boxed">Con caja</SelectItem>
                      <SelectItem value="minimal">Minimalista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Alineación centrada</Label>
                  <Switch
                    checked={localSettings.centeredAlign !== false}
                    onCheckedChange={(checked) => updateSettings('centeredAlign', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Efecto hover en tarjetas</Label>
                  <Switch
                    checked={localSettings.cardHoverEffect || false}
                    onCheckedChange={(checked) => updateSettings('cardHoverEffect', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Bordes en tarjetas</Label>
                  <Switch
                    checked={localSettings.cardBorders || false}
                    onCheckedChange={(checked) => updateSettings('cardBorders', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Sombras en tarjetas</Label>
                  <Switch
                    checked={localSettings.cardShadows || false}
                    onCheckedChange={(checked) => updateSettings('cardShadows', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Espaciado entre características: {localSettings.featureGap || 24}px</Label>
                  <Slider
                    value={[localSettings.featureGap || 24]}
                    onValueChange={([value]) => updateSettings('featureGap', value)}
                    min={0}
                    max={60}
                    step={4}
                  />
                </div>
              </>
            )}

            {/* Stats Section Settings */}
            {section.section_type === 'stats' && (
              <>
                <div className="space-y-2">
                  <Label>Columnas de estadísticas</Label>
                  <Select
                    value={String(localSettings.columns || 4)}
                    onValueChange={(value) => updateSettings('columns', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 columnas</SelectItem>
                      <SelectItem value="3">3 columnas</SelectItem>
                      <SelectItem value="4">4 columnas</SelectItem>
                      <SelectItem value="5">5 columnas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Animar números al scroll</Label>
                  <Switch
                    checked={localSettings.animateOnScroll !== false}
                    onCheckedChange={(checked) => updateSettings('animateOnScroll', checked)}
                  />
                </div>

                {localSettings.animateOnScroll && (
                  <div className="space-y-2">
                    <Label>Duración de animación: {localSettings.animationDuration || 2}s</Label>
                    <Slider
                      value={[localSettings.animationDuration || 2]}
                      onValueChange={([value]) => updateSettings('animationDuration', value)}
                      min={0.5}
                      max={5}
                      step={0.5}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Tamaño de números</Label>
                  <Select
                    value={localSettings.numberSize || 'large'}
                    onValueChange={(value) => updateSettings('numberSize', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="medium">Mediano</SelectItem>
                      <SelectItem value="large">Grande</SelectItem>
                      <SelectItem value="xlarge">Extra grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Mostrar iconos</Label>
                  <Switch
                    checked={localSettings.showIcons !== false}
                    onCheckedChange={(checked) => updateSettings('showIcons', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Separadores entre estadísticas</Label>
                  <Switch
                    checked={localSettings.showDividers || false}
                    onCheckedChange={(checked) => updateSettings('showDividers', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Color de números</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={localSettings.numberColor || '#000000'}
                      onChange={(e) => updateSettings('numberColor', e.target.value)}
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={localSettings.numberColor || ''}
                      onChange={(e) => updateSettings('numberColor', e.target.value)}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Accordion Section Settings */}
            {section.section_type === 'accordion' && (
              <>
                <div className="flex items-center justify-between">
                  <Label>Permitir múltiples abiertos</Label>
                  <Switch
                    checked={localSettings.allowMultiple || false}
                    onCheckedChange={(checked) => updateSettings('allowMultiple', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Primer ítem abierto por defecto</Label>
                  <Switch
                    checked={localSettings.defaultOpen || false}
                    onCheckedChange={(checked) => updateSettings('defaultOpen', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estilo del acordeón</Label>
                  <Select
                    value={localSettings.accordionStyle || 'default'}
                    onValueChange={(value) => updateSettings('accordionStyle', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Por defecto</SelectItem>
                      <SelectItem value="bordered">Con bordes</SelectItem>
                      <SelectItem value="filled">Relleno</SelectItem>
                      <SelectItem value="minimal">Minimalista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Posición del icono</Label>
                  <Select
                    value={localSettings.iconPosition || 'right'}
                    onValueChange={(value) => updateSettings('iconPosition', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Izquierda</SelectItem>
                      <SelectItem value="right">Derecha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de icono</Label>
                  <Select
                    value={localSettings.iconType || 'chevron'}
                    onValueChange={(value) => updateSettings('iconType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chevron">Chevron</SelectItem>
                      <SelectItem value="plus">Plus/Minus</SelectItem>
                      <SelectItem value="arrow">Flecha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Animación suave</Label>
                  <Switch
                    checked={localSettings.smoothAnimation !== false}
                    onCheckedChange={(checked) => updateSettings('smoothAnimation', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Espaciado entre ítems: {localSettings.itemSpacing || 8}px</Label>
                  <Slider
                    value={[localSettings.itemSpacing || 8]}
                    onValueChange={([value]) => updateSettings('itemSpacing', value)}
                    min={0}
                    max={40}
                    step={4}
                  />
                </div>
              </>
            )}

            {/* Pricing Section Settings */}
            {section.section_type === 'pricing' && (
              <>
                <div className="space-y-2">
                  <Label>Columnas de planes</Label>
                  <Select
                    value={String(localSettings.columns || 3)}
                    onValueChange={(value) => updateSettings('columns', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 columna</SelectItem>
                      <SelectItem value="2">2 columnas</SelectItem>
                      <SelectItem value="3">3 columnas</SelectItem>
                      <SelectItem value="4">4 columnas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Mostrar comparación de características</Label>
                  <Switch
                    checked={localSettings.showFeatureComparison || false}
                    onCheckedChange={(checked) => updateSettings('showFeatureComparison', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Toggle mensual/anual</Label>
                  <Switch
                    checked={localSettings.billingToggle || false}
                    onCheckedChange={(checked) => updateSettings('billingToggle', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Destacar plan recomendado</Label>
                  <Switch
                    checked={localSettings.highlightRecommended !== false}
                    onCheckedChange={(checked) => updateSettings('highlightRecommended', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estilo de tarjetas</Label>
                  <Select
                    value={localSettings.cardStyle || 'elevated'}
                    onValueChange={(value) => updateSettings('cardStyle', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Plano</SelectItem>
                      <SelectItem value="elevated">Elevado</SelectItem>
                      <SelectItem value="bordered">Con borde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Mostrar badge "Más popular"</Label>
                  <Switch
                    checked={localSettings.showPopularBadge !== false}
                    onCheckedChange={(checked) => updateSettings('showPopularBadge', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tamaño de precio</Label>
                  <Select
                    value={localSettings.priceSize || 'large'}
                    onValueChange={(value) => updateSettings('priceSize', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="medium">Mediano</SelectItem>
                      <SelectItem value="large">Grande</SelectItem>
                      <SelectItem value="xlarge">Extra grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Mostrar icono de verificación en características</Label>
                  <Switch
                    checked={localSettings.showCheckIcons !== false}
                    onCheckedChange={(checked) => updateSettings('showCheckIcons', checked)}
                  />
                </div>
              </>
            )}

            {/* Form and Newsletter Settings */}
            {(section.section_type === 'form' || section.section_type === 'newsletter') && (
              <>
                <div className="space-y-2">
                  <Label>Ancho del formulario</Label>
                  <Select
                    value={localSettings.formWidth || 'medium'}
                    onValueChange={(value) => updateSettings('formWidth', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Pequeño</SelectItem>
                      <SelectItem value="medium">Mediano</SelectItem>
                      <SelectItem value="large">Grande</SelectItem>
                      <SelectItem value="full">Ancho completo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tamaño de campos</Label>
                  <Select
                    value={localSettings.fieldSize || 'default'}
                    onValueChange={(value) => updateSettings('fieldSize', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">Pequeño</SelectItem>
                      <SelectItem value="default">Normal</SelectItem>
                      <SelectItem value="lg">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Validación en tiempo real</Label>
                  <Switch
                    checked={localSettings.liveValidation !== false}
                    onCheckedChange={(checked) => updateSettings('liveValidation', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Mostrar mensajes de error</Label>
                  <Switch
                    checked={localSettings.showErrors !== false}
                    onCheckedChange={(checked) => updateSettings('showErrors', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Campos con borde redondeado</Label>
                  <Switch
                    checked={localSettings.roundedFields !== false}
                    onCheckedChange={(checked) => updateSettings('roundedFields', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mensaje de éxito</Label>
                  <Input
                    value={localSettings.successMessage || '¡Gracias! Te contactaremos pronto.'}
                    onChange={(e) => updateSettings('successMessage', e.target.value)}
                    placeholder="Mensaje después de enviar"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Redireccionar después de enviar</Label>
                  <Switch
                    checked={localSettings.redirectAfterSubmit || false}
                    onCheckedChange={(checked) => updateSettings('redirectAfterSubmit', checked)}
                  />
                </div>

                {localSettings.redirectAfterSubmit && (
                  <div className="space-y-2">
                    <Label>URL de redirección</Label>
                    <Input
                      value={localSettings.redirectUrl || ''}
                      onChange={(e) => updateSettings('redirectUrl', e.target.value)}
                      placeholder="/gracias"
                    />
                  </div>
                )}
              </>
            )}

            {/* Text Section Settings */}
            {section.section_type === 'text' && (
              <>
                <div className="space-y-2">
                  <Label>Ancho máximo del texto</Label>
                  <Select
                    value={localSettings.maxWidth || 'prose'}
                    onValueChange={(value) => updateSettings('maxWidth', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="narrow">Estrecho (65ch)</SelectItem>
                      <SelectItem value="prose">Prosa (75ch)</SelectItem>
                      <SelectItem value="wide">Ancho (100ch)</SelectItem>
                      <SelectItem value="full">Sin límite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Columnas de texto</Label>
                  <Switch
                    checked={localSettings.multiColumn || false}
                    onCheckedChange={(checked) => updateSettings('multiColumn', checked)}
                  />
                </div>

                {localSettings.multiColumn && (
                  <div className="space-y-2">
                    <Label>Número de columnas</Label>
                    <Select
                      value={String(localSettings.columnCount || 2)}
                      onValueChange={(value) => updateSettings('columnCount', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 columnas</SelectItem>
                        <SelectItem value="3">3 columnas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label>Primera letra destacada (Drop cap)</Label>
                  <Switch
                    checked={localSettings.dropCap || false}
                    onCheckedChange={(checked) => updateSettings('dropCap', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Justificar texto</Label>
                  <Switch
                    checked={localSettings.justifyText || false}
                    onCheckedChange={(checked) => updateSettings('justifyText', checked)}
                  />
                </div>
              </>
            )}

            {/* Image Section Settings */}
            {section.section_type === 'image' && (
              <>
                <div className="space-y-2">
                  <Label>Tamaño de la imagen</Label>
                  <Select
                    value={localSettings.imageSize || 'large'}
                    onValueChange={(value) => updateSettings('imageSize', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Pequeño</SelectItem>
                      <SelectItem value="medium">Mediano</SelectItem>
                      <SelectItem value="large">Grande</SelectItem>
                      <SelectItem value="full">Ancho completo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Posición de la imagen</Label>
                  <Select
                    value={localSettings.imagePosition || 'center'}
                    onValueChange={(value) => updateSettings('imagePosition', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Izquierda</SelectItem>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="right">Derecha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Efecto hover (zoom)</Label>
                  <Switch
                    checked={localSettings.hoverZoom || false}
                    onCheckedChange={(checked) => updateSettings('hoverZoom', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Bordes redondeados</Label>
                  <Switch
                    checked={localSettings.rounded || false}
                    onCheckedChange={(checked) => updateSettings('rounded', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Sombra en imagen</Label>
                  <Switch
                    checked={localSettings.shadow || false}
                    onCheckedChange={(checked) => updateSettings('shadow', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Abrir en lightbox al hacer clic</Label>
                  <Switch
                    checked={localSettings.lightbox || false}
                    onCheckedChange={(checked) => updateSettings('lightbox', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Lazy loading</Label>
                  <Switch
                    checked={localSettings.lazyLoad !== false}
                    onCheckedChange={(checked) => updateSettings('lazyLoad', checked)}
                  />
                </div>
              </>
            )}

            {/* Banner and CTA Settings */}
            {(section.section_type === 'banner' || section.section_type === 'cta') && (
              <>
                <div className="space-y-2">
                  <Label>Estilo del banner</Label>
                  <Select
                    value={localSettings.bannerStyle || 'default'}
                    onValueChange={(value) => updateSettings('bannerStyle', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Por defecto</SelectItem>
                      <SelectItem value="gradient">Con degradado</SelectItem>
                      <SelectItem value="outlined">Con borde</SelectItem>
                      <SelectItem value="minimal">Minimalista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Imagen de fondo</Label>
                  <Switch
                    checked={localSettings.hasBackgroundImage || false}
                    onCheckedChange={(checked) => updateSettings('hasBackgroundImage', checked)}
                  />
                </div>

                {localSettings.hasBackgroundImage && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label>Overlay oscuro sobre imagen</Label>
                      <Switch
                        checked={localSettings.imageOverlay || false}
                        onCheckedChange={(checked) => updateSettings('imageOverlay', checked)}
                      />
                    </div>

                    {localSettings.imageOverlay && (
                      <div className="space-y-2">
                        <Label>Opacidad del overlay: {localSettings.overlayOpacity || 50}%</Label>
                        <Slider
                          value={[localSettings.overlayOpacity || 50]}
                          onValueChange={([value]) => updateSettings('overlayOpacity', value)}
                          min={0}
                          max={100}
                          step={5}
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-2">
                  <Label>Tamaño del botón CTA</Label>
                  <Select
                    value={localSettings.ctaButtonSize || 'default'}
                    onValueChange={(value) => updateSettings('ctaButtonSize', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">Pequeño</SelectItem>
                      <SelectItem value="default">Normal</SelectItem>
                      <SelectItem value="lg">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Botón con icono</Label>
                  <Switch
                    checked={localSettings.buttonWithIcon || false}
                    onCheckedChange={(checked) => updateSettings('buttonWithIcon', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Banner sticky (fijo al scroll)</Label>
                  <Switch
                    checked={localSettings.stickyBanner || false}
                    onCheckedChange={(checked) => updateSettings('stickyBanner', checked)}
                  />
                </div>

                {localSettings.stickyBanner && (
                  <div className="space-y-2">
                    <Label>Posición sticky</Label>
                    <Select
                      value={localSettings.stickyPosition || 'top'}
                      onValueChange={(value) => updateSettings('stickyPosition', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">Arriba</SelectItem>
                        <SelectItem value="bottom">Abajo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {/* Common Animation Setting for All Sections */}
            <div className="space-y-2 mt-4 pt-4 border-t">
              <Label>Efecto de animación de entrada</Label>
              <Select
                value={localSettings.animation || 'none'}
                onValueChange={(value) => updateSettings('animation', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin animación</SelectItem>
                  <SelectItem value="fade-in">Aparecer</SelectItem>
                  <SelectItem value="slide-up">Deslizar hacia arriba</SelectItem>
                  <SelectItem value="slide-down">Deslizar hacia abajo</SelectItem>
                  <SelectItem value="slide-left">Deslizar desde izquierda</SelectItem>
                  <SelectItem value="slide-right">Deslizar desde derecha</SelectItem>
                  <SelectItem value="scale">Escalar</SelectItem>
                  <SelectItem value="zoom-in">Zoom in</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="styles" className="space-y-4 mt-0">
            <div className="space-y-2">
              <Label>Color de fondo</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={localStyles.backgroundColor || '#ffffff'}
                  onChange={(e) => updateStyles('backgroundColor', e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={localStyles.backgroundColor || ''}
                  onChange={(e) => updateStyles('backgroundColor', e.target.value)}
                  placeholder="Transparente"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color de texto</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={localStyles.textColor || '#000000'}
                  onChange={(e) => updateStyles('textColor', e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={localStyles.textColor || ''}
                  onChange={(e) => updateStyles('textColor', e.target.value)}
                  placeholder="Heredar"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Padding: {localStyles.padding || 40}px</Label>
              <Slider
                value={[localStyles.padding || 40]}
                onValueChange={([value]) => updateStyles('padding', value)}
                min={0}
                max={120}
                step={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Margen superior: {localStyles.marginTop || 0}px</Label>
              <Slider
                value={[localStyles.marginTop || 0]}
                onValueChange={([value]) => updateStyles('marginTop', value)}
                min={0}
                max={100}
                step={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Margen inferior: {localStyles.marginBottom || 0}px</Label>
              <Slider
                value={[localStyles.marginBottom || 0]}
                onValueChange={([value]) => updateStyles('marginBottom', value)}
                min={0}
                max={100}
                step={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Alineación del texto</Label>
              <Select
                value={localStyles.textAlign || 'left'}
                onValueChange={(value) => updateStyles('textAlign', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Izquierda</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="right">Derecha</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Radio de bordes</Label>
              <Select
                value={localStyles.borderRadius || 'none'}
                onValueChange={(value) => updateStyles('borderRadius', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin bordes</SelectItem>
                  <SelectItem value="4px">Pequeño</SelectItem>
                  <SelectItem value="8px">Mediano</SelectItem>
                  <SelectItem value="16px">Grande</SelectItem>
                  <SelectItem value="24px">Muy grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-0">
            <AdvancedSectionSettings
              settings={localSettings}
              onUpdate={updateSettings}
              sectionType={section.section_type}
            />
          </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
