import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { SEOHead } from "@/components/SEOHead";
import { LithophanyImageUploader } from "@/components/lithophany/LithophanyImageUploader";
import { LithophanyImageEditor } from "@/components/lithophany/LithophanyImageEditor";
import { LithophanyLampSelector } from "@/components/lithophany/LithophanyLampSelector";
import { LithophanyPreview3D } from "@/components/lithophany/LithophanyPreview3D";
import { LithophanyPricing } from "@/components/lithophany/LithophanyPricing";
import { LithophanyCheckout } from "@/components/lithophany/LithophanyCheckout";
import { useLithophanyEditor } from "@/hooks/useLithophanyEditor";
import { Upload, ImageIcon, Box, CreditCard, Eye } from "lucide-react";

export interface LampTemplate {
  id: string;
  name: string;
  name_es: string | null;
  name_en: string | null;
  shape_type: string;
  description: string | null;
  description_es: string | null;
  description_en: string | null;
  default_width_mm: number;
  default_height_mm: number;
  min_width_mm: number | null;
  max_width_mm: number | null;
  min_height_mm: number | null;
  max_height_mm: number | null;
  base_price: number | null;
  price_per_cm2: number | null;
  preview_image_url: string | null;
  segments: number | null;
  curve_radius: number | null;
  corner_radius: number | null;
  base_type: string | null;
  requires_custom_base: boolean | null;
  category: string | null;
}

const Lithophany = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  
  const [currentStep, setCurrentStep] = useState<'upload' | 'edit' | 'lamp' | 'preview' | 'checkout'>('upload');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [selectedLamp, setSelectedLamp] = useState<LampTemplate | null>(null);
  const [lampDimensions, setLampDimensions] = useState({ width: 100, height: 100 });
  
  const {
    editorSettings,
    updateSetting,
    resetSettings,
    applyAIEnhancement,
    isProcessing
  } = useLithophanyEditor();

  // Fetch lamp templates
  const { data: lampTemplates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['lithophany-lamp-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lithophany_lamp_templates')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as LampTemplate[];
    }
  });

  const handleImageUpload = useCallback((imageDataUrl: string) => {
    setOriginalImage(imageDataUrl);
    setProcessedImage(imageDataUrl);
    setCurrentStep('edit');
    toast.success(language === 'es' ? 'Imagen cargada correctamente' : 'Image uploaded successfully');
  }, [language]);

  const handleImageProcessed = useCallback((processedDataUrl: string) => {
    setProcessedImage(processedDataUrl);
  }, []);

  const handleLampSelect = useCallback((lamp: LampTemplate) => {
    setSelectedLamp(lamp);
    setLampDimensions({
      width: lamp.default_width_mm,
      height: lamp.default_height_mm
    });
  }, []);

  const handleDimensionsChange = useCallback((width: number, height: number) => {
    setLampDimensions({ width, height });
  }, []);

  const handleProceedToCheckout = useCallback(() => {
    if (!processedImage || !selectedLamp) {
      toast.error(language === 'es' ? 'Por favor completa todos los pasos' : 'Please complete all steps');
      return;
    }
    setCurrentStep('checkout');
  }, [processedImage, selectedLamp, language]);

  const stepTabs = [
    { id: 'upload', label: language === 'es' ? '1. Subir Imagen' : '1. Upload Image', icon: Upload },
    { id: 'edit', label: language === 'es' ? '2. Editar' : '2. Edit', icon: ImageIcon, disabled: !originalImage },
    { id: 'lamp', label: language === 'es' ? '3. Lámpara' : '3. Lamp', icon: Box, disabled: !processedImage },
    { id: 'preview', label: language === 'es' ? '4. Vista Previa' : '4. Preview', icon: Eye, disabled: !selectedLamp },
    { id: 'checkout', label: language === 'es' ? '5. Pago' : '5. Checkout', icon: CreditCard, disabled: !selectedLamp },
  ];

  return (
    <>
      <SEOHead
        title={language === 'es' ? 'Crear Litofanía 3D Personalizada' : 'Create Custom 3D Lithophane'}
        description={language === 'es' 
          ? 'Crea tu propia lámpara de litofanía 3D personalizada. Sube tu imagen, edítala con más de 300 opciones y genera tu archivo STL listo para imprimir.'
          : 'Create your own custom 3D lithophane lamp. Upload your image, edit it with 300+ options and generate your print-ready STL file.'}
      />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {language === 'es' ? 'Crea tu Litofanía 3D' : 'Create Your 3D Lithophane'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {language === 'es' 
              ? 'Transforma tus fotos en impresionantes lámparas de litofanía 3D. Edita, personaliza y obtén tu archivo listo para imprimir.'
              : 'Transform your photos into stunning 3D lithophane lamps. Edit, customize and get your print-ready file.'}
          </p>
        </div>

        <Tabs value={currentStep} onValueChange={(v) => setCurrentStep(v as typeof currentStep)} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            {stepTabs.map(({ id, label, icon: Icon, disabled }) => (
              <TabsTrigger 
                key={id} 
                value={id} 
                disabled={disabled}
                className="flex items-center gap-2 text-xs sm:text-sm"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.split('.')[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="upload" className="mt-0">
            <Card>
              <CardContent className="p-6">
                <LithophanyImageUploader onImageUpload={handleImageUpload} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="edit" className="mt-0">
            {originalImage && (
              <LithophanyImageEditor
                originalImage={originalImage}
                processedImage={processedImage}
                settings={editorSettings}
                onUpdateSetting={updateSetting}
                onResetSettings={resetSettings}
                onImageProcessed={handleImageProcessed}
                onApplyAI={applyAIEnhancement}
                isProcessing={isProcessing}
                onNext={() => setCurrentStep('lamp')}
              />
            )}
          </TabsContent>

          <TabsContent value="lamp" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <LithophanyLampSelector
                  templates={lampTemplates}
                  selectedLamp={selectedLamp}
                  onSelect={handleLampSelect}
                  dimensions={lampDimensions}
                  onDimensionsChange={handleDimensionsChange}
                  isLoading={isLoadingTemplates}
                />
              </div>
              <div>
                <LithophanyPricing
                  selectedLamp={selectedLamp}
                  dimensions={lampDimensions}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button 
                onClick={() => setCurrentStep('preview')} 
                disabled={!selectedLamp}
                size="lg"
              >
                {language === 'es' ? 'Ver Vista Previa 3D' : 'View 3D Preview'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-0">
            {selectedLamp && processedImage && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <LithophanyPreview3D
                    processedImage={processedImage}
                    lampTemplate={selectedLamp}
                    dimensions={lampDimensions}
                  />
                </div>
                <div className="space-y-6">
                  <LithophanyPricing
                    selectedLamp={selectedLamp}
                    dimensions={lampDimensions}
                  />
                  <Button 
                    onClick={handleProceedToCheckout} 
                    size="lg"
                    className="w-full"
                  >
                    {language === 'es' ? 'Proceder al Pago' : 'Proceed to Checkout'}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="checkout" className="mt-0">
            {selectedLamp && processedImage && (
              <LithophanyCheckout
                processedImage={processedImage}
                originalImage={originalImage!}
                lampTemplate={selectedLamp}
                dimensions={lampDimensions}
                editorSettings={editorSettings}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Lithophany;
