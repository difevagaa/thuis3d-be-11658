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
import { 
  Image as ImageIcon, 
  Upload, 
  Link as LinkIcon,
  X
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar: {section.section_name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">Contenido</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
            <TabsTrigger value="styles">Estilos</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4 mt-4">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Texto del botón</Label>
                    <Input
                      value={localContent.buttonText || ''}
                      onChange={(e) => updateContent('buttonText', e.target.value)}
                      placeholder="Ver más"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL del botón</Label>
                    <Input
                      value={localContent.buttonUrl || ''}
                      onChange={(e) => updateContent('buttonUrl', e.target.value)}
                      placeholder="/productos"
                    />
                  </div>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Texto del botón</Label>
                    <Input
                      value={localContent.buttonText || ''}
                      onChange={(e) => updateContent('buttonText', e.target.value)}
                      placeholder="Comprar ahora"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL del botón</Label>
                    <Input
                      value={localContent.buttonUrl || ''}
                      onChange={(e) => updateContent('buttonUrl', e.target.value)}
                      placeholder="/ofertas"
                    />
                  </div>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Texto del botón</Label>
                    <Input
                      value={localContent.buttonText || ''}
                      onChange={(e) => updateContent('buttonText', e.target.value)}
                      placeholder="Contactar"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL del botón</Label>
                    <Input
                      value={localContent.buttonUrl || ''}
                      onChange={(e) => updateContent('buttonUrl', e.target.value)}
                      placeholder="/contacto"
                    />
                  </div>
                </div>
              </>
            )}

            {section.section_type === 'video' && (
              <>
                <div className="space-y-2">
                  <Label>URL del video (YouTube, Vimeo, etc.)</Label>
                  <Input
                    value={localContent.videoUrl || ''}
                    onChange={(e) => updateContent('videoUrl', e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Título (opcional)</Label>
                  <Input
                    value={localContent.title || ''}
                    onChange={(e) => updateContent('title', e.target.value)}
                    placeholder="Título del video"
                  />
                </div>
              </>
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
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <Label>Ancho completo</Label>
              <Switch
                checked={localSettings.fullWidth || false}
                onCheckedChange={(checked) => updateSettings('fullWidth', checked)}
              />
            </div>

            {section.section_type === 'gallery' && (
              <div className="space-y-2">
                <Label>Columnas</Label>
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
            )}

            {section.section_type === 'features' && (
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
                  </SelectContent>
                </Select>
              </div>
            )}

            {section.section_type === 'hero' && (
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
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Efecto de animación</Label>
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
                  <SelectItem value="slide-left">Deslizar desde izquierda</SelectItem>
                  <SelectItem value="scale">Escalar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="styles" className="space-y-4 mt-4">
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
        </Tabs>

        <DialogFooter>
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
