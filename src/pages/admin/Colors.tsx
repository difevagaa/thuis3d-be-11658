import { useState, useEffect } from "react";
import { logger } from '@/lib/logger';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil, Trash2 } from "lucide-react";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkDeleteActions } from "@/components/admin/BulkDeleteActions";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { FieldHelp } from "@/components/admin/FieldHelp";

export default function Colors() {
  const [colors, setColors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingColor, setEditingColor] = useState<any>(null);
  const [newColor, setNewColor] = useState({
    name: "",
    hex_code: "#000000"
  });

  const filteredColors = colors.filter(c => !c.deleted_at);
  
  const {
    selectedIds,
    toggleSelection,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isIndeterminate,
    selectedCount,
  } = useBulkSelection(filteredColors);

  useEffect(() => {
    loadColors();

    // Realtime subscription
    const channel = supabase
      .channel('colors-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'colors'
      }, () => {
        loadColors();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadColors = async () => {
    try {
      const { data, error } = await supabase
        .from("colors")
        .select("*")
        .order("name");

      if (error) throw error;
      setColors(data || []);
    } catch (error) {
      toast.error("Error al cargar colores");
    } finally {
      setLoading(false);
    }
  };

  const createColor = async () => {
    if (!newColor.name.trim()) {
      toast.error("El nombre del color es obligatorio");
      return;
    }

    try {
      const { error } = await supabase
        .from("colors")
        .insert([newColor]);

      if (error) {
        if (error.code === '23505') {
          toast.error("Ya existe un color con ese nombre");
          return;
        }
        throw error;
      }
      toast.success("Color creado exitosamente");
      setNewColor({ name: "", hex_code: "#000000" });
      await loadColors();
    } catch (error: any) {
      logger.error("Error creating color:", error);
      toast.error("Error al crear color: " + (error.message || "Error desconocido"));
    }
  };

  const updateColor = async () => {
    try {
      const { error } = await supabase
        .from("colors")
        .update({
          name: editingColor.name,
          hex_code: editingColor.hex_code
        })
        .eq("id", editingColor.id);

      if (error) throw error;
      toast.success("Color actualizado exitosamente");
      setEditingColor(null);
      await loadColors();
    } catch (error) {
      toast.error("Error al actualizar color");
    }
  };

  const deleteColor = async (id: string) => {
    try {
      const { error } = await supabase
        .from("colors")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast.success("Color movido a la papelera");
      await loadColors();
    } catch (error) {
      toast.error("Error al eliminar color");
    }
  };

  const handleBulkDelete = async () => {
    try {
      const idsToDelete = Array.from(selectedIds);
      
      const { error } = await supabase
        .from("colors")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", idsToDelete);

      if (error) throw error;
      toast.success(`${idsToDelete.length} colores movidos a la papelera`);
      clearSelection();
      loadColors();
    } catch (error: any) {
      toast.error("Error al eliminar colores");
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Gestión de Colores</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Nuevo Color</CardTitle>
          <CardDescription>Añade un nuevo color para personalización</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="name">Nombre</Label>
              <FieldHelp content="Nombre descriptivo del color (ej: Rojo, Azul Océano)" />
            </div>
            <Input
              id="name"
              value={newColor.name}
              onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="hex_code">Código Hex</Label>
              <FieldHelp content="Código hexadecimal del color (formato: #RRGGBB). Usa el selector de color o escribe el código manualmente." />
            </div>
            <div className="flex gap-2">
              <Input
                id="hex_code"
                value={newColor.hex_code}
                onChange={(e) => setNewColor({ ...newColor, hex_code: e.target.value })}
              />
              <Input
                type="color"
                value={newColor.hex_code}
                onChange={(e) => setNewColor({ ...newColor, hex_code: e.target.value })}
                className="w-20"
              />
            </div>
          </div>
          <Button onClick={createColor}>Crear Color</Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Colores Disponibles</CardTitle>
          <CardDescription>Administra los colores disponibles para personalización</CardDescription>
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
                <TableHead>Color</TableHead>
                <TableHead>Código Hex</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredColors.map((color) => (
                <TableRow key={color.id}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected(color.id)}
                      onCheckedChange={() => toggleSelection(color.id)}
                      aria-label={`Seleccionar ${color.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{color.name}</TableCell>
                  <TableCell>
                    <div
                      className="w-10 h-10 rounded border border-gray-300"
                      style={{ backgroundColor: color.hex_code }}
                    />
                  </TableCell>
                  <TableCell>{color.hex_code}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip delayDuration={200}>
                          <Dialog>
                            <DialogTrigger asChild>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingColor(color)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar Color</DialogTitle>
                              </DialogHeader>
                              {editingColor && (
                                <div className="space-y-4">
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Label htmlFor="edit-name">Nombre</Label>
                                      <FieldHelp content="Nombre descriptivo del color" />
                                    </div>
                                    <Input
                                      id="edit-name"
                                      value={editingColor.name}
                                      onChange={(e) =>
                                        setEditingColor({ ...editingColor, name: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Label htmlFor="edit-hex">Código Hex</Label>
                                      <FieldHelp content="Código hexadecimal del color (formato: #RRGGBB)" />
                                    </div>
                                    <div className="flex gap-2">
                                      <Input
                                        id="edit-hex"
                                        value={editingColor.hex_code}
                                        onChange={(e) =>
                                          setEditingColor({ ...editingColor, hex_code: e.target.value })
                                        }
                                      />
                                      <Input
                                        type="color"
                                        value={editingColor.hex_code}
                                        onChange={(e) =>
                                          setEditingColor({ ...editingColor, hex_code: e.target.value })
                                        }
                                        className="w-20"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                              <DialogFooter>
                                <Button onClick={updateColor}>Actualizar Color</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <TooltipContent side="top">
                            <p className="text-sm">Editar color</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <DeleteConfirmDialog
                        title="¿Mover color a la papelera?"
                        itemName={color.name}
                        onConfirm={() => deleteColor(color.id)}
                        trigger={
                          <TooltipProvider>
                            <Tooltip delayDuration={200}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-sm">Mover a papelera</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        }
                      />
                    </div>
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
        itemName="colores"
      />
    </div>
  );
}

