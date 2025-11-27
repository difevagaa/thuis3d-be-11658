import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Upload, Loader2, CheckCircle2, TrendingUp, FileText, Trash2, Eye, Edit, AlertCircle, HelpCircle, ExternalLink } from 'lucide-react';
import { analyzeSTLFile, AnalysisResult } from '@/lib/stlAnalyzer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CALIBRATION_RANGES } from '@/lib/calibrationConstants';
import { logger } from '@/lib/logger';

interface CalibrationTest {
  id: string;
  test_name: string;
  stl_file_path: string;
  geometry_classification: string;
  size_category: string;
  supports_enabled: boolean;
  notes: string | null;
  created_at: string;
}

interface CalibrationMaterial {
  id: string;
  calibration_test_id: string;
  material_id: string;
  layer_height: number;
  infill_percentage: number;
  print_speed: number;
  calculated_volume: number;
  calculated_weight: number;
  calculated_time: number;
  actual_time_minutes: number;
  actual_material_grams: number;
  actual_energy_kwh: number | null;
  time_adjustment_factor: number;
  material_adjustment_factor: number;
  is_active: boolean;
  materials?: { name: string };
}

export default function CalibrationSettings() {
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<CalibrationTest[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [classification, setClassification] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    test_name: '',
    supports_enabled: false,
    notes: ''
  });
  
  // Material-specific calibrations
  const [materialCalibrations, setMaterialCalibrations] = useState<Record<string, {
    layer_height: number;
    infill_percentage: number;
    print_speed: number;
    actual_time_hours: string;
    actual_time_minutes: string;
    actual_material_grams: string;
    actual_energy_kwh: string;
    enabled: boolean;
    calibrationId?: string;
    calculated_time?: number;
    calculated_weight?: number;
  }>>({});

  const [calibrationEnabled, setCalibrationEnabled] = useState(false);

  useEffect(() => {
    loadData();
    loadCalibrationSetting();
  }, []);

  const loadCalibrationSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('printing_calculator_settings')
        .select('setting_value')
        .eq('setting_key', 'use_calibration_adjustments')
        .maybeSingle();

      if (error) {
        logger.error('Error loading calibration setting:', error);
      }
      const value = (data as any)?.setting_value;
      setCalibrationEnabled(value === 'true' || value === true);
    } catch (error) {
      logger.error('Error loading calibration setting:', error);
    }
  };

  const toggleCalibrationSystem = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('printing_calculator_settings')
        .update({ setting_value: enabled.toString() })
        .eq('setting_key', 'use_calibration_adjustments');

      if (error) throw error;

      setCalibrationEnabled(enabled);
      toast.success(enabled ? 'Sistema de calibración activado' : 'Sistema de calibración desactivado');
    } catch (error: any) {
      logger.error('Error toggling calibration:', error);
      toast.error('Error al cambiar estado');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [testsRes, materialsRes] = await Promise.all([
        supabase.from('calibration_tests').select('*').order('created_at', { ascending: false }),
        supabase.from('materials').select('*').is('deleted_at', null).order('name')
      ]);

      if (testsRes.error) throw testsRes.error;
      if (materialsRes.error) throw materialsRes.error;

      setTests(testsRes.data || []);
      const mats = materialsRes.data || [];
      setMaterials(mats);
      
      // Initialize material calibrations with default values
      const initialCalibrations: Record<string, any> = {};
      mats.forEach(mat => {
        initialCalibrations[mat.id] = {
          layer_height: 0.2,
          infill_percentage: 20,
          print_speed: 50,
          actual_time_hours: '',
          actual_time_minutes: '',
          actual_material_grams: '',
          actual_energy_kwh: '',
          enabled: false
        };
      });
      setMaterialCalibrations(initialCalibrations);
    } catch (error: any) {
      logger.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.stl')) {
      toast.error('Por favor selecciona un archivo STL válido');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande (máximo 50MB)');
      return;
    }

    setSelectedFile(file);
    toast.success(`Archivo seleccionado: ${file.name}`);
  };

  const analyzeFile = async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo primero');
      return;
    }

    setAnalyzing(true);
    try {
      // Use first material for initial analysis
      const firstMaterialId = materials[0]?.id;
      if (!firstMaterialId) {
        throw new Error('No hay materiales configurados');
      }

      const fileURL = URL.createObjectURL(selectedFile);
      const analysis = await analyzeSTLFile(
        fileURL, 
        firstMaterialId, 
        selectedFile.name,
        formData.supports_enabled,
        0.2, // Default layer height for analysis
        1
      );
      
      setAnalysisResult(analysis);
      
      // Extract classification info from console or geometry
      const sizeCategory = analysis.volume < 10 ? 'small' : analysis.volume > 100 ? 'large' : 'medium';
      setClassification({
        type: 'compact', // Will be determined by actual calculation
        size: sizeCategory
      });
      
      URL.revokeObjectURL(fileURL);
      toast.success('Análisis completado - geometría clasificada automáticamente');
    } catch (error: any) {
      logger.error('Error analyzing:', error);
      toast.error('Error al analizar el archivo');
    } finally {
      setAnalyzing(false);
    }
  };

  const editTest = async (testId: string) => {
    try {
      // Load test data
      const { data: testData, error: testError } = await supabase
        .from('calibration_tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;

      // Load associated materials
      const { data: matsData, error: matsError } = await supabase
        .from('calibration_materials')
        .select('*')
        .eq('calibration_test_id', testId);

      if (matsError) throw matsError;

      // Set form data
      setFormData({
        test_name: testData.test_name,
        supports_enabled: testData.supports_enabled,
        notes: testData.notes || ''
      });

      setClassification({
        type: testData.geometry_classification,
        size: testData.size_category
      });

      // Set material calibrations from existing data
      const editCalibrations: Record<string, any> = {};
      materials.forEach(mat => {
        const existingCal = matsData.find(m => m.material_id === mat.id);
        if (existingCal) {
          const hours = Math.floor(existingCal.actual_time_minutes / 60);
          const minutes = existingCal.actual_time_minutes % 60;
          
          editCalibrations[mat.id] = {
            layer_height: existingCal.layer_height,
            infill_percentage: existingCal.infill_percentage,
            print_speed: existingCal.print_speed,
            actual_time_hours: hours.toString(),
            actual_time_minutes: minutes.toString(),
            actual_material_grams: existingCal.actual_material_grams.toString(),
            actual_energy_kwh: existingCal.actual_energy_kwh?.toString() || '',
            enabled: true,
            calibrationId: existingCal.id
          };
        } else {
          editCalibrations[mat.id] = {
            layer_height: 0.2,
            infill_percentage: 20,
            print_speed: 50,
            actual_time_hours: '',
            actual_time_minutes: '',
            actual_material_grams: '',
            actual_energy_kwh: '',
            enabled: false
          };
        }
      });
      
      setMaterialCalibrations(editCalibrations);
      setEditingTestId(testId);
      setShowForm(true);
      
      toast.info('Editando test - puedes modificar los datos y guardar cambios');
    } catch (error: any) {
      logger.error('Error loading test for edit:', error);
      toast.error('Error al cargar test para editar');
    }
  };

  const saveCalibration = async () => {
    if (editingTestId) {
      // Update existing test
      return updateCalibration();
    }
    
    if (!selectedFile || !analysisResult || !formData.test_name) {
      toast.error('Completa el nombre del test y analiza el archivo');
      return;
    }

    // Validate at least one material is configured
    const enabledMaterials = Object.entries(materialCalibrations).filter(([_, data]) => data.enabled);
    if (enabledMaterials.length === 0) {
      toast.error('Configura al menos un material antes de guardar');
      return;
    }

    try {
      // 1. Upload STL file (to user-scoped folder)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        logger.error('❌ Error getting user:', userError);
        throw new Error(`Error de autenticación: ${userError.message}`);
      }
      if (!user) throw new Error('Debes iniciar sesión para guardar calibraciones');

      logger.log('✅ Usuario autenticado:', user.id);

      const sanitized = selectedFile.name.replace(/\s+/g, '-').replace(/[^\w.-]/g, '');
      const fileName = `calibration_${Date.now()}_${sanitized}`;
      const filePath = `${user.id}/${fileName}`;

      logger.log('📤 [SUBIDA ESTRICTA] Subiendo archivo STL:', {
        bucket: 'quote-files',
        path: filePath,
        size: `${(selectedFile.size / 1024).toFixed(2)} KB`,
        type: selectedFile.type,
        user_id: user.id
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('quote-files')
        .upload(filePath, selectedFile, { 
          cacheControl: '3600', 
          upsert: false,
          contentType: 'model/stl'
        });

      if (uploadError) {
        logger.error('❌ [ERROR CRÍTICO] Fallo al subir archivo:', {
          message: uploadError.message,
          statusCode: (uploadError as any).statusCode,
          bucket: 'quote-files',
          path: filePath
        });
        toast.error(`Error al guardar archivo: ${uploadError.message}`);
        throw new Error(`No se pudo subir el archivo STL: ${uploadError.message}`);
      }

      logger.log('✅ [ÉXITO] Archivo STL guardado correctamente:', {
        path: uploadData.path,
        fullPath: uploadData.fullPath
      });

      // 2. Create calibration test
      const { data: testData, error: testError } = await supabase
        .from('calibration_tests')
        .insert({
          test_name: formData.test_name,
          stl_file_path: filePath,
          geometry_classification: classification?.type || 'compact',
          size_category: classification?.size || 'medium',
          supports_enabled: formData.supports_enabled,
          notes: formData.notes || null
        })
        .select()
        .single();

      if (testError) throw testError;

      // 3. Create material calibrations for each enabled material
      const materialInserts = [];
      for (const [materialId, data] of enabledMaterials) {
        const hours = parseFloat(data.actual_time_hours || '0');
        const minutes = parseFloat(data.actual_time_minutes || '0');
        const totalMinutes = hours * 60 + minutes;
        
        if (totalMinutes === 0) {
          toast.error(`Material ${materials.find(m => m.id === materialId)?.name}: ingresa tiempo real`);
          continue;
        }

        const actualGrams = parseFloat(data.actual_material_grams);
        if (!actualGrams) {
          toast.error(`Material ${materials.find(m => m.id === materialId)?.name}: ingresa peso real`);
          continue;
        }

        // Re-analyze with specific material and layer height
        const fileURL = URL.createObjectURL(selectedFile);
        const specificAnalysis = await analyzeSTLFile(
          fileURL,
          materialId,
          selectedFile.name,
          formData.supports_enabled,
          data.layer_height,
          1
        );
        URL.revokeObjectURL(fileURL);

        // CRÍTICO: Validar que el análisis retornó valores razonables
        if (!specificAnalysis || !specificAnalysis.weight || !specificAnalysis.estimatedTime) {
          throw new Error(`Análisis STL inválido para material ${materialId}: peso=${specificAnalysis?.weight}, tiempo=${specificAnalysis?.estimatedTime}`);
        }

        // VALIDACIÓN ESTRICTA: Prevenir valores absurdos (bug crítico detectado)
        if (specificAnalysis.weight <= 1 || specificAnalysis.estimatedTime <= 0.01) {
          logger.error('❌ ANÁLISIS STL DEVOLVIÓ VALORES INCORRECTOS:', {
            peso: specificAnalysis.weight,
            tiempo: specificAnalysis.estimatedTime,
            volumen: specificAnalysis.volume
          });
          throw new Error(
            `Análisis STL falló: peso=${specificAnalysis.weight.toFixed(2)}g, tiempo=${specificAnalysis.estimatedTime.toFixed(2)}h. ` +
            `Estos valores son demasiado bajos. Verifica que el archivo STL sea válido y tenga volumen.`
          );
        }

        // Calculate adjustment factors - LOS DATOS REALES SON LA VERDAD
        const actualTimeHours = totalMinutes / 60;
        const timeAdjustment = actualTimeHours / specificAnalysis.estimatedTime;
        const materialAdjustment = actualGrams / specificAnalysis.weight;
        
        // VALIDACIÓN MEJORADA: Factores entre 0.95x-1.2x son ideales
        // Si los factores están muy lejos de 1.0x, significa que las estimaciones del sistema
        // no coinciden con el laminador. Los datos del laminador son la fuente de verdad.
        
        const materialName = materials.find(m => m.id === materialId)?.name || 'Material';
        
        // Log detallado para diagnóstico
        logger.log(`📊 Análisis de calibración para ${materialName}:`, {
          calculado: {
            peso: specificAnalysis.weight.toFixed(2) + 'g',
            tiempo: specificAnalysis.estimatedTime.toFixed(2) + 'h',
            volumen: specificAnalysis.volume.toFixed(2) + 'cm³'
          },
          realLaminador: {
            peso: actualGrams + 'g',
            tiempo: actualTimeHours.toFixed(2) + 'h'
          },
          factoresCalculados: {
            material: materialAdjustment.toFixed(3) + 'x',
            tiempo: timeAdjustment.toFixed(3) + 'x'
          }
        });
        
        // VALIDACIÓN FLEXIBLE: Los datos del usuario son la fuente de verdad
        // Si hay discrepancias, se muestran advertencias pero se guardan los datos

        const validationWarnings: string[] = [];

        // Validar tiempo
        if (timeAdjustment < CALIBRATION_RANGES.IDEAL_MIN || timeAdjustment > CALIBRATION_RANGES.IDEAL_MAX) {
          validationWarnings.push(
            `⚠️ Factor de tiempo ${timeAdjustment.toFixed(2)}x fuera del rango ideal (${CALIBRATION_RANGES.IDEAL_MIN}x-${CALIBRATION_RANGES.IDEAL_MAX}x).\n` +
            `Calculado: ${specificAnalysis.estimatedTime.toFixed(2)}h, Real: ${actualTimeHours.toFixed(2)}h`
          );
        } else {
          logger.log(`✅ Factor de tiempo ${timeAdjustment.toFixed(3)}x está en el rango ideal`);
        }

        // Validar material
        if (materialAdjustment < CALIBRATION_RANGES.IDEAL_MIN || materialAdjustment > CALIBRATION_RANGES.IDEAL_MAX) {
          validationWarnings.push(
            `⚠️ Factor de material ${materialAdjustment.toFixed(2)}x fuera del rango ideal (${CALIBRATION_RANGES.IDEAL_MIN}x-${CALIBRATION_RANGES.IDEAL_MAX}x).\n` +
            `Calculado: ${specificAnalysis.weight.toFixed(2)}g, Real: ${actualGrams}g`
          );
        } else {
          logger.log(`✅ Factor de material ${materialAdjustment.toFixed(3)}x está en el rango ideal`);
        }

        // Mostrar confirmación (los datos del usuario son la verdad)
        if (validationWarnings.length > 0) {
          const warningMsg = validationWarnings.join('\n');
          logger.warn(`⚠️ Advertencias para ${materialName}:`, warningMsg);
          toast.success(
            `${materialName}: Calibración guardada y aplicada (${warningMsg})`,
            { duration: 5000 }
          );
        }

        logger.log(`✅ Calibración ACEPTADA para ${materialName}:`, {
          calculado: { peso: specificAnalysis.weight.toFixed(2) + 'g', tiempo: specificAnalysis.estimatedTime.toFixed(2) + 'h' },
          real: { peso: actualGrams + 'g', tiempo: actualTimeHours.toFixed(2) + 'h' },
          factoresFinales: { material: materialAdjustment.toFixed(3) + 'x', tiempo: timeAdjustment.toFixed(3) + 'x' },
          estado: validationWarnings.length === 0 ? '🎯 ÓPTIMO' : '⚠️ ACEPTABLE'
        });

        materialInserts.push({
          calibration_test_id: testData.id,
          material_id: materialId,
          layer_height: data.layer_height,
          infill_percentage: data.infill_percentage,
          print_speed: data.print_speed,
          calculated_volume: specificAnalysis.volume,
          calculated_weight: specificAnalysis.weight,
          calculated_time: specificAnalysis.estimatedTime,
          actual_time_minutes: totalMinutes,
          actual_material_grams: actualGrams,
          actual_energy_kwh: data.actual_energy_kwh ? parseFloat(data.actual_energy_kwh) : null,
          time_adjustment_factor: timeAdjustment,
          material_adjustment_factor: materialAdjustment,
          is_active: true
        });
      }

      if (materialInserts.length === 0) {
        throw new Error('No hay calibraciones válidas para guardar');
      }

      const { error: materialsError } = await supabase
        .from('calibration_materials')
        .insert(materialInserts);

      if (materialsError) throw materialsError;

      toast.success(`✅ Calibración guardada: ${materialInserts.length} material(es) configurado(s)`);
      logger.log(`✅ Test guardado con ${materialInserts.length} calibraciones de material`);
      
      resetForm();
      loadData();
    } catch (error: any) {
      logger.error('Error saving:', error);
      toast.error('Error al guardar calibración: ' + error.message);
    }
  };

  const updateCalibration = async () => {
    if (!editingTestId || !formData.test_name) {
      toast.error('Completa el nombre del test');
      return;
    }

    const enabledMaterials = Object.entries(materialCalibrations).filter(([_, data]) => data.enabled);
    if (enabledMaterials.length === 0) {
      toast.error('Configura al menos un material antes de guardar');
      return;
    }

    try {
      // Update test
      const { error: testError } = await supabase
        .from('calibration_tests')
        .update({
          test_name: formData.test_name,
          supports_enabled: formData.supports_enabled,
          notes: formData.notes || null
        })
        .eq('id', editingTestId);

      if (testError) throw testError;

      // Update or insert materials
      for (const [materialId, data] of enabledMaterials) {
        const hours = parseFloat(data.actual_time_hours || '0');
        const minutes = parseFloat(data.actual_time_minutes || '0');
        const totalMinutes = hours * 60 + minutes;
        
        if (totalMinutes === 0 || !parseFloat(data.actual_material_grams)) {
          continue;
        }

        const actualGrams = parseFloat(data.actual_material_grams);
        const calculatedTime = data.calculated_time || 1;
        const calculatedWeight = data.calculated_weight || 1;
        
        const timeAdjustment = (totalMinutes / 60) / calculatedTime;
        const materialAdjustment = actualGrams / calculatedWeight;
        
        const materialName = materials.find(m => m.id === materialId)?.name || 'Material';
        
        // Log detallado para diagnóstico
        logger.log(`📊 Actualización de calibración para ${materialName}:`, {
          calculado: {
            peso: calculatedWeight.toFixed(2) + 'g',
            tiempo: calculatedTime.toFixed(2) + 'h'
          },
          realLaminador: {
            peso: actualGrams + 'g',
            tiempo: (totalMinutes / 60).toFixed(2) + 'h'
          },
          factoresCalculados: {
            material: materialAdjustment.toFixed(3) + 'x',
            tiempo: timeAdjustment.toFixed(3) + 'x'
          }
        });
        
        // VALIDACIÓN FLEXIBLE: Los datos del usuario son la fuente de verdad
        const validationWarnings: string[] = [];

        // Validar tiempo
        if (timeAdjustment < CALIBRATION_RANGES.IDEAL_MIN || timeAdjustment > CALIBRATION_RANGES.IDEAL_MAX) {
          validationWarnings.push(
            `⚠️ Factor de tiempo ${timeAdjustment.toFixed(2)}x fuera del rango ideal (${CALIBRATION_RANGES.IDEAL_MIN}x-${CALIBRATION_RANGES.IDEAL_MAX}x).\n` +
            `Calculado: ${calculatedTime.toFixed(2)}h, Real: ${(totalMinutes/60).toFixed(2)}h.`
          );
        }

        // Validar material
        if (materialAdjustment < CALIBRATION_RANGES.IDEAL_MIN || materialAdjustment > CALIBRATION_RANGES.IDEAL_MAX) {
          validationWarnings.push(
            `⚠️ Factor de material ${materialAdjustment.toFixed(2)}x fuera del rango ideal (${CALIBRATION_RANGES.IDEAL_MIN}x-${CALIBRATION_RANGES.IDEAL_MAX}x).\n` +
            `Calculado: ${calculatedWeight.toFixed(2)}g, Real: ${actualGrams}g.`
          );
        }

        // Mostrar confirmación (actualización aplicada)
        if (validationWarnings.length > 0) {
          const warningMsg = validationWarnings.join('\n');
          logger.warn(`⚠️ Advertencias para ${materialName}:`, warningMsg);
          toast.success(`${materialName}: Calibración actualizada y aplicada`, { duration: 5000 });
        }
        
        logger.log(`✅ Actualización ACEPTADA para ${materialName}:`, {
          factoresFinales: { tiempo: timeAdjustment.toFixed(3) + 'x', material: materialAdjustment.toFixed(3) + 'x' },
          estado: validationWarnings.length === 0 ? '🎯 ÓPTIMO' : '⚠️ ACEPTABLE'
        });

        const materialData = {
          calibration_test_id: editingTestId,
          material_id: materialId,
          layer_height: data.layer_height,
          infill_percentage: data.infill_percentage,
          print_speed: data.print_speed,
          actual_time_minutes: totalMinutes,
          actual_material_grams: actualGrams,
          actual_energy_kwh: data.actual_energy_kwh ? parseFloat(data.actual_energy_kwh) : null,
          time_adjustment_factor: timeAdjustment,
          material_adjustment_factor: materialAdjustment,
          calculated_time: calculatedTime,
          calculated_weight: calculatedWeight,
          is_active: true
        };

        if (data.calibrationId) {
          // Update existing
          const { error } = await supabase
            .from('calibration_materials')
            .update(materialData)
            .eq('id', data.calibrationId);
          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('calibration_materials')
            .insert(materialData);
          if (error) throw error;
        }
      }

      toast.success('✅ Calibración actualizada correctamente');
      resetForm();
      loadData();
    } catch (error: any) {
      logger.error('Error updating:', error);
      toast.error('Error al actualizar: ' + error.message);
    }
  };

  const deleteTest = async (id: string) => {
    try {
      const { error } = await supabase
        .from('calibration_tests')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Test eliminado (incluye todos sus materiales)');
      loadData();
    } catch (error: any) {
      logger.error('Error deleting:', error);
      toast.error('Error al eliminar');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingTestId(null);
    setSelectedFile(null);
    setAnalysisResult(null);
    setClassification(null);
    setFormData({
      test_name: '',
      supports_enabled: false,
      notes: ''
    });
    
    // Reset material calibrations
    const resetCalibrations: Record<string, any> = {};
    materials.forEach(mat => {
      resetCalibrations[mat.id] = {
        layer_height: 0.2,
        infill_percentage: 20,
        print_speed: 50,
        actual_time_hours: '',
        actual_time_minutes: '',
        actual_material_grams: '',
        actual_energy_kwh: '',
        enabled: false
      };
    });
    setMaterialCalibrations(resetCalibrations);
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
            Calibración de Calculadora
          </h1>
          <p className="text-muted-foreground mt-2">
            Sube un archivo STL una vez y calibra múltiples materiales con datos reales del laminador
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={calibrationEnabled}
              onCheckedChange={toggleCalibrationSystem}
            />
            <Label className="text-sm font-medium">
              Sistema {calibrationEnabled ? 'Activo' : 'Inactivo'}
            </Label>
            <Badge variant={calibrationEnabled ? 'default' : 'secondary'}>
              {calibrationEnabled ? 'ON' : 'OFF'}
            </Badge>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : 'Nueva Calibración'}
          </Button>
        </div>
      </div>

      {/* GUÍA DE AYUDA MEJORADA */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 w-full justify-between hover:opacity-80">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg text-blue-900">
                  📖 Guía: Cómo crear calibraciones precisas
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm">Ver guía</Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <CardContent className="space-y-4 text-sm">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>¿Por qué necesito calibrar?</AlertTitle>
                  <AlertDescription>
                    El sistema calcula estimaciones de tiempo y material. Para hacerlas más precisas,
                    necesitamos compararlas con datos reales de tu laminador (Cura, PrusaSlicer, etc.).
                    Los <strong>factores de calibración ideales están entre 0.95x-1.2x</strong>.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3 border-l-4 border-blue-300 pl-4">
                  <h4 className="font-semibold text-blue-900">✅ Pasos para calibrar correctamente:</h4>
                  
                  <div className="space-y-2">
                    <p><strong>1. Prepara tu pieza de prueba:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Usa un STL real que vayas a imprimir</li>
                      <li>Ideal: piezas entre 10-100g (ni muy pequeñas ni muy grandes)</li>
                      <li>Evita piezas extremadamente complejas para la primera calibración</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p><strong>2. Lamina en tu slicer favorito:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Usa tus configuraciones normales de impresión</li>
                      <li>Anota el <strong>tiempo estimado</strong> (ej: 1h 25min)</li>
                      <li>Anota el <strong>peso del filamento</strong> (ej: 12.5g)</li>
                      <li>Guarda el STL original (¡usa exactamente el mismo archivo!)</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p><strong>3. Sube y configura en este sistema:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Sube el mismo STL que laminaste</li>
                      <li>Deja que el sistema lo analice</li>
                      <li>Ingresa los datos <strong>exactos</strong> de tu laminador</li>
                      <li>El sistema calculará factores de ajuste automáticamente</li>
                    </ul>
                  </div>

                  <div className="space-y-2 bg-yellow-50 p-3 rounded">
                    <p><strong>⚠️ Si ves factores mayores a 1.5x o menores a 0.8x:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1 text-yellow-900">
                      <li>Verifica que el STL sea exactamente el mismo</li>
                      <li>Confirma que los datos del laminador sean correctos</li>
                      <li>Revisa que la configuración (altura capa, infill, etc.) coincida</li>
                    </ul>
                  </div>
                </div>

                <div className="border-t pt-3 mt-3">
                  <h4 className="font-semibold text-blue-900 mb-2">📚 Recursos externos recomendados:</h4>
                  <div className="space-y-1">
                    <a 
                      href="https://www.3dwork.io/calibracion-impresora-3d/" 
                      target="_blank" 
                      rel="noopener noreferrer nofollow"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Guía de calibración 3D Work Labs
                    </a>
                    <a 
                      href="https://www.dhm.online/calibrar-impresora-3d/" 
                      target="_blank" 
                      rel="noopener noreferrer nofollow"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      DHM Online - Calibración impresora 3D
                    </a>
                  </div>
                </div>

                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-900">Factores ideales</AlertTitle>
                  <AlertDescription className="text-green-800">
                    <strong>Material: 0.95x-1.2x</strong> significa que nuestro cálculo está dentro del ±20% del laminador.<br/>
                    <strong>Tiempo: 0.95x-1.2x</strong> significa estimaciones muy precisas.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingTestId ? 'Editar Calibración' : 'Nueva Calibración (Flujo Mejorado)'}
            </CardTitle>
            <CardDescription>
              {editingTestId 
                ? 'Modifica los datos del test y guarda los cambios'
                : '1. Sube un STL → 2. Analiza → 3. Configura cada material con datos reales del laminador'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* PASO 1: Upload STL (solo si no está editando) */}
            {!editingTestId && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Paso 1: Cargar Archivo STL</h3>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".stl"
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                  className="hidden"
                  id="stl-upload"
                />
                <label htmlFor="stl-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="font-medium">
                    {selectedFile ? selectedFile.name : 'Haz clic o arrastra un archivo STL'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">Máximo 50MB</p>
                </label>
              </div>

              {selectedFile && !analysisResult && (
                <Button onClick={analyzeFile} disabled={analyzing} className="w-full">
                  {analyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analizando geometría...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Analizar Archivo
                    </>
                  )}
                </Button>
              )}
            </div>
            )}

            {/* PASO 2: Analysis Results */}
            {editingTestId && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>Editando test existente:</strong> {formData.test_name}
                  <br />
                  <strong>Clasificación:</strong> {classification?.type} / {classification?.size}
                </AlertDescription>
              </Alert>
            )}
            {analysisResult && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>Análisis completado:</strong> {analysisResult.volume.toFixed(2)}cm³, 
                  {analysisResult.dimensions.x.toFixed(1)}×{analysisResult.dimensions.y.toFixed(1)}×{analysisResult.dimensions.z.toFixed(1)}cm
                  <br />
                  <strong>Clasificación:</strong> {classification?.type} / {classification?.size}
                </AlertDescription>
              </Alert>
            )}

            {/* PASO 3: General Configuration */}
            {(analysisResult || editingTestId) && (
              <>
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Paso 2: Configuración General</h3>
                  
                  <div className="space-y-2">
                    <Label>Nombre del Test</Label>
                    <Input
                      value={formData.test_name}
                      onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                      placeholder="Ej: Pinza pequeña compleja"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.supports_enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, supports_enabled: checked })}
                    />
                    <Label>¿Lleva soportes?</Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Notas (opcional)</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Observaciones sobre la pieza..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* PASO 4: Material Tabs */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Paso 3: Configurar Materiales</h3>
                  <p className="text-sm text-muted-foreground">
                    Activa y configura cada material con los datos REALES de tu laminador
                  </p>

                  <Tabs defaultValue={materials[0]?.id} className="w-full">
                    <TabsList className="w-full flex-wrap h-auto">
                      {materials.map(mat => (
                        <TabsTrigger key={mat.id} value={mat.id} className="flex-1">
                          {mat.name}
                          {materialCalibrations[mat.id]?.enabled && (
                            <CheckCircle2 className="ml-2 h-4 w-4 text-green-500" />
                          )}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {materials.map(mat => (
                      <TabsContent key={mat.id} value={mat.id} className="space-y-4">
                        <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
                          <Switch
                            checked={materialCalibrations[mat.id]?.enabled || false}
                            onCheckedChange={(checked) => {
                              setMaterialCalibrations({
                                ...materialCalibrations,
                                [mat.id]: { ...materialCalibrations[mat.id], enabled: checked }
                              });
                            }}
                          />
                          <Label className="font-semibold">
                            Calibrar {mat.name}
                          </Label>
                        </div>

                        {materialCalibrations[mat.id]?.enabled && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Altura de capa (mm)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={materialCalibrations[mat.id]?.layer_height || 0.2}
                                onChange={(e) => {
                                  setMaterialCalibrations({
                                    ...materialCalibrations,
                                    [mat.id]: { ...materialCalibrations[mat.id], layer_height: parseFloat(e.target.value) }
                                  });
                                }}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Infill (%)</Label>
                              <Input
                                type="number"
                                value={materialCalibrations[mat.id]?.infill_percentage || 20}
                                onChange={(e) => {
                                  setMaterialCalibrations({
                                    ...materialCalibrations,
                                    [mat.id]: { ...materialCalibrations[mat.id], infill_percentage: parseInt(e.target.value) }
                                  });
                                }}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Velocidad (mm/s)</Label>
                              <Input
                                type="number"
                                value={materialCalibrations[mat.id]?.print_speed || 50}
                                onChange={(e) => {
                                  setMaterialCalibrations({
                                    ...materialCalibrations,
                                    [mat.id]: { ...materialCalibrations[mat.id], print_speed: parseInt(e.target.value) }
                                  });
                                }}
                              />
                            </div>

                            <div className="md:col-span-2 border-t pt-4">
                              <h4 className="font-semibold mb-3">⏱️ Datos Reales del Laminador</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Horas</Label>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={materialCalibrations[mat.id]?.actual_time_hours || ''}
                                    onChange={(e) => {
                                      setMaterialCalibrations({
                                        ...materialCalibrations,
                                        [mat.id]: { ...materialCalibrations[mat.id], actual_time_hours: e.target.value }
                                      });
                                    }}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Minutos</Label>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={materialCalibrations[mat.id]?.actual_time_minutes || ''}
                                    onChange={(e) => {
                                      setMaterialCalibrations({
                                        ...materialCalibrations,
                                        [mat.id]: { ...materialCalibrations[mat.id], actual_time_minutes: e.target.value }
                                      });
                                    }}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Material usado (g)</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    placeholder="45.5"
                                    value={materialCalibrations[mat.id]?.actual_material_grams || ''}
                                    onChange={(e) => {
                                      setMaterialCalibrations({
                                        ...materialCalibrations,
                                        [mat.id]: { ...materialCalibrations[mat.id], actual_material_grams: e.target.value }
                                      });
                                    }}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Energía (kWh, opcional)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.15"
                                    value={materialCalibrations[mat.id]?.actual_energy_kwh || ''}
                                    onChange={(e) => {
                                      setMaterialCalibrations({
                                        ...materialCalibrations,
                                        [mat.id]: { ...materialCalibrations[mat.id], actual_energy_kwh: e.target.value }
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>

                <Button onClick={saveCalibration} className="w-full" size="lg">
                  {editingTestId ? 'Actualizar Calibración' : 'Guardar Calibración'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tests List */}
      <Card>
        <CardHeader>
          <CardTitle>Tests de Calibración Guardados</CardTitle>
          <CardDescription>
            Cada test puede tener múltiples materiales calibrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay tests de calibración. Crea uno nuevo.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Geometría</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Soportes</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map(test => (
                  <TableRow key={test.id}>
                    <TableCell className="font-medium">{test.test_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{test.geometry_classification}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{test.size_category}</Badge>
                    </TableCell>
                    <TableCell>
                      {test.supports_enabled ? '✓ Sí' : '✗ No'}
                    </TableCell>
                    <TableCell>
                      {new Date(test.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editTest(test.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTest(test.id)}
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
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <strong>Próximo paso:</strong> Una vez tengas suficientes calibraciones (mínimo 2 por material),
          ve a "Perfiles de Calibración" para generar perfiles automáticos que mejorarán la precisión.
        </AlertDescription>
      </Alert>
    </div>
  );
}
