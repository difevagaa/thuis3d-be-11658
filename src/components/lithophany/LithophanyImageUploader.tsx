import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Image as ImageIcon, AlertCircle, FileImage, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LithophanyImageUploaderProps {
  onImageUpload: (imageDataUrl: string) => void;
}

export const LithophanyImageUploader = ({ onImageUpload }: LithophanyImageUploaderProps) => {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number; size: string } | null>(null);

  const processFile = useCallback((file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'];
    if (!validTypes.includes(file.type)) {
      toast.error(language === 'es' 
        ? 'Formato no válido. Usa JPG, PNG, WebP, BMP o TIFF'
        : 'Invalid format. Use JPG, PNG, WebP, BMP or TIFF');
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(language === 'es' 
        ? 'El archivo es demasiado grande. Máximo 50MB'
        : 'File is too large. Maximum 50MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      
      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        setImageInfo({
          width: img.width,
          height: img.height,
          size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
        });
        setPreview(result);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }, [language]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleConfirmUpload = useCallback(() => {
    if (preview) {
      onImageUpload(preview);
    }
  }, [preview, onImageUpload]);

  const handleClear = useCallback(() => {
    setPreview(null);
    setImageInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold mb-2">
          {language === 'es' ? 'Sube tu Imagen' : 'Upload Your Image'}
        </h2>
        <p className="text-muted-foreground">
          {language === 'es' 
            ? 'Selecciona una foto para convertirla en una litofanía 3D'
            : 'Select a photo to convert it into a 3D lithophane'}
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {language === 'es' 
            ? 'Para mejores resultados, usa imágenes con buen contraste y resolución mínima de 800x600 píxeles. Las fotos en blanco y negro o con alto contraste funcionan mejor para litofanías.'
            : 'For best results, use images with good contrast and minimum resolution of 800x600 pixels. Black and white or high contrast photos work best for lithophanes.'}
        </AlertDescription>
      </Alert>

      {!preview ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer",
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Upload className="h-10 w-10 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium mb-1">
                {language === 'es' 
                  ? 'Arrastra y suelta tu imagen aquí'
                  : 'Drag and drop your image here'}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === 'es' ? 'o haz clic para seleccionar' : 'or click to select'}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {['JPG', 'PNG', 'WebP', 'BMP', 'TIFF'].map(format => (
                <span key={format} className="px-2 py-1 bg-muted rounded text-xs font-medium">
                  {format}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'es' ? 'Máximo 50MB' : 'Maximum 50MB'}
            </p>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                {language === 'es' ? 'Vista Previa' : 'Preview'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              <img 
                src={preview} 
                alt="Preview" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
            
            {imageInfo && (
              <div className="flex gap-4 justify-center text-sm text-muted-foreground">
                <span>{imageInfo.width} × {imageInfo.height} px</span>
                <span>•</span>
                <span>{imageInfo.size}</span>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleClear}>
                {language === 'es' ? 'Cambiar Imagen' : 'Change Image'}
              </Button>
              <Button onClick={handleConfirmUpload}>
                <ImageIcon className="h-4 w-4 mr-2" />
                {language === 'es' ? 'Continuar con esta imagen' : 'Continue with this image'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <Card className="p-4 text-center">
          <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto mb-3">
            <ImageIcon className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-medium mb-1">
            {language === 'es' ? 'Alta Calidad' : 'High Quality'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === 'es' 
              ? 'Usa imágenes de alta resolución para mejores resultados'
              : 'Use high resolution images for best results'}
          </p>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto mb-3">
            <AlertCircle className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-medium mb-1">
            {language === 'es' ? 'Buen Contraste' : 'Good Contrast'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === 'es' 
              ? 'Las imágenes con buen contraste producen mejores litofanías'
              : 'Images with good contrast produce better lithophanes'}
          </p>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto mb-3">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-medium mb-1">
            {language === 'es' ? 'Formatos Compatibles' : 'Supported Formats'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === 'es' 
              ? 'JPG, PNG, WebP, BMP y TIFF'
              : 'JPG, PNG, WebP, BMP and TIFF'}
          </p>
        </Card>
      </div>
    </div>
  );
};
