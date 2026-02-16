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
    subject: '📄 Nueva Factura #{{invoice_number}} - {{company_name}}',
    title: 'Nueva Factura Disponible',
    invoiceGenerated: 'Se ha generado una nueva factura{{order_info}}.',
    totalToPay: 'Total a pagar',
    dueDate: 'Fecha de vencimiento',
    viewInvoice: 'Ver Factura y Pagar',
    tip: '💡 <strong>Consejo:</strong> Puedes descargar e imprimir tu factura desde tu cuenta en cualquier momento.',
    footer: 'Este es un correo automático de {{company_name}}',
    contact: 'Si tienes alguna pregunta, contáctanos en {{email}}',
    // Quote ready
    quoteBadge: '✅ Cotización Lista',
    quoteGreeting: '¡Hola {{customer_name}}!',
    quoteReady: 'Tenemos excelentes noticias: tu cotización de <strong>{{quote_type}}</strong> ha sido procesada y está lista.',
    invoiceNumber: '📄 Número de Factura:',
    totalAmount: 'Monto Total a Pagar:',
    vatIncluded: 'IVA incluido',
    paymentInfo: 'Puedes proceder con el pago cuando estés listo. Tu factura está disponible en tu panel de usuario.',
    viewInvoiceQuote: '💳 Ver Mi Factura y Pagar',
    paymentMethods: '💡 Métodos de Pago Disponibles:',
    questions: 'Si tienes alguna pregunta sobre tu cotización o factura, no dudes en contactarnos a través de nuestro chat de soporte.'
  },
  en: {
    subject: '📄 New Invoice #{{invoice_number}} - {{company_name}}',
    title: 'New Invoice Available',
    invoiceGenerated: 'A new invoice has been generated{{order_info}}.',
    totalToPay: 'Total to pay',
    dueDate: 'Due date',
    viewInvoice: 'View Invoice and Pay',
    tip: '💡 <strong>Tip:</strong> You can download and print your invoice from your account at any time.',
    footer: 'This is an automated email from {{company_name}}',
    contact: 'If you have any questions, contact us at {{email}}',
    // Quote ready
    quoteBadge: '✅ Quote Ready',
    quoteGreeting: 'Hello {{customer_name}}!',
    quoteReady: 'Great news: your quote for <strong>{{quote_type}}</strong> has been processed and is ready.',
    invoiceNumber: '📄 Invoice Number:',
    totalAmount: 'Total Amount to Pay:',
    vatIncluded: 'VAT included',
    paymentInfo: 'You can proceed with the payment when you are ready. Your invoice is available in your user panel.',
    viewInvoiceQuote: '💳 View My Invoice and Pay',
    paymentMethods: '💡 Available Payment Methods:',
    questions: 'If you have any questions about your quote or invoice, feel free to contact us through our support chat.'
  },
  nl: {
    subject: '📄 Nieuwe Factuur #{{invoice_number}} - {{company_name}}',
    title: 'Nieuwe Factuur Beschikbaar',
    invoiceGenerated: 'Er is een nieuwe factuur gegenereerd{{order_info}}.',
    totalToPay: 'Te betalen',
    dueDate: 'Vervaldatum',
    viewInvoice: 'Bekijk Factuur en Betaal',
    tip: '💡 <strong>Tip:</strong> Je kunt je factuur op elk moment downloaden en afdrukken vanuit je account.',
    footer: 'Dit is een automatische e-mail van {{company_name}}',
    contact: 'Als je vragen hebt, neem contact met ons op via {{email}}',
    // Quote ready
    quoteBadge: '✅ Offerte Klaar',
    quoteGreeting: 'Hallo {{customer_name}}!',
    quoteReady: 'Goed nieuws: je offerte voor <strong>{{quote_type}}</strong> is verwerkt en klaar.',
    invoiceNumber: '📄 Factuurnummer:',
    totalAmount: 'Totaal te Betalen:',
    vatIncluded: 'BTW inbegrepen',
    paymentInfo: 'Je kunt doorgaan met de betaling wanneer je klaar bent. Je factuur is beschikbaar in je gebruikerspaneel.',
    viewInvoiceQuote: '💳 Bekijk Mijn Factuur en Betaal',
    paymentMethods: '💡 Beschikbare Betaalmethoden:',
    questions: 'Als je vragen hebt over je offerte of factuur, neem gerust contact met ons op via onze supportchat.'
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

interface InvoiceEmailRequest {
  to: string;
  invoice_number: string;
  total: number;
  due_date?: string;
  order_number?: string;
  customer_name?: string;
  quote_type?: string;
  language?: string;
  user_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, invoice_number, total, due_date, order_number, customer_name, quote_type, language, user_id }: InvoiceEmailRequest = await req.json();
    
    console.log('📧 Processing invoice email:', { to, invoice_number, quote_type, language });

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
    const safeInvoiceNumber = escapeHtml(invoice_number);
    const safeCustomerName = customer_name ? escapeHtml(customer_name) : '';
    const safeOrderNumber = order_number ? escapeHtml(order_number) : '';
    
    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({ success: false, message: 'Email not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let emailHtml: string;
    let subject: string;

    // Quote invoice template
    if (quote_type) {
      const quoteTypeText = quoteTypeTranslations[lang][quote_type] || quoteTypeTranslations[lang]['default'];

      subject = `✅ ${t.quoteBadge.replace('✅ ', '')} - ${lang === 'es' ? 'Factura' : lang === 'en' ? 'Invoice' : 'Factuur'} ${safeInvoiceNumber}`;

      emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
              .card { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
              .logo { font-size: 28px; font-weight: bold; color: #3b82f6; }
              .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
              .info-box { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .amount-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
              .amount { font-size: 32px; font-weight: bold; color: #f59e0b; }
              .button { display: inline-block; padding: 14px 28px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
              .footer { text-align: center; margin-top: 30px; color: #999; font-size: 14px; }
              .highlight { color: #3b82f6; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="card">
                <div class="header">
                  <div class="logo">${companyName}</div>
                  <div style="margin-top: 10px;">
                    <span class="success-badge">${t.quoteBadge}</span>
                  </div>
                </div>
                
                <h2 style="color: #1f2937; margin-bottom: 20px;">${t.quoteGreeting.replace('{{customer_name}}', safeCustomerName)}</h2>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  ${t.quoteReady.replace('{{quote_type}}', quoteTypeText)}
                </p>
                
                <div class="info-box">
                  <p style="margin: 0;">
                    <strong>${t.invoiceNumber}</strong> <span class="highlight">${safeInvoiceNumber}</span>
                  </p>
                </div>
                
                <div class="amount-box">
                  <p style="margin: 0 0 10px 0; font-size: 14px; color: #92400e;">${t.totalAmount}</p>
                  <div class="amount">€${total.toFixed(2)}</div>
                  <p style="margin: 10px 0 0 0; font-size: 12px; color: #92400e;">${t.vatIncluded}</p>
                </div>
                
                <p style="font-size: 16px;">${t.paymentInfo}</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://thuis3d.be/mi-cuenta?tab=invoices" class="button">
                    ${t.viewInvoiceQuote}
                  </a>
                </div>
                
                <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin-top: 20px;">
                  <p style="margin: 0; font-size: 14px; color: #6b7280;">
                    <strong>${t.paymentMethods}</strong><br>
                    • PayPal<br>
                    • ${lang === 'es' ? 'Transferencia Bancaria' : lang === 'en' ? 'Bank Transfer' : 'Bankoverschrijving'}<br>
                    • Revolut
                  </p>
                </div>
                
                <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">${t.questions}</p>
                
                <div class="footer">
                  <p>${t.footer.replace('{{company_name}}', companyName)}</p>
                  <p>© 2025 ${companyName}</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
    } else {
      // Regular order invoice template
      const formattedDueDate = due_date ? new Date(due_date).toLocaleDateString(
        lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : 'nl-NL',
        { day: '2-digit', month: 'long', year: 'numeric' }
      ) : '';

      const orderInfo = safeOrderNumber 
        ? (lang === 'es' ? ' para tu pedido <strong>#' : lang === 'en' ? ' for your order <strong>#' : ' voor je bestelling <strong>#') + safeOrderNumber + '</strong>'
        : '';

      subject = t.subject.replace('{{invoice_number}}', safeInvoiceNumber).replace('{{company_name}}', companyName);

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
              .invoice-number { font-size: 20px; color: #666; margin-top: 10px; }
              .amount-box { background: #e0f2fe; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .amount { font-size: 32px; font-weight: bold; color: #3b82f6; }
              .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
              .footer { text-align: center; margin-top: 30px; color: #999; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="card">
                <div class="header">
                  <div class="logo">${companyName}</div>
                  <div class="invoice-number">${lang === 'es' ? 'Factura' : lang === 'en' ? 'Invoice' : 'Factuur'} #${safeInvoiceNumber}</div>
                </div>
                
                <h2>${t.title}${safeCustomerName ? ', ' + safeCustomerName : ''}</h2>
                
                <p>${t.invoiceGenerated.replace('{{order_info}}', orderInfo)}</p>
                
                <div class="amount-box">
                  <div style="text-align: center;">
                    <p style="margin: 0; color: #666; font-size: 14px;">${t.totalToPay}</p>
                    <div class="amount">€${total.toFixed(2)}</div>
                    ${formattedDueDate ? `<p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">${t.dueDate}: ${formattedDueDate}</p>` : ''}
                  </div>
                </div>
                
                <p style="margin-top: 30px;">
                  ${lang === 'es' ? 'Puedes ver tu factura completa y realizar el pago desde tu cuenta:' :
                    lang === 'en' ? 'You can view your complete invoice and make the payment from your account:' :
                    'Je kunt je volledige factuur bekijken en de betaling doen vanuit je account:'}
                </p>
                
                <div style="text-align: center;">
                  <a href="https://thuis3d.be/mi-cuenta?tab=invoices" class="button">
                    ${t.viewInvoice}
                  </a>
                </div>
                
                <p style="margin-top: 30px; font-size: 14px; color: #666;">${t.tip}</p>
                
                <div class="footer">
                  <p>${t.footer.replace('{{company_name}}', companyName)}</p>
                  <p>${t.contact.replace('{{email}}', companyEmail)}</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${companyName} <noreply@thuis3d.be>`,
        to: [to],
        subject: subject,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    console.log('✅ Invoice email sent successfully:', safeInvoiceNumber);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-invoice-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
