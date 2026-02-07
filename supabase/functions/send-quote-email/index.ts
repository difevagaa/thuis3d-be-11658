import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple rate limiter: max 2 requests per second
let lastRequestTime = 0;
const MIN_DELAY_MS = 600;

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
    subject: '✅ Solicitud de Cotización Recibida - {{company_name}}',
    title: '¡Gracias por tu solicitud de cotización!',
    greeting: 'Hola {{customer_name}},',
    received: 'Hemos recibido tu solicitud de cotización para {{quote_type}}. A continuación encontrarás los detalles:',
    detailsTitle: 'Detalles de la solicitud:',
    responseTime: 'Nuestro equipo revisará tu solicitud y te contactaremos pronto con una cotización detallada. Normalmente respondemos en un plazo de 24-48 horas laborables.',
    questions: '¿Tienes alguna pregunta?',
    questionsAnswer: 'No dudes en contactarnos a través de nuestro sitio web.',
    footer: 'Este es un correo automático de {{company_name}}',
    contact: 'Si tienes preguntas, contáctanos en {{email}}'
  },
  en: {
    subject: '✅ Quote Request Received - {{company_name}}',
    title: 'Thank you for your quote request!',
    greeting: 'Hello {{customer_name}},',
    received: 'We have received your quote request for {{quote_type}}. Here are the details:',
    detailsTitle: 'Request details:',
    responseTime: 'Our team will review your request and contact you soon with a detailed quote. We typically respond within 24-48 business hours.',
    questions: 'Do you have any questions?',
    questionsAnswer: 'Feel free to contact us through our website.',
    footer: 'This is an automated email from {{company_name}}',
    contact: 'If you have questions, contact us at {{email}}'
  },
  nl: {
    subject: '✅ Offerteaanvraag Ontvangen - {{company_name}}',
    title: 'Bedankt voor je offerteaanvraag!',
    greeting: 'Hallo {{customer_name}},',
    received: 'We hebben je offerteaanvraag voor {{quote_type}} ontvangen. Hier zijn de details:',
    detailsTitle: 'Aanvraagdetails:',
    responseTime: 'Ons team zal je aanvraag bekijken en spoedig contact met je opnemen met een gedetailleerde offerte. We reageren doorgaans binnen 24-48 werkuren.',
    questions: 'Heb je vragen?',
    questionsAnswer: 'Neem gerust contact met ons op via onze website.',
    footer: 'Dit is een automatische e-mail van {{company_name}}',
    contact: 'Als je vragen hebt, neem contact met ons op via {{email}}'
  }
};

const quoteTypeTranslations: Record<string, Record<string, string>> = {
  es: { 'file_upload': 'Archivo 3D', 'service': 'Servicio', 'default': 'Cotización' },
  en: { 'file_upload': '3D File', 'service': 'Service', 'default': 'Quote' },
  nl: { 'file_upload': '3D-bestand', 'service': 'Dienst', 'default': 'Offerte' }
};

type Lang = 'es' | 'en' | 'nl';
function getLang(lang?: string | null): Lang {
  const l = (lang?.split('-')[0]?.toLowerCase() || 'en') as Lang;
  return ['es', 'en', 'nl'].includes(l) ? l : 'en';
}

interface QuoteEmailRequest {
  to: string;
  customer_name: string;
  quote_type: string;
  description: string;
  language?: string;
  user_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, customer_name, quote_type, description, language, user_id }: QuoteEmailRequest = await req.json();

    console.log('📧 Sending quote email to:', to, 'language:', language);

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
    const quoteTypeText = quoteTypeTranslations[lang][quote_type] || quoteTypeTranslations[lang]['default'];
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
                <h2>${t.title}</h2>
              </div>
              
              <p>${t.greeting.replace('{{customer_name}}', safeCustomerName)}</p>
              <p>${t.received.replace('{{quote_type}}', quoteTypeText)}</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0;">${t.detailsTitle}</h3>
                <p style="white-space: pre-wrap; margin: 0;">${safeDescription}</p>
              </div>
              
              <p>${t.responseTime}</p>
              
              <p style="margin-top: 30px;">
                <strong>${t.questions}</strong><br>
                ${t.questionsAnswer}
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

    await waitForRateLimit();

    console.log(`📧 Sending email to: ${to} in language: ${lang}`);

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

    console.log('✅ Quote email sent successfully:', data);

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
