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

interface QuoteUpdateEmailRequest {
  to: string;
  customer_name: string;
  quote_type: string;
  estimated_price: number;
  description?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, customer_name, quote_type, estimated_price, description }: QuoteUpdateEmailRequest = await req.json();
    
    console.log('📧 Processing quote update email:', { to, quote_type });

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
    const safeCustomerName = escapeHtml(customer_name);
    const safeQuoteType = escapeHtml(quote_type);
    const safeDescription = description ? escapeHtml(description) : '';
    
    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({ success: false, message: 'Email not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
            .price-box { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; margin: 20px 0; border-radius: 10px; text-align: center; }
            .price { font-size: 48px; font-weight: bold; margin: 10px 0; }
            .info-box { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #999; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="logo">${companyName}</div>
                <h2>¡Tu Cotización está Lista! 🎉</h2>
              </div>
              
              <p>Hola ${safeCustomerName},</p>
              <p>Hemos evaluado tu solicitud de cotización para <strong>${safeQuoteType}</strong> y tenemos una propuesta para ti:</p>
              
              <div class="price-box">
                <div style="font-size: 18px; opacity: 0.9;">Precio Estimado</div>
                <div class="price">€${estimated_price.toFixed(2)}</div>
                <div style="font-size: 14px; opacity: 0.8;">IVA incluido</div>
              </div>
              
              ${safeDescription ? `
                <div class="info-box">
                  <h3 style="margin-top: 0;">Detalles del proyecto:</h3>
                  <p style="margin: 0; white-space: pre-wrap;">${safeDescription}</p>
                </div>
              ` : ''}
              
              <p style="margin-top: 30px;">
                <strong>📋 Próximos pasos:</strong>
              </p>
              <ol style="padding-left: 20px;">
                <li>Revisa los detalles de la cotización</li>
                <li>Si estás de acuerdo, podemos proceder con el pedido</li>
                <li>Contáctanos si tienes alguna pregunta o ajuste</li>
              </ol>
              
              <div style="text-align: center;">
                <a href="https://thuis3d.be/mi-cuenta" class="button">
                  Ver Mi Cotización
                </a>
              </div>
              
              <p style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
                ⏰ <strong>Importante:</strong> Esta cotización tiene una validez de 30 días a partir de hoy.
              </p>
              
              <div class="footer">
                <p>Este es un correo automático de ${companyName}</p>
                <p>Si tienes preguntas, contáctanos en ${companyEmail}</p>
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
        subject: `💰 Tu Cotización está Lista - ${companyName}`,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    console.log('Quote update email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-quote-update-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
