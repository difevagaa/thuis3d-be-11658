import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Package, ArrowUpDown, Factory, BarChart3, Plus, Edit, Trash2, AlertTriangle, Search, TrendingUp, TrendingDown, Euro } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { logger } from "@/lib/logger";

type InventoryItem = {
  id: string;
  name: string;
  type: string;
  category: string | null;
  material_id: string | null;
  color_id: string | null;
  sku: string | null;
  brand: string | null;
  quantity_in_stock: number;
  unit: string;
  min_stock_alert: number;
  cost_per_unit: number;
  supplier: string | null;
  location: string | null;
  notes: string | null;
  image_url: string | null;
  is_active: boolean;
  weight_per_spool: number | null;
  diameter: number | null;
  print_temp_min: number | null;
  print_temp_max: number | null;
  bed_temp_min: number | null;
  bed_temp_max: number | null;
  created_at: string;
  updated_at: string;
};

type Movement = {
  id: string;
  inventory_item_id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  cost_per_unit: number;
  total_cost: number;
  order_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

type ProductionLog = {
  id: string;
  order_id: string | null;
  inventory_item_id: string | null;
  filament_used_g: number;
  print_time_minutes: number;
  energy_cost: number;
  labor_cost: number;
  other_costs: number;
  sale_price: number;
  total_cost: number;
  profit: number;
  profit_margin_pct: number;
  notes: string | null;
  auto_calculated: boolean;
  manually_adjusted: boolean;
  created_at: string;
};

const emptyItem: Partial<InventoryItem> = {
  name: "", type: "filament", category: "", sku: "", brand: "",
  quantity_in_stock: 0, unit: "g", min_stock_alert: 0, cost_per_unit: 0,
  supplier: "", location: "", notes: "", image_url: "", is_active: true,
  weight_per_spool: null, diameter: null, print_temp_min: null, print_temp_max: null,
  bed_temp_min: null, bed_temp_max: null
};

// Helper for numeric inputs that allows clearing
const numVal = (v: number | null | undefined): string => (v === null || v === undefined) ? '' : String(v);
const parseNum = (v: string): number | null => v === '' ? null : Number(v);
const parseNumDef = (v: string, def: number = 0): number => v === '' ? def : Number(v);

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [showProductionDialog, setShowProductionDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<InventoryItem>>(emptyItem);
  const [isEditing, setIsEditing] = useState(false);
  const [movementForm, setMovementForm] = useState({ inventory_item_id: "", movement_type: "purchase", quantity: 0, cost_per_unit: 0, notes: "" });
  const [productionForm, setProductionForm] = useState({ inventory_item_id: "", filament_used_g: 0, print_time_minutes: 0, energy_cost: 0, labor_cost: 0, other_costs: 0, sale_price: 0, notes: "" });
  const [movFilterType, setMovFilterType] = useState("all");

  const loadData = useCallback(async () => {
    try {
      const [itemsRes, movRes, prodRes] = await Promise.all([
        supabase.from("inventory_items").select("*").order("created_at", { ascending: false }),
        supabase.from("inventory_movements").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("inventory_production_logs").select("*").order("created_at", { ascending: false }).limit(200),
      ]);
      if (itemsRes.data) setItems(itemsRes.data as any);
      if (movRes.data) setMovements(movRes.data as any);
      if (prodRes.data) setProductionLogs(prodRes.data as any);
    } catch (e) {
      logger.error("Error loading inventory:", e);
      toast.error("Error al cargar inventario");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel("inventory-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_movements" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_production_logs" }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  // ===== ITEMS CRUD =====
  const handleSaveItem = async () => {
    if (!editingItem.name) { toast.error("El nombre es obligatorio"); return; }
    try {
      if (isEditing && editingItem.id) {
        const { error } = await supabase.from("inventory_items").update({
          name: editingItem.name, type: editingItem.type, category: editingItem.category || null,
          sku: editingItem.sku || null, brand: editingItem.brand || null,
          quantity_in_stock: editingItem.quantity_in_stock ?? 0, unit: editingItem.unit ?? "g",
          min_stock_alert: editingItem.min_stock_alert ?? 0, cost_per_unit: editingItem.cost_per_unit ?? 0,
          supplier: editingItem.supplier || null, location: editingItem.location || null,
          notes: editingItem.notes || null, image_url: editingItem.image_url || null,
          is_active: editingItem.is_active ?? true, weight_per_spool: editingItem.weight_per_spool,
          diameter: editingItem.diameter, print_temp_min: editingItem.print_temp_min,
          print_temp_max: editingItem.print_temp_max, bed_temp_min: editingItem.bed_temp_min,
          bed_temp_max: editingItem.bed_temp_max,
        } as any).eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Item actualizado");
      } else {
        const { error } = await supabase.from("inventory_items").insert({
          name: editingItem.name, type: editingItem.type || "filament", category: editingItem.category || null,
          sku: editingItem.sku || null, brand: editingItem.brand || null,
          quantity_in_stock: editingItem.quantity_in_stock ?? 0, unit: editingItem.unit ?? "g",
          min_stock_alert: editingItem.min_stock_alert ?? 0, cost_per_unit: editingItem.cost_per_unit ?? 0,
          supplier: editingItem.supplier || null, location: editingItem.location || null,
          notes: editingItem.notes || null, image_url: editingItem.image_url || null,
          is_active: editingItem.is_active ?? true, weight_per_spool: editingItem.weight_per_spool,
          diameter: editingItem.diameter, print_temp_min: editingItem.print_temp_min,
          print_temp_max: editingItem.print_temp_max, bed_temp_min: editingItem.bed_temp_min,
          bed_temp_max: editingItem.bed_temp_max,
        } as any);
        if (error) throw error;
        toast.success("Item creado");
      }
      setShowItemDialog(false);
      setEditingItem(emptyItem);
      setIsEditing(false);
    } catch (e: any) {
      logger.error("Error saving item:", e);
      toast.error("Error: " + (e.message || "No se pudo guardar"));
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("¿Eliminar este item del inventario?")) return;
    const { error } = await supabase.from("inventory_items").delete().eq("id", id);
    if (error) { toast.error("Error al eliminar"); return; }
    toast.success("Item eliminado");
  };

  // ===== MOVEMENTS =====
  const handleSaveMovement = async () => {
    if (!movementForm.inventory_item_id) { toast.error("Selecciona un item"); return; }
    const item = items.find(i => i.id === movementForm.inventory_item_id);
    if (!item) return;
    const prevStock = item.quantity_in_stock;
    const qty = movementForm.movement_type === "purchase" || movementForm.movement_type === "return" 
      ? Math.abs(movementForm.quantity) 
      : -Math.abs(movementForm.quantity);
    const newStock = prevStock + qty;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: movError } = await supabase.from("inventory_movements").insert({
        inventory_item_id: movementForm.inventory_item_id,
        movement_type: movementForm.movement_type,
        quantity: qty,
        previous_stock: prevStock,
        new_stock: newStock,
        cost_per_unit: movementForm.cost_per_unit,
        total_cost: Math.abs(qty) * movementForm.cost_per_unit,
        notes: movementForm.notes || null,
        created_by: user?.id || null,
      } as any);
      if (movError) throw movError;

      const { error: updateError } = await supabase.from("inventory_items")
        .update({ quantity_in_stock: newStock, cost_per_unit: movementForm.cost_per_unit || item.cost_per_unit } as any)
        .eq("id", item.id);
      if (updateError) throw updateError;

      toast.success("Movimiento registrado");
      setShowMovementDialog(false);
      setMovementForm({ inventory_item_id: "", movement_type: "purchase", quantity: 0, cost_per_unit: 0, notes: "" });
    } catch (e: any) {
      toast.error("Error: " + (e.message || "No se pudo registrar"));
    }
  };

  // ===== PRODUCTION LOG =====
  const handleSaveProduction = async () => {
    if (!productionForm.inventory_item_id) { toast.error("Selecciona filamento"); return; }
    const filamentItem = items.find(i => i.id === productionForm.inventory_item_id);
    const filamentCost = (productionForm.filament_used_g / (filamentItem?.weight_per_spool || 1000)) * (filamentItem?.cost_per_unit || 0);
    const totalCost = filamentCost + productionForm.energy_cost + productionForm.labor_cost + productionForm.other_costs;
    const profit = productionForm.sale_price - totalCost;
    const marginPct = productionForm.sale_price > 0 ? (profit / productionForm.sale_price) * 100 : 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("inventory_production_logs").insert({
        inventory_item_id: productionForm.inventory_item_id,
        filament_used_g: productionForm.filament_used_g,
        print_time_minutes: productionForm.print_time_minutes,
        energy_cost: productionForm.energy_cost,
        labor_cost: productionForm.labor_cost,
        other_costs: productionForm.other_costs,
        sale_price: productionForm.sale_price,
        total_cost: totalCost,
        profit,
        profit_margin_pct: marginPct,
        manually_adjusted: true,
        created_by: user?.id || null,
      } as any);
      if (error) throw error;

      // Deduct filament from inventory
      if (filamentItem && productionForm.filament_used_g > 0) {
        const newStock = filamentItem.quantity_in_stock - productionForm.filament_used_g;
        await supabase.from("inventory_items").update({ quantity_in_stock: Math.max(0, newStock) } as any).eq("id", filamentItem.id);
        await supabase.from("inventory_movements").insert({
          inventory_item_id: filamentItem.id,
          movement_type: "order_deduction",
          quantity: -productionForm.filament_used_g,
          previous_stock: filamentItem.quantity_in_stock,
          new_stock: Math.max(0, newStock),
          cost_per_unit: filamentItem.cost_per_unit,
          total_cost: (productionForm.filament_used_g / (filamentItem.weight_per_spool || 1000)) * filamentItem.cost_per_unit,
          notes: "Deducción por producción",
          created_by: user?.id || null,
        } as any);
      }

      toast.success("Producción registrada");
      setShowProductionDialog(false);
      setProductionForm({ inventory_item_id: "", filament_used_g: 0, print_time_minutes: 0, energy_cost: 0, labor_cost: 0, other_costs: 0, sale_price: 0, notes: "" });
    } catch (e: any) {
      toast.error("Error: " + (e.message || "No se pudo registrar"));
    }
  };

  // Filters
  const filteredItems = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (item.sku || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.brand || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === "all" || item.type === filterType;
    return matchSearch && matchType;
  });

  const filteredMovements = movements.filter(m => movFilterType === "all" || m.movement_type === movFilterType);

  // Dashboard stats
  const totalInventoryValue = items.reduce((sum, i) => sum + (i.quantity_in_stock * i.cost_per_unit), 0);
  const lowStockItems = items.filter(i => i.is_active && i.quantity_in_stock <= i.min_stock_alert);
  const avgMargin = productionLogs.length > 0 ? productionLogs.reduce((s, p) => s + p.profit_margin_pct, 0) / productionLogs.length : 0;
  const totalRevenue = productionLogs.reduce((s, p) => s + p.sale_price, 0);
  const totalCosts = productionLogs.reduce((s, p) => s + p.total_cost, 0);

  const stockLevel = (item: InventoryItem) => {
    if (item.quantity_in_stock <= 0) return "bg-destructive/20 text-destructive";
    if (item.quantity_in_stock <= item.min_stock_alert) return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  };

  const stockBadge = (item: InventoryItem) => {
    if (item.quantity_in_stock <= 0) return "Sin stock";
    if (item.quantity_in_stock <= item.min_stock_alert) return "Stock bajo";
    return "OK";
  };

  const typeLabel: Record<string, string> = { filament: "Filamento", part: "Pieza", accessory: "Accesorio", consumable: "Consumible" };
  const movTypeLabel: Record<string, string> = { purchase: "Compra", sale: "Venta", adjustment: "Ajuste", order_deduction: "Pedido", return: "Devolución", waste: "Desperdicio" };

  if (loading) return <div className="container mx-auto p-4">Cargando inventario...</div>;

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Inventario</h1>

      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="items" className="text-xs sm:text-sm flex items-center gap-1"><Package className="h-3.5 w-3.5 hidden sm:block" /> Items</TabsTrigger>
          <TabsTrigger value="movements" className="text-xs sm:text-sm flex items-center gap-1"><ArrowUpDown className="h-3.5 w-3.5 hidden sm:block" /> Movimientos</TabsTrigger>
          <TabsTrigger value="production" className="text-xs sm:text-sm flex items-center gap-1"><Factory className="h-3.5 w-3.5 hidden sm:block" /> Producción</TabsTrigger>
          <TabsTrigger value="summary" className="text-xs sm:text-sm flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5 hidden sm:block" /> Resumen</TabsTrigger>
        </TabsList>

        {/* TAB 1: ITEMS */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nombre, SKU, marca..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="filament">Filamento</SelectItem>
                <SelectItem value="part">Pieza</SelectItem>
                <SelectItem value="accessory">Accesorio</SelectItem>
                <SelectItem value="consumable">Consumible</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => { setEditingItem(emptyItem); setIsEditing(false); setShowItemDialog(true); }} className="gap-1">
              <Plus className="h-4 w-4" /> Nuevo
            </Button>
          </div>

          {lowStockItems.length > 0 && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="p-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span className="text-sm text-amber-800 font-medium">{lowStockItems.length} item(s) con stock bajo o agotado</span>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3">
            {filteredItems.map(item => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  {item.image_url && <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{item.name}</h3>
                      <Badge variant="outline" className="text-[10px]">{typeLabel[item.type] || item.type}</Badge>
                      {item.category && <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {item.sku && <span>SKU: {item.sku}</span>}
                      {item.brand && <span>Marca: {item.brand}</span>}
                      {item.supplier && <span>Prov: {item.supplier}</span>}
                      <span>€{item.cost_per_unit}/{item.unit}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`${stockLevel(item)} text-xs`}>
                      {numVal(item.quantity_in_stock)} {item.unit} - {stockBadge(item)}
                    </Badge>
                    <Button size="icon" variant="ghost" onClick={() => { setEditingItem(item); setIsEditing(true); setShowItemDialog(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredItems.length === 0 && <p className="text-center text-muted-foreground py-8">No hay items en el inventario</p>}
          </div>
        </TabsContent>

        {/* TAB 2: MOVEMENTS */}
        <TabsContent value="movements" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={movFilterType} onValueChange={setMovFilterType}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="purchase">Compras</SelectItem>
                <SelectItem value="sale">Ventas</SelectItem>
                <SelectItem value="adjustment">Ajustes</SelectItem>
                <SelectItem value="order_deduction">Pedidos</SelectItem>
                <SelectItem value="return">Devoluciones</SelectItem>
                <SelectItem value="waste">Desperdicio</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowMovementDialog(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Registrar Movimiento
            </Button>
          </div>

          <div className="space-y-2">
            {filteredMovements.map(mov => {
              const item = items.find(i => i.id === mov.inventory_item_id);
              return (
                <Card key={mov.id}>
                  <CardContent className="p-3 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{item?.name || "Item eliminado"}</span>
                        <Badge variant={mov.quantity > 0 ? "default" : "destructive"} className="text-[10px]">
                          {movTypeLabel[mov.movement_type] || mov.movement_type}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {mov.previous_stock} → {mov.new_stock} ({mov.quantity > 0 ? "+" : ""}{mov.quantity}) · €{mov.total_cost.toFixed(2)}
                        {mov.notes && <span className="ml-2">· {mov.notes}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(mov.created_at).toLocaleDateString("es-ES")}</span>
                  </CardContent>
                </Card>
              );
            })}
            {filteredMovements.length === 0 && <p className="text-center text-muted-foreground py-8">No hay movimientos registrados</p>}
          </div>
        </TabsContent>

        {/* TAB 3: PRODUCTION */}
        <TabsContent value="production" className="space-y-4">
          <Button onClick={() => setShowProductionDialog(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Registrar Producción
          </Button>

          <div className="space-y-2">
            {productionLogs.map(log => {
              const item = items.find(i => i.id === log.inventory_item_id);
              return (
                <Card key={log.id}>
                  <CardContent className="p-3">
                    <div className="flex flex-col sm:flex-row justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{item?.name || "—"}</span>
                          <Badge variant="outline" className="text-[10px]">{log.filament_used_g}g · {log.print_time_minutes}min</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Costo: €{log.total_cost.toFixed(2)} · Venta: €{log.sale_price.toFixed(2)} · 
                          <span className={log.profit >= 0 ? " text-emerald-600 font-medium" : " text-destructive font-medium"}>
                            {" "}Ganancia: €{log.profit.toFixed(2)} ({log.profit_margin_pct.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleDateString("es-ES")}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {productionLogs.length === 0 && <p className="text-center text-muted-foreground py-8">No hay registros de producción</p>}
          </div>
        </TabsContent>

        {/* TAB 4: SUMMARY */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">Valor Inventario</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-primary">€{totalInventoryValue.toFixed(2)}</p></CardContent>
            </Card>
            <Card className={`bg-gradient-to-br ${lowStockItems.length > 0 ? "from-amber-100 to-amber-50 border-amber-300" : "from-emerald-100 to-emerald-50 border-emerald-300"}`}>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">Stock Bajo</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0"><p className={`text-2xl font-bold ${lowStockItems.length > 0 ? "text-amber-700" : "text-emerald-700"}`}>{lowStockItems.length}</p></CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-100 to-emerald-50 border-emerald-300">
              <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">Margen Promedio</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-emerald-700">{avgMargin.toFixed(1)}%</p></CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-100 to-blue-50 border-blue-300">
              <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">Ingresos Producción</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-blue-700">€{totalRevenue.toFixed(2)}</p></CardContent>
            </Card>
          </div>

          {lowStockItems.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Items con Stock Bajo</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lowStockItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-2 rounded bg-amber-50 border border-amber-200">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm text-amber-700">{item.quantity_in_stock} / {item.min_stock_alert} {item.unit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {productionLogs.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Ingresos vs Costos de Producción</CardTitle></CardHeader>
              <CardContent>
                <div className="flex justify-around p-4 rounded-lg bg-muted/30">
                  <div className="text-center">
                    <TrendingUp className="h-6 w-6 mx-auto text-emerald-600 mb-1" />
                    <p className="text-lg font-bold text-emerald-600">€{totalRevenue.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Ingresos</p>
                  </div>
                  <div className="text-center">
                    <TrendingDown className="h-6 w-6 mx-auto text-destructive mb-1" />
                    <p className="text-lg font-bold text-destructive">€{totalCosts.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Costos</p>
                  </div>
                  <div className="text-center">
                    <Euro className="h-6 w-6 mx-auto text-primary mb-1" />
                    <p className={`text-lg font-bold ${totalRevenue - totalCosts >= 0 ? "text-emerald-600" : "text-destructive"}`}>€{(totalRevenue - totalCosts).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Ganancia</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ITEM DIALOG */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Item" : "Nuevo Item"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Nombre *</Label><Input value={editingItem.name || ''} onChange={e => setEditingItem({...editingItem, name: e.target.value})} /></div>
            <div><Label className="text-xs">Tipo</Label>
              <Select value={editingItem.type || 'filament'} onValueChange={v => setEditingItem({...editingItem, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="filament">Filamento</SelectItem>
                  <SelectItem value="part">Pieza</SelectItem>
                  <SelectItem value="accessory">Accesorio</SelectItem>
                  <SelectItem value="consumable">Consumible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Categoría</Label><Input value={editingItem.category || ''} onChange={e => setEditingItem({...editingItem, category: e.target.value})} placeholder="Ej: Colgantes, Bombillas" /></div>
            <div><Label className="text-xs">SKU</Label><Input value={editingItem.sku || ''} onChange={e => setEditingItem({...editingItem, sku: e.target.value})} /></div>
            <div><Label className="text-xs">Marca</Label><Input value={editingItem.brand || ''} onChange={e => setEditingItem({...editingItem, brand: e.target.value})} /></div>
            <div><Label className="text-xs">Proveedor</Label><Input value={editingItem.supplier || ''} onChange={e => setEditingItem({...editingItem, supplier: e.target.value})} /></div>
            <div><Label className="text-xs">Stock</Label><Input type="number" value={numVal(editingItem.quantity_in_stock)} onChange={e => setEditingItem({...editingItem, quantity_in_stock: parseNumDef(e.target.value)})} /></div>
            <div><Label className="text-xs">Unidad</Label>
              <Select value={editingItem.unit || 'g'} onValueChange={v => setEditingItem({...editingItem, unit: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="g">Gramos (g)</SelectItem>
                  <SelectItem value="kg">Kilogramos (kg)</SelectItem>
                  <SelectItem value="m">Metros (m)</SelectItem>
                  <SelectItem value="units">Unidades</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Alerta stock mínimo</Label><Input type="number" value={numVal(editingItem.min_stock_alert)} onChange={e => setEditingItem({...editingItem, min_stock_alert: parseNumDef(e.target.value)})} /></div>
            <div><Label className="text-xs">Costo por unidad (€)</Label><Input type="number" step="0.01" value={numVal(editingItem.cost_per_unit)} onChange={e => setEditingItem({...editingItem, cost_per_unit: parseNumDef(e.target.value)})} /></div>
            <div><Label className="text-xs">Ubicación</Label><Input value={editingItem.location || ''} onChange={e => setEditingItem({...editingItem, location: e.target.value})} /></div>
            <div><Label className="text-xs">URL Imagen</Label><Input value={editingItem.image_url || ''} onChange={e => setEditingItem({...editingItem, image_url: e.target.value})} /></div>
            
            {editingItem.type === "filament" && (
              <>
                <div><Label className="text-xs">Peso bobina (g)</Label><Input type="number" value={numVal(editingItem.weight_per_spool)} onChange={e => setEditingItem({...editingItem, weight_per_spool: parseNum(e.target.value)})} /></div>
                <div><Label className="text-xs">Diámetro (mm)</Label><Input type="number" step="0.01" value={numVal(editingItem.diameter)} onChange={e => setEditingItem({...editingItem, diameter: parseNum(e.target.value)})} /></div>
                <div><Label className="text-xs">Temp. impresión mín</Label><Input type="number" value={numVal(editingItem.print_temp_min)} onChange={e => setEditingItem({...editingItem, print_temp_min: parseNum(e.target.value) as any})} /></div>
                <div><Label className="text-xs">Temp. impresión máx</Label><Input type="number" value={numVal(editingItem.print_temp_max)} onChange={e => setEditingItem({...editingItem, print_temp_max: parseNum(e.target.value) as any})} /></div>
                <div><Label className="text-xs">Temp. cama mín</Label><Input type="number" value={numVal(editingItem.bed_temp_min)} onChange={e => setEditingItem({...editingItem, bed_temp_min: parseNum(e.target.value) as any})} /></div>
                <div><Label className="text-xs">Temp. cama máx</Label><Input type="number" value={numVal(editingItem.bed_temp_max)} onChange={e => setEditingItem({...editingItem, bed_temp_max: parseNum(e.target.value) as any})} /></div>
              </>
            )}

            <div className="sm:col-span-2"><Label className="text-xs">Notas</Label><Textarea value={editingItem.notes || ''} onChange={e => setEditingItem({...editingItem, notes: e.target.value})} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveItem}>{isEditing ? "Guardar Cambios" : "Crear Item"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MOVEMENT DIALOG */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar Movimiento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Item *</Label>
              <Select value={movementForm.inventory_item_id} onValueChange={v => setMovementForm({...movementForm, inventory_item_id: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccionar item" /></SelectTrigger>
                <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.quantity_in_stock} {i.unit})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Tipo</Label>
              <Select value={movementForm.movement_type} onValueChange={v => setMovementForm({...movementForm, movement_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">Compra (entrada)</SelectItem>
                  <SelectItem value="sale">Venta (salida)</SelectItem>
                  <SelectItem value="adjustment">Ajuste</SelectItem>
                  <SelectItem value="return">Devolución (entrada)</SelectItem>
                  <SelectItem value="waste">Desperdicio (salida)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Cantidad</Label><Input type="number" value={numVal(movementForm.quantity)} onChange={e => setMovementForm({...movementForm, quantity: parseNumDef(e.target.value)})} /></div>
            <div><Label className="text-xs">Costo unitario (€)</Label><Input type="number" step="0.01" value={numVal(movementForm.cost_per_unit)} onChange={e => setMovementForm({...movementForm, cost_per_unit: parseNumDef(e.target.value)})} /></div>
            <div><Label className="text-xs">Notas</Label><Textarea value={movementForm.notes} onChange={e => setMovementForm({...movementForm, notes: e.target.value})} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMovementDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveMovement}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PRODUCTION DIALOG */}
      <Dialog open={showProductionDialog} onOpenChange={setShowProductionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar Producción</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Filamento usado *</Label>
              <Select value={productionForm.inventory_item_id} onValueChange={v => setProductionForm({...productionForm, inventory_item_id: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccionar filamento" /></SelectTrigger>
                <SelectContent>{items.filter(i => i.type === "filament").map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.quantity_in_stock}g)</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Filamento (g)</Label><Input type="number" value={numVal(productionForm.filament_used_g)} onChange={e => setProductionForm({...productionForm, filament_used_g: parseNumDef(e.target.value)})} /></div>
              <div><Label className="text-xs">Tiempo (min)</Label><Input type="number" value={numVal(productionForm.print_time_minutes)} onChange={e => setProductionForm({...productionForm, print_time_minutes: parseNumDef(e.target.value)})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Costo energía (€)</Label><Input type="number" step="0.01" value={numVal(productionForm.energy_cost)} onChange={e => setProductionForm({...productionForm, energy_cost: parseNumDef(e.target.value)})} /></div>
              <div><Label className="text-xs">Mano de obra (€)</Label><Input type="number" step="0.01" value={numVal(productionForm.labor_cost)} onChange={e => setProductionForm({...productionForm, labor_cost: parseNumDef(e.target.value)})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Otros costos (€)</Label><Input type="number" step="0.01" value={numVal(productionForm.other_costs)} onChange={e => setProductionForm({...productionForm, other_costs: parseNumDef(e.target.value)})} /></div>
              <div><Label className="text-xs">Precio venta (€)</Label><Input type="number" step="0.01" value={numVal(productionForm.sale_price)} onChange={e => setProductionForm({...productionForm, sale_price: parseNumDef(e.target.value)})} /></div>
            </div>
            <div><Label className="text-xs">Notas</Label><Textarea value={productionForm.notes} onChange={e => setProductionForm({...productionForm, notes: e.target.value})} rows={2} /></div>
            
            {/* Live profit preview */}
            {productionForm.sale_price > 0 && (() => {
              const fItem = items.find(i => i.id === productionForm.inventory_item_id);
              const fCost = (productionForm.filament_used_g / (fItem?.weight_per_spool || 1000)) * (fItem?.cost_per_unit || 0);
              const tCost = fCost + productionForm.energy_cost + productionForm.labor_cost + productionForm.other_costs;
              const prof = productionForm.sale_price - tCost;
              const marg = (prof / productionForm.sale_price) * 100;
              return (
                <Card className="bg-muted/50">
                  <CardContent className="p-3 grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-[10px] text-muted-foreground">Costo</p><p className="text-sm font-bold">€{tCost.toFixed(2)}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Ganancia</p><p className={`text-sm font-bold ${prof >= 0 ? "text-emerald-600" : "text-destructive"}`}>€{prof.toFixed(2)}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Margen</p><p className={`text-sm font-bold ${marg >= 0 ? "text-emerald-600" : "text-destructive"}`}>{marg.toFixed(1)}%</p></div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductionDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveProduction}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
