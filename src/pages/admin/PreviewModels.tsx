import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { i18nToast } from "@/lib/i18nToast";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

interface PreviewModel {
  id: string;
  name: string;
  description: string | null;
  model_type: string;
  vertices_data: any;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const modelTypes = [
  { value: 'animal', label: 'Animal' },
  { value: 'character', label: 'Personaje' },
  { value: 'object', label: 'Objeto' },
  { value: 'geometric', label: 'Geométrico' },
  { value: 'simple', label: 'Simple' }
];

const availableModels = [
  { value: 'duck', label: 'Patito de Goma', type: 'animal' },
  { value: 'cat', label: 'Gatito', type: 'animal' },
  { value: 'rabbit', label: 'Conejito', type: 'animal' },
  { value: 'bear', label: 'Osito', type: 'animal' },
  { value: 'robot', label: 'Robot', type: 'character' },
  { value: 'astronaut', label: 'Astronauta', type: 'character' },
  { value: 'ninja', label: 'Ninja', type: 'character' },
  { value: 'mug', label: 'Taza', type: 'object' },
  { value: 'pot', label: 'Maceta', type: 'object' },
  { value: 'vase', label: 'Jarrón', type: 'object' },
  { value: 'rounded_cube', label: 'Cubo Redondeado', type: 'geometric' },
  { value: 'low_poly_sphere', label: 'Esfera Facetada', type: 'geometric' },
  { value: 'star', label: 'Estrella 3D', type: 'geometric' },
  { value: 'heart', label: 'Corazón', type: 'geometric' },
  { value: 'rocket', label: 'Cohete', type: 'object' }
];

export default function PreviewModels() {
  const [models, setModels] = useState<PreviewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<PreviewModel | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    model_type: 'simple',
    model_value: 'duck',
    is_active: true,
    display_order: 0
  });

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const { data, error } = await supabase
        .from('preview_3d_models')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setModels(data || []);
    } catch (error: any) {
      i18nToast.error("error.modelsLoadFailed");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const modelData = {
        name: formData.name,
        description: formData.description || null,
        model_type: formData.model_type,
        vertices_data: { type: formData.model_value },
        is_active: formData.is_active,
        display_order: formData.display_order
      };

      if (editingModel) {
        const { error } = await supabase
          .from('preview_3d_models')
          .update(modelData)
          .eq('id', editingModel.id);

        if (error) throw error;
        i18nToast.success("success.modelUpdated");
      } else {
        const { error } = await supabase
          .from('preview_3d_models')
          .insert(modelData);

        if (error) throw error;
        i18nToast.success("success.modelCreated");
      }

      setDialogOpen(false);
      resetForm();
      await loadModels();
    } catch (error: any) {
      i18nToast.error("error.modelSaveFailed");
      console.error(error);
    }
  };

  const handleEdit = (model: PreviewModel) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      description: model.description || '',
      model_type: model.model_type,
      model_value: model.vertices_data.type,
      is_active: model.is_active,
      display_order: model.display_order
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este modelo?')) return;

    try {
      const { error } = await supabase
        .from('preview_3d_models')
        .delete()
        .eq('id', id);

      if (error) throw error;
      i18nToast.success("success.modelDeleted");
      await loadModels();
    } catch (error: any) {
      i18nToast.error("error.modelDeleteFailed");
      console.error(error);
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('preview_3d_models')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;
      toast.success(currentState ? "Modelo desactivado" : "Modelo activado");
      loadModels();
    } catch (error: any) {
      i18nToast.error("error.calibrationProfileToggleFailed");
      console.error(error);
    }
  };

  const resetForm = () => {
    setEditingModel(null);
    setFormData({
      name: '',
      description: '',
      model_type: 'simple',
      model_value: 'duck',
      is_active: true,
      display_order: 0
    });
  };

  const getModelTypeLabel = (type: string) => {
    return modelTypes.find(t => t.value === type)?.label || type;
  };

  const getModelLabel = (value: string) => {
    return availableModels.find(m => m.value === value)?.label || value;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Modelos de Vista Previa 3D</h1>
            <p className="text-muted-foreground">
              Gestiona los modelos que se muestran aleatoriamente en las cotizaciones
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Modelo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingModel ? 'Editar Modelo' : 'Nuevo Modelo'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Patito de Goma"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción opcional del modelo"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Modelo *</Label>
                  <Select
                    value={formData.model_type}
                    onValueChange={(value) => setFormData({ ...formData, model_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {modelTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Modelo 3D *</Label>
                  <Select
                    value={formData.model_value}
                    onValueChange={(value) => setFormData({ ...formData, model_value: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels
                        .filter(m => m.type === formData.model_type)
                        .map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Orden de Visualización</Label>
                  <Input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Activo</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Modelos Registrados</CardTitle>
            <CardDescription>
              {models.length} modelo(s) • Los modelos activos se muestran aleatoriamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Cargando...</p>
            ) : models.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay modelos registrados
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell>{model.display_order}</TableCell>
                      <TableCell className="font-medium">{model.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getModelTypeLabel(model.model_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getModelLabel(model.vertices_data.type)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(model.id, model.is_active)}
                        >
                          {model.is_active ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(model)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(model.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
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
      </div>
    </AdminLayout>
  );
}
