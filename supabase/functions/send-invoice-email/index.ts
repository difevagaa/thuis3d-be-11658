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

interface InvoiceEmailRequest {
  to: string;
  invoice_number: string;
  total: number;
  due_date?: string;
  order_number?: string;
  customer_name?: string;
  quote_type?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, invoice_number, total, due_date, order_number, customer_name, quote_type }: InvoiceEmailRequest = await req.json();
    
    console.log('📧 Processing invoice email:', { to, invoice_number, quote_type });

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
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
    const safeInvoiceNumber = escapeHtml(invoice_number);
    const safeCustomerName = customer_name ? escapeHtml(customer_name) : '';
    const safeOrderNumber = order_number ? escapeHtml(order_number) : '';
    
    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({ success: false, message: 'Email not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Si es una factura de cotización (quote_type presente), usar template diferente
    if (quote_type) {
      const quoteTypeText = quote_type === 'file_upload' ? 'Archivo 3D' : 
                           quote_type === 'service' ? 'Servicio' : 'Cotización';

      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
              .card { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
              .logo { font-size: 28px; font-weight: bold; color: #3b82f6; }
              .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
              .info-box { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .amount-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
              .amount { font-size: 32px; font-weight: bold; color: #f59e0b; }
              .button { display: inline-block; padding: 14px 28px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
              .footer { text-align: center; margin-top: 30px; color: #999; font-size: 14px; }
              .highlight { color: #3b82f6; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="card">
                <div class="header">
                  <div class="logo">${companyName}</div>
                  <div style="margin-top: 10px;">
                    <span class="success-badge">✅ Cotización Lista</span>
                  </div>
                </div>
                
                <h2 style="color: #1f2937; margin-bottom: 20px;">¡Hola ${safeCustomerName}!</h2>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Tenemos excelentes noticias: tu cotización de <strong>${quoteTypeText}</strong> ha sido procesada y está lista.
                </p>
                
                <div class="info-box">
                  <p style="margin: 0;">
                    <strong>📄 Número de Factura:</strong> <span class="highlight">${safeInvoiceNumber}</span>
                  </p>
                </div>
                
                <div class="amount-box">
                  <p style="margin: 0 0 10px 0; font-size: 14px; color: #92400e;">Monto Total a Pagar:</p>
                  <div class="amount">€${total.toFixed(2)}</div>
                  <p style="margin: 10px 0 0 0; font-size: 12px; color: #92400e;">IVA incluido</p>
                </div>
                
                <p style="font-size: 16px;">
                  Puedes proceder con el pago cuando estés listo. Tu factura está disponible en tu panel de usuario.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://thuis3d.be/mi-cuenta?tab=invoices" class="button">
                    💳 Ver Mi Factura y Pagar
                  </a>
                </div>
                
                <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin-top: 20px;">
                  <p style="margin: 0; font-size: 14px; color: #6b7280;">
                    <strong>💡 Métodos de Pago Disponibles:</strong><br>
                    • PayPal<br>
                    • Transferencia Bancaria<br>
                    • Revolut
                  </p>
                </div>
                
                <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                  Si tienes alguna pregunta sobre tu cotización o factura, no dudes en contactarnos a través de nuestro chat de soporte.
                </p>
                
                <div class="footer">
                  <p>Este es un correo automático de ${companyName}</p>
                  <p>© 2025 ${companyName} - Servicios de Impresión 3D</p>
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
          subject: `✅ Tu Cotización está Lista - Factura ${safeInvoiceNumber}`,
          html: emailHtml,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Resend API error:', data);
        throw new Error(data.message || 'Failed to send email');
      }

      console.log('✅ Quote invoice email sent successfully:', safeInvoiceNumber);

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Template original para facturas de pedidos
    const formattedDueDate = due_date ? new Date(due_date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }) : '';

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
            .invoice-number { font-size: 20px; color: #666; margin-top: 10px; }
            .amount-box { background: #e0f2fe; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .amount { font-size: 32px; font-weight: bold; color: #3b82f6; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #999; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="logo">${companyName}</div>
                <div class="invoice-number">Factura #${safeInvoiceNumber}</div>
              </div>
              
              <h2>Nueva Factura Disponible${safeCustomerName ? ', ' + safeCustomerName : ''}</h2>
              
              <p>Se ha generado una nueva factura${safeOrderNumber ? ' para tu pedido <strong>#' + safeOrderNumber + '</strong>' : ''}.</p>
              
              <div class="amount-box">
                <div style="text-align: center;">
                  <p style="margin: 0; color: #666; font-size: 14px;">Total a pagar</p>
                  <div class="amount">€${total.toFixed(2)}</div>
                  <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
                    Fecha de vencimiento: ${formattedDueDate}
                  </p>
                </div>
              </div>
              
              <p style="margin-top: 30px;">
                Puedes ver tu factura completa y realizar el pago desde tu cuenta:
              </p>
              
              <div style="text-align: center;">
                <a href="https://thuis3d.be/mi-cuenta?tab=invoices" class="button">
                  Ver Factura y Pagar
                </a>
              </div>
              
              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                💡 <strong>Consejo:</strong> Puedes descargar e imprimir tu factura desde tu cuenta en cualquier momento.
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
        subject: `📄 Nueva Factura #${safeInvoiceNumber} - ${companyName}`,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    console.log('Invoice email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-invoice-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
