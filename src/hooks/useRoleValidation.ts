import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export interface UserRole {
  role: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isModerator: boolean;
  isClient: boolean;
}

/**
 * Hook to validate user roles for protected admin pages
 * Redirects to home if user doesn't have required role
 */
export const useRoleValidation = (requiredRoles: string[] = ['admin', 'superadmin']) => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const navigate = useNavigate();
  
  // Stringify roles to prevent re-renders on array reference changes
  const rolesKey = JSON.stringify(requiredRoles);

  useEffect(() => {
    const validateRole = async () => {
      try {
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          logger.warn("Unauthorized access attempt to admin page");
          toast.error("Debes iniciar sesión para acceder a esta página");
          navigate("/");
          return;
        }

        // Fetch user role
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (roleError) {
          logger.error("Error fetching user role:", roleError);
          toast.error("Error al verificar permisos");
          navigate("/");
          return;
        }

        const role = roleData?.role || "client";

        // Build role object
        const userRoleObj: UserRole = {
          role,
          isAdmin: role === "admin" || role === "superadmin",
          isSuperAdmin: role === "superadmin",
          isModerator: role === "moderator",
          isClient: role === "client"
        };

        setUserRole(userRoleObj);

        // Check if user has required role
        const roles = JSON.parse(rolesKey);
        const hasRequiredRole = roles.some((reqRole: string) => {
          if (reqRole === 'admin') return userRoleObj.isAdmin;
          if (reqRole === 'superadmin') return userRoleObj.isSuperAdmin;
          if (reqRole === 'moderator') return userRoleObj.isModerator;
          return role === reqRole;
        });

        if (!hasRequiredRole) {
          logger.warn(`User ${user.id} with role ${role} attempted to access page requiring: ${roles.join(', ')}`);
          toast.error("No tienes permisos para acceder a esta página");
          navigate("/");
          return;
        }

        setHasAccess(true);
      } catch (error) {
        logger.error("Exception in role validation:", error);
        toast.error("Error al verificar permisos");
        navigate("/");
      } finally {
        setIsValidating(false);
      }
    };

    validateRole();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate("/");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, rolesKey]); // Use rolesKey instead of requiredRoles

  return { userRole, isValidating, hasAccess };
};

/**
 * Check if current user has a specific role
 */
export const checkUserRole = async (userId: string, requiredRole: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    const role = data.role;

    // Superadmin has access to everything
    if (role === "superadmin") return true;

    // Admin has access to admin features
    if (requiredRole === "admin" && (role === "admin" || role === "superadmin")) {
      return true;
    }

    // Exact role match
    return role === requiredRole;
  } catch (error) {
    logger.error("Error checking user role:", error);
    return false;
  }
};

/**
 * Get current user's role
 */
export const getCurrentUserRole = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      return "client"; // Default role
    }

    return data.role;
  } catch (error) {
    logger.error("Error getting current user role:", error);
    return null;
  }
};
