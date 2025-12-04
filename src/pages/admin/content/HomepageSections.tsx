import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, ChevronUp, ChevronDown, Image as ImageIcon, Sun, Moon } from "lucide-react";
import { handleSupabaseError } from "@/lib/errorHandler";
import { 
  extractDualModeColors, 
  createDualModeColorValue,
  DEFAULT_SECTION_BACKGROUNDS
} from "@/utils/sectionBackgroundColors";

interface Section {
  id: string;
  section_key: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  background_color: string | null;
  icon_name: string | null;
  display_order: number | null;
  is_active: boolean;
}

export default function HomepageSections() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [reordering, setReordering] = useState(false);
  // Form state - note: background_color_light and background_color_dark are UI-only fields
  // that get serialized into the single background_color database field as JSON on save
  const [formData, setFormData] = useState({
    section_key: '',
    title: '',
    subtitle: '',
    description: '',
    image_url: '',
    background_color: '', // Database field - stores JSON with both light/dark colors
    background_color_light: '', // UI-only: temporary state for light mode color picker
    background_color_dark: '', // UI-only: temporary state for dark mode color picker
    icon_name: '',
    display_order: 0,
    is_active: true
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadSections();

    const channel = supabase
      .channel('homepage-sections-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'homepage_sections'
      }, loadSections)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSections = async () => {
    try {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("*")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error("Error loading sections:", error);
      handleSupabaseError(error, {
        toastMessage: "Error al cargar las secciones",
        context: "loadSections"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.section_key.trim() || !formData.title.trim()) {
      i18nToast.error("error.sectionKeyAndTitleRequired");
      return;
    }

    // Serialize dual-mode background colors
    const backgroundColorValue = createDualModeColorValue(
      formData.background_color_light.trim(),
      formData.background_color_dark.trim()
    ) || null;

    try {
      if (editingSection) {
        const { error } = await supabase
          .from("homepage_sections")
          .update({
            title: formData.title.trim(),
            subtitle: formData.subtitle.trim() || null,
            description: formData.description.trim() || null,
            image_url: formData.image_url.trim() || null,
            background_color: backgroundColorValue,
            icon_name: formData.icon_name.trim() || null,
            display_order: formData.display_order,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq("id", editingSection.id);

        if (error) throw error;
        i18nToast.success("success.sectionUpdated");
      } else {
        const { error } = await supabase
          .from("homepage_sections")
          .insert([{
            section_key: formData.section_key.trim().toLowerCase().replace(/\s+/g, '_'),
            title: formData.title.trim(),
            subtitle: formData.subtitle.trim() || null,
            description: formData.description.trim() || null,
            image_url: formData.image_url.trim() || null,
            background_color: backgroundColorValue,
            icon_name: formData.icon_name.trim() || null,
            display_order: formData.display_order,
            is_active: formData.is_active
          }]);

        if (error) throw error;
        i18nToast.success("success.sectionCreated");
      }

      resetForm();
      setDialogOpen(false);
    } catch (error) {
      console.error("Error saving section:", error);
      handleSupabaseError(error, {
        toastMessage: "Error al guardar la sección",
        context: "handleSubmit"
      });
    }
  };

  const handleEdit = (section: Section) => {
    setEditingSection(section);
    // Extract dual-mode colors from stored value
    const dualModeColors = extractDualModeColors(section.background_color);
    setFormData({
      section_key: section.section_key,
      title: section.title,
      subtitle: section.subtitle || '',
      description: section.description || '',
      image_url: section.image_url || '',
      background_color: section.background_color || '',
      background_color_light: dualModeColors.light,
      background_color_dark: dualModeColors.dark,
      icon_name: section.icon_name || '',
      display_order: section.display_order ?? 0,
      is_active: section.is_active
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta sección?")) return;

    try {
      const { error } = await supabase
        .from("homepage_sections")
        .delete()
        .eq("id", id);

      if (error) throw error;
      i18nToast.success("success.sectionDeleted");
    } catch (error) {
      handleSupabaseError(error, {
        toastMessage: "Error al eliminar la sección",
        context: "handleDelete"
      });
    }
  };

  const moveSection = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    setReordering(true);
    
    // Get the two sections being swapped
    const sectionA = sections[index];
    const sectionB = sections[newIndex];
    
    // Swap display_order values
    const newOrderA = sectionB.display_order ?? newIndex;
    const newOrderB = sectionA.display_order ?? index;
    
    // Update local state optimistically
    const newSections = [...sections];
    newSections[index] = { ...sectionB, display_order: newOrderB };
    newSections[newIndex] = { ...sectionA, display_order: newOrderA };
    setSections(newSections);

    try {
      // Update only the two affected sections in the database
      const { error: errorA } = await supabase
        .from("homepage_sections")
        .update({ display_order: newOrderA, updated_at: new Date().toISOString() })
        .eq("id", sectionA.id);
      
      if (errorA) throw errorA;

      const { error: errorB } = await supabase
        .from("homepage_sections")
        .update({ display_order: newOrderB, updated_at: new Date().toISOString() })
        .eq("id", sectionB.id);
      
      if (errorB) throw errorB;

      i18nToast.success("success.orderSortUpdated");
    } catch (error) {
      handleSupabaseError(error, {
        toastMessage: "Error al actualizar el orden",
        context: "moveSection"
      });
      // Reload to get the correct order from the database
      loadSections();
    } finally {
      setReordering(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      i18nToast.error("error.invalidImageFormat");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      i18nToast.error("error.imageTooLarge");
      return;
    }

    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `sections/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
      i18nToast.success("success.imageSaved");
    } catch (error) {
      console.error("Error uploading image:", error);
      i18nToast.error("error.imageUploadFailed");
    } finally {
      setUploadingImage(false);
    }
  };

  const resetForm = () => {
    setEditingSection(null);
    setFormData({
      section_key: '',
      title: '',
      subtitle: '',
      description: '',
      image_url: '',
      background_color: '',
      background_color_light: '',
      background_color_dark: '',
      icon_name: '',
      display_order: sections.length,
      is_active: true
    });
  };

  const getSectionLabel = (key: string) => {
    switch (key) {
      case 'featured_products': return 'Productos Destacados';
      case 'why_us': return '¿Por Qué Elegirnos?';
      default: return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Títulos de Secciones</CardTitle>
            <CardDescription>
              Personaliza los títulos y subtítulos de las secciones de la página de inicio. 
              Usa las flechas para reordenar las secciones.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Sección
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingSection ? 'Editar Sección' : 'Nueva Sección'}
                </DialogTitle>
                <DialogDescription>
                  Configura los detalles de la sección de la página de inicio
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Clave de Sección *</Label>
                  <Input
                    value={formData.section_key}
                    onChange={(e) => setFormData({ ...formData, section_key: e.target.value })}
                    placeholder="Ej: productos_destacados"
                    maxLength={50}
                    disabled={!!editingSection}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Identificador único (sin espacios, solo letras, números y guiones bajos)
                  </p>
                </div>

                <div>
                  <Label>Título *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej: ⭐ Productos Destacados"
                    maxLength={100}
                  />
                </div>

                <div>
                  <Label>Subtítulo</Label>
                  <Input
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="Descripción breve de la sección (opcional)"
                    maxLength={200}
                  />
                </div>

                <div>
                  <Label>Descripción Extendida</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción más detallada (opcional)"
                    maxLength={500}
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Imagen de Sección</Label>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    {uploadingImage && (
                      <p className="text-sm text-muted-foreground">Subiendo imagen...</p>
                    )}
                    {formData.image_url && (
                      <div className="relative w-full h-32 rounded border overflow-hidden">
                        <img 
                          src={formData.image_url} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => setFormData({ ...formData, image_url: '' })}
                        >
                          Eliminar
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Imagen opcional para decorar la sección (máx. 5MB)
                  </p>
                </div>

                {/* Dual-Mode Background Colors Section */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div>
                    <Label className="text-base font-semibold">🎨 Colores de Fondo por Modo</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configura colores diferentes para que la sección se vea bien tanto en modo claro como oscuro.
                      El color se aplicará automáticamente según el modo que tenga activo el usuario.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-amber-500" />
                        Color Modo Claro
                      </Label>
                      <div className="flex gap-2 items-center mt-1">
                        <Input
                          type="color"
                          value={formData.background_color_light || DEFAULT_SECTION_BACKGROUNDS.light}
                          onChange={(e) => setFormData({ ...formData, background_color_light: e.target.value })}
                          className="w-16 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={formData.background_color_light || ''}
                          onChange={(e) => setFormData({ ...formData, background_color_light: e.target.value })}
                          placeholder="#FFFFFF"
                          className="flex-1"
                        />
                        {formData.background_color_light && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData({ ...formData, background_color_light: '' })}
                          >
                            Limpiar
                          </Button>
                        )}
                      </div>
                      <div 
                        className="mt-2 h-8 rounded border flex items-center justify-center text-xs"
                        style={{ 
                          backgroundColor: formData.background_color_light || DEFAULT_SECTION_BACKGROUNDS.light,
                          color: formData.background_color_light && formData.background_color_light.toLowerCase() !== '#ffffff' ? '#ffffff' : '#000000'
                        }}
                      >
                        Vista previa modo claro
                      </div>
                    </div>

                    <div>
                      <Label className="flex items-center gap-2">
                        <Moon className="h-4 w-4 text-blue-500" />
                        Color Modo Oscuro
                      </Label>
                      <div className="flex gap-2 items-center mt-1">
                        <Input
                          type="color"
                          value={formData.background_color_dark || DEFAULT_SECTION_BACKGROUNDS.dark}
                          onChange={(e) => setFormData({ ...formData, background_color_dark: e.target.value })}
                          className="w-16 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={formData.background_color_dark || ''}
                          onChange={(e) => setFormData({ ...formData, background_color_dark: e.target.value })}
                          placeholder="#1E293B"
                          className="flex-1"
                        />
                        {formData.background_color_dark && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData({ ...formData, background_color_dark: '' })}
                          >
                            Limpiar
                          </Button>
                        )}
                      </div>
                      <div 
                        className="mt-2 h-8 rounded border flex items-center justify-center text-xs"
                        style={{ 
                          backgroundColor: formData.background_color_dark || DEFAULT_SECTION_BACKGROUNDS.dark,
                          color: '#ffffff'
                        }}
                      >
                        Vista previa modo oscuro
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre del Ícono</Label>
                    <Input
                      value={formData.icon_name}
                      onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                      placeholder="Ej: Star, Package, Zap"
                      maxLength={100}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Nombre del ícono de Lucide (opcional)
                    </p>
                  </div>

                  <div>
                    <Label>Orden de Visualización</Label>
                    <Input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-8">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label>Sección Activa</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingSection ? 'Actualizar' : 'Crear'} Sección
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {sections.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay secciones configuradas. Crea una para comenzar.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Orden</TableHead>
                <TableHead>Clave</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Subtítulo</TableHead>
                <TableHead className="w-20">Imagen</TableHead>
                <TableHead className="w-20">Estado</TableHead>
                <TableHead className="w-32">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((section, index) => (
                <TableRow key={section.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveSection(index, 'up')}
                        disabled={index === 0 || reordering}
                        className="h-8 w-8"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveSection(index, 'down')}
                        disabled={index === sections.length - 1 || reordering}
                        className="h-8 w-8"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground ml-1">
                        {section.display_order ?? index}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{section.section_key}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {section.icon_name && (
                        <span className="text-xs text-muted-foreground">🎨</span>
                      )}
                      {section.title}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {section.subtitle || '-'}
                  </TableCell>
                  <TableCell>
                    {section.image_url ? (
                      <div className="w-10 h-10 rounded overflow-hidden border">
                        <img 
                          src={section.image_url} 
                          alt={section.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded ${section.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {section.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(section)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(section.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
