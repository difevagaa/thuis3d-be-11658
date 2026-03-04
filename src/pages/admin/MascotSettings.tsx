import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Eye, Settings2, Footprints, Volume2, Moon, MousePointer, SmilePlus, Timer, EyeOff } from "lucide-react";

const MASCOT_TYPES = [
  { value: "robot", label: "🤖 Robot" },
  { value: "cat", label: "🐱 Gato" },
  { value: "octopus", label: "🐙 Pulpo" },
  { value: "ghost", label: "👻 Fantasma" },
  { value: "penguin", label: "🐧 Pingüino" },
  { value: "bunny", label: "🐰 Conejo" },
  { value: "fox", label: "🦊 Zorro" },
  { value: "panda", label: "🐼 Panda" },
  { value: "alien", label: "👽 Alien" },
  { value: "bear", label: "🐻 Oso" },
  { value: "dragon", label: "🐲 Dragón" },
  { value: "unicorn", label: "🦄 Unicornio" },
  { value: "dino", label: "🦕 Dinosaurio" },
];

const SIZES = [
  { value: "small", label: "Pequeño (50px)" },
  { value: "medium", label: "Mediano (70px)" },
  { value: "large", label: "Grande (95px)" },
];

const WALK_SPEEDS = [
  { value: "slow", label: "Lenta" },
  { value: "normal", label: "Normal" },
  { value: "fast", label: "Rápida" },
];

const FREQUENCIES = [
  { value: "slow", label: "Lenta (25s)" },
  { value: "normal", label: "Normal (15s)" },
  { value: "fast", label: "Rápida (8s)" },
];

interface MascotConfig {
  id: string;
  enabled: boolean;
  mascot_type: string;
  primary_color: string;
  secondary_color: string;
  position: string;
  animation_frequency: string;
  click_reactions: boolean;
  show_on_mobile: boolean;
  size: string;
  walk_speed: string;
  sound_enabled: boolean;
  welcome_message: string;
  opacity: number;
  night_mode: boolean;
  follow_cursor: boolean;
  show_emojis: boolean;
  hide_on_checkout: boolean;
  spontaneous_interval: number;
}

export default function MascotSettings() {
  const [config, setConfig] = useState<MascotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    const { data } = await supabase.from("site_mascot_settings").select("*").limit(1).maybeSingle();
    if (data) setConfig(data as unknown as MascotConfig);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    const { id, ...rest } = config;
    const { error } = await supabase.from("site_mascot_settings").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error("Error al guardar configuración");
    else toast.success("Configuración de mascota guardada");
    setSaving(false);
  };

  const update = (key: keyof MascotConfig, value: any) => {
    if (config) setConfig({ ...config, [key]: value });
  };

  if (loading) return <div className="p-6">Cargando...</div>;
  if (!config) return <div className="p-6">No se encontró configuración de mascota</div>;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Mascota del Sitio</h1>
          <p className="text-muted-foreground">Configura un personaje animado interactivo que camina por tu sitio web. ¡Puedes arrastrarla con el mouse!</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* General */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> General</CardTitle>
            <CardDescription>Activa y elige tu mascota (14 tipos disponibles)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <Label htmlFor="enabled">Mascota activa</Label>
              <Switch id="enabled" checked={config.enabled} onCheckedChange={(v) => update("enabled", v)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de mascota</Label>
              <Select value={config.mascot_type} onValueChange={(v) => update("mascot_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MASCOT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tamaño</Label>
              <Select value={config.size} onValueChange={(v) => update("size", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color primario</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={config.primary_color} onChange={(e) => update("primary_color", e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={config.primary_color} onChange={(e) => update("primary_color", e.target.value)} className="font-mono text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Color secundario</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={config.secondary_color} onChange={(e) => update("secondary_color", e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={config.secondary_color} onChange={(e) => update("secondary_color", e.target.value)} className="font-mono text-sm" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Opacidad ({Math.round((config.opacity ?? 1) * 100)}%)</Label>
              <Slider value={[config.opacity ?? 1]} onValueChange={([v]) => update("opacity", v)} min={0.3} max={1} step={0.05} />
            </div>
          </CardContent>
        </Card>

        {/* Movement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Footprints className="h-5 w-5" /> Movimiento</CardTitle>
            <CardDescription>Controla cómo camina con movimientos fluidos de pies, brazos y cola</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Velocidad de caminar</Label>
              <Select value={config.walk_speed} onValueChange={(v) => update("walk_speed", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WALK_SPEEDS.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frecuencia de animación</Label>
              <Select value={config.animation_frequency} onValueChange={(v) => update("animation_frequency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="follow">Seguir cursor (ojos)</Label>
              </div>
              <Switch id="follow" checked={config.follow_cursor} onCheckedChange={(v) => update("follow_cursor", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="mobile">Mostrar en móvil</Label>
              <Switch id="mobile" checked={config.show_on_mobile} onCheckedChange={(v) => update("show_on_mobile", v)} />
            </div>
          </CardContent>
        </Card>

        {/* Interactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><SmilePlus className="h-5 w-5" /> Interacciones</CardTitle>
            <CardDescription>28 reacciones al clic: salto, giro, baile, reverencia, aplausos y más. ¡Arrástrala a cualquier parte!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <Label htmlFor="reactions">Reacciones al clic</Label>
              <Switch id="reactions" checked={config.click_reactions} onCheckedChange={(v) => update("click_reactions", v)} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SmilePlus className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="emojis">Emojis flotantes al clic</Label>
              </div>
              <Switch id="emojis" checked={config.show_emojis} onCheckedChange={(v) => update("show_emojis", v)} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="sound">Sonido al clic</Label>
              </div>
              <Switch id="sound" checked={config.sound_enabled} onCheckedChange={(v) => update("sound_enabled", v)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <Label>Reacción espontánea cada ({config.spontaneous_interval}s)</Label>
              </div>
              <Slider value={[config.spontaneous_interval ?? 30]} onValueChange={([v]) => update("spontaneous_interval", v)} min={10} max={120} step={5} />
            </div>
            <div className="space-y-2">
              <Label>Mensaje de bienvenida</Label>
              <Textarea value={config.welcome_message ?? ""} onChange={(e) => update("welcome_message", e.target.value)} placeholder="¡Hola! 👋" rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Behavior */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Moon className="h-5 w-5" /> Comportamiento</CardTitle>
            <CardDescription>Opciones especiales de comportamiento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="night">Modo nocturno</Label>
                  <p className="text-xs text-muted-foreground">La mascota "duerme" entre 10PM - 6AM</p>
                </div>
              </div>
              <Switch id="night" checked={config.night_mode} onCheckedChange={(v) => update("night_mode", v)} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOff className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="checkout">Ocultar en checkout</Label>
                  <p className="text-xs text-muted-foreground">Se esconde en páginas de pago</p>
                </div>
              </div>
              <Switch id="checkout" checked={config.hide_on_checkout} onCheckedChange={(v) => update("hide_on_checkout", v)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </div>
    </div>
  );
}
