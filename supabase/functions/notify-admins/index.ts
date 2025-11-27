import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyRequest {
  type: 'order' | 'quote' | 'gift_card' | 'message';
  subject: string;
  message: string;
  order_number?: string;
  customer_name?: string;
  customer_email?: string;
  link?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { type, subject, message, order_number, customer_name, customer_email, link }: NotifyRequest = await req.json();

    console.log('Notifying admins:', { type, subject });

    // Get company info for email sender
    const { data: siteData } = await supabase
      .from('site_customization')
      .select('company_name, legal_email')
      .limit(1)
      .maybeSingle();

    const companyName = siteData?.company_name || 'Thuis3D.be';
    const companyEmail = siteData?.legal_email || 'noreply@thuis3d.be';

    // Get all admin users
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError) throw rolesError;

    const adminIds = adminRoles?.map(r => r.user_id) || [];

    // Get admin profiles with emails
    const { data: adminProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', adminIds);

    if (profilesError) throw profilesError;

    // Create notifications for each admin
    const notifications = adminIds.map(userId => ({
      user_id: userId,
      type,
      title: subject,
      message,
      link: link || '/admin/pedidos',
      is_read: false
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError) {
      console.error('Error creating notifications:', notifError);
    }

    // Send email to each admin
    for (const admin of adminProfiles || []) {
      if (admin.email) {
        try {
          await resend.emails.send({
            from: `${companyName} <noreply@thuis3d.be>`,
            to: [admin.email],
            subject: subject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>${subject}</h2>
                <p>${message}</p>
                ${order_number ? `<p><strong>Número de pedido:</strong> ${order_number}</p>` : ''}
                ${customer_name ? `<p><strong>Cliente:</strong> ${customer_name}</p>` : ''}
                ${customer_email ? `<p><strong>Email del cliente:</strong> ${customer_email}</p>` : ''}
                ${link ? `<p><a href="${Deno.env.get('SUPABASE_URL')}${link}" style="color: #3b82f6;">Ver detalles</a></p>` : ''}
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px;">Este es un mensaje automático de ${companyName}</p>
              </div>
            `,
          });
          console.log(`Email sent to admin: ${admin.email}`);
        } catch (emailError) {
          console.error(`Error sending email to ${admin.email}:`, emailError);
        }
      }
    }

    console.log('Admin notifications sent successfully');

    return new Response(
      JSON.stringify({ success: true, notified: adminIds.length }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Error in notify-admins function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
