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
    subject: '🎁 ¡Has recibido una Tarjeta Regalo de {{company_name}}!',
    title: '🎁 ¡Has Recibido una Tarjeta Regalo!',
    fromPerson: 'De parte de {{sender_name}}',
    giftCardTitle: 'Tarjeta Regalo',
    notForSale: 'No vendible',
    from: 'De:',
    website: 'www.thuis3d.be • Uso exclusivo tienda online',
    howToUse: '¿Cómo usar tu tarjeta regalo?',
    step1: 'Visita nuestro sitio web: <strong>{{company_name}}</strong>',
    step2: 'Selecciona los productos que desees',
    step3: 'En el carrito, ingresa el código de tu tarjeta regalo',
    step4: '¡El descuento se aplicará automáticamente!',
    important: '📌 Importante:',
    saveEmail: 'Guarda este email en un lugar seguro. Necesitarás el código para usar tu tarjeta regalo.',
    footer: 'Este es un correo automático de {{company_name}}',
    contact: 'Si tienes preguntas, contáctanos en {{email}}'
  },
  en: {
    subject: '🎁 You have received a Gift Card from {{company_name}}!',
    title: '🎁 You Have Received a Gift Card!',
    fromPerson: 'From {{sender_name}}',
    giftCardTitle: 'Gift Card',
    notForSale: 'Not for sale',
    from: 'From:',
    website: 'www.thuis3d.be • Online store use only',
    howToUse: 'How to use your gift card?',
    step1: 'Visit our website: <strong>{{company_name}}</strong>',
    step2: 'Select the products you want',
    step3: 'In the cart, enter your gift card code',
    step4: 'The discount will be applied automatically!',
    important: '📌 Important:',
    saveEmail: 'Save this email in a safe place. You will need the code to use your gift card.',
    footer: 'This is an automated email from {{company_name}}',
    contact: 'If you have questions, contact us at {{email}}'
  },
  nl: {
    subject: '🎁 Je hebt een Cadeaukaart ontvangen van {{company_name}}!',
    title: '🎁 Je Hebt een Cadeaukaart Ontvangen!',
    fromPerson: 'Van {{sender_name}}',
    giftCardTitle: 'Cadeaukaart',
    notForSale: 'Niet te koop',
    from: 'Van:',
    website: 'www.thuis3d.be • Alleen voor online winkelgebruik',
    howToUse: 'Hoe gebruik je je cadeaukaart?',
    step1: 'Bezoek onze website: <strong>{{company_name}}</strong>',
    step2: 'Selecteer de producten die je wilt',
    step3: 'Voer in het winkelmandje je cadeaukaartcode in',
    step4: 'De korting wordt automatisch toegepast!',
    important: '📌 Belangrijk:',
    saveEmail: 'Bewaar deze e-mail op een veilige plaats. Je hebt de code nodig om je cadeaukaart te gebruiken.',
    footer: 'Dit is een automatische e-mail van {{company_name}}',
    contact: 'Als je vragen hebt, neem contact met ons op via {{email}}'
  }
};

type Lang = 'es' | 'en' | 'nl';
function getLang(lang?: string | null): Lang {
  const l = (lang?.split('-')[0]?.toLowerCase() || 'nl') as Lang;
  return ['es', 'en', 'nl'].includes(l) ? l : 'nl';
}

interface GiftCardEmailRequest {
  recipient_email: string;
  sender_name: string;
  gift_card_code: string;
  amount: number;
  message?: string;
  themeId?: string;
  iconId?: string;
  language?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { recipient_email, sender_name, gift_card_code, amount, message, themeId, iconId, language }: GiftCardEmailRequest = await req.json();

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    // Define theme colors
    const themes: Record<string, { gradient: string; bgColor: string; textColor: string }> = {
      ocean: { gradient: 'linear-gradient(135deg, #60a5fa 0%, #22d3ee 50%, #2dd4bf 100%)', bgColor: '#22d3ee', textColor: '#ffffff' },
      forest: { gradient: 'linear-gradient(135deg, #34d399 0%, #4ade80 50%, #a3e635 100%)', bgColor: '#4ade80', textColor: '#ffffff' },
      sunset: { gradient: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 50%, #facc15 100%)', bgColor: '#fb923c', textColor: '#ffffff' },
      lavender: { gradient: 'linear-gradient(135deg, #c084fc 0%, #a78bfa 50%, #818cf8 100%)', bgColor: '#a78bfa', textColor: '#ffffff' },
      rose: { gradient: 'linear-gradient(135deg, #f9a8d4 0%, #fb7185 50%, #f87171 100%)', bgColor: '#fb7185', textColor: '#ffffff' },
      slate: { gradient: 'linear-gradient(135deg, #94a3b8 0%, #9ca3af 50%, #a1a1aa 100%)', bgColor: '#9ca3af', textColor: '#ffffff' },
      mint: { gradient: 'linear-gradient(135deg, #5eead4 0%, #67e8f9 50%, #7dd3fc 100%)', bgColor: '#67e8f9', textColor: '#ffffff' },
      peach: { gradient: 'linear-gradient(135deg, #fed7aa 0%, #fecdd3 50%, #fecaca 100%)', bgColor: '#fecdd3', textColor: '#1f2937' }
    };
    
    const icons: Record<string, string> = {
      gift: '🎁', celebration: '🎉', heart: '❤️', star: '⭐', cake: '🎂',
      balloon: '🎈', flower: '🌸', sparkles: '✨', rocket: '🚀', trophy: '🏆'
    };
    
    const selectedTheme = themes[themeId || 'ocean'] || themes.ocean;
    const selectedIcon = icons[iconId || 'gift'] || icons.gift;
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    // Get user's preferred language
    let userLang = language;
    if (!userLang) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('email', recipient_email)
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
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${selectedTheme.gradient}; color: ${selectedTheme.textColor}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .gift-card-wrapper { background: white; padding: 20px; margin: 20px 0; text-align: center; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
            .gift-card { position: relative; width: 100%; max-width: 450px; margin: 0 auto; aspect-ratio: 16/10; background: ${selectedTheme.gradient}; border-radius: 16px; padding: 32px; box-sizing: border-box; color: ${selectedTheme.textColor}; overflow: hidden; }
            .gift-card-pattern { position: absolute; inset: 0; opacity: 0.2; background-image: radial-gradient(circle at 30px 30px, white 3px, transparent 3px); background-size: 60px 60px; }
            .gift-card-content { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
            .gift-card-icon { font-size: 48px; line-height: 1; margin-bottom: 8px; }
            .gift-card-title { font-size: 24px; font-weight: bold; margin: 0; }
            .gift-card-badge { background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; }
            .gift-card-amount { font-size: 64px; font-weight: bold; line-height: 1; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .gift-card-code-box { background: white; color: ${selectedTheme.bgColor}; padding: 12px 24px; border-radius: 12px; display: inline-block; font-family: monospace; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin-top: 16px; }
            .gift-card-message { background: rgba(255,255,255,0.2); padding: 12px; border-radius: 8px; margin-bottom: 12px; font-style: italic; }
            .message-box { background: #fff; border-left: 4px solid ${selectedTheme.bgColor}; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${t.title}</h1>
              <p>${t.fromPerson.replace('{{sender_name}}', safeSenderName)}</p>
            </div>
            <div class="content">
              <div class="gift-card-wrapper">
                <div class="gift-card">
                  <div class="gift-card-pattern"></div>
                  <div class="gift-card-content">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                      <div>
                        <div class="gift-card-icon">${selectedIcon}</div>
                        <h2 class="gift-card-title">${t.giftCardTitle}</h2>
                        <p style="font-size: 16px; opacity: 0.9; margin: 4px 0 0 0;">Thuis3D.be</p>
                      </div>
                      <div class="gift-card-badge">${t.notForSale}</div>
                    </div>
                    
                    <div style="text-align: center; margin: 20px 0;">
                      <div class="gift-card-amount">€${amount.toFixed(2)}</div>
                      <div class="gift-card-code-box">${safeGiftCardCode}</div>
                    </div>
                    
                    <div>
                      ${safeMessage ? `<div class="gift-card-message">${safeMessage}</div>` : ''}
                      ${safeSenderName ? `<p style="font-size: 14px; text-align: center; margin: 8px 0; font-weight: 600;">${t.from} <strong>${safeSenderName}</strong></p>` : ''}
                      <p style="text-align: center; font-size: 12px; opacity: 0.7; margin-top: 8px;">${t.website}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <h3 style="color: ${selectedTheme.bgColor}; margin-top: 30px;">${t.howToUse}</h3>
              <ol style="color: #666;">
                <li>${t.step1.replace('{{company_name}}', companyName)}</li>
                <li>${t.step2}</li>
                <li>${t.step3}</li>
                <li>${t.step4}</li>
              </ol>
              
              <p style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 5px; color: #856404;">
                <strong>${t.important}</strong> ${t.saveEmail}
              </p>
              
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
        to: [recipient_email],
        subject: t.subject.replace('{{company_name}}', companyName),
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    console.log('✅ Gift card email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-gift-card-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
