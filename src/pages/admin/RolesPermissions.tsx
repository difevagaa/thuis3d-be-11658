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
import { Plus, Pencil, Trash2, Users, Shield, Lock, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logger } from '@/lib/logger';

// System roles that cannot be deleted - defined outside component for performance
const SYSTEM_ROLES = [
  { name: 'admin', display_name: 'Administrador', description: 'Acceso completo al sistema', is_system: true },
  { name: 'client', display_name: 'Cliente', description: 'Usuario cliente registrado', is_system: true },
  { name: 'moderator', display_name: 'Moderador', description: 'Moderador de contenido', is_system: true }
];

const SYSTEM_ROLE_NAMES = SYSTEM_ROLES.map(sr => sr.name);

// Available pages - defined outside component for performance
const AVAILABLE_PAGES = [
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

interface RoleUser {
  id: string;
  full_name: string | null;
  email: string | null;
}

export default function RolesPermissions() {
  const [customRoles, setCustomRoles] = useState<any[]>([]);
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleUsers, setRoleUsers] = useState<{ [key: string]: number }>({});
  const [roleUsersList, setRoleUsersList] = useState<{ [key: string]: RoleUser[] }>({});
  const [showUsersDialogRole, setShowUsersDialogRole] = useState<string | null>(null);
  
  const [newRole, setNewRole] = useState({
    name: "",
    display_name: "",
    description: "",
    allowed_pages: [] as string[]
  });

  // Create a lookup map for AVAILABLE_PAGES for O(1) lookup
  const pagesLookup = useMemo(() => {
    const map: Record<string, string> = {};
    AVAILABLE_PAGES.forEach(p => {
      map[p.value] = p.label.replace(/^[^\s]+\s/, ''); // Remove emoji prefix
    });
    return map;
  }, []);

  // Memoize the current role display name for the users dialog
  const currentRoleDisplayName = useMemo(() => {
    if (!showUsersDialogRole) return '';
    const role = allRoles.find(r => r.name === showUsersDialogRole);
    return role?.display_name || showUsersDialogRole;
  }, [showUsersDialogRole, allRoles]);

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
      // Load custom roles from database
      const { data: rolesData, error } = await supabase
        .from("custom_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Filter out custom roles that have the same name as system roles
      const filteredCustomRoles = (rolesData || []).filter(
        role => !SYSTEM_ROLE_NAMES.includes(role.name)
      );
      setCustomRoles(filteredCustomRoles);

      // Combine system roles with custom roles for display
      const combined = [
        ...SYSTEM_ROLES.map(sr => ({ ...sr, id: `system-${sr.name}`, created_at: null })),
        ...filteredCustomRoles
      ];
      setAllRoles(combined);

      // Load ALL user roles with user details
      const { data: userRolesData, error: userRolesError } = await supabase
        .from("user_roles")
        .select("role, user_id");

      if (userRolesError) throw userRolesError;

      // Get unique user IDs
      const userIds = [...new Set((userRolesData || []).map(ur => ur.user_id))];
      
      // Load user profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profilesMap: { [key: string]: RoleUser } = {};
      (profilesData || []).forEach(p => {
        profilesMap[p.id] = { id: p.id, full_name: p.full_name, email: p.email };
      });

      // Count users per role and build users list
      const counts: { [key: string]: number } = {};
      const usersList: { [key: string]: RoleUser[] } = {};
      
      (userRolesData || []).forEach(ur => {
        const roleName = ur.role;
        counts[roleName] = (counts[roleName] || 0) + 1;
        
        if (!usersList[roleName]) usersList[roleName] = [];
        const profile = profilesMap[ur.user_id];
        if (profile) {
          usersList[roleName].push(profile);
        }
      });
      
      setRoleUsers(counts);
      setRoleUsersList(usersList);
    } catch (error: any) {
      logger.error("Error loading roles:", error);
      toast.error("Error al cargar roles");
    } finally {
      setLoading(false);
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
      if (SYSTEM_ROLE_NAMES.includes(roleName)) {
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

      toast.success("Rol creado exitosamente. Ahora puedes asignar este rol a usuarios.");
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

      // System roles can't be edited from custom_roles table
      if (editingRole.is_system) {
        toast.error("Los roles del sistema no pueden ser editados");
        setEditingRole(null);
        return;
      }

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

  const handleDeleteRole = async (id: string, name: string, displayName: string) => {
    // Check if any users have this role
    const usersWithRole = roleUsersList[name] || [];
    
    if (usersWithRole.length > 0) {
      toast.error(`No se puede eliminar el rol "${displayName}" porque hay ${usersWithRole.length} usuario(s) asignado(s). Primero cambia el rol de estos usuarios.`);
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar el rol "${displayName}"?\n\nEsto también eliminará las referencias a este rol en productos y artículos del blog.`)) return;

    try {
      // Delete role references from product_roles
      await supabase
        .from("product_roles")
        .delete()
        .eq("role", name);

      // Delete role references from blog_post_roles
      await supabase
        .from("blog_post_roles")
        .delete()
        .eq("role", name);

      // Delete the role itself
      const { error } = await supabase
        .from("custom_roles")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Rol eliminado exitosamente. Las referencias en productos y blog han sido limpiadas.");
      await loadRoles();
    } catch (error: any) {
      logger.error("Error deleting role:", error);
      toast.error("Error al eliminar rol");
    }
  };

  const handleShowUsers = (roleName: string) => {
    setShowUsersDialogRole(roleName);
  };

  if (loading) return <div className="container mx-auto p-6">Cargando...</div>;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Roles y Permisos</h1>
          <p className="text-muted-foreground">Gestiona los roles del sistema y sus permisos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Rol
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Rol</DialogTitle>
              <DialogDescription>
                Define un nuevo rol personalizado para tu sistema. Este rol podrá ser asignado a usuarios y usado para filtrar contenido.
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
                <p className="text-xs text-muted-foreground mt-1">
                  Este nombre se usará internamente. Usa letras minúsculas sin espacios.
                </p>
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
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Páginas del Panel Admin Permitidas
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Selecciona las páginas del panel de administración a las que este rol tendrá acceso
                </p>
                <ScrollArea className="h-60 border rounded-md p-3">
                  <div className="space-y-2">
                    {AVAILABLE_PAGES.map((page) => (
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
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateRole}>Crear Rol</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">¿Cómo funcionan los roles?</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
                <li>Los <strong>roles del sistema</strong> (Admin, Cliente, Moderador) son predefinidos y no se pueden eliminar</li>
                <li>Puedes crear <strong>roles personalizados</strong> para necesidades específicas de tu negocio</li>
                <li>Los roles se usan para <strong>filtrar productos y artículos</strong> del blog (visibilidad por rol)</li>
                <li>Los <strong>permisos de páginas</strong> determinan qué secciones del panel admin puede ver cada rol</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">Todos los Roles ({allRoles.length})</TabsTrigger>
          <TabsTrigger value="custom">Roles Personalizados ({customRoles.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Todos los Roles</CardTitle>
              <CardDescription>
                Incluye roles del sistema y personalizados. Haz clic en el número de usuarios para ver quiénes tienen cada rol.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Usuarios</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRoles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No hay roles configurados
                        </TableCell>
                      </TableRow>
                    ) : (
                      allRoles.map((role) => (
                        <TableRow key={role.id || role.name}>
                          <TableCell>
                            {role.is_system ? (
                              <Badge variant="default" className="gap-1">
                                <Lock className="h-3 w-3" />
                                Sistema
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Personalizado</Badge>
                            )}
                          </TableCell>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 hover:bg-primary/10"
                              onClick={() => handleShowUsers(role.name)}
                            >
                              <Badge 
                                variant={roleUsers[role.name] > 0 ? "default" : "secondary"} 
                                className="gap-1 cursor-pointer"
                              >
                                <Users className="h-3 w-3" />
                                {roleUsers[role.name] || 0}
                              </Badge>
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {!role.is_system && (
                                <>
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
                                    onClick={() => handleDeleteRole(role.id, role.name, role.display_name)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              {role.is_system && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Lock className="h-3 w-3" />
                                  No editable
                                </span>
                              )}
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
        </TabsContent>

        <TabsContent value="custom" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Roles Personalizados</CardTitle>
              <CardDescription>
                Roles creados para necesidades específicas de tu negocio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Páginas Permitidas</TableHead>
                      <TableHead>Usuarios</TableHead>
                      <TableHead>Fecha Creación</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customRoles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No hay roles personalizados creados. Haz clic en "Nuevo Rol" para crear uno.
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
                            <div className="flex flex-wrap gap-1">
                              {(role.allowed_pages || []).length > 0 ? (
                                (role.allowed_pages || []).slice(0, 3).map((page: string) => (
                                  <Badge key={page} variant="outline" className="text-xs">
                                    {pagesLookup[page] || page}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">Ninguna</span>
                              )}
                              {(role.allowed_pages || []).length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{(role.allowed_pages || []).length - 3} más
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 hover:bg-primary/10"
                              onClick={() => handleShowUsers(role.name)}
                            >
                              <Badge 
                                variant={roleUsers[role.name] > 0 ? "default" : "secondary"} 
                                className="gap-1 cursor-pointer"
                              >
                                <Users className="h-3 w-3" />
                                {roleUsers[role.name] || 0}
                              </Badge>
                            </Button>
                          </TableCell>
                          <TableCell>
                            {role.created_at ? new Date(role.created_at).toLocaleDateString('es-ES') : '-'}
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
                                onClick={() => handleDeleteRole(role.id, role.name, role.display_name)}
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
        </TabsContent>
      </Tabs>

      {/* Users with Role Dialog */}
      <Dialog open={!!showUsersDialogRole} onOpenChange={(open) => !open && setShowUsersDialogRole(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuarios con rol "{currentRoleDisplayName}"
            </DialogTitle>
            <DialogDescription>
              Lista de usuarios que tienen asignado este rol
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {showUsersDialogRole && (roleUsersList[showUsersDialogRole] || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No hay usuarios con este rol</p>
                <p className="text-xs mt-1">Puedes asignar este rol desde la sección de Usuarios</p>
              </div>
            ) : (
              <ScrollArea className="max-h-60">
                <div className="space-y-2">
                  {showUsersDialogRole && (roleUsersList[showUsersDialogRole] || []).map((user) => (
                    <div 
                      key={user.id} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{user.full_name || 'Sin nombre'}</p>
                        <p className="text-xs text-muted-foreground">{user.email || 'Sin email'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUsersDialogRole(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="max-w-lg">
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
                <p className="text-xs text-muted-foreground mt-1">
                  El nombre interno no puede ser modificado
                </p>
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
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Páginas del Panel Admin Permitidas
                </Label>
                <ScrollArea className="h-60 mt-2 border rounded-md p-3">
                  <div className="space-y-2">
                    {AVAILABLE_PAGES.map((page) => (
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
                </ScrollArea>
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
    </div>
  );
}
