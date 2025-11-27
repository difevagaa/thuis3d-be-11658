import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateGiftCardRequest {
  code: string;
  amount: number;
  recipient_email: string;
  sender_name: string;
  message?: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, amount, recipient_email, sender_name, message }: CreateGiftCardRequest = await req.json();

    if (!code || !recipient_email || !sender_name || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Datos inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
