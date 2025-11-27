import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Image, Video } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  media_url: string;
  media_type: 'image' | 'video';
  is_published: boolean;
  display_order: number;
  created_at: string;
}

export default function GalleryAdmin() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_published: false,
    display_order: 0,
  });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery_items')
        .select('*')
        .is('deleted_at', null)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data || []) as GalleryItem[]);
    } catch (error) {
      console.error('Error loading gallery items:', error);
      toast.error('Error al cargar elementos de galería');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const uploadMedia = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('gallery-media')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('gallery-media')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let mediaUrl = editingItem?.media_url || '';
      let mediaType: 'image' | 'video' = editingItem?.media_type || 'image';

      if (mediaFile) {
        mediaUrl = await uploadMedia(mediaFile);
        mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
      }

      if (!mediaUrl && !editingItem) {
        toast.error('Debes seleccionar un archivo');
        return;
      }

      const itemData = {
        ...formData,
        media_url: mediaUrl,
        media_type: mediaType,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('gallery_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Elemento actualizado correctamente');
      } else {
        const { error } = await supabase
          .from('gallery_items')
          .insert([itemData]);

        if (error) throw error;
        toast.success('Elemento creado correctamente');
      }

      resetForm();
      setIsDialogOpen(false);
      await loadItems();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Error al guardar elemento');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (item: GalleryItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      is_published: item.is_published,
      display_order: item.display_order,
    });
    setMediaPreview(item.media_url);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteItemId) return;

    try {
      const { error } = await supabase
        .from('gallery_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deleteItemId);

      if (error) throw error;
      toast.success('Elemento eliminado correctamente');
      await loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Error al eliminar elemento');
    } finally {
      setDeleteItemId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      is_published: false,
      display_order: 0,
    });
    setMediaFile(null);
    setMediaPreview('');
    setEditingItem(null);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Galería</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Elemento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Elemento' : 'Nuevo Elemento'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="media">Archivo (Imagen o Video)</Label>
                <Input
                  id="media"
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  required={!editingItem}
                />
                {mediaPreview && (
                  <div className="mt-4">
                    {mediaFile?.type.startsWith('video/') || editingItem?.media_type === 'video' ? (
                      <video src={mediaPreview} controls className="w-full max-h-64 rounded" />
                    ) : (
                      <img src={mediaPreview} alt="Preview" className="w-full max-h-64 object-contain rounded" />
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Ej: Patito de goma impreso en PLA"
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción opcional del trabajo..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="display_order">Orden de visualización</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Menor número aparece primero
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
                <Label htmlFor="is_published">Publicado</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No hay elementos en la galería</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="p-0">
                <div className="relative aspect-square bg-muted">
                  {item.media_type === 'image' ? (
                    <>
                      <img
                        src={item.media_url}
                        alt={item.title}
                        className="w-full h-full object-cover rounded-t-lg"
                      />
                      <Image className="absolute top-2 right-2 w-6 h-6 text-white bg-black/50 p-1 rounded" />
                    </>
                  ) : (
                    <>
                      <video
                        src={item.media_url}
                        className="w-full h-full object-cover rounded-t-lg"
                      />
                      <Video className="absolute top-2 right-2 w-6 h-6 text-white bg-black/50 p-1 rounded" />
                    </>
                  )}
                  {!item.is_published && (
                    <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground px-2 py-1 rounded text-xs font-semibold">
                      No publicado
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-lg mb-2">{item.title}</CardTitle>
                {item.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {item.description}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(item)}
                    className="flex-1"
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteItemId(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar elemento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El elemento será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
