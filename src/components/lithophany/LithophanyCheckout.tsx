import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  CreditCard, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ShoppingCart,
  FileDown
} from "lucide-react";
import type { LampTemplate } from "@/pages/Lithophany";
import { LithophanyPricing } from "./LithophanyPricing";

interface LithophanyCheckoutProps {
  processedImage: string;
  originalImage: string;
  lampTemplate: LampTemplate;
  dimensions: { width: number; height: number };
  editorSettings: Record<string, number | boolean | string>;
}

export const LithophanyCheckout = ({
  processedImage,
  originalImage,
  lampTemplate,
  dimensions,
  editorSettings
}: LithophanyCheckoutProps) => {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const navigate = useNavigate();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Check if user is authenticated
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
  });

  const calculatePrice = () => {
    const basePrice = lampTemplate.base_price || 15;
    const pricePerCm2 = lampTemplate.price_per_cm2 || 0.15;
    const areaCm2 = (dimensions.width * dimensions.height) / 100;
    const areaPrice = areaCm2 * pricePerCm2;
    const sizeMultiplier = areaCm2 > 200 ? 1.2 : areaCm2 > 100 ? 1.1 : 1;
    const baseCost = lampTemplate.requires_custom_base ? 8 : 5;
    const subtotal = (basePrice + areaPrice + baseCost) * sizeMultiplier;
    const tax = subtotal * 0.21;
    return subtotal + tax;
  };

  const handleSubmitOrder = async () => {
    if (!session?.user) {
      toast.error(language === 'es' 
        ? 'Debes iniciar sesión para realizar el pedido'
        : 'You must log in to place an order');
      navigate('/auth');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images to storage
      const timestamp = Date.now();
      const originalFileName = `lithophany/${session.user.id}/${timestamp}_original.png`;
      const processedFileName = `lithophany/${session.user.id}/${timestamp}_processed.png`;

      // Convert base64 to blob for original
      const originalBlob = await fetch(originalImage).then(r => r.blob());
      const processedBlob = await fetch(processedImage).then(r => r.blob());

      // Upload original
      const { error: originalError } = await supabase.storage
        .from('uploads')
        .upload(originalFileName, originalBlob, {
          contentType: 'image/png'
        });

      if (originalError) throw originalError;

      // Upload processed
      const { error: processedError } = await supabase.storage
        .from('uploads')
        .upload(processedFileName, processedBlob, {
          contentType: 'image/png'
        });

      if (processedError) throw processedError;

      // Get public URLs
      const { data: originalUrl } = supabase.storage
        .from('uploads')
        .getPublicUrl(originalFileName);

      const { data: processedUrl } = supabase.storage
        .from('uploads')
        .getPublicUrl(processedFileName);

      // Create lithophany order
      const { data: order, error: orderError } = await supabase
        .from('lithophany_orders')
        .insert({
          user_id: session.user.id,
          lamp_type: lampTemplate.shape_type,
          lamp_width_mm: dimensions.width,
          lamp_height_mm: dimensions.height,
          lamp_curve_radius: lampTemplate.curve_radius,
          original_image_url: originalUrl.publicUrl,
          processed_image_url: processedUrl.publicUrl,
          image_settings: editorSettings,
          lamp_custom_settings: {
            template_id: lampTemplate.id,
            template_name: lampTemplate.name
          },
          base_type: lampTemplate.base_type || 'standard',
          base_width_mm: dimensions.width * 1.2,
          base_height_mm: 15,
          base_depth_mm: 25,
          light_hole_diameter_mm: 16,
          light_hole_depth_mm: 10,
          calculated_price: calculatePrice(),
          notes: notes,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      setOrderId(order.id);
      setOrderCreated(true);

      // Trigger STL generation in background
      try {
        const { error: stlError } = await supabase.functions.invoke('generate-lithophany-stl', {
          body: { orderId: order.id, generateBase: true }
        });
        if (stlError) {
          console.error('STL generation error:', stlError);
        }
      } catch (stlErr) {
        console.error('Failed to trigger STL generation:', stlErr);
      }

      toast.success(language === 'es' 
        ? '¡Pedido creado correctamente!'
        : 'Order created successfully!');

    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(language === 'es' 
        ? 'Error al crear el pedido'
        : 'Error creating order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedToPayment = () => {
    if (orderId) {
      navigate(`/pago?lithophany=${orderId}`);
    }
  };

  if (orderCreated) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {language === 'es' ? '¡Pedido Creado!' : 'Order Created!'}
            </h2>
            <p className="text-muted-foreground">
              {language === 'es' 
                ? 'Tu litofanía ha sido guardada. Procede al pago para completar tu pedido.'
                : 'Your lithophane has been saved. Proceed to payment to complete your order.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleProceedToPayment} size="lg">
              <CreditCard className="h-4 w-4 mr-2" />
              {language === 'es' ? 'Proceder al Pago' : 'Proceed to Payment'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/mi-cuenta')}>
              {language === 'es' ? 'Ver Mis Pedidos' : 'View My Orders'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Order Summary */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {language === 'es' ? 'Resumen del Pedido' : 'Order Summary'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">
                  {language === 'es' ? 'Tu Imagen' : 'Your Image'}
                </Label>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <img 
                    src={processedImage} 
                    alt="Lithophane preview" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">
                    {language === 'es' ? 'Tipo de Lámpara' : 'Lamp Type'}
                  </Label>
                  <p className="font-medium">
                    {language === 'es' ? lampTemplate.name_es || lampTemplate.name : lampTemplate.name_en || lampTemplate.name}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm text-muted-foreground">
                    {language === 'es' ? 'Dimensiones' : 'Dimensions'}
                  </Label>
                  <p className="font-medium">{dimensions.width} × {dimensions.height} mm</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {language === 'es' ? 'Base incluida' : 'Base included'}
                  </Badge>
                  <Badge variant="secondary">
                    {language === 'es' ? 'Soporte LED' : 'LED support'}
                  </Badge>
                  <Badge variant="secondary">
                    {language === 'es' ? 'Archivo STL' : 'STL file'}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div>
              <Label htmlFor="notes">
                {language === 'es' ? 'Notas adicionales (opcional)' : 'Additional notes (optional)'}
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={language === 'es' 
                  ? 'Instrucciones especiales, preferencias de color, etc.'
                  : 'Special instructions, color preferences, etc.'}
                className="mt-2"
              />
            </div>

            {/* Authentication warning */}
            {!session?.user && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {language === 'es' 
                    ? 'Debes iniciar sesión para realizar el pedido.'
                    : 'You must log in to place an order.'}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto ml-1"
                    onClick={() => navigate('/auth')}
                  >
                    {language === 'es' ? 'Iniciar sesión' : 'Log in'}
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pricing & Submit */}
      <div className="space-y-6">
        <LithophanyPricing 
          selectedLamp={lampTemplate} 
          dimensions={dimensions} 
        />

        <Button 
          onClick={handleSubmitOrder}
          disabled={isSubmitting || !session?.user}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {language === 'es' ? 'Creando pedido...' : 'Creating order...'}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {language === 'es' ? 'Crear Pedido' : 'Create Order'}
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          {language === 'es' 
            ? 'Al crear el pedido, aceptas nuestros términos y condiciones.'
            : 'By creating the order, you accept our terms and conditions.'}
        </p>
      </div>
    </div>
  );
};
