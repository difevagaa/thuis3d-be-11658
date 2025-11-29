import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { i18nToast } from "@/lib/i18nToast";
import { Euro, ShoppingCart, FileText, Users, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { logger } from '@/lib/logger';

export default function AdminDashboard() {
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
  }, []);

  const loadVisitorStats = async () => {
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
  };

  const loadDashboardData = async () => {
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
      i18nToast.error("error.dashboardLoadFailed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    try {
      if (!newExpense.concept || newExpense.amount <= 0) {
        i18nToast.error("error.completeRequiredFields");
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

      i18nToast.success("success.expenseRegistered");
      setShowExpenseDialog(false);
      setNewExpense({ concept: "", amount: 0, date: new Date().toISOString().split('T')[0] });
      loadDashboardData();
    } catch (error) {
      logger.error("Error adding expense:", error);
      i18nToast.error("error.expenseRegisterFailed");
    }
  };

  const netProfit = stats.totalRevenue - stats.totalExpenses;

  if (loading) return <div className="container mx-auto p-4 xs:p-6">Cargando...</div>;

  return (
    <div className="container mx-auto p-2 xs:p-4 md:p-6 space-y-4 xs:space-y-6">
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 xs:gap-4">
        <h1 className="text-xl xs:text-2xl md:text-3xl font-bold">Dashboard</h1>
        <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs xs:text-sm h-8 xs:h-9">Registrar Gasto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-[90vw] xs:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base xs:text-lg">Registrar Nuevo Gasto</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 xs:space-y-4">
              <div>
                <Label className="text-xs xs:text-sm">Concepto</Label>
                <Input
                  value={newExpense.concept}
                  onChange={(e) => setNewExpense({ ...newExpense, concept: e.target.value })}
                  placeholder="Materia prima, transporte, etc."
                  className="text-sm xs:text-base h-9 xs:h-10"
                />
              </div>
              <div>
                <Label className="text-xs xs:text-sm">Monto (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  placeholder="Ej: 125.00"
                  className="text-sm xs:text-base h-9 xs:h-10"
                />
              </div>
              <div>
                <Label className="text-xs xs:text-sm">Fecha</Label>
                <Input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="text-sm xs:text-base h-9 xs:h-10"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddExpense} className="text-sm xs:text-base">Guardar Gasto</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 md:gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20" onClick={() => window.location.href = '/admin/pedidos'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 xs:p-4 pb-2 xs:pb-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xs xs:text-sm font-medium text-muted-foreground mb-1">Ingresos Totales</CardTitle>
              <div className="text-xl xs:text-2xl md:text-3xl font-bold text-primary truncate">€{stats.totalRevenue.toFixed(2)}</div>
              {stats.lastOrderDate && (
                <p className="text-[10px] xs:text-xs text-muted-foreground mt-1 xs:mt-2 truncate">
                  Último: {new Date(stats.lastOrderDate).toLocaleDateString('es-ES')}
                </p>
              )}
            </div>
            <div 
              className="h-10 w-10 xs:h-12 xs:w-12 md:h-16 md:w-16 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"
              style={{
                animation: 'float 18s ease-in-out infinite'
              }}
            >
              <Euro className="h-5 w-5 xs:h-6 xs:w-6 md:h-8 md:w-8 text-primary" />
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-all bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 xs:p-4 pb-2 xs:pb-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xs xs:text-sm font-medium text-muted-foreground mb-1">Gastos Totales</CardTitle>
              <div className="text-xl xs:text-2xl md:text-3xl font-bold text-destructive truncate">€{stats.totalExpenses.toFixed(2)}</div>
            </div>
            <div className="h-10 w-10 xs:h-12 xs:w-12 md:h-16 md:w-16 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="h-5 w-5 xs:h-6 xs:w-6 md:h-8 md:w-8 text-destructive" />
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-all bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 xs:p-4 pb-2 xs:pb-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xs xs:text-sm font-medium text-muted-foreground mb-1">Beneficio Neto</CardTitle>
              <div className={`text-xl xs:text-2xl md:text-3xl font-bold truncate ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                €{netProfit.toFixed(2)}
              </div>
            </div>
            <div className={`h-10 w-10 xs:h-12 xs:w-12 md:h-16 md:w-16 rounded-full flex items-center justify-center flex-shrink-0 ${netProfit >= 0 ? 'bg-success/20' : 'bg-destructive/20'}`}>
              <TrendingUp className={`h-5 w-5 xs:h-6 xs:w-6 md:h-8 md:w-8 ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`} />
            </div>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20" onClick={() => window.location.href = '/admin/pedidos'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 xs:p-4 pb-2 xs:pb-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xs xs:text-sm font-medium text-muted-foreground mb-1">Total Pedidos</CardTitle>
              <div className="text-xl xs:text-2xl md:text-3xl font-bold text-accent">{stats.totalOrders}</div>
            </div>
            <div 
              className="h-10 w-10 xs:h-12 xs:w-12 md:h-16 md:w-16 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0"
              style={{
                animation: 'smooth-bounce 15s ease-in-out infinite'
              }}
            >
              <ShoppingCart className="h-5 w-5 xs:h-6 xs:w-6 md:h-8 md:w-8 text-accent" />
            </div>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20" onClick={() => window.location.href = '/admin/cotizaciones'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 xs:p-4 pb-2 xs:pb-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xs xs:text-sm font-medium text-muted-foreground mb-1">Cotizaciones</CardTitle>
              <div className="text-xl xs:text-2xl md:text-3xl font-bold text-warning">{stats.totalQuotes}</div>
            </div>
            <div 
              className="h-10 w-10 xs:h-12 xs:w-12 md:h-16 md:w-16 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0"
              style={{
                animation: 'gentle-swing 20s ease-in-out infinite'
              }}
            >
              <FileText className="h-5 w-5 xs:h-6 xs:w-6 md:h-8 md:w-8 text-warning" />
            </div>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br from-chart-2/10 to-chart-2/5 border-chart-2/20" onClick={() => window.location.href = '/admin/visitantes'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 xs:p-4 pb-2 xs:pb-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xs xs:text-sm font-medium text-muted-foreground mb-1">Visitantes</CardTitle>
              <div className="text-xl xs:text-2xl md:text-3xl font-bold" style={{ color: 'hsl(var(--chart-2))' }}>{stats.totalCustomers}</div>
              <div className="flex flex-wrap items-center gap-1 xs:gap-3 mt-1 xs:mt-2">
                <div className="flex items-center gap-1">
                  <div 
                    className="h-1.5 w-1.5 xs:h-2 xs:w-2 rounded-full bg-success" 
                    style={{
                      animation: 'pulse-slow 3s ease-in-out infinite'
                    }}
                  />
                  <p className="text-[10px] xs:text-xs font-semibold text-success">
                    {stats.onlineUsers} en línea
                  </p>
                </div>
                <p className="text-[10px] xs:text-xs text-muted-foreground">
                  {stats.visitorsToday} hoy
                </p>
              </div>
            </div>
            <div 
              className="h-10 w-10 xs:h-12 xs:w-12 md:h-16 md:w-16 rounded-full flex items-center justify-center relative flex-shrink-0" 
              style={{ 
                backgroundColor: 'hsl(var(--chart-2) / 0.2)',
                animation: 'flame 8s ease-in-out infinite'
              }}
            >
              <Users 
                className="h-5 w-5 xs:h-6 xs:w-6 md:h-8 md:w-8" 
                style={{ 
                  color: 'hsl(var(--chart-2))',
                  animation: 'gentle-swing 16s ease-in-out infinite'
                }} 
              />
              {stats.onlineUsers > 0 && (
                <div 
                  className="absolute -top-0.5 -right-0.5 xs:-top-1 xs:-right-1 h-4 w-4 xs:h-5 xs:w-5 rounded-full bg-success flex items-center justify-center shadow-lg"
                  style={{
                    animation: 'pulse-slow 3s ease-in-out infinite'
                  }}
                >
                  <span className="text-[8px] xs:text-[10px] font-bold text-white">{stats.onlineUsers}</span>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 xs:gap-4 md:gap-6">
        <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
          <CardHeader className="p-3 xs:p-4 sm:p-6">
            <CardTitle className="text-base xs:text-lg sm:text-xl">Accesos Rápidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 xs:space-y-3 p-3 xs:p-4 sm:p-6 pt-0">
            <Button 
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity text-xs xs:text-sm sm:text-base h-9 xs:h-10 sm:h-11" 
              onClick={() => window.location.href = "/admin/productos/crear"}
            >
              Crear Producto Nuevo
            </Button>
            <Button 
              className="w-full bg-gradient-accent hover:opacity-90 transition-opacity text-xs xs:text-sm sm:text-base h-9 xs:h-10 sm:h-11" 
              onClick={() => window.location.href = "/admin/cotizaciones"}
            >
              Crear Cotización Manual
            </Button>
            <Button 
              className="w-full bg-gradient-secondary hover:opacity-90 transition-opacity text-xs xs:text-sm sm:text-base h-9 xs:h-10 sm:h-11" 
              onClick={() => window.location.href = "/admin/pedidos/crear"}
            >
              Crear Pedido Manual
            </Button>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-gradient-to-br from-card to-success/5">
          <CardHeader className="p-3 xs:p-4 sm:p-6">
            <CardTitle className="text-base xs:text-lg sm:text-xl">Resumen Financiero</CardTitle>
          </CardHeader>
          <CardContent className="p-3 xs:p-4 sm:p-6 pt-0">
            <div className="space-y-2 xs:space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center p-2 xs:p-3 rounded-lg bg-success/10 border border-success/20">
                <span className="text-xs xs:text-sm font-medium">Ingresos:</span>
                <span className="font-bold text-sm xs:text-base sm:text-lg text-success truncate ml-2">€{stats.totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-2 xs:p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <span className="text-xs xs:text-sm font-medium">Gastos:</span>
                <span className="font-bold text-sm xs:text-base sm:text-lg text-destructive truncate ml-2">-€{stats.totalExpenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-2 xs:p-3 sm:p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border-2 border-primary/30">
                <span className="font-semibold text-xs xs:text-sm sm:text-base">Beneficio Neto:</span>
                <span className={`font-bold text-base xs:text-lg sm:text-2xl truncate ml-2 ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
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
