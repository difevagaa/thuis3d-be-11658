import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { i18nToast, toast } from "@/lib/i18nToast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Trash2 } from "lucide-react";

export default function Statuses() {
  const [orderStatuses, setOrderStatuses] = useState<any[]>([]);
  const [quoteStatuses, setQuoteStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newOrderStatus, setNewOrderStatus] = useState({ name: "", color: "#3b82f6" });
  const [newQuoteStatus, setNewQuoteStatus] = useState({ name: "", color: "#3b82f6" });

  useEffect(() => {
    loadStatuses();

    // Realtime subscriptions
    const orderChannel = supabase
      .channel('order-statuses-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_statuses'
      }, () => {
        loadStatuses();
      })
      .subscribe();

    const quoteChannel = supabase
      .channel('quote-statuses-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'quote_statuses'
      }, () => {
        loadStatuses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(quoteChannel);
    };
  }, []);

  const loadStatuses = async () => {
    try {
      const [orderRes, quoteRes] = await Promise.all([
        supabase.from("order_statuses").select("*").is("deleted_at", null).order("name"),
        supabase.from("quote_statuses").select("*").is("deleted_at", null).order("name")
      ]);

      setOrderStatuses(orderRes.data || []);
      setQuoteStatuses(quoteRes.data || []);
    } catch (error) {
      i18nToast.error("error.statusLoadFailed");
    } finally {
      setLoading(false);
    }
  };

  const createOrderStatus = async () => {
    if (!newOrderStatus.name.trim()) {
      i18nToast.error("error.statusNameRequired");
      return;
    }

    try {
      const { error } = await supabase
        .from("order_statuses")
        .insert([newOrderStatus]);

      if (error) {
        if (error.code === '23505') {
          i18nToast.error("error.statusNameExists");
          return;
        }
        throw error;
      }
      i18nToast.success("success.orderStatusCreated");
      setNewOrderStatus({ name: "", color: "#3b82f6" });
      await loadStatuses();
    } catch (error: any) {
      console.error("Error creating order status:", error);
      toast.error("Error al crear estado: " + (error.message || "Error desconocido"));
    }
  };

  const createQuoteStatus = async () => {
    if (!newQuoteStatus.name.trim()) {
      i18nToast.error("error.statusNameRequired");
      return;
    }

    try {
      const { error } = await supabase
        .from("quote_statuses")
        .insert([newQuoteStatus]);

      if (error) {
        if (error.code === '23505') {
          i18nToast.error("error.statusNameExists");
          return;
        }
        throw error;
      }
      i18nToast.success("success.quoteStatusCreated");
      setNewQuoteStatus({ name: "", color: "#3b82f6" });
      await loadStatuses();
    } catch (error: any) {
      console.error("Error creating quote status:", error);
      toast.error("Error al crear estado: " + (error.message || "Error desconocido"));
    }
  };

  const deleteOrderStatus = async (id: string) => {
    if (!confirm("¿Mover este estado a la papelera?")) return;
    try {
      const { error } = await supabase.from("order_statuses").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      i18nToast.success("success.statusDeleted");
      await loadStatuses();
    } catch (error) {
      i18nToast.error("error.statusDeleteFailed");
    }
  };

  const deleteQuoteStatus = async (id: string) => {
    if (!confirm("¿Mover este estado a la papelera?")) return;
    try {
      const { error } = await supabase.from("quote_statuses").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      i18nToast.success("success.statusDeleted");
      await loadStatuses();
    } catch (error) {
      i18nToast.error("error.statusDeleteFailed");
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Gestión de Estados</h1>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList>
          <TabsTrigger value="orders">Estados de Pedidos</TabsTrigger>
          <TabsTrigger value="quotes">Estados de Cotizaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Estados de Pedidos</CardTitle>
              <CardDescription>Gestiona los estados de los pedidos</CardDescription>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Crear Estado</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuevo Estado de Pedido</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nombre</Label>
                      <Input
                        value={newOrderStatus.name}
                        onChange={(e) => setNewOrderStatus({ ...newOrderStatus, name: e.target.value })}
                        placeholder="En Impresión, Enviado, etc."
                      />
                    </div>
                    <div>
                      <Label>Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={newOrderStatus.color}
                          onChange={(e) => setNewOrderStatus({ ...newOrderStatus, color: e.target.value })}
                          className="w-20 h-10"
                        />
                        <Input
                          value={newOrderStatus.color}
                          onChange={(e) => setNewOrderStatus({ ...newOrderStatus, color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={createOrderStatus}>Crear</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderStatuses.map((status) => (
                    <TableRow key={status.id}>
                      <TableCell>{status.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded"
                            style={{ backgroundColor: status.color }}
                          />
                          <span className="font-mono text-sm">{status.color}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteOrderStatus(status.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          <Card>
            <CardHeader>
              <CardTitle>Estados de Cotizaciones</CardTitle>
              <CardDescription>Gestiona los estados de las cotizaciones</CardDescription>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Crear Estado</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuevo Estado de Cotización</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nombre</Label>
                      <Input
                        value={newQuoteStatus.name}
                        onChange={(e) => setNewQuoteStatus({ ...newQuoteStatus, name: e.target.value })}
                        placeholder="Pendiente, Aprobada, etc."
                      />
                    </div>
                    <div>
                      <Label>Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={newQuoteStatus.color}
                          onChange={(e) => setNewQuoteStatus({ ...newQuoteStatus, color: e.target.value })}
                          className="w-20 h-10"
                        />
                        <Input
                          value={newQuoteStatus.color}
                          onChange={(e) => setNewQuoteStatus({ ...newQuoteStatus, color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={createQuoteStatus}>Crear</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quoteStatuses.map((status) => (
                    <TableRow key={status.id}>
                      <TableCell>{status.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded"
                            style={{ backgroundColor: status.color }}
                          />
                          <span className="font-mono text-sm">{status.color}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteQuoteStatus(status.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
