import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, Shield, Check, X, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from '@/lib/logger';
import { allPermissions, getGroupedPermissions, buildAdminPageOptions } from "@/constants/adminMenu";

// All admin pages from central definition
const allAdminPages = buildAdminPageOptions();
const groupedPages = (() => {
  const groups: Record<string, { value: string; label: string }[]> = {};
  for (const page of allAdminPages) {
    const [section] = page.label.split(' — ');
    if (!groups[section]) groups[section] = [];
    groups[section].push(page);
  }
  return groups;
})();

export default function RolesPermissions() {
  const [customRoles, setCustomRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleUsers, setRoleUsers] = useState<{ [key: string]: number }>({});

  const [newRole, setNewRole] = useState({
    name: "",
    display_name: "",
    description: "",
    allowed_pages: [] as string[]
  });

  // Current user role check
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([]);
  const isSuperAdmin = useMemo(() => currentUserRoles.includes('superadmin'), [currentUserRoles]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
        setCurrentUserRoles((data || []).map(r => String(r.role || '').toLowerCase()));
      }
    })();
    loadRoles();

    const rolesChannel = supabase
      .channel('custom-roles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_roles' }, () => {
        logger.log('Custom roles changed, reloading...');
        loadRoles();
      })
      .subscribe();

    const userRolesChannel = supabase
      .channel('user-roles-count-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => {
        logger.log('User roles changed, reloading counts...');
        loadRoles();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(rolesChannel);
      supabase.removeChannel(userRolesChannel);
    };
  }, []);

  const loadRoles = async () => {
    try {
      const { data: rolesData, error } = await supabase
        .from("custom_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomRoles(rolesData || []);

      // Load user counts for system roles
      const counts: { [key: string]: number } = {};
      for (const roleName of ['admin', 'client', 'moderator', 'superadmin']) {
        const { count } = await supabase
          .from("user_roles")
          .select("*", { count: 'exact', head: true })
          .eq("role", roleName as any);
        counts[roleName] = count || 0;
      }
      setRoleUsers(counts);
    } catch (error: any) {
      logger.error("Error loading roles:", error);
      toast.error("Error al cargar roles");
    } finally {
      setLoading(false);
    }
  };

  const toggleAllPages = (checked: boolean, setter: (pages: string[]) => void) => {
    if (checked) {
      setter(allAdminPages.map(p => p.value));
    } else {
      setter([]);
    }
  };

  const toggleSection = (section: string, currentPages: string[], setter: (pages: string[]) => void) => {
    const sectionPages = groupedPages[section]?.map(p => p.value) || [];
    const allSelected = sectionPages.every(p => currentPages.includes(p));
    
    if (allSelected) {
      setter(currentPages.filter(p => !sectionPages.includes(p)));
    } else {
      setter([...new Set([...currentPages, ...sectionPages])]);
    }
  };

  const handleCreateRole = async () => {
    try {
      if (!newRole.name || !newRole.display_name) {
        toast.error("Nombre y nombre visible son obligatorios");
        return;
      }

      const roleName = newRole.name.toLowerCase().replace(/\s+/g, '_');
      const systemRoleNames = ['admin', 'client', 'moderator', 'superadmin'];
      if (systemRoleNames.includes(roleName)) {
        toast.error(`No puedes crear un rol llamado "${roleName}" porque es un rol del sistema.`);
        return;
      }

      const { error } = await supabase
        .from("custom_roles")
        .insert([{
          name: roleName,
          display_name: newRole.display_name,
          description: newRole.description,
          allowed_pages: newRole.allowed_pages
        }]);

      if (error) {
        if (error.code === '23505') {
          toast.error("Ya existe un rol con ese nombre");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Rol creado exitosamente");
      setDialogOpen(false);
      setNewRole({ name: "", display_name: "", description: "", allowed_pages: [] });
      loadRoles();
    } catch (error: any) {
      logger.error("Error creating role:", error);
      toast.error("Error al crear rol");
    }
  };

  const handleUpdateRole = async () => {
    try {
      if (!editingRole) return;

      const { error } = await supabase
        .from("custom_roles")
        .update({
          display_name: editingRole.display_name,
          description: editingRole.description,
          allowed_pages: editingRole.allowed_pages
        })
        .eq("id", editingRole.id);

      if (error) throw error;

      toast.success("Rol actualizado exitosamente");
      setEditingRole(null);
      loadRoles();
    } catch (error: any) {
      logger.error("Error updating role:", error);
      toast.error("Error al actualizar rol");
    }
  };

  const handleDeleteRole = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar el rol "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from("custom_roles")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Rol eliminado exitosamente");
      await loadRoles();
    } catch (error: any) {
      logger.error("Error deleting role:", error);
      toast.error("Error al eliminar rol");
    }
  };

  const renderPageSelector = (
    selectedPages: string[],
    onToggle: (page: string, checked: boolean) => void,
    onToggleAll: (checked: boolean) => void,
    onToggleSection: (section: string) => void
  ) => {
    const allSelected = selectedPages.length === allAdminPages.length;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => onToggleAll(!!checked)}
            />
            <Label className="font-semibold">Seleccionar todas las páginas</Label>
          </div>
          <Badge variant="secondary">{selectedPages.length}/{allAdminPages.length}</Badge>
        </div>

        <ScrollArea className="h-80 pr-4">
          <div className="space-y-4">
            {Object.entries(groupedPages).map(([section, pages]) => {
              const sectionSelected = pages.every(p => selectedPages.includes(p.value));
              const sectionPartial = pages.some(p => selectedPages.includes(p.value)) && !sectionSelected;

              return (
                <div key={section} className="space-y-2">
                  <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-md">
                    <Checkbox
                      checked={sectionSelected}
                      className={sectionPartial ? "data-[state=checked]:bg-primary/50" : ""}
                      onCheckedChange={() => onToggleSection(section)}
                    />
                    <Label className="font-medium text-sm">{section}</Label>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {pages.filter(p => selectedPages.includes(p.value)).length}/{pages.length}
                    </Badge>
                  </div>
                  <div className="pl-6 space-y-1">
                    {pages.map((page) => (
                      <div key={page.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`page-${page.value}`}
                          checked={selectedPages.includes(page.value)}
                          onCheckedChange={(checked) => onToggle(page.value, !!checked)}
                        />
                        <Label htmlFor={`page-${page.value}`} className="text-sm font-normal cursor-pointer">
                          {page.label.split(' — ')[1] || page.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  };

  if (loading) return <div className="container mx-auto p-6">Cargando...</div>;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7" />
            Roles y Permisos
          </h1>
          <p className="text-muted-foreground">
            Gestiona roles personalizados y sus permisos de acceso a páginas del panel
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Rol
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Rol</DialogTitle>
              <DialogDescription>
                Define un nuevo rol personalizado con acceso a páginas específicas
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Información</TabsTrigger>
                <TabsTrigger value="pages">Páginas Permitidas</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-4 pt-4">
                <div>
                  <Label>Nombre Interno *</Label>
                  <Input
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    placeholder="vendedor, supervisor, etc."
                  />
                  <p className="text-xs text-muted-foreground mt-1">Se usará internamente (sin espacios)</p>
                </div>
                <div>
                  <Label>Nombre Visible *</Label>
                  <Input
                    value={newRole.display_name}
                    onChange={(e) => setNewRole({ ...newRole, display_name: e.target.value })}
                    placeholder="Vendedor, Supervisor, etc."
                  />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Textarea
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                    placeholder="Descripción del rol y sus responsabilidades..."
                    rows={3}
                  />
                </div>
              </TabsContent>
              <TabsContent value="pages" className="pt-4">
                {renderPageSelector(
                  newRole.allowed_pages,
                  (page, checked) => {
                    if (checked) {
                      setNewRole({ ...newRole, allowed_pages: [...newRole.allowed_pages, page] });
                    } else {
                      setNewRole({ ...newRole, allowed_pages: newRole.allowed_pages.filter(p => p !== page) });
                    }
                  },
                  (checked) => toggleAllPages(checked, (pages) => setNewRole({ ...newRole, allowed_pages: pages })),
                  (section) => toggleSection(section, newRole.allowed_pages, (pages) => setNewRole({ ...newRole, allowed_pages: pages }))
                )}
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateRole}>Crear Rol</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* System Roles Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Roles del Sistema</CardTitle>
          <CardDescription>Estos roles son predefinidos y no pueden modificarse</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-red-500" />
                <span className="font-semibold">Superadmin</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Acceso total sin restricciones</p>
              <Badge>{roleUsers['superadmin'] || 0} usuarios</Badge>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Admin</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Administrador con PIN</p>
              <Badge>{roleUsers['admin'] || 0} usuarios</Badge>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-green-500" />
                <span className="font-semibold">Moderator</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Moderador de contenido</p>
              <Badge>{roleUsers['moderator'] || 0} usuarios</Badge>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-gray-500" />
                <span className="font-semibold">Client</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Cliente registrado</p>
              <Badge>{roleUsers['client'] || 0} usuarios</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Roles */}
      <Card>
        <CardHeader>
          <CardTitle>Roles Personalizados</CardTitle>
          <CardDescription>
            Lista de roles personalizados con permisos configurables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Páginas</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customRoles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No hay roles personalizados creados
                    </TableCell>
                  </TableRow>
                ) : (
                  customRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{role.display_name}</div>
                          <div className="text-xs text-muted-foreground">{role.name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-muted-foreground truncate">
                          {role.description || '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {(role.allowed_pages || []).length} páginas
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(role.created_at).toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingRole(role)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteRole(role.id, role.display_name)}
                          >
                            <Trash2 className="h-3 w-3" />
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

      {/* Edit Role Dialog */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Rol</DialogTitle>
            <DialogDescription>
              Actualiza la información y permisos del rol
            </DialogDescription>
          </DialogHeader>
          {editingRole && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Información</TabsTrigger>
                <TabsTrigger value="pages">Páginas Permitidas</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-4 pt-4">
                <div>
                  <Label>Nombre Interno</Label>
                  <Input value={editingRole.name} disabled className="bg-muted" />
                </div>
                <div>
                  <Label>Nombre Visible</Label>
                  <Input
                    value={editingRole.display_name}
                    onChange={(e) => setEditingRole({ ...editingRole, display_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Textarea
                    value={editingRole.description || ""}
                    onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </TabsContent>
              <TabsContent value="pages" className="pt-4">
                {renderPageSelector(
                  editingRole.allowed_pages || [],
                  (page, checked) => {
                    const currentPages = editingRole.allowed_pages || [];
                    if (checked) {
                      setEditingRole({ ...editingRole, allowed_pages: [...currentPages, page] });
                    } else {
                      setEditingRole({ ...editingRole, allowed_pages: currentPages.filter((p: string) => p !== page) });
                    }
                  },
                  (checked) => toggleAllPages(checked, (pages) => setEditingRole({ ...editingRole, allowed_pages: pages })),
                  (section) => toggleSection(section, editingRole.allowed_pages || [], (pages) => setEditingRole({ ...editingRole, allowed_pages: pages }))
                )}
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRole(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRole}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
