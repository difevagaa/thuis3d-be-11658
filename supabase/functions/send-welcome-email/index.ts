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

interface WelcomeEmailRequest {
  to: string;
  name?: string;
}

const handler = async (req: Request): Promise<Response> => {
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

    const { to, name }: WelcomeEmailRequest = await req.json();

    console.log('📧 Sending welcome email to:', to);

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
    
    if (!RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({ success: false, message: 'Email not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const displayName = escapeHtml(name || 'Cliente');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { 
              background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); 
              color: white; 
              padding: 40px 20px; 
              text-align: center; 
              border-radius: 10px 10px 0 0; 
            }
            .logo { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .welcome-box { 
              background: white; 
              border-left: 4px solid #3b82f6; 
              padding: 20px; 
              margin: 20px 0; 
              border-radius: 5px;
            }
            .btn { 
              display: inline-block;
              background: #3b82f6; 
              color: white !important; 
              padding: 12px 30px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
              font-weight: bold;
            }
            .features { 
              background: white; 
              padding: 20px; 
              margin: 20px 0; 
              border-radius: 5px;
            }
            .feature-item { 
              margin: 15px 0; 
              padding-left: 25px;
              position: relative;
            }
            .feature-item:before {
              content: "✓";
              position: absolute;
              left: 0;
              color: #10b981;
              font-weight: bold;
              font-size: 18px;
            }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">${companyName}</div>
              <h1 style="margin: 0; font-size: 24px;">¡Bienvenido/a!</h1>
            </div>
            <div class="content">
              <div class="welcome-box">
                <h2 style="color: #3b82f6; margin-top: 0;">¡Hola ${displayName}! 👋</h2>
                <p style="font-size: 16px; margin: 0;">
                  Nos alegra que te hayas unido a nuestra comunidad. Tu cuenta ha sido creada exitosamente.
                </p>
              </div>
              
              <div class="features">
                <h3 style="color: #333; margin-top: 0;">¿Qué puedes hacer ahora?</h3>
                <div class="feature-item">Explorar nuestro catálogo completo de productos de impresión 3D</div>
                <div class="feature-item">Realizar pedidos y seguir su estado en tiempo real</div>
                <div class="feature-item">Solicitar cotizaciones personalizadas para tus proyectos</div>
                <div class="feature-item">Recibir notificaciones sobre tus pedidos y facturas</div>
                <div class="feature-item">Acceder a tu historial de compras y facturas</div>
              </div>

              <div style="text-align: center;">
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('https://kvmgikqyjqtmdkscqdcc.supabase.co', 'https://tu-dominio.com') || '#'}" class="btn">
                  Comenzar a Comprar
                </a>
              </div>

              <p style="margin-top: 30px; padding: 15px; background: white; border-radius: 5px;">
                <strong>💡 Consejo:</strong> Completa tu perfil en "Mi Cuenta" para una experiencia personalizada.
              </p>
              
              <div class="footer">
                <p><strong>${companyName}</strong></p>
                <p>Si tienes alguna pregunta, no dudes en contactarnos en ${companyEmail}</p>
                <p style="color: #999; font-size: 12px; margin-top: 15px;">
                  Este es un correo automático, por favor no respondas a este mensaje.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log('📤 Sending to Resend API...');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${companyName} <noreply@thuis3d.be>`,
        to: [to],
        subject: `¡Bienvenido/a a ${companyName}! 🎉`,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('❌ Resend API error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    console.log('✅ Welcome email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error in send-welcome-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
