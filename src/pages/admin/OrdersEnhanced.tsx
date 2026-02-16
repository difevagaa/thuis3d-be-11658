import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { sendGiftCardActivationNotification, syncInvoiceStatusWithOrder } from '@/lib/paymentUtils';
import { Package, Truck, CheckCircle, XCircle, Clock, AlertCircle, ExternalLink, Copy, Search, Filter, RefreshCw } from "lucide-react";
import { useStatusTransitionRules } from "@/hooks/useStatusTransitionRules";
import { useContextualHelp } from "@/hooks/useContextualHelp";
import { SmartStatusDialog } from "@/components/admin/SmartStatusDialog";
import { HelpSidebar } from "@/components/admin/HelpSidebar";
import { ContextualHelpButton } from "@/components/admin/ContextualHelpButton";
import { validateURL, sanitizeURL, isSafeURL } from "@/lib/validation";

// Popular carriers with tracking URL templates
const CARRIERS = [
  { name: "Bpost", trackingTemplate: "https://track.bpost.cloud/btr/web/#/search?itemCode=" },
  { name: "PostNL", trackingTemplate: "https://postnl.nl/tracktrace/?B=&P=&D=&T=&L=" },
  { name: "DHL", trackingTemplate: "https://www.dhl.com/en/express/tracking.html?AWB=" },
  { name: "GLS", trackingTemplate: "https://gls-group.eu/BE/nl/pakket-volgen?match=" },
  { name: "UPS", trackingTemplate: "https://www.ups.com/track?loc=en_US&tracknum=" },
  { name: "FedEx", trackingTemplate: "https://www.fedex.com/apps/fedextrack/?action=track&trackingnumber=" },
  { name: "DPD", trackingTemplate: "https://tracking.dpd.de/status/en_US/parcel/" },
  { name: "Mondial Relay", trackingTemplate: "https://www.mondialrelay.be/nl-BE/suivi-de-colis?numColis=" },
  { name: "Otro", trackingTemplate: "" }
];

export default function OrdersEnhanced() {
  const [orders, setOrders] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Tracking fields
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [carrierName, setCarrierName] = useState("");
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("");
  const [packageCount, setPackageCount] = useState(1);
  const [weightKg, setWeightKg] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [newPaymentStatus, setNewPaymentStatus] = useState("");
  const [saving, setSaving] = useState(false);

  // Smart help system
  const { checkTransition, applyRuleAction, trackRuleInteraction } = useStatusTransitionRules();
  const { helps, trackHelpViewed, trackHelpClicked, trackHelpDismissed, trackHelpHelpful } = useContextualHelp('orders');
  const [pendingTransitionRule, setPendingTransitionRule] = useState<any>(null);
  const [showSmartDialog, setShowSmartDialog] = useState(false);

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
            user:profiles!orders_user_id_fkey(full_name, email, preferred_language),
            status:order_statuses(name, color)
          `)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase.from("order_statuses").select("*").is("deleted_at", null)
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (statusesRes.error) throw statusesRes.error;

      setOrders(ordersRes.data ?? []);
      setStatuses(statusesRes.data ?? []);
    } catch (error) {
      toast.error("Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (order: any) => {
    setEditingOrder(order);
    setSelectedStatus(order.status_id || "");
    setTrackingNumber(order.tracking_number || "");
    setTrackingUrl(order.tracking_url || "");
    setCarrierName(order.carrier_name || "");
    setEstimatedDeliveryDate(order.estimated_delivery_date || "");
    setPackageCount(order.package_count || 1);
    setWeightKg(order.weight_kg?.toString() || "");
    setRejectionReason(order.rejection_reason || "");
    setAdminNotes(order.admin_notes || "");
    setNewPaymentStatus(order.payment_status || "pending");
  };

  const closeEditDialog = () => {
    setEditingOrder(null);
    setSelectedStatus("");
    setTrackingNumber("");
    setTrackingUrl("");
    setCarrierName("");
    setEstimatedDeliveryDate("");
    setPackageCount(1);
    setWeightKg("");
    setRejectionReason("");
    setAdminNotes("");
    setNewPaymentStatus("");
  };

  const handleCarrierChange = (carrier: string) => {
    setCarrierName(carrier);
    const carrierData = CARRIERS.find(c => c.name === carrier);
    if (carrierData && carrierData.trackingTemplate && trackingNumber) {
      setTrackingUrl(carrierData.trackingTemplate + trackingNumber);
    }
  };

  const handleTrackingNumberChange = (number: string) => {
    setTrackingNumber(number);
    if (carrierName) {
      const carrierData = CARRIERS.find(c => c.name === carrierName);
      if (carrierData && carrierData.trackingTemplate) {
        setTrackingUrl(carrierData.trackingTemplate + number);
      }
    }
  };

  const getSelectedStatusSlug = () => {
    const status = statuses.find(s => s.id === selectedStatus);
    return status?.name?.toLowerCase() || "";
  };

  const isShippedStatus = () => {
    const slug = getSelectedStatusSlug();
    return slug.includes('enviado') || slug.includes('shipped') || slug.includes('verzonden') || slug.includes('en camino');
  };

  const isDeliveredStatus = () => {
    const slug = getSelectedStatusSlug();
    return slug.includes('entregado') || slug.includes('delivered') || slug.includes('afgeleverd') || slug.includes('completado');
  };

  const isRejectedStatus = () => {
    const slug = getSelectedStatusSlug();
    return slug.includes('rechazado') || slug.includes('rejected') || slug.includes('afgewezen') || slug.includes('cancelado') || slug.includes('cancelled');
  };

  const updateOrderStatus = async (skipTransitionCheck = false) => {
    if (!editingOrder) return;
    setSaving(true);

    try {
      const oldPaymentStatus = editingOrder.payment_status;
      const oldStatusName = editingOrder.status?.name;
      const oldStatusId = editingOrder.status_id;

      // Check for transition rules before updating
      if (!skipTransitionCheck) {
        // Check if order status changed
        if (selectedStatus && selectedStatus !== oldStatusId) {
          const statusName = statuses.find(s => s.id === selectedStatus)?.name || '';
          const transitionCheck = await checkTransition(
            'order',
            editingOrder.id,
            'orders',
            oldStatusId,
            statusName,
            'order_status'
          );

          if (transitionCheck.shouldPrompt && transitionCheck.rules.length > 0) {
            // Show smart dialog for the first rule
            setPendingTransitionRule({
              rule: transitionCheck.rules[0],
              context: 'order_status'
            });
            setShowSmartDialog(true);
            setSaving(false);
            return; // Exit and wait for user decision
          }
        }

        // Check if payment status changed
        if (newPaymentStatus && newPaymentStatus !== oldPaymentStatus) {
          const transitionCheck = await checkTransition(
            'order',
            editingOrder.id,
            'orders',
            oldPaymentStatus,
            newPaymentStatus,
            'payment_status'
          );

          if (transitionCheck.shouldPrompt && transitionCheck.rules.length > 0) {
            // Show smart dialog for the first rule
            setPendingTransitionRule({
              rule: transitionCheck.rules[0],
              context: 'payment_status'
            });
            setShowSmartDialog(true);
            setSaving(false);
            return; // Exit and wait for user decision
          }
        }
      }
      
      // Build update object
      const updates: any = {
        admin_notes: adminNotes || null
      };
      
      if (selectedStatus) {
        updates.status_id = selectedStatus;
      }
      
      if (newPaymentStatus) {
        updates.payment_status = newPaymentStatus;
      }

      // Add tracking info if shipping
      if (isShippedStatus()) {
        updates.tracking_number = trackingNumber || null;
        
        // Validar y sanitizar tracking URL antes de guardar
        if (trackingUrl) {
          const sanitizedUrl = sanitizeURL(trackingUrl);
          if (!sanitizedUrl) {
            toast.error("La URL de seguimiento contiene patrones no seguros y fue rechazada");
            setLoading(false);
            return;
          }
          updates.tracking_url = sanitizedUrl;
        } else {
          updates.tracking_url = null;
        }
        
        updates.carrier_name = carrierName || null;
        updates.estimated_delivery_date = estimatedDeliveryDate || null;
        updates.package_count = packageCount || 1;
        updates.weight_kg = weightKg ? parseFloat(weightKg) : null;
        updates.shipped_at = new Date().toISOString();
      }

      // Add delivered timestamp
      if (isDeliveredStatus()) {
        updates.delivered_at = new Date().toISOString();
      }

      // Add rejection reason
      if (isRejectedStatus()) {
        updates.rejection_reason = rejectionReason || null;
      }
      
      // Update order
      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", editingOrder.id);

      if (error) throw error;

      // Sync invoice payment status with order (bidirectional link)
      if (newPaymentStatus && newPaymentStatus !== oldPaymentStatus) {
        await syncInvoiceStatusWithOrder(editingOrder.id, newPaymentStatus);
        
        // Check and send gift card email if applicable when marking as paid
        if (newPaymentStatus === 'paid') {
          await checkAndSendGiftCardEmail(editingOrder.id);
        }
      }

      // If order status is cancelled/rejected, also cancel the invoice
      if (isRejectedStatus() && selectedStatus !== editingOrder.status_id) {
        await syncInvoiceStatusWithOrder(editingOrder.id, 'cancelled');
      }

      // Get new status name for email
      const newStatusData = statuses.find(s => s.id === selectedStatus);
      const newStatusName = newStatusData?.name || oldStatusName;

      // Send status update email with tracking info
      if (selectedStatus && selectedStatus !== editingOrder.status_id && editingOrder.user?.email) {
        try {
          await supabase.functions.invoke('send-order-status-email', {
            body: {
              to: editingOrder.user.email,
              order_number: editingOrder.order_number,
              old_status: oldStatusName || 'Pendiente',
              new_status: newStatusName || 'Actualizado',
              customer_name: editingOrder.user.full_name,
              language: editingOrder.user.preferred_language || 'nl',
              user_id: editingOrder.user_id,
              tracking_number: trackingNumber || null,
              tracking_url: trackingUrl || null,
              carrier_name: carrierName || null,
              estimated_delivery_date: estimatedDeliveryDate || null
            }
          });
          console.log('✅ Status email sent with tracking info');
        } catch (emailErr) {
          console.error('Error sending status email:', emailErr);
        }
      }

      toast.success("✅ Estado actualizado exitosamente");
      closeEditDialog();
      await loadData(); // Reload to show updated data
    } catch (error: any) {
      console.error("Error updating order:", error);
      toast.error("Error al actualizar estado: " + (error.message || "Error desconocido"));
    } finally {
      setSaving(false);
    }
  };

  // Handle smart dialog option selection
  const handleSmartDialogOption = async (option: string, reason?: string) => {
    if (!pendingTransitionRule || !editingOrder) return;

    const { rule, context } = pendingTransitionRule;
    const selectedOption = rule.options.find((opt: any) => opt.value === option);

    if (!selectedOption) {
      setShowSmartDialog(false);
      setPendingTransitionRule(null);
      return;
    }

    // Track that user completed the action
    await trackRuleInteraction(rule.id, 'completed');

    // Apply the suggested action
    if (selectedOption.action && selectedOption.action !== 'none') {
      const success = await applyRuleAction(
        editingOrder.id,
        'orders',
        selectedOption.action,
        rule.suggests_status_type,
        selectedOption.status || rule.suggests_status_value,
        rule.id
      );

      if (success) {
        // Update local state based on the action
        if (rule.suggests_status_type === 'payment_status') {
          setNewPaymentStatus(selectedOption.status || rule.suggests_status_value);
        } else if (rule.suggests_status_type === 'order_status') {
          const statusToSet = statuses.find(s => s.name === (selectedOption.status || rule.suggests_status_value));
          if (statusToSet) {
            setSelectedStatus(statusToSet.id);
          }
        }
      }
    }

    setShowSmartDialog(false);
    setPendingTransitionRule(null);
    
    // Now proceed with the update, skipping transition check
    await updateOrderStatus(true);
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
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status_id === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="p-4 md:p-6">Cargando...</div>;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-6">📦 Gestión de Pedidos</h1>

      {/* Actions and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Button onClick={() => window.location.href = "/admin/pedidos/crear"} className="w-full md:w-auto">
          ➕ Crear Pedido Manual
        </Button>
        
        <div className="flex-1 flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por número, cliente o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadData} size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{orders.filter(o => o.payment_status === 'pending').length}</p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Truck className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{orders.filter(o => o.status?.name?.toLowerCase().includes('enviado')).length}</p>
              <p className="text-sm text-muted-foreground">Enviados</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{orders.filter(o => o.payment_status === 'paid').length}</p>
              <p className="text-sm text-muted-foreground">Pagados</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{orders.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="px-4 md:px-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg md:text-xl">Pedidos Activos ({filteredOrders.length})</CardTitle>
              <CardDescription className="text-sm">Gestiona estados, tracking y envíos de tus clientes</CardDescription>
            </div>
            <HelpSidebar 
              helps={helps} 
              sectionName="Gestión de Pedidos"
              onViewed={trackHelpViewed}
              onFeedback={trackHelpHelpful}
            />
          </div>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow 
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => window.location.href = `/admin/pedidos/${order.id}`}
                  >
                    <TableCell className="font-mono font-semibold">{order.order_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.user?.full_name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">{order.user?.email || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-primary">€{Number(order.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        style={{ 
                          backgroundColor: order.status?.color ? `${order.status.color}20` : undefined,
                          borderColor: order.status?.color || undefined,
                          color: order.status?.color || undefined
                        }}
                      >
                        {order.status?.name || 'Sin estado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                        {order.payment_status === 'paid' ? '✅ Pagado' : 
                         order.payment_status === 'pending' ? '⏳ Pendiente' :
                         order.payment_status === 'failed' ? '❌ Fallido' :
                         order.payment_status === 'refunded' ? '↩️ Reembolsado' :
                         order.payment_status === 'cancelled' ? '🚫 Anulado' : '⏳ Pendiente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.tracking_number ? (
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">{order.tracking_number}</code>
                          {order.tracking_url && (
                            <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                              <ExternalLink className="h-4 w-4 text-primary" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{new Date(order.created_at).toLocaleDateString('es-ES')}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(order);
                        }}
                      >
                        ⚙️ Gestionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3 px-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-card border rounded-lg p-4 shadow-sm cursor-pointer active:bg-muted/50"
                onClick={() => window.location.href = `/admin/pedidos/${order.id}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-mono font-semibold text-sm">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                    {order.payment_status === 'paid' ? '✅ Pagado' : '⏳ Pendiente'}
                  </Badge>
                </div>
                <div className="space-y-1 mb-3">
                  <p className="text-sm font-medium">{order.user?.full_name || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground truncate">{order.user?.email || 'N/A'}</p>
                </div>
                {order.tracking_number && (
                  <div className="flex items-center gap-2 mb-3">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <code className="text-xs bg-muted px-2 py-1 rounded">{order.tracking_number}</code>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <p className="font-bold text-primary">€{Number(order.total).toFixed(2)}</p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-xs h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(order);
                    }}
                  >
                    ⚙️ Gestionar
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredOrders.length === 0 && (
            <p className="text-center text-muted-foreground py-8 px-4">No hay pedidos que coincidan con los filtros</p>
          )}
        </CardContent>
      </Card>

      {/* Edit Status Dialog - Comprehensive */}
      <Dialog open={!!editingOrder} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Gestionar Pedido #{editingOrder?.order_number}
            </DialogTitle>
            <DialogDescription>
              Cliente: {editingOrder?.user?.full_name} ({editingOrder?.user?.email})
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="status">Estado</TabsTrigger>
              <TabsTrigger value="shipping">Envío</TabsTrigger>
              <TabsTrigger value="notes">Notas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="status" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>📋 Estado del Pedido</Label>
                    {helps.find(h => h.title.includes('Estado') && h.title.includes('Cambio')) && (
                      <ContextualHelpButton 
                        help={helps.find(h => h.title.includes('Estado') && h.title.includes('Cambio'))!}
                        onViewed={trackHelpViewed}
                        onClicked={trackHelpClicked}
                        onDismissed={trackHelpDismissed}
                        onFeedback={trackHelpHelpful}
                        size="sm"
                      />
                    )}
                  </div>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: status.color || '#888' }}
                            />
                            {status.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>💳 Estado de Pago</Label>
                    {helps.find(h => h.title.includes('Pago')) && (
                      <ContextualHelpButton 
                        help={helps.find(h => h.title.includes('Pago'))!}
                        onViewed={trackHelpViewed}
                        onClicked={trackHelpClicked}
                        onDismissed={trackHelpDismissed}
                        onFeedback={trackHelpHelpful}
                        size="sm"
                      />
                    )}
                  </div>
                  <Select value={newPaymentStatus} onValueChange={setNewPaymentStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">⏳ Pendiente</SelectItem>
                      <SelectItem value="paid">✅ Pagado</SelectItem>
                      <SelectItem value="failed">❌ Fallido</SelectItem>
                      <SelectItem value="refunded">↩️ Reembolsado</SelectItem>
                      <SelectItem value="cancelled">🚫 Anulado</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Si marcas como "Pagado" y contiene tarjeta regalo, se enviará email automáticamente
                  </p>
                </div>
              </div>
              
              {/* Rejection reason - only show if rejected status */}
              {isRejectedStatus() && (
                <div className="space-y-2 p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                  <Label className="text-destructive">❌ Motivo del Rechazo/Cancelación</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explica el motivo del rechazo o cancelación..."
                    rows={3}
                  />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="shipping" className="space-y-4 mt-4">
              {isShippedStatus() || isDeliveredStatus() || editingOrder?.tracking_number ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>🚚 Transportista</Label>
                      <Select value={carrierName} onValueChange={handleCarrierChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona transportista" />
                        </SelectTrigger>
                        <SelectContent>
                          {CARRIERS.map((carrier) => (
                            <SelectItem key={carrier.name} value={carrier.name}>
                              {carrier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>📦 Número de Paquetes</Label>
                      <Input
                        type="number"
                        min={1}
                        value={packageCount}
                        onChange={(e) => setPackageCount(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>🔢 Número de Seguimiento (Tracking)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={trackingNumber}
                        onChange={(e) => handleTrackingNumberChange(e.target.value)}
                        placeholder="Ej: 323212345678901234"
                        className="font-mono"
                      />
                      {trackingNumber && (
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(trackingNumber)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>🔗 Enlace de Rastreo</Label>
                    <div className="flex gap-2">
                      <Input
                        value={trackingUrl}
                        onChange={(e) => setTrackingUrl(e.target.value)}
                        placeholder="https://track.carrier.com/..."
                      />
                      {trackingUrl && isSafeURL(trackingUrl) && (
                        <Button variant="outline" size="icon" asChild>
                          <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {trackingUrl && !isSafeURL(trackingUrl) && (
                        <Button variant="outline" size="icon" disabled title="URL no segura">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Se genera automáticamente al seleccionar transportista y número de tracking
                    </p>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>📅 Fecha Estimada de Entrega</Label>
                      <Input
                        type="date"
                        value={estimatedDeliveryDate}
                        onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>⚖️ Peso Total (kg)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        placeholder="0.000"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecciona un estado de envío (Enviado, En Camino, etc.) para configurar tracking</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="notes" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>📝 Notas del Administrador (internas)</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Notas internas sobre este pedido..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Estas notas solo son visibles para administradores
                </p>
              </div>
              
              {/* Order summary */}
              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">Resumen del Pedido</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Subtotal:</div><div className="text-right">€{Number(editingOrder?.subtotal || 0).toFixed(2)}</div>
                  <div>Envío:</div><div className="text-right">€{Number(editingOrder?.shipping || 0).toFixed(2)}</div>
                  <div>IVA:</div><div className="text-right">€{Number(editingOrder?.tax || 0).toFixed(2)}</div>
                  {editingOrder?.discount > 0 && (
                    <>
                      <div>Descuento:</div><div className="text-right text-green-600">-€{Number(editingOrder?.discount || 0).toFixed(2)}</div>
                    </>
                  )}
                  <div className="font-bold">Total:</div><div className="text-right font-bold text-primary">€{Number(editingOrder?.total || 0).toFixed(2)}</div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeEditDialog} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => updateOrderStatus(false)} disabled={saving}>
              {saving ? "Guardando..." : "💾 Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Smart Status Transition Dialog */}
      {pendingTransitionRule && (
        <SmartStatusDialog
          open={showSmartDialog}
          onOpenChange={setShowSmartDialog}
          rule={pendingTransitionRule.rule}
          onOptionSelected={handleSmartDialogOption}
          entityName={editingOrder?.order_number || 'pedido'}
        />
      )}
    </div>
  );
}