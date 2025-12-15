import { useState } from 'react';
import { analyzeSTLFile, AnalysisResult, detectSupportsNeeded } from '@/lib/stlAnalyzer';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Loader2, CheckCircle2, FileText, Shield, Lightbulb } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('stlUploader');
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

    if (!file.name.toLowerCase().endsWith('.stl')) {
      toast.error(t('errorInvalidFile'));
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error(t('errorFileTooLarge'));
      return;
    }

    setSelectedFile(file);
    setSupportsDetection(null);
    toast.success(`${t('fileSelected')}: ${file.name}`);
    
    if (onSupportsDetected) {
      setDetectingSupports(true);
      try {
        const fileURL = URL.createObjectURL(file);
        const materialForDetection = materialId || 'PLA';
        const layerHeightForDetection = layerHeight || 0.2;
        
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
        
        onSupportsDetected(detection.needsSupports, detection.reason);
        
        if (detection.needsSupports) {
          toast.info(t('supportsNeeded'), { description: detection.reason });
        } else {
          toast.success(t('noSupportsNeeded'), { description: detection.reason });
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
      toast.error(t('errorNoFile'));
      return;
    }

    if (!materialId) {
      toast.error(t('errorNoMaterial'));
      return;
    }

    setAnalyzing(true);
    setProgress(10);
    setProgressMessage(t('progressReading'));

    try {
      const fileURL = URL.createObjectURL(selectedFile);
      
      setProgress(30);
      setProgressMessage(t('progressAnalyzing'));

      await new Promise(resolve => setTimeout(resolve, 500));

      const analysis = await analyzeSTLFile(fileURL, materialId, '', supportsRequired, layerHeight, quantity, colorId);

      setProgress(90);
      setProgressMessage(t('progressCalculating'));

      await new Promise(resolve => setTimeout(resolve, 500));

      setProgress(100);
      setProgressMessage(t('progressComplete'));

      onAnalysisComplete({ ...analysis, file: selectedFile });

      URL.revokeObjectURL(fileURL);

      toast.success(t('analysisSuccess'));

    } catch (error: any) {
      console.error('Error analyzing file:', error);
      toast.error(error.message || t('errorAnalyzing'));
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
      <Label className="text-base font-semibold">{t('label')} *</Label>
      
      {/* Privacy notice */}
      <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-900 dark:text-blue-100">
          <strong>🔒 {t('privacyTitle')}:</strong> {t('privacyText')}
        </AlertDescription>
      </Alert>
      
      {/* Drop zone */}
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
                <p className="text-sm font-medium text-green-700 dark:text-green-400">✅ {t('fileReady')}</p>
                <p className="text-base font-semibold mt-1">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t('fileSize')}: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
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
                {t('changeFile')}
              </Button>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {t('dropHere')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('orClickToSelect')}
                </p>
                <p className="text-xs text-muted-foreground mt-2 opacity-70">
                  📁 {t('formatInfo')}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Analyze button */}
      {selectedFile && !analyzing && (
        <Button 
          onClick={handleUploadAndAnalyze} 
          type="button"
          className="w-full"
          size="lg"
        >
          <FileText className="h-4 w-4 mr-2" />
          🔍 {t('analyzeButton')}
        </Button>
      )}

      {/* Analysis progress */}
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
                {progress}% {t('completed')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supports detection in progress */}
      {detectingSupports && (
        <Card className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  🔬 {t('analyzingGeometry')}
                </span>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  {t('detectingOverhangs')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supports detection result */}
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
                {supportsDetection.detected ? `⚠️ ${t('supportsRecommended')}` : `✅ ${t('noSupportsRequired')}`}
              </p>
              <p className={`text-xs ${supportsDetection.detected ? 'text-amber-800 dark:text-amber-200' : 'text-green-800 dark:text-green-200'}`}>
                {supportsDetection.reason}
              </p>
              <p className={`text-xs ${supportsDetection.detected ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300'}`}>
                <strong>{t('analysisConfidence')}:</strong> {
                  supportsDetection.confidence === 'high' ? `🟢 ${t('confidenceHigh')}` :
                  supportsDetection.confidence === 'medium' ? `🟡 ${t('confidenceMedium')}` : `🟠 ${t('confidenceLow')}`
                }
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Success */}
      {progress === 100 && !analyzing && (
        <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <span className="text-sm font-medium">✅ {t('analysisCompleteSuccess')}</span>
                <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                  {t('reviewDetailsBelow')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
