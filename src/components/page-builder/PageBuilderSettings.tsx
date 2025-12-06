import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Palette, 
  Type, 
  Layout, 
  Maximize, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Image as ImageIcon
} from "lucide-react";
import { MediaLibrary } from "./MediaLibrary";

interface PageBuilderSettingsProps {
  section: any;
  onUpdate: (updates: any) => void;
}

export function PageBuilderSettings({ section, onUpdate }: PageBuilderSettingsProps) {
  const { t } = useTranslation(['admin', 'common']);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [mediaTargetField, setMediaTargetField] = useState<string>('');

  if (!section) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>Selecciona una sección para editar</p>
      </div>
    );
  }

  const openMediaLibrary = (field: string) => {
    setMediaTargetField(field);
    setMediaLibraryOpen(true);
  };

  const handleMediaSelect = (url: string) => {
    if (mediaTargetField) {
      handleContentChange(mediaTargetField, url);
    }
  };

  const handleStyleChange = (property: string, value: any) => {
    onUpdate({
      styles: {
        ...section.styles,
        [property]: value
      }
    });
  };

  const handleSettingsChange = (property: string, value: any) => {
    onUpdate({
      settings: {
        ...section.settings,
        [property]: value
      }
    });
  };

  const handleContentChange = (property: string, value: any) => {
    onUpdate({
      content: {
        ...section.content,
        [property]: value
      }
    });
  };

  return (
    <div className="p-4 space-y-4">
      <Accordion type="multiple" defaultValue={['general', 'content', 'styles']}>
        {/* General Settings */}
        <AccordionItem value="general">
          <AccordionTrigger className="text-sm font-medium">
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              General
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs">Nombre de la sección</Label>
              <Input
                value={section.section_name}
                onChange={(e) => onUpdate({ section_name: e.target.value })}
                placeholder="Nombre"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Visible</Label>
              <Switch
                checked={section.is_visible}
                onCheckedChange={(checked) => onUpdate({ is_visible: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Ancho completo</Label>
              <Switch
                checked={section.settings?.fullWidth || false}
                onCheckedChange={(checked) => handleSettingsChange('fullWidth', checked)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Content */}
        <AccordionItem value="content">
          <AccordionTrigger className="text-sm font-medium">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Contenido
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            {section.section_type !== 'spacer' && section.section_type !== 'divider' && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Título</Label>
                  <Input
                    value={section.content?.title || ''}
                    onChange={(e) => handleContentChange('title', e.target.value)}
                    placeholder="Título"
                  />
                </div>

                {['hero', 'text', 'banner', 'cta'].includes(section.section_type) && (
                  <div className="space-y-2">
                    <Label className="text-xs">
                      {section.section_type === 'text' ? 'Texto' : 'Subtítulo / Descripción'}
                    </Label>
                    <textarea
                      value={section.content?.subtitle || section.content?.text || section.content?.description || ''}
                      onChange={(e) => {
                        const key = section.section_type === 'text' ? 'text' : 
                                   section.section_type === 'banner' || section.section_type === 'cta' ? 'description' : 'subtitle';
                        handleContentChange(key, e.target.value);
                      }}
                      placeholder="Escribe tu contenido..."
                      className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border bg-background resize-none"
                    />
                  </div>
                )}

                {['hero', 'banner', 'cta'].includes(section.section_type) && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs">Texto del botón</Label>
                      <Input
                        value={section.content?.buttonText || ''}
                        onChange={(e) => handleContentChange('buttonText', e.target.value)}
                        placeholder="Ver más"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">URL del botón</Label>
                      <Input
                        value={section.content?.buttonUrl || ''}
                        onChange={(e) => handleContentChange('buttonUrl', e.target.value)}
                        placeholder="/productos"
                      />
                    </div>
                  </>
                )}

                {['hero', 'banner', 'image'].includes(section.section_type) && (
                  <div className="space-y-2">
                    <Label className="text-xs">
                      {section.section_type === 'image' ? 'URL de la imagen' : 'Imagen de fondo'}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={section.content?.backgroundImage || section.content?.imageUrl || ''}
                        onChange={(e) => {
                          const key = section.section_type === 'image' ? 'imageUrl' : 'backgroundImage';
                          handleContentChange(key, e.target.value);
                        }}
                        placeholder="https://..."
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openMediaLibrary(section.section_type === 'image' ? 'imageUrl' : 'backgroundImage')}
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {section.section_type === 'spacer' && (
              <div className="space-y-2">
                <Label className="text-xs">Altura (px): {section.settings?.height || 60}</Label>
                <Slider
                  value={[section.settings?.height || 60]}
                  onValueChange={([value]) => handleSettingsChange('height', value)}
                  min={20}
                  max={200}
                  step={10}
                />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Styles */}
        <AccordionItem value="styles">
          <AccordionTrigger className="text-sm font-medium">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Estilos
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs">Color de fondo</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={section.styles?.backgroundColor || '#ffffff'}
                  onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                  value={section.styles?.backgroundColor || ''}
                  onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                  placeholder="Transparente"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Color de texto</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={section.styles?.textColor || '#000000'}
                  onChange={(e) => handleStyleChange('textColor', e.target.value)}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                  value={section.styles?.textColor || ''}
                  onChange={(e) => handleStyleChange('textColor', e.target.value)}
                  placeholder="Heredar"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Padding: {section.styles?.padding || 40}px</Label>
              <Slider
                value={[section.styles?.padding || 40]}
                onValueChange={([value]) => handleStyleChange('padding', value)}
                min={0}
                max={120}
                step={4}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Alineación</Label>
              <div className="flex gap-1">
                <Button
                  variant={section.styles?.textAlign === 'left' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStyleChange('textAlign', 'left')}
                  className="flex-1"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant={section.styles?.textAlign === 'center' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStyleChange('textAlign', 'center')}
                  className="flex-1"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant={section.styles?.textAlign === 'right' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStyleChange('textAlign', 'right')}
                  className="flex-1"
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Radio de bordes</Label>
              <Select
                value={section.styles?.borderRadius || 'none'}
                onValueChange={(value) => handleStyleChange('borderRadius', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin bordes</SelectItem>
                  <SelectItem value="sm">Pequeño</SelectItem>
                  <SelectItem value="md">Mediano</SelectItem>
                  <SelectItem value="lg">Grande</SelectItem>
                  <SelectItem value="full">Completo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Media Library Dialog */}
      <MediaLibrary
        open={mediaLibraryOpen}
        onClose={() => setMediaLibraryOpen(false)}
        onSelect={handleMediaSelect}
      />
    </div>
  );
}
