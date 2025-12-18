import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calculator, HelpCircle, Tag, Box, Printer, Layers } from "lucide-react";
import type { LampTemplate } from "@/pages/Lithophany";

interface LithophanyPricingProps {
  selectedLamp: LampTemplate | null;
  dimensions: { width: number; height: number };
}

export const LithophanyPricing = ({
  selectedLamp,
  dimensions
}: LithophanyPricingProps) => {
  const { i18n } = useTranslation();
  const language = i18n.language;

  const pricing = useMemo(() => {
    if (!selectedLamp) return null;

    const basePrice = selectedLamp.base_price || 15;
    const pricePerCm2 = selectedLamp.price_per_cm2 || 0.15;
    
    // Calculate area in cm²
    const areaCm2 = (dimensions.width * dimensions.height) / 100;
    
    // Calculate area-based price
    const areaPrice = areaCm2 * pricePerCm2;
    
    // Size multiplier (larger sizes cost more)
    const sizeMultiplier = areaCm2 > 200 ? 1.2 : areaCm2 > 100 ? 1.1 : 1;
    
    // Base cost (depends on lamp complexity)
    const baseCost = selectedLamp.requires_custom_base ? 8 : 5;
    
    // Subtotal
    const subtotal = basePrice + areaPrice + baseCost;
    
    // Apply size multiplier
    const adjustedSubtotal = subtotal * sizeMultiplier;
    
    // Tax (21% IVA)
    const tax = adjustedSubtotal * 0.21;
    
    // Total
    const total = adjustedSubtotal + tax;

    return {
      basePrice,
      areaPrice,
      baseCost,
      areaCm2,
      sizeMultiplier,
      subtotal: adjustedSubtotal,
      tax,
      total
    };
  }, [selectedLamp, dimensions]);

  if (!selectedLamp || !pricing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {language === 'es' ? 'Precio Estimado' : 'Estimated Price'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {language === 'es' 
              ? 'Selecciona una lámpara para ver el precio'
              : 'Select a lamp to see the price'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {language === 'es' ? 'Precio Estimado' : 'Estimated Price'}
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p>{language === 'es' 
                ? 'El precio incluye la litofanía impresa, la base con soporte para luz LED y el archivo STL.'
                : 'Price includes printed lithophane, base with LED light support and STL file.'}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Line items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span>{language === 'es' ? 'Precio base' : 'Base price'}</span>
            </div>
            <span>€{pricing.basePrice.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span>
                {language === 'es' ? 'Área' : 'Area'} ({pricing.areaCm2.toFixed(1)} cm²)
              </span>
            </div>
            <span>€{pricing.areaPrice.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4 text-muted-foreground" />
              <span>{language === 'es' ? 'Base con soporte LED' : 'Base with LED support'}</span>
            </div>
            <span>€{pricing.baseCost.toFixed(2)}</span>
          </div>

          {pricing.sizeMultiplier > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                <span>{language === 'es' ? 'Ajuste por tamaño' : 'Size adjustment'}</span>
              </div>
              <span>×{pricing.sizeMultiplier.toFixed(1)}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Subtotal */}
        <div className="flex items-center justify-between text-sm">
          <span>{language === 'es' ? 'Subtotal' : 'Subtotal'}</span>
          <span>€{pricing.subtotal.toFixed(2)}</span>
        </div>

        {/* Tax */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>IVA (21%)</span>
          <span>€{pricing.tax.toFixed(2)}</span>
        </div>

        <Separator />

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">
            {language === 'es' ? 'Total' : 'Total'}
          </span>
          <span className="text-2xl font-bold text-primary">
            €{pricing.total.toFixed(2)}
          </span>
        </div>

        {/* Included items */}
        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-2">
            {language === 'es' ? 'Incluye:' : 'Includes:'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {language === 'es' ? 'Litofanía impresa' : 'Printed lithophane'}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {language === 'es' ? 'Base con soporte LED' : 'Base with LED support'}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {language === 'es' ? 'Archivo STL' : 'STL file'}
            </Badge>
          </div>
        </div>

        {/* Note about LED */}
        <p className="text-xs text-muted-foreground italic">
          {language === 'es' 
            ? 'Nota: La luz LED Bambu Labs no está incluida.'
            : 'Note: Bambu Labs LED light not included.'}
        </p>
      </CardContent>
    </Card>
  );
};
