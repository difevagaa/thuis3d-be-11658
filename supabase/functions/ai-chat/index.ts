import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header for user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autenticación requerida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Autenticación inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check database-based rate limit: 20 requests per 10 minutes
    const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_endpoint: 'ai-chat',
      p_max_requests: 20,
      p_window_minutes: 10
    });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
      return new Response(
        JSON.stringify({ error: 'Error al verificar límite de solicitudes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Límite de solicitudes excedido. Puedes hacer 20 solicitudes cada 10 minutos. Intenta más tarde.'
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '600'
          } 
        }
      );
    }

    const { messages } = await req.json();

    // Validate request size
    if (JSON.stringify(messages).length > 10000) {
      return new Response(
        JSON.stringify({ error: 'Solicitud demasiado grande. El tamaño máximo es 10KB.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Eres un asistente de atención al cliente experto en impresión 3D para "3D Print Hub". 

Tu rol es ayudar a los clientes con:
- Información sobre materiales de impresión (PLA, ABS, Resina, PETG, etc.)
- Explicar procesos de impresión 3D y tecnologías
- Ayudar con cotizaciones y precios estimados
- Responder preguntas sobre productos del catálogo
- Guiar en la preparación de archivos 3D (STL, OBJ, 3MF)
- Tiempos de entrega y proceso de pedidos
- Personalización de productos

Características:
- Responde en español de forma clara y profesional
- Sé amable pero conciso (máximo 3-4 párrafos)
- Si no sabes algo específico, sugiere que contacten directamente
- Promueve la sección de cotizaciones para proyectos personalizados
- Menciona que pueden explorar el catálogo de productos

Información clave:
- Trabajamos con múltiples materiales y colores
- Ofrecemos servicio de modelado 3D personalizado
- Entregas rápidas con garantía de calidad
- Sistema de cotizaciones gratuito en 3 modalidades`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Por favor intenta de nuevo más tarde." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Se requiere pago. Por favor contacta al administrador." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Error al comunicarse con el servicio de IA" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
