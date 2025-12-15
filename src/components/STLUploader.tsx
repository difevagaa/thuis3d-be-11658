import { useState } from 'react';
import { analyzeSTLFile, AnalysisResult } from '@/lib/stlAnalyzer';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Loader2, CheckCircle2, FileText, Shield, Info, Box, Ruler } from 'lucide-react';
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
  const [fileInfo, setFileInfo] = useState<{
    size: string;
    dimensions?: { x: number; y: number; z: number };
  } | null>(null);

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
    setFileInfo({
      size: (file.size / 1024 / 1024).toFixed(2)
    });
    toast.success(`${t('fileSelected')}: ${file.name}`);
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

    // Use a default material for initial analysis - price will be calculated later
    const analyseMaterialId = materialId || 'default';

    setAnalyzing(true);
    setProgress(10);
    setProgressMessage(t('progressReading'));

    try {
      const fileURL = URL.createObjectURL(selectedFile);
      
      setProgress(30);
      setProgressMessage(t('progressAnalyzing'));

      await new Promise(resolve => setTimeout(resolve, 500));

      const analysis = await analyzeSTLFile(fileURL, analyseMaterialId, '', supportsRequired, layerHeight, quantity, colorId);

      setProgress(90);
      setProgressMessage(t('progressCalculating'));

      // Update file info with dimensions
      setFileInfo(prev => ({
        ...prev!,
        dimensions: analysis.dimensions
      }));

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
      
      {/* Process guide - replaces supports recommendation */}
      <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-900 dark:text-blue-100">
          <strong>{t('howItWorks')}:</strong>
          <ol className="mt-2 space-y-1 list-decimal list-inside">
            <li>{t('step1Upload')}</li>
            <li>{t('step2Analyze')}</li>
            <li>{t('step3Customize')}</li>
            <li>{t('step4Submit')}</li>
          </ol>
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
              </div>
              
              {/* File info card */}
              {fileInfo && (
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-xs bg-muted/50 px-2 py-1 rounded">
                    <Box className="h-3 w-3" />
                    <span>{fileInfo.size} MB</span>
                  </div>
                  {fileInfo.dimensions && (
                    <div className="flex items-center gap-1 text-xs bg-muted/50 px-2 py-1 rounded">
                      <Ruler className="h-3 w-3" />
                      <span>{fileInfo.dimensions.x.toFixed(1)} × {fileInfo.dimensions.y.toFixed(1)} × {fileInfo.dimensions.z.toFixed(1)} mm</span>
                    </div>
                  )}
                </div>
              )}
              
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setFileInfo(null);
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

      {/* Privacy notice - compact */}
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Shield className="h-3 w-3" />
        🔒 {t('privacyText')}
      </p>

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
