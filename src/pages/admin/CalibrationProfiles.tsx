import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, RefreshCw, TrendingUp, Eye, EyeOff, Trash2, Edit } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CALIBRATION_RANGES } from '@/lib/calibrationConstants';
import { logger } from '@/lib/logger';

interface CalibrationProfile {
  id: string;
  profile_name: string;
  material_id: string | null;
  geometry_classification: string | null;
  size_category: string | null;
  supports_enabled: boolean | null;
  layer_height: number | null;
  time_adjustment_factor: number;
  material_adjustment_factor: number;
  sample_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  materials?: { name: string };
}

export default function CalibrationProfiles() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<CalibrationProfile[]>([]);
  const [generating, setGenerating] = useState(false);
  const [editingProfile, setEditingProfile] = useState<CalibrationProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('calibration_profiles')
        .select('*, materials(name)')
        .order('sample_count', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      logger.error('Error loading profiles:', error);
      toast.error('Error al cargar perfiles');
    } finally {
      setLoading(false);
    }
  };

  const generateProfiles = async () => {
    setGenerating(true);
    try {
      // 1. Get all active calibrations
      const { data: calibrations, error: calError } = await supabase
        .from('calibration_materials')
        .select(`
          *,
          calibration_tests(
            geometry_classification,
            size_category,
            supports_enabled
          ),
          materials(name)
        `)
        .eq('is_active', true);

      if (calError) throw calError;

      if (!calibrations || calibrations.length < 2) {
        i18nToast.error("error.calibrationProfilesMinRequired");
        return;
      }

      logger.log(`📊 Generando perfiles desde ${calibrations.length} calibraciones...`);

      // 2. Group calibrations by context
      interface CalibrationGroup {
        materialId: string;
        geometryClass: string;
        sizeCategory: string;
        supportsEnabled: boolean;
        layerHeight: number;
        calibrations: any[];
      }

      const groups = new Map<string, CalibrationGroup>();
      
      calibrations.forEach(cal => {
        const test = cal.calibration_tests;
        
        // Create group key with all context
        const key = `${cal.material_id}_${test.geometry_classification}_${test.size_category}_${test.supports_enabled}_${cal.layer_height}`;
        
        if (!groups.has(key)) {
          groups.set(key, {
            materialId: cal.material_id,
            geometryClass: test.geometry_classification,
            sizeCategory: test.size_category,
            supportsEnabled: test.supports_enabled,
            layerHeight: cal.layer_height,
            calibrations: []
          });
        }
        
        groups.get(key)!.calibrations.push(cal);
      });

      // 3. Generate profiles from groups with ≥2 samples
      const profileInserts = [];
      let profilesCreated = 0;

      for (const [key, group] of groups) {
        if (group.calibrations.length < 2) {
          logger.log(`⚠️ Grupo ${key}: solo ${group.calibrations.length} muestra(s), se omite`);
          continue;
        }

        // Filter outliers (±2 std dev)
        const timeFactors = group.calibrations.map(c => c.time_adjustment_factor);
        const materialFactors = group.calibrations.map(c => c.material_adjustment_factor);

        const calculateStats = (values: number[]) => {
          const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
          const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
          const stdDev = Math.sqrt(variance);
          return { mean, stdDev };
        };

        const timeStats = calculateStats(timeFactors);
        const materialStats = calculateStats(materialFactors);

        const validCalibrations = group.calibrations.filter((c, idx) => {
          const timeOutlier = Math.abs(timeFactors[idx] - timeStats.mean) > 2 * timeStats.stdDev;
          const materialOutlier = Math.abs(materialFactors[idx] - materialStats.mean) > 2 * materialStats.stdDev;
          return !timeOutlier && !materialOutlier;
        });

        if (validCalibrations.length === 0) {
          logger.log(`⚠️ Grupo ${key}: todos outliers, usando datos originales`);
          validCalibrations.push(...group.calibrations);
        }

        // Calculate averages with strict validation
        const avgTimeFactor = validCalibrations.reduce((sum, c) => sum + c.time_adjustment_factor, 0) / validCalibrations.length;
        const avgMaterialFactor = validCalibrations.reduce((sum, c) => sum + c.material_adjustment_factor, 0) / validCalibrations.length;
        
        // VALIDACIÓN FLEXIBLE: Procesar los datos proporcionados aunque tengan variaciones
        const profileWarnings: string[] = [];

        // Validar tiempo promedio
        if (avgTimeFactor < CALIBRATION_RANGES.IDEAL_MIN || avgTimeFactor > CALIBRATION_RANGES.IDEAL_MAX) {
          profileWarnings.push(
            `Factor tiempo promedio ${avgTimeFactor.toFixed(2)}x fuera del rango ideal (${CALIBRATION_RANGES.IDEAL_MIN}x-${CALIBRATION_RANGES.IDEAL_MAX}x)`
          );
        }

        // Validar material promedio
        if (avgMaterialFactor < CALIBRATION_RANGES.IDEAL_MIN || avgMaterialFactor > CALIBRATION_RANGES.IDEAL_MAX) {
          profileWarnings.push(
            `Factor material promedio ${avgMaterialFactor.toFixed(2)}x fuera del rango ideal (${CALIBRATION_RANGES.IDEAL_MIN}x-${CALIBRATION_RANGES.IDEAL_MAX}x)`
          );
        }

        // Mostrar advertencias pero crear el perfil
        if (profileWarnings.length > 0) {
          logger.warn(`⚠️ Perfil ${key}:`, profileWarnings.join('; '));
        }
        
        const statusEmoji = profileWarnings.length === 0 ? '🎯' : '⚠️';
        const statusText = profileWarnings.length === 0 ? 'ÓPTIMO' : 'ACEPTABLE';

        logger.log(`${statusEmoji} Perfil ${statusText}: ${key}`, {
          muestras: validCalibrations.length,
          factores: {
            tiempo: avgTimeFactor.toFixed(3) + 'x',
            material: avgMaterialFactor.toFixed(3) + 'x'
          }
        });

        // Get material name
        const materialName = group.calibrations[0].materials?.name || 'Unknown';
        
        // Generate profile name
        const profileName = `${materialName} ${group.geometryClass} ${group.sizeCategory} ${group.supportsEnabled ? 'con soportes' : 'sin soportes'} ${group.layerHeight}mm`;

        profileInserts.push({
          profile_name: profileName,
          material_id: group.materialId,
          geometry_classification: group.geometryClass,
          size_category: group.sizeCategory,
          supports_enabled: group.supportsEnabled,
          layer_height: group.layerHeight,
          time_adjustment_factor: avgTimeFactor,
          material_adjustment_factor: avgMaterialFactor,
          sample_count: validCalibrations.length,
          is_active: true
        });

        profilesCreated++;
        logger.log(`✅ Perfil creado: ${profileName} (${validCalibrations.length} muestras)`);
      }

      // 4. Create global fallback profiles per material
      const materialGroups = new Map<string, any[]>();
      calibrations.forEach(cal => {
        if (!materialGroups.has(cal.material_id)) {
          materialGroups.set(cal.material_id, []);
        }
        materialGroups.get(cal.material_id)!.push(cal);
      });

      for (const [materialId, matCals] of materialGroups) {
        if (matCals.length >= 2) {
          const avgTime = matCals.reduce((sum, c) => sum + c.time_adjustment_factor, 0) / matCals.length;
          const avgMaterial = matCals.reduce((sum, c) => sum + c.material_adjustment_factor, 0) / matCals.length;
          const materialName = matCals[0].materials?.name || 'Unknown';

          profileInserts.push({
            profile_name: `${materialName} (Global Fallback)`,
            material_id: materialId,
            geometry_classification: null,
            size_category: null,
            supports_enabled: null,
            layer_height: null,
            time_adjustment_factor: avgTime,
            material_adjustment_factor: avgMaterial,
            sample_count: matCals.length,
            is_active: true
          });

          profilesCreated++;
          logger.log(`✅ Perfil global creado: ${materialName} (${matCals.length} muestras)`);
        }
      }

      // 5. Clear old profiles and insert new ones
      await supabase.from('calibration_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      if (profileInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('calibration_profiles')
          .insert(profileInserts);

        if (insertError) throw insertError;
      }

      toast.success(`✅ ${profilesCreated} perfiles generados exitosamente`);
      loadProfiles();
    } catch (error: any) {
      logger.error('Error generating profiles:', error);
      toast.error('Error al generar perfiles: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleProfileActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('calibration_profiles')
        .update({ is_active: !currentActive })
        .eq('id', id);

      if (error) throw error;
      toast.success(currentActive ? 'Perfil desactivado' : 'Perfil activado');
      loadProfiles();
    } catch (error: any) {
      logger.error('Error toggling profile:', error);
      toast.error('Error al cambiar estado');
    }
  };

  const openEditDialog = (profile: CalibrationProfile) => {
    setEditingProfile(profile);
    setEditDialogOpen(true);
  };

  const saveProfileEdit = async () => {
    if (!editingProfile) return;

    try {
      const { error } = await supabase
        .from('calibration_profiles')
        .update({
          time_adjustment_factor: editingProfile.time_adjustment_factor,
          material_adjustment_factor: editingProfile.material_adjustment_factor
        })
        .eq('id', editingProfile.id);

      if (error) throw error;
      toast.success('Perfil actualizado');
      setEditDialogOpen(false);
      loadProfiles();
    } catch (error: any) {
      logger.error('Error updating profile:', error);
      toast.error('Error al actualizar');
    }
  };

  const deleteProfile = async (id: string) => {
    try {
      const { error } = await supabase
        .from('calibration_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Perfil eliminado');
      loadProfiles();
    } catch (error: any) {
      logger.error('Error deleting profile:', error);
      toast.error('Error al eliminar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Perfiles de Calibración
          </h1>
          <p className="text-muted-foreground mt-2">
            Perfiles contextuales generados automáticamente para mejorar la precisión
          </p>
        </div>
        <Button onClick={generateProfiles} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerar Perfiles
            </>
          )}
        </Button>
      </div>

      <Alert>
        <AlertDescription>
          <strong>¿Cómo funcionan los perfiles?</strong> Se generan automáticamente agrupando calibraciones
          por material, geometría, tamaño, soportes y altura de capa. Cada perfil calcula factores promedio
          eliminando outliers estadísticos. Los perfiles más específicos tienen prioridad en los cálculos.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Perfiles Activos</CardTitle>
          <CardDescription>
            Perfiles aplicados automáticamente durante los cálculos de cotizaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No hay perfiles generados. Necesitas al menos 2 calibraciones activas.
              </p>
              <Button onClick={generateProfiles} disabled={generating}>
                {generating ? 'Generando...' : 'Generar Perfiles'}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Muestras</TableHead>
                  <TableHead>Factor Tiempo</TableHead>
                  <TableHead>Factor Material</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map(profile => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      {profile.profile_name}
                      {profile.profile_name.includes('Global') && (
                        <Badge variant="outline" className="ml-2">Fallback</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {profile.materials?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{profile.sample_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm">{profile.time_adjustment_factor.toFixed(3)}x</code>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm">{profile.material_adjustment_factor.toFixed(3)}x</code>
                    </TableCell>
                    <TableCell>
                      {profile.is_active ? (
                        <Badge variant="default">Activo</Badge>
                      ) : (
                        <Badge variant="outline">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(profile)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleProfileActive(profile.id, profile.is_active)}
                      >
                        {profile.is_active ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProfile(profile.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          <strong>Tip:</strong> Regenera los perfiles cada vez que agregues nuevas calibraciones
          para mantener la máxima precisión. Los perfiles con más muestras son más confiables.
        </AlertDescription>
      </Alert>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil de Calibración</DialogTitle>
            <DialogDescription>
              Ajusta manualmente los factores de corrección
            </DialogDescription>
          </DialogHeader>
          {editingProfile && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Input value={editingProfile.profile_name} disabled />
              </div>
              <div className="space-y-2">
                <Label>Factor de Tiempo (multiplier)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={editingProfile.time_adjustment_factor}
                  onChange={(e) => setEditingProfile({
                    ...editingProfile,
                    time_adjustment_factor: parseFloat(e.target.value)
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Ejemplo: 1.5 = el tiempo real es 1.5x el calculado
                </p>
              </div>
              <div className="space-y-2">
                <Label>Factor de Material (multiplier)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={editingProfile.material_adjustment_factor}
                  onChange={(e) => setEditingProfile({
                    ...editingProfile,
                    material_adjustment_factor: parseFloat(e.target.value)
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Ejemplo: 0.9 = el peso real es 0.9x el calculado
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveProfileEdit} className="flex-1">
                  Guardar Cambios
                </Button>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
