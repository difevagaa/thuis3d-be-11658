import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Printer, Filter, Layers, Box, Euro, ArrowUpDown, ShoppingCart, Package, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";
import { ProductCard } from "@/components/ProductCard";

const Products = () => {
  const { t, i18n } = useTranslation('products');
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedMaterial, setSelectedMaterial] = useState<string>("all");
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [sortBy, setSortBy] = useState("newest");
  const [productCodeSearch, setProductCodeSearch] = useState<string>("");
  const [searchedByCode, setSearchedByCode] = useState<boolean>(false);

  useEffect(() => {
    loadData();

    // Subscribe to auth state changes to reload products with correct filtering
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      // Reload products when user logs in/out to show correct role-based products
      loadData();
    });

    // Subscribe to product changes for real-time updates
    const productsChannel = supabase
      .channel('products-list-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'products'
      }, loadData)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'product_images'
      }, loadData)
      .subscribe();

    // Subscribe to user_roles changes to reload products with correct filtering
    const rolesChannel = supabase
      .channel('products-roles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_roles'
      }, () => {
        loadData();
      })
      .subscribe();

    // Subscribe to product_roles changes to update visibility immediately
    const productRolesChannel = supabase
      .channel('products-product-roles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'product_roles'
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      authSubscription.unsubscribe();
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(rolesChannel);
      supabase.removeChannel(productRolesChannel);
    };
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, selectedCategory, selectedMaterial, priceRange, sortBy, searchedByCode]);

  const loadData = async () => {
    try {
      // First, ensure session is valid by calling getSession() 
      // This will auto-refresh the token if needed
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Get user from the session (already validated)
      const user = session?.user ?? null;
      
      // Get user roles if logged in (only if session is valid)
      let userRoles: string[] = [];
      if (user && !sessionError) {
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        
        userRoles = (rolesData || [])
          .map(r => String(r.role || '').trim().toLowerCase())
          .filter(role => role.length > 0);
      }

      // Fetch products - this should always succeed regardless of auth state
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*, product_roles(role), product_images(image_url, display_order)")
        .is("deleted_at", null);
      
      if (productsError) throw productsError;

      // NUEVA LÓGICA: Productos SIN roles → visibles para TODOS
      //               Productos CON roles → solo para usuarios con esos roles
      const visibleProducts = (productsData || []).filter((product: any) => {
        const productRolesList = product.product_roles || [];
        const productRolesNormalized = productRolesList
          .map((pr: any) => String(pr?.role || '').trim().toLowerCase())
          .filter((role: string) => role.length > 0);
        
        // Si NO tiene roles asignados → visible para TODOS (incluido sin login)
        if (productRolesNormalized.length === 0) {
          return true;
        }
        
        // Si tiene roles asignados → solo visible para usuarios con esos roles
        if (!user || userRoles.length === 0) {
          return false;
        }
        
        const hasMatchingRole = productRolesNormalized.some((productRole: string) => 
          userRoles.includes(productRole)
        );
        
        return hasMatchingRole;
      });

      const [categoriesRes, materialsRes] = await Promise.all([
        supabase.from("categories").select("*").is("deleted_at", null),
        supabase.from("materials").select("*").is("deleted_at", null)
      ]);
      
      setProducts(visibleProducts);
      setCategories(categoriesRes.data || []);
      setMaterials(materialsRes.data || []);
    } catch (error) {
      i18nToast.error("error.loadingFailed");
    }
  };

  const searchByProductCode = async () => {
    const code = productCodeSearch.trim().toUpperCase();
    
    if (!code) {
      i18nToast.error("error.enterProductCode");
      return;
    }

    try {
      // Búsqueda directa por código - IGNORA restricciones de roles
      const { data: productData, error } = await supabase
        .from("products")
        .select("*, product_roles(role), product_images(image_url, display_order)")
        .eq("product_code", code)
        .is("deleted_at", null)
        .single();

      if (error || !productData) {
        i18nToast.error("error.productNotFound");
        return;
      }
      
      // Establecer SOLO este producto como resultado
      setProducts([productData]);
      setSearchedByCode(true);
      toast.success(`Producto encontrado: ${productData.name}`);
    } catch (error) {
      i18nToast.error("error.productSearchFailed");
    }
  };

  const clearCodeSearch = () => {
    setProductCodeSearch("");
    setSearchedByCode(false);
    loadData(); // Recargar productos normales
    i18nToast.info("info.codeSearchCleared");
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];

    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }

    filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    setFilteredProducts(filtered);
  };

  return (
    <div className="container mx-auto px-3 md:px-4 py-4 md:py-6 lg:py-8">
      <div className="flex items-center gap-2 mb-3 md:mb-4 lg:mb-6">
        <Package className="h-6 w-6 md:h-8 md:w-8 text-primary" />
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">{t('title')}</h1>
      </div>

      {/* Búsqueda por Código de Producto */}
      <Card className="mb-4 md:mb-6 bg-primary/5 border-primary/20">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">{t('searchByCode.title')}</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('searchByCode.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder={t('searchByCode.placeholder')}
                value={productCodeSearch}
                onChange={(e) => setProductCodeSearch(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && searchByProductCode()}
                className="flex-1 uppercase font-mono"
                disabled={searchedByCode}
              />
              {searchedByCode ? (
                <Button 
                  onClick={clearCodeSearch}
                  variant="destructive"
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  {t('searchByCode.clear')}
                </Button>
              ) : (
                <Button 
                  onClick={searchByProductCode}
                  className="gap-2"
                >
                  <Search className="h-4 w-4" />
                  {t('searchByCode.search')}
                </Button>
              )}
            </div>
            {searchedByCode && (
              <div className="bg-success/10 border border-success/30 rounded-md p-2 mt-2">
                <p className="text-xs text-success font-medium">
                  {t('searchByCode.success')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        <aside className="w-full lg:w-64 space-y-3 md:space-y-4 lg:space-y-6">
          <Card>
            <CardContent className="p-3 md:p-4 space-y-3 md:space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Filter className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm md:text-base">{t('filters.title')}</h3>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                  <Label className="text-xs md:text-sm">{t('filters.category')}</Label>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs md:text-sm">{t('filters.all')}</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id} className="text-xs md:text-sm">{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Box className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                  <Label className="text-xs md:text-sm">{t('filters.material')}</Label>
                </div>
                <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                  <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs md:text-sm">{t('filters.all')}</SelectItem>
                    {materials.map(mat => (
                      <SelectItem key={mat.id} value={mat.id} className="text-xs md:text-sm">{mat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Euro className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                  <Label className="text-xs md:text-sm">{t('filters.priceRange')}: €{priceRange[0]} - €{priceRange[1]}</Label>
                </div>
                <Slider
                  min={0}
                  max={1000}
                  step={10}
                  value={priceRange}
                  onValueChange={setPriceRange}
                  className="mt-1 md:mt-2"
                />
              </div>
            </CardContent>
          </Card>
        </aside>

          <div className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 md:mb-4 lg:mb-6 gap-2">
            <p className="text-muted-foreground text-xs md:text-sm flex items-center gap-1">
              <Package className="h-3 w-3 md:h-4 md:w-4" />
              {filteredProducts.length} {t('productsFound')}
            </p>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <ArrowUpDown className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-40 md:w-48 h-8 md:h-10 text-xs md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest" className="text-xs md:text-sm">{t('sort.newest')}</SelectItem>
                  <SelectItem value="price-asc" className="text-xs md:text-sm">{t('sort.priceAsc')}</SelectItem>
                  <SelectItem value="price-desc" className="text-xs md:text-sm">{t('sort.priceDesc')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
            {filteredProducts.map((product) => {
              const firstImage = product.product_images?.find((img: any) => img.display_order === 0)?.image_url 
                || product.product_images?.[0]?.image_url;
              
              return (
                <ProductCard key={product.id} product={product} firstImage={firstImage} />
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <p className="text-center text-muted-foreground py-8 md:py-12 text-sm md:text-base">
              {t('noProducts')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;
