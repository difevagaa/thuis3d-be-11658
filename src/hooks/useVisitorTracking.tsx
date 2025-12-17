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

export function useVisitorTracking() {
  const sessionIdRef = useRef<string>(
    sessionStorage.getItem('visitor_session_id') || 
    crypto.randomUUID()
  );
  const updateIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const sessionId = sessionIdRef.current;
    
    // Guardar session ID
    sessionStorage.setItem('visitor_session_id', sessionId);
    
    // Registrar visitante de forma COMPLETAMENTE NO-BLOQUEANTE
    // Usa requestIdleCallback para ejecutar cuando el navegador esté libre
    const registerVisitor = () => {
      // Obtener sesión de forma asíncrona sin bloquear
      supabase.auth.getSession().then(({ data: { session } }) => {
        const userId = session?.user?.id;
        
        // Solo registrar si hay usuario autenticado
        if (!userId) return;
        
        const visitorData = {
          session_id: sessionId,
          user_id: userId,
          page_path: window.location.pathname,
          last_seen_at: new Date().toISOString(),
          is_active: true,
          user_agent: navigator.userAgent,
          device_type: getDeviceType()
        };
        
        // Upsert silencioso
        supabase
          .from('visitor_sessions')
          .upsert(visitorData, { onConflict: 'session_id' })
          .then(() => {}, () => {});
        
        // Actualizar perfil silencioso
        supabase.rpc('update_user_activity', {
          user_id_param: userId,
          page_path: window.location.pathname
        }).then(() => {}, () => {});
      }).then(() => {}, () => {});
    };

    // Heartbeat cada 60 segundos - también no-bloqueante
    const updateActivity = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user?.id) return;
        
        supabase
          .from('visitor_sessions')
          .update({
            last_seen_at: new Date().toISOString(),
            page_path: window.location.pathname,
            is_active: true
          })
          .eq('session_id', sessionId)
          .then(() => {}, () => {});
        
        supabase.rpc('update_user_activity', {
          user_id_param: session.user.id,
          page_path: window.location.pathname
        }).then(() => {}, () => {});
      }).then(() => {}, () => {});
    };

    // Registrar DESPUÉS de que la página cargue completamente (no bloquea)
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => registerVisitor(), { timeout: 5000 });
    } else {
      setTimeout(registerVisitor, 2000); // Fallback: esperar 2s después de montar
    }

    // Heartbeat cada 60 segundos (reducido de 30s)
    updateIntervalRef.current = setInterval(updateActivity, 60000);

    // Marcar como inactivo al salir - usar sendBeacon para máxima fiabilidad
    const handleBeforeUnload = () => {
      const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/visitor_sessions`;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `${endpoint}?session_id=eq.${sessionId}`;
      
      // Usar fetch con keepalive (más confiable que sendBeacon para PATCH)
      fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ is_active: false }),
        keepalive: true
      }).catch(() => {});
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
