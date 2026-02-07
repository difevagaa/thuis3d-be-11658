import { useState, useEffect, lazy, Suspense, startTransition, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Wrench, CheckCircle2, Info, Package, ChevronRight, ChevronLeft, Palette, MapPin, Send, Loader2, Box, Ruler, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useMaterialColors } from "@/hooks/useMaterialColors";
import { STLUploader } from "@/components/STLUploader";
import { analyzeSTLFile, AnalysisResult } from "@/lib/stlAnalyzer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useShippingCalculator } from "@/hooks/useShippingCalculator";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

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

type QuoteAnalysisParams = {
  quantity: number;
  materialId: string;
  colorId: string;
  supportsRequired: boolean;
  layerHeight: number;
};

type QuoteAnalysisResult = AnalysisResult & {
  file: File;
  analysisParams?: QuoteAnalysisParams;
};

// Steps for 3D quote wizard
const STEPS = ['upload', 'customize', 'shipping', 'review'] as const;
type Step = typeof STEPS[number];

const Quotes = () => {
  const { t } = useTranslation('quotes');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const analysisParamsRef = useRef<QuoteAnalysisParams | null>(null);
  const analysisRequestIdRef = useRef(0);
  const { materials, availableColors, filterColorsByMaterial } = useMaterialColors();
  const { calculateShippingByPostalCode, getAvailableCountries } = useShippingCalculator();
  
  // Wizard step state
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [analysisResult, setAnalysisResult] = useState<QuoteAnalysisResult | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState("1");
  const [supportsRequired, setSupportsRequired] = useState<boolean | null>(null);
  const [serviceFiles, setServiceFiles] = useState<File[]>([]);
  const [fileDescription, setFileDescription] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceFileLink, setServiceFileLink] = useState('');
  const layerHeight = 0.2;
  
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
  const [activeTab, setActiveTab] = useState<'3d' | 'service'>('3d');

  // Load countries
  useEffect(() => {
    const loadCountries = async () => {
      const countries = await getAvailableCountries();
      setAvailableCountries(countries);
      if (countries.length > 0 && !country) {
        setCountry(countries[0].country_name);
      }
    };
    loadCountries();
  }, []);

  // Prefetch lazy components
  useEffect(() => {
    import('@/components/RandomModelPreview');
    import('@/components/STLViewer3D');
    import('@/components/RichTextEditor');
  }, []);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsAuthenticated(true);
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
  
  // Calculate shipping
  useEffect(() => {
    const calculateShipping = async () => {
      if (postalCode && analysisResult?.weight) {
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

  // Auto-advance after file analysis
  useEffect(() => {
    if (analysisResult && currentStep === 'upload') {
      setTimeout(() => setCurrentStep('customize'), 500);
    }
  }, [analysisResult]);

  const canProceedToStep = (step: Step): boolean => {
    switch (step) {
      case 'upload':
        return true;
      case 'customize':
        return !!analysisResult;
      case 'shipping':
        return !!analysisResult && !!selectedMaterial && !!selectedColor;
      case 'review':
        return !!analysisResult && !!selectedMaterial && !!selectedColor && !!customerName && !!customerEmail && !!phone && !!postalCode;
      default:
        return false;
    }
  };

  const goToNextStep = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex < STEPS.length - 1) {
      const nextStep = STEPS[currentIndex + 1];
      if (canProceedToStep(nextStep)) {
        setCurrentStep(nextStep);
      }
    }
  };

  const goToPrevStep = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  };

  const normalizeQuantity = (value: number) => {
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      return 1;
    }
    return Math.max(1, Math.floor(value));
  };

  const baseAnalysisParams = useMemo(() => ({
    quantity: normalizeQuantity(quantity),
    materialId: selectedMaterial || 'default',
    colorId: selectedColor || '',
    supportsRequired: supportsRequired ?? false,
    layerHeight
  }), [quantity, selectedMaterial, selectedColor, supportsRequired, layerHeight]);

  const handleAnalysisComplete = useCallback((result: QuoteAnalysisResult) => {
    const resolvedParams = result.analysisParams ?? baseAnalysisParams;
    analysisParamsRef.current = resolvedParams;
    setAnalysisResult({
      ...result,
      analysisParams: resolvedParams
    });
  }, [baseAnalysisParams]);

  const updateQuantity = (nextQuantity: number) => {
    const normalizedQuantity = normalizeQuantity(nextQuantity);
    setQuantity(normalizedQuantity);
    setQuantityInput(String(normalizedQuantity));
  };

  const handleQuantityInputChange = (value: string) => {
    setQuantityInput(value);
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setQuantity(parsed);
    }
  };

  const handleQuantityInputBlur = () => {
    const parsed = parseInt(quantityInput, 10);
    const normalized = Number.isNaN(parsed) ? 1 : normalizeQuantity(parsed);
    setQuantity(normalized);
    setQuantityInput(String(normalized));
  };

  useEffect(() => {
    if (!analysisResult?.file) return;

    const nextParams = baseAnalysisParams;

    const lastParams = analysisParamsRef.current;
    if (lastParams
      && lastParams.quantity === nextParams.quantity
      && lastParams.materialId === nextParams.materialId
      && lastParams.colorId === nextParams.colorId
      && lastParams.supportsRequired === nextParams.supportsRequired
      && lastParams.layerHeight === nextParams.layerHeight
    ) {
      return;
    }

    analysisRequestIdRef.current += 1;
    const requestId = analysisRequestIdRef.current;
    const debounceId = window.setTimeout(() => {
      const recalculate = async () => {
        const fileURL = URL.createObjectURL(analysisResult.file);
        try {
          const updatedAnalysis = await analyzeSTLFile(
            fileURL,
            nextParams.materialId,
            analysisResult.file.name,
            nextParams.supportsRequired,
            nextParams.layerHeight,
            nextParams.quantity,
            nextParams.colorId || undefined
          );
          if (analysisRequestIdRef.current !== requestId) return;
          analysisParamsRef.current = nextParams;
          setAnalysisResult({
            ...updatedAnalysis,
            file: analysisResult.file,
            analysisParams: nextParams
          });
        } catch (error) {
          logger.error('Error recalculating quote analysis:', error);
        } finally {
          URL.revokeObjectURL(fileURL);
        }
      };

      recalculate();
    }, 300);

    return () => {
      window.clearTimeout(debounceId);
    };
  }, [analysisResult?.file, baseAnalysisParams]);

  const handleFileQuote = async () => {
    if (isSubmittingRef.current || loading) return;
    isSubmittingRef.current = true;
    
    let user;
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user;
    } catch (authError) {
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
      const materialName = materials.find(m => m.id === selectedMaterial)?.name;
      const colorName = availableColors.find(c => c.id === selectedColor)?.name;
      const description = `${fileDescription || ''}\nMaterial: ${materialName}\nColor: ${colorName}`;

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

      if (user) {
        await supabase
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
          }, { onConflict: 'id' });
      }

      const finalPrice = analysisResult?.estimatedTotal || 0;

      let pendingStatusId: string;
      const { data, error: statusError } = await (supabase as any)
        .from('quote_statuses')
        .select('id')
        .eq('slug', 'pending')
        .is('deleted_at', null)
        .limit(1);
      
      if (statusError || !data || data.length === 0) {
        throw new Error('Estado pending no encontrado');
      }
      pendingStatusId = data[0].id;

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
          preview: analysisResult.preview
        } : null,
        supports_required: supportsRequired,
        layer_height: layerHeight,
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

      if (error) throw error;

      try {
        await supabase.functions.invoke('send-quote-email', {
          body: { to: customerEmail, customer_name: customerName, quote_type: 'archivo 3D', description }
        });
      } catch {}

      try {
        await supabase.functions.invoke('send-admin-notification', {
          body: { type: 'quote', subject: 'Nueva Cotización de Archivo 3D', message: `Nueva cotización de ${customerName}`, customer_name: customerName, customer_email: customerEmail, link: '/admin/cotizaciones' }
        });
      } catch {}
      
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
    if (isSubmittingRef.current || loading) return;
    isSubmittingRef.current = true;
    
    let user;
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user;
    } catch {
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
      if (fileLink) description += `\n\nEnlace al archivo: ${fileLink}`;

      const uploadedFiles: string[] = [];
      if (serviceFiles.length > 0) {
        for (const file of serviceFiles) {
          try {
            const sanitizedName = file.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9.-]/g, '').replace(/-+/g, '-');
            const fileName = `service_${Date.now()}_${sanitizedName}`;
            const filePath = `${user!.id}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage.from('quote-files').upload(filePath, file, { cacheControl: '3600', upsert: false });
            if (!uploadError) uploadedFiles.push(filePath);
          } catch {}
        }
      }

      let pendingStatusId: string;
      const { data, error: statusError } = await (supabase as any)
        .from('quote_statuses')
        .select('id')
        .eq('slug', 'pending')
        .is('deleted_at', null)
        .limit(1);
      
      if (statusError || !data || data.length === 0) {
        throw new Error('Estado pending no encontrado');
      }
      pendingStatusId = data[0].id;

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

      if (error) throw error;

      try {
        await supabase.functions.invoke('send-quote-email', {
          body: { to: customerEmail, customer_name: customerName, quote_type: 'servicio', description }
        });
      } catch {}

      try {
        await supabase.functions.invoke('send-admin-notification', {
          body: { type: 'quote', subject: 'Nueva Solicitud de Servicio', message: `Nueva solicitud de ${customerName}`, customer_name: customerName, customer_email: customerEmail, link: '/admin/cotizaciones' }
        });
      } catch {}
      
      toast.success(t('quoteSent'));
      navigate("/");
    } catch (error: any) {
      toast.error(`${t('sendQuoteError')}: ${error.message || t('systemConfigError')}`);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const getStepIcon = (step: Step) => {
    switch (step) {
      case 'upload': return <Upload className="h-4 w-4" />;
      case 'customize': return <Palette className="h-4 w-4" />;
      case 'shipping': return <MapPin className="h-4 w-4" />;
      case 'review': return <Send className="h-4 w-4" />;
    }
  };

  const getStepLabel = (step: Step) => {
    switch (step) {
      case 'upload': return t('yourFile');
      case 'customize': return t('personalization');
      case 'shipping': return t('shippingInfo');
      case 'review': return t('sendQuote');
    }
  };

  const totalEstimated = analysisResult ? (analysisResult.estimatedTotal + (shippingCost || 0)) : 0;

  return (
    <div className="page-section pb-24 md:pb-12">
      <div className="mb-6 text-center">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-sm md:text-base text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="max-w-4xl mx-auto">
        <Tabs value={activeTab} onValueChange={(v) => startTransition(() => setActiveTab(v as '3d' | 'service'))} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="3d" className="text-xs md:text-sm gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">{t('tab3d')}</span>
              <span className="sm:hidden">3D</span>
            </TabsTrigger>
            <TabsTrigger value="service" className="text-xs md:text-sm gap-2">
              <Wrench className="h-4 w-4" />
              {t('tabService')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="3d" className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-8">
              {STEPS.map((step, index) => {
                const isActive = step === currentStep;
                const isCompleted = STEPS.indexOf(currentStep) > index;
                const canGo = canProceedToStep(step);
                
                return (
                  <div key={step} className="flex items-center flex-1">
                    <button
                      onClick={() => canGo && setCurrentStep(step)}
                      disabled={!canGo}
                      className={cn(
                        "flex items-center justify-center gap-2 transition-all",
                        "w-full py-2 px-3 rounded-lg text-sm font-medium",
                        isActive && "bg-primary text-primary-foreground shadow-lg",
                        isCompleted && !isActive && "bg-primary/20 text-primary",
                        !isActive && !isCompleted && "bg-muted text-muted-foreground",
                        canGo && !isActive && "hover:bg-primary/10 cursor-pointer",
                        !canGo && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isCompleted && !isActive ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        getStepIcon(step)
                      )}
                      <span className="hidden md:inline">{getStepLabel(step)}</span>
                      <span className="md:hidden">{index + 1}</span>
                    </button>
                    {index < STEPS.length - 1 && (
                      <ChevronRight className={cn(
                        "h-4 w-4 mx-1 shrink-0",
                        isCompleted ? "text-primary" : "text-muted-foreground/30"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step 1: Upload */}
            {currentStep === 'upload' && (
              <Card className="border-2 border-dashed">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Upload className="h-5 w-5" />
                    {t('fileQuoteTitle')}
                  </CardTitle>
                  <CardDescription>{t('fileQuoteDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <STLUploader
                      materialId={selectedMaterial}
                      colorId={selectedColor}
                      supportsRequired={supportsRequired || false}
                      layerHeight={layerHeight}
                      quantity={quantity}
                      onAnalysisComplete={handleAnalysisComplete}
                      onSupportsDetected={(needsSupports) => setSupportsRequired(needsSupports)}
                    />
                  
                  {analysisResult && (
                    <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        <strong>{t('analysisComplete')}</strong> - {analysisResult.file.name}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Customize */}
            {currentStep === 'customize' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Palette className="h-5 w-5" />
                      {t('personalization')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('material')} *</Label>
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
                        <SelectTrigger>
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
                      <Label>{t('color')} *</Label>
                      <Select 
                        value={selectedColor} 
                        onValueChange={(value) => startTransition(() => setSelectedColor(value))}
                        disabled={!selectedMaterial}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={!selectedMaterial ? t('selectMaterialFirst') : t('selectColor')} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColors.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              {!selectedMaterial ? t('selectMaterialFirst') : t('noColorsAvailable')}
                            </div>
                          ) : (
                            availableColors.map((color) => (
                              <SelectItem key={color.id} value={color.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: color.hex_code }} />
                                  {color.name}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>{t('quantityUnits')}</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(quantity - 1)}
                          disabled={quantity <= 1}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          max="999"
                          value={quantityInput}
                          onChange={(e) => handleQuantityInputChange(e.target.value)}
                          onBlur={handleQuantityInputBlur}
                          className="w-20 text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Eye className="h-5 w-5" />
                      {t('colorPreview')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analysisResult?.stlData && selectedColor ? (
                      <Suspense fallback={<div className="w-full h-64 rounded-lg border bg-muted/30 animate-pulse" />}>
                        <STLViewer3D 
                          stlData={analysisResult.stlData}
                          color={availableColors.find(c => c.id === selectedColor)?.hex_code || "#cccccc"}
                        />
                      </Suspense>
                    ) : (
                      <div className="w-full h-64 rounded-lg border bg-muted/30 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground text-center px-4">
                          {!analysisResult?.stlData ? t('uploadFileFirst') : t('selectColor')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 3: Shipping */}
            {currentStep === 'shipping' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {t('shippingInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('fullName')} *</Label>
                      <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('email')} *</Label>
                      <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('phone')} *</Label>
                      <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('phonePlaceholder')} required />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('postalCode')} *</Label>
                      <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder={t('postalPlaceholder')} required />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('address')}</Label>
                      <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('addressPlaceholder')} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('city')}</Label>
                      <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('cityPlaceholder')} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>{t('country')}</Label>
                      <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectCountry')} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCountries.map((c) => (
                            <SelectItem key={c.id} value={c.country_name}>{c.country_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {shippingCost !== null && (
                    <Alert className="mt-4">
                      <Package className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{t('estimatedShippingCost')}: €{shippingCost.toFixed(2)}</strong> ({shippingZone})
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 4: Review & Submit */}
            {currentStep === 'review' && analysisResult && (
              <div className="space-y-6">
                {/* Summary Card */}
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      {t('analysisComplete')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* File Info */}
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="bg-background/80 p-4 rounded-lg text-center">
                        <Box className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{t('volume')}</p>
                        <p className="text-lg font-bold">{analysisResult.volume.toFixed(2)} cm³</p>
                      </div>
                      <div className="bg-background/80 p-4 rounded-lg text-center">
                        <Ruler className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{t('dimensions')}</p>
                        <p className="text-sm font-mono">
                          {analysisResult.dimensions.x.toFixed(1)}×{analysisResult.dimensions.y.toFixed(1)}×{analysisResult.dimensions.z.toFixed(1)} cm
                        </p>
                      </div>
                      <div className="bg-background/80 p-4 rounded-lg text-center">
                        <Package className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{t('quantity')}</p>
                        <p className="text-lg font-bold">{quantity} {quantity > 1 ? 'unidades' : 'unidad'}</p>
                      </div>
                    </div>

                    {/* 3D Preview */}
                    {analysisResult.stlData && (
                      <div className="rounded-lg overflow-hidden border">
                        <Suspense fallback={<div className="w-full h-48 bg-muted/30 animate-pulse" />}>
                          <STLViewer3D 
                            stlData={analysisResult.stlData}
                            color={availableColors.find(c => c.id === selectedColor)?.hex_code || "#3b82f6"}
                          />
                        </Suspense>
                      </div>
                    )}

                    {/* Selected Options */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: availableColors.find(c => c.id === selectedColor)?.hex_code }} />
                        {availableColors.find(c => c.id === selectedColor)?.name}
                      </Badge>
                      <Badge variant="secondary">
                        {materials.find(m => m.id === selectedMaterial)?.name}
                      </Badge>
                      <Badge variant="outline">
                        {city}, {country}
                      </Badge>
                    </div>

                    {/* Pricing */}
                    <div className="bg-primary/10 rounded-lg p-4 space-y-2">
                      {shippingCost !== null && (
                        <div className="flex justify-between text-sm">
                          <span>{t('shipping')}</span>
                          <span className="font-semibold">€{shippingCost.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 flex justify-between">
                        <span className="font-bold">{t('totalEstimated')}</span>
                        <span className="text-xl font-bold text-primary">€{totalEstimated.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{t('notes')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<div className="h-32 rounded-md border bg-muted/30 animate-pulse" />}>
                      <RichTextEditor
                        value={fileDescription}
                        onChange={setFileDescription}
                        placeholder={t('notesPlaceholder')}
                      />
                    </Suspense>
                  </CardContent>
                </Card>

                {/* Important Note */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>{t('importantNote')}:</strong> {t('importantNoteDesc')}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={goToPrevStep}
                disabled={currentStep === 'upload'}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                {t('back') || 'Anterior'}
              </Button>
              
              {currentStep === 'review' ? (
                <Button
                  onClick={handleFileQuote}
                  disabled={loading || !canProceedToStep('review')}
                  className="gap-2"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('sending')}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {t('sendQuote')}
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={goToNextStep}
                  disabled={!canProceedToStep(STEPS[STEPS.indexOf(currentStep) + 1] as Step)}
                  className="gap-2"
                >
                  {t('next') || 'Siguiente'}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Service Quote Tab - Simplified */}
          <TabsContent value="service">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  {t('serviceQuoteTitle')}
                </CardTitle>
                <CardDescription>{t('serviceQuoteDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleServiceQuote} className="space-y-4">
                  {!isAuthenticated && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('fullName')} *</Label>
                        <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('email')} *</Label>
                        <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required />
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>{t('projectDescription')} *</Label>
                    <Suspense fallback={<div className="h-40 rounded-md border bg-muted/30 animate-pulse" />}>
                      <RichTextEditor
                        value={serviceDescription}
                        onChange={setServiceDescription}
                        placeholder={t('projectDescPlaceholder')}
                      />
                    </Suspense>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('fileLinkOptional')}</Label>
                      <Input 
                        type="url"
                        value={serviceFileLink}
                        onChange={(e) => setServiceFileLink(e.target.value)}
                        placeholder={t('fileLinkPlaceholder')}
                      />
                      <p className="text-xs text-muted-foreground">{t('fileLinkHelp')}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>{t('photosOrFiles')}</Label>
                      <Input 
                        type="file"
                        multiple
                        accept="image/*,.pdf,.stl,.obj,.3mf"
                        onChange={(e) => setServiceFiles(Array.from(e.target.files || []))}
                        className="cursor-pointer"
                      />
                      {serviceFiles.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {serviceFiles.map((file, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs gap-1">
                              <FileText className="h-3 w-3" />
                              {file.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('sending')}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {t('requestService')}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Quotes;
