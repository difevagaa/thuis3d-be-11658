import { useState, useEffect } from "react";
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
import { Plus, Pencil, Trash2, Users, Eye } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { logger } from '@/lib/logger';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function RolesPermissions() {
  const [customRoles, setCustomRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleUsers, setRoleUsers] = useState<{ [key: string]: number }>({});
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [selectedRoleUsers, setSelectedRoleUsers] = useState<any[]>([]);
  const [selectedRoleName, setSelectedRoleName] = useState<string>("");
  
  const [newRole, setNewRole] = useState({
    name: "",
    display_name: "",
    description: "",
    allowed_pages: [] as string[]
  });

  const availablePages = [
    { value: "/admin", label: "📊 Dashboard Principal" },
    { value: "/admin/productos", label: "📦 Productos" },
    { value: "/admin/pedidos", label: "🛒 Pedidos" },
    { value: "/admin/cotizaciones", label: "💼 Cotizaciones" },
    { value: "/admin/usuarios", label: "👥 Usuarios" },
    { value: "/admin/blog", label: "📝 Blog" },
    { value: "/admin/gift-cards", label: "🎁 Tarjetas Regalo" },
    { value: "/admin/facturas", label: "📄 Facturas" },
    { value: "/admin/mensajes", label: "💬 Mensajes" },
    { value: "/admin/estadisticas", label: "📈 Estadísticas" },
    { value: "/admin/configuracion", label: "⚙️ Configuración" }
  ];

  useEffect(() => {
    loadRoles();

    // Subscribe to realtime changes in custom_roles
    const rolesChannel = supabase
      .channel('custom-roles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'custom_roles'
      }, () => {
        logger.log('Custom roles changed, reloading...');
        loadRoles();
      })
      .subscribe();

    // Subscribe to user_roles changes to update counts
    const userRolesChannel = supabase
      .channel('user-roles-count-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_roles'
      }, () => {
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

      // Load user counts for each role by role name (works for all roles)
      const counts: { [key: string]: number } = {};
      for (const role of rolesData || []) {
        const { count } = await supabase
          .from("user_roles")
          .select("*", { count: 'exact', head: true })
          .eq("role", role.name);
        counts[role.name] = count || 0;
      }
      setRoleUsers(counts);
    } catch (error: any) {
      logger.error("Error loading roles:", error);
      toast.error("Error al cargar roles");
    } finally {
      setLoading(false);
    }
  };

  const loadUsersForRole = async (roleName: string, displayName: string) => {
    try {
      // Get all user_roles with this role
      const { data: userRolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", roleName);

      if (rolesError) throw rolesError;

      if (!userRolesData || userRolesData.length === 0) {
        setSelectedRoleUsers([]);
        setSelectedRoleName(displayName);
        setUsersDialogOpen(true);
        return;
      }

      // Get profile info for these users
      const userIds = userRolesData.map(ur => ur.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      setSelectedRoleUsers(profilesData || []);
      setSelectedRoleName(displayName);
      setUsersDialogOpen(true);
    } catch (error: any) {
      logger.error("Error loading users for role:", error);
      toast.error("Error al cargar usuarios del rol");
    }
  };

  const handleCreateRole = async () => {
    try {
      if (!newRole.name || !newRole.display_name) {
        toast.error("Nombre y nombre visible son obligatorios");
        return;
      }

      const roleName = newRole.name.toLowerCase().replace(/\s+/g, '_');
      
      // Prevent creating custom roles with system role names
      const systemRoleNames = ['admin', 'client', 'moderator'];
      if (systemRoleNames.includes(roleName)) {
        toast.error(`No puedes crear un rol llamado "${roleName}" porque es un rol del sistema. Usa otro nombre.`);
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

  if (loading) return <div className="container mx-auto p-6">Cargando...</div>;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Roles y Permisos</h1>
          <p className="text-muted-foreground">Gestiona roles personalizados y sus permisos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Rol
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Rol</DialogTitle>
              <DialogDescription>
                Define un nuevo rol personalizado para tu sistema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre Interno *</Label>
                <Input
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  placeholder="vendedor, supervisor, etc."
                />
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
              <div>
                <Label>🔐 Páginas Permitidas</Label>
                <div className="space-y-2 mt-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {availablePages.map((page) => (
                    <div key={page.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`page-${page.value}`}
                        checked={newRole.allowed_pages.includes(page.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewRole({ ...newRole, allowed_pages: [...newRole.allowed_pages, page.value] });
                          } else {
                            setNewRole({ ...newRole, allowed_pages: newRole.allowed_pages.filter(p => p !== page.value) });
                          }
                        }}
                      />
                      <Label htmlFor={`page-${page.value}`} className="font-normal cursor-pointer">
                        {page.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Selecciona las páginas a las que este rol tendrá acceso
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateRole}>Crear Rol</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roles Personalizados</CardTitle>
          <CardDescription>
            Lista de roles personalizados creados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Usuarios Asignados</TableHead>
                  <TableHead>Fecha Creación</TableHead>
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
                        <Badge 
                          variant="secondary" 
                          className="gap-1 cursor-pointer hover:bg-secondary/80 transition-colors"
                          onClick={() => loadUsersForRole(role.name, role.display_name)}
                        >
                          <Users className="h-3 w-3" />
                          {roleUsers[role.name] || 0}
                          <Eye className="h-3 w-3 ml-1" />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Rol</DialogTitle>
            <DialogDescription>
              Actualiza la información del rol personalizado
            </DialogDescription>
          </DialogHeader>
          {editingRole && (
            <div className="space-y-4">
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
              <div>
                <Label>🔐 Páginas Permitidas</Label>
                <div className="space-y-2 mt-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {availablePages.map((page) => (
                    <div key={page.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-page-${page.value}`}
                        checked={(editingRole.allowed_pages || []).includes(page.value)}
                        onCheckedChange={(checked) => {
                          const currentPages = editingRole.allowed_pages || [];
                          if (checked) {
                            setEditingRole({ ...editingRole, allowed_pages: [...currentPages, page.value] });
                          } else {
                            setEditingRole({ ...editingRole, allowed_pages: currentPages.filter((p: string) => p !== page.value) });
                          }
                        }}
                      />
                      <Label htmlFor={`edit-page-${page.value}`} className="font-normal cursor-pointer">
                        {page.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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

      {/* Users with Role Dialog */}
      <Dialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuarios con rol "{selectedRoleName}"
            </DialogTitle>
            <DialogDescription>
              Lista de usuarios que tienen asignado este rol
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {selectedRoleUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No hay usuarios con este rol</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedRoleUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.full_name || 'Sin nombre'}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email || '-'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setUsersDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
