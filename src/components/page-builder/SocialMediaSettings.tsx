import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface SocialMediaSettingsProps {
  settings: any;
  content: any;
  onUpdateSettings: (key: string, value: any) => void;
  onUpdateContent: (key: string, value: any) => void;
}

export function SocialMediaSettings({ settings, content, onUpdateSettings, onUpdateContent }: SocialMediaSettingsProps) {
  const socialPlatforms = [
    { id: 'facebook', name: 'Facebook', icon: '📘' },
    { id: 'twitter', name: 'Twitter/X', icon: '🐦' },
    { id: 'instagram', name: 'Instagram', icon: '📷' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
    { id: 'youtube', name: 'YouTube', icon: '📹' },
    { id: 'tiktok', name: 'TikTok', icon: '🎵' },
    { id: 'pinterest', name: 'Pinterest', icon: '📌' },
    { id: 'whatsapp', name: 'WhatsApp', icon: '💬' },
    { id: 'telegram', name: 'Telegram', icon: '✈️' },
    { id: 'snapchat', name: 'Snapchat', icon: '👻' },
  ];

  const addSocialLink = () => {
    const newLinks = [...(content.socialLinks || []), {
      id: `social-${Date.now()}`,
      platform: 'facebook',
      url: '',
      label: '',
      enabled: true
    }];
    onUpdateContent('socialLinks', newLinks);
  };

  const updateSocialLink = (index: number, key: string, value: any) => {
    const newLinks = [...content.socialLinks];
    newLinks[index] = { ...newLinks[index], [key]: value };
    onUpdateContent('socialLinks', newLinks);
  };

  const removeSocialLink = (index: number) => {
    const newLinks = content.socialLinks.filter((_: any, i: number) => i !== index);
    onUpdateContent('socialLinks', newLinks);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <h4 className="font-semibold">Configuración General</h4>
        
        <div className="space-y-2">
          <Label>Estilo de iconos</Label>
          <Select
            value={settings?.iconStyle || 'rounded'}
            onValueChange={(value) => onUpdateSettings('iconStyle', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rounded">Redondeados</SelectItem>
              <SelectItem value="square">Cuadrados</SelectItem>
              <SelectItem value="circle">Círculos</SelectItem>
              <SelectItem value="minimal">Minimalista</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tamaño de iconos: {settings?.iconSize || 40}px</Label>
          <Slider
            value={[settings?.iconSize || 40]}
            onValueChange={([value]) => onUpdateSettings('iconSize', value)}
            min={20}
            max={100}
            step={5}
          />
        </div>

        <div className="space-y-2">
          <Label>Espaciado entre iconos: {settings?.iconSpacing || 12}px</Label>
          <Slider
            value={[settings?.iconSpacing || 12]}
            onValueChange={([value]) => onUpdateSettings('iconSpacing', value)}
            min={0}
            max={50}
            step={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Alineación</Label>
          <Select
            value={settings?.alignment || 'center'}
            onValueChange={(value) => onUpdateSettings('alignment', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Izquierda</SelectItem>
              <SelectItem value="center">Centro</SelectItem>
              <SelectItem value="right">Derecha</SelectItem>
              <SelectItem value="justify">Justificado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Esquema de colores</Label>
          <Select
            value={settings?.colorScheme || 'brand'}
            onValueChange={(value) => onUpdateSettings('colorScheme', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="brand">Colores de marca</SelectItem>
              <SelectItem value="monochrome">Monocromático</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
              <SelectItem value="gradient">Degradado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings?.colorScheme === 'custom' && (
          <>
            <div className="space-y-2">
              <Label>Color de fondo de iconos</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={settings?.iconBackgroundColor || '#000000'}
                  onChange={(e) => onUpdateSettings('iconBackgroundColor', e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings?.iconBackgroundColor || ''}
                  onChange={(e) => onUpdateSettings('iconBackgroundColor', e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color de iconos</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={settings?.iconColor || '#ffffff'}
                  onChange={(e) => onUpdateSettings('iconColor', e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings?.iconColor || ''}
                  onChange={(e) => onUpdateSettings('iconColor', e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>
          </>
        )}

        <div className="flex items-center justify-between">
          <Label>Mostrar etiquetas</Label>
          <Switch
            checked={settings?.showLabels || false}
            onCheckedChange={(checked) => onUpdateSettings('showLabels', checked)}
          />
        </div>

        {settings?.showLabels && (
          <div className="space-y-2">
            <Label>Posición de etiquetas</Label>
            <Select
              value={settings?.labelPosition || 'bottom'}
              onValueChange={(value) => onUpdateSettings('labelPosition', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Arriba</SelectItem>
                <SelectItem value="bottom">Abajo</SelectItem>
                <SelectItem value="left">Izquierda</SelectItem>
                <SelectItem value="right">Derecha</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Label>Animación al pasar el mouse</Label>
          <Switch
            checked={settings?.enableHoverAnimation !== false}
            onCheckedChange={(checked) => onUpdateSettings('enableHoverAnimation', checked)}
          />
        </div>

        {settings?.enableHoverAnimation && (
          <div className="space-y-2">
            <Label>Tipo de animación hover</Label>
            <Select
              value={settings?.hoverAnimationType || 'scale'}
              onValueChange={(value) => onUpdateSettings('hoverAnimationType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scale">Escalar</SelectItem>
                <SelectItem value="rotate">Rotar</SelectItem>
                <SelectItem value="bounce">Rebotar</SelectItem>
                <SelectItem value="pulse">Pulsar</SelectItem>
                <SelectItem value="shake">Sacudir</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Label>Abrir en nueva pestaña</Label>
          <Switch
            checked={settings?.openInNewTab !== false}
            onCheckedChange={(checked) => onUpdateSettings('openInNewTab', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Añadir rel="nofollow"</Label>
          <Switch
            checked={settings?.addNofollow || false}
            onCheckedChange={(checked) => onUpdateSettings('addNofollow', checked)}
          />
        </div>

        <div className="space-y-2">
          <Label>Diseño de visualización</Label>
          <Select
            value={settings?.displayLayout || 'horizontal'}
            onValueChange={(value) => onUpdateSettings('displayLayout', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="horizontal">Horizontal</SelectItem>
              <SelectItem value="vertical">Vertical</SelectItem>
              <SelectItem value="grid">Cuadrícula</SelectItem>
              <SelectItem value="floating">Flotante</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings?.displayLayout === 'grid' && (
          <div className="space-y-2">
            <Label>Columnas en cuadrícula</Label>
            <Select
              value={String(settings?.gridColumns || 3)}
              onValueChange={(value) => onUpdateSettings('gridColumns', parseInt(value))}
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

        {settings?.displayLayout === 'floating' && (
          <>
            <div className="space-y-2">
              <Label>Posición flotante</Label>
              <Select
                value={settings?.floatingPosition || 'left'}
                onValueChange={(value) => onUpdateSettings('floatingPosition', value)}
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
              <Label>Distancia desde el borde: {settings?.floatingOffset || 20}px</Label>
              <Slider
                value={[settings?.floatingOffset || 20]}
                onValueChange={([value]) => onUpdateSettings('floatingOffset', value)}
                min={0}
                max={100}
                step={5}
              />
            </div>
          </>
        )}

        <div className="flex items-center justify-between">
          <Label>Mostrar contador de seguidores</Label>
          <Switch
            checked={settings?.showFollowerCount || false}
            onCheckedChange={(checked) => onUpdateSettings('showFollowerCount', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Efecto de sombra</Label>
          <Switch
            checked={settings?.enableShadow || false}
            onCheckedChange={(checked) => onUpdateSettings('enableShadow', checked)}
          />
        </div>

        {settings?.enableShadow && (
          <div className="space-y-2">
            <Label>Intensidad de sombra</Label>
            <Select
              value={settings?.shadowIntensity || 'md'}
              onValueChange={(value) => onUpdateSettings('shadowIntensity', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">Pequeña</SelectItem>
                <SelectItem value="md">Mediana</SelectItem>
                <SelectItem value="lg">Grande</SelectItem>
                <SelectItem value="xl">Extra grande</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold">Enlaces de Redes Sociales</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addSocialLink}
          >
            <Plus className="h-4 w-4 mr-1" />
            Añadir
          </Button>
        </div>

        {(content.socialLinks || []).map((link: any, index: number) => (
          <div key={link.id || index} className="border rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-start">
              <Label className="text-xs">Red Social {index + 1}</Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => removeSocialLink(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Plataforma</Label>
              <Select
                value={link.platform || 'facebook'}
                onValueChange={(value) => updateSocialLink(index, 'platform', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {socialPlatforms.map((platform) => (
                    <SelectItem key={platform.id} value={platform.id}>
                      {platform.icon} {platform.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">URL</Label>
              <Input
                value={link.url || ''}
                onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                placeholder="https://..."
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Etiqueta personalizada (opcional)</Label>
              <Input
                value={link.label || ''}
                onChange={(e) => updateSocialLink(index, 'label', e.target.value)}
                placeholder="Síguenos en Facebook"
                className="text-sm"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Habilitado</Label>
              <Switch
                checked={link.enabled !== false}
                onCheckedChange={(checked) => updateSocialLink(index, 'enabled', checked)}
              />
            </div>
          </div>
        ))}

        {(!content.socialLinks || content.socialLinks.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay enlaces. Haz clic en "Añadir" para crear uno.
          </p>
        )}
      </Card>
    </div>
  );
}
