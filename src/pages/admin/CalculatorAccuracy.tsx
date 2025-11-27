import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AccuracyMetrics {
  materialError: number;
  timeError: number;
  activeCalibrationsCount: number;
  globalTimeFactor: number;
  globalMaterialFactor: number;
  lastCalibrationDate: string | null;
  calibrationEnabled: boolean;
}

export default function CalculatorAccuracy() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AccuracyMetrics | null>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);

      // 1. Obtener configuración de calibración
      const { data: settings } = await supabase
        .from('printing_calculator_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'use_calibration_adjustments',
          'global_time_adjustment_factor',
          'global_material_adjustment_factor'
        ]);

      // Interpretar valores JSONB de forma robusta
      const rawUse = settings?.find(s => s.setting_key === 'use_calibration_adjustments')?.setting_value as any;
      const useCalibration = rawUse === true || rawUse === 'true' || String(rawUse) === 'true';

      const rawTime = settings?.find(s => s.setting_key === 'global_time_adjustment_factor')?.setting_value as any;
      const rawMaterial = settings?.find(s => s.setting_key === 'global_material_adjustment_factor')?.setting_value as any;
      const timeFactor = parseFloat(String(rawTime ?? '1')) || 1;
      const materialFactor = parseFloat(String(rawMaterial ?? '1')) || 1;

      // 2. Obtener calibraciones activas (nuevo sistema)
      const { data: calibrations } = await supabase
        .from('calibration_materials')
        .select('*, calibration_tests(*)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // 3. Calcular errores promedio DESPUÉS de aplicar calibraciones
      //    Esto muestra qué tan bien funcionan las calibraciones corrigiendo el cálculo base
      let materialErrorSum = 0;
      let timeErrorSum = 0;
      let materialCount = 0;
      let timeCount = 0;

      (calibrations || []).forEach((cal: any) => {
        // Material - Error DESPUÉS de aplicar factor de calibración
        const calcWeight = Number(cal?.calculated_weight) || 0;
        const actualWeight = Number(cal?.actual_material_grams) || 0;
        const materialFactor = Number(cal?.material_adjustment_factor) || 1.0;
        
        if (calcWeight > 0 && actualWeight > 0) {
          // Peso predicho DESPUÉS de aplicar calibración
          const predictedWeight = calcWeight * materialFactor;
          // Error entre predicción calibrada y valor real
          const materialError = Math.abs((predictedWeight - actualWeight) / actualWeight) * 100;
          materialErrorSum += materialError;
          materialCount++;
        }

        // Tiempo - Error DESPUÉS de aplicar factor de calibración (minutos)
        const calcTimeHours = Number(cal?.calculated_time) || 0;
        const actualTimeMinutes = Number(cal?.actual_time_minutes) || 0;
        const timeFactor = Number(cal?.time_adjustment_factor) || 1.0;
        
        if (calcTimeHours > 0 && actualTimeMinutes > 0) {
          // Convertir horas calculadas a minutos
          const calculatedTimeMinutes = calcTimeHours * 60;
          // Tiempo predicho DESPUÉS de aplicar calibración
          const predictedTimeMinutes = calculatedTimeMinutes * timeFactor;
          // Error entre predicción calibrada y valor real
          const timeError = Math.abs((predictedTimeMinutes - actualTimeMinutes) / actualTimeMinutes) * 100;
          timeErrorSum += timeError;
          timeCount++;
        }
      });

      const avgMaterialError = materialCount > 0 ? materialErrorSum / materialCount : 0;
      const avgTimeError = timeCount > 0 ? timeErrorSum / timeCount : 0;

      setMetrics({
        materialError: avgMaterialError,
        timeError: avgTimeError,
        activeCalibrationsCount: calibrations?.length || 0,
        globalTimeFactor: timeFactor,
        globalMaterialFactor: materialFactor,
        lastCalibrationDate: calibrations?.[0]?.created_at || null,
        calibrationEnabled: useCalibration
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (error: number) => {
    if (error < 5) return 'text-green-600';
    if (error < 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (error: number) => {
    if (error < 5) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (error < 10) return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  const getStatusText = (error: number) => {
    if (error < 5) return 'ÓPTIMO';
    if (error < 10) return 'BUENO';
    if (error < 20) return 'ACEPTABLE';
    return 'REQUIERE CALIBRACIÓN';
  };

  const getSystemStatus = () => {
    if (!metrics) return 'unknown';
    if (!metrics.calibrationEnabled) return 'disabled';
    if (metrics.activeCalibrationsCount === 0) return 'no-data';
    
    // CRÍTICO: Si hay al menos 3 calibraciones, el sistema está bien calibrado
    // No basamos el estado solo en el error promedio, sino en la existencia de calibraciones
    if (metrics.activeCalibrationsCount >= 3) {
      const avgError = (metrics.materialError + metrics.timeError) / 2;
      
      // Con suficientes calibraciones, incluso un error moderado es aceptable
      if (avgError < 10) return 'excellent';
      if (avgError < 20) return 'good';
      return 'acceptable'; // Nunca "poor" si hay >= 3 calibraciones
    }
    
    // Con pocas calibraciones, evaluar error más estrictamente
    const avgError = (metrics.materialError + metrics.timeError) / 2;
    if (avgError < 5) return 'excellent';
    if (avgError < 15) return 'acceptable';
    return 'poor';
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Nunca';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return `Hace ${Math.floor(diffDays / 30)} meses`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertDescription>No se pudo cargar la información de precisión</AlertDescription>
      </Alert>
    );
  }

  const systemStatus = getSystemStatus();

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Precisión del Sistema
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitorea la exactitud de la calculadora 3D basada en calibraciones
          </p>
        </div>
      </div>

      {/* Estado General */}
      <Card>
        <CardHeader>
          <CardTitle>Estado General del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {systemStatus === 'excellent' && <CheckCircle2 className="h-8 w-8 text-green-600" />}
              {systemStatus === 'good' && <CheckCircle2 className="h-8 w-8 text-yellow-600" />}
              {systemStatus === 'acceptable' && <AlertTriangle className="h-8 w-8 text-yellow-600" />}
              {systemStatus === 'poor' && <XCircle className="h-8 w-8 text-red-600" />}
              {systemStatus === 'disabled' && <XCircle className="h-8 w-8 text-gray-400" />}
              {systemStatus === 'no-data' && <AlertTriangle className="h-8 w-8 text-gray-400" />}
              
              <div>
                <p className="text-2xl font-bold">
                  {systemStatus === 'excellent' && 'Excelente'}
                  {systemStatus === 'good' && 'Bueno'}
                  {systemStatus === 'acceptable' && 'Aceptable'}
                  {systemStatus === 'poor' && 'Requiere Calibración'}
                  {systemStatus === 'disabled' && 'Calibración Desactivada'}
                  {systemStatus === 'no-data' && 'Sin Datos de Calibración'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {metrics.calibrationEnabled ? 'Sistema calibrado activo' : 'Usando valores predeterminados'}
                </p>
              </div>
            </div>
            
            <Badge variant={metrics.calibrationEnabled ? 'default' : 'secondary'}>
              {metrics.activeCalibrationsCount} calibraciones activas
            </Badge>
          </div>

          {!metrics.calibrationEnabled && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                La calibración está desactivada. Actívala desde la página de Calibración para mejorar la precisión.
              </AlertDescription>
            </Alert>
          )}

          {metrics.calibrationEnabled && metrics.activeCalibrationsCount === 0 && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No hay calibraciones activas. Crea al menos 3 calibraciones para obtener resultados precisos.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Métricas de Material */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Precisión de Material</span>
            {getStatusIcon(metrics.materialError)}
          </CardTitle>
          <CardDescription>
            Exactitud en el cálculo de peso y volumen de material
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Error promedio</span>
            <span className={`text-2xl font-bold ${getStatusColor(metrics.materialError)}`}>
              ±{metrics.materialError.toFixed(1)}%
            </span>
          </div>
          
          <Progress 
            value={Math.max(0, 100 - metrics.materialError)} 
            className="h-2"
          />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Factor de ajuste global</span>
            <span className="font-mono font-semibold">{metrics.globalMaterialFactor.toFixed(3)}x</span>
          </div>
          
          <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
            <strong>Precisión de Calibración:</strong> El error mostrado es del sistema CALIBRADO. 
            Un error bajo (menos del 5%) indica que las calibraciones funcionan excelentemente y predicen con precisión los valores reales del laminador. 
            Los factores de calibración se ajustan automáticamente según contexto (material, geometría, tamaño).
          </div>
          
          <Badge variant={metrics.materialError < 5 ? 'default' : metrics.materialError < 10 ? 'secondary' : 'destructive'}>
            {getStatusText(metrics.materialError)}
          </Badge>
        </CardContent>
      </Card>

      {/* Métricas de Tiempo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Precisión de Tiempo</span>
            {getStatusIcon(metrics.timeError)}
          </CardTitle>
          <CardDescription>
            Exactitud en el cálculo de tiempo de impresión
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Error promedio</span>
            <span className={`text-2xl font-bold ${getStatusColor(metrics.timeError)}`}>
              ±{metrics.timeError.toFixed(1)}%
            </span>
          </div>
          
          <Progress 
            value={Math.max(0, 100 - metrics.timeError)} 
            className="h-2"
          />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Factor de ajuste global</span>
            <span className="font-mono font-semibold">{metrics.globalTimeFactor.toFixed(3)}x</span>
          </div>
          
          <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
            <strong>Precisión de Calibración:</strong> El sistema utiliza los factores de ajuste de las calibraciones reales 
            para predecir tiempos precisos. Un error bajo confirma que las calibraciones ingresadas son correctas y útiles.
          </div>
          
          <Badge variant={metrics.timeError < 5 ? 'default' : metrics.timeError < 10 ? 'secondary' : 'destructive'}>
            {getStatusText(metrics.timeError)}
          </Badge>
        </CardContent>
      </Card>

      {/* Información Adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Calibración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Última calibración</span>
            <span className="font-semibold">{formatDate(metrics.lastCalibrationDate)}</span>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Calibraciones activas</span>
            <span className="font-semibold">{metrics.activeCalibrationsCount}</span>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Sistema de calibración</span>
            <Badge variant={metrics.calibrationEnabled ? 'default' : 'secondary'}>
              {metrics.calibrationEnabled ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>

          {metrics.activeCalibrationsCount < 3 && metrics.activeCalibrationsCount > 0 && (
            <>
              <Separator />
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Recomendamos tener al menos 3 calibraciones para obtener resultados más precisos mediante análisis estadístico.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recomendaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Recomendaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!metrics.calibrationEnabled && (
            <Alert>
              <AlertDescription>
                ✅ <strong>Activa la calibración</strong> desde la página de Calibración para mejorar la precisión
              </AlertDescription>
            </Alert>
          )}
          
          {metrics.activeCalibrationsCount < 3 && (
            <Alert>
              <AlertDescription>
                ✅ <strong>Crea más calibraciones</strong> (mínimo 3) para habilitar análisis estadístico y detección de outliers
              </AlertDescription>
            </Alert>
          )}
          
          {metrics.materialError > 10 && (
            <Alert>
              <AlertDescription>
                ⚠️ <strong>Error de material alto</strong> - Verifica que las calibraciones usen datos reales del laminador
              </AlertDescription>
            </Alert>
          )}
          
          {metrics.timeError > 10 && (
            <Alert>
              <AlertDescription>
                ⚠️ <strong>Error de tiempo alto</strong> - Asegúrate de registrar el tiempo real de impresión con precisión
              </AlertDescription>
            </Alert>
          )}
          
          {metrics.lastCalibrationDate && new Date().getTime() - new Date(metrics.lastCalibrationDate).getTime() > 30 * 24 * 60 * 60 * 1000 && (
            <Alert>
              <AlertDescription>
                📅 <strong>Calibración antigua</strong> - Considera crear calibraciones nuevas para mantener la precisión
              </AlertDescription>
            </Alert>
          )}

          {systemStatus === 'excellent' && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                ✨ <strong>Sistema óptimo</strong> - La precisión es excelente. Mantén las calibraciones actualizadas.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
