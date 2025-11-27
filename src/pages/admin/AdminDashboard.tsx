import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Euro, ShoppingCart, FileText, Users, TrendingUp, TrendingDown, Plus, Package, PenLine, ClipboardList, Sparkles } from "lucide-react";
import { logger } from '@/lib/logger';
import { AdminNavigationGrid } from "@/components/AdminNavigationGrid";
import { useNavigate } from "react-router-dom";

interface RecentOrder {
  id: string;
  total: number;
  created_at: string;
  profiles?: { full_name: string };
}

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalQuotes: number;
  totalCustomers: number;
  totalExpenses: number;
  onlineUsers: number;
  visitorsToday: number;
  lastOrderDate: string | null;
  recentOrders: RecentOrder[];
}

const initialStats: DashboardStats = {
  totalRevenue: 0,
  totalOrders: 0,
  totalQuotes: 0,
  totalCustomers: 0,
  totalExpenses: 0,
  onlineUsers: 0,
  visitorsToday: 0,
  lastOrderDate: null,
  recentOrders: []
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(initialStats);
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
      toast.error("Error al cargar dashboard");
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-background p-6 md:p-8 border border-border/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Panel de Administración</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Bienvenido de nuevo
              </h1>
              <p className="text-muted-foreground mt-1">
                Aquí tienes un resumen de tu negocio hoy
              </p>
            </div>
            <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Gasto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Concepto</Label>
                    <Input
                      value={newExpense.concept}
                      onChange={(e) => setNewExpense({ ...newExpense, concept: e.target.value })}
                      placeholder="Materia prima, transporte, etc."
                    />
                  </div>
                  <div>
                    <Label>Monto (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                      placeholder="Ej: 125.00"
                    />
                  </div>
                  <div>
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddExpense}>Guardar Gasto</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 col-span-1" 
          onClick={() => navigate('/admin/pedidos')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Euro className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ingresos</p>
                <p className="text-lg font-bold text-blue-500">€{stats.totalRevenue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gastos</p>
                <p className="text-lg font-bold text-red-500">€{stats.totalExpenses.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${netProfit >= 0 ? 'from-green-500/10 to-green-600/5 border-green-500/20' : 'from-red-500/10 to-red-600/5 border-red-500/20'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${netProfit >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                <TrendingUp className={`h-5 w-5 ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Beneficio</p>
                <p className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>€{netProfit.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20" 
          onClick={() => navigate('/admin/pedidos')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <ShoppingCart className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pedidos</p>
                <p className="text-lg font-bold text-purple-500">{stats.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20" 
          onClick={() => navigate('/admin/cotizaciones')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <FileText className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cotizaciones</p>
                <p className="text-lg font-bold text-orange-500">{stats.totalQuotes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20" 
          onClick={() => navigate('/admin/visitantes')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20 relative">
                <Users className="h-5 w-5 text-cyan-500" />
                {stats.onlineUsers > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                    {stats.onlineUsers}
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Visitantes</p>
                <p className="text-lg font-bold text-cyan-500">{stats.totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          onClick={() => navigate('/admin/productos')}
          variant="outline"
          className="h-auto py-4 justify-start gap-3 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all group"
        >
          <div className="p-2 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
            <Package className="h-5 w-5 text-purple-500" />
          </div>
          <div className="text-left">
            <p className="font-medium">Nuevo Producto</p>
            <p className="text-xs text-muted-foreground">Añadir al catálogo</p>
          </div>
        </Button>

        <Button
          onClick={() => navigate('/admin/cotizaciones/crear')}
          variant="outline"
          className="h-auto py-4 justify-start gap-3 hover:bg-orange-500/10 hover:border-orange-500/50 transition-all group"
        >
          <div className="p-2 rounded-lg bg-orange-500/20 group-hover:bg-orange-500/30 transition-colors">
            <PenLine className="h-5 w-5 text-orange-500" />
          </div>
          <div className="text-left">
            <p className="font-medium">Nueva Cotización</p>
            <p className="text-xs text-muted-foreground">Crear manualmente</p>
          </div>
        </Button>

        <Button
          onClick={() => navigate('/admin/pedidos/crear')}
          variant="outline"
          className="h-auto py-4 justify-start gap-3 hover:bg-green-500/10 hover:border-green-500/50 transition-all group"
        >
          <div className="p-2 rounded-lg bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
            <ClipboardList className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-left">
            <p className="font-medium">Nuevo Pedido</p>
            <p className="text-xs text-muted-foreground">Registrar venta</p>
          </div>
        </Button>
      </div>

      {/* Navigation Grid */}
      <AdminNavigationGrid />
    </div>
  );
}
