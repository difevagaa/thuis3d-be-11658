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
    subject: '👀 Hay cambios en tu cotización - {{company_name}}',
    title: '¡Ey! Hay cambios en tu cotización 👀',
    greeting: 'Hola {{customer_name}},',
    intro: 'Actualizamos tu cotización de <strong>{{quote_type}}</strong>. Revisa los cambios y dinos si la apruebas o necesitas ajustes.',
    estimatedPrice: 'Precio Estimado',
    vatIncluded: 'IVA incluido',
    detailsTitle: 'Detalles del proyecto:',
    nextSteps: '📋 Próximos pasos:',
    step1: 'Revisa los detalles de la cotización',
    step2: 'Marca si apruebas los cambios o déjanos un comentario',
    step3: 'Nos pondremos en marcha en cuanto lo confirmes',
    reviewButton: 'Revisar Cotización',
    validityWarning: '⏰ <strong>Importante:</strong> Esta cotización tiene una validez de 30 días a partir de hoy.',
    footer: 'Este es un correo automático de {{company_name}}',
    contact: 'Si tienes preguntas, contáctanos en {{email}}'
  },
  en: {
    subject: '👀 Changes to your quote - {{company_name}}',
    title: 'Hey! There are changes to your quote 👀',
    greeting: 'Hello {{customer_name}},',
    intro: 'We have updated your quote for <strong>{{quote_type}}</strong>. Please review the changes and let us know if you approve or need adjustments.',
    estimatedPrice: 'Estimated Price',
    vatIncluded: 'VAT included',
    detailsTitle: 'Project details:',
    nextSteps: '📋 Next steps:',
    step1: 'Review the quote details',
    step2: 'Approve the changes or leave us a comment',
    step3: 'We will get started as soon as you confirm',
    reviewButton: 'Review Quote',
    validityWarning: '⏰ <strong>Important:</strong> This quote is valid for 30 days from today.',
    footer: 'This is an automated email from {{company_name}}',
    contact: 'If you have questions, contact us at {{email}}'
  },
  nl: {
    subject: '👀 Wijzigingen in je offerte - {{company_name}}',
    title: 'Hé! Er zijn wijzigingen in je offerte 👀',
    greeting: 'Hallo {{customer_name}},',
    intro: 'We hebben je offerte voor <strong>{{quote_type}}</strong> bijgewerkt. Bekijk de wijzigingen en laat ons weten of je akkoord gaat of aanpassingen nodig hebt.',
    estimatedPrice: 'Geschatte Prijs',
    vatIncluded: 'BTW inbegrepen',
    detailsTitle: 'Projectdetails:',
    nextSteps: '📋 Volgende stappen:',
    step1: 'Bekijk de offertedetails',
    step2: 'Keur de wijzigingen goed of laat een opmerking achter',
    step3: 'We gaan aan de slag zodra je bevestigt',
    reviewButton: 'Offerte Bekijken',
    validityWarning: '⏰ <strong>Belangrijk:</strong> Deze offerte is 30 dagen geldig vanaf vandaag.',
    footer: 'Dit is een automatische e-mail van {{company_name}}',
    contact: 'Als je vragen hebt, neem contact met ons op via {{email}}'
  }
};

type Lang = 'es' | 'en' | 'nl';
function getLang(lang?: string | null): Lang {
  const l = (lang?.split('-')[0]?.toLowerCase() || 'en') as Lang;
  return ['es', 'en', 'nl'].includes(l) ? l : 'en';
}

interface QuoteUpdateEmailRequest {
  to: string;
  customer_name: string;
  quote_type: string;
  estimated_price: number;
  description?: string;
  language?: string;
  user_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, customer_name, quote_type, estimated_price, description, language, user_id }: QuoteUpdateEmailRequest = await req.json();
    
    console.log('📧 Processing quote update email:', { to, quote_type, language });

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    // Get user's preferred language
    let userLang = language;
    if (!userLang && user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', user_id)
        .single();
      userLang = profile?.preferred_language;
    }
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

    const showPrice = Number.isFinite(estimated_price) && estimated_price > 0;
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
                <h2>${t.title}</h2>
              </div>
              
              <p>${t.greeting.replace('{{customer_name}}', safeCustomerName)}</p>
              <p>${t.intro.replace('{{quote_type}}', safeQuoteType)}</p>
              
              ${showPrice ? `
                <div class="price-box">
                  <div style="font-size: 18px; opacity: 0.9;">${t.estimatedPrice}</div>
                  <div class="price">€${estimated_price.toFixed(2)}</div>
                  <div style="font-size: 14px; opacity: 0.8;">${t.vatIncluded}</div>
                </div>
              ` : ''}
              
              ${safeDescription ? `
                <div class="info-box">
                  <h3 style="margin-top: 0;">${t.detailsTitle}</h3>
                  <p style="margin: 0; white-space: pre-wrap;">${safeDescription}</p>
                </div>
              ` : ''}
              
              <p style="margin-top: 30px;">
                <strong>${t.nextSteps}</strong>
              </p>
              <ol style="padding-left: 20px;">
                <li>${t.step1}</li>
                <li>${t.step2}</li>
                <li>${t.step3}</li>
              </ol>
              
              <div style="text-align: center;">
                <a href="https://thuis3d.be/mi-cuenta?tab=quotes" class="button">
                  ${t.reviewButton}
                </a>
              </div>
            
              <p style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
                ${t.validityWarning}
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
        to: [to],
        subject: t.subject.replace('{{company_name}}', companyName),
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    console.log(`✅ Quote update email sent successfully in ${lang}:`, data);

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
