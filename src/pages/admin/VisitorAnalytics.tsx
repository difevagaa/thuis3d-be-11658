import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Activity, Clock, Globe, Calendar, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface VisitorSession {
  id: string;
  user_id: string | null;
  session_id: string;
  page_path: string;
  last_seen_at: string;
  created_at: string;
  is_active: boolean;
  user_agent: string;
  device_type: string | null;
  deleted_at: string | null;
}

export default function VisitorAnalytics() {
  const [activeVisitors, setActiveVisitors] = useState<VisitorSession[]>([]);
  const [recentVisitors, setRecentVisitors] = useState<VisitorSession[]>([]);
  const [stats, setStats] = useState({
    totalToday: 0,
    totalThisWeek: 0,
    totalThisMonth: 0,
    averageSessionTime: 0,
    totalPageViews: 0,
  });
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [pageData, setPageData] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<any[]>([]);

  // Helper functions
  const calculateAverageSessionTime = (visitors: VisitorSession[]) => {
    if (visitors.length === 0) return 0;
    
    const times = visitors.map(v => {
      const start = new Date(v.created_at).getTime();
      const end = new Date(v.last_seen_at).getTime();
      return (end - start) / 1000 / 60; // minutos
    });
    
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  };

  const calculateHourlyStats = (visitors: VisitorSession[]) => {
    const hourCounts: { [key: string]: number } = {};
    
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(Date.now() - i * 60 * 60 * 1000).getHours();
      hourCounts[`${hour}:00`] = 0;
    }
    
    visitors.forEach(v => {
      const hour = new Date(v.created_at).getHours();
      const key = `${hour}:00`;
      if (key in hourCounts) {
        hourCounts[key]++;
      }
    });
    
    return Object.entries(hourCounts).map(([hour, count]) => ({
      hora: hour,
      visitas: count
    }));
  };

  const calculatePageStats = (visitors: VisitorSession[]) => {
    const pageCounts: { [key: string]: number } = {};
    
    visitors.forEach(v => {
      const page = v.page_path || '/';
      pageCounts[page] = (pageCounts[page] || 0) + 1;
    });
    
    return Object.entries(pageCounts)
      .map(([page, count]) => ({ pagina: page, visitas: count }))
      .sort((a, b) => b.visitas - a.visitas)
      .slice(0, 10);
  };

  const calculateDeviceStats = (visitors: VisitorSession[]) => {
    const deviceCounts: { [key: string]: number } = { mobile: 0, desktop: 0, tablet: 0, unknown: 0 };
    
    visitors.forEach(v => {
      // Usar device_type si existe, sino parsear user_agent
      const deviceType = v.device_type || 'unknown';
      if (deviceType in deviceCounts) {
        deviceCounts[deviceType as keyof typeof deviceCounts]++;
      } else {
        // Fallback: parsear user_agent
        const ua = v.user_agent?.toLowerCase() || '';
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
          deviceCounts.mobile++;
        } else if (ua.includes('tablet') || ua.includes('ipad')) {
          deviceCounts.tablet++;
        } else if (ua) {
          deviceCounts.desktop++;
        } else {
          deviceCounts.unknown++;
        }
      }
    });
    
    return [
      { name: 'Móvil', value: deviceCounts.mobile, color: '#8884d8' },
      { name: 'Desktop', value: deviceCounts.desktop, color: '#82ca9d' },
      { name: 'Tablet', value: deviceCounts.tablet, color: '#ffc658' }
    ].filter(d => d.value > 0); // Solo mostrar dispositivos con visitas
  };

  const loadVisitorData = useCallback(async () => {
    try {
      // Visitantes activos (últimos 2 minutos Y con is_active=true)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data: active, error: activeError } = await supabase
        .from('visitor_sessions')
        .select('*')
        .eq('is_active', true)
        .gte('last_seen_at', twoMinutesAgo)
        .is('deleted_at', null)
        .order('last_seen_at', { ascending: false });

      if (activeError) {
        console.error('❌ Error loading active visitors:', activeError);
      }

      setActiveVisitors(active || []);

      // Visitantes recientes (últimas 24 horas, no eliminados)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recent, error: recentError } = await supabase
        .from('visitor_sessions')
        .select('*')
        .gte('created_at', oneDayAgo)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (recentError) {
        console.error('❌ Error loading recent visitors:', recentError);
      }

      setRecentVisitors(recent || []);

      // Estadísticas
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const { data: allVisitors } = await supabase
        .from('visitor_sessions')
        .select('*');

      const todayVisitors = (allVisitors || []).filter(v => new Date(v.created_at) >= today);
      const weekVisitors = (allVisitors || []).filter(v => new Date(v.created_at) >= weekAgo);
      const monthVisitors = (allVisitors || []).filter(v => new Date(v.created_at) >= monthAgo);

      setStats({
        totalToday: todayVisitors.length,
        totalThisWeek: weekVisitors.length,
        totalThisMonth: monthVisitors.length,
        averageSessionTime: calculateAverageSessionTime(allVisitors || []),
        totalPageViews: allVisitors?.length || 0,
      });

      // Datos por hora (últimas 24 horas)
      const hourlyStats = calculateHourlyStats(recent || []);
      setHourlyData(hourlyStats);

      // Datos por página (filtrar deleted_at)
      const activeVisitors = (allVisitors || []).filter(v => !v.deleted_at);
      const pageStats = calculatePageStats(activeVisitors);
      setPageData(pageStats);

      // Datos por dispositivo (usar device_type si existe)
      const deviceStats = calculateDeviceStats(activeVisitors);
      setDeviceData(deviceStats);

    } catch (error) {
      console.error('Error loading visitor data:', error);
    }
  }, []);

  useEffect(() => {
    loadVisitorData();
    
    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('visitor-analytics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visitor_sessions'
        },
        () => {
          loadVisitorData();
        }
      )
      .subscribe();

    // Actualizar cada 30 segundos
    const interval = setInterval(loadVisitorData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [loadVisitorData]);

  const getTimeSince = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <div className="flex items-center justify-between p-6 rounded-2xl bg-white shadow-lg border-2 border-primary/20">
        <div>
          <h1 className="text-4xl font-bold text-primary flex items-center gap-3">
            <span className="text-5xl">📊</span>
            Analíticas de Visitantes
          </h1>
          <p className="text-foreground font-medium mt-2">Monitoreo completo en tiempo real</p>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-green-700">✅ En Línea Ahora</CardTitle>
            <Activity className="h-6 w-6 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">{activeVisitors.length}</div>
            <p className="text-xs text-green-700 font-semibold mt-2">Usuarios activos</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-2 border-blue-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-blue-700">📅 Hoy</CardTitle>
            <Calendar className="h-6 w-6 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">{stats.totalToday}</div>
            <p className="text-xs text-blue-700 font-semibold mt-2">Visitas totales</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-100 border-2 border-purple-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-purple-700">📈 Esta Semana</CardTitle>
            <TrendingUp className="h-6 w-6 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-purple-600">{stats.totalThisWeek}</div>
            <p className="text-xs text-purple-700 font-semibold mt-2">Últimos 7 días</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-yellow-100 border-2 border-orange-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-orange-700">🗓️ Este Mes</CardTitle>
            <Globe className="h-6 w-6 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-600">{stats.totalThisMonth}</div>
            <p className="text-xs text-orange-700 font-semibold mt-2">Últimos 30 días</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-green-100 border-2 border-teal-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-teal-700">⏱️ Tiempo Promedio</CardTitle>
            <Clock className="h-6 w-6 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-teal-600">{stats.averageSessionTime}m</div>
            <p className="text-xs text-teal-700 font-semibold mt-2">Por sesión</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-violet-50 to-purple-100 border-2 border-violet-300">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-violet-700">
              📈 Visitas por Hora (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hora" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff',
                    border: '2px solid #8b5cf6',
                    borderRadius: '12px',
                    fontWeight: 600
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="visitas" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-rose-100 border-2 border-pink-300">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-pink-700">
              📱 Dispositivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Páginas más visitadas */}
      <Card className="bg-gradient-to-br from-amber-50 to-orange-100 border-2 border-amber-300">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2 text-amber-700">
            🔥 Páginas Más Visitadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="pagina" stroke="#6b7280" style={{ fontSize: '10px' }} angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff',
                  border: '2px solid #f59e0b',
                  borderRadius: '12px',
                  fontWeight: 600
                }}
              />
              <Bar dataKey="visitas" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Visitantes activos */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2 text-green-700">
            <Users className="h-6 w-6" />
            👥 Visitantes Activos ({activeVisitors.length})
          </CardTitle>
          <CardDescription className="font-semibold text-green-600">Últimos 5 minutos</CardDescription>
        </CardHeader>
        <CardContent>
          {activeVisitors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Usuario</TableHead>
                  <TableHead className="font-bold">Página</TableHead>
                  <TableHead className="font-bold">Última Actividad</TableHead>
                  <TableHead className="font-bold">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeVisitors.map((visitor) => (
                  <TableRow key={visitor.id}>
                    <TableCell className="font-medium">
                      {visitor.user_id ? `Usuario: ${visitor.user_id.slice(0, 8)}...` : 'Visitante Anónimo'}
                    </TableCell>
                    <TableCell className="text-sm">{visitor.page_path}</TableCell>
                    <TableCell className="text-sm">{getTimeSince(visitor.last_seen_at)}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-500">🟢 En Línea</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-gray-600 py-8 font-medium">😴 No hay visitantes activos en este momento</p>
          )}
        </CardContent>
      </Card>

      {/* Visitantes recientes */}
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-2 border-blue-300">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2 text-blue-700">
            🕐 Visitantes Recientes (24h)
          </CardTitle>
          <CardDescription className="font-semibold text-blue-600">Últimas {recentVisitors.length} visitas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Usuario</TableHead>
                  <TableHead className="font-bold">Página</TableHead>
                  <TableHead className="font-bold">Hora</TableHead>
                  <TableHead className="font-bold">Dispositivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentVisitors.map((visitor) => {
                  const device = visitor.user_agent.toLowerCase().includes('mobile') ? '📱 Móvil' : '💻 Desktop';
                  return (
                    <TableRow key={visitor.id}>
                      <TableCell className="font-medium">
                        {visitor.user_id ? `Usuario: ${visitor.user_id.slice(0, 8)}...` : 'Visitante Anónimo'}
                      </TableCell>
                      <TableCell className="text-sm">{visitor.page_path}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(visitor.created_at).toLocaleString('es-ES')}
                      </TableCell>
                      <TableCell className="text-sm">{device}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
