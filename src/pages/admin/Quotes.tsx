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
import { FilePlus, Pencil, Trash2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkDeleteActions } from "@/components/admin/BulkDeleteActions";
import { useMaterialColors } from "@/hooks/useMaterialColors";
import { sendNotificationWithBroadcast } from "@/lib/notificationUtils";

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
      const isApproving = statusSlug === 'approved' || normalizedStatusName === 'aprobado' || normalizedStatusName === 'aprobada';
      const statusChanged = originalQuote?.status_id !== editingQuote.status_id;
      const priceChanged = Number(originalQuote?.estimated_price || 0) !== Number(editingQuote.estimated_price || 0);
      const nameChanged = originalQuote?.customer_name !== editingQuote.customer_name;
      const emailChanged = originalQuote?.customer_email !== editingQuote.customer_email;
      const descriptionChanged = originalQuote?.description !== editingQuote.description;
      const materialChanged = originalQuote?.material_id !== editingQuote.material_id;
      const colorChanged = originalQuote?.color_id !== editingQuote.color_id;
      const priceWasUnset = !originalQuote?.estimated_price || Number(originalQuote?.estimated_price) === 0;
      const priceNowSet = Number(editingQuote.estimated_price || 0) > 0;
      const priceTriggerHandled = priceWasUnset && priceNowSet;
      const shouldNotifyCustomer = Boolean(
        originalQuote &&
        !priceTriggerHandled &&
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
        toast.info('Procesando aprobación y generando factura...');

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

          if (functionError) {
            toast.warning('Cotización aprobada, pero hubo un error en la automatización. Revisa los detalles.');
          } else if (data?.success) {
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
          }
        } catch (autoError) {
          toast.warning('Cotización aprobada, pero la automatización falló. Crea la factura manualmente.');
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

  const handleDeleteQuote = async (id: string) => {
    if (!confirm("¿Mover esta cotización a la papelera?")) return;
    
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
                  <TableHead>Peso</TableHead>
                  <TableHead>Tiempo</TableHead>
                  <TableHead>Precio Auto</TableHead>
                  <TableHead>Precio Est.</TableHead>
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
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => navigate(`/admin/cotizaciones/${quote.id}`)}
                            title="Ver detalles"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingQuote(quote)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDeleteQuote(quote.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
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
                  <Label>Precio Estimado (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingQuote.estimated_price || ''}
                    onChange={(e) => setEditingQuote({ ...editingQuote, estimated_price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                    placeholder="Ej: 125.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
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
