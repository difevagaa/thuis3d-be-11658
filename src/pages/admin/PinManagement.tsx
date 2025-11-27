import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Key, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PinManagement() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      // Get all users with admin role
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (rolesError) throw rolesError;

      const adminIds = adminRoles.map(r => r.user_id);

      // Get profiles for these admins
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", adminIds);

      if (profilesError) throw profilesError;

      setAdmins(profiles || []);
    } catch (error: any) {
      console.error("Error loading admins:", error);
      toast.error("Error al cargar administradores");
    } finally {
      setLoading(false);
    }
  };

  const openPinDialog = (admin: any) => {
    setSelectedAdmin(admin);
    setNewPin("");
    setConfirmPin("");
    setShowDialog(true);
  };

  const savePIN = async () => {
    try {
      if (!newPin || newPin.length !== 4) {
        toast.error("El PIN debe tener exactamente 4 dígitos");
        return;
      }

      if (!/^\d{4}$/.test(newPin)) {
        toast.error("El PIN solo puede contener números");
        return;
      }

      if (newPin !== confirmPin) {
        toast.error("Los PIN no coinciden");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ admin_pin: newPin })
        .eq("id", selectedAdmin.id);

      if (error) throw error;

      toast.success("PIN configurado exitosamente");
      setShowDialog(false);
      loadAdmins();
    } catch (error: any) {
      console.error("Error saving PIN:", error);
      toast.error("Error al guardar PIN");
    }
  };

  const resetPIN = async (adminId: string) => {
    try {
      if (!confirm("¿Estás seguro de que quieres eliminar el PIN de este administrador?")) {
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ admin_pin: null })
        .eq("id", adminId);

      if (error) throw error;

      toast.success("PIN eliminado exitosamente");
      loadAdmins();
    } catch (error: any) {
      console.error("Error resetting PIN:", error);
      toast.error("Error al eliminar PIN");
    }
  };

  if (loading) return <div className="container mx-auto p-6">Cargando...</div>;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 md:h-8 md:w-8" />
          Gestión de PINs de Seguridad
        </h1>
        <p className="text-muted-foreground">
          Configura y administra los PINs de 4 dígitos para los administradores
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Administradores del Sistema</CardTitle>
          <CardDescription>
            Los PINs son necesarios para realizar acciones críticas como borrado permanente de elementos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado del PIN</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No hay administradores registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.full_name || "-"}</TableCell>
                      <TableCell>{admin.email}</TableCell>
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
                          >
                            <Key className="h-4 w-4 mr-1" />
                            {admin.admin_pin ? "Cambiar" : "Configurar"} PIN
                          </Button>
                          {admin.admin_pin && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => resetPIN(admin.id)}
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
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
                onChange={(e) => setNewPin(e.target.value.slice(0, 4))}
                placeholder="0000"
                maxLength={4}
                pattern="\d{4}"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pin">Confirmar PIN</Label>
              <Input
                id="confirm-pin"
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.slice(0, 4))}
                placeholder="0000"
                maxLength={4}
                pattern="\d{4}"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    savePIN();
                  }
                }}
              />
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Importante:</strong> Este PIN será requerido para realizar acciones críticas
                como el borrado permanente de elementos de la papelera.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={savePIN} disabled={!newPin || !confirmPin}>
              Guardar PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
