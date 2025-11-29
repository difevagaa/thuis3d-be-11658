import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Obtiene la sesión actual de forma segura.
 * Usa getSession() que lee del localStorage primero (rápido, sin red).
 * Si hay error, retorna null en lugar de lanzar excepción.
 */
export async function getSafeSession(): Promise<Session | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[Auth] Session error:', error.message);
      return null;
    }
    return session;
  } catch (error) {
    console.warn('[Auth] Exception getting session:', error);
    return null;
  }
}

/**
 * Obtiene el usuario actual de forma segura.
 * Usa getSession() primero (rápido), no getUser() que hace llamada de red.
 * Si hay error, retorna null en lugar de lanzar excepción.
 */
export async function getSafeUser(): Promise<User | null> {
  const session = await getSafeSession();
  return session?.user ?? null;
}

/**
 * Verifica si hay un usuario autenticado de forma segura.
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getSafeUser();
  return user !== null;
}

/**
 * Obtiene los roles del usuario actual de forma segura.
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (error) {
      console.warn('[Auth] Error getting user roles:', error.message);
      return [];
    }
    
    return (data || [])
      .map(r => String(r.role || '').trim().toLowerCase())
      .filter(role => role.length > 0);
  } catch (error) {
    console.warn('[Auth] Exception getting user roles:', error);
    return [];
  }
}

/**
 * Verifica si el usuario actual es administrador de forma segura.
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getSafeUser();
  if (!user) return false;
  
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (error) {
      console.warn('[Auth] Error checking admin role:', error.message);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.warn('[Auth] Exception checking admin role:', error);
    return false;
  }
}
