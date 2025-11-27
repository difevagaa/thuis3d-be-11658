import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestEmailRequest {
  to: string;
  test_type: 'order' | 'quote' | 'gift_card' | 'notification';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, test_type }: TestEmailRequest = await req.json();

    console.log('Testing email sending to:', to, 'Type:', test_type);

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RESEND_API_KEY not configured',
          message: 'Email service not configured. Please add RESEND_API_KEY secret.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let emailHtml = '';
    let subject = '';

    switch (test_type) {
      case 'order':
        subject = '🧪 Test: Confirmación de Pedido - Thuis3D.be';
        emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
                .card { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { font-size: 28px; font-weight: bold; color: #3b82f6; }
                .badge { background: #10b981; color: white; padding: 5px 10px; border-radius: 5px; display: inline-block; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="card">
                  <div class="header">
                    <div class="logo">Thuis3D.be</div>
                    <p><span class="badge">EMAIL DE PRUEBA</span></p>
                  </div>
                  <h2>✅ Test: Confirmación de Pedido</h2>
                  <p>Este es un email de prueba para verificar el sistema de confirmación de pedidos.</p>
                  <p><strong>Estado:</strong> ✅ Sistema funcionando correctamente</p>
                </div>
              </div>
            </body>
          </html>
        `;
        break;

      case 'quote':
        subject = '🧪 Test: Solicitud de Cotización - Thuis3D.be';
        emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
                .card { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { font-size: 28px; font-weight: bold; color: #3b82f6; }
                .badge { background: #8b5cf6; color: white; padding: 5px 10px; border-radius: 5px; display: inline-block; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="card">
                  <div class="header">
                    <div class="logo">Thuis3D.be</div>
                    <p><span class="badge">EMAIL DE PRUEBA</span></p>
                  </div>
                  <h2>📝 Test: Solicitud de Cotización</h2>
                  <p>Este es un email de prueba para verificar el sistema de cotizaciones.</p>
                  <p><strong>Estado:</strong> ✅ Sistema funcionando correctamente</p>
                </div>
              </div>
            </body>
          </html>
        `;
        break;

      case 'gift_card':
        subject = '🧪 Test: Tarjeta Regalo - Thuis3D.be';
        emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .badge { background: #f59e0b; color: white; padding: 5px 10px; border-radius: 5px; display: inline-block; margin-top: 10px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎁 Test: Tarjeta Regalo</h1>
                  <span class="badge">EMAIL DE PRUEBA</span>
                </div>
                <div class="content">
                  <p>Este es un email de prueba para verificar el sistema de tarjetas regalo.</p>
                  <p><strong>Estado:</strong> ✅ Sistema funcionando correctamente</p>
                </div>
              </div>
            </body>
          </html>
        `;
        break;

      case 'notification':
        subject = '🧪 Test: Notificación - Thuis3D.be';
        emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .card { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { font-size: 28px; font-weight: bold; color: #3b82f6; }
                .badge { background: #ef4444; color: white; padding: 5px 10px; border-radius: 5px; display: inline-block; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="card">
                  <div class="header">
                    <div class="logo">Thuis3D.be</div>
                    <p><span class="badge">EMAIL DE PRUEBA</span></p>
                  </div>
                  <h2>🔔 Test: Notificación</h2>
                  <p>Este es un email de prueba para verificar el sistema de notificaciones generales.</p>
                  <p><strong>Estado:</strong> ✅ Sistema funcionando correctamente</p>
                </div>
              </div>
            </body>
          </html>
        `;
        break;
    }

    console.log('Attempting to send email via Resend API...');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Thuis3D <noreply@thuis3d.be>',
        to: [to],
        subject: subject,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data,
          message: `Error al enviar email: ${data.message || 'Unknown error'}`
        }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Test email sent successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        message: `Email de prueba tipo "${test_type}" enviado exitosamente a ${to}`,
        email_id: data.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in test-email function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        message: `Error inesperado: ${error.message}`
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
