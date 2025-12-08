/**
 * ImageUploadField - Dual-mode image input component
 * Allows users to either:
 * 1. Upload an image file directly (stored in Supabase Storage)
 * 2. Provide an image URL
 */

import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Link as LinkIcon, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  helpText?: string;
  bucket?: string; // Supabase storage bucket name
  maxSizeMB?: number;
  acceptedFormats?: string[];
}

export function ImageUploadField({
  label,
  value,
  onChange,
  helpText,
  bucket = "product-images",
  maxSizeMB = 5,
  acceptedFormats = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<"url" | "file">(value ? "url" : "file");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      toast.error(`Formato no válido. Formatos aceptados: ${acceptedFormats.join(", ")}`);
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast.error(`El archivo es muy grande. Tamaño máximo: ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        logger.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        onChange(urlData.publicUrl);
        toast.success("Imagen subida correctamente");
        logger.log('Image uploaded successfully:', urlData.publicUrl);
      }
    } catch (error: any) {
      logger.error('Image upload error:', error);
      toast.error("Error al subir la imagen: " + (error.message || "Error desconocido"));
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUrlChange = (url: string) => {
    onChange(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveImage}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Limpiar
          </Button>
        )}
      </div>
      
      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}

      <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "url" | "file")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file" className="text-xs">
            <Upload className="h-3 w-3 mr-1" />
            Subir Archivo
          </TabsTrigger>
          <TabsTrigger value="url" className="text-xs">
            <LinkIcon className="h-3 w-3 mr-1" />
            URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="space-y-2">
          <div className="flex gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept={acceptedFormats.join(",")}
              onChange={handleFileSelect}
              disabled={uploading}
              className="flex-1"
            />
            {uploading && (
              <Button disabled size="sm" variant="outline">
                <Loader2 className="h-4 w-4 animate-spin" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Max {maxSizeMB}MB. Formatos: JPG, PNG, GIF, WebP, SVG
          </p>
        </TabsContent>

        <TabsContent value="url" className="space-y-2">
          <Input
            type="url"
            value={value || ''}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
          <p className="text-xs text-muted-foreground">
            Ingresa la URL completa de una imagen
          </p>
        </TabsContent>
      </Tabs>

      {/* Image Preview */}
      {value && (
        <div className="mt-3 border rounded-lg p-2 bg-muted/30">
          <Label className="text-xs text-muted-foreground mb-2 block">Vista previa</Label>
          <div className="relative group">
            <img
              src={value}
              alt="Preview"
              className="w-full h-auto max-h-[200px] object-contain rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                toast.error("No se pudo cargar la imagen. Verifica la URL.");
              }}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
              <ImageIcon className="h-8 w-8 text-white" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 truncate" title={value}>
            {value}
          </p>
        </div>
      )}
    </div>
  );
}
