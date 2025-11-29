import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { i18nToast, toast } from "@/lib/i18nToast";
import { sendGiftCardActivationNotification, updateInvoiceStatusOnOrderPaid } from '@/lib/paymentUtils';
import { AdminPageHeader, AdminStatCard } from "@/components/admin/AdminPageHeader";
import { Plus, Search, ShoppingCart, Eye, Pencil } from "lucide-react";

export default function OrdersEnhanced() {
  const [orders, setOrders] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();

    // Realtime subscription
    const channel = supabase
      .channel('orders-enhanced-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      const [ordersRes, statusesRes] = await Promise.all([
        supabase
          .from("orders")
          .select(`
            *,
            user:profiles!orders_user_id_fkey(full_name, email),
            status:order_statuses(name, color)
          `)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase.from("order_statuses").select("*").is("deleted_at", null)
      ]);

      setOrders(ordersRes.data || []);
      setStatuses(statusesRes.data || []);
    } catch (error) {
      i18nToast.error("error.ordersLoadFailed");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newPaymentStatus?: string) => {
    if (!editingOrder) return;

    try {
      const oldStatus = editingOrder.payment_status;
      
      // Determine what to update
      const updates: any = {};
      
      if (selectedStatus) {
        updates.status_id = selectedStatus;
      }
      
      if (newPaymentStatus) {
        updates.payment_status = newPaymentStatus;
      }
      
      // Update order
      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", editingOrder.id);

      if (error) throw error;

      // If marking as paid, also update the associated invoice
      if (newPaymentStatus === 'paid' && oldStatus !== 'paid') {
        await updateInvoiceStatusOnOrderPaid(editingOrder.id);
        
        // Check and send gift card email if applicable
        await checkAndSendGiftCardEmail(editingOrder.id);
      }

      i18nToast.success("success.statusUpdated");
      setEditingOrder(null);
      setSelectedStatus("");
    } catch (error: any) {
      console.error("Error updating order:", error);
      toast.error("Error al actualizar estado: " + (error.message || "Error desconocido"));
    }
  };

  const checkAndSendGiftCardEmail = async (orderId: string) => {
    try {
      // Check if order has gift card items
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      const giftCardItem = items?.find(item => 
        item.product_name?.toLowerCase().includes('gift card') || 
        item.product_name?.toLowerCase().includes('tarjeta regalo')
      );

      if (!giftCardItem) return;

      // Look for or create gift card
      const { data: order } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId)
        .single();

      if (!order) return;

      // Get user profile for email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", order.user_id)
        .single();

      const recipientEmail = profile?.email || "";
      if (!recipientEmail) return;

      // Check if gift card already exists for this order
      let { data: existingCard } = await supabase
        .from("gift_cards")
        .select("*")
        .eq("recipient_email", recipientEmail)
        .eq("initial_amount", giftCardItem.total_price)
        .maybeSingle();

      if (!existingCard) {
        // Create new gift card
        const { data: giftCard, error: gcError } = await supabase.rpc('generate_gift_card_code');
        
        if (gcError) {
          console.error("Error generating code:", gcError);
          return;
        }

        const code = typeof giftCard === 'string' ? giftCard : 'XXXX-XXXX-XXXX-XXXX';

        const { data: newCard, error: insertError } = await supabase
          .from("gift_cards")
          .insert([{
            code,
            recipient_email: recipientEmail,
            sender_name: "Thuis3d.be",
            initial_amount: giftCardItem.total_price,
            current_balance: giftCardItem.total_price,
            message: "¡Gracias por tu compra!",
            is_active: true
          }])
          .select()
          .single();

        if (insertError) {
          console.error("Error creating gift card:", insertError);
          return;
        }

        existingCard = newCard;
      }

      if (existingCard) {
        // Send email
        await supabase.functions.invoke('send-gift-card-email', {
          body: {
            recipient_email: existingCard.recipient_email,
            sender_name: existingCard.sender_name || "Thuis3d.be",
            gift_card_code: existingCard.code,
            amount: existingCard.initial_amount,
            message: existingCard.message
          }
        });

        // Send in-app notification to recipient if they have an account
        await sendGiftCardActivationNotification(existingCard.recipient_email, {
          initial_amount: existingCard.initial_amount,
          sender_name: existingCard.sender_name
        });

        i18nToast.success("success.giftCardEmailSent");
      }
    } catch (error) {
      console.error("Error processing gift card:", error);
      // Don't show error to user, gift card can be resent manually
    }
  };

  // Filter orders based on search term
  const filteredOrders = orders.filter(order => 
    order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const paidOrders = orders.filter(o => o.payment_status === 'paid' || o.payment_status === 'completed');
  const pendingOrders = orders.filter(o => o.payment_status === 'pending');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center animate-pulse">
            <ShoppingCart className="h-6 w-6 text-white" />
          </div>
          <p className="text-muted-foreground">Cargando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <AdminPageHeader
        title="Gestión de Pedidos"
        description="Administra todos los pedidos de tus clientes"
        emoji="🛒"
        gradient="from-orange-500 to-amber-600"
        actions={
          <Button 
            onClick={() => window.location.href = "/admin/pedidos/crear"}
            className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Pedido
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <AdminStatCard
          title="Total Pedidos"
          value={orders.length}
          emoji="📦"
          gradient="from-orange-500/10 to-amber-500/5"
        />
        <AdminStatCard
          title="Pedidos Pagados"
          value={paidOrders.length}
          emoji="✅"
          gradient="from-green-500/10 to-emerald-500/5"
        />
        <AdminStatCard
          title="Pendientes de Pago"
          value={pendingOrders.length}
          emoji="⏳"
          gradient="from-yellow-500/10 to-amber-500/5"
        />
        <AdminStatCard
          title="Ingresos Totales"
          value={`€${totalRevenue.toFixed(2)}`}
          emoji="💰"
          gradient="from-blue-500/10 to-indigo-500/5"
        />
      </div>

      {/* Search and Filters */}
      <Card className="mb-6 border-border/50">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número de pedido, cliente o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline" className="h-10 px-4 flex items-center gap-2">
              <span>📊</span>
              <span>{filteredOrders.length} de {orders.length} pedidos</span>
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/50 bg-muted/30">
          <CardTitle className="flex items-center gap-2">
            <span>📋</span>
            Lista de Pedidos
          </CardTitle>
          <CardDescription>
            Haz clic en un pedido para ver más detalles
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="font-semibold">Nº Pedido</TableHead>
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Total</TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
                <TableHead className="font-semibold">Fecha</TableHead>
                <TableHead className="font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-4xl">📦</span>
                      <p className="text-muted-foreground">
                        {searchTerm ? "No se encontraron pedidos con ese criterio" : "No hay pedidos todavía"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow 
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => window.location.href = `/admin/pedidos/${order.id}`}
                  >
                    <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.user?.full_name || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">{order.user?.email || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-green-600">€{Number(order.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={order.payment_status === 'paid' ? 'default' : 'secondary'}
                        className={
                          order.payment_status === 'paid' 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0' 
                            : order.payment_status === 'pending'
                            ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0'
                            : order.payment_status === 'failed'
                            ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white border-0'
                            : ''
                        }
                      >
                        {order.payment_status === 'paid' ? '✅ Pagado' : 
                         order.payment_status === 'pending' ? '⏳ Pendiente' :
                         order.payment_status === 'failed' ? '❌ Fallido' :
                         order.payment_status === 'refunded' ? '↩️ Reembolsado' : '⏳ Pendiente'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleDateString('es-ES')}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/admin/pedidos/${order.id}`;
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingOrder(order);
                            setSelectedStatus(order.status_id || "");
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Status Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar Estado del Pedido</DialogTitle>
            <DialogDescription>
              Pedido: {editingOrder?.order_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Estado del Pedido</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado de Pago</Label>
              <Select 
                value={editingOrder?.payment_status || 'pending'} 
                onValueChange={(value) => {
                  setEditingOrder({ ...editingOrder, payment_status: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="paid">Pagado</SelectItem>
                  <SelectItem value="failed">Fallido</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Si marcas como "Pagado" y el pedido contiene una tarjeta regalo, se enviará automáticamente el email
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOrder(null)}>
              Cancelar
            </Button>
            <Button onClick={() => updateOrderStatus(editingOrder?.payment_status)}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
