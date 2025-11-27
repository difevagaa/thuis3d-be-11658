import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContrastChecker } from './ContrastChecker';
import { Menu, LayoutDashboard, Home, AlertCircle, Moon, Sun } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTheme } from 'next-themes';
import { DEFAULT_COLORS, DEFAULT_COLORS_DARK } from '@/utils/colorPersistence';

interface AdvancedColorCustomizationProps {
  colors: {
    header_bg_color?: string;
    header_text_color?: string;
    sidebar_bg_color?: string;
    sidebar_active_bg_color?: string;
    sidebar_text_color?: string;
    home_menu_bg_color?: string;
    home_menu_text_color?: string;
    home_menu_hover_bg_color?: string;
  };
  onColorChange: (field: string, value: string) => void;
}

export function AdvancedColorCustomization({ colors, onColorChange }: AdvancedColorCustomizationProps) {
  const [activePreview, setActivePreview] = useState<'header' | 'sidebar' | 'home'>('header');
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Wait for theme to be resolved on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get theme-aware default colors
  const getThemeDefaults = () => {
    const isDark = mounted && resolvedTheme === 'dark';
    return isDark ? DEFAULT_COLORS_DARK : DEFAULT_COLORS;
  };

  const themeDefaults = getThemeDefaults();

  const defaultColors = {
    header_bg_color: colors.header_bg_color || themeDefaults.HEADER_BG,
    header_text_color: colors.header_text_color || themeDefaults.HEADER_TEXT,
    sidebar_bg_color: colors.sidebar_bg_color || themeDefaults.SIDEBAR_BG,
    sidebar_active_bg_color: colors.sidebar_active_bg_color || themeDefaults.SIDEBAR_ACTIVE_BG,
    sidebar_text_color: colors.sidebar_text_color || themeDefaults.SIDEBAR_TEXT,
    home_menu_bg_color: colors.home_menu_bg_color || themeDefaults.HOME_MENU_BG,
    home_menu_text_color: colors.home_menu_text_color || themeDefaults.HOME_MENU_TEXT,
    home_menu_hover_bg_color: colors.home_menu_hover_bg_color || themeDefaults.HOME_MENU_HOVER_BG,
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center gap-2">
          <span>
            Personaliza los colores de diferentes secciones de forma independiente. 
            Las vistas previas te ayudarán a visualizar los cambios en tiempo real.
          </span>
          {mounted && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted">
              {resolvedTheme === 'dark' ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
              Modo {resolvedTheme === 'dark' ? 'oscuro' : 'claro'}
            </span>
          )}
        </AlertDescription>
      </Alert>

      <Alert variant="default" className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Nota:</strong> Si no personalizas los colores, el sistema usará automáticamente 
          colores apropiados para modo claro y modo oscuro, garantizando buena legibilidad.
        </AlertDescription>
      </Alert>

      <Tabs value={activePreview} onValueChange={(v) => setActivePreview(v as 'header' | 'sidebar' | 'home')} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="header">
            <Menu className="mr-2 h-4 w-4" />
            Header
          </TabsTrigger>
          <TabsTrigger value="sidebar">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Sidebar
          </TabsTrigger>
          <TabsTrigger value="home">
            <Home className="mr-2 h-4 w-4" />
            Vista Inicio
          </TabsTrigger>
        </TabsList>

        {/* HEADER CUSTOMIZATION */}
        <TabsContent value="header" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Barra Superior / Header</CardTitle>
              <CardDescription>
                Personaliza el color de fondo y texto del header principal del sitio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Color de Fondo del Header</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={defaultColors.header_bg_color}
                      onChange={(e) => onColorChange('header_bg_color', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={defaultColors.header_bg_color}
                      onChange={(e) => onColorChange('header_bg_color', e.target.value)}
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Color del Texto del Header</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={defaultColors.header_text_color}
                      onChange={(e) => onColorChange('header_text_color', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={defaultColors.header_text_color}
                      onChange={(e) => onColorChange('header_text_color', e.target.value)}
                      placeholder="#1A1A1A"
                    />
                  </div>
                </div>
              </div>

              {/* Vista Previa del Header */}
              <div className="mt-6">
                <Label className="mb-2 block">Vista Previa del Header</Label>
                <div 
                  className="p-4 rounded-lg border-2 transition-all"
                  style={{ 
                    backgroundColor: defaultColors.header_bg_color,
                    color: defaultColors.header_text_color
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded bg-current opacity-20"></div>
                      <span className="font-bold text-lg">Logo</span>
                    </div>
                    <nav className="flex gap-4">
                      <span className="cursor-pointer hover:opacity-70">Inicio</span>
                      <span className="cursor-pointer hover:opacity-70">Servicios</span>
                      <span className="cursor-pointer hover:opacity-70">Contacto</span>
                    </nav>
                  </div>
                </div>
              </div>

              {/* Verificador de Contraste */}
              <div className="mt-4">
                <Label className="mb-2 block">Verificación de Contraste</Label>
                <ContrastChecker
                  foreground={defaultColors.header_text_color}
                  background={defaultColors.header_bg_color}
                  label="Texto del header sobre fondo del header"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SIDEBAR CUSTOMIZATION */}
        <TabsContent value="sidebar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Menú Lateral / Sidebar</CardTitle>
              <CardDescription>
                Personaliza los colores del menú lateral del panel de administración
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Color de Fondo del Sidebar</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={defaultColors.sidebar_bg_color}
                      onChange={(e) => onColorChange('sidebar_bg_color', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={defaultColors.sidebar_bg_color}
                      onChange={(e) => onColorChange('sidebar_bg_color', e.target.value)}
                      placeholder="#1E293B"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Color del Texto del Sidebar</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={defaultColors.sidebar_text_color}
                      onChange={(e) => onColorChange('sidebar_text_color', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={defaultColors.sidebar_text_color}
                      onChange={(e) => onColorChange('sidebar_text_color', e.target.value)}
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Color de Elemento Activo</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={defaultColors.sidebar_active_bg_color}
                      onChange={(e) => onColorChange('sidebar_active_bg_color', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={defaultColors.sidebar_active_bg_color}
                      onChange={(e) => onColorChange('sidebar_active_bg_color', e.target.value)}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
              </div>

              {/* Vista Previa del Sidebar */}
              <div className="mt-6">
                <Label className="mb-2 block">Vista Previa del Sidebar</Label>
                <div 
                  className="p-4 rounded-lg border-2 transition-all"
                  style={{ 
                    backgroundColor: defaultColors.sidebar_bg_color,
                    color: defaultColors.sidebar_text_color
                  }}
                >
                  <div className="space-y-2">
                    <div className="p-2 rounded hover:opacity-80 cursor-pointer">
                      📊 Dashboard
                    </div>
                    <div 
                      className="p-2 rounded"
                      style={{ backgroundColor: defaultColors.sidebar_active_bg_color }}
                    >
                      ⚙️ Configuración (Activo)
                    </div>
                    <div className="p-2 rounded hover:opacity-80 cursor-pointer">
                      👥 Usuarios
                    </div>
                    <div className="p-2 rounded hover:opacity-80 cursor-pointer">
                      📦 Productos
                    </div>
                  </div>
                </div>
              </div>

              {/* Verificadores de Contraste */}
              <div className="mt-4 space-y-3">
                <Label className="mb-2 block">Verificación de Contraste</Label>
                <ContrastChecker
                  foreground={defaultColors.sidebar_text_color}
                  background={defaultColors.sidebar_bg_color}
                  label="Texto del sidebar sobre fondo del sidebar"
                />
                <ContrastChecker
                  foreground={defaultColors.sidebar_text_color}
                  background={defaultColors.sidebar_active_bg_color}
                  label="Texto sobre elemento activo"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HOME MENU CUSTOMIZATION */}
        <TabsContent value="home" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Menús de la Vista de Inicio</CardTitle>
              <CardDescription>
                Personaliza los colores de los menús y navegación en la página de inicio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Color de Fondo del Menú</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={defaultColors.home_menu_bg_color}
                      onChange={(e) => onColorChange('home_menu_bg_color', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={defaultColors.home_menu_bg_color}
                      onChange={(e) => onColorChange('home_menu_bg_color', e.target.value)}
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Color del Texto del Menú</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={defaultColors.home_menu_text_color}
                      onChange={(e) => onColorChange('home_menu_text_color', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={defaultColors.home_menu_text_color}
                      onChange={(e) => onColorChange('home_menu_text_color', e.target.value)}
                      placeholder="#1A1A1A"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Color al Pasar el Cursor (Hover)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={defaultColors.home_menu_hover_bg_color}
                      onChange={(e) => onColorChange('home_menu_hover_bg_color', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={defaultColors.home_menu_hover_bg_color}
                      onChange={(e) => onColorChange('home_menu_hover_bg_color', e.target.value)}
                      placeholder="#F3F4F6"
                    />
                  </div>
                </div>
              </div>

              {/* Vista Previa del Menú de Inicio */}
              <div className="mt-6">
                <Label className="mb-2 block">Vista Previa del Menú de Inicio</Label>
                <div 
                  className="p-4 rounded-lg border-2 transition-all"
                  style={{ 
                    backgroundColor: defaultColors.home_menu_bg_color,
                    color: defaultColors.home_menu_text_color
                  }}
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded text-center cursor-pointer transition-colors"
                         style={{ backgroundColor: 'transparent' }}
                         onMouseEnter={(e) => e.currentTarget.style.backgroundColor = defaultColors.home_menu_hover_bg_color}
                         onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      🏠 Inicio
                    </div>
                    <div className="p-3 rounded text-center cursor-pointer transition-colors"
                         style={{ backgroundColor: 'transparent' }}
                         onMouseEnter={(e) => e.currentTarget.style.backgroundColor = defaultColors.home_menu_hover_bg_color}
                         onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      📦 Productos
                    </div>
                    <div className="p-3 rounded text-center cursor-pointer transition-colors"
                         style={{ backgroundColor: 'transparent' }}
                         onMouseEnter={(e) => e.currentTarget.style.backgroundColor = defaultColors.home_menu_hover_bg_color}
                         onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      💼 Servicios
                    </div>
                    <div className="p-3 rounded text-center cursor-pointer transition-colors"
                         style={{ backgroundColor: 'transparent' }}
                         onMouseEnter={(e) => e.currentTarget.style.backgroundColor = defaultColors.home_menu_hover_bg_color}
                         onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      📞 Contacto
                    </div>
                  </div>
                </div>
              </div>

              {/* Verificadores de Contraste */}
              <div className="mt-4 space-y-3">
                <Label className="mb-2 block">Verificación de Contraste</Label>
                <ContrastChecker
                  foreground={defaultColors.home_menu_text_color}
                  background={defaultColors.home_menu_bg_color}
                  label="Texto del menú sobre fondo del menú"
                />
                <ContrastChecker
                  foreground={defaultColors.home_menu_text_color}
                  background={defaultColors.home_menu_hover_bg_color}
                  label="Texto sobre hover"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
