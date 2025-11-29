import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { i18nToast, toast } from "@/lib/i18nToast";
import { RotateCcw, Trash2, ShieldAlert, Clock, User, Database, Calendar, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { logger } from '@/lib/logger';

interface BackupMetadata {
  id: string;
  table_name: string;
  record_id: string;
  deleted_at: string;
  deleted_by: string | null;
  original_data: any;
  estimated_size_mb: number;
  expiration_date: string;
  deletion_reason: string | null;
  related_files: string[] | null;
  restored_at: string | null;
  permanently_deleted_at: string | null;
}

interface DeletedItems {
  pages: any[];
  posts: any[];
  products: any[];
  categories: any[];
  materials: any[];
  colors: any[];
  orderStatuses: any[];
  quoteStatuses: any[];
  coupons: any[];
  giftCards: any[];
  legalPages: any[];
  invoices: any[];
  quotes: any[];
  orders: any[];
}

export default function Trash() {
  const [deleted, setDeleted] = useState<DeletedItems>({
    pages: [],
    posts: [],
    products: [],
    categories: [],
    materials: [],
    colors: [],
    orderStatuses: [],
    quoteStatuses: [],
    coupons: [],
    giftCards: [],
    legalPages: [],
    invoices: [],
    quotes: [],
    orders: []
  });
  const [backupMetadata, setBackupMetadata] = useState<Record<string, BackupMetadata>>({});
  const [loading, setLoading] = useState(true);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [pin, setPin] = useState("");
  const [pendingAction, setPendingAction] = useState<{ 
    action: 'delete' | 'restore'; 
    table: string; 
    id: string 
  } | null>(null);

  useEffect(() => {
    loadDeletedItems();
  }, []);

  const loadDeletedItems = async () => {
    setLoading(true);
    try {
      logger.log("Loading deleted items...");
      
      const [pages, posts, products, categories, materials, colors, orderStatuses, quoteStatuses, coupons, giftCards, legalPages, invoices, quotes, orders, metadata] = await Promise.all([
        supabase.from("pages").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("blog_posts").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("products").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("categories").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("materials").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("colors").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("order_statuses").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("quote_statuses").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("coupons").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("gift_cards").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("legal_pages").select("*").eq("is_published", false).order("updated_at", { ascending: false }),
        supabase.from("invoices").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("quotes").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("orders").select("*, user:profiles!orders_user_id_fkey(full_name, email), status:order_statuses(name)").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("backup_metadata")
          .select("*")
          .is("permanently_deleted_at", null)
          .order("deleted_at", { ascending: false })
      ]);

      // Crear mapa de metadata por table_name + record_id
      const metadataMap: Record<string, BackupMetadata> = {};
      (metadata.data || []).forEach((meta: BackupMetadata) => {
        metadataMap[`${meta.table_name}_${meta.record_id}`] = meta;
      });
      setBackupMetadata(metadataMap);

      logger.log("Deleted items count:", {
        pages: pages.data?.length || 0,
        posts: posts.data?.length || 0,
        products: products.data?.length || 0,
        categories: categories.data?.length || 0,
        materials: materials.data?.length || 0,
        colors: colors.data?.length || 0,
        orderStatuses: orderStatuses.data?.length || 0,
        quoteStatuses: quoteStatuses.data?.length || 0,
        coupons: coupons.data?.length || 0,
        giftCards: giftCards.data?.length || 0,
        legalPages: legalPages.data?.length || 0,
        invoices: invoices.data?.length || 0,
        quotes: quotes.data?.length || 0,
        orders: orders.data?.length || 0,
        metadata: metadata.data?.length || 0
      });

      setDeleted({
        pages: pages.data || [],
        posts: posts.data || [],
        products: products.data || [],
        categories: categories.data || [],
        materials: materials.data || [],
        colors: colors.data || [],
        orderStatuses: orderStatuses.data || [],
        quoteStatuses: quoteStatuses.data || [],
        coupons: coupons.data || [],
        giftCards: giftCards.data || [],
        legalPages: legalPages.data || [],
        invoices: invoices.data || [],
        quotes: quotes.data || [],
        orders: orders.data || []
      });
    } catch (error: any) {
      logger.error("Error loading deleted items:", error);
      toast.error("Error al cargar elementos eliminados: " + (error.message || "Error desconocido"));
    } finally {
      setLoading(false);
    }
  };

  const requestRestore = (table: string, id: string) => {
    setPendingAction({ action: 'restore', table, id });
    setShowPinDialog(true);
    setPin("");
  };

  const requestPermanentDelete = (table: string, id: string) => {
    setPendingAction({ action: 'delete', table, id });
    setShowPinDialog(true);
    setPin("");
  };

  const executeAction = async () => {
    if (!pendingAction) return;

    try {
      // Verify PIN via secure Edge Function
      const { data, error } = await supabase.functions.invoke('verify-admin-pin', {
        body: {
          pin: pin,
          action: pendingAction.action,
          table: pendingAction.table,
          item_id: pendingAction.id
        }
      });

      if (error || !data?.success) {
        toast.error(data?.error || "PIN incorrecto o no configurado");
        return;
      }

      if (pendingAction.action === 'restore') {
        // Restaurar elemento
        await supabase.rpc('restore_with_metadata', {
          p_table_name: pendingAction.table,
          p_record_id: pendingAction.id
        });
        i18nToast.success("success.itemRestored");
      } else {
        // Eliminar permanentemente
        i18nToast.success("success.itemPermanentlyDeleted");
      }
      
      setShowPinDialog(false);
      setPendingAction(null);
      setPin("");
      loadDeletedItems();
    } catch (error: any) {
      logger.error(`Error ${pendingAction.action === 'restore' ? 'restoring' : 'deleting'} item:`, error);
      toast.error(`Error al ${pendingAction.action === 'restore' ? 'restaurar' : 'eliminar'}: ` + (error.message || "Error desconocido"));
    }
  };

  const getItemMetadata = (table: string, id: string): BackupMetadata | null => {
    return backupMetadata[`${table}_${id}`] || null;
  };

  const formatExpirationDate = (date: string) => {
    const expiration = new Date(date);
    const now = new Date();
    const isExpiringSoon = expiration.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000; // 7 días
    
    return (
      <div className={`flex items-center gap-1 ${isExpiringSoon ? 'text-destructive' : 'text-muted-foreground'}`}>
        <Clock className="h-3 w-3" />
        <span className="text-xs">
          {formatDistanceToNow(expiration, { addSuffix: true, locale: es })}
        </span>
      </div>
    );
  };

  const renderTable = (items: any[], table: string, columns: string[]) => {
    if (!items || items.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          No hay elementos en la papelera
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => <TableHead key={col}>{col}</TableHead>)}
              <TableHead>Eliminado</TableHead>
              <TableHead>Por</TableHead>
              <TableHead>Expira</TableHead>
              <TableHead>Tamaño</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const metadata = getItemMetadata(table, item.id);
              
              return (
                <TableRow key={item.id}>
                  {columns.map(col => {
                    const key = col.toLowerCase().replace(/\s/g, '_');
                    return (
                      <TableCell key={col}>
                        {col === 'Color' && item.hex_code ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded border" style={{ backgroundColor: item.hex_code }} />
                            {item.name}
                          </div>
                        ) : (
                          item[key] || item.name || item.title || item.code || '-'
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {item.deleted_at ? (
                        <span title={new Date(item.deleted_at).toLocaleString('es-ES')}>
                          {formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true, locale: es })}
                        </span>
                      ) : '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {metadata?.deleted_by ? (
                      <div className="flex items-center gap-1 text-xs">
                        <User className="h-3 w-3" />
                        <span className="text-xs text-muted-foreground">Admin</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {metadata?.expiration_date ? (
                      formatExpirationDate(metadata.expiration_date)
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {metadata?.estimated_size_mb ? (
                      <div className="flex items-center gap-1">
                        <Database className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">
                          {metadata.estimated_size_mb > 1 
                            ? `${metadata.estimated_size_mb.toFixed(1)} MB` 
                            : `${(metadata.estimated_size_mb * 1024).toFixed(0)} KB`
                          }
                        </span>
                        {metadata.estimated_size_mb > 20 && (
                          <Badge variant="destructive" className="text-xs">Grande</Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">&lt; 1 KB</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => requestRestore(table, item.id)}
                        className="h-8"
                        title="Requiere PIN"
                      >
                        <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Restaurar</span>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => requestPermanentDelete(table, item.id)}
                        className="h-8"
                        title="Requiere PIN"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Eliminar</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Cargando elementos eliminados...</div>
      </div>
    );
  }

  const totalDeleted = Object.values(deleted).reduce((acc, arr) => acc + arr.length, 0);

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Papelera de Reciclaje</h1>
          <p className="text-muted-foreground">
            Total de elementos eliminados: {totalDeleted} • Con backup automático
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowConfigDialog(true)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Configurar Retención
        </Button>
      </div>

      <Tabs defaultValue="pages" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 w-full h-auto gap-1">
          <TabsTrigger value="pages" className="text-xs sm:text-sm">
            Páginas ({deleted.pages.length})
          </TabsTrigger>
          <TabsTrigger value="posts" className="text-xs sm:text-sm">
            Blog ({deleted.posts.length})
          </TabsTrigger>
          <TabsTrigger value="products" className="text-xs sm:text-sm">
            Productos ({deleted.products.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="text-xs sm:text-sm">
            Categorías ({deleted.categories.length})
          </TabsTrigger>
          <TabsTrigger value="materials" className="text-xs sm:text-sm">
            Materiales ({deleted.materials.length})
          </TabsTrigger>
          <TabsTrigger value="colors" className="text-xs sm:text-sm">
            Colores ({deleted.colors.length})
          </TabsTrigger>
          <TabsTrigger value="orderStatuses" className="text-xs sm:text-sm">
            Estados Pedido ({deleted.orderStatuses.length})
          </TabsTrigger>
          <TabsTrigger value="quoteStatuses" className="text-xs sm:text-sm">
            Estados Cotiz. ({deleted.quoteStatuses.length})
          </TabsTrigger>
          <TabsTrigger value="coupons" className="text-xs sm:text-sm">
            Cupones ({deleted.coupons.length})
          </TabsTrigger>
          <TabsTrigger value="giftCards" className="text-xs sm:text-sm">
            Tarjetas ({deleted.giftCards.length})
          </TabsTrigger>
          <TabsTrigger value="legalPages" className="text-xs sm:text-sm">
            Legales ({deleted.legalPages.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs sm:text-sm">
            Facturas ({deleted.invoices.length})
          </TabsTrigger>
          <TabsTrigger value="quotes" className="text-xs sm:text-sm">
            Cotizaciones ({deleted.quotes.length})
          </TabsTrigger>
          <TabsTrigger value="orders" className="text-xs sm:text-sm">
            Pedidos ({deleted.orders.length})
          </TabsTrigger>
        </TabsList>

        {[
          { key: 'pages', title: 'Páginas', table: 'pages', columns: ['Título', 'Slug'] },
          { key: 'posts', title: 'Artículos del Blog', table: 'blog_posts', columns: ['Título', 'Slug'] },
          { key: 'products', title: 'Productos', table: 'products', columns: ['Nombre', 'Precio'] },
          { key: 'categories', title: 'Categorías', table: 'categories', columns: ['Nombre', 'Descripción'] },
          { key: 'materials', title: 'Materiales', table: 'materials', columns: ['Nombre', 'Costo'] },
          { key: 'colors', title: 'Colores', table: 'colors', columns: ['Color'] },
          { key: 'orderStatuses', title: 'Estados de Pedido', table: 'order_statuses', columns: ['Nombre'] },
          { key: 'quoteStatuses', title: 'Estados de Cotización', table: 'quote_statuses', columns: ['Nombre'] },
          { key: 'coupons', title: 'Cupones', table: 'coupons', columns: ['Código', 'Descuento'] },
          { key: 'giftCards', title: 'Tarjetas Regalo', table: 'gift_cards', columns: ['Código', 'Balance'] },
          { key: 'legalPages', title: 'Páginas Legales', table: 'legal_pages', columns: ['Título', 'Tipo'] },
          { key: 'invoices', title: 'Facturas', table: 'invoices', columns: ['Número', 'Total'] },
          { key: 'quotes', title: 'Cotizaciones', table: 'quotes', columns: ['Cliente', 'Email'] },
          { key: 'orders', title: 'Pedidos', table: 'orders', columns: ['Número', 'Total'] }
        ].map(({ key, title, table, columns }) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardHeader>
                <CardTitle>{title} Eliminados</CardTitle>
                <CardDescription>
                  Los elementos pueden ser restaurados o eliminados permanentemente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderTable(deleted[key as keyof typeof deleted] as any[], table, columns)}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* PIN Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Confirmación de Seguridad
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.action === 'restore' 
                ? 'Introduce tu PIN de administrador para restaurar este elemento.'
                : 'Introduce tu PIN de administrador para eliminar permanentemente este elemento. Esta acción no se puede deshacer.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN de Administrador</Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Introduce tu PIN"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    executeAction();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Si no tienes un PIN configurado, ve a Mi Cuenta para crearlo.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPinDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant={pendingAction?.action === 'restore' ? 'default' : 'destructive'}
              onClick={executeAction}
              disabled={!pin}
            >
              {pendingAction?.action === 'restore' ? 'Restaurar' : 'Eliminar Permanentemente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configuración Dialog - Se implementará en BackupConfig.tsx */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Configuración de Retención de Backups</DialogTitle>
            <DialogDescription>
              Configura cuánto tiempo se mantienen los elementos eliminados antes de ser borrados permanentemente
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Esta funcionalidad se abrirá en una página dedicada de administración.
              Por ahora, los valores por defecto son:
            </p>
            <ul className="list-disc list-inside mt-2 text-sm space-y-1">
              <li>Archivos pequeños (&lt;20MB): 180 días (6 meses)</li>
              <li>Archivos grandes (&gt;20MB): 8 días</li>
              <li>Limpieza automática: Activada</li>
            </ul>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowConfigDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
