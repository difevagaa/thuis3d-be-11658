import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Calculator, Save, Loader2, Info, Zap, Wrench, TrendingUp, Package, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';

export default function PrintingCalculatorSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [materials, setMaterials] = useState<any[]>([]);
  
  const [settings, setSettings] = useState({
    filamentCosts: {} as Record<string, string>,
    materialDensity: {} as Record<string, string>,
    electricityCostPerKwh: '0.15',
    printerPowerWatts: '120',
    printerLifespanHours: '4320',
    replacementPartsCost: '110',
    errorMarginPercentage: '29',
    profitMultiplierRetail: '5',
    profitMultiplierWholesale: '3',
    profitMultiplierKeychains: '5',
    suppliesCost: '0',
    layerHeight: '0.2',
    printSpeed: '50',
    infill: '20',
    numberOfPerimeters: '3',
    travelSpeed: '120',
    bedHeatingWatts: '150',
    heatingTimeMinutes: '5',
    // Parámetros avanzados
    extrusionWidth: '0.45',
    topSolidLayers: '4',
    bottomSolidLayers: '4',
    perimeterSpeed: '40',
    infillSpeed: '60',
    topBottomSpeed: '30',
    firstLayerSpeed: '20',
    acceleration: '1000',
    retractionCountPerLayer: '1.5',
    // Precio mínimo
    minimumPrice: '5.00'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar materiales
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (materialsError) throw materialsError;
      setMaterials(materialsData || []);

      // Cargar configuración
      const { data: settingsData, error: settingsError } = await supabase
        .from('printing_calculator_settings')
        .select('*');

      if (settingsError) throw settingsError;

      if (settingsData && settingsData.length > 0) {
        const filamentCostsRaw = settingsData.find(s => s.setting_key === 'filament_costs')?.setting_value as Record<string, number> || {};
        const materialDensityRaw = settingsData.find(s => s.setting_key === 'material_density')?.setting_value as Record<string, number> || {};
        
        // Convertir a strings para permitir edición
        const filamentCosts: Record<string, string> = {};
        Object.keys(filamentCostsRaw).forEach(key => {
          filamentCosts[key] = String(filamentCostsRaw[key]);
        });
        
        const materialDensity: Record<string, string> = {};
        Object.keys(materialDensityRaw).forEach(key => {
          materialDensity[key] = String(materialDensityRaw[key]);
        });
        
        const electricityCostPerKwh = String(settingsData.find(s => s.setting_key === 'electricity_cost_per_kwh')?.setting_value || '0.15');
        const printerPowerWatts = String(settingsData.find(s => s.setting_key === 'printer_power_consumption_watts')?.setting_value || '120');
        const printerLifespanHours = String(settingsData.find(s => s.setting_key === 'printer_lifespan_hours')?.setting_value || '4320');
        const replacementPartsCost = String(settingsData.find(s => s.setting_key === 'replacement_parts_cost')?.setting_value || '110');
        const errorMarginPercentage = String(settingsData.find(s => s.setting_key === 'error_margin_percentage')?.setting_value || '29');
        const profitMultiplierRetail = String(settingsData.find(s => s.setting_key === 'profit_multiplier_retail')?.setting_value || '5');
        const profitMultiplierWholesale = String(settingsData.find(s => s.setting_key === 'profit_multiplier_wholesale')?.setting_value || '3');
        const profitMultiplierKeychains = String(settingsData.find(s => s.setting_key === 'profit_multiplier_keychains')?.setting_value || '5');
        const suppliesCost = String(settingsData.find(s => s.setting_key === 'additional_supplies_cost')?.setting_value || '0');
        const layerHeight = String(settingsData.find(s => s.setting_key === 'default_layer_height')?.setting_value || '0.2');
        const printSpeed = String(settingsData.find(s => s.setting_key === 'default_print_speed')?.setting_value || '50');
        const infill = String(settingsData.find(s => s.setting_key === 'default_infill')?.setting_value || '20');
        const numberOfPerimeters = String(settingsData.find(s => s.setting_key === 'number_of_perimeters')?.setting_value || '3');
        const travelSpeed = String(settingsData.find(s => s.setting_key === 'travel_speed')?.setting_value || '120');
        const bedHeatingWatts = String(settingsData.find(s => s.setting_key === 'bed_heating_watts')?.setting_value || '150');
        const heatingTimeMinutes = String(settingsData.find(s => s.setting_key === 'heating_time_minutes')?.setting_value || '5');
        
        // Parámetros avanzados
        const extrusionWidth = String(settingsData.find(s => s.setting_key === 'extrusion_width')?.setting_value || '0.45');
        const topSolidLayers = String(settingsData.find(s => s.setting_key === 'top_solid_layers')?.setting_value || '4');
        const bottomSolidLayers = String(settingsData.find(s => s.setting_key === 'bottom_solid_layers')?.setting_value || '4');
        const perimeterSpeed = String(settingsData.find(s => s.setting_key === 'perimeter_speed')?.setting_value || '40');
        const infillSpeed = String(settingsData.find(s => s.setting_key === 'infill_speed')?.setting_value || '60');
        const topBottomSpeed = String(settingsData.find(s => s.setting_key === 'top_bottom_speed')?.setting_value || '30');
        const firstLayerSpeed = String(settingsData.find(s => s.setting_key === 'first_layer_speed')?.setting_value || '20');
        const acceleration = String(settingsData.find(s => s.setting_key === 'acceleration')?.setting_value || '1000');
        const retractionCountPerLayer = String(settingsData.find(s => s.setting_key === 'retraction_count_per_layer')?.setting_value || '1.5');
        const minimumPrice = String(settingsData.find(s => s.setting_key === 'minimum_price')?.setting_value || '5.00');

        setSettings({
          filamentCosts,
          materialDensity,
          electricityCostPerKwh,
          printerPowerWatts,
          printerLifespanHours,
          replacementPartsCost,
          errorMarginPercentage,
          profitMultiplierRetail,
          profitMultiplierWholesale,
          profitMultiplierKeychains,
          suppliesCost,
          layerHeight,
          printSpeed,
          infill,
          numberOfPerimeters,
          travelSpeed,
          bedHeatingWatts,
          heatingTimeMinutes,
          extrusionWidth,
          topSolidLayers,
          bottomSolidLayers,
          perimeterSpeed,
          infillSpeed,
          topBottomSpeed,
          firstLayerSpeed,
          acceleration,
          retractionCountPerLayer,
          minimumPrice
        });
      }
    } catch (error: any) {
      logger.error('Error loading settings:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const updateFilamentCost = (materialName: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      filamentCosts: {
        ...prev.filamentCosts,
        [materialName]: value
      }
    }));
  };

  const updateMaterialDensity = (materialName: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      materialDensity: {
        ...prev.materialDensity,
        [materialName]: value
      }
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // Convertir strings a números para guardar
      const filamentCostsNum: Record<string, number> = {};
      Object.keys(settings.filamentCosts).forEach(key => {
        filamentCostsNum[key] = parseFloat(settings.filamentCosts[key]) || 0;
      });
      
      const materialDensityNum: Record<string, number> = {};
      Object.keys(settings.materialDensity).forEach(key => {
        materialDensityNum[key] = parseFloat(settings.materialDensity[key]) || 0;
      });

      // Actualizar cada configuración
      const updates = [
        { key: 'filament_costs', value: filamentCostsNum },
        { key: 'material_density', value: materialDensityNum },
        { key: 'electricity_cost_per_kwh', value: settings.electricityCostPerKwh },
        { key: 'printer_power_consumption_watts', value: settings.printerPowerWatts },
        { key: 'printer_lifespan_hours', value: settings.printerLifespanHours },
        { key: 'replacement_parts_cost', value: settings.replacementPartsCost },
        { key: 'error_margin_percentage', value: settings.errorMarginPercentage },
        { key: 'profit_multiplier_retail', value: settings.profitMultiplierRetail },
        { key: 'profit_multiplier_wholesale', value: settings.profitMultiplierWholesale },
        { key: 'profit_multiplier_keychains', value: settings.profitMultiplierKeychains },
        { key: 'additional_supplies_cost', value: settings.suppliesCost },
        { key: 'default_layer_height', value: settings.layerHeight },
        { key: 'default_print_speed', value: settings.printSpeed },
        { key: 'default_infill', value: settings.infill },
        { key: 'number_of_perimeters', value: settings.numberOfPerimeters },
        { key: 'travel_speed', value: settings.travelSpeed },
        { key: 'bed_heating_watts', value: settings.bedHeatingWatts },
        { key: 'heating_time_minutes', value: settings.heatingTimeMinutes },
        { key: 'extrusion_width', value: settings.extrusionWidth },
        { key: 'top_solid_layers', value: settings.topSolidLayers },
        { key: 'bottom_solid_layers', value: settings.bottomSolidLayers },
        { key: 'perimeter_speed', value: settings.perimeterSpeed },
        { key: 'infill_speed', value: settings.infillSpeed },
        { key: 'top_bottom_speed', value: settings.topBottomSpeed },
        { key: 'first_layer_speed', value: settings.firstLayerSpeed },
        { key: 'acceleration', value: settings.acceleration },
        { key: 'retraction_count_per_layer', value: settings.retractionCountPerLayer },
        { key: 'minimum_price', value: settings.minimumPrice }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('printing_calculator_settings')
          .update({ setting_value: update.value })
          .eq('setting_key', update.key);

        if (error) throw error;
      }

      toast.success('Configuración guardada exitosamente');
    } catch (error: any) {
      logger.error('Error saving settings:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Calculator className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Configuración de Calculadora 3D</h1>
            <p className="text-muted-foreground">
              Gastos fijos, costos operativos y márgenes de ganancia
            </p>
          </div>
        </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Estos valores se utilizan para calcular automáticamente el precio cuando los clientes 
          suben archivos STL. El sistema calcula: Material + Electricidad + Desgaste + Margen de Error + Insumos × Multiplicador de Ganancia
        </AlertDescription>
      </Alert>

      {/* GASTOS FIJOS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Gastos Fijos - Materiales
          </CardTitle>
          <CardDescription>
            Precio por kilogramo y densidad de cada material
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold">Precio KG (EUR €)</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Precio por kilogramo del filamento. Se usa para calcular: <strong>Peso (kg) × Precio/kg</strong></p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="space-y-3">
                {materials.map((material) => (
                  <div key={material.id} className="flex items-center gap-2">
                    <Label className="w-24 text-sm">{material.name}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings.filamentCosts[material.name] || ''}
                      onChange={(e) => updateFilamentCost(material.name, e.target.value)}
                      className="flex-1"
                      placeholder="Ej: 20.00"
                    />
                    <span className="text-sm text-muted-foreground">€/kg</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold">Densidad (g/cm³)</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Densidad del material. Se usa para calcular el peso: <strong>Volumen (cm³) × Densidad = Peso (g)</strong></p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="space-y-3">
                {materials.map((material) => (
                  <div key={material.id} className="flex items-center gap-2">
                    <Label className="w-24 text-sm">{material.name}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings.materialDensity[material.name] || ''}
                      onChange={(e) => updateMaterialDensity(material.name, e.target.value)}
                      className="flex-1"
                      placeholder="Ej: 1.24"
                    />
                    <span className="text-sm text-muted-foreground">g/cm³</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ELECTRICIDAD Y MÁQUINA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Electricidad y Desgaste de Máquina
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Precio Kwh (EUR €)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Costo de electricidad por kilovatio-hora. <strong>Consumo (kW) × Tiempo (h) × Precio/kWh</strong></p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.electricityCostPerKwh}
                  onChange={(e) => setSettings({ ...settings, electricityCostPerKwh: e.target.value })}
                  placeholder="Ej: 0.15"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">€/kWh</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Consumo real por hora (W)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Potencia promedio de la impresora en vatios. Se convierte a kW para calcular consumo eléctrico.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={settings.printerPowerWatts}
                  onChange={(e) => setSettings({ ...settings, printerPowerWatts: e.target.value })}
                  placeholder="0"
                />
                <span className="text-sm text-muted-foreground">W</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Desgaste máquina (horas)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Vida útil estimada de la impresora. Se usa para calcular costo por hora de uso: <strong>Precio Repuestos ÷ Horas de Vida</strong></p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={settings.printerLifespanHours}
                  onChange={(e) => setSettings({ ...settings, printerLifespanHours: e.target.value })}
                  placeholder="0"
                />
                <span className="text-sm text-muted-foreground">hrs</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Precio Repuestos (EUR €)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Costo total de repuestos y mantenimiento durante la vida útil de la impresora.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.replacementPartsCost}
                  onChange={(e) => setSettings({ ...settings, replacementPartsCost: e.target.value })}
                  placeholder="0"
                />
                <span className="text-sm text-muted-foreground">€</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>% Margen de Error</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Porcentaje adicional para cubrir impresiones fallidas y desperdicios. Se aplica al subtotal de costos.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={settings.errorMarginPercentage}
                  onChange={(e) => setSettings({ ...settings, errorMarginPercentage: e.target.value })}
                  placeholder="0"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PARÁMETROS DE IMPRESIÓN */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Parámetros de Impresión
          </CardTitle>
          <CardDescription>
            Configuración por defecto y multiplicadores de tiempo/costo según parámetros técnicos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Parámetros por defecto */}
          <div>
            <h3 className="font-semibold mb-4">Valores por Defecto</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Altura de Capa (mm)</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Altura de cada capa de impresión. Afecta tiempo y calidad: capas más bajas = mayor detalle pero más tiempo.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.layerHeight}
                    onChange={(e) => setSettings({ ...settings, layerHeight: e.target.value })}
                    placeholder="0.2"
                  />
                  <span className="text-sm text-muted-foreground">mm</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Velocidad de Impresión</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Velocidad de impresión en mm/s. Mayor velocidad = menos tiempo pero puede afectar calidad.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={settings.printSpeed}
                    onChange={(e) => setSettings({ ...settings, printSpeed: e.target.value })}
                    placeholder="50"
                  />
                  <span className="text-sm text-muted-foreground">mm/s</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Relleno (%)</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Porcentaje de relleno interno. Mayor relleno = más resistencia pero más material y tiempo.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={settings.infill}
                    onChange={(e) => setSettings({ ...settings, infill: e.target.value })}
                    placeholder="20"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Número de Perímetros</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Número de líneas en las paredes exteriores. Más perímetros = mayor resistencia y mejor acabado pero más tiempo.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    max="10"
                    value={settings.numberOfPerimeters}
                    onChange={(e) => setSettings({ ...settings, numberOfPerimeters: e.target.value })}
                    placeholder="3"
                  />
                  <span className="text-sm text-muted-foreground">líneas</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Velocidad de Movimiento</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Velocidad de movimientos sin extrusión (travel moves) en mm/s. Afecta el tiempo total de impresión.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={settings.travelSpeed}
                    onChange={(e) => setSettings({ ...settings, travelSpeed: e.target.value })}
                    placeholder="120"
                  />
                  <span className="text-sm text-muted-foreground">mm/s</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Consumo Cama Caliente</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Potencia de la cama caliente en vatios. Se usa para calcular el consumo eléctrico durante el calentamiento inicial.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={settings.bedHeatingWatts}
                    onChange={(e) => setSettings({ ...settings, bedHeatingWatts: e.target.value })}
                    placeholder="150"
                  />
                  <span className="text-sm text-muted-foreground">W</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Tiempo Calentamiento</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Tiempo promedio que tarda la impresora en calentar la cama y el extrusor antes de empezar a imprimir.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={settings.heatingTimeMinutes}
                    onChange={(e) => setSettings({ ...settings, heatingTimeMinutes: e.target.value })}
                    placeholder="5"
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Multiplicadores de Ancho de Boquilla */}
          <div>
            <h3 className="font-semibold mb-2">Multiplicadores por Ancho de Boquilla</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ajuste del costo según el ancho de boquilla. Boquillas más pequeñas (0.02mm) son más lentas y costosas.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">0.02 mm (Alta precisión)</span>
                  <Badge>× 1.3</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Mayor tiempo de impresión, mayor costo</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">0.04 mm (Estándar)</span>
                  <Badge variant="outline">× 1.0</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Tiempo y costo base</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Multiplicadores de Altura de Capa */}
          <div>
            <h3 className="font-semibold mb-2">Multiplicadores por Altura de Capa</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ajuste del costo según la altura de capa. Capas más finas (0.08mm) requieren más tiempo.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { height: '0.08', multiplier: '1.5', label: 'Ultra alta' },
                { height: '0.12', multiplier: '1.3', label: 'Muy alta' },
                { height: '0.16', multiplier: '1.2', label: 'Alta' },
                { height: '0.20', multiplier: '1.0', label: 'Estándar' },
                { height: '0.24', multiplier: '0.9', label: 'Rápida' },
                { height: '0.26', multiplier: '0.85', label: 'Borrador' },
                { height: '0.28', multiplier: '0.8', label: 'Máx. velocidad' }
              ].map((item) => (
                <div key={item.height} className="p-2 bg-muted/30 rounded text-center">
                  <p className="font-mono font-semibold text-sm">{item.height} mm</p>
                  <Badge variant="secondary" className="text-xs mt-1">× {item.multiplier}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                </div>
              ))}
            </div>
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Los multiplicadores se aplican automáticamente al calcular precios cuando los clientes seleccionan estas opciones.
                La altura estándar (0.20mm) es el valor base (×1.0).
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* GANANCIA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Margen de Ganancia (Multiplicadores)
          </CardTitle>
          <CardDescription>
            El precio final será: Subtotal × Multiplicador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Precio Minorista</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Multiplicador para ventas al público. Precio final = <strong>(Subtotal + Margen Error) × Multiplicador</strong></p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  value={settings.profitMultiplierRetail}
                  onChange={(e) => setSettings({ ...settings, profitMultiplierRetail: e.target.value })}
                  placeholder="1"
                />
                <span className="text-sm text-muted-foreground">×</span>
              </div>
              <p className="text-xs text-muted-foreground">Usado por defecto</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Precio Mayorista</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Multiplicador para ventas por mayor. Generalmente menor que el minorista para incentivar compras grandes.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  value={settings.profitMultiplierWholesale}
                  onChange={(e) => setSettings({ ...settings, profitMultiplierWholesale: e.target.value })}
                  placeholder="1"
                />
                <span className="text-sm text-muted-foreground">×</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Precio Llaveros</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Multiplicador especial para productos pequeños como llaveros. Pueden tener margen mayor por manejo individual.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  value={settings.profitMultiplierKeychains}
                  onChange={(e) => setSettings({ ...settings, profitMultiplierKeychains: e.target.value })}
                  placeholder="1"
                />
                <span className="text-sm text-muted-foreground">×</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* INSUMOS Y PARÁMETROS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Insumos y Parámetros de Impresión
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>INSUMOS (EUR €)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Costo fijo adicional por pieza (pegamento, pintura, empaque, etc.). Se suma al final del cálculo.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.suppliesCost}
                  onChange={(e) => setSettings({ ...settings, suppliesCost: e.target.value })}
                  placeholder="0"
                />
                <span className="text-sm text-muted-foreground">€</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Costo adicional por insumos (pegamento, pintura, etc.)
              </p>
            </div>
          </div>

          <Separator />

          <h3 className="font-semibold">Parámetros de Estimación</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Altura de Capa</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Grosor de cada capa de impresión. Afecta calidad y tiempo: capas más finas = mejor calidad pero más lento.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="0.4"
                  value={settings.layerHeight}
                  onChange={(e) => setSettings({ ...settings, layerHeight: e.target.value })}
                  placeholder="0.2"
                />
                <span className="text-sm text-muted-foreground">mm</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Velocidad de Impresión</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Velocidad de movimiento del cabezal en mm/s. Se usa para estimar el tiempo total de impresión.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  step="5"
                  min="20"
                  max="150"
                  value={settings.printSpeed}
                  onChange={(e) => setSettings({ ...settings, printSpeed: e.target.value })}
                  placeholder="50"
                />
                <span className="text-sm text-muted-foreground">mm/s</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Relleno</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Porcentaje de relleno interno. Mayor relleno = pieza más fuerte pero usa más material y tiempo.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  step="5"
                  min="0"
                  max="100"
                  value={settings.infill}
                  onChange={(e) => setSettings({ ...settings, infill: e.target.value })}
                  placeholder="20"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PARÁMETROS AVANZADOS */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="bg-primary/5">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Parámetros Avanzados de Impresión
          </CardTitle>
          <CardDescription>
            Configuración técnica detallada para cálculos precisos de tiempo y material. 
            Modifica estos valores solo si conoces el comportamiento de tu impresora.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Estos parámetros afectan directamente la precisión de los cálculos. Los valores por defecto 
              están optimizados para la mayoría de impresoras FDM estándar.
            </AlertDescription>
          </Alert>

          {/* Extrusión y Capas */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Configuración de Extrusión y Capas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Ancho de Extrusión (mm)</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Ancho de la línea extruida. Generalmente 100-120% del diámetro de la boquilla. 
                      Afecta el cálculo de material necesario.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="1.0"
                    value={settings.extrusionWidth}
                    onChange={(e) => setSettings({ ...settings, extrusionWidth: e.target.value })}
                    placeholder="0.45"
                  />
                  <span className="text-sm text-muted-foreground">mm</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Capas Sólidas Superiores</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Número de capas sólidas en la parte superior del modelo. 
                      Más capas = superficie superior más lisa pero más tiempo.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    max="10"
                    value={settings.topSolidLayers}
                    onChange={(e) => setSettings({ ...settings, topSolidLayers: e.target.value })}
                    placeholder="4"
                  />
                  <span className="text-sm text-muted-foreground">capas</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Capas Sólidas Inferiores</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Número de capas sólidas en la base del modelo. 
                      Afecta la adhesión a la cama y la solidez de la base.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    max="10"
                    value={settings.bottomSolidLayers}
                    onChange={(e) => setSettings({ ...settings, bottomSolidLayers: e.target.value })}
                    placeholder="4"
                  />
                  <span className="text-sm text-muted-foreground">capas</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Velocidades específicas */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Velocidades Específicas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Velocidad Perímetros</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Velocidad para imprimir las paredes exteriores. 
                      Más lento = mejor calidad superficial.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="5"
                    min="10"
                    max="100"
                    value={settings.perimeterSpeed}
                    onChange={(e) => setSettings({ ...settings, perimeterSpeed: e.target.value })}
                    placeholder="40"
                  />
                  <span className="text-sm text-muted-foreground">mm/s</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Velocidad Relleno</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Velocidad para el relleno interno. 
                      Puede ser más rápida que los perímetros sin afectar la apariencia.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="5"
                    min="10"
                    max="150"
                    value={settings.infillSpeed}
                    onChange={(e) => setSettings({ ...settings, infillSpeed: e.target.value })}
                    placeholder="60"
                  />
                  <span className="text-sm text-muted-foreground">mm/s</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Velocidad Capas Superior/Inferior</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Velocidad para las capas sólidas superior e inferior. 
                      Más lenta para mejor acabado superficial.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="5"
                    min="10"
                    max="100"
                    value={settings.topBottomSpeed}
                    onChange={(e) => setSettings({ ...settings, topBottomSpeed: e.target.value })}
                    placeholder="30"
                  />
                  <span className="text-sm text-muted-foreground">mm/s</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Velocidad Primera Capa</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Velocidad reducida para la primera capa. 
                      Crítica para buena adhesión a la cama.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="5"
                    min="5"
                    max="50"
                    value={settings.firstLayerSpeed}
                    onChange={(e) => setSettings({ ...settings, firstLayerSpeed: e.target.value })}
                    placeholder="20"
                  />
                  <span className="text-sm text-muted-foreground">mm/s</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Mecánica */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Configuración Mecánica
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Aceleración</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Aceleración máxima de la impresora en mm/s². 
                      Afecta el tiempo de cambios de dirección y movimientos rápidos.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="100"
                    min="100"
                    max="5000"
                    value={settings.acceleration}
                    onChange={(e) => setSettings({ ...settings, acceleration: e.target.value })}
                    placeholder="1000"
                  />
                  <span className="text-sm text-muted-foreground">mm/s²</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Retracciones por Capa</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Número promedio de retracciones del filamento por capa. 
                      Usado para estimar tiempo adicional de retracciones.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={settings.retractionCountPerLayer}
                    onChange={(e) => setSettings({ ...settings, retractionCountPerLayer: e.target.value })}
                    placeholder="1.5"
                  />
                  <span className="text-sm text-muted-foreground">por capa</span>
                </div>
              </div>
            </div>
          </div>

          <Alert className="bg-yellow-500/10 border-yellow-500/50">
            <Info className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <strong>Nota importante:</strong> Modificar estos parámetros afectará la precisión de las estimaciones de tiempo y costo. 
              Asegúrate de que los valores coincidan con la configuración real de tu impresora 3D.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* PRECIO MÍNIMO */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Precio Mínimo por Impresión
          </CardTitle>
          <CardDescription>
            Configura el precio mínimo que se cobrará por cualquier impresión, independientemente del costo calculado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Precio Mínimo (EUR €)</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Si el cálculo total es menor que este valor, se aplicará este precio mínimo. 
                  Útil para cubrir costos fijos de impresiones pequeñas.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex gap-2 items-center max-w-xs">
              <Input
                type="number"
                step="0.50"
                min="0"
                value={settings.minimumPrice}
                onChange={(e) => setSettings({ ...settings, minimumPrice: e.target.value })}
                placeholder="5.00"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">€</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Ejemplo: Si el cálculo da €3.50 pero el mínimo es €5.00, se cobrará €5.00
            </p>
          </div>
        </CardContent>
      </Card>

        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={saving} size="lg">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Configuración
              </>
            )}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}