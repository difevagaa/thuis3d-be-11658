import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { Upload, Link as LinkIcon, Image as ImageIcon, Trash2, Search, Grid3X3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaLibraryProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  allowMultiple?: boolean;
}

interface MediaFile {
  id: string;
  url: string;
  name: string;
  size: number;
  created_at: string;
}

export function MediaLibrary({ open, onClose, onSelect, allowMultiple = false }: MediaLibraryProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'gallery'>('gallery');
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && activeTab === 'gallery') {
      loadMediaFiles();
    }
  }, [open, activeTab]);

  const loadMediaFiles = async () => {
    try {
      setLoading(true);
      
      // Load from product images
      const { data: productImages, error: productError } = await supabase
        .from('product_images')
        .select('id, image_url, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (productError) throw productError;

      // Load from homepage banners
      const { data: bannerImages, error: bannerError } = await supabase
        .from('homepage_banners')
        .select('id, image_url, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (bannerError) throw bannerError;

      // Combine and deduplicate
      const allImages: MediaFile[] = [];
      const seenUrls = new Set<string>();

      [...(productImages || []), ...(bannerImages || [])].forEach((item) => {
        if (item.image_url && !seenUrls.has(item.image_url)) {
          seenUrls.add(item.image_url);
          allImages.push({
            id: item.id,
            url: item.image_url,
            name: item.image_url.split('/').pop() || 'image',
            size: 0,
            created_at: item.created_at
          });
        }
      });

      setMediaFiles(allImages);
    } catch (error) {
      logger.error('Error loading media files:', error);
      toast.error('Error al cargar archivos multimedia');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `page-builder/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length > 0) {
        toast.success(`${uploadedUrls.length} archivo(s) subido(s)`);
        if (allowMultiple) {
          uploadedUrls.forEach(url => onSelect(url));
        } else {
          onSelect(uploadedUrls[0]);
        }
        onClose();
      }
    } catch (error) {
      logger.error('Error uploading files:', error);
      toast.error('Error al subir archivos');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      toast.error('Por favor ingresa una URL');
      return;
    }

    // Validate URL
    try {
      new URL(urlInput);
      onSelect(urlInput.trim());
      onClose();
    } catch {
      toast.error('URL inválida');
    }
  };

  const handleSelectImage = (url: string) => {
    if (allowMultiple) {
      const newSelected = new Set(selectedFiles);
      if (newSelected.has(url)) {
        newSelected.delete(url);
      } else {
        newSelected.add(url);
      }
      setSelectedFiles(newSelected);
    } else {
      onSelect(url);
      onClose();
    }
  };

  const handleSelectMultiple = () => {
    selectedFiles.forEach(url => onSelect(url));
    onClose();
  };

  const filteredMedia = mediaFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Biblioteca Multimedia
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gallery">Galería</TabsTrigger>
            <TabsTrigger value="upload">Subir</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar imágenes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm" onClick={loadMediaFiles}>
                <Grid3X3 className="h-4 w-4 mr-2" />
                Recargar
              </Button>
            </div>

            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredMedia.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
                  <p>No se encontraron imágenes</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4 p-4">
                  {filteredMedia.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => handleSelectImage(file.url)}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:shadow-lg group",
                        selectedFiles.has(file.url)
                          ? "border-primary ring-2 ring-primary"
                          : "border-transparent hover:border-primary/50"
                      )}
                    >
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs px-2 py-1 bg-black/75 rounded">
                          {selectedFiles.has(file.url) ? 'Seleccionada' : 'Seleccionar'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {uploading ? 'Subiendo...' : 'Haz clic para seleccionar archivos'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Soporta JPG, PNG, GIF, WebP (máx. 10MB por archivo)
                  </p>
                </div>
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept="image/*"
                multiple={allowMultiple}
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>URL de la imagen</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="https://ejemplo.com/imagen.jpg"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleUrlSubmit}>Usar URL</Button>
                </div>
              </div>

              {urlInput && (
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Vista previa:</p>
                  <img
                    src={urlInput}
                    alt="Preview"
                    className="max-w-full max-h-40 rounded-lg mx-auto"
                    onError={() => toast.error('No se pudo cargar la imagen')}
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {allowMultiple && selectedFiles.size > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedFiles(new Set())}>
              Limpiar selección ({selectedFiles.size})
            </Button>
            <Button onClick={handleSelectMultiple}>
              Usar {selectedFiles.size} imagen(es)
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
