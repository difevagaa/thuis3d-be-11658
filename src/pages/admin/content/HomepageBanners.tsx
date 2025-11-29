import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { i18nToast, toast } from "@/lib/i18nToast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Edit, Plus, Upload, X, Image as ImageIcon } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { handleSupabaseError } from "@/lib/errorHandler";

// Error message constants
const SCHEMA_CACHE_ERROR_PATTERN = 'Could not find the table';
const ERROR_TOAST_DURATION = 6000; // 6 seconds for better UX

interface BannerImage {
  id?: string;
  image_url: string;
  display_order: number;
  alt_text?: string;
  is_active: boolean;
}
 
export default function HomepageBanners() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    video_url: "",
    link_url: "",
    display_order: 0,
    is_active: true,
    size_mode: "cover",
    display_style: "fullscreen",
    position_order: 0,
    height: "400px",
    width: "100%",
    page_section: "hero",
    title_color: "",
    text_color: "",
  });
  const [uploading, setUploading] = useState(false);
  const [bannerImages, setBannerImages] = useState<BannerImage[]>([]);
  const [useMultipleImages, setUseMultipleImages] = useState(false);

  useEffect(() => {
    loadBanners();

    // Subscribe to banner changes
    const bannersChannel = supabase
      .channel('admin-banners-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'homepage_banners'
      }, () => {
        loadBanners();
        i18nToast.info("info.bannersUpdated");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bannersChannel);
    };
  }, []);

  const loadBanners = async () => {
    try {
      // Cargar banners primero
      const { data: bannersData, error: bannersError } = await supabase
        .from("homepage_banners")
        .select("*")
        .order("display_order", { ascending: true });
      
      if (bannersError) throw bannersError;
      
      // Cargar todas las imágenes de banners
      const { data: imagesData, error: imagesError } = await supabase
        .from("banner_images")
        .select("id, banner_id, image_url, display_order, alt_text, is_active")
        .order("display_order", { ascending: true });
      
      if (imagesError) {
        console.error("Error cargando imágenes de banners:", imagesError);
        // No lanzar error, solo registrar - los banners pueden no tener imágenes
      }
      
      // Combinar banners con sus imágenes
      const bannersWithImages = (bannersData || []).map(banner => ({
        ...banner,
        banner_images: (imagesData || []).filter(img => img.banner_id === banner.id)
      }));
      
      setBanners(bannersWithImages);
    } catch (error) {
      console.error("Error cargando banners:", error);
      handleSupabaseError(error, { 
        toastMessage: "Error al cargar banners",
        context: "loadBanners" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      // Validación básica
      if (!formData.title || formData.title.trim() === '') {
        i18nToast.error("error.titleRequired");
        return;
      }

      // Si usa múltiples imágenes, validar que al menos haya una
      if (useMultipleImages) {
        if (bannerImages.length === 0) {
          i18nToast.error("error.mustAddCarouselImages");
          return;
        }
      } else {
        // Si usa imagen única, validar que exista
        if (!formData.image_url || formData.image_url.trim() === '') {
          i18nToast.error("error.bannerImageRequired");
          return;
        }
      }

      // Preparar datos del banner
      const bannerData = {
        ...formData,
        // Si usa múltiples imágenes, limpiar image_url para evitar confusión
        image_url: useMultipleImages ? '' : formData.image_url
      };

      console.log("💾 Guardando banner:", bannerData);

      let bannerId: string;

      if (editingBanner) {
        const { data, error } = await supabase
          .from("homepage_banners")
          .update(bannerData)
          .eq("id", editingBanner.id)
          .select()
          .single();
        
        if (error) {
          console.error("❌ Error actualizando banner:", error);
          console.error("Detalles del error:", JSON.stringify(error, null, 2));
          const errorMsg = error.message ?? error.code ?? 'Error desconocido';
          throw new Error(`Error al actualizar el banner: ${errorMsg}. Por favor, verifica tu conexión e intenta nuevamente.`);
        }
        bannerId = editingBanner.id;
        console.log("✅ Banner actualizado:", data);
        
        // Actualizar imágenes del banner
        if (useMultipleImages && bannerImages.length > 0) {
          console.log("🖼️ Procesando múltiples imágenes para banner existente...");
          
          // Primero, eliminar todas las imágenes existentes
          console.log(`🗑️ Eliminando imágenes antiguas del banner ${bannerId}...`);
          const { error: deleteError } = await supabase
            .from("banner_images")
            .delete()
            .eq("banner_id", bannerId);
          
          if (deleteError) {
            console.error("❌ Error eliminando imágenes antiguas:", deleteError);
            console.error("Detalles del error:", JSON.stringify(deleteError, null, 2));
            
            // Verificar si es un error de tabla no encontrada en schema cache
            // Este error específico indica que las migraciones no se han aplicado
            if (deleteError.message?.includes(SCHEMA_CACHE_ERROR_PATTERN)) {
              throw new Error(`La tabla de imágenes no está disponible en el sistema. Por favor contacta al administrador para aplicar las migraciones necesarias. Ver: README_SOLUCION_BANNER_IMAGES.md. Detalles técnicos: ${deleteError.message}`);
            }
            
            throw new Error(`No se pudieron eliminar las imágenes antiguas: ${deleteError.message ?? deleteError.code ?? 'Error desconocido'}. Las imágenes cargadas se han preservado. Por favor, intenta nuevamente o contacta al soporte.`);
          }
          console.log("✅ Imágenes antiguas eliminadas");
          
          // Insertar las nuevas imágenes
          const imagesToInsert = bannerImages.map(img => ({
            banner_id: bannerId,
            image_url: img.image_url,
            display_order: img.display_order,
            alt_text: img.alt_text || formData.title,
            is_active: img.is_active
          }));
          
          console.log(`📥 Insertando ${imagesToInsert.length} imágenes nuevas...`);
          console.log("Datos a insertar:", imagesToInsert);
          
          const { data: insertedImages, error: imagesError } = await supabase
            .from("banner_images")
            .insert(imagesToInsert)
            .select();
          
          if (imagesError) {
            console.error("❌ Error guardando imágenes:", imagesError);
            console.error("Detalles del error:", JSON.stringify(imagesError, null, 2));
            
            // Verificar si es un error de tabla no encontrada en schema cache
            // Este error específico indica que las migraciones no se han aplicado
            if (imagesError.message?.includes(SCHEMA_CACHE_ERROR_PATTERN)) {
              throw new Error(`La tabla de imágenes no está disponible en el sistema. Por favor contacta al administrador para aplicar las migraciones necesarias. Ver: README_SOLUCION_BANNER_IMAGES.md. Detalles técnicos: ${imagesError.message}`);
            }
            
            throw new Error(`No se pudieron guardar las imágenes del carrusel: ${imagesError.message ?? imagesError.code ?? 'Error desconocido'}. Las imágenes cargadas se han preservado. Por favor, intenta nuevamente o contacta al soporte.`);
          }
          console.log("✅ Imágenes guardadas:", insertedImages?.length || imagesToInsert.length);
        } else if (useMultipleImages) {
          // Modo múltiples imágenes pero sin imágenes - eliminar todas las existentes
          // Esta situación puede ocurrir si el usuario cambió a modo carrusel pero luego eliminó todas las imágenes
          // No es un error crítico, solo limpiamos las imágenes existentes
          console.log("🗑️ Eliminando todas las imágenes (modo carrusel sin imágenes)...");
          const { error: deleteAllError } = await supabase
            .from("banner_images")
            .delete()
            .eq("banner_id", bannerId);
          
          if (deleteAllError) {
            console.warn("⚠️ Error eliminando imágenes (puede ser que no existan):", deleteAllError);
            // No lanzamos error aquí porque es opcional - puede que el banner nunca haya tenido imágenes
          }
        }
        
        i18nToast.success("success.bannerUpdated");
      } else {
        const { data, error } = await supabase
          .from("homepage_banners")
          .insert([bannerData])
          .select()
          .single();
        
        if (error) {
          console.error("❌ Error creando banner:", error);
          console.error("Detalles del error:", JSON.stringify(error, null, 2));
          const errorMsg = error.message ?? error.code ?? 'Error desconocido';
          throw new Error(`Error al crear el banner: ${errorMsg}. Por favor, verifica tu conexión e intenta nuevamente.`);
        }
        bannerId = data.id;
        console.log("✅ Banner creado:", data);
        
        // Si usa múltiples imágenes, guardarlas
        if (useMultipleImages && bannerImages.length > 0) {
          console.log("🖼️ Guardando múltiples imágenes para banner nuevo...");
          
          const imagesToInsert = bannerImages.map(img => ({
            banner_id: bannerId,
            image_url: img.image_url,
            display_order: img.display_order,
            alt_text: img.alt_text || formData.title,
            is_active: img.is_active
          }));
          
          console.log(`📥 Insertando ${imagesToInsert.length} imágenes...`);
          console.log("Datos a insertar:", imagesToInsert);
          
          const { data: insertedImages, error: imagesError } = await supabase
            .from("banner_images")
            .insert(imagesToInsert)
            .select();
          
          if (imagesError) {
            console.error("❌ Error guardando imágenes:", imagesError);
            console.error("Detalles del error:", JSON.stringify(imagesError, null, 2));
            
            // Verificar si es un error de tabla no encontrada en schema cache
            // Este error específico indica que las migraciones no se han aplicado
            if (imagesError.message?.includes(SCHEMA_CACHE_ERROR_PATTERN)) {
              throw new Error(`La tabla de imágenes no está disponible en el sistema. Por favor contacta al administrador para aplicar las migraciones necesarias. Ver: README_SOLUCION_BANNER_IMAGES.md. Detalles técnicos: ${imagesError.message}`);
            }
            
            throw new Error(`No se pudieron guardar las imágenes del carrusel: ${imagesError.message ?? imagesError.code ?? 'Error desconocido'}. Las imágenes cargadas se han preservado. Por favor, intenta nuevamente o contacta al soporte.`);
          }
          console.log("✅ Imágenes guardadas:", insertedImages?.length || imagesToInsert.length);
        }
        
        i18nToast.success("success.bannerCreated");
      }
      
      // Solo cerrar el modal y limpiar si todo salió bien
      setIsDialogOpen(false);
      resetForm();
      loadBanners();
    } catch (error: any) {
      console.error("❌ Error completo al guardar:", error);
      // MEJORA UX: Mantener el modal abierto y preservar datos para permitir reintentos
      // - El modal NO se cierra (no se llama a setIsDialogOpen(false))
      // - Los datos del formulario se mantienen (no se llama a resetForm())
      // - Las imágenes cargadas permanecen en memoria (estado bannerImages)
      // - El usuario puede corregir errores o reintentar sin perder su trabajo
      toast.error(error.message || 'Error desconocido al guardar el banner', {
        duration: ERROR_TOAST_DURATION, // 6 segundos para dar tiempo a leer el mensaje
      });
      // Nota: Intencionalmente NO ejecutamos setIsDialogOpen(false) ni resetForm() aquí
    }
  };

  const handleEdit = async (banner: any) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description || "",
      image_url: banner.image_url,
      video_url: banner.video_url || "",
      link_url: banner.link_url || "",
      display_order: banner.display_order,
      is_active: banner.is_active,
      size_mode: banner.size_mode || "cover",
      display_style: banner.display_style || "fullscreen",
      position_order: banner.position_order || 0,
      height: banner.height || "400px",
      width: banner.width || "100%",
      page_section: banner.page_section || "hero",
      title_color: banner.title_color || "",
      text_color: banner.text_color || "",
    });
    
    // Cargar imágenes del banner si existen
    if (banner.banner_images && banner.banner_images.length > 0) {
      setUseMultipleImages(true);
      setBannerImages(banner.banner_images.map((img: any) => ({
        id: img.id,
        image_url: img.image_url,
        display_order: img.display_order,
        alt_text: img.alt_text,
        is_active: img.is_active
      })));
    } else {
      setUseMultipleImages(false);
      setBannerImages([]);
    }
    
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este banner?")) return;
    
    try {
      const { error } = await supabase
        .from("homepage_banners")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      i18nToast.success("success.bannerDeleted");
      loadBanners();
    } catch (error) {
      i18nToast.error("error.bannerDeleteFailed");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      i18nToast.error("error.invalidImageFormat");
      return;
    }

    setUploading(true);
    try {
      // Verificar autenticación
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("❌ Error de autenticación:", userError);
        i18nToast.error("error.mustBeAuthenticatedToUploadImages");
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `banner_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      console.log("📤 Subiendo imagen:", { fileName, size: file.size, type: file.type });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("❌ Error de subida:", uploadError);
        throw uploadError;
      }

      console.log("✅ Imagen subida:", uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      console.log("🔗 URL pública:", publicUrl);

      setFormData({ ...formData, image_url: publicUrl });
      i18nToast.success("success.imageSaved");
    } catch (error: any) {
      console.error("❌ Error completo:", error);
      toast.error(`Error al cargar la imagen: ${error.message || 'Error desconocido'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      i18nToast.error("error.invalidVideoFormat");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      i18nToast.error("error.videoTooLarge");
      return;
    }

    setUploading(true);
    try {
      // Verificar autenticación
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("❌ Error de autenticación:", userError);
        i18nToast.error("error.mustBeAuthenticatedToUploadVideos");
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `banner_video_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      console.log("📤 Subiendo video:", { fileName, size: file.size, type: file.type });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("product-videos")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("❌ Error de subida:", uploadError);
        throw uploadError;
      }

      console.log("✅ Video subido:", uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from("product-videos")
        .getPublicUrl(filePath);

      console.log("🔗 URL pública:", publicUrl);

      setFormData({ ...formData, video_url: publicUrl });
      i18nToast.success("success.videoSaved");
    } catch (error: any) {
      console.error("❌ Error completo:", error);
      toast.error(`Error al cargar el video: ${error.message || 'Error desconocido'}`);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      image_url: "",
      video_url: "",
      link_url: "",
      display_order: 0,
      is_active: true,
      size_mode: "cover",
      display_style: "fullscreen",
      position_order: 0,
      height: "400px",
      width: "100%",
      page_section: "hero",
      title_color: "",
      text_color: "",
    });
    setEditingBanner(null);
    setBannerImages([]);
    setUseMultipleImages(false);
  };

  const handleMultipleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("❌ Error de autenticación:", userError);
        i18nToast.error("error.mustBeAuthenticatedToUploadImages");
        return;
      }

      const uploadedImages: BannerImage[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!file.type.startsWith("image/")) {
          toast.error(`El archivo ${file.name} no es una imagen válida`);
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `banner_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `banners/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error("❌ Error de subida:", uploadError);
          toast.error(`Error al cargar ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        uploadedImages.push({
          image_url: publicUrl,
          display_order: bannerImages.length + i,
          alt_text: "",
          is_active: true
        });
      }

      setBannerImages([...bannerImages, ...uploadedImages]);
      toast.success(`${uploadedImages.length} imagen(es) cargada(s) exitosamente`);
    } catch (error: any) {
      console.error("❌ Error completo:", error);
      toast.error(`Error al cargar imágenes: ${error.message || 'Error desconocido'}`);
    } finally {
      setUploading(false);
    }
  };

  const removeBannerImage = (index: number) => {
    const newImages = bannerImages.filter((_, i) => i !== index);
    // Reordenar los display_order
    const reorderedImages = newImages.map((img, i) => ({
      ...img,
      display_order: i
    }));
    setBannerImages(reorderedImages);
  };

  const moveBannerImage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= bannerImages.length) return;

    const newImages = [...bannerImages];
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    
    // Actualizar display_order
    const reorderedImages = newImages.map((img, i) => ({
      ...img,
      display_order: i
    }));
    setBannerImages(reorderedImages);
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Banners de Página de Inicio</CardTitle>
            <CardDescription>Gestiona los banners principales de tu homepage</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Banner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>{editingBanner ? "Editar" : "Crear"} Banner</DialogTitle>
                <DialogDescription>
                  Configura el banner para la página de inicio
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 overflow-y-auto flex-1 px-1">
                <Tabs defaultValue="content" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="content">Contenido</TabsTrigger>
                    <TabsTrigger value="media">Medios</TabsTrigger>
                    <TabsTrigger value="style">Estilo</TabsTrigger>
                    <TabsTrigger value="config">Configuración</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="content" className="space-y-4 mt-4">
                    <div>
                      <Label>Título *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Título del banner"
                      />
                    </div>
                    <div>
                      <Label>Descripción</Label>
                      <RichTextEditor
                        value={formData.description}
                        onChange={(value) => setFormData({ ...formData, description: value })}
                      />
                    </div>
                    <div>
                      <Label>URL de Destino (opcional)</Label>
                      <Input
                        value={formData.link_url}
                        onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                        placeholder="/productos"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        URL a la que redirige al hacer clic en el banner
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="media" className="space-y-4 mt-4">
                    <div className="flex items-center justify-between pb-4 border-b">
                      <div>
                        <Label>Modo de Imágenes</Label>
                        <p className="text-xs text-muted-foreground">
                          Elige entre una sola imagen o múltiples imágenes en carrusel
                        </p>
                      </div>
                      <Switch
                        checked={useMultipleImages}
                        onCheckedChange={setUseMultipleImages}
                      />
                    </div>
                    
                    {!useMultipleImages ? (
                      <div>
                        <Label>Imagen del Banner *</Label>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={uploading}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              disabled={uploading}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {uploading ? "Cargando..." : "Cargar"}
                            </Button>
                          </div>
                          {formData.image_url && (
                            <div className="relative w-full h-32 rounded border overflow-hidden">
                              <img 
                                src={formData.image_url} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <Input
                            value={formData.image_url}
                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                            placeholder="O pega una URL de imagen"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Label>Imágenes del Carrusel *</Label>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleMultipleImageUpload}
                              disabled={uploading}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              disabled={uploading}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {uploading ? "Cargando..." : "Cargar"}
                            </Button>
                          </div>
                          
                          {bannerImages.length > 0 && (
                            <div className="space-y-2 mt-4">
                              <p className="text-sm font-medium">Imágenes cargadas ({bannerImages.length}):</p>
                              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                                {bannerImages.map((img, index) => (
                                  <div key={index} className="relative group border rounded overflow-hidden">
                                    <img 
                                      src={img.image_url} 
                                      alt={`Imagen ${index + 1}`}
                                      className="w-full h-24 object-cover"
                                    />
                                    <div className="absolute top-1 right-1 flex gap-1">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="destructive"
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => removeBannerImage(index)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                      #{index + 1}
                                    </div>
                                    <div className="absolute bottom-1 right-1 flex gap-1">
                                      {index > 0 && (
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="secondary"
                                          className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={() => moveBannerImage(index, 'up')}
                                        >
                                          ↑
                                        </Button>
                                      )}
                                      {index < bannerImages.length - 1 && (
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="secondary"
                                          className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={() => moveBannerImage(index, 'down')}
                                        >
                                          ↓
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {bannerImages.length === 0 && (
                            <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No hay imágenes cargadas</p>
                              <p className="text-xs">Selecciona múltiples archivos para crear un carrusel</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="border-t pt-4">
                      <Label>Video del Banner (Opcional - Máx 20MB)</Label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            accept="video/mp4,video/webm,video/ogg,video/quicktime"
                            onChange={handleVideoUpload}
                            disabled={uploading}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            disabled={uploading}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploading ? "Cargando..." : "Cargar"}
                          </Button>
                        </div>
                        {formData.video_url && (
                          <div className="relative w-full rounded border overflow-hidden">
                            <video 
                              src={formData.video_url} 
                              controls 
                              className="w-full max-h-32"
                            >
                              Tu navegador no soporta el video.
                            </video>
                          </div>
                        )}
                        <Input
                          value={formData.video_url}
                          onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                          placeholder="O pega una URL de video"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="style" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Modo de Tamaño de Imagen</Label>
                        <select
                          className="w-full px-3 py-2 border rounded-md bg-background"
                          value={formData.size_mode}
                          onChange={(e) => setFormData({ ...formData, size_mode: e.target.value })}
                        >
                          <option value="cover">Cover (Cubrir todo)</option>
                          <option value="contain">Contain (Contener)</option>
                          <option value="fill">Fill (Rellenar)</option>
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Cómo se ajusta la imagen al espacio
                        </p>
                      </div>
                      <div>
                        <Label>Estilo de Visualización</Label>
                        <select
                          className="w-full px-3 py-2 border rounded-md bg-background"
                          value={formData.display_style}
                          onChange={(e) => setFormData({ ...formData, display_style: e.target.value })}
                        >
                          <option value="fullscreen">Pantalla Completa</option>
                          <option value="partial">Parcial (Card)</option>
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Fullscreen ocupa todo el ancho
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Altura del Banner</Label>
                        <Input
                          value={formData.height}
                          onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                          placeholder="Ej: 400px, 50vh, 100%"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Usa px, vh o %
                        </p>
                      </div>
                      <div>
                        <Label>Ancho del Banner</Label>
                        <Input
                          value={formData.width}
                          onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                          placeholder="Ej: 100%, 80%, 1200px"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Usa px o % (100% para fullscreen)
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Color del título</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={formData.title_color || '#ffffff'}
                            onChange={(e) => setFormData({ ...formData, title_color: e.target.value })}
                            className="w-16 h-10 p-1"
                          />
                          <Input
                            value={formData.title_color}
                            onChange={(e) => setFormData({ ...formData, title_color: e.target.value })}
                            placeholder="#FFFFFF"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Color del texto</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={formData.text_color || '#ffffff'}
                            onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                            className="w-16 h-10 p-1"
                          />
                          <Input
                            value={formData.text_color}
                            onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                            placeholder="#FFFFFF"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="config" className="space-y-4 mt-4">
                    <div>
                      <Label>Sección de la Página</Label>
                      <select
                        className="w-full px-3 py-2 border rounded-md bg-background"
                        value={formData.page_section}
                        onChange={(e) => setFormData({ ...formData, page_section: e.target.value })}
                      >
                        <option value="hero">Hero (Carrusel Superior)</option>
                        <option value="after-products">Después de Productos Destacados</option>
                        <option value="after-quick-access">Después de Accesos Rápidos</option>
                        <option value="after-features">Después de "Por Qué Elegirnos"</option>
                        <option value="bottom">Al Final de la Página</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Selecciona dónde quieres que aparezca este banner en la página de inicio
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Orden en Sección</Label>
                        <Input
                          type="number"
                          value={formData.position_order}
                          onChange={(e) => setFormData({ ...formData, position_order: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                          placeholder="0 = primero"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Orden dentro de su sección
                        </p>
                      </div>
                      <div>
                        <Label>Orden de Visualización (Hero)</Label>
                        <Input
                          type="number"
                          value={formData.display_order}
                          onChange={(e) => setFormData({ ...formData, display_order: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                          placeholder="Solo para Hero"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Solo aplica para carrusel hero
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t pt-4">
                      <div>
                        <Label>Estado del Banner</Label>
                        <p className="text-xs text-muted-foreground">
                          Solo los banners activos se mostrarán en la página
                        </p>
                      </div>
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              <DialogFooter className="flex-shrink-0 mt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={uploading}>
                  {uploading ? "Cargando..." : "Guardar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Orden</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Imagen(es)</TableHead>
              <TableHead>Sección</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banners.map((banner) => (
              <TableRow key={banner.id}>
                <TableCell>{banner.display_order}</TableCell>
                <TableCell className="font-medium">{banner.title}</TableCell>
                <TableCell>
                  {banner.banner_images && banner.banner_images.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {banner.banner_images.slice(0, 3).map((img: any, idx: number) => (
                          <img 
                            key={idx}
                            src={img.image_url} 
                            alt={`${banner.title} ${idx + 1}`} 
                            className="h-12 w-12 object-cover rounded border-2 border-background" 
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        ({banner.banner_images.length} img)
                      </span>
                    </div>
                  ) : (
                    <img src={banner.image_url} alt={banner.title} className="h-12 w-20 object-cover rounded" />
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {banner.page_section === 'hero' && 'Hero Carrusel'}
                  {banner.page_section === 'after-products' && 'Después Productos'}
                  {banner.page_section === 'after-quick-access' && 'Después Accesos'}
                  {banner.page_section === 'after-features' && 'Después Features'}
                  {banner.page_section === 'bottom' && 'Final de Página'}
                </TableCell>
                <TableCell>{banner.is_active ? "Sí" : "No"}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(banner)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(banner.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {banners.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No hay banners configurados</p>
        )}
      </CardContent>
    </Card>
  );
}
