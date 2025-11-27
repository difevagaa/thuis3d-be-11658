import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HTML escaping function to prevent XSS attacks in email templates
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

interface OrderEmailRequest {
  to: string;
  order_number: string;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
  customer_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, order_number, subtotal, tax, shipping, discount, total, items, customer_name }: OrderEmailRequest = await req.json();
    
    // Asegurar valores por defecto para evitar undefined
    const safeSubtotal = Number(subtotal) || 0;
    const safeTax = Number(tax) || 0;
    const safeShipping = Number(shipping) || 0;
    const safeDiscount = Number(discount) || 0;
    const safeTotal = Number(total) || 0;
    
    console.log('📧 Processing order confirmation email:', { to, order_number, total: safeTotal });

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    // Get company info from site_customization
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const { data: companyInfo } = await supabase
      .from('site_customization')
      .select('company_name, legal_email, site_name')
      .single();
    
    const companyName = escapeHtml(companyInfo?.company_name || companyInfo?.site_name || 'Thuis3D.be');
    const companyEmail = escapeHtml(companyInfo?.legal_email || 'info@thuis3d.be');
    const safeOrderNumber = escapeHtml(order_number);
    const safeCustomerName = customer_name ? escapeHtml(customer_name) : '';
    
    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({ success: false, message: 'Email not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const itemsList = items.map(item => {
      const unitPrice = Number(item.unit_price) || 0;
      const quantity = Number(item.quantity) || 1;
      const totalPrice = unitPrice * quantity;
      
      return `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(item.product_name || 'Producto')}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">€${unitPrice.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">€${totalPrice.toFixed(2)}</td>
      </tr>`;
    }).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
            .card { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #3b82f6; }
            .order-number { font-size: 18px; color: #666; margin-top: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .total { font-size: 24px; font-weight: bold; color: #3b82f6; text-align: right; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #999; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="logo">${companyName}</div>
                <div class="order-number">Pedido #${safeOrderNumber}</div>
              </div>
              
              <h2>¡Gracias por tu pedido${safeCustomerName ? ', ' + safeCustomerName : ''}!</h2>
              <p>Hemos recibido tu pedido correctamente. A continuación encontrarás los detalles:</p>
              
              <table>
                <thead>
                  <tr style="background: #f5f5f5;">
                    <th style="padding: 12px; text-align: left;">Producto</th>
                    <th style="padding: 12px; text-align: center;">Cantidad</th>
                    <th style="padding: 12px; text-align: right;">Precio Unit.</th>
                    <th style="padding: 12px; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsList}
                </tbody>
              </table>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin-top: 20px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                  <span>Subtotal:</span>
                  <span style="font-weight: bold;">€${safeSubtotal.toFixed(2)}</span>
                </div>
                ${safeShipping > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span>Envío:</span>
                    <span style="font-weight: bold;">€${safeShipping.toFixed(2)}</span>
                  </div>
                ` : '<div style="display: flex; justify-content: space-between; padding: 8px 0;"><span>Envío:</span><span style="font-weight: bold; color: #10b981;">GRATIS</span></div>'}
                ${safeTax > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span>IVA (21%):</span>
                    <span style="font-weight: bold;">€${safeTax.toFixed(2)}</span>
                  </div>
                ` : ''}
                ${safeDiscount > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #10b981;">
                    <span>Descuento:</span>
                    <span style="font-weight: bold;">-€${safeDiscount.toFixed(2)}</span>
                  </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #ddd; margin-top: 10px;">
                  <span style="font-size: 20px; font-weight: bold;">TOTAL:</span>
                  <span style="font-size: 24px; font-weight: bold; color: #3b82f6;">€${safeTotal.toFixed(2)}</span>
                </div>
              </div>
              
              <p style="margin-top: 30px;">
                Te mantendremos informado sobre el estado de tu pedido.
                Recibirás una notificación cuando esté listo para envío.
              </p>
              
              <div class="footer">
                <p>Este es un correo automático de ${companyName}</p>
                <p>Si tienes alguna pregunta, contáctanos en ${companyEmail}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${companyName} <noreply@thuis3d.be>`,
        to: [to],
        subject: `✅ Confirmación de Pedido #${safeOrderNumber} - ${companyName}`,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    console.log('Order confirmation email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-order-confirmation function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
