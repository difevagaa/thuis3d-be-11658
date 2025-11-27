import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple rate limiter: max 2 requests per second
let lastRequestTime = 0;
const MIN_DELAY_MS = 600; // 600ms between requests (just under 2 per second)

async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_DELAY_MS) {
    const waitTime = MIN_DELAY_MS - timeSinceLastRequest;
    console.log(`⏳ Rate limiting: waiting ${waitTime}ms before sending email`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

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

interface QuoteEmailRequest {
  to: string;
  customer_name: string;
  quote_type: string;
  description: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, customer_name, quote_type, description }: QuoteEmailRequest = await req.json();

    console.log('Sending quote email to:', to);

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
    const safeCustomerName = escapeHtml(customer_name);
    const safeQuoteType = escapeHtml(quote_type);
    const safeDescription = escapeHtml(description);
    
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
            .info-box { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #999; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="logo">${companyName}</div>
                <h2>¡Gracias por tu solicitud de cotización!</h2>
              </div>
              
              <p>Hola ${safeCustomerName},</p>
              <p>Hemos recibido tu solicitud de cotización para ${safeQuoteType}. A continuación encontrarás los detalles:</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0;">Detalles de la solicitud:</h3>
                <p style="white-space: pre-wrap; margin: 0;">${safeDescription}</p>
              </div>
              
              <p>Nuestro equipo revisará tu solicitud y te contactaremos pronto con una cotización detallada.</p>
              <p>Normalmente respondemos en un plazo de 24-48 horas laborables.</p>
              
              <p style="margin-top: 30px;">
                <strong>¿Tienes alguna pregunta?</strong><br>
                No dudes en contactarnos a través de nuestro sitio web.
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

    // Wait for rate limit before making request
    await waitForRateLimit();

    console.log(`📧 Sending email to: ${to}`);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${companyName} <noreply@thuis3d.be>`,
        to: [to],
        subject: `✅ Solicitud de Cotización Recibida - ${companyName}`,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    console.log('Quote email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-quote-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
