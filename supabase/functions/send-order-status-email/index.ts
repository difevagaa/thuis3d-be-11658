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

interface OrderStatusEmailRequest {
  to: string;
  order_number: string;
  old_status: string;
  new_status: string;
  customer_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, order_number, old_status, new_status, customer_name }: OrderStatusEmailRequest = await req.json();
    
    console.log('📧 Processing order status email:', { to, order_number, new_status });

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
    const safeOrderNumber = escapeHtml(order_number);
    const safeNewStatus = escapeHtml(new_status);
    const safeCustomerName = customer_name ? escapeHtml(customer_name) : '';
    
    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({ success: false, message: 'Email not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determinar el icono y color según el estado
    let statusIcon = '📦';
    let statusColor = '#3b82f6';
    
    if (new_status.toLowerCase().includes('entregado') || new_status.toLowerCase().includes('completado')) {
      statusIcon = '✅';
      statusColor = '#10b981';
    } else if (new_status.toLowerCase().includes('enviado') || new_status.toLowerCase().includes('en camino')) {
      statusIcon = '🚚';
      statusColor = '#8b5cf6';
    } else if (new_status.toLowerCase().includes('procesando') || new_status.toLowerCase().includes('preparando')) {
      statusIcon = '⚙️';
      statusColor = '#f59e0b';
    } else if (new_status.toLowerCase().includes('cancelado')) {
      statusIcon = '❌';
      statusColor = '#ef4444';
    }

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
            .status-box { background: #f5f5f5; border-left: 4px solid ${statusColor}; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .status-icon { font-size: 48px; text-align: center; margin-bottom: 10px; }
            .status-text { font-size: 24px; font-weight: bold; color: ${statusColor}; text-align: center; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #999; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="logo">${companyName}</div>
              </div>
              
              <h2>Actualización de tu Pedido${safeCustomerName ? ', ' + safeCustomerName : ''}</h2>
              
              <p>Tu pedido <strong>#${safeOrderNumber}</strong> ha sido actualizado:</p>
              
              <div class="status-box">
                <div class="status-icon">${statusIcon}</div>
                <div class="status-text">${safeNewStatus}</div>
              </div>
              
              <p style="margin-top: 30px;">
                Puedes ver el detalle completo de tu pedido y seguir su progreso desde tu cuenta:
              </p>
              
              <div style="text-align: center;">
                <a href="https://thuis3d.be/mi-cuenta" class="button">
                  Ver Mi Pedido
                </a>
              </div>
              
              <p style="margin-top: 30px; font-size: 14px; color: #666; padding: 15px; background: #f5f5f5; border-radius: 5px;">
                💡 <strong>Consejo:</strong> Recibirás una notificación cada vez que tu pedido cambie de estado.
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
        subject: `${statusIcon} Actualización de Pedido #${safeOrderNumber} - ${companyName}`,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    console.log('Order status email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-order-status-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
