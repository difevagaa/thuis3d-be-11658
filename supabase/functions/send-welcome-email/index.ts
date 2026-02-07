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
    subject: '¡Bienvenido/a a {{company_name}}! 🎉',
    title: '¡Bienvenido/a!',
    greeting: '¡Hola {{customer_name}}! 👋',
    welcome: 'Nos alegra que te hayas unido a nuestra comunidad. Tu cuenta ha sido creada exitosamente.',
    whatCanYouDo: '¿Qué puedes hacer ahora?',
    feature1: 'Explorar nuestro catálogo completo de productos de impresión 3D',
    feature2: 'Realizar pedidos y seguir su estado en tiempo real',
    feature3: 'Solicitar cotizaciones personalizadas para tus proyectos',
    feature4: 'Recibir notificaciones sobre tus pedidos y facturas',
    feature5: 'Acceder a tu historial de compras y facturas',
    startShopping: 'Comenzar a Comprar',
    tip: '💡 <strong>Consejo:</strong> Completa tu perfil en "Mi Cuenta" para una experiencia personalizada.',
    footer: '{{company_name}}',
    contact: 'Si tienes alguna pregunta, no dudes en contactarnos en {{email}}',
    autoMessage: 'Este es un correo automático, por favor no respondas a este mensaje.'
  },
  en: {
    subject: 'Welcome to {{company_name}}! 🎉',
    title: 'Welcome!',
    greeting: 'Hello {{customer_name}}! 👋',
    welcome: 'We are glad you have joined our community. Your account has been created successfully.',
    whatCanYouDo: 'What can you do now?',
    feature1: 'Explore our complete 3D printing product catalog',
    feature2: 'Place orders and track their status in real time',
    feature3: 'Request personalized quotes for your projects',
    feature4: 'Receive notifications about your orders and invoices',
    feature5: 'Access your purchase history and invoices',
    startShopping: 'Start Shopping',
    tip: '💡 <strong>Tip:</strong> Complete your profile in "My Account" for a personalized experience.',
    footer: '{{company_name}}',
    contact: 'If you have any questions, feel free to contact us at {{email}}',
    autoMessage: 'This is an automated email, please do not reply to this message.'
  },
  nl: {
    subject: 'Welkom bij {{company_name}}! 🎉',
    title: 'Welkom!',
    greeting: 'Hallo {{customer_name}}! 👋',
    welcome: 'We zijn blij dat je lid bent geworden van onze community. Je account is succesvol aangemaakt.',
    whatCanYouDo: 'Wat kun je nu doen?',
    feature1: 'Ontdek onze volledige catalogus van 3D-printproducten',
    feature2: 'Plaats bestellingen en volg de status in realtime',
    feature3: 'Vraag gepersonaliseerde offertes aan voor je projecten',
    feature4: 'Ontvang meldingen over je bestellingen en facturen',
    feature5: 'Toegang tot je aankoopgeschiedenis en facturen',
    startShopping: 'Begin met Winkelen',
    tip: '💡 <strong>Tip:</strong> Vul je profiel in bij "Mijn Account" voor een gepersonaliseerde ervaring.',
    footer: '{{company_name}}',
    contact: 'Als je vragen hebt, neem gerust contact met ons op via {{email}}',
    autoMessage: 'Dit is een automatische e-mail, reageer a.u.b. niet op dit bericht.'
  }
};

type Lang = 'es' | 'en' | 'nl';
function getLang(lang?: string | null): Lang {
  const l = (lang?.split('-')[0]?.toLowerCase() || 'en') as Lang;
  return ['es', 'en', 'nl'].includes(l) ? l : 'en';
}

interface WelcomeEmailRequest {
  to: string;
  name?: string;
  language?: string;
  user_id?: string;
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

    const { to, name, language, user_id }: WelcomeEmailRequest = await req.json();

    console.log('📧 Sending welcome email to:', to, 'language:', language);

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
    
    if (!RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({ success: false, message: 'Email not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const displayName = escapeHtml(name || (lang === 'es' ? 'Cliente' : lang === 'en' ? 'Customer' : 'Klant'));

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
              <h1 style="margin: 0; font-size: 24px;">${t.title}</h1>
            </div>
            <div class="content">
              <div class="welcome-box">
                <h2 style="color: #3b82f6; margin-top: 0;">${t.greeting.replace('{{customer_name}}', displayName)}</h2>
                <p style="font-size: 16px; margin: 0;">${t.welcome}</p>
              </div>
              
              <div class="features">
                <h3 style="color: #333; margin-top: 0;">${t.whatCanYouDo}</h3>
                <div class="feature-item">${t.feature1}</div>
                <div class="feature-item">${t.feature2}</div>
                <div class="feature-item">${t.feature3}</div>
                <div class="feature-item">${t.feature4}</div>
                <div class="feature-item">${t.feature5}</div>
              </div>

              <div style="text-align: center;">
                <a href="https://thuis3d.be" class="btn">${t.startShopping}</a>
              </div>

              <p style="margin-top: 30px; padding: 15px; background: white; border-radius: 5px;">${t.tip}</p>
              
              <div class="footer">
                <p><strong>${t.footer.replace('{{company_name}}', companyName)}</strong></p>
                <p>${t.contact.replace('{{email}}', companyEmail)}</p>
                <p style="color: #999; font-size: 12px; margin-top: 15px;">${t.autoMessage}</p>
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
        subject: t.subject.replace('{{company_name}}', companyName),
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
