import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function Coupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: 0,
    min_purchase: 0,
    max_uses: null as number | null,
    expires_at: "",
    is_active: true,
    points_required: null as number | null,
    product_id: null as string | null,
    is_loyalty_reward: false
  });
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    loadCoupons();
    loadProducts();

    // Realtime subscription
    const channel = supabase
      .channel('coupons-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'coupons'
      }, () => {
        loadCoupons();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select(`
          *,
          product:products(name)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      toast.error("Error al cargar cupones");
    } finally {
      setLoading(false);
    }
  };

  const createCoupon = async () => {
    if (!newCoupon.code.trim()) {
      toast.error("El código del cupón es obligatorio");
      return;
    }

    if (newCoupon.discount_type !== "free_shipping" && newCoupon.discount_value <= 0) {
      toast.error("El valor del descuento debe ser mayor a 0");
      return;
    }

    try {
      const couponData = {
          ...newCoupon,
          discount_value: newCoupon.discount_type === "free_shipping" ? 0 : newCoupon.discount_value,
          expires_at: newCoupon.expires_at || null
        };

      const { error } = await supabase
        .from("coupons")
        .insert([couponData]);

      if (error) {
        if (error.code === '23505') {
          toast.error("Ya existe un cupón con ese código");
          return;
        }
        throw error;
      }
      toast.success("Cupón creado exitosamente");
      setNewCoupon({
        code: "",
        discount_type: "percentage",
        discount_value: 0,
        min_purchase: 0,
        max_uses: null,
        expires_at: "",
        is_active: true,
        points_required: null,
        product_id: null,
        is_loyalty_reward: false
      });
    } catch (error: any) {
      console.error("Error creating coupon:", error);
      toast.error("Error al crear cupón: " + (error.message || "Error desconocido"));
    }
  };

  const toggleCoupon = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
      await loadCoupons();
    } catch (error) {
      toast.error("Error al actualizar cupón");
    }
  };

  const openEditDialog = (coupon: any) => {
    setEditingCoupon({
      ...coupon,
      expires_at: coupon.expires_at ? new Date(coupon.expires_at).toISOString().split('T')[0] : ''
    });
    setIsEditDialogOpen(true);
  };

  const updateCoupon = async () => {
    if (!editingCoupon?.code.trim()) {
      toast.error("El código del cupón es obligatorio");
      return;
    }

    if (editingCoupon.discount_type !== "free_shipping" && editingCoupon.discount_value <= 0) {
      toast.error("El valor del descuento debe ser mayor a 0");
      return;
    }

    try {
      const { error } = await supabase
        .from("coupons")
        .update({
          code: editingCoupon.code,
          discount_type: editingCoupon.discount_type,
          discount_value: editingCoupon.discount_type === "free_shipping" ? 0 : editingCoupon.discount_value,
          min_purchase: editingCoupon.min_purchase,
          max_uses: editingCoupon.max_uses,
          expires_at: editingCoupon.expires_at || null,
          is_active: editingCoupon.is_active,
          points_required: editingCoupon.points_required,
          product_id: editingCoupon.product_id,
          is_loyalty_reward: editingCoupon.is_loyalty_reward
        })
        .eq("id", editingCoupon.id);

      if (error) {
        if (error.code === '23505') {
          toast.error("Ya existe un cupón con ese código");
          return;
        }
        throw error;
      }
      
      toast.success("Cupón actualizado exitosamente");
      setIsEditDialogOpen(false);
      setEditingCoupon(null);
      await loadCoupons();
    } catch (error: any) {
      console.error("Error updating coupon:", error);
      toast.error("Error al actualizar cupón: " + (error.message || "Error desconocido"));
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este cupón?")) return;

    try {
      const { error } = await supabase
        .from("coupons")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast.success("Cupón eliminado exitosamente");
      await loadCoupons();
    } catch (error) {
      toast.error("Error al eliminar cupón");
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Gestión de Cupones</h1>

      <Card>
        <CardHeader>
          <CardTitle>Cupones de Descuento</CardTitle>
          <CardDescription>Crea y gestiona códigos de descuento para tus clientes</CardDescription>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Crear Cupón</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nuevo Cupón</DialogTitle>
                <DialogDescription>Configura un nuevo código de descuento</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Código</Label>
                  <Input
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    placeholder="DESCUENTO10"
                  />
                </div>
                
                <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                  <Switch
                    checked={newCoupon.is_loyalty_reward}
                    onCheckedChange={(checked) => setNewCoupon({ ...newCoupon, is_loyalty_reward: checked })}
                  />
                  <Label className="cursor-pointer">Recompensa de Programa de Lealtad</Label>
                </div>

                {newCoupon.is_loyalty_reward && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
                    <div>
                      <Label>Puntos Requeridos *</Label>
                      <Input
                        type="number"
                        value={newCoupon.points_required || ""}
                        onChange={(e) => setNewCoupon({ ...newCoupon, points_required: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="Ej: 200"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Los usuarios podrán canjear este cupón al alcanzar esta cantidad de puntos
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Producto Específico (opcional)</Label>
                  <Select
                    value={newCoupon.product_id || undefined}
                    onValueChange={(value) => setNewCoupon({ ...newCoupon, product_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Aplicar a todos los productos" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Si se selecciona, el cupón solo será válido para este producto
                  </p>
                </div>

                <div>
                  <Label>Tipo de Descuento</Label>
                  <Select
                    value={newCoupon.discount_type}
                    onValueChange={(value) => setNewCoupon({ ...newCoupon, discount_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                      <SelectItem value="fixed">Monto Fijo ($)</SelectItem>
                      <SelectItem value="free_shipping">Envío Gratis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newCoupon.discount_type !== "free_shipping" && (
                <div>
                  <Label>Valor del Descuento</Label>
                  <Input
                    type="number"
                    value={newCoupon.discount_value}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                    placeholder="Ej: 10"
                  />
                </div>
                )}
                <div>
                  <Label>Compra Mínima</Label>
                  <Input
                    type="number"
                    value={newCoupon.min_purchase}
                    onChange={(e) => setNewCoupon({ ...newCoupon, min_purchase: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                    placeholder="Ej: 50"
                  />
                </div>
                <div>
                  <Label>Usos Máximos (opcional)</Label>
                  <Input
                    type="number"
                    value={newCoupon.max_uses || ""}
                    onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Ej: 100"
                  />
                </div>
                <div>
                  <Label>Fecha de Expiración (opcional)</Label>
                  <Input
                    type="date"
                    value={newCoupon.expires_at}
                    onChange={(e) => setNewCoupon({ ...newCoupon, expires_at: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Activo</Label>
                  <Switch
                    checked={newCoupon.is_active}
                    onCheckedChange={(checked) => setNewCoupon({ ...newCoupon, is_active: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createCoupon}>Crear Cupón</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Puntos</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono font-bold">
                    {coupon.code}
                    {coupon.is_loyalty_reward && (
                      <span className="ml-2 text-xs text-primary">🎁 Lealtad</span>
                    )}
                  </TableCell>
                  <TableCell>{coupon.discount_type}</TableCell>
                  <TableCell>
                    {coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : 
                     coupon.discount_type === "free_shipping" ? "Envío Gratis" : 
                     `€${coupon.discount_value}`}
                  </TableCell>
                  <TableCell>
                    {coupon.product ? coupon.product.name : "Todos"}
                  </TableCell>
                  <TableCell>
                    {coupon.points_required ? `${coupon.points_required} pts` : "-"}
                  </TableCell>
                  <TableCell>
                    {coupon.times_used} / {coupon.max_uses || "∞"}
                  </TableCell>
                  <TableCell>{coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : "Nunca"}</TableCell>
                  <TableCell>{coupon.is_active ? "Activo" : "Inactivo"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(coupon)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleCoupon(coupon.id, coupon.is_active)}
                      >
                        {coupon.is_active ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteCoupon(coupon.id)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Cupón</DialogTitle>
            <DialogDescription>Modifica la configuración del cupón</DialogDescription>
          </DialogHeader>
          {editingCoupon && (
            <div className="space-y-4">
              <div>
                <Label>Código</Label>
                <Input
                  value={editingCoupon.code}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                  placeholder="DESCUENTO10"
                />
              </div>
              
              <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                <Switch
                  checked={editingCoupon.is_loyalty_reward}
                  onCheckedChange={(checked) => setEditingCoupon({ ...editingCoupon, is_loyalty_reward: checked })}
                />
                <Label className="cursor-pointer">Recompensa de Programa de Lealtad</Label>
              </div>

              {editingCoupon.is_loyalty_reward && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
                  <div>
                    <Label>Puntos Requeridos *</Label>
                    <Input
                      type="number"
                      value={editingCoupon.points_required || ""}
                      onChange={(e) => setEditingCoupon({ ...editingCoupon, points_required: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Ej: 200"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Los usuarios podrán canjear este cupón al alcanzar esta cantidad de puntos
                    </p>
                  </div>
                </div>
              )}

              <div>
                <Label>Producto Específico (opcional)</Label>
                <Select
                  value={editingCoupon.product_id || undefined}
                  onValueChange={(value) => setEditingCoupon({ ...editingCoupon, product_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aplicar a todos los productos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los productos</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo de Descuento</Label>
                <Select
                  value={editingCoupon.discount_type}
                  onValueChange={(value) => setEditingCoupon({ ...editingCoupon, discount_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                    <SelectItem value="fixed">Monto Fijo ($)</SelectItem>
                    <SelectItem value="free_shipping">Envío Gratis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {editingCoupon.discount_type !== "free_shipping" && (
              <div>
                <Label>Valor del Descuento</Label>
                <Input
                  type="number"
                  value={editingCoupon.discount_value}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, discount_value: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  placeholder="Ej: 10"
                />
              </div>
              )}
              
              <div>
                <Label>Compra Mínima</Label>
                <Input
                  type="number"
                  value={editingCoupon.min_purchase}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, min_purchase: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  placeholder="Ej: 50"
                />
              </div>
              
              <div>
                <Label>Usos Máximos (opcional)</Label>
                <Input
                  type="number"
                  value={editingCoupon.max_uses || ""}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Ej: 100"
                />
              </div>
              
              <div>
                <Label>Fecha de Expiración (opcional)</Label>
                <Input
                  type="date"
                  value={editingCoupon.expires_at}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, expires_at: e.target.value })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Activo</Label>
                <Switch
                  checked={editingCoupon.is_active}
                  onCheckedChange={(checked) => setEditingCoupon({ ...editingCoupon, is_active: checked })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={updateCoupon}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
