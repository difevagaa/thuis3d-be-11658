import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Trash2, Plus, Package, DollarSign, Palette, Image, Shield, Info, Truck, Video, Box, Tag, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ProductImageUploader from "./ProductImageUploader";
import ProductCustomizationSections from "@/components/admin/ProductCustomizationSections";
import { logger } from '@/lib/logger';

export default function ProductsAdminEnhanced() {
  const [products, setProducts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [taxRate, setTaxRate] = useState<number>(21);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    stock: 0,
    allow_direct_purchase: true,
    enable_material_selection: false,
    enable_color_selection: false,
    enable_custom_text: false,
    category_id: null as string | null,
    tax_enabled: true,
    weight: null as number | null,
    length: null as number | null,
    width: null as number | null,
    height: null as number | null,
    video_url: null as string | null,
    shipping_type: "standard" as "standard" | "free" | "custom" | "disabled",
    custom_shipping_cost: null as number | null,
    product_code: "" as string,
  });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<any[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [customizationSections, setCustomizationSections] = useState<any[]>([]);

  const priceCalculations = useMemo(() => {
    const basePrice = formData.price || 0;
    const rate = taxRate / 100;
    const taxAmount = formData.tax_enabled ? basePrice * rate : 0;
    const totalWithTax = basePrice + taxAmount;
    const shippingCost = formData.shipping_type === 'custom' ? (formData.custom_shipping_cost || 0) : 0;
    
    return {
      basePrice,
      taxAmount,
      totalWithTax,
      shippingCost,
      grandTotal: totalWithTax + shippingCost
    };
  }, [formData.price, formData.tax_enabled, formData.shipping_type, formData.custom_shipping_cost, taxRate]);

  useEffect(() => {
    loadData();

    // Subscribe to custom_roles changes to update role list dynamically
    const customRolesChannel = supabase
      .channel('products-custom-roles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'custom_roles'
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(customRolesChannel);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsRes, materialsRes, colorsRes, categoriesRes, customRolesRes, taxSettingsRes] = await Promise.all([
        supabase.from("products")
          .select("*, categories(name)")
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase.from("materials")
          .select("*")
          .is("deleted_at", null),
        supabase.from("colors")
          .select("*")
          .is("deleted_at", null),
        supabase.from("categories")
          .select("*")
          .is("deleted_at", null),
        supabase.from("custom_roles")
          .select("name, display_name")
          .order("display_name"),
        supabase.from("tax_settings")
          .select("tax_rate, is_enabled")
          .eq("is_enabled", true)
          .limit(1)
          .maybeSingle()
      ]);
      
      const systemRoles = [
        { value: 'admin', label: 'Admin' },
        { value: 'client', label: 'Cliente' },
        { value: 'moderator', label: 'Moderador' }
      ];
      
      const systemRoleNames = systemRoles.map(r => r.value);
      const customRolesList = (customRolesRes.data || [])
        .filter(role => !systemRoleNames.includes(role.name))
        .map(role => ({
          value: role.name,
          label: role.display_name
        }));
      
      setProducts(productsRes.data || []);
      setMaterials(materialsRes.data || []);
      setColors(colorsRes.data || []);
      setCategories(categoriesRes.data || []);
      setRoles([...systemRoles, ...customRolesList]);
      
      if (taxSettingsRes.data?.tax_rate) {
        setTaxRate(taxSettingsRes.data.tax_rate);
      }
    } catch (error) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const generateProductCode = async () => {
    setIsGeneratingCode(true);
    try {
      const { data, error } = await supabase.rpc('generate_product_code');
      if (error) throw error;
      if (data) {
        setFormData({ ...formData, product_code: data });
        toast.success(`Código generado: ${data}`);
      }
    } catch (error) {
      logger.error('Error generating product code:', error);
      toast.error('Error al generar código');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const validateProductCode = async (code: string): Promise<boolean> => {
    if (!code || code.trim() === '') return true;
    if (!/^[A-Z0-9]{6}$/i.test(code)) {
      toast.error('El código debe tener exactamente 6 caracteres alfanuméricos');
      return false;
    }
    try {
      const query = supabase.from('products').select('id').eq('product_code', code.toUpperCase());
      if (editingProductId) query.neq('id', editingProductId);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (data) {
        toast.error('Este código de producto ya existe');
        return false;
      }
      return true;
    } catch (error) {
      logger.error('Error validating product code:', error);
      toast.error('Error al validar código');
      return false;
    }
  };

  const handleSubmit = async () => {
    try {
      logger.log('[ProductsAdmin] === INICIO DE GUARDADO ===');
      if (formData.product_code && formData.product_code.trim() !== '') {
        const isValid = await validateProductCode(formData.product_code);
        if (!isValid) return;
      }
      
      const productData = {
        ...formData,
        product_code: formData.product_code ? formData.product_code.toUpperCase() : null,
        visible_to_all: selectedRoles.length === 0
      };
      
      if (editingProductId) {
        const { error: productError } = await supabase.from("products").update(productData).eq("id", editingProductId);
        if (productError) throw productError;
        await supabase.from("product_materials").delete().eq("product_id", editingProductId);
        await supabase.from("product_colors").delete().eq("product_id", editingProductId);
        await supabase.from("product_roles").delete().eq("product_id", editingProductId);

        if (selectedMaterials.length > 0) {
          await supabase.from("product_materials").insert(selectedMaterials.map(materialId => ({ product_id: editingProductId, material_id: materialId })));
        }
        if (selectedColors.length > 0) {
          await supabase.from("product_colors").insert(selectedColors.map(colorId => ({ product_id: editingProductId, color_id: colorId })));
        }
        if (selectedRoles.length > 0) {
          await supabase.from("product_roles").insert(selectedRoles.map(role => ({ product_id: editingProductId, role: String(role) })));
        }
        toast.success("Producto actualizado correctamente");
      } else {
        const { data: product, error: productError } = await supabase.from("products").insert([productData]).select().single();
        if (productError) throw productError;
        
        if (selectedMaterials.length > 0) {
          await supabase.from("product_materials").insert(selectedMaterials.map(materialId => ({ product_id: product.id, material_id: materialId })));
        }
        if (selectedColors.length > 0) {
          await supabase.from("product_colors").insert(selectedColors.map(colorId => ({ product_id: product.id, color_id: colorId })));
        }
        if (selectedRoles.length > 0) {
          await supabase.from("product_roles").insert(selectedRoles.map(role => ({ product_id: product.id, role: String(role) })));
        }

        if (customizationSections.length > 0) {
          for (const section of customizationSections) {
            if (!section.section_name.trim()) continue;
            const { data: insertedSection, error: sectionError } = await (supabase as any)
              .from('product_customization_sections')
              .insert({ product_id: product.id, section_name: section.section_name, display_order: section.display_order, is_required: section.is_required })
              .select().single();
            if (sectionError) continue;
            if (section.selectedColors && section.selectedColors.length > 0) {
              await (supabase as any).from('product_section_colors').insert(section.selectedColors.map((colorId: string) => ({ section_id: insertedSection.id, color_id: colorId })));
            }
          }
        }
        setEditingProductId(product.id);
        toast.success("Producto creado. Ahora puedes subir imágenes.");
      }
      await loadData();
    } catch (error) {
      logger.error('[ProductsAdmin] Error:', error);
      toast.error("Error al guardar producto");
    }
  };

  const loadProductImages = async (productId: string) => {
    const { data } = await supabase.from("product_images").select("*").eq("product_id", productId).order("display_order", { ascending: true });
    setProductImages(data || []);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("¿Mover este producto a la papelera?")) return;
    try {
      await supabase.from("products").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      toast.success("Producto movido a la papelera");
      loadData();
    } catch (error) {
      toast.error("Error al eliminar producto");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", price: 0, stock: 0, allow_direct_purchase: true, enable_material_selection: false, enable_color_selection: false, enable_custom_text: false, category_id: null, tax_enabled: true, weight: null, length: null, width: null, height: null, video_url: null, shipping_type: "standard", custom_shipping_cost: null, product_code: "" });
    setSelectedMaterials([]);
    setSelectedColors([]);
    setSelectedRoles([]);
    setEditingProductId(null);
    setProductImages([]);
    setActiveTab("basic");
    setCustomizationSections([]);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) { toast.error("Por favor selecciona un archivo de video"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("El video no debe superar 20MB"); return; }
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `products/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("product-videos").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("product-videos").getPublicUrl(filePath);
      setFormData({ ...formData, video_url: publicUrl });
      toast.success("Video cargado exitosamente");
    } catch (error) {
      logger.error("Error uploading video:", error);
      toast.error("Error al cargar el video");
    }
  };

  if (loading) return <div className="container mx-auto p-6">Cargando...</div>;

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-6 w-6" />
                Gestión de Productos
              </CardTitle>
              <CardDescription>Administra tu catálogo completo de productos</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}><Plus className="h-4 w-4 mr-2" />Crear Producto</Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle className="flex items-center gap-2">
                    {editingProductId ? <><Pencil className="h-5 w-5" />Editar Producto</> : <><Plus className="h-5 w-5" />Crear Nuevo Producto</>}
                  </DialogTitle>
                  {editingProductId && <Badge variant="secondary" className="w-fit">ID: {editingProductId.slice(0, 8)}...</Badge>}
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="grid grid-cols-5 mb-4 flex-shrink-0">
                    <TabsTrigger value="basic" className="flex items-center gap-2"><Info className="h-4 w-4" /><span className="hidden sm:inline">Básico</span></TabsTrigger>
                    <TabsTrigger value="pricing" className="flex items-center gap-2"><DollarSign className="h-4 w-4" /><span className="hidden sm:inline">Precios</span></TabsTrigger>
                    <TabsTrigger value="customization" className="flex items-center gap-2"><Palette className="h-4 w-4" /><span className="hidden sm:inline">Opciones</span></TabsTrigger>
                    <TabsTrigger value="media" className="flex items-center gap-2"><Image className="h-4 w-4" /><span className="hidden sm:inline">Multimedia</span></TabsTrigger>
                    <TabsTrigger value="access" className="flex items-center gap-2"><Shield className="h-4 w-4" /><span className="hidden sm:inline">Acceso</span></TabsTrigger>
                  </TabsList>

                  <div className="flex-1 overflow-y-auto pr-2">
                    <TabsContent value="basic" className="space-y-6 mt-0">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2"><Tag className="h-5 w-5" />Identificación del Producto</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="name" className="flex items-center gap-1">Nombre del Producto<span className="text-destructive">*</span></Label>
                              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Figura decorativa 3D" className={!formData.name ? "border-destructive/50" : ""} />
                              {!formData.name && <p className="text-xs text-destructive">Este campo es requerido</p>}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="product_code" className="flex items-center gap-1">Código de Producto
                                <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>Código único de 6 caracteres</p></TooltipContent></Tooltip></TooltipProvider>
                              </Label>
                              <div className="flex gap-2">
                                <Input id="product_code" value={formData.product_code} onChange={(e) => setFormData({ ...formData, product_code: e.target.value.toUpperCase() })} placeholder="Ej: A3B7C2" maxLength={6} className="font-mono uppercase" />
                                <Button type="button" variant="secondary" onClick={generateProductCode} disabled={isGeneratingCode} size="sm">{isGeneratingCode ? '...' : 'Auto'}</Button>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="category">Categoría</Label>
                              <Select value={formData.category_id || undefined} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                                <SelectTrigger id="category"><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                                <SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="stock" className="flex items-center gap-2"><Box className="h-4 w-4" />Stock Disponible</Label>
                              <Input id="stock" type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value === '' ? 0 : parseInt(e.target.value) })} placeholder="Ej: 100" min="0" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="description">Descripción del Producto</Label>
                            <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} placeholder="Describe las características principales..." />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2"><Box className="h-5 w-5" />Dimensiones y Peso</CardTitle>
                          <CardDescription>Información opcional para cálculo de envío</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2"><Label htmlFor="weight">Peso (g)</Label><Input id="weight" type="number" step="0.01" placeholder="250" value={formData.weight || ""} onChange={(e) => setFormData({ ...formData, weight: e.target.value ? parseFloat(e.target.value) : null })} /></div>
                            <div className="space-y-2"><Label htmlFor="length">Largo (cm)</Label><Input id="length" type="number" step="0.01" placeholder="15" value={formData.length || ""} onChange={(e) => setFormData({ ...formData, length: e.target.value ? parseFloat(e.target.value) : null })} /></div>
                            <div className="space-y-2"><Label htmlFor="width">Ancho (cm)</Label><Input id="width" type="number" step="0.01" placeholder="10" value={formData.width || ""} onChange={(e) => setFormData({ ...formData, width: e.target.value ? parseFloat(e.target.value) : null })} /></div>
                            <div className="space-y-2"><Label htmlFor="height">Alto (cm)</Label><Input id="height" type="number" step="0.01" placeholder="5" value={formData.height || ""} onChange={(e) => setFormData({ ...formData, height: e.target.value ? parseFloat(e.target.value) : null })} /></div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="pricing" className="space-y-6 mt-0">
                      <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><DollarSign className="h-5 w-5" />Precio Base</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="price" className="flex items-center gap-1">Precio (€)<span className="text-destructive">*</span></Label>
                              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span><Input id="price" type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? 0 : parseFloat(e.target.value) })} placeholder="0.00" className="pl-8" min="0" /></div>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${formData.tax_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}><DollarSign className="h-5 w-5" /></div>
                                <div><Label className="font-medium">Aplicar IVA ({taxRate}%)</Label><p className="text-sm text-muted-foreground">{formData.tax_enabled ? 'IVA incluido en precio final' : 'Producto exento de IVA'}</p></div>
                              </div>
                              <Switch checked={formData.tax_enabled} onCheckedChange={(checked) => setFormData({ ...formData, tax_enabled: checked })} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
                        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" />Resumen de Precios</CardTitle></CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-3 rounded-lg bg-background border"><p className="text-xs text-muted-foreground uppercase tracking-wider">Precio Base</p><p className="text-xl font-bold">€{priceCalculations.basePrice.toFixed(2)}</p></div>
                            <div className="p-3 rounded-lg bg-background border"><p className="text-xs text-muted-foreground uppercase tracking-wider">IVA ({taxRate}%)</p><p className="text-xl font-bold">{formData.tax_enabled ? `€${priceCalculations.taxAmount.toFixed(2)}` : '—'}</p></div>
                            <div className="p-3 rounded-lg bg-background border"><p className="text-xs text-muted-foreground uppercase tracking-wider">Envío</p><p className="text-xl font-bold">{formData.shipping_type === 'free' ? 'Gratis' : formData.shipping_type === 'custom' ? `€${priceCalculations.shippingCost.toFixed(2)}` : formData.shipping_type === 'disabled' ? '—' : 'Variable'}</p></div>
                            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20"><p className="text-xs text-primary uppercase tracking-wider font-medium">Precio Final</p><p className="text-xl font-bold text-primary">€{priceCalculations.totalWithTax.toFixed(2)}</p></div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Truck className="h-5 w-5" />Configuración de Envío</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[{ value: 'standard', label: 'Estándar', desc: 'Usa tarifas globales', icon: Truck }, { value: 'free', label: 'Gratis', desc: 'Sin costo de envío', icon: CheckCircle2 }, { value: 'custom', label: 'Personalizado', desc: 'Define un costo específico', icon: DollarSign }, { value: 'disabled', label: 'Sin Envío', desc: 'Solo recogida/digital', icon: Box }].map((option) => (
                              <div key={option.value} className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${formData.shipping_type === option.value ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'}`} onClick={() => setFormData({ ...formData, shipping_type: option.value as "standard" | "free" | "custom" | "disabled" })}>
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-full ${formData.shipping_type === option.value ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><option.icon className="h-4 w-4" /></div>
                                  <div><p className="font-medium">{option.label}</p><p className="text-xs text-muted-foreground">{option.desc}</p></div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {formData.shipping_type === "custom" && (
                            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                              <Label>Costo de Envío Personalizado (€)</Label>
                              <div className="relative max-w-xs"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span><Input type="number" step="0.01" placeholder="0.00" value={formData.custom_shipping_cost ?? ''} onChange={(e) => setFormData({ ...formData, custom_shipping_cost: e.target.value === '' ? null : parseFloat(e.target.value) || 0 })} className="pl-8" /></div>
                              <p className="text-xs text-muted-foreground">Este costo se aplicará a todos los pedidos</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="customization" className="space-y-6 mt-0">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2"><Palette className="h-5 w-5" />Opciones de Personalización</CardTitle>
                          <CardDescription>Configura qué opciones pueden elegir los clientes</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between p-4 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${formData.allow_direct_purchase ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{formData.allow_direct_purchase ? <CheckCircle2 className="h-5 w-5" /> : <Info className="h-5 w-5" />}</div>
                              <div><Label className="font-medium">Permitir Compra Directa</Label><p className="text-sm text-muted-foreground">{formData.allow_direct_purchase ? 'Los clientes pueden añadir al carrito' : 'Solo disponible bajo cotización'}</p></div>
                            </div>
                            <Switch checked={formData.allow_direct_purchase} onCheckedChange={(checked) => setFormData({ ...formData, allow_direct_purchase: checked })} />
                          </div>
                          <Separator />
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg border">
                              <div><Label className="font-medium">Selección de Material</Label><p className="text-sm text-muted-foreground">El cliente puede elegir el material</p></div>
                              <Switch checked={formData.enable_material_selection} onCheckedChange={(checked) => setFormData({ ...formData, enable_material_selection: checked })} />
                            </div>
                            {formData.enable_material_selection && (
                              <div className="ml-4 p-4 bg-muted/50 rounded-lg space-y-3">
                                <Label className="font-semibold text-sm">Materiales Disponibles:</Label>
                                {materials.length === 0 ? <p className="text-sm text-muted-foreground">No hay materiales configurados</p> : (
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">{materials.map((m) => (
                                    <div key={m.id} className="flex items-center space-x-2 p-2 rounded border bg-background">
                                      <Checkbox id={`mat-${m.id}`} checked={selectedMaterials.includes(m.id)} onCheckedChange={(checked) => setSelectedMaterials(checked ? [...selectedMaterials, m.id] : selectedMaterials.filter(id => id !== m.id))} />
                                      <label htmlFor={`mat-${m.id}`} className="text-sm cursor-pointer">{m.name}</label>
                                    </div>
                                  ))}</div>
                                )}
                              </div>
                            )}
                            <div className="flex items-center justify-between p-4 rounded-lg border">
                              <div><Label className="font-medium">Selección de Color</Label><p className="text-sm text-muted-foreground">El cliente puede elegir el color</p></div>
                              <Switch checked={formData.enable_color_selection} onCheckedChange={(checked) => setFormData({ ...formData, enable_color_selection: checked })} />
                            </div>
                            {formData.enable_color_selection && (
                              <div className="ml-4 p-4 bg-muted/50 rounded-lg space-y-3">
                                <Label className="font-semibold text-sm">Colores Disponibles:</Label>
                                {colors.length === 0 ? <p className="text-sm text-muted-foreground">No hay colores configurados</p> : (
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">{colors.map((c) => (
                                    <div key={c.id} className="flex items-center space-x-2 p-2 rounded border bg-background">
                                      <Checkbox id={`color-${c.id}`} checked={selectedColors.includes(c.id)} onCheckedChange={(checked) => setSelectedColors(checked ? [...selectedColors, c.id] : selectedColors.filter(id => id !== c.id))} />
                                      <label htmlFor={`color-${c.id}`} className="text-sm flex items-center gap-2 cursor-pointer"><div className="w-4 h-4 rounded border shadow-sm" style={{ backgroundColor: c.hex_code }} />{c.name}</label>
                                    </div>
                                  ))}</div>
                                )}
                              </div>
                            )}
                            <div className="flex items-center justify-between p-4 rounded-lg border">
                              <div><Label className="font-medium">Texto Personalizado</Label><p className="text-sm text-muted-foreground">El cliente puede añadir texto propio</p></div>
                              <Switch checked={formData.enable_custom_text} onCheckedChange={(checked) => setFormData({ ...formData, enable_custom_text: checked })} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <ProductCustomizationSections productId={editingProductId} availableColors={colors.filter(c => selectedColors.includes(c.id))} onSectionsChange={setCustomizationSections} showSaveButton={!!editingProductId} />
                    </TabsContent>

                    <TabsContent value="media" className="space-y-6 mt-0">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2"><Image className="h-5 w-5" />Galería de Imágenes</CardTitle>
                          <CardDescription>Añade imágenes para mostrar el producto (máximo 7)</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {editingProductId ? (
                            <ProductImageUploader 
                              productId={editingProductId} 
                              productName={formData.name}
                              existingImages={productImages} 
                              onImagesChange={() => loadProductImages(editingProductId)} 
                            />
                          ) : (
                            <div className="text-center p-8 border-2 border-dashed rounded-lg bg-muted/30">
                              <Image className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                              <p className="text-muted-foreground">Primero guarda el producto para subir imágenes</p>
                              <Button variant="secondary" className="mt-4" onClick={() => { if (!formData.name) { toast.error("Completa el nombre del producto"); setActiveTab("basic"); return; } handleSubmit(); }}>Guardar Producto Ahora</Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2"><Video className="h-5 w-5" />Video del Producto</CardTitle>
                          <CardDescription>Añade un video promocional (máx. 20MB)</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Subir Video</Label><Input type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime" onChange={handleVideoUpload} /><p className="text-xs text-muted-foreground">Formatos: MP4, WebM, OGG, QuickTime</p></div>
                            <div className="space-y-2"><Label>O pega una URL</Label><Input value={formData.video_url || ""} onChange={(e) => setFormData({ ...formData, video_url: e.target.value || null })} placeholder="https://..." /></div>
                          </div>
                          {formData.video_url && (
                            <div className="relative w-full rounded-lg border overflow-hidden bg-black">
                              <video src={formData.video_url} controls className="w-full max-h-64">Tu navegador no soporta el video.</video>
                              <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => setFormData({ ...formData, video_url: null })}>Eliminar</Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="access" className="space-y-6 mt-0">
                      <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Shield className="h-5 w-5" />Control de Visibilidad</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          <div className={`p-4 rounded-lg border-2 ${selectedRoles.length === 0 ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50'}`}>
                            <div className="flex items-center gap-3">
                              {selectedRoles.length === 0 ? (<><Eye className="h-6 w-6 text-green-600" /><div><p className="font-medium text-green-800">Producto Público</p><p className="text-sm text-green-700">Visible para todos los usuarios</p></div></>) : (<><EyeOff className="h-6 w-6 text-amber-600" /><div><p className="font-medium text-amber-800">Producto Restringido</p><p className="text-sm text-amber-700">Solo visible para: {selectedRoles.map(r => roles.find(role => role.value === r)?.label || r).join(', ')}</p></div></>)}
                            </div>
                          </div>
                          <div className="space-y-2"><Label className="text-base font-medium">Roles con Acceso</Label><p className="text-sm text-muted-foreground">Selecciona los roles que pueden ver este producto. Dejar vacío para hacerlo público.</p></div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {roles.length === 0 ? <p className="text-sm text-muted-foreground col-span-full">No hay roles disponibles</p> : roles.map((role) => (
                              <div key={role.value} className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedRoles.includes(role.value) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`} onClick={() => { if (selectedRoles.includes(role.value)) { setSelectedRoles(selectedRoles.filter(r => r !== role.value)); } else { setSelectedRoles([...selectedRoles, role.value]); } }}>
                                <Checkbox id={`role-${role.value}`} checked={selectedRoles.includes(role.value)} onCheckedChange={(checked) => { if (checked) { setSelectedRoles([...selectedRoles, role.value]); } else { setSelectedRoles(selectedRoles.filter(r => r !== role.value)); } }} />
                                <Label htmlFor={`role-${role.value}`} className="font-normal cursor-pointer flex-1">{role.label}</Label>
                              </div>
                            ))}
                          </div>
                          {selectedRoles.length > 0 && <Button variant="outline" size="sm" onClick={() => setSelectedRoles([])} className="mt-2">Limpiar selección (hacer público)</Button>}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </div>
                </Tabs>
                
                <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
                  <div className="flex items-center gap-2 mr-auto">
                    {formData.name && <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" />{formData.name}</Badge>}
                    {formData.price > 0 && <Badge variant="outline">€{priceCalculations.totalWithTax.toFixed(2)}</Badge>}
                  </div>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSubmit} disabled={!formData.name}>{editingProductId ? 'Guardar Cambios' : 'Crear Producto'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>IVA</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Visibilidad</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No hay productos. Haz clic en "Crear Producto" para añadir uno.</TableCell></TableRow>
              ) : products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-xs font-semibold">{product.product_code || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>€{(product.price || 0).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={product.tax_enabled ? "default" : "secondary"}>{product.tax_enabled ? 'Sí' : 'No'}</Badge></TableCell>
                  <TableCell><Badge variant={product.stock > 0 ? "outline" : "destructive"}>{product.stock || 0}</Badge></TableCell>
                  <TableCell>{product.categories?.name || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell><Badge variant={product.visible_to_all !== false ? "default" : "secondary"}>{product.visible_to_all !== false ? 'Público' : 'Restringido'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={async () => {
                          const { data: productRoles } = await supabase.from("product_roles").select("role").eq("product_id", product.id);
                          const { data: productMaterials } = await supabase.from("product_materials").select("material_id").eq("product_id", product.id);
                          const { data: productColors } = await supabase.from("product_colors").select("color_id").eq("product_id", product.id);
                          setEditingProductId(product.id);
                          setFormData({ name: product.name, description: product.description || "", price: product.price || 0, stock: product.stock || 0, category_id: product.category_id || null, allow_direct_purchase: product.allow_direct_purchase ?? true, enable_material_selection: product.enable_material_selection ?? false, enable_color_selection: product.enable_color_selection ?? false, enable_custom_text: product.enable_custom_text ?? false, tax_enabled: product.tax_enabled ?? true, weight: product.weight || null, length: product.length || null, width: product.width || null, height: product.height || null, video_url: product.video_url || null, shipping_type: product.shipping_type || "standard", custom_shipping_cost: product.custom_shipping_cost || null, product_code: product.product_code || "" });
                          setSelectedRoles(productRoles?.map((r: any) => r.role) || []);
                          setSelectedMaterials(productMaterials?.map((m: any) => m.material_id) || []);
                          setSelectedColors(productColors?.map((c: any) => c.color_id) || []);
                          setActiveTab("basic");
                          await loadProductImages(product.id);
                          setIsDialogOpen(true);
                        }}><Pencil className="h-4 w-4" /></Button>
                      </TooltipTrigger><TooltipContent>Editar producto</TooltipContent></Tooltip></TooltipProvider>
                      <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Button size="sm" variant="destructive" onClick={() => deleteProduct(product.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TooltipTrigger><TooltipContent>Mover a papelera</TooltipContent></Tooltip></TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
