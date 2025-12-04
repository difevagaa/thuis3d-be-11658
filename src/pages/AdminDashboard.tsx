import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Clock, Package, MessageCircle, Eye, TrendingUp as TrendingUpIcon, Wallet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { logger } from '@/lib/logger';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalOrders: 0,
    pendingOrders: 0,
    newCustomers: 0,
    pendingQuotes: 0,
    lastOrderDate: null as Date | null,
    lastOrderNumber: null as string | null,
    lastOrderTotal: 0,
    onlineVisitors: 0,
    visitorsToday: 0,
    unreadMessages: 0,
    totalMessages: 0,
    totalProducts: 0,
    activeConversations: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const loadStatsRef = useRef<() => Promise<void>>();

  // Función de carga encapsulada para evitar problemas de dependencias
  const loadStats = useCallback(async () => {
    try {
      // Visitantes activos: últimos 3 minutos
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
      
      // Visitantes de hoy
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const [ordersRes, quotesRes, usersRes, recentOrdersRes, expensesRes, visitorsRes, todayVisitorsRes, messagesRes, productsRes] = await Promise.all([
        supabase.from("orders").select("id, total, payment_status, created_at, order_number").is("deleted_at", null),
        supabase.from("quotes").select("id, status_id, created_at").is("deleted_at", null),
        supabase.from("profiles").select("created_at").order("created_at", { ascending: false }),
        supabase.from("orders").select("*, profiles(full_name, email)").is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
        supabase.from("expenses").select("amount, created_at"),
        supabase.from("visitor_sessions").select("*").eq("is_active", true).gte("last_seen_at", threeMinutesAgo),
        supabase.from("visitor_sessions").select("session_id").gte("created_at", startOfDay.toISOString()),
        supabase.from("messages").select("id, is_read, is_admin_message, user_id, created_at").eq("is_admin_message", false),
        supabase.from("products").select("id").is("deleted_at", null)
      ]);
      
      const onlineVisitors = visitorsRes.data?.length || 0;
      const uniqueTodayVisitors = new Set(todayVisitorsRes.data?.map(v => v.session_id) || []).size;
      const clientMessages = messagesRes.data || [];
      const unreadMessages = clientMessages.filter(m => !m.is_read).length;
      const totalMessages = clientMessages.length;
      
      // Calcular conversaciones activas (usuarios únicos con mensajes en las últimas 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentMessageUsers = new Set(
        clientMessages
          .filter(m => m.created_at >= oneDayAgo && m.user_id)
          .map(m => m.user_id)
      );
      const activeConversations = recentMessageUsers.size;
      
      logger.log('📊 Dashboard - Visitantes activos:', onlineVisitors);
      logger.log('📊 Dashboard - Visitantes únicos hoy:', uniqueTodayVisitors);
      logger.log('💬 Dashboard - Mensajes no leídos:', unreadMessages);

      const allOrders = ordersRes.data || [];
      const paidOrders = allOrders.filter(o => o.payment_status === 'paid' || o.payment_status === 'completed');
      const pendingOrders = allOrders.filter(o => o.payment_status === 'pending').length;
      const totalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total), 0);
      const totalExpenses = (expensesRes.data || []).reduce((sum, exp) => sum + Number(exp.amount), 0);
      const pendingQuotes = (quotesRes.data || []).filter(q => !q.status_id).length;
      
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const newCustomers = (usersRes.data || []).filter(u => new Date(u.created_at) > lastMonth).length;
      
      // Obtener el último pedido (cualquiera, no solo pagado)
      const sortedOrders = [...allOrders].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const lastOrder = sortedOrders[0];
      const lastOrderDate = lastOrder ? new Date(lastOrder.created_at) : null;
      const lastOrderNumber = lastOrder?.order_number || null;
      const lastOrderTotal = lastOrder ? Number(lastOrder.total) : 0;

      const monthlyStats = calculateMonthlyStats(paidOrders, expensesRes.data || []);
      
      setStats({
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        totalOrders: paidOrders.length,
        pendingOrders,
        newCustomers,
        pendingQuotes,
        lastOrderDate,
        lastOrderNumber,
        lastOrderTotal,
        onlineVisitors,
        visitorsToday: uniqueTodayVisitors,
        unreadMessages,
        totalMessages,
        totalProducts: productsRes.data?.length || 0,
        activeConversations
      });
      
      setRecentOrders(recentOrdersRes.data || []);
      setMonthlyData(monthlyStats);
      setLastUpdate(new Date());
    } catch (error) {
      logger.error('❌ Error loading dashboard stats:', error);
    }
  }, []);

  // Guardar referencia para usar en el efecto de limpieza
  loadStatsRef.current = loadStats;

  useEffect(() => {
    loadStats();
    
    // Actualización automática cada 30 segundos
    const autoRefreshInterval = setInterval(() => {
      loadStatsRef.current?.();
    }, 30000);
    
    // Suscribirse a cambios en tiempo real de múltiples tablas
    const visitorsChannel = supabase
      .channel('dashboard-visitors')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visitor_sessions' },
        () => { loadStatsRef.current?.(); }
      )
      .subscribe();

    const ordersChannel = supabase
      .channel('dashboard-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => { loadStatsRef.current?.(); }
      )
      .subscribe();

    const quotesChannel = supabase
      .channel('dashboard-quotes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quotes' },
        () => { loadStatsRef.current?.(); }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel('dashboard-messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => { loadStatsRef.current?.(); }
      )
      .subscribe();

    return () => {
      clearInterval(autoRefreshInterval);
      supabase.removeChannel(visitorsChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(quotesChannel);
      supabase.removeChannel(messagesChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadStats();
    setIsRefreshing(false);
  };



  const calculateMonthlyStats = (orders: any[], expenses: any[]) => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthDate.toLocaleDateString('es-ES', { month: 'short' });
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      const monthOrders = orders.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });
      
      const monthExpenses = expenses.filter(e => {
        const expDate = new Date(e.created_at);
        return expDate >= monthStart && expDate <= monthEnd;
      });
      
      const revenue = monthOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const expense = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      
      months.push({
        name: monthName,
        ingresos: revenue,
        gastos: expense,
        pedidos: monthOrders.length
      });
    }
    
    return months;
  };

  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-background via-primary/5 to-accent/5 min-h-screen">
      {/* Header con indicador de actualización */}
      <div className="flex items-center justify-between p-6 rounded-2xl bg-white shadow-lg border-2 border-primary/20">
        <div>
          <h1 className="text-4xl font-bold text-primary">💼 Dashboard Principal</h1>
          <p className="text-foreground font-medium mt-2">✨ Resumen de tu negocio en tiempo real</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Actualizado: {lastUpdate.toLocaleTimeString('es-ES')}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </div>
      </div>

      {/* Grid de estadísticas principales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Ingresos Totales */}
        <Card 
          className="cursor-pointer hover:shadow-glow hover:scale-105 transition-all duration-300 bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300"
          onClick={() => navigate('/admin/pedidos')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-sm font-bold text-emerald-700 mb-2">💰 Ingresos Totales</CardTitle>
              <div className="text-4xl font-bold text-green-600">€{stats.totalRevenue.toFixed(2)}</div>
              <p className="text-sm font-semibold text-green-700 mt-2">
                📦 De {stats.totalOrders} pedidos pagados
              </p>
            </div>
            <div className="text-6xl" style={{ animation: 'float 18s ease-in-out infinite' }}>
              💵
            </div>
          </CardHeader>
        </Card>

        {/* Beneficio Neto - AHORA CON ENLACE */}
        <Card 
          className="cursor-pointer hover:shadow-glow hover:scale-105 transition-all duration-300 bg-gradient-to-br from-blue-50 to-cyan-100 border-2 border-blue-300"
          onClick={() => navigate('/admin/facturas')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-sm font-bold text-blue-700 mb-2">📈 Beneficio Neto</CardTitle>
              <div className={`text-4xl font-bold ${stats.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                €{stats.netProfit.toFixed(2)}
              </div>
              <p className="text-sm font-semibold text-blue-700 mt-2">
                💸 Gastos: €{stats.totalExpenses.toFixed(2)}
              </p>
            </div>
            <div className="text-6xl" style={{ animation: 'pulse-slow 3s ease-in-out infinite' }}>
              {stats.netProfit >= 0 ? '🎯' : '⚠️'}
            </div>
          </CardHeader>
        </Card>

        {/* Nuevos Clientes */}
        <Card 
          className="cursor-pointer hover:shadow-glow hover:scale-105 transition-all duration-300 bg-gradient-to-br from-purple-50 to-pink-100 border-2 border-purple-300"
          onClick={() => navigate('/admin/usuarios')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-sm font-bold text-purple-700 mb-2">👥 Nuevos Clientes</CardTitle>
              <div className="text-4xl font-bold text-purple-600">{stats.newCustomers}</div>
              <p className="text-sm font-semibold text-purple-700 mt-2">
                📅 Último mes
              </p>
            </div>
            <div className="text-6xl" style={{ animation: 'smooth-bounce 15s ease-in-out infinite' }}>
              🎉
            </div>
          </CardHeader>
        </Card>

        {/* Presupuestos Pendientes */}
        <Card 
          className="cursor-pointer hover:shadow-glow hover:scale-105 transition-all duration-300 bg-gradient-to-br from-orange-50 to-yellow-100 border-2 border-orange-300"
          onClick={() => navigate('/admin/cotizaciones')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-sm font-bold text-orange-700 mb-2">📋 Presupuestos</CardTitle>
              <div className="text-4xl font-bold text-orange-600">{stats.pendingQuotes}</div>
              <p className="text-sm font-semibold text-orange-700 mt-2">
                ⏰ Requieren atención
              </p>
              {stats.pendingQuotes > 0 && (
                <Badge className="mt-2 bg-orange-500 text-white animate-pulse">¡Urgente!</Badge>
              )}
            </div>
            <div className="text-6xl" style={{ animation: 'gentle-swing 20s ease-in-out infinite' }}>
              📄
            </div>
          </CardHeader>
        </Card>

        {/* Último Pedido - MEJORADO CON MÁS INFORMACIÓN */}
        <Card 
          className="cursor-pointer hover:shadow-lg hover:scale-102 transition-all duration-300 col-span-2 bg-gradient-to-br from-indigo-50 to-blue-100 border-2 border-indigo-300"
          onClick={() => navigate('/admin/pedidos')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex-1">
              <CardTitle className="text-sm font-bold text-indigo-700 mb-2">📆 Último Pedido</CardTitle>
              {stats.lastOrderDate ? (
                <>
                  <div className="text-3xl font-bold text-indigo-600">
                    {stats.lastOrderDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    {stats.lastOrderNumber && (
                      <Badge variant="secondary" className="bg-indigo-200 text-indigo-800">
                        #{stats.lastOrderNumber}
                      </Badge>
                    )}
                    <span className="text-lg font-bold text-green-600">
                      €{stats.lastOrderTotal.toFixed(2)}
                    </span>
                    <span className="text-sm text-indigo-600">
                      {stats.lastOrderDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {stats.pendingOrders > 0 && (
                    <div className="mt-2">
                      <Badge className="bg-yellow-500 text-white">
                        <Package className="h-3 w-3 mr-1" />
                        {stats.pendingOrders} pedidos pendientes de pago
                      </Badge>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-2xl font-bold text-indigo-400">❌ Sin pedidos aún</div>
              )}
            </div>
            <div className="text-6xl" style={{ animation: 'smooth-bounce 16s ease-in-out infinite' }}>
              🛍️
            </div>
          </CardHeader>
        </Card>

        {/* Actividad en Tiempo Real - MEJORADO */}
        <Card 
          className="col-span-2 bg-gradient-to-br from-teal-50 to-green-100 border-2 border-teal-300 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => navigate('/admin/visitantes')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-teal-700 mb-2">⚡ Actividad en Tiempo Real</CardTitle>
                <div 
                  className="h-3 w-3 rounded-full bg-green-500 animate-pulse" 
                />
              </div>
              <div className="text-4xl font-bold text-teal-600">
                {stats.onlineVisitors > 0 
                  ? `✅ ${stats.onlineVisitors} ${stats.onlineVisitors === 1 ? 'Visitante' : 'Visitantes'}` 
                  : '😴 Sin visitantes activos'}
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <div className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full">
                  <Eye className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-bold text-green-700">
                    {stats.onlineVisitors} en línea
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-teal-100 px-3 py-1 rounded-full">
                  <TrendingUpIcon className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-semibold text-teal-700">
                    {stats.visitorsToday} visitantes hoy
                  </span>
                </div>
              </div>
            </div>
            <div className="text-6xl" style={{ animation: stats.onlineVisitors > 0 ? 'flame 8s ease-in-out infinite' : 'none' }}>
              {stats.onlineVisitors > 0 ? '🔥' : '💤'}
            </div>
          </CardHeader>
        </Card>

        {/* Mensajes de Chat - MEJORADO */}
        <Card 
          className="cursor-pointer hover:shadow-glow hover:scale-105 transition-all duration-300 bg-gradient-to-br from-cyan-50 to-blue-100 border-2 border-cyan-300"
          onClick={() => navigate('/admin/messages')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-sm font-bold text-cyan-700 mb-2">💬 Mensajes de Chat</CardTitle>
              <div className="text-4xl font-bold text-cyan-600">
                {stats.unreadMessages > 0 ? `🔔 ${stats.unreadMessages}` : '✅ 0'}
              </div>
              <p className="text-sm font-semibold text-cyan-700 mt-2">
                {stats.unreadMessages > 0 
                  ? `${stats.unreadMessages} sin leer de ${stats.totalMessages}` 
                  : `${stats.totalMessages} mensajes totales`}
              </p>
              {stats.unreadMessages > 0 && (
                <Badge className="mt-2 bg-red-500 text-white animate-pulse">
                  <MessageCircle className="h-3 w-3 mr-1" />
                  ¡Responder!
                </Badge>
              )}
            </div>
            <div className="text-6xl" style={{ animation: stats.unreadMessages > 0 ? 'smooth-bounce 10s ease-in-out infinite' : 'none' }}>
              {stats.unreadMessages > 0 ? '📬' : '📭'}
            </div>
          </CardHeader>
        </Card>

        {/* Chat en Vivo - MEJORADO */}
        <Card 
          className="cursor-pointer hover:shadow-glow hover:scale-105 transition-all duration-300 bg-gradient-to-br from-rose-50 to-pink-100 border-2 border-rose-300"
          onClick={() => navigate('/admin/messages')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-sm font-bold text-rose-700 mb-2">📨 Conversaciones</CardTitle>
              <div className="text-2xl font-bold text-rose-600">
                {stats.activeConversations > 0 ? `${stats.activeConversations} activas` : 'Sin actividad'}
              </div>
              <p className="text-sm font-semibold text-rose-700 mt-2">
                💡 Últimas 24 horas
              </p>
            </div>
            <div className="text-6xl" style={{ animation: stats.activeConversations > 0 ? 'gentle-swing 18s ease-in-out infinite' : 'none' }}>
              {stats.activeConversations > 0 ? '💌' : '📭'}
            </div>
          </CardHeader>
        </Card>

        {/* Nueva tarjeta de Productos */}
        <Card 
          className="cursor-pointer hover:shadow-glow hover:scale-105 transition-all duration-300 bg-gradient-to-br from-slate-50 to-gray-100 border-2 border-slate-300"
          onClick={() => navigate('/admin/productos')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-sm font-bold text-slate-700 mb-2">🏷️ Productos</CardTitle>
              <div className="text-4xl font-bold text-slate-600">{stats.totalProducts}</div>
              <p className="text-sm font-semibold text-slate-700 mt-2">
                📦 En catálogo
              </p>
            </div>
            <div className="text-6xl" style={{ animation: 'float 20s ease-in-out infinite' }}>
              🛒
            </div>
          </CardHeader>
        </Card>

        {/* Nueva tarjeta de Gastos */}
        <Card 
          className="cursor-pointer hover:shadow-glow hover:scale-105 transition-all duration-300 bg-gradient-to-br from-red-50 to-rose-100 border-2 border-red-300"
          onClick={() => navigate('/admin/facturas')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-sm font-bold text-red-700 mb-2">💸 Gastos Totales</CardTitle>
              <div className="text-4xl font-bold text-red-600">€{stats.totalExpenses.toFixed(2)}</div>
              <p className="text-sm font-semibold text-red-700 mt-2">
                <Wallet className="h-4 w-4 inline mr-1" />
                Ver facturas
              </p>
            </div>
            <div className="text-6xl" style={{ animation: 'gentle-swing 15s ease-in-out infinite' }}>
              📊
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pedidos Recientes - MEJORADO */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all bg-gradient-to-br from-pink-50 to-rose-100 border-2 border-pink-300"
          onClick={() => navigate('/admin/pedidos')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2 text-pink-700">
                  🛒 Pedidos Recientes
                </CardTitle>
                <CardDescription className="font-medium text-pink-600">📊 Últimos 5 pedidos realizados</CardDescription>
              </div>
              <Badge variant="outline" className="bg-pink-100 text-pink-700 border-pink-300">
                {recentOrders.length} pedidos
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="flex items-center justify-between p-4 border-2 rounded-xl hover:border-pink-400 hover:shadow-md cursor-pointer transition-all duration-200 bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/pedidos/${order.id}`);
                    }}
                  >
                    <div className="flex-1">
                      <p className="font-bold text-base text-pink-700">📦 {order.order_number}</p>
                      <p className="text-sm font-medium text-gray-700">
                        👤 {order.profiles?.full_name || 'Cliente'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleString('es-ES', { 
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl text-green-600">€{Number(order.total).toFixed(2)}</p>
                      <Badge 
                        className={`text-xs ${
                          order.payment_status === 'paid' ? 'bg-green-500' :
                          order.payment_status === 'pending' ? 'bg-yellow-500' :
                          order.payment_status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                        } text-white`}
                      >
                        {order.payment_status === 'paid' ? '✓ Pagado' :
                         order.payment_status === 'pending' ? '⏳ Pendiente' :
                         order.payment_status === 'failed' ? '✗ Fallido' : order.payment_status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 font-medium">😔 No hay pedidos recientes</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={(e) => { e.stopPropagation(); navigate('/admin/pedidos/crear'); }}
                >
                  Crear pedido manual
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Ingresos vs Gastos */}
        <Card className="bg-gradient-to-br from-violet-50 to-purple-100 border-2 border-violet-300">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-violet-700">
              📊 Ingresos vs Gastos
            </CardTitle>
            <CardDescription className="font-medium text-violet-600">💰 Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#6b7280" style={{ fontWeight: 600 }} />
                <YAxis stroke="#6b7280" style={{ fontWeight: 600 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff',
                    border: '2px solid #8b5cf6',
                    borderRadius: '12px',
                    fontWeight: 600
                  }}
                  formatter={(value: number, name: string) => [`€${value.toFixed(2)}`, name]}
                />
                <Legend />
                <Bar dataKey="ingresos" fill="#10b981" name="💰 Ingresos" radius={[8, 8, 0, 0]} />
                <Bar dataKey="gastos" fill="#ef4444" name="💸 Gastos" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Evolución de Pedidos */}
        <Card className="md:col-span-2 bg-gradient-to-br from-amber-50 to-orange-100 border-2 border-amber-300">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-amber-700">
              📈 Evolución de Pedidos
            </CardTitle>
            <CardDescription className="font-medium text-amber-600">🚀 Número de pedidos por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#6b7280" style={{ fontWeight: 600 }} />
                <YAxis stroke="#6b7280" style={{ fontWeight: 600 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff',
                    border: '2px solid #f59e0b',
                    borderRadius: '12px',
                    fontWeight: 600
                  }}
                />
                <Legend />
                <Line
                  type="monotone" 
                  dataKey="pedidos" 
                  stroke="#f59e0b" 
                  strokeWidth={4} 
                  name="📦 Pedidos"
                  dot={{ fill: '#f59e0b', r: 8, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 10, fill: '#f59e0b', strokeWidth: 3, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
