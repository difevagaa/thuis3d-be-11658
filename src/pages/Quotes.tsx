import { useState, useEffect, lazy, Suspense, startTransition, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Wrench, CheckCircle2, Info, Settings, Package, Shield, TrendingDown } from "lucide-react";
// Lazy 3D previews are defined below to improve performance
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useMaterialColors } from "@/hooks/useMaterialColors";
import { STLUploader } from "@/components/STLUploader";
import { AnalysisResult } from "@/lib/stlAnalyzer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useShippingCalculator } from "@/hooks/useShippingCalculator";
import { useQuantityDiscounts } from "@/hooks/useQuantityDiscounts";
import { logger } from "@/lib/logger";
// RichTextEditor is lazy-loaded below
import { useTranslation } from "react-i18next";

// Lazy-loaded heavy components
const RandomModelPreview = lazy(() => import('@/components/RandomModelPreview').then(m => ({ default: m.RandomModelPreview })));
const STLViewer3D = lazy(() => import('@/components/STLViewer3D').then(m => ({ default: m.STLViewer3D })));
const RichTextEditor = lazy(() => import('@/components/RichTextEditor').then(m => ({ default: m.RichTextEditor })));

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

const Quotes = () => {
  const { t } = useTranslation('quotes');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  // Ref to prevent multiple submissions (updates synchronously, unlike state)
  const isSubmittingRef = useRef(false);
  const { materials, availableColors, filterColorsByMaterial } = useMaterialColors();
  const { calculateShippingByPostalCode, getAvailableCountries } = useShippingCalculator();
  const { calculateDiscount } = useQuantityDiscounts();
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [analysisResult, setAnalysisResult] = useState<(AnalysisResult & { file: File }) | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  // Estados para configuración técnica
  const [supportsRequired, setSupportsRequired] = useState<boolean | null>(null);
  
  // Estados para archivos del servicio
  const [serviceFiles, setServiceFiles] = useState<File[]>([]);
  
  // Estados para descripciones de texto enriquecido
  const [fileDescription, setFileDescription] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceFileLink, setServiceFileLink] = useState('');
  
  // Altura de capa fija en 0.2mm (estándar)
  const layerHeight = 0.2;
  
  // Estados para formulario - autocompletar si el usuario está autenticado
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [country, setCountry] = useState('Bélgica');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [shippingZone, setShippingZone] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [availableCountries, setAvailableCountries] = useState<Array<{id: string, country_name: string, country_code: string}>>([]);
  // Control de pestañas para evitar suspensión en eventos de entrada
  const [activeTab, setActiveTab] = useState<'3d' | 'service'>('3d');

  // Cargar países disponibles
  useEffect(() => {
    const loadCountries = async () => {
      const countries = await getAvailableCountries();
      setAvailableCountries(countries);
      
      // Si hay países disponibles y no hay país seleccionado, seleccionar el primero
      if (countries.length > 0 && !country) {
        setCountry(countries[0].country_name);
      }
    };
    
    loadCountries();
  }, []);

  // Prefetch heavy lazy components to avoid Suspense during user input
  useEffect(() => {
    // Preload modules shortly after mount so tab clicks or field focus don't suspend
    import('@/components/RandomModelPreview');
    import('@/components/STLViewer3D');
    import('@/components/RichTextEditor');
  }, []);

  // Cargar datos del usuario autenticado
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setIsAuthenticated(true);
        // Obtener perfil del usuario
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, phone, postal_code, country, address, city')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setCustomerName(profile.full_name || user.email || '');
          setCustomerEmail(profile.email || user.email || '');
          setPhone(profile.phone || '');
          setPostalCode(profile.postal_code || '');
          setCountry(profile.country || (availableCountries[0]?.country_name || 'Bélgica'));
          setAddress(profile.address || '');
          setCity(profile.city || '');
        } else {
          // Si no hay perfil, usar datos básicos del usuario
          setCustomerEmail(user.email || '');
          setCustomerName(user.email || '');
        }
      } else {
        setIsAuthenticated(false);
      }
    };
    
    loadUserData();
    filterColorsByMaterial(null);
  }, []);
  
  // Calcular envío cuando cambie el código postal o el total estimado - contexto de cotizaciones
  useEffect(() => {
    const calculateShipping = async () => {
      if (postalCode && analysisResult?.weight) {
        // Usar contexto 'quotes' para aplicar la configuración específica de cotizaciones
        // Pasar el total estimado para verificar umbrales de envío gratis/reducido
        const orderTotal = analysisResult?.estimatedTotal || 0;
        const result = await calculateShippingByPostalCode(postalCode, analysisResult.weight, country, 'quotes', orderTotal);
        setShippingCost(result.cost);
        setShippingZone(result.zoneName);
      } else {
        setShippingCost(null);
        setShippingZone('');
      }
    };
    
    calculateShipping();
  }, [postalCode, analysisResult?.weight, analysisResult?.estimatedTotal, country]);

  const handleFileQuote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Prevent multiple submissions using ref (synchronous check)
    if (isSubmittingRef.current || loading) {
      logger.log('Quote submission blocked: already submitting');
      return;
    }
    
    // Mark as submitting immediately (synchronous)
    isSubmittingRef.current = true;
    
    // Verificar autenticación primero
    let user;
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user;
    } catch (authError) {
      logger.error('Error checking auth:', authError);
      isSubmittingRef.current = false;
      toast.error(t('systemConfigError'));
      return;
    }
    
    if (!user) {
      isSubmittingRef.current = false;
      toast.error(t('mustLogin'));
      navigate("/auth");
      return;
    }
    
    if (!selectedMaterial || !selectedColor) {
      isSubmittingRef.current = false;
      toast.error(t('selectMaterialColor'));
      return;
    }

    if (!analysisResult) {
      isSubmittingRef.current = false;
      toast.error(t('analyzeBeforeSending'));
      return;
    }
    
    setLoading(true);
    
    try {
      // No necesitamos leer el formulario aquí
      
      const materialName = materials.find(m => m.id === selectedMaterial)?.name;
      const colorName = availableColors.find(c => c.id === selectedColor)?.name;
      const description = `${fileDescription || ''}\nMaterial: ${materialName}\nColor: ${colorName}`;

      // AHORA SÍ subimos el archivo a Supabase
      const sanitizedName = analysisResult.file.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9.-]/g, '')
        .replace(/-+/g, '-');
      
      const fileName = `${Date.now()}_${sanitizedName}`;
      const filePath = `${user!.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('quote-files')
        .upload(filePath, analysisResult.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Guardar/actualizar datos de perfil del usuario si está autenticado
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            full_name: customerName,
            email: customerEmail,
            phone: phone,
            postal_code: postalCode,
            country: country,
            address: address,
            city: city,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });
        
        if (profileError) {
          logger.error('Error al guardar perfil:', profileError);
        }
      }

      const discount = calculateDiscount(quantity, analysisResult?.estimatedTotal || 0);
      const finalPrice = discount ? discount.finalPrice : (analysisResult?.estimatedTotal || 0);

      // Buscar estado "Pendiente" por slug (independiente del idioma)
      let pendingStatusId: string;
      try {
        const { data, error } = await (supabase as any)
          .from('quote_statuses')
          .select('id')
          .eq('slug', 'pending')
          .is('deleted_at', null)
          .limit(1);
        
        if (error || !data || data.length === 0) {
          throw new Error('Estado pending no encontrado');
        }
        pendingStatusId = data[0].id;
      } catch (error) {
        logger.error('No se encontró estado con slug "pending" en quote_statuses');
        toast.error(t('systemConfigError'));
        setLoading(false);
        isSubmittingRef.current = false;
        return;
      }

      const { error } = await supabase.from("quotes").insert({
        user_id: user?.id,
        customer_name: customerName,
        customer_email: customerEmail,
        quote_type: "file_upload",
        description,
        status_id: pendingStatusId,
        material_id: selectedMaterial,
        color_id: selectedColor,
        file_storage_path: filePath,
        calculated_volume: analysisResult?.volume || null,
        calculated_weight: analysisResult?.weight || null,
        calculated_material_cost: analysisResult?.materialCost || null,
        calculated_time_estimate: analysisResult?.estimatedTime || null,
        estimated_price: finalPrice,
        calculation_details: analysisResult ? {
          dimensions: analysisResult.dimensions,
          preview: analysisResult.preview,
          ...(discount && {
            quantity_discount: {
              original_price: discount.originalPrice,
              discount_amount: discount.discountAmount,
              discount_tier: discount.tierName,
              discount_description: discount.tierDescription
            }
          })
        } : null,
        supports_required: supportsRequired,
        layer_height: layerHeight, // Siempre 0.2mm
        let_team_decide_supports: false,
        let_team_decide_layer: false,
        country: country,
        postal_code: postalCode || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        shipping_cost: shippingCost || null,
        shipping_zone: shippingZone || null,
        quantity: quantity || 1,
      });

      if (error) {
        logger.error('Error al insertar cotización:', error);
        throw error;
      }

      // Send email to customer
      try {
        await supabase.functions.invoke('send-quote-email', {
          body: {
            to: customerEmail,
            customer_name: customerName,
            quote_type: 'archivo 3D',
            description: description
          }
        });
      } catch (emailError) {
        logger.error('Error sending quote email:', emailError);
        // No bloqueamos el flujo si falla el email
      }

      try {
        await supabase.functions.invoke('send-admin-notification', {
          body: {
            type: 'quote',
            subject: 'Nueva Cotización de Archivo 3D',
            message: `Nueva cotización de ${customerName}`,
            customer_name: customerName,
            customer_email: customerEmail,
            link: '/admin/cotizaciones'
          }
        });
      } catch (notifError) {
        logger.error('Error sending admin notification:', notifError);
      }
      
      toast.success(t('quoteSent'));
      navigate("/");
    } catch (error: any) {
      toast.error(`${t('sendQuoteError')}: ${error?.message || t('systemConfigError')}`);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleServiceQuote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Prevent multiple submissions using ref (synchronous check)
    if (isSubmittingRef.current || loading) {
      logger.log('Service quote submission blocked: already submitting');
      return;
    }
    
    // Mark as submitting immediately (synchronous)
    isSubmittingRef.current = true;
    
    // Verificar autenticación primero
    let user;
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user;
    } catch (authError) {
      logger.error('Error checking auth:', authError);
      isSubmittingRef.current = false;
      toast.error(t('systemConfigError'));
      return;
    }
    
    if (!user) {
      isSubmittingRef.current = false;
      toast.error(t('mustLogin'));
      navigate("/auth");
      return;
    }
    
    setLoading(true);
    
    try {
      // Leer enlace desde estado controlado
      // Validar campos requeridos
      if (!customerName || !customerEmail) {
        toast.error(t('fillNameEmail'));
        setLoading(false);
        isSubmittingRef.current = false;
        return;
      }
      
      if (!serviceDescription || serviceDescription.trim() === '') {
        toast.error(t('describeProject'));
        setLoading(false);
        isSubmittingRef.current = false;
        return;
      }
      
      let description = serviceDescription;
      const fileLink = serviceFileLink?.trim();
      
      if (fileLink) {
        description += `\n\nEnlace al archivo: ${fileLink}`;
      }

      // Subir archivos adjuntos a Storage si existen
      const uploadedFiles: string[] = [];
      if (serviceFiles.length > 0) {
        for (const file of serviceFiles) {
          try {
            const sanitizedName = file.name
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9.-]/g, '')
              .replace(/-+/g, '-');
            
            const fileName = `service_${Date.now()}_${sanitizedName}`;
            const filePath = `${user!.id}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
              .from('quote-files')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) {
              logger.error('Error uploading file:', uploadError);
              toast.error(`Error al subir ${file.name}`);
            } else {
              uploadedFiles.push(filePath);
            }
          } catch (uploadErr) {
            logger.error('Exception uploading file:', uploadErr);
          }
        }
      }

      // Lookup status by slug (language-agnostic)
      let pendingStatusId: string;
      try {
        const { data, error } = await (supabase as any)
          .from('quote_statuses')
          .select('id')
          .eq('slug', 'pending')
          .is('deleted_at', null)
          .limit(1);
        
        if (error || !data || data.length === 0) {
          throw new Error('Estado pending no encontrado');
        }
        pendingStatusId = data[0].id;
      } catch (error) {
        logger.error('No se encontró estado con slug "pending" en quote_statuses');
        toast.error(t('systemConfigError'));
        setLoading(false);
        isSubmittingRef.current = false;
        return;
      }

      const { error } = await supabase.from("quotes").insert({
        user_id: user?.id || null,
        customer_name: customerName,
        customer_email: customerEmail,
        quote_type: "service",
        description,
        status_id: pendingStatusId,
        file_url: fileLink || null,
        service_attachments: uploadedFiles.length > 0 ? uploadedFiles : null,
      });

      if (error) {
        logger.error('Error al insertar cotización de servicio:', error);
        throw error;
      }

      // Send email to customer
      try {
        await supabase.functions.invoke('send-quote-email', {
          body: {
            to: customerEmail,
            customer_name: customerName,
            quote_type: 'servicio',
            description: description
          }
        });
      } catch (emailError) {
        logger.error('Error sending service quote email:', emailError);
        // No bloqueamos el flujo si falla el email
      }

      // Send notification to admins
      try {
        await supabase.functions.invoke('send-admin-notification', {
          body: {
            type: 'quote',
            subject: 'Nueva Solicitud de Servicio',
            message: `Nueva solicitud de ${customerName}`,
            customer_name: customerName,
            customer_email: customerEmail,
            link: '/admin/cotizaciones'
          }
        });
      } catch (notifError) {
        // Notification error handled silently
      }
      
      toast.success(t('quoteSent'));
      navigate("/");
    } catch (error: any) {
      toast.error(`${t('sendQuoteError')}: ${error.message || t('systemConfigError')}`);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 lg:py-12">
      <div className="mb-4 md:mb-6 lg:mb-8 text-center">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 md:mb-4">{t('title')}</h1>
        <p className="text-sm md:text-base lg:text-lg text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <TooltipProvider>
      <div className="max-w-4xl mx-auto">
        <Tabs value={activeTab} onValueChange={(v) => startTransition(() => setActiveTab(v as '3d' | 'service'))} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="3d" className="text-xs md:text-sm">
              <Upload className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{t('tab3d')}</span>
              <span className="sm:hidden">3D</span>
            </TabsTrigger>
            <TabsTrigger value="service" className="text-xs md:text-sm">
              <Wrench className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              {t('tabService')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="3d">
            <Card>
              <CardHeader>
                <CardTitle>{t('fileQuoteTitle')}</CardTitle>
                <CardDescription>
                  {t('fileQuoteDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFileQuote} className="space-y-6">
                  {/* Solo mostrar campos de contacto si el usuario NO está autenticado */}
                  {!isAuthenticated && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="file-name">{t('fullName')} *</Label>
                        <Input 
                          id="file-name" 
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="file-email">{t('email')} *</Label>
                        <Input 
                          id="file-email" 
                          type="email" 
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          required 
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Información de Envío - siempre visible */}
                  <Separator className="my-4" />
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {t('shippingInfo')}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="file-address">{t('address')} *</Label>
                      <Input 
                        id="file-address" 
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                          placeholder={t('addressPlaceholder')}
                          required 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="file-city">{t('city')} *</Label>
                        <Input 
                          id="file-city" 
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder={t('cityPlaceholder')}
                          required 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="file-postal">{t('postalCode')} *</Label>
                        <Input 
                          id="file-postal" 
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder={t('postalPlaceholder')}
                          required 
                        />
                      </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="file-country">{t('country')} *</Label>
                      <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger id="file-country">
                          <SelectValue placeholder={t('selectCountry')} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCountries.length === 0 ? (
                            <SelectItem value="none" disabled>{t('noCountries')}</SelectItem>
                          ) : (
                            availableCountries.map((c) => (
                              <SelectItem key={c.id} value={c.country_name}>
                                {c.country_name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="file-phone">{t('phoneOptional')}</Label>
                        <Input 
                          id="file-phone" 
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder={t('phonePlaceholder')}
                        />
                      </div>
                    </div>
                    
                    {/* Mostrar costo de envío estimado */}
                    {analysisResult && shippingCost !== null && (
                      <Alert>
                        <Package className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <p className="font-semibold">{t('estimatedShippingCost')}: €{shippingCost.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{t('zone')}: {shippingZone}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('basedOnWeight', { weight: analysisResult.weight.toFixed(0), postalCode })}
                            </p>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  
                  <Separator className="my-4" />
                  
                  <Separator className="my-4" />
                  
                  {/* Selección de material y color con vista previa 3D */}
                  <h3 className="font-semibold text-lg">{t('personalization')}</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="file-material">{t('material')} *</Label>
                        <Select 
                          value={selectedMaterial} 
                          onValueChange={(value) => {
                            startTransition(() => {
                              setSelectedMaterial(value);
                              setSelectedColor("");
                              filterColorsByMaterial(value);
                            });
                          }}
                        >
                          <SelectTrigger id="file-material">
                            <SelectValue placeholder={t('selectMaterial')} />
                          </SelectTrigger>
                          <SelectContent>
                            {materials.map((material) => (
                              <SelectItem key={material.id} value={material.id}>
                                {material.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="file-color">{t('color')} *</Label>
                        <Select 
                          value={selectedColor} 
                          onValueChange={(value) => startTransition(() => setSelectedColor(value))}
                          disabled={!selectedMaterial}
                        >
                          <SelectTrigger id="file-color">
                            <SelectValue placeholder={
                              !selectedMaterial 
                                ? t('selectMaterialFirst')
                                : t('selectColor')
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {availableColors.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground">
                                {!selectedMaterial 
                                  ? t('selectMaterialFirst')
                                  : t('noColorsAvailable')}
                              </div>
                            ) : (
                              availableColors.map((color) => (
                                <SelectItem key={color.id} value={color.id}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-4 h-4 rounded-full border"
                                      style={{ backgroundColor: color.hex_code }}
                                    />
                                    {color.name}
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Cantidad */}
                      <div className="space-y-2">
                        <Label>{t('quantityUnits')} *</Label>
                        <Input
                          type="number"
                          min="1"
                          max="999"
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </div>
                    </div>
                    
                    {/* Vista previa 3D con el color seleccionado */}
                    <div className="space-y-2">
                      <Label>{t('colorPreview')}</Label>
                      {selectedColor ? (
                        <Suspense fallback={<div className="w-full h-64 rounded-lg border bg-muted/30 animate-pulse" />}> 
                          <RandomModelPreview 
                            color={availableColors.find(c => c.id === selectedColor)?.hex_code || "#cccccc"}
                          />
                        </Suspense>
                      ) : (
                        <div className="w-full h-64 rounded-lg border bg-muted/30 flex items-center justify-center">
                          <p className="text-sm text-muted-foreground text-center px-4">
                            {t('selectColor')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Información sobre detección automática */}
                  <Separator className="my-6" />
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      ✨ <strong>{t('autoConfiguration')}:</strong> {t('autoConfigDesc')}
                    </AlertDescription>
                  </Alert>
                  <Separator className="my-4" />
                  
                  {/* Carga de archivo STL/OBJ/3MF */}
                  <div className="space-y-2">
                    <Label>{t('yourFile')} *</Label>
                    <STLUploader
                      materialId={selectedMaterial}
                      colorId={selectedColor}
                      supportsRequired={supportsRequired || false}
                      layerHeight={layerHeight}
                      quantity={quantity}
                      onAnalysisComplete={setAnalysisResult}
                      onSupportsDetected={(needsSupports, reason) => {
                        setSupportsRequired(needsSupports);
                      }}
                    />
                  </div>
                  
                  {analysisResult && (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          {quantity > 1 ? t('analysisCompleteUnits', { count: quantity }) : t('analysisComplete')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Datos de pieza */}
                        <div>
                          <h3 className="font-semibold mb-3 text-sm">{quantity > 1 ? t('partDataPerUnit') : t('partData')}</h3>
                           <div className="grid grid-cols-2 gap-3">
                            <div className="bg-background/80 p-3 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">{t('volume')}</p>
                              <p className="text-base font-bold">{analysisResult.volume.toFixed(2)} cm³</p>
                            </div>
                            <div className="bg-background/80 p-3 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">{t('dimensions')}</p>
                              <p className="text-xs font-mono">
                                {analysisResult.dimensions.x.toFixed(1)}×
                                {analysisResult.dimensions.y.toFixed(1)}×
                                {analysisResult.dimensions.z.toFixed(1)}cm
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Vista previa 3D interactiva */}
                        <div>
                          <h3 className="font-semibold mb-3 text-sm">{t('interactive3DModel')}</h3>
                          {analysisResult.stlData ? (
                            <Suspense fallback={<div className="w-full h-64 rounded-lg border bg-muted/30 animate-pulse" />}> 
                              <STLViewer3D 
                                stlData={analysisResult.stlData}
                                color={availableColors.find(c => c.id === selectedColor)?.hex_code || "#3b82f6"}
                              />
                            </Suspense>
                          ) : (
                            <div className="rounded-lg overflow-hidden border bg-background/50 max-w-sm mx-auto">
                              <img 
                                src={analysisResult.preview} 
                                alt="3D model preview for prototyping quote" 
                                className="w-full h-auto"
                              />
                            </div>
                          )}
                        </div>

                        {/* Total Aproximado (sin desglose) */}
                        <div className="space-y-3">
                          {/* Indicador de política de precio mínimo */}
                          {quantity > 1 && (
                            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                              <Info className="h-4 w-4 text-blue-600" />
                              <AlertDescription className="text-xs text-blue-900 dark:text-blue-100">
                                <strong>📋 {t('minPricePolicy')}:</strong> {t('minPricePolicyDesc')}
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                            <Info className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="space-y-3">
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold text-amber-900 dark:text-amber-100">{t('printingCost')}:</span>
                                  <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                                    €{analysisResult.estimatedTotal.toFixed(2)}
                                  </span>
                                </div>
                                
                                {quantity > 1 && (
                                  <div className="text-xs text-amber-700 dark:text-amber-300 italic">
                                    {t('pricePerUnit')}: €{(analysisResult.estimatedTotal / quantity).toFixed(2)}
                                  </div>
                                )}
                                
                                {shippingCost !== null && (
                                  <>
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-amber-800 dark:text-amber-200">{t('shipping')} ({shippingZone}):</span>
                                      <span className="font-semibold text-amber-700 dark:text-amber-300">
                                        €{shippingCost.toFixed(2)}
                                      </span>
                                    </div>
                                    
                                    <Separator className="bg-amber-300 dark:bg-amber-700" />
                                    
                                    <div className="flex justify-between items-center pt-2">
                                      <span className="font-bold text-amber-900 dark:text-amber-100 text-lg">{t('totalEstimated')}:</span>
                                      <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                        €{(analysisResult.estimatedTotal + shippingCost).toFixed(2)}
                                      </span>
                                    </div>
                                  </>
                                )}
                                
                                {shippingCost === null && postalCode && (
                                  <p className="text-xs text-amber-800 dark:text-amber-200 italic">
                                    {t('calculatingShipping')}
                                  </p>
                                )}
                                
                                {!postalCode && (
                                  <p className="text-xs text-amber-800 dark:text-amber-200 italic">
                                    * {t('shippingNotIncluded')}
                                  </p>
                                )}
                              </div>
                              
                              <p className="text-xs text-amber-800 dark:text-amber-200 mt-2 pt-2 border-t border-amber-300 dark:border-amber-700">
                                <strong>{t('importantNote')}:</strong> {t('importantNoteDesc')}
                              </p>
                            </AlertDescription>
                          </Alert>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Descripción / Notas */}
                  <div className="space-y-2">
                      <Label htmlFor="file-description">{t('notes')}</Label>
                    <Suspense fallback={<div className="h-40 rounded-md border bg-muted/30 animate-pulse" />}> 
                      <RichTextEditor
                        value={fileDescription}
                        onChange={setFileDescription}
                        placeholder={t('notesPlaceholder')}
                      />
                    </Suspense>
                  </div>
                  
                  <Button type="submit" className="w-full" size="lg" disabled={loading || !analysisResult}>
                    {loading ? t('analyzing') : t('sendQuote')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="service">
            <Card>
              <CardHeader>
                <CardTitle>{t('serviceQuoteTitle')}</CardTitle>
                <CardDescription>
                  {t('serviceQuoteDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleServiceQuote} className="space-y-4">
                  {/* Solo mostrar campos de contacto si el usuario NO está autenticado */}
                  {!isAuthenticated && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="service-name">{t('fullName')} *</Label>
                        <Input 
                          id="service-name" 
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="service-email">{t('email')} *</Label>
                        <Input 
                          id="service-email" 
                          type="email" 
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          required 
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="service-description">{t('projectDescription')} *</Label>
                    <Suspense fallback={<div className="h-40 rounded-md border bg-muted/30 animate-pulse" />}> 
                      <RichTextEditor
                        value={serviceDescription}
                        onChange={setServiceDescription}
                        placeholder={t('projectDescPlaceholder')}
                      />
                    </Suspense>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-file-link">
                      {t('fileLinkOptional')}
                    </Label>
                    <Input 
                      id="service-file-link" 
                      name="file_link"
                      type="url"
                      placeholder={t('fileLinkPlaceholder')}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('fileLinkHelp')}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="service-attachments">
                      {t('photosOrFiles')}
                    </Label>
                    <Input 
                      id="service-attachments" 
                      type="file"
                      multiple
                      accept="image/*,.pdf,.stl,.obj,.3mf"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setServiceFiles(files);
                      }}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('attachFilesHelp')}
                    </p>
                    {serviceFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-semibold">{t('filesSelected')}:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {serviceFiles.map((file, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <FileText className="h-3 w-3" />
                              {file.name} ({(file.size / 1024).toFixed(1)} KB)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? t('sending') : t('requestService')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      </TooltipProvider>
    </div>
  );
};

export default Quotes;
