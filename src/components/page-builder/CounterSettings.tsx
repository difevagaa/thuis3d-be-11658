import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

interface CounterSettingsProps {
  settings: any;
  content: any;
  onUpdateSettings: (key: string, value: any) => void;
  onUpdateContent: (key: string, value: any) => void;
}

export function CounterSettings({ settings, content, onUpdateSettings, onUpdateContent }: CounterSettingsProps) {
  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <h4 className="font-semibold">Configuración del Contador</h4>
        
        <div className="space-y-2">
          <Label>Tipo de contador</Label>
          <Select
            value={settings?.counterType || 'countdown'}
            onValueChange={(value) => onUpdateSettings('counterType', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="countdown">Cuenta regresiva</SelectItem>
              <SelectItem value="countup">Cuenta progresiva</SelectItem>
              <SelectItem value="static">Número estático</SelectItem>
              <SelectItem value="animated">Número animado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings?.counterType === 'countdown' && (
          <>
            <div className="space-y-2">
              <Label>Fecha objetivo</Label>
              <Input
                type="datetime-local"
                value={content?.targetDate || ''}
                onChange={(e) => onUpdateContent('targetDate', e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Reiniciar al llegar a cero</Label>
              <Switch
                checked={settings?.resetOnZero || false}
                onCheckedChange={(checked) => onUpdateSettings('resetOnZero', checked)}
              />
            </div>

            {settings?.resetOnZero && (
              <div className="space-y-2">
                <Label>Intervalo de reinicio (días)</Label>
                <Input
                  type="number"
                  value={settings?.resetInterval || 1}
                  onChange={(e) => onUpdateSettings('resetInterval', parseInt(e.target.value))}
                  min={1}
                  max={365}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label>Mostrar mensaje al finalizar</Label>
              <Switch
                checked={settings?.showEndMessage || false}
                onCheckedChange={(checked) => onUpdateSettings('showEndMessage', checked)}
              />
            </div>

            {settings?.showEndMessage && (
              <div className="space-y-2">
                <Label>Mensaje de finalización</Label>
                <Input
                  value={content?.endMessage || ''}
                  onChange={(e) => onUpdateContent('endMessage', e.target.value)}
                  placeholder="¡La oferta ha terminado!"
                />
              </div>
            )}
          </>
        )}

        {settings?.counterType === 'countup' && (
          <div className="space-y-2">
            <Label>Fecha de inicio</Label>
            <Input
              type="datetime-local"
              value={content?.startDate || ''}
              onChange={(e) => onUpdateContent('startDate', e.target.value)}
            />
          </div>
        )}

        {(settings?.counterType === 'static' || settings?.counterType === 'animated') && (
          <>
            <div className="space-y-2">
              <Label>Valor objetivo</Label>
              <Input
                type="number"
                value={content?.targetValue || 0}
                onChange={(e) => onUpdateContent('targetValue', parseInt(e.target.value))}
                placeholder="1000"
              />
            </div>

            <div className="space-y-2">
              <Label>Prefijo</Label>
              <Input
                value={content?.prefix || ''}
                onChange={(e) => onUpdateContent('prefix', e.target.value)}
                placeholder="$, €, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Sufijo</Label>
              <Input
                value={content?.suffix || ''}
                onChange={(e) => onUpdateContent('suffix', e.target.value)}
                placeholder="+, K, M, etc."
              />
            </div>
          </>
        )}

        {settings?.counterType === 'animated' && (
          <>
            <div className="space-y-2">
              <Label>Duración de animación: {settings?.animationDuration || 2}s</Label>
              <Slider
                value={[settings?.animationDuration || 2]}
                onValueChange={([value]) => onUpdateSettings('animationDuration', value)}
                min={0.5}
                max={10}
                step={0.5}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Iniciar animación al hacer visible</Label>
              <Switch
                checked={settings?.animateOnView !== false}
                onCheckedChange={(checked) => onUpdateSettings('animateOnView', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Repetir animación</Label>
              <Switch
                checked={settings?.repeatAnimation || false}
                onCheckedChange={(checked) => onUpdateSettings('repeatAnimation', checked)}
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label>Formato de visualización</Label>
          <Select
            value={settings?.displayFormat || 'full'}
            onValueChange={(value) => onUpdateSettings('displayFormat', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Completo (DD:HH:MM:SS)</SelectItem>
              <SelectItem value="compact">Compacto (1d 2h 3m)</SelectItem>
              <SelectItem value="minimal">Mínimo (solo números)</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label>Mostrar etiquetas de unidades</Label>
          <Switch
            checked={settings?.showLabels !== false}
            onCheckedChange={(checked) => onUpdateSettings('showLabels', checked)}
          />
        </div>

        {settings?.showLabels && (
          <>
            <div className="space-y-2">
              <Label>Estilo de etiquetas</Label>
              <Select
                value={settings?.labelStyle || 'below'}
                onValueChange={(value) => onUpdateSettings('labelStyle', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="below">Debajo</SelectItem>
                  <SelectItem value="above">Arriba</SelectItem>
                  <SelectItem value="inline">En línea</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Etiqueta de días</Label>
              <Input
                value={content?.labelDays || 'Días'}
                onChange={(e) => onUpdateContent('labelDays', e.target.value)}
                placeholder="Días"
              />
            </div>

            <div className="space-y-2">
              <Label>Etiqueta de horas</Label>
              <Input
                value={content?.labelHours || 'Horas'}
                onChange={(e) => onUpdateContent('labelHours', e.target.value)}
                placeholder="Horas"
              />
            </div>

            <div className="space-y-2">
              <Label>Etiqueta de minutos</Label>
              <Input
                value={content?.labelMinutes || 'Minutos'}
                onChange={(e) => onUpdateContent('labelMinutes', e.target.value)}
                placeholder="Minutos"
              />
            </div>

            <div className="space-y-2">
              <Label>Etiqueta de segundos</Label>
              <Input
                value={content?.labelSeconds || 'Segundos'}
                onChange={(e) => onUpdateContent('labelSeconds', e.target.value)}
                placeholder="Segundos"
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label>Separador entre unidades</Label>
          <Select
            value={settings?.separator || 'colon'}
            onValueChange={(value) => onUpdateSettings('separator', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="colon">Dos puntos (:)</SelectItem>
              <SelectItem value="space">Espacio</SelectItem>
              <SelectItem value="dash">Guión (-)</SelectItem>
              <SelectItem value="dot">Punto (·)</SelectItem>
              <SelectItem value="none">Sin separador</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tamaño de números</Label>
          <Select
            value={settings?.numberSize || 'large'}
            onValueChange={(value) => onUpdateSettings('numberSize', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Pequeño</SelectItem>
              <SelectItem value="medium">Mediano</SelectItem>
              <SelectItem value="large">Grande</SelectItem>
              <SelectItem value="xlarge">Extra grande</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings?.numberSize === 'custom' && (
          <div className="space-y-2">
            <Label>Tamaño personalizado de números (px)</Label>
            <Input
              type="number"
              value={settings?.customNumberSize || 48}
              onChange={(e) => onUpdateSettings('customNumberSize', parseInt(e.target.value))}
              min={12}
              max={200}
            />
          </div>
        )}

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
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Color de números</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={settings?.numberColor || '#000000'}
              onChange={(e) => onUpdateSettings('numberColor', e.target.value)}
              className="w-14 h-10 p-1 cursor-pointer"
            />
            <Input
              value={settings?.numberColor || ''}
              onChange={(e) => onUpdateSettings('numberColor', e.target.value)}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Color de fondo de cajas</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={settings?.boxBackgroundColor || '#ffffff'}
              onChange={(e) => onUpdateSettings('boxBackgroundColor', e.target.value)}
              className="w-14 h-10 p-1 cursor-pointer"
            />
            <Input
              value={settings?.boxBackgroundColor || ''}
              onChange={(e) => onUpdateSettings('boxBackgroundColor', e.target.value)}
              placeholder="#ffffff o transparent"
              className="flex-1"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label>Mostrar cajas alrededor de números</Label>
          <Switch
            checked={settings?.showBoxes !== false}
            onCheckedChange={(checked) => onUpdateSettings('showBoxes', checked)}
          />
        </div>

        {settings?.showBoxes && (
          <>
            <div className="space-y-2">
              <Label>Estilo de caja</Label>
              <Select
                value={settings?.boxStyle || 'rounded'}
                onValueChange={(value) => onUpdateSettings('boxStyle', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Cuadrada</SelectItem>
                  <SelectItem value="rounded">Redondeada</SelectItem>
                  <SelectItem value="circle">Circular</SelectItem>
                  <SelectItem value="outlined">Con borde</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Padding de cajas: {settings?.boxPadding || 16}px</Label>
              <Slider
                value={[settings?.boxPadding || 16]}
                onValueChange={([value]) => onUpdateSettings('boxPadding', value)}
                min={0}
                max={50}
                step={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Sombra en cajas</Label>
              <Switch
                checked={settings?.boxShadow || false}
                onCheckedChange={(checked) => onUpdateSettings('boxShadow', checked)}
              />
            </div>
          </>
        )}

        <div className="flex items-center justify-between">
          <Label>Efecto de parpadeo</Label>
          <Switch
            checked={settings?.blinkEffect || false}
            onCheckedChange={(checked) => onUpdateSettings('blinkEffect', checked)}
          />
        </div>

        {settings?.blinkEffect && (
          <div className="space-y-2">
            <Label>Velocidad de parpadeo: {settings?.blinkSpeed || 1}s</Label>
            <Slider
              value={[settings?.blinkSpeed || 1]}
              onValueChange={([value]) => onUpdateSettings('blinkSpeed', value)}
              min={0.5}
              max={5}
              step={0.5}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <Label>Efecto de volteo (flip)</Label>
          <Switch
            checked={settings?.flipEffect || false}
            onCheckedChange={(checked) => onUpdateSettings('flipEffect', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Efecto de deslizamiento</Label>
          <Switch
            checked={settings?.slideEffect || false}
            onCheckedChange={(checked) => onUpdateSettings('slideEffect', checked)}
          />
        </div>

        <div className="space-y-2">
          <Label>Peso de fuente</Label>
          <Select
            value={settings?.fontWeight || 'bold'}
            onValueChange={(value) => onUpdateSettings('fontWeight', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="medium">Medio</SelectItem>
              <SelectItem value="semibold">Semi-negrita</SelectItem>
              <SelectItem value="bold">Negrita</SelectItem>
              <SelectItem value="extrabold">Extra negrita</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label>Familia de fuente monoespaciada</Label>
          <Switch
            checked={settings?.monospacedFont || false}
            onCheckedChange={(checked) => onUpdateSettings('monospacedFont', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Ocultar unidades con valor cero</Label>
          <Switch
            checked={settings?.hideZeroUnits || false}
            onCheckedChange={(checked) => onUpdateSettings('hideZeroUnits', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Agregar ceros iniciales</Label>
          <Switch
            checked={settings?.addLeadingZeros !== false}
            onCheckedChange={(checked) => onUpdateSettings('addLeadingZeros', checked)}
          />
        </div>
      </Card>
    </div>
  );
}
