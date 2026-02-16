import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, X, Image as ImageIcon, Languages } from "lucide-react";
import { generateImageSeoMetadata, getSupportedLanguages } from "@/utils/imageSeoTranslation";
import { logger } from "@/lib/logger";

interface ProductImageUploaderProps {
  productId: string;
  productName?: string;
  existingImages: Array<{ id: string; image_url: string; display_order: number }>;
  onImagesChange: () => void;
}

/**
 * Store SEO translations for a product image
 * Uses the translations table to store multilingual alt_text
 */
const storeImageSeoTranslations = async (
  imageId: string,
  productName: string,
  imageIndex: number
): Promise<void> => {
  const seoMetadata = generateImageSeoMetadata(productName, imageIndex);
  const languages = getSupportedLanguages();
  
  const translations = languages.map(lang => ({
    entity_type: 'product_images',
    entity_id: imageId,
    field_name: 'alt_text',
    language: lang,
    translated_text: seoMetadata[lang].altText,
    is_auto_translated: true
  }));
  
  // Also store enhanced title translations
  const titleTranslations = languages.map(lang => ({
    entity_type: 'product_images',
    entity_id: imageId,
    field_name: 'title',
    language: lang,
    translated_text: seoMetadata[lang].enhancedTitle,
    is_auto_translated: true
  }));
  
  const allTranslations = [...translations, ...titleTranslations];
  
  try {
    const { error } = await supabase
      .from('translations')
      .upsert(allTranslations, {
        onConflict: 'entity_type,entity_id,field_name,language'
      });
    
    if (error) {
      logger.error('Error storing image SEO translations:', error);
    } else {
      logger.log('✅ SEO translations stored for image:', imageId);
    }
  } catch (err) {
    logger.error('Exception storing image SEO translations:', err);
  }
};

export default function ProductImageUploader({
  productId,
  productName = '',
  existingImages,
  onImagesChange,
}: ProductImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => file.type.startsWith("image/"));
    
    if (validFiles.length + existingImages.length > 7) {
      toast.error("Máximo 7 imágenes permitidas");
      return;
    }
    
    setSelectedFiles(validFiles);
  };

  const uploadImages = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      // Get product name if not provided
      let name = productName;
      if (!name) {
        const { data: product } = await supabase
          .from('products')
          .select('name')
          .eq('id', productId)
          .single();
        name = product?.name || 'Producto';
      }
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${productId}/${Date.now()}-${i}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        // Save to database
        const { data: imageData, error: dbError } = await supabase
          .from("product_images")
          .insert({
            product_id: productId,
            image_url: urlData.publicUrl,
            display_order: existingImages.length + i,
          })
          .select('id')
          .single();

        if (dbError) throw dbError;
        
        // Generate and store SEO translations for the new image
        if (imageData?.id) {
          const imageIndex = existingImages.length + i;
          await storeImageSeoTranslations(imageData.id, name, imageIndex);
        }
      }

      toast.success("Imágenes subidas correctamente con SEO multilingüe");
      setSelectedFiles([]);
      onImagesChange();
    } catch (error: any) {
      toast.error("Error al subir imágenes");
      logger.error('Image upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const setAsCover = async (imageId: string) => {
    try {
      // First, reset all images' display_order
      const updatedImages = existingImages.map((img, idx) => ({
        id: img.id,
        display_order: img.id === imageId ? 0 : idx + 1
      }));

      // Update all images in batch
      for (const img of updatedImages) {
        const { error } = await supabase
          .from("product_images")
          .update({ display_order: img.display_order })
          .eq("id", img.id);

        if (error) throw error;
      }

      toast.success("Imagen establecida como portada");
      onImagesChange();
    } catch (error: any) {
      toast.error("Error al establecer portada");
      logger.error('Set cover error:', error);
    }
  };

  const deleteImage = async (imageId: string, imageUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/product-images/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("product-images").remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from("product_images")
        .delete()
        .eq("id", imageId);

      if (error) throw error;
      
      // Also delete associated translations
      await supabase
        .from("translations")
        .delete()
        .eq("entity_type", "product_images")
        .eq("entity_id", imageId);

      toast.success("Imagen eliminada");
      onImagesChange();
    } catch (error: any) {
      toast.error("Error al eliminar imagen");
      logger.error('Delete image error:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="flex items-center gap-2">
          Imágenes del Producto (Máximo 7)
          <Languages className="h-4 w-4 text-muted-foreground" />
        </Label>
        <p className="text-sm text-muted-foreground mb-2">
          {existingImages.length} de 7 imágenes cargadas • SEO automático en ES/EN/NL
        </p>
      </div>

      {/* Existing Images */}
      {existingImages.length > 0 && (
        <div className="grid grid-cols-7 gap-2">
          {existingImages.map((image, index) => (
            <div key={image.id} className="relative group aspect-square">
              <img
                src={image.image_url}
                alt={`Producto ${index + 1}`}
                className={`w-full h-full object-cover rounded-lg border-2 transition-all ${
                  image.display_order === 0 
                    ? 'border-primary ring-2 ring-primary/50' 
                    : 'border-border'
                }`}
              />
              {image.display_order === 0 && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                  Portada
                </div>
              )}
              <button
                type="button"
                onClick={() => setAsCover(image.id)}
                className="absolute bottom-1 left-1 bg-background/90 hover:bg-primary hover:text-primary-foreground text-foreground rounded p-1 opacity-0 group-hover:opacity-100 transition-all text-xs"
                title="Establecer como portada"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => deleteImage(image.id, image.image_url)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload New Images */}
      {existingImages.length < 7 && (
        <div className="space-y-2">
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
          />

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {selectedFiles.length} archivo(s) seleccionado(s)
              </p>
              <div className="grid grid-cols-7 gap-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="aspect-square relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border"
                    />
                  </div>
                ))}
              </div>
              <Button
                type="button"
                onClick={uploadImages}
                disabled={uploading}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Subiendo con SEO..." : "Subir Imágenes"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
