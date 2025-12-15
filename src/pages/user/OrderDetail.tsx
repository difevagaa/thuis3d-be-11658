import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Package, CreditCard, Truck, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RichTextDisplay } from "@/components/RichTextDisplay";
import { Separator } from "@/components/ui/separator";
import { logger } from '@/lib/logger';
import { i18nToast } from "@/lib/i18nToast";

export default function OrderDetail() {
  const { t } = useTranslation(['common']);
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Helper: normalize customization selections (array or JSON string, or mistakenly stored in custom_text)
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

  const loadOrderDetail = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        i18nToast.error("error.unauthorized");
        navigate("/auth");
        return;
      }

      // Load order with status
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          status:order_statuses(name, color)
        `)
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Load order items with color and material names
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

      // Load invoice if exists
      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("*")
        .eq("order_id", id)
        .maybeSingle();

      if (invoiceData) setInvoice(invoiceData);

    } catch (error: any) {
      logger.error("Error loading order:", error);
      i18nToast.error("error.loadingOrderFailed");
      navigate("/mi-cuenta");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]); // Depends on id and navigate

  useEffect(() => {
    loadOrderDetail();
  }, [loadOrderDetail]); // Now includes loadOrderDetail

  const printInvoice = () => {
    window.print();
  };

  const downloadInvoice = async () => {
    if (!invoice) {
      i18nToast.error("error.noInvoiceAvailable");
      return;
    }

    if (order.payment_status !== 'paid') {
      i18nToast.error("error.invoiceOnlyWhenPaid");
      return;
    }

    try {
      i18nToast.info("info.generatingInvoice");

      // Llamar al edge function para obtener el HTML de la factura
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoice_id: invoice.id }
      });

      if (error) {
        logger.error('Error generating invoice:', error);
        i18nToast.error("error.generatingInvoiceFailed");
        return;
      }

      if (!data || !data.html) {
        i18nToast.error("error.noInvoiceContent");
        return;
      }

      logger.log('Invoice HTML received, length:', data.html.length);

      // Crear un iframe oculto para renderizar el HTML correctamente
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = '8.5in'; // Ancho carta
      iframe.style.height = '11in'; // Alto carta
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('No se pudo acceder al documento del iframe');
      }

      // Escribir el HTML en el iframe
      iframeDoc.open();
      iframeDoc.write(data.html);
      iframeDoc.close();

      // Esperar a que el contenido se renderice completamente
      await new Promise(resolve => setTimeout(resolve, 500));

      // Importar html2pdf dinámicamente
      const html2pdf = (await import('html2pdf.js')).default;

      // Configurar opciones del PDF optimizadas
      const options = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `factura-${invoice.invoice_number}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          windowWidth: 816, // 8.5 inches * 96 DPI
          windowHeight: 1056 // 11 inches * 96 DPI
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'letter', 
          orientation: 'portrait' as const 
        },
        pagebreak: { mode: 'avoid-all' }
      };

      // Generar y descargar el PDF desde el iframe
      logger.log('Generating PDF from iframe...');
      await html2pdf().set(options).from(iframeDoc.body).save();

      // Limpiar el iframe
      document.body.removeChild(iframe);

      logger.log('PDF generated successfully');
      i18nToast.success("success.invoiceDownloaded");
    } catch (error) {
      logger.error('Error downloading invoice:', error);
      i18nToast.error("error.downloadFailed");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Cargando detalles del pedido...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">No se encontró el pedido</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => navigate("/mi-cuenta")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Mi Cuenta
        </Button>
        <div className="flex gap-2">
          {invoice && order.payment_status === "paid" && (
            <Button variant="outline" onClick={printInvoice}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {/* Order Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">Pedido #{order.order_number}</CardTitle>
                <CardDescription>
                  Realizado el {new Date(order.created_at).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2">
                <Badge 
                  variant={order.payment_status === "paid" ? "default" : "secondary"}
                  className="w-fit"
                >
                  {order.payment_status === "paid" ? "Pagado" : "Pendiente de pago"}
                </Badge>
                {order.status && (
                  <Badge 
                    style={{ backgroundColor: order.status.color }}
                    className="w-fit"
                  >
                    {order.status.name}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Order Details Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" />
                Detalles del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center text-sm gap-2">
                <span className="text-muted-foreground flex-shrink-0">Subtotal:</span>
                <span className="font-medium text-right whitespace-nowrap">€{Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm gap-2">
                <span className="text-muted-foreground flex-shrink-0">Envío:</span>
                <span className="font-medium text-right whitespace-nowrap">€{Number(order.shipping || 0).toFixed(2)}</span>
              </div>
              {Number(order.tax || 0) > 0 && (
                <div className="flex justify-between items-center text-sm gap-2">
                  <span className="text-muted-foreground flex-shrink-0">IVA (21%):</span>
                  <span className="font-medium text-right whitespace-nowrap">€{Number(order.tax || 0).toFixed(2)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between items-center text-sm gap-2">
                  <span className="text-muted-foreground flex-shrink-0">Descuento:</span>
                  <span className="font-medium text-success text-right whitespace-nowrap">-€{Number(order.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center font-bold gap-2">
                  <span className="flex-shrink-0">Total:</span>
                  <span className="text-right whitespace-nowrap">€{Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5" />
                Información de Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground block mb-1">Método de pago:</span>
                <span className="font-medium capitalize">{order.payment_method || "No especificado"}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground block mb-1">Estado:</span>
                <Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>
                  {order.payment_status === "paid" ? "Pagado" : "Pendiente"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Truck className="h-5 w-5" />
                Envío y Seguimiento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tracking Info */}
              {order.tracking_number && (
                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                    📦 Información de Seguimiento
                  </h4>
                  {order.carrier_name && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Transportista:</span>
                      <span className="font-medium ml-2">{order.carrier_name}</span>
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="text-muted-foreground">Número de seguimiento:</span>
                    <code className="font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded ml-2">{order.tracking_number}</code>
                  </div>
                  {order.estimated_delivery_date && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Entrega estimada:</span>
                      <span className="font-medium ml-2">{new Date(order.estimated_delivery_date).toLocaleDateString('es-ES')}</span>
                    </div>
                  )}
                  {order.tracking_url && (
                    <a 
                      href={order.tracking_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      🔗 Rastrear Pedido
                    </a>
                  )}
                </div>
              )}
              
              {/* Shipping Address */}
              <div>
                <span className="text-muted-foreground text-sm block mb-1">Dirección de envío:</span>
                <p className="text-sm whitespace-pre-line">
                  {(() => {
                    try {
                      if (!order.shipping_address) return "No especificada";
                      const addr = typeof order.shipping_address === 'string' && order.shipping_address.startsWith('{')
                        ? JSON.parse(order.shipping_address)
                        : order.shipping_address;
                      if (typeof addr === 'object' && addr !== null) {
                        const fullName = addr.full_name || addr.fullName || '';
                        const address = addr.address || '';
                        const city = addr.city || '';
                        const postalCode = addr.postal_code || addr.postalCode || '';
                        const country = addr.country || '';
                        return `${fullName}\n${address}\n${city}, ${postalCode}\n${country}`.trim();
                      }
                      return addr;
                    } catch (error) {
                      logger.error('Error parsing address:', error);
                      return order.shipping_address || "No especificada";
                    }
                  })()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Artículos del Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
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
                              <img src={sel.image_url} alt={sel.image_name} className="w-10 h-10 object-cover rounded border" />
                            ) : null;
                          })()}
                          <div>
                            <p className="font-medium leading-tight">{item.product_name}</p>
                            {item.material?.name && (
                              <p className="text-xs text-muted-foreground">Material: {item.material.name}</p>
                            )}
                            {item.color?.name && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <div
                                  className="w-3 h-3 rounded-full border"
                                  style={{ backgroundColor: item.color.hex_code }}
                                />
                                <span>Color: {item.color.name}</span>
                              </div>
                            )}
                            {item.custom_text && !isCustomTextJson(item) && (
                              <p className="text-xs text-muted-foreground">Texto: {item.custom_text}</p>
                            )}
                            {getSelections(item).length > 0 && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs font-semibold text-muted-foreground">Personalización:</p>
                                {getSelections(item).map((sel: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2 text-xs">
                                    <span className="font-medium">{sel.section_name}:</span>
                                    {sel.selection_type === 'color' ? (
                                      <div className="flex items-center gap-1.5">
                                        {sel.color_hex && (
                                          <div
                                            className="w-4 h-4 rounded border"
                                            style={{ backgroundColor: sel.color_hex }}
                                          />
                                        )}
                                        <span className="text-muted-foreground">{sel.color_name}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5">
                                        <img 
                                          src={sel.image_url} 
                                          alt={sel.image_name}
                                          className="w-8 h-8 object-cover rounded border"
                                        />
                                        <span className="text-muted-foreground">{sel.image_name}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">€{Number(item.unit_price).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">€{Number(item.total_price).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {order.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notas del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted/30 rounded-lg">
                <RichTextDisplay content={order.notes} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice Section */}
        {invoice && order.payment_status === "paid" && (
          <Card>
            <CardHeader>
              <CardTitle>Información de Factura</CardTitle>
              <CardDescription>Factura #{invoice.invoice_number}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Fecha de emisión:</p>
                  <p className="font-medium">
                    {new Date(invoice.issue_date).toLocaleDateString('es-ES')}
                  </p>
                </div>
                {invoice.due_date && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Fecha de vencimiento:</p>
                    <p className="font-medium">
                      {new Date(invoice.due_date).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Estado de pago:</p>
                  <Badge variant={invoice.payment_status === "paid" ? "default" : "secondary"}>
                    {invoice.payment_status === "paid" ? "Pagada" : "Pendiente"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
