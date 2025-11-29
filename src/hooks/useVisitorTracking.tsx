import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Detectar tipo de dispositivo
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent;
  if (/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return 'mobile';
  }
  if (/iPad|Tablet/i.test(ua)) {
    return 'tablet';
  }
  return 'desktop';
}

// Helper para obtener usuario de forma segura (no bloquea si falla)
async function getSafeUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  } catch {
    return null;
  }
}

export function useVisitorTracking() {
  const sessionIdRef = useRef<string>(
    sessionStorage.getItem('visitor_session_id') || 
    crypto.randomUUID()
  );
  const updateIntervalRef = useRef<NodeJS.Timeout>();
  const isRegistering = useRef(false);

  useEffect(() => {
    const sessionId = sessionIdRef.current;
    
    // Guardar session ID
    sessionStorage.setItem('visitor_session_id', sessionId);
    
    // Registrar visitante
    const registerVisitor = async () => {
      if (isRegistering.current) return;
      isRegistering.current = true;
      
      try {
        const user = await getSafeUser();
        const userId = user?.id || null;
        
        const visitorData = {
          session_id: sessionId,
          user_id: userId,
          page_path: window.location.pathname,
          last_seen_at: new Date().toISOString(),
          is_active: true,
          user_agent: navigator.userAgent,
          device_type: getDeviceType()
        };
        
        const { data, error } = await supabase
          .from('visitor_sessions')
          .upsert(visitorData, {
            onConflict: 'session_id',
            ignoreDuplicates: false
          })
          .select();
        
        if (error) {
          console.error('❌ [VISITOR] Error:', error.message);
        }
        
        // Si hay usuario autenticado, actualizar su estado en profiles
        if (userId) {
          const { error: activityError } = await supabase
            .rpc('update_user_activity', {
              user_id_param: userId,
              page_path: window.location.pathname
            });
          
          if (activityError) {
            console.error('❌ [ACTIVITY] Error updating user activity on register:', activityError);
          }
        }
      } catch (error) {
        console.error('❌ [VISITOR] Exception:', error);
      } finally {
        isRegistering.current = false;
      }
    };

    // Heartbeat: Actualizar actividad cada 30 segundos
    const updateActivity = async () => {
      try {
        const user = await getSafeUser();
        
        // Actualizar visitor_sessions
        const { error: sessionError } = await supabase
          .from('visitor_sessions')
          .update({
            last_seen_at: new Date().toISOString(),
            page_path: window.location.pathname,
            is_active: true
          })
          .eq('session_id', sessionId);
        
        // Si hay usuario autenticado, actualizar su estado en profiles
        if (user?.id) {
          const { error: activityError } = await supabase
            .rpc('update_user_activity', {
              user_id_param: user.id,
              page_path: window.location.pathname
            });
          
          if (activityError) {
            console.error('❌ [ACTIVITY] Error updating user activity:', activityError);
          }
        }
        
        if (sessionError) {
          // Si falla, re-registrar
          await registerVisitor();
        }
      } catch (error) {
        console.error('❌ [VISITOR] Update failed:', error);
      }
    };

    // Registrar al cargar
    registerVisitor();

    // Heartbeat cada 30 segundos (balance entre precisión y carga del servidor)
    updateIntervalRef.current = setInterval(updateActivity, 30000);

    // Marcar como inactivo al salir (beforeunload/pagehide)
    const handleBeforeUnload = async () => {
      try {
        const user = await getSafeUser();
        
        // Marcar usuario como offline si está autenticado
        if (user?.id) {
          await supabase.rpc('mark_user_offline', {
            user_id_param: user.id
          });
        }
        
        // Usar sendBeacon para garantizar que la petición se envíe incluso al cerrar
        const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/visitor_sessions`;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        const payload = JSON.stringify({ is_active: false });
        
        // Alternativa: usar fetch con keepalive
        const url = `${endpoint}?session_id=eq.${sessionId}`;
        
        fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Prefer': 'return=minimal'
          },
          body: payload,
          keepalive: true // ✅ CRÍTICO: Mantiene la petición viva al cerrar
        }).catch(() => {
          // Ignorar errores en beforeunload
        });
      } catch (error) {
        // Ignorar errores al cerrar
      }
    };

    // Detectar cuando el usuario cierra/abandona la página
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    // Cleanup al desmontar
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      
      // Marcar como inactivo al desmontar el componente
      handleBeforeUnload();
    };
  }, []);
}
