import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyPinRequest {
  pin: string;
  action: 'delete' | 'verify';
  table?: string;
  item_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role key for database operations to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is admin or superadmin (fast query)
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'superadmin']);

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Superadmin bypasses PIN check
    const isSuperAdmin = roles.some(r => r.role === 'superadmin');
    
    const { pin, action, table, item_id }: VerifyPinRequest = await req.json();

    // If superadmin, allow access without PIN
    if (isSuperAdmin) {
      console.log(`Superadmin ${user.id} accessing without PIN`);
      
      // If action is delete, perform the deletion
      if (action === 'delete' && table && item_id) {
        const ALLOWED_TABLES = [
          'products', 'categories', 'materials', 'colors', 'coupons',
          'gift_cards', 'orders', 'order_items', 'reviews', 'blog_posts',
          'pages', 'homepage_banners', 'footer_links', 'quotes', 'invoices'
        ];

        if (!ALLOWED_TABLES.includes(table)) {
          return new Response(
            JSON.stringify({ error: 'Table not allowed for deletion' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: deleteError } = await supabaseAdmin
          .from(table)
          .delete()
          .eq('id', item_id);

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: 'Failed to delete item' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Item deleted successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, valid: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Regular admin needs PIN
    if (!pin) {
      return new Response(
        JSON.stringify({ error: 'PIN is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify PIN server-side using the database function (optimized)
    const { data: isValid, error: verifyError } = await supabaseAdmin
      .rpc('verify_admin_pin', { pin_input: pin, user_id_input: user.id });

    if (verifyError) {
      console.error('PIN verification error:', verifyError);
      return new Response(
        JSON.stringify({ error: 'PIN verification failed', details: verifyError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid PIN' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If action is delete, perform the deletion
    if (action === 'delete' && table && item_id) {
      const ALLOWED_TABLES = [
        'products', 'categories', 'materials', 'colors', 'coupons',
        'gift_cards', 'orders', 'order_items', 'reviews', 'blog_posts',
        'pages', 'homepage_banners', 'footer_links', 'quotes', 'invoices'
      ];

      if (!ALLOWED_TABLES.includes(table)) {
        console.error('Attempted deletion from unauthorized table:', table);
        return new Response(
          JSON.stringify({ error: 'Table not allowed for deletion' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Admin ${user.id} attempting to delete from ${table}, item: ${item_id}`);

      const { error: deleteError } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('id', item_id);

      if (deleteError) {
        console.error('Deletion error:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to delete item' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Successfully deleted from ${table}, item: ${item_id}`);

      return new Response(
        JSON.stringify({ success: true, message: 'Item deleted successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Just verification
    return new Response(
      JSON.stringify({ success: true, valid: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in verify-admin-pin function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
