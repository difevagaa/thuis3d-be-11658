/**
 * Footer Editor - Complete configuration for footer customization
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { 
  Save, 
  Eye, 
  Layout, 
  Type, 
  Palette, 
  Link as LinkIcon, 
  Mail, 
  CreditCard,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Share2,
  Grid3X3,
  Sparkles,
  RefreshCw
} from "lucide-react";

interface FooterSettings {
  id: string;
  show_footer: boolean;
  background_color: string;
  text_color: string;
  border_color: string;
  title_font_size: number;
  title_font_weight: string;
  text_font_size: number;
  link_font_size: number;
  padding_top: number;
  padding_bottom: number;
  padding_horizontal: number;
  section_gap: number;
  show_brand_section: boolean;
  brand_name: string;
  brand_tagline: string;
  show_social_icons: boolean;
  social_icon_size: number;
  social_icon_color: string;
  social_facebook: string;
  social_instagram: string;
  social_twitter: string;
  social_linkedin: string;
  social_tiktok: string;
  social_youtube: string;
  show_help_section: boolean;
  help_section_title: string;
  show_faq_link: boolean;
  show_terms_link: boolean;
  show_privacy_link: boolean;
  show_cookies_link: boolean;
  show_legal_link: boolean;
  show_quick_links: boolean;
  quick_links_title: string;
  show_catalog_link: boolean;
  show_quote_link: boolean;
  show_gift_cards_link: boolean;
  show_blog_link: boolean;
  show_newsletter: boolean;
  newsletter_title: string;
  newsletter_description: string;
  newsletter_placeholder: string;
  newsletter_button_color: string;
  show_payment_methods: boolean;
  payment_methods_title: string;
  show_visa: boolean;
  show_mastercard: boolean;
  show_bancontact: boolean;
  show_paypal: boolean;
  show_ideal: boolean;
  show_copyright: boolean;
  copyright_text: string;
  columns_layout: string;
  border_top_width: number;
  border_top_style: string;
}

const defaultSettings: Omit<FooterSettings, 'id'> = {
  show_footer: true,
  background_color: '',
  text_color: '',
  border_color: '',
  title_font_size: 18,
  title_font_weight: '700',
  text_font_size: 14,
  link_font_size: 14,
  padding_top: 48,
  padding_bottom: 48,
  padding_horizontal: 16,
  section_gap: 32,
  show_brand_section: true,
  brand_name: '',
  brand_tagline: '',
  show_social_icons: true,
  social_icon_size: 20,
  social_icon_color: '',
  social_facebook: '',
  social_instagram: '',
  social_twitter: '',
  social_linkedin: '',
  social_tiktok: '',
  social_youtube: '',
  show_help_section: true,
  help_section_title: 'Ayuda',
  show_faq_link: true,
  show_terms_link: true,
  show_privacy_link: true,
  show_cookies_link: true,
  show_legal_link: true,
  show_quick_links: true,
  quick_links_title: 'Enlaces Rápidos',
  show_catalog_link: true,
  show_quote_link: true,
  show_gift_cards_link: true,
  show_blog_link: true,
  show_newsletter: true,
  newsletter_title: 'Newsletter',
  newsletter_description: '',
  newsletter_placeholder: '',
  newsletter_button_color: '',
  show_payment_methods: true,
  payment_methods_title: '',
  show_visa: true,
  show_mastercard: true,
  show_bancontact: true,
  show_paypal: true,
  show_ideal: false,
  show_copyright: true,
  copyright_text: '',
  columns_layout: '4',
  border_top_width: 1,
  border_top_style: 'solid'
};

export function FooterEditor() {
  const { t } = useTranslation(['admin', 'common']);
  const [settings, setSettings] = useState<FooterSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('footer_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings(data as FooterSettings);
      } else {
        // Create default settings if none exist
        const { data: newData, error: insertError } = await supabase
          .from('footer_settings')
          .insert(defaultSettings)
          .select()
          .single();
        
        if (insertError) throw insertError;
        setSettings(newData as FooterSettings);
      }
    } catch (error) {
      logger.error('Error loading footer settings:', error);
      toast.error('Error al cargar la configuración del pie de página');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('footer_settings')
        .update(settings)
        .eq('id', settings.id);

      if (error) throw error;
      
      setHasChanges(false);
      toast.success('Configuración del pie de página guardada correctamente');
    } catch (error) {
      logger.error('Error saving footer settings:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof FooterSettings>(key: K, value: FooterSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No se pudo cargar la configuración</p>
        <Button onClick={loadSettings} className="mt-4">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Editor del Pie de Página</h2>
          <p className="text-muted-foreground">Personaliza todos los elementos del footer</p>
        </div>
        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            <span className="hidden md:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="brand" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden md:inline">Marca</span>
          </TabsTrigger>
          <TabsTrigger value="links" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            <span className="hidden md:inline">Enlaces</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            <span className="hidden md:inline">Redes</span>
          </TabsTrigger>
          <TabsTrigger value="newsletter" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden md:inline">Newsletter</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden md:inline">Pagos</span>
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[calc(100vh-300px)] mt-4">
          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Configuración General
                </CardTitle>
                <CardDescription>Ajustes de diseño y apariencia del pie de página</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mostrar Pie de Página</Label>
                    <p className="text-xs text-muted-foreground">Activar o desactivar el footer</p>
                  </div>
                  <Switch
                    checked={settings.show_footer}
                    onCheckedChange={(checked) => updateSetting('show_footer', checked)}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Color de Fondo</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={settings.background_color || '#ffffff'}
                        onChange={(e) => updateSetting('background_color', e.target.value)}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={settings.background_color}
                        onChange={(e) => updateSetting('background_color', e.target.value)}
                        placeholder="ej: #f5f5f5"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Dejar vacío para usar el color del tema</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Color de Texto</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={settings.text_color || '#000000'}
                        onChange={(e) => updateSetting('text_color', e.target.value)}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={settings.text_color}
                        onChange={(e) => updateSetting('text_color', e.target.value)}
                        placeholder="ej: #333333"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Color del Borde Superior</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={settings.border_color || '#e5e5e5'}
                        onChange={(e) => updateSetting('border_color', e.target.value)}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={settings.border_color}
                        onChange={(e) => updateSetting('border_color', e.target.value)}
                        placeholder="ej: #e5e5e5"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Estilo del Borde</Label>
                    <Select
                      value={settings.border_top_style}
                      onValueChange={(value) => updateSetting('border_top_style', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin borde</SelectItem>
                        <SelectItem value="solid">Sólido</SelectItem>
                        <SelectItem value="dashed">Guiones</SelectItem>
                        <SelectItem value="dotted">Puntos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Tipografía
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tamaño de Títulos: {settings.title_font_size}px</Label>
                      <Slider
                        value={[settings.title_font_size]}
                        onValueChange={([value]) => updateSetting('title_font_size', value)}
                        min={12}
                        max={28}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Peso de Títulos</Label>
                      <Select
                        value={settings.title_font_weight}
                        onValueChange={(value) => updateSetting('title_font_weight', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="400">Normal</SelectItem>
                          <SelectItem value="500">Medio</SelectItem>
                          <SelectItem value="600">Semi-negrita</SelectItem>
                          <SelectItem value="700">Negrita</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tamaño de Texto: {settings.text_font_size}px</Label>
                      <Slider
                        value={[settings.text_font_size]}
                        onValueChange={([value]) => updateSetting('text_font_size', value)}
                        min={10}
                        max={20}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tamaño de Enlaces: {settings.link_font_size}px</Label>
                      <Slider
                        value={[settings.link_font_size]}
                        onValueChange={([value]) => updateSetting('link_font_size', value)}
                        min={10}
                        max={20}
                        step={1}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4" />
                    Espaciado y Diseño
                  </h4>

                  <div className="space-y-2">
                    <Label>Número de Columnas</Label>
                    <Select
                      value={settings.columns_layout}
                      onValueChange={(value) => updateSetting('columns_layout', value)}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Espacio Superior: {settings.padding_top}px</Label>
                      <Slider
                        value={[settings.padding_top]}
                        onValueChange={([value]) => updateSetting('padding_top', value)}
                        min={0}
                        max={100}
                        step={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Espacio Inferior: {settings.padding_bottom}px</Label>
                      <Slider
                        value={[settings.padding_bottom]}
                        onValueChange={([value]) => updateSetting('padding_bottom', value)}
                        min={0}
                        max={100}
                        step={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Espacio Horizontal: {settings.padding_horizontal}px</Label>
                      <Slider
                        value={[settings.padding_horizontal]}
                        onValueChange={([value]) => updateSetting('padding_horizontal', value)}
                        min={0}
                        max={60}
                        step={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Espacio entre Secciones: {settings.section_gap}px</Label>
                      <Slider
                        value={[settings.section_gap]}
                        onValueChange={([value]) => updateSetting('section_gap', value)}
                        min={16}
                        max={64}
                        step={8}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Brand Settings */}
          <TabsContent value="brand" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Marca y Copyright
                </CardTitle>
                <CardDescription>Configura la información de tu marca en el footer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mostrar Sección de Marca</Label>
                    <p className="text-xs text-muted-foreground">Muestra el nombre y tagline</p>
                  </div>
                  <Switch
                    checked={settings.show_brand_section}
                    onCheckedChange={(checked) => updateSetting('show_brand_section', checked)}
                  />
                </div>

                {settings.show_brand_section && (
                  <>
                    <div className="space-y-2">
                      <Label>Nombre de la Marca</Label>
                      <Input
                        value={settings.brand_name}
                        onChange={(e) => updateSetting('brand_name', e.target.value)}
                        placeholder="ej: Mi Tienda 3D"
                      />
                      <p className="text-xs text-muted-foreground">Dejar vacío para usar el nombre del sitio</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Eslogan / Tagline</Label>
                      <Input
                        value={settings.brand_tagline}
                        onChange={(e) => updateSetting('brand_tagline', e.target.value)}
                        placeholder="ej: Impresión 3D profesional"
                      />
                      <p className="text-xs text-muted-foreground">Dejar vacío para usar el tagline por defecto</p>
                    </div>
                  </>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mostrar Copyright</Label>
                    <p className="text-xs text-muted-foreground">Texto de derechos de autor en la parte inferior</p>
                  </div>
                  <Switch
                    checked={settings.show_copyright}
                    onCheckedChange={(checked) => updateSetting('show_copyright', checked)}
                  />
                </div>

                {settings.show_copyright && (
                  <div className="space-y-2">
                    <Label>Texto de Copyright</Label>
                    <Input
                      value={settings.copyright_text}
                      onChange={(e) => updateSetting('copyright_text', e.target.value)}
                      placeholder="ej: © 2025 Mi Empresa - Todos los derechos reservados"
                    />
                    <p className="text-xs text-muted-foreground">Dejar vacío para generar automáticamente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Links Settings */}
          <TabsContent value="links" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Sección de Ayuda
                </CardTitle>
                <CardDescription>Configura los enlaces de ayuda y legales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Mostrar Sección de Ayuda</Label>
                  <Switch
                    checked={settings.show_help_section}
                    onCheckedChange={(checked) => updateSetting('show_help_section', checked)}
                  />
                </div>

                {settings.show_help_section && (
                  <>
                    <div className="space-y-2">
                      <Label>Título de la Sección</Label>
                      <Input
                        value={settings.help_section_title}
                        onChange={(e) => updateSetting('help_section_title', e.target.value)}
                        placeholder="Ayuda"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Enlace FAQ</Label>
                        <Switch
                          checked={settings.show_faq_link}
                          onCheckedChange={(checked) => updateSetting('show_faq_link', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Términos y Condiciones</Label>
                        <Switch
                          checked={settings.show_terms_link}
                          onCheckedChange={(checked) => updateSetting('show_terms_link', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Política de Privacidad</Label>
                        <Switch
                          checked={settings.show_privacy_link}
                          onCheckedChange={(checked) => updateSetting('show_privacy_link', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Política de Cookies</Label>
                        <Switch
                          checked={settings.show_cookies_link}
                          onCheckedChange={(checked) => updateSetting('show_cookies_link', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Aviso Legal</Label>
                        <Switch
                          checked={settings.show_legal_link}
                          onCheckedChange={(checked) => updateSetting('show_legal_link', checked)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Enlaces Rápidos
                </CardTitle>
                <CardDescription>Configura los enlaces rápidos del footer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Mostrar Enlaces Rápidos</Label>
                  <Switch
                    checked={settings.show_quick_links}
                    onCheckedChange={(checked) => updateSetting('show_quick_links', checked)}
                  />
                </div>

                {settings.show_quick_links && (
                  <>
                    <div className="space-y-2">
                      <Label>Título de la Sección</Label>
                      <Input
                        value={settings.quick_links_title}
                        onChange={(e) => updateSetting('quick_links_title', e.target.value)}
                        placeholder="Enlaces Rápidos"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Catálogo</Label>
                        <Switch
                          checked={settings.show_catalog_link}
                          onCheckedChange={(checked) => updateSetting('show_catalog_link', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Cotizaciones</Label>
                        <Switch
                          checked={settings.show_quote_link}
                          onCheckedChange={(checked) => updateSetting('show_quote_link', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Tarjetas Regalo</Label>
                        <Switch
                          checked={settings.show_gift_cards_link}
                          onCheckedChange={(checked) => updateSetting('show_gift_cards_link', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Blog</Label>
                        <Switch
                          checked={settings.show_blog_link}
                          onCheckedChange={(checked) => updateSetting('show_blog_link', checked)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Settings */}
          <TabsContent value="social" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Redes Sociales
                </CardTitle>
                <CardDescription>Configura los iconos y enlaces de redes sociales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label>Mostrar Iconos de Redes</Label>
                  <Switch
                    checked={settings.show_social_icons}
                    onCheckedChange={(checked) => updateSetting('show_social_icons', checked)}
                  />
                </div>

                {settings.show_social_icons && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tamaño de Iconos: {settings.social_icon_size}px</Label>
                        <Slider
                          value={[settings.social_icon_size]}
                          onValueChange={([value]) => updateSetting('social_icon_size', value)}
                          min={16}
                          max={40}
                          step={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Color de Iconos</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={settings.social_icon_color || '#333333'}
                            onChange={(e) => updateSetting('social_icon_color', e.target.value)}
                            className="w-12 h-10 p-1"
                          />
                          <Input
                            value={settings.social_icon_color}
                            onChange={(e) => updateSetting('social_icon_color', e.target.value)}
                            placeholder="Usar color del tema"
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Facebook className="h-4 w-4" /> Facebook
                        </Label>
                        <Input
                          value={settings.social_facebook}
                          onChange={(e) => updateSetting('social_facebook', e.target.value)}
                          placeholder="https://facebook.com/tupagina"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Instagram className="h-4 w-4" /> Instagram
                        </Label>
                        <Input
                          value={settings.social_instagram}
                          onChange={(e) => updateSetting('social_instagram', e.target.value)}
                          placeholder="https://instagram.com/tupagina"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Twitter className="h-4 w-4" /> X (Twitter)
                        </Label>
                        <Input
                          value={settings.social_twitter}
                          onChange={(e) => updateSetting('social_twitter', e.target.value)}
                          placeholder="https://x.com/tupagina"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Linkedin className="h-4 w-4" /> LinkedIn
                        </Label>
                        <Input
                          value={settings.social_linkedin}
                          onChange={(e) => updateSetting('social_linkedin', e.target.value)}
                          placeholder="https://linkedin.com/company/tuempresa"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Youtube className="h-4 w-4" /> YouTube
                        </Label>
                        <Input
                          value={settings.social_youtube}
                          onChange={(e) => updateSetting('social_youtube', e.target.value)}
                          placeholder="https://youtube.com/@tucanal"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                          </svg>
                          TikTok
                        </Label>
                        <Input
                          value={settings.social_tiktok}
                          onChange={(e) => updateSetting('social_tiktok', e.target.value)}
                          placeholder="https://tiktok.com/@tuusuario"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Newsletter Settings */}
          <TabsContent value="newsletter" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Newsletter
                </CardTitle>
                <CardDescription>Configura el formulario de suscripción al newsletter</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label>Mostrar Sección de Newsletter</Label>
                  <Switch
                    checked={settings.show_newsletter}
                    onCheckedChange={(checked) => updateSetting('show_newsletter', checked)}
                  />
                </div>

                {settings.show_newsletter && (
                  <>
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={settings.newsletter_title}
                        onChange={(e) => updateSetting('newsletter_title', e.target.value)}
                        placeholder="Newsletter"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Input
                        value={settings.newsletter_description}
                        onChange={(e) => updateSetting('newsletter_description', e.target.value)}
                        placeholder="Recibe ofertas y novedades"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Placeholder del Campo Email</Label>
                      <Input
                        value={settings.newsletter_placeholder}
                        onChange={(e) => updateSetting('newsletter_placeholder', e.target.value)}
                        placeholder="Tu email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Color del Botón</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={settings.newsletter_button_color || '#3b82f6'}
                          onChange={(e) => updateSetting('newsletter_button_color', e.target.value)}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={settings.newsletter_button_color}
                          onChange={(e) => updateSetting('newsletter_button_color', e.target.value)}
                          placeholder="Usar color primario"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Methods */}
          <TabsContent value="payment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Métodos de Pago
                </CardTitle>
                <CardDescription>Configura los iconos de métodos de pago aceptados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label>Mostrar Métodos de Pago</Label>
                  <Switch
                    checked={settings.show_payment_methods}
                    onCheckedChange={(checked) => updateSetting('show_payment_methods', checked)}
                  />
                </div>

                {settings.show_payment_methods && (
                  <>
                    <div className="space-y-2">
                      <Label>Título de la Sección</Label>
                      <Input
                        value={settings.payment_methods_title}
                        onChange={(e) => updateSetting('payment_methods_title', e.target.value)}
                        placeholder="Métodos de pago aceptados:"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <Label className="flex items-center gap-2">
                          <div className="bg-white border rounded px-2 py-1">
                            <svg className="h-5 w-auto" viewBox="0 0 48 32" fill="none">
                              <rect width="48" height="32" rx="4" fill="white"/>
                              <path d="M18.5 11.5L16 20.5H13.5L12 13.8C11.9 13.4 11.7 13.1 11.4 12.9C10.8 12.5 9.9 12.1 9 11.9L9.1 11.5H13.3C13.8 11.5 14.2 11.9 14.3 12.4L15.1 16.8L17 11.5H18.5Z" fill="#1434CB"/>
                            </svg>
                          </div>
                          Visa
                        </Label>
                        <Switch
                          checked={settings.show_visa}
                          onCheckedChange={(checked) => updateSetting('show_visa', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <Label className="flex items-center gap-2">
                          <div className="bg-white border rounded px-2 py-1">
                            <svg className="h-5 w-auto" viewBox="0 0 48 32" fill="none">
                              <rect width="48" height="32" rx="4" fill="white"/>
                              <circle cx="18" cy="16" r="7" fill="#EB001B"/>
                              <circle cx="30" cy="16" r="7" fill="#F79E1B"/>
                            </svg>
                          </div>
                          Mastercard
                        </Label>
                        <Switch
                          checked={settings.show_mastercard}
                          onCheckedChange={(checked) => updateSetting('show_mastercard', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <Label className="flex items-center gap-2">
                          <div className="bg-white border rounded px-2 py-1 text-xs font-bold text-blue-600">
                            Bancontact
                          </div>
                        </Label>
                        <Switch
                          checked={settings.show_bancontact}
                          onCheckedChange={(checked) => updateSetting('show_bancontact', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <Label className="flex items-center gap-2">
                          <div className="bg-white border rounded px-2 py-1 text-xs font-bold text-blue-700">
                            PayPal
                          </div>
                        </Label>
                        <Switch
                          checked={settings.show_paypal}
                          onCheckedChange={(checked) => updateSetting('show_paypal', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <Label className="flex items-center gap-2">
                          <div className="bg-white border rounded px-2 py-1 text-xs font-bold text-pink-600">
                            iDEAL
                          </div>
                        </Label>
                        <Switch
                          checked={settings.show_ideal}
                          onCheckedChange={(checked) => updateSetting('show_ideal', checked)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}