import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkDeleteActions } from "@/components/admin/BulkDeleteActions";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { FieldHelp } from "@/components/admin/FieldHelp";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Materials() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    description: "",
    cost: 0
  });

  const filteredMaterials = materials.filter(m => !m.deleted_at);
  
  const {
    selectedIds,
    toggleSelection,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isIndeterminate,
    selectedCount,
  } = useBulkSelection(filteredMaterials);

  useEffect(() => {
    loadData();

    // Realtime subscription
    const channel = supabase
      .channel('materials-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'materials'
      }, loadData)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'material_colors'
      }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      const [materialsRes, colorsRes] = await Promise.all([
        supabase.from("materials").select("*").order("name"),
        supabase.from("colors").select("*").is("deleted_at", null).order("name")
      ]);

      if (materialsRes.error) throw materialsRes.error;
      if (colorsRes.error) throw colorsRes.error;
      
      setMaterials(materialsRes.data || []);
      setColors(colorsRes.data || []);
    } catch (error) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const loadMaterialColors = async (materialId: string) => {
    try {
      const { data, error } = await supabase
        .from("material_colors")
        .select("color_id")
        .eq("material_id", materialId);
      
      if (error) throw error;
      setSelectedColors(data?.map(mc => mc.color_id) || []);
    } catch (error) {
      console.error("Error loading material colors:", error);
    }
  };

  const createMaterial = async () => {
    if (!newMaterial.name.trim()) {
      toast.error("El nombre del material es obligatorio");
      return;
    }

    try {
      const { error } = await supabase
        .from("materials")
        .insert([newMaterial]);

      if (error) {
        if (error.code === '23505') {
          toast.error("Ya existe un material con ese nombre");
          return;
        }
        throw error;
      }
      toast.success("Material creado exitosamente");
      setNewMaterial({ name: "", description: "", cost: 0 });
      await loadData();
    } catch (error: any) {
      console.error("Error creating material:", error);
      toast.error("Error al crear material: " + (error.message || "Error desconocido"));
    }
  };

  const updateMaterial = async () => {
    try {
      // Update material
      const { error: materialError } = await supabase
        .from("materials")
        .update({
          name: editingMaterial.name,
          description: editingMaterial.description,
          cost: editingMaterial.cost
        })
        .eq("id", editingMaterial.id);

      if (materialError) throw materialError;

      // Update material colors
      await supabase
        .from("material_colors")
        .delete()
        .eq("material_id", editingMaterial.id);

      if (selectedColors.length > 0) {
        const { error: colorsError } = await supabase
          .from("material_colors")
          .insert(
            selectedColors.map(colorId => ({
              material_id: editingMaterial.id,
              color_id: colorId
            }))
          );
        
        if (colorsError) throw colorsError;
      }

      toast.success("Material actualizado exitosamente");
      setEditingMaterial(null);
      setSelectedColors([]);
      await loadData();
    } catch (error) {
      toast.error("Error al actualizar material");
    }
  };

  const deleteMaterial = async (id: string) => {
    try {
      const { error } = await supabase
        .from("materials")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast.success("Material movido a la papelera");
      await loadData();
    } catch (error) {
      toast.error("Error al eliminar material");
    }
  };

  const handleBulkDelete = async () => {
    try {
      const idsToDelete = Array.from(selectedIds);
      
      const { error } = await supabase
        .from("materials")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", idsToDelete);

      if (error) throw error;
      toast.success(`${idsToDelete.length} materiales movidos a la papelera`);
      clearSelection();
      loadData();
    } catch (error: any) {
      toast.error("Error al eliminar materiales");
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Gestión de Materiales</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Nuevo Material</CardTitle>
          <CardDescription>Añade un nuevo material para impresión 3D</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="name">Nombre</Label>
              <FieldHelp content="Nombre único del material. Ej: PLA, ABS, PETG, Resina, etc." />
            </div>
            <Input
              id="name"
              value={newMaterial.name}
              onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="description">Descripción</Label>
              <FieldHelp content="Descripción opcional con las características y propiedades del material." />
            </div>
            <Textarea
              id="description"
              value={newMaterial.description}
              onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
              rows={3}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="cost">Costo (€)</Label>
              <FieldHelp content="Costo base del material por kilogramo. Usado para calcular el precio final de impresión." />
            </div>
            <Input
              id="cost"
              type="number"
              step="0.01"
              value={newMaterial.cost}
              onChange={(e) => setNewMaterial({ ...newMaterial, cost: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
              placeholder="Ej: 25.00"
            />
          </div>
          <Button onClick={createMaterial}>Crear Material</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Materiales Disponibles</CardTitle>
          <CardDescription>Administra los materiales disponibles para impresión 3D</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Seleccionar todos"
                    ref={(el) => {
                      if (el) {
                        (el as any).indeterminate = isIndeterminate;
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Costo (€)</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected(material.id)}
                      onCheckedChange={() => toggleSelection(material.id)}
                      aria-label={`Seleccionar ${material.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{material.name}</TableCell>
                  <TableCell>{material.description}</TableCell>
                  <TableCell>€{material.cost?.toFixed(2) || "0.00"}</TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider>
                      <div className="flex justify-end gap-2">
                        <Tooltip delayDuration={300}>
                          <TooltipTrigger asChild>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingMaterial(material);
                                    loadMaterialColors(material.id);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Editar Material</DialogTitle>
                            <DialogDescription>
                              Modifica los datos del material y asigna los colores disponibles
                            </DialogDescription>
                          </DialogHeader>
                          {editingMaterial && (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="edit-name">Nombre</Label>
                                <Input
                                  id="edit-name"
                                  value={editingMaterial.name}
                                  onChange={(e) =>
                                    setEditingMaterial({ ...editingMaterial, name: e.target.value })
                                  }
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-description">Descripción</Label>
                                <Textarea
                                  id="edit-description"
                                  value={editingMaterial.description || ""}
                                  onChange={(e) =>
                                    setEditingMaterial({ ...editingMaterial, description: e.target.value })
                                  }
                                  rows={3}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-cost">Costo (€)</Label>
                                <Input
                                  id="edit-cost"
                                  type="number"
                                  step="0.01"
                                  value={editingMaterial.cost || ''}
                                  onChange={(e) =>
                                    setEditingMaterial({
                                      ...editingMaterial,
                                      cost: e.target.value === '' ? 0 : parseFloat(e.target.value)
                                    })
                                  }
                                  placeholder="Ej: 25.00"
                                />
                              </div>
                              <div className="border-t pt-4">
                                <Label className="text-base font-semibold mb-3 block">
                                  Colores Disponibles para este Material
                                </Label>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Selecciona qué colores están disponibles para este material
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-2 border rounded">
                                  {colors.map((color) => (
                                    <div key={color.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                                      <Checkbox
                                        checked={selectedColors.includes(color.id)}
                                        onCheckedChange={(checked) => {
                                          setSelectedColors(
                                            checked
                                              ? [...selectedColors, color.id]
                                              : selectedColors.filter(id => id !== color.id)
                                          );
                                        }}
                                        id={`color-${color.id}`}
                                      />
                                      <label 
                                        htmlFor={`color-${color.id}`}
                                        className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                                      >
                                        <div
                                          className="w-6 h-6 rounded border"
                                          style={{ backgroundColor: color.hex_code }}
                                        />
                                        <span>{color.name}</span>
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          <DialogFooter>
                            <Button onClick={updateMaterial}>Actualizar Material</Button>
                          </DialogFooter>
                        </DialogContent>
                            </Dialog>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Editar material</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip delayDuration={300}>
                          <TooltipTrigger asChild>
                            <DeleteConfirmDialog
                              title="¿Eliminar material?"
                              itemName={material.name}
                              onConfirm={() => deleteMaterial(material.id)}
                              trigger={
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              }
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Mover a papelera</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BulkDeleteActions
        selectedCount={selectedCount}
        onDelete={handleBulkDelete}
        onCancel={clearSelection}
        itemName="materiales"
      />
    </div>
  );
}
