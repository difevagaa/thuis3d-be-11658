import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

interface AdvancedSectionSettingsProps {
  settings: any;
  onUpdate: (key: string, value: any) => void;
  sectionType?: string;
}

export function AdvancedSectionSettings({ settings, onUpdate, sectionType }: AdvancedSectionSettingsProps) {
  return (
    <Tabs defaultValue="layout" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="layout">Diseño</TabsTrigger>
        <TabsTrigger value="typography">Tipografía</TabsTrigger>
        <TabsTrigger value="effects">Efectos</TabsTrigger>
        <TabsTrigger value="responsive">Responsive</TabsTrigger>
      </TabsList>

      {/* Layout Settings */}
      <TabsContent value="layout" className="space-y-4">
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Alineación horizontal</Label>
            <Select
              value={settings?.horizontalAlign || 'center'}
              onValueChange={(value) => onUpdate('horizontalAlign', value)}
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
            <Label>Alineación vertical</Label>
            <Select
              value={settings?.verticalAlign || 'middle'}
              onValueChange={(value) => onUpdate('verticalAlign', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Arriba</SelectItem>
                <SelectItem value="middle">Medio</SelectItem>
                <SelectItem value="bottom">Abajo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ancho del contenedor</Label>
            <Select
              value={settings?.containerWidth || 'default'}
              onValueChange={(value) => onUpdate('containerWidth', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="narrow">Estrecho (768px)</SelectItem>
                <SelectItem value="default">Por defecto (1024px)</SelectItem>
                <SelectItem value="wide">Ancho (1280px)</SelectItem>
                <SelectItem value="full">Ancho completo</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings?.containerWidth === 'custom' && (
            <div className="space-y-2">
              <Label>Ancho personalizado</Label>
              <Input
                type="text"
                value={settings?.customWidth || '1024px'}
                onChange={(e) => onUpdate('customWidth', e.target.value)}
                placeholder="1024px, 80%, etc."
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Espaciado interno superior: {settings?.paddingTop || 40}px</Label>
            <Slider
              value={[settings?.paddingTop || 40]}
              onValueChange={([value]) => onUpdate('paddingTop', value)}
              min={0}
              max={200}
              step={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Espaciado interno inferior: {settings?.paddingBottom || 40}px</Label>
            <Slider
              value={[settings?.paddingBottom || 40]}
              onValueChange={([value]) => onUpdate('paddingBottom', value)}
              min={0}
              max={200}
              step={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Espaciado interno lateral: {settings?.paddingHorizontal || 20}px</Label>
            <Slider
              value={[settings?.paddingHorizontal || 20]}
              onValueChange={([value]) => onUpdate('paddingHorizontal', value)}
              min={0}
              max={100}
              step={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Margen superior: {settings?.marginTop || 0}px</Label>
            <Slider
              value={[settings?.marginTop || 0]}
              onValueChange={([value]) => onUpdate('marginTop', value)}
              min={0}
              max={200}
              step={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Margen inferior: {settings?.marginBottom || 0}px</Label>
            <Slider
              value={[settings?.marginBottom || 0]}
              onValueChange={([value]) => onUpdate('marginBottom', value)}
              min={0}
              max={200}
              step={4}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Ancho completo (sin márgenes laterales)</Label>
            <Switch
              checked={settings?.fullWidth || false}
              onCheckedChange={(checked) => onUpdate('fullWidth', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Centrar contenido</Label>
            <Switch
              checked={settings?.centerContent !== false}
              onCheckedChange={(checked) => onUpdate('centerContent', checked)}
            />
          </div>
        </Card>
      </TabsContent>

      {/* Typography Settings */}
      <TabsContent value="typography" className="space-y-4">
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Tamaño de fuente del título</Label>
            <Select
              value={settings?.titleFontSize || 'text-3xl'}
              onValueChange={(value) => onUpdate('titleFontSize', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text-xl">Pequeño (xl)</SelectItem>
                <SelectItem value="text-2xl">Mediano (2xl)</SelectItem>
                <SelectItem value="text-3xl">Grande (3xl)</SelectItem>
                <SelectItem value="text-4xl">Muy grande (4xl)</SelectItem>
                <SelectItem value="text-5xl">Extra grande (5xl)</SelectItem>
                <SelectItem value="text-6xl">Enorme (6xl)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Peso de fuente del título</Label>
            <Select
              value={settings?.titleFontWeight || 'font-bold'}
              onValueChange={(value) => onUpdate('titleFontWeight', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="font-light">Ligera</SelectItem>
                <SelectItem value="font-normal">Normal</SelectItem>
                <SelectItem value="font-medium">Media</SelectItem>
                <SelectItem value="font-semibold">Semi-negrita</SelectItem>
                <SelectItem value="font-bold">Negrita</SelectItem>
                <SelectItem value="font-extrabold">Extra negrita</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tamaño de fuente del contenido</Label>
            <Select
              value={settings?.contentFontSize || 'text-base'}
              onValueChange={(value) => onUpdate('contentFontSize', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text-xs">Muy pequeño (xs)</SelectItem>
                <SelectItem value="text-sm">Pequeño (sm)</SelectItem>
                <SelectItem value="text-base">Normal (base)</SelectItem>
                <SelectItem value="text-lg">Grande (lg)</SelectItem>
                <SelectItem value="text-xl">Muy grande (xl)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Altura de línea del contenido</Label>
            <Select
              value={settings?.lineHeight || 'leading-normal'}
              onValueChange={(value) => onUpdate('lineHeight', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leading-tight">Ajustada</SelectItem>
                <SelectItem value="leading-snug">Compacta</SelectItem>
                <SelectItem value="leading-normal">Normal</SelectItem>
                <SelectItem value="leading-relaxed">Relajada</SelectItem>
                <SelectItem value="leading-loose">Holgada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Transformación de texto del título</Label>
            <Select
              value={settings?.titleTextTransform || 'none'}
              onValueChange={(value) => onUpdate('titleTextTransform', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Normal</SelectItem>
                <SelectItem value="uppercase">Mayúsculas</SelectItem>
                <SelectItem value="lowercase">Minúsculas</SelectItem>
                <SelectItem value="capitalize">Capitalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Espaciado entre letras</Label>
            <Select
              value={settings?.letterSpacing || 'tracking-normal'}
              onValueChange={(value) => onUpdate('letterSpacing', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tracking-tighter">Muy ajustado</SelectItem>
                <SelectItem value="tracking-tight">Ajustado</SelectItem>
                <SelectItem value="tracking-normal">Normal</SelectItem>
                <SelectItem value="tracking-wide">Amplio</SelectItem>
                <SelectItem value="tracking-wider">Muy amplio</SelectItem>
                <SelectItem value="tracking-widest">Extra amplio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Familia de fuente</Label>
            <Select
              value={settings?.fontFamily || 'default'}
              onValueChange={(value) => onUpdate('fontFamily', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Por defecto</SelectItem>
                <SelectItem value="sans">Sans-serif</SelectItem>
                <SelectItem value="serif">Serif</SelectItem>
                <SelectItem value="mono">Monospace</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      </TabsContent>

      {/* Effects Settings */}
      <TabsContent value="effects" className="space-y-4">
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Animación de entrada</Label>
            <Select
              value={settings?.entranceAnimation || 'none'}
              onValueChange={(value) => onUpdate('entranceAnimation', value)}
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
                <SelectItem value="scale-up">Escalar</SelectItem>
                <SelectItem value="zoom-in">Zoom in</SelectItem>
                <SelectItem value="bounce">Rebote</SelectItem>
                <SelectItem value="rotate">Rotar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Duración de animación: {settings?.animationDuration || 500}ms</Label>
            <Slider
              value={[settings?.animationDuration || 500]}
              onValueChange={([value]) => onUpdate('animationDuration', value)}
              min={100}
              max={2000}
              step={100}
            />
          </div>

          <div className="space-y-2">
            <Label>Retraso de animación: {settings?.animationDelay || 0}ms</Label>
            <Slider
              value={[settings?.animationDelay || 0]}
              onValueChange={([value]) => onUpdate('animationDelay', value)}
              min={0}
              max={2000}
              step={100}
            />
          </div>

          <div className="space-y-2">
            <Label>Sombra</Label>
            <Select
              value={settings?.shadow || 'none'}
              onValueChange={(value) => onUpdate('shadow', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin sombra</SelectItem>
                <SelectItem value="sm">Pequeña</SelectItem>
                <SelectItem value="md">Mediana</SelectItem>
                <SelectItem value="lg">Grande</SelectItem>
                <SelectItem value="xl">Extra grande</SelectItem>
                <SelectItem value="2xl">2XL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Radio de borde: {settings?.borderRadius || 0}px</Label>
            <Slider
              value={[settings?.borderRadius || 0]}
              onValueChange={([value]) => onUpdate('borderRadius', value)}
              min={0}
              max={50}
              step={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Grosor de borde: {settings?.borderWidth || 0}px</Label>
            <Slider
              value={[settings?.borderWidth || 0]}
              onValueChange={([value]) => onUpdate('borderWidth', value)}
              min={0}
              max={10}
              step={1}
            />
          </div>

          {settings?.borderWidth > 0 && (
            <div className="space-y-2">
              <Label>Color de borde</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={settings?.borderColor || '#000000'}
                  onChange={(e) => onUpdate('borderColor', e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings?.borderColor || ''}
                  onChange={(e) => onUpdate('borderColor', e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Opacidad: {settings?.opacity || 100}%</Label>
            <Slider
              value={[settings?.opacity || 100]}
              onValueChange={([value]) => onUpdate('opacity', value)}
              min={0}
              max={100}
              step={5}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Efecto hover</Label>
            <Switch
              checked={settings?.enableHoverEffect || false}
              onCheckedChange={(checked) => onUpdate('enableHoverEffect', checked)}
            />
          </div>

          {settings?.enableHoverEffect && (
            <>
              <div className="space-y-2">
                <Label>Tipo de efecto hover</Label>
                <Select
                  value={settings?.hoverEffect || 'scale'}
                  onValueChange={(value) => onUpdate('hoverEffect', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scale">Escalar</SelectItem>
                    <SelectItem value="lift">Elevar</SelectItem>
                    <SelectItem value="glow">Brillo</SelectItem>
                    <SelectItem value="darken">Oscurecer</SelectItem>
                    <SelectItem value="brighten">Aclarar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Intensidad del efecto hover: {settings?.hoverIntensity || 105}%</Label>
                <Slider
                  value={[settings?.hoverIntensity || 105]}
                  onValueChange={([value]) => onUpdate('hoverIntensity', value)}
                  min={100}
                  max={150}
                  step={5}
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <Label>Efecto parallax</Label>
            <Switch
              checked={settings?.enableParallax || false}
              onCheckedChange={(checked) => onUpdate('enableParallax', checked)}
            />
          </div>

          {settings?.enableParallax && (
            <div className="space-y-2">
              <Label>Velocidad parallax: {settings?.parallaxSpeed || 50}%</Label>
              <Slider
                value={[settings?.parallaxSpeed || 50]}
                onValueChange={([value]) => onUpdate('parallaxSpeed', value)}
                min={0}
                max={100}
                step={10}
              />
            </div>
          )}
        </Card>
      </TabsContent>

      {/* Responsive Settings */}
      <TabsContent value="responsive" className="space-y-4">
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label>Ocultar en móviles</Label>
            <Switch
              checked={settings?.hideOnMobile || false}
              onCheckedChange={(checked) => onUpdate('hideOnMobile', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Ocultar en tablets</Label>
            <Switch
              checked={settings?.hideOnTablet || false}
              onCheckedChange={(checked) => onUpdate('hideOnTablet', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Ocultar en desktop</Label>
            <Switch
              checked={settings?.hideOnDesktop || false}
              onCheckedChange={(checked) => onUpdate('hideOnDesktop', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Orden en móviles: {settings?.mobileOrder || 0}</Label>
            <Slider
              value={[settings?.mobileOrder || 0]}
              onValueChange={([value]) => onUpdate('mobileOrder', value)}
              min={-10}
              max={10}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <Label>Tamaño de fuente móvil</Label>
            <Select
              value={settings?.mobileFontSize || 'auto'}
              onValueChange={(value) => onUpdate('mobileFontSize', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automático</SelectItem>
                <SelectItem value="text-xs">Muy pequeño</SelectItem>
                <SelectItem value="text-sm">Pequeño</SelectItem>
                <SelectItem value="text-base">Normal</SelectItem>
                <SelectItem value="text-lg">Grande</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Padding móvil: {settings?.mobilePadding || 16}px</Label>
            <Slider
              value={[settings?.mobilePadding || 16]}
              onValueChange={([value]) => onUpdate('mobilePadding', value)}
              min={0}
              max={60}
              step={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Breakpoint personalizado (px)</Label>
            <Input
              type="number"
              value={settings?.customBreakpoint || ''}
              onChange={(e) => onUpdate('customBreakpoint', e.target.value)}
              placeholder="768"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Stack en móviles (columnas a filas)</Label>
            <Switch
              checked={settings?.stackOnMobile !== false}
              onCheckedChange={(checked) => onUpdate('stackOnMobile', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Invertir orden en móviles</Label>
            <Switch
              checked={settings?.reverseOnMobile || false}
              onCheckedChange={(checked) => onUpdate('reverseOnMobile', checked)}
            />
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
