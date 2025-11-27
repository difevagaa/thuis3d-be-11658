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

interface GiftCardEmailRequest {
  recipient_email: string;
  sender_name: string;
  gift_card_code: string;
  amount: number;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { recipient_email, sender_name, gift_card_code, amount, message }: GiftCardEmailRequest = await req.json();

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
    const safeSenderName = escapeHtml(sender_name);
    const safeGiftCardCode = escapeHtml(gift_card_code);
    const safeMessage = message ? escapeHtml(message) : null;
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .gift-card { background: white; border: 2px dashed #667eea; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
            .code { font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px; margin: 15px 0; font-family: monospace; }
            .amount { font-size: 32px; font-weight: bold; color: #764ba2; margin: 10px 0; }
            .message-box { background: #fff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎁 ¡Has Recibido una Tarjeta Regalo!</h1>
              <p>De parte de ${safeSenderName}</p>
            </div>
            <div class="content">
              <div class="gift-card">
                <p style="color: #666; margin-bottom: 10px;">Tu tarjeta regalo de</p>
                <div class="amount">€${amount.toFixed(2)}</div>
                <p style="color: #666; margin: 15px 0;">Código de la tarjeta:</p>
                <div class="code">${safeGiftCardCode}</div>
              </div>
              
              ${safeMessage ? `
              <div class="message-box">
                <p style="margin: 0; color: #666; font-size: 14px;"><strong>Mensaje personal:</strong></p>
                <p style="margin: 10px 0 0 0;">${safeMessage}</p>
              </div>
              ` : ''}
              
              <h3 style="color: #667eea; margin-top: 30px;">¿Cómo usar tu tarjeta regalo?</h3>
              <ol style="color: #666;">
                <li>Visita nuestro sitio web: <strong>${companyName}</strong></li>
                <li>Selecciona los productos que desees</li>
                <li>En el carrito, ingresa el código de tu tarjeta regalo</li>
                <li>¡El descuento se aplicará automáticamente!</li>
              </ol>
              
              <p style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 5px; color: #856404;">
                <strong>📌 Importante:</strong> Guarda este email en un lugar seguro. Necesitarás el código para usar tu tarjeta regalo.
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
        to: [recipient_email],
        subject: `🎁 ¡Has recibido una Tarjeta Regalo de ${companyName}!`,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    console.log('Email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-gift-card-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
