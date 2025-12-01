import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { i18nToast, toast } from "@/lib/i18nToast";
import { Paintbrush, Type, Image as ImageIcon, Share2, Save, Sparkles, Facebook, Instagram, Twitter, Linkedin, Settings, Palette, LayoutGrid } from "lucide-react";
import { useGlobalColors } from "@/hooks/useGlobalColors";
import { professionalPalettes } from "@/data/professionalPalettes";
import { logger } from '@/lib/logger';
import { saveFontsToCache } from '@/utils/fontPersistence';
import { hexToHSL, saveAdvancedColorsToCache, DEFAULT_COLORS, DEFAULT_COLORS_DARK } from '@/utils/colorPersistence';
import { AdvancedColorCustomization } from '@/components/admin/AdvancedColorCustomization';
import { InteractiveContrastChecker } from '@/components/admin/ContrastChecker';
import { useCarouselSettings } from '@/hooks/useCarouselSettings';

/**
 * Helper to check if a color differs from both light and dark defaults
 * Returns true only if the color is explicitly customized (not a default value)
 */
const isColorCustomized = (color: string | undefined, lightDefault: string, darkDefault: string): boolean => {
  if (!color) return false;
  const normalizedColor = color.toUpperCase();
  const normalizedLight = lightDefault.toUpperCase();
  const normalizedDark = darkDefault.toUpperCase();
  return normalizedColor !== normalizedLight && normalizedColor !== normalizedDark;
};

const fontOptions = [
  { value: 'Inter', label: 'Inter (Moderno, Sans-serif)' },
  { value: 'Playfair Display', label: 'Playfair Display (Elegante, Serif)' },
  { value: 'Poppins', label: 'Poppins (Amigable, Sans-serif)' },
  { value: 'Montserrat', label: 'Montserrat (Versátil, Sans-serif)' },
  { value: 'Roboto', label: 'Roboto (Clásico, Sans-serif)' },
  { value: 'Open Sans', label: 'Open Sans (Legible, Sans-serif)' },
  { value: 'Lato', label: 'Lato (Profesional, Sans-serif)' },
  { value: 'Raleway', label: 'Raleway (Moderno, Sans-serif)' },
  { value: 'Oswald', label: 'Oswald (Impactante, Sans-serif)' },
  { value: 'Merriweather', label: 'Merriweather (Clásico, Serif)' },
  { value: 'Ubuntu', label: 'Ubuntu (Humanista, Sans-serif)' },
  { value: 'Nunito', label: 'Nunito (Redondeado, Sans-serif)' },
  { value: 'Quicksand', label: 'Quicksand (Suave, Sans-serif)' },
  { value: 'Bebas Neue', label: 'Bebas Neue (Bold, Sans-serif)' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro (Limpio, Sans-serif)' },
  { value: 'PT Sans', label: 'PT Sans (Neutral, Sans-serif)' },
  { value: 'Mulish', label: 'Mulish (Geométrico, Sans-serif)' },
  { value: 'Work Sans', label: 'Work Sans (Contemporáneo, Sans-serif)' },
  { value: 'Crimson Text', label: 'Crimson Text (Editorial, Serif)' },
  { value: 'DM Sans', label: 'DM Sans (Minimalista, Sans-serif)' },
  { value: 'Space Grotesk', label: 'Space Grotesk (Tecnológico, Sans-serif)' },
  { value: 'Abril Fatface', label: 'Abril Fatface (Decorativo, Display)' },
  { value: 'Permanent Marker', label: 'Permanent Marker (Creativo, Display)' },
  { value: 'Dancing Script', label: 'Dancing Script (Script, Cursivo)' },
  { value: 'Pacifico', label: 'Pacifico (Amigable, Display)' }
];

// Component for carousel settings tab
function CarouselSettingsTab() {
  const { settings, saveSettings, loading } = useCarouselSettings();
  const [localSettings, setLocalSettings] = useState({
    productRefreshInterval: '',
    imageRotationInterval: '',
    maxVisibleProducts: '',
  });
  const [saving, setSaving] = useState(false);

  // Initialize local state when settings load
  useEffect(() => {
    if (!loading) {
      setLocalSettings({
        productRefreshInterval: String(settings.productRefreshInterval),
        imageRotationInterval: String(settings.imageRotationInterval / 1000), // Convert to seconds for display
        maxVisibleProducts: String(settings.maxVisibleProducts),
      });
    }
  }, [settings, loading]);

  const handleSaveCarouselSettings = async () => {
    setSaving(true);
    try {
      // Parse values, handling empty strings
      const productRefresh = localSettings.productRefreshInterval === '' 
        ? settings.productRefreshInterval 
        : parseInt(localSettings.productRefreshInterval, 10);
      const imageRotation = localSettings.imageRotationInterval === '' 
        ? settings.imageRotationInterval / 1000 
        : parseInt(localSettings.imageRotationInterval, 10);
      const maxVisible = localSettings.maxVisibleProducts === '' 
        ? settings.maxVisibleProducts 
        : parseInt(localSettings.maxVisibleProducts, 10);

      // Validate values
      if (isNaN(productRefresh) || productRefresh < 5) {
        toast.error('El tiempo de actualización de productos debe ser al menos 5 segundos');
        setSaving(false);
        return;
      }
      if (isNaN(imageRotation) || imageRotation < 1) {
        toast.error('El tiempo de rotación de imágenes debe ser al menos 1 segundo');
        setSaving(false);
        return;
      }
      if (isNaN(maxVisible) || maxVisible < 1 || maxVisible > 12) {
        toast.error('El número de productos debe estar entre 1 y 12');
        setSaving(false);
        return;
      }

      const success = await saveSettings({
        productRefreshInterval: productRefresh,
        imageRotationInterval: imageRotation * 1000, // Convert to milliseconds for storage
        maxVisibleProducts: maxVisible,
      });

      if (success) {
        toast.success('Configuración del carrusel guardada correctamente');
        // Trigger reload event for carousels
        window.dispatchEvent(new CustomEvent('carousel-settings-updated'));
      } else {
        toast.error('Error al guardar la configuración');
      }
    } catch (error) {
      console.error('Error saving carousel settings:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  // Handle input change - allows empty string for editing
  const handleInputChange = (field: keyof typeof localSettings, value: string) => {
    // Allow empty string or valid numbers
    if (value === '' || /^\d+$/.test(value)) {
      setLocalSettings(prev => ({ ...prev, [field]: value }));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5" />
          Configuración del Carrusel de Productos
        </CardTitle>
        <CardDescription>
          Configura los tiempos de actualización y rotación de productos en la página de inicio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Product Refresh Interval */}
          <div className="space-y-2">
            <Label htmlFor="productRefresh">Tiempo de Actualización de Productos (segundos)</Label>
            <Input
              id="productRefresh"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={localSettings.productRefreshInterval}
              onChange={(e) => handleInputChange('productRefreshInterval', e.target.value)}
              placeholder="60"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Cada cuántos segundos se muestran nuevos productos aleatorios (mínimo 5 segundos)
            </p>
          </div>

          {/* Image Rotation Interval */}
          <div className="space-y-2">
            <Label htmlFor="imageRotation">Tiempo de Rotación de Imágenes (segundos)</Label>
            <Input
              id="imageRotation"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={localSettings.imageRotationInterval}
              onChange={(e) => handleInputChange('imageRotationInterval', e.target.value)}
              placeholder="4"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Cada cuántos segundos cambia la imagen de cada producto (mínimo 1 segundo)
            </p>
          </div>

          {/* Max Visible Products */}
          <div className="space-y-2">
            <Label htmlFor="maxVisible">Número de Productos Visibles</Label>
            <Input
              id="maxVisible"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={localSettings.maxVisibleProducts}
              onChange={(e) => handleInputChange('maxVisibleProducts', e.target.value)}
              placeholder="4"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Cuántos productos se muestran simultáneamente (1-12 productos)
            </p>
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">📝 Valores Actuales</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Productos se actualizan cada: <span className="font-medium text-foreground">{settings.productRefreshInterval} segundos</span></li>
            <li>• Imágenes rotan cada: <span className="font-medium text-foreground">{settings.imageRotationInterval / 1000} segundos</span></li>
            <li>• Productos visibles: <span className="font-medium text-foreground">{settings.maxVisibleProducts}</span></li>
          </ul>
        </div>

        <Button onClick={handleSaveCarouselSettings} disabled={saving} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar Configuración del Carrusel'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SiteCustomizer() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [customization, setCustomization] = useState({
    primary_color: "#E02C2C",
    secondary_color: "#2C3E50",
    background_color: "#FFFFFF",
    home_hero_bg_color: "#FEF2F2",
    card_bg_color: "#FFFFFF",
    text_color_light: "#1A1A1A",
    text_color_dark: "#FFFFFF",
    navbar_color: "#FFFFFF",
    font_heading: "Playfair Display",
    font_body: "Inter",
    base_font_size: "16",
    heading_size_h1: "36",
    heading_size_h2: "30",
    heading_size_h3: "24",
    sidebar_text_color: "#FFFFFF",
    sidebar_label_size: "11",
    theme_preset: "modern-bold",
    border_radius: "0.75rem",
    button_style: "rounded",
    logo_url: "",
    logo_dark_url: "",
    favicon_url: "",
    og_image: "",
    site_name: "Thuis3D.be",
    company_name: "Thuis3D.be",
    company_address: "",
    company_phone: "",
    company_tax_id: "",
    company_website: "",
    legal_email: "",
    // Nuevos campos para personalización avanzada
    header_bg_color: "#FFFFFF",
    header_text_color: "#1A1A1A",
    sidebar_bg_color: "#1E293B",
    sidebar_active_bg_color: "#3B82F6",
    home_menu_bg_color: "#FFFFFF",
    home_menu_text_color: "#1A1A1A",
    home_menu_hover_bg_color: "#F3F4F6"
  });

  useEffect(() => {
    // Aplicar tema desde caché primero para prevenir flash
    const cachedTheme = localStorage.getItem('theme_customization');
    if (cachedTheme) {
      try {
        const parsed = JSON.parse(cachedTheme);
        logger.log('🎨 [SiteCustomizer] Aplicando tema en caché primero');
        const root = document.documentElement;
        if (parsed.primary_hsl) root.style.setProperty('--primary', parsed.primary_hsl);
        if (parsed.secondary_hsl) root.style.setProperty('--secondary', parsed.secondary_hsl);
        if (parsed.background_hsl) root.style.setProperty('--background', parsed.background_hsl);
        if (parsed.home_hero_bg_hsl) root.style.setProperty('--home-hero-bg', parsed.home_hero_bg_hsl);
        if (parsed.card_bg_hsl) root.style.setProperty('--card', parsed.card_bg_hsl);
      } catch (e) {
        logger.warn('⚠️ Error al parsear tema en caché en SiteCustomizer');
      }
    }
    
    loadCustomization();
    loadSettings();
  }, []);

  // Update CSS variables whenever customization changes
  useEffect(() => {
    // CRÍTICO: Solo aplicar CSS si NO hay paleta profesional activa
    const hasProPalette = !!localStorage.getItem('selected_palette');
    if (customization.primary_color && !hasProPalette) {
      console.log('🎨 [SiteCustomizer] Aplicando CSS variables (sin paleta profesional)');
      updateCSSVariables();
    } else if (hasProPalette) {
      console.log('🎨 [SiteCustomizer] Paleta profesional detectada - NO se aplican CSS variables legacy');
    }
  }, [customization]);

  const loadCustomization = async () => {
    try {
      const { data, error } = await supabase
        .from("site_customization")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const dbData = data as any;
        setCustomization({
          primary_color: dbData.primary_color || "#E02C2C",
          secondary_color: dbData.secondary_color || "#2C3E50",
          background_color: dbData.background_color || "#FFFFFF",
          home_hero_bg_color: dbData.home_hero_bg_color || "#FEF2F2",
          card_bg_color: dbData.card_bg_color || "#FFFFFF",
          text_color_light: dbData.text_color_light || "#1A1A1A",
          text_color_dark: dbData.text_color_dark || "#FFFFFF",
          navbar_color: dbData.navbar_color || "#FFFFFF",
          font_heading: dbData.font_heading || "Playfair Display",
          font_body: dbData.font_body || "Inter",
          base_font_size: dbData.base_font_size || "16",
          heading_size_h1: dbData.heading_size_h1 || "36",
          heading_size_h2: dbData.heading_size_h2 || "30",
          heading_size_h3: dbData.heading_size_h3 || "24",
          sidebar_text_color: dbData.sidebar_text_color || "#FFFFFF",
          sidebar_label_size: dbData.sidebar_label_size || "11",
          theme_preset: dbData.theme_preset || "modern-bold",
          border_radius: dbData.border_radius || "0.75rem",
          button_style: dbData.button_style || "rounded",
          logo_url: dbData.logo_url || "",
          logo_dark_url: dbData.logo_dark_url || "",
          favicon_url: dbData.favicon_url || "",
          og_image: dbData.og_image || "",
          site_name: dbData.site_name || "Thuis3D.be",
          company_name: dbData.company_name || "Thuis3D.be",
          company_address: dbData.company_address || "",
          company_phone: dbData.company_phone || "",
          company_tax_id: dbData.company_tax_id || "",
          company_website: dbData.company_website || "",
          legal_email: dbData.legal_email || "",
          // Nuevos campos avanzados
          header_bg_color: dbData.header_bg_color || "#FFFFFF",
          header_text_color: dbData.header_text_color || "#1A1A1A",
          sidebar_bg_color: dbData.sidebar_bg_color || "#1E293B",
          sidebar_active_bg_color: dbData.sidebar_active_bg_color || "#3B82F6",
          home_menu_bg_color: dbData.home_menu_bg_color || "#FFFFFF",
          home_menu_text_color: dbData.home_menu_text_color || "#1A1A1A",
          home_menu_hover_bg_color: dbData.home_menu_hover_bg_color || "#F3F4F6"
        });
      }
    } catch (error) {
      logger.error("Error loading customization:", error);
      i18nToast.error("error.customizationLoadFailed");
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*");
      
      if (error) throw error;
      
      const settingsObj: Record<string, string> = {};
      data?.forEach(setting => {
        settingsObj[setting.setting_key] = setting.setting_value;
      });
      
      setSettings(settingsObj);
    } catch (error) {
      logger.error("Error loading settings:", error);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from("site_settings")
      .upsert(
        { setting_key: key, setting_value: value, setting_group: 'general' },
        { onConflict: 'setting_key' }
      );
    
    if (error) throw error;
  };

  const uploadFile = async (file: File, path: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      toast.error(`Error al subir archivo: ${error.message}`);
      return null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadFile(file, 'customization');
    if (url) {
      setCustomization({ ...customization, [field]: url });
      i18nToast.success("success.fileUploaded");
    }
  };

  const applyPalette = async (palette: typeof professionalPalettes[0]) => {
    console.log('🎨 [SiteCustomizer] Aplicando paleta:', palette.name);
    
    // CRÍTICO: Eliminar theme_customization para evitar conflicto
    localStorage.removeItem('theme_customization');
    console.log('🗑️ [SiteCustomizer] Cache legacy eliminado');
    
    // Aplicar la paleta inmediatamente en el CSS
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    const theme = isDark ? palette.dark : palette.light;

    // Aplicar todos los colores de la paleta
    root.style.setProperty('--background', theme.background);
    root.style.setProperty('--foreground', theme.foreground);
    root.style.setProperty('--card', theme.card);
    root.style.setProperty('--card-foreground', theme.cardForeground);
    root.style.setProperty('--popover', theme.popover);
    root.style.setProperty('--popover-foreground', theme.popoverForeground);
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-foreground', theme.primaryForeground);
    root.style.setProperty('--secondary', theme.secondary);
    root.style.setProperty('--secondary-foreground', theme.secondaryForeground);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent-foreground', theme.accentForeground);
    root.style.setProperty('--muted', theme.muted);
    root.style.setProperty('--muted-foreground', theme.mutedForeground);
    root.style.setProperty('--destructive', theme.destructive);
    root.style.setProperty('--destructive-foreground', theme.destructiveForeground);
    root.style.setProperty('--success', theme.success);
    root.style.setProperty('--success-foreground', theme.successForeground);
    root.style.setProperty('--warning', theme.warning);
    root.style.setProperty('--warning-foreground', theme.warningForeground);
    root.style.setProperty('--border', theme.border);
    root.style.setProperty('--input', theme.input);
    root.style.setProperty('--ring', theme.ring);

    // Actualizar variables del sidebar para el panel de administración
    root.style.setProperty('--sidebar-background', theme.secondary);
    root.style.setProperty('--sidebar-foreground', theme.secondaryForeground);
    root.style.setProperty('--sidebar-primary', theme.primary);
    root.style.setProperty('--sidebar-primary-foreground', theme.primaryForeground);
    root.style.setProperty('--sidebar-accent', theme.accent);
    root.style.setProperty('--sidebar-accent-foreground', theme.accentForeground);
    root.style.setProperty('--sidebar-border', theme.border);
    root.style.setProperty('--sidebar-ring', theme.ring);

    // Guardar la paleta completa en localStorage para carga instantánea
    const paletteCache = {
      palette_id: palette.id,
      palette_name: palette.name,
      light: palette.light,
      dark: palette.dark,
      applied_at: new Date().toISOString()
    };
    localStorage.setItem('selected_palette', JSON.stringify(paletteCache));

    // Actualizar estado con el theme_preset
    const updatedCustomization = { ...customization, theme_preset: palette.id };
    setCustomization(updatedCustomization);

    try {
      // Guardar automáticamente en la base de datos
      const { data: existing } = await supabase
        .from("site_customization")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("site_customization")
          .update({ theme_preset: palette.id })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_customization")
          .insert([updatedCustomization]);
        if (error) throw error;
      }
      
      toast.success(`Paleta "${palette.name}" aplicada y guardada exitosamente`);
    } catch (error: any) {
      logger.error("Error saving palette:", error);
      toast.error(`Error al guardar la paleta: ${error.message}`);
    }
  };

  const handleSave = async () => {
    if (!customization.site_name.trim()) {
      i18nToast.error("error.siteNameRequired");
      return;
    }

    if (!customization.company_name.trim()) {
      i18nToast.error("error.companyNameRequired");
      return;
    }

    try {
      // Save site_customization
      const { data: existing } = await supabase
        .from("site_customization")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("site_customization")
          .update(customization)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_customization")
          .insert([customization]);
        if (error) throw error;
      }

      // Save site_settings (social media and copyright)
      for (const [key, value] of Object.entries(settings)) {
        await updateSetting(key, value as string);
      }
      
      // Actualizar cache metadata y favicon inmediatamente
      localStorage.setItem('site_metadata', JSON.stringify({
        favicon_url: customization.favicon_url || '',
        site_name: customization.site_name || 'Thuis3D',
        cached_at: new Date().toISOString()
      }));
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon && customization.favicon_url) favicon.href = customization.favicon_url;
      const apple = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      if (apple && customization.favicon_url) apple.href = customization.favicon_url;

      // Aplicar cambios CSS inmediatamente
      updateCSSVariables();
      i18nToast.success("success.configSaved");
      loadCustomization();
      loadSettings();
    } catch (error: any) {
      logger.error("Save error:", error);
      i18nToast.error("error.configSaveFailed", { error: error.message || 'Unknown error' });
    }
  };

  const updateCSSVariables = () => {
    const root = document.documentElement;
    const hasProPalette = !!localStorage.getItem('selected_palette');

    // CRÍTICO: Si existe paleta profesional, NO tocar variables de color
    if (!hasProPalette) {
      console.log('🎨 [updateCSSVariables] Aplicando colores legacy');
      // Update colors desde personalización legacy
      const primaryHSL = hexToHSL(customization.primary_color);
      if (primaryHSL) {
        root.style.setProperty('--primary', primaryHSL);
        root.style.setProperty('--sidebar-primary', primaryHSL);
        root.style.setProperty('--sidebar-ring', primaryHSL);
      }

      const secondaryHSL = hexToHSL(customization.secondary_color);
      if (secondaryHSL) {
        root.style.setProperty('--secondary', secondaryHSL);
        root.style.setProperty('--sidebar-background', secondaryHSL);
      }

      const backgroundHSL = hexToHSL(customization.background_color);
      if (backgroundHSL) root.style.setProperty('--background', backgroundHSL);

      const homeHeroHSL = hexToHSL(customization.home_hero_bg_color);
      if (homeHeroHSL) root.style.setProperty('--home-hero-bg', homeHeroHSL);

      const cardBgHSL = hexToHSL(customization.card_bg_color);
      if (cardBgHSL) root.style.setProperty('--card', cardBgHSL);

      const textLightHSL = hexToHSL(customization.text_color_light);
      if (textLightHSL) root.style.setProperty('--foreground', textLightHSL);

      const textDarkHSL = hexToHSL(customization.text_color_dark);
      if (textDarkHSL) root.style.setProperty('--foreground-dark', textDarkHSL);

      const sidebarTextHSL = hexToHSL(customization.sidebar_text_color || "#FFFFFF");
      if (sidebarTextHSL) {
        root.style.setProperty('--sidebar-foreground', sidebarTextHSL);
      }

      if ((customization as any).admin_sidebar_bg) {
        const adminSidebarBgHSL = hexToHSL((customization as any).admin_sidebar_bg);
        if (adminSidebarBgHSL) {
          root.style.setProperty('--sidebar', adminSidebarBgHSL);
        }
      }

      if ((customization as any).admin_sidebar_active_bg) {
        const adminSidebarActiveHSL = hexToHSL((customization as any).admin_sidebar_active_bg);
        if (adminSidebarActiveHSL) {
          root.style.setProperty('--sidebar-accent', adminSidebarActiveHSL);
        }
      }

      // Guardar en localStorage para carga instantánea (solo si NO hay paleta)
      const themeData = {
        primary_color: customization.primary_color,
        primary_hsl: primaryHSL,
        secondary_color: customization.secondary_color,
        secondary_hsl: secondaryHSL,
        background_color: customization.background_color,
        background_hsl: backgroundHSL,
        home_hero_bg_color: customization.home_hero_bg_color,
        home_hero_bg_hsl: homeHeroHSL,
        card_bg_color: customization.card_bg_color,
        card_bg_hsl: cardBgHSL,
        font_heading: customization.font_heading,
        font_body: customization.font_body,
        border_radius: customization.border_radius
      };
      localStorage.setItem('theme_customization', JSON.stringify(themeData));
    } else {
      console.log('🎨 [updateCSSVariables] Paleta profesional activa: NO se tocan colores ni se guarda theme_customization');
    }

    // Update fonts - estos sí pueden convivir con paletas profesionales
    if (customization.font_heading) {
      const headingFont = `"${customization.font_heading}", serif`;
      root.style.setProperty('--font-heading', headingFont);
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(h => (h as HTMLElement).style.fontFamily = headingFont);
    }

    if (customization.font_body) {
      const bodyFont = `"${customization.font_body}", sans-serif`;
      root.style.setProperty('--font-body', bodyFont);
      document.body.style.fontFamily = bodyFont;
    }

    // Update font sizes
    if (customization.base_font_size) {
      document.body.style.fontSize = `${customization.base_font_size}px`;
    }

    if (customization.heading_size_h1) {
      document.querySelectorAll('h1').forEach(h => (h as HTMLElement).style.fontSize = `${customization.heading_size_h1}px`);
    }
    if (customization.heading_size_h2) {
      document.querySelectorAll('h2').forEach(h => (h as HTMLElement).style.fontSize = `${customization.heading_size_h2}px`);
    }
    if (customization.heading_size_h3) {
      document.querySelectorAll('h3').forEach(h => (h as HTMLElement).style.fontSize = `${customization.heading_size_h3}px`);
    }

    // Sidebar label size
    if (customization.sidebar_label_size) {
      root.style.setProperty('--sidebar-label-size', `${customization.sidebar_label_size}px`);
    }
    
    // CRITICAL: Save fonts to localStorage ALWAYS, independent of palettes
    saveFontsToCache(customization);
    console.log('💾 [updateCSSVariables] Fuentes guardadas en localStorage');

    // Update border radius
    if (customization.border_radius) {
      root.style.setProperty('--radius', customization.border_radius);
    }

    // Update home menu colors - ONLY if explicitly customized (different from both light and dark defaults)
    // This allows CSS dark mode defaults to work properly
    const homeMenuBgCustomized = isColorCustomized(
      customization.home_menu_bg_color, 
      DEFAULT_COLORS.HOME_MENU_BG, 
      DEFAULT_COLORS_DARK.HOME_MENU_BG
    );
    const homeMenuTextCustomized = isColorCustomized(
      customization.home_menu_text_color, 
      DEFAULT_COLORS.HOME_MENU_TEXT, 
      DEFAULT_COLORS_DARK.HOME_MENU_TEXT
    );
    const homeMenuHoverCustomized = isColorCustomized(
      customization.home_menu_hover_bg_color, 
      DEFAULT_COLORS.HOME_MENU_HOVER_BG, 
      DEFAULT_COLORS_DARK.HOME_MENU_HOVER_BG
    );

    if (homeMenuBgCustomized) {
      root.style.setProperty('--home-menu-bg', customization.home_menu_bg_color);
    } else {
      root.style.removeProperty('--home-menu-bg');
    }
    
    if (homeMenuTextCustomized) {
      root.style.setProperty('--home-menu-text', customization.home_menu_text_color);
    } else {
      root.style.removeProperty('--home-menu-text');
    }
    
    if (homeMenuHoverCustomized) {
      root.style.setProperty('--home-menu-hover-bg', customization.home_menu_hover_bg_color);
    } else {
      root.style.removeProperty('--home-menu-hover-bg');
    }

    // Update header colors - ONLY if explicitly customized
    const headerBgCustomized = isColorCustomized(
      customization.header_bg_color, 
      DEFAULT_COLORS.HEADER_BG, 
      DEFAULT_COLORS_DARK.HEADER_BG
    );
    const headerTextCustomized = isColorCustomized(
      customization.header_text_color, 
      DEFAULT_COLORS.HEADER_TEXT, 
      DEFAULT_COLORS_DARK.HEADER_TEXT
    );

    if (headerBgCustomized) {
      root.style.setProperty('--header-bg', customization.header_bg_color);
    } else {
      root.style.removeProperty('--header-bg');
    }
    
    if (headerTextCustomized) {
      root.style.setProperty('--header-text', customization.header_text_color);
    } else {
      root.style.removeProperty('--header-text');
    }

    // Update sidebar colors - ONLY if explicitly customized
    const sidebarBgCustomized = isColorCustomized(
      customization.sidebar_bg_color, 
      DEFAULT_COLORS.SIDEBAR_BG, 
      DEFAULT_COLORS_DARK.SIDEBAR_BG
    );
    const sidebarActiveCustomized = isColorCustomized(
      customization.sidebar_active_bg_color, 
      DEFAULT_COLORS.SIDEBAR_ACTIVE_BG, 
      DEFAULT_COLORS_DARK.SIDEBAR_ACTIVE_BG
    );
    const sidebarTextCustomized = isColorCustomized(
      customization.sidebar_text_color, 
      DEFAULT_COLORS.SIDEBAR_TEXT, 
      DEFAULT_COLORS_DARK.SIDEBAR_TEXT
    );

    if (sidebarBgCustomized) {
      const sidebarBgHSL = hexToHSL(customization.sidebar_bg_color!);
      if (sidebarBgHSL) {
        root.style.setProperty('--sidebar-background', sidebarBgHSL);
      }
    } else {
      root.style.removeProperty('--sidebar-background');
    }
    
    if (sidebarActiveCustomized) {
      const sidebarActiveHSL = hexToHSL(customization.sidebar_active_bg_color!);
      if (sidebarActiveHSL) {
        root.style.setProperty('--sidebar-accent', sidebarActiveHSL);
      }
    } else {
      root.style.removeProperty('--sidebar-accent');
    }

    if (sidebarTextCustomized) {
      const sidebarTextHSL = hexToHSL(customization.sidebar_text_color!);
      if (sidebarTextHSL) {
        root.style.setProperty('--sidebar-foreground', sidebarTextHSL);
      }
    } else {
      root.style.removeProperty('--sidebar-foreground');
    }

    // Update favicon
    if (customization.favicon_url) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) favicon.href = customization.favicon_url;
    }

    // Update page title
    if (customization.site_name) {
      document.title = customization.site_name;
    }

    // CRÍTICO: Save advanced colors to cache for instant load on refresh
    saveAdvancedColorsToCache(customization);
  };

  if (loading) return <div className="container mx-auto p-6">Cargando...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Personalizador del Sitio</h1>

      <Tabs defaultValue="themes" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="themes">
            <Sparkles className="mr-2 h-4 w-4" />
            Paletas
          </TabsTrigger>
          <TabsTrigger value="advanced-colors">
            <Palette className="mr-2 h-4 w-4" />
            Colores
          </TabsTrigger>
          <TabsTrigger value="contrast">
            <Settings className="mr-2 h-4 w-4" />
            Contraste
          </TabsTrigger>
          <TabsTrigger value="typography">
            <Type className="mr-2 h-4 w-4" />
            Tipografía
          </TabsTrigger>
          <TabsTrigger value="carousel">
            <LayoutGrid className="mr-2 h-4 w-4" />
            Carrusel
          </TabsTrigger>
          <TabsTrigger value="identity">
            <ImageIcon className="mr-2 h-4 w-4" />
            Identidad
          </TabsTrigger>
          <TabsTrigger value="company">
            <Share2 className="mr-2 h-4 w-4" />
            Empresa
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PALETAS PROFESIONALES */}
        <TabsContent value="themes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paintbrush className="h-5 w-5" />
                Paletas de Colores Profesionales
              </CardTitle>
              <CardDescription>
                Selecciona una paleta completa optimizada para modo claro y oscuro con contraste perfecto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {professionalPalettes.map((palette) => (
                  <Card
                    key={palette.id}
                    className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 overflow-hidden ${
                      customization.theme_preset === palette.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => applyPalette(palette)}
                  >
                    <div className="h-32">
                      <div className="h-16 flex">
                        <div className="flex-1" style={{ background: `hsl(${palette.light.primary})` }} />
                        <div className="flex-1" style={{ background: `hsl(${palette.light.secondary})` }} />
                        <div className="flex-1" style={{ background: `hsl(${palette.light.accent})` }} />
                      </div>
                      <div className="h-16 flex">
                        <div className="flex-1" style={{ background: `hsl(${palette.dark.primary})` }} />
                        <div className="flex-1" style={{ background: `hsl(${palette.dark.secondary})` }} />
                        <div className="flex-1" style={{ background: `hsl(${palette.dark.accent})` }} />
                      </div>
                    </div>
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm font-semibold">{palette.name}</CardTitle>
                      <CardDescription className="text-xs">{palette.description}</CardDescription>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="text-xs px-2 py-1 bg-muted rounded">Modo Claro</div>
                        <div className="text-xs px-2 py-1 bg-muted rounded">Modo Oscuro</div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              <div className="mt-6">
                <Button onClick={handleSave} className="w-full" size="lg">
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Paleta Seleccionada
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: COLORES AVANZADOS POR SECCIÓN */}
        <TabsContent value="advanced-colors">
          <Card>
            <CardHeader>
              <CardTitle>Personalización Avanzada de Colores</CardTitle>
              <CardDescription>
                Configura colores específicos para header, sidebar y menús de inicio con verificación de contraste en tiempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdvancedColorCustomization
                colors={customization}
                onColorChange={(field, value) => {
                  setCustomization({ ...customization, [field]: value });
                }}
              />
              <div className="mt-6">
                <Button onClick={handleSave} className="w-full" size="lg">
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Colores Avanzados
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: VERIFICADOR DE CONTRASTE */}
        <TabsContent value="contrast">
          <InteractiveContrastChecker />
        </TabsContent>

        {/* TAB 4: TIPOGRAFÍA */}
        <TabsContent value="typography">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Tipografía</CardTitle>
              <CardDescription>Selecciona las fuentes para encabezados y texto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Fuente para Encabezados (H1, H2, etc.)</Label>
                  <Select value={customization.font_heading} onValueChange={(value) => setCustomization({ ...customization, font_heading: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontOptions.map(font => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Vista previa: <span style={{ fontFamily: `"${customization.font_heading}", serif` }} className="font-bold text-lg">Título Ejemplo</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Fuente para Texto del Cuerpo</Label>
                  <Select value={customization.font_body} onValueChange={(value) => setCustomization({ ...customization, font_body: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontOptions.map(font => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Vista previa: <span style={{ fontFamily: `"${customization.font_body}", sans-serif` }}>Este es un texto de ejemplo</span>
                  </p>
                </div>
              </div>

              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4">📏 Tamaños de Fuente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Tamaño Base del Texto (px)</Label>
                    <Input
                      type="number"
                      min="12"
                      max="24"
                      value={customization.base_font_size}
                      onChange={(e) => setCustomization({ ...customization, base_font_size: e.target.value })}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Tamaño estándar del texto en todo el sitio (recomendado: 16px)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Tamaño H1 (px)</Label>
                    <Input
                      type="number"
                      min="24"
                      max="72"
                      value={customization.heading_size_h1}
                      onChange={(e) => setCustomization({ ...customization, heading_size_h1: e.target.value })}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Títulos principales (recomendado: 36-48px)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Tamaño H2 (px)</Label>
                    <Input
                      type="number"
                      min="20"
                      max="60"
                      value={customization.heading_size_h2}
                      onChange={(e) => setCustomization({ ...customization, heading_size_h2: e.target.value })}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Subtítulos (recomendado: 30-36px)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Tamaño H3 (px)</Label>
                    <Input
                      type="number"
                      min="16"
                      max="48"
                      value={customization.heading_size_h3}
                      onChange={(e) => setCustomization({ ...customization, heading_size_h3: e.target.value })}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Secciones (recomendado: 24-30px)
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-2">
                  <Label>Radio de Bordes</Label>
                  <Select value={customization.border_radius} onValueChange={(value) => setCustomization({ ...customization, border_radius: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0rem">Sin redondeo (0px)</SelectItem>
                      <SelectItem value="0.375rem">Suave (6px)</SelectItem>
                      <SelectItem value="0.5rem">Moderado (8px)</SelectItem>
                      <SelectItem value="0.75rem">Estándar (12px)</SelectItem>
                      <SelectItem value="1rem">Redondeado (16px)</SelectItem>
                      <SelectItem value="1.5rem">Muy redondeado (24px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estilo de Botones</Label>
                  <Select value={customization.button_style} onValueChange={(value) => setCustomization({ ...customization, button_style: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sharp">Cuadrados</SelectItem>
                      <SelectItem value="rounded">Redondeados</SelectItem>
                      <SelectItem value="pill">Píldora (muy redondeado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSave} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Guardar Tipografía
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: CARRUSEL DE PRODUCTOS */}
        <TabsContent value="carousel">
          <CarouselSettingsTab />
        </TabsContent>

        {/* TAB 6: IDENTIDAD (LOGOS) */}
        <TabsContent value="identity">
          <Card>
            <CardHeader>
              <CardTitle>Identidad Visual</CardTitle>
              <CardDescription>Sube logos y favicon de tu marca</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Logo Principal (Modo Claro)</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'logo_url')}
                      className="flex-1"
                    />
                    {customization.logo_url && (
                      <img src={customization.logo_url} alt="Logo" className="h-16 w-auto border rounded p-1" />
                    )}
                  </div>
                </div>

                <div>
                  <Label>Logo Modo Oscuro (Opcional)</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'logo_dark_url')}
                      className="flex-1"
                    />
                    {customization.logo_dark_url && (
                      <img src={customization.logo_dark_url} alt="Logo Dark" className="h-16 w-auto border rounded p-1 bg-gray-800" />
                    )}
                  </div>
                </div>

                <div>
                  <Label>Favicon (Ícono de Pestaña del Navegador)</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Este ícono aparece en las pestañas del navegador y en los marcadores.
                    Recomendado: imagen cuadrada de 32x32px o 512x512px en formato PNG o ICO.
                  </p>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'favicon_url')}
                      className="flex-1"
                    />
                    {customization.favicon_url && (
                      <div className="flex flex-col items-center gap-1">
                        <img src={customization.favicon_url} alt="Favicon" className="h-10 w-10 border rounded object-cover" />
                        <span className="text-xs text-muted-foreground">Vista previa</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Imagen para Buscadores (Open Graph)</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Esta es la imagen que aparece en los resultados de búsqueda de Google, cuando se comparte tu sitio en redes sociales, y en las vistas previas de enlaces.
                    Recomendado: 1200x630px en formato JPG o PNG.
                  </p>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'og_image')}
                      className="flex-1"
                    />
                    {customization.og_image && (
                      <div className="flex flex-col items-center gap-1">
                        <img src={customization.og_image} alt="Open Graph" className="h-20 w-auto border rounded object-cover" />
                        <span className="text-xs text-muted-foreground">Vista previa</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Nombre del Sitio</Label>
                  <Input
                    value={customization.site_name}
                    onChange={(e) => setCustomization({ ...customization, site_name: e.target.value })}
                    placeholder="Thuis3D.be"
                  />
                </div>
              </div>

              <Button onClick={handleSave} className="w-full">Guardar Identidad</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: EMPRESA Y REDES SOCIALES (UNIFICADO) */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>🏢 Información de la Empresa</CardTitle>
              <CardDescription>Datos que aparecen en facturas y documentos oficiales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nombre de la Empresa</Label>
                <Input
                  value={customization.company_name || ""}
                  onChange={(e) => setCustomization({ ...customization, company_name: e.target.value })}
                  placeholder="Thuis3D.be"
                />
              </div>
              <div>
                <Label>📧 Email Legal/Contacto</Label>
                <Input
                  type="email"
                  value={customization.legal_email || ""}
                  onChange={(e) => setCustomization({ ...customization, legal_email: e.target.value })}
                  placeholder="info@thuis3d.be"
                />
              </div>
              <div>
                <Label>📞 Teléfono de la Empresa</Label>
                <Input
                  value={customization.company_phone || ""}
                  onChange={(e) => setCustomization({ ...customization, company_phone: e.target.value })}
                  placeholder="+32 XXX XX XX XX"
                />
              </div>
              <div>
                <Label>📍 Dirección de la Empresa (multi-línea)</Label>
                <Textarea
                  value={customization.company_address || ""}
                  onChange={(e) => setCustomization({ ...customization, company_address: e.target.value })}
                  placeholder="Calle Principal 123&#10;Ciudad, CP 12345&#10;País"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Cada línea aparecerá separada en la factura
                </p>
              </div>
              <div>
                <Label>🏦 NIF/CIF/VAT Number</Label>
                <Input
                  value={customization.company_tax_id || ""}
                  onChange={(e) => setCustomization({ ...customization, company_tax_id: e.target.value })}
                  placeholder="BE0123456789"
                />
              </div>
              <div>
                <Label>🌐 Sitio Web</Label>
                <Input
                  value={customization.company_website || ""}
                  onChange={(e) => setCustomization({ ...customization, company_website: e.target.value })}
                  placeholder="https://www.thuis3d.be"
                />
              </div>
              <div>
                <Label>© Texto de Copyright</Label>
                <Input
                  value={settings.copyright_text || ""}
                  onChange={(e) => setSettings({ ...settings, copyright_text: e.target.value })}
                  placeholder={`© ${new Date().getFullYear()} Thuis3D.be - Todos los derechos reservados`}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Redes Sociales</CardTitle>
              <CardDescription>URLs completas de tus perfiles en redes sociales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Facebook className="h-4 w-4" />
                  Facebook
                </Label>
                <Input
                  value={settings.social_facebook || ""}
                  onChange={(e) => setSettings({ ...settings, social_facebook: e.target.value })}
                  placeholder="https://facebook.com/tu-pagina"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </Label>
                <Input
                  value={settings.social_instagram || ""}
                  onChange={(e) => setSettings({ ...settings, social_instagram: e.target.value })}
                  placeholder="https://instagram.com/tu-perfil"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Twitter className="h-4 w-4" />
                  X (Twitter)
                </Label>
                <Input
                  value={settings.social_twitter || ""}
                  onChange={(e) => setSettings({ ...settings, social_twitter: e.target.value })}
                  placeholder="https://twitter.com/tu-perfil"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </Label>
                <Input
                  value={settings.social_linkedin || ""}
                  onChange={(e) => setSettings({ ...settings, social_linkedin: e.target.value })}
                  placeholder="https://linkedin.com/company/tu-empresa"
                />
              </div>
              <div>
                <Label>TikTok</Label>
                <Input
                  value={settings.social_tiktok || ""}
                  onChange={(e) => setSettings({ ...settings, social_tiktok: e.target.value })}
                  placeholder="https://tiktok.com/@tu-perfil"
                />
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} className="w-full" size="lg">
            <Save className="mr-2 h-4 w-4" />
            Guardar Configuración
          </Button>
        </TabsContent>

      </Tabs>
    </div>
  );
}
