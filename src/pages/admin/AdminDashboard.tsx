import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Euro, ShoppingCart, FileText, Users, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { logger } from '@/lib/logger';
import { useRoleValidation } from "@/hooks/useRoleValidation";

export default function AdminDashboard() {
  // Validate admin role
  const { isValidating, hasAccess } = useRoleValidation(['admin', 'superadmin']);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalQuotes: 0,
    totalCustomers: 0,
    totalExpenses: 0,
    onlineUsers: 0,
    visitorsToday: 0,
    lastOrderDate: null as string | null,
    recentOrders: [] as any[]
  });
  const [loading, setLoading] = useState(true);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [newExpense, setNewExpense] = useState({
    concept: "",
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });

  // Show loading while validating role
  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Don't render if user doesn't have access
  if (!hasAccess) {
    return null;
  }

  const loadVisitorStats = useCallback(async () => {
    try {
      // Visitantes activos (últimos 3 minutos)
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
      const { data: activeVisitors } = await supabase
        .from('visitor_sessions')
        .select('*')
        .eq('is_active', true)
        .gte('last_seen_at', threeMinutesAgo);
      
      // Visitantes de hoy
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data: todayVisitors } = await supabase
        .from('visitor_sessions')
        .select('session_id')
        .gte('created_at', startOfDay.toISOString());

      // Contar visitantes únicos
      const uniqueTodayVisitors = new Set(todayVisitors?.map(v => v.session_id) || []).size;

      logger.log('📊 Dashboard - Visitantes activos:', activeVisitors?.length || 0);
      logger.log('📊 Dashboard - Visitantes hoy:', uniqueTodayVisitors);

      setStats(prev => ({
        ...prev,
        onlineUsers: activeVisitors?.length || 0,
        visitorsToday: uniqueTodayVisitors
      }));
    } catch (error) {
      logger.error("Error loading visitor stats:", error);
    }
  }, []); // No external dependencies

  const loadDashboardData = useCallback(async () => {
    try {
      const [ordersData, quotesData, customersData, expensesData, recentOrdersData] = await Promise.all([
        supabase.from("orders").select("total, created_at, payment_status").eq("payment_status", "paid").order("created_at", { ascending: false }),
        supabase.from("quotes").select("id").is("deleted_at", null),
        supabase.from("profiles").select("id"),
        supabase.from("expenses").select("amount"),
        supabase.from("orders").select("*, profiles(full_name)").eq("payment_status", "paid").order("created_at", { ascending: false }).limit(10)
      ]);

      const totalRevenue = ordersData.data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
      const totalExpenses = expensesData.data?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
      const lastOrderDate = ordersData.data?.[0]?.created_at || null;

      setStats(prev => ({
        ...prev,
        totalRevenue,
        totalOrders: ordersData.data?.length || 0,
        totalQuotes: quotesData.data?.length || 0,
        totalCustomers: customersData.data?.length || 0,
        totalExpenses,
        lastOrderDate,
        recentOrders: recentOrdersData.data || []
      }));

      // Cargar estadísticas de visitantes
      await loadVisitorStats();
    } catch (error) {
      logger.error("Error loading dashboard:", error);
      toast.error("Error al cargar dashboard");
    } finally {
      setLoading(false);
    }
  }, [loadVisitorStats]); // Depends on loadVisitorStats

  useEffect(() => {
    logger.log('🚀 AdminDashboard - Iniciando carga de datos y suscripción');
    loadDashboardData();
    
    // Real-time subscription para visitantes activos
    const channel = supabase
      .channel('dashboard-visitors')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'visitor_sessions'
      }, () => {
        logger.log('🔔 AdminDashboard - Cambio detectado en visitor_sessions');
        loadVisitorStats();
      })
      .subscribe();

    // Actualizar visitantes cada 30 segundos
    const interval = setInterval(() => {
      logger.log('⏰ AdminDashboard - Actualizando visitantes (intervalo 30s)');
      loadVisitorStats();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [loadDashboardData, loadVisitorStats]); // Now includes both functions

  const handleAddExpense = async () => {
    try {
      if (!newExpense.concept || newExpense.amount <= 0) {
        toast.error("Por favor completa todos los campos");
        return;
      }

      const { error } = await supabase
        .from("expenses")
        .insert({
          concept: newExpense.concept,
          amount: newExpense.amount,
          date: newExpense.date
        });

      if (error) throw error;

      toast.success("Gasto registrado exitosamente");
      setShowExpenseDialog(false);
      setNewExpense({ concept: "", amount: 0, date: new Date().toISOString().split('T')[0] });
      loadDashboardData();
    } catch (error) {
      logger.error("Error adding expense:", error);
      toast.error("Error al registrar gasto");
    }
  };

  const netProfit = stats.totalRevenue - stats.totalExpenses;

  if (loading) return <div className="container mx-auto p-3 sm:p-4 md:p-6">Cargando...</div>;

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Dashboard</h1>
        <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto text-sm">Registrar Gasto</Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:w-[90vw] md:w-full max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Registrar Nuevo Gasto</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <Label className="text-xs sm:text-sm">Concepto</Label>
                <Input
                  value={newExpense.concept}
                  onChange={(e) => setNewExpense({ ...newExpense, concept: e.target.value })}
                  placeholder="Materia prima, transporte, etc."
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Monto (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  placeholder="Ej: 125.00"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Fecha</Label>
                <Input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddExpense} className="w-full sm:w-auto text-sm">Guardar Gasto</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20" onClick={() => window.location.href = '/admin/pedidos'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 md:pb-4 p-3 sm:p-4 md:p-6">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground mb-0.5 sm:mb-1 truncate">Ingresos Totales</CardTitle>
              <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-primary truncate">€{stats.totalRevenue.toFixed(2)}</div>
              {stats.lastOrderDate && (
                <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mt-0.5 sm:mt-1 md:mt-2 truncate">
                  Último: {new Date(stats.lastOrderDate).toLocaleDateString('es-ES')}
                </p>
              )}
            </div>
            <div 
              className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 ml-1 sm:ml-2"
              style={{
                animation: 'float 18s ease-in-out infinite'
              }}
            >
              <Euro className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-primary" />
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-all bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 md:pb-4 p-3 sm:p-4 md:p-6">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground mb-0.5 sm:mb-1 truncate">Gastos Totales</CardTitle>
              <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-destructive truncate">€{stats.totalExpenses.toFixed(2)}</div>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0 ml-1 sm:ml-2">
              <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-destructive" />
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-all bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 md:pb-4 p-3 sm:p-4 md:p-6">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground mb-0.5 sm:mb-1 truncate">Beneficio Neto</CardTitle>
              <div className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold truncate ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                €{netProfit.toFixed(2)}
              </div>
            </div>
            <div className={`h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 rounded-full flex items-center justify-center flex-shrink-0 ml-1 sm:ml-2 ${netProfit >= 0 ? 'bg-success/20' : 'bg-destructive/20'}`}>
              <TrendingUp className={`h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`} />
            </div>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20" onClick={() => window.location.href = '/admin/pedidos'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 md:pb-4 p-3 sm:p-4 md:p-6">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground mb-0.5 sm:mb-1 truncate">Total Pedidos</CardTitle>
              <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-accent truncate">{stats.totalOrders}</div>
            </div>
            <div 
              className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 ml-1 sm:ml-2"
              style={{
                animation: 'smooth-bounce 15s ease-in-out infinite'
              }}
            >
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-accent" />
            </div>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20" onClick={() => window.location.href = '/admin/cotizaciones'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 md:pb-4 p-3 sm:p-4 md:p-6">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground mb-0.5 sm:mb-1 truncate">Cotizaciones</CardTitle>
              <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-warning truncate">{stats.totalQuotes}</div>
            </div>
            <div 
              className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0 ml-1 sm:ml-2"
              style={{
                animation: 'gentle-swing 20s ease-in-out infinite'
              }}
            >
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-warning" />
            </div>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br from-chart-2/10 to-chart-2/5 border-chart-2/20" onClick={() => window.location.href = '/admin/visitantes'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 md:pb-4 p-3 sm:p-4 md:p-6">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground mb-0.5 sm:mb-1 truncate">Visitantes</CardTitle>
              <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold truncate" style={{ color: 'hsl(var(--chart-2))' }}>{stats.totalCustomers}</div>
              <div className="flex items-center gap-1 sm:gap-2 md:gap-3 mt-0.5 sm:mt-1 md:mt-2">
                <div className="flex items-center gap-1">
                  <div 
                    className="h-2 w-2 rounded-full bg-success" 
                    style={{
                      animation: 'pulse-slow 3s ease-in-out infinite'
                    }}
                  />
                  <p className="text-xs font-semibold text-success">
                    {stats.onlineUsers} en línea
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.visitorsToday} hoy
                </p>
              </div>
            </div>
            <div 
              className="h-16 w-16 rounded-full flex items-center justify-center relative" 
              style={{ 
                backgroundColor: 'hsl(var(--chart-2) / 0.2)',
                animation: 'flame 8s ease-in-out infinite'
              }}
            >
              <Users 
                className="h-8 w-8" 
                style={{ 
                  color: 'hsl(var(--chart-2))',
                  animation: 'gentle-swing 16s ease-in-out infinite'
                }} 
              />
              {stats.onlineUsers > 0 && (
                <div 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-success flex items-center justify-center shadow-lg"
                  style={{
                    animation: 'pulse-slow 3s ease-in-out infinite'
                  }}
                >
                  <span className="text-[10px] font-bold text-white">{stats.onlineUsers}</span>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
          <CardHeader>
            <CardTitle className="text-xl">Accesos Rápidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" 
              size="lg"
              onClick={() => window.location.href = "/admin/productos/crear"}
            >
              Crear Producto Nuevo
            </Button>
            <Button 
              className="w-full bg-gradient-accent hover:opacity-90 transition-opacity" 
              size="lg"
              onClick={() => window.location.href = "/admin/cotizaciones"}
            >
              Crear Cotización Manual
            </Button>
            <Button 
              className="w-full bg-gradient-secondary hover:opacity-90 transition-opacity" 
              size="lg"
              onClick={() => window.location.href = "/admin/pedidos/crear"}
            >
              Crear Pedido Manual
            </Button>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-gradient-to-br from-card to-success/5">
          <CardHeader>
            <CardTitle className="text-xl">Resumen Financiero</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-success/10 border border-success/20">
                <span className="text-sm font-medium">Ingresos:</span>
                <span className="font-bold text-lg text-success">€{stats.totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <span className="text-sm font-medium">Gastos:</span>
                <span className="font-bold text-lg text-destructive">-€{stats.totalExpenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border-2 border-primary/30">
                <span className="font-semibold text-base">Beneficio Neto:</span>
                <span className={`font-bold text-2xl ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  €{netProfit.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
