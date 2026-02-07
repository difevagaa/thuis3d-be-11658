import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calculator, HelpCircle, Check, Minus, Plus } from "lucide-react";
import type { LampTemplate } from "@/pages/Lithophany";

interface LithophanyPricingProps {
  selectedLamp: LampTemplate | null;
  dimensions: { width: number; height: number };
  showDetails?: boolean;
  quantity?: number;
  onQuantityChange?: (quantity: number) => void;
}

export const LithophanyPricing = ({
  selectedLamp,
  dimensions,
  showDetails = false,
  quantity = 1,
  onQuantityChange
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
    
    // Subtotal per unit
    const subtotal = basePrice + areaPrice + baseCost;
    
    // Apply size multiplier
    const adjustedSubtotal = subtotal * sizeMultiplier;
    
    // Tax (21% IVA)
    const tax = adjustedSubtotal * 0.21;
    
    // Unit total
    const unitTotal = adjustedSubtotal + tax;

    // Grand total with quantity
    const total = unitTotal * quantity;

    return {
      basePrice,
      areaPrice,
      baseCost,
      areaCm2,
      sizeMultiplier,
      subtotal: adjustedSubtotal,
      tax,
      unitTotal,
      total,
      quantity
    };
  }, [selectedLamp, dimensions, quantity]);

  if (!selectedLamp || !pricing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {language === 'es' ? 'Precio' : 'Price'}
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
            {language === 'es' ? 'Precio Total' : 'Total Price'}
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
        {/* Quantity Selector */}
        {onQuantityChange && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {language === 'es' ? 'Cantidad' : 'Quantity'}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-lg font-semibold w-8 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onQuantityChange(Math.min(50, quantity + 1))}
                disabled={quantity >= 50}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Unit price when quantity > 1 */}
        {quantity > 1 && (
          <div className="text-center text-sm text-muted-foreground">
            {language === 'es' ? 'Precio unitario' : 'Unit price'}: €{pricing.unitTotal.toFixed(2)}
          </div>
        )}

        {/* Total Price - PROMINENTLY DISPLAYED */}
        <div className="text-center py-4 bg-primary/5 rounded-lg">
          <span className="text-4xl font-bold text-primary">
            €{pricing.total.toFixed(2)}
          </span>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'es' ? 'IVA incluido' : 'VAT included'}
            {quantity > 1 && (
              <span> ({quantity} {language === 'es' ? 'unidades' : 'units'})</span>
            )}
          </p>
        </div>

        {/* Included items */}
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {language === 'es' ? 'Incluye:' : 'Includes:'}
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>{language === 'es' ? 'Litofanía impresa en 3D' : '3D printed lithophane'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>{language === 'es' ? 'Base con soporte para LED' : 'Base with LED support'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>{language === 'es' ? 'Archivo STL descargable' : 'Downloadable STL file'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>{language === 'es' ? 'Orificio para luz LED Bambu' : 'Bambu LED light hole'}</span>
            </div>
          </div>
        </div>

        {/* Size info */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="secondary">
            {dimensions.width}×{dimensions.height}mm
          </Badge>
          <Badge variant="outline">
            {pricing.areaCm2.toFixed(1)} cm²
          </Badge>
        </div>

        {/* Note about LED */}
        <p className="text-xs text-muted-foreground italic border-t pt-3">
          {language === 'es' 
            ? 'Nota: La luz LED Bambu Labs no está incluida.'
            : 'Note: Bambu Labs LED light not included.'}
        </p>
      </CardContent>
    </Card>
  );
};