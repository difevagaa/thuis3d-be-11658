import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface TranslationTask {
  id: string;
  entity_type: string;
  entity_id: string;
  field_name: string;
  source_language: string;
  target_languages: string[];
}

async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
  entityType: string,
  fieldName: string
): Promise<string> {
  const contextMap: Record<string, string> = {
    'products': 'Producto de impresión 3D. Mantén términos técnicos (PLA, PETG, STL, FDM, SLA, etc.) sin traducir. Tono profesional y descriptivo.',
    'blog_posts': 'Contenido de blog sobre impresión 3D y tecnología. Tono conversacional pero informativo. Mantén acrónimos técnicos sin traducir.',
    'legal_pages': 'Documento legal. Máxima precisión legal y terminología jurídica apropiada. Tono formal y profesional.',
    'categories': 'Categoría de productos. Conciso, máximo 3-4 palabras. Claridad sobre el tipo de producto.',
    'materials': 'Material de impresión 3D. Nombre técnico preciso del material. Mantener siglas (PLA, PETG, ABS, TPU, etc.).',
    'colors': 'Nombre de color. Traducir literalmente manteniendo claridad visual (ej: Rojo, Azul, Verde).',
    'homepage_banners': 'Banner promocional web. Tono marketing atractivo, llamada a la acción (CTA) clara y convincente.',
    'homepage_sections': 'Título de sección de página principal. Tono impactante, marketing, llamativo y motivador. Mantén emojis si existen.',
    'homepage_quick_access_cards': 'Tarjeta de acceso rápido del sitio web. Tono claro, directo, invitando a la acción. Máximo 5-6 palabras para títulos.',
    'homepage_features': 'Característica destacada del servicio. Tono profesional, destacando beneficios y valor. Conciso y convincente.',
    'gallery_items': 'Descripción de trabajo realizado. Tono showcase profesional destacando calidad del trabajo.',
    'footer_links': 'Enlace de navegación. Máximo 2-3 palabras, claro y directo.',
    'reviews': 'Comentario de cliente real. Mantener tono y opinión original del usuario. NO editar ni mejorar el mensaje.',
    'pages': 'Página informativa del sitio. Tono profesional, claro e informativo.',
  };

  const context = contextMap[entityType] || 'Traduce este contenido manteniendo el tono y significado original. Si hay términos técnicos específicos de impresión 3D, mantenlos sin traducir.';

  const langNames: Record<string, string> = {
    'es': 'español',
    'en': 'inglés',
    'nl': 'neerlandés',
  };

  const systemPrompt = `Eres un traductor profesional especializado en traducción de contenido web, e-commerce y tecnología 3D. ${context}

REGLAS CRÍTICAS:
- Traduce SOLO el texto, sin agregar explicaciones, comentarios ni notas del traductor
- Mantén el formato original (saltos de línea, espacios, markdown si existe, HTML si existe)
- Si encuentras términos técnicos específicos de impresión 3D (PLA, PETG, TPU, ABS, STL, FDM, SLA, SLS, etc.), mantenlos en su forma original sin traducir
- Si encuentras nombres de marcas o productos específicos, mantenlos sin traducir
- Para HTML/rich text, mantén TODAS las etiquetas HTML intactas (<p>, <strong>, <img>, etc.)
- Adapta el texto al contexto cultural del idioma destino cuando sea apropiado
- Para nombres de campo como "name" o "title", proporciona traducciones concisas
- Para "description" o "content", mantén la estructura y extensión similar
- Si el texto original tiene saltos de línea o formato especial, respétalos
- NO traduzcas URLs, emails, códigos, o números de referencia`;

  const userPrompt = `Traduce el siguiente texto de ${langNames[sourceLang]} a ${langNames[targetLang]}:

${text}`;

  try {
    const response = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || text;
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

async function processTranslationQueue(supabaseAdmin: any) {
  // Obtener tareas pendientes (máximo 10 a la vez)
  const { data: tasks, error: fetchError } = await supabaseAdmin
    .from('translation_queue')
    .select('*')
    .eq('status', 'pending')
    .limit(10);

  if (fetchError || !tasks || tasks.length === 0) {
    return { processed: 0, errors: 0 };
  }

  let processed = 0;
  let errors = 0;

  for (const task of tasks) {
    try {
      // Marcar como procesando
      await supabaseAdmin
        .from('translation_queue')
        .update({ status: 'processing' })
        .eq('id', task.id);

      // Obtener el contenido original
      const { data: originalData } = await supabaseAdmin
        .from(task.entity_type)
        .select(task.field_name)
        .eq('id', task.entity_id)
        .single();

      if (!originalData || originalData[task.field_name] === null ||
          (typeof originalData[task.field_name] === 'string' && originalData[task.field_name].trim().length === 0)
        ) {
        console.warn(`Contenido original no encontrado para traducción`, {
          entity_type: task.entity_type,
          entity_id: task.entity_id,
          field_name: task.field_name,
        });

        // Si el registro original ya no existe o el campo está vacío,
        // marcamos la tarea como completada y la sacamos de la cola
        await supabaseAdmin
          .from('translation_queue')
          .update({
            status: 'completed',
            error_message: 'Registro original no encontrado o campo vacío. Tarea descartada automáticamente.',
            processed_at: new Date().toISOString(),
          })
          .eq('id', task.id);

        continue;
      }

      const originalText = originalData[task.field_name];

      // Traducir a cada idioma objetivo
      for (const targetLang of task.target_languages) {
        if (targetLang === task.source_language) continue;

        try {
          // Esperar 500ms para respetar rate limits
          await new Promise(resolve => setTimeout(resolve, 500));

          const translatedText = await translateText(
            originalText,
            task.source_language,
            targetLang,
            task.entity_type,
            task.field_name
          );

          // Guardar traducción
          await supabaseAdmin
            .from('translations')
            .upsert({
              entity_type: task.entity_type,
              entity_id: task.entity_id,
              field_name: task.field_name,
              language: targetLang,
              translated_text: translatedText,
              is_auto_translated: true,
            }, {
              onConflict: 'entity_type,entity_id,field_name,language'
            });

        } catch (langError) {
          console.error(`Error traduciendo a ${targetLang}:`, langError);
          errors++;
        }
      }

      // Marcar como completado
      await supabaseAdmin
        .from('translation_queue')
        .update({ 
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', task.id);

      processed++;

    } catch (error) {
      console.error(`Error procesando tarea ${task.id}:`, error);
      errors++;

      // Marcar como fallido
      await supabaseAdmin
        .from('translation_queue')
        .update({ 
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Error desconocido',
          processed_at: new Date().toISOString()
        })
        .eq('id', task.id);
    }
  }

  return { processed, errors };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'process_queue';

    if (action === 'translate_entity') {
      // Traducción manual de una entidad específica
      const { entity_type, entity_id, target_languages } = await req.json();

      if (!entity_type || !entity_id || !target_languages) {
        throw new Error('Faltan parámetros requeridos');
      }

      // Agregar a la cola
      await supabaseAdmin
        .from('translation_queue')
        .insert({
          entity_type,
          entity_id,
          field_name: '*', // Todos los campos
          target_languages,
          status: 'pending'
        });

      return new Response(
        JSON.stringify({ message: 'Traducción agregada a la cola' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Procesar cola automáticamente
    const results = await processTranslationQueue(supabaseAdmin);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in auto-translate function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
