import { useState } from 'react';
import { analyzeSTLFile, AnalysisResult, detectSupportsNeeded } from '@/lib/stlAnalyzer';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, CheckCircle2, FileText, Shield, Lightbulb } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface STLUploaderProps {
  materialId: string;
  colorId?: string;
  onAnalysisComplete: (result: AnalysisResult & { file: File }) => void;
  onSupportsDetected?: (needsSupports: boolean, reason: string) => void;
  supportsRequired?: boolean;
  layerHeight?: number;
  quantity?: number;
}

export const STLUploader = ({ materialId, colorId, onAnalysisComplete, onSupportsDetected, supportsRequired = false, layerHeight, quantity = 1 }: STLUploaderProps) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [supportsDetection, setSupportsDetection] = useState<{
    detected: boolean;
    reason: string;
    confidence: 'high' | 'medium' | 'low';
  } | null>(null);
  const [detectingSupports, setDetectingSupports] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validar que sea un archivo STL
    if (!file.name.toLowerCase().endsWith('.stl')) {
      toast.error('Por favor selecciona un archivo STL válido');
      return;
    }

    // Validar tamaño (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande (máximo 50MB)');
      return;
    }

    setSelectedFile(file);
    setSupportsDetection(null);
    toast.success(`Archivo seleccionado: ${file.name}`);
    
    // Detectar automáticamente si necesita soportes
    if (onSupportsDetected) {
      setDetectingSupports(true);
      try {
        const fileURL = URL.createObjectURL(file);
        
        // Usar valores por defecto si no están disponibles
        const materialForDetection = materialId || 'PLA'; // Usar el materialId como nombre (o PLA por defecto)
        const layerHeightForDetection = layerHeight || 0.2; // 0.2mm por defecto
        
        const detection = await detectSupportsNeeded(
          fileURL, 
          materialForDetection,
          layerHeightForDetection
        );
        URL.revokeObjectURL(fileURL);
        
        setSupportsDetection({
          detected: detection.needsSupports,
          reason: detection.reason,
          confidence: detection.confidence
        });
        
        // Notificar al componente padre
        onSupportsDetected(detection.needsSupports, detection.reason);
        
        if (detection.needsSupports) {
          toast.info('Se detectó que la pieza necesita soportes', {
            description: detection.reason
          });
        } else {
          toast.success('La pieza no necesita soportes', {
            description: detection.reason
          });
        }
      } catch (error) {
        console.error('Error detecting supports:', error);
      } finally {
        setDetectingSupports(false);
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) {
      toast.error('Por favor selecciona un archivo');
      return;
    }

    if (!materialId) {
      toast.error('Por favor selecciona un material primero');
      return;
    }

    setAnalyzing(true);
    setProgress(10);
    setProgressMessage('Leyendo archivo...');

    try {
      // 1. Crear URL temporal del archivo local (NO lo subimos aún)
      const fileURL = URL.createObjectURL(selectedFile);
      
      setProgress(30);
      setProgressMessage('Analizando geometría del modelo 3D...');

      // Pequeña pausa para dar feedback visual
      await new Promise(resolve => setTimeout(resolve, 500));

      // 2. Analizar archivo STL localmente (sin subirlo) con configuraciones
      const analysis = await analyzeSTLFile(fileURL, materialId, '', supportsRequired, layerHeight, quantity, colorId);

      setProgress(90);
      setProgressMessage('Calculando costos...');

      // Pequeña pausa para mostrar el progreso
      await new Promise(resolve => setTimeout(resolve, 500));

      setProgress(100);
      setProgressMessage('¡Análisis completado!');

      // 3. Devolver resultados con el archivo original
      onAnalysisComplete({ ...analysis, file: selectedFile });

      // Limpiar URL temporal
      URL.revokeObjectURL(fileURL);

      toast.success('Análisis completado exitosamente');

    } catch (error: any) {
      console.error('Error analyzing file:', error);
      toast.error(error.message || 'Error al analizar el archivo. Verifica que sea un STL válido.');
    } finally {
      setTimeout(() => {
        setAnalyzing(false);
        setProgress(0);
        setProgressMessage('');
      }, 1000);
    }
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Archivo 3D (STL) *</Label>
      
      {/* Aviso de privacidad */}
      <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-900 dark:text-blue-100">
          <strong>🔒 Protección de Datos:</strong> Tu archivo NO será almacenado hasta que envíes la cotización. 
          Todos los datos y archivos están protegidos bajo nuestra Política de Privacidad (RGPD) 
          y solo serán utilizados para procesar tu solicitud. Los archivos se eliminan automáticamente 
          después de 30 días.
        </AlertDescription>
      </Alert>
      
      {/* Zona de drop */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          dragActive 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : selectedFile 
            ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".stl"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          disabled={analyzing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          id="stl-file-input"
        />
        
        <div className="flex flex-col items-center gap-3">
          {selectedFile ? (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-400">✅ Archivo seleccionado</p>
                <p className="text-base font-semibold mt-1">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  Tamaño: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setSupportsDetection(null);
                }}
              >
                Cambiar archivo
              </Button>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Arrastra tu archivo STL aquí
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground mt-2 opacity-70">
                  📁 Formato: STL • Máximo: 50MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Botón de analizar */}
      {selectedFile && !analyzing && (
        <Button 
          onClick={handleUploadAndAnalyze} 
          type="button"
          className="w-full"
          size="lg"
        >
          <FileText className="h-4 w-4 mr-2" />
          🔍 Analizar Modelo 3D
        </Button>
      )}

      {/* Progreso de análisis */}
      {analyzing && (
        <Card className="border-primary/50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium">{progressMessage}</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {progress}% completado
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detección de soportes */}
      {detectingSupports && (
        <Card className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  🔬 Analizando geometría del modelo...
                </span>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  Detectando voladizos y calculando necesidad de soportes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado de detección de soportes */}
      {supportsDetection && !detectingSupports && (
        <Alert className={
          supportsDetection.detected 
            ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
            : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
        }>
          <Lightbulb className={`h-4 w-4 ${supportsDetection.detected ? 'text-amber-600' : 'text-green-600'}`} />
          <AlertDescription>
            <div className="space-y-2">
              <p className={`text-sm font-semibold ${supportsDetection.detected ? 'text-amber-900 dark:text-amber-100' : 'text-green-900 dark:text-green-100'}`}>
                {supportsDetection.detected ? '⚠️ Soportes Recomendados' : '✅ Sin Soportes Necesarios'}
              </p>
              <p className={`text-xs ${supportsDetection.detected ? 'text-amber-800 dark:text-amber-200' : 'text-green-800 dark:text-green-200'}`}>
                {supportsDetection.reason}
              </p>
              <p className={`text-xs ${supportsDetection.detected ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300'}`}>
                <strong>Confianza del análisis:</strong> {
                  supportsDetection.confidence === 'high' ? '🟢 Alta' :
                  supportsDetection.confidence === 'medium' ? '🟡 Media' : '🟠 Baja'
                }
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Éxito */}
      {progress === 100 && !analyzing && (
        <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <span className="text-sm font-medium">✅ Análisis completado exitosamente</span>
                <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                  Revisa los detalles de tu pieza a continuación
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};