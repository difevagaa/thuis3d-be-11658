import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, MessageSquare, Check, Plus, Minus, Leaf, Gift, Star, Sparkles, TrendingUp, Clock, Shield, Truck, Package, Info, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ProductReviews from "@/components/ProductReviews";
import { useMaterialColors } from "@/hooks/useMaterialColors";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";
import { RichTextDisplay } from "@/components/RichTextDisplay";
import { StockIndicator } from "@/components/StockIndicator";
import type { ColorSelection } from "@/hooks/useCart";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ShareProduct } from "@/components/ShareProduct";
import { WishlistButton } from "@/components/WishlistButton";
import { SaleCountdown } from "@/components/SaleCountdown";
import { DeliveryEstimate } from "@/components/DeliveryEstimate";
import { RelatedProducts } from "@/components/RelatedProducts";
import { RecentlyViewedProducts, addToRecentlyViewed } from "@/components/RecentlyViewedProducts";

// Interfaces for Product, Material, Color, SectionImage, CustomizationSection
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  stock_quantity?: number | null;
  track_stock?: boolean;
  allow_direct_purchase: boolean;
  enable_material_selection: boolean;
  enable_color_selection: boolean;
  enable_custom_text: boolean;
  tax_enabled: boolean;
  shipping_type?: string;
  custom_shipping_cost?: number;
  product_code?: string;
  is_featured?: boolean;
  is_new?: boolean;
  is_bestseller?: boolean;
  is_on_sale?: boolean;
  sale_price?: number;
  compare_at_price?: number;
  brand?: string;
  manufacturer?: string;
  origin_country?: string;
  warranty_months?: number;
  return_policy?: string;
  estimated_delivery_days?: number;
  is_preorder?: boolean;
  preorder_release_date?: string;
  is_gift_wrappable?: boolean;
  gift_wrap_price?: number;
  is_eco_friendly?: boolean;
  materials_info?: string;
  care_instructions?: string;
  age_restriction?: number;
  sku?: string;
  sale_end_date?: string;
  category_id?: string;
}

interface Material {
  id: string;
  name: string;
  description: string;
}

interface Color {
  id: string;
  name: string;
  hex_code: string;
}

interface SectionImage {
  id: string;
  image_url: string;
  image_name: string;
  display_order: number;
}

interface CustomizationSection {
  id: string;
  section_name: string;
  display_order: number;
  is_required: boolean;
  section_type: 'color' | 'image';
  availableColors: Color[];
  availableImages: SectionImage[];
}

const ProductDetail = () => {
  const { id } = useParams();
  const { t } = useTranslation('products');
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productVideo, setProductVideo] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { materials, availableColors, filterColorsByMaterial, loading: loadingMaterials } = useMaterialColors();
  const [customizationSections, setCustomizationSections] = useState<CustomizationSection[]>([]);
  const [sectionColorSelections, setSectionColorSelections] = useState<Record<string, string>>({});
  const [sectionImageSelections, setSectionImageSelections] = useState<Record<string, string>>({});
  const isSubmittingRef = useRef(false);
  const [categoryName, setCategoryName] = useState<string>("");

  const { content: translatedProduct, loading: translatingProduct } = useTranslatedContent(
    'products',
    id || '',
    ['name', 'description'],
    product
  );

  // Auto-rotate images every 5 seconds
  useEffect(() => {
    if (productImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [productImages.length]);

  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [customText, setCustomText] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Track recently viewed
  useEffect(() => {
    if (id) addToRecentlyViewed(id);
  }, [id]);

  const fetchProductData = useCallback(async () => {
    try {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (productError) throw productError;
      setProduct(productData);
      setProductVideo((productData as any)?.video_url || null);

      // Fetch category name
      if (productData?.category_id) {
        const { data: catData } = await supabase
          .from("categories")
          .select("name")
          .eq("id", productData.category_id)
          .single();
        if (catData) setCategoryName(catData.name);
      }

      const { data: imagesData } = await supabase
        .from("product_images")
        .select("image_url")
        .eq("product_id", id)
        .order("display_order", { ascending: true });
      
      setProductImages(imagesData?.map(img => img.image_url) || []);
    } catch (error: unknown) {
      toast.error(t('errors.loadProduct', { ns: 'errors', defaultValue: 'Error loading product' }));
      navigate("/productos");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const loadCustomizationSections = useCallback(async () => {
    if (!id) return;
    try {
      const { data: sectionsData, error } = await supabase
        .from('product_customization_sections' as any)
        .select('*')
        .eq('product_id', id)
        .order('display_order');

      if (error) throw error;

      if (sectionsData && sectionsData.length > 0) {
        const sectionsWithOptions = await Promise.all(
          sectionsData.map(async (section: any) => {
            let availableColors: Color[] = [];
            let availableImages: SectionImage[] = [];

            if (section.section_type === 'color') {
              const { data: sectionColors } = await supabase
                .from('product_section_colors' as any)
                .select('color_id, colors(*)')
                .eq('section_id', section.id);
              availableColors = sectionColors?.map((sc: any) => sc.colors).filter(Boolean) as Color[] || [];
              const { data: referenceImages, error: imgError } = await supabase
                .from('product_section_images' as any)
                .select('id, image_url, image_name, display_order')
                .eq('section_id', section.id)
                .order('display_order')
                .limit(1);
              if (!imgError && referenceImages && referenceImages.length > 0) {
                availableImages = referenceImages.map((img: any) => ({
                  id: img.id, image_url: img.image_url, image_name: img.image_name, display_order: img.display_order
                }));
              }
            } else if (section.section_type === 'image') {
              const { data: imagesData, error: imagesError } = await supabase
                .from('product_section_images' as any)
                .select('id, image_url, image_name, display_order')
                .eq('section_id', section.id)
                .order('display_order');
              if (!imagesError && imagesData) {
                availableImages = imagesData.map((img: any) => ({
                  id: img.id, image_url: img.image_url, image_name: img.image_name, display_order: img.display_order
                }));
              }
            }
            return { ...section, availableColors, availableImages };
          })
        );
        setCustomizationSections(sectionsWithOptions);
      }
    } catch (error) {
      console.error('Error loading customization sections:', error);
    }
  }, [id]);

  useEffect(() => { fetchProductData(); }, [fetchProductData]);
  useEffect(() => { if (product && id) loadCustomizationSections(); }, [product, id, loadCustomizationSections]);
  useEffect(() => {
    if (product?.enable_color_selection && !product?.enable_material_selection && customizationSections.length === 0) {
      filterColorsByMaterial(null, id);
    } else if (product?.enable_material_selection && product?.enable_color_selection && customizationSections.length === 0) {
      setSelectedColor("");
    }
  }, [product, id, customizationSections.length, filterColorsByMaterial]);

  const addToCart = async () => {
    if (!product) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error(t('mustLogin')); navigate("/auth"); return; }

    if (customizationSections.length > 0) {
      const missingSections = customizationSections.filter(section => {
        if (!section.is_required) return false;
        if (section.section_type === 'color') return !sectionColorSelections[section.id];
        return !sectionImageSelections[section.id];
      });
      if (missingSections.length > 0) {
        toast.error(t('mustSelectSections', { sections: missingSections.map(s => s.section_name).join(', ') }));
        return;
      }
    } else {
      if (product.enable_material_selection && !selectedMaterial) { toast.error(t('selectMaterial')); return; }
      if (product.enable_color_selection && !selectedColor) { toast.error(t('selectColor')); return; }
    }

    const selectedMaterialData = materials.find(m => m.id === selectedMaterial);
    const selectedColorData = availableColors.find(c => c.id === selectedColor);

    let colorSelections: ColorSelection[] | undefined;
    if (customizationSections.length > 0) {
      const selections: ColorSelection[] = [];
      for (const section of customizationSections) {
        if (section.section_type === 'color' && sectionColorSelections[section.id]) {
          const selectedColorId = sectionColorSelections[section.id];
          const color = section.availableColors.find(c => c.id === selectedColorId);
          selections.push({ section_id: section.id, section_name: section.section_name, selection_type: 'color', color_id: selectedColorId, color_name: color?.name || '', color_hex: color?.hex_code });
        } else if (section.section_type === 'image' && sectionImageSelections[section.id]) {
          const selectedImageId = sectionImageSelections[section.id];
          const image = section.availableImages.find(img => img.id === selectedImageId);
          selections.push({ section_id: section.id, section_name: section.section_name, selection_type: 'image', image_id: selectedImageId, image_name: image?.image_name || '', image_url: image?.image_url || '' });
        }
      }
      if (selections.length > 0) colorSelections = selections;
    }

    const cartItem = {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      materialId: selectedMaterial || null,
      materialName: selectedMaterialData?.name || null,
      colorId: colorSelections ? null : (selectedColor || null),
      colorName: colorSelections ? null : (selectedColorData?.name || null),
      customText: product.enable_custom_text ? customText : undefined,
      tax_enabled: product.tax_enabled ?? true,
      colorSelections,
    };

    const currentCart = JSON.parse(localStorage.getItem("cart") || "[]");
    currentCart.push(cartItem);
    localStorage.setItem("cart", JSON.stringify(currentCart));
    toast.success(t('addedToCart'));
    navigate("/carrito");
  };

  const requestQuote = async () => {
    if (!product) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    let user;
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user;
    } catch (authError) {
      isSubmittingRef.current = false;
      toast.error(t('error', { ns: 'errors' }));
      return;
    }
    if (!user) { isSubmittingRef.current = false; toast.error(t('mustLoginQuote')); navigate("/auth"); return; }

    try {
      const materialName = selectedMaterial ? materials.find(m => m.id === selectedMaterial)?.name : "";
      const colorName = selectedColor ? availableColors.find(c => c.id === selectedColor)?.name : "";
      let description = `${t('product')}: ${product.name}`;
      if (materialName) description += `\n${t('material')}: ${materialName}`;
      if (colorName) description += `\n${t('color')}: ${colorName}`;
      if (customText) description += `\n${t('customText')}: ${customText}`;
      description += `\n${t('quantity')}: ${quantity}`;

      const { error } = await supabase.from("quotes").insert({
        user_id: user?.id, customer_name: user?.email || "", customer_email: user?.email || "",
        quote_type: "product", product_id: product.id, material_id: selectedMaterial || null,
        color_id: selectedColor || null, custom_text: customText || null, description,
      });
      if (error) throw error;

      if (user?.email) {
        try { await supabase.functions.invoke('send-quote-email', { body: { to: user.email, customer_name: user.email, quote_type: 'producto', description } }); } catch {}
      }
      try { await supabase.functions.invoke('send-admin-notification', { body: { type: 'quote', title: `New Product Quote`, message: `New quote for ${product.name}`, link: '/admin/quotes' } }); } catch {}

      toast.success(t('quoteRequested'));
      navigate("/");
    } catch (error: any) {
      toast.error(t('error', { ns: 'errors' }));
    } finally {
      isSubmittingRef.current = false;
    }
  };

  if (loading) {
    return (<div className="page-section"><div className="text-center">{t('loading')}</div></div>);
  }

  if (!product) return null;

  return (
    <div className="page-section pb-24 md:pb-12">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: t('title'), href: "/productos" },
        ...(categoryName ? [{ label: categoryName }] : []),
        { label: translatedProduct.name },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-10">
        <div className="space-y-3">
          {/* Main Image */}
          <div className="bg-muted rounded-xl overflow-hidden mx-auto w-full max-w-[320px] sm:max-w-[400px] aspect-square">
            {productImages.length > 0 ? (
              <img src={productImages[currentImageIndex]} alt={product.name} className="w-full h-full object-contain" style={{ display: 'block' }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-muted-foreground text-sm">{t('noImage', 'No image')}</p>
              </div>
            )}
          </div>
          
          {/* Thumbnail Gallery */}
          {productImages.length > 1 && (
            <div className="flex flex-nowrap gap-2 px-2 pb-1 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {productImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`rounded-lg overflow-hidden border-2 transition-all ${index === currentImageIndex ? 'border-primary ring-2 ring-primary/30' : 'border-muted hover:border-primary/50'}`}
                  style={{ width: '60px', height: '60px', minWidth: '60px', flexShrink: 0 }}
                >
                  <img src={image} alt={`${product.name} - ${index + 1}`} className="w-full h-full object-cover" style={{ display: 'block' }} />
                </button>
              ))}
            </div>
          )}

          {/* Product Video */}
          {productVideo && (
            <div className="mt-2 md:mt-3 lg:mt-4">
              <h3 className="font-semibold mb-2 text-sm md:text-base">{t('videoTitle')}</h3>
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <video src={productVideo} controls className="w-full h-full">{t('videoNotSupported')}</video>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 md:space-y-4 lg:space-y-6">
          <div>
            {/* Title row with Wishlist + Share */}
            <div className="flex items-start justify-between gap-2 mb-2 md:mb-3 lg:mb-4">
              <h1 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold">
                {translatedProduct.name}
              </h1>
              <div className="flex items-center gap-1 flex-shrink-0">
                <WishlistButton productId={product.id} />
                <ShareProduct productName={translatedProduct.name} />
              </div>
            </div>
            
            {/* Product Code */}
            {product.product_code && (
              <div className="mb-2 md:mb-3">
                <p className="text-xs md:text-sm text-muted-foreground">
                  <span className="font-semibold">{t('code')}:</span> <span className="font-mono font-bold text-foreground">{product.product_code}</span>
                </p>
              </div>
            )}
            
            {/* Product Badges */}
            <div className="flex flex-wrap gap-1 md:gap-2 mb-2 md:mb-3">
              {product.is_new && (<Badge className="bg-blue-500 hover:bg-blue-600 text-white text-xs"><Sparkles className="w-3 h-3 mr-1" />{t('badges.new')}</Badge>)}
              {product.is_bestseller && (<Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs"><TrendingUp className="w-3 h-3 mr-1" />{t('badges.bestseller')}</Badge>)}
              {product.is_featured && (<Badge className="bg-purple-500 hover:bg-purple-600 text-white text-xs"><Star className="w-3 h-3 mr-1" />{t('badges.featured')}</Badge>)}
              {product.is_on_sale && product.sale_price && (<Badge className="bg-red-500 hover:bg-red-600 text-white text-xs">{t('badges.onSale')}</Badge>)}
              {product.is_eco_friendly && (<Badge className="bg-green-500 hover:bg-green-600 text-white text-xs"><Leaf className="w-3 h-3 mr-1" />{t('badges.ecoFriendly')}</Badge>)}
              {product.is_preorder && (<Badge variant="outline" className="border-orange-500 text-orange-600 text-xs"><Clock className="w-3 h-3 mr-1" />{t('badges.preorder')}</Badge>)}
              {product.is_gift_wrappable && (<Badge variant="outline" className="border-pink-500 text-pink-600 text-xs"><Gift className="w-3 h-3 mr-1" />{t('badges.giftWrap')}</Badge>)}
            </div>

            {/* Sale Countdown */}
            {product.is_on_sale && (product as any).sale_end_date && (
              <SaleCountdown saleEndDate={(product as any).sale_end_date} className="mb-3" />
            )}

            {/* Free Shipping Banner */}
            {product.shipping_type === 'free' && (
              <div className="bg-success border border-success/30 rounded-lg p-2 md:p-3 lg:p-4 mb-2 md:mb-3 lg:mb-4 shadow-medium">
                <p className="text-xs md:text-sm lg:text-base xl:text-lg font-bold text-success-foreground">{t('freeShipping')}</p>
              </div>
            )}

            {/* Price Section with Sale/Compare */}
            <div className="mb-2 md:mb-3 lg:mb-4">
              {product.is_on_sale && product.sale_price ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 md:gap-3">
                    <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-destructive">€{product.sale_price.toFixed(2)}</p>
                    <p className="text-lg md:text-xl text-muted-foreground line-through">€{product.price.toFixed(2)}</p>
                  </div>
                  <p className="text-sm text-green-600 font-medium">{t('details.youSave')}: €{(product.price - product.sale_price).toFixed(2)} ({Math.round((1 - product.sale_price / product.price) * 100)}%)</p>
                </div>
              ) : product.compare_at_price && product.compare_at_price > product.price ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 md:gap-3">
                    <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary">€{product.price.toFixed(2)}</p>
                    <p className="text-lg md:text-xl text-muted-foreground line-through">{t('details.comparePrice')}: €{product.compare_at_price.toFixed(2)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary">€{product.price.toFixed(2)}</p>
              )}
            </div>

            {/* Stock + Delivery Estimate */}
            <StockIndicator productId={product.id} trackStock={product.track_stock} stockQuantity={product.stock_quantity} quantity={quantity} showWaitlistButton={true} className="mb-3" />

            {product.estimated_delivery_days && product.estimated_delivery_days > 0 && (
              <DeliveryEstimate estimatedDays={product.estimated_delivery_days} />
            )}

            {/* Brand/Manufacturer Info */}
            {(product.brand || product.manufacturer || product.origin_country) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2 md:mb-3">
                {product.brand && (<span><strong>{t('details.brand')}:</strong> {product.brand}</span>)}
                {product.manufacturer && (<span><strong>{t('details.manufacturer')}:</strong> {product.manufacturer}</span>)}
                {product.origin_country && (<span><strong>{t('details.originCountry')}:</strong> {product.origin_country}</span>)}
              </div>
            )}

            {product.sku && (<p className="text-xs text-muted-foreground mb-2"><strong>{t('sku')}:</strong> {product.sku}</p>)}

            {/* Description */}
            <div className="text-muted-foreground text-sm md:text-base text-justify">
              <RichTextDisplay content={translatedProduct.description} />
            </div>
            
            {/* Dimensions and Weight */}
            {((product as any).weight || (product as any).length || (product as any).width || (product as any).height) && (
              <div className="mt-2 md:mt-3 lg:mt-4 p-2 md:p-3 lg:p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-1 md:mb-2 text-xs md:text-sm">{t('specifications')}</h3>
                <div className="grid grid-cols-2 gap-1 md:gap-2 text-xs md:text-sm text-muted-foreground">
                  {(product as any).weight && (<div><span className="font-medium">{t('weight')}:</span> {(product as any).weight}g</div>)}
                  {((product as any).length || (product as any).width || (product as any).height) && (
                    <div><span className="font-medium">{t('dimensions')}:</span>{' '}{(product as any).length && `${(product as any).length}cm`}{(product as any).width && ` × ${(product as any).width}cm`}{(product as any).height && ` × ${(product as any).height}cm`}</div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Product Info Grid */}
            {(product.warranty_months || product.return_policy || product.materials_info || product.care_instructions || product.age_restriction || product.is_preorder || product.is_gift_wrappable) && (
              <div className="mt-3 md:mt-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                  {product.warranty_months && product.warranty_months > 0 && (
                    <div className="flex items-center gap-2 p-2 md:p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <Shield className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-400">{t('details.warranty')}</p>
                        <p className="text-sm text-blue-600 dark:text-blue-300">{t('details.warrantyMonths', { months: product.warranty_months })}</p>
                      </div>
                    </div>
                  )}
                </div>

                {product.is_preorder && product.preorder_release_date && (
                  <div className="flex items-center gap-2 p-2 md:p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-600 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-orange-700 dark:text-orange-400">{t('details.preorderDate')}</p>
                      <p className="text-sm text-orange-600 dark:text-orange-300">{new Date(product.preorder_release_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}

                {product.is_gift_wrappable && (
                  <div className="flex items-center gap-2 p-2 md:p-3 bg-pink-50 dark:bg-pink-950/30 rounded-lg">
                    <Gift className="w-5 h-5 text-pink-600 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-pink-700 dark:text-pink-400">{t('details.giftWrapAvailable')}</p>
                      {product.gift_wrap_price && product.gift_wrap_price > 0 && (
                        <p className="text-sm text-pink-600 dark:text-pink-300">{t('details.giftWrapPrice', { price: product.gift_wrap_price.toFixed(2) })}</p>
                      )}
                    </div>
                  </div>
                )}

                {product.age_restriction && product.age_restriction > 0 && (
                  <div className="flex items-center gap-2 p-2 md:p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-red-700 dark:text-red-400">{t('details.ageRestriction')}</p>
                      <p className="text-sm text-red-600 dark:text-red-300">{t('details.ageRestrictionYears', { years: product.age_restriction })}</p>
                    </div>
                  </div>
                )}

                {product.materials_info && (
                  <div className="p-2 md:p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-muted-foreground" /><p className="text-xs font-medium">{t('details.materialsInfo')}</p></div>
                    <p className="text-sm text-muted-foreground">{product.materials_info}</p>
                  </div>
                )}
                {product.care_instructions && (
                  <div className="p-2 md:p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1"><Info className="w-4 h-4 text-muted-foreground" /><p className="text-xs font-medium">{t('details.careInstructions')}</p></div>
                    <p className="text-sm text-muted-foreground">{product.care_instructions}</p>
                  </div>
                )}
                {product.return_policy && (
                  <div className="p-2 md:p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1"><Shield className="w-4 h-4 text-muted-foreground" /><p className="text-xs font-medium">{t('details.returnPolicy')}</p></div>
                    <p className="text-sm text-muted-foreground">{product.return_policy}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <Card>
            <CardContent className="p-3 md:p-4 lg:p-6 space-y-3 md:space-y-4">
              {product.enable_material_selection && (
                <div className="space-y-1 md:space-y-2">
                  <Label className="text-xs md:text-sm">{t('material')} *</Label>
                  <Select value={selectedMaterial} onValueChange={(value) => { setSelectedMaterial(value); setSelectedColor(""); filterColorsByMaterial(value); }}>
                    <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm"><SelectValue placeholder={t('selectMaterial')} /></SelectTrigger>
                    <SelectContent>
                      {materials.map((material) => (
                        <SelectItem key={material.id} value={material.id} className="text-xs md:text-sm">{material.name} - {material.description}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {customizationSections.length > 0 ? (
                <div className="space-y-3 md:space-y-4 border-t pt-3 md:pt-4">
                  <h3 className="font-semibold text-sm md:text-base">{t('customization', 'Customization')}</h3>
                  {customizationSections.map((section) => (
                    <div key={section.id} className="space-y-1 md:space-y-2">
                      <Label className="text-xs md:text-sm">{section.section_name} {section.is_required && '*'}</Label>
                      {section.section_type === 'color' && section.availableImages && section.availableImages.length > 0 && (
                        <div className="mb-2"><img src={section.availableImages[0].image_url} alt={section.section_name} className="w-24 h-24 object-cover rounded border" /></div>
                      )}
                      {section.section_type === 'color' ? (
                        <Select value={sectionColorSelections[section.id] || ""} onValueChange={(value) => setSectionColorSelections({ ...sectionColorSelections, [section.id]: value })}>
                          <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm"><SelectValue placeholder={t('selectColor')} /></SelectTrigger>
                          <SelectContent>
                            {section.availableColors.map((color) => (
                              <SelectItem key={color.id} value={color.id} className="text-xs md:text-sm">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 md:w-4 md:h-4 rounded-full border" style={{ backgroundColor: color.hex_code }} />{color.name}</div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {section.availableImages.map((image) => (
                            <div key={image.id} className="relative">
                              <button type="button" onClick={() => setSectionImageSelections({ ...sectionImageSelections, [section.id]: image.id })}
                                className={`relative border-2 rounded-lg overflow-hidden transition-all hover:border-primary w-full ${sectionImageSelections[section.id] === image.id ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}>
                                <img src={image.image_url} alt={image.image_name} className="w-full h-16 md:h-20 object-cover" />
                                <p className="text-xs p-1 bg-background/80 text-center truncate">{image.image_name}</p>
                                {sectionImageSelections[section.id] === image.id && (
                                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none"><Check className="w-6 h-6 text-primary" /></div>
                                )}
                              </button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <button type="button" className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background transition-colors shadow-md z-10" onClick={(e) => e.stopPropagation()}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                                  </button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl w-[95vw]">
                                  <div className="space-y-2">
                                    <img src={image.image_url} alt={image.image_name} className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />
                                    <p className="text-center text-sm text-muted-foreground">{image.image_name}</p>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                product.enable_color_selection && (
                  <div className="space-y-1 md:space-y-2">
                    <Label className="text-xs md:text-sm">{t('color')} *</Label>
                    <Select value={selectedColor} onValueChange={setSelectedColor} disabled={product.enable_material_selection && !selectedMaterial}>
                      <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm">
                        <SelectValue placeholder={product.enable_material_selection && !selectedMaterial ? t('selectMaterialFirst') : t('selectColor')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColors.length === 0 ? (
                          <div className="p-2 text-xs text-muted-foreground">{product.enable_material_selection && !selectedMaterial ? t('selectMaterialFirst') : t('noColorsAvailable')}</div>
                        ) : (
                          availableColors.map((color) => (
                            <SelectItem key={color.id} value={color.id} className="text-xs md:text-sm">
                              <div className="flex items-center gap-2"><div className="w-3 h-3 md:w-4 md:h-4 rounded-full border" style={{ backgroundColor: color.hex_code }} />{color.name}</div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )
              )}

              {product.enable_custom_text && (
                <div className="space-y-1 md:space-y-2">
                  <Label className="text-xs md:text-sm">{t('customText')}</Label>
                  <Textarea placeholder={t('customTextPlaceholder')} value={customText} onChange={(e) => setCustomText(e.target.value)} rows={3} className="text-xs md:text-sm" />
                </div>
              )}

              <div className="space-y-1 md:space-y-2">
                <Label className="text-xs md:text-sm">{t('quantity')}</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" className="h-10 w-10 min-h-[44px] min-w-[44px]" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}><Minus className="h-4 w-4" /></Button>
                  <span className="w-16 text-center text-lg font-semibold tabular-nums">{quantity}</span>
                  <Button type="button" variant="outline" size="icon" className="h-10 w-10 min-h-[44px] min-w-[44px]" onClick={() => setQuantity(Math.min(product.stock || 999, quantity + 1))} disabled={quantity >= (product.stock || 999)}><Plus className="h-4 w-4" /></Button>
                  {product.stock && (<span className="text-xs text-muted-foreground ml-2">(máx: {product.stock})</span>)}
                </div>
              </div>

              <div className="flex gap-2 md:gap-3 lg:gap-4">
                {product.allow_direct_purchase && (
                  <Button className="flex-1 text-xs md:text-sm" size="sm" onClick={addToCart}>
                    <ShoppingCart className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5" />
                    <span className="hidden sm:inline">{t('buyNow')}</span>
                    <span className="sm:hidden">{t('buy')}</span>
                  </Button>
                )}
                <Button variant={product.allow_direct_purchase ? "outline" : "default"} className="flex-1 text-xs md:text-sm" size="sm" onClick={() => navigate(`/producto/${product.id}/cotizar`)}>
                  <MessageSquare className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5" />
                  <span>{t('requestQuote')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-6 md:mt-8 lg:mt-12">
        <ProductReviews productId={id!} />
      </div>

      {/* Related Products */}
      <RelatedProducts productId={id!} type="related" />

      {/* Recently Viewed */}
      <RecentlyViewedProducts excludeProductId={id} />
    </div>
  );
};

export default ProductDetail;
