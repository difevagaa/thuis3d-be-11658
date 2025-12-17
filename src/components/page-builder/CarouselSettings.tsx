import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

interface CarouselSettingsProps {
  settings: any;
  onUpdate: (key: string, value: any) => void;
}

export function CarouselSettings({ settings, onUpdate }: CarouselSettingsProps) {
  return (
    <Tabs defaultValue="display" className="w-full">
      <TabsList className="grid w-full grid-cols-5 text-xs">
        <TabsTrigger value="display" className="text-xs px-1">Vista</TabsTrigger>
        <TabsTrigger value="spacing" className="text-xs px-1">Espacios</TabsTrigger>
        <TabsTrigger value="timing" className="text-xs px-1">Tiempo</TabsTrigger>
        <TabsTrigger value="layout" className="text-xs px-1">Diseño</TabsTrigger>
        <TabsTrigger value="advanced" className="text-xs px-1">Más</TabsTrigger>
      </TabsList>

      {/* Display Settings */}
      <TabsContent value="display" className="space-y-4">
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Items por vista</Label>
            <Slider
              value={[settings?.itemsPerView || 3]}
              onValueChange={(value) => onUpdate('itemsPerView', value[0])}
              min={1}
              max={8}
              step={1}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground text-right">
              {settings?.itemsPerView || 3} items
            </div>
          </div>

          <div className="space-y-2">
            <Label>Items por vista (Tablet)</Label>
            <Slider
              value={[settings?.itemsPerViewTablet || 2]}
              onValueChange={(value) => onUpdate('itemsPerViewTablet', value[0])}
              min={1}
              max={6}
              step={1}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground text-right">
              {settings?.itemsPerViewTablet || 2} items
            </div>
          </div>

          <div className="space-y-2">
            <Label>Items por vista (Móvil)</Label>
            <Slider
              value={[settings?.itemsPerViewMobile || 2]}
              onValueChange={(value) => onUpdate('itemsPerViewMobile', value[0])}
              min={1}
              max={4}
              step={1}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground text-right">
              {settings?.itemsPerViewMobile || 2} items
            </div>
          </div>

          <div className="space-y-2">
            <Label>Espaciado entre items (px)</Label>
            <Slider
              value={[settings?.spaceBetween || 20]}
              onValueChange={(value) => onUpdate('spaceBetween', value[0])}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground text-right">
              {settings?.spaceBetween || 20}px
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Mostrar flechas de navegación</Label>
            <Switch
              checked={settings?.showNavigation !== false}
              onCheckedChange={(checked) => onUpdate('showNavigation', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Mostrar puntos de paginación</Label>
            <Switch
              checked={settings?.showPagination || false}
              onCheckedChange={(checked) => onUpdate('showPagination', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Loop infinito</Label>
            <Switch
              checked={settings?.loop !== false}
              onCheckedChange={(checked) => onUpdate('loop', checked)}
            />
          </div>
        </Card>
      </TabsContent>

      {/* Spacing Settings - NEW */}
      <TabsContent value="spacing" className="space-y-4">
        <Card className="p-4 space-y-4">
          <h4 className="font-medium text-sm border-b pb-2">Espaciado de Sección</h4>
          
          <div className="space-y-2">
            <Label>Padding vertical (px)</Label>
            <Slider
              value={[settings?.paddingY || 32]}
              onValueChange={(value) => onUpdate('paddingY', value[0])}
              min={0}
              max={120}
              step={4}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground text-right">
              {settings?.paddingY || 32}px
            </div>
          </div>

          <div className="space-y-2">
            <Label>Padding horizontal (px)</Label>
            <Slider
              value={[settings?.paddingX || 12]}
              onValueChange={(value) => onUpdate('paddingX', value[0])}
              min={0}
              max={60}
              step={4}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground text-right">
              {settings?.paddingX || 12}px
            </div>
          </div>

          <div className="space-y-2">
            <Label>Margen superior (px)</Label>
            <Slider
              value={[settings?.marginTop || 0]}
              onValueChange={(value) => onUpdate('marginTop', value[0])}
              min={0}
              max={100}
              step={4}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground text-right">
              {settings?.marginTop || 0}px
            </div>
          </div>

          <div className="space-y-2">
            <Label>Margen inferior (px)</Label>
            <Slider
              value={[settings?.marginBottom || 0]}
              onValueChange={(value) => onUpdate('marginBottom', value[0])}
              min={0}
              max={100}
              step={4}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground text-right">
              {settings?.marginBottom || 0}px
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <h4 className="font-medium text-sm border-b pb-2">Tarjetas de Producto</h4>
          
          <div className="space-y-2">
            <Label>Tamaño del título (px)</Label>
            <Slider
              value={[settings?.cardTitleSize || 13]}
              onValueChange={(value) => onUpdate('cardTitleSize', value[0])}
              min={10}
              max={24}
              step={1}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground text-right">
              {settings?.cardTitleSize || 13}px
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tamaño del precio (px)</Label>
            <Slider
              value={[settings?.cardPriceSize || 18]}
              onValueChange={(value) => onUpdate('cardPriceSize', value[0])}
              min={12}
              max={36}
              step={1}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground text-right">
              {settings?.cardPriceSize || 18}px
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ajuste de imagen</Label>
            <Select
              value={settings?.imageFit || 'cover'}
              onValueChange={(value) => onUpdate('imageFit', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cubrir (recortada)</SelectItem>
                <SelectItem value="contain">Contener (completa)</SelectItem>
                <SelectItem value="fill">Llenar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      </TabsContent>
      <TabsContent value="timing" className="space-y-4">
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label>Auto-reproducción</Label>
            <Switch
              checked={settings?.autoplay || false}
              onCheckedChange={(checked) => onUpdate('autoplay', checked)}
            />
          </div>

          {settings?.autoplay && (
            <>
              <div className="space-y-2">
                <Label>Retraso entre cambios (segundos)</Label>
                <Slider
                  value={[settings?.autoplayDelay || 5]}
                  onValueChange={(value) => onUpdate('autoplayDelay', value[0])}
                  min={1}
                  max={30}
                  step={1}
                  className="w-full"
                />
                <div className="text-sm text-muted-foreground text-right">
                  {settings?.autoplayDelay || 5}s
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Pausar al pasar el mouse</Label>
                <Switch
                  checked={settings?.pauseOnHover !== false}
                  onCheckedChange={(checked) => onUpdate('pauseOnHover', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Detener después de interacción</Label>
                <Switch
                  checked={settings?.stopOnInteraction || false}
                  onCheckedChange={(checked) => onUpdate('stopOnInteraction', checked)}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Velocidad de transición (ms)</Label>
            <Slider
              value={[settings?.transitionSpeed || 300]}
              onValueChange={(value) => onUpdate('transitionSpeed', value[0])}
              min={100}
              max={2000}
              step={100}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground text-right">
              {settings?.transitionSpeed || 300}ms
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de transición</Label>
            <Select
              value={settings?.transitionEffect || 'slide'}
              onValueChange={(value) => onUpdate('transitionEffect', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slide">Deslizar</SelectItem>
                <SelectItem value="fade">Desvanecer</SelectItem>
                <SelectItem value="cube">Cubo 3D</SelectItem>
                <SelectItem value="coverflow">Coverflow</SelectItem>
                <SelectItem value="flip">Voltear</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      </TabsContent>

      {/* Layout Settings */}
      <TabsContent value="layout" className="space-y-4">
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Dirección del carrusel</Label>
            <Select
              value={settings?.direction || 'horizontal'}
              onValueChange={(value) => onUpdate('direction', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="horizontal">Horizontal</SelectItem>
                <SelectItem value="vertical">Vertical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Posición del carrusel</Label>
            <Select
              value={settings?.position || 'center'}
              onValueChange={(value) => onUpdate('position', value)}
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
            <Label>Modo de visualización</Label>
            <Select
              value={settings?.displayMode || 'carousel'}
              onValueChange={(value) => onUpdate('displayMode', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="carousel">Carrusel</SelectItem>
                <SelectItem value="grid">Cuadrícula</SelectItem>
                <SelectItem value="masonry">Mosaico</SelectItem>
                <SelectItem value="stack">Apilado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Altura del carrusel</Label>
            <Input
              type="text"
              value={settings?.height || '400px'}
              onChange={(e) => onUpdate('height', e.target.value)}
              placeholder="400px, 50vh, auto"
            />
          </div>

          <div className="space-y-2">
            <Label>Ancho del carrusel</Label>
            <Select
              value={settings?.width ?? settings?.carouselWidth ?? 'full'}
              onValueChange={(value) => onUpdate('carouselWidth', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Ancho completo</SelectItem>
                <SelectItem value="container">Contenedor</SelectItem>
                <SelectItem value="narrow">Estrecho</SelectItem>
                <SelectItem value="wide">Ancho</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>Centrar diapositivas</Label>
            <Switch
              checked={settings?.centeredSlides || false}
              onCheckedChange={(checked) => onUpdate('centeredSlides', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Modo libre (Free mode)</Label>
            <Switch
              checked={settings?.freeMode || false}
              onCheckedChange={(checked) => onUpdate('freeMode', checked)}
            />
          </div>
        </Card>
      </TabsContent>

      {/* Advanced Settings */}
      <TabsContent value="advanced" className="space-y-4">
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label>Lazy loading de imágenes</Label>
            <Switch
              checked={settings?.lazyLoad !== false}
              onCheckedChange={(checked) => onUpdate('lazyLoad', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Fuente de productos</Label>
            <Select
              value={settings?.productSource || 'featured'}
              onValueChange={(value) => onUpdate('productSource', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Productos destacados</SelectItem>
                <SelectItem value="recent">Recientes</SelectItem>
                <SelectItem value="bestsellers">Más vendidos</SelectItem>
                <SelectItem value="category">Por categoría</SelectItem>
                <SelectItem value="custom">Selección manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings?.productSource === 'category' && (
            <div className="space-y-2">
              <Label>ID de categoría</Label>
              <Input
                type="text"
                value={settings?.categoryId || ''}
                onChange={(e) => onUpdate('categoryId', e.target.value)}
                placeholder="UUID de la categoría"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Límite de productos</Label>
            <Slider
              value={[settings?.productLimit || 10]}
              onValueChange={(value) => onUpdate('productLimit', value[0])}
              min={1}
              max={50}
              step={1}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground text-right">
              {settings?.productLimit || 10} productos
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Actualizar productos automáticamente</Label>
            <Switch
              checked={settings?.autoRefreshProducts || false}
              onCheckedChange={(checked) => onUpdate('autoRefreshProducts', checked)}
            />
          </div>

          {settings?.autoRefreshProducts && (
            <div className="space-y-2">
              <Label>Intervalo de actualización (minutos)</Label>
              <Slider
                value={[settings?.refreshInterval || 60]}
                onValueChange={(value) => onUpdate('refreshInterval', value[0])}
                min={5}
                max={1440}
                step={5}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground text-right">
                {settings?.refreshInterval || 60} min
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label>Rotar posiciones aleatoriamente</Label>
            <Switch
              checked={settings?.randomizePositions || false}
              onCheckedChange={(checked) => onUpdate('randomizePositions', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Keyboard navigation</Label>
            <Switch
              checked={settings?.keyboard !== false}
              onCheckedChange={(checked) => onUpdate('keyboard', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Mouse wheel control</Label>
            <Switch
              checked={settings?.mousewheel || false}
              onCheckedChange={(checked) => onUpdate('mousewheel', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Breakpoint personalizado</Label>
            <Input
              type="text"
              value={settings?.customBreakpoint || ''}
              onChange={(e) => onUpdate('customBreakpoint', e.target.value)}
              placeholder="768"
            />
          </div>
        </Card>

        {/* Botón Ver Todos los Productos */}
        <Card className="p-4 space-y-4">
          <h4 className="font-medium text-sm border-b pb-2">Botón "Ver Todos"</h4>
          
          <div className="flex items-center justify-between">
            <Label>Mostrar botón "Ver todos"</Label>
            <Switch
              checked={settings?.showViewAllButton || false}
              onCheckedChange={(checked) => onUpdate('showViewAllButton', checked)}
            />
          </div>

          {settings?.showViewAllButton && (
            <>
              <div className="space-y-2">
                <Label>Texto del botón</Label>
                <Input
                  type="text"
                  value={settings?.viewAllButtonText || 'Ver todos los productos'}
                  onChange={(e) => onUpdate('viewAllButtonText', e.target.value)}
                  placeholder="Ver todos los productos"
                />
              </div>

              <div className="space-y-2">
                <Label>URL del botón</Label>
                <Input
                  type="text"
                  value={settings?.viewAllButtonUrl || '/productos'}
                  onChange={(e) => onUpdate('viewAllButtonUrl', e.target.value)}
                  placeholder="/productos"
                />
              </div>

              <div className="space-y-2">
                <Label>Posición del botón</Label>
                <Select
                  value={settings?.viewAllButtonPosition || 'top-right'}
                  onValueChange={(value) => onUpdate('viewAllButtonPosition', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top-right">Junto al título (derecha)</SelectItem>
                    <SelectItem value="top-left">Junto al título (izquierda)</SelectItem>
                    <SelectItem value="top-center">Debajo del título (centro)</SelectItem>
                    <SelectItem value="bottom-left">Debajo del carrusel (izquierda)</SelectItem>
                    <SelectItem value="bottom-center">Debajo del carrusel (centro)</SelectItem>
                    <SelectItem value="bottom-right">Debajo del carrusel (derecha)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estilo del botón</Label>
                <Select
                  value={settings?.viewAllButtonVariant || 'default'}
                  onValueChange={(value) => onUpdate('viewAllButtonVariant', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Principal</SelectItem>
                    <SelectItem value="secondary">Secundario</SelectItem>
                    <SelectItem value="outline">Contorno</SelectItem>
                    <SelectItem value="ghost">Fantasma</SelectItem>
                    <SelectItem value="link">Enlace</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color de fondo del botón</Label>
                <Input
                  type="color"
                  value={settings?.viewAllButtonBgColor || '#3b82f6'}
                  onChange={(e) => onUpdate('viewAllButtonBgColor', e.target.value)}
                  className="h-10 w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Color del texto del botón</Label>
                <Input
                  type="color"
                  value={settings?.viewAllButtonTextColor || '#ffffff'}
                  onChange={(e) => onUpdate('viewAllButtonTextColor', e.target.value)}
                  className="h-10 w-full"
                />
              </div>
            </>
          )}
        </Card>
      </TabsContent>
    </Tabs>
  );
}
