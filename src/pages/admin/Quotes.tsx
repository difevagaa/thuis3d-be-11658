import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FilePlus, Pencil, Trash2, FileText, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkDeleteActions } from "@/components/admin/BulkDeleteActions";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { FieldHelp } from "@/components/admin/FieldHelp";
import { useMaterialColors } from "@/hooks/useMaterialColors";
import { sendNotificationWithBroadcast } from "@/lib/notificationUtils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Quotes() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuote, setEditingQuote] = useState<any>(null);
  
  const { materials, availableColors, filterColorsByMaterial } = useMaterialColors();
  
  const {
    selectedIds,
    toggleSelection,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isIndeterminate,
    selectedCount
  } = useBulkSelection(quotes);

  // Inicializar sin colores disponibles
  useEffect(() => {
    filterColorsByMaterial(null);
  }, []);

  useEffect(() => {
    loadData();

    // Realtime subscription
    const channel = supabase
      .channel('quotes-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'quotes'
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
      const [quotesData, statusesData, usersData] = await Promise.all([
        supabase
          .from("quotes")
          .select(`
            *,
            quote_statuses(name, color, slug),
            materials(name),
            colors(name, hex_code)
          `)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase.from("quote_statuses").select("*").is("deleted_at", null).order("name"),
        supabase.from("profiles").select("id, full_name, email, phone, address").order("full_name")
      ]);

      if (quotesData.error) throw quotesData.error;
      if (statusesData.error) throw statusesData.error;

      setQuotes(quotesData.data || []);
      setStatuses(statusesData.data || []);
      setUsers(usersData.data || []);
    } catch (error: any) {
      toast.error("Error al cargar cotizaciones");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuote = async () => {
    try {
      if (!editingQuote) return;

      const originalQuote = quotes.find(quote => quote.id === editingQuote.id);
      // Get status name to check if it's being approved
      const selectedStatus = statuses.find(s => s.id === editingQuote.status_id);
      const statusSlug = selectedStatus?.slug?.toLowerCase();
      const normalizedStatusName = selectedStatus?.name?.toLowerCase();
      const isApproving = statusSlug === 'approved' || normalizedStatusName === 'aprobado' || normalizedStatusName === 'aprobada' || normalizedStatusName === 'approved';
      const statusChanged = originalQuote?.status_id !== editingQuote.status_id;
      const priceChanged = Number(originalQuote?.estimated_price || 0) !== Number(editingQuote.estimated_price || 0);
      const nameChanged = originalQuote?.customer_name !== editingQuote.customer_name;
      const emailChanged = originalQuote?.customer_email !== editingQuote.customer_email;
      const descriptionChanged = originalQuote?.description !== editingQuote.description;
      const materialChanged = originalQuote?.material_id !== editingQuote.material_id;
      const colorChanged = originalQuote?.color_id !== editingQuote.color_id;
      const priceWasUnset = !originalQuote?.estimated_price || Number(originalQuote?.estimated_price) === 0;
      const priceNowSet = Number(editingQuote.estimated_price || 0) > 0;
      const isInitialPriceSetting = priceWasUnset && priceNowSet;
      const shouldNotifyCustomer = Boolean(
        originalQuote &&
        !isInitialPriceSetting &&
        (statusChanged ||
          nameChanged ||
          emailChanged ||
          descriptionChanged ||
          materialChanged ||
          colorChanged ||
          priceChanged)
      );
      const pendingApprovalByClient = Boolean(
        normalizedStatusName?.includes('aprobación') &&
        normalizedStatusName?.includes('cliente')
      );

      const { error } = await supabase
        .from("quotes")
        .update({
          customer_name: editingQuote.customer_name,
          customer_email: editingQuote.customer_email,
          description: editingQuote.description,
          estimated_price: editingQuote.estimated_price,
          status_id: editingQuote.status_id,
          material_id: editingQuote.material_id || null,
          color_id: editingQuote.color_id || null
        })
        .eq("id", editingQuote.id);

      if (error) throw error;

      if (shouldNotifyCustomer) {
        const notificationMessage = pendingApprovalByClient
          ? "¡Ey! Hay cambios en tu cotización y necesitamos tu aprobación."
          : "¡Ey! Hay cambios en tu cotización. Revisa los detalles.";

        if (editingQuote.user_id) {
          await sendNotificationWithBroadcast(
            editingQuote.user_id,
            "quote_update",
            "Cambios en tu cotización",
            notificationMessage,
            `/cotizacion/${editingQuote.id}`
          );
        }

        if (editingQuote.customer_email) {
          try {
            await supabase.functions.invoke("send-quote-update-email", {
              body: {
                to: editingQuote.customer_email,
                customer_name: editingQuote.customer_name,
                quote_type: editingQuote.quote_type,
                estimated_price: Number(editingQuote.estimated_price || 0),
                description: editingQuote.description || undefined
              }
            });
          } catch {
            // Email notification failures should not block quote updates
          }
        }
      }

      // If quote is being approved, trigger automation
      if (isApproving) {
        toast.info('Procesando aprobación y generando factura y pedido...');

        let automationSuccess = false;

        // Try edge function first
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', (await supabase.auth.getUser()).data.user?.id)
            .single();

          const { data, error: functionError } = await supabase.functions.invoke(
            'process-quote-approval',
            {
              body: {
                quote_id: editingQuote.id,
                status_name: selectedStatus?.name || '',
                status_slug: selectedStatus?.slug,
                admin_name: profile?.full_name || 'Administrador'
              }
            }
          );

          if (!functionError && data?.success) {
            automationSuccess = true;
            const automations = data.automations || {};
            
            let message = `✅ Cotización aprobada exitosamente`;
            if (data.invoice) {
              message += `\n📄 Factura ${data.invoice.invoice_number} generada (€${data.invoice.total.toFixed(2)})`;
            }
            if (data.order) {
              message += `\n📦 Pedido ${data.order.order_number} generado`;
            }
            if (automations.email_sent) {
              message += `\n📧 Cliente notificado por email`;
            }
            if (automations.customer_notified) {
              message += `\n🔔 Notificación enviada al panel del cliente`;
            }
            
            toast.success(message, { duration: 6000 });
          } else {
            console.error('Edge function error, falling back to client-side automation:', functionError || data?.error);
          }
        } catch (autoError) {
          console.error('Edge function exception, falling back to client-side automation:', autoError);
        }

        // Client-side fallback: create invoice and order directly
        if (!automationSuccess) {
          try {
            // Get full quote data
            const { data: fullQuote } = await supabase
              .from('quotes')
              .select('*')
              .eq('id', editingQuote.id)
              .single();

            if (fullQuote) {
              const subtotal = parseFloat(String(fullQuote.estimated_price || '0'));
              const shippingCost = parseFloat(String(fullQuote.shipping_cost || '0'));

              // Check tax settings
              const shouldApplyTax = fullQuote.tax_enabled ?? true;
              let taxRate = 0;
              if (shouldApplyTax) {
                const { data: taxEnabledSetting } = await supabase
                  .from('site_settings')
                  .select('setting_value')
                  .eq('setting_key', 'tax_rate')
                  .maybeSingle();
                taxRate = taxEnabledSetting ? parseFloat(String(taxEnabledSetting.setting_value)) : 0;
              }
              const tax = shouldApplyTax ? (subtotal * taxRate) / 100 : 0;
              const total = subtotal + tax + shippingCost;

              // Check if invoice already exists for this quote
              const { data: existingInvoice } = await supabase
                .from('invoices')
                .select('id, invoice_number')
                .eq('quote_id', editingQuote.id)
                .maybeSingle();

              let invoiceId = existingInvoice?.id;
              let invoiceNumber = existingInvoice?.invoice_number;

              // Create invoice if not exists
              if (!existingInvoice) {
                // Generate unique invoice number with retry
                let generatedNumber: string | null = null;
                for (let attempt = 0; attempt < 5; attempt++) {
                  const { data: rpcResult } = await supabase.rpc('generate_invoice_number');
                  let candidate = rpcResult;
                  
                  // If RPC fails, generate a random number with same format (L1N1L2N2L3N3)
                  if (!candidate) {
                    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                    candidate = 
                      letters[Math.floor(Math.random() * 26)] + Math.floor(Math.random() * 10) +
                      letters[Math.floor(Math.random() * 26)] + Math.floor(Math.random() * 10) +
                      letters[Math.floor(Math.random() * 26)] + Math.floor(Math.random() * 10);
                  }

                  // Check uniqueness
                  const { data: collision } = await supabase
                    .from('invoices')
                    .select('id')
                    .eq('invoice_number', candidate)
                    .maybeSingle();

                  if (!collision) {
                    generatedNumber = candidate;
                    break;
                  }
                }
                invoiceNumber = generatedNumber || `${Date.now()}`;

                const { data: newInvoice, error: invError } = await supabase
                  .from('invoices')
                  .insert({
                    invoice_number: invoiceNumber,
                    quote_id: editingQuote.id,
                    user_id: fullQuote.user_id,
                    issue_date: new Date().toISOString(),
                    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    payment_status: 'pending',
                    subtotal, tax, total,
                    notes: `Factura generada automáticamente para cotización ${fullQuote.quote_type}`,
                    shipping: shippingCost,
                    discount: 0
                  })
                  .select()
                  .single();

                if (invError) {
                  console.error('Error creating invoice:', invError);
                } else if (newInvoice) {
                  invoiceId = newInvoice.id;

                  await supabase.from('invoice_items').insert({
                    invoice_id: newInvoice.id,
                    product_name: `Cotización ${fullQuote.quote_type}`,
                    description: fullQuote.description || 'Servicio de impresión 3D',
                    quantity: 1,
                    unit_price: subtotal,
                    total_price: subtotal,
                    tax_enabled: shouldApplyTax
                  });
                }
              }

              // Check if order already exists for this quote
              const quoteMarker = `quote_id:${editingQuote.id}`;
              const { data: existingOrder } = await supabase
                .from('orders')
                .select('id, order_number')
                .ilike('admin_notes', `%${quoteMarker}%`)
                .maybeSingle();

              let orderData = existingOrder;

              // Create order if not exists
              if (!existingOrder) {
                // Get "Recibido" status
                const { data: orderStatus } = await supabase
                  .from('order_statuses')
                  .select('id')
                  .eq('name', 'Recibido')
                  .maybeSingle();

                let statusId = orderStatus?.id;
                if (!statusId) {
                  const { data: fallback } = await supabase
                    .from('order_statuses')
                    .select('id')
                    .order('name', { ascending: true })
                    .limit(1)
                    .maybeSingle();
                  statusId = fallback?.id || null;
                }

                const addressParts = [fullQuote.address, fullQuote.city, fullQuote.postal_code, fullQuote.country].filter(Boolean).join(', ');
                const quantity = fullQuote.quantity && fullQuote.quantity > 0 ? fullQuote.quantity : 1;
                const unitPrice = quantity > 0 ? subtotal / quantity : subtotal;
                const fileInfo = fullQuote.file_storage_path ? ` | Archivo: ${fullQuote.file_storage_path}` : '';
                const quoteNum = fullQuote.id ? ` #${fullQuote.id.substring(0, 8)}` : '';

                const { data: newOrder, error: orderError } = await supabase
                  .from('orders')
                  .insert({
                    user_id: fullQuote.user_id,
                    status_id: statusId,
                    subtotal, tax, discount: 0,
                    shipping: shippingCost, total,
                    notes: `Pedido generado automáticamente desde la cotización${quoteNum} (${fullQuote.quote_type})${fileInfo}`,
                    admin_notes: quoteMarker,
                    shipping_address: addressParts || null,
                    billing_address: addressParts || null,
                    payment_status: 'pending'
                  })
                  .select('id, order_number')
                  .single();

                if (orderError) {
                  console.error('Error creating order:', orderError);
                } else if (newOrder) {
                  orderData = newOrder;

                  await supabase.from('order_items').insert({
                    order_id: newOrder.id,
                    product_name: `Cotización ${fullQuote.quote_type}`,
                    quantity: quantity,
                    unit_price: unitPrice,
                    total_price: subtotal,
                    selected_material: fullQuote.material_id || null,
                    selected_color: fullQuote.color_id || null,
                    custom_text: fullQuote.description || null
                  });

                  // Link invoice to order
                  if (invoiceId) {
                    await supabase.from('invoices').update({ order_id: newOrder.id }).eq('id', invoiceId);
                  }
                }
              }

              let message = `✅ Cotización aprobada exitosamente`;
              if (invoiceNumber) {
                message += `\n📄 Factura ${invoiceNumber} generada (€${total.toFixed(2)})`;
              }
              if (orderData) {
                message += `\n📦 Pedido ${orderData.order_number} generado`;
              }
              toast.success(message, { duration: 6000 });
            }
          } catch (fallbackError) {
            console.error('Client-side automation fallback error:', fallbackError);
            toast.warning('Cotización aprobada, pero hubo problemas generando la factura y pedido automáticamente.');
          }
        }
      } else {
        toast.success("Cotización actualizada");
      }

      setEditingQuote(null);
      loadData();
    } catch (error: any) {
      toast.error("Error al actualizar cotización");
    }
  };

  const handleDeleteQuote = async (id: string, quoteName: string) => {
    // No need for confirm() - DeleteConfirmDialog handles it
    try {
      const { error } = await supabase
        .from("quotes")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast.success("Cotización movida a la papelera");
      await loadData();
    } catch (error: any) {
      toast.error("Error al eliminar cotización");
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`¿Mover ${selectedIds.size} cotizaciones a la papelera?`)) return;
    
    try {
      const idsToDelete = Array.from(selectedIds);
      const { error } = await supabase
        .from("quotes")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", idsToDelete);
      
      if (error) throw error;
      toast.success(`${idsToDelete.length} cotizaciones movidas a la papelera`);
      clearSelection();
      loadData();
    } catch (error: any) {
      toast.error("Error al eliminar cotizaciones: " + (error.message || "Error desconocido"));
    }
  };

  if (loading) return <div className="container mx-auto p-6">Cargando...</div>;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Gestión de Cotizaciones</h1>
          <p className="text-muted-foreground">Administra las cotizaciones de clientes</p>
        </div>
        <Button onClick={() => navigate("/admin/cotizaciones/crear")}>
          <FilePlus className="h-4 w-4 mr-2" />
          Crear Cotización Manual
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Cotizaciones</CardTitle>
          <CardDescription>
            Todas las cotizaciones enviadas por clientes y creadas manualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Seleccionar todos"
                    />
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Peso
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>Peso calculado del modelo 3D</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Tiempo
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>Tiempo estimado de impresión</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Precio Auto
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>Precio calculado automáticamente por el sistema</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Precio Est.
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>Precio estimado establecido manualmente por el administrador</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                      No hay cotizaciones registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  quotes.map((quote) => (
                    <TableRow 
                      key={quote.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/admin/cotizaciones/${quote.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected(quote.id)}
                          onCheckedChange={() => toggleSelection(quote.id)}
                          aria-label={`Seleccionar ${quote.customer_name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{quote.customer_name}</TableCell>
                      <TableCell>{quote.customer_email}</TableCell>
                      <TableCell>{quote.materials?.name || '-'}</TableCell>
                      <TableCell>
                        {quote.calculated_weight ? (
                          <span className="text-sm font-mono">{quote.calculated_weight.toFixed(1)}g</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {quote.calculated_time_estimate ? (
                          <span className="text-sm font-mono">
                            {Math.floor(quote.calculated_time_estimate)}h{Math.round((quote.calculated_time_estimate % 1) * 60)}m
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {quote.calculated_material_cost ? (
                          <span className="text-sm font-semibold text-green-600">
                            €{parseFloat(quote.calculated_material_cost).toFixed(2)}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {quote.estimated_price ? `€${quote.estimated_price.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            backgroundColor: quote.quote_statuses?.color || '#3b82f6',
                            color: 'white'
                          }}
                        >
                          {quote.quote_statuses?.name || 'Pendiente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(quote.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => navigate(`/admin/cotizaciones/${quote.id}`)}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver detalles completos</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setEditingQuote(quote)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar cotización</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <DeleteConfirmDialog
                            title="¿Eliminar esta cotización?"
                            itemName={`Cotización de ${quote.customer_name}`}
                            onConfirm={() => handleDeleteQuote(quote.id, quote.customer_name)}
                            trigger={
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                          />
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

      <BulkDeleteActions
        selectedCount={selectedCount}
        onDelete={handleBulkDelete}
        onCancel={clearSelection}
        itemName="cotizaciones"
      />

      {/* Edit Quote Dialog */}
      <Dialog open={!!editingQuote} onOpenChange={(open) => !open && setEditingQuote(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cotización</DialogTitle>
            <DialogDescription>
              Actualiza los detalles de la cotización
            </DialogDescription>
          </DialogHeader>
          
          {editingQuote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Cliente</Label>
                  <Input
                    value={editingQuote.customer_name}
                    onChange={(e) => setEditingQuote({ ...editingQuote, customer_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email del Cliente</Label>
                  <Input
                    type="email"
                    value={editingQuote.customer_email}
                    onChange={(e) => setEditingQuote({ ...editingQuote, customer_email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={editingQuote.description || ""}
                  onChange={(e) => setEditingQuote({ ...editingQuote, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Precio Estimado (€)
                    <FieldHelp content="Precio final que se cobrará al cliente. Puede ser diferente del precio calculado automáticamente." />
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingQuote.estimated_price || ''}
                    onChange={(e) => setEditingQuote({ ...editingQuote, estimated_price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                    placeholder="Ej: 125.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Estado
                    <FieldHelp content="Cambiar a 'Aprobado' generará automáticamente una factura y un pedido." />
                  </Label>
                  <Select
                    value={editingQuote.status_id}
                    onValueChange={(value) => setEditingQuote({ ...editingQuote, status_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingQuote(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateQuote}>
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
