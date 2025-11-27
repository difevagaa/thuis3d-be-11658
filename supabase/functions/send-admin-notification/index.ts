import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple rate limiter: max 2 requests per second
let lastRequestTime = 0;
const MIN_DELAY_MS = 600; // 600ms between requests (just under 2 per second)

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

interface AdminNotificationRequest {
  to: string;
  type: 'order' | 'quote' | 'message' | 'refund' | 'gift_card';
  subject: string;
  message: string;
  link?: string;
  order_number?: string;
  customer_name?: string;
  customer_email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: AdminNotificationRequest = await req.json();
    
    console.log('📧 Processing admin notification:', request.type, request.subject);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all admin user IDs first
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError || !adminRoles || adminRoles.length === 0) {
      console.warn('No admin users found');
      return new Response(
        JSON.stringify({ success: false, message: 'No admin users' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminIds = adminRoles.map(r => r.user_id);

    // Get admin profiles
    const { data: adminUsers, error: adminError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', adminIds);

    if (adminError || !adminUsers || adminUsers.length === 0) {
      console.warn('No admin profiles found');
      return new Response(
        JSON.stringify({ success: false, message: 'No admin profiles' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get company info for email sender
    const { data: siteData } = await supabase
      .from('site_customization')
      .select('company_name, legal_email')
      .limit(1)
      .maybeSingle();

    const companyName = siteData?.company_name || 'Thuis3D.be';

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({ success: false, message: 'Email not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email to all admins SEQUENTIALLY with rate limiting
    let sentCount = 0;
    for (const admin of adminUsers) {
      if (!admin.email) continue;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .card { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .header { border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px; }
              .badge { display: inline-block; padding: 4px 12px; background: #3b82f6; color: white; border-radius: 4px; font-size: 12px; text-transform: uppercase; }
              .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
              .info-grid { display: grid; gap: 10px; margin: 20px 0; }
              .info-item { padding: 10px; background: #f5f5f5; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="card">
                <div class="header">
                  <span class="badge">${request.type}</span>
                  <h2 style="margin: 10px 0 0 0;">${request.subject}</h2>
                </div>
                
                <p style="font-size: 16px; margin: 20px 0;">${request.message}</p>
                
                <div class="info-grid">
                  ${request.order_number ? `
                    <div class="info-item">
                      <strong>📦 Número de pedido:</strong> ${request.order_number}
                    </div>
                  ` : ''}
                  ${request.customer_name ? `
                    <div class="info-item">
                      <strong>👤 Cliente:</strong> ${request.customer_name}
                    </div>
                  ` : ''}
                  ${request.customer_email ? `
                    <div class="info-item">
                      <strong>📧 Email:</strong> ${request.customer_email}
                    </div>
                  ` : ''}
                </div>
                
                ${request.link ? `
                  <div style="text-align: center;">
                    <a href="https://thuis3d.be${request.link}" class="button">
                      Ver en Panel Admin →
                    </a>
                  </div>
                ` : ''}
                
                <p style="margin-top: 30px; color: #999; font-size: 14px; text-align: center;">
                  Notificación automática de ${companyName}
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

      try {
        // Wait for rate limit before sending
        await waitForRateLimit();

        console.log(`📧 Sending admin notification to: ${admin.email}`);

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: `${companyName} <noreply@thuis3d.be>`,
            to: [admin.email],
            subject: `[Admin] ${request.subject}`,
            html: emailHtml,
          }),
        });

        if (response.ok) {
          sentCount++;
          console.log(`✅ Email sent to ${admin.email}`);
        } else {
          const error = await response.json();
          console.error(`❌ Failed to send to ${admin.email}:`, error);
        }
      } catch (error) {
        console.error(`❌ Error sending to ${admin.email}:`, error);
      }
    }

    console.log(`✅ Admin notifications sent to ${sentCount} admins`);

    return new Response(
      JSON.stringify({ success: true, count: sentCount }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-admin-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
