import { useState, useEffect, useCallback } from "react";
import { logger } from '@/lib/logger';
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Printer } from "lucide-react";
import InvoiceDisplay from "@/components/InvoiceDisplay";

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadInvoice = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          user:profiles!invoices_user_id_fkey(full_name, email, phone, address),
          order:orders!invoices_order_id_fkey(order_number, order_items(*))
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      setInvoice(data);
    } catch (error: any) {
      logger.error("Error loading invoice:", error);
      toast.error("Error al cargar factura");
      navigate("/admin/facturas");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Cargando factura...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">No se encontró la factura</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => navigate("/admin/facturas")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Facturas
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      <InvoiceDisplay invoice={invoice} />
    </div>
  );
}
