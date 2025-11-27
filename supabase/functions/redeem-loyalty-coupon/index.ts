import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Obtener usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Usuario no autenticado');
    }

    const { coupon_id } = await req.json();

    if (!coupon_id) {
      throw new Error('coupon_id es requerido');
    }

    // Obtener información del cupón
    const { data: coupon, error: couponError } = await supabaseClient
      .from('coupons')
      .select('*')
      .eq('id', coupon_id)
      .eq('is_loyalty_reward', true)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (couponError || !coupon) {
      throw new Error('Cupón no encontrado o no es válido');
    }

    if (!coupon.points_required) {
      throw new Error('Este cupón no es canjeable por puntos');
    }

    // Verificar puntos del usuario
    const { data: points, error: pointsError } = await supabaseClient
      .from('loyalty_points')
      .select('points_balance')
      .eq('user_id', user.id)
      .single();

    if (pointsError || !points) {
      throw new Error('No se pudieron obtener los puntos del usuario');
    }

    if (points.points_balance < coupon.points_required) {
      throw new Error('No tienes suficientes puntos para canjear este cupón');
    }

    // Generar código único para este usuario
    const uniqueCode = `${coupon.code}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Verificar que el código no exista
    const { data: existingCoupon } = await supabaseClient
      .from('coupons')
      .select('id')
      .eq('code', uniqueCode)
      .maybeSingle();

    if (existingCoupon) {
      // Intentar con otro código
      const retryCode = `${coupon.code}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const { data: retryExisting } = await supabaseClient
        .from('coupons')
        .select('id')
        .eq('code', retryCode)
        .maybeSingle();

      if (!retryExisting) {
        // Usar el código de retry
        const { error: createError } = await supabaseClient
          .from('coupons')
          .insert({
            code: retryCode,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            min_purchase: coupon.min_purchase,
            max_uses: 1, // Solo un uso por cupón canjeado
            is_active: true,
            product_id: coupon.product_id,
            points_required: null, // Ya fue canjeado
            is_loyalty_reward: false // Es una instancia canjeada
          });

        if (createError) throw createError;

        // Restar puntos al usuario
        const { error: updatePointsError } = await supabaseClient
          .from('loyalty_points')
          .update({
            points_balance: points.points_balance - coupon.points_required
          })
          .eq('user_id', user.id);

        if (updatePointsError) throw updatePointsError;

        // Registrar el canje en loyalty_redemptions
        const { error: redemptionError } = await supabaseClient
          .from('loyalty_redemptions')
          .insert({
            user_id: user.id,
            reward_id: coupon.id,
            points_spent: coupon.points_required,
            coupon_code: retryCode,
            status: 'active',
            expires_at: coupon.expires_at || null
          });

        if (redemptionError) {
          console.error('Error creating redemption:', redemptionError);
          // No lanzar error, continuar con el flujo
        }

        // TAMBIÉN registrar en adjustments para auditoría
        await supabaseClient
          .from('loyalty_adjustments')
          .insert({
            user_id: user.id,
            points_change: -coupon.points_required,
            reason: `Canje de cupón: ${coupon.code}`,
            admin_id: null
          });

        // Crear notificación
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: user.id,
            type: 'loyalty',
            title: '¡Cupón Canjeado!',
            message: `Has canjeado ${coupon.points_required} puntos por el cupón ${retryCode}. Úsalo en tu próxima compra.`,
            link: '/mi-cuenta?tab=points'
          });

        return new Response(
          JSON.stringify({ 
            success: true, 
            coupon_code: retryCode,
            message: 'Cupón canjeado exitosamente'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }
    }

    // Crear el nuevo cupón
    const { error: createError } = await supabaseClient
      .from('coupons')
      .insert({
        code: uniqueCode,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_purchase: coupon.min_purchase,
        max_uses: 1, // Solo un uso por cupón canjeado
        is_active: true,
        product_id: coupon.product_id,
        points_required: null, // Ya fue canjeado
        is_loyalty_reward: false // Es una instancia canjeada
      });

    if (createError) throw createError;

    // Restar puntos al usuario
    const { error: updatePointsError } = await supabaseClient
      .from('loyalty_points')
      .update({
        points_balance: points.points_balance - coupon.points_required
      })
      .eq('user_id', user.id);

    if (updatePointsError) throw updatePointsError;

    // Registrar el canje en loyalty_redemptions
    const { error: redemptionError } = await supabaseClient
      .from('loyalty_redemptions')
      .insert({
        user_id: user.id,
        reward_id: coupon.id,
        points_spent: coupon.points_required,
        coupon_code: uniqueCode,
        status: 'active',
        expires_at: coupon.expires_at || null
      });

    if (redemptionError) {
      console.error('Error creating redemption:', redemptionError);
      // No lanzar error, continuar con el flujo
    }

    // TAMBIÉN registrar en adjustments para auditoría
    await supabaseClient
      .from('loyalty_adjustments')
      .insert({
        user_id: user.id,
        points_change: -coupon.points_required,
        reason: `Canje de cupón: ${coupon.code}`,
        admin_id: null
      });

    // Crear notificación
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'loyalty',
        title: '¡Cupón Canjeado!',
        message: `Has canjeado ${coupon.points_required} puntos por el cupón ${uniqueCode}. Úsalo en tu próxima compra.`,
        link: '/mi-cuenta?tab=points'
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        coupon_code: uniqueCode,
        message: 'Cupón canjeado exitosamente'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
