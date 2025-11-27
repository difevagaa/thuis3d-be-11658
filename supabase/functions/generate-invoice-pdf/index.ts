import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceRequest {
  invoice_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { invoice_id }: InvoiceRequest = await req.json();

    console.log('Generating PDF for invoice:', invoice_id);

    // Obtener datos de la factura
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        order:orders(
          *,
          user:profiles!orders_user_id_fkey(full_name, email, address, phone)
        )
      `)
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      console.error('Error fetching invoice:', invoiceError);
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar que el usuario tiene acceso a esta factura (o es admin)
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const isAdmin = userRoles?.some(r => r.role === 'admin');
    
    if (!isAdmin && invoice.order.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized access to invoice' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Obtener items del pedido
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', invoice.order_id);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
      return new Response(JSON.stringify({ error: 'Error fetching order items' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Obtener información de la empresa desde site_customization
    const { data: companyInfo } = await supabase
      .from('site_customization')
      .select('*')
      .single();

    // Generar HTML para el PDF
    const html = generateInvoiceHTML(invoice, items || [], companyInfo);

    // Devolver el HTML para que el frontend lo convierta a PDF
    return new Response(JSON.stringify({ html, invoice }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in generate-invoice-pdf function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

function generateInvoiceHTML(invoice: any, items: any[], companyInfo: any): string {
  const issueDate = new Date(invoice.issue_date).toLocaleDateString('es-ES');
  const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('es-ES') : 'N/A';
  
  const customer = invoice.order.user;
  const shippingAddress = typeof invoice.order.shipping_address === 'string' 
    ? JSON.parse(invoice.order.shipping_address) 
    : invoice.order.shipping_address;

  // Información de la empresa desde la configuración
  const companyName = companyInfo?.company_name || 'Thuis3D.be';
  const companyAddress = companyInfo?.company_address || 'Calle Principal 123, 28001 Madrid, España';
  const legalEmail = companyInfo?.legal_email || 'info@thuis3d.be';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: letter;
          margin: 0.5cm;
        }
        * {
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 10pt;
          line-height: 1.3;
          color: #1a1a1a;
          max-width: 100%;
          margin: 0;
          padding: 15px;
          background: white;
        }
        .invoice-container {
          max-width: 750px;
          margin: 0 auto;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 8px 8px 0 0;
          margin-bottom: 20px;
        }
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .company-info h1 {
          margin: 0 0 8px 0;
          font-size: 22pt;
          font-weight: 700;
        }
        .company-details {
          font-size: 8.5pt;
          line-height: 1.4;
          opacity: 0.95;
        }
        .invoice-meta {
          text-align: right;
        }
        .invoice-meta h2 {
          margin: 0 0 8px 0;
          font-size: 20pt;
          font-weight: 700;
        }
        .invoice-number {
          font-size: 11pt;
          font-weight: 600;
          background: rgba(255,255,255,0.2);
          padding: 6px 12px;
          border-radius: 4px;
          display: inline-block;
          margin-top: 5px;
        }
        .status-badge {
          display: inline-block;
          padding: 5px 12px;
          border-radius: 4px;
          font-size: 8pt;
          font-weight: 700;
          text-transform: uppercase;
          margin-top: 8px;
        }
        .status-paid {
          background-color: #10b981;
          color: white;
        }
        .status-pending {
          background-color: #f59e0b;
          color: white;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }
        .info-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px;
        }
        .info-card h3 {
          font-size: 8.5pt;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 8px 0;
          font-weight: 600;
        }
        .info-card p {
          margin: 3px 0;
          font-size: 9pt;
          color: #1e293b;
        }
        .info-card strong {
          font-weight: 600;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border-radius: 6px;
          overflow: hidden;
        }
        thead {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        th {
          padding: 10px;
          text-align: left;
          font-size: 9pt;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        td {
          padding: 10px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 9pt;
        }
        tbody tr:last-child td {
          border-bottom: none;
        }
        tbody tr:hover {
          background-color: #f8fafc;
        }
        .text-right {
          text-align: right;
        }
        .text-center {
          text-align: center;
        }
        .item-description {
          color: #64748b;
          font-size: 8pt;
          margin-top: 3px;
        }
        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin-top: 20px;
        }
        .totals {
          width: 320px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 15px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 9.5pt;
        }
        .totals-row.subtotal {
          color: #64748b;
        }
        .totals-row.total {
          border-top: 2px solid #667eea;
          margin-top: 8px;
          padding-top: 10px;
          font-size: 12pt;
          font-weight: 700;
          color: #667eea;
        }
        .notes {
          margin-top: 20px;
          padding: 12px;
          background: #fffbeb;
          border-left: 4px solid #f59e0b;
          border-radius: 4px;
        }
        .notes p {
          margin: 0;
          font-size: 9pt;
          color: #78350f;
        }
        .notes strong {
          font-weight: 600;
        }
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 2px solid #e2e8f0;
          text-align: center;
        }
        .footer p {
          margin: 5px 0;
          font-size: 8.5pt;
          color: #64748b;
        }
        .footer strong {
          color: #1e293b;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="header-content">
            <div class="company-info">
              <h1>${companyName}</h1>
              <div class="company-details">
                <p>${companyAddress}</p>
                <p>Email: ${legalEmail}</p>
              </div>
            </div>
            <div class="invoice-meta">
              <h2>FACTURA</h2>
              <div class="invoice-number">${invoice.invoice_number}</div>
              <div class="status-badge ${invoice.payment_status === 'paid' ? 'status-paid' : 'status-pending'}">
                ${invoice.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
              </div>
            </div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-card">
            <h3>Facturar a</h3>
            <p><strong>${customer.full_name || 'N/A'}</strong></p>
            <p>${customer.email || 'N/A'}</p>
            ${customer.address ? `<p>${customer.address}</p>` : ''}
            ${customer.phone ? `<p>${customer.phone}</p>` : ''}
          </div>
          <div class="info-card">
            <h3>Enviar a</h3>
            <p><strong>${shippingAddress.full_name || shippingAddress.fullName || 'N/A'}</strong></p>
            <p>${shippingAddress.address || 'N/A'}</p>
            <p>${shippingAddress.city || 'N/A'}, ${shippingAddress.postal_code || shippingAddress.postalCode || 'N/A'}</p>
            <p>${shippingAddress.country || 'N/A'}</p>
          </div>
          <div class="info-card">
            <h3>Detalles</h3>
            <p><strong>Emisión:</strong> ${issueDate}</p>
            <p><strong>Vencimiento:</strong> ${dueDate}</p>
            <p><strong>Pago:</strong> ${invoice.payment_method || 'N/A'}</p>
            <p><strong>Pedido:</strong> ${invoice.order.order_number}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th class="text-center">Cant.</th>
              <th class="text-right">Precio Unit.</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>
                  <strong>${item.product_name}</strong>
                  ${item.custom_text ? `<div class="item-description">Texto: ${item.custom_text}</div>` : ''}
                </td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">€${Number(item.unit_price).toFixed(2)}</td>
                <td class="text-right">€${Number(item.total_price).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals-section">
          <div class="totals">
            <div class="totals-row subtotal">
              <span>Subtotal:</span>
              <span>€${Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            ${Number(invoice.tax) > 0 ? `
              <div class="totals-row subtotal">
                <span>IVA (21%):</span>
                <span>€${Number(invoice.tax).toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="totals-row total">
              <span>TOTAL:</span>
              <span>€${Number(invoice.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        ${invoice.notes ? `
          <div class="notes">
            <p><strong>Notas:</strong> ${invoice.notes}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p><strong>Gracias por su compra</strong></p>
          <p>Esta es una factura generada electrónicamente y no requiere firma.</p>
          <p>Para cualquier consulta, contacte a ${legalEmail}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
