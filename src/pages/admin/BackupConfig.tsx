import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings, Database, Clock, AlertTriangle, CheckCircle2, Play } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface RetentionSetting {
  id: string;
  table_name: string;
  retention_days: number;
  size_threshold_mb: number;
  large_file_retention_days: number;
  auto_cleanup_enabled: boolean;
  updated_at: string;
}

export default function BackupConfig() {
  const [settings, setSettings] = useState<RetentionSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<RetentionSetting>>({});
  const [runningCleanup, setRunningCleanup] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('backup_retention_settings')
        .select('*')
        .order('table_name');

      if (error) throw error;
      setSettings(data || []);
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (setting: RetentionSetting) => {
    setEditing(setting.id);
    setEditValues({
      retention_days: setting.retention_days,
      size_threshold_mb: setting.size_threshold_mb,
      large_file_retention_days: setting.large_file_retention_days,
      auto_cleanup_enabled: setting.auto_cleanup_enabled
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValues({});
  };

  const saveEdit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('backup_retention_settings')
        .update(editValues)
        .eq('id', id);

      if (error) throw error;
      toast.success('Configuración actualizada');
      setEditing(null);
      setEditValues({});
      loadSettings();
    } catch (error: any) {
      console.error('Error updating setting:', error);
      toast.error('Error al actualizar');
    }
  };

  const runCleanup = async () => {
    try {
      setRunningCleanup(true);
      const { data, error } = await supabase.rpc('cleanup_expired_backups');

      if (error) throw error;
      
      const totalDeleted = (data || []).reduce((sum: number, item: any) => sum + (item.deleted_count || 0), 0);
      
      if (totalDeleted > 0) {
        toast.success(`✅ Limpieza completada: ${totalDeleted} elementos eliminados`);
      } else {
        toast.info('No hay elementos expirados para limpiar');
      }
      
      loadSettings();
    } catch (error: any) {
      console.error('Error running cleanup:', error);
      toast.error('Error al ejecutar limpieza: ' + error.message);
    } finally {
      setRunningCleanup(false);
    }
  };

  const formatTableName = (name: string) => {
    const names: Record<string, string> = {
      'pages': 'Páginas',
      'blog_posts': 'Blog',
      'products': 'Productos',
      'categories': 'Categorías',
      'materials': 'Materiales',
      'colors': 'Colores',
      'order_statuses': 'Estados de Pedido',
      'quote_statuses': 'Estados de Cotización',
      'coupons': 'Cupones',
      'gift_cards': 'Tarjetas Regalo',
      'legal_pages': 'Páginas Legales',
      'invoices': 'Facturas',
      'quotes': 'Cotizaciones',
      'orders': 'Pedidos',
      'notifications': 'Notificaciones'
    };
    return names[name] || name;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Configuración de Backups
          </h1>
          <p className="text-muted-foreground mt-2">
            Administra la retención automática de elementos eliminados
          </p>
        </div>
        <Button 
          onClick={runCleanup} 
          disabled={runningCleanup}
          variant="destructive"
        >
          {runningCleanup ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Limpiando...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Ejecutar Limpieza Manual
            </>
          )}
        </Button>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Sistema de Backup Automático:</strong> Los elementos eliminados se conservan según la configuración
          de retención. Los archivos grandes (&gt;20MB) se eliminan automáticamente después del periodo corto para ahorrar espacio.
          Puedes ajustar estos valores para cada tipo de contenido.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Configuración por Tipo de Contenido</CardTitle>
          <CardDescription>
            Define cuánto tiempo se mantienen los elementos eliminados antes de ser borrados permanentemente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Retención Normal</TableHead>
                  <TableHead>Umbral Tamaño</TableHead>
                  <TableHead>Retención Archivos Grandes</TableHead>
                  <TableHead>Auto-limpieza</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.map((setting) => {
                  const isEditing = editing === setting.id;
                  
                  return (
                    <TableRow key={setting.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          {formatTableName(setting.table_name)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              max="3650"
                              value={editValues.retention_days || 0}
                              onChange={(e) => setEditValues({ ...editValues, retention_days: parseInt(e.target.value) })}
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">días</span>
                          </div>
                        ) : (
                          <Badge variant="secondary">
                            {setting.retention_days} días ({Math.round(setting.retention_days / 30)} meses)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              max="1000"
                              value={editValues.size_threshold_mb || 0}
                              onChange={(e) => setEditValues({ ...editValues, size_threshold_mb: parseFloat(e.target.value) })}
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">MB</span>
                          </div>
                        ) : (
                          <span className="text-sm">{setting.size_threshold_mb} MB</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              max="365"
                              value={editValues.large_file_retention_days || 0}
                              onChange={(e) => setEditValues({ ...editValues, large_file_retention_days: parseInt(e.target.value) })}
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">días</span>
                          </div>
                        ) : (
                          <Badge variant="destructive">
                            {setting.large_file_retention_days} días
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Switch
                            checked={editValues.auto_cleanup_enabled}
                            onCheckedChange={(checked) => setEditValues({ ...editValues, auto_cleanup_enabled: checked })}
                          />
                        ) : (
                          setting.auto_cleanup_enabled ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveEdit(setting.id)}>
                              Guardar
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => startEdit(setting)}>
                            Editar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          <strong>Recomendaciones:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Para contenido crítico (pedidos, facturas): 180+ días</li>
            <li>Para contenido temporal (notificaciones): 30 días</li>
            <li>Archivos grandes: Máximo 30 días para ahorrar espacio</li>
            <li>Ejecuta la limpieza manual solo si necesitas liberar espacio inmediatamente</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
