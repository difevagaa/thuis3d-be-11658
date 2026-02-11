import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { FileText, Plus, Eye, Trash2, X, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkDeleteActions } from "@/components/admin/BulkDeleteActions";
import UserSearchSelector from "@/components/admin/UserSearchSelector";
import { logger } from "@/lib/logger";
import { FieldHelp } from "@/components/admin/FieldHelp";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InvoiceItem {
  product_id?: string;
  product_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_enabled: boolean;
}

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [giftCards, setGiftCards] = useState<any[]>([]);
  
  const {
    selectedIds,
    toggleSelection,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isIndeterminate,
    selectedCount
  } = useBulkSelection(invoices);
  
  const [newInvoice, setNewInvoice] = useState({
    user_id: "",
    order_id: "",
    subtotal: "",
    tax: "",
    discount: "",
    shipping: "",
    total: "",
    payment_method: "",
    payment_status: "pending",
    notes: "",
    coupon_code: "",
    coupon_discount: "",
    gift_card_code: "",
    gift_card_amount: "",
    requires_payment: false,
    items: [] as InvoiceItem[]
  });

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('invoices-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'invoices'
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      const startTime = performance.now();

      const [invoicesRes, usersRes, productsRes, couponsRes, giftCardsRes] = await Promise.all([
        supabase
          .from("invoices")
          .select(`
            *,
            user:profiles!invoices_user_id_fkey (
              full_name,
              email
            ),
            order:orders!invoices_order_id_fkey (
              order_number
            )
          `)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, full_name, email")
          .order("full_name", { ascending: true }),
        supabase
          .from("products")
          .select("id, name, price, tax_enabled")
          .is("deleted_at", null)
          .order("name", { ascending: true }),
        supabase
          .from("coupons")
          .select("*")
          .eq("is_active", true)
          .is("deleted_at", null),
        supabase
          .from("gift_cards")
          .select("*")
          .eq("is_active", true)
          .gt("current_balance", 0)
          .is("deleted_at", null)
      ]);

      const endTime = performance.now();
      logger.log(`Invoices loaded in ${endTime - startTime}ms`);

      if (invoicesRes.error) throw invoicesRes.error;

      setInvoices(invoicesRes.data || []);
      setUsers(usersRes.data || []);
      setFilteredUsers(usersRes.data || []);
      setProducts(productsRes.data || []);
      setCoupons(couponsRes.data || []);
      setGiftCards(giftCardsRes.data || []);

    } catch (error: any) {
      logger.error("Error loading data:", error);
      toast.error("Error al cargar facturas");
    } finally {
      setLoading(false);
    }
  };

  // Generar número de factura basado en orden si existe, sino generar uno aleatorio corto
  const generateInvoiceNumber = async (orderId?: string) => {
    if (orderId) {
      // Si hay un pedido asociado, usar su número
      const { data: order } = await supabase
        .from("orders")
        .select("order_number")
        .eq("id", orderId)
        .single();
      
      if (order?.order_number) {
        return order.order_number;
      }
    }
    
    // Si no hay pedido, generar un número corto único (formato similar a pedidos)
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetter1 = letters.charAt(Math.floor(Math.random() * letters.length));
    const randomNum1 = Math.floor(Math.random() * 10);
    const randomNum2 = Math.floor(Math.random() * 10);
    const randomLetter2 = letters.charAt(Math.floor(Math.random() * letters.length));
    const randomNum3 = Math.floor(Math.random() * 10);
    const randomLetter3 = letters.charAt(Math.floor(Math.random() * letters.length));
    const randomNum4 = Math.floor(Math.random() * 10);
    
    return `${randomLetter1}${randomNum1}${randomNum2}${randomLetter2}${randomNum3}${randomLetter3}${randomNum4}`;
  };

  const addItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [
        ...newInvoice.items,
        {
          product_name: "",
          description: "",
          quantity: 1,
          unit_price: 0,
          total_price: 0,
          tax_enabled: true
        }
      ]
    });
  };

  const removeItem = (index: number) => {
    setNewInvoice({
      ...newInvoice,
      items: newInvoice.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...newInvoice.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === "quantity" || field === "unit_price") {
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setNewInvoice({ ...newInvoice, items: newItems });
    calculateTotals(newItems);
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newItems = [...newInvoice.items];
      newItems[index] = {
        ...newItems[index],
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price || 0,
        total_price: newItems[index].quantity * (product.price || 0),
        tax_enabled: product.tax_enabled ?? true
      };
      setNewInvoice({ ...newInvoice, items: newItems });
      calculateTotals(newItems);
    }
  };

  const applyCoupon = async () => {
    if (!newInvoice.coupon_code) return;

    try {
      const { data: coupon, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", newInvoice.coupon_code)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      
      if (!coupon) {
        toast.error("Cupón no válido");
        return;
      }

      if (coupon.max_uses && coupon.times_used >= coupon.max_uses) {
        toast.error("Este cupón ha alcanzado su límite de uso");
        return;
      }

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        toast.error("Este cupón ha expirado");
        return;
      }

      const subtotal = parseFloat(newInvoice.subtotal) || 0;
      
      if (coupon.min_purchase && subtotal < coupon.min_purchase) {
        toast.error(`Compra mínima requerida: €${coupon.min_purchase}`);
        return;
      }

      let discount = 0;
      if (coupon.discount_type === "percentage") {
        discount = subtotal * (coupon.discount_value / 100);
      } else {
        discount = coupon.discount_value;
      }

      setNewInvoice({
        ...newInvoice,
        coupon_discount: discount.toFixed(2)
      });

      toast.success(`Cupón aplicado: -€${discount.toFixed(2)}`);
      calculateTotalsWithDiscounts(newInvoice.items, discount, parseFloat(newInvoice.gift_card_amount) || 0);
    } catch (error) {
      toast.error("Error al aplicar cupón");
    }
  };

  const applyGiftCard = async () => {
    if (!newInvoice.gift_card_code) return;

    try {
      const { data: giftCard, error } = await supabase
        .from("gift_cards")
        .select("*")
        .eq("code", newInvoice.gift_card_code)
        .eq("is_active", true)
        .gt("current_balance", 0)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      
      if (!giftCard) {
        toast.error("Tarjeta regalo no válida o sin saldo");
        return;
      }

      const balance = parseFloat(String(giftCard.current_balance));
      setNewInvoice({
        ...newInvoice,
        gift_card_amount: balance.toFixed(2)
      });

      toast.success(`Tarjeta regalo aplicada: €${balance.toFixed(2)}`);
      calculateTotalsWithDiscounts(newInvoice.items, parseFloat(newInvoice.coupon_discount) || 0, balance);
    } catch (error) {
      toast.error("Error al aplicar tarjeta regalo");
    }
  };

  const calculateTotals = (items: InvoiceItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const shipping = parseFloat(newInvoice.shipping) || 0;
    
    // Calculate tax only for items with tax enabled
    const taxableAmount = items
      .filter(item => item.tax_enabled)
      .reduce((sum, item) => sum + item.total_price, 0);
    
    const tax = Number((taxableAmount * 0.21).toFixed(2));
    const total = Number((subtotal + tax + shipping).toFixed(2));
    
    setNewInvoice(prev => ({
      ...prev,
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2)
    }));
  };

  const calculateTotalsWithDiscounts = (items: InvoiceItem[], couponDiscount: number, giftCardAmount: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const manualDiscount = parseFloat(newInvoice.discount) || 0;
    const shipping = parseFloat(newInvoice.shipping) || 0;
    const totalDiscount = manualDiscount + couponDiscount + giftCardAmount;
    
    // Calculate tax on taxable items (before discounts - tax applies to the original taxable amount)
    const taxableAmount = items
      .filter(item => item.tax_enabled)
      .reduce((sum, item) => sum + item.total_price, 0);
    
    const tax = Number((taxableAmount * 0.21).toFixed(2));
    const total = Number(Math.max(0, subtotal + tax + shipping - totalDiscount).toFixed(2));
    
    setNewInvoice(prev => ({
      ...prev,
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2)
    }));
  };

  const handleCreateInvoice = async () => {
    try {
      if (!newInvoice.user_id) {
        toast.error("Debes seleccionar un cliente");
        return;
      }

      if (newInvoice.items.length === 0) {
        toast.error("Debes agregar al menos un producto");
        return;
      }

      // Validate all items have required fields
      const invalidItems = newInvoice.items.filter(item => !item.product_name || item.unit_price <= 0);
      if (invalidItems.length > 0) {
        toast.error("Todos los productos deben tener nombre y precio");
        return;
      }

      const invoiceNumber = await generateInvoiceNumber();
      
      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          user_id: newInvoice.user_id,
          order_id: newInvoice.order_id || null,
          subtotal: parseFloat(newInvoice.subtotal) || 0,
          tax: parseFloat(newInvoice.tax) || 0,
          discount: parseFloat(newInvoice.discount) || 0,
          shipping: parseFloat(newInvoice.shipping) || 0,
          total: parseFloat(newInvoice.total) || 0,
          payment_method: newInvoice.payment_method,
          payment_status: newInvoice.requires_payment ? 'pending' : newInvoice.payment_status,
          notes: newInvoice.notes,
          coupon_code: newInvoice.coupon_code || null,
          coupon_discount: parseFloat(newInvoice.coupon_discount) || 0,
          gift_card_code: newInvoice.gift_card_code || null,
          gift_card_amount: parseFloat(newInvoice.gift_card_amount) || 0,
          issue_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .maybeSingle();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const itemsToInsert = newInvoice.items.map(item => ({
        invoice_id: invoiceData.id,
        product_id: item.product_id || null,
        product_name: item.product_name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        tax_enabled: item.tax_enabled
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Update coupon usage if used
      if (newInvoice.coupon_code) {
        const { data: couponData } = await supabase
          .from("coupons")
          .select("times_used")
          .eq("code", newInvoice.coupon_code)
          .maybeSingle();
        
        if (couponData) {
          await supabase
            .from("coupons")
            .update({ times_used: (couponData.times_used || 0) + 1 })
            .eq("code", newInvoice.coupon_code);
        }
      }

      // Update gift card balance if used
      if (newInvoice.gift_card_code && parseFloat(newInvoice.gift_card_amount) > 0) {
        const amountUsed = parseFloat(newInvoice.gift_card_amount);
        const { data: giftCardData } = await supabase
          .from("gift_cards")
          .select("current_balance")
          .eq("code", newInvoice.gift_card_code)
          .maybeSingle();
        
        if (giftCardData) {
          const newBalance = parseFloat(String(giftCardData.current_balance)) - amountUsed;
          await supabase
            .from("gift_cards")
            .update({ current_balance: newBalance })
            .eq("code", newInvoice.gift_card_code);
        }
      }

      toast.success("Factura creada exitosamente");
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      logger.error("Error creating invoice:", error);
      toast.error("Error al crear factura");
    }
  };

  const resetForm = () => {
    setNewInvoice({
      user_id: "",
      order_id: "",
      subtotal: "",
      tax: "",
      discount: "",
      shipping: "",
      total: "",
      payment_method: "",
      payment_status: "pending",
      notes: "",
      coupon_code: "",
      coupon_discount: "",
      gift_card_code: "",
      gift_card_amount: "",
      requires_payment: false,
      items: []
    });
    setSearchQuery("");
    setFilteredUsers(users);
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast.success("Factura movida a la papelera");
      await loadData();
    } catch (error: any) {
      logger.error("Error deleting invoice:", error);
      toast.error("Error al eliminar factura");
    }
  };

  const handleBulkDelete = async () => {
    try {
      const idsArray = Array.from(selectedIds);
      
      const { error } = await supabase
        .from("invoices")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", idsArray);
        
      if (error) throw error;
      
      toast.success(`${selectedIds.size} facturas movidas a la papelera exitosamente`);
      clearSelection();
      loadData();
    } catch (error: any) {
      logger.error("Error deleting invoices:", error);
      toast.error(`Error al eliminar facturas: ${error.message}`);
    }
  };

  const handleEditInvoice = async (invoice: any) => {
    try {
      // Load invoice items
      const { data: items, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoice.id);

      if (itemsError) throw itemsError;

      setEditingInvoice({
        ...invoice,
        items: items || []
      });
      setEditDialogOpen(true);
    } catch (error) {
      logger.error("Error loading invoice for edit:", error);
      toast.error("Error al cargar factura");
    }
  };

  const handleUpdateInvoice = async () => {
    try {
      if (!editingInvoice) return;

      const previousStatus = invoices.find(inv => inv.id === editingInvoice.id)?.payment_status;
      const newStatus = editingInvoice.payment_status;

      // Update invoice
      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({
          subtotal: parseFloat(editingInvoice.subtotal) || 0,
          tax: parseFloat(editingInvoice.tax) || 0,
          discount: parseFloat(editingInvoice.discount) || 0,
          shipping: parseFloat(editingInvoice.shipping) || 0,
          total: parseFloat(editingInvoice.total) || 0,
          payment_method: editingInvoice.payment_method,
          payment_status: editingInvoice.payment_status,
          notes: editingInvoice.notes
        })
        .eq("id", editingInvoice.id);

      if (invoiceError) throw invoiceError;

      // If invoice is marked as paid and has an associated order, update the order's payment status
      if (newStatus === 'paid' && previousStatus !== 'paid' && editingInvoice.order_id) {
        const { error: orderError } = await supabase
          .from("orders")
          .update({ payment_status: 'paid' })
          .eq("id", editingInvoice.order_id);
        
        if (orderError) {
          logger.error('Error updating order payment status:', orderError);
        } else {
          logger.log('Order payment status updated to paid:', editingInvoice.order_id);
        }
      }

      // Delete existing items
      await supabase
        .from("invoice_items")
        .delete()
        .eq("invoice_id", editingInvoice.id);

      // Insert updated items
      if (editingInvoice.items && editingInvoice.items.length > 0) {
        const itemsToInsert = editingInvoice.items.map((item: InvoiceItem) => ({
          invoice_id: editingInvoice.id,
          product_id: item.product_id || null,
          product_name: item.product_name,
          description: item.description || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          tax_enabled: item.tax_enabled
        }));

        const { error: itemsError } = await supabase
          .from("invoice_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      toast.success("Factura actualizada exitosamente");
      setEditDialogOpen(false);
      setEditingInvoice(null);
      loadData();
    } catch (error: any) {
      logger.error("Error updating invoice:", error);
      toast.error("Error al actualizar factura");
    }
  };

  const updateEditingItem = (index: number, field: keyof InvoiceItem, value: any) => {
    if (!editingInvoice) return;
    
    const newItems = [...editingInvoice.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === "quantity" || field === "unit_price") {
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setEditingInvoice({ ...editingInvoice, items: newItems });
    calculateEditingTotals(newItems);
  };

  const addEditingItem = () => {
    if (!editingInvoice) return;
    
    setEditingInvoice({
      ...editingInvoice,
      items: [
        ...editingInvoice.items,
        {
          product_name: "",
          description: "",
          quantity: 1,
          unit_price: 0,
          total_price: 0,
          tax_enabled: true
        }
      ]
    });
  };

  const removeEditingItem = (index: number) => {
    if (!editingInvoice) return;
    
    setEditingInvoice({
      ...editingInvoice,
      items: editingInvoice.items.filter((_: any, i: number) => i !== index)
    });
  };

  const calculateEditingTotals = (items: InvoiceItem[]) => {
    if (!editingInvoice) return;
    
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const shipping = parseFloat(editingInvoice.shipping) || 0;
    const discount = parseFloat(editingInvoice.discount) || 0;
    
    // Calculate tax only for items with tax enabled (on full taxable amount, not reduced by discount)
    const taxableAmount = items
      .filter(item => item.tax_enabled)
      .reduce((sum, item) => sum + item.total_price, 0);
    
    const tax = Number((taxableAmount * 0.21).toFixed(2));
    const total = Number(Math.max(0, subtotal + tax + shipping - discount).toFixed(2));
    
    setEditingInvoice((prev: any) => ({
      ...prev,
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2)
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pagado';
      case 'pending':
        return 'Pendiente';
      case 'failed':
        return 'Fallido';
      default:
        return status;
    }
  };

  if (loading) return <div className="container mx-auto p-6">Cargando...</div>;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Facturas</h1>
          <p className="text-muted-foreground">Gestiona las facturas de pedidos y manuales</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Factura Manual
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Factura Manual</DialogTitle>
              <DialogDescription>
                Crea una factura manualmente para un cliente con productos y descuentos
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Cliente Selection */}
              <div className="space-y-2">
                <UserSearchSelector
                  value={newInvoice.user_id}
                  onValueChange={(value) => setNewInvoice({ ...newInvoice, user_id: value })}
                  label="Cliente *"
                  placeholder="Buscar cliente por nombre o email..."
                />
              </div>

              {/* Products/Items Section */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-semibold">Productos / Servicios</Label>
                    <FieldHelp content="Agrega los productos o servicios que incluye esta factura. El total se calcula automáticamente" />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Item
                  </Button>
                </div>

                {newInvoice.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay productos. Click en "Agregar Item" para comenzar.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {newInvoice.items.map((item, index) => (
                      <div key={index} className="border rounded p-4 space-y-3 relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => removeItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <Label className="text-xs">Seleccionar Producto Existente (opcional)</Label>
                            <Select
                              value={item.product_id || ""}
                              onValueChange={(value) => selectProduct(index, value)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="O escribe manualmente abajo" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name} - €{product.price}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="col-span-2">
                            <Label className="text-xs">Nombre del Producto *</Label>
                            <Input
                              value={item.product_name}
                              onChange={(e) => updateItem(index, "product_name", e.target.value)}
                              placeholder="Ej: Llavero personalizado"
                              className="h-9"
                            />
                          </div>

                          <div className="col-span-2">
                            <Label className="text-xs">Descripción (opcional)</Label>
                            <Textarea
                              value={item.description || ""}
                              onChange={(e) => updateItem(index, "description", e.target.value)}
                              placeholder="Material, color, texto personalizado, etc."
                              rows={2}
                              className="text-sm"
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Cantidad</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity || ""}
                              onChange={(e) => updateItem(index, "quantity", e.target.value === '' ? 1 : parseInt(e.target.value))}
                              className="h-9"
                              placeholder="1"
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Precio Unitario (€)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unit_price || ""}
                              onChange={(e) => updateItem(index, "unit_price", e.target.value === '' ? 0 : parseFloat(e.target.value))}
                              placeholder="0.00"
                              className="h-9"
                            />
                          </div>

                          <div className="col-span-2 flex items-center justify-between bg-muted p-2 rounded">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={item.tax_enabled}
                                onCheckedChange={(checked) => updateItem(index, "tax_enabled", checked)}
                              />
                              <Label className="text-xs">Aplicar IVA a este item</Label>
                            </div>
                            <div className="text-sm font-semibold">
                              Total: €{item.total_price.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Discounts and Coupons */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Descuento Manual (€)</Label>
                    <FieldHelp content="Aplica un descuento fijo en euros que se restará del subtotal" />
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newInvoice.discount}
                    onChange={(e) => {
                      setNewInvoice({ ...newInvoice, discount: e.target.value });
                    }}
                    placeholder="0.00"
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Cupón</Label>
                    <FieldHelp content="Introduce un código de cupón válido para aplicar su descuento. El uso del cupón se registrará" />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newInvoice.coupon_code}
                      onChange={(e) => setNewInvoice({ ...newInvoice, coupon_code: e.target.value.toUpperCase() })}
                      placeholder="Código de cupón"
                      className="h-9"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={applyCoupon}>
                      Aplicar
                    </Button>
                  </div>
                  {newInvoice.coupon_discount && parseFloat(newInvoice.coupon_discount) > 0 && (
                    <p className="text-xs text-green-600">
                      Descuento: -€{parseFloat(newInvoice.coupon_discount).toFixed(2)}
                    </p>
                  )}
                </div>

                <div className="col-span-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Tarjeta Regalo</Label>
                    <FieldHelp content="Introduce el código de una tarjeta regalo para aplicar su saldo. El balance se actualizará automáticamente" />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newInvoice.gift_card_code}
                      onChange={(e) => setNewInvoice({ ...newInvoice, gift_card_code: e.target.value.toUpperCase() })}
                      placeholder="Código de tarjeta regalo"
                      className="h-9"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={applyGiftCard}>
                      Aplicar
                    </Button>
                  </div>
                  {newInvoice.gift_card_amount && parseFloat(newInvoice.gift_card_amount) > 0 && (
                    <p className="text-xs text-green-600">
                      Crédito aplicado: -€{parseFloat(newInvoice.gift_card_amount).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">€{parseFloat(newInvoice.subtotal || "0").toFixed(2)}</span>
                </div>
                {newInvoice.discount && parseFloat(newInvoice.discount) > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Descuento:</span>
                    <span>-€{parseFloat(newInvoice.discount).toFixed(2)}</span>
                  </div>
                )}
                {newInvoice.coupon_discount && parseFloat(newInvoice.coupon_discount) > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Cupón:</span>
                    <span>-€{parseFloat(newInvoice.coupon_discount).toFixed(2)}</span>
                  </div>
                )}
                {newInvoice.gift_card_amount && parseFloat(newInvoice.gift_card_amount) > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Tarjeta Regalo:</span>
                    <span>-€{parseFloat(newInvoice.gift_card_amount).toFixed(2)}</span>
                  </div>
                )}
                {newInvoice.shipping && parseFloat(newInvoice.shipping) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envío:</span>
                    <span className="font-medium">€{parseFloat(newInvoice.shipping).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA (21%):</span>
                  <span className="font-medium">€{parseFloat(newInvoice.tax || "0").toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>TOTAL:</span>
                  <span className="text-lg">€{parseFloat(newInvoice.total || "0").toFixed(2)}</span>
                </div>
              </div>

              {/* Shipping Cost */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Costo de Envío (€)</Label>
                  <FieldHelp content="Costo de envío que se añadirá al total de la factura" />
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={newInvoice.shipping}
                  onChange={(e) => {
                    setNewInvoice({ ...newInvoice, shipping: e.target.value });
                    calculateTotalsWithDiscounts(
                      newInvoice.items,
                      parseFloat(newInvoice.coupon_discount) || 0,
                      parseFloat(newInvoice.gift_card_amount) || 0
                    );
                  }}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Costo de envío que se sumará al total
                </p>
              </div>

              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Método de Pago</Label>
                    <FieldHelp content="Selecciona el método de pago que usará el cliente para esta factura" />
                  </div>
                  <Select
                    value={newInvoice.payment_method}
                    onValueChange={(value) => setNewInvoice({ ...newInvoice, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
                      <SelectItem value="card">Tarjeta</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="revolut">Revolut</SelectItem>
                      <SelectItem value="cash">Efectivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Estado de Pago</Label>
                    <FieldHelp content="Estado actual del pago. Si marcas 'Requiere Pago del Cliente', se establecerá como Pendiente" />
                  </div>
                  <Select
                    value={newInvoice.payment_status}
                    onValueChange={(value) => setNewInvoice({ ...newInvoice, payment_status: value })}
                    disabled={newInvoice.requires_payment}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="paid">Pagado</SelectItem>
                      <SelectItem value="failed">Fallido</SelectItem>
                    </SelectContent>
                  </Select>
                  {newInvoice.requires_payment && (
                    <p className="text-xs text-muted-foreground">
                      Se creará como "Pendiente" para que el cliente pague
                    </p>
                  )}
                </div>
              </div>

              {/* Requires Payment Switch */}
              <div className="flex items-center justify-between border rounded-lg p-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-base">¿Requiere Pago del Cliente?</Label>
                    <FieldHelp content="Activa esto si el cliente debe pagar esta factura. Se creará un enlace de pago para el cliente" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Si activas esto, el cliente verá un botón para pagar esta factura
                  </p>
                </div>
                <Switch
                  checked={newInvoice.requires_payment}
                  onCheckedChange={(checked) => {
                    setNewInvoice({ 
                      ...newInvoice, 
                      requires_payment: checked,
                      payment_status: checked ? 'pending' : 'pending'
                    });
                  }}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Notas</Label>
                  <FieldHelp content="Agrega notas o información adicional sobre esta factura (opcional)" />
                </div>
                <Textarea
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                  placeholder="Notas adicionales sobre la factura..."
                  rows={3}
                />
              </div>

              <Button onClick={handleCreateInvoice} className="w-full">
                Crear Factura
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Facturas</CardTitle>
          <CardDescription>
            Todas las facturas generadas automáticamente y manualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Seleccionar todos"
                    />
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Nº Factura
                      <FieldHelp content="Número único de identificación de la factura generado automáticamente" />
                    </div>
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Nº Pedido
                      <FieldHelp content="Número del pedido asociado. Facturas manuales no tienen pedido asociado" />
                    </div>
                  </TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Estado
                      <FieldHelp content="Estado del pago: Pagado, Pendiente o Fallido" />
                    </div>
                  </TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No hay facturas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected(invoice.id)}
                          onCheckedChange={() => toggleSelection(invoice.id)}
                          aria-label={`Seleccionar ${invoice.invoice_number}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{invoice.user?.full_name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">{invoice.user?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {invoice.order?.order_number || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(invoice.issue_date || invoice.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-semibold">
                        €{invoice.total?.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.payment_status)}>
                          {getStatusText(invoice.payment_status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <TooltipProvider>
                            <Tooltip delayDuration={200}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/admin/facturas/${invoice.id}`)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Ver detalles de la factura</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip delayDuration={200}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditInvoice(invoice)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Editar factura</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <DeleteConfirmDialog
                            title="¿Mover factura a la papelera?"
                            itemName={invoice.invoice_number}
                            onConfirm={() => handleDeleteInvoice(invoice.id)}
                            actionText="Mover a papelera"
                            trigger={
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <BulkDeleteActions
        selectedCount={selectedCount}
        onDelete={handleBulkDelete}
        onCancel={clearSelection}
        itemName="facturas"
      />

      {/* Edit Invoice Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) setEditingInvoice(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Factura: {editingInvoice?.invoice_number}</DialogTitle>
            <DialogDescription>
              Modifica los detalles de esta factura
            </DialogDescription>
          </DialogHeader>
          
          {editingInvoice && (
            <div className="space-y-6">
              {/* Products/Items Section */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-semibold">Productos / Servicios</Label>
                    <FieldHelp content="Edita los productos o servicios de esta factura. El total se recalculará automáticamente" />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addEditingItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Item
                  </Button>
                </div>

                {editingInvoice.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay productos.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {editingInvoice.items.map((item: InvoiceItem, index: number) => (
                      <div key={index} className="border rounded p-4 space-y-3 relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => removeEditingItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <Label className="text-xs">Nombre del Producto *</Label>
                            <Input
                              value={item.product_name}
                              onChange={(e) => updateEditingItem(index, "product_name", e.target.value)}
                              placeholder="Ej: Llavero personalizado"
                              className="h-9"
                            />
                          </div>

                          <div className="col-span-2">
                            <Label className="text-xs">Descripción</Label>
                            <Textarea
                              value={item.description || ""}
                              onChange={(e) => updateEditingItem(index, "description", e.target.value)}
                              placeholder="Material, color, texto personalizado, etc."
                              rows={2}
                              className="text-sm"
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Cantidad</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity || ""}
                              onChange={(e) => updateEditingItem(index, "quantity", e.target.value === '' ? 1 : parseInt(e.target.value))}
                              className="h-9"
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Precio Unitario (€)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unit_price || ""}
                              onChange={(e) => updateEditingItem(index, "unit_price", e.target.value === '' ? 0 : parseFloat(e.target.value))}
                              className="h-9"
                            />
                          </div>

                          <div className="col-span-2 flex items-center justify-between bg-muted p-2 rounded">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={item.tax_enabled}
                                onCheckedChange={(checked) => updateEditingItem(index, "tax_enabled", checked)}
                              />
                              <Label className="text-xs">Aplicar IVA</Label>
                            </div>
                            <div className="text-sm font-semibold">
                              Total: €{item.total_price.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals Summary */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">€{parseFloat(editingInvoice.subtotal || "0").toFixed(2)}</span>
                </div>
                {editingInvoice.discount && parseFloat(editingInvoice.discount) > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Descuento:</span>
                    <span>-€{parseFloat(editingInvoice.discount).toFixed(2)}</span>
                  </div>
                )}
                {editingInvoice.shipping && parseFloat(editingInvoice.shipping) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envío:</span>
                    <span className="font-medium">€{parseFloat(editingInvoice.shipping).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA (21%):</span>
                  <span className="font-medium">€{parseFloat(editingInvoice.tax || "0").toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>TOTAL:</span>
                  <span className="text-lg">€{parseFloat(editingInvoice.total || "0").toFixed(2)}</span>
                </div>
              </div>

              {/* Discount and Shipping */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Descuento (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingInvoice.discount}
                    onChange={(e) => {
                      setEditingInvoice({ ...editingInvoice, discount: e.target.value });
                      calculateEditingTotals(editingInvoice.items);
                    }}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Costo de Envío (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingInvoice.shipping}
                    onChange={(e) => {
                      setEditingInvoice({ ...editingInvoice, shipping: e.target.value });
                      calculateEditingTotals(editingInvoice.items);
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Método de Pago</Label>
                    <FieldHelp content="Método de pago utilizado o a utilizar para esta factura" />
                  </div>
                  <Select
                    value={editingInvoice.payment_method}
                    onValueChange={(value) => setEditingInvoice({ ...editingInvoice, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
                      <SelectItem value="card">Tarjeta</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="revolut">Revolut</SelectItem>
                      <SelectItem value="cash">Efectivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Estado de Pago</Label>
                    <FieldHelp content="Actualizar a 'Pagado' actualizará también el estado del pedido asociado si existe" />
                  </div>
                  <Select
                    value={editingInvoice.payment_status}
                    onValueChange={(value) => setEditingInvoice({ ...editingInvoice, payment_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="paid">Pagado</SelectItem>
                      <SelectItem value="failed">Fallido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={editingInvoice.notes || ""}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, notes: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleUpdateInvoice} className="flex-1">
                  Guardar Cambios
                </Button>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
