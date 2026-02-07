import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Multilingual templates
const templates = {
  es: {
    subject: '✅ Confirmación de Pedido #{{order_number}} - {{company_name}}',
    greeting: '¡Gracias por tu pedido{{customer_name}}!',
    intro: 'Hemos recibido tu pedido correctamente. A continuación encontrarás los detalles:',
    product: 'Producto',
    quantity: 'Cantidad',
    unitPrice: 'Precio Unit.',
    total: 'Total',
    subtotal: 'Subtotal',
    shipping: 'Envío',
    shippingFree: 'GRATIS',
    tax: 'IVA (21%)',
    discount: 'Descuento',
    totalLabel: 'TOTAL',
    statusInfo: 'Te mantendremos informado sobre el estado de tu pedido. Recibirás una notificación cuando esté listo para envío.',
    footer: 'Este es un correo automático de {{company_name}}',
    contact: 'Si tienes alguna pregunta, contáctanos en {{email}}'
  },
  en: {
    subject: '✅ Order Confirmation #{{order_number}} - {{company_name}}',
    greeting: 'Thank you for your order{{customer_name}}!',
    intro: 'We have received your order successfully. Here are the details:',
    product: 'Product',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    total: 'Total',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    shippingFree: 'FREE',
    tax: 'VAT (21%)',
    discount: 'Discount',
    totalLabel: 'TOTAL',
    statusInfo: 'We will keep you informed about your order status. You will receive a notification when it is ready for shipping.',
    footer: 'This is an automated email from {{company_name}}',
    contact: 'If you have any questions, contact us at {{email}}'
  },
  nl: {
    subject: '✅ Orderbevestiging #{{order_number}} - {{company_name}}',
    greeting: 'Bedankt voor je bestelling{{customer_name}}!',
    intro: 'We hebben je bestelling goed ontvangen. Hier zijn de details:',
    product: 'Product',
    quantity: 'Aantal',
    unitPrice: 'Stukprijs',
    total: 'Totaal',
    subtotal: 'Subtotaal',
    shipping: 'Verzending',
    shippingFree: 'GRATIS',
    tax: 'BTW (21%)',
    discount: 'Korting',
    totalLabel: 'TOTAAL',
    statusInfo: 'We houden je op de hoogte van de status van je bestelling. Je ontvangt een melding wanneer deze klaar is voor verzending.',
    footer: 'Dit is een automatische e-mail van {{company_name}}',
    contact: 'Als je vragen hebt, neem contact met ons op via {{email}}'
  }
};

type Lang = 'es' | 'en' | 'nl';
function getLang(lang?: string | null): Lang {
  const l = (lang?.split('-')[0]?.toLowerCase() || 'en') as Lang;
  return ['es', 'en', 'nl'].includes(l) ? l : 'en';
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
  language?: string;
  user_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, order_number, subtotal, tax, shipping, discount, total, items, customer_name, language, user_id }: OrderEmailRequest = await req.json();
    
    const safeSubtotal = Number(subtotal) || 0;
    const safeTax = Number(tax) || 0;
    const safeShipping = Number(shipping) || 0;
    const safeDiscount = Number(discount) || 0;
    const safeTotal = Number(total) || 0;
    
    console.log('📧 Processing order confirmation email:', { to, order_number, total: safeTotal, language });

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    // Get user's preferred language from profile if not provided
    let userLang = language;
    if (!userLang && user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', user_id)
        .single();
      userLang = profile?.preferred_language;
    }
    
    // Also try to get language by email if still not found
    if (!userLang) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('email', to)
        .single();
      userLang = profile?.preferred_language;
    }
    
    const lang = getLang(userLang);
    const t = templates[lang];
    
    const { data: companyInfo } = await supabase
      .from('site_customization')
      .select('company_name, legal_email, site_name')
      .single();
    
    const companyName = escapeHtml(companyInfo?.company_name || companyInfo?.site_name || 'Thuis3D.be');
    const companyEmail = escapeHtml(companyInfo?.legal_email || 'info@thuis3d.be');
    const safeOrderNumber = escapeHtml(order_number);
    const safeCustomerName = customer_name ? ', ' + escapeHtml(customer_name) : '';
    
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
                <div class="order-number">${lang === 'nl' ? 'Bestelling' : lang === 'en' ? 'Order' : 'Pedido'} #${safeOrderNumber}</div>
              </div>
              
              <h2>${t.greeting.replace('{{customer_name}}', safeCustomerName)}</h2>
              <p>${t.intro}</p>
              
              <table>
                <thead>
                  <tr style="background: #f5f5f5;">
                    <th style="padding: 12px; text-align: left;">${t.product}</th>
                    <th style="padding: 12px; text-align: center;">${t.quantity}</th>
                    <th style="padding: 12px; text-align: right;">${t.unitPrice}</th>
                    <th style="padding: 12px; text-align: right;">${t.total}</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsList}
                </tbody>
              </table>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin-top: 20px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                  <span>${t.subtotal}:</span>
                  <span style="font-weight: bold;">€${safeSubtotal.toFixed(2)}</span>
                </div>
                ${safeShipping > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span>${t.shipping}:</span>
                    <span style="font-weight: bold;">€${safeShipping.toFixed(2)}</span>
                  </div>
                ` : `<div style="display: flex; justify-content: space-between; padding: 8px 0;"><span>${t.shipping}:</span><span style="font-weight: bold; color: #10b981;">${t.shippingFree}</span></div>`}
                ${safeTax > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span>${t.tax}:</span>
                    <span style="font-weight: bold;">€${safeTax.toFixed(2)}</span>
                  </div>
                ` : ''}
                ${safeDiscount > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #10b981;">
                    <span>${t.discount}:</span>
                    <span style="font-weight: bold;">-€${safeDiscount.toFixed(2)}</span>
                  </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #ddd; margin-top: 10px;">
                  <span style="font-size: 20px; font-weight: bold;">${t.totalLabel}:</span>
                  <span style="font-size: 24px; font-weight: bold; color: #3b82f6;">€${safeTotal.toFixed(2)}</span>
                </div>
              </div>
              
              <p style="margin-top: 30px;">${t.statusInfo}</p>
              
              <div class="footer">
                <p>${t.footer.replace('{{company_name}}', companyName)}</p>
                <p>${t.contact.replace('{{email}}', companyEmail)}</p>
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
        subject: t.subject.replace('{{order_number}}', safeOrderNumber).replace('{{company_name}}', companyName),
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    console.log('✅ Order confirmation email sent successfully:', data);

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
