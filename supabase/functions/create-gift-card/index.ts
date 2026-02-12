import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CreateGiftCardRequest {
  code: string;
  amount: number;
  recipient_email: string;
  sender_name: string;
  message?: string | null;
  buyer_email?: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, amount, recipient_email, sender_name, message, buyer_email }: CreateGiftCardRequest = await req.json();

    if (!code || !recipient_email || !sender_name || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Datos inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to get buyer user id from auth header
    let buyerId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const authClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await authClient.auth.getUser();
        buyerId = user?.id || null;
      } catch {
        // Non-blocking
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get buyer email from profile if not provided
    let finalBuyerEmail = buyer_email || null;
    if (!finalBuyerEmail && buyerId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', buyerId)
        .maybeSingle();
      finalBuyerEmail = profile?.email || null;
    }

    const { data, error } = await supabase
      .from('gift_cards')
      .insert({
        code,
        initial_amount: amount,
        current_balance: amount,
        recipient_email,
        sender_name,
        message: message || null,
        is_active: false,
        tax_enabled: false,
        buyer_id: buyerId,
        buyer_email: finalBuyerEmail,
      })
      .select('id')
      .single();

    if (error) {
      console.error('create-gift-card insert error', error);
      return new Response(
        JSON.stringify({ success: false, message: 'No se pudo crear la tarjeta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('create-gift-card error', e);
    return new Response(
      JSON.stringify({ success: false, message: 'Error procesando la solicitud' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
