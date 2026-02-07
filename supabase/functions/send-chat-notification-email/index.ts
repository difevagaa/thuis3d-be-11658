import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Multilingual templates
const templates = {
  es: {
    subjectAdmin: '💬 Nuevo mensaje del equipo de soporte',
    subjectClient: '💬 Nuevo mensaje de {{sender_name}}',
    titleAdmin: '💬 Tienes un nuevo mensaje',
    titleClient: '💬 Nuevo mensaje de cliente',
    fromSupport: 'El equipo de soporte te ha enviado un mensaje:',
    fromClient: '<strong>{{sender_name}}</strong> te ha enviado un mensaje:',
    hasAttachments: '📎 <strong>Este mensaje incluye archivos adjuntos</strong>',
    viewMessage: '📬 Ver Mensaje',
    replyMessage: '📬 Responder Mensaje',
    footerClient: 'Este es un mensaje automático. Por favor, no respondas a este correo. Para responder, usa el sistema de chat en thuis3d.be',
    footerAdmin: 'Este es un mensaje automático de tu sistema de gestión. Para responder, accede al panel de administración en thuis3d.be'
  },
  en: {
    subjectAdmin: '💬 New message from support team',
    subjectClient: '💬 New message from {{sender_name}}',
    titleAdmin: '💬 You have a new message',
    titleClient: '💬 New client message',
    fromSupport: 'The support team has sent you a message:',
    fromClient: '<strong>{{sender_name}}</strong> has sent you a message:',
    hasAttachments: '📎 <strong>This message includes attachments</strong>',
    viewMessage: '📬 View Message',
    replyMessage: '📬 Reply to Message',
    footerClient: 'This is an automated message. Please do not reply to this email. To reply, use the chat system at thuis3d.be',
    footerAdmin: 'This is an automated message from your management system. To reply, access the admin panel at thuis3d.be'
  },
  nl: {
    subjectAdmin: '💬 Nieuw bericht van het supportteam',
    subjectClient: '💬 Nieuw bericht van {{sender_name}}',
    titleAdmin: '💬 Je hebt een nieuw bericht',
    titleClient: '💬 Nieuw klantbericht',
    fromSupport: 'Het supportteam heeft je een bericht gestuurd:',
    fromClient: '<strong>{{sender_name}}</strong> heeft je een bericht gestuurd:',
    hasAttachments: '📎 <strong>Dit bericht bevat bijlagen</strong>',
    viewMessage: '📬 Bericht Bekijken',
    replyMessage: '📬 Bericht Beantwoorden',
    footerClient: 'Dit is een automatisch bericht. Reageer a.u.b. niet op deze e-mail. Gebruik het chatsysteem op thuis3d.be om te antwoorden.',
    footerAdmin: 'Dit is een automatisch bericht van je beheersysteem. Ga naar het admin paneel op thuis3d.be om te antwoorden.'
  }
};

type Lang = 'es' | 'en' | 'nl';
function getLang(lang?: string | null): Lang {
  const l = (lang?.split('-')[0]?.toLowerCase() || 'en') as Lang;
  return ['es', 'en', 'nl'].includes(l) ? l : 'en';
}

interface ChatNotificationRequest {
  to_email: string;
  sender_name: string;
  message_preview: string;
  is_admin: boolean;
  has_attachments: boolean;
  language?: string;
  user_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to_email, sender_name, message_preview, is_admin, has_attachments, language, user_id }: ChatNotificationRequest = await req.json();

    console.log('📧 Enviando notificación de chat a:', to_email, 'language:', language);

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
        .eq('email', to_email)
        .single();
      userLang = profile?.preferred_language;
    }

    const lang = getLang(userLang);
    const t = templates[lang];

    const subject = is_admin 
      ? t.subjectAdmin
      : t.subjectClient.replace('{{sender_name}}', sender_name);

    const emailBody = is_admin 
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">${t.titleAdmin}</h1>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              <strong>${t.fromSupport}</strong>
            </p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-left: 4px solid #667eea; border-radius: 5px; margin: 20px 0;">
              <p style="font-size: 15px; color: #1f2937; margin: 0; font-style: italic;">
                "${message_preview.substring(0, 200)}${message_preview.length > 200 ? '...' : ''}"
              </p>
            </div>
            
            ${has_attachments ? `<p style="color: #6b7280; font-size: 14px;">${t.hasAttachments}</p>` : ''}
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://thuis3d.be/mis-mensajes" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                ${t.viewMessage}
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 13px; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              ${t.footerClient}
            </p>
          </div>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">${t.titleClient}</h1>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              ${t.fromClient.replace('{{sender_name}}', sender_name)}
            </p>
            
            <div style="background-color: #fef3c7; padding: 20px; border-left: 4px solid #f59e0b; border-radius: 5px; margin: 20px 0;">
              <p style="font-size: 15px; color: #1f2937; margin: 0; font-style: italic;">
                "${message_preview.substring(0, 200)}${message_preview.length > 200 ? '...' : ''}"
              </p>
            </div>
            
            ${has_attachments ? `<p style="color: #6b7280; font-size: 14px;">${t.hasAttachments}</p>` : ''}
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://thuis3d.be/admin/messages" 
                 style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
                ${t.replyMessage}
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 13px; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              ${t.footerAdmin}
            </p>
          </div>
        </div>
      `;

    const { data, error } = await resend.emails.send({
      from: "Thuis3D - Notificaciones <notificaciones@thuis3d.be>",
      to: [to_email],
      subject: subject,
      html: emailBody,
    });

    if (error) {
      console.error("❌ Error enviando email:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message, details: error }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`✅ Email de chat enviado exitosamente en ${lang} a:`, to_email);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("❌ Error crítico en send-chat-notification-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Error desconocido", details: error }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
