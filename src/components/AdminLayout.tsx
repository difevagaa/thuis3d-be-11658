import { ReactNode, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import AdminNotificationBell from "./AdminNotificationBell";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
interface AdminLayoutProps {
  children: ReactNode;
}
export const AdminLayout = ({
  children
}: AdminLayoutProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const checkAdminAccess = useCallback(async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Debes iniciar sesión");
        navigate("/auth");
        return;
      }
      const {
        data,
        error
      } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error("No tienes permisos de administrador");
        navigate("/");
        return;
      }
      setIsAdmin(true);
    } catch (error: unknown) {
      logger.error("Error checking admin access:", { error });
      toast.error("Error al verificar permisos");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Verificando permisos...</div>
      </div>;
  }
  if (!isAdmin) {
    return null;
  }
  return <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1">
          <header className="h-14 flex items-center justify-between border-b px-4">
            <div className="flex items-center">
              <SidebarTrigger />
              <h1 className="ml-4 text-lg font-semibold">Panel de Administración</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate("/")} className="p-2 hover:bg-accent rounded-md transition-colors" title="Ir a la página de inicio">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="bg-red-100">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </button>
              <AdminNotificationBell />
            </div>
          </header>
          <main className="p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>;
};