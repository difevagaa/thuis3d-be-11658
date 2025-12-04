import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { sendGiftCardActivationNotification, updateInvoiceStatusOnOrderPaid } from '@/lib/paymentUtils';

export default function OrdersEnhanced() {
  const [orders, setOrders] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState("");

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
      toast.error("Error al cargar pedidos");
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

      toast.success("Estado actualizado exitosamente");
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

        toast.success("Email de tarjeta regalo enviado");
      }
    } catch (error) {
      console.error("Error processing gift card:", error);
      // Don't show error to user, gift card can be resent manually
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Gestión de Pedidos</h1>

      <div className="mb-6">
        <Button onClick={() => window.location.href = "/admin/pedidos/crear"}>
          Crear Pedido Manual
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos Activos</CardTitle>
          <CardDescription>Administra los pedidos de tus clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número de Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado de Pago</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow 
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => window.location.href = `/admin/pedidos/${order.id}`}
                >
                  <TableCell className="font-mono">{order.order_number}</TableCell>
                  <TableCell>
                    <div>
                      <div>{order.user?.full_name || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">{order.user?.email || 'N/A'}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">€{Number(order.total).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                      {order.payment_status === 'paid' ? 'Pagado' : 
                       order.payment_status === 'pending' ? 'Pendiente' :
                       order.payment_status === 'failed' ? 'Fallido' :
                       order.payment_status === 'refunded' ? 'Reembolsado' : 'Pendiente'}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(order.created_at).toLocaleDateString('es-ES')}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingOrder(order);
                        setSelectedStatus(order.status_id || "");
                      }}
                    >
                      Actualizar Estado
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {orders.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No hay pedidos todavía</p>
          )}
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
