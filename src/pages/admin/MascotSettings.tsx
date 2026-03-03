import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Eye } from "lucide-react";

const MASCOT_TYPES = [
  { value: "robot", label: "🤖 Robot" },
  { value: "cat", label: "🐱 Gato" },
  { value: "octopus", label: "🐙 Pulpo" },
  { value: "ghost", label: "👻 Fantasma" },
];

const POSITIONS = [
  { value: "bottom-right", label: "Inferior derecha" },
  { value: "bottom-left", label: "Inferior izquierda" },
  { value: "random", label: "Aleatoria" },
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
}

export default function MascotSettings() {
  const [config, setConfig] = useState<MascotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data } = await supabase
      .from("site_mascot_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (data) setConfig(data as unknown as MascotConfig);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase
      .from("site_mascot_settings")
      .update({
        enabled: config.enabled,
        mascot_type: config.mascot_type,
        primary_color: config.primary_color,
        secondary_color: config.secondary_color,
        position: config.position,
        animation_frequency: config.animation_frequency,
        click_reactions: config.click_reactions,
        show_on_mobile: config.show_on_mobile,
        updated_at: new Date().toISOString(),
      })
      .eq("id", config.id);

    if (error) {
      toast.error("Error al guardar configuración");
    } else {
      toast.success("Configuración de mascota guardada");
    }
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
          <p className="text-muted-foreground">Configura un personaje animado interactivo para tu sitio web</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuración General</CardTitle>
            <CardDescription>Activa y personaliza la mascota</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
              <Label>Posición</Label>
              <Select value={config.position} onValueChange={(v) => update("position", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frecuencia de movimiento</Label>
              <Select value={config.animation_frequency} onValueChange={(v) => update("animation_frequency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="reactions">Reacciones al clic</Label>
              <Switch id="reactions" checked={config.click_reactions} onCheckedChange={(v) => update("click_reactions", v)} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="mobile">Mostrar en móvil</Label>
              <Switch id="mobile" checked={config.show_on_mobile} onCheckedChange={(v) => update("show_on_mobile", v)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" /> Vista previa
            </CardTitle>
            <CardDescription>Así se verá la mascota en tu sitio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative bg-muted/50 rounded-lg h-64 flex items-center justify-center overflow-hidden">
              <MascotPreview
                type={config.mascot_type}
                primary={config.primary_color}
                secondary={config.secondary_color}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-3 text-center">
              Haz clic en la mascota para ver las reacciones
            </p>
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

function MascotPreview({ type, primary, secondary }: { type: string; primary: string; secondary: string }) {
  const [reaction, setReaction] = useState<string | null>(null);

  const handleClick = () => {
    const reactions = ["wave", "jump", "spin", "wiggle", "surprise"];
    const r = reactions[Math.floor(Math.random() * reactions.length)];
    setReaction(r);
    setTimeout(() => setReaction(null), 1200);
  };

  const designs: Record<string, JSX.Element> = {
    robot: (
      <svg viewBox="0 0 100 120" width="100" height="120" className="mascot-body">
        <line x1="50" y1="5" x2="50" y2="20" stroke={secondary} strokeWidth="3" className="mascot-antenna"/>
        <circle cx="50" cy="5" r="4" fill={primary} className="mascot-antenna-tip"/>
        <rect x="20" y="20" width="60" height="45" rx="12" fill={primary}/>
        <circle cx="38" cy="42" r="7" fill="white"/>
        <circle cx="62" cy="42" r="7" fill="white"/>
        <circle cx="38" cy="42" r="4" fill={secondary} className="mascot-pupil mascot-pupil-left"/>
        <circle cx="62" cy="42" r="4" fill={secondary} className="mascot-pupil mascot-pupil-right"/>
        <path d="M 38 55 Q 50 62 62 55" stroke={secondary} strokeWidth="2.5" fill="none"/>
        <rect x="25" y="68" width="50" height="35" rx="8" fill={secondary}/>
        <rect x="8" y="72" width="15" height="8" rx="4" fill={primary} className="mascot-arm-left"/>
        <rect x="77" y="72" width="15" height="8" rx="4" fill={primary} className="mascot-arm-right"/>
        <rect x="28" y="103" width="16" height="10" rx="5" fill={primary}/>
        <rect x="56" y="103" width="16" height="10" rx="5" fill={primary}/>
      </svg>
    ),
    cat: (
      <svg viewBox="0 0 100 110" width="100" height="110" className="mascot-body">
        <polygon points="20,30 30,5 40,30" fill={primary}/>
        <polygon points="60,30 70,5 80,30" fill={primary}/>
        <ellipse cx="50" cy="45" rx="32" ry="28" fill={primary}/>
        <ellipse cx="38" cy="42" rx="6" ry="7" fill="white"/>
        <ellipse cx="62" cy="42" rx="6" ry="7" fill="white"/>
        <ellipse cx="38" cy="43" rx="4" ry="5" fill={secondary} className="mascot-pupil mascot-pupil-left"/>
        <ellipse cx="62" cy="43" rx="4" ry="5" fill={secondary} className="mascot-pupil mascot-pupil-right"/>
        <ellipse cx="50" cy="52" rx="3" ry="2" fill="#FFB6C1"/>
        <path d="M 45 55 Q 50 60 55 55" stroke={secondary} strokeWidth="1.5" fill="none"/>
        <ellipse cx="50" cy="82" rx="22" ry="18" fill={primary}/>
        <path d="M 72 85 Q 90 75 85 60" stroke={primary} strokeWidth="6" fill="none" strokeLinecap="round" className="mascot-tail"/>
      </svg>
    ),
    octopus: (
      <svg viewBox="0 0 100 110" width="100" height="110" className="mascot-body">
        <ellipse cx="50" cy="35" rx="30" ry="30" fill={primary}/>
        <circle cx="40" cy="32" r="8" fill="white"/>
        <circle cx="60" cy="32" r="8" fill="white"/>
        <circle cx="40" cy="33" r="5" fill={secondary} className="mascot-pupil mascot-pupil-left"/>
        <circle cx="60" cy="33" r="5" fill={secondary} className="mascot-pupil mascot-pupil-right"/>
        <path d="M 42 46 Q 50 52 58 46" stroke={secondary} strokeWidth="2" fill="none"/>
        <path d="M 22 55 Q 10 75 18 95" stroke={primary} strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M 30 60 Q 20 80 25 100" stroke={primary} strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M 42 63 Q 38 85 40 105" stroke={primary} strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M 58 63 Q 62 85 60 105" stroke={primary} strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M 70 60 Q 80 80 75 100" stroke={primary} strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M 78 55 Q 90 75 82 95" stroke={primary} strokeWidth="6" fill="none" strokeLinecap="round"/>
      </svg>
    ),
    ghost: (
      <svg viewBox="0 0 100 120" width="100" height="120" className="mascot-body">
        <path d="M 20 50 Q 20 15, 50 15 Q 80 15, 80 50 L 80 95 Q 73 85, 65 95 Q 57 105, 50 95 Q 43 85, 35 95 Q 27 105, 20 95 Z" fill={primary}/>
        <circle cx="38" cy="48" r="8" fill="white"/>
        <circle cx="62" cy="48" r="8" fill="white"/>
        <circle cx="38" cy="49" r="5" fill={secondary} className="mascot-pupil mascot-pupil-left"/>
        <circle cx="62" cy="49" r="5" fill={secondary} className="mascot-pupil mascot-pupil-right"/>
        <ellipse cx="50" cy="65" rx="6" ry="4" fill={secondary}/>
        <circle cx="28" cy="58" r="5" fill="#FFB6C1" opacity="0.5"/>
        <circle cx="72" cy="58" r="5" fill="#FFB6C1" opacity="0.5"/>
      </svg>
    ),
  };

  return (
    <div
      className={`cursor-pointer select-none ${reaction ? `mascot-react-${reaction}` : "mascot-idle"}`}
      onClick={handleClick}
    >
      <style>{`
        .mascot-idle .mascot-body { animation: mascot-float 4s ease-in-out infinite; }
        .mascot-idle .mascot-pupil-left { animation: mascot-look 6s ease-in-out infinite; }
        .mascot-idle .mascot-pupil-right { animation: mascot-look 6s ease-in-out infinite; }
        .mascot-idle .mascot-antenna-tip { animation: mascot-glow 2s ease-in-out infinite; }
        .mascot-idle .mascot-tail { animation: mascot-wag 3s ease-in-out infinite; }
        .mascot-react-wave { animation: mascot-wave-anim 1.2s ease-in-out; }
        .mascot-react-jump { animation: mascot-jump-anim 0.8s ease-out; }
        .mascot-react-spin { animation: mascot-spin-anim 1s ease-in-out; }
        .mascot-react-wiggle { animation: mascot-wiggle-anim 0.8s ease-in-out; }
        .mascot-react-surprise { animation: mascot-surprise-anim 1s ease-in-out; }
        @keyframes mascot-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes mascot-look { 0%,100%{transform:translateX(0)} 30%{transform:translateX(2px)} 70%{transform:translateX(-2px)} }
        @keyframes mascot-glow { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes mascot-wag { 0%,100%{transform:rotate(0)} 25%{transform:rotate(8deg)} 75%{transform:rotate(-8deg)} }
        @keyframes mascot-wave-anim { 0%{transform:rotate(0)} 15%{transform:rotate(-15deg)} 30%{transform:rotate(15deg)} 45%{transform:rotate(-10deg)} 60%{transform:rotate(10deg)} 100%{transform:rotate(0)} }
        @keyframes mascot-jump-anim { 0%{transform:translateY(0)} 30%{transform:translateY(-30px) scale(1.1)} 50%{transform:translateY(-30px) scale(1.1)} 100%{transform:translateY(0) scale(1)} }
        @keyframes mascot-spin-anim { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
        @keyframes mascot-wiggle-anim { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 40%{transform:translateX(10px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        @keyframes mascot-surprise-anim { 0%{transform:scale(1)} 20%{transform:scale(1.3)} 40%{transform:scale(0.9)} 60%{transform:scale(1.1)} 100%{transform:scale(1)} }
      `}</style>
      {designs[type] || designs.robot}
    </div>
  );
}
