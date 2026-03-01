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
  const { t, i18n } = useTranslation(['orderDetail', 'common']);
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const getLocale = () => {
    const lang = i18n.language;
    if (lang?.startsWith('nl')) return 'nl-BE';
    if (lang?.startsWith('en')) return 'en-GB';
    return 'es-ES';
  };

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
  }, [id, navigate]);

  useEffect(() => {
    loadOrderDetail();
  }, [loadOrderDetail]);

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

      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = '8.5in';
      iframe.style.height = '11in';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe document');

      iframeDoc.open();
      iframeDoc.write(data.html);
      iframeDoc.close();

      await new Promise(resolve => setTimeout(resolve, 500));

      const html2pdf = (await import('html2pdf.js')).default;

      const options = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `invoice-${invoice.invoice_number}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          windowWidth: 816,
          windowHeight: 1056
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'letter', 
          orientation: 'portrait' as const 
        },
        pagebreak: { mode: 'avoid-all' }
      };

      await html2pdf().set(options).from(iframeDoc.body).save();
      document.body.removeChild(iframe);

      i18nToast.success("success.invoiceDownloaded");
    } catch (error) {
      logger.error('Error downloading invoice:', error);
      i18nToast.error("error.downloadFailed");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">{t('loading')}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">{t('notFound')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => navigate("/mi-cuenta")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToAccount')}
        </Button>
        <div className="flex gap-2">
          {invoice && order.payment_status === "paid" && (
            <Button variant="outline" onClick={printInvoice}>
              <Printer className="h-4 w-4 mr-2" />
              {t('print')}
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
                <CardTitle className="text-2xl">{t('orderTitle', { number: order.order_number })}</CardTitle>
                <CardDescription>
                  {t('madeOn', { date: new Date(order.created_at).toLocaleDateString(getLocale(), {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })})}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2">
                <Badge 
                  variant={order.payment_status === "paid" ? "default" : "secondary"}
                  className="w-fit"
                >
                  {order.payment_status === "paid" ? t('paymentPaid') : t('paymentPending')}
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
                {t('orderDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center text-sm gap-2">
                <span className="text-muted-foreground flex-shrink-0">{t('subtotal')}:</span>
                <span className="font-medium text-right whitespace-nowrap">€{Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm gap-2">
                <span className="text-muted-foreground flex-shrink-0">{t('shipping')}:</span>
                <span className="font-medium text-right whitespace-nowrap">€{Number(order.shipping || 0).toFixed(2)}</span>
              </div>
              {Number(order.tax || 0) > 0 && (
                <div className="flex justify-between items-center text-sm gap-2">
                  <span className="text-muted-foreground flex-shrink-0">{t('vat')}:</span>
                  <span className="font-medium text-right whitespace-nowrap">€{Number(order.tax || 0).toFixed(2)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between items-center text-sm gap-2">
                  <span className="text-muted-foreground flex-shrink-0">{t('discount')}:</span>
                  <span className="font-medium text-success text-right whitespace-nowrap">-€{Number(order.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center font-bold gap-2">
                  <span className="flex-shrink-0">{t('total')}:</span>
                  <span className="text-right whitespace-nowrap">€{Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5" />
                {t('paymentInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground block mb-1">{t('paymentMethod')}:</span>
                <span className="font-medium capitalize">{order.payment_method || t('notSpecified')}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground block mb-1">{t('status')}:</span>
                <Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>
                  {order.payment_status === "paid" ? t('paymentPaid') : t('pending')}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Truck className="h-5 w-5" />
                {t('shippingTracking')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.tracking_number && (
                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                    📦 {t('trackingInfo')}
                  </h4>
                  {order.carrier_name && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">{t('carrier')}:</span>
                      <span className="font-medium ml-2">{order.carrier_name}</span>
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t('trackingNumber')}:</span>
                    <code className="font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded ml-2">{order.tracking_number}</code>
                  </div>
                  {order.estimated_delivery_date && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">{t('estimatedDelivery')}:</span>
                      <span className="font-medium ml-2">{new Date(order.estimated_delivery_date).toLocaleDateString(getLocale())}</span>
                    </div>
                  )}
                  {order.tracking_url && (
                    <a 
                      href={order.tracking_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      🔗 {t('trackOrder')}
                    </a>
                  )}
                </div>
              )}
              
              <div>
                <span className="text-muted-foreground text-sm block mb-1">{t('shippingAddress')}:</span>
                <p className="text-sm whitespace-pre-line">
                  {(() => {
                    try {
                      if (!order.shipping_address) return t('notSpecifiedAddress');
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
                      return order.shipping_address || t('notSpecifiedAddress');
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
            <CardTitle>{t('orderItems')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('product')}</TableHead>
                    <TableHead className="text-center">{t('quantity')}</TableHead>
                    <TableHead className="text-right">{t('unitPrice')}</TableHead>
                    <TableHead className="text-right">{t('itemTotal')}</TableHead>
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
                              <p className="text-xs text-muted-foreground">{t('material')}: {item.material.name}</p>
                            )}
                            {item.color?.name && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <div
                                  className="w-3 h-3 rounded-full border"
                                  style={{ backgroundColor: item.color.hex_code }}
                                />
                                <span>{t('color')}: {item.color.name}</span>
                              </div>
                            )}
                            {item.custom_text && !isCustomTextJson(item) && (
                              <p className="text-xs text-muted-foreground">{t('text')}: {item.custom_text}</p>
                            )}
                            {getSelections(item).length > 0 && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs font-semibold text-muted-foreground">{t('customization')}:</p>
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
                {t('orderNotes')}
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
              <CardTitle>{t('invoiceInfo')}</CardTitle>
              <CardDescription>{t('invoiceNumber', { number: invoice.invoice_number })}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('issueDate')}:</p>
                  <p className="font-medium">
                    {new Date(invoice.issue_date).toLocaleDateString(getLocale())}
                  </p>
                </div>
                {invoice.due_date && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('dueDate')}:</p>
                    <p className="font-medium">
                      {new Date(invoice.due_date).toLocaleDateString(getLocale())}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('paymentStatus')}:</p>
                  <Badge variant={invoice.payment_status === "paid" ? "default" : "secondary"}>
                    {invoice.payment_status === "paid" ? t('invoicePaid') : t('invoicePending')}
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
