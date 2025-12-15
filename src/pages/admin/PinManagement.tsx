import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Key, Trash2, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Role = 'admin' | 'superadmin';

async function confirmPasswordOrThrow(password: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('No autenticado');

  // Re-authenticate by signing in again.
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (error) throw error;
}

export default function PinManagement() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([]);

  const isSuperAdmin = useMemo(() => currentUserRoles.includes('superadmin'), [currentUserRoles]);

  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPinDialog, setShowPinDialog] = useState(false);

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingAction, setPendingAction] = useState<null | { type: 'set' | 'clear'; targetId: string; pin?: string }>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      if (user) {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        setCurrentUserRoles(
          (rolesData || [])
            .map(r => String(r.role || '').trim().toLowerCase())
            .filter(Boolean)
        );
      }

      loadAdmins();
    })();
  }, []);

  const loadAdmins = async () => {
    try {
      // Get all users with admin OR superadmin role
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "superadmin"]);

      if (rolesError) throw rolesError;

      const ids = Array.from(new Set((adminRoles || []).map(r => r.user_id)));
      if (ids.length === 0) {
        setAdmins([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, admin_pin")
        .in("id", ids);

      if (profilesError) throw profilesError;

      const rolesByUser = new Map<string, Role[]>();
      (adminRoles || []).forEach(r => {
        const key = r.user_id as string;
        const role = String(r.role || '').toLowerCase() as Role;
        if (!rolesByUser.has(key)) rolesByUser.set(key, []);
        rolesByUser.get(key)!.push(role);
      });

      const enriched = (profiles || []).map(p => ({
        ...p,
        roles: rolesByUser.get(p.id) || [],
      }));

      setAdmins(enriched);
    } catch (error: any) {
      console.error("Error loading admins:", error);
      toast.error("Error al cargar administradores");
    } finally {
      setLoading(false);
    }
  };

  const canManageTarget = (targetId: string) => {
    if (!currentUserId) return false;
    if (isSuperAdmin) return true;
    // Admins only manage their own PIN
    return currentUserId === targetId;
  };

  const openPinDialog = (admin: any) => {
    if (!canManageTarget(admin.id)) {
      toast.error('No tienes permisos para modificar el PIN de este usuario');
      return;
    }

    setSelectedAdmin(admin);
    setNewPin("");
    setConfirmPin("");
    setShowPinDialog(true);
  };

  const validatePinOrThrow = (pinToValidate: string, confirmToValidate: string) => {
    if (!pinToValidate || pinToValidate.length !== 4) {
      throw new Error("El PIN debe tener exactamente 4 dígitos");
    }
    if (!/^\d{4}$/.test(pinToValidate)) {
      throw new Error("El PIN solo puede contener números");
    }
    if (pinToValidate !== confirmToValidate) {
      throw new Error("Los PIN no coinciden");
    }
  };

  const executeSetPin = async (targetId: string, pinToSet: string) => {
    const { error } = await supabase.rpc('set_admin_pin', {
      target_user_id: targetId,
      pin_input: pinToSet,
    });
    if (error) throw error;
  };

  const executeClearPin = async (targetId: string) => {
    const { error } = await supabase.rpc('clear_admin_pin', {
      target_user_id: targetId,
    });
    if (error) throw error;
  };

  const savePIN = async () => {
    try {
      if (!selectedAdmin) return;
      if (!canManageTarget(selectedAdmin.id)) {
        toast.error('No tienes permisos para modificar este PIN');
        return;
      }

      validatePinOrThrow(newPin, confirmPin);

      // Admins must confirm password; superadmin can do directly.
      if (!isSuperAdmin) {
        setPendingAction({ type: 'set', targetId: selectedAdmin.id, pin: newPin });
        setPassword('');
        setShowPinDialog(false);
        setShowPasswordDialog(true);
        return;
      }

      await executeSetPin(selectedAdmin.id, newPin);
      toast.success("PIN configurado exitosamente");
      setShowPinDialog(false);
      await loadAdmins();
    } catch (error: any) {
      console.error("Error saving PIN:", error);
      toast.error(error?.message || "Error al guardar PIN");
    }
  };

  const resetPIN = async (adminId: string) => {
    try {
      if (!canManageTarget(adminId)) {
        toast.error('No tienes permisos para eliminar este PIN');
        return;
      }

      if (!confirm("¿Estás seguro de que quieres eliminar el PIN de este usuario?")) {
        return;
      }

      if (!isSuperAdmin) {
        setPendingAction({ type: 'clear', targetId: adminId });
        setPassword('');
        setShowPasswordDialog(true);
        return;
      }

      await executeClearPin(adminId);
      toast.success("PIN eliminado exitosamente");
      await loadAdmins();
    } catch (error: any) {
      console.error("Error resetting PIN:", error);
      toast.error(error?.message || "Error al eliminar PIN");
    }
  };

  const confirmPasswordAndContinue = async () => {
    if (!pendingAction) return;

    try {
      setPasswordLoading(true);
      await confirmPasswordOrThrow(password);

      if (pendingAction.type === 'set') {
        await executeSetPin(pendingAction.targetId, pendingAction.pin || '');
        toast.success('PIN actualizado');
      } else {
        await executeClearPin(pendingAction.targetId);
        toast.success('PIN eliminado');
      }

      setShowPasswordDialog(false);
      setPendingAction(null);
      await loadAdmins();
    } catch (err: any) {
      console.error('Password confirm error:', err);
      toast.error('Contraseña incorrecta');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) return <div className="container mx-auto p-6">Cargando...</div>;

  const visibleAdmins = isSuperAdmin
    ? admins
    : admins.filter(a => a.id === currentUserId);

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 md:h-8 md:w-8" />
          Gestión de PINs de Seguridad
        </h1>
        <p className="text-muted-foreground">
          {isSuperAdmin
            ? 'Como superadministrador puedes gestionar los PINs de todos los administradores.'
            : 'Como administrador solo puedes gestionar tu propio PIN (requiere confirmar tu contraseña para cambiarlo/eliminarlo).'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Administradores del Sistema</CardTitle>
          <CardDescription>
            Los PINs son necesarios para acceder a secciones sensibles como Base de Datos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado del PIN</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleAdmins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No hay administradores registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleAdmins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.full_name || "-"}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap">
                          {(admin.roles || []).includes('superadmin') && <Badge>Superadmin</Badge>}
                          {(admin.roles || []).includes('admin') && <Badge variant="secondary">Admin</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {admin.admin_pin ? (
                          <Badge variant="default" className="flex items-center gap-1 w-fit">
                            <Key className="h-3 w-3" />
                            Configurado
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <ShieldAlert className="h-3 w-3" />
                            Sin configurar
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPinDialog(admin)}
                            disabled={!canManageTarget(admin.id)}
                          >
                            <Key className="h-4 w-4 mr-1" />
                            {admin.admin_pin ? "Cambiar" : "Configurar"} PIN
                          </Button>
                          {admin.admin_pin && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => resetPIN(admin.id)}
                              disabled={!canManageTarget(admin.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Eliminar
                            </Button>
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

      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Configurar PIN de Seguridad
            </DialogTitle>
            <DialogDescription>
              Establece un PIN de 4 dígitos para {selectedAdmin?.full_name || selectedAdmin?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-pin">Nuevo PIN (4 dígitos)</Label>
              <Input
                id="new-pin"
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
                maxLength={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pin">Confirmar PIN</Label>
              <Input
                id="confirm-pin"
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
                maxLength={4}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') savePIN();
                }}
              />
            </div>
            {!isSuperAdmin && (
              <div className="bg-muted p-3 rounded-lg flex gap-2">
                <Lock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Para cambiar tu PIN, deberás confirmar tu contraseña de inicio de sesión.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPinDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={savePIN} disabled={!newPin || !confirmPin}>
              Guardar PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Confirmar contraseña
            </DialogTitle>
            <DialogDescription>
              Por seguridad, confirma tu contraseña para cambiar/eliminar tu PIN.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmPasswordAndContinue();
              }}
              placeholder="Tu contraseña"
              autoComplete="current-password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)} disabled={passwordLoading}>
              Cancelar
            </Button>
            <Button onClick={confirmPasswordAndContinue} disabled={!password || passwordLoading}>
              {passwordLoading ? 'Verificando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
