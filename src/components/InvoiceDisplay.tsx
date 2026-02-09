import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface InvoiceDisplayProps {
  invoice: any;
  showActions?: boolean;
}

function CompanyInfo() {
  const { t } = useTranslation('invoice');
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    const loadCompanyInfo = async () => {
      const { data } = await supabase
        .from("site_customization")
        .select("company_name, company_address, legal_email, company_phone, company_tax_id, company_website, logo_url")
        .maybeSingle();
      
      if (data) setCompanyInfo(data);
    };
    loadCompanyInfo();
  }, []);

  if (!companyInfo) return <div className="space-y-0.5"><h2 className="text-base font-bold">{t('company.loading')}</h2></div>;

  const addressLines = companyInfo.company_address 
    ? companyInfo.company_address.split('\n').filter((line: string) => line.trim())
    : [];

  return (
    <div className="flex items-start gap-3">
      {companyInfo.logo_url && (
        <img 
          src={companyInfo.logo_url} 
          alt={companyInfo.company_name || 'Logo'} 
          className="h-12 w-auto object-contain print:h-10"
        />
      )}
      <div className="space-y-0.5">
        <h2 className="text-base font-bold text-foreground leading-tight">
          {companyInfo.company_name || '3DThuis.be'}
        </h2>
        {addressLines.length > 0 && addressLines.map((line: string, idx: number) => (
          <p key={idx} className="text-xs text-muted-foreground leading-tight">{line}</p>
        ))}
        <div className="text-xs text-muted-foreground space-y-0">
          {companyInfo.company_phone && (
            <p className="leading-tight">Tel: {companyInfo.company_phone}</p>
          )}
          {companyInfo.legal_email && (
            <p className="leading-tight">Email: {companyInfo.legal_email}</p>
          )}
          {companyInfo.company_website && (
            <p className="leading-tight">Web: {companyInfo.company_website}</p>
          )}
          {companyInfo.company_tax_id && (
            <p className="leading-tight font-medium">NIF/CIF: {companyInfo.company_tax_id}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvoiceDisplay({ invoice, showActions = false }: InvoiceDisplayProps) {
  const { t } = useTranslation('invoice');
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);

  // Helper: normalizar selecciones de personalización
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

  // Helper: obtener alias corto de nombre de imagen
  const getImageAlias = (imageName: string) => {
    if (!imageName) return '';
    // Eliminar extensión y guiones bajos/guiones por espacios
    return imageName
      .replace(/\.(jpg|jpeg|png|gif|webp|svg)$/i, '')
      .replace(/[_-]/g, ' ')
      .substring(0, 30); // Máximo 30 caracteres
  };

  const loadInvoiceItems = useCallback(async () => {
    if (!invoice?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("invoice_items")
        .select(`
          *,
          product:products(id)
        `)
        .eq("invoice_id", invoice.id)
        .order("created_at");

      if (error) throw error;
      setInvoiceItems(data || []);
    } catch (error) {
      console.error("Error loading invoice items:", error);
    }
  }, [invoice?.id]);

  useEffect(() => {
    loadInvoiceItems();
  }, [loadInvoiceItems]);

  if (!invoice) return null;

  // Determinar si mostrar items desde invoice_items o desde order_items
  const hasInvoiceItems = invoiceItems.length > 0;
  const hasOrderItems = invoice.order?.order_items && invoice.order.order_items.length > 0;

  return (
    <div className="bg-white dark:bg-background p-4 md:p-6 rounded-lg shadow-sm print:shadow-none print:p-4 space-y-4 max-w-4xl mx-auto">
      {/* Company Header */}
      <div className="border-b pb-3 print:pb-2">
        <div className="flex flex-col md:flex-row justify-between items-start gap-3">
          <CompanyInfo />
          <div className="text-right w-full md:w-auto">
            <h1 className="text-xl md:text-2xl font-bold print:text-xl text-primary">{t('title').toUpperCase()}</h1>
            <p className="text-base md:text-lg font-mono mt-1 print:text-base">{invoice.invoice_number}</p>
            <div className="mt-2 text-xs md:text-sm print:text-xs">
              <p className="text-muted-foreground leading-tight">{t('dates.issueDate')}</p>
              <p className="font-medium leading-tight">
                {new Date(invoice.issue_date || invoice.created_at).toLocaleDateString('es-ES')}
              </p>
              {invoice.due_date && (
                <>
                  <p className="text-muted-foreground mt-1 leading-tight">{t('dates.dueDate')}</p>
                  <p className="font-medium leading-tight">
                    {new Date(invoice.due_date).toLocaleDateString('es-ES')}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="grid md:grid-cols-2 gap-4 print:gap-3">
        <div>
          <h3 className="font-semibold mb-1 text-sm print:text-xs">{t('billedTo')}:</h3>
          <div className="text-xs print:text-[10px] space-y-0.5">
            <p className="font-medium leading-tight">{invoice.user?.full_name || t('customer')}</p>
            <p className="text-muted-foreground leading-tight">{invoice.user?.email}</p>
            {invoice.user?.phone && <p className="text-muted-foreground leading-tight">{invoice.user?.phone}</p>}
            {invoice.user?.address && (
              <p className="mt-0.5 whitespace-pre-line text-muted-foreground leading-tight">{invoice.user?.address}</p>
            )}
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-1 text-sm print:text-xs">{t('paymentInfo')}:</h3>
          <div className="text-xs print:text-[10px] space-y-0.5">
            <p className="leading-tight">
              <span className="text-muted-foreground">{t('status')}: </span>
              <span className={`font-medium ${invoice.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                {t(`paymentStatus.${invoice.payment_status}`)}
              </span>
            </p>
            {invoice.payment_method && (
              <p className="leading-tight">
                <span className="text-muted-foreground">{t('method')}: </span>
                <span className="font-medium capitalize">
                  {t(`paymentMethods.${invoice.payment_method}`)}
                </span>
              </p>
            )}
            {invoice.order?.order_number && (
              <p className="leading-tight">
                <span className="text-muted-foreground">{t('order')}: </span>
                <span className="font-medium font-mono">{invoice.order.order_number}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      {(hasInvoiceItems || hasOrderItems) && (
        <div>
          <h3 className="font-semibold mb-2 text-sm print:text-xs">{t('items.title')}</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs print:text-[10px] bg-muted/50">
                  <TableHead className="min-w-[150px] py-2 print:py-1">{t('items.description')}</TableHead>
                  <TableHead className="text-center min-w-[60px] py-2 print:py-1">{t('items.quantity')}</TableHead>
                  <TableHead className="text-right min-w-[80px] py-2 print:py-1">{t('items.unitPrice')}</TableHead>
                  <TableHead className="text-right min-w-[80px] py-2 print:py-1">{t('items.total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hasInvoiceItems ? (
                  invoiceItems.map((item: any) => (
                    <TableRow key={item.id} className="text-xs print:text-[10px]">
                      <TableCell className="py-2 print:py-1">
                        <div>
                          <div className="font-medium leading-tight">{item.product_name}</div>
                          {item.description && (
                            <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{item.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-2 print:py-1">{item.quantity}</TableCell>
                      <TableCell className="text-right py-2 print:py-1">€{Number(item.unit_price).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium py-2 print:py-1">€{Number(item.total_price).toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : hasOrderItems ? (
                  invoice.order.order_items.map((item: any) => {
                    const selections = getSelections(item);
                    
                    // Crear descripción resumida de personalizaciones
                    let customizationSummary = '';
                    if (selections.length > 0) {
                      customizationSummary = selections.map((sel: any) => {
                        if (sel.selection_type === 'color') {
                          return `${sel.section_name}: ${sel.color_name}`;
                        } else {
                          return `${sel.section_name}: ${getImageAlias(sel.image_name)}`;
                        }
                      }).join(' | ');
                    }

                    return (
                      <TableRow key={item.id} className="text-xs print:text-[10px]">
                        <TableCell className="py-2 print:py-1">
                          <div>
                            <div className="font-medium leading-tight">{item.product_name}</div>
                            {customizationSummary && (
                              <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                                {customizationSummary}
                              </div>
                            )}
                            {item.custom_text && !isCustomTextJson(item) && (
                              <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                                {t('items.customText')}: {item.custom_text}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-2 print:py-1">{item.quantity}</TableCell>
                        <TableCell className="text-right py-2 print:py-1">€{Number(item.unit_price).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium py-2 print:py-1">€{Number(item.total_price).toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full md:w-72 lg:w-80 space-y-1.5 text-xs md:text-sm print:text-[10px]">
          <div className="flex justify-between leading-tight">
            <span className="text-muted-foreground">{t('summary.subtotal')}:</span>
            <span className="font-medium">€{Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          
          {invoice.discount > 0 && (
            <div className="flex justify-between text-red-600 leading-tight">
              <span>{t('summary.discount')}:</span>
              <span>-€{Number(invoice.discount).toFixed(2)}</span>
            </div>
          )}
          
          {invoice.coupon_discount > 0 && (
            <div className="flex justify-between text-red-600 leading-tight">
              <span>{t('summary.coupon')} {invoice.coupon_code ? `(${invoice.coupon_code})` : ''}:</span>
              <span>-€{Number(invoice.coupon_discount).toFixed(2)}</span>
            </div>
          )}
          
          {invoice.gift_card_amount > 0 && (
            <div className="flex justify-between text-red-600 leading-tight">
              <span>{t('summary.giftCard')} {invoice.gift_card_code ? `(${invoice.gift_card_code})` : ''}:</span>
              <span>-€{Number(invoice.gift_card_amount).toFixed(2)}</span>
            </div>
          )}
          
          {invoice.shipping > 0 ? (
            <div className="flex justify-between leading-tight">
              <span className="text-muted-foreground">{t('summary.shipping')}:</span>
              <span className="font-medium">€{Number(invoice.shipping).toFixed(2)}</span>
            </div>
          ) : (
            <div className="flex justify-between leading-tight text-green-600">
              <span>{t('summary.shipping')}:</span>
              <span className="font-medium">{t('summary.freeShipping', 'Envío Gratis')}</span>
            </div>
          )}
          
          {invoice.tax > 0 && (
            <div className="flex justify-between leading-tight">
              <span className="text-muted-foreground">{t('summary.tax')}:</span>
              <span className="font-medium">€{Number(invoice.tax).toFixed(2)}</span>
            </div>
          )}
          
          <div className="border-t-2 border-foreground/20 pt-2 mt-1 flex justify-between font-bold text-sm md:text-base print:text-xs">
            <span>{t('summary.total')}:</span>
            <span>€{Number(invoice.total).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="border-t pt-2 print:pt-1.5">
          <h3 className="font-semibold mb-1 text-xs print:text-[10px]">{t('notes.title')}:</h3>
          <p className="text-xs print:text-[10px] text-muted-foreground whitespace-pre-line leading-tight">
            {invoice.notes}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t pt-3 print:pt-2 text-center text-xs print:text-[10px] text-muted-foreground">
        <p>{t('footer')}</p>
      </div>
    </div>
  );
}
