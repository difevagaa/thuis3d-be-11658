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
    subject: '{{icon}} Actualización de Pedido #{{order_number}} - {{company_name}}',
    title: 'Actualización de tu Pedido',
    statusChanged: 'Tu pedido <strong>#{{order_number}}</strong> ha sido actualizado:',
    viewOrder: 'Ver Mi Pedido',
    tip: '💡 <strong>Consejo:</strong> Recibirás una notificación cada vez que tu pedido cambie de estado.',
    footer: 'Este es un correo automático de {{company_name}}',
    contact: 'Si tienes alguna pregunta, contáctanos en {{email}}'
  },
  en: {
    subject: '{{icon}} Order Update #{{order_number}} - {{company_name}}',
    title: 'Your Order Update',
    statusChanged: 'Your order <strong>#{{order_number}}</strong> has been updated:',
    viewOrder: 'View My Order',
    tip: '💡 <strong>Tip:</strong> You will receive a notification every time your order status changes.',
    footer: 'This is an automated email from {{company_name}}',
    contact: 'If you have any questions, contact us at {{email}}'
  },
  nl: {
    subject: '{{icon}} Orderupdate #{{order_number}} - {{company_name}}',
    title: 'Update van je Bestelling',
    statusChanged: 'Je bestelling <strong>#{{order_number}}</strong> is bijgewerkt:',
    viewOrder: 'Bekijk Mijn Bestelling',
    tip: '💡 <strong>Tip:</strong> Je ontvangt een melding telkens wanneer de status van je bestelling verandert.',
    footer: 'Dit is een automatische e-mail van {{company_name}}',
    contact: 'Als je vragen hebt, neem contact met ons op via {{email}}'
  }
};

// Status translations - comprehensive mapping
const statusNames: Record<string, Record<string, string>> = {
  es: {
    'pending': 'Pendiente',
    'processing': 'Procesando',
    'shipped': 'Enviado',
    'delivered': 'Entregado',
    'cancelled': 'Cancelado',
    'rejected': 'Rechazado',
    'refunded': 'Reembolsado',
    'en camino': 'En Camino',
    'preparando': 'Preparando',
    'completado': 'Completado',
    'enviado': 'Enviado',
    'entregado': 'Entregado',
    'cancelado': 'Cancelado',
    'rechazado': 'Rechazado',
    'reembolsado': 'Reembolsado',
    'pendiente': 'Pendiente',
    'procesando': 'Procesando'
  },
  en: {
    'pending': 'Pending',
    'processing': 'Processing',
    'shipped': 'Shipped',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled',
    'rejected': 'Rejected',
    'refunded': 'Refunded',
    'en camino': 'On the way',
    'preparando': 'Preparing',
    'completado': 'Completed',
    'enviado': 'Shipped',
    'entregado': 'Delivered',
    'cancelado': 'Cancelled',
    'rechazado': 'Rejected',
    'reembolsado': 'Refunded',
    'pendiente': 'Pending',
    'procesando': 'Processing'
  },
  nl: {
    'pending': 'In afwachting',
    'processing': 'Verwerken',
    'shipped': 'Verzonden',
    'delivered': 'Afgeleverd',
    'cancelled': 'Geannuleerd',
    'rejected': 'Afgewezen',
    'refunded': 'Terugbetaald',
    'en camino': 'Onderweg',
    'preparando': 'Voorbereiden',
    'completado': 'Voltooid',
    'enviado': 'Verzonden',
    'entregado': 'Afgeleverd',
    'cancelado': 'Geannuleerd',
    'rechazado': 'Afgewezen',
    'reembolsado': 'Terugbetaald',
    'pendiente': 'In afwachting',
    'procesando': 'Verwerken'
  }
};

type Lang = 'es' | 'en' | 'nl';
function getLang(lang?: string | null): Lang {
  const l = (lang?.split('-')[0]?.toLowerCase() || 'en') as Lang;
  return ['es', 'en', 'nl'].includes(l) ? l : 'en';
}

function translateStatus(status: string, lang: Lang): string {
  const lowerStatus = status.toLowerCase().trim();
  return statusNames[lang][lowerStatus] || statusNames[lang]['pending'] || status;
}

interface OrderStatusEmailRequest {
  to: string;
  order_number: string;
  old_status: string;
  new_status: string;
  customer_name?: string;
  language?: string;
  user_id?: string;
  tracking_number?: string;
  tracking_url?: string;
  carrier_name?: string;
  estimated_delivery_date?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      to, order_number, old_status, new_status, customer_name, language, user_id,
      tracking_number, tracking_url, carrier_name, estimated_delivery_date
    }: OrderStatusEmailRequest = await req.json();
    
    console.log('📧 Processing order status email:', { to, order_number, new_status, language, tracking_number });

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
    const safeOrderNumber = escapeHtml(order_number);
    const safeNewStatus = translateStatus(new_status, lang);
    const safeCustomerName = customer_name ? ', ' + escapeHtml(customer_name) : '';
    
    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({ success: false, message: 'Email not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine icon and color based on status
    let statusIcon = '📦';
    let statusColor = '#3b82f6';
    
    const lowerStatus = new_status.toLowerCase();
    if (lowerStatus.includes('entregado') || lowerStatus.includes('completado') || lowerStatus.includes('delivered')) {
      statusIcon = '✅';
      statusColor = '#10b981';
    } else if (lowerStatus.includes('enviado') || lowerStatus.includes('en camino') || lowerStatus.includes('shipped')) {
      statusIcon = '🚚';
      statusColor = '#8b5cf6';
    } else if (lowerStatus.includes('procesando') || lowerStatus.includes('preparando') || lowerStatus.includes('processing')) {
      statusIcon = '⚙️';
      statusColor = '#f59e0b';
    } else if (lowerStatus.includes('cancelado') || lowerStatus.includes('cancelled')) {
      statusIcon = '❌';
      statusColor = '#ef4444';
    }

    // Tracking section HTML
    const trackingLabels = {
      es: {
        trackingTitle: 'Información de Envío',
        trackingNumber: 'Número de Seguimiento',
        carrier: 'Transportista',
        estimatedDelivery: 'Entrega Estimada',
        trackOrder: 'Rastrear Pedido'
      },
      en: {
        trackingTitle: 'Shipping Information',
        trackingNumber: 'Tracking Number',
        carrier: 'Carrier',
        estimatedDelivery: 'Estimated Delivery',
        trackOrder: 'Track Order'
      },
      nl: {
        trackingTitle: 'Verzendinformatie',
        trackingNumber: 'Volgnummer',
        carrier: 'Vervoerder',
        estimatedDelivery: 'Geschatte Levering',
        trackOrder: 'Bestelling Volgen'
      }
    };
    
    const tLabels = trackingLabels[lang];
    
    let trackingHtml = '';
    if (tracking_number || tracking_url || carrier_name || estimated_delivery_date) {
      trackingHtml = `
        <div style="background: #e8f5e9; border: 1px solid #4caf50; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #2e7d32; margin: 0 0 15px 0;">📦 ${tLabels.trackingTitle}</h3>
          ${carrier_name ? `<p style="margin: 8px 0;"><strong>${tLabels.carrier}:</strong> ${escapeHtml(carrier_name)}</p>` : ''}
          ${tracking_number ? `<p style="margin: 8px 0;"><strong>${tLabels.trackingNumber}:</strong> <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${escapeHtml(tracking_number)}</code></p>` : ''}
          ${estimated_delivery_date ? `<p style="margin: 8px 0;"><strong>${tLabels.estimatedDelivery}:</strong> ${escapeHtml(estimated_delivery_date)}</p>` : ''}
          ${tracking_url ? `<p style="margin: 15px 0 0 0;"><a href="${escapeHtml(tracking_url)}" target="_blank" style="display: inline-block; background: #4caf50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">🔗 ${tLabels.trackOrder}</a></p>` : ''}
        </div>
      `;
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
            .status-box { background: #f5f5f5; border-left: 4px solid ${statusColor}; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .status-icon { font-size: 48px; text-align: center; margin-bottom: 10px; }
            .status-text { font-size: 24px; font-weight: bold; color: ${statusColor}; text-align: center; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #999; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="logo">${companyName}</div>
              </div>
              
              <h2>${t.title}${safeCustomerName}</h2>
              
              <p>${t.statusChanged.replace('{{order_number}}', safeOrderNumber)}</p>
              
              <div class="status-box">
                <div class="status-icon">${statusIcon}</div>
                <div class="status-text">${safeNewStatus}</div>
              </div>
              
              ${trackingHtml}
              
              <p style="margin-top: 30px;">
                ${lang === 'es' ? 'Puedes ver el detalle completo de tu pedido y seguir su progreso desde tu cuenta:' :
                  lang === 'en' ? 'You can see the full details of your order and track its progress from your account:' :
                  'Je kunt de volledige details van je bestelling bekijken en de voortgang volgen vanuit je account:'}
              </p>
              
              <div style="text-align: center;">
                <a href="https://thuis3d.be/mi-cuenta" class="button">
                  ${t.viewOrder}
                </a>
              </div>
              
              <p style="margin-top: 30px; font-size: 14px; color: #666; padding: 15px; background: #f5f5f5; border-radius: 5px;">
                ${t.tip}
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
        subject: t.subject.replace('{{icon}}', statusIcon).replace('{{order_number}}', safeOrderNumber).replace('{{company_name}}', companyName),
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    console.log('✅ Order status email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-order-status-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
