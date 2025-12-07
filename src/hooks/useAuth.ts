import { useState, useEffect, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  userRoles: string[];
}

/**
 * Centralized authentication hook for managing user session state
 * 
 * @returns {UseAuthReturn} Authentication state and user information
 * 
 * @example
 * ```tsx
 * const { user, isAuthenticated, isAdmin, userRoles } = useAuth();
 * 
 * if (loading) return <Spinner />;
 * if (!isAuthenticated) return <Login />;
 * if (isAdmin) return <AdminPanel />;
 * ```
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.error('Error getting initial session:', error);
        }
        
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        // Load user roles if authenticated
        if (initialSession?.user) {
          await loadUserRoles(initialSession.user.id);
        } else {
          // Ensure empty roles array is set when no user
          setUserRoles([]);
          setIsAdmin(false);
        }
      } catch (error) {
        logger.error('Error initializing auth:', error);
        setUserRoles([]);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          await loadUserRoles(currentSession.user.id);
        } else {
          // User logged out - clear roles
          setUserRoles([]);
          setIsAdmin(false);
        }
        
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Load user roles from the database
   */
  const loadUserRoles = async (userId: string) => {
    try {
      const { data: rolesData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        logger.error('Error loading user roles:', error);
        setUserRoles([]);
        setIsAdmin(false);
        return;
      }

      const roles = (rolesData || [])
        .map(r => String(r.role || '').trim().toLowerCase())
        .filter(role => role.length > 0);

      setUserRoles(roles);
      setIsAdmin(roles.includes('admin') || roles.includes('administrator'));
    } catch (error) {
      logger.error('Error in loadUserRoles:', error);
      setUserRoles([]);
      setIsAdmin(false);
    }
  };

  // Memoize return value to prevent unnecessary re-renders
  return useMemo(
    () => ({
      user,
      session,
      loading,
      isAuthenticated: !!user,
      isAdmin,
      userRoles,
    }),
    [user, session, loading, isAdmin, userRoles]
  );
}

/**
 * Hook to check if user has specific role(s)
 * 
 * @param requiredRoles - Role(s) to check for (string or array of strings)
 * @param authState - Optional: Pass auth state from useAuth() to avoid duplicate subscriptions
 * @returns true if user has at least one of the required roles
 * 
 * @example
 * ```tsx
 * // Option 1: Simple usage (creates own subscription)
 * const hasAccess = useHasRole(['admin', 'editor']);
 * 
 * // Option 2: Share auth state (better performance)
 * const auth = useAuth();
 * const hasAccess = useHasRole(['admin', 'editor'], auth);
 * ```
 */
export function useHasRole(
  requiredRoles: string | string[],
  authState?: Pick<UseAuthReturn, 'userRoles' | 'loading'>
): boolean {
  // Use provided auth state or create own subscription
  const ownAuth = useAuth();
  const { userRoles, loading } = authState ?? ownAuth;
  
  if (loading) return false;
  
  const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  const normalizedRequired = rolesArray.map(r => r.toLowerCase());
  
  return userRoles.some(role => normalizedRequired.includes(role));
}

/**
 * Hook to require authentication - redirects to login if not authenticated
 * 
 * @example
 * ```tsx
 * function ProtectedPage() {
 *   const { user, loading } = useRequireAuth();
 *   
 *   if (loading) return <Spinner />;
 *   // User is guaranteed to be authenticated here
 *   return <div>Welcome {user.email}</div>;
 * }
 * ```
 */
export function useRequireAuth() {
  const auth = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) {
      setShouldRedirect(true);
    }
  }, [auth.loading, auth.isAuthenticated]);

  useEffect(() => {
    if (shouldRedirect) {
      // Store the current path to redirect back after login
      const returnTo = window.location.pathname + window.location.search;
      window.location.href = `/auth?returnTo=${encodeURIComponent(returnTo)}`;
    }
  }, [shouldRedirect]);

  return auth;
}
