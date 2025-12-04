import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Settings, Save, RotateCcw, Info, Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SupportDetectionConfig {
  id: string;
  overhang_angle_threshold: number;
  min_support_area_percent: number;
  material_risk_pla: number;
  material_risk_petg: number;
  material_risk_abs: number;
  detection_mode: 'conservative' | 'balanced' | 'aggressive';
  enable_bridging_detection: boolean;
  max_bridging_distance: number;
  high_confidence_threshold: number;
  medium_confidence_threshold: number;
  enable_length_analysis: boolean;
}

export default function SupportDetectionSettings() {
  const [config, setConfig] = useState<SupportDetectionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('support_detection_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setConfig(data as SupportDetectionConfig);
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('support_detection_settings')
        .update({
          overhang_angle_threshold: config.overhang_angle_threshold,
          min_support_area_percent: config.min_support_area_percent,
          material_risk_pla: config.material_risk_pla,
          material_risk_petg: config.material_risk_petg,
          material_risk_abs: config.material_risk_abs,
          detection_mode: config.detection_mode,
          enable_bridging_detection: config.enable_bridging_detection,
          max_bridging_distance: config.max_bridging_distance,
          high_confidence_threshold: config.high_confidence_threshold,
          medium_confidence_threshold: config.medium_confidence_threshold,
          enable_length_analysis: config.enable_length_analysis,
        })
        .eq('id', config.id);

      if (error) throw error;

      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!config) return;

    const defaultConfig = {
      overhang_angle_threshold: 45,
      min_support_area_percent: 15.0,
      material_risk_pla: 1.0,
      material_risk_petg: 1.3,
      material_risk_abs: 1.5,
      detection_mode: 'balanced' as const,
      enable_bridging_detection: true,
      max_bridging_distance: 35,
      high_confidence_threshold: 75,
      medium_confidence_threshold: 40,
      enable_length_analysis: true,
    };

    setConfig({ ...config, ...defaultConfig });
    toast.info('Configuración restaurada a valores por defecto');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Cargando configuración...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>No se pudo cargar la configuración</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Configuración de Detección de Soportes
        </h1>
        <p className="text-muted-foreground">
          Sistema inteligente multi-factor para detectar automáticamente la necesidad de soportes en archivos STL
        </p>
      </div>

      <div className="grid gap-6">
        {/* Modo de Detección */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Modo de Detección
            </CardTitle>
            <CardDescription>
              Configura qué tan conservador o agresivo debe ser el sistema al detectar soportes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Modo</Label>
              <Select
                value={config.detection_mode}
                onValueChange={(value: 'conservative' | 'balanced' | 'aggressive') =>
                  setConfig({ ...config, detection_mode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">
                    Conservador (más soportes, menos riesgo)
                  </SelectItem>
                  <SelectItem value="balanced">
                    Balanceado (recomendado)
                  </SelectItem>
                  <SelectItem value="aggressive">
                    Agresivo (menos soportes, ahorra material)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {config.detection_mode === 'conservative' && 
                  'Modo conservador: El sistema marcará más piezas como necesitando soportes, minimizando riesgo de fallas pero usando más material.'}
                {config.detection_mode === 'balanced' && 
                  'Modo balanceado: Equilibrio entre seguridad y ahorro de material. Recomendado para la mayoría de casos.'}
                {config.detection_mode === 'aggressive' && 
                  'Modo agresivo: Marcará menos piezas con soportes, ahorrando material pero con mayor riesgo de fallas en voladizos extremos.'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Umbrales Básicos */}
        <Card>
          <CardHeader>
            <CardTitle>Umbrales de Detección</CardTitle>
            <CardDescription>
              Configura los valores base para la detección automática
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Ángulo de Voladizo Máximo (°)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Ángulo desde la horizontal donde se requieren soportes. 
                        Estándar: 45°. Valores menores = más soportes.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  type="number"
                  min="30"
                  max="70"
                  value={config.overhang_angle_threshold}
                  onChange={(e) =>
                    setConfig({ ...config, overhang_angle_threshold: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Rango: 30-70° (predeterminado: 45°)
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Área Mínima de Soportes (%)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Porcentaje mínimo de área con voladizos para considerar 
                        que la pieza necesita soportes.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  type="number"
                  min="5"
                  max="50"
                  step="0.5"
                  value={config.min_support_area_percent}
                  onChange={(e) =>
                    setConfig({ ...config, min_support_area_percent: parseFloat(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Rango: 5-50% (predeterminado: 15%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Factores de Material */}
        <Card>
          <CardHeader>
            <CardTitle>Ajuste por Material</CardTitle>
            <CardDescription>
              Multiplicadores de riesgo según el tipo de material (1.0 = neutral)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Factor PLA</Label>
                <Input
                  type="number"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={config.material_risk_pla}
                  onChange={(e) =>
                    setConfig({ ...config, material_risk_pla: parseFloat(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Mejor material para voladizos
                </p>
              </div>

              <div className="space-y-2">
                <Label>Factor PETG</Label>
                <Input
                  type="number"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={config.material_risk_petg}
                  onChange={(e) =>
                    setConfig({ ...config, material_risk_petg: parseFloat(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Más difícil que PLA
                </p>
              </div>

              <div className="space-y-2">
                <Label>Factor ABS</Label>
                <Input
                  type="number"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={config.material_risk_abs}
                  onChange={(e) =>
                    setConfig({ ...config, material_risk_abs: parseFloat(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Más difícil para voladizos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Umbrales de Confianza */}
        <Card>
          <CardHeader>
            <CardTitle>Umbrales de Confianza</CardTitle>
            <CardDescription>
              Configura los niveles de confianza del sistema (0-100)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Umbral Alta Confianza</Label>
                <Input
                  type="number"
                  min="50"
                  max="100"
                  value={config.high_confidence_threshold}
                  onChange={(e) =>
                    setConfig({ ...config, high_confidence_threshold: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Score mayor = necesita soportes (alta confianza)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Umbral Media Confianza</Label>
                <Input
                  type="number"
                  min="20"
                  max="80"
                  value={config.medium_confidence_threshold}
                  onChange={(e) =>
                    setConfig({ ...config, medium_confidence_threshold: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Score en rango medio = confianza moderada
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opciones Avanzadas */}
        <Card>
          <CardHeader>
            <CardTitle>Opciones Avanzadas</CardTitle>
            <CardDescription>
              Funcionalidades adicionales del sistema de detección
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Detección de Puentes (Bridging)</Label>
                <p className="text-xs text-muted-foreground">
                  Detecta puentes horizontales que no necesitan soportes
                </p>
              </div>
              <Switch
                checked={config.enable_bridging_detection}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, enable_bridging_detection: checked })
                }
              />
            </div>

            {config.enable_bridging_detection && (
              <div className="space-y-2 ml-4">
                <Label>Distancia Máxima de Puente (mm)</Label>
                <Input
                  type="number"
                  min="10"
                  max="100"
                  value={config.max_bridging_distance}
                  onChange={(e) =>
                    setConfig({ ...config, max_bridging_distance: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Puentes menores a esta distancia se consideran seguros sin soportes
                </p>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Análisis de Longitud de Voladizos</Label>
                <p className="text-xs text-muted-foreground">
                  Considera la longitud horizontal de los voladizos en el análisis
                </p>
              </div>
              <Switch
                checked={config.enable_length_analysis}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, enable_length_analysis: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Botones de Acción */}
        <div className="flex gap-4">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
          <Button onClick={handleReset} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Predeterminados
          </Button>
        </div>
      </div>
    </div>
  );
}
