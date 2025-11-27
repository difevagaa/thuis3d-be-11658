import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

interface LoyaltyPointsEmailRequest {
  user_id: string;
  email: string;
  name: string;
  points_earned: number;
  total_points: number;
  available_coupons: Array<{
    code: string;
    points_required: number;
    discount_type: string;
    discount_value: number;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, points_earned, total_points, available_coupons }: LoyaltyPointsEmailRequest = await req.json();

    console.log('📧 Sending loyalty points email to:', email);

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({ success: false, message: 'Email not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const displayName = escapeHtml(name || 'Cliente');
    const companyName = '3DThuis.be';

    // Generar lista de cupones HTML
    let couponsHtml = '';
    if (available_coupons && available_coupons.length > 0) {
      couponsHtml = available_coupons.map(coupon => {
        const discountText = coupon.discount_type === 'percentage' 
          ? `${coupon.discount_value}% de descuento`
          : coupon.discount_type === 'fixed'
          ? `€${coupon.discount_value} de descuento`
          : 'Envío gratis';
        
        return `
          <div class="coupon-card">
            <div class="coupon-header">
              <span class="coupon-code">${escapeHtml(coupon.code)}</span>
              <span class="coupon-points">${coupon.points_required} pts</span>
            </div>
            <p class="coupon-desc">${discountText}</p>
          </div>
        `;
      }).join('');
    } else {
      couponsHtml = '<p style="text-align: center; color: #666;">Sigue acumulando puntos para desbloquear más recompensas</p>';
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { 
              background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); 
              color: white; 
              padding: 40px 20px; 
              text-align: center; 
              border-radius: 10px 10px 0 0; 
            }
            .logo { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .points-box { 
              background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px;
              margin: 20px 0;
            }
            .points-number {
              font-size: 48px;
              font-weight: bold;
              margin: 10px 0;
            }
            .coupons-section {
              background: white;
              padding: 20px;
              margin: 20px 0;
              border-radius: 10px;
            }
            .coupon-card {
              background: #f8f9fa;
              border: 2px solid #e9ecef;
              border-radius: 8px;
              padding: 15px;
              margin: 10px 0;
            }
            .coupon-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
            }
            .coupon-code {
              font-family: monospace;
              font-size: 18px;
              font-weight: bold;
              color: #3b82f6;
            }
            .coupon-points {
              background: #3b82f6;
              color: white;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: bold;
            }
            .coupon-desc {
              margin: 0;
              color: #666;
              font-size: 14px;
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
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">${companyName}</div>
              <h1 style="margin: 0; font-size: 24px;">🎉 ¡Has ganado puntos!</h1>
            </div>
            <div class="content">
              <p style="font-size: 18px;">¡Hola ${displayName}!</p>
              
              <div class="points-box">
                <p style="margin: 0; font-size: 16px; opacity: 0.9;">Has ganado</p>
                <div class="points-number">+${points_earned}</div>
                <p style="margin: 0; font-size: 16px; opacity: 0.9;">puntos</p>
                <p style="margin-top: 20px; font-size: 14px; opacity: 0.8;">
                  Total acumulado: ${total_points} puntos
                </p>
              </div>

              <div class="coupons-section">
                <h3 style="color: #333; margin-top: 0; text-align: center;">
                  🎁 Cupones Disponibles para Canjear
                </h3>
                ${couponsHtml}
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get('VITE_SUPABASE_URL')?.replace('/supabase', '') || 'https://5126ad6c-b5b9-40b9-bca8-e1425890868a.lovableproject.com'}/cuenta?tab=points" class="btn">
                  Ver Mis Recompensas
                </a>
              </div>

              <p style="margin-top: 30px; padding: 15px; background: white; border-radius: 5px; text-align: center;">
                <strong>💡 Tip:</strong> Sigue comprando para acumular más puntos y desbloquear mejores recompensas
              </p>
              
              <div class="footer">
                <p><strong>${companyName}</strong></p>
                <p>¿Preguntas? Contáctanos en info@thuis3d.be</p>
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
        to: [email],
        subject: `🎉 ¡Has ganado ${points_earned} puntos!`,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('❌ Resend API error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    console.log('✅ Loyalty points email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error in send-loyalty-points-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
