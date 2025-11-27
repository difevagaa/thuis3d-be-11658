import { useState, useEffect } from "react";
import { logger } from '@/lib/logger';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import UserSearchSelector from "@/components/admin/UserSearchSelector";

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export default function CreateOrder() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  const [orderData, setOrderData] = useState({
    user_id: "",
    status_id: "",
    notes: "",
    shipping_address: "",
    billing_address: "",
    phone: "",
    country: "",
    postal_code: "",
    city: "",
    discount: 0,
    shipping: 0,
    coupon_code: ""
  });

  const [items, setItems] = useState<OrderItem[]>([{
    product_name: "",
    quantity: 1,
    unit_price: 0,
    total_price: 0
  }]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, statusesRes, productsRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, phone, address").order("full_name", { ascending: true }),
        supabase.from("order_statuses").select("*").is("deleted_at", null).order("name"),
        supabase.from("products").select("id, name, price, tax_enabled").is("deleted_at", null).order("name", { ascending: true })
      ]);

      if (usersRes.error) logger.error("Error loading users:", usersRes.error);
      if (statusesRes.error) logger.error("Error loading statuses:", statusesRes.error);
      if (productsRes.error) logger.error("Error loading products:", productsRes.error);

      setUsers(usersRes.data || []);
      setStatuses(statusesRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      logger.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      
      if (error) {
        logger.error("Error loading user data:", error);
        return;
      }
      
      if (data) {
        setSelectedUser(data);
        
        // Build full address string from profile fields
        const fullAddress = [
          data.address || '',
          data.city || '',
          data.postal_code || '',
          data.country || ''
        ].filter(Boolean).join(', ');

        // Auto-fill all available fields
        setOrderData(prev => ({
          ...prev,
          shipping_address: fullAddress,
          billing_address: fullAddress,
          phone: data.phone || '',
          city: data.city || '',
          postal_code: data.postal_code || '',
          country: data.country || 'Bélgica'
        }));

        // Show warning if data is missing
        const missingFields = [];
        if (!data.phone) missingFields.push("teléfono");
        if (!data.address) missingFields.push("dirección");
        if (!data.city) missingFields.push("ciudad");
        if (!data.postal_code) missingFields.push("código postal");
        
        if (missingFields.length > 0) {
          toast.warning(`El cliente no tiene ${missingFields.join(", ")} registrado. Por favor completa estos datos.`);
        } else {
          toast.success("Datos del cliente cargados correctamente");
        }
      }
    } catch (error) {
      logger.error("Error loading user data:", error);
      toast.error("Error al cargar datos del cliente");
    }
  };

  const addItem = () => {
    setItems([...items, {
      product_name: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-calculate total_price
    if (field === "quantity" || field === "unit_price") {
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setItems(newItems);
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        product_name: product.name,
        unit_price: product.price || 0,
        total_price: newItems[index].quantity * (product.price || 0)
      };
      setItems(newItems);
      toast.success(`Producto "${product.name}" seleccionado`);
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const discount = orderData.discount || 0;
    const shipping = orderData.shipping || 0;
    
    // Calculate tax only for items with tax enabled (productos normales, no tarjetas regalo)
    let taxableAmount = 0;
    items.forEach(item => {
      const product = products.find(p => p.name === item.product_name);
      // Si el producto tiene tax_enabled=true o no existe (producto manual), aplica IVA
      if (!product || product.tax_enabled !== false) {
        taxableAmount += item.total_price;
      }
    });
    
    const tax = (taxableAmount - discount) * 0.21; // 21% IVA solo sobre productos con impuestos
    const total = subtotal - discount + shipping + tax;
    
    return { subtotal, discount, shipping, tax, total };
  };

  const createOrder = async () => {
    try {
      // Validate customer
      if (!orderData.user_id) {
        toast.error("Por favor selecciona un cliente");
        return;
      }

      // Validate status
      if (!orderData.status_id) {
        toast.error("Por favor selecciona un estado del pedido");
        return;
      }

      // Validate items
      if (items.length === 0) {
        toast.error("Por favor añade al menos un producto");
        return;
      }

      const invalidItems = items.filter(item => !item.product_name || !item.unit_price || item.quantity < 1);
      if (invalidItems.length > 0) {
        toast.error("Todos los productos deben tener nombre, precio y cantidad válidos");
        return;
      }

      // Validate required shipping data
      if (!orderData.shipping_address) {
        toast.error("Por favor ingresa la dirección de envío");
        return;
      }

      const totals = calculateTotals();
      
      // El order_number se genera automáticamente en la BD con formato: 3 letras + 4 números mezclados
      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([{
          user_id: orderData.user_id,
          status_id: orderData.status_id,
          subtotal: totals.subtotal,
          tax: totals.tax,
          discount: totals.discount,
          shipping: totals.shipping || 0,
          total: totals.total,
          notes: orderData.notes,
          shipping_address: orderData.shipping_address,
          billing_address: orderData.billing_address,
          payment_status: "pending"
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success("Pedido creado exitosamente");
      navigate("/admin/pedidos");
    } catch (error) {
      logger.error(error);
      toast.error("Error al crear el pedido");
    }
  };

  if (loading) return <div>Cargando...</div>;

  const totals = calculateTotals();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Crear Pedido Manual</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Cliente *</Label>
                <UserSearchSelector
                  value={orderData.user_id}
                  onValueChange={(value) => {
                    setOrderData({ ...orderData, user_id: value });
                    loadUserData(value);
                  }}
                  placeholder="Buscar cliente por nombre o email..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={orderData.phone}
                    onChange={(e) => setOrderData({ ...orderData, phone: e.target.value })}
                    placeholder="Teléfono del cliente"
                  />
                </div>
                <div>
                  <Label>Código Postal</Label>
                  <Input
                    value={orderData.postal_code}
                    onChange={(e) => setOrderData({ ...orderData, postal_code: e.target.value })}
                    placeholder="Código postal"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Ciudad</Label>
                  <Input
                    value={orderData.city}
                    onChange={(e) => setOrderData({ ...orderData, city: e.target.value })}
                    placeholder="Ciudad"
                  />
                </div>
                <div>
                  <Label>País</Label>
                  <Input
                    value={orderData.country}
                    onChange={(e) => setOrderData({ ...orderData, country: e.target.value })}
                    placeholder="País"
                  />
                </div>
              </div>

              <div>
                <Label>Dirección de Envío *</Label>
                <Textarea
                  value={orderData.shipping_address}
                  onChange={(e) => setOrderData({ ...orderData, shipping_address: e.target.value })}
                  placeholder="Dirección completa de envío"
                  rows={2}
                />
              </div>

              <div>
                <Label>Dirección de Facturación</Label>
                <Textarea
                  value={orderData.billing_address}
                  onChange={(e) => setOrderData({ ...orderData, billing_address: e.target.value })}
                  placeholder="Dirección de facturación (si es diferente)"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Productos</CardTitle>
              <CardDescription>Añade los productos del pedido</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="flex gap-4 items-end p-4 border rounded-lg">
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label>Producto</Label>
                      <Select
                        value={products.find(p => p.name === item.product_name)?.id || ""}
                        onValueChange={(productId) => selectProduct(index, productId)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - €{product.price?.toFixed(2) || '0.00'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {item.product_name && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Seleccionado: {item.product_name}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", e.target.value === '' ? 1 : parseInt(e.target.value))}
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <Label>Precio Unitario (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, "unit_price", e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Total</Label>
                        <Input
                          type="number"
                          value={item.total_price.toFixed(2)}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button onClick={addItem} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Añadir Producto
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información Adicional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Estado del Pedido *</Label>
                <Select
                  value={orderData.status_id}
                  onValueChange={(value) => setOrderData({ ...orderData, status_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Descuento (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={orderData.discount}
                    onChange={(e) => setOrderData({ ...orderData, discount: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Coste de Envío (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={orderData.shipping}
                    onChange={(e) => setOrderData({ ...orderData, shipping: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label>Código de Cupón (opcional)</Label>
                <Input
                  value={orderData.coupon_code}
                  onChange={(e) => setOrderData({ ...orderData, coupon_code: e.target.value })}
                  placeholder="DESCUENTO10"
                />
              </div>

              <div>
                <Label>Notas</Label>
                <Textarea
                  value={orderData.notes}
                  onChange={(e) => setOrderData({ ...orderData, notes: e.target.value })}
                  placeholder="Notas adicionales sobre el pedido"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Resumen del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">€{totals.subtotal.toFixed(2)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuento</span>
                    <span>-€{totals.discount.toFixed(2)}</span>
                  </div>
                )}
                {totals.shipping > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envío</span>
                    <span className="font-semibold">€{totals.shipping.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA (21%)</span>
                  <span className="font-semibold">€{totals.tax.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">€{totals.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <Button onClick={createOrder} className="w-full">
                  Crear Pedido
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/admin/pedidos")}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
