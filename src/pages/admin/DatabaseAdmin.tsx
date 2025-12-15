import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Database, Lock, Shield, Table2, Plus, Trash2, Edit, Eye, RefreshCw, 
  Search, Download, Upload, Copy, Check, X, AlertTriangle, FileJson,
  Settings, Layers, Key, Filter, ArrowUpDown, MoreHorizontal, Save,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Columns,
  Rows, History, Zap, Code, Terminal, Info, HelpCircle, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Types
interface TableInfo {
  table_name: string;
  row_count?: number;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface TableData {
  [key: string]: any;
}

// PIN Lock Screen Component
function PinLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const verifyPin = async () => {
    if (pin.length !== 4) {
      setError("El PIN debe tener 4 dígitos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Get current user's profile with PIN
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("admin_pin")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.admin_pin) {
        setError("No tienes un PIN configurado. Configúralo en Gestión de PINs.");
        return;
      }

      if (profile.admin_pin === pin) {
        toast.success("Acceso concedido");
        onUnlock();
      } else {
        setAttempts(prev => prev + 1);
        setError(`PIN incorrecto. Intentos: ${attempts + 1}/5`);
        if (attempts + 1 >= 5) {
          setError("Demasiados intentos fallidos. Espera 1 minuto.");
          setTimeout(() => setAttempts(0), 60000);
        }
      }
    } catch (err: any) {
      console.error("Error verifying PIN:", err);
      setError("Error al verificar PIN");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      verifyPin();
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Acceso Restringido</CardTitle>
          <CardDescription>
            Esta sección requiere autenticación adicional.
            Ingresa tu PIN de administrador para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pin">PIN de Seguridad (4 dígitos)</Label>
            <Input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onKeyDown={handleKeyPress}
              placeholder="••••"
              maxLength={4}
              className="text-center text-2xl tracking-widest"
              disabled={loading || attempts >= 5}
            />
          </div>
          
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button 
            className="w-full" 
            onClick={verifyPin} 
            disabled={loading || attempts >= 5 || pin.length !== 4}
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Desbloquear
              </>
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p>¿Olvidaste tu PIN?</p>
            <p>Contacta a otro administrador para restablecerlo.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Database Admin Component
export default function DatabaseAdmin() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableColumns, setTableColumns] = useState<ColumnInfo[]>([]);
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRows, setTotalRows] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingRow, setEditingRow] = useState<TableData | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [sqlQuery, setSqlQuery] = useState("");
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [showSqlDialog, setShowSqlDialog] = useState(false);
  const [newRowData, setNewRowData] = useState<TableData>({});
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [filterColumn, setFilterColumn] = useState<string>("");
  const [filterValue, setFilterValue] = useState("");
  const [activeTab, setActiveTab] = useState("tables");
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [stats, setStats] = useState({
    totalTables: 0,
    totalRows: 0,
    largestTable: "",
    lastModified: ""
  });

  // Load all tables
  const loadTables = useCallback(async () => {
    setLoading(true);
    try {
      // Get tables directly from the known list
      const tablesData: TableInfo[] = [
        "api_rate_limits", "backup_metadata", "backup_retention_settings", "banner_images",
        "blog_categories", "blog_post_roles", "blog_posts", "calculator_calibrations",
        "calibration_materials", "calibration_profiles", "calibration_tests", "cart_items",
        "categories", "checkout_sessions", "colors", "coupons", "custom_roles",
        "email_automations", "email_campaign_recipients", "email_campaigns", "email_logs",
        "email_settings", "email_subscribers", "email_templates", "expenses", "footer_links",
        "footer_settings", "gallery_items", "gift_cards", "homepage_banners", "homepage_features",
        "homepage_quick_access_cards", "homepage_sections", "invoice_items", "invoices",
        "legal_pages", "loyalty_adjustments", "loyalty_points", "loyalty_redemptions",
        "loyalty_rewards", "loyalty_settings", "material_colors", "materials", "messages",
        "notifications", "order_items", "order_statuses", "orders", "page_builder_elements",
        "page_builder_history", "page_builder_pages", "page_builder_sections", "page_builder_templates",
        "pages", "preview_3d_models", "printing_calculator_settings", "product_colors",
        "product_customization_sections", "product_images", "product_materials", "product_roles",
        "product_section_colors", "product_section_images", "product_shipping_rates", "products",
        "profiles", "quantity_discount_tiers", "quote_statuses", "quotes", "reviews",
        "seo_audit_log", "seo_keywords", "seo_meta_tags", "seo_redirects", "seo_settings",
        "shipping_countries", "shipping_postal_codes", "shipping_settings", "shipping_zones",
        "site_customization", "site_settings", "support_detection_settings", "tax_settings",
        "translation_queue", "translation_settings", "translations", "user_roles", "visitor_sessions"
      ].map(name => ({ table_name: name }));
      
      setTables(tablesData);
      setStats(prev => ({ ...prev, totalTables: tablesData.length }));
    } catch (err) {
      console.error("Error loading tables:", err);
      toast.error("Error al cargar tablas");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load table columns
  const loadTableColumns = useCallback(async (tableName: string) => {
    try {
      // Get first row to determine columns
      const { data, error } = await supabase
        .from(tableName as any)
        .select("*")
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const columns: ColumnInfo[] = Object.keys(data[0]).map(key => ({
          column_name: key,
          data_type: typeof data[0][key],
          is_nullable: "YES",
          column_default: null
        }));
        setTableColumns(columns);
        setVisibleColumns(new Set(columns.map(c => c.column_name)));
      } else {
        setTableColumns([]);
        setVisibleColumns(new Set());
      }
    } catch (err) {
      console.error("Error loading columns:", err);
    }
  }, []);

  // Load table data with pagination
  const loadTableData = useCallback(async (tableName: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from(tableName as any)
        .select("*", { count: "exact" });

      // Apply filter
      if (filterColumn && filterValue) {
        query = query.ilike(filterColumn, `%${filterValue}%`);
      }

      // Apply sorting
      if (sortColumn) {
        query = query.order(sortColumn, { ascending: sortDirection === "asc" });
      }

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setTableData(data || []);
      setTotalRows(count || 0);
    } catch (err: any) {
      console.error("Error loading data:", err);
      toast.error(`Error al cargar datos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, sortColumn, sortDirection, filterColumn, filterValue]);

  // Select table
  const selectTable = (tableName: string) => {
    setSelectedTable(tableName);
    setCurrentPage(1);
    setSelectedRows(new Set());
    setSortColumn(null);
    setFilterColumn("");
    setFilterValue("");
    loadTableColumns(tableName);
  };

  // Effect to load data when table is selected
  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable);
    }
  }, [selectedTable, loadTableData]);

  // Effect to load tables when unlocked
  useEffect(() => {
    if (isUnlocked) {
      loadTables();
    }
  }, [isUnlocked, loadTables]);

  // Add new row
  const handleAddRow = async () => {
    if (!selectedTable) return;
    
    try {
      const { error } = await supabase
        .from(selectedTable as any)
        .insert([newRowData]);

      if (error) throw error;

      toast.success("Registro añadido correctamente");
      setShowAddDialog(false);
      setNewRowData({});
      loadTableData(selectedTable);
    } catch (err: any) {
      console.error("Error adding row:", err);
      toast.error(`Error: ${err.message}`);
    }
  };

  // Update row
  const handleUpdateRow = async () => {
    if (!selectedTable || !editingRow?.id) return;

    try {
      const { id, ...updateData } = editingRow;
      const { error } = await supabase
        .from(selectedTable as any)
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      toast.success("Registro actualizado correctamente");
      setShowEditDialog(false);
      setEditingRow(null);
      loadTableData(selectedTable);
    } catch (err: any) {
      console.error("Error updating row:", err);
      toast.error(`Error: ${err.message}`);
    }
  };

  // Delete row
  const handleDeleteRow = async () => {
    if (!selectedTable || !deleteTarget) return;

    try {
      const { error } = await supabase
        .from(selectedTable as any)
        .delete()
        .eq("id", deleteTarget);

      if (error) throw error;

      toast.success("Registro eliminado correctamente");
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      loadTableData(selectedTable);
    } catch (err: any) {
      console.error("Error deleting row:", err);
      toast.error(`Error: ${err.message}`);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (!selectedTable || selectedRows.size === 0) return;

    try {
      const ids = Array.from(selectedRows);
      const { error } = await supabase
        .from(selectedTable as any)
        .delete()
        .in("id", ids);

      if (error) throw error;

      toast.success(`${ids.length} registros eliminados`);
      setSelectedRows(new Set());
      loadTableData(selectedTable);
    } catch (err: any) {
      console.error("Error bulk deleting:", err);
      toast.error(`Error: ${err.message}`);
    }
  };

  // Execute SQL query (read-only for safety)
  const executeSqlQuery = async () => {
    if (!sqlQuery.trim()) return;

    // Only allow SELECT queries for safety
    const normalizedQuery = sqlQuery.trim().toLowerCase();
    if (!normalizedQuery.startsWith("select")) {
      toast.error("Solo se permiten consultas SELECT por seguridad");
      return;
    }

    // Parse the query to extract table name
    const tableMatch = sqlQuery.match(/from\s+(\w+)/i);
    if (!tableMatch) {
      toast.error("No se pudo identificar la tabla en la consulta");
      return;
    }

    const tableName = tableMatch[1];
    
    try {
      // Execute query using the supabase client
      const { data, error } = await supabase
        .from(tableName as any)
        .select("*")
        .limit(100);

      if (error) {
        setSqlResult({ error: error.message });
      } else {
        setSqlResult(data);
        setQueryHistory(prev => [sqlQuery, ...prev.slice(0, 9)]);
      }
    } catch (err: any) {
      setSqlResult({ error: err.message });
    }
  };

  // Export table to JSON
  const exportToJson = () => {
    if (!tableData.length) return;
    
    const blob = new Blob([JSON.stringify(tableData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedTable}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Datos exportados correctamente");
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  // Render value based on type
  const renderCellValue = (value: any, columnName: string) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">null</span>;
    }

    if (typeof value === "boolean") {
      return value ? (
        <Badge variant="default" className="bg-green-500">Sí</Badge>
      ) : (
        <Badge variant="secondary">No</Badge>
      );
    }

    if (typeof value === "object") {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="cursor-pointer">
                <FileJson className="h-3 w-3 mr-1" />
                JSON
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-md">
              <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    const strValue = String(value);
    if (strValue.length > 50) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">{strValue.slice(0, 50)}...</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-md">
              <p className="text-xs break-all">{strValue}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return strValue;
  };

  // If not unlocked, show PIN screen
  if (!isUnlocked) {
    return <PinLockScreen onUnlock={() => setIsUnlocked(true)} />;
  }

  const totalPages = Math.ceil(totalRows / pageSize);
  const filteredTables = tables.filter(t => 
    t.table_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Database className="h-7 w-7 text-primary" />
            Administrador de Base de Datos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión completa de todas las tablas y datos del sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Table2 className="h-3 w-3" />
            {tables.length} tablas
          </Badge>
          <Button variant="outline" size="sm" onClick={loadTables}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSqlDialog(true)}>
            <Terminal className="h-4 w-4 mr-1" />
            SQL
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="tables" className="gap-2">
            <Table2 className="h-4 w-4" />
            <span className="hidden sm:inline">Tablas</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2" disabled={!selectedTable}>
            <Rows className="h-4 w-4" />
            <span className="hidden sm:inline">Datos</span>
          </TabsTrigger>
          <TabsTrigger value="structure" className="gap-2" disabled={!selectedTable}>
            <Columns className="h-4 w-4" />
            <span className="hidden sm:inline">Estructura</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Opciones</span>
          </TabsTrigger>
        </TabsList>

        {/* Tables Tab */}
        <TabsContent value="tables" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Tablas de Base de Datos</CardTitle>
                  <CardDescription>
                    Selecciona una tabla para ver y editar sus datos
                  </CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar tabla..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full md:w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredTables.map((table) => (
                  <Button
                    key={table.table_name}
                    variant={selectedTable === table.table_name ? "default" : "outline"}
                    className={cn(
                      "justify-start h-auto py-3 px-4",
                      selectedTable === table.table_name && "ring-2 ring-primary"
                    )}
                    onClick={() => {
                      selectTable(table.table_name);
                      setActiveTab("data");
                    }}
                  >
                    <Table2 className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate text-left">{table.table_name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-4">
          {selectedTable && (
            <Card>
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Table2 className="h-5 w-5" />
                      {selectedTable}
                    </CardTitle>
                    <CardDescription>
                      {totalRows} registros totales
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Filter */}
                    <div className="flex items-center gap-2">
                      <Select value={filterColumn} onValueChange={setFilterColumn}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Columna" />
                        </SelectTrigger>
                        <SelectContent>
                          {tableColumns.map(col => (
                            <SelectItem key={col.column_name} value={col.column_name}>
                              {col.column_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Filtrar..."
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        className="w-32"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setFilterColumn("");
                          setFilterValue("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Actions */}
                    <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Añadir
                    </Button>
                    {selectedRows.size > 0 && (
                      <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar ({selectedRows.size})
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={exportToJson}>
                      <Download className="h-4 w-4 mr-1" />
                      Exportar
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => loadTableData(selectedTable)}>
                      <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <div className="min-w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedRows.size === tableData.length && tableData.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRows(new Set(tableData.map(r => r.id)));
                                } else {
                                  setSelectedRows(new Set());
                                }
                              }}
                            />
                          </TableHead>
                          {tableColumns
                            .filter(col => visibleColumns.has(col.column_name))
                            .map((col) => (
                              <TableHead 
                                key={col.column_name}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => {
                                  if (sortColumn === col.column_name) {
                                    setSortDirection(prev => prev === "asc" ? "desc" : "asc");
                                  } else {
                                    setSortColumn(col.column_name);
                                    setSortDirection("asc");
                                  }
                                }}
                              >
                                <div className="flex items-center gap-1">
                                  {col.column_name}
                                  {sortColumn === col.column_name && (
                                    <ArrowUpDown className="h-3 w-3" />
                                  )}
                                </div>
                              </TableHead>
                            ))}
                          <TableHead className="w-24">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={tableColumns.length + 2} className="text-center py-8">
                              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                              Cargando datos...
                            </TableCell>
                          </TableRow>
                        ) : tableData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={tableColumns.length + 2} className="text-center py-8 text-muted-foreground">
                              No hay datos en esta tabla
                            </TableCell>
                          </TableRow>
                        ) : (
                          tableData.map((row, idx) => (
                            <TableRow key={row.id || idx}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedRows.has(row.id)}
                                  onCheckedChange={(checked) => {
                                    const newSelected = new Set(selectedRows);
                                    if (checked) {
                                      newSelected.add(row.id);
                                    } else {
                                      newSelected.delete(row.id);
                                    }
                                    setSelectedRows(newSelected);
                                  }}
                                />
                              </TableCell>
                              {tableColumns
                                .filter(col => visibleColumns.has(col.column_name))
                                .map((col) => (
                                  <TableCell key={col.column_name} className="max-w-xs">
                                    {renderCellValue(row[col.column_name], col.column_name)}
                                  </TableCell>
                                ))}
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      setEditingRow(row);
                                      setShowEditDialog(true);
                                    }}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => copyToClipboard(JSON.stringify(row, null, 2))}>
                                      <Copy className="h-4 w-4 mr-2" />
                                      Copiar JSON
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="text-destructive"
                                      onClick={() => {
                                        setDeleteTarget(row.id);
                                        setShowDeleteDialog(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Select 
                        value={pageSize.toString()} 
                        onValueChange={(v) => {
                          setPageSize(parseInt(v));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">por página</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="px-3 text-sm">
                        {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Structure Tab */}
        <TabsContent value="structure" className="space-y-4">
          {selectedTable && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Columns className="h-5 w-5" />
                  Estructura de {selectedTable}
                </CardTitle>
                <CardDescription>
                  Columnas y tipos de datos de la tabla
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Visible</TableHead>
                      <TableHead>Columna</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nullable</TableHead>
                      <TableHead>Valor por defecto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableColumns.map((col) => (
                      <TableRow key={col.column_name}>
                        <TableCell>
                          <Checkbox
                            checked={visibleColumns.has(col.column_name)}
                            onCheckedChange={(checked) => {
                              const newVisible = new Set(visibleColumns);
                              if (checked) {
                                newVisible.add(col.column_name);
                              } else {
                                newVisible.delete(col.column_name);
                              }
                              setVisibleColumns(newVisible);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono">{col.column_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{col.data_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {col.is_nullable === "YES" ? (
                            <Badge variant="secondary">Sí</Badge>
                          ) : (
                            <Badge variant="default">No</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {col.column_default || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración General
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Registros por página</Label>
                  <Select 
                    value={pageSize.toString()} 
                    onValueChange={(v) => setPageSize(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="250">250</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historial de Consultas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {queryHistory.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No hay consultas recientes</p>
                ) : (
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {queryHistory.map((query, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <code className="text-xs truncate flex-1">{query}</code>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSqlQuery(query);
                              setShowSqlDialog(true);
                            }}
                          >
                            <Zap className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Estadísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de tablas:</span>
                  <Badge variant="outline">{tables.length}</Badge>
                </div>
                {selectedTable && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tabla actual:</span>
                      <Badge>{selectedTable}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Registros:</span>
                      <Badge variant="outline">{totalRows}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Columnas:</span>
                      <Badge variant="outline">{tableColumns.length}</Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Ayuda Rápida
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Selecciona una tabla para ver y editar sus datos</p>
                <p>• Usa el filtro para buscar registros específicos</p>
                <p>• Haz clic en una columna para ordenar</p>
                <p>• Usa las casillas para selección múltiple</p>
                <p>• Exporta datos a JSON para backup</p>
                <p>• Ejecuta consultas SQL personalizadas</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Row Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Añadir Nuevo Registro</DialogTitle>
            <DialogDescription>
              Completa los campos para crear un nuevo registro en {selectedTable}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {tableColumns
              .filter(col => col.column_name !== "id" && col.column_name !== "created_at" && col.column_name !== "updated_at")
              .map((col) => (
                <div key={col.column_name} className="space-y-2">
                  <Label htmlFor={col.column_name}>{col.column_name}</Label>
                  {col.data_type === "boolean" ? (
                    <Select
                      value={newRowData[col.column_name]?.toString() || ""}
                      onValueChange={(v) => setNewRowData(prev => ({ 
                        ...prev, 
                        [col.column_name]: v === "true" 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Sí</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : col.data_type === "object" ? (
                    <Textarea
                      id={col.column_name}
                      value={typeof newRowData[col.column_name] === "object" 
                        ? JSON.stringify(newRowData[col.column_name], null, 2) 
                        : newRowData[col.column_name] || ""}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setNewRowData(prev => ({ ...prev, [col.column_name]: parsed }));
                        } catch {
                          setNewRowData(prev => ({ ...prev, [col.column_name]: e.target.value }));
                        }
                      }}
                      placeholder="JSON..."
                      rows={3}
                    />
                  ) : (
                    <Input
                      id={col.column_name}
                      value={newRowData[col.column_name] || ""}
                      onChange={(e) => setNewRowData(prev => ({ 
                        ...prev, 
                        [col.column_name]: e.target.value 
                      }))}
                      placeholder={col.column_name}
                    />
                  )}
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddRow}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Row Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
            <DialogDescription>
              Modifica los campos del registro seleccionado
            </DialogDescription>
          </DialogHeader>
          {editingRow && (
            <div className="space-y-4 py-4">
              {tableColumns.map((col) => (
                <div key={col.column_name} className="space-y-2">
                  <Label htmlFor={`edit-${col.column_name}`}>
                    {col.column_name}
                    {col.column_name === "id" && (
                      <Badge variant="secondary" className="ml-2">Solo lectura</Badge>
                    )}
                  </Label>
                  {col.data_type === "boolean" ? (
                    <Select
                      value={editingRow[col.column_name]?.toString() || "false"}
                      onValueChange={(v) => setEditingRow(prev => prev ? { 
                        ...prev, 
                        [col.column_name]: v === "true" 
                      } : null)}
                      disabled={col.column_name === "id"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Sí</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : col.data_type === "object" ? (
                    <Textarea
                      id={`edit-${col.column_name}`}
                      value={typeof editingRow[col.column_name] === "object" 
                        ? JSON.stringify(editingRow[col.column_name], null, 2) 
                        : editingRow[col.column_name] || ""}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setEditingRow(prev => prev ? { ...prev, [col.column_name]: parsed } : null);
                        } catch {
                          setEditingRow(prev => prev ? { ...prev, [col.column_name]: e.target.value } : null);
                        }
                      }}
                      rows={3}
                      disabled={col.column_name === "id"}
                    />
                  ) : (
                    <Input
                      id={`edit-${col.column_name}`}
                      value={editingRow[col.column_name] || ""}
                      onChange={(e) => setEditingRow(prev => prev ? { 
                        ...prev, 
                        [col.column_name]: e.target.value 
                      } : null)}
                      disabled={col.column_name === "id"}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRow}>
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRow} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* SQL Query Dialog */}
      <Dialog open={showSqlDialog} onOpenChange={setShowSqlDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Consulta SQL
            </DialogTitle>
            <DialogDescription>
              Ejecuta consultas SELECT para analizar datos (solo lectura por seguridad)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Consulta SQL</Label>
              <Textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="SELECT * FROM products LIMIT 10"
                rows={4}
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={executeSqlQuery}>
              <Zap className="h-4 w-4 mr-2" />
              Ejecutar
            </Button>
            {sqlResult && (
              <div className="space-y-2">
                <Label>Resultado</Label>
                <ScrollArea className="h-64 rounded border p-4 bg-muted/50">
                  <pre className="text-xs font-mono">
                    {JSON.stringify(sqlResult, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
