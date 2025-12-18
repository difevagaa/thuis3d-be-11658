import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Box, 
  Search, 
  Download, 
  Eye, 
  RefreshCw,
  FileDown,
  Layers,
  User,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2
} from "lucide-react";

interface LithophanyOrder {
  id: string;
  user_id: string | null;
  lamp_type: string;
  lamp_width_mm: number;
  lamp_height_mm: number;
  original_image_url: string;
  processed_image_url: string | null;
  lithophany_stl_url: string | null;
  base_stl_url: string | null;
  calculated_price: number | null;
  final_price: number | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  processed_at: string | null;
  paid_at: string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  processed: "bg-green-100 text-green-800",
  paid: "bg-emerald-100 text-emerald-800",
  completed: "bg-primary/10 text-primary",
  cancelled: "bg-red-100 text-red-800",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  processing: <Loader2 className="h-3 w-3 animate-spin" />,
  processed: <CheckCircle2 className="h-3 w-3" />,
  paid: <DollarSign className="h-3 w-3" />,
  completed: <CheckCircle2 className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
};

const LithophanyAdmin = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<LithophanyOrder | null>(null);

  // Fetch orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['lithophany-orders', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('lithophany_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as LithophanyOrder[];
    }
  });

  // Regenerate STL mutation
  const regenerateSTL = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-lithophany-stl', {
        body: { orderId, generateBase: true }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(language === 'es' ? 'STL regenerado correctamente' : 'STL regenerated successfully');
      queryClient.invalidateQueries({ queryKey: ['lithophany-orders'] });
    },
    onError: (error) => {
      toast.error(language === 'es' ? 'Error al regenerar STL' : 'Error regenerating STL');
      console.error(error);
    }
  });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from('lithophany_orders')
        .update({ status })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(language === 'es' ? 'Estado actualizado' : 'Status updated');
      queryClient.invalidateQueries({ queryKey: ['lithophany-orders'] });
    }
  });

  // Filter orders by search term
  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.lamp_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusLabel = (status: string | null) => {
    const labels: Record<string, { en: string; es: string }> = {
      pending: { en: 'Pending', es: 'Pendiente' },
      processing: { en: 'Processing', es: 'Procesando' },
      processed: { en: 'Processed', es: 'Procesado' },
      paid: { en: 'Paid', es: 'Pagado' },
      completed: { en: 'Completed', es: 'Completado' },
      cancelled: { en: 'Cancelled', es: 'Cancelado' },
    };
    return labels[status || 'pending']?.[language === 'es' ? 'es' : 'en'] || status;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Box className="h-6 w-6" />
            {language === 'es' ? 'Pedidos de Litofanías' : 'Lithophany Orders'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'es' 
              ? 'Gestiona los pedidos de litofanías 3D'
              : 'Manage 3D lithophany orders'}
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {orders.length} {language === 'es' ? 'pedidos' : 'orders'}
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'es' ? 'Buscar pedidos...' : 'Search orders...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={language === 'es' ? 'Estado' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'es' ? 'Todos' : 'All'}</SelectItem>
                <SelectItem value="pending">{language === 'es' ? 'Pendientes' : 'Pending'}</SelectItem>
                <SelectItem value="processing">{language === 'es' ? 'Procesando' : 'Processing'}</SelectItem>
                <SelectItem value="processed">{language === 'es' ? 'Procesados' : 'Processed'}</SelectItem>
                <SelectItem value="paid">{language === 'es' ? 'Pagados' : 'Paid'}</SelectItem>
                <SelectItem value="completed">{language === 'es' ? 'Completados' : 'Completed'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Box className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{language === 'es' ? 'No hay pedidos' : 'No orders found'}</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'es' ? 'ID' : 'ID'}</TableHead>
                    <TableHead>{language === 'es' ? 'Vista Previa' : 'Preview'}</TableHead>
                    <TableHead>{language === 'es' ? 'Tipo' : 'Type'}</TableHead>
                    <TableHead>{language === 'es' ? 'Dimensiones' : 'Dimensions'}</TableHead>
                    <TableHead>{language === 'es' ? 'Precio' : 'Price'}</TableHead>
                    <TableHead>{language === 'es' ? 'Estado' : 'Status'}</TableHead>
                    <TableHead>{language === 'es' ? 'Fecha' : 'Date'}</TableHead>
                    <TableHead>{language === 'es' ? 'Acciones' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <img 
                          src={order.processed_image_url || order.original_image_url}
                          alt="Preview"
                          className="w-12 h-12 object-cover rounded"
                        />
                      </TableCell>
                      <TableCell className="capitalize">{order.lamp_type}</TableCell>
                      <TableCell>
                        {order.lamp_width_mm}×{order.lamp_height_mm}mm
                      </TableCell>
                      <TableCell>
                        €{(order.final_price || order.calculated_price || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[order.status || 'pending']}>
                          <span className="flex items-center gap-1">
                            {statusIcons[order.status || 'pending']}
                            {getStatusLabel(order.status)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setSelectedOrder(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>
                                  {language === 'es' ? 'Detalles del Pedido' : 'Order Details'}
                                </DialogTitle>
                              </DialogHeader>
                              {selectedOrder && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <img 
                                        src={selectedOrder.processed_image_url || selectedOrder.original_image_url}
                                        alt="Lithophany"
                                        className="w-full aspect-square object-contain rounded-lg bg-muted"
                                      />
                                    </div>
                                    <div className="space-y-3">
                                      <div>
                                        <p className="text-sm text-muted-foreground">ID</p>
                                        <p className="font-mono text-sm">{selectedOrder.id}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">
                                          {language === 'es' ? 'Tipo de Lámpara' : 'Lamp Type'}
                                        </p>
                                        <p className="capitalize">{selectedOrder.lamp_type}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">
                                          {language === 'es' ? 'Dimensiones' : 'Dimensions'}
                                        </p>
                                        <p>{selectedOrder.lamp_width_mm}×{selectedOrder.lamp_height_mm}mm</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">
                                          {language === 'es' ? 'Precio' : 'Price'}
                                        </p>
                                        <p className="text-lg font-bold">
                                          €{(selectedOrder.final_price || selectedOrder.calculated_price || 0).toFixed(2)}
                                        </p>
                                      </div>
                                      {selectedOrder.notes && (
                                        <div>
                                          <p className="text-sm text-muted-foreground">
                                            {language === 'es' ? 'Notas' : 'Notes'}
                                          </p>
                                          <p className="text-sm">{selectedOrder.notes}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-2">
                                    {selectedOrder.lithophany_stl_url && (
                                      <Button asChild variant="outline" size="sm">
                                        <a href={selectedOrder.lithophany_stl_url} download>
                                          <FileDown className="h-4 w-4 mr-1" />
                                          {language === 'es' ? 'Descargar Litofanía STL' : 'Download Lithophany STL'}
                                        </a>
                                      </Button>
                                    )}
                                    {selectedOrder.base_stl_url && (
                                      <Button asChild variant="outline" size="sm">
                                        <a href={selectedOrder.base_stl_url} download>
                                          <FileDown className="h-4 w-4 mr-1" />
                                          {language === 'es' ? 'Descargar Base STL' : 'Download Base STL'}
                                        </a>
                                      </Button>
                                    )}
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => regenerateSTL.mutate(selectedOrder.id)}
                                      disabled={regenerateSTL.isPending}
                                    >
                                      <RefreshCw className={`h-4 w-4 mr-1 ${regenerateSTL.isPending ? 'animate-spin' : ''}`} />
                                      {language === 'es' ? 'Regenerar STL' : 'Regenerate STL'}
                                    </Button>
                                  </div>

                                  <div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {language === 'es' ? 'Cambiar Estado' : 'Change Status'}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {['pending', 'processing', 'processed', 'paid', 'completed', 'cancelled'].map(status => (
                                        <Button
                                          key={status}
                                          variant={selectedOrder.status === status ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => updateStatus.mutate({ orderId: selectedOrder.id, status })}
                                          disabled={updateStatus.isPending}
                                        >
                                          {getStatusLabel(status)}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          {order.lithophany_stl_url && (
                            <Button variant="ghost" size="icon" asChild>
                              <a href={order.lithophany_stl_url} download title="Download STL">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => regenerateSTL.mutate(order.id)}
                            disabled={regenerateSTL.isPending}
                          >
                            <RefreshCw className={`h-4 w-4 ${regenerateSTL.isPending ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LithophanyAdmin;
