import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import InvoiceDisplay from "@/components/InvoiceDisplay";
import { Layout } from "@/components/Layout";
import { i18nToast } from "@/lib/i18nToast";

export default function UserInvoiceView() {
  const { t } = useTranslation(['common']);
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        i18nToast.error("error.unauthorized");
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          user:profiles!invoices_user_id_fkey(full_name, email, phone, address),
          order:orders!invoices_order_id_fkey(order_number, order_items(*))
        `)
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        i18nToast.error("error.noPermissionInvoice");
        navigate("/mi-cuenta");
        return;
      }

      setInvoice(data);
    } catch (error: any) {
      console.error("Error loading invoice:", error);
      i18nToast.error("error.loadingInvoiceFailed");
      navigate("/mi-cuenta");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center">Cargando factura...</div>
        </div>
      </Layout>
    );
  }

  if (!invoice) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center">No se encontró la factura</div>
        </div>
      </Layout>
    );
  }

  const handlePayNow = () => {
    // Guardar información de la factura en sessionStorage para el flujo de pago
    sessionStorage.setItem("invoice_payment", JSON.stringify({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      total: invoice.total,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      shipping: invoice.shipping || 0,
      discount: invoice.discount || 0
    }));
    
    // Navegar a la página de pago
    navigate("/pago");
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-6 max-w-4xl">
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
          <Button variant="ghost" onClick={() => navigate("/mi-cuenta")} size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Mi Cuenta
          </Button>
          <div className="flex gap-2">
            {invoice.payment_status === 'pending' && (
              <Button onClick={handlePayNow} size="sm">
                💳 Pagar Ahora
              </Button>
            )}
            <Button variant="outline" onClick={handlePrint} size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>

        <InvoiceDisplay invoice={invoice} showActions={false} />
      </div>
    </Layout>
  );
}
