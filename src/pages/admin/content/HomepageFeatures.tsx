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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, GripVertical } from "lucide-react";
import { handleSupabaseError } from "@/lib/errorHandler";
import * as Icons from "lucide-react";

interface Feature {
  id: string;
  icon_name: string;
  title: string;
  description: string;
  display_order: number;
  is_active: boolean;
}

const ICON_OPTIONS = [
  'Sparkles', 'Zap', 'Shield', 'Award', 'CheckCircle', 'Heart',
  'Rocket', 'Target', 'Users', 'Trophy', 'Gem', 'Crown'
];

export default function HomepageFeatures() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [formData, setFormData] = useState({
    icon_name: 'Sparkles',
    title: '',
    description: '',
    display_order: 0,
    is_active: true
  });

  useEffect(() => {
    loadFeatures();

    const channel = supabase
      .channel('homepage-features-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'homepage_features'
      }, loadFeatures)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from("homepage_features")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setFeatures(data || []);
    } catch (error: any) {
      console.error("Error al cargar las características:", error);
      toast.error(error.message || "Error al cargar las características");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      i18nToast.error("error.titleAndDescriptionRequired");
      return;
    }

    try {
      if (editingFeature) {
        const { error } = await supabase
          .from("homepage_features")
          .update(formData)
          .eq("id", editingFeature.id);

        if (error) throw error;
        i18nToast.success("success.featureUpdated");
      } else {
        const { error } = await supabase
          .from("homepage_features")
          .insert([formData]);

        if (error) throw error;
        i18nToast.success("success.featureCreated");
      }

      resetForm();
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error al guardar la característica:", error);
      toast.error(error.message || "Error al guardar la característica");
    }
  };

  const handleEdit = (feature: Feature) => {
    setEditingFeature(feature);
    setFormData({
      icon_name: feature.icon_name,
      title: feature.title,
      description: feature.description,
      display_order: feature.display_order,
      is_active: feature.is_active
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta característica?")) return;

    try {
      const { error } = await supabase
        .from("homepage_features")
        .delete()
        .eq("id", id);

      if (error) throw error;
      i18nToast.success("success.featureDeleted");
    } catch (error: any) {
      console.error("Error al eliminar la característica:", error);
      toast.error(error.message || "Error al eliminar la característica");
    }
  };

  const resetForm = () => {
    setEditingFeature(null);
    setFormData({
      icon_name: 'Sparkles',
      title: '',
      description: '',
      display_order: features.length,
      is_active: true
    });
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as any;
    return IconComponent ? <IconComponent className="h-5 w-5" /> : null;
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
            <CardTitle>Características "¿Por Qué Elegirnos?"</CardTitle>
            <CardDescription>
              Gestiona las características que destacan los beneficios de tu negocio
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Característica
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingFeature ? 'Editar Característica' : 'Nueva Característica'}
                </DialogTitle>
                <DialogDescription>
                  Configura los detalles de la característica
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Icono</Label>
                  <Select
                    value={formData.icon_name}
                    onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          <div className="flex items-center gap-2">
                            {renderIcon(icon)}
                            <span>{icon}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Título *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej: Calidad Superior"
                    maxLength={100}
                  />
                </div>

                <div>
                  <Label>Descripción *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe esta característica"
                    rows={4}
                    maxLength={300}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    <Label>Característica Activa</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingFeature ? 'Actualizar' : 'Crear'} Característica
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {features.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay características configuradas. Crea una para comenzar.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Icono</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-20">Orden</TableHead>
                <TableHead className="w-20">Estado</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map((feature) => (
                <TableRow key={feature.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>{renderIcon(feature.icon_name)}</TableCell>
                  <TableCell className="font-medium">{feature.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                    {feature.description}
                  </TableCell>
                  <TableCell>{feature.display_order}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded ${feature.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {feature.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(feature)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(feature.id)}
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
