import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Upload, Eye, ImageIcon, Type, Maximize, Palette, MousePointer, Smartphone, Sparkles } from "lucide-react";
import { SiteLogo } from "@/components/SiteLogo";
import { Separator } from "@/components/ui/separator";

interface LogoState {
  logo_url: string;
  logo_dark_url: string;
  logo_show_image: boolean;
  logo_show_text: boolean;
  logo_custom_text: string;
  logo_width: number;
  logo_height: number;
  logo_max_width: number;
  logo_max_height: number;
  logo_border_radius: string;
  logo_padding: number;
  logo_gap: number;
  logo_position: string;
  logo_object_fit: string;
  logo_opacity: number;
  logo_shadow: string;
  logo_border_width: number;
  logo_border_color: string;
  logo_bg_color: string;
  logo_bg_enabled: boolean;
  logo_text_size: number;
  logo_text_weight: string;
  logo_text_color: string;
  logo_text_font: string;
  logo_hide_on_scroll: boolean;
  logo_hide_on_mobile: boolean;
  logo_mobile_width: number;
  logo_mobile_height: number;
  logo_animation: string;
  logo_hover_effect: string;
  logo_invert_on_dark: boolean;
}

const DEFAULT: LogoState = {
  logo_url: "", logo_dark_url: "", logo_show_image: true, logo_show_text: true,
  logo_custom_text: "Thuis3D.be", logo_width: 40, logo_height: 40,
  logo_max_width: 200, logo_max_height: 60, logo_border_radius: "0.5rem",
  logo_padding: 0, logo_gap: 8, logo_position: "left", logo_object_fit: "contain",
  logo_opacity: 100, logo_shadow: "none", logo_border_width: 0,
  logo_border_color: "#000000", logo_bg_color: "transparent", logo_bg_enabled: false,
  logo_text_size: 16, logo_text_weight: "700", logo_text_color: "",
  logo_text_font: "", logo_hide_on_scroll: false, logo_hide_on_mobile: false,
  logo_mobile_width: 32, logo_mobile_height: 32, logo_animation: "none",
  logo_hover_effect: "none", logo_invert_on_dark: false,
};

export default function LogoCustomizer() {
  const [logo, setLogo] = useState<LogoState>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbId, setDbId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("site_customization").select("*")
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      if (data) {
        const d = data as any;
        setDbId(d.id);
        setLogo({
          logo_url: d.logo_url || "",
          logo_dark_url: d.logo_dark_url || "",
          logo_show_image: d.logo_show_image ?? true,
          logo_show_text: d.logo_show_text ?? true,
          logo_custom_text: d.logo_custom_text || "Thuis3D.be",
          logo_width: d.logo_width ?? 40,
          logo_height: d.logo_height ?? 40,
          logo_max_width: d.logo_max_width ?? 200,
          logo_max_height: d.logo_max_height ?? 60,
          logo_border_radius: d.logo_border_radius || "0.5rem",
          logo_padding: d.logo_padding ?? 0,
          logo_gap: d.logo_gap ?? 8,
          logo_position: d.logo_position || "left",
          logo_object_fit: d.logo_object_fit || "contain",
          logo_opacity: d.logo_opacity ?? 100,
          logo_shadow: d.logo_shadow || "none",
          logo_border_width: d.logo_border_width ?? 0,
          logo_border_color: d.logo_border_color || "#000000",
          logo_bg_color: d.logo_bg_color || "transparent",
          logo_bg_enabled: d.logo_bg_enabled ?? false,
          logo_text_size: d.logo_text_size ?? 16,
          logo_text_weight: d.logo_text_weight || "700",
          logo_text_color: d.logo_text_color || "",
          logo_text_font: d.logo_text_font || "",
          logo_hide_on_scroll: d.logo_hide_on_scroll ?? false,
          logo_hide_on_mobile: d.logo_hide_on_mobile ?? false,
          logo_mobile_width: d.logo_mobile_width ?? 32,
          logo_mobile_height: d.logo_mobile_height ?? 32,
          logo_animation: d.logo_animation || "none",
          logo_hover_effect: d.logo_hover_effect || "none",
          logo_invert_on_dark: d.logo_invert_on_dark ?? false,
        });
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const uploadFile = async (file: File) => {
    const ext = file.name.split('.').pop();
    const path = `customization/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
    return publicUrl;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'logo_dark_url') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile(file);
      setLogo(prev => ({ ...prev, [field]: url }));
      toast.success("Logo subido exitosamente");
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (dbId) {
        const { error } = await supabase.from("site_customization").update(logo).eq("id", dbId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("site_customization").insert([logo]);
        if (error) throw error;
      }
      localStorage.setItem("logo_settings", JSON.stringify(logo));
      toast.success("Logo guardado exitosamente");
      load();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally { setSaving(false); }
  };

  const set = (field: keyof LogoState, value: any) => setLogo(prev => ({ ...prev, [field]: value }));

  if (loading) return <div className="p-6 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6">
      {/* Live Preview */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Vista Previa en Vivo</CardTitle>
            </div>
            <Badge variant="outline">Preview</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6 bg-muted/30 rounded-lg border border-dashed min-h-[80px]">
            <SiteLogo variant="header" />
          </div>
          <div className="flex items-center justify-center p-6 bg-foreground/90 rounded-lg border border-dashed min-h-[80px] mt-3">
            <SiteLogo variant="header" />
          </div>
        </CardContent>
      </Card>

      {/* 1. Image Upload */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">1. Imágenes del Logo</CardTitle>
          </div>
          <CardDescription>Sube tu logo para modo claro y oscuro</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Logo Principal (Modo Claro)</Label>
              <Input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'logo_url')} />
              {logo.logo_url && <img src={logo.logo_url} alt="Logo" className="h-16 w-auto border rounded p-1 mt-2" />}
            </div>
            <div className="space-y-2">
              <Label>Logo Modo Oscuro (Opcional)</Label>
              <Input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'logo_dark_url')} />
              {logo.logo_dark_url && <img src={logo.logo_dark_url} alt="Logo Dark" className="h-16 w-auto border rounded p-1 bg-muted mt-2" />}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label>URL directa del logo</Label>
            <Input value={logo.logo_url} onChange={(e) => set('logo_url', e.target.value)} placeholder="https://..." className="flex-1" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Visibility */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">2. Visibilidad</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label>Mostrar imagen del logo</Label>
              <Switch checked={logo.logo_show_image} onCheckedChange={(v) => set('logo_show_image', v)} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label>Mostrar texto del logo</Label>
              <Switch checked={logo.logo_show_text} onCheckedChange={(v) => set('logo_show_text', v)} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label>Invertir en modo oscuro</Label>
              <Switch checked={logo.logo_invert_on_dark} onCheckedChange={(v) => set('logo_invert_on_dark', v)} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label>Fondo del logo</Label>
              <Switch checked={logo.logo_bg_enabled} onCheckedChange={(v) => set('logo_bg_enabled', v)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Text */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">3. Texto del Logo</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Texto personalizado</Label>
              <Input value={logo.logo_custom_text} onChange={(e) => set('logo_custom_text', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tamaño del texto: {logo.logo_text_size}px</Label>
              <Slider value={[logo.logo_text_size]} onValueChange={([v]) => set('logo_text_size', v)} min={10} max={48} step={1} />
            </div>
            <div className="space-y-2">
              <Label>Peso de fuente</Label>
              <Select value={logo.logo_text_weight} onValueChange={(v) => set('logo_text_weight', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">Light (300)</SelectItem>
                  <SelectItem value="400">Regular (400)</SelectItem>
                  <SelectItem value="500">Medium (500)</SelectItem>
                  <SelectItem value="600">Semibold (600)</SelectItem>
                  <SelectItem value="700">Bold (700)</SelectItem>
                  <SelectItem value="800">Extra Bold (800)</SelectItem>
                  <SelectItem value="900">Black (900)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color del texto</Label>
              <div className="flex gap-2">
                <Input type="color" value={logo.logo_text_color || "#E02C2C"} onChange={(e) => set('logo_text_color', e.target.value)} className="w-12 h-10 p-1" />
                <Input value={logo.logo_text_color} onChange={(e) => set('logo_text_color', e.target.value)} placeholder="Vacío = color primario" className="flex-1" />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Fuente del texto (opcional)</Label>
              <Input value={logo.logo_text_font} onChange={(e) => set('logo_text_font', e.target.value)} placeholder="ej: Playfair Display, Montserrat... (vacío = fuente del sitio)" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Dimensions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Maximize className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">4. Dimensiones y Espaciado</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Ancho: {logo.logo_width}px</Label>
              <Slider value={[logo.logo_width]} onValueChange={([v]) => set('logo_width', v)} min={16} max={300} step={2} />
            </div>
            <div className="space-y-2">
              <Label>Alto: {logo.logo_height}px</Label>
              <Slider value={[logo.logo_height]} onValueChange={([v]) => set('logo_height', v)} min={16} max={200} step={2} />
            </div>
            <div className="space-y-2">
              <Label>Ancho máximo: {logo.logo_max_width}px</Label>
              <Slider value={[logo.logo_max_width]} onValueChange={([v]) => set('logo_max_width', v)} min={40} max={400} step={10} />
            </div>
            <div className="space-y-2">
              <Label>Alto máximo: {logo.logo_max_height}px</Label>
              <Slider value={[logo.logo_max_height]} onValueChange={([v]) => set('logo_max_height', v)} min={20} max={200} step={5} />
            </div>
            <div className="space-y-2">
              <Label>Padding interno: {logo.logo_padding}px</Label>
              <Slider value={[logo.logo_padding]} onValueChange={([v]) => set('logo_padding', v)} min={0} max={20} step={1} />
            </div>
            <div className="space-y-2">
              <Label>Espacio entre logo y texto: {logo.logo_gap}px</Label>
              <Slider value={[logo.logo_gap]} onValueChange={([v]) => set('logo_gap', v)} min={0} max={24} step={1} />
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Ajuste de imagen</Label>
            <Select value={logo.logo_object_fit} onValueChange={(v) => set('logo_object_fit', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contain">Contener (sin recorte)</SelectItem>
                <SelectItem value="cover">Cubrir (puede recortar)</SelectItem>
                <SelectItem value="fill">Estirar (deformar)</SelectItem>
                <SelectItem value="scale-down">Escalar abajo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 5. Style */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">5. Estilo Visual</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Opacidad: {logo.logo_opacity}%</Label>
              <Slider value={[logo.logo_opacity]} onValueChange={([v]) => set('logo_opacity', v)} min={10} max={100} step={5} />
            </div>
            <div className="space-y-2">
              <Label>Radio de borde</Label>
              <Select value={logo.logo_border_radius} onValueChange={(v) => set('logo_border_radius', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sin redondeo (0)</SelectItem>
                  <SelectItem value="0.25rem">Suave (4px)</SelectItem>
                  <SelectItem value="0.5rem">Moderado (8px)</SelectItem>
                  <SelectItem value="0.75rem">Estándar (12px)</SelectItem>
                  <SelectItem value="1rem">Redondeado (16px)</SelectItem>
                  <SelectItem value="50%">Circular</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sombra</Label>
              <Select value={logo.logo_shadow} onValueChange={(v) => set('logo_shadow', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin sombra</SelectItem>
                  <SelectItem value="sm">Sombra suave</SelectItem>
                  <SelectItem value="md">Sombra media</SelectItem>
                  <SelectItem value="lg">Sombra fuerte</SelectItem>
                  <SelectItem value="glow">Resplandor (Glow)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grosor de borde: {logo.logo_border_width}px</Label>
              <Slider value={[logo.logo_border_width]} onValueChange={([v]) => set('logo_border_width', v)} min={0} max={5} step={1} />
            </div>
            <div className="space-y-2">
              <Label>Color de borde</Label>
              <div className="flex gap-2">
                <Input type="color" value={logo.logo_border_color} onChange={(e) => set('logo_border_color', e.target.value)} className="w-12 h-10 p-1" />
                <Input value={logo.logo_border_color} onChange={(e) => set('logo_border_color', e.target.value)} className="flex-1" />
              </div>
            </div>
            {logo.logo_bg_enabled && (
              <div className="space-y-2">
                <Label>Color de fondo del logo</Label>
                <div className="flex gap-2">
                  <Input type="color" value={logo.logo_bg_color === 'transparent' ? '#ffffff' : logo.logo_bg_color} onChange={(e) => set('logo_bg_color', e.target.value)} className="w-12 h-10 p-1" />
                  <Input value={logo.logo_bg_color} onChange={(e) => set('logo_bg_color', e.target.value)} className="flex-1" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 6. Mobile */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">6. Configuración Móvil</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label>Ocultar logo en móvil</Label>
              <Switch checked={logo.logo_hide_on_mobile} onCheckedChange={(v) => set('logo_hide_on_mobile', v)} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label>Ocultar al hacer scroll</Label>
              <Switch checked={logo.logo_hide_on_scroll} onCheckedChange={(v) => set('logo_hide_on_scroll', v)} />
            </div>
            <div className="space-y-2">
              <Label>Ancho en móvil: {logo.logo_mobile_width}px</Label>
              <Slider value={[logo.logo_mobile_width]} onValueChange={([v]) => set('logo_mobile_width', v)} min={16} max={200} step={2} />
            </div>
            <div className="space-y-2">
              <Label>Alto en móvil: {logo.logo_mobile_height}px</Label>
              <Slider value={[logo.logo_mobile_height]} onValueChange={([v]) => set('logo_mobile_height', v)} min={16} max={120} step={2} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 7. Effects */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">7. Animaciones y Efectos</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Animación de entrada</Label>
              <Select value={logo.logo_animation} onValueChange={(v) => set('logo_animation', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin animación</SelectItem>
                  <SelectItem value="fade-in">Fade In</SelectItem>
                  <SelectItem value="pulse">Pulso</SelectItem>
                  <SelectItem value="bounce">Rebote</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Efecto al pasar el cursor</Label>
              <Select value={logo.logo_hover_effect} onValueChange={(v) => set('logo_hover_effect', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin efecto</SelectItem>
                  <SelectItem value="scale">Agrandar</SelectItem>
                  <SelectItem value="rotate">Rotar ligeramente</SelectItem>
                  <SelectItem value="brightness">Aumentar brillo</SelectItem>
                  <SelectItem value="bounce">Rebote</SelectItem>
                  <SelectItem value="pulse">Pulso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <Button onClick={handleSave} className="w-full" size="lg" disabled={saving}>
        <Save className="mr-2 h-5 w-5" />
        {saving ? "Guardando..." : "Guardar Logo"}
      </Button>
    </div>
  );
}
