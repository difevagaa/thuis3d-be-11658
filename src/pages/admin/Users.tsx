import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { UserPlus, Pencil, Trash2, Lock, Unlock, Key, Eye, Clock, MapPin, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showUserDetailsDialog, setShowUserDetailsDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    country: "Bélgica"
  });

  useEffect(() => {
    loadData();

    // Subscribe to realtime changes in user_roles
    const rolesChannel = supabase
      .channel('user-roles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_roles'
      }, () => {
        loadData();
      })
      .subscribe();

    // Subscribe to profiles changes
    const profilesChannel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => {
        loadData();
      })
      .subscribe();

    // Actualizar estado de usuarios cada 30 segundos
    const statusInterval = setInterval(() => {
      loadData();
    }, 30000);

    return () => {
      supabase.removeChannel(rolesChannel);
      supabase.removeChannel(profilesChannel);
      clearInterval(statusInterval);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load profiles first
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Load user roles separately
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Combine profiles with their roles
      const usersWithRoles = (profilesData || []).map(profile => ({
        ...profile,
        user_roles: (rolesData || []).filter(role => role.user_id === profile.id)
      }));

      setUsers(usersWithRoles);
      
      // Load BOTH system roles and custom roles
      const systemRoles = [
        { value: 'admin', label: 'Administrador' },
        { value: 'client', label: 'Cliente' },
        { value: 'moderator', label: 'Moderador' }
      ];
      
      // Load custom roles from database
      const { data: customRolesData } = await supabase
        .from("custom_roles")
        .select("name, display_name")
        .order("display_name");
      
      const customRolesList = (customRolesData || [])
        .filter(role => !['admin', 'client', 'moderator'].includes(role.name))
        .map(role => ({
          value: role.name,
          label: role.display_name
        }));
      
      // Combine system roles with custom roles
      setRoles([...systemRoles, ...customRolesList]);
    } catch (error: any) {
      toast.error("Error al cargar usuarios: " + (error.message || "Error desconocido"));
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async () => {
    try {
      if (!selectedUser || !selectedRole) return;

      // Validate that selected role exists in available roles
      const roleExists = roles.some(r => r.value === selectedRole);
      if (!roleExists) {
        toast.error("Rol inválido");
        return;
      }

      // Check if user already has this role
      const existingRole = selectedUser.user_roles?.find((r: any) => r.role === selectedRole);
      if (existingRole) {
        toast.info("El usuario ya tiene este rol asignado");
        setSelectedUser(null);
        setSelectedRole("");
        return;
      }

      // Delete ALL existing roles (user can only have one role)
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selectedUser.id);

      if (deleteError) throw deleteError;

      // Insert new role
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: selectedUser.id,
          role: selectedRole
        });

      if (error) throw error;

      toast.success("Rol asignado exitosamente");
      setSelectedUser(null);
      setSelectedRole("");
      loadData();
    } catch (error: any) {
      toast.error(`Error al asignar rol: ${error.message || 'Error desconocido'}`);
    }
  };

  const createUser = async () => {
    try {
      if (!newUser.email || !newUser.password || !newUser.full_name) {
        toast.error("Por favor completa los campos obligatorios");
        return;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.full_name
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update profile with additional data
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            phone: newUser.phone,
            address: newUser.address,
            city: newUser.city,
            postal_code: newUser.postal_code,
            country: newUser.country
          })
          .eq("id", authData.user.id);

        if (profileError) throw profileError;

        toast.success("Usuario creado exitosamente");
        setNewUser({
          email: "",
          password: "",
          full_name: "",
          phone: "",
          address: "",
          city: "",
          postal_code: "",
          country: "Bélgica"
        });
        setShowCreateDialog(false);
        loadData();
      }
    } catch (error: any) {
      toast.error(error.message || "Error al crear usuario");
    }
  };

  const openEditDialog = (user: any) => {
    setEditingUser({
      ...user,
      current_role: user.user_roles?.[0]?.role || 'client',
      is_blocked: user.is_blocked || false,
      blocked_reason: user.blocked_reason || '',
      reviews_blocked: user.reviews_blocked || false,
      city: user.city || '',
      postal_code: user.postal_code || '',
      country: user.country || 'Bélgica'
    });
    setShowEditDialog(true);
  };

  const updateUser = async () => {
    try {
      if (!editingUser) return;

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: editingUser.full_name,
          phone: editingUser.phone,
          address: editingUser.address,
          city: editingUser.city,
          postal_code: editingUser.postal_code,
          country: editingUser.country,
          is_blocked: editingUser.is_blocked,
          blocked_reason: editingUser.is_blocked ? editingUser.blocked_reason : null,
          blocked_at: editingUser.is_blocked ? new Date().toISOString() : null,
          reviews_blocked: editingUser.reviews_blocked
        })
        .eq("id", editingUser.id);

      if (profileError) throw profileError;

      // Update role if changed
      if (editingUser.current_role) {
        // Delete ALL existing roles
        const { error: deleteError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", editingUser.id);

        if (deleteError) throw deleteError;

        // Insert new role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: editingUser.id,
            role: editingUser.current_role
          });

        if (roleError) throw roleError;
      }

      toast.success("Usuario actualizado exitosamente");
      setShowEditDialog(false);
      setEditingUser(null);
      loadData();
    } catch (error: any) {
      toast.error("Error al actualizar usuario");
    }
  };

  const resetPassword = async (email: string, userName: string) => {
    try {
      if (!confirm(`¿Enviar email de restablecimiento de contraseña a ${userName}?`)) {
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast.success(`Email de restablecimiento enviado a ${email}`);
    } catch (error: any) {
      toast.error("Error al enviar email: " + (error.message || "Error desconocido"));
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    try {
      if (!confirm(`¿Estás seguro de que quieres eliminar al usuario ${userName}? Esta acción no se puede deshacer.`)) {
        return;
      }

      // Delete user roles first
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Delete profile (this will cascade to auth.users due to trigger)
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;

      toast.success("Usuario eliminado exitosamente");
      loadData();
    } catch (error: any) {
      toast.error("Error al eliminar usuario: " + (error.message || "Error desconocido"));
    }
  };

  const viewUserDetails = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      
      setUserDetails(data);
      setShowUserDetailsDialog(true);
    } catch (error: any) {
      toast.error("Error al cargar detalles del usuario");
    }
  };

  if (loading) return <div className="p-4 md:p-6">Cargando...</div>;

  return (
    <div className="container mx-auto p-4 md:p-6 pb-24 md:pb-6">
      <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-6">Gestión de Usuarios</h1>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Usuarios del Sistema</CardTitle>
              <CardDescription>Administra los usuarios y sus roles</CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Crear Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo Usuario</DialogTitle>
                  <DialogDescription>
                    Crea una nueva cuenta de usuario manualmente
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nombre Completo *</Label>
                    <Input
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="usuario@ejemplo.com"
                    />
                  </div>
                  <div>
                    <Label>Contraseña *</Label>
                    <Input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      placeholder="+32 123 456 789"
                    />
                  </div>
                  <div>
                    <Label>Dirección</Label>
                    <Input
                      value={newUser.address}
                      onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                      placeholder="Dirección completa"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Ciudad</Label>
                      <Input
                        value={newUser.city}
                        onChange={(e) => setNewUser({ ...newUser, city: e.target.value })}
                        placeholder="Bruselas"
                      />
                    </div>
                    <div>
                      <Label>Código Postal</Label>
                      <Input
                        value={newUser.postal_code}
                        onChange={(e) => setNewUser({ ...newUser, postal_code: e.target.value })}
                        placeholder="1000"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>País</Label>
                    <Input
                      value={newUser.country}
                      onChange={(e) => setNewUser({ ...newUser, country: e.target.value })}
                      placeholder="Bélgica"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={createUser}>Crear Usuario</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No hay usuarios registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.full_name || '-'}</TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>{user.phone || '-'}</TableCell>
                      <TableCell>
                        {user.user_roles && user.user_roles.length > 0 ? (
                          <Badge>{user.user_roles[0].role}</Badge>
                        ) : (
                          <Badge variant="secondary">Sin rol</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(() => {
                            // Calcular estado en línea basándose en last_activity_at
                            // Si la última actividad fue hace menos de 5 minutos, está en línea
                            const isOnline = user.last_activity_at && 
                              (new Date().getTime() - new Date(user.last_activity_at).getTime()) < 5 * 60 * 1000;
                            
                            return (
                              <>
                                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                                <span className="text-sm">
                                  {isOnline ? 'En línea' : 'Desconectado'}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => viewUserDetails(user.id)}
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">Ver</span>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openEditDialog(user)}
                          >
                            <Pencil className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">Editar</span>
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setSelectedRole(user.user_roles?.[0]?.role || '');
                                }}
                              >
                                Rol
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Asignar Rol a Usuario</DialogTitle>
                                <DialogDescription>
                                  Selecciona el rol para {user.full_name || user.email}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un rol" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {roles.map((role) => (
                                      <SelectItem key={role.value} value={role.value}>
                                        {role.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <DialogFooter>
                                <Button onClick={assignRole}>Asignar Rol</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resetPassword(user.email, user.full_name || user.email)}
                          >
                            <Key className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">Reset</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteUser(user.id, user.full_name || user.email)}
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">Eliminar</span>
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

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica la información del usuario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre Completo</Label>
              <Input
                value={editingUser?.full_name || ""}
                onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                placeholder="Juan Pérez"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={editingUser?.email || ""}
                disabled
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                value={editingUser?.phone || ""}
                onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                placeholder="+32 123 456 789"
              />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input
                value={editingUser?.address || ""}
                onChange={(e) => setEditingUser({ ...editingUser, address: e.target.value })}
                placeholder="Dirección completa"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ciudad</Label>
                <Input
                  value={editingUser?.city || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, city: e.target.value })}
                  placeholder="Bruselas"
                />
              </div>
              <div>
                <Label>Código Postal</Label>
                <Input
                  value={editingUser?.postal_code || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, postal_code: e.target.value })}
                  placeholder="1000"
                />
              </div>
            </div>
            <div>
              <Label>País</Label>
              <Input
                value={editingUser?.country || "Bélgica"}
                onChange={(e) => setEditingUser({ ...editingUser, country: e.target.value })}
                placeholder="Bélgica"
              />
            </div>
            <div>
              <Label>Rol</Label>
              <Select 
                value={editingUser?.current_role || 'client'} 
                onValueChange={(value) => setEditingUser({ ...editingUser, current_role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <div className="space-y-1">
                <Label>Bloquear Usuario</Label>
                <p className="text-sm text-muted-foreground">El usuario no podrá acceder al sistema</p>
              </div>
              <Switch
                checked={editingUser?.is_blocked || false}
                onCheckedChange={(checked) => setEditingUser({ ...editingUser, is_blocked: checked })}
              />
            </div>
            {editingUser?.is_blocked && (
              <div>
                <Label>Razón del Bloqueo</Label>
                <Input
                  value={editingUser?.blocked_reason || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, blocked_reason: e.target.value })}
                  placeholder="Motivo del bloqueo..."
                />
              </div>
            )}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="space-y-1">
                <Label>Bloquear Reseñas</Label>
                <p className="text-sm text-muted-foreground">El usuario no podrá dejar reseñas</p>
              </div>
              <Switch
                checked={editingUser?.reviews_blocked || false}
                onCheckedChange={(checked) => setEditingUser({ ...editingUser, reviews_blocked: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={updateUser}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={showUserDetailsDialog} onOpenChange={setShowUserDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles del Usuario</DialogTitle>
            <DialogDescription>
              Información completa y actividad del usuario
            </DialogDescription>
          </DialogHeader>
          {userDetails && (
            <div className="space-y-6">
              {/* Estado y Actividad */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Estado y Actividad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estado actual:</span>
                    <div className="flex items-center gap-2">
                      {(() => {
                        // Calcular estado en línea basándose en last_activity_at
                        const isOnline = userDetails.last_activity_at && 
                          (new Date().getTime() - new Date(userDetails.last_activity_at).getTime()) < 5 * 60 * 1000;
                        
                        return (
                          <>
                            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                            <Badge variant={isOnline ? "default" : "secondary"}>
                              {isOnline ? '🟢 En línea' : '⚫ Desconectado'}
                            </Badge>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  
                  {userDetails.current_page && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Página actual:</span>
                      <Badge variant="outline" className="font-mono">
                        <MapPin className="h-3 w-3 mr-1" />
                        {userDetails.current_page}
                      </Badge>
                    </div>
                  )}
                  
                  {userDetails.last_activity_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Última actividad:</span>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDistanceToNow(new Date(userDetails.last_activity_at), { 
                          addSuffix: true,
                          locale: es 
                        })}
                      </Badge>
                    </div>
                  )}
                  
                  {userDetails.last_sign_in_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Última sesión:</span>
                      <span className="text-sm font-medium">
                        {new Date(userDetails.last_sign_in_at).toLocaleString('es-ES')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Información Personal */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Información Personal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Nombre completo</Label>
                      <p className="font-medium">{userDetails.full_name || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{userDetails.email || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Teléfono</Label>
                      <p className="font-medium">{userDetails.phone || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">País</Label>
                      <p className="font-medium">{userDetails.country || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Ciudad</Label>
                      <p className="font-medium">{userDetails.city || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Código Postal</Label>
                      <p className="font-medium">{userDetails.postal_code || '-'}</p>
                    </div>
                  </div>
                  {userDetails.address && (
                    <div>
                      <Label className="text-muted-foreground">Dirección</Label>
                      <p className="font-medium">{userDetails.address}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Información de Cuenta */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Información de Cuenta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Fecha de registro</Label>
                      <p className="font-medium">
                        {new Date(userDetails.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">ID de Usuario</Label>
                      <p className="font-mono text-xs">{userDetails.id}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
