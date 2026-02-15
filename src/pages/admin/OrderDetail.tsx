import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Download, Image as ImageIcon, Printer } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RichTextDisplay } from "@/components/RichTextDisplay";
import { RichTextEditor } from "@/components/RichTextEditor";
import { logger } from '@/lib/logger';
import { sendGiftCardActivationNotification, syncInvoiceStatusWithOrder } from '@/lib/paymentUtils';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper: normalizar personalización (puede venir como JSON o texto)
  const getSelections = (item: any) => {
    try {
      const direct = Array.isArray(item.customization_selections)
        ? item.customization_selections
        : typeof item.customization_selections === 'string'
          ? JSON.parse(item.customization_selections)
          : typeof item.custom_text === 'string' && item.custom_text.trim().startsWith('[')
            ? JSON.parse(item.custom_text)
            : [];
      return Array.isArray(direct) ? direct : [];
    } catch {
      return [];
    }
  };

  const isCustomTextJson = (item: any) => {
    if (typeof item.custom_text !== 'string') return false;
    const s = item.custom_text.trim();
    return s.startsWith('[') && s.endsWith(']');
  };

  const handleDownloadImage = async (imageUrl: string, imageName: string) => {
    try {
      // Extract storage path from public URL to download original quality
      const bucketName = 'product-customization-images';
      const bucketMarker = `/object/public/${bucketName}/`;
      const markerIndex = imageUrl.indexOf(bucketMarker);

      if (markerIndex !== -1) {
        // Download directly from Supabase storage for original quality
        const storagePath = decodeURIComponent(imageUrl.substring(markerIndex + bucketMarker.length));
        const { data, error } = await supabase.storage
          .from(bucketName)
          .download(storagePath);

        if (error) throw error;

        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = imageName || `imagen-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Fallback: fetch from public URL
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Error al descargar');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = imageName || `imagen-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast.success("Imagen descargada");
    } catch (error: any) {
      logger.error("Error downloading image:", error);
      toast.error("Error al descargar imagen");
    }
  };

  const loadStatuses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("order_statuses")
        .select("*")
        .is("deleted_at", null)
        .order("name");
      
      if (error) throw error;
      setStatuses(data || []);
    } catch (error) {
      logger.error("Error loading statuses:", error);
    }
  }, []); // No external dependencies

  const loadOrderData = useCallback(async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          user:profiles!orders_user_id_fkey(full_name, email),
          status:order_statuses(name, color)
        `)
        .eq("id", id)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select(`
          *,
          material:materials(name),
          color:colors(name, hex_code)
        `)
        .eq("order_id", id);

      if (itemsError) throw itemsError;
      setOrderItems(itemsData || []);
    } catch (error: any) {
      logger.error("Error loading order:", error);
      toast.error("Error al cargar el pedido");
    } finally {
      setLoading(false);
    }
  }, [id]); // Depends on id from useParams

  useEffect(() => {
    loadOrderData();
    loadStatuses();
  }, [loadOrderData, loadStatuses]); // Now includes the functions

  const updateOrderStatus = async (statusId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status_id: statusId })
        .eq("id", id);

      if (error) throw error;
      toast.success("Estado actualizado correctamente");
      loadOrderData();
    } catch (error: any) {
      logger.error("Error updating status:", error);
      toast.error("Error al actualizar estado");
    }
  };

  const updatePaymentStatus = async (paymentStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ payment_status: paymentStatus })
        .eq("id", id);

      if (error) throw error;
      
      // Sync invoice payment status with order (bidirectional link)
      if (id) {
        await syncInvoiceStatusWithOrder(id, paymentStatus);
      }
      
      // Si el pago se marca como pagado y hay una tarjeta de regalo, enviar email y notificación
      if (paymentStatus === 'paid' && order.notes && order.notes.includes('Tarjeta Regalo:')) {
        logger.log('Payment marked as paid, gift card will be activated by trigger');
        
        // Extraer código de tarjeta de regalo de las notas
        const codeMatch = order.notes.match(/Tarjeta Regalo: ([A-Z0-9-]+)/);
        if (codeMatch && codeMatch[1]) {
          const giftCardCode = codeMatch[1];
          logger.log('Found gift card code:', giftCardCode);
          
          // Esperar un momento para que el trigger active la tarjeta
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            // Obtener datos de la tarjeta de regalo
            const { data: giftCard, error: gcError } = await supabase
              .from('gift_cards')
              .select('*')
              .eq('code', giftCardCode)
              .single();
            
            if (!gcError && giftCard) {
              // Enviar email con la tarjeta
              logger.log('Sending gift card email to:', giftCard.recipient_email);
              const { data: emailData, error: emailError } = await supabase.functions.invoke('send-gift-card-email', {
                body: {
                  recipient_email: giftCard.recipient_email,
                  sender_name: giftCard.sender_name || "Thuis3D.be",
                  gift_card_code: giftCard.code,
                  amount: giftCard.initial_amount,
                  message: giftCard.message || ""
                }
              });
              
              if (emailError) {
                logger.error('Error sending gift card email:', emailError);
                toast.error("Error al enviar email de tarjeta regalo");
              } else {
                logger.log('Gift card email sent successfully:', emailData);
              }
              
              // Enviar notificación in-app al destinatario de la tarjeta si tiene cuenta
              await sendGiftCardActivationNotification(giftCard.recipient_email, {
                initial_amount: giftCard.initial_amount,
                sender_name: giftCard.sender_name
              });
              
              toast.success("Tarjeta activada, email y notificación enviados");
            }
          } catch (gcErr) {
            logger.error('Error processing gift card:', gcErr);
            toast.error("Error al procesar tarjeta regalo");
          }
        }
      } else {
        toast.success("Estado de pago actualizado");
      }
      
      loadOrderData();
    } catch (error: any) {
      logger.error("Error updating payment status:", error);
      toast.error("Error al actualizar estado de pago");
    }
  };

  const updateNotes = async (notes: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ notes })
        .eq("id", id);

      if (error) throw error;
      toast.success("Notas actualizadas");
    } catch (error: any) {
      logger.error("Error updating notes:", error);
      toast.error("Error al actualizar notas");
    }
  };

  const deleteOrder = async () => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast.success("Pedido movido a la papelera");
      navigate("/admin/pedidos");
    } catch (error: any) {
      logger.error("Error deleting order:", error);
      toast.error("Error al eliminar pedido");
    }
  };

  if (loading) return <div className="container mx-auto p-6">Cargando...</div>;
  if (!order) return <div className="container mx-auto p-6">Pedido no encontrado</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/pedidos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Pedido {order.order_number}</h1>
            <p className="text-muted-foreground">
              {new Date(order.created_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/pedidos/${id}/imprimir`)}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Etiqueta
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Pedido
              </Button>
            </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar pedido?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El pedido será eliminado permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={deleteOrder}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <Label className="text-muted-foreground">Nombre</Label>
              <p className="font-medium">{order.user?.full_name || "N/A"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{order.user?.email || "N/A"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Dirección de Envío</Label>
              <div className="font-medium whitespace-pre-line">
                {(() => {
                  try {
                    const addr = typeof order.shipping_address === 'string' 
                      ? JSON.parse(order.shipping_address) 
                      : order.shipping_address;
                    if (!addr) return 'N/A';
                    
                    const fullName = addr.full_name || addr.fullName || '';
                    const address = addr.address || '';
                    const city = addr.city || '';
                    const postalCode = addr.postal_code || addr.postalCode || '';
                    const country = addr.country || '';
                    
                    return `${fullName}\n${address}\n${city}, ${postalCode}\n${country}`;
                  } catch (error) {
                    logger.error('Error parsing shipping address:', error);
                    return 'N/A';
                  }
                })()}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Dirección de Facturación</Label>
              <div className="font-medium whitespace-pre-line">
                {(() => {
                  try {
                    let addr = typeof order.billing_address === 'string' 
                      ? JSON.parse(order.billing_address) 
                      : order.billing_address;
                    
                    // Si no hay dirección de facturación, usar la de envío
                    if (!addr) {
                      addr = typeof order.shipping_address === 'string' 
                        ? JSON.parse(order.shipping_address) 
                        : order.shipping_address;
                    }
                    
                    if (!addr) return 'N/A';
                    
                    const fullName = addr.full_name || addr.fullName || '';
                    const address = addr.address || '';
                    const city = addr.city || '';
                    const postalCode = addr.postal_code || addr.postalCode || '';
                    const country = addr.country || '';
                    
                    return `${fullName}\n${address}\n${city}, ${postalCode}\n${country}`;
                  } catch (error) {
                    logger.error('Error parsing billing address:', error);
                    return 'N/A';
                  }
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado del Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Estado del Pedido</Label>
              <Select value={order.status_id || ""} onValueChange={updateOrderStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
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
              <Select value={order.payment_status || "pending"} onValueChange={updatePaymentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="paid">Pagado</SelectItem>
                  <SelectItem value="failed">Fallido</SelectItem>
                  <SelectItem value="refunded">Reembolsado</SelectItem>
                  <SelectItem value="cancelled">Anulado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Método de Pago</Label>
              <p className="font-medium">{order.payment_method || "N/A"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Productos del Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio Unitario</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      {(() => {
                        const sel = getSelections(item).find((s: any) => s.selection_type === 'image');
                        return sel ? (
                          <div className="relative group flex-shrink-0">
                            <img src={sel.image_url} alt={sel.image_name} className="w-10 h-10 object-cover rounded border" />
                            <button
                              onClick={() => handleDownloadImage(sel.image_url, sel.image_name)}
                              className="absolute inset-0 bg-black/50 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Descargar imagen"
                            >
                              <Download className="h-4 w-4 text-white" />
                            </button>
                          </div>
                        ) : null;
                      })()}
                      <div>
                        <div className="font-medium leading-tight">{item.product_name}</div>
                        {item.material?.name && (
                          <Badge variant="outline">Material: {item.material.name}</Badge>
                        )}
                        {item.color?.name && (
                          <Badge variant="outline" className="ml-2">
                            <div
                              className="w-3 h-3 rounded-full mr-1 inline-block"
                              style={{ backgroundColor: item.color.hex_code }}
                            />
                            Color: {item.color.name}
                          </Badge>
                        )}
                        {item.custom_text && !isCustomTextJson(item) && (
                          <div className="text-sm text-muted-foreground mt-2">
                            Texto: {item.custom_text}
                          </div>
                        )}
                        {getSelections(item).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {getSelections(item).map((sel: any, idx: number) => (
                              <div key={idx} className="text-sm">
                                <span className="font-medium">{sel.section_name}:</span>{' '}
                                {sel.selection_type === 'color' ? (
                                  <Badge variant="outline" className="ml-1">
                                    <div
                                      className="w-3 h-3 rounded-full mr-1 inline-block"
                                      style={{ backgroundColor: sel.color_hex }}
                                    />
                                    {sel.color_name}
                                  </Badge>
                                ) : sel.image_url ? (
                                  <div className="inline-flex items-center gap-2 mt-1">
                                    <img 
                                      src={sel.image_url} 
                                      alt={sel.image_name}
                                      className="w-8 h-8 object-cover rounded border"
                                    />
                                    <span className="text-xs">{sel.image_name}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleDownloadImage(sel.image_url, sel.image_name)}
                                      title="Descargar imagen en calidad original"
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">{sel.image_name}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">€{item.unit_price.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">€{item.total_price.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6 space-y-2 border-t pt-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>€{Number(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Impuestos</span>
              <span>€{Number(order.tax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Envío</span>
              <span>€{Number(order.shipping).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total</span>
              <span>€{Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notas del Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <RichTextEditor
            value={order.notes || ""}
            onChange={(value) => {
              setOrder({ ...order, notes: value });
              updateNotes(value);
            }}
            placeholder="Añadir notas sobre el pedido..."
          />
        </CardContent>
      </Card>
    </div>
  );
}