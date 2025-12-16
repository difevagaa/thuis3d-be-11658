import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Filter, Layers, Box, Euro, ArrowUpDown, Package, Search, X, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProductCard } from "@/components/ProductCard";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const Products = () => {
  const { t } = useTranslation('products');
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
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    loadData();

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

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(rolesChannel);
    };
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, selectedCategory, selectedMaterial, priceRange, sortBy, searchedByCode]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let userRoles: string[] = [];
      if (user) {
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        
        userRoles = (rolesData || [])
          .map(r => String(r.role || '').trim().toLowerCase())
          .filter(role => role.length > 0);
      }

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*, product_roles(role), product_images(image_url, display_order)")
        .is("deleted_at", null);
      
      if (productsError) throw productsError;

      const visibleProducts = (productsData || []).filter((product: any) => {
        const productRolesList = product.product_roles || [];
        const productRolesNormalized = productRolesList
          .map((pr: any) => String(pr?.role || '').trim().toLowerCase())
          .filter((role: string) => role.length > 0);
        
        if (productRolesNormalized.length === 0) {
          return true;
        }
        
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
      toast.error("Error al cargar datos");
    }
  };

  const searchByProductCode = async () => {
    const code = productCodeSearch.trim().toUpperCase();
    
    if (!code) {
      toast.error("Por favor ingresa un código de producto");
      return;
    }

    try {
      const { data: productData, error } = await supabase
        .from("products")
        .select("*, product_roles(role), product_images(image_url, display_order)")
        .eq("product_code", code)
        .is("deleted_at", null)
        .single();

      if (error || !productData) {
        toast.error("No se encontró ningún producto con ese código");
        return;
      }
      
      setProducts([productData]);
      setSearchedByCode(true);
      toast.success(`Producto encontrado: ${productData.name}`);
    } catch (error) {
      toast.error("Error al buscar el producto");
    }
  };

  const clearCodeSearch = () => {
    setProductCodeSearch("");
    setSearchedByCode(false);
    loadData();
    toast.info("Búsqueda por código eliminada");
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

  const resetFilters = () => {
    setSelectedCategory("all");
    setSelectedMaterial("all");
    setPriceRange([0, 1000]);
    setSortBy("newest");
  };

  const FilterContent = () => (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm">{t('filters.category')}</Label>
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="h-10 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-sm">{t('filters.all')}</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id} className="text-sm">{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Box className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm">{t('filters.material')}</Label>
        </div>
        <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
          <SelectTrigger className="h-10 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-sm">{t('filters.all')}</SelectItem>
            {materials.map(mat => (
              <SelectItem key={mat.id} value={mat.id} className="text-sm">{mat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Euro className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm">{t('filters.priceRange')}: €{priceRange[0]} - €{priceRange[1]}</Label>
        </div>
        <Slider
          min={0}
          max={1000}
          step={10}
          value={priceRange}
          onValueChange={setPriceRange}
          className="mt-2"
        />
      </div>

      <Button variant="outline" onClick={resetFilters} className="w-full">
        {t('filters.reset', 'Restablecer filtros')}
      </Button>
    </div>
  );

  return (
    <div className="w-full px-2 sm:px-4 md:container md:mx-auto md:px-4 py-3 md:py-6">
      {/* Header - Compact on mobile */}
      <div className="flex items-center gap-2 mb-3">
        <Package className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
        <h1 className="text-base md:text-2xl font-bold">{t('title')}</h1>
      </div>

      {/* Search by Code - Compact */}
      <Card className="mb-3 bg-primary/5 border-primary/20">
        <CardContent className="p-2.5 md:p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder={t('searchByCode.placeholder')}
                value={productCodeSearch}
                onChange={(e) => setProductCodeSearch(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && searchByProductCode()}
                className="flex-1 uppercase font-mono h-9 text-sm"
                disabled={searchedByCode}
              />
              {searchedByCode ? (
                <Button 
                  onClick={clearCodeSearch}
                  variant="destructive"
                  size="sm"
                  className="h-9 px-3"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  onClick={searchByProductCode}
                  size="sm"
                  className="h-9 px-3"
                >
                  <Search className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Mobile: Filter button + Sort + Count */}
      <div className="flex items-center justify-between gap-2 mb-3 md:hidden">
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="text-xs">{t('filters.title')}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {t('filters.title')}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {filteredProducts.length} {t('productsFound')}
          </span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[100px] h-9 text-xs">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest" className="text-xs">{t('sort.newest')}</SelectItem>
              <SelectItem value="price-asc" className="text-xs">{t('sort.priceAsc')}</SelectItem>
              <SelectItem value="price-desc" className="text-xs">{t('sort.priceDesc')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        {/* Desktop Filters Sidebar */}
        <aside className="hidden md:block w-full lg:w-56 xl:w-64 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Filter className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">{t('filters.title')}</h3>
              </div>
              <FilterContent />
            </CardContent>
          </Card>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {/* Desktop: Count + Sort */}
          <div className="hidden md:flex justify-between items-center mb-4">
            <p className="text-muted-foreground text-sm flex items-center gap-1">
              <Package className="h-4 w-4" />
              {filteredProducts.length} {t('productsFound')}
            </p>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48 h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest" className="text-sm">{t('sort.newest')}</SelectItem>
                  <SelectItem value="price-asc" className="text-sm">{t('sort.priceAsc')}</SelectItem>
                  <SelectItem value="price-desc" className="text-sm">{t('sort.priceDesc')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products Grid - 2 columns mobile, 3-4 desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            {filteredProducts.map((product) => {
              const firstImage = product.product_images?.find((img: any) => img.display_order === 0)?.image_url 
                || product.product_images?.[0]?.image_url;
              
              return (
                <ProductCard key={product.id} product={product} firstImage={firstImage} />
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">{t('noProducts')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;
