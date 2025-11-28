import { useState, useEffect } from "react";
import { logger } from '@/lib/logger';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { i18nToast } from "@/lib/i18nToast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Gift, TrendingUp, Users, Award, Plus, Minus } from "lucide-react";
import UserSearchSelector from "@/components/admin/UserSearchSelector";

export default function Loyalty() {
  const [settings, setSettings] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReward, setNewReward] = useState({
    name: "",
    points_required: 0,
    reward_value: 0,
    reward_type: "discount"
  });
  const [pointsAdjustment, setPointsAdjustment] = useState({
    user_id: "",
    points_change: 0,
    reason: ""
  });

  useEffect(() => {
    loadData();

    // Realtime subscriptions
    const settingsChannel = supabase
      .channel('loyalty-settings-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'loyalty_settings'
      }, () => {
        loadData();
      })
      .subscribe();

    const rewardsChannel = supabase
      .channel('loyalty-rewards-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'loyalty_rewards'
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(rewardsChannel);
    };
  }, []);

  const loadData = async () => {
    try {
      const { data: settingsData } = await supabase
        .from("loyalty_settings")
        .select("*")
        .maybeSingle();
      
      const { data: rewardsData } = await supabase
        .from("loyalty_rewards")
        .select("*")
        .is("deleted_at", null)
        .order("points_required");

      // Cargar usuarios con puntos
      const { data: usersData } = await supabase
        .from("loyalty_points")
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .order("points_balance", { ascending: false });

      // Cargar canjes recientes
      const { data: redemptionsData } = await supabase
        .from("loyalty_redemptions")
        .select(`
          *,
          profiles:user_id (full_name, email),
          loyalty_rewards:reward_id (name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      // Cargar ajustes recientes
      const { data: adjustmentsData } = await supabase
        .from("loyalty_adjustments")
        .select(`
          *,
          user:user_id (full_name, email),
          admin:admin_id (full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      setSettings(settingsData);
      setRewards(rewardsData || []);
      setUsers(usersData || []);
      setRedemptions(redemptionsData || []);
      setAdjustments(adjustmentsData || []);
    } catch (error) {
      logger.error("Error loading data:", error);
      i18nToast.error("error.loadingFailed");
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    try {
      const { error } = await supabase
        .from("loyalty_settings")
        .update({
          points_per_dollar: settings.points_per_dollar,
          is_enabled: settings.is_enabled
        })
        .eq("id", settings.id);

      if (error) throw error;
      i18nToast.success("success.configSaved");
      await loadData();
    } catch (error) {
      i18nToast.error("error.configSaveFailed");
    }
  };

  const createReward = async () => {
    if (!newReward.name.trim()) {
      i18nToast.error("error.rewardNameRequired");
      return;
    }

    if (newReward.points_required <= 0) {
      i18nToast.error("error.rewardPointsRequired");
      return;
    }

    if (newReward.reward_value <= 0) {
      i18nToast.error("error.rewardValueRequired");
      return;
    }

    try {
      const { error } = await supabase
        .from("loyalty_rewards")
        .insert([newReward]);

      if (error) throw error;
      i18nToast.success("success.rewardCreated");
      setNewReward({ name: "", points_required: 0, reward_value: 0, reward_type: "discount" });
      await loadData();
    } catch (error: any) {
      logger.error("Error creating reward:", error);
      toast.error("Error al crear recompensa: " + (error.message || "Error desconocido"));
    }
  };

  const toggleReward = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("loyalty_rewards")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      toast.error("Error al actualizar recompensa");
    }
  };

  const adjustPoints = async () => {
    if (!pointsAdjustment.user_id) {
      i18nToast.error("error.selectUser");
      return;
    }

    if (pointsAdjustment.points_change === 0) {
      i18nToast.error("error.adjustmentCannotBeZero");
      return;
    }

    if (!pointsAdjustment.reason.trim()) {
      i18nToast.error("error.specifyReason");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.rpc('adjust_loyalty_points_manual', {
        p_user_id: pointsAdjustment.user_id,
        p_points_change: pointsAdjustment.points_change,
        p_reason: pointsAdjustment.reason,
        p_admin_id: user?.id
      });

      if (error) throw error;
      
      toast.success(`Puntos ${pointsAdjustment.points_change > 0 ? 'añadidos' : 'restados'} exitosamente`);
      setPointsAdjustment({ user_id: "", points_change: 0, reason: "" });
      await loadData();
    } catch (error: any) {
      logger.error("Error adjusting points:", error);
      toast.error(error.message || "Error al ajustar puntos");
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Sistema de Lealtad</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">con puntos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Puntos en Circulación</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.reduce((sum, u) => sum + (u.points_balance || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">puntos totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recompensas Activas</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rewards.filter(r => r.is_active).length}</div>
            <p className="text-xs text-muted-foreground">de {rewards.length} totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Canjes Totales</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{redemptions.length}</div>
            <p className="text-xs text-muted-foreground">recompensas canjeadas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
          <TabsTrigger value="points">Gestión de Puntos</TabsTrigger>
          <TabsTrigger value="rewards">Recompensas</TabsTrigger>
          <TabsTrigger value="redemptions">Canjes</TabsTrigger>
          <TabsTrigger value="adjustments">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Puntos</CardTitle>
              <CardDescription>Define cómo los clientes ganan puntos de lealtad</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">Sistema Activo</Label>
                <Switch
                  id="enabled"
                  checked={settings?.is_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, is_enabled: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="points">Puntos por Euro</Label>
                <p className="text-sm text-muted-foreground">
                  Define cuántos puntos recibe un cliente por cada euro gastado
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input
                      id="points"
                      type="number"
                      min="0"
                      step="0.1"
                      value={settings?.points_per_dollar || 1}
                      onChange={(e) => setSettings({ ...settings, points_per_dollar: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">puntos por cada 1€</span>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg mt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">1 euro gastado</span>
                    <span className="text-muted-foreground">=</span>
                    <span className="font-medium">{settings?.points_per_dollar || 1} punto{settings?.points_per_dollar > 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Los puntos se asignan automáticamente cuando un pedido o factura se marca como pagado
                  </p>
                </div>
              </div>
              <Button onClick={updateSettings}>Guardar Configuración</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="points">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ajustar Puntos */}
            <Card>
              <CardHeader>
                <CardTitle>Ajustar Puntos Manualmente</CardTitle>
                <CardDescription>Añade o resta puntos a usuarios específicos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <UserSearchSelector
                  value={pointsAdjustment.user_id}
                  onValueChange={(value) => setPointsAdjustment({ ...pointsAdjustment, user_id: value })}
                  label="Usuario"
                  placeholder="Buscar usuario por nombre o email..."
                  includePoints={true}
                />

                <div>
                  <Label>Ajuste de Puntos</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPointsAdjustment({ 
                        ...pointsAdjustment, 
                        points_change: Math.max(-10000, pointsAdjustment.points_change - 10)
                      })}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      className="text-center font-bold"
                      value={pointsAdjustment.points_change}
                      onChange={(e) => setPointsAdjustment({ 
                        ...pointsAdjustment, 
                        points_change: parseInt(e.target.value) || 0 
                      })}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPointsAdjustment({ 
                        ...pointsAdjustment, 
                        points_change: Math.min(10000, pointsAdjustment.points_change + 10)
                      })}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pointsAdjustment.points_change > 0 ? "Añadir" : "Restar"} {Math.abs(pointsAdjustment.points_change)} puntos
                  </p>
                </div>

                <div>
                  <Label>Razón del Ajuste</Label>
                  <Textarea
                    placeholder="Ej: Compensación por error en pedido anterior"
                    value={pointsAdjustment.reason}
                    onChange={(e) => setPointsAdjustment({ ...pointsAdjustment, reason: e.target.value })}
                  />
                </div>

                <Button 
                  onClick={adjustPoints}
                  className="w-full"
                  disabled={!pointsAdjustment.user_id || pointsAdjustment.points_change === 0}
                >
                  Aplicar Ajuste
                </Button>
              </CardContent>
            </Card>

            {/* Lista de Usuarios */}
            <Card>
              <CardHeader>
                <CardTitle>Usuarios con Puntos</CardTitle>
                <CardDescription>Top usuarios por balance de puntos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {users.slice(0, 20).map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{user.profiles?.full_name || "Usuario"}</p>
                        <p className="text-sm text-muted-foreground">{user.profiles?.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{user.points_balance}</p>
                        <p className="text-xs text-muted-foreground">pts actuales</p>
                        <p className="text-xs text-muted-foreground">{user.lifetime_points} histórico</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rewards">
          <Card>
            <CardHeader>
              <CardTitle>Recompensas</CardTitle>
              <CardDescription>Gestiona las recompensas disponibles</CardDescription>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Crear Recompensa</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nueva Recompensa</DialogTitle>
                    <DialogDescription>Crea una nueva recompensa para el programa de lealtad</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nombre</Label>
                      <Input
                        value={newReward.name}
                        onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Puntos Requeridos</Label>
                      <Input
                        type="number"
                        value={newReward.points_required}
                        onChange={(e) => setNewReward({ ...newReward, points_required: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                        placeholder="Ej: 100"
                      />
                    </div>
                    <div>
                      <Label>Valor de Recompensa</Label>
                      <Input
                        type="number"
                        value={newReward.reward_value}
                        onChange={(e) => setNewReward({ ...newReward, reward_value: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                        placeholder="Ej: 10"
                      />
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select
                        value={newReward.reward_type}
                        onValueChange={(value) => setNewReward({ ...newReward, reward_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="discount">Descuento (%)</SelectItem>
                          <SelectItem value="coupon">Cupón (€)</SelectItem>
                          <SelectItem value="free_shipping">Envío Gratis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={createReward}>Crear</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Puntos</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rewards.map((reward) => (
                    <TableRow key={reward.id}>
                      <TableCell>{reward.name}</TableCell>
                      <TableCell>{reward.points_required} pts</TableCell>
                      <TableCell>
                        {reward.reward_type === 'discount' ? `${reward.reward_value}%` : 
                         reward.reward_type === 'coupon' ? `€${reward.reward_value}` : 
                         'Envío Gratis'}
                      </TableCell>
                      <TableCell>
                        {reward.reward_type === 'discount' ? 'Descuento' : 
                         reward.reward_type === 'coupon' ? 'Cupón' : 
                         'Envío Gratis'}
                      </TableCell>
                      <TableCell>{reward.is_active ? "Activo" : "Inactivo"}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleReward(reward.id, reward.is_active)}
                        >
                          {reward.is_active ? "Desactivar" : "Activar"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redemptions">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Canjes</CardTitle>
              <CardDescription>Recompensas canjeadas por los usuarios</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Recompensa</TableHead>
                    <TableHead>Puntos</TableHead>
                    <TableHead>Cupón</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redemptions.map((redemption) => (
                    <TableRow key={redemption.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{redemption.profiles?.full_name || "Usuario"}</p>
                          <p className="text-xs text-muted-foreground">{redemption.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{redemption.loyalty_rewards?.name}</TableCell>
                      <TableCell className="font-mono">{redemption.points_spent}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {redemption.coupon_code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          redemption.status === 'active' ? 'default' :
                          redemption.status === 'used' ? 'secondary' : 'outline'
                        }>
                          {redemption.status === 'active' ? 'Activo' :
                           redemption.status === 'used' ? 'Usado' : 'Expirado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(redemption.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {redemptions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No hay canjes registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjustments">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Ajustes Manuales</CardTitle>
              <CardDescription>Auditoría de cambios de puntos realizados por administradores</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Ajuste</TableHead>
                    <TableHead>Razón</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map((adjustment) => (
                    <TableRow key={adjustment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{adjustment.user?.full_name || "Usuario"}</p>
                          <p className="text-xs text-muted-foreground">{adjustment.user?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={adjustment.points_change > 0 ? 'default' : 'destructive'}>
                          {adjustment.points_change > 0 ? '+' : ''}{adjustment.points_change} pts
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{adjustment.reason}</TableCell>
                      <TableCell className="text-xs">
                        {adjustment.admin?.email || 'Sistema'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(adjustment.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {adjustments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No hay ajustes registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
