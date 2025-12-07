import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface VideoSettingsProps {
  settings: any;
  content: any;
  onUpdateSettings: (key: string, value: any) => void;
  onUpdateContent: (key: string, value: any) => void;
}

export function VideoSettings({ settings, content, onUpdateSettings, onUpdateContent }: VideoSettingsProps) {
  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <h4 className="font-semibold">Configuración de Video</h4>
        
        <div className="space-y-2">
          <Label>Origen del video</Label>
          <Select
            value={settings?.videoSource || 'youtube'}
            onValueChange={(value) => onUpdateSettings('videoSource', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="vimeo">Vimeo</SelectItem>
              <SelectItem value="url">URL directa (MP4, WebM)</SelectItem>
              <SelectItem value="embed">Código de inserción</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings?.videoSource === 'embed' ? (
          <div className="space-y-2">
            <Label>Código de inserción (iframe)</Label>
            <Textarea
              value={content?.embedCode || ''}
              onChange={(e) => onUpdateContent('embedCode', e.target.value)}
              placeholder="<iframe src='...'></iframe>"
              rows={4}
              className="font-mono text-sm"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>URL del video</Label>
            <Input
              value={content?.videoUrl || ''}
              onChange={(e) => onUpdateContent('videoUrl', e.target.value)}
              placeholder={
                settings?.videoSource === 'youtube' ? 'https://youtube.com/watch?v=...' :
                settings?.videoSource === 'vimeo' ? 'https://vimeo.com/...' :
                'https://example.com/video.mp4'
              }
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Relación de aspecto</Label>
          <Select
            value={settings?.aspectRatio || '16:9'}
            onValueChange={(value) => onUpdateSettings('aspectRatio', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="16:9">16:9 (Estándar)</SelectItem>
              <SelectItem value="4:3">4:3 (Clásico)</SelectItem>
              <SelectItem value="21:9">21:9 (Ultrawide)</SelectItem>
              <SelectItem value="1:1">1:1 (Cuadrado)</SelectItem>
              <SelectItem value="9:16">9:16 (Vertical/Stories)</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings?.aspectRatio === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Ancho</Label>
              <Input
                type="number"
                value={settings?.customAspectWidth || 16}
                onChange={(e) => onUpdateSettings('customAspectWidth', parseInt(e.target.value))}
                min={1}
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Alto</Label>
              <Input
                type="number"
                value={settings?.customAspectHeight || 9}
                onChange={(e) => onUpdateSettings('customAspectHeight', parseInt(e.target.value))}
                min={1}
                max={100}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Ancho máximo del video</Label>
          <Select
            value={settings?.maxWidth || 'full'}
            onValueChange={(value) => onUpdateSettings('maxWidth', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Pequeño (640px)</SelectItem>
              <SelectItem value="medium">Mediano (800px)</SelectItem>
              <SelectItem value="large">Grande (1024px)</SelectItem>
              <SelectItem value="xlarge">Extra grande (1280px)</SelectItem>
              <SelectItem value="full">Ancho completo</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings?.maxWidth === 'custom' && (
          <div className="space-y-2">
            <Label>Ancho personalizado</Label>
            <Input
              value={settings?.customMaxWidth || '1024px'}
              onChange={(e) => onUpdateSettings('customMaxWidth', e.target.value)}
              placeholder="1024px, 80%, etc."
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <Label>Reproducción automática</Label>
          <Switch
            checked={settings?.autoplay || false}
            onCheckedChange={(checked) => onUpdateSettings('autoplay', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Silenciar por defecto</Label>
          <Switch
            checked={settings?.muted || false}
            onCheckedChange={(checked) => onUpdateSettings('muted', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Reproducir en bucle</Label>
          <Switch
            checked={settings?.loop || false}
            onCheckedChange={(checked) => onUpdateSettings('loop', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Mostrar controles</Label>
          <Switch
            checked={settings?.showControls !== false}
            onCheckedChange={(checked) => onUpdateSettings('showControls', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Modo teatro (sin distracciones)</Label>
          <Switch
            checked={settings?.modestBranding || false}
            onCheckedChange={(checked) => onUpdateSettings('modestBranding', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Permitir pantalla completa</Label>
          <Switch
            checked={settings?.allowFullscreen !== false}
            onCheckedChange={(checked) => onUpdateSettings('allowFullscreen', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Mostrar información del video</Label>
          <Switch
            checked={settings?.showInfo !== false}
            onCheckedChange={(checked) => onUpdateSettings('showInfo', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Mostrar videos relacionados (YouTube)</Label>
          <Switch
            checked={settings?.showRelated || false}
            onCheckedChange={(checked) => onUpdateSettings('showRelated', checked)}
          />
        </div>

        <div className="space-y-2">
          <Label>Tiempo de inicio (segundos)</Label>
          <Input
            type="number"
            value={settings?.startTime || 0}
            onChange={(e) => onUpdateSettings('startTime', parseInt(e.target.value))}
            min={0}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label>Tiempo de finalización (segundos, 0 = hasta el final)</Label>
          <Input
            type="number"
            value={settings?.endTime || 0}
            onChange={(e) => onUpdateSettings('endTime', parseInt(e.target.value))}
            min={0}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label>Imagen de miniatura personalizada</Label>
          <Input
            value={settings?.customThumbnail || ''}
            onChange={(e) => onUpdateSettings('customThumbnail', e.target.value)}
            placeholder="https://example.com/thumbnail.jpg"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Reproducir al hacer visible (lazy play)</Label>
          <Switch
            checked={settings?.playOnVisible || false}
            onCheckedChange={(checked) => onUpdateSettings('playOnVisible', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Pausar al salir de vista</Label>
          <Switch
            checked={settings?.pauseOnHidden || false}
            onCheckedChange={(checked) => onUpdateSettings('pauseOnHidden', checked)}
          />
        </div>

        <div className="space-y-2">
          <Label>Volumen inicial: {settings?.initialVolume || 100}%</Label>
          <Slider
            value={[settings?.initialVolume || 100]}
            onValueChange={([value]) => onUpdateSettings('initialVolume', value)}
            min={0}
            max={100}
            step={5}
          />
        </div>

        <div className="space-y-2">
          <Label>Velocidad de reproducción</Label>
          <Select
            value={String(settings?.playbackRate || 1)}
            onValueChange={(value) => onUpdateSettings('playbackRate', parseFloat(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.25">0.25x (Muy lento)</SelectItem>
              <SelectItem value="0.5">0.5x (Lento)</SelectItem>
              <SelectItem value="0.75">0.75x</SelectItem>
              <SelectItem value="1">1x (Normal)</SelectItem>
              <SelectItem value="1.25">1.25x</SelectItem>
              <SelectItem value="1.5">1.5x</SelectItem>
              <SelectItem value="2">2x (Rápido)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Calidad de video (YouTube)</Label>
          <Select
            value={settings?.quality || 'auto'}
            onValueChange={(value) => onUpdateSettings('quality', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automática</SelectItem>
              <SelectItem value="small">Baja (240p)</SelectItem>
              <SelectItem value="medium">Media (360p)</SelectItem>
              <SelectItem value="large">Alta (480p)</SelectItem>
              <SelectItem value="hd720">HD (720p)</SelectItem>
              <SelectItem value="hd1080">Full HD (1080p)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Color del tema (YouTube)</Label>
          <Select
            value={settings?.playerTheme || 'dark'}
            onValueChange={(value) => onUpdateSettings('playerTheme', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Oscuro</SelectItem>
              <SelectItem value="light">Claro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label>Modo picture-in-picture</Label>
          <Switch
            checked={settings?.enablePiP !== false}
            onCheckedChange={(checked) => onUpdateSettings('enablePiP', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Botón de descarga (videos locales)</Label>
          <Switch
            checked={settings?.showDownload || false}
            onCheckedChange={(checked) => onUpdateSettings('showDownload', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Precargar video</Label>
          <Switch
            checked={settings?.preload !== false}
            onCheckedChange={(checked) => onUpdateSettings('preload', checked)}
          />
        </div>

        <div className="space-y-2">
          <Label>Idioma de subtítulos (código ISO)</Label>
          <Input
            value={settings?.captionLanguage || ''}
            onChange={(e) => onUpdateSettings('captionLanguage', e.target.value)}
            placeholder="es, en, nl, etc."
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Mostrar subtítulos por defecto</Label>
          <Switch
            checked={settings?.showCaptions || false}
            onCheckedChange={(checked) => onUpdateSettings('showCaptions', checked)}
          />
        </div>
      </Card>
    </div>
  );
}
