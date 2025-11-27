import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Edit, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { handleSupabaseError } from "@/lib/errorHandler";

export default function FooterLinks() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    section: "help",
    display_order: 0,
    is_active: true
  });

  useEffect(() => {
    loadLinks();

    // Subscribe to footer links changes
    const linksChannel = supabase
      .channel('admin-footer-links-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'footer_links'
      }, () => {
        loadLinks();
        toast.info("Enlaces actualizados");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(linksChannel);
    };
  }, []);

  const loadLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("footer_links")
        .select("*")
        .order("section", { ascending: true })
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error("Error cargando enlaces:", error);
      handleSupabaseError(error, { 
        toastMessage: "Error al cargar enlaces",
        context: "loadLinks" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      // Validación
      if (!formData.title || formData.title.trim() === '') {
        toast.error("El título es obligatorio");
        return;
      }

      if (!formData.url || formData.url.trim() === '') {
        toast.error("La URL es obligatoria");
        return;
      }

      console.log("💾 Guardando enlace:", formData);

      if (editingLink) {
        const { data, error } = await supabase
          .from("footer_links")
          .update(formData)
          .eq("id", editingLink.id)
          .select();
        
        if (error) {
          console.error("❌ Error actualizando enlace:", error);
          throw error;
        }
        console.log("✅ Enlace actualizado:", data);
        toast.success("Enlace actualizado exitosamente");
      } else {
        const { data, error } = await supabase
          .from("footer_links")
          .insert([formData])
          .select();
        
        if (error) {
          console.error("❌ Error creando enlace:", error);
          throw error;
        }
        console.log("✅ Enlace creado:", data);
        toast.success("Enlace creado exitosamente");
      }
      
      setIsDialogOpen(false);
      resetForm();
      loadLinks();
    } catch (error: any) {
      console.error("❌ Error completo al guardar:", error);
      toast.error(`Error al guardar enlace: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleEdit = (link: any) => {
    setEditingLink(link);
    setFormData({
      title: link.title,
      url: link.url,
      section: link.section,
      display_order: link.display_order,
      is_active: link.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este enlace?")) return;
    
    try {
      const { error } = await supabase
        .from("footer_links")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast.success("Enlace eliminado");
      loadLinks();
    } catch (error) {
      toast.error("Error al eliminar enlace");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      url: "",
      section: "help",
      display_order: 0,
      is_active: true
    });
    setEditingLink(null);
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Enlaces del Footer</CardTitle>
            <CardDescription>Gestiona los enlaces personalizados del pie de página</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Enlace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingLink ? "Editar" : "Crear"} Enlace</DialogTitle>
                <DialogDescription>
                  Configura un enlace para el footer
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Contacto"
                  />
                </div>
                <div>
                  <Label>URL</Label>
                  <Input
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="/contacto"
                  />
                </div>
                <div>
                  <Label>Sección</Label>
                  <Select value={formData.section} onValueChange={(value) => setFormData({ ...formData, section: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="help">Ayuda</SelectItem>
                      <SelectItem value="quick">Enlaces Rápidos</SelectItem>
                      <SelectItem value="company">Empresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Orden de Visualización</Label>
                  <Input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    placeholder="Ej: 1"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Activo</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmit}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sección</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((link) => (
              <TableRow key={link.id}>
                <TableCell>{link.section}</TableCell>
                <TableCell className="font-medium">{link.title}</TableCell>
                <TableCell className="text-muted-foreground">{link.url}</TableCell>
                <TableCell>{link.display_order}</TableCell>
                <TableCell>{link.is_active ? "Sí" : "No"}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(link)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(link.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {links.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No hay enlaces configurados</p>
        )}
      </CardContent>
    </Card>
  );
}
