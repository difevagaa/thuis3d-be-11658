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
import { Pencil, Trash2, Plus, Package, DollarSign, Palette, Image, Shield, Info, Truck, Video, Box, Tag, Eye, EyeOff, CheckCircle2, Star, Zap, BarChart3, Globe, Gift, Leaf, Search, Clock, Award, AlertTriangle, FileText, Settings2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductImageUploader from "./ProductImageUploader";
import ProductCustomizationSections from "@/components/admin/ProductCustomizationSections";
import { logger } from '@/lib/logger';

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  stock: number;
  allow_direct_purchase: boolean;
  enable_material_selection: boolean;
  enable_color_selection: boolean;
  enable_custom_text: boolean;
  category_id: string | null;
  tax_enabled: boolean;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  video_url: string | null;
  shipping_type: "standard" | "free" | "custom" | "disabled";
  custom_shipping_cost: number | null;
  product_code: string;
  // Nuevas opciones
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  is_on_sale: boolean;
  sale_price: number | null;
  sale_end_date: string | null;
  sku: string | null;
  barcode: string | null;
  brand: string | null;
  manufacturer: string | null;
  origin_country: string | null;
  min_order_quantity: number;
  max_order_quantity: number | null;
  low_stock_alert: number;
  is_digital: boolean;
  digital_file_url: string | null;
  requires_shipping: boolean;
  is_fragile: boolean;
  estimated_delivery_days: number | null;
  warranty_months: number | null;
  return_policy: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  seo_slug: string | null;
  compare_at_price: number | null;
  cost_price: number | null;
  profit_margin: number | null;
  is_preorder: boolean;
  preorder_release_date: string | null;
  is_gift_wrappable: boolean;
  gift_wrap_price: number | null;
  age_restriction: number | null;
  is_eco_friendly: boolean;
  materials_info: string | null;
  care_instructions: string | null;
  display_order: number;
}

const defaultFormData: ProductFormData = {
  name: "",
  description: "",
  price: 0,
  stock: 0,
  allow_direct_purchase: true,
  enable_material_selection: false,
  enable_color_selection: false,
  enable_custom_text: false,
  category_id: null,
  tax_enabled: true,
  weight: null,
  length: null,
  width: null,
  height: null,
  video_url: null,
  shipping_type: "standard",
  custom_shipping_cost: null,
  product_code: "",
  is_featured: false,
  is_new: false,
  is_bestseller: false,
  is_on_sale: false,
  sale_price: null,
  sale_end_date: null,
  sku: null,
  barcode: null,
  brand: null,
  manufacturer: null,
  origin_country: null,
  min_order_quantity: 1,
  max_order_quantity: null,
  low_stock_alert: 5,
  is_digital: false,
  digital_file_url: null,
  requires_shipping: true,
  is_fragile: false,
  estimated_delivery_days: null,
  warranty_months: null,
  return_policy: null,
  meta_title: null,
  meta_description: null,
  meta_keywords: null,
  seo_slug: null,
  compare_at_price: null,
  cost_price: null,
  profit_margin: null,
  is_preorder: false,
  preorder_release_date: null,
  is_gift_wrappable: false,
  gift_wrap_price: null,
  age_restriction: null,
  is_eco_friendly: false,
  materials_info: null,
  care_instructions: null,
  display_order: 0,
};

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
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
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
    const costPrice = formData.cost_price || 0;
    const profitAmount = basePrice - costPrice;
    const profitPercent = costPrice > 0 ? ((profitAmount / costPrice) * 100) : 0;
    
    return {
      basePrice,
      taxAmount,
      totalWithTax,
      shippingCost,
      grandTotal: totalWithTax + shippingCost,
      profitAmount,
      profitPercent
    };
  }, [formData.price, formData.tax_enabled, formData.shipping_type, formData.custom_shipping_cost, formData.cost_price, taxRate]);

  useEffect(() => {
    loadData();
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

  const generateSeoSlug = () => {
    if (!formData.name) return;
    const slug = formData.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setFormData({ ...formData, seo_slug: slug });
    toast.success('Slug SEO generado');
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
        visible_to_all: selectedRoles.length === 0,
        sale_end_date: formData.sale_end_date ? new Date(formData.sale_end_date).toISOString() : null,
        preorder_release_date: formData.preorder_release_date ? new Date(formData.preorder_release_date).toISOString() : null,
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
    setFormData(defaultFormData);
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

  const loadProductForEdit = async (product: any) => {
    setFormData({
      name: product.name || "",
      description: product.description || "",
      price: product.price || 0,
      stock: product.stock || 0,
      allow_direct_purchase: product.allow_direct_purchase ?? true,
      enable_material_selection: product.enable_material_selection ?? false,
      enable_color_selection: product.enable_color_selection ?? false,
      enable_custom_text: product.enable_custom_text ?? false,
      category_id: product.category_id || null,
      tax_enabled: product.tax_enabled ?? true,
      weight: product.weight || null,
      length: product.length || null,
      width: product.width || null,
      height: product.height || null,
      video_url: product.video_url || null,
      shipping_type: product.shipping_type || "standard",
      custom_shipping_cost: product.custom_shipping_cost || null,
      product_code: product.product_code || "",
      is_featured: product.is_featured ?? false,
      is_new: product.is_new ?? false,
      is_bestseller: product.is_bestseller ?? false,
      is_on_sale: product.is_on_sale ?? false,
      sale_price: product.sale_price || null,
      sale_end_date: product.sale_end_date ? product.sale_end_date.split('T')[0] : null,
      sku: product.sku || null,
      barcode: product.barcode || null,
      brand: product.brand || null,
      manufacturer: product.manufacturer || null,
      origin_country: product.origin_country || null,
      min_order_quantity: product.min_order_quantity ?? 1,
      max_order_quantity: product.max_order_quantity || null,
      low_stock_alert: product.low_stock_alert ?? 5,
      is_digital: product.is_digital ?? false,
      digital_file_url: product.digital_file_url || null,
      requires_shipping: product.requires_shipping ?? true,
      is_fragile: product.is_fragile ?? false,
      estimated_delivery_days: product.estimated_delivery_days || null,
      warranty_months: product.warranty_months || null,
      return_policy: product.return_policy || null,
      meta_title: product.meta_title || null,
      meta_description: product.meta_description || null,
      meta_keywords: product.meta_keywords || null,
      seo_slug: product.seo_slug || null,
      compare_at_price: product.compare_at_price || null,
      cost_price: product.cost_price || null,
      profit_margin: product.profit_margin || null,
      is_preorder: product.is_preorder ?? false,
      preorder_release_date: product.preorder_release_date ? product.preorder_release_date.split('T')[0] : null,
      is_gift_wrappable: product.is_gift_wrappable ?? false,
      gift_wrap_price: product.gift_wrap_price || null,
      age_restriction: product.age_restriction || null,
      is_eco_friendly: product.is_eco_friendly ?? false,
      materials_info: product.materials_info || null,
      care_instructions: product.care_instructions || null,
      display_order: product.display_order ?? 0,
    });
    setEditingProductId(product.id);

    const [materialsRes, colorsRes, rolesRes] = await Promise.all([
      supabase.from("product_materials").select("material_id").eq("product_id", product.id),
      supabase.from("product_colors").select("color_id").eq("product_id", product.id),
      supabase.from("product_roles").select("role").eq("product_id", product.id)
    ]);

    setSelectedMaterials((materialsRes.data || []).map(m => m.material_id));
    setSelectedColors((colorsRes.data || []).map(c => c.color_id));
    setSelectedRoles((rolesRes.data || []).map(r => r.role));
    await loadProductImages(product.id);
    setIsDialogOpen(true);
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
              <DialogContent className="w-[calc(100vw-1rem)] sm:w-full max-w-6xl h-[95dvh] max-h-[95dvh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle className="flex items-center gap-2">
                    {editingProductId ? <><Pencil className="h-5 w-5" />Editar Producto</> : <><Plus className="h-5 w-5" />Crear Nuevo Producto</>}
                  </DialogTitle>
                  {editingProductId && <Badge variant="secondary" className="w-fit">ID: {editingProductId.slice(0, 8)}...</Badge>}
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
                  <TabsList className="w-full flex flex-nowrap items-center justify-start gap-1 mb-4 flex-shrink-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <TabsTrigger value="basic" className="flex items-center gap-1 text-xs shrink-0 min-w-[44px]"><Info className="h-3.5 w-3.5" /><span className="hidden lg:inline">Básico</span></TabsTrigger>
                    <TabsTrigger value="pricing" className="flex items-center gap-1 text-xs shrink-0 min-w-[44px]"><DollarSign className="h-3.5 w-3.5" /><span className="hidden lg:inline">Precios</span></TabsTrigger>
                    <TabsTrigger value="inventory" className="flex items-center gap-1 text-xs shrink-0 min-w-[44px]"><Box className="h-3.5 w-3.5" /><span className="hidden lg:inline">Inventario</span></TabsTrigger>
                    <TabsTrigger value="badges" className="flex items-center gap-1 text-xs shrink-0 min-w-[44px]"><Star className="h-3.5 w-3.5" /><span className="hidden lg:inline">Destacados</span></TabsTrigger>
                    <TabsTrigger value="shipping" className="flex items-center gap-1 text-xs shrink-0 min-w-[44px]"><Truck className="h-3.5 w-3.5" /><span className="hidden lg:inline">Envío</span></TabsTrigger>
                    <TabsTrigger value="seo" className="flex items-center gap-1 text-xs shrink-0 min-w-[44px]"><Search className="h-3.5 w-3.5" /><span className="hidden lg:inline">SEO</span></TabsTrigger>
                    <TabsTrigger value="media" className="flex items-center gap-1 text-xs shrink-0 min-w-[44px]"><Image className="h-3.5 w-3.5" /><span className="hidden lg:inline">Media</span></TabsTrigger>
                    <TabsTrigger value="advanced" className="flex items-center gap-1 text-xs shrink-0 min-w-[44px]"><Settings2 className="h-3.5 w-3.5" /><span className="hidden lg:inline">Avanzado</span></TabsTrigger>
                  </TabsList>

                  <ScrollArea className="flex-1 min-h-0 pr-4">
                    {/* TAB: BÁSICO */}
                    <TabsContent value="basic" className="space-y-4 mt-0">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4" />Identificación</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="name" className="text-xs">Nombre<span className="text-destructive">*</span></Label>
                              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Figura decorativa 3D" className={!formData.name ? "border-destructive/50" : ""} />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="product_code" className="text-xs">Código</Label>
                              <div className="flex gap-2">
                                <Input id="product_code" value={formData.product_code} onChange={(e) => setFormData({ ...formData, product_code: e.target.value.toUpperCase() })} placeholder="A3B7C2" maxLength={6} className="font-mono uppercase" />
                                <Button type="button" variant="secondary" onClick={generateProductCode} disabled={isGeneratingCode} size="sm">{isGeneratingCode ? '...' : 'Auto'}</Button>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="sku" className="text-xs">SKU</Label>
                              <Input id="sku" value={formData.sku || ""} onChange={(e) => setFormData({ ...formData, sku: e.target.value || null })} placeholder="SKU-001" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="category" className="text-xs">Categoría</Label>
                              <Select value={formData.category_id || undefined} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                                <SelectTrigger id="category"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                <SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="brand" className="text-xs">Marca</Label>
                              <Input id="brand" value={formData.brand || ""} onChange={(e) => setFormData({ ...formData, brand: e.target.value || null })} placeholder="Nombre de marca" />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="barcode" className="text-xs">Código de Barras</Label>
                              <Input id="barcode" value={formData.barcode || ""} onChange={(e) => setFormData({ ...formData, barcode: e.target.value || null })} placeholder="EAN/UPC" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="description" className="text-xs">Descripción</Label>
                            <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Describe las características principales..." />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4" />Personalización</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="flex items-center justify-between p-3 rounded-lg border">
                              <div>
                                <Label className="text-xs font-medium">Compra Directa</Label>
                                <p className="text-xs text-muted-foreground">{formData.allow_direct_purchase ? 'Añadir al carrito' : 'Solo cotización'}</p>
                              </div>
                              <Switch checked={formData.allow_direct_purchase} onCheckedChange={(checked) => setFormData({ ...formData, allow_direct_purchase: checked })} />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border">
                              <div>
                                <Label className="text-xs font-medium">Selección Material</Label>
                                <p className="text-xs text-muted-foreground">Cliente elige material</p>
                              </div>
                              <Switch checked={formData.enable_material_selection} onCheckedChange={(checked) => setFormData({ ...formData, enable_material_selection: checked })} />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border">
                              <div>
                                <Label className="text-xs font-medium">Selección Color</Label>
                                <p className="text-xs text-muted-foreground">Cliente elige color</p>
                              </div>
                              <Switch checked={formData.enable_color_selection} onCheckedChange={(checked) => setFormData({ ...formData, enable_color_selection: checked })} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg border">
                            <div>
                              <Label className="text-xs font-medium">Texto Personalizado</Label>
                              <p className="text-xs text-muted-foreground">Cliente añade texto propio</p>
                            </div>
                            <Switch checked={formData.enable_custom_text} onCheckedChange={(checked) => setFormData({ ...formData, enable_custom_text: checked })} />
                          </div>
                          {formData.enable_material_selection && materials.length > 0 && (
                            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                              <Label className="text-xs font-semibold">Materiales Disponibles:</Label>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{materials.map((m) => (
                                <div key={m.id} className="flex items-center space-x-2 p-2 rounded border bg-background">
                                  <Checkbox id={`mat-${m.id}`} checked={selectedMaterials.includes(m.id)} onCheckedChange={(checked) => setSelectedMaterials(checked ? [...selectedMaterials, m.id] : selectedMaterials.filter(id => id !== m.id))} />
                                  <label htmlFor={`mat-${m.id}`} className="text-xs cursor-pointer">{m.name}</label>
                                </div>
                              ))}</div>
                            </div>
                          )}
                          {formData.enable_color_selection && colors.length > 0 && (
                            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                              <Label className="text-xs font-semibold">Colores Disponibles:</Label>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{colors.map((c) => (
                                <div key={c.id} className="flex items-center space-x-2 p-2 rounded border bg-background">
                                  <Checkbox id={`color-${c.id}`} checked={selectedColors.includes(c.id)} onCheckedChange={(checked) => setSelectedColors(checked ? [...selectedColors, c.id] : selectedColors.filter(id => id !== c.id))} />
                                  <label htmlFor={`color-${c.id}`} className="text-xs flex items-center gap-2 cursor-pointer"><div className="w-3 h-3 rounded border shadow-sm" style={{ backgroundColor: c.hex_code }} />{c.name}</label>
                                </div>
                              ))}</div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <ProductCustomizationSections productId={editingProductId} availableColors={colors.filter(c => selectedColors.includes(c.id))} onSectionsChange={setCustomizationSections} showSaveButton={!!editingProductId} />

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Acceso por Rol</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground mb-3">Sin roles = visible para todos</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {roles.map(role => (
                              <div key={role.value} className="flex items-center space-x-2 p-2 rounded border bg-background">
                                <Checkbox id={`role-${role.value}`} checked={selectedRoles.includes(role.value)} onCheckedChange={(checked) => setSelectedRoles(checked ? [...selectedRoles, role.value] : selectedRoles.filter(r => r !== role.value))} />
                                <label htmlFor={`role-${role.value}`} className="text-xs cursor-pointer">{role.label}</label>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* TAB: PRECIOS */}
                    <TabsContent value="pricing" className="space-y-4 mt-0">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" />Precios</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="price" className="text-xs">Precio Base (€)<span className="text-destructive">*</span></Label>
                              <Input id="price" type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} min="0" />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="compare_at_price" className="text-xs">Precio Comparación (€)</Label>
                              <Input id="compare_at_price" type="number" step="0.01" value={formData.compare_at_price || ""} onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value ? parseFloat(e.target.value) : null })} placeholder="Antes" />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="cost_price" className="text-xs">Precio Costo (€)</Label>
                              <Input id="cost_price" type="number" step="0.01" value={formData.cost_price || ""} onChange={(e) => setFormData({ ...formData, cost_price: e.target.value ? parseFloat(e.target.value) : null })} placeholder="Costo" />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="sale_price" className="text-xs">Precio Oferta (€)</Label>
                              <Input id="sale_price" type="number" step="0.01" value={formData.sale_price || ""} onChange={(e) => setFormData({ ...formData, sale_price: e.target.value ? parseFloat(e.target.value) : null })} placeholder="Descuento" disabled={!formData.is_on_sale} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg border">
                            <div>
                              <Label className="text-xs font-medium">Aplicar IVA ({taxRate}%)</Label>
                              <p className="text-xs text-muted-foreground">{formData.tax_enabled ? 'IVA incluido' : 'Exento'}</p>
                            </div>
                            <Switch checked={formData.tax_enabled} onCheckedChange={(checked) => setFormData({ ...formData, tax_enabled: checked })} />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Resumen</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="p-2 rounded-lg bg-background border text-center">
                              <p className="text-[10px] text-muted-foreground uppercase">Base</p>
                              <p className="text-lg font-bold">€{priceCalculations.basePrice.toFixed(2)}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-background border text-center">
                              <p className="text-[10px] text-muted-foreground uppercase">IVA</p>
                              <p className="text-lg font-bold">{formData.tax_enabled ? `€${priceCalculations.taxAmount.toFixed(2)}` : '—'}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-background border text-center">
                              <p className="text-[10px] text-muted-foreground uppercase">Costo</p>
                              <p className="text-lg font-bold">{formData.cost_price ? `€${formData.cost_price.toFixed(2)}` : '—'}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-background border text-center">
                              <p className="text-[10px] text-muted-foreground uppercase">Margen</p>
                              <p className="text-lg font-bold text-green-600">{formData.cost_price ? `${priceCalculations.profitPercent.toFixed(0)}%` : '—'}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-center">
                              <p className="text-[10px] text-primary uppercase font-medium">Final</p>
                              <p className="text-lg font-bold text-primary">€{priceCalculations.totalWithTax.toFixed(2)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* TAB: INVENTARIO */}
                    <TabsContent value="inventory" className="space-y-4 mt-0">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><Box className="h-4 w-4" />Stock</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="stock" className="text-xs">Stock Disponible</Label>
                              <Input id="stock" type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })} min="0" />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="low_stock_alert" className="text-xs">Alerta Stock Bajo</Label>
                              <Input id="low_stock_alert" type="number" value={formData.low_stock_alert} onChange={(e) => setFormData({ ...formData, low_stock_alert: parseInt(e.target.value) || 5 })} min="0" />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="min_order_quantity" className="text-xs">Cantidad Mínima</Label>
                              <Input id="min_order_quantity" type="number" value={formData.min_order_quantity} onChange={(e) => setFormData({ ...formData, min_order_quantity: parseInt(e.target.value) || 1 })} min="1" />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="max_order_quantity" className="text-xs">Cantidad Máxima</Label>
                              <Input id="max_order_quantity" type="number" value={formData.max_order_quantity || ""} onChange={(e) => setFormData({ ...formData, max_order_quantity: e.target.value ? parseInt(e.target.value) : null })} placeholder="Sin límite" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" />Origen y Fabricante</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="manufacturer" className="text-xs">Fabricante</Label>
                              <Input id="manufacturer" value={formData.manufacturer || ""} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value || null })} placeholder="Nombre del fabricante" />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="origin_country" className="text-xs">País de Origen</Label>
                              <Input id="origin_country" value={formData.origin_country || ""} onChange={(e) => setFormData({ ...formData, origin_country: e.target.value || null })} placeholder="Ej: España" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><Box className="h-4 w-4" />Dimensiones y Peso</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1.5"><Label className="text-xs">Peso (g)</Label><Input type="number" step="0.01" placeholder="250" value={formData.weight || ""} onChange={(e) => setFormData({ ...formData, weight: e.target.value ? parseFloat(e.target.value) : null })} /></div>
                            <div className="space-y-1.5"><Label className="text-xs">Largo (cm)</Label><Input type="number" step="0.01" placeholder="15" value={formData.length || ""} onChange={(e) => setFormData({ ...formData, length: e.target.value ? parseFloat(e.target.value) : null })} /></div>
                            <div className="space-y-1.5"><Label className="text-xs">Ancho (cm)</Label><Input type="number" step="0.01" placeholder="10" value={formData.width || ""} onChange={(e) => setFormData({ ...formData, width: e.target.value ? parseFloat(e.target.value) : null })} /></div>
                            <div className="space-y-1.5"><Label className="text-xs">Alto (cm)</Label><Input type="number" step="0.01" placeholder="5" value={formData.height || ""} onChange={(e) => setFormData({ ...formData, height: e.target.value ? parseFloat(e.target.value) : null })} /></div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* TAB: DESTACADOS */}
                    <TabsContent value="badges" className="space-y-4 mt-0">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4" />Etiquetas de Producto</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${formData.is_featured ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' : ''}`} onClick={() => setFormData({ ...formData, is_featured: !formData.is_featured })}>
                              <div className="flex items-center gap-2">
                                <Star className={`h-4 w-4 ${formData.is_featured ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                                <span className="text-xs font-medium">Destacado</span>
                              </div>
                              <Switch checked={formData.is_featured} onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })} />
                            </div>
                            <div className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${formData.is_new ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : ''}`} onClick={() => setFormData({ ...formData, is_new: !formData.is_new })}>
                              <div className="flex items-center gap-2">
                                <Zap className={`h-4 w-4 ${formData.is_new ? 'text-blue-500' : 'text-muted-foreground'}`} />
                                <span className="text-xs font-medium">Nuevo</span>
                              </div>
                              <Switch checked={formData.is_new} onCheckedChange={(checked) => setFormData({ ...formData, is_new: checked })} />
                            </div>
                            <div className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${formData.is_bestseller ? 'border-purple-500 bg-purple-50 dark:bg-purple-950' : ''}`} onClick={() => setFormData({ ...formData, is_bestseller: !formData.is_bestseller })}>
                              <div className="flex items-center gap-2">
                                <Award className={`h-4 w-4 ${formData.is_bestseller ? 'text-purple-500' : 'text-muted-foreground'}`} />
                                <span className="text-xs font-medium">Más Vendido</span>
                              </div>
                              <Switch checked={formData.is_bestseller} onCheckedChange={(checked) => setFormData({ ...formData, is_bestseller: checked })} />
                            </div>
                            <div className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${formData.is_eco_friendly ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`} onClick={() => setFormData({ ...formData, is_eco_friendly: !formData.is_eco_friendly })}>
                              <div className="flex items-center gap-2">
                                <Leaf className={`h-4 w-4 ${formData.is_eco_friendly ? 'text-green-500' : 'text-muted-foreground'}`} />
                                <span className="text-xs font-medium">Ecológico</span>
                              </div>
                              <Switch checked={formData.is_eco_friendly} onCheckedChange={(checked) => setFormData({ ...formData, is_eco_friendly: checked })} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4" />Oferta / Descuento</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className={`flex items-center justify-between p-3 rounded-lg border ${formData.is_on_sale ? 'border-red-500 bg-red-50 dark:bg-red-950' : ''}`}>
                            <div className="flex items-center gap-2">
                              <Tag className={`h-4 w-4 ${formData.is_on_sale ? 'text-red-500' : 'text-muted-foreground'}`} />
                              <span className="text-xs font-medium">En Oferta</span>
                            </div>
                            <Switch checked={formData.is_on_sale} onCheckedChange={(checked) => setFormData({ ...formData, is_on_sale: checked })} />
                          </div>
                          {formData.is_on_sale && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Precio de Oferta (€)</Label>
                                <Input type="number" step="0.01" value={formData.sale_price || ""} onChange={(e) => setFormData({ ...formData, sale_price: e.target.value ? parseFloat(e.target.value) : null })} placeholder="Precio con descuento" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Fin de Oferta</Label>
                                <Input type="date" value={formData.sale_end_date || ""} onChange={(e) => setFormData({ ...formData, sale_end_date: e.target.value || null })} />
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Pre-orden</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className={`flex items-center justify-between p-3 rounded-lg border ${formData.is_preorder ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' : ''}`}>
                            <div className="flex items-center gap-2">
                              <Clock className={`h-4 w-4 ${formData.is_preorder ? 'text-orange-500' : 'text-muted-foreground'}`} />
                              <span className="text-xs font-medium">Pre-orden</span>
                            </div>
                            <Switch checked={formData.is_preorder} onCheckedChange={(checked) => setFormData({ ...formData, is_preorder: checked })} />
                          </div>
                          {formData.is_preorder && (
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <Label className="text-xs">Fecha de Lanzamiento</Label>
                              <Input type="date" value={formData.preorder_release_date || ""} onChange={(e) => setFormData({ ...formData, preorder_release_date: e.target.value || null })} className="mt-1.5" />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* TAB: ENVÍO */}
                    <TabsContent value="shipping" className="space-y-4 mt-0">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" />Tipo de Envío</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[{ value: 'standard', label: 'Estándar', desc: 'Tarifas globales', icon: Truck }, { value: 'free', label: 'Gratis', desc: 'Sin costo', icon: CheckCircle2 }, { value: 'custom', label: 'Personalizado', desc: 'Costo específico', icon: DollarSign }, { value: 'disabled', label: 'Sin Envío', desc: 'Digital/Recogida', icon: Box }].map((option) => (
                              <div key={option.value} className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.shipping_type === option.value ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'}`} onClick={() => setFormData({ ...formData, shipping_type: option.value as any })}>
                                <div className="flex flex-col items-center text-center gap-2">
                                  <div className={`p-2 rounded-full ${formData.shipping_type === option.value ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><option.icon className="h-4 w-4" /></div>
                                  <div><p className="text-xs font-medium">{option.label}</p><p className="text-[10px] text-muted-foreground">{option.desc}</p></div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {formData.shipping_type === "custom" && (
                            <div className="p-3 rounded-lg bg-muted/50 space-y-1.5">
                              <Label className="text-xs">Costo de Envío (€)</Label>
                              <Input type="number" step="0.01" placeholder="0.00" value={formData.custom_shipping_cost ?? ''} onChange={(e) => setFormData({ ...formData, custom_shipping_cost: e.target.value === '' ? null : parseFloat(e.target.value) || 0 })} className="max-w-xs" />
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Opciones de Envío</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="flex items-center justify-between p-3 rounded-lg border">
                              <div>
                                <Label className="text-xs font-medium">Requiere Envío</Label>
                                <p className="text-xs text-muted-foreground">{formData.requires_shipping ? 'Físico' : 'Digital'}</p>
                              </div>
                              <Switch checked={formData.requires_shipping} onCheckedChange={(checked) => setFormData({ ...formData, requires_shipping: checked })} />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border">
                              <div>
                                <Label className="text-xs font-medium">Producto Frágil</Label>
                                <p className="text-xs text-muted-foreground">{formData.is_fragile ? 'Manejo especial' : 'Normal'}</p>
                              </div>
                              <Switch checked={formData.is_fragile} onCheckedChange={(checked) => setFormData({ ...formData, is_fragile: checked })} />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border">
                              <div>
                                <Label className="text-xs font-medium">Producto Digital</Label>
                                <p className="text-xs text-muted-foreground">{formData.is_digital ? 'Descarga' : 'Físico'}</p>
                              </div>
                              <Switch checked={formData.is_digital} onCheckedChange={(checked) => setFormData({ ...formData, is_digital: checked, requires_shipping: !checked })} />
                            </div>
                          </div>
                          {formData.is_digital && (
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <Label className="text-xs">URL del Archivo Digital</Label>
                              <Input value={formData.digital_file_url || ""} onChange={(e) => setFormData({ ...formData, digital_file_url: e.target.value || null })} placeholder="https://..." className="mt-1.5" />
                            </div>
                          )}
                          <div className="space-y-1.5">
                            <Label className="text-xs">Días Estimados de Entrega</Label>
                            <Input type="number" value={formData.estimated_delivery_days || ""} onChange={(e) => setFormData({ ...formData, estimated_delivery_days: e.target.value ? parseInt(e.target.value) : null })} placeholder="Ej: 3" className="max-w-xs" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><Gift className="h-4 w-4" />Envoltorio de Regalo</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between p-3 rounded-lg border">
                            <div>
                              <Label className="text-xs font-medium">Envoltorio Disponible</Label>
                              <p className="text-xs text-muted-foreground">{formData.is_gift_wrappable ? 'Sí' : 'No'}</p>
                            </div>
                            <Switch checked={formData.is_gift_wrappable} onCheckedChange={(checked) => setFormData({ ...formData, is_gift_wrappable: checked })} />
                          </div>
                          {formData.is_gift_wrappable && (
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <Label className="text-xs">Costo de Envoltorio (€)</Label>
                              <Input type="number" step="0.01" value={formData.gift_wrap_price || ""} onChange={(e) => setFormData({ ...formData, gift_wrap_price: e.target.value ? parseFloat(e.target.value) : null })} placeholder="0.00" className="mt-1.5 max-w-xs" />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* TAB: SEO */}
                    <TabsContent value="seo" className="space-y-4 mt-0">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4" />Meta Tags SEO</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Slug URL</Label>
                              <Button type="button" variant="ghost" size="sm" onClick={generateSeoSlug} className="h-6 text-xs">Generar</Button>
                            </div>
                            <Input value={formData.seo_slug || ""} onChange={(e) => setFormData({ ...formData, seo_slug: e.target.value || null })} placeholder="mi-producto-increible" />
                            <p className="text-[10px] text-muted-foreground">URL: /producto/{formData.seo_slug || 'slug'}</p>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Título Meta (máx 60 caracteres)</Label>
                            <Input value={formData.meta_title || ""} onChange={(e) => setFormData({ ...formData, meta_title: e.target.value || null })} placeholder="Título para Google" maxLength={60} />
                            <p className="text-[10px] text-muted-foreground">{(formData.meta_title || '').length}/60</p>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Descripción Meta (máx 160 caracteres)</Label>
                            <Textarea value={formData.meta_description || ""} onChange={(e) => setFormData({ ...formData, meta_description: e.target.value || null })} placeholder="Descripción para Google" rows={2} maxLength={160} />
                            <p className="text-[10px] text-muted-foreground">{(formData.meta_description || '').length}/160</p>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Palabras Clave</Label>
                            <Input value={formData.meta_keywords || ""} onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value || null })} placeholder="palabra1, palabra2, palabra3" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" />Vista Previa Google</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="p-4 bg-white dark:bg-background rounded-lg border">
                            <p className="text-blue-600 text-lg hover:underline cursor-pointer">{formData.meta_title || formData.name || 'Título del producto'}</p>
                            <p className="text-green-700 text-sm">{window.location.origin}/producto/{formData.seo_slug || 'slug'}</p>
                            <p className="text-gray-600 text-sm">{formData.meta_description || formData.description?.slice(0, 160) || 'Descripción del producto...'}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* TAB: MEDIA */}
                    <TabsContent value="media" className="space-y-4 mt-0">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><Image className="h-4 w-4" />Imágenes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {editingProductId ? (
                            <ProductImageUploader productId={editingProductId} productName={formData.name} existingImages={productImages} onImagesChange={() => loadProductImages(editingProductId)} />
                          ) : (
                            <div className="text-center p-6 border-2 border-dashed rounded-lg bg-muted/30">
                              <Image className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                              <p className="text-xs text-muted-foreground">Guarda primero para subir imágenes</p>
                              <Button variant="secondary" className="mt-3" size="sm" onClick={() => { if (!formData.name) { toast.error("Completa el nombre"); setActiveTab("basic"); return; } handleSubmit(); }}>Guardar Ahora</Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><Video className="h-4 w-4" />Video</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Subir Video (máx 20MB)</Label>
                              <Input type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime" onChange={handleVideoUpload} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">O URL externa</Label>
                              <Input value={formData.video_url || ""} onChange={(e) => setFormData({ ...formData, video_url: e.target.value || null })} placeholder="https://..." />
                            </div>
                          </div>
                          {formData.video_url && (
                            <div className="relative w-full rounded-lg border overflow-hidden bg-black">
                              <video src={formData.video_url} controls className="w-full max-h-48">Tu navegador no soporta el video.</video>
                              <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => setFormData({ ...formData, video_url: null })}>Eliminar</Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* TAB: AVANZADO */}
                    <TabsContent value="advanced" className="space-y-4 mt-0">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" />Garantía y Devoluciones</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Meses de Garantía</Label>
                              <Input type="number" value={formData.warranty_months || ""} onChange={(e) => setFormData({ ...formData, warranty_months: e.target.value ? parseInt(e.target.value) : null })} placeholder="12" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Restricción de Edad</Label>
                              <Input type="number" value={formData.age_restriction || ""} onChange={(e) => setFormData({ ...formData, age_restriction: e.target.value ? parseInt(e.target.value) : null })} placeholder="+18" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Política de Devolución</Label>
                            <Textarea value={formData.return_policy || ""} onChange={(e) => setFormData({ ...formData, return_policy: e.target.value || null })} placeholder="Describe tu política de devolución..." rows={2} />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Información Adicional</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Materiales Utilizados</Label>
                            <Textarea value={formData.materials_info || ""} onChange={(e) => setFormData({ ...formData, materials_info: e.target.value || null })} placeholder="Ej: PLA biodegradable, ABS resistente..." rows={2} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Instrucciones de Cuidado</Label>
                            <Textarea value={formData.care_instructions || ""} onChange={(e) => setFormData({ ...formData, care_instructions: e.target.value || null })} placeholder="Ej: No exponer al sol directo..." rows={2} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Orden de Visualización</Label>
                            <Input type="number" value={formData.display_order} onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })} placeholder="0" className="max-w-xs" />
                            <p className="text-[10px] text-muted-foreground">Menor número = aparece primero</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </ScrollArea>
                </Tabs>

                <DialogFooter className="flex-shrink-0 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSubmit} disabled={!formData.name}>{editingProductId ? 'Actualizar' : 'Crear'} Producto</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Código</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-xs">{product.product_code || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{product.name}</span>
                      <div className="flex gap-1">
                        {product.is_featured && <Badge variant="secondary" className="text-[10px] px-1 py-0"><Star className="h-2.5 w-2.5" /></Badge>}
                        {product.is_new && <Badge className="text-[10px] px-1 py-0 bg-blue-500">Nuevo</Badge>}
                        {product.is_on_sale && <Badge className="text-[10px] px-1 py-0 bg-red-500">Oferta</Badge>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{product.categories?.name || '—'}</TableCell>
                  <TableCell className="text-right">
                    {product.is_on_sale && product.sale_price ? (
                      <div>
                        <span className="text-red-500 font-medium">€{product.sale_price}</span>
                        <span className="text-muted-foreground line-through text-xs ml-1">€{product.price}</span>
                      </div>
                    ) : (
                      <span className="font-medium">€{product.price}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={product.stock <= (product.low_stock_alert || 5) ? 'text-red-500 font-medium' : ''}>{product.stock}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {product.allow_direct_purchase ? <Badge variant="secondary" className="text-[10px]"><Eye className="h-2.5 w-2.5 mr-1" />Visible</Badge> : <Badge variant="outline" className="text-[10px]"><EyeOff className="h-2.5 w-2.5 mr-1" />Cotización</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => loadProductForEdit(product)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteProduct(product.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay productos. ¡Crea tu primer producto!</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}