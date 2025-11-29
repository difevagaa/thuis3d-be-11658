import { useState, useEffect } from "react";
import { logger } from '@/lib/logger';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { i18nToast } from "@/lib/i18nToast";
import { Pencil, Trash2, Plus, FolderTree, Search } from "lucide-react";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkDeleteActions } from "@/components/admin/BulkDeleteActions";
import { AdminPageHeader, AdminStatCard } from "@/components/admin/AdminPageHeader";

export default function Categories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  });

  const filteredCategories = categories.filter(c => !c.deleted_at);
  
  const {
    selectedIds,
    toggleSelection,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isIndeterminate,
    selectedCount,
  } = useBulkSelection(filteredCategories);

  useEffect(() => {
    loadCategories();

    // Realtime subscription
    const channel = supabase
      .channel('categories-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'categories'
      }, () => {
        loadCategories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      i18nToast.error("error.loadingFailed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      i18nToast.error("error.categoryNameRequired");
      return;
    }

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update(formData)
          .eq("id", editingCategory.id);

        if (error) {
          if (error.code === '23505') {
            i18nToast.error("error.categoryNameExists");
            return;
          }
          throw error;
        }
        i18nToast.success("success.categoryUpdated");
      } else {
        const { error } = await supabase
          .from("categories")
          .insert([formData]);

        if (error) {
          if (error.code === '23505') {
            i18nToast.error("error.categoryNameExists");
            return;
          }
          throw error;
        }
        i18nToast.success("success.categoryCreated");
      }

      setDialogOpen(false);
      resetForm();
      await loadCategories();
    } catch (error: any) {
      logger.error("Error saving category:", error);
      i18nToast.error("error.categorySaveFailed", { error: error.message || 'Unknown error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Mover esta categoría a la papelera?")) return;

    try {
      const { error } = await supabase
        .from("categories")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      i18nToast.success("success.categoryDeleted");
      await loadCategories();
    } catch (error: any) {
      i18nToast.error("error.categoryDeleteFailed");
    }
  };

  const handleBulkDelete = async () => {
    try {
      const idsToDelete = Array.from(selectedIds);
      
      const { error } = await supabase
        .from("categories")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", idsToDelete);

      if (error) throw error;
      i18nToast.success("success.categoriesDeleted", { count: idsToDelete.length });
      clearSelection();
      loadCategories();
    } catch (error: any) {
      i18nToast.error("error.categoryDeleteFailed");
    }
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || ""
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      description: ""
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center animate-pulse">
            <FolderTree className="h-6 w-6 text-white" />
          </div>
          <p className="text-muted-foreground">Cargando categorías...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <AdminPageHeader
        title="Gestión de Categorías"
        description="Organiza tus productos en categorías"
        emoji="📁"
        gradient="from-emerald-500 to-teal-600"
        actions={
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingCategory ? "Actualizar" : "Crear"} Categoría
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <AdminStatCard
          title="Total Categorías"
          value={filteredCategories.length}
          emoji="📁"
          gradient="from-emerald-500/10 to-teal-500/5"
        />
        <AdminStatCard
          title="Seleccionadas"
          value={selectedCount}
          emoji="✅"
          gradient="from-blue-500/10 to-indigo-500/5"
        />
        <AdminStatCard
          title="Última Actualización"
          value={filteredCategories.length > 0 ? new Date(filteredCategories[0]?.created_at).toLocaleDateString('es-ES') : '-'}
          emoji="📅"
          gradient="from-purple-500/10 to-violet-500/5"
        />
      </div>

      {/* Bulk Actions */}
      {selectedCount > 0 && (
        <BulkDeleteActions
          selectedCount={selectedCount}
          onDelete={handleBulkDelete}
          onCancel={clearSelection}
        />
      )}

      {/* Categories Table */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/50 bg-muted/30 py-3 sm:py-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <span>📋</span>
            Categorías de Productos
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Gestiona las categorías para organizar tu catálogo
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 md:p-6">
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl block mb-3">📁</span>
                <p className="text-muted-foreground text-sm">No hay categorías creadas</p>
              </div>
            ) : (
              filteredCategories.map((category) => (
                <div key={category.id} className="border rounded-lg p-3 bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <Checkbox
                        checked={isSelected(category.id)}
                        onCheckedChange={() => toggleSelection(category.id)}
                        aria-label={`Seleccionar ${category.name}`}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{category.name}</p>
                        {category.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{category.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        className="h-7 w-7 p-0"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Seleccionar todas"
                      ref={(el) => {
                        if (el) {
                          (el as any).indeterminate = isIndeterminate;
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Nombre</TableHead>
                  <TableHead className="font-semibold">Descripción</TableHead>
                  <TableHead className="font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-4xl">📁</span>
                        <p className="text-muted-foreground">No hay categorías creadas</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((category) => (
                    <TableRow key={category.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <Checkbox
                          checked={isSelected(category.id)}
                          onCheckedChange={() => toggleSelection(category.id)}
                          aria-label={`Seleccionar ${category.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground">{category.description || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(category)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(category.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
